import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy import String, Boolean, ForeignKey, Text, func, Numeric, Integer

from app.db.base import Base

class LabTestCategory(Base):
    __tablename__ = "lab_test_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(100), 
        unique=True, 
        index=True, 
        nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        Text, 
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(), 
        onupdate=func.now()
    )

    # Relationships
    tests: Mapped[list["LabTest"]] = relationship(
        "LabTest",
        back_populates="category",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<LabTestCategory id={self.id} name={self.name}>"


class LabTest(Base):
    __tablename__ = "lab_tests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lab_test_categories.id", ondelete="CASCADE"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(255), 
        nullable=False,
        index=True
    )
    organization: Mapped[str] = mapped_column(
        String(255), 
        nullable=False
    )
    results_in: Mapped[int] = mapped_column(
        Integer, 
        nullable=False
    )
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), 
        nullable=False
    )
    discount_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), 
        nullable=False,
        default=0.0
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, 
        default=True, 
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(), 
        onupdate=func.now()
    )

    # Relationships
    category: Mapped["LabTestCategory"] = relationship(
        "LabTestCategory", 
        back_populates="tests"
    )

    def __repr__(self):
        return f"<LabTest id={self.id} name={self.name} org={self.organization}>"