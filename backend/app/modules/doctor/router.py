from uuid import UUID
from loguru import logger
from fastapi import APIRouter, Depends, File, UploadFile, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession

from slowapi import Limiter
from slowapi.util import get_remote_address
from app.db.all_models import User

from app.modules.user.schemas import Role
from app.utils.api_response import ApiResponse
from app.utils.api_error import BadRequestError, ForbiddenError
from app.core.security import RequireRole, get_current_user
from app.core.rate_limiter import limiter
from app.db.deps import get_db 

from app.modules.doctor.models import DoctorStatus
from app.modules.doctor.schemas import (
    DoctorSchema, 
    DoctorCreateRequest,
    DoctorStatusUpdateRequest
)
from app.modules.doctor.service import DoctorsService
from app.modules.doctor.dependencies import get_doctors_service
from app.utils.pagination import PaginationParams

router = APIRouter(prefix="/doctors", tags=["Doctors"])



# -------------------------------------------------------------------------
# PUBLIC: SUBMIT DOCTOR APPLICATION
# -------------------------------------------------------------------------
@router.post(
    "/apply",
    status_code=status.HTTP_201_CREATED,
    summary="Submit Doctor Application",
)
@limiter.limit("5/minute")
async def apply_for_doctor(
    request: Request,
    payload: DoctorCreateRequest = Depends(DoctorCreateRequest.as_form), 
    license_file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    service: DoctorsService = Depends(get_doctors_service)
):
    if license_file.content_type != "application/pdf":
        raise BadRequestError("Only PDF files are allowed for license documentation.")

    pdf_bytes = await license_file.read()

    # Now this call matches the updated service signature
    doctor = await service.create_doctor(
        db=db,
        user_id=None, 
        payload=payload,
        license_pdf=pdf_bytes
    )

    return ApiResponse.created(
        data=DoctorSchema.model_validate(doctor),
        message="Application submitted successfully."
    )


@router.get(
    "/{doctor_id}",
    summary="Get Doctor Details (Admin)",
    description="Returns full profile details for a specific doctor, including license documents."
)
@limiter.limit("60/minute")
async def get_doctor_details(
    request: Request,
    doctor_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: DoctorsService = Depends(get_doctors_service)
):
    logger.debug(f"--> Admin {current_user.id} viewing details for doctor {doctor_id}")

    # Fetch doctor using the service
    doctor = await service.get_doctor_by_id(db, doctor_id)

    # Use the full DoctorSchema so the admin can see license_url
    validated_data = DoctorSchema.model_validate(doctor)

    return ApiResponse.success(
        data=validated_data,
        message="Doctor details retrieved successfully."
    )


# -------------------------------------------------------------------------
# ADMIN: UPDATE DOCTOR STATUS
# -------------------------------------------------------------------------
@router.patch(
    "/{doctor_id}/status",
    status_code=status.HTTP_200_OK,
    summary="Update doctor status (Admin)",
)
@limiter.limit("10/minute")
async def update_doctor_status(
    request: Request,
    doctor_id: UUID,
    payload: DoctorStatusUpdateRequest = Body(...),
    # CHANGED: Use RequireRole so we actually have access to the role in DB
    current_user: User = Depends(RequireRole([Role.ADMIN])), 
    db: AsyncSession = Depends(get_db),
    service: DoctorsService = Depends(get_doctors_service)
):
    logger.debug(f"--> Called PATCH /doctors/{doctor_id}/status route")


    updated_doctor = await service.update_doctor_status(
        db=db,
        doctor_id=doctor_id,
        status=payload.status
    )

    return ApiResponse.success(
        data=DoctorSchema.model_validate(updated_doctor),
        message="Doctor status updated successfully."
    )


#--------------------------------------------------------------------------
# ADMIN: LIST DOCTORS WITH FILTERS
#--------------------------------------------------------------------------
@router.get(
    "",
    summary="List Doctor Applications (Admin)",
    description="Returns a paginated list of all doctor applications. Use ?status=pending to filter."
)
@limiter.limit("30/minute")
async def list_doctor_applications(
    request: Request,
    params: PaginationParams = Depends(), # Parses ?page and ?limit
    status: DoctorStatus | None = None,   # Optional ?status=pending filter
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: DoctorsService = Depends(get_doctors_service)
):
    # Fetch data and total count from service
    items, total = await service.list_doctors(db, params, status)

    # Convert SQLAlchemy models to Pydantic schemas
    validated_items = [DoctorSchema.model_validate(i) for i in items]

    # Use the utility to return the consistent paginated JSON envelope
    return ApiResponse.paginated(
        items=validated_items,
        total_items=total,
        params=params,
        message="Doctors retrieved successfully."
    )

# -------------------------------------------------------------------------
# ADMIN: APPROVE DOCTOR & CREATE USER ACCOUNT
# -------------------------------------------------------------------------
@router.post(
    "/{doctor_id}/approve",
    status_code=status.HTTP_200_OK,
    summary="Approve doctor (Admin)",
    description="Approves a doctor application and creates their user account."
)
async def approve_doctor_application(
    doctor_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: DoctorsService = Depends(get_doctors_service)
):
    
    updated_doctor = await service.approve_doctor_and_create_user(
        db=db,
        doctor_id=doctor_id
    )

    validated_doctor = DoctorSchema.model_validate(updated_doctor)

    return ApiResponse.success(
        data=validated_doctor,
        message="Doctor approved and user account created."
    )
