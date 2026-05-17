# app/modules/consultation/models.py
import uuid
import enum
from datetime import datetime
from typing import TYPE_CHECKING    

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy import String, ForeignKey, Enum, func

from app.db.base import Base

if TYPE_CHECKING:
    from app.modules.user.models import User
    from app.modules.doctor.models import Doctor

class ConsultationStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class ConsultationType(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"

class Consultation(Base):
    __tablename__ = "consultations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # We link the patient via their user_id for easier auth checks
    patient_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    
    scheduled_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    status: Mapped[ConsultationStatus] = mapped_column(Enum(ConsultationStatus), default=ConsultationStatus.SCHEDULED, nullable=False)
    consultation_type: Mapped[ConsultationType] = mapped_column(Enum(ConsultationType), default=ConsultationType.ONLINE, nullable=False)
    
    # The unique Agora channel room name (Nullable for OFFLINE consultations)
    channel_name: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    patient_user: Mapped["User"] = relationship("User")
    doctor: Mapped["Doctor"] = relationship("Doctor")