from app.common.exceptions import BaseDomainException

class PartnerError(BaseDomainException):
    def __init__(self, message: str = "A partner error occurred", status_code: int = 500):
        super().__init__(message, status_code)

class PartnerNotFoundError(PartnerError):
    def __init__(self, message: str = "Partner profile not found", status_code: int = 404):
        super().__init__(message, status_code)

class PartnerCreateError(PartnerError):
    def __init__(self, message: str = "Error creating partner profile", status_code: int = 400):
        super().__init__(message, status_code)

class PartnerUpdateError(PartnerError):
    def __init__(self, message: str = "Error updating partner profile", status_code: int = 400):
        super().__init__(message, status_code)