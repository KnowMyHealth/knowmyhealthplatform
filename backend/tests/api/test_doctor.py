# tests/api/test_doctor.py
import uuid
import io
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.doctor.dependencies import get_doctors_service
from app.modules.doctor.models import Doctor, DoctorStatus
from app.modules.user.schemas import Role

def test_apply_for_doctor_multipart(client):
    mock_service = AsyncMock()
    mock_doc = Doctor(
        id=uuid.uuid4(),
        first_name="Stephen",
        last_name="Strange",
        email="strange@surgery.com",
        specialization="Neuro-surgery",
        license_id="LIC-777",
        consultation_fee=Decimal("500.00"),
        is_available=True,
        video_consultation_enabled=True,
        offline_consultation_enabled=False,
        status=DoctorStatus.PENDING,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.create_doctor.return_value = mock_doc
    app.dependency_overrides[get_doctors_service] = lambda: mock_service

    fake_pdf = io.BytesIO(b"fake medical license pdf data")
    fake_pdf.name = "license.pdf"

    form_data = {
        "first_name": "Stephen",
        "last_name": "Strange",
        "email": "strange@surgery.com",
        "specialization": "Neuro-surgery",
        "license_id": "LIC-777",
        "consultation_fee": "500.00",
        "video_consultation_enabled": "true",
        "offline_consultation_enabled": "false"
    }

    response = client.post(
        "/api/v1/doctors/apply",
        data=form_data,
        files={"license_file": ("license.pdf", fake_pdf, "application/pdf")}
    )

    assert response.status_code == 201
    assert response.json()["data"]["first_name"] == "Stephen"
    mock_service.create_doctor.assert_called_once()