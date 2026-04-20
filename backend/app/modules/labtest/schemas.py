from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

# --- Category Schemas ---
class LabTestCategorySchema(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CategoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None


# --- Lab Test Schemas ---
class LabTestSchema(BaseModel):
    id: UUID
    category_id: UUID
    name: str
    organization: str
    results_in: int 
    price: Decimal
    discount_percentage: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    category: Optional[LabTestCategorySchema] = None

    class Config:
        from_attributes = True

class LabTestCreateRequest(BaseModel):
    category_id: UUID
    name: str = Field(..., min_length=2, max_length=255)
    organization: str = Field(..., min_length=2, max_length=255)
    results_in: int = Field(..., description="Time to get results in hours (e.g., 24, 48)", ge=1)
    price: Decimal = Field(..., ge=0)
    discount_percentage: Decimal = Field(default=0.0, ge=0, le=100)
    is_active: bool = True

class LabTestUpdateRequest(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    organization: Optional[str] = Field(None, min_length=2, max_length=255)
    results_in: Optional[int] = Field(None, ge=1)
    price: Optional[Decimal] = Field(None, ge=0)
    discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None

    class Config:
        extra = "forbid"