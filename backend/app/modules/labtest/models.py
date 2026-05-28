# app/modules/labtest/models.py
import uuid
import enum
import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy import String, Boolean, ForeignKey, Text, func, Numeric, Integer, Enum, Date, TIME

from app.db.base import Base

class LabTestBookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    ADVANCE_PAID = "ADVANCE_PAID"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"

class LabTestCategory(Base):
    __tablename__ = "lab_test_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    tests: Mapped[list["LabTest"]] = relationship("LabTest", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<LabTestCategory id={self.id} name={self.name}>"


class LabTest(Base):
    __tablename__ = "lab_tests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lab_test_categories.id", ondelete="CASCADE"), nullable=False)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    organization: Mapped[str] = mapped_column(String(255), nullable=False)
    results_in: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Clinic Details
    clinic_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinic_open_time: Mapped[datetime.time | None] = mapped_column(TIME, nullable=True)
    clinic_close_time: Mapped[datetime.time | None] = mapped_column(TIME, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    category: Mapped["LabTestCategory"] = relationship("LabTestCategory", back_populates="tests")

    def __repr__(self):
        return f"<LabTest id={self.id} name={self.name} org={self.organization}>"


# NEW MODEL: Tracks Patient Bookings for Lab Tests
class LabTestBooking(Base):
    __tablename__ = "lab_test_bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lab_test_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lab_tests.id", ondelete="CASCADE"), nullable=False)
    
    status: Mapped[LabTestBookingStatus] = mapped_column(Enum(LabTestBookingStatus), default=LabTestBookingStatus.PENDING, nullable=False)
    scheduled_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships to fetch nested data easily
    patient_user = relationship("User")
    lab_test = relationship("LabTest")