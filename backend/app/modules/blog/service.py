from uuid import UUID
from loguru import logger
from sqlalchemy import select, delete, update, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.pagination import PaginationParams
from app.modules.blog.models import Blog
from app.modules.blog.schemas import BlogCreateRequest, BlogGenerateRequest
from app.modules.blog.exceptions import BlogNotFoundError, BlogGenerationError
from app.modules.blog.agent import run_blog_agent
from app.modules.blog.exceptions import BlogError

class BlogService:
    async def generate_blog_draft(self, params: BlogGenerateRequest) -> dict:
        """Calls the AI Agent to generate a draft (Does NOT save to DB automatically)."""
        try:
            ai_result = await run_blog_agent(
                research_topic=params.research_topic,
                target_audience=params.target_audience,
                tone_of_voice=params.tone_of_voice,
                additional_instructions=params.additional_instructions
            )
            return ai_result.model_dump()
        except Exception as e:
            logger.error(f"Agent failed to generate blog: {e}")
            raise BlogGenerationError(str(e))

    async def create_blog(self, db: AsyncSession, author_id: UUID, data: BlogCreateRequest) -> Blog:
        try:
            blog = Blog(author_id=author_id, **data.model_dump())
            db.add(blog)
            await db.commit()
            await db.refresh(blog)
            return blog
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error saving blog: {e}")
            raise BlogError("Failed to save blog to database.")

    async def get_blog_by_id(self, db: AsyncSession, blog_id: UUID) -> Blog:
        blog = await db.get(Blog, blog_id)
        if not blog:
            raise BlogNotFoundError()
        return blog

    async def list_blogs(
        self, 
        db: AsyncSession, 
        params: PaginationParams, 
        is_published: bool | None = None
    ) -> tuple[list[Blog], int]:
        query = select(Blog)
        count_query = select(func.count()).select_from(Blog)

        if is_published is not None:
            query = query.where(Blog.is_published == is_published)
            count_query = count_query.where(Blog.is_published == is_published)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(Blog.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()

        return list(items), total_count

    async def update_blog(self, db: AsyncSession, blog_id: UUID, data: dict) -> Blog:
        if not data:
            return await self.get_blog_by_id(db, blog_id)
            
        try:
            stmt = update(Blog).where(Blog.id == blog_id).values(**data).returning(Blog)
            result = await db.execute(stmt)
            blog = result.scalar_one_or_none()

            if not blog:
                raise BlogNotFoundError()

            await db.commit()
            return blog
        except SQLAlchemyError as e:
            await db.rollback()
            raise BlogError("Failed to update blog.")

    async def delete_blog(self, db: AsyncSession, blog_id: UUID) -> None:
        try:
            stmt = delete(Blog).where(Blog.id == blog_id)
            result = await db.execute(stmt)
            if result.rowcount == 0:
                raise BlogNotFoundError()
            await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            raise BlogError("Failed to delete blog.")