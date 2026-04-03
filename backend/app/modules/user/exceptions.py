from app.common.exceptions import BaseDomainException

# --- Base User Exceptions ---
class UserError(BaseDomainException):
    """Base exception for all user-related errors."""
    def __init__(self, message: str = "A user error occurred", status_code: int = 500):
        super().__init__(message, status_code)

class UserNotFoundError(UserError):
    """Raised when a user is not found."""
    def __init__(self, message: str = "User not found", status_code: int = 404):
        super().__init__(message, status_code)

class UserUpdateError(UserError):
    """Raised when there is an error updating a user."""
    def __init__(self, message: str = "Error updating user", status_code: int = 400):
        super().__init__(message, status_code)