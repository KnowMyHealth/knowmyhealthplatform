from app.common.exceptions import BaseDomainException

class HealthPackageError(BaseDomainException):
    def __init__(self, message: str = "A health package error occurred", status_code: int = 500):
        super().__init__(message, status_code)

class HealthPackageNotFoundError(HealthPackageError):
    def __init__(self, message: str = "Health package not found", status_code: int = 404):
        super().__init__(message, status_code)