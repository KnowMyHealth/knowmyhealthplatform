# app/modules/health_package/models.py
import uuid
import enum
import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID, JSONB
from sqlalchemy import String, Boolean, Numeric, Text, func, ForeignKey, Enum, Date, TIME

from app.db.base import Base

class HealthPackageBookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    ADVANCE_PAID = "ADVANCE_PAID"
    PAID = "PAID"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"

class HealthPackage(Base):
    __tablename__ = "health_packages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    organization: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0.0)
    
    included_tests: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # NEW FIELDS: Clinic Location and Open Hours
    clinic_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinic_open_time: Mapped[datetime.time | None] = mapped_column(TIME, nullable=True)
    clinic_close_time: Mapped[datetime.time | None] = mapped_column(TIME, nullable=True)
    
    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<HealthPackage id={self.id} title='{self.title}'>"


# NEW MODEL: Tracks Patient Bookings for Health Packages
class HealthPackageBooking(Base):
    __tablename__ = "health_package_bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    health_package_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("health_packages.id", ondelete="CASCADE"), nullable=False)
    
    status: Mapped[HealthPackageBookingStatus] = mapped_column(Enum(HealthPackageBookingStatus), default=HealthPackageBookingStatus.PENDING, nullable=False)
    scheduled_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    patient_user = relationship("User")
    health_package = relationship("HealthPackage")