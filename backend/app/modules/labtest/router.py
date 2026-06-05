# app/modules/labtest/router.py
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, status, Request, Body, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.db.deps import get_db
from app.db.all_models import User
from app.utils.api_response import ApiResponse
from app.utils.api_error import BadRequestError
from app.core.security import RequireRole, get_current_user
from app.core.rate_limiter import limiter
from app.utils.pagination import PaginationParams
from app.modules.user.schemas import Role

from app.modules.labtest.models import LabTestBookingStatus
from app.modules.labtest.schemas import (
    LabTestSchema, 
    LabTestCreateRequest, 
    LabTestUpdateRequest,
    LabTestCategorySchema, 
    CategoryCreateRequest,
    LabTestBookingSchema,
    BookLabTestRequest,
    SetLabTestAvailabilityRequest,
    AvailabilitySchema
)
from app.modules.labtest.service import LabTestService
from app.modules.labtest.dependencies import get_labtest_service

router = APIRouter(prefix="/lab-tests", tags=["Lab Tests"])

# 50 MB limit for CSV uploads
MAX_CSV_SIZE = 52428800 

# -------------------------------------------------------------------------
# CATEGORIES
# -------------------------------------------------------------------------
@router.post("/categories", status_code=status.HTTP_201_CREATED, summary="Create Lab Test Category (Admin)")
@limiter.limit("10/minute")
async def create_category(
    request: Request,
    payload: CategoryCreateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    category = await service.create_category(db, payload)
    return ApiResponse.created(data=LabTestCategorySchema.model_validate(category))

@router.get("/categories", summary="List Lab Test Categories")
@limiter.limit("60/minute")
async def list_categories(
    request: Request,
    current_user = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    categories = await service.get_all_categories(db)
    return ApiResponse.success(data=[LabTestCategorySchema.model_validate(c) for c in categories])

@router.delete("/categories/{category_id}", summary="Delete Lab Test Category (Admin)")
@limiter.limit("10/minute")
async def delete_category(
    request: Request,
    category_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    await service.delete_category(db, category_id)
    return ApiResponse.no_content()


# -------------------------------------------------------------------------
# LAB TESTS
# -------------------------------------------------------------------------
@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new Lab Test (Admin)")
@limiter.limit("20/minute")
async def create_lab_test(
    request: Request,
    payload: LabTestCreateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    test = await service.create_test(db, payload)
    test_with_relations = await service.get_test_by_id(db, test.id)
    return ApiResponse.created(data=LabTestSchema.model_validate(test_with_relations))

# --- NEW: BULK UPLOAD ENDPOINT ---
@router.post("/bulk", summary="Bulk Upload Lab Tests via CSV (Admin)")
@limiter.limit("5/minute")
async def bulk_upload_lab_tests(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    if not file.filename.endswith(".csv"):
        raise BadRequestError("Only CSV files are allowed.")
        
    if file.size and file.size > MAX_CSV_SIZE:
        raise BadRequestError("CSV file size exceeds the 50MB limit.")

    csv_bytes = await file.read()
    
    if len(csv_bytes) > MAX_CSV_SIZE:
        raise BadRequestError("CSV file size exceeds the 50MB limit.")

    summary = await service.bulk_upload_tests(db, csv_bytes)
    
    if summary["success_count"] == 0 and summary["failure_count"] > 0:
        return ApiResponse.error(
            message="Bulk upload failed. No tests were successfully imported.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            errors=summary["failed"]
        )
    
    return ApiResponse.success(
        data=summary,
        message=f"Bulk upload complete. Successfully imported {summary['success_count']} tests."
    )

@router.get("", summary="List Lab Tests")
@limiter.limit("60/minute")
async def list_lab_tests(
    request: Request,
    params: PaginationParams = Depends(),
    category_id: UUID | None = None,
    is_active: bool | None = None,
    current_user = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    items, total = await service.list_tests(db, params, category_id, is_active)
    validated_items = [LabTestSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated_items, total_items=total, params=params)

@router.post("/{test_id}/availability", summary="Set Availability for a Lab Test (Admin)")
@limiter.limit("20/minute")
async def set_test_availability(
    request: Request,
    test_id: UUID,
    payload: SetLabTestAvailabilityRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    await service.set_test_availability(db, test_id, [s.model_dump() for s in payload.schedule])
    return ApiResponse.success(message="Test availability schedule updated.")

@router.get("/{test_id}/availability", summary="Get Availability for a Lab Test")
@limiter.limit("60/minute")
async def get_test_availability(
    request: Request,
    test_id: UUID,
    current_user = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    availabilities = await service.get_test_availability(db, test_id)
    return ApiResponse.success(data=[AvailabilitySchema.model_validate(a) for a in availabilities])

@router.get("/{test_id}/slots", summary="Get Lab Test Time Slots")
@limiter.limit("60/minute")
async def get_test_slots(
    request: Request,
    test_id: UUID,
    date: date, 
    timezone_offset: int = Query(0, description="Timezone offset from UTC in minutes (e.g., -330 for India)"),
    current_user = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    slots = await service.get_available_slots(db, test_id, date, timezone_offset)
    return ApiResponse.success(data=slots)

@router.get("/{test_id}", summary="Get Lab Test Details")
@limiter.limit("60/minute")
async def get_lab_test(
    request: Request,
    test_id: UUID,
    current_user = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    test = await service.get_test_by_id(db, test_id)
    return ApiResponse.success(data=LabTestSchema.model_validate(test))

@router.patch("/{test_id}", summary="Update Lab Test (Admin)")
@limiter.limit("20/minute")
async def update_lab_test(
    request: Request,
    test_id: UUID,
    payload: LabTestUpdateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    update_data = payload.model_dump(exclude_unset=True)
    updated_test = await service.update_test(db, test_id, update_data)
    return ApiResponse.success(data=LabTestSchema.model_validate(updated_test))

@router.delete("/{test_id}", summary="Delete Lab Test (Admin)")
@limiter.limit("10/minute")
async def delete_lab_test(
    request: Request,
    test_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    await service.delete_test(db, test_id)
    return ApiResponse.no_content()

# -------------------------------------------------------------------------
# BOOKINGS
# -------------------------------------------------------------------------
@router.post("/bookings", status_code=status.HTTP_201_CREATED, summary="Book a Lab Test (Patient)")
@limiter.limit("5/minute")
async def book_lab_test(
    request: Request,
    payload: BookLabTestRequest = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    booking = await service.book_test(db, UUID(str(current_user.id)), payload)
    return ApiResponse.created(data=LabTestBookingSchema.model_validate(booking))

@router.get("/bookings/list", summary="View All Booked Tests (Admin)")
@limiter.limit("30/minute")
async def list_all_bookings(
    request: Request,
    params: PaginationParams = Depends(),
    status: LabTestBookingStatus | None = None,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    items, total = await service.list_bookings(db, params, status)
    validated = [LabTestBookingSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated, total_items=total, params=params)

@router.get("/bookings/me", summary="View My Booked Tests (Patient)")
@limiter.limit("30/minute")
async def list_my_bookings(
    request: Request,
    params: PaginationParams = Depends(),
    current_user = Depends(RequireRole([Role.PATIENT])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    items, total = await service.get_patient_bookings(db, UUID(str(current_user.id)), params)
    validated = [LabTestBookingSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated, total_items=total, params=params)

@router.get("/bookings/patient/{patient_user_id}", summary="View Specific Patient Bookings (Admin)")
@limiter.limit("30/minute")
async def list_patient_bookings(
    request: Request,
    patient_user_id: UUID,
    params: PaginationParams = Depends(),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: LabTestService = Depends(get_labtest_service)
):
    items, total = await service.get_patient_bookings(db, patient_user_id, params)
    validated = [LabTestBookingSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated, total_items=total, params=params)

