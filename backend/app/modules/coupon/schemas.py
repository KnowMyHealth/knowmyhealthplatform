from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

class CouponSchema(BaseModel):
    id: UUID
    code: str
    discount_percentage: Decimal
    category_id: Optional[UUID] = None
    lab_test_id: Optional[UUID] = None
    valid_until: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CouponCreateRequest(BaseModel):
    code: str = Field(..., min_length=3, max_length=50, description="Coupon code, e.g. SAVE20")
    discount_percentage: Decimal = Field(..., gt=0, le=100)
    category_id: Optional[UUID] = Field(None, description="Restrict to a specific category")
    lab_test_id: Optional[UUID] = Field(None, description="Restrict to a specific test")
    valid_until: Optional[datetime] = Field(None, description="Expiration date")
    is_active: bool = True

class CouponValidateRequest(BaseModel):
    code: str
    lab_test_id: UUID

class CouponValidateResponse(BaseModel):
    is_valid: bool
    message: str
    original_price: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    final_price: Decimal


class CouponUpdateRequest(BaseModel):
    code: Optional[str] = Field(None, min_length=3, max_length=50, description="Coupon code")
    discount_percentage: Optional[Decimal] = Field(None, gt=0, le=100)
    category_id: Optional[UUID] = None
    lab_test_id: Optional[UUID] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None

    class Config:
        extra = "forbid"