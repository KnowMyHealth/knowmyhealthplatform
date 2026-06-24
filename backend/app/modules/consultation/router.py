from datetime import date, datetime, timedelta, timezone
from uuid import UUID
import uuid
from fastapi import APIRouter, Depends, status, Body, Request, File, UploadFile
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.modules.consultation.exceptions import ConsultationError
from app.modules.doctor.models import Doctor
from app.modules.user.schemas import Role
from app.utils.api_error import BadRequestError
from app.utils.api_response import ApiResponse
from app.core.security import RequireRole, get_current_user, get_optional_user
from app.core.rate_limiter import limiter
from app.db.all_models import User

from app.modules.consultation.schemas import (
    ConsultationSchema, BookConsultationRequest, DoctorPatientResponse, DoctorPatientDetailResponse
)
from app.modules.consultation.service import ConsultationService
from app.modules.consultation.dependencies import get_consultation_service
from app.modules.consultation.models import Consultation, ConsultationStatus
from app.modules.consultation.schemas import DoctorPatientResponse
from app.modules.consultation.schemas import ConsultationDetailResponse
from app.utils.pagination import PaginationParams

router = APIRouter(prefix="/consultations", tags=["Video Consultations"])

@router.post(
    "/book",
    status_code=status.HTTP_201_CREATED,
    summary="Book a video consultation (Patient)"
)
@limiter.limit("5/minute")
async def book_consultation(
    request: Request, 
    payload: BookConsultationRequest = Body(...),
    current_user = Depends(RequireRole([Role.PATIENT])),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    # Logic should live in service, router just calls it
    consultation = await service.book_consultation(
        db=db, 
        patient_user_id=UUID(str(current_user.id)), 
        data=payload
    )
    
    return ApiResponse.created(
        data=ConsultationSchema.model_validate(consultation),
        message="Consultation booked successfully."
    )


@router.get(
    "/patients",
    summary="List My Patients (Doctor Only)",
    description="Returns a list of unique patient profiles who have booked a consultation with the logged-in doctor."
)
@limiter.limit("30/minute")
async def list_my_patients(
    request: Request,
    current_user = Depends(RequireRole([Role.DOCTOR])),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    items = await service.list_doctor_patients(db, UUID(str(current_user.id)))
    
    # Manually validate against the schema list
    return ApiResponse.success(data=[
        DoctorPatientResponse(
            patient=i["patient"],
            last_consultation_at=i["last_consultation_at"],
            total_consultations=i["total_consultations"]
        ) for i in items
    ])


@router.get(
    "/patients/{patient_user_id}",
    summary="Get Patient Profile & History (Doctor Only)",
    description="Allows a doctor to view a specific patient's demographic profile and the history of appointments they've had together."
)
@limiter.limit("60/minute")
async def get_patient_profile_for_doctor(
    request: Request,
    patient_user_id: UUID,
    current_user = Depends(RequireRole([Role.DOCTOR])),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    data = await service.get_doctor_patient_detail(
        db=db, 
        doctor_user_id=UUID(str(current_user.id)), 
        patient_user_id=patient_user_id
    )
    
    return ApiResponse.success(data=DoctorPatientDetailResponse(
        patient=data["patient"],
        history=data["history"]
    ))


@router.post(
    "/{consultation_id}/join",
    summary="Get Agora Token to join a call (Patient & Doctor)"
)
@limiter.limit("20/minute")
async def join_consultation(
    request: Request,
    consultation_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    # Fetch User from DB via dependency to get their Role (or just use auth token claims if you embedded it)
    
    user = await db.get(User, UUID(str(current_user.id)))
    
    agora_creds = await service.generate_join_token(
        db=db,
        consultation_id=consultation_id,
        user_id=UUID(str(current_user.id)),
        user_role=user.role.value
    )
    
    return ApiResponse.success(data=agora_creds.model_dump(), message="Ready to join.")

@router.get(
    "/me",
    summary="List my consultations (Patient or Doctor)"
)
@limiter.limit("30/minute")
async def list_my_consultations(
    request: Request,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    from app.db.all_models import User
    user = await db.get(User, UUID(str(current_user.id)))
    is_doctor = (user.role.value == "DOCTOR")
    
    items = await service.list_my_consultations(db, UUID(str(current_user.id)), is_doctor)
    return ApiResponse.success(data=[ConsultationSchema.model_validate(i) for i in items])


@router.patch(
    "/{consultation_id}/status",
    summary="Update Consultation Status (Doctor Only)",
    description="Allows the doctor change CONSULTATION STATUS"
)
async def update_status(
    consultation_id: UUID,
    status: ConsultationStatus = Body(..., embed=True), # Expects {"status": "ACCEPTED"}
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    logger.debug("--> Called PATCH /consultation_id/status")
    updated = await service.update_consultation_status(
        db=db,
        consultation_id=consultation_id,
        user_id=UUID(str(current_user.id)),
        new_status=status
    )
    return ApiResponse.success(data=ConsultationSchema.model_validate(updated))


from fastapi import Query

@router.get(
    "/doctors/{doctor_id}/slots",
    summary="Get Doctor Time Slots",
    description="Returns 15-minute intervals for a specific date. Pass timezone_offset in minutes (e.g., 330 for IST)."
)
@limiter.limit("60/minute")
async def get_doctor_slots(
    request: Request,
    doctor_id: UUID,
    date: date, 
    timezone_offset: int = Query(0, description="Timezone offset from UTC in minutes (e.g., 330 for India)"),
    current_user = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    # --- VALIDATION: Only allow viewing slots within the next 15 days ---
    today = date.today()
    max_date = today + timedelta(days=15)
    
    if date < today or date > max_date:
        raise BadRequestError(f"You can only view slots between {today} and {max_date}")
    # --------------------------------------------------------------------

    # Pass the timezone_offset to the service
    slots = await service.get_available_slots(db, doctor_id, date, timezone_offset)
    return ApiResponse.success(data=slots)

@router.post(
    "/{consultation_id}/prescription",
    summary="Upload Prescription (Doctor Only)",
    description="Upload a PDF prescription for a specific consultation. (Automatically marks consultation as COMPLETED)."
)
@limiter.limit("10/minute")
async def upload_prescription(
    request: Request,
    consultation_id: UUID,
    file: UploadFile = File(...),
    current_user = Depends(RequireRole([Role.DOCTOR])),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    if file.content_type != "application/pdf":
        raise BadRequestError("Only PDF files are allowed for prescriptions.")
        
    pdf_bytes = await file.read()
    
    updated_consultation = await service.upload_prescription(
        db=db,
        consultation_id=consultation_id,
        doctor_user_id=UUID(str(current_user.id)),
        pdf_bytes=pdf_bytes
    )
    
    return ApiResponse.success(
        data=ConsultationSchema.model_validate(updated_consultation),
        message="Prescription uploaded successfully."
    )


@router.get(
    "",
    summary="List All Consultations (Admin)",
    description="Allows admin to view all consultations across all doctors. Optionally filter by status or doctor_id."
)
@limiter.limit("30/minute")
async def list_all_consultations(
    request: Request,
    params: PaginationParams = Depends(),
    status: ConsultationStatus | None = None,
    doctor_id: UUID | None = None,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    items, total = await service.list_all_consultations(db, params, status, doctor_id)
    validated_items = [ConsultationSchema.model_validate(i) for i in items]
    
    return ApiResponse.paginated(
        items=validated_items,
        total_items=total,
        params=params,
        message="Consultations retrieved successfully."
    )

@router.get(
    "/{consultation_id}/details",
    summary="Get Consultation Details (Admin/Doctor/Patient)",
    description="View the full details of a consultation, including complete doctor and patient profiles."
)
@limiter.limit("60/minute")
async def get_consultation_details(
    request: Request,
    consultation_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    # Fetch User to get their role for authorization logic
    user = await db.get(User, UUID(str(current_user.id)))
    
    data = await service.get_consultation_details(
        db=db, 
        consultation_id=consultation_id, 
        user_id=user.id, 
        role=user.role.value
    )
    
    return ApiResponse.success(
        data=ConsultationDetailResponse.model_validate(data),
        message="Consultation details retrieved successfully."
    )