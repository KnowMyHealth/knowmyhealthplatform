from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from fastapi import Form 

from app.modules.doctor.models import DoctorStatus

# -------------------------------------------------------------------------
# RESPONSE SCHEMA
# -------------------------------------------------------------------------
class DoctorSchema(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    email: EmailStr
    contact: Optional[str] = None
    specialization: str
    education: Optional[str] = None
    license_id: str
    license_url: Optional[str] = None
    consultation_fee: Decimal
    years_of_experience: Optional[int] = None
    is_available: bool
    status: DoctorStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# -------------------------------------------------------------------------
# CREATE SCHEMA
# -------------------------------------------------------------------------

class DoctorCreateRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    specialization: str
    license_id: str
    consultation_fee: Decimal = Field(default=0.0)
    bio: Optional[str] = None
    contact: Optional[str] = None
    education: Optional[str] = None
    years_of_experience: Optional[int] = None

    @classmethod
    def as_form(
        cls,
        first_name: str = Form(...),
        last_name: str = Form(...),
        email: str = Form(...),
        specialization: str = Form(...),
        license_id: str = Form(...),
        consultation_fee: Decimal = Form(0.0),
        bio: Optional[str] = Form(None),
        contact: Optional[str] = Form(None),
        education: Optional[str] = Form(None),
        years_of_experience: Optional[int] = Form(None),
    ):
        return cls(
            first_name=first_name,
            last_name=last_name,
            email=email,
            specialization=specialization,
            license_id=license_id,
            consultation_fee=consultation_fee,
            bio=bio,
            contact=contact,
            education=education,
            years_of_experience=years_of_experience
        )


# -------------------------------------------------------------------------
# UPDATE SCHEMA
# -------------------------------------------------------------------------
class DoctorUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    contact: Optional[str] = None
    specialization: Optional[str] = None
    education: Optional[str] = None
    consultation_fee: Optional[Decimal] = None
    years_of_experience: Optional[int] = None
    is_available: Optional[bool] = None

    class Config:
        extra = "forbid"


# -------------------------------------------------------------------------
# ADMIN STATUS UPDATE SCHEMA
# -------------------------------------------------------------------------
class DoctorStatusUpdateRequest(BaseModel):
    status: DoctorStatus