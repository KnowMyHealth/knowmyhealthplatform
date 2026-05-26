# app/modules/payment/service.py
import razorpay
import secrets
from uuid import UUID
from decimal import Decimal
from loguru import logger
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

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

        try:
            self.client.utility.verify_payment_signature(params_dict)
        except Exception as e:
            logger.warning(f"Fraudulent payment attempt / invalid signature: {e}")
            raise PaymentError("Payment verification failed. Invalid signature.", status_code=403)

        stmt = (
            update(Payment)
            .where(Payment.razorpay_order_id == payload.razorpay_order_id)
            .values(
                status=PaymentStatus.SUCCESS,
                razorpay_payment_id=payload.razorpay_payment_id
            )
            .returning(Payment)
        )
        result = await db.execute(stmt)
        payment = result.scalar_one_or_none()

        if not payment:
            raise PaymentError("Transaction reference not found in database.")

        if payment.booking_type == BookingType.CONSULTATION:
            from app.modules.consultation.models import Consultation, ConsultationStatus
            await db.execute(
                update(Consultation)
                .where(Consultation.id == payment.booking_id)
                .values(status=ConsultationStatus.SCHEDULED)
            )
        
        elif payment.booking_type == BookingType.LAB_TEST:
            from app.modules.labtest.models import LabTestBooking, LabTestBookingStatus
            from app.db.all_models import User
            from sqlalchemy.orm import selectinload
            import asyncio
            from app.core.email import send_labtest_booking_email

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

            if booking and booking.patient_user and booking.patient_user.patient_profile:
                p_prof = booking.patient_user.patient_profile
                
                patient_name = f"{p_prof.first_name} {p_prof.last_name}"
                test_name = booking.lab_test.name
                sch_date = str(booking.scheduled_date)
                c_addr = booking.lab_test.clinic_address or "Clinic address pending"
                
                open_t = booking.lab_test.clinic_open_time.strftime("%I:%M %p") if booking.lab_test.clinic_open_time else "TBD"
                close_t = booking.lab_test.clinic_close_time.strftime("%I:%M %p") if booking.lab_test.clinic_close_time else "TBD"
                c_time = f"{open_t} - {close_t}"

                asyncio.create_task(
                    asyncio.to_thread(
                        send_labtest_booking_email,
                        to_email=booking.patient_user.email,
                        patient_name=patient_name,
                        test_name=test_name,
                        scheduled_date=sch_date,
                        clinic_address=c_addr,
                        clinic_timing=c_time
                    )
                )

        await db.commit()
        await db.refresh(payment)
        return payment