import uuid
from uuid import UUID
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.consultation.models import Consultation, ConsultationStatus
from app.modules.doctor.models import Doctor
from app.modules.consultation.schemas import BookConsultationRequest, AgoraJoinResponse
from app.modules.consultation.exceptions import ConsultationError, ConsultationNotFoundError, ConsultationAccessDenied
from app.core.agora import generate_agora_token

class ConsultationService:
    async def book_consultation(self, db: AsyncSession, patient_user_id: UUID, data: BookConsultationRequest) -> Consultation:
        # 1. Check if doctor exists and has video enabled
        doctor = await db.get(Doctor, data.doctor_id)
        if not doctor:
            raise ConsultationError("Doctor not found.")
        if not doctor.video_consultation_enabled:
            raise ConsultationError("This doctor does not offer video consultations.")

        # 2. Create the consultation and auto-generate an Agora channel name
        channel_name = f"consultation_{uuid.uuid4().hex[:12]}"
        
        consultation = Consultation(
            patient_user_id=patient_user_id,
            doctor_id=data.doctor_id,
            scheduled_at=data.scheduled_at,
            channel_name=channel_name
        )
        
        db.add(consultation)
        await db.commit()
        await db.refresh(consultation)
        
        logger.info(f"Booked consultation {consultation.id} for patient {patient_user_id}")
        return consultation

    async def generate_join_token(self, db: AsyncSession, consultation_id: UUID, user_id: UUID, user_role: str) -> AgoraJoinResponse:
        # 1. Fetch Consultation
        stmt = select(Consultation).options(selectinload(Consultation.doctor)).where(Consultation.id == consultation_id)
        consultation = (await db.execute(stmt)).scalar_one_or_none()
        
        if not consultation:
            raise ConsultationNotFoundError()

        # 2. Verify Authorization (Only the specific Patient or the specific Doctor can join)
        is_patient = (consultation.patient_user_id == user_id)
        is_doctor = (consultation.doctor.user_id == user_id)

        if not is_patient and not is_doctor:
            if user_role != "ADMIN": # Admins can bypass if you want, or remove this line
                raise ConsultationAccessDenied()

        # 3. Generate Agora Token (Valid for 2 hours)
        account_uid = str(user_id)
        token = generate_agora_token(
            channel_name=consultation.channel_name,
            account=account_uid,
            expiration_time_in_seconds=7200
        )

        return AgoraJoinResponse(
            token=token,
            channel_name=consultation.channel_name,
            uid=account_uid
        )
        
    async def list_my_consultations(self, db: AsyncSession, user_id: UUID, is_doctor: bool) -> list[Consultation]:
        stmt = select(Consultation).order_by(Consultation.scheduled_at.desc())
        
        if is_doctor:
            # Need to fetch the doctor ID for this user first
            doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user_id))).scalar_one_or_none()
            if not doctor:
                return[]
            stmt = stmt.where(Consultation.doctor_id == doctor.id)
        else:
            stmt = stmt.where(Consultation.patient_user_id == user_id)
            
        result = await db.execute(stmt)
        return list(result.scalars().all())