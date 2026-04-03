from app.common.exceptions import BaseDomainException


class PrescriptionError(BaseDomainException):
    """Base exception for all prescription-related errors."""
    def __init__(
        self,
        message: str = "A prescription error occurred",
        status_code: int = 500
    ):
        super().__init__(message, status_code)


class PrescriptionNotFoundError(PrescriptionError):
    """Raised when a prescription is not found."""
    def __init__(
        self,
        message: str = "Prescription not found",
        status_code: int = 404
    ):
        super().__init__(message, status_code)


class PrescriptionCreationError(PrescriptionError):
    """Raised when a prescription cannot be created."""
    def __init__(
        self,
        message: str = "Error creating prescription",
        status_code: int = 400
    ):
        super().__init__(message, status_code)


class PrescriptionUpdateError(PrescriptionError):
    """Raised when a prescription cannot be updated."""
    def __init__(
        self,
        message: str = "Error updating prescription",
        status_code: int = 400
    ):
        super().__init__(message, status_code)


class PrescriptionDeletionError(PrescriptionError):
    """Raised when a prescription cannot be deleted."""
    def __init__(
        self,
        message: str = "Error deleting prescription",
        status_code: int = 400
    ):
        super().__init__(message, status_code)