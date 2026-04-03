from loguru import logger
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.api_response import ApiResponse
from app.utils.api_error import ApiError
from app.common.exceptions import BaseDomainException

def add_exception_handlers(app: FastAPI):
    """
    Registers global exception handlers to the FastAPI app.
    Call this function in main.py during app startup.
    """

    # 1. Handle our Automated Domain Exceptions (The Magic!)
    @app.exception_handler(BaseDomainException)
    async def domain_exception_handler(request: Request, exc: BaseDomainException):
        """Catches Service-level errors (e.g. ProjectNotFoundError) and translates them to HTTP."""
        if exc.status_code >= 500:
            logger.error(f"System Failure on {request.url.path}: {exc.message}")
        else:
            logger.warning(f"Business Logic Error ({exc.status_code}) on {request.url.path}: {exc.message}")
            
        return ApiResponse.error(
            message=exc.message,
            status_code=exc.status_code
        )

    # 2. Handle Custom API Errors (Our api_error.py classes)
    @app.exception_handler(ApiError)
    async def custom_api_error_handler(request: Request, exc: ApiError):
        """Catches explicitly raised API errors and includes their extra 'errors' payload."""
        logger.warning(f"API Error {exc.status_code}: {exc.message} - Path: {request.url.path}")
        return ApiResponse.error(
            message=exc.message,
            status_code=exc.status_code,
            errors=exc.errors
        )

    # 3. Handle Standard FastAPI HTTP Errors (404 Not Found, 405 Method Not Allowed)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """Catches built-in FastAPI exceptions."""
        if exc.status_code >= 500:
            logger.error(f"HTTP 500 Error: {exc.detail}")
        else:
            logger.warning(f"HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")

        return ApiResponse.error(
            message=str(exc.detail),
            status_code=exc.status_code
        )

    # 4. Handle Validation Errors (422) - Pydantic (YOUR AWESOME LOGIC!)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Reformats the messy Pydantic output into a clean dictionary of errors."""
        errors = {}
        for error in exc.errors():
            field = error.get("loc", ["unknown"])[-1]
            message = error.get("msg")
            errors[field] = message
            
        logger.info(f"Validation Error on {request.url.path}: {errors}")

        return ApiResponse.error(
            message="Data validation failed",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            errors=errors  # This populates the "errors": {} block in your JSON!
        )

    # 5. Handle Database Errors (Safety Net)
    @app.exception_handler(SQLAlchemyError)
    async def database_exception_handler(request: Request, exc: SQLAlchemyError):
        """
        Catches DB connection issues if a developer forgot to use try/except in the Service.
        Prevents leaking SQL queries to the user.
        """
        logger.error(f"Database Error: {str(exc)}")
        return ApiResponse.error(
            message="A database error occurred. Please try again later.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # 6. Handle Generic/Unhandled Exceptions (The Catch-All)
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Catches any crash that wasn't handled above (IndexError, ValueError, etc)."""
        logger.exception(f"Unhandled crash on {request.url.path}")
        return ApiResponse.error(
            message="An unexpected internal server error occurred.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )