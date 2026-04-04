from app.common.exceptions import BaseDomainException


class ChatError(BaseDomainException):
    """Base exception for all chat-related errors."""
    def __init__(
        self,
        message: str = "A chat error occurred",
        status_code: int = 500
    ):
        super().__init__(message, status_code)


class ChatAgentError(ChatError):
    """Raised when there is an error with the chat agent."""
    def __init__(
        self,
        message: str = "Error in chat agent",
        status_code: int = 500
    ):
        super().__init__(message, status_code)