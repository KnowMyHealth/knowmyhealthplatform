# app/modules/payment/service.py
import razorpay
import secrets
import asyncio
from uuid import UUID
from decimal import Decimal
from loguru import logger
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
<<<<<<< HEAD
=======
from zoneinfo import ZoneInfo
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1

from app.utils.pagination import PaginationParams
from app.core.config import settings
<<<<<<< HEAD
from app.utils.pagination import PaginationParams
=======
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
from app.modules.payment.models import Payment, PaymentStatus, BookingType, PaymentMode
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
        """Initiates a Razorpay order and saves a PENDING payment record."""
        try:
            # Razorpay expects amount in paise (multiply by 100)
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
                status=PaymentStatus.PENDING,
<<<<<<< HEAD
                payment_mode=payload.payment_mode
=======
                payment_mode=payload.payment_mode # <-- NEW: Store 10% vs 100% intent
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
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
        """Verifies Razorpay signature, updates booking status, and dispatches IST-localized emails."""
        params_dict = {
            'razorpay_order_id': payload.razorpay_order_id,
            'razorpay_payment_id': payload.razorpay_payment_id,
            'razorpay_signature': payload.razorpay_signature
        }

        # 1. Verify Razorpay Signature securely
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

<<<<<<< HEAD
        # 3. IDEMPOTENCY CHECK: Prevent Replay Attacks
=======
        # 3. IDEMPOTENCY CHECK
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
        if payment.status != PaymentStatus.PENDING:
            raise PaymentError("This payment has already been processed.", status_code=400)

        # 4. Update Payment Object
        payment.status = PaymentStatus.SUCCESS
        payment.razorpay_payment_id = payload.razorpay_payment_id

        # ==========================================
        # 5. DYNAMIC PAYMENT SUMMARY HTML GENERATOR
        # ==========================================
<<<<<<< HEAD
        pay_mode_label = "Advance Payment (10%)" if payment.payment_mode == PaymentMode.ADVANCE else "Full Payment (100%)"
        
        if payment.payment_mode == PaymentMode.ADVANCE:
            # Calculate remaining balance (Assuming the amount paid is exactly 10%)
            paid_amt = float(payment.amount)
            remaining_balance = paid_amt * 9
            total_amt = paid_amt * 10
            
            payment_summary_html = f"""
            <div style="background-color: #fffaf0; border: 1px dashed #dd6b20; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <p style="margin: 0; color: #dd6b20; font-size: 0.95em; font-weight: bold;">⚠️ Part Payment / Advance Booking</p>
                <p style="margin: 8px 0 0 0; font-size: 0.85em; color: #4a5568; line-height: 1.5;">
                    <strong>Total Amount:</strong> ₹{total_amt:.2f}<br/>
                    <strong>Paid Online (10%):</strong> ₹{paid_amt:.2f}<br/>
                    <strong>Remaining Balance (90%):</strong> <span style="color: #e53e3e; font-weight: bold;">₹{remaining_balance:.2f}</span> (To be collected at center)
                </p>
            </div>
            """
        else:
            payment_summary_html = f"""
            <div style="background-color: #f0fff4; border: 1px dashed #38a169; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <p style="margin: 0; color: #38a169; font-size: 0.95em; font-weight: bold;">✅ Fully Paid (100%)</p>
                <p style="margin: 8px 0 0 0; font-size: 0.85em; color: #4a5568; line-height: 1.5;">
                    <strong>Total Amount:</strong> ₹{float(payment.amount):.2f}<br/>
                    <strong>Paid Online:</strong> ₹{float(payment.amount):.2f}<br/>
                    <strong>Remaining Balance:</strong> ₹0.00
                </p>
            </div>
            """

        # ==========================================
        # 6. BOOKING STATUS ROUTING LOGIC
        # ==========================================
        
        # Localized timezone for India Standard Time
        ist_tz = ZoneInfo("Asia/Kolkata")
=======
        
        # Helper variables for emails
        pay_mode_label = "Advance Payment (10%)" if payment.payment_mode == PaymentMode.ADVANCE else "Full Payment (100%)"
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1

        if payment.booking_type == BookingType.CONSULTATION:
            from app.modules.consultation.models import Consultation, ConsultationStatus
            from app.db.all_models import User
            from app.core.email import (
                send_consultation_booking_patient_email, 
                send_consultation_booking_doctor_email,
                send_admin_new_booking_email
            )

            # Update Consultation to SCHEDULED
            await db.execute(
                update(Consultation)
                .where(Consultation.id == payment.booking_id)
                .values(status=ConsultationStatus.SCHEDULED)
            )

            # Fetch booking context for emails
            stmt_booking = select(Consultation).options(
                selectinload(Consultation.doctor),
                selectinload(Consultation.patient_user).selectinload(User.patient_profile)
            ).where(Consultation.id == payment.booking_id)
            
            booking = (await db.execute(stmt_booking)).scalar_one_or_none()

            if booking and booking.doctor and booking.patient_user:
                doc_name = f"{booking.doctor.first_name} {booking.doctor.last_name}"
<<<<<<< HEAD
                
                # Format strictly to IST
=======
                ist_tz = ZoneInfo("Asia/Kolkata")
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
                local_dt = booking.scheduled_at.astimezone(ist_tz)
                formatted_date = local_dt.strftime("%d %b %Y, %I:%M %p")
                
                # Graceful fallback if patient hasn't completed their profile yet
                patient_name = "Patient"
                if booking.patient_user.patient_profile:
                    p_prof = booking.patient_user.patient_profile
                    patient_name = f"{p_prof.first_name} {p_prof.last_name}"

<<<<<<< HEAD
                # Trigger Patient Email
=======
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
                asyncio.create_task(
                    asyncio.to_thread(
                        send_consultation_booking_patient_email,
                        to_email=booking.patient_user.email,
                        patient_name=patient_name,
                        doctor_name=doc_name,
                        scheduled_date=formatted_date,
                        consultation_type=booking.consultation_type.value,
                        clinic_address=booking.doctor.clinic_address,
                        payment_summary_html=payment_summary_html
                    )
                )

<<<<<<< HEAD
                # Trigger Doctor Email
=======
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
                asyncio.create_task(
                    asyncio.to_thread(
                        send_consultation_booking_doctor_email,
                        to_email=booking.doctor.email,
                        doctor_name=doc_name,
                        patient_name=patient_name,
                        scheduled_date=formatted_date,
                        consultation_type=booking.consultation_type.value,
                        payment_summary_html=payment_summary_html
                    )
                )

<<<<<<< HEAD
                # Trigger Admin Email
=======
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
                admin_details = f"Consultation with Dr. {doc_name} at {formatted_date} ({booking.consultation_type.value}) - {pay_mode_label}"
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
            from app.core.email import send_labtest_booking_email, send_admin_new_booking_email

<<<<<<< HEAD
            # Assign ADVANCE_PAID vs PAID based on frontend intent
=======
            # --- NEW: Assign ADVANCE_PAID vs PAID based on frontend intent ---
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
            new_status = LabTestBookingStatus.ADVANCE_PAID if payment.payment_mode == PaymentMode.ADVANCE else LabTestBookingStatus.PAID

            await db.execute(
                update(LabTestBooking)
                .where(LabTestBooking.id == payment.booking_id)
                .values(status=new_status)
            )

            # Fetch booking context for emails
            stmt_booking = select(LabTestBooking).options(
                selectinload(LabTestBooking.lab_test),
                selectinload(LabTestBooking.patient_user).selectinload(User.patient_profile)
            ).where(LabTestBooking.id == payment.booking_id)
            
            booking = (await db.execute(stmt_booking)).scalar_one_or_none()

            if booking and booking.patient_user:
                # Graceful fallback
                patient_name = "Patient"
                if booking.patient_user.patient_profile:
                    p_prof = booking.patient_user.patient_profile
                    patient_name = f"{p_prof.first_name} {p_prof.last_name}"
                
                test_name = booking.lab_test.name
                sch_date = str(booking.scheduled_date)
                c_addr = booking.lab_test.clinic_address or "Clinic address pending"
                open_t = booking.lab_test.clinic_open_time.strftime("%I:%M %p") if booking.lab_test.clinic_open_time else "TBD"
                close_t = booking.lab_test.clinic_close_time.strftime("%I:%M %p") if booking.lab_test.clinic_close_time else "TBD"
                
<<<<<<< HEAD
                # Trigger Patient Email
=======
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
                asyncio.create_task(
                    asyncio.to_thread(
                        send_labtest_booking_email,
                        to_email=booking.patient_user.email,
                        patient_name=patient_name,
                        test_name=test_name,
                        scheduled_date=sch_date,
                        clinic_address=c_addr,
                        clinic_timing=f"{open_t} - {close_t}",
                        payment_summary_html=payment_summary_html
                    )
                )

<<<<<<< HEAD
                # Trigger Admin Email
=======
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
                admin_details = f"Lab Test: {test_name} | Date: {sch_date} | Lab: {booking.lab_test.organization} - {pay_mode_label}"
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
            from app.core.email import send_health_package_booking_email, send_admin_new_booking_email

<<<<<<< HEAD
            # Assign ADVANCE_PAID vs PAID based on frontend intent
=======
            # --- NEW: Assign ADVANCE_PAID vs PAID based on frontend intent ---
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
            new_status = HealthPackageBookingStatus.ADVANCE_PAID if payment.payment_mode == PaymentMode.ADVANCE else HealthPackageBookingStatus.PAID

            await db.execute(
                update(HealthPackageBooking)
                .where(HealthPackageBooking.id == payment.booking_id)
                .values(status=new_status)
            )

            # Fetch booking context for emails
            stmt_booking = select(HealthPackageBooking).options(
                selectinload(HealthPackageBooking.health_package),
                selectinload(HealthPackageBooking.patient_user).selectinload(User.patient_profile)
            ).where(HealthPackageBooking.id == payment.booking_id)
            
            booking = (await db.execute(stmt_booking)).scalar_one_or_none()

            if booking and booking.patient_user:
                # Graceful fallback
                patient_name = "Patient"
                if booking.patient_user.patient_profile:
                    p_prof = booking.patient_user.patient_profile
                    patient_name = f"{p_prof.first_name} {p_prof.last_name}"
                
                package_name = booking.health_package.title
                sch_date = str(booking.scheduled_date)
                c_addr = booking.health_package.clinic_address or "Clinic address pending"
                open_t = booking.health_package.clinic_open_time.strftime("%I:%M %p") if booking.health_package.clinic_open_time else "TBD"
                close_t = booking.health_package.clinic_close_time.strftime("%I:%M %p") if booking.health_package.clinic_close_time else "TBD"
                
<<<<<<< HEAD
                # Trigger Patient Email
=======
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
                asyncio.create_task(
                    asyncio.to_thread(
                        send_health_package_booking_email,
                        to_email=booking.patient_user.email,
                        patient_name=patient_name,
                        package_name=package_name,
                        scheduled_date=sch_date,
                        clinic_address=c_addr,
                        clinic_timing=f"{open_t} - {close_t}",
                        payment_summary_html=payment_summary_html
                    )
                )

<<<<<<< HEAD
                # Trigger Admin Email
=======
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
                admin_details = f"Health Package: {package_name} | Date: {sch_date} | Org: {booking.health_package.organization} - {pay_mode_label}"
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

<<<<<<< HEAD
        # 7. Single Atomic Commit (Saves Payment and Booking Update simultaneously)
=======
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
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
        """Admin helper to retrieve paginated payment records."""
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
<<<<<<< HEAD

        
=======
    
    
>>>>>>> d332920287e566af0a5a4f391e847d9f14ba37c1
