import math
from typing import Generic, List, TypeVar
from fastapi import Query
from pydantic import BaseModel, Field

# Generic type for the data payload (e.g., ProjectSchema)
T = TypeVar("T")

# Prevent users from requesting 1,000,000 records at once and crashing your DB
MAX_PAGE_SIZE = 100

class PaginationParams:
    """
    A dependency class to parse pagination queries from the URL.
    Example: /api/v1/projects?page=2&limit=50
    """
    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="Page number (1-based)"),
        limit: int = Query(default=10, ge=1, le=MAX_PAGE_SIZE, description="Items per page"),
    ) -> None:
        self.page = page
        self.limit = limit

    @property
    def offset(self) -> int:
        """Calculates the zero-based row offset for the SQL OFFSET clause."""
        return (self.page - 1) * self.limit

class PaginationMeta(BaseModel):
    """The metadata block returned in the JSON response."""
    page: int = Field(description="Current page number")
    limit: int = Field(description="Max items per page")
    total_items: int = Field(description="Total number of items in the database")
    total_pages: int = Field(description="Total number of pages available")
    has_next: bool = Field(description="True if there is a next page")
    has_prev: bool = Field(description="True if there is a previous page")

class PaginatedResponse(BaseModel, Generic[T]):
    """
    The standard JSON envelope for paginated lists.
    Using generics allows FastAPI's Swagger UI to auto-document the exact schema of the list items!
    """
    success: bool = True
    message: str = "Success"
    data: List[T]
    meta: PaginationMeta

    @classmethod
    def create(
        cls,
        items: List[T],
        total_items: int,
        params: PaginationParams,
        message: str = "Success",
    ) -> "PaginatedResponse[T]":
        """
        Helper method to automatically calculate pages and construct the response.
        """
        total_pages = math.ceil(total_items / params.limit) if total_items > 0 else 0
        
        meta = PaginationMeta(
            page=params.page,
            limit=params.limit,
            total_items=total_items,
            total_pages=total_pages,
            has_next=params.page < total_pages,
            has_prev=params.page > 1,
        )
        
        return cls(
            success=True,
            message=message,
            data=items,
            meta=meta
        )