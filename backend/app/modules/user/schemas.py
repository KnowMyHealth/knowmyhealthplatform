import enum
from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class Role(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"
    PARTNER = "PARTNER"

# -------------------------------------------------------------------------
# RESPONSE SCHEMA
# -------------------------------------------------------------------------

class UserSchema(BaseModel):
    id: UUID
    email: EmailStr
    role: Role = Field(default=Role.PATIENT)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2


# -------------------------------------------------------------------------
# UPDATE SCHEMA (/users/me)
# -------------------------------------------------------------------------

class UserUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

    class Config:
        extra = "forbid"


# -------------------------------------------------------------------------
# ADMIN ROLE UPDATE SCHEMA
# -------------------------------------------------------------------------

class UserRoleUpdateRequest(BaseModel):
    role: Role

class MetricStatSchema(BaseModel):
    count: int
    percentage_change: float
    is_positive: bool

class AdminDashboardMetricsResponse(BaseModel):
    total_patients: MetricStatSchema
    active_doctors: MetricStatSchema
    partner_labs: MetricStatSchema
    pending_verifications: MetricStatSchema