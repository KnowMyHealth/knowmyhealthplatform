# tests/api/test_partner.py
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.partner.dependencies import get_partner_service
from app.modules.partner.models import Partner, PartnerStatus, PartnerType
from app.modules.user.schemas import Role

def test_submit_partner_application_public(client):
    mock_service = AsyncMock()
    mock_partner = Partner(
        id=uuid.uuid4(),
        company_name="Apex Diagnostic Centers",
        contact_person="Bruce Wayne",
        email="bruce@apexlabs.com",
        phone="1234567890",
        partner_type=PartnerType.LABORATORY,
        address="Gotham City",
        status=PartnerStatus.PENDING,
        discount_percentage=Decimal("10.00"),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.create_partner.return_value = mock_partner
    app.dependency_overrides[get_partner_service] = lambda: mock_service

    payload = {
        "company_name": "Apex Diagnostic Centers",
        "contact_person": "Bruce Wayne",
        "email": "bruce@apexlabs.com",
        "phone": "1234567890",
        "partner_type": "LABORATORY",
        "address": "Gotham City"
    }
    response = client.post("/api/v1/partners/apply", json=payload)
    assert response.status_code == 201
    assert response.json()["data"]["company_name"] == "Apex Diagnostic Centers"