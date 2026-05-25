# app/modules/callback/exceptions.py
from app.common.exceptions import BaseDomainException

class CallbackError(BaseDomainException):
    def __init__(self, message: str = "A callback error occurred", status_code: int = 500):
        super().__init__(message, status_code)

class CallbackNotFoundError(CallbackError):
    def __init__(self, message: str = "Callback request not found", status_code: int = 404):
        super().__init__(message, status_code)