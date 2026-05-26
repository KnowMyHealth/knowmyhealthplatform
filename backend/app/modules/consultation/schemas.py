# app/modules/consultation/schemas.py
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List
from app.modules.consultation.models import ConsultationStatus, ConsultationType
from app.modules.patient.schemas import PatientSchema
from app.modules.doctor.schemas import DoctorSchema
from app.modules.patient.schemas import PatientSchema

class DoctorPatientResponse(BaseModel):
    patient: PatientSchema
    last_consultation_at: datetime
    total_consultations: int

    class Config:
        from_attributes = True

class ConsultationDetailResponse(BaseModel):
    id: UUID
    patient_user_id: UUID
    doctor_id: UUID
    scheduled_at: datetime
    status: ConsultationStatus
    consultation_type: ConsultationType
    channel_name: Optional[str] = None
    prescription_url: Optional[str] = None
    created_at: datetime
    
    # Full embedded profiles
    doctor: DoctorSchema
    patient: Optional[PatientSchema] = None

    class Config:
        from_attributes = True

# --- NEW: Nested details for Admin View ---
class ConsultationPatientProfileSchema(BaseModel):
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    
    class Config:
        from_attributes = True

class ConsultationUserSchema(BaseModel):
    email: str
    patient_profile: Optional[ConsultationPatientProfileSchema] = None
    
    class Config:
        from_attributes = True

class ConsultationDoctorSchema(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    specialization: str
    
    class Config:
        from_attributes = True
# ------------------------------------------

class ConsultationSchema(BaseModel):
    id: UUID
    patient_user_id: UUID
    doctor_id: UUID
    scheduled_at: datetime
    status: ConsultationStatus
    consultation_type: ConsultationType
    channel_name: Optional[str] = None
    prescription_url: Optional[str] = None
    created_at: datetime
    
    # NEW: Optional nested data for Admin list views
    patient_user: Optional[ConsultationUserSchema] = None
    doctor: Optional[ConsultationDoctorSchema] = None

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