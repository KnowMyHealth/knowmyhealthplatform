from app.modules.doctor.service import DoctorsService

def get_doctors_service() -> DoctorsService:
    """Dependency to provide an instance of DoctorsService."""
    return DoctorsService()