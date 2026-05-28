# app/modules/payment/schemas.py
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from app.modules.payment.models import PaymentStatus, BookingType

class OrderCreateRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Amount in INR (e.g. 500.00)")
    booking_type: BookingType
    booking_id: UUID = Field(..., description="ID of the consultation, lab test booking, or package booking")

class OrderCreateResponse(BaseModel):
    payment_id: UUID = Field(..., description="Internal DB payment ID")
    razorpay_order_id: str = Field(..., description="RZP order ID (pass this to frontend checkout)")
    amount: Decimal
    currency: str

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentPatientProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    first_name: str
    last_name: str
    phone_number: str | None = None


class PaymentUserSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: str
    patient_profile: PaymentPatientProfileSchema | None = None

class AdminTransactionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: Decimal
    currency: str
    razorpay_order_id: str
    razorpay_payment_id: str | None = None
    status: PaymentStatus
    booking_type: BookingType
    booking_id: UUID
    created_at: datetime
    user: PaymentUserSchema | None = None
