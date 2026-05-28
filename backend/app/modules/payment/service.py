# app/modules/payment/service.py
import razorpay
import secrets
from uuid import UUID
from zoneinfo import ZoneInfo
from decimal import Decimal
from loguru import logger
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from app.utils.pagination import PaginationParams
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from app.core.config import settings
from app.modules.payment.models import Payment, PaymentStatus, BookingType
from app.modules.payment.schemas import OrderCreateRequest, PaymentVerifyRequest
from app.common.exceptions import BaseDomainException

class PaymentError(BaseDomainException):
    def __init__(self, message: str = "Payment processing failed", status_code: int = 400):
        super().__init__(message, status_code)

class PaymentService:
    def __init__(self):
        self.client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID.get_secret_value(),
                settings.RAZORPAY_KEY_SECRET.get_secret_value()
            )
        )

    async def create_order(self, db: AsyncSession, user_id: UUID, payload: OrderCreateRequest) -> Payment:
        try:
            amount_in_paise = int(payload.amount * 100)

            order_data = {
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": f"receipt_pb_{secrets.token_hex(4)}",
                "payment_capture": 1
            }
            rzp_order = self.client.order.create(data=order_data)
            
            payment = Payment(
                user_id=user_id,
                amount=payload.amount,
                razorpay_order_id=rzp_order["id"],
                booking_type=payload.booking_type,
                booking_id=payload.booking_id,
                status=PaymentStatus.PENDING
            )
            db.add(payment)
            await db.commit()
            await db.refresh(payment)
            
            return payment
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to generate Razorpay order: {e}")
            raise PaymentError("Failed to initiate payment gateway order.")

    async def verify_payment(self, db: AsyncSession, payload: PaymentVerifyRequest) -> Payment:
        params_dict = {
            'razorpay_order_id': payload.razorpay_order_id,
            'razorpay_payment_id': payload.razorpay_payment_id,
            'razorpay_signature': payload.razorpay_signature
        }

        # 1. Verify Razorpay Signature
        try:
            self.client.utility.verify_payment_signature(params_dict)
        except Exception as e:
            logger.warning(f"Fraudulent payment attempt / invalid signature: {e}")
            raise PaymentError("Payment verification failed. Invalid signature.", status_code=403)

        # 2. Fetch the Payment Record
        stmt = select(Payment).where(Payment.razorpay_order_id == payload.razorpay_order_id)
        result = await db.execute(stmt)
        payment = result.scalar_one_or_none()

        if not payment:
            raise PaymentError("Transaction reference not found in database.")

        # 3. IDEMPOTENCY CHECK (Prevents Replay Attacks)
        if payment.status != PaymentStatus.PENDING:
            raise PaymentError("This payment has already been processed.", status_code=400)

        # 4. Update Payment Object
        payment.status = PaymentStatus.SUCCESS
        payment.razorpay_payment_id = payload.razorpay_payment_id

        # ==========================================
        # BOOKING STATUS ROUTING LOGIC
        # ==========================================
        if payment.booking_type == BookingType.CONSULTATION:
            from app.modules.consultation.models import Consultation, ConsultationStatus
            from app.db.all_models import User
            from app.core.email import (
                send_consultation_booking_patient_email, 
                send_consultation_booking_doctor_email,
                send_admin_new_booking_email # <-- Import admin email
            )
            from zoneinfo import ZoneInfo
            import asyncio

            await db.execute(
                update(Consultation)
                .where(Consultation.id == payment.booking_id)
                .values(status=ConsultationStatus.SCHEDULED)
            )

            stmt_booking = select(Consultation).options(
                selectinload(Consultation.doctor),
                selectinload(Consultation.patient_user).selectinload(User.patient_profile)
            ).where(Consultation.id == payment.booking_id)
            
            booking = (await db.execute(stmt_booking)).scalar_one_or_none()

            if booking and booking.doctor and booking.patient_user:
                doc_name = f"{booking.doctor.first_name} {booking.doctor.last_name}"
                
                # IST Timezone Conversion
                ist_tz = ZoneInfo("Asia/Kolkata")
                local_dt = booking.scheduled_at.astimezone(ist_tz)
                formatted_date = local_dt.strftime("%d %b %Y, %I:%M %p")
                
                patient_name = "Patient"
                if booking.patient_user.patient_profile:
                    p_prof = booking.patient_user.patient_profile
                    patient_name = f"{p_prof.first_name} {p_prof.last_name}"

                # Send Patient Email
                asyncio.create_task(
                    asyncio.to_thread(
                        send_consultation_booking_patient_email,
                        to_email=booking.patient_user.email,
                        patient_name=patient_name,
                        doctor_name=doc_name,
                        scheduled_date=formatted_date,
                        consultation_type=booking.consultation_type.value,
                        clinic_address=booking.doctor.clinic_address
                    )
                )

                # Send Doctor Email
                asyncio.create_task(
                    asyncio.to_thread(
                        send_consultation_booking_doctor_email,
                        to_email=booking.doctor.email,
                        doctor_name=doc_name,
                        patient_name=patient_name,
                        scheduled_date=formatted_date,
                        consultation_type=booking.consultation_type.value
                    )
                )

                # Send Admin Email
                admin_details = f"Consultation with Dr. {doc_name} at {formatted_date} ({booking.consultation_type.value})"
                asyncio.create_task(
                    asyncio.to_thread(
                        send_admin_new_booking_email,
                        booking_type="Consultation",
                        patient_name=patient_name,
                        patient_email=booking.patient_user.email,
                        amount=float(payment.amount),
                        details=admin_details
                    )
                )
        
        elif payment.booking_type == BookingType.LAB_TEST:
            from app.modules.labtest.models import LabTestBooking, LabTestBookingStatus
            from app.db.all_models import User
            from app.core.email import send_labtest_booking_email, send_admin_new_booking_email # <-- Import admin email
            import asyncio

            await db.execute(
                update(LabTestBooking)
                .where(LabTestBooking.id == payment.booking_id)
                .values(status=LabTestBookingStatus.PAID)
            )

            stmt_booking = select(LabTestBooking).options(
                selectinload(LabTestBooking.lab_test),
                selectinload(LabTestBooking.patient_user).selectinload(User.patient_profile)
            ).where(LabTestBooking.id == payment.booking_id)
            
            booking = (await db.execute(stmt_booking)).scalar_one_or_none()

            if booking and booking.patient_user:
                patient_name = "Patient"
                if booking.patient_user.patient_profile:
                    p_prof = booking.patient_user.patient_profile
                    patient_name = f"{p_prof.first_name} {p_prof.last_name}"
                
                test_name = booking.lab_test.name
                sch_date = str(booking.scheduled_date)
                c_addr = booking.lab_test.clinic_address or "Clinic address pending"
                open_t = booking.lab_test.clinic_open_time.strftime("%I:%M %p") if booking.lab_test.clinic_open_time else "TBD"
                close_t = booking.lab_test.clinic_close_time.strftime("%I:%M %p") if booking.lab_test.clinic_close_time else "TBD"
                
                # Send Patient Email
                asyncio.create_task(
                    asyncio.to_thread(
                        send_labtest_booking_email,
                        to_email=booking.patient_user.email,
                        patient_name=patient_name,
                        test_name=test_name,
                        scheduled_date=sch_date,
                        clinic_address=c_addr,
                        clinic_timing=f"{open_t} - {close_t}"
                    )
                )

                # Send Admin Email
                admin_details = f"Lab Test: {test_name} | Date: {sch_date} | Lab: {booking.lab_test.organization}"
                asyncio.create_task(
                    asyncio.to_thread(
                        send_admin_new_booking_email,
                        booking_type="Lab Test",
                        patient_name=patient_name,
                        patient_email=booking.patient_user.email,
                        amount=float(payment.amount),
                        details=admin_details
                    )
                )

        elif payment.booking_type == BookingType.HEALTH_PACKAGE:
            from app.modules.health_package.models import HealthPackageBooking, HealthPackageBookingStatus
            from app.db.all_models import User
            from app.core.email import send_health_package_booking_email, send_admin_new_booking_email # <-- Import admin email
            import asyncio

            await db.execute(
                update(HealthPackageBooking)
                .where(HealthPackageBooking.id == payment.booking_id)
                .values(status=HealthPackageBookingStatus.PAID)
            )

            stmt_booking = select(HealthPackageBooking).options(
                selectinload(HealthPackageBooking.health_package),
                selectinload(HealthPackageBooking.patient_user).selectinload(User.patient_profile)
            ).where(HealthPackageBooking.id == payment.booking_id)
            
            booking = (await db.execute(stmt_booking)).scalar_one_or_none()

            if booking and booking.patient_user:
                patient_name = "Patient"
                if booking.patient_user.patient_profile:
                    p_prof = booking.patient_user.patient_profile
                    patient_name = f"{p_prof.first_name} {p_prof.last_name}"
                
                package_name = booking.health_package.title
                sch_date = str(booking.scheduled_date)
                c_addr = booking.health_package.clinic_address or "Clinic address pending"
                open_t = booking.health_package.clinic_open_time.strftime("%I:%M %p") if booking.health_package.clinic_open_time else "TBD"
                close_t = booking.health_package.clinic_close_time.strftime("%I:%M %p") if booking.health_package.clinic_close_time else "TBD"
                
                # Send Patient Email
                asyncio.create_task(
                    asyncio.to_thread(
                        send_health_package_booking_email,
                        to_email=booking.patient_user.email,
                        patient_name=patient_name,
                        package_name=package_name,
                        scheduled_date=sch_date,
                        clinic_address=c_addr,
                        clinic_timing=f"{open_t} - {close_t}"
                    )
                )

                # Send Admin Email
                admin_details = f"Health Package: {package_name} | Date: {sch_date} | Org: {booking.health_package.organization}"
                asyncio.create_task(
                    asyncio.to_thread(
                        send_admin_new_booking_email,
                        booking_type="Health Package",
                        patient_name=patient_name,
                        patient_email=booking.patient_user.email,
                        amount=float(payment.amount),
                        details=admin_details
                    )
                )

        # 5. Atomic Commit (Commits Payment update + Booking Update together)
        await db.commit()
        await db.refresh(payment)
        
        return payment
    
    
    async def list_all_payments(
        self,
        db: AsyncSession,
        params: PaginationParams,
        status: PaymentStatus | None = None,
        booking_type: BookingType | None = None
    ) -> tuple[list[Payment], int]:
        from app.db.all_models import User
        
        query = select(Payment).options(
            selectinload(Payment.user).selectinload(User.patient_profile)
        )
        count_query = select(func.count()).select_from(Payment)

        if status:
            query = query.where(Payment.status == status)
            count_query = count_query.where(Payment.status == status)

        if booking_type:
            query = query.where(Payment.booking_type == booking_type)
            count_query = count_query.where(Payment.booking_type == booking_type)

        total_count = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Payment.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()
        
        return list(items), total_count