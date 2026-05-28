# tests/api/test_user.py
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.user.dependencies import get_users_service
from app.modules.user.models import User
from app.modules.user.schemas import Role

def test_get_user_profile_me_authenticated(client, override_auth):
    override_auth(Role.PATIENT)
    mock_service = AsyncMock()
    
    mock_user = User(
        id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
        email="test@test.com",
        role=Role.PATIENT,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.get_user_by_id.return_value = mock_user
    app.dependency_overrides[get_users_service] = lambda: mock_service

    response = client.get("/api/v1/users/me")
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "test@test.com"

def test_admin_dashboard_metrics_as_patient_denied(client, override_auth):
    override_auth(Role.PATIENT)
    response = client.get("/api/v1/users/admin/dashboard/metrics")
    assert response.status_code == 403 # Only Admins can access metrics