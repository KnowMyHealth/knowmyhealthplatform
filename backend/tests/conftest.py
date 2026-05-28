# tests/conftest.py
import pytest
import uuid
from typing import AsyncGenerator
from fastapi.testclient import TestClient
from fastapi.security import HTTPAuthorizationCredentials
from unittest.mock import AsyncMock

from app.main import app
from app.core.security import security, get_current_user, AuthenticatedUser, RequireRole
from app.db.all_models import User
from app.modules.user.schemas import Role

@pytest.fixture
def client() -> TestClient:
    """Provides a fresh FastAPI TestClient for each test."""
    app.dependency_overrides = {}
    return TestClient(app)

@pytest.fixture
def override_auth():
    """
    A helper to override authentication and dynamically resolve RequireRole dependencies.
    Usage in test: override_auth(Role.ADMIN)
    """
    def _override(role_enum: Role = Role.PATIENT):
        # 1. Mock the security scheme and current user
        auth_user = AuthenticatedUser(id="00000000-0000-0000-0000-000000000000", email="test@test.com")
        app.dependency_overrides[security] = lambda: HTTPAuthorizationCredentials(scheme="Bearer", credentials="fake_token")
        app.dependency_overrides[get_current_user] = lambda: auth_user

        # 2. Mock DB User model
        mock_db_user = User(
            id=uuid.UUID(auth_user.id),
            email=auth_user.email,
            role=role_enum,
            is_active=True
        )

        # 3. Dynamic RequireRole Overrides
        for route in app.routes:
            if hasattr(route, "dependant"):
                for dep in route.dependant.dependencies:
                    if isinstance(dep.call, RequireRole):
                        allowed_roles = dep.call.allowed_roles
                        
                        # Define a closure to capture route-specific allowed_roles
                        async def make_mock_call(roles=allowed_roles):
                            if role_enum not in roles:
                                from fastapi import HTTPException
                                raise HTTPException(status_code=403, detail="Access denied")
                            return mock_db_user
                            
                        app.dependency_overrides[dep.call] = make_mock_call

    return _override