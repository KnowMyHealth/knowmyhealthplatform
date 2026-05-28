# tests/api/test_prescription.py
import uuid
import io
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.prescription.dependencies import get_prescription_service
from app.modules.prescription.models import Prescription
from app.modules.user.schemas import Role

def test_get_prescription_owner_access(client, override_auth):
    override_auth(Role.PATIENT)
    mock_service = AsyncMock()
    
    user_uuid = uuid.UUID("00000000-0000-0000-0000-000000000000")
    mock_pres = Prescription(
        id=uuid.uuid4(),
        user_id=user_uuid,
        image_url="https://...",
        doctor_name="Dr. Banner",
        diagnosis="Gamma poisoning",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.get_prescription.return_value = mock_pres
    app.dependency_overrides[get_prescription_service] = lambda: mock_service

    response = client.get(f"/api/v1/prescriptions/{mock_pres.id}")
    assert response.status_code == 200
    assert response.json()["data"]["doctor_name"] == "Dr. Banner"

def test_get_prescription_unauthorized_access(client, override_auth):
    # Log in as a different patient
    override_auth(Role.PATIENT)
    mock_service = AsyncMock()
    
    # Prescription belongs to a completely different user UUID
    different_user_uuid = uuid.uuid4()
    mock_pres = Prescription(
        id=uuid.uuid4(),
        user_id=different_user_uuid,
        image_url="https://...",
        doctor_name="Dr. Banner",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.get_prescription.return_value = mock_pres
    app.dependency_overrides[get_prescription_service] = lambda: mock_service

    # Expected to trigger the newly added IDOR block we created earlier
    response = client.get(f"/api/v1/prescriptions/{mock_pres.id}")
    assert response.status_code == 403