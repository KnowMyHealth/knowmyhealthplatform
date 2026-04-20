from app.common.exceptions import BaseDomainException

class ConsultationError(BaseDomainException):
    def __init__(self, message: str = "A consultation error occurred", status_code: int = 400):
        super().__init__(message, status_code)

class ConsultationNotFoundError(ConsultationError):
    def __init__(self, message: str = "Consultation not found", status_code: int = 404):
        super().__init__(message, status_code)

class ConsultationAccessDenied(ConsultationError):
    def __init__(self, message: str = "You do not have permission to join this consultation", status_code: int = 403):
        super().__init__(message, status_code)