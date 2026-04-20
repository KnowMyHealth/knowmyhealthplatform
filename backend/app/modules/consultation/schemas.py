from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from app.modules.consultation.models import ConsultationStatus

class ConsultationSchema(BaseModel):
    id: UUID
    patient_user_id: UUID
    doctor_id: UUID
    scheduled_at: datetime
    status: ConsultationStatus
    channel_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class BookConsultationRequest(BaseModel):
    doctor_id: UUID
    scheduled_at: datetime = Field(..., description="The time the patient wants to book")

class AgoraJoinResponse(BaseModel):
    token: str
    channel_name: str
    uid: str