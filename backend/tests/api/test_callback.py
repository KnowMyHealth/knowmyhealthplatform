# tests/api/test_callback.py
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.callback.dependencies import get_callback_service
from app.modules.callback.models import CallbackRequest, CallbackStatus
from app.modules.user.schemas import Role

def test_request_callback_public(client):
    """Test that anyone can submit a callback request."""
    # Mock the service
    mock_service = AsyncMock()
    
    # Setup mock return value with schema-compliant types
    mock_req = CallbackRequest(
        id=uuid.uuid4(),
        name="John",
        phone="9876543210",
        status=CallbackStatus.PENDING,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.create_request.return_value = mock_req
    
    app.dependency_overrides[get_callback_service] = lambda: mock_service

    payload = {"name": "John", "phone": "9876543210"}
    response = client.post("/api/v1/callbacks", json=payload)

    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["name"] == "John"
    mock_service.create_request.assert_called_once()

def test_list_callbacks_unauthorized(client):
    """Test that public users CANNOT view callbacks (unauthorized)."""
    response = client.get("/api/v1/callbacks")
    assert response.status_code == 401  # Updated to expect 401 instead of 403

def test_list_callbacks_admin(client, override_auth):
    """Test that Admins CAN view callbacks."""
    override_auth(Role.ADMIN)
    
    mock_service = AsyncMock()
    mock_service.list_requests.return_value = ([], 0) # Returns (items, total_count)
    app.dependency_overrides[get_callback_service] = lambda: mock_service

    response = client.get("/api/v1/callbacks")
    
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["meta"]["total_items"] == 0
    mock_service.list_requests.assert_called_once()