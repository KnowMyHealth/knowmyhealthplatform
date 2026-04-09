import uuid
import enum
from datetime import datetime, date
from decimal import Decimal
from typing import TYPE_CHECKING    

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID, DATE
from sqlalchemy import String, Boolean, ForeignKey, Integer, Text, Enum, func, Numeric

from app.db.base import Base

if TYPE_CHECKING:
    from app.modules.user.models import User

class DoctorStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"
    
class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"), # Matches User table name
        nullable=True,
        unique=True 
    )
    first_name: Mapped[str] = mapped_column(
        String(100), 
        nullable=False
    )
    last_name: Mapped[str] = mapped_column(
        String(100), 
        nullable=False
    )
    avatar_url: Mapped[str | None] = mapped_column(
        String(255), 
        nullable=True
    )
    bio: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    contact: Mapped[str | None] = mapped_column(
        String(50), 
        nullable=True
    )
    specialization: Mapped[str] = mapped_column(
        String(150), 
        nullable=False
    )
    education: Mapped[str | None] = mapped_column(
        String(255), 
        nullable=True
    )
    license_id: Mapped[str] = mapped_column(
        String(100), 
        unique=True, 
        nullable=False
    )
    license_url: Mapped[str | None] = mapped_column(
        String(255), 
        nullable=True
    )
    consultation_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), 
        nullable=False,
        default=0.0 
    )
    years_of_experience: Mapped[int | None] = mapped_column(
        Integer, 
        nullable=True
    )
    is_available: Mapped[bool] = mapped_column(
        Boolean, 
        default=True, 
        nullable=False
    )
    status: Mapped[DoctorStatus] = mapped_column(
        Enum(DoctorStatus), 
        nullable=False, 
        default=DoctorStatus.PENDING
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

    user: Mapped["User"] = relationship(
        "User", 
        back_populates="doctor_profile"
    )

    def __repr__(self):
        return (
            f"<Doctor id={self.id} "
            f"name={self.first_name} {self.last_name} "
            f"specialization={self.specialization} "
            f"status={self.status}>"
        )