# app/modules/health_package/schemas.py
from uuid import UUID
from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.modules.health_package.models import HealthPackageBookingStatus

class HealthPackageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    organization: str
    description: Optional[str] = None
    price: Decimal
    discount_percentage: Decimal
    included_tests: List[str]
    is_active: bool
    clinic_address: Optional[str] = None
    clinic_open_time: Optional[time] = None
    clinic_close_time: Optional[time] = None
    created_at: datetime
    updated_at: datetime

class HealthPackageCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    organization: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    discount_percentage: Decimal = Field(default=0.0, ge=0, le=100)
    included_tests: List[str] = Field(..., min_length=1, description="List of tests/features included")
    is_active: bool = True
    clinic_address: Optional[str] = Field(None, description="Physical location of clinic")
    clinic_open_time: Optional[time] = Field(None, description="Start of opening hours, e.g. '09:00'")
    clinic_close_time: Optional[time] = Field(None, description="End of opening hours, e.g. '18:00'")

class HealthPackageUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(None, min_length=2, max_length=255)
    organization: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0)
    discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    included_tests: Optional[List[str]] = None
    is_active: Optional[bool] = None
    clinic_address: Optional[str] = None
    clinic_open_time: Optional[time] = None
    clinic_close_time: Optional[time] = None

# --- Nested Patient/User Schemas for Admin View ---
class BookingPatientProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    first_name: str
    last_name: str
    phone_number: Optional[str] = None

class BookingUserSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: str
    patient_profile: Optional[BookingPatientProfileSchema] = None

# --- Health Package Booking Schemas ---
class HealthPackageBookingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_user_id: UUID
    health_package_id: UUID
    status: HealthPackageBookingStatus
    scheduled_date: date
    created_at: datetime
    health_package: Optional[HealthPackageSchema] = None
    patient_user: Optional[BookingUserSchema] = None 

class BookHealthPackageRequest(BaseModel):
    health_package_id: UUID
    scheduled_date: date