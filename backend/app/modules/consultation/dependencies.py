from app.modules.consultation.service import ConsultationService

def get_consultation_service() -> ConsultationService:
    return ConsultationService()