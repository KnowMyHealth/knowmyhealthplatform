from uuid import UUID
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.utils.api_response import ApiResponse
from app.core.security import get_current_user
from app.core.rate_limiter import limiter

from app.modules.consultation.schemas import ConsultationSchema, BookConsultationRequest
from app.modules.consultation.service import ConsultationService
from app.modules.consultation.dependencies import get_consultation_service

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
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: ConsultationService = Depends(get_consultation_service)
):
    consultation = await service.book_consultation(
        db=db,
        patient_user_id=UUID(str(current_user.id)),
        data=payload
    )
    return ApiResponse.created(data=ConsultationSchema.model_validate(consultation), message="Consultation booked.")

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
    from app.db.all_models import User
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