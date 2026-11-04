# app/modules/partner/service.py
import io
import csv
from datetime import date

import uuid
import string
import secrets
from uuid import UUID
from loguru import logger
from sqlalchemy import update, select, func, delete, text
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.patient.models import Gender
from app.utils.pagination import PaginationParams
from app.db.all_models import User, Patient
from app.modules.user.schemas import Role
from app.core.supabase import supabase_admin

from app.modules.partner.models import Partner, PartnerStatus
from app.modules.partner.schemas import PartnerCreateRequest, PartnerPatientCreateRequest
from app.modules.partner.exceptions import (
    PartnerNotFoundError,
    PartnerCreateError,
    PartnerUpdateError
)

class PartnerService:
    async def create_partner(self, db: AsyncSession, payload: PartnerCreateRequest) -> Partner:
        try:
            stmt = select(Partner).where(Partner.email == payload.email)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if existing:
                raise PartnerCreateError("A partner application with this email already exists.")

            new_partner = Partner(**payload.model_dump())
            db.add(new_partner)
            await db.commit()
            await db.refresh(new_partner)
            return new_partner
        except IntegrityError:
            await db.rollback()
            raise PartnerCreateError("Email already exists.")

    async def get_partner_by_id(self, db: AsyncSession, partner_id: UUID) -> Partner:
        stmt = select(Partner).where(Partner.id == partner_id)
        partner = (await db.execute(stmt)).scalar_one_or_none()
        if not partner:
            raise PartnerNotFoundError("Partner application not found.")
        return partner
        
    async def get_partner_by_user_id(self, db: AsyncSession, user_id: UUID) -> Partner:
        stmt = select(Partner).where(Partner.user_id == user_id)
        partner = (await db.execute(stmt)).scalar_one_or_none()
        if not partner:
            raise PartnerNotFoundError("Partner profile not found for this user.")
        return partner

    async def list_partners(self, db: AsyncSession, params: PaginationParams, status: PartnerStatus | None = None) -> tuple[list[Partner], int]:
        query = select(Partner)
        count_query = select(func.count()).select_from(Partner)

        if status:
            query = query.where(Partner.status == status)
            count_query = count_query.where(Partner.status == status)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(Partner.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()

        return list(items), total_count

    async def update_partner_status(self, db: AsyncSession, partner_id: UUID, status: PartnerStatus) -> Partner:
        try:
            stmt = update(Partner).where(Partner.id == partner_id).values(status=status.value).returning(Partner)
            result = await db.execute(stmt)
            updated_partner = result.scalar_one_or_none()
            if not updated_partner:
                raise PartnerNotFoundError()
            await db.commit()
            return updated_partner
        except SQLAlchemyError as e:
            await db.rollback()
            raise PartnerUpdateError("Database error while updating status.")

    async def delete_partner(self, db: AsyncSession, partner_id: UUID) -> None:
        try:
            stmt = delete(Partner).where(Partner.id == partner_id)
            result = await db.execute(stmt)
            if result.rowcount == 0:
                raise PartnerNotFoundError()
            await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            raise PartnerUpdateError("Failed to delete partner application.")

    # Admin: Approve Partner & Generate Login
    async def approve_partner_and_create_user(self, db: AsyncSession, partner_id: UUID, discount_percentage: float) -> Partner:
        partner = await self.get_partner_by_id(db, partner_id)
        
        # Idempotency Fix: Ensure we don't try to create a Supabase user if they already have one
        if partner.status == PartnerStatus.APPROVED or partner.user_id is not None:
            raise PartnerUpdateError("Partner is already approved and has an account.")

        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        new_supabase_uid = None        # set only when WE created the auth user (safe to delete on failure)
        reused_uid = None              # set when an existing auth account is promoted to PARTNER
        reused_prev_metadata = None

        # 1. Resolve the login account for this partner.
        # The partner's email may already exist in Supabase Auth (e.g. the contact signed up on
        # the website, or an earlier approval left an orphaned account). Blindly calling
        # create_user() then fails with "A user with this email address has already been
        # registered" and the partner can never be approved — so reuse the account when safe.
        existing_uid = await self._find_existing_account_id(db, partner.email)
        if existing_uid:
            await self._assert_account_reusable(db, existing_uid, partner.id)

        try:
            if existing_uid:
                existing_auth = supabase_admin.auth.admin.get_user_by_id(str(existing_uid))
                reused_prev_metadata = dict(getattr(existing_auth.user, "user_metadata", None) or {})
                supabase_admin.auth.admin.update_user_by_id(str(existing_uid), {
                    "password": temp_password,
                    "email_confirm": True,
                    "user_metadata": {**reused_prev_metadata, "role": Role.PARTNER.value},
                })
                reused_uid = existing_uid
                account_uid = existing_uid
                logger.info(f"Reusing existing auth account {existing_uid} for partner {partner_id}")
            else:
                auth_response = supabase_admin.auth.admin.create_user({
                    "email": partner.email,
                    "password": temp_password,
                    "email_confirm": True,
                    "user_metadata": {"role": Role.PARTNER.value}
                })
                new_supabase_uid = uuid.UUID(auth_response.user.id)
                account_uid = new_supabase_uid

            # 2. Ensure the local users row exists with the PARTNER role, then link + save discount
            user_row = await db.get(User, account_uid)
            if user_row is None:
                db.add(User(id=account_uid, email=partner.email, role=Role.PARTNER, is_active=True))
                await db.flush()
            else:
                await db.execute(update(User).where(User.id == account_uid).values(role=Role.PARTNER.value))

            partner.user_id = account_uid
            partner.status = PartnerStatus.APPROVED
            partner.discount_percentage = discount_percentage

            # 3. Auto-generate the corporate coupon
            from app.modules.coupon.models import Coupon
            clean_company_name = "".join(c for c in partner.company_name if c.isalnum()).upper()[:8]
            coupon_code = f"KMH-{clean_company_name}-{int(partner.discount_percentage)}"
            
            existing_coupon = (await db.execute(select(Coupon).where(Coupon.code == coupon_code))).scalar_one_or_none()
            if existing_coupon:
                coupon_code = f"KMH-{clean_company_name}-{secrets.token_hex(2).upper()}"

            new_coupon = Coupon(
                code=coupon_code,
                discount_percentage=partner.discount_percentage,
                partner_id=partner.id,
                is_active=True
            )
            db.add(new_coupon)

            await db.commit()
            await db.refresh(partner)
            
            logger.info(f"Approved partner {partner_id}. Coupon Code: {coupon_code}")

            # 4. Trigger welcome email safely
            import asyncio
            from app.core.email import send_partner_welcome_email
            
            def send_email_safe():
                try:
                    send_partner_welcome_email(
                        to_email=partner.email,
                        company_name=partner.company_name,
                        temp_password=temp_password,
                        coupon_code=coupon_code
                    )
                except Exception as email_err:
                    logger.error(f"Failed to send welcome email to {partner.email}: {email_err}")

            asyncio.create_task(asyncio.to_thread(send_email_safe))

            return partner
        except Exception as e:
            await db.rollback()
            logger.exception(f"Partner approval failed for {partner_id}: {e}")
            if new_supabase_uid:
                try:
                    supabase_admin.auth.admin.delete_user(str(new_supabase_uid))
                except Exception as cleanup_err:
                    logger.error(f"Failed to roll back auth user {new_supabase_uid}: {cleanup_err}")
            if reused_uid is not None and reused_prev_metadata is not None:
                try:
                    supabase_admin.auth.admin.update_user_by_id(
                        str(reused_uid), {"user_metadata": reused_prev_metadata}
                    )
                except Exception as cleanup_err:
                    logger.error(f"Failed to restore metadata for {reused_uid}: {cleanup_err}")
            raise PartnerUpdateError(f"Failed to approve partner: {e}")

    async def get_coupon_codes(self, db: AsyncSession, partner_ids: list[UUID]) -> dict[UUID, str]:
        """Map partner_id -> active corporate coupon code (for admin display)."""
        if not partner_ids:
            return {}
        from app.modules.coupon.models import Coupon
        rows = (await db.execute(
            select(Coupon.partner_id, Coupon.code)
            .where(Coupon.partner_id.in_(partner_ids), Coupon.is_active.is_(True))
            .order_by(Coupon.created_at.asc())
        )).all()
        return {pid: code for pid, code in rows}

    async def _find_existing_account_id(self, db: AsyncSession, email: str) -> UUID | None:
        """Return the auth user id already registered with this email, if any."""
        uid = (await db.execute(
            select(User.id).where(func.lower(User.email) == email.strip().lower())
        )).scalar_one_or_none()
        if uid:
            return uid
        # Fallback: auth user exists but the public.users mirror row is missing
        try:
            uid = (await db.execute(
                text("SELECT id FROM auth.users WHERE lower(email) = :email LIMIT 1"),
                {"email": email.strip().lower()},
            )).scalar_one_or_none()
        except SQLAlchemyError as e:
            await db.rollback()
            logger.warning(f"Could not query auth.users for existing account: {e}")
            return None
        return uid

    async def _assert_account_reusable(self, db: AsyncSession, user_id: UUID, partner_id: UUID) -> None:
        """Refuse to hijack accounts that belong to someone else's role/data."""
        user = await db.get(User, user_id)
        if user is not None and user.role in (Role.ADMIN, Role.DOCTOR):
            raise PartnerUpdateError(
                f"This email is already registered as a {user.role.value.lower()} account. "
                "Ask the partner to use a different email before approving."
            )

        other_partner = (await db.execute(
            select(Partner.id).where(Partner.user_id == user_id, Partner.id != partner_id)
        )).scalar_one_or_none()
        if other_partner:
            raise PartnerUpdateError("This email is already linked to another approved partner.")

        from app.modules.doctor.models import Doctor
        if (await db.execute(select(Doctor.id).where(Doctor.user_id == user_id))).first():
            raise PartnerUpdateError(
                "This email belongs to a doctor account. Ask the partner to use a different email."
            )

        if (await db.execute(select(Patient.id).where(Patient.user_id == user_id))).first():
            raise PartnerUpdateError(
                "This email already has a patient profile with health records. "
                "Ask the partner to use a different (company) email before approving."
            )

    async def bulk_add_patients_for_partner(self, db: AsyncSession, partner_user_id: UUID, csv_bytes: bytes) -> dict:
        try:
            text_data = csv_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text_data = csv_bytes.decode("latin-1") 

        csv_file = io.StringIO(text_data)
        reader = csv.DictReader(csv_file)

        successful_uploads = []
        failed_uploads = []

        for idx, row in enumerate(reader, start=1):
            email = row.get("email")
            first_name = row.get("first_name")
            last_name = row.get("last_name")

            if not email or not first_name or not last_name:
                failed_uploads.append({
                    "row": idx,
                    "email": email or "N/A",
                    "error": "Missing required fields (email, first_name, last_name are mandatory)."
                })
                continue

            try:
                dob = None
                if row.get("date_of_birth"):
                    try:
                        dob = date.fromisoformat(row["date_of_birth"].strip())
                    except ValueError:
                        pass 

                gender = None
                if row.get("gender"):
                    gender_str = row["gender"].strip().upper()
                    if gender_str in ["MALE", "FEMALE", "OTHER"]:
                        gender = Gender(gender_str)

                payload = PartnerPatientCreateRequest(
                    email=email.strip(),
                    first_name=first_name.strip(),
                    last_name=last_name.strip(),
                    date_of_birth=dob,
                    gender=gender,
                    blood_group=row.get("blood_group").strip() if row.get("blood_group") else None,
                    phone_number=row.get("phone_number").strip() if row.get("phone_number") else None,
                    address=row.get("address").strip() if row.get("address") else None,
                    emergency_contact=row.get("emergency_contact").strip() if row.get("emergency_contact") else None
                )

                await self.add_patient_for_partner(db, partner_user_id, payload)

                successful_uploads.append({
                    "row": idx,
                    "email": payload.email,
                    "name": f"{payload.first_name} {payload.last_name}"
                })

            except Exception as e:
                failed_uploads.append({
                    "row": idx,
                    "email": email,
                    "error": str(e)
                })

        return {
            "total_rows": len(successful_uploads) + len(failed_uploads),
            "success_count": len(successful_uploads),
            "failure_count": len(failed_uploads),
            "successful": successful_uploads,
            "failed": failed_uploads
        }

    # ==========================================
    # PATIENT MANAGEMENT BY PARTNER
    # ==========================================

    async def add_patient_for_partner(self, db: AsyncSession, partner_user_id: UUID, payload: PartnerPatientCreateRequest) -> Patient:
        partner = await self.get_partner_by_user_id(db, partner_user_id)
        
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))
        new_uid = None

        try:
            # 1. Create Patient User Account
            auth_response = supabase_admin.auth.admin.create_user({
                "email": payload.email,
                "password": temp_password, 
                "email_confirm": True,       
                "user_metadata": {"role": Role.PATIENT.value}
            })
            new_uid = uuid.UUID(auth_response.user.id)

            await db.execute(update(User).where(User.id == new_uid).values(role=Role.PATIENT.value))

            # 2. Create Patient Profile linked to Partner
            patient_data = payload.model_dump(exclude={"email"})
            new_patient = Patient(user_id=new_uid, partner_id=partner.id, **patient_data)
            db.add(new_patient)

            # 3. Fetch the Partner's Coupon code
            from app.modules.coupon.models import Coupon
            coupon = (await db.execute(select(Coupon).where(Coupon.partner_id == partner.id))).scalar_one_or_none()
            coupon_code = coupon.code if coupon else "N/A"

            await db.commit()
            await db.refresh(new_patient)
            
            logger.info(f"Partner {partner.id} created patient {new_patient.id}.")

            # 4. Trigger employee email securely
            import asyncio
            from app.core.email import send_employee_welcome_email
            
            employee_name = f"{payload.first_name} {payload.last_name}"
            
            def send_email_safe():
                try:
                    send_employee_welcome_email(
                        to_email=payload.email,
                        employee_name=employee_name,
                        company_name=partner.company_name,
                        temp_password=temp_password,
                        coupon_code=coupon_code
                    )
                except Exception as email_err:
                    logger.error(f"Failed to send welcome email to employee {payload.email}: {email_err}")

            asyncio.create_task(asyncio.to_thread(send_email_safe))

            return new_patient

        except Exception as e:
            await db.rollback()
            if new_uid:
                supabase_admin.auth.admin.delete_user(str(new_uid))
            raise PartnerCreateError(f"Failed to create patient: {e}")

    async def list_partner_patients(self, db: AsyncSession, partner_user_id: UUID, params: PaginationParams) -> tuple[list[Patient], int]:
        partner = await self.get_partner_by_user_id(db, partner_user_id)
        
        query = select(Patient).where(Patient.partner_id == partner.id)
        count_query = select(func.count()).select_from(Patient).where(Patient.partner_id == partner.id)
        
        total = (await db.execute(count_query)).scalar() or 0
        items = (await db.execute(query.order_by(Patient.created_at.desc()).offset(params.offset).limit(params.limit))).scalars().all()
        
        return list(items), total

    async def get_partner_patient(self, db: AsyncSession, partner_user_id: UUID, patient_id: UUID) -> Patient:
        partner = await self.get_partner_by_user_id(db, partner_user_id)
        patient = (await db.execute(select(Patient).where(Patient.id == patient_id, Patient.partner_id == partner.id))).scalar_one_or_none()
        
        if not patient:
            raise PartnerNotFoundError("Patient not found or does not belong to your organization.")
        return patient

    async def update_partner_patient(self, db: AsyncSession, partner_user_id: UUID, patient_id: UUID, data: dict) -> Patient:
        patient = await self.get_partner_patient(db, partner_user_id, patient_id)
        
        if data:
            stmt = update(Patient).where(Patient.id == patient.id).values(**data).returning(Patient)
            patient = (await db.execute(stmt)).scalar_one_or_none()
            await db.commit()
            
        return patient

    async def delete_partner_patient(self, db: AsyncSession, partner_user_id: UUID, patient_id: UUID) -> None:
        patient = await self.get_partner_patient(db, partner_user_id, patient_id)
        
        # Orphaned Auth Fix: ALWAYS delete from Supabase first.
        try:
            supabase_admin.auth.admin.delete_user(str(patient.user_id))
        except Exception as e:
            logger.error(f"Failed to delete patient from Supabase: {e}")
            raise PartnerUpdateError("Failed to delete authentication account. Please try again.")

        # Once Supabase succeeds, delete the local DB record
        await db.execute(delete(User).where(User.id == patient.user_id))
        await db.commit()