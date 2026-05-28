# tests/api/test_coupon.py
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.coupon.dependencies import get_coupon_service
from app.modules.coupon.models import Coupon
from app.modules.coupon.schemas import CouponValidateResponse
from app.modules.user.schemas import Role

def test_create_coupon_admin(client, override_auth):
    override_auth(Role.ADMIN)
    mock_service = AsyncMock()
    
    mock_coupon = Coupon(
        id=uuid.uuid4(),
        code="SAVE50",
        discount_percentage=Decimal("50.00"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.create_coupon.return_value = mock_coupon
    app.dependency_overrides[get_coupon_service] = lambda: mock_service

    payload = {
        "code": "save50",
        "discount_percentage": 50.00,
        "is_active": True
    }
    response = client.post("/api/v1/coupons", json=payload)
    assert response.status_code == 201
    assert response.json()["data"]["code"] == "SAVE50"

def test_validate_coupon_user(client, override_auth):
    override_auth(Role.PATIENT)
    mock_service = AsyncMock()
    
    mock_resp = CouponValidateResponse(
        is_valid=True,
        message="Coupon applied successfully!",
        original_price=Decimal("1000.00"),
        discount_percentage=Decimal("15.00"),
        discount_amount=Decimal("150.00"),
        final_price=Decimal("850.00")
    )
    mock_service.validate_coupon.return_value = mock_resp
    app.dependency_overrides[get_coupon_service] = lambda: mock_service

    payload = {
        "code": "HEALTH15",
        "lab_test_id": str(uuid.uuid4())
    }
    response = client.post("/api/v1/coupons/validate", json=payload)
    assert response.status_code == 200
    assert response.json()["data"]["is_valid"] is True