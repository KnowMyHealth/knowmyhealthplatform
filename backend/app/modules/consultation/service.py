# app/modules/consultation/service.py
import uuid
from uuid import UUID
import asyncio
from loguru import logger
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone, date

from app.core.storage import upload_prescription_pdf
from app.modules.patient.models import Patient
from app.modules.consultation.models import Consultation, ConsultationStatus, ConsultationType
from app.modules.doctor.models import Doctor, DoctorAvailability
from app.modules.consultation.schemas import BookConsultationRequest, AgoraJoinResponse
from app.modules.consultation.exceptions import ConsultationError, ConsultationNotFoundError, ConsultationAccessDenied
from app.core.agora import generate_agora_token
from app.core.email import (
    send_consultation_booking_patient_email,
    send_consultation_booking_doctor_email
)

# User required for eager loading patient_profile
from app.db.all_models import User
from app.utils.pagination import PaginationParams

class ConsultationService:
    async def book_consultation(self, db: AsyncSession, patient_user_id: UUID, data: BookConsultationRequest) -> Consultation:
        # 1. Align to 15-minute boundary
        if data.scheduled_at.minute % 15 != 0 or data.scheduled_at.second != 0:
            raise ConsultationError("Appointments must be booked in 15-minute increments.", status_code=400)

        doctor = await db.get(Doctor, data.doctor_id)
        if not doctor:
            raise ConsultationError("Doctor not found.")
            
        # 2. Check if Doctor supports the requested consultation type
        if data.consultation_type == ConsultationType.ONLINE and not doctor.video_consultation_enabled:
            raise ConsultationError("Doctor is not available for video consultations.")
        
        if data.consultation_type == ConsultationType.OFFLINE and not doctor.offline_consultation_enabled:
            raise ConsultationError("Doctor is not available for in-person clinic visits.")

        # 3. Check 15-day window
        now = datetime.now(timezone.utc)
        if data.scheduled_at < now or data.scheduled_at > now + timedelta(days=15):
            raise ConsultationError("Booking must be within the next 15 days.")

        # 4. Verify Doctor is actually working at this time (Availability Check)
        day_of_week = data.scheduled_at.weekday()
        booking_time = data.scheduled_at.time()
        
        avail_stmt = select(DoctorAvailability).where(
            DoctorAvailability.doctor_id == data.doctor_id,
            DoctorAvailability.day_of_week == day_of_week,
            DoctorAvailability.start_time <= booking_time,
            DoctorAvailability.end_time > booking_time
        )
        is_available = (await db.execute(avail_stmt)).scalar_one_or_none()
        if not is_available:
            raise ConsultationError("Doctor is not available at this time.")

        # 5. Check if slot is already booked (Fix: Only SCHEDULED and COMPLETED count as booked, PENDING does not block)
        conflict_stmt = select(Consultation).where(
            Consultation.doctor_id == data.doctor_id,
            Consultation.scheduled_at == data.scheduled_at,
            Consultation.status.in_([ConsultationStatus.SCHEDULED, ConsultationStatus.COMPLETED])
        )
        if (await db.execute(conflict_stmt)).scalar_one_or_none():
            raise ConsultationError("This time slot is already taken.", status_code=409)

        # 6. Generate channel name ONLY if it is an online consultation
        channel_name = f"kmh_{uuid.uuid4().hex[:12]}" if data.consultation_type == ConsultationType.ONLINE else None

        # 7. Create (Status defaults to PENDING now)
        consultation = Consultation(
            patient_user_id=patient_user_id,
            doctor_id=data.doctor_id,
            scheduled_at=data.scheduled_at,
            consultation_type=data.consultation_type,
            channel_name=channel_name,
            status=ConsultationStatus.PENDING
        )
        db.add(consultation)
        await db.commit()
        
        # 8. Eager load relations before returning
        fetch_stmt = select(Consultation).options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient_user).selectinload(User.patient_profile)
        ).where(Consultation.id == consultation.id)
        
        saved_consultation = (await db.execute(fetch_stmt)).scalar_one()

        return saved_consultation

    async def list_doctor_patients(self, db: AsyncSession, doctor_user_id: UUID) -> list[dict]:
        """
        Returns a list of unique patients who have consulted with this doctor.
        """
        # 1. Get the doctor's internal ID
        doctor = (await db.execute(select(Doctor).where(Doctor.user_id == doctor_user_id))).scalar_one_or_none()
        if not doctor:
            return []

        # 2. Query distinct patients joined with their last consultation date
        stmt = (
            select(
                Patient,
                func.max(Consultation.scheduled_at).label("last_consultation"),
                func.count(Consultation.id).label("visit_count")
            )
            .join(Consultation, Consultation.patient_user_id == Patient.user_id)
            .where(Consultation.doctor_id == doctor.id)
            .group_by(Patient.id)
            .order_by(desc("last_consultation"))
        )
        
        result = await db.execute(stmt)
        rows = result.all()

        patients_list = []
        for patient_obj, last_consult, count in rows:
            patients_list.append({
                "patient": patient_obj,
                "last_consultation_at": last_consult,
                "total_consultations": count
            })

        return patients_list

    async def get_doctor_patient_detail(self, db: AsyncSession, doctor_user_id: UUID, patient_user_id: UUID) -> dict:
        # 1. Get the doctor internal ID
        doctor = (await db.execute(select(Doctor).where(Doctor.user_id == doctor_user_id))).scalar_one_or_none()
        if not doctor:
            raise ConsultationAccessDenied("Doctor profile not found.")

        # 2. Verify that this doctor has at least one consultation with this patient
        check_stmt = select(Consultation).where(
            Consultation.doctor_id == doctor.id,
            Consultation.patient_user_id == patient_user_id
        ).limit(1)
        
        has_consultation = (await db.execute(check_stmt)).scalar_one_or_none()
        if not has_consultation:
            raise ConsultationAccessDenied("You do not have permission to view this patient's profile.")

        # 3. Fetch Patient Profile
        patient_stmt = select(Patient).where(Patient.user_id == patient_user_id)
        patient = (await db.execute(patient_stmt)).scalar_one_or_none()
        if not patient:
            raise ConsultationError("Patient profile is incomplete or not found.", status_code=404)

        # 4. Fetch Consultation History between these two (With Eager Loading)
        history_stmt = (
            select(Consultation)
            .options(
                selectinload(Consultation.doctor),
                selectinload(Consultation.patient_user).selectinload(User.patient_profile)
            )
            .where(Consultation.doctor_id == doctor.id, Consultation.patient_user_id == patient_user_id)
            .order_by(Consultation.scheduled_at.desc())
        )
        history = (await db.execute(history_stmt)).scalars().all()

        return {
            "patient": patient,
            "history": list(history)
        }

    async def generate_join_token(self, db: AsyncSession, consultation_id: UUID, user_id: UUID, user_role: str) -> AgoraJoinResponse:
        # 1. Fetch Consultation
        stmt = select(Consultation).options(selectinload(Consultation.doctor)).where(Consultation.id == consultation_id)
        consultation = (await db.execute(stmt)).scalar_one_or_none()
        
        if not consultation:
            raise ConsultationNotFoundError()
            
        # 2. Block Video Tokens for Offline Visits
        if consultation.consultation_type == ConsultationType.OFFLINE:
            raise ConsultationError("This is an in-person clinic visit. No video link is required.", status_code=400)

        # 3. Verify Authorization
        is_patient = (consultation.patient_user_id == user_id)
        is_doctor = (consultation.doctor.user_id == user_id)

        if not is_patient and not is_doctor and user_role != "ADMIN":
            raise ConsultationAccessDenied()

        # 4. Check Status (Fix: Explicitly block PENDING status for video joins)
        if consultation.status == ConsultationStatus.PENDING:
            raise ConsultationError("Payment is required before joining this consultation.", status_code=402)
        if consultation.status == ConsultationStatus.CANCELLED:
            raise ConsultationError("This consultation was cancelled.", status_code=400)
        if consultation.status == ConsultationStatus.COMPLETED:
            raise ConsultationError("This consultation has already been completed.", status_code=400)

        # 5. TIME WINDOW CHECK
        now = datetime.now(timezone.utc)
        join_window_start = consultation.scheduled_at - timedelta(minutes=5)
        join_window_end = consultation.scheduled_at + timedelta(minutes=15)

        if now < join_window_start:
            raise ConsultationError("The consultation hasn't started yet. You can join up to 5 minutes before the scheduled time.", status_code=403)
        
        if now > join_window_end:
            raise ConsultationError("The consultation time window has expired.", status_code=403)

        # 6. Generate Agora Token
        account_uid = str(user_id)
        token = generate_agora_token(
            channel_name=consultation.channel_name,
            account=account_uid,
            expiration_time_in_seconds=3600
        )

        return AgoraJoinResponse(
            token=token,
            channel_name=consultation.channel_name,
            uid=account_uid
        )
        
    async def list_my_consultations(self, db: AsyncSession, user_id: UUID, is_doctor: bool) -> list[Consultation]:
        # Eager load the required nested models
        stmt = select(Consultation).options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient_user).selectinload(User.patient_profile)
        ).order_by(Consultation.scheduled_at.desc())
        
        if is_doctor:
            doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user_id))).scalar_one_or_none()
            if not doctor:
                return []
            stmt = stmt.where(Consultation.doctor_id == doctor.id)
        else:
            stmt = stmt.where(Consultation.patient_user_id == user_id)
            
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    async def update_consultation_status(
        self, 
        db: AsyncSession, 
        consultation_id: UUID, 
        user_id: UUID, 
        new_status: ConsultationStatus
    ) -> Consultation:
        # Eager load relations before update
        stmt = select(Consultation).options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient_user).selectinload(User.patient_profile)
        ).where(Consultation.id == consultation_id)
        
        consultation = (await db.execute(stmt)).scalar_one_or_none()
        
        if not consultation:
            raise ConsultationNotFoundError()

        if consultation.doctor.user_id != user_id:
            raise ConsultationAccessDenied("Only the assigned doctor can update the status.")

        consultation.status = new_status
        await db.commit()
        
        logger.info(f"Consultation {consultation_id} status updated to {new_status}")
        return consultation
    
    async def get_available_slots(self, db: AsyncSession, doctor_id: UUID, target_date: date, timezone_offset: int = 0) -> list[dict]:
        tz = timezone(timedelta(minutes=timezone_offset))
        now = datetime.now(tz)
        day_of_week = target_date.weekday()

        avail_stmt = select(DoctorAvailability).where(
            DoctorAvailability.doctor_id == doctor_id,
            DoctorAvailability.day_of_week == day_of_week
        )
        availabilities = (await db.execute(avail_stmt)).scalars().all()

        if not availabilities:
            return []

        start_of_day = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=tz)
        end_of_day = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=tz)

        # Fix: Only treat SCHEDULED or COMPLETED consultations as blocked times
        cons_stmt = select(Consultation.scheduled_at).where(
            Consultation.doctor_id == doctor_id,
            Consultation.scheduled_at >= start_of_day,
            Consultation.scheduled_at <= end_of_day,
            Consultation.status.in_([ConsultationStatus.SCHEDULED, ConsultationStatus.COMPLETED])
        )
        booked_times = (await db.execute(cons_stmt)).scalars().all()
        booked_iso_strings = {bt.astimezone(tz).isoformat() for bt in booked_times}

        slots = []
        for avail in availabilities:
            current_time = datetime.combine(target_date, avail.start_time).replace(tzinfo=tz)
            end_time = datetime.combine(target_date, avail.end_time).replace(tzinfo=tz)

            while current_time + timedelta(minutes=15) <= end_time:
                if current_time > now:
                    slot_iso = current_time.isoformat()
                    slots.append({
                        "time": slot_iso,
                        "is_booked": slot_iso in booked_iso_strings
                    })
                current_time += timedelta(minutes=15)

        return slots
    
    async def upload_prescription(self, db: AsyncSession, consultation_id: UUID, doctor_user_id: UUID, pdf_bytes: bytes) -> Consultation:
        # Eager load relations before update
        stmt = select(Consultation).options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient_user).selectinload(User.patient_profile)
        ).where(Consultation.id == consultation_id)
        
        consultation = (await db.execute(stmt)).scalar_one_or_none()
        
        if not consultation:
            raise ConsultationNotFoundError("Consultation not found.")

        if consultation.doctor.user_id != doctor_user_id:
            raise ConsultationAccessDenied("You can only upload prescriptions for your own patients.")

        if consultation.status == ConsultationStatus.CANCELLED:
            raise ConsultationError("Cannot upload a prescription for a cancelled consultation.")

        _, public_url = await upload_prescription_pdf(pdf_bytes)

        consultation.prescription_url = public_url
        
        if consultation.status == ConsultationStatus.SCHEDULED:
            consultation.status = ConsultationStatus.COMPLETED

        await db.commit()
        
        logger.info(f"Prescription uploaded for consultation {consultation_id}")
        return consultation

    async def list_all_consultations(
        self,
        db: AsyncSession,
        params: PaginationParams,
        status: ConsultationStatus | None = None,
        doctor_id: UUID | None = None
    ) -> tuple[list[Consultation], int]:
        """
        ADMIN USE ONLY: Lists all consultations across all doctors.
        Supports pagination, and filtering by status or specific doctor_id.
        """
        query = select(Consultation).options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient_user).selectinload(User.patient_profile)
        )
        count_query = select(func.count()).select_from(Consultation)

        if status:
            query = query.where(Consultation.status == status)
            count_query = count_query.where(Consultation.status == status)

        if doctor_id:
            query = query.where(Consultation.doctor_id == doctor_id)
            count_query = count_query.where(Consultation.doctor_id == doctor_id)

        total_count = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Consultation.scheduled_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()
        
        return list(items), total_count

    async def get_consultation_details(
        self, 
        db: AsyncSession, 
        consultation_id: UUID, 
        user_id: UUID, 
        role: str
    ) -> dict:
        stmt = select(Consultation).options(
            selectinload(Consultation.doctor),
            selectinload(Consultation.patient_user).selectinload(User.patient_profile)
        ).where(Consultation.id == consultation_id)
        
        consultation = (await db.execute(stmt)).scalar_one_or_none()
        if not consultation:
            raise ConsultationNotFoundError("Consultation not found.")
            
        if role != "ADMIN":
            if consultation.patient_user_id != user_id and consultation.doctor.user_id != user_id:
                raise ConsultationAccessDenied("You do not have permission to view this consultation.")
                
        return {
            "id": consultation.id,
            "patient_user_id": consultation.patient_user_id,
            "doctor_id": consultation.doctor_id,
            "scheduled_at": consultation.scheduled_at,
            "status": consultation.status,
            "consultation_type": consultation.consultation_type,
            "channel_name": consultation.channel_name,
            "prescription_url": consultation.prescription_url,
            "created_at": consultation.created_at,
            "doctor": consultation.doctor,
            "patient": consultation.patient_user.patient_profile if consultation.patient_user else None
        }