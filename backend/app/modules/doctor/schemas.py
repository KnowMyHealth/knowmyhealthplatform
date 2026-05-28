# backend/app/modules/doctor/schemas.py
from uuid import UUID
from datetime import datetime, time
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
    video_consultation_enabled: bool
    offline_consultation_enabled: bool
    clinic_address: Optional[str] = None
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
    
    # NEW FIELDS EXPOSED TO THE FORM
    video_consultation_enabled: bool = False
    offline_consultation_enabled: bool = False
    clinic_address: Optional[str] = None

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
        # EXTRACT THESE NEW FIELDS FROM MULTIPART/FORM-DATA
        video_consultation_enabled: bool = Form(False),
        offline_consultation_enabled: bool = Form(False),
        clinic_address: Optional[str] = Form(None),
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
            years_of_experience=years_of_experience,
            video_consultation_enabled=video_consultation_enabled,
            offline_consultation_enabled=offline_consultation_enabled,
            clinic_address=clinic_address
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
    video_consultation_enabled: Optional[bool] = None 
    offline_consultation_enabled: Optional[bool] = None
    clinic_address: Optional[str] = None

    class Config:
        extra = "forbid"

# -------------------------------------------------------------------------
# ADMIN STATUS UPDATE SCHEMA
# -------------------------------------------------------------------------
class DoctorStatusUpdateRequest(BaseModel):
    status: DoctorStatus


class AvailabilitySchema(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: time
    end_time: time

    class Config:
        from_attributes = True

class SetAvailabilityRequest(BaseModel):
    schedule: list[AvailabilitySchema] = Field(..., description="List of time windows")


class MonthlyEarningSchema(BaseModel):
    month: str  # "Jan", "Feb", ..., "Dec"
    amount: Decimal

class DoctorTransactionSchema(BaseModel):
    transaction_id: str      # e.g., "TRX-9821" or "pay_XXXXXX"
    patient_name: str
    date_label: str          # e.g., "Today, 10:45 AM", "Yesterday", or "25 May, 04:30 PM"
    amount: Decimal
    status: str              # "Paid"

class DoctorRevenueAnalyticsResponse(BaseModel):
    total_earnings: Decimal
    monthly_earnings: list[MonthlyEarningSchema]
    recent_transactions: list[DoctorTransactionSchema]


class DoctorMetricStatSchema(BaseModel):
    value: float
    percentage_change: float
    absolute_change: float
    is_positive: bool

class DoctorDashboardMetricsResponse(BaseModel):
    total_patients: DoctorMetricStatSchema
    todays_consults: DoctorMetricStatSchema
    monthly_earnings: DoctorMetricStatSchema
    total_consultations: DoctorMetricStatSchema