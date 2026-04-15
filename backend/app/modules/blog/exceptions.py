from app.common.exceptions import BaseDomainException

class BlogError(BaseDomainException):
    def __init__(self, message: str = "A blog error occurred", status_code: int = 500):
        super().__init__(message, status_code)

class BlogNotFoundError(BlogError):
    def __init__(self, message: str = "Blog not found", status_code: int = 404):
        super().__init__(message, status_code)

class BlogGenerationError(BlogError):
    def __init__(self, message: str = "AI failed to generate the blog", status_code: int = 500):
        super().__init__(message, status_code)