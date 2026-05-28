# app/modules/partner/service.py
import io
import csv
from datetime import date

import uuid
import string
import secrets
from uuid import UUID
from loguru import logger
from sqlalchemy import update, select, func, delete
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
        new_supabase_uid = None

        try:
            # 1. Create Supabase Auth User
            auth_response = supabase_admin.auth.admin.create_user({
                "email": partner.email,
                "password": temp_password, 
                "email_confirm": True,       
                "user_metadata": {"role": Role.PARTNER.value}
            })
            new_supabase_uid = uuid.UUID(auth_response.user.id)

            # 2. Update local DB Role and SAVE the Admin's final discount rate
            await db.execute(update(User).where(User.id == new_supabase_uid).values(role=Role.PARTNER.value))

            partner.user_id = new_supabase_uid
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
            if new_supabase_uid:
                supabase_admin.auth.admin.delete_user(str(new_supabase_uid))
            raise PartnerUpdateError(f"Failed to approve partner: {e}")

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