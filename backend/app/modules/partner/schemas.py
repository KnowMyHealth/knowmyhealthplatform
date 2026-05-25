# app/modules/partner/schemas.py
from decimal import Decimal
from uuid import UUID
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.modules.partner.models import PartnerStatus, PartnerType
from app.modules.patient.models import Gender

class PartnerSchema(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    company_name: str
    contact_person: str
    email: EmailStr
    phone: str
    partner_type: PartnerType
    address: str
    website: Optional[str] = None
    status: PartnerStatus
    discount_percentage: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PartnerCreateRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    contact_person: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=50)
    partner_type: PartnerType
    address: str = Field(..., min_length=5)
    website: Optional[str] = None
    discount_percentage: Decimal = Field(default=10.0, ge=0, le=100)

class PartnerUpdateRequest(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    contact_person: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, min_length=5, max_length=50)
    address: Optional[str] = None
    website: Optional[str] = None
    discount_percentage: Optional[Decimal] = None

    class Config:
        extra = "forbid"

class PartnerStatusUpdateRequest(BaseModel):
    status: PartnerStatus

# --- Schema for Partner adding a Patient ---
class PartnerPatientCreateRequest(BaseModel):
    email: EmailStr = Field(..., description="Email for the patient's new account")
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    blood_group: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None