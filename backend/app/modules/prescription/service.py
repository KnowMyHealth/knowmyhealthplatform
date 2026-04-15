from uuid import UUID
from typing import List
from loguru import logger
from sqlalchemy import select, delete, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.storage import upload_webp_image
from app.utils.image_optimization import optimize_image_to_webp
from app.modules.prescription.models import Prescription, PrescriptionMedicine, PrescriptionRecommendation
from app.modules.labtest.models import LabTest
from app.modules.prescription.agent import get_lab_test_recommendation
from app.modules.prescription.exceptions import (
    PrescriptionNotFoundError,
    PrescriptionCreationError,
    PrescriptionUpdateError,
    PrescriptionDeletionError,
)
from app.common.ocr import extract_prescription_data

class PrescriptionService:
    def __init__(self):
        pass

    async def create_prescription(self, db: AsyncSession, user_id: UUID, data: dict) -> Prescription:
        try:
            medicines_data = data.pop("medicines", [])
            prescription = Prescription(user_id=user_id, **data)
            db.add(prescription)
            await db.flush()

            for med in medicines_data:
                db.add(PrescriptionMedicine(prescription_id=prescription.id, **med))

            await db.commit()
            await db.refresh(prescription)
            return prescription
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating prescription for user {user_id}: {e}")
            raise PrescriptionCreationError("Failed to create prescription")

    async def get_prescription(self, db: AsyncSession, prescription_id: UUID) -> Prescription:
        try:
            stmt = (
                select(Prescription)
                .options(
                    selectinload(Prescription.medicines),
                    # Eager load the recommendations and the attached lab_test object
                    selectinload(Prescription.recommendations).selectinload(PrescriptionRecommendation.lab_test)
                )
                .where(Prescription.id == prescription_id)
            )
            result = await db.execute(stmt)
            prescription = result.scalar_one_or_none()

            if not prescription:
                raise PrescriptionNotFoundError("Prescription not found")
            return prescription
        except SQLAlchemyError as e:
            logger.error(f"Error fetching prescription {prescription_id}: {e}")
            raise PrescriptionNotFoundError("Failed to fetch prescription")

    async def list_user_prescriptions(self, db: AsyncSession, user_id: UUID) -> List[Prescription]:
        try:
            stmt = (
                select(Prescription)
                .options(
                    selectinload(Prescription.medicines),
                    selectinload(Prescription.recommendations).selectinload(PrescriptionRecommendation.lab_test)
                )
                .where(Prescription.user_id == user_id)
                .order_by(Prescription.created_at.desc())
            )
            result = await db.execute(stmt)
            return result.scalars().all()
        except SQLAlchemyError as e:
            logger.error(f"Error listing prescriptions for user {user_id}: {e}")
            raise PrescriptionNotFoundError("Failed to fetch prescriptions")

    async def update_prescription(self, db: AsyncSession, prescription_id: UUID, data: dict) -> Prescription:
        try:
            medicines_data = data.pop("medicines", None)

            stmt = update(Prescription).where(Prescription.id == prescription_id).values(**data).returning(Prescription)
            result = await db.execute(stmt)
            prescription = result.scalar_one_or_none()

            if not prescription:
                raise PrescriptionNotFoundError("Prescription not found")

            if medicines_data is not None:
                await db.execute(delete(PrescriptionMedicine).where(PrescriptionMedicine.prescription_id == prescription_id))
                for med in medicines_data:
                    db.add(PrescriptionMedicine(prescription_id=prescription_id, **med))

            await db.commit()
            # Fetch again to get fully loaded relationships
            return await self.get_prescription(db, prescription_id)

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating prescription {prescription_id}: {e}")
            raise PrescriptionUpdateError("Failed to update prescription")

    async def delete_prescription(self, db: AsyncSession, prescription_id: UUID) -> None:
        try:
            stmt = delete(Prescription).where(Prescription.id == prescription_id)
            result = await db.execute(stmt)
            if result.rowcount == 0:
                raise PrescriptionNotFoundError("Prescription not found")
            await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            raise PrescriptionDeletionError("Failed to delete prescription")
        
    async def ocr_prescription(self, db: AsyncSession, user_id: UUID, file_bytes: bytes) -> Prescription:
        try:
            optimized_image = await optimize_image_to_webp(file_bytes)
            _, public_url = await upload_webp_image(optimized_image)
            extracted_data = await extract_prescription_data(optimized_image)
            
            extracted_dict = extracted_data.model_dump()
            extracted_dict["image_url"] = public_url

            # 1. Save standard prescription
            prescription = await self.create_prescription(db=db, user_id=user_id, data=extracted_dict)

            # 2. Get active lab tests
            stmt = select(LabTest.id, LabTest.name, LabTest.organization).where(LabTest.is_active == True)
            result = await db.execute(stmt)
            active_tests = [{"id": str(row.id), "name": row.name, "organization": row.organization} for row in result.all()]

            # 3. Process AI Recommendations and Save to DB
            if active_tests:
                try:
                    ai_input_data = extracted_dict.copy()
                    ai_input_data.pop("image_url", None)
                    
                    recs = await get_lab_test_recommendation(active_tests, ai_input_data)
                    
                    for rec in recs:
                        db.add(PrescriptionRecommendation(
                            prescription_id=prescription.id,
                            lab_test_id=rec.id
                        ))
                    await db.commit()
                except Exception as ai_err:
                    logger.warning(f"Failed to generate/save lab test recommendations: {ai_err}")

            # 4. Return the fully loaded prescription from the DB (with relations)
            return await self.get_prescription(db, prescription.id)

        except Exception as e:
            logger.error(f"OCR prescription failed for user {user_id}: {e}")
            raise PrescriptionCreationError("Failed to process prescription")