# tests/api/test_consultation.py
import uuid
from datetime import datetime, timezone, date
from unittest.mock import AsyncMock
from app.main import app
from app.modules.consultation.dependencies import get_consultation_service
from app.modules.consultation.models import Consultation, ConsultationStatus, ConsultationType
from app.modules.user.schemas import Role

def test_book_consultation_patient(client, override_auth):
    override_auth(Role.PATIENT)
    mock_service = AsyncMock()
    
    mock_cons = Consultation(
        id=uuid.uuid4(),
        patient_user_id=uuid.uuid4(),
        doctor_id=uuid.uuid4(),
        scheduled_at=datetime.now(timezone.utc),
        status=ConsultationStatus.PENDING,
        consultation_type=ConsultationType.ONLINE,
        channel_name="kmh_abc123",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.book_consultation.return_value = mock_cons
    app.dependency_overrides[get_consultation_service] = lambda: mock_service

    payload = {
        "doctor_id": str(uuid.uuid4()),
        "scheduled_at": datetime.now(timezone.utc).isoformat(),
        "consultation_type": "ONLINE"
    }
    response = client.post("/api/v1/consultations/book", json=payload)
    assert response.status_code == 201
    assert response.json()["data"]["channel_name"] == "kmh_abc123"

def test_get_doctor_slots(client, override_auth):
    override_auth(Role.PATIENT)
    mock_service = AsyncMock()
    mock_service.get_available_slots.return_value = [{"time": "2026-05-28T10:00:00+05:30", "is_booked": False}]
    app.dependency_overrides[get_consultation_service] = lambda: mock_service

    doc_id = uuid.uuid4()
    target_date = date.today().isoformat()
    response = client.get(f"/api/v1/consultations/doctors/{doc_id}/slots?date={target_date}&timezone_offset=330")
    
    assert response.status_code == 200
    assert len(response.json()["data"]) == 1