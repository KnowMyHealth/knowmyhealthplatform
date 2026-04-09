import uuid
from uuid import UUID
from loguru import logger
from sqlalchemy import update, select, func
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.pagination import PaginationParams
from app.db.all_models import Doctor
from app.modules.doctor.models import DoctorStatus
from app.modules.doctor.schemas import DoctorCreateRequest, DoctorUpdateRequest
from app.modules.doctor.exceptions import (
    DoctorNotFoundError,
    DoctorUpdateError,
    DoctorCreateError
)
from app.db.all_models import Doctor, User 
from app.modules.user.schemas import Role
from app.core.supabase import supabase_admin    
from app.core.storage import upload_pdf_document

class DoctorsService:
    def __init__(self):
        pass

    async def get_doctor_by_id(self, db: AsyncSession, doctor_id: UUID) -> Doctor:
        """
        Fetches a single doctor by ID. 
        Used by the Admin to view full application details.
        """
        stmt = select(Doctor).where(Doctor.id == doctor_id)
        result = await db.execute(stmt)
        doctor = result.scalar_one_or_none()
        
        if not doctor:
            logger.warning(f"Doctor lookup failed: {doctor_id} not found.")
            raise DoctorNotFoundError(f"Doctor with ID {doctor_id} does not exist.")
            
        return doctor

    async def create_doctor(
        self, 
        db: AsyncSession, 
        user_id: UUID | None, 
        payload: DoctorCreateRequest,
        license_pdf: bytes | None = None
    ) -> Doctor:
        try:
            # 1. Check uniqueness
            stmt = select(Doctor).where(Doctor.email == payload.email)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if existing:
                raise DoctorCreateError("Application already exists.")

            # 2. Upload the PDF and get the URL
            license_url = None
            if license_pdf:
                _, license_url = await upload_pdf_document(license_pdf)

            # 3. Create the Database object
            # We dump the text fields, then manually add the license_url we just created
            doctor_data = payload.model_dump()
            doctor_data["license_url"] = license_url 
            
            new_doctor = Doctor(user_id=user_id, **doctor_data)
            
            db.add(new_doctor)
            await db.commit()
            await db.refresh(new_doctor)
            return new_doctor
            
        except IntegrityError:
            await db.rollback()
            raise DoctorCreateError("License ID or Email already exists.")
        
    async def list_doctors(
        self, 
        db: AsyncSession, 
        params: PaginationParams,
        status: DoctorStatus | None = None
    ) -> tuple[list[Doctor], int]:
        """
        Returns a list of doctors and the total count for pagination.
        Optionally filter by status (e.g., 'pending').
        """
        # 1. Build the base query
        query = select(Doctor)
        count_query = select(func.count()).select_from(Doctor)

        # 2. Apply status filter if provided (e.g., to see only "pending" applications)
        if status:
            query = query.where(Doctor.status == status)
            count_query = count_query.where(Doctor.status == status)

        # 3. Get total count
        total_result = await db.execute(count_query)
        total_count = total_result.scalar() or 0

        # 4. Get paginated results
        query = (
            query
            .order_by(Doctor.created_at.desc())
            .offset(params.offset)
            .limit(params.limit)
        )
        
        result = await db.execute(query)
        items = result.scalars().all()

        return list(items), total_count

    async def approve_doctor_and_create_user(
        self,
        db: AsyncSession,
        doctor_id: UUID
    ) -> Doctor:
        """
        Approves a doctor, creates their account in Supabase (bypassing email limits),
        updates their role to DOCTOR, and links the profile.
        """
        # 1. Fetch the pending application
        doctor = await self.get_doctor_by_id(db, doctor_id)
        
        if doctor.status == DoctorStatus.APPROVED:
            raise DoctorUpdateError("Doctor is already approved.")

        new_supabase_uid = None

        try:
            try:
                auth_response = supabase_admin.auth.admin.create_user({
                    "email": doctor.email,
                    "password": "Password123!", # In production, generate a random one
                    "email_confirm": True,       # This is the "Magic" line that skips the email
                    "user_metadata": {"role": Role.DOCTOR.value}
                })
                
                if not auth_response.user:
                    raise Exception("Supabase Auth failed to return a user object.")

                new_supabase_uid = uuid.UUID(auth_response.user.id)
                logger.info(f"Supabase Auth user created (Confirmed): {new_supabase_uid}")

            except Exception as e:
                error_detail = str(e)
                logger.error(f"Supabase Admin API failure: {error_detail}")
                raise DoctorUpdateError(f"Supabase User Creation Failed: {error_detail}")

            try:
                user_update_stmt = (
                    update(User)
                    .where(User.id == new_supabase_uid)
                    .values(role=Role.DOCTOR.value)
                )
                await db.execute(user_update_stmt)

                doctor.user_id = new_supabase_uid
                doctor.status = DoctorStatus.APPROVED
                
                await db.commit()
                await db.refresh(doctor)
                
                logger.info(f"Successfully approved doctor {doctor_id} and linked to user {new_supabase_uid}")
                return doctor

            except SQLAlchemyError as db_err:
                await db.rollback()
                logger.error(f"Database error during doctor approval: {db_err}")
                
                # Rollback: Delete the Supabase user if our local DB failed
                if new_supabase_uid:
                    logger.warning(f"Deleting Supabase user {new_supabase_uid} due to local DB failure")
                    supabase_admin.auth.admin.delete_user(str(new_supabase_uid))
                
                raise DoctorUpdateError("Database failed to link profile. Supabase account was rolled back.")

        except Exception as global_err:
            logger.exception(f"Unexpected error in approval: {global_err}")
            raise DoctorUpdateError(f"Internal system error: {str(global_err)}")
        
    async def update_doctor_status(
        self,
        db: AsyncSession,
        doctor_id: UUID,
        status: DoctorStatus
    ) -> Doctor:
        """Updates the verification status of a doctor (Admin use)."""
        try:
            stmt = (
                update(Doctor)
                .where(Doctor.id == doctor_id)
                .values(status=status.value)
                .returning(Doctor)
            )

            result = await db.execute(stmt)
            updated_doctor = result.scalar_one_or_none()

            if not updated_doctor:
                logger.warning(f"Update status failed: Doctor {doctor_id} not found.")
                raise DoctorNotFoundError(f"Doctor {doctor_id} not found.")

            await db.commit()
            logger.info(f"Updated status for doctor {doctor_id} → {status.value}")

            return updated_doctor

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error updating status for doctor {doctor_id}: {e}")
            raise DoctorUpdateError("A database error occurred while updating the status.")