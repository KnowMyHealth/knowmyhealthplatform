# app/modules/partner/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.db.deps import get_db
from app.db.all_models import User
from app.utils.api_response import ApiResponse
from app.core.security import RequireRole
from app.core.rate_limiter import limiter
from app.utils.pagination import PaginationParams
from app.modules.user.schemas import Role

from app.modules.patient.schemas import PatientSchema, PatientUpdateRequest

from app.modules.partner.schemas import (
    PartnerSchema, 
    PartnerCreateRequest, 
    PartnerStatusUpdateRequest,
    PartnerPatientCreateRequest
)
from app.modules.partner.service import PartnerService
from app.modules.partner.dependencies import get_partner_service
from app.modules.partner.schemas import PartnerApproveRequest

router = APIRouter(prefix="/partners", tags=["Partners"])

# -------------------------------------------------------------------------
# PUBLIC: SUBMIT APPLICATION
# -------------------------------------------------------------------------
@router.post(
    "/apply",
    status_code=status.HTTP_201_CREATED,
    summary="Submit Partner Application",
)
@limiter.limit("5/minute")
async def apply_for_partner(
    request: Request,
    payload: PartnerCreateRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    partner = await service.create_partner(db, payload)
    return ApiResponse.created(
        data=PartnerSchema.model_validate(partner),
        message="Partner application submitted successfully. Our team will contact you shortly."
    )


# -------------------------------------------------------------------------
# ADMIN: MANAGE APPLICATIONS
# -------------------------------------------------------------------------
@router.get("", summary="List Partners (Admin)")
@limiter.limit("30/minute")
async def list_partners(
    request: Request,
    params: PaginationParams = Depends(),
    status: str | None = None,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    items, total = await service.list_partners(db, params, status)
    validated_items = [PartnerSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated_items, total_items=total, params=params)


@router.get("/{partner_id}", summary="Get Partner Details (Admin)")
@limiter.limit("60/minute")
async def get_partner_details(
    request: Request,
    partner_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    partner = await service.get_partner_by_id(db, partner_id)
    return ApiResponse.success(data=PartnerSchema.model_validate(partner))


@router.patch("/{partner_id}/status", summary="Update Partner Status (Admin)")
@limiter.limit("10/minute")
async def update_partner_status(
    request: Request,
    partner_id: UUID,
    payload: PartnerStatusUpdateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    updated_partner = await service.update_partner_status(db, partner_id, payload.status)
    return ApiResponse.success(data=PartnerSchema.model_validate(updated_partner), message="Status updated.")


@router.delete("/{partner_id}", summary="Delete Partner Application (Admin)")
@limiter.limit("10/minute")
async def delete_partner(
    request: Request,
    partner_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    await service.delete_partner(db, partner_id)
    return ApiResponse.no_content()


@router.post("/{partner_id}/approve", summary="Approve Partner & Create Account (Admin)")
@limiter.limit("5/minute")
async def approve_partner(
    request: Request,
    partner_id: UUID,
    payload: PartnerApproveRequest = Body(...), # <-- Added request body
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    approved_partner = await service.approve_partner_and_create_user(
        db=db,
        partner_id=partner_id,
        discount_percentage=payload.discount_percentage # <-- Pass to service
    )
    return ApiResponse.success(data=PartnerSchema.model_validate(approved_partner), message="Partner approved.")

# -------------------------------------------------------------------------
# PARTNER: MANAGE OWN PATIENTS
# -------------------------------------------------------------------------
@router.post("/patients", status_code=status.HTTP_201_CREATED, summary="Add a Patient (Partner)")
@limiter.limit("20/minute")
async def add_patient(
    request: Request,
    payload: PartnerPatientCreateRequest = Body(...),
    current_user = Depends(RequireRole([Role.PARTNER])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    patient = await service.add_patient_for_partner(db, UUID(str(current_user.id)), payload)
    return ApiResponse.created(data=PatientSchema.model_validate(patient), message="Patient created successfully.")


@router.get("/patients/list", summary="List My Patients (Partner)")
@limiter.limit("60/minute")
async def list_patients(
    request: Request,
    params: PaginationParams = Depends(),
    current_user = Depends(RequireRole([Role.PARTNER])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    items, total = await service.list_partner_patients(db, UUID(str(current_user.id)), params)
    validated = [PatientSchema.model_validate(i) for i in items]
    return ApiResponse.paginated(items=validated, total_items=total, params=params)


@router.get("/patients/{patient_id}", summary="Get Patient Details (Partner)")
@limiter.limit("60/minute")
async def get_patient(
    request: Request,
    patient_id: UUID,
    current_user = Depends(RequireRole([Role.PARTNER])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    patient = await service.get_partner_patient(db, UUID(str(current_user.id)), patient_id)
    return ApiResponse.success(data=PatientSchema.model_validate(patient))


@router.patch("/patients/{patient_id}", summary="Update Patient (Partner)")
@limiter.limit("30/minute")
async def update_patient(
    request: Request,
    patient_id: UUID,
    payload: PatientUpdateRequest = Body(...),
    current_user = Depends(RequireRole([Role.PARTNER])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    update_data = payload.model_dump(exclude_unset=True)
    patient = await service.update_partner_patient(db, UUID(str(current_user.id)), patient_id, update_data)
    return ApiResponse.success(data=PatientSchema.model_validate(patient), message="Patient updated.")


@router.delete("/patients/{patient_id}", summary="Delete Patient (Partner)")
@limiter.limit("10/minute")
async def delete_patient(
    request: Request,
    patient_id: UUID,
    current_user = Depends(RequireRole([Role.PARTNER])),
    db: AsyncSession = Depends(get_db),
    service: PartnerService = Depends(get_partner_service)
):
    await service.delete_partner_patient(db, UUID(str(current_user.id)), patient_id)
    return ApiResponse.no_content()