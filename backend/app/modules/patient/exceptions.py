from app.common.exceptions import BaseDomainException

class PatientError(BaseDomainException):
    """Base exception for all patient-related errors."""
    def __init__(self, message: str = "A patient error occurred", status_code: int = 500):
        super().__init__(message, status_code)

class PatientNotFoundError(PatientError):
    """Raised when a patient profile is not found."""
    def __init__(self, message: str = "Patient profile not found", status_code: int = 404):
        super().__init__(message, status_code)

class PatientCreateError(PatientError):
    """Raised when there is an error creating a patient profile."""
    def __init__(self, message: str = "Error creating patient profile", status_code: int = 400):
        super().__init__(message, status_code)

class PatientUpdateError(PatientError):
    """Raised when there is an error updating a patient profile."""
    def __init__(self, message: str = "Error updating patient profile", status_code: int = 400):
        super().__init__(message, status_code)