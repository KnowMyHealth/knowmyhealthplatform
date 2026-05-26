import asyncio
import uuid
import string
import secrets
import calendar
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from uuid import UUID
from loguru import logger
from sqlalchemy import update, select, func, delete
from sqlalchemy.orm import selectinload
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
from app.core.email import send_doctor_invite_email, send_doctor_welcome_email
from app.modules.doctor.models import DoctorAvailability

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
        Approves a doctor, creates their account in Supabase,
        links the profile, and sends a welcome email with credentials.
        """
        doctor = await self.get_doctor_by_id(db, doctor_id)
        
        if doctor.status == DoctorStatus.APPROVED:
            raise DoctorUpdateError("Doctor is already approved.")

        new_supabase_uid = None
        
        # 1. Generate a secure temporary password (12 chars: Letters, Digits, Punctuation)
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))

        try:
            try:
                # 2. Create User in Supabase Auth
                auth_response = supabase_admin.auth.admin.create_user({
                    "email": doctor.email,
                    "password": temp_password, 
                    "email_confirm": True,       
                    "user_metadata": {"role": Role.DOCTOR.value}
                })
                
                if not auth_response.user:
                    raise Exception("Supabase Auth failed to return a user object.")

                new_supabase_uid = uuid.UUID(auth_response.user.id)
                logger.info(f"Supabase Auth user created: {new_supabase_uid}")

            except Exception as e:
                error_detail = str(e)
                logger.error(f"Supabase Admin API failure: {error_detail}")
                raise DoctorUpdateError(f"Supabase User Creation Failed: {error_detail}")

            try:
                # 3. Update Database (Role & Linking)
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
                
                logger.info(f"Successfully approved doctor {doctor_id}")

                # 4. Send the Welcome Email (Runs synchronously but wrapped safely)
                # We use asyncio.to_thread because the Resend SDK is synchronous
                doctor_name = f"{doctor.first_name} {doctor.last_name}"
                asyncio.create_task(
                    asyncio.to_thread(
                        send_doctor_welcome_email, 
                        to_email=doctor.email, 
                        doctor_name=doctor_name, 
                        temp_password=temp_password
                    )
                )

                return doctor

            except SQLAlchemyError as db_err:
                await db.rollback()
                logger.error(f"Database error during doctor approval: {db_err}")
                
                # Rollback: Delete the Supabase user if our local DB failed
                if new_supabase_uid:
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
        

    async def get_doctor_by_user_id(self, db: AsyncSession, user_id: UUID) -> Doctor:
        stmt = select(Doctor).where(Doctor.user_id == user_id)
        result = await db.execute(stmt)
        doctor = result.scalar_one_or_none()
        if not doctor:
            raise DoctorNotFoundError("Doctor profile not found for this user.")
        return doctor

    async def set_doctor_availability(self, db: AsyncSession, doctor_id: UUID, schedule: list[dict]):
        """Wipes old schedule and saves the new one."""
        try:
            # 1. Delete existing schedule
            await db.execute(delete(DoctorAvailability).where(DoctorAvailability.doctor_id == doctor_id))
            
            # 2. Insert new schedule
            for slot in schedule:
                db.add(DoctorAvailability(
                    doctor_id=doctor_id,
                    day_of_week=slot["day_of_week"],
                    start_time=slot["start_time"],
                    end_time=slot["end_time"]
                ))
            
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise DoctorUpdateError(f"Failed to save availability: {e}")

    async def get_doctor_availability(self, db: AsyncSession, doctor_id: UUID) -> list[DoctorAvailability]:
        stmt = select(DoctorAvailability).where(DoctorAvailability.doctor_id == doctor_id).order_by(DoctorAvailability.day_of_week, DoctorAvailability.start_time)
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    async def update_doctor_profile(self, db: AsyncSession, user_id: UUID, data: dict) -> Doctor:
        """Updates the doctor's profile using their logged-in User ID."""
        doctor = await self.get_doctor_by_user_id(db, user_id)
        
        if not data:
            return doctor

        try:
            stmt = (
                update(Doctor)
                .where(Doctor.id == doctor.id)
                .values(**data)
                .returning(Doctor)
            )
            result = await db.execute(stmt)
            updated_doctor = result.scalar_one_or_none()
            
            await db.commit()
            logger.info(f"Doctor {doctor.id} updated their profile.")
            return updated_doctor

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error updating doctor profile {doctor.id}: {e}")
            raise DoctorUpdateError("Failed to update profile due to a database error.")
        
    async def get_doctor_revenue_analytics(self, db: AsyncSession, doctor_user_id: UUID) -> dict:
        """
        Retrieves aggregated earnings and transaction history using ONLY 
        the local database tables (payments, consultations).
        """
        doctor = await self.get_doctor_by_user_id(db, doctor_user_id)
        
        # Local imports of models mapping to your Postgres tables
        from app.modules.payment.models import Payment, PaymentStatus, BookingType
        from app.modules.consultation.models import Consultation
        from app.modules.user.models import User

        current_year = datetime.now().year

        # ---------------------------------------------------------
        # 1. LOCAL DB QUERY: Aggregate Monthly Earnings
        # ---------------------------------------------------------
        monthly_stmt = (
            select(
                func.extract('month', Payment.created_at).label('month'),
                func.sum(Payment.amount).label('total_revenue')
            )
            .join(Consultation, Payment.booking_id == Consultation.id)
            .where(
                Consultation.doctor_id == doctor.id,
                Payment.booking_type == BookingType.CONSULTATION,
                Payment.status == PaymentStatus.SUCCESS,
                func.extract('year', Payment.created_at) == current_year
            )
            .group_by(func.extract('month', Payment.created_at))
        )
        
        # Executes against local Postgres
        monthly_result = await db.execute(monthly_stmt)
        monthly_rows = monthly_result.all()

        months_abbr = list(calendar.month_abbr)[1:]  # ["Jan", "Feb", ..., "Dec"]
        monthly_earnings_map = {month: Decimal("0.00") for month in months_abbr}
        total_earnings = Decimal("0.00")

        for row in monthly_rows:
            if row.month and row.total_revenue:
                month_name = months_abbr[int(row.month) - 1]
                revenue_val = Decimal(str(row.total_revenue))
                monthly_earnings_map[month_name] = revenue_val
                total_earnings += revenue_val

        monthly_earnings_list = [
            {"month": m, "amount": amt} for m, amt in monthly_earnings_map.items()
        ]

        # ---------------------------------------------------------
        # 2. LOCAL DB QUERY: Recent Transactions List
        # ---------------------------------------------------------
        transactions_stmt = (
            select(Payment, Consultation)
            .options(
                selectinload(Consultation.patient_user).selectinload(User.patient_profile)
            )
            .join(Consultation, Payment.booking_id == Consultation.id)
            .where(
                Consultation.doctor_id == doctor.id,
                Payment.booking_type == BookingType.CONSULTATION,
                Payment.status == PaymentStatus.SUCCESS
            )
            .order_by(Payment.created_at.desc())
            .limit(10)
        )

        # Executes against local Postgres
        transactions_result = await db.execute(transactions_stmt)
        transaction_rows = transactions_result.all()

        recent_transactions = []
        now = datetime.now(timezone.utc)

        for payment, consultation in transaction_rows:
            patient_name = "Anonymous Patient"
            if consultation.patient_user and consultation.patient_user.patient_profile:
                profile = consultation.patient_user.patient_profile
                patient_name = f"{profile.first_name} {profile.last_name}"

            pay_time = payment.created_at
            if pay_time.date() == now.date():
                date_label = f"Today, {pay_time.strftime('%I:%M %p')}"
            elif pay_time.date() == (now.date() - timedelta(days=1)):
                date_label = "Yesterday"
            else:
                date_label = pay_time.strftime("%d %b, %I:%M %p")

            # We read the transaction ID directly from the local database column.
            # (No API request is being made here)
            raw_ref = payment.razorpay_payment_id or str(payment.id)
            clean_trx_id = f"TRX-{raw_ref[-6:].upper()}" if len(raw_ref) >= 6 else f"TRX-{raw_ref.upper()}"

            recent_transactions.append({
                "transaction_id": clean_trx_id,
                "patient_name": patient_name,
                "date_label": date_label,
                "amount": payment.amount,
                "status": "Paid"
            })

        return {
            "total_earnings": total_earnings,
            "monthly_earnings": monthly_earnings_list,
            "recent_transactions": recent_transactions
        }