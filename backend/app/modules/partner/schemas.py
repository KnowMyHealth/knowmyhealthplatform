from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.modules.partner.models import PartnerStatus, PartnerType

class PartnerSchema(BaseModel):
    id: UUID
    company_name: str
    contact_person: str
    email: EmailStr
    phone: str
    partner_type: PartnerType
    address: str
    website: Optional[str] = None
    status: PartnerStatus
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

class PartnerStatusUpdateRequest(BaseModel):
    status: PartnerStatus