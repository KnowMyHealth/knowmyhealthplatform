# app/modules/callback/service.py
from uuid import UUID
from loguru import logger
from sqlalchemy import select, update, delete, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.pagination import PaginationParams
from app.modules.callback.models import CallbackRequest, CallbackStatus
from app.modules.callback.schemas import CallbackCreateRequest
from app.modules.callback.exceptions import CallbackNotFoundError, CallbackError

class CallbackService:
    async def create_request(self, db: AsyncSession, data: CallbackCreateRequest) -> CallbackRequest:
        try:
            request = CallbackRequest(**data.model_dump())
            db.add(request)
            await db.commit()
            await db.refresh(request)
            return request
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating callback request: {e}")
            raise CallbackError("Failed to submit callback request.")

    async def get_request_by_id(self, db: AsyncSession, request_id: UUID) -> CallbackRequest:
        request = await db.get(CallbackRequest, request_id)
        if not request:
            raise CallbackNotFoundError()
        return request

    async def list_requests(
        self, 
        db: AsyncSession, 
        params: PaginationParams, 
        status: CallbackStatus | None = None
    ) -> tuple[list[CallbackRequest], int]:
        query = select(CallbackRequest)
        count_query = select(func.count()).select_from(CallbackRequest)

        if status:
            query = query.where(CallbackRequest.status == status)
            count_query = count_query.where(CallbackRequest.status == status)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(CallbackRequest.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()

        return list(items), total_count

    async def update_request(self, db: AsyncSession, request_id: UUID, data: dict) -> CallbackRequest:
        try:
            stmt = update(CallbackRequest).where(CallbackRequest.id == request_id).values(**data).returning(CallbackRequest)
            result = await db.execute(stmt)
            updated_req = result.scalar_one_or_none()

            if not updated_req:
                raise CallbackNotFoundError()

            await db.commit()
            return updated_req
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating callback request: {e}")
            raise CallbackError("Failed to update callback request.")

    async def delete_request(self, db: AsyncSession, request_id: UUID) -> None:
        try:
            stmt = delete(CallbackRequest).where(CallbackRequest.id == request_id)
            result = await db.execute(stmt)
            if result.rowcount == 0:
                raise CallbackNotFoundError()
            await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            raise CallbackError("Failed to delete callback request.")