# app/modules/consultation/schemas.py
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
from app.modules.consultation.models import ConsultationStatus, ConsultationType
from app.modules.patient.schemas import PatientSchema
from typing import List


class DoctorPatientResponse(BaseModel):
    patient: PatientSchema
    last_consultation_at: datetime
    total_consultations: int

    class Config:
        from_attributes = True

class ConsultationSchema(BaseModel):
    id: UUID
    patient_user_id: UUID
    doctor_id: UUID
    scheduled_at: datetime
    status: ConsultationStatus
    consultation_type: ConsultationType
    channel_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DoctorPatientDetailResponse(BaseModel):
    patient: PatientSchema
    history: List[ConsultationSchema]

    class Config:
        from_attributes = True


class BookConsultationRequest(BaseModel):
    doctor_id: UUID
    scheduled_at: datetime = Field(..., description="The time the patient wants to book")
    consultation_type: ConsultationType = Field(default=ConsultationType.ONLINE)

class AgoraJoinResponse(BaseModel):
    token: str
    channel_name: str
    uid: str