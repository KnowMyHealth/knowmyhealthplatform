# tests/api/test_payment.py
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.payment.models import Payment, PaymentStatus, BookingType
from app.common.exceptions import BaseDomainException

class MockPaymentService:
    async def create_order(self, db, user_id, payload):
        return Payment(
            id=uuid.uuid4(),
            user_id=user_id,
            amount=payload.amount,
            currency="INR",
            razorpay_order_id="order_fake123",
            status=PaymentStatus.PENDING,
            booking_type=payload.booking_type,
            booking_id=payload.booking_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

def test_create_payment_order_patient(client, override_auth):
    override_auth() # Defaults to Role.PATIENT
    
    # Fast path: override the instantiated service completely
    from app.modules.payment.service import PaymentService
    app.dependency_overrides[PaymentService] = lambda: MockPaymentService()

    payload = {
        "amount": 1500.00,
        "booking_type": "CONSULTATION",
        "booking_id": str(uuid.uuid4())
    }
    response = client.post("/api/v1/payments/order", json=payload)
    assert response.status_code == 200
    assert response.json()["razorpay_order_id"] == "order_fake123"