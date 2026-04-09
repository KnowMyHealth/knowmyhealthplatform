from app.common.exceptions import BaseDomainException

# --- Base Doctor Exceptions ---
class DoctorError(BaseDomainException):
    """Base exception for all doctor-related errors."""
    def __init__(self, message: str = "A doctor error occurred", status_code: int = 500):
        super().__init__(message, status_code)

class DoctorNotFoundError(DoctorError):
    """Raised when a doctor profile is not found."""
    def __init__(self, message: str = "Doctor not found", status_code: int = 404):
        super().__init__(message, status_code)

class DoctorCreateError(DoctorError):
    """Raised when there is an error creating a doctor profile."""
    def __init__(self, message: str = "Error creating doctor profile", status_code: int = 400):
        super().__init__(message, status_code)

class DoctorUpdateError(DoctorError):
    """Raised when there is an error updating a doctor profile."""
    def __init__(self, message: str = "Error updating doctor profile", status_code: int = 400):
        super().__init__(message, status_code)