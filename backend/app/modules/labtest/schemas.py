# app/modules/labtest/schemas.py
from uuid import UUID
from datetime import datetime, time
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.modules.labtest.models import LabTestBookingStatus

# --- Category Schemas ---
class LabTestCategorySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CategoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None

# --- Lab Test Schemas ---
class LabTestSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID
    name: str
    organization: str
    results_in: int 
    price: Decimal
    discount_percentage: Decimal
    is_active: bool
    clinic_address: Optional[str] = None
    clinic_open_time: Optional[time] = None
    clinic_close_time: Optional[time] = None
    created_at: datetime
    updated_at: datetime
    category: Optional[LabTestCategorySchema] = None

class LabTestCreateRequest(BaseModel):
    category_id: UUID
    name: str = Field(..., min_length=2, max_length=255)
    organization: str = Field(..., min_length=2, max_length=255)
    results_in: int = Field(..., description="Time to get results in hours", ge=1)
    price: Decimal = Field(..., ge=0)
    discount_percentage: Decimal = Field(default=0.0, ge=0, le=100)
    is_active: bool = True
    clinic_address: Optional[str] = Field(None, description="Physical location of clinic")
    clinic_open_time: Optional[time] = Field(None, description="Start of opening hours, e.g. '09:00'")
    clinic_close_time: Optional[time] = Field(None, description="End of opening hours, e.g. '18:00'")

class LabTestUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    organization: Optional[str] = Field(None, min_length=2, max_length=255)
    results_in: Optional[int] = Field(None, ge=1)
    price: Optional[Decimal] = Field(None, ge=0)
    discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None
    clinic_address: Optional[str] = None
    clinic_open_time: Optional[time] = None
    clinic_close_time: Optional[time] = None

# --- Availability Schemas ---
class AvailabilitySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: time
    end_time: time

class SetLabTestAvailabilityRequest(BaseModel):
    schedule: List[AvailabilitySchema] = Field(..., description="List of time windows")

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

# --- Lab Test Booking Schemas ---
class LabTestBookingSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_user_id: UUID
    lab_test_id: UUID
    status: LabTestBookingStatus
    scheduled_at: datetime
    created_at: datetime
    lab_test: Optional[LabTestSchema] = None
    patient_user: Optional[BookingUserSchema] = None 

class BookLabTestRequest(BaseModel):
    lab_test_id: UUID
    scheduled_at: datetime