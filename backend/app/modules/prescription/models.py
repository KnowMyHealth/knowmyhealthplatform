import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP
from sqlalchemy import String, ForeignKey, func

from app.db.base import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    image_url: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    doctor_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    hospital_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    diagnosis: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    prescription_date: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    medicines: Mapped[list["PrescriptionMedicine"]] = relationship(
        back_populates="prescription",
        cascade="all, delete-orphan"
    )


class PrescriptionMedicine(Base):
    __tablename__ = "prescription_medicines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    prescription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("prescriptions.id", ondelete="CASCADE"),
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    dosage: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )  # e.g. "500mg"

    frequency: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )  # e.g. "twice daily"

    duration: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )  # e.g. "5 days"

    instructions: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )  # e.g. "after food"

    # Relationship
    prescription: Mapped["Prescription"] = relationship(
        back_populates="medicines"
    )