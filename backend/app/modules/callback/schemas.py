# app/modules/callback/schemas.py
from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.modules.callback.models import CallbackStatus

class CallbackRequestSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    phone: str
    status: CallbackStatus
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CallbackCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Name of the person requesting callback")
    phone: str = Field(
        ..., 
        min_length=10, 
        max_length=15, 
        pattern=r"^\+?[0-9]{10,15}$", 
        description="Phone number (10 to 15 digits)"
    )

class CallbackUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: CallbackStatus
    admin_notes: Optional[str] = None
