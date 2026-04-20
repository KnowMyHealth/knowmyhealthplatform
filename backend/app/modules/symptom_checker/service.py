from uuid import UUID
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic_ai.messages import ModelRequest, ModelResponse, UserPromptPart, TextPart

from app.modules.labtest.models import LabTest
from app.modules.symptom_checker.models import SymptomAssessment, SymptomAssessmentRecommendation
from app.modules.symptom_checker.schemas import SymptomCheckRequest, FinalReport
from app.modules.symptom_checker.agent import run_symptom_checker
from app.modules.symptom_checker.exceptions import SymptomCheckerError
from sqlalchemy.orm import selectinload

class SymptomCheckerService:
    # UPDATED: Added user_id parameter
    async def process_symptoms(self, db: AsyncSession, user_id: UUID, payload: SymptomCheckRequest) -> dict:
        try:
            # 1. Translate history to Pydantic AI types
            message_history =[]
            for msg in payload.history:
                if msg.role.value == "user":
                    message_history.append(ModelRequest(parts=[UserPromptPart(content=msg.content)]))
                elif msg.role.value == "ai":
                    message_history.append(ModelResponse(parts=[TextPart(content=msg.content)]))

            # 2. Fetch active Lab Tests
            stmt = select(LabTest.id, LabTest.name, LabTest.organization).where(LabTest.is_active == True)
            result = await db.execute(stmt)
            active_tests =[{"id": str(row.id), "name": row.name, "organization": row.organization} for row in result.all()]

            # 3. Call the Agent
            response_data = await run_symptom_checker(
                message_history=message_history,
                current_message=payload.message,
                available_tests=active_tests
            )

            # 4. Route response & Save to DB if Final Report
            if isinstance(response_data, str):
                return {
                    "type": "question",
                    "ai_reply": response_data
                }
            else:
                # --- NEW: SAVE TO DATABASE ---
                assessment = SymptomAssessment(
                    user_id=user_id,
                    possible_causes=response_data.possible_causes,
                    general_advice=response_data.general_advice
                )
                db.add(assessment)
                await db.flush() # Flush to get the assessment.id

                # Save the linked lab tests safely
                for rec in response_data.recommended_tests:
                    # Double check the AI didn't hallucinate a UUID
                    if any(str(t['id']) == str(rec.id) for t in active_tests):
                        db.add(SymptomAssessmentRecommendation(
                            assessment_id=assessment.id,
                            lab_test_id=rec.id
                        ))
                
                await db.commit()
                logger.info(f"Saved symptom assessment {assessment.id} for user {user_id}")
                
                return {
                    "type": "report",
                    "ai_reply": "Here is your preliminary assessment based on our chat.",
                    "assessment_id": str(assessment.id), # Return the DB ID to the frontend
                    "report": response_data.model_dump()
                }

        except Exception as e:
            await db.rollback()
            logger.error(f"Symptom checker failed: {e}")
            raise SymptomCheckerError("Failed to process symptoms.")
        
    async def list_user_assessments(self, db: AsyncSession, user_id: UUID) -> list[SymptomAssessment]:
        """Returns a list of all past assessments for a user."""
        stmt = (
            select(SymptomAssessment)
            .where(SymptomAssessment.user_id == user_id)
            .order_by(SymptomAssessment.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_assessment_by_id(self, db: AsyncSession, user_id: UUID, assessment_id: UUID) -> dict:
        stmt = (
            select(SymptomAssessment)
            .options(
                selectinload(SymptomAssessment.recommendations)
                .selectinload(SymptomAssessmentRecommendation.lab_test)
            )
            .where(SymptomAssessment.id == assessment_id, SymptomAssessment.user_id == user_id)
        )
        result = await db.execute(stmt)
        assessment = result.scalar_one_or_none()
        
        if not assessment:
            raise SymptomCheckerError("Assessment not found", status_code=404)

        # --- MANUAL MAPPING (The logic you removed from the schema) ---
        return {
            "id": assessment.id,
            "possible_causes": assessment.possible_causes,
            "general_advice": assessment.general_advice,
            "created_at": assessment.created_at,
            "recommendations": [
                {
                    "id": r.lab_test.id,
                    "test_name": r.lab_test.name,
                    "organization": r.lab_test.organization
                } for r in assessment.recommendations
            ]
        }