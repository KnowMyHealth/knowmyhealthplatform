from uuid import UUID
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class PrescriptionMedicineSchema(BaseModel):
    id: UUID
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None

    class Config:
        from_attributes = True

# NEW: Maps the joined LabTest table
class RecLabTestSchema(BaseModel):
    id: UUID
    name: str
    organization: str

    class Config:
        from_attributes = True

# NEW: Maps the junction table
class PrescriptionRecommendationSchema(BaseModel):
    id: UUID
    lab_test: RecLabTestSchema # Pydantic will auto-fetch this from SQLAlchemy!

    class Config:
        from_attributes = True

class PrescriptionSchema(BaseModel):
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

    class Config:
        from_attributes = True

class PrescriptionUpdateRequest(BaseModel):
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription_date: Optional[datetime] = None
    medicines: Optional[List[dict]] = None

    class Config:
        extra = "forbid"