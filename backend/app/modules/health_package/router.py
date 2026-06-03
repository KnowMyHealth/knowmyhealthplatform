# app/modules/health_package/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.db.deps import get_db
from app.db.all_models import User
from app.utils.api_response import ApiResponse
from app.core.security import RequireRole, get_current_user, get_optional_user
from app.core.rate_limiter import limiter
from app.utils.pagination import PaginationParams
from app.modules.user.schemas import Role

from app.modules.health_package.models import HealthPackageBookingStatus
from app.modules.health_package.schemas import (
    HealthPackageSchema, 
    HealthPackageCreateRequest, 
    HealthPackageUpdateRequest,
    HealthPackageBookingSchema,
    BookHealthPackageRequest
)
from app.modules.health_package.service import HealthPackageService
from app.modules.health_package.dependencies import get_health_package_service

router = APIRouter(prefix="/health-packages", tags=["Health Packages"])

# -------------------------------------------------------------------------
# ADMIN ONLY: CREATE, UPDATE, DELETE
# -------------------------------------------------------------------------
@router.post("", status_code=status.HTTP_201_CREATED, summary="Create Health Package (Admin)")
@limiter.limit("20/minute")
async def create_package(
    request: Request,
    payload: HealthPackageCreateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: HealthPackageService = Depends(get_health_package_service)
):
    package = await service.create_package(db, payload)
    return ApiResponse.created(data=HealthPackageSchema.model_validate(package))

@router.patch("/{package_id}", summary="Update Health Package (Admin)")
@limiter.limit("20/minute")
async def update_package(
    request: Request,
    package_id: UUID,
    payload: HealthPackageUpdateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: HealthPackageService = Depends(get_health_package_service)
):
    update_data = payload.model_dump(exclude_unset=True)
    updated_package = await service.update_package(db, package_id, update_data)
    return ApiResponse.success(data=HealthPackageSchema.model_validate(updated_package))

@router.delete("/{package_id}", summary="Delete Health Package (Admin)")
@limiter.limit("10/minute")
async def delete_package(
    request: Request,
    package_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: HealthPackageService = Depends(get_health_package_service)
):
    await service.delete_package(db, package_id)
    return ApiResponse.no_content()

# -------------------------------------------------------------------------
# PUBLIC/ALL USERS: LIST AND GET DETAILS
# -------------------------------------------------------------------------
@router.get("", summary="List Health Packages")
@limiter.limit("60/minute")
async def list_packages(
    request: Request,
    params: PaginationParams = Depends(),
    is_active: bool | None = None,
    current_user = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    service: HealthPackageService = Depends(get_health_package_service)
):
    items, total = await service.list_packages(db, params, is_active)
    validated_items = [HealthPackageSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated_items, total_items=total, params=params)

@router.get("/{package_id}", summary="Get Health Package Details")
@limiter.limit("60/minute")
async def get_package(
    request: Request,
    package_id: UUID,
    current_user = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    service: HealthPackageService = Depends(get_health_package_service)
):
    package = await service.get_package_by_id(db, package_id)
    return ApiResponse.success(data=HealthPackageSchema.model_validate(package))

# -------------------------------------------------------------------------
# BOOKINGS
# -------------------------------------------------------------------------
@router.post("/bookings", status_code=status.HTTP_201_CREATED, summary="Book a Health Package (Patient)")
@limiter.limit("5/minute")
async def book_package(
    request: Request,
    payload: BookHealthPackageRequest = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: HealthPackageService = Depends(get_health_package_service)
):
    booking = await service.book_package(db, UUID(str(current_user.id)), payload)
    return ApiResponse.created(data=HealthPackageBookingSchema.model_validate(booking))

@router.get("/bookings/list", summary="View All Booked Packages (Admin)")
@limiter.limit("30/minute")
async def list_all_bookings(
    request: Request,
    params: PaginationParams = Depends(),
    status: HealthPackageBookingStatus | None = None,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: HealthPackageService = Depends(get_health_package_service)
):
    items, total = await service.list_bookings(db, params, status)
    validated = [HealthPackageBookingSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated, total_items=total, params=params)

@router.get("/bookings/me", summary="View My Booked Packages (Patient)")
@limiter.limit("30/minute")
async def list_my_bookings(
    request: Request,
    params: PaginationParams = Depends(),
    current_user = Depends(RequireRole([Role.PATIENT])),
    db: AsyncSession = Depends(get_db),
    service: HealthPackageService = Depends(get_health_package_service)
):
    items, total = await service.get_patient_bookings(db, UUID(str(current_user.id)), params)
    validated = [HealthPackageBookingSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated, total_items=total, params=params)

@router.get("/bookings/patient/{patient_user_id}", summary="View Specific Patient Package Bookings (Admin)")
@limiter.limit("30/minute")
async def list_patient_bookings(
    request: Request,
    patient_user_id: UUID,
    params: PaginationParams = Depends(),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: HealthPackageService = Depends(get_health_package_service)
):
    items, total = await service.get_patient_bookings(db, patient_user_id, params)
    validated = [HealthPackageBookingSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated, total_items=total, params=params)