from uuid import UUID
from loguru import logger
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.db.all_models import User
from app.utils.api_response import ApiResponse
from app.core.security import RequireRole, get_current_user
from app.core.rate_limiter import limiter
from app.utils.pagination import PaginationParams
from app.modules.user.schemas import Role

from app.modules.patient.schemas import PatientSchema, PatientCreateRequest, PatientUpdateRequest
from app.modules.patient.service import PatientService
from app.modules.patient.dependencies import get_patient_service

router = APIRouter(prefix="/patients", tags=["Patients"])

# -------------------------------------------------------------------------
# PATIENT: MANAGE OWN PROFILE
# -------------------------------------------------------------------------

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create Patient Profile",
    description="Creates a patient demographics profile for the currently logged-in user."
)
@limiter.limit("10/minute")
async def create_my_profile(
    request: Request,
    payload: PatientCreateRequest = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PatientService = Depends(get_patient_service)
):
    logger.debug(f"--> POST /patients (User: {current_user.id})")
    
    patient = await service.create_patient(
        db=db, 
        user_id=UUID(str(current_user.id)), 
        data=payload
    )
    
    return ApiResponse.created(
        data=PatientSchema.model_validate(patient),
        message="Patient profile created successfully."
    )

@router.get(
    "/me",
    summary="Get My Patient Profile",
)
@limiter.limit("60/minute")
async def get_my_profile(
    request: Request,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PatientService = Depends(get_patient_service)
):
    logger.debug(f"--> GET /patients/me (User: {current_user.id})")
    
    patient = await service.get_patient_by_user_id(db, UUID(str(current_user.id)))
    return ApiResponse.success(data=PatientSchema.model_validate(patient))

@router.patch(
    "/me",
    summary="Update My Patient Profile",
)
@limiter.limit("20/minute")
async def update_my_profile(
    request: Request,
    payload: PatientUpdateRequest = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PatientService = Depends(get_patient_service)
):
    logger.debug(f"--> PATCH /patients/me (User: {current_user.id})")
    
    update_data = payload.model_dump(exclude_unset=True)
    patient = await service.update_patient(db, UUID(str(current_user.id)), update_data)
    
    return ApiResponse.success(
        data=PatientSchema.model_validate(patient),
        message="Profile updated successfully."
    )

# -------------------------------------------------------------------------
# ADMIN: MANAGE ALL PATIENTS
# -------------------------------------------------------------------------

@router.get(
    "",
    summary="List All Patients (Admin)",
)
@limiter.limit("30/minute")
async def list_all_patients(
    request: Request,
    params: PaginationParams = Depends(),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PatientService = Depends(get_patient_service)
):
    items, total = await service.list_patients(db, params)
    validated_items = [PatientSchema.model_validate(i) for i in items]
    
    return ApiResponse.paginated(
        items=validated_items,
        total_items=total,
        params=params,
        message="Patients retrieved successfully."
    )

@router.get(
    "/{patient_id}",
    summary="Get Patient Details (Admin/Doctor)",
)
@limiter.limit("60/minute")
async def get_patient_details(
    request: Request,
    patient_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN, Role.DOCTOR])),
    db: AsyncSession = Depends(get_db),
    service: PatientService = Depends(get_patient_service)
):
    patient = await service.get_patient_by_id(db, patient_id)
    return ApiResponse.success(data=PatientSchema.model_validate(patient))