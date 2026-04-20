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


# -------------------------------------------------------------------------
# PUBLIC / PATIENTS: LIST APPROVED DOCTORS
# ** MUST BE ABOVE /{doctor_id} **
# -------------------------------------------------------------------------
@router.get(
    "/approved",
    summary="List Approved Doctors",
    description="Returns a paginated list of all approved doctors available for consultation. Used by patients to browse doctors."
)
@limiter.limit("30/minute")
async def list_approved_doctors(
    request: Request,
    params: PaginationParams = Depends(),
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db),
    service: DoctorsService = Depends(get_doctors_service)
):
    logger.debug("--> Calling /approved route to list approved doctors")
    items, total = await service.list_doctors(db, params, status=DoctorStatus.APPROVED)
    validated_items = [DoctorSchema.model_validate(i) for i in items]
    print(validated_items)
    return ApiResponse.paginated(
        items=validated_items,
        total_items=total,
        params=params,
        message="Approved doctors retrieved successfully."
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
    params: PaginationParams = Depends(),
    status: DoctorStatus | None = None,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: DoctorsService = Depends(get_doctors_service)
):
    items, total = await service.list_doctors(db, params, status)
    validated_items = [DoctorSchema.model_validate(i) for i in items]

    return ApiResponse.paginated(
        items=validated_items,
        total_items=total,
        params=params,
        message="Doctors retrieved successfully."
    )


# -------------------------------------------------------------------------
# ADMIN/PUBLIC: GET DOCTOR DETAILS (Dynamic Route)
# -------------------------------------------------------------------------
@router.get(
    "/{doctor_id}",
    summary="Get Doctor Details",
    description="Returns full profile details for a specific doctor, including license documents."
)
@limiter.limit("60/minute")
async def get_doctor_details(
    request: Request,
    doctor_id: UUID,
    current_user = Depends(get_current_user), # Changed to allow patients to view a doctor's profile
    db: AsyncSession = Depends(get_db),
    service: DoctorsService = Depends(get_doctors_service)
):
    logger.debug(f"--> User {current_user.id} viewing details for doctor {doctor_id}")

    doctor = await service.get_doctor_by_id(db, doctor_id)
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

