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
        # Initialize Razorpay Client
        self.client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID.get_secret_value(),
                settings.RAZORPAY_KEY_SECRET.get_secret_value()
            )
        )

    async def create_order(self, db: AsyncSession, user_id: UUID, payload: OrderCreateRequest) -> Payment:
        try:
            # 1. Razorpay expects amount in PAISE (1 INR = 100 Paise)
            amount_in_paise = int(payload.amount * 100)

            # 2. Call Razorpay API to generate the Order
            order_data = {
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": f"receipt_pb_{secrets.token_hex(4)}",
                "payment_capture": 1  # Auto-capture payment upon checkout
            }
            rzp_order = self.client.order.create(data=order_data)
            
            # 3. Save Pending Transaction to DB
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
        # 1. Cryptographically verify signature
        params_dict = {
            'razorpay_order_id': payload.razorpay_order_id,
            'razorpay_payment_id': payload.razorpay_payment_id,
            'razorpay_signature': payload.razorpay_signature
        }

        try:
            # This raises an Exception if the signature is invalid (fraudulent)
            self.client.utility.verify_payment_signature(params_dict)
        except Exception as e:
            logger.warning(f"Fraudulent payment attempt / invalid signature: {e}")
            raise PaymentError("Payment verification failed. Invalid signature.", status_code=403)

        # 2. Update local transaction status to SUCCESS
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

        # 3. UPDATE THE RELEVANT BOOKING TO COMPLETED/PAID STATUS
        # (This is where you bridge payment to your appointments, lab tests, etc.)
        if payment.booking_type == BookingType.CONSULTATION:
            from app.modules.consultation.models import Consultation, ConsultationStatus
            await db.execute(
                update(Consultation)
                .where(Consultation.id == payment.booking_id)
                .values(status=ConsultationStatus.SCHEDULED) # Set to scheduled after payment
            )
        
        # Add similar update statements for LAB_TEST or HEALTH_PACKAGE bookings here!

        await db.commit()
        await db.refresh(payment)
        
        logger.info(f"Payment verified successfully. Order: {payload.razorpay_order_id}")
        return payment