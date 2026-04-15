from uuid import UUID
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.db.deps import get_db
from app.utils.api_response import ApiResponse
from app.core.security import get_current_user
from app.core.rate_limiter import limiter

from app.modules.symptom_checker.schemas import (
    SymptomCheckRequest, 
    SymptomAssessmentSchema, 
    SymptomAssessmentDetailSchema
)
from app.modules.symptom_checker.service import SymptomCheckerService
from app.modules.symptom_checker.dependencies import get_symptom_checker_service

router = APIRouter(prefix="/symptom-checker", tags=["Symptom Checker"])

@router.post(
    "",
    status_code=status.HTTP_200_OK,
    summary="Chat with Symptom Checker AI"
)
@limiter.limit("20/minute")
async def check_symptoms(
    request: Request,
    payload: SymptomCheckRequest = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: SymptomCheckerService = Depends(get_symptom_checker_service)
):
    logger.debug(f"--> POST /symptom-checker (History length: {len(payload.history)})")
    
    # PASS THE USER ID DOWN
    user_uuid = UUID(str(current_user.id))
    result = await service.process_symptoms(db, user_uuid, payload)
    
    return ApiResponse.success(
        data=result,
        message="Symptom check processed."
    )

@router.get(
    "",
    summary="List Past Assessments",
    description="Returns a history of all symptom checks performed by the user."
)
@limiter.limit("30/minute")
async def list_my_assessments(
    request: Request,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: SymptomCheckerService = Depends(get_symptom_checker_service)
):
    user_uuid = UUID(str(current_user.id))
    items = await service.list_user_assessments(db, user_uuid)
    
    return ApiResponse.success(
        data=[SymptomAssessmentSchema.model_validate(i) for i in items]
    )

@router.get(
    "/{assessment_id}",
    summary="Get Assessment Details",
    description="Returns the full report for a specific past symptom check, including recommended tests."
)
@limiter.limit("60/minute")
async def get_assessment_details(
    request: Request,
    assessment_id: UUID,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: SymptomCheckerService = Depends(get_symptom_checker_service)
):
    user_uuid = UUID(str(current_user.id))
    
    # This now returns a clean dictionary from our service logic
    assessment_data = await service.get_assessment_by_id(db, user_uuid, assessment_id)
    
    return ApiResponse.success(data=assessment_data)