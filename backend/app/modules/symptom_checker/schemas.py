from datetime import datetime
from uuid import UUID
from typing import List
from pydantic import BaseModel, Field
import enum

class MessageRole(str, enum.Enum):
    USER = "user"
    AI = "ai"

class ChatMessage(BaseModel):
    role: MessageRole
    content: str

class SymptomCheckRequest(BaseModel):
    message: str = Field(..., description="The latest message from the user")
    history: List[ChatMessage] = Field(default_factory=list)

# --- AI Final Report Schemas ---
class RecommendedTestSchema(BaseModel):
    id: UUID
    test_name: str
    organization: str

class FinalReport(BaseModel):
    possible_causes: List[str] = Field(..., description="2-4 possible medical causes")
    recommended_tests: List[RecommendedTestSchema] = Field(..., description="Recommended lab tests from the DB")
    general_advice: str = Field(..., description="General home care advice or warning to see a doctor.")

class SymptomAssessmentSchema(BaseModel):
    id: UUID
    possible_causes: List[str]
    general_advice: str
    created_at: datetime

    class Config:
        from_attributes = True

class SymptomAssessmentDetailSchema(SymptomAssessmentSchema):
    # This includes the nested lab test data
    recommendations: List[RecommendedTestSchema] = []
