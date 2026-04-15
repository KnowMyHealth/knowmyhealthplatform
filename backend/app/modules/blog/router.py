from uuid import UUID
from loguru import logger
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.db.all_models import User
from app.utils.api_response import ApiResponse
from app.core.security import RequireRole, get_current_user
from app.core.rate_limiter import limiter
from app.utils.pagination import PaginationParams
from app.modules.user.schemas import Role

from app.modules.blog.schemas import (
    BlogSchema, 
    BlogCreateRequest, 
    BlogUpdateRequest,
    BlogGenerateRequest
)
from app.modules.blog.service import BlogService
from app.modules.blog.dependencies import get_blog_service

router = APIRouter(prefix="/blogs", tags=["Blogs"])

# --- AI GENERATION ---
@router.post(
    "/generate",
    summary="Generate Blog using AI (Admin)",
    description="Calls the AI Agent to research and draft a blog. Does NOT save it to the DB yet."
)
@limiter.limit("5/minute")
async def generate_blog(
    request: Request,
    payload: BlogGenerateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    service: BlogService = Depends(get_blog_service)
):
    logger.info(f"AI generating blog draft for topic: {payload.research_topic}")
    draft = await service.generate_blog_draft(payload)
    return ApiResponse.success(data=draft, message="Blog drafted successfully. Review and save.")

# --- CRUD OPERATIONS ---
@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Save a Blog (Admin)",
)
@limiter.limit("20/minute")
async def create_blog(
    request: Request,
    payload: BlogCreateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: BlogService = Depends(get_blog_service)
):
    blog = await service.create_blog(db, UUID(str(current_user.id)), payload)
    return ApiResponse.created(data=BlogSchema.model_validate(blog), message="Blog saved successfully.")

@router.get(
    "",
    summary="List Blogs (Public)",
    description="Returns published blogs. Admin can view unpublished drafts using ?is_published=false."
)
@limiter.limit("60/minute")
async def list_blogs(
    request: Request,
    params: PaginationParams = Depends(),
    is_published: bool | None = True, # Defaults to only showing published blogs
    db: AsyncSession = Depends(get_db),
    service: BlogService = Depends(get_blog_service)
):
    items, total = await service.list_blogs(db, params, is_published)
    validated_items = [BlogSchema.model_validate(i) for i in items]
    
    return ApiResponse.paginated(
        items=validated_items, total_items=total, params=params, message="Blogs retrieved successfully."
    )

@router.get(
    "/{blog_id}",
    summary="Get Single Blog Details",
)
@limiter.limit("60/minute")
async def get_blog(
    request: Request,
    blog_id: UUID,
    db: AsyncSession = Depends(get_db),
    service: BlogService = Depends(get_blog_service)
):
    blog = await service.get_blog_by_id(db, blog_id)
    return ApiResponse.success(data=BlogSchema.model_validate(blog))

@router.patch(
    "/{blog_id}",
    summary="Update or Publish Blog (Admin)",
)
@limiter.limit("20/minute")
async def update_blog(
    request: Request,
    blog_id: UUID,
    payload: BlogUpdateRequest = Body(...),
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: BlogService = Depends(get_blog_service)
):
    update_data = payload.model_dump(exclude_unset=True)
    updated_blog = await service.update_blog(db, blog_id, update_data)
    return ApiResponse.success(data=BlogSchema.model_validate(updated_blog), message="Blog updated.")

@router.delete(
    "/{blog_id}",
    summary="Delete Blog (Admin)",
)
@limiter.limit("10/minute")
async def delete_blog(
    request: Request,
    blog_id: UUID,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: BlogService = Depends(get_blog_service)
):
    await service.delete_blog(db, blog_id)
    return ApiResponse.no_content()