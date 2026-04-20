from uuid import UUID
from loguru import logger
from fastapi import APIRouter, Depends, status, UploadFile, File, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.api_response import ApiResponse
from app.core.security import get_current_user
from app.db.deps import get_db

from app.modules.prescription.schemas import (
    PrescriptionSchema,
    PrescriptionUpdateRequest
)
from app.modules.prescription.service import PrescriptionService
from app.modules.prescription.dependencies import get_prescription_service
from app.core.rate_limiter import limiter


router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

@router.post(
    "/ocr",
    status_code=status.HTTP_201_CREATED,
    summary="Upload prescription image and extract data",
)
@limiter.limit("10/minute")
async def ocr_prescription(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    service: PrescriptionService = Depends(get_prescription_service)
):
    logger.debug("--> POST /prescriptions/ocr")
    file_bytes = await file.read()

    # Returns the fully loaded Prescription object (including saved recommendations)
    prescription = await service.ocr_prescription(
        db=db,
        user_id=UUID(str(current_user.id)),
        file_bytes=file_bytes
    )

    validated = PrescriptionSchema.model_validate(prescription)

    return ApiResponse.created(
        data=validated,
        message="Prescription processed successfully"
    )

@router.get("/{prescription_id}")
@limiter.limit("60/minute")
async def get_prescription(
    request: Request,
    prescription_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    service: PrescriptionService = Depends(get_prescription_service)
):
    logger.debug("--> GET /prescriptions/{id}")

    prescription = await service.get_prescription(db, prescription_id)

    validated = PrescriptionSchema.model_validate(prescription)

    return ApiResponse.success(
        data=validated,
        message="Prescription retrieved successfully"
    )


@router.get("/")
@limiter.limit("60/minute")
async def list_prescriptions(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    service: PrescriptionService = Depends(get_prescription_service)
):
    logger.debug("--> GET /prescriptions")

    items = await service.list_user_prescriptions(
        db=db,
        user_id=UUID(str(current_user.id))
    )

    validated_items = [PrescriptionSchema.model_validate(i) for i in items]

    return ApiResponse.success(
        data=validated_items,
        message="Prescriptions retrieved successfully"
    )

@router.patch("/{prescription_id}")
@limiter.limit("30/minute")
async def update_prescription(
    request: Request,
    prescription_id: UUID,
    body: PrescriptionUpdateRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    service: PrescriptionService = Depends(get_prescription_service)
):
    logger.debug("--> PATCH /prescriptions/{id}")

    update_data = body.model_dump(exclude_unset=True)

    updated = await service.update_prescription(
        db=db,
        prescription_id=prescription_id,
        data=update_data
    )

    validated = PrescriptionSchema.model_validate(updated)

    return ApiResponse.success(
        data=validated,
        message="Prescription updated successfully"
    )


@router.delete("/{prescription_id}")
@limiter.limit("10/minute")
async def delete_prescription(
    request: Request,
    prescription_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    service: PrescriptionService = Depends(get_prescription_service)
):
    logger.debug("--> DELETE /prescriptions/{id}")

    await service.delete_prescription(db, prescription_id)

    return ApiResponse.no_content()