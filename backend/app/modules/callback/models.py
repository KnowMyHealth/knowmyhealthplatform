# app/modules/callback/models.py
import uuid
import enum
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy import String, Text, Enum, func

from app.db.base import Base

class CallbackStatus(str, enum.Enum):
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    IGNORED = "IGNORED"

class CallbackRequest(Base):
    __tablename__ = "callback_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    
    status: Mapped[CallbackStatus] = mapped_column(
        Enum(CallbackStatus), 
        nullable=False, 
        default=CallbackStatus.PENDING
    )
    
    # Optional field for Admin to type in what happened during the call
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<CallbackRequest id={self.id} name='{self.name}' status={self.status}>"