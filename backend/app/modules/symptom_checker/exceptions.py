from app.common.exceptions import BaseDomainException

class SymptomCheckerError(BaseDomainException):
    def __init__(self, message: str = "A symptom checker error occurred", status_code: int = 500):
        super().__init__(message, status_code)