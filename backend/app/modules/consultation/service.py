# app/modules/consultation/service.py
import uuid
from uuid import UUID
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.consultation.models import Consultation, ConsultationStatus, ConsultationType
from app.modules.doctor.models import Doctor
from app.modules.consultation.schemas import BookConsultationRequest, AgoraJoinResponse
from app.modules.consultation.exceptions import ConsultationError, ConsultationNotFoundError, ConsultationAccessDenied
from app.core.agora import generate_agora_token
from datetime import datetime, timedelta, timezone, date
from app.modules.doctor.models import DoctorAvailability

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
            DoctorAvailability.end_time > booking_time # Must end after the slot starts
        )
        is_available = (await db.execute(avail_stmt)).scalar_one_or_none()
        if not is_available:
            raise ConsultationError("Doctor is not available at this time.")

        # 5. Check if slot is already booked (works for both online/offline simultaneously!)
        conflict_stmt = select(Consultation).where(
            Consultation.doctor_id == data.doctor_id,
            Consultation.scheduled_at == data.scheduled_at,
            Consultation.status != ConsultationStatus.CANCELLED
        )
        if (await db.execute(conflict_stmt)).scalar_one_or_none():
            raise ConsultationError("This time slot is already taken.", status_code=409)

        # 6. Generate channel name ONLY if it is an online consultation
        channel_name = f"kmh_{uuid.uuid4().hex[:12]}" if data.consultation_type == ConsultationType.ONLINE else None

        # 7. Create
        consultation = Consultation(
            patient_user_id=patient_user_id,
            doctor_id=data.doctor_id,
            scheduled_at=data.scheduled_at,
            consultation_type=data.consultation_type,
            channel_name=channel_name
        )
        db.add(consultation)
        await db.commit()
        await db.refresh(consultation)
        return consultation

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

        # 4. Check Status
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
        stmt = select(Consultation).order_by(Consultation.scheduled_at.desc())
        
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
        stmt = select(Consultation).options(selectinload(Consultation.doctor)).where(Consultation.id == consultation_id)
        consultation = (await db.execute(stmt)).scalar_one_or_none()
        
        if not consultation:
            raise ConsultationNotFoundError()

        if consultation.doctor.user_id != user_id:
            raise ConsultationAccessDenied("Only the assigned doctor can update the status.")

        consultation.status = new_status
        await db.commit()
        await db.refresh(consultation)
        
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

        cons_stmt = select(Consultation.scheduled_at).where(
            Consultation.doctor_id == doctor_id,
            Consultation.scheduled_at >= start_of_day,
            Consultation.scheduled_at <= end_of_day,
            Consultation.status != ConsultationStatus.CANCELLED
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