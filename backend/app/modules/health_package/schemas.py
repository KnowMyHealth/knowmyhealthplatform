from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field

class HealthPackageSchema(BaseModel):
    id: UUID
    title: str
    organization: str
    description: Optional[str] = None
    price: Decimal
    discount_percentage: Decimal
    included_tests: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class HealthPackageCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    organization: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0)
    discount_percentage: Decimal = Field(default=0.0, ge=0, le=100)
    included_tests: List[str] = Field(..., min_length=1, description="List of tests/features included")
    is_active: bool = True

class HealthPackageUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    organization: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0)
    discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    included_tests: Optional[List[str]] = None
    is_active: Optional[bool] = None

    class Config:
        extra = "forbid"