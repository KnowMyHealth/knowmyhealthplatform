import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP, JSONB
from sqlalchemy import ForeignKey, Text, func
from typing import TYPE_CHECKING

from app.db.base import Base

if TYPE_CHECKING:
    from app.modules.labtest.models import LabTest
    from app.modules.user.models import User

class SymptomAssessment(Base):
    __tablename__ = "symptom_assessments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Store the array of causes as JSON
    possible_causes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    general_advice: Mapped[str] = mapped_column(Text, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    recommendations: Mapped[list["SymptomAssessmentRecommendation"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan"
    )


class SymptomAssessmentRecommendation(Base):
    __tablename__ = "symptom_assessment_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("symptom_assessments.id", ondelete="CASCADE"), nullable=False)
    lab_test_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lab_tests.id", ondelete="CASCADE"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    assessment: Mapped["SymptomAssessment"] = relationship(back_populates="recommendations")
    lab_test: Mapped["LabTest"] = relationship()