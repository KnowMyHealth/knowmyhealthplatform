# app/modules/callback/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.db.deps import get_db
from app.db.all_models import User
from app.utils.api_response import ApiResponse
from app.core.security import RequireRole
from app.core.rate_limiter import limiter
from app.utils.pagination import PaginationParams
from app.modules.user.schemas import Role

from app.modules.callback.schemas import (
    CallbackRequestSchema, 
    CallbackCreateRequest, 
    CallbackUpdateRequest
)
from app.modules.callback.service import CallbackService
from app.modules.callback.dependencies import get_callback_service

router = APIRouter(prefix="/callbacks", tags=["Callbacks"])

# -------------------------------------------------------------------------
# PUBLIC: ANY VISITOR CAN REQUEST CALLBACK
# -------------------------------------------------------------------------
@router.post(
    "", 
    status_code=status.HTTP_201_CREATED, 
    summary="Request a Callback"
)
@limiter.limit("3/minute") # Strict spam protection per IP
async def request_callback(
    request: Request,
    payload: CallbackCreateRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    service: CallbackService = Depends(get_callback_service)
):
    req = await service.create_request(db, payload)
    return ApiResponse.created(
        data=CallbackRequestSchema.model_validate(req),
        message="Callback request submitted successfully. We will call you shortly."
    )


# -------------------------------------------------------------------------
# ADMIN ONLY: LIST, GET DETAILS, UPDATE, DELETE
# -------------------------------------------------------------------------
@router.get(
    "", 
    summary="List Callback Requests (Admin)"
)
@limiter.limit("30/minute")
async def list_callbacks(
    request: Request,
    params: PaginationParams = Depends(),
    status: str | None = None, # e.g. ?status=PENDING
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: CallbackService = Depends(get_callback_service)
):
    items, total = await service.list_requests(db, params, status)
    validated = [CallbackRequestSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated, total_items=total, params=params)


@router.get(
    "/{callback_id}", 
    summary="Get Callback Details (Admin)"
)
@limiter.limit("60/minute")
async def get_callback_details(
    request: Request,
    callback_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: CallbackService = Depends(get_callback_service)
):
    req = await service.get_request_by_id(db, callback_id)
    return ApiResponse.success(data=CallbackRequestSchema.model_validate(req))


@router.patch(
    "/{callback_id}", 
    summary="Update Callback Status (Admin)"
)
@limiter.limit("20/minute")
async def update_callback_status(
    request: Request,
    callback_id: UUID,
    payload: CallbackUpdateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: CallbackService = Depends(get_callback_service)
):
    update_data = payload.model_dump(exclude_unset=True)
    req = await service.update_request(db, callback_id, update_data)
    return ApiResponse.success(
        data=CallbackRequestSchema.model_validate(req),
        message="Callback request updated successfully."
    )


@router.delete(
    "/{callback_id}", 
    summary="Delete Callback Request (Admin)"
)
@limiter.limit("10/minute")
async def delete_callback(
    request: Request,
    callback_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: CallbackService = Depends(get_callback_service)
):
    await service.delete_request(db, callback_id)
    return ApiResponse.no_content()