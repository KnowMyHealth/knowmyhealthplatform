from uuid import UUID
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class PrescriptionMedicineSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None

# NEW: Maps the joined LabTest table
class RecLabTestSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    organization: str

# NEW: Maps the junction table
class PrescriptionRecommendationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    lab_test: RecLabTestSchema # Pydantic will auto-fetch this from SQLAlchemy!

class PrescriptionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    image_url: Optional[str] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription_date: Optional[datetime] = None
    created_at: datetime

    medicines: List[PrescriptionMedicineSchema] = []
    
    # NEW: Expose recommendations in the main schema
    recommendations: List[PrescriptionRecommendationSchema] = []


class PrescriptionUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription_date: Optional[datetime] = None
    medicines: Optional[List[dict]] = None