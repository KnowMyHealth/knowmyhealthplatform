import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy import String, Boolean, ForeignKey, Integer, Table, Column, Enum, func, Numeric
from typing import TYPE_CHECKING

from app.db.base import Base
from .schemas import Role

if TYPE_CHECKING:
    from app.modules.doctor.models import Doctor 
    from app.modules.patient.models import Patient

auth_users_table = Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth",
    extend_existing=True
)

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"), 
        primary_key=True
    )
    email: Mapped[str] = mapped_column(
        String(255), 
        unique=True, 
        index=True, 
        nullable=False
    )
    role: Mapped[Role] = mapped_column(
        Enum(Role), 
        nullable=False, 
        default=Role.PATIENT
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
    doctor_profile: Mapped["Doctor"] = relationship(
        "Doctor", 
        back_populates="user", 
        uselist=False, 
        cascade="all, delete-orphan"
    )
    patient_profile: Mapped["Patient"] = relationship(
        "Patient",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    def __repr__(self):
        return (
            f"<user_id={self.id} "
            f"email={self.email} "
            f"is_active={self.is_active} "
            f"created_at={self.created_at}>"
        )