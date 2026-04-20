import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy import String, Boolean, ForeignKey, Numeric, func
from typing import TYPE_CHECKING

from app.db.base import Base

# Use TYPE_CHECKING to prevent circular imports
if TYPE_CHECKING:
    from app.modules.labtest.models import LabTestCategory, LabTest

class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    discount_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    
    # Optional restrictions (can be extended later for Doctor IDs, etc.)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab_test_categories.id", ondelete="CASCADE"), nullable=True
    )
    lab_test_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lab_tests.id", ondelete="CASCADE"), nullable=True
    )

    valid_until: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    category: Mapped["LabTestCategory"] = relationship()
    lab_test: Mapped["LabTest"] = relationship()

    def __repr__(self):
        return f"<Coupon code={self.code} discount={self.discount_percentage}%>"