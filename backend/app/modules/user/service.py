from uuid import UUID
from loguru import logger
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update, func
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.all_models import User
from app.modules.user.schemas import Role
from app.modules.user.exceptions import (
    UserNotFoundError,
    UserUpdateError
)
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from app.modules.patient.models import Patient
from app.modules.doctor.models import Doctor, DoctorStatus
from app.modules.partner.models import Partner, PartnerStatus



class UsersService:
    def __init__(self):
        pass

    async def get_user_by_id(self, db: AsyncSession, user_id: UUID) -> User | None:
        """Fetches a user from the database by their UUID."""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def update_user_role(
        self,
        db: AsyncSession,
        user_id: UUID,
        role: Role
    ) -> User:
        """
        Updates the role of a user.
        """
        try:
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(role=role.value)
                .returning(User)
            )

            result = await db.execute(stmt)
            updated_user = result.scalar_one_or_none()

            if not updated_user:
                logger.warning(f"Update role failed: User {user_id} not found.")
                raise UserNotFoundError(f"User {user_id} not found.")

            await db.commit()
            logger.info(f"Updated role for user {user_id} → {role.value}")

            return updated_user

        except IntegrityError as e:
            await db.rollback()
            logger.warning(f"Integrity error updating role for user {user_id}: {e}")
            raise UserUpdateError("Invalid role value or constraint violation.")

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error updating role for user {user_id}: {e}")
            raise UserUpdateError("A database error occurred while updating the role.")
        
    
    async def get_admin_dashboard_metrics(self, db: AsyncSession) -> dict:
        """
        Calculates KPIs for the admin dashboard including total counts 
        and Month-over-Month (MoM) percentage changes.
        """
        

        now = datetime.now(timezone.utc)
        
        # Calculate start of current month and start of previous month
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_month_end = current_month_start - timedelta(microseconds=1)
        prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        async def get_stats(model, filters=None):
            """Helper to calculate Total, Current Month, and Prev Month counts."""
            if filters is None:
                filters = []

            total_stmt = select(func.count()).select_from(model).where(*filters)
            curr_stmt = select(func.count()).select_from(model).where(*filters, model.created_at >= current_month_start)
            prev_stmt = select(func.count()).select_from(model).where(*filters, model.created_at >= prev_month_start, model.created_at < current_month_start)

            total = (await db.execute(total_stmt)).scalar() or 0
            curr = (await db.execute(curr_stmt)).scalar() or 0
            prev = (await db.execute(prev_stmt)).scalar() or 0

            # Calculate Percentage Change
            if prev == 0:
                perc = 100.0 if curr > 0 else 0.0
            else:
                perc = ((curr - prev) / prev) * 100.0

            return {
                "count": total,
                "percentage_change": round(perc, 1),
                "is_positive": perc >= 0
            }

        # 1. Total Patients
        patients_stat = await get_stats(Patient)

        # 2. Active Doctors
        doctors_stat = await get_stats(Doctor, [Doctor.status == DoctorStatus.APPROVED])

        # 3. Partner Labs (All approved corporate partners/labs)
        partners_stat = await get_stats(Partner, [Partner.status == PartnerStatus.APPROVED])

        # 4. Pending Verifications (Combined Doctors + Partners)
        # Calculate Doctor Pendings
        doc_total = (await db.execute(select(func.count()).select_from(Doctor).where(Doctor.status == DoctorStatus.PENDING))).scalar() or 0
        doc_curr = (await db.execute(select(func.count()).select_from(Doctor).where(Doctor.status == DoctorStatus.PENDING, Doctor.created_at >= current_month_start))).scalar() or 0
        doc_prev = (await db.execute(select(func.count()).select_from(Doctor).where(Doctor.status == DoctorStatus.PENDING, Doctor.created_at >= prev_month_start, Doctor.created_at < current_month_start))).scalar() or 0
        
        # Calculate Partner Pendings
        part_total = (await db.execute(select(func.count()).select_from(Partner).where(Partner.status == PartnerStatus.PENDING))).scalar() or 0
        part_curr = (await db.execute(select(func.count()).select_from(Partner).where(Partner.status == PartnerStatus.PENDING, Partner.created_at >= current_month_start))).scalar() or 0
        part_prev = (await db.execute(select(func.count()).select_from(Partner).where(Partner.status == PartnerStatus.PENDING, Partner.created_at >= prev_month_start, Partner.created_at < current_month_start))).scalar() or 0

        # Aggregate Pending Metrics
        total_pending = doc_total + part_total
        curr_pending = doc_curr + part_curr
        prev_pending = doc_prev + part_prev

        if prev_pending == 0:
            pend_perc = 100.0 if curr_pending > 0 else 0.0
        else:
            pend_perc = ((curr_pending - prev_pending) / prev_pending) * 100.0

        pending_stat = {
            "count": total_pending,
            "percentage_change": round(pend_perc, 1),
            "is_positive": pend_perc >= 0  # Note: A drop in pendings (negative) is actually a good thing for operations!
        }

        return {
            "total_patients": patients_stat,
            "active_doctors": doctors_stat,
            "partner_labs": partners_stat,
            "pending_verifications": pending_stat
        }