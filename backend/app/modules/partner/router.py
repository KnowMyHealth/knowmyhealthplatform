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

from app.modules.partner.schemas import (
    PartnerSchema, 
    PartnerCreateRequest, 
    PartnerStatusUpdateRequest
)
from app.modules.partner.service import PartnerService
from app.modules.partner.dependencies import get_partner_service

router = APIRouter(prefix="/partners", tags=["Partners"])

# -------------------------------------------------------------------------
# PUBLIC: SUBMIT APPLICATION
# -------------------------------------------------------------------------
@router.post(
    "/apply",
    status_code=status.HTTP_201_CREATED,
    summary="Submit Partner Application",
)
@limiter.limit("5/minute")
async def apply_for_partner(
    request: Request,
    payload: PartnerCreateRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    partner = await service.create_partner(db, payload)
    return ApiResponse.created(
        data=PartnerSchema.model_validate(partner),
        message="Partner application submitted successfully. Our team will contact you shortly."
    )

# -------------------------------------------------------------------------
# ADMIN: MANAGE APPLICATIONS
# -------------------------------------------------------------------------
@router.get(
    "", 
    summary="List Partner Applications (Admin)"
)
@limiter.limit("30/minute")
async def list_partners(
    request: Request,
    params: PaginationParams = Depends(),
    status: str | None = None, # e.g. ?status=PENDING
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    items, total = await service.list_partners(db, params, status)
    validated_items = [PartnerSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated_items, total_items=total, params=params)

@router.get(
    "/{partner_id}", 
    summary="Get Partner Details (Admin)"
)
@limiter.limit("60/minute")
async def get_partner_details(
    request: Request,
    partner_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    partner = await service.get_partner_by_id(db, partner_id)
    return ApiResponse.success(data=PartnerSchema.model_validate(partner))

@router.patch(
    "/{partner_id}/status", 
    summary="Update Partner Status (Admin)"
)
@limiter.limit("10/minute")
async def update_partner_status(
    request: Request,
    partner_id: UUID,
    payload: PartnerStatusUpdateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    updated_partner = await service.update_partner_status(db, partner_id, payload.status)
    return ApiResponse.success(
        data=PartnerSchema.model_validate(updated_partner),
        message="Partner status updated."
    )


@router.delete(
    "/{partner_id}", 
    summary="Delete Partner Application (Admin)",
    description="Permanently deletes a partner application."
)
@limiter.limit("10/minute")
async def delete_partner(
    request: Request,
    partner_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    await service.delete_partner(db, partner_id)
    return ApiResponse.no_content()