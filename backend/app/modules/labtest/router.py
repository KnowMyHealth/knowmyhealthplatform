from uuid import UUID
from fastapi import APIRouter, Depends, logger, status, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.db.all_models import User
from app.utils.api_response import ApiResponse
from app.core.security import RequireRole, get_current_user
from app.core.rate_limiter import limiter
from app.utils.pagination import PaginationParams
from app.modules.user.schemas import Role

from app.modules.labtest.schemas import (
    LabTestSchema, 
    LabTestCreateRequest, 
    LabTestUpdateRequest,
    LabTestCategorySchema, 
    CategoryCreateRequest
)
from app.modules.labtest.service import LabTestService
from app.modules.labtest.dependencies import get_labtest_service
from loguru import logger

router = APIRouter(prefix="/lab-tests", tags=["Lab Tests"])

# -------------------------------------------------------------------------
# CATEGORIES
# -------------------------------------------------------------------------
@router.post(
    "/categories",
    status_code=status.HTTP_201_CREATED,
    summary="Create Lab Test Category (Admin)",
)
@limiter.limit("10/minute")
async def create_category(
    request: Request,
    payload: CategoryCreateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    logger.debug(f"--> POST /lab-tests/categories")
    category = await service.create_category(db, payload)
    return ApiResponse.created(
        data=LabTestCategorySchema.model_validate(category),
        message="Category created successfully."
    )

@router.get(
    "/categories",
    summary="List Lab Test Categories",
)
@limiter.limit("60/minute")
async def list_categories(
    request: Request,
    current_user = Depends(get_current_user), # Available to any authenticated user
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    logger.debug(f"--> GET /lab-tests/categories")
    categories = await service.get_all_categories(db)
    return ApiResponse.success(
        data=[LabTestCategorySchema.model_validate(c) for c in categories]
    )

@router.delete(
    "/categories/{category_id}",
    summary="Delete Lab Test Category (Admin)",
    description="Deletes a category. WARNING: This will automatically delete all lab tests belonging to this category."
)
@limiter.limit("10/minute")
async def delete_category(
    request: Request,
    category_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    logger.debug(f"--> DELETE /lab-tests/categories/{category_id}")
    await service.delete_category(db, category_id)
    return ApiResponse.no_content()

# -------------------------------------------------------------------------
# LAB TESTS
# -------------------------------------------------------------------------
@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Lab Test (Admin)",
)
@limiter.limit("20/minute")
async def create_lab_test(
    request: Request,
    payload: LabTestCreateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    logger.debug(f"--> POST /lab-tests")
    test = await service.create_test(db, payload)
    # Re-fetch to include the category mapping
    test_with_relations = await service.get_test_by_id(db, test.id)
    
    return ApiResponse.created(
        data=LabTestSchema.model_validate(test_with_relations),
        message="Lab test created successfully."
    )

@router.get(
    "",
    summary="List Lab Tests",
)
@limiter.limit("60/minute")
async def list_lab_tests(
    request: Request,
    params: PaginationParams = Depends(),
    category_id: UUID | None = None,
    is_active: bool | None = None,
    current_user = Depends(get_current_user), # Any logged-in user can view
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    logger.debug(f"--> GET /lab-tests with category_id={category_id} and is_active={is_active}")
    items, total = await service.list_tests(db, params, category_id, is_active)
    validated_items = [LabTestSchema.model_validate(i) for i in items]
    
    return ApiResponse.paginated(
        items=validated_items,
        total_items=total,
        params=params,
        message="Lab tests retrieved successfully."
    )

@router.get(
    "/{test_id}",
    summary="Get Lab Test Details",
)
@limiter.limit("60/minute")
async def get_lab_test(
    request: Request,
    test_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    logger.debug(f"--> GET /lab-tests/{test_id}")
    test = await service.get_test_by_id(db, test_id)
    return ApiResponse.success(data=LabTestSchema.model_validate(test))

@router.patch(
    "/{test_id}",
    summary="Update Lab Test (Admin)",
)
@limiter.limit("20/minute")
async def update_lab_test(
    request: Request,
    test_id: UUID,
    payload: LabTestUpdateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    logger.debug(f"--> PATCH /lab-tests/{test_id}")
    update_data = payload.model_dump(exclude_unset=True)
    updated_test = await service.update_test(db, test_id, update_data)
    
    return ApiResponse.success(
        data=LabTestSchema.model_validate(updated_test),
        message="Lab test updated successfully."
    )

@router.delete(
    "/{test_id}",
    summary="Delete Lab Test (Admin)",
)
@limiter.limit("10/minute")
async def delete_lab_test(
    request: Request,
    test_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    logger.debug(f"--> DELETE /lab-tests/{test_id}")
    await service.delete_test(db, test_id)
    return ApiResponse.no_content()