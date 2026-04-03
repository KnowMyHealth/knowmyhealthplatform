import math
from typing import Any, Optional, List
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi import Response
from app.utils.pagination import PaginationParams

class ApiResponse:
    """Builds a consistent JSON envelope for every API response."""

    @classmethod
    def success(
        cls,
        data: Any = None,
        message: str = "Success",
        status_code: int = 200,
        meta: Optional[dict] = None,
    ) -> JSONResponse:
        """Return a 2xx response with an optional data payload."""
        body: dict[str, Any] = {
            "success": True,
            "message": message,
        }
        
        if data is not None:
            body["data"] = data
            
        if meta is not None:
            body["meta"] = meta
            
        # jsonable_encoder automatically handles UUIDs, Datetimes, and Pydantic models natively!
        return JSONResponse(
            status_code=status_code, 
            content=jsonable_encoder(body)
        )

    @classmethod
    def created(
        cls,
        data: Any = None,
        message: str = "Resource created successfully",
    ) -> JSONResponse:
        """Convenience wrapper for 201 Created (e.g. Project Created)."""
        return cls.success(data=data, message=message, status_code=201)

    @classmethod
    def accepted(
        cls,
        data: Any = None,
        message: str = "Request accepted and processing in background",
    ) -> JSONResponse:
        """Convenience wrapper for 202 Accepted (e.g. VM Provisioning started)."""
        return cls.success(data=data, message=message, status_code=202)
    
    @classmethod
    def paginated(
        cls,
        items: List[Any],
        total_items: int,
        params: PaginationParams,
        message: str = "Success",
        status_code: int = 200,
    ) -> JSONResponse:
        """
        Standard response for lists. 
        Automatically calculates pagination logic so the Router stays clean.
        """
        total_pages = math.ceil(total_items / params.limit) if total_items > 0 else 0
        
        pagination_meta = {
            "page": params.page,
            "limit": params.limit,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": params.page < total_pages,
            "has_prev": params.page > 1,
        }

        return JSONResponse(
            status_code=status_code,
            content=jsonable_encoder({
                "success": True,
                "message": message,
                "data": items,
                "meta": pagination_meta # Populated with pagination info
            })
        )

    @classmethod
    def no_content(cls) -> Response:
        """Return 204 No Content (empty body, great for successful DELETEs)."""
        return Response(status_code=204)

    @classmethod
    def error(
        cls,
        message: str = "An error occurred",
        status_code: int = 400,
        errors: Optional[Any] = None,
    ) -> JSONResponse:
        """
        Return an error response with a standard shape.
        (Note: Usually you will raise an ApiError instead of calling this directly,
        but this is useful for the global exception handler to format responses).
        """
        body: dict[str, Any] = {
            "success": False,
            "message": message,
        }
        
        if errors is not None:
            body["errors"] = errors
            
        return JSONResponse(
            status_code=status_code, 
            content=jsonable_encoder(body)
        )