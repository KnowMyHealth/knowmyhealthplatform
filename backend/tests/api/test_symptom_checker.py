# tests/api/test_symptom_checker.py
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.symptom_checker.dependencies import get_symptom_checker_service
from app.modules.symptom_checker.models import SymptomAssessment
from app.modules.user.schemas import Role

def test_list_past_assessments_user(client, override_auth):
    override_auth(Role.PATIENT)
    mock_service = AsyncMock()
    
    mock_assessment = SymptomAssessment(
        id=uuid.uuid4(),
        user_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
        possible_causes=["Seasonal Allergy", "Common Cold"],
        general_advice="Rest up and stay hydrated.",
        created_at=datetime.now(timezone.utc)
    )
    mock_service.list_user_assessments.return_value = [mock_assessment]
    app.dependency_overrides[get_symptom_checker_service] = lambda: mock_service

    response = client.get("/api/v1/symptom-checker")
    assert response.status_code == 200
    assert len(response.json()["data"]) == 1
    assert "Common Cold" in response.json()["data"][0]["possible_causes"]