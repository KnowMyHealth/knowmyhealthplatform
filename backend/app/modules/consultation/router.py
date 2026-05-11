from datetime import date, datetime, timedelta, timezone
from uuid import UUID
import uuid
from fastapi import APIRouter, Depends, status, Body, Request
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.modules.consultation.exceptions import ConsultationError
from app.modules.doctor.models import Doctor
from app.utils.api_error import BadRequestError
from app.utils.api_response import ApiResponse
from app.core.security import get_current_user
from app.core.rate_limiter import limiter
from app.db.all_models import User

from app.modules.consultation.schemas import ConsultationSchema, BookConsultationRequest
from app.modules.consultation.service import ConsultationService
from app.modules.consultation.dependencies import get_consultation_service
from app.modules.consultation.models import Consultation, ConsultationStatus

router = APIRouter(prefix="/consultations", tags=["Video Consultations"])

@router.post(
    "/book",
    status_code=status.HTTP_201_CREATED,
    summary="Book a video consultation (Patient)"
)
@limiter.limit("5/minute")
@router.post(
    "/book",
    status_code=status.HTTP_201_CREATED,
    summary="Book a video consultation (Patient)"
)
@limiter.limit("5/minute")
async def book_consultation(
    request: Request, # Added request for rate limiter
    payload: BookConsultationRequest = Body(...),
    current_user = Depends(get_current_user),
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
    current_user = Depends(get_current_user),
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

