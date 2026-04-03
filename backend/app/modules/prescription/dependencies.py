from app.modules.prescription.service import PrescriptionService

def get_prescription_service() -> PrescriptionService:
    return PrescriptionService()
