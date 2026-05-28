# tests/api/test_health_package.py
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.health_package.dependencies import get_health_package_service
from app.modules.health_package.models import HealthPackage
from app.modules.user.schemas import Role

def test_create_health_package_admin(client, override_auth):
    override_auth(Role.ADMIN)
    mock_service = AsyncMock()
    
    mock_pkg = HealthPackage(
        id=uuid.uuid4(),
        title="Comprehensive Heart Check",
        organization="Metropolis Labs",
        description="A full cardiovascular assessment.",
        price=Decimal("4500.00"),
        discount_percentage=Decimal("10.00"),
        included_tests=["ECG", "Lipid Profile", "Cardiac Enzymes"],
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.create_package.return_value = mock_pkg
    app.dependency_overrides[get_health_package_service] = lambda: mock_service

    payload = {
        "title": "Comprehensive Heart Check",
        "organization": "Metropolis Labs",
        "description": "A full cardiovascular assessment.",
        "price": 4500.00,
        "discount_percentage": 10.00,
        "included_tests": ["ECG", "Lipid Profile"],
        "is_active": True
    }
    response = client.post("/api/v1/health-packages", json=payload)
    assert response.status_code == 201
    assert response.json()["data"]["title"] == "Comprehensive Heart Check"