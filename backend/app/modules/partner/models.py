import uuid
import enum
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy import String, Text, Enum, func

from app.db.base import Base

class PartnerStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONTACTED = "CONTACTED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class PartnerType(str, enum.Enum):
    PHARMACY = "PHARMACY"
    LABORATORY = "LABORATORY"
    HOSPITAL = "HOSPITAL"
    CLINIC = "CLINIC"
    OTHER = "OTHER"
    
class Partner(Base):
    __tablename__ = "partners"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    
    partner_type: Mapped[PartnerType] = mapped_column(Enum(PartnerType), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    status: Mapped[PartnerStatus] = mapped_column(
        Enum(PartnerStatus), 
        nullable=False, 
        default=PartnerStatus.PENDING
    )
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Partner id={self.id} company={self.company_name} status={self.status}>"