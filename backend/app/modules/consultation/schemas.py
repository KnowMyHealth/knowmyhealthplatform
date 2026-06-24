# app/modules/consultation/schemas.py
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from app.modules.consultation.models import ConsultationStatus, ConsultationType
from app.modules.patient.schemas import PatientSchema
from app.modules.doctor.schemas import DoctorSchema
from app.modules.patient.schemas import PatientSchema

class DoctorPatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    patient: PatientSchema
    last_consultation_at: datetime
    total_consultations: int

class ConsultationDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_user_id: UUID
    doctor_id: UUID
    scheduled_at: datetime
    status: ConsultationStatus
    consultation_type: ConsultationType
    channel_name: Optional[str] = None
    prescription_url: Optional[str] = None
    patient_note: Optional[str] = None
    created_at: datetime
    
    # Full embedded profiles
    doctor: DoctorSchema
    patient: Optional[PatientSchema] = None

# --- Nested details for Admin View ---
class ConsultationPatientProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    first_name: str
    last_name: str
    phone_number: Optional[str] = None

class ConsultationUserSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: str
    patient_profile: Optional[ConsultationPatientProfileSchema] = None

class ConsultationDoctorSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    specialization: str
    clinic_address: Optional[str] = None
    contact: Optional[str] = None
    
# ------------------------------------------

class ConsultationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_user_id: UUID
    doctor_id: UUID
    scheduled_at: datetime
    status: ConsultationStatus
    consultation_type: ConsultationType
    channel_name: Optional[str] = None
    prescription_url: Optional[str] = None
    patient_note: Optional[str] = None
    created_at: datetime
    
    # Optional nested data for Admin list views
    patient_user: Optional[ConsultationUserSchema] = None
    doctor: Optional[ConsultationDoctorSchema] = None

class DoctorPatientDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    patient: PatientSchema
    history: List[ConsultationSchema]

class BookConsultationRequest(BaseModel):
    doctor_id: UUID
    scheduled_at: datetime = Field(..., description="The time the patient wants to book")
    consultation_type: ConsultationType = Field(default=ConsultationType.ONLINE)
    patient_note: Optional[str] = Field(None, max_length=500, description="Short note or reason for visit")

class AgoraJoinResponse(BaseModel):
    token: str
    channel_name: str
    uid: str