from app.common.exceptions import BaseDomainException

class LabTestError(BaseDomainException):
    """Base exception for all lab test-related errors."""
    def __init__(self, message: str = "A lab test error occurred", status_code: int = 500):
        super().__init__(message, status_code)

class LabTestNotFoundError(LabTestError):
    def __init__(self, message: str = "Lab test not found", status_code: int = 404):
        super().__init__(message, status_code)

class CategoryNotFoundError(LabTestError):
    def __init__(self, message: str = "Lab test category not found", status_code: int = 404):
        super().__init__(message, status_code)

class LabTestCreationError(LabTestError):
    def __init__(self, message: str = "Error creating lab test or category", status_code: int = 400):
        super().__init__(message, status_code)