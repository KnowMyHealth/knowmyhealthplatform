# tests/api/test_patient.py
import uuid
from datetime import datetime, timezone, date
from unittest.mock import AsyncMock
from app.main import app
from app.modules.patient.dependencies import get_patient_service
from app.modules.patient.models import Patient, Gender
from app.modules.user.schemas import Role

def test_get_my_profile_patient(client, override_auth):
    override_auth(Role.PATIENT)
    mock_service = AsyncMock()
    
    mock_profile = Patient(
        id=uuid.uuid4(),
        user_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
        first_name="Bruce",
        last_name="Wayne",
        date_of_birth=date(1990, 5, 28),
        gender=Gender.MALE,
        blood_group="O+",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.get_patient_by_user_id.return_value = mock_profile
    app.dependency_overrides[get_patient_service] = lambda: mock_service

    response = client.get("/api/v1/patients/me")
    assert response.status_code == 200
    assert response.json()["data"]["first_name"] == "Bruce"