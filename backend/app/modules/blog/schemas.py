from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# --- AI Generation Request ---
class BlogGenerateRequest(BaseModel):
    research_topic: str = Field(..., min_length=3, description="Topic for the AI to research.")
    target_audience: str = Field(..., description="E.g., 'Medical Professionals', 'General Public'.")
    tone_of_voice: str = Field(..., description="E.g., 'Professional', 'Empathetic', 'Casual'.")
    additional_instructions: Optional[str] = Field(None, description="Any specific rules for the AI.")

# --- API Response & DB Schemas ---
class BlogSchema(BaseModel):
    id: UUID
    author_id: Optional[UUID] = None
    title: str
    category: str
    content: str
    cover_image_url: str
    is_published: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BlogCreateRequest(BaseModel):
    title: str = Field(..., min_length=3)
    category: str = Field(..., min_length=2)
    content: str = Field(..., description="Markdown format")
    cover_image_url: str
    is_published: bool = False

class BlogUpdateRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_published: Optional[bool] = None

    class Config:
        extra = "forbid"