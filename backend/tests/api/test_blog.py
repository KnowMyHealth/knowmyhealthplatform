# tests/api/test_blog.py
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.blog.dependencies import get_blog_service
from app.modules.blog.models import Blog
from app.modules.user.schemas import Role

def test_generate_blog_draft_admin(client, override_auth):
    override_auth(Role.ADMIN)
    mock_service = AsyncMock()
    mock_service.generate_blog_draft.return_value = {
        "title": "AI Heart Health Guide",
        "category": "Cardiology",
        "content": "## Markdown Content",
        "cover_image_url": "https://..."
    }
    app.dependency_overrides[get_blog_service] = lambda: mock_service

    payload = {
        "research_topic": "Intermittent Fasting",
        "target_audience": "General Patients",
        "tone_of_voice": "Empathetic",
        "additional_instructions": "Keep it under 500 words"
    }
    response = client.post("/api/v1/blogs/generate", json=payload)
    assert response.status_code == 200
    assert response.json()["data"]["title"] == "AI Heart Health Guide"

def test_list_published_blogs_public(client):
    mock_service = AsyncMock()
    mock_blog = Blog(
        id=uuid.uuid4(),
        author_id=uuid.uuid4(),
        title="Heart Care",
        category="Cardio",
        content="Read more",
        cover_image_url="https://...",
        is_published=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.list_blogs.return_value = ([mock_blog], 1)
    app.dependency_overrides[get_blog_service] = lambda: mock_service

    response = client.get("/api/v1/blogs?limit=5")
    assert response.status_code == 200
    assert len(response.json()["data"]) == 1

def test_list_blogs_admin_only(client, override_auth):
    override_auth(Role.PATIENT)
    response = client.get("/api/v1/blogs/admin")
    assert response.status_code == 403