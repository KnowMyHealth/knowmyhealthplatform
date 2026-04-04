from uuid import UUID
from typing import List
from loguru import logger
from sqlalchemy import select, delete, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import upload_webp_image
from app.utils.image_optimization import optimize_image_to_webp
from app.modules.prescription.models import Prescription, PrescriptionMedicine
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

    async def create_prescription(
        self,
        db: AsyncSession,
        user_id: UUID,
        data: dict
    ) -> Prescription:
        try:
            medicines_data = data.pop("medicines", [])

            prescription = Prescription(
                user_id=user_id,
                **data
            )

            db.add(prescription)
            await db.flush()  # get prescription.id

            # Add medicines
            for med in medicines_data:
                medicine = PrescriptionMedicine(
                    prescription_id=prescription.id,
                    **med
                )
                db.add(medicine)

            await db.commit()
            await db.refresh(prescription)

            logger.info(f"Created prescription {prescription.id} for user {user_id}")
            return prescription

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating prescription for user {user_id}: {e}")
            raise PrescriptionCreationError("Failed to create prescription")

    async def get_prescription(
        self,
        db: AsyncSession,
        prescription_id: UUID
    ) -> Prescription:
        try:
            stmt = select(Prescription).where(Prescription.id == prescription_id)
            result = await db.execute(stmt)
            prescription = result.scalar_one_or_none()

            if not prescription:
                raise PrescriptionNotFoundError("Prescription not found")

            return prescription

        except SQLAlchemyError as e:
            logger.error(f"Error fetching prescription {prescription_id}: {e}")
            raise PrescriptionNotFoundError("Failed to fetch prescription")

    async def list_user_prescriptions(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> List[Prescription]:
        try:
            stmt = (
                select(Prescription)
                .where(Prescription.user_id == user_id)
                .order_by(Prescription.created_at.desc())
            )

            result = await db.execute(stmt)
            return result.scalars().all()

        except SQLAlchemyError as e:
            logger.error(f"Error listing prescriptions for user {user_id}: {e}")
            raise PrescriptionNotFoundError("Failed to fetch prescriptions")

    async def update_prescription(
        self,
        db: AsyncSession,
        prescription_id: UUID,
        data: dict
    ) -> Prescription:
        try:
            medicines_data = data.pop("medicines", None)

            # Update main prescription
            stmt = (
                update(Prescription)
                .where(Prescription.id == prescription_id)
                .values(**data)
                .returning(Prescription)
            )

            result = await db.execute(stmt)
            prescription = result.scalar_one_or_none()

            if not prescription:
                raise PrescriptionNotFoundError("Prescription not found")

            # Replace medicines if provided
            if medicines_data is not None:
                # Delete old medicines
                await db.execute(
                    delete(PrescriptionMedicine)
                    .where(PrescriptionMedicine.prescription_id == prescription_id)
                )

                # Insert new medicines
                for med in medicines_data:
                    db.add(PrescriptionMedicine(
                        prescription_id=prescription_id,
                        **med
                    ))

            await db.commit()
            logger.info(f"Updated prescription {prescription_id}")

            return prescription

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating prescription {prescription_id}: {e}")
            raise PrescriptionUpdateError("Failed to update prescription")

    async def delete_prescription(
        self,
        db: AsyncSession,
        prescription_id: UUID
    ) -> None:
        try:
            stmt = delete(Prescription).where(Prescription.id == prescription_id)
            result = await db.execute(stmt)

            if result.rowcount == 0:
                raise PrescriptionNotFoundError("Prescription not found")

            await db.commit()
            logger.info(f"Deleted prescription {prescription_id}")

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error deleting prescription {prescription_id}: {e}")
            raise PrescriptionDeletionError("Failed to delete prescription")
        
    async def ocr_prescription(
        self,
        db: AsyncSession,
        user_id: UUID,
        file_bytes: bytes
    ):
        try:
            # 1. Optimize image
            optimized_image = await optimize_image_to_webp(file_bytes)

            # 2. Upload image
            _, public_url = await upload_webp_image(optimized_image)

            # 3. Extract structured data
            extracted_data = await extract_prescription_data(optimized_image)

            # 4. Convert to dict
            extracted_dict = extracted_data.model_dump()

            # 5. Inject image_url into payload
            extracted_dict["image_url"] = public_url

            # 6. Save to DB
            prescription = await self.create_prescription(
                db=db,
                user_id=user_id,
                data=extracted_dict
            )

            return prescription

        except Exception as e:
            logger.error(f"OCR prescription failed for user {user_id}: {e}")
            raise PrescriptionCreationError("Failed to process prescription")

