# tests/api/test_chat.py
from unittest.mock import AsyncMock
from app.main import app
from app.modules.chat.dependencies import get_chat_service

def test_chat_with_ai_assistant(client, override_auth):
    override_auth() # Defaults to Role.PATIENT
    mock_service = AsyncMock()
    mock_service.chat.return_value = "Hello! I am your medical assistant."
    app.dependency_overrides[get_chat_service] = lambda: mock_service

    payload = {"prompt": "What are the common symptoms of a cold?"}
    response = client.post("/api/v1/chat/", json=payload)

    assert response.status_code == 200
    assert "response" in response.json()["data"]
    assert response.json()["data"]["response"] == "Hello! I am your medical assistant."