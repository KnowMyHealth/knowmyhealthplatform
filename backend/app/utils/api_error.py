from typing import Any, Optional
from fastapi import HTTPException, status

class ApiError(HTTPException):
    """Base API Error exception that all custom errors inherit from."""
    
    def __init__(
        self,
        message: str = "An error occurred",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        errors: Optional[Any] = None,
        headers: Optional[dict[str, str]] = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=message, headers=headers)
        self.message = message
        self.errors = errors

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(status={self.status_code}, message={self.message!r})"

# ------------------------------------------------------------------ #
#  Pre-built subclasses                                              #
# ------------------------------------------------------------------ #

class BadRequestError(ApiError):
    """400 – The request could not be understood or was missing required params."""
    def __init__(self, message: str = "Bad request", errors: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST, errors=errors)

class UnauthorizedError(ApiError):
    """401 – Authentication required or credentials invalid."""
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(
            message=message, 
            status_code=status.HTTP_401_UNAUTHORIZED, 
            headers={"WWW-Authenticate": "Bearer"}
        )

class ForbiddenError(ApiError):
    """403 – Authenticated but not permitted to perform this action."""
    def __init__(self, message: str = "You do not have permission to perform this action") -> None:
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)

class NotFoundError(ApiError):
    """404 – The requested resource does not exist."""
    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)

class ConflictError(ApiError):
    """409 – The request conflicts with the current state of the resource (e.g. duplicates)."""
    def __init__(self, message: str = "Resource already exists", errors: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=status.HTTP_409_CONFLICT, errors=errors)

class UnprocessableError(ApiError):
    """422 – The request is well-formed but contains semantic errors (e.g. invalid password rules)."""
    def __init__(self, message: str = "Unprocessable entity", errors: Optional[Any] = None) -> None:
        super().__init__(message=message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, errors=errors)

class TooManyRequestsError(ApiError):
    """429 – Rate limit exceeded."""
    def __init__(self, message: str = "Too many requests. Please slow down.") -> None:
        super().__init__(message=message, status_code=status.HTTP_429_TOO_MANY_REQUESTS)

class InternalServerError(ApiError):
    """500 – An unexpected server error occurred."""
    def __init__(self, message: str = "Internal server error") -> None:
        super().__init__(message=message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ServiceUnavailableError(ApiError):
    """503 – The service is temporarily unavailable (e.g. VM provisioning queue full)."""
    def __init__(self, message: str = "Service temporarily unavailable") -> None:
        super().__init__(message=message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)