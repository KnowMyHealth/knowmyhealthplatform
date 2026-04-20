from uuid import UUID
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.db.all_models import User
from app.utils.api_response import ApiResponse
from app.core.security import RequireRole, get_current_user
from app.core.rate_limiter import limiter
from app.utils.pagination import PaginationParams
from app.modules.user.schemas import Role

from app.modules.coupon.schemas import CouponSchema, CouponCreateRequest, CouponUpdateRequest, CouponValidateRequest
from app.modules.coupon.service import CouponService
from app.modules.coupon.dependencies import get_coupon_service

router = APIRouter(prefix="/coupons", tags=["Coupons"])

@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a Coupon (Admin)")
@limiter.limit("10/minute")
async def create_coupon(
    request: Request,
    payload: CouponCreateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: CouponService = Depends(get_coupon_service)
):
    coupon = await service.create_coupon(db, payload)
    return ApiResponse.created(data=CouponSchema.model_validate(coupon), message="Coupon created successfully.")

@router.get("", summary="List Coupons (Admin)")
@limiter.limit("30/minute")
async def list_coupons(
    request: Request,
    params: PaginationParams = Depends(),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: CouponService = Depends(get_coupon_service)
):
    items, total = await service.list_coupons(db, params)
    validated_items = [CouponSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated_items, total_items=total, params=params)

@router.patch(
    "/{coupon_id}",
    summary="Update Coupon (Admin)",
    description="Updates an existing coupon. Send only the fields you wish to change."
)
@limiter.limit("20/minute")
async def update_coupon(
    request: Request,
    coupon_id: UUID,
    payload: CouponUpdateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: CouponService = Depends(get_coupon_service)
):
    # exclude_unset=True ensures we only update fields the frontend actually sent
    update_data = payload.model_dump(exclude_unset=True)
    
    updated_coupon = await service.update_coupon(db, coupon_id, update_data)
    
    return ApiResponse.success(
        data=CouponSchema.model_validate(updated_coupon),
        message="Coupon updated successfully."
    )

@router.delete("/{coupon_id}", summary="Delete Coupon (Admin)")
@limiter.limit("10/minute")
async def delete_coupon(
    request: Request,
    coupon_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: CouponService = Depends(get_coupon_service)
):
    await service.delete_coupon(db, coupon_id)
    return ApiResponse.no_content()

@router.post("/validate", summary="Validate and Apply Coupon (Public/User)")
@limiter.limit("30/minute")
async def validate_coupon(
    request: Request,
    payload: CouponValidateRequest = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: CouponService = Depends(get_coupon_service)
):
    result = await service.validate_coupon(db, payload.code, payload.lab_test_id)
    return ApiResponse.success(data=result.model_dump(), message=result.message)


