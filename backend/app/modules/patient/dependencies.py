from app.modules.patient.service import PatientService

def get_patient_service() -> PatientService:
    return PatientService()