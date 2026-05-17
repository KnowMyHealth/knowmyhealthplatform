from uuid import UUID
from loguru import logger
from sqlalchemy import update, select, func
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.pagination import PaginationParams
from app.modules.partner.models import Partner, PartnerStatus
from app.modules.partner.schemas import PartnerCreateRequest
from app.modules.partner.exceptions import (
    PartnerNotFoundError,
    PartnerCreateError,
    PartnerUpdateError
)

class PartnerService:
    async def create_partner(self, db: AsyncSession, payload: PartnerCreateRequest) -> Partner:
        try:
            stmt = select(Partner).where(Partner.email == payload.email)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if existing:
                raise PartnerCreateError("A partner application with this email already exists.")

            new_partner = Partner(**payload.model_dump())
            db.add(new_partner)
            await db.commit()
            await db.refresh(new_partner)
            return new_partner
            
        except IntegrityError:
            await db.rollback()
            raise PartnerCreateError("Email already exists.")

    async def get_partner_by_id(self, db: AsyncSession, partner_id: UUID) -> Partner:
        stmt = select(Partner).where(Partner.id == partner_id)
        partner = (await db.execute(stmt)).scalar_one_or_none()
        if not partner:
            raise PartnerNotFoundError()
        return partner

    async def list_partners(
        self, 
        db: AsyncSession, 
        params: PaginationParams,
        status: PartnerStatus | None = None
    ) -> tuple[list[Partner], int]:
        query = select(Partner)
        count_query = select(func.count()).select_from(Partner)

        if status:
            query = query.where(Partner.status == status)
            count_query = count_query.where(Partner.status == status)

        total_count = (await db.execute(count_query)).scalar() or 0

        query = query.order_by(Partner.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()

        return list(items), total_count

    async def update_partner_status(self, db: AsyncSession, partner_id: UUID, status: PartnerStatus) -> Partner:
        try:
            stmt = update(Partner).where(Partner.id == partner_id).values(status=status.value).returning(Partner)
            result = await db.execute(stmt)
            updated_partner = result.scalar_one_or_none()

            if not updated_partner:
                raise PartnerNotFoundError()

            await db.commit()
            return updated_partner
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating partner status: {e}")
            raise PartnerUpdateError("Database error while updating status.")