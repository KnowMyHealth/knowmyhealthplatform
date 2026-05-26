# app/modules/payment/models.py
import uuid
import enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy import String, Enum, func, Numeric

from app.db.base import Base

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class BookingType(str, enum.Enum):
    CONSULTATION = "CONSULTATION"
    LAB_TEST = "LAB_TEST"
    HEALTH_PACKAGE = "HEALTH_PACKAGE"

class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    
    # Razorpay Specific Identifiers
    razorpay_order_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    
    # Reference to what they are buying
    booking_type: Mapped[BookingType] = mapped_column(Enum(BookingType), nullable=False)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Payment id={self.id} status={self.status} order={self.razorpay_order_id}>"