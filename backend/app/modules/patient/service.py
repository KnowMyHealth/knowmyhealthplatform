from uuid import UUID
from loguru import logger
from sqlalchemy import select, update, func
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.pagination import PaginationParams
from app.modules.patient.models import Patient
from app.modules.patient.schemas import PatientCreateRequest
from app.modules.patient.exceptions import (
    PatientNotFoundError,
    PatientCreateError,
    PatientUpdateError
)

class PatientService:
    async def create_patient(self, db: AsyncSession, user_id: UUID, data: PatientCreateRequest) -> Patient:
        try:
            patient = Patient(user_id=user_id, **data.model_dump())
            db.add(patient)
            await db.commit()
            await db.refresh(patient)
            logger.info(f"Created patient profile for user {user_id}")
            return patient
        except IntegrityError:
            await db.rollback()
            logger.warning(f"Patient profile already exists for user {user_id}")
            raise PatientCreateError("A patient profile already exists for this user.")
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error creating patient profile: {e}")
            raise PatientCreateError("Failed to create patient profile.")

    async def get_patient_by_user_id(self, db: AsyncSession, user_id: UUID) -> Patient:
        stmt = select(Patient).where(Patient.user_id == user_id)
        result = await db.execute(stmt)
        patient = result.scalar_one_or_none()
        
        if not patient:
            raise PatientNotFoundError("Patient profile not found. Please complete your profile.")
            
        return patient

    async def get_patient_by_id(self, db: AsyncSession, patient_id: UUID) -> Patient:
        patient = await db.get(Patient, patient_id)
        if not patient:
            raise PatientNotFoundError()
        return patient

    async def update_patient(self, db: AsyncSession, user_id: UUID, data: dict) -> Patient:
        if not data:
            return await self.get_patient_by_user_id(db, user_id)

        try:
            stmt = (
                update(Patient)
                .where(Patient.user_id == user_id)
                .values(**data)
                .returning(Patient)
            )
            result = await db.execute(stmt)
            updated_patient = result.scalar_one_or_none()

            if not updated_patient:
                raise PatientNotFoundError("Patient profile not found. Cannot update.")

            await db.commit()
            return updated_patient

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating patient profile for user {user_id}: {e}")
            raise PatientUpdateError("Failed to update patient profile.")

    async def list_patients(self, db: AsyncSession, params: PaginationParams) -> tuple[list[Patient], int]:
        """Admin use: Lists all patients."""
        query = select(Patient)
        count_query = select(func.count()).select_from(Patient)

        total_count = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Patient.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()

        return list(items), total_count