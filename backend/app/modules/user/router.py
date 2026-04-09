from uuid import UUID
from loguru import logger
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.db.deps import get_db
from app.modules.user.exceptions import UserNotFoundError
from app.utils.api_response import ApiResponse
from app.utils.api_error import ForbiddenError
from app.core.security import get_current_user
from app.modules.user.schemas import UserSchema
from app.modules.user.service import UsersService
from app.modules.user.dependencies import get_users_service
from app.modules.user.schemas import Role
from app.core.rate_limiter import limiter


router = APIRouter(prefix="/users", tags=["Users"])


# -------------------------------------------------------------------------
# ADMIN: UPDATE USER ROLE
# -------------------------------------------------------------------------

@router.patch(
    "/{user_id}/role",
    status_code=status.HTTP_200_OK,
    summary="Update user role (Admin)",
    description="Allows admin to update a user's role."
)
@limiter.limit("10/minute")
async def update_user_role(
    request: Request,
    user_id: UUID,
    role: Role = Body(...),
    current_user = Depends(get_current_user),
    service: UsersService = Depends(get_users_service)
):
    logger.debug("--> Called PATCH /users/{user_id}/role route")

    if current_user.role != "ADMIN":
        raise ForbiddenError("Only admins can update roles")

    updated_user = await service.update_user_role(
        db=None,
        user_id=user_id,
        role=role
    )

    validated_user = UserSchema.model_validate(updated_user)

    return ApiResponse.success(
        data=validated_user,
        message="User role updated successfully."
    )


@router.get("/me")
async def get_my_profile(
    auth_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: UsersService = Depends(get_users_service)
):
    logger.debug("--> Called GET /users/me route")
    # Manually extract and convert
    user_id = UUID(str(auth_user.id))
    
    # Manually fetch from DB
    user = await service.get_user_by_id(db, user_id)
    
    if not user:
        raise UserNotFoundError()

    return ApiResponse.success(data=UserSchema.model_validate(user))