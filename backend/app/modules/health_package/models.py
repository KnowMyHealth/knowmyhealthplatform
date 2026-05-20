import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID, JSONB
from sqlalchemy import String, Boolean, Numeric, Text, func

from app.db.base import Base

class HealthPackage(Base):
    __tablename__ = "health_packages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    organization: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False) # The original strikethrough price
    discount_percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0.0)
    
    # Store the checkmark items as a JSON array of strings
    included_tests: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<HealthPackage id={self.id} title='{self.title}'>"