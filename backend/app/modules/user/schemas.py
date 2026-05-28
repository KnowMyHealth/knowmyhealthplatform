import enum
from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class Role(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"
    PARTNER = "PARTNER"

# -------------------------------------------------------------------------
# RESPONSE SCHEMA
# -------------------------------------------------------------------------

class UserSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    email: EmailStr
    role: Role = Field(default=Role.PATIENT)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime



# -------------------------------------------------------------------------
# UPDATE SCHEMA (/users/me)
# -------------------------------------------------------------------------

class UserUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


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