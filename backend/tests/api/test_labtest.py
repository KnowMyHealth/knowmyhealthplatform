# tests/api/test_labtest.py
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from app.main import app
from app.modules.labtest.dependencies import get_labtest_service
from app.modules.labtest.models import LabTest, LabTestCategory
from app.modules.user.schemas import Role

def test_create_labtest_category_admin(client, override_auth):
    override_auth(Role.ADMIN)
    mock_service = AsyncMock()
    
    mock_cat = LabTestCategory(
        id=uuid.uuid4(),
        name="Biochemistry",
        description="Blood chemistry profiles",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.create_category.return_value = mock_cat
    app.dependency_overrides[get_labtest_service] = lambda: mock_service

    payload = {"name": "Biochemistry", "description": "Blood chemistry profiles"}
    response = client.post("/api/v1/lab-tests/categories", json=payload)
    assert response.status_code == 201
    assert response.json()["data"]["name"] == "Biochemistry"

def test_list_lab_tests_user(client, override_auth):
    override_auth(Role.PATIENT)
    mock_service = AsyncMock()
    
    mock_test = LabTest(
        id=uuid.uuid4(),
        category_id=uuid.uuid4(),
        name="HbA1c Testing",
        organization="LabCorp",
        results_in=12,
        price=Decimal("450.00"),
        discount_percentage=Decimal("0.00"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_service.list_tests.return_value = ([mock_test], 1)
    app.dependency_overrides[get_labtest_service] = lambda: mock_service

    response = client.get("/api/v1/lab-tests?limit=10")
    assert response.status_code == 200
    assert len(response.json()["data"]) == 1