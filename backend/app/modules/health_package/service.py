from uuid import UUID
from loguru import logger
from sqlalchemy import update, select, delete, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.pagination import PaginationParams
from app.modules.health_package.models import HealthPackage
from app.modules.health_package.schemas import HealthPackageCreateRequest
from app.modules.health_package.exceptions import HealthPackageNotFoundError, HealthPackageError

class HealthPackageService:
    async def create_package(self, db: AsyncSession, data: HealthPackageCreateRequest) -> HealthPackage:
        try:
            package = HealthPackage(**data.model_dump())
            db.add(package)
            await db.commit()
            await db.refresh(package)
            return package
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating health package: {e}")
            raise HealthPackageError("Failed to create health package.")

    async def get_package_by_id(self, db: AsyncSession, package_id: UUID) -> HealthPackage:
        package = await db.get(HealthPackage, package_id)
        if not package:
            raise HealthPackageNotFoundError()
        return package

    async def list_packages(self, db: AsyncSession, params: PaginationParams, is_active: bool | None = None) -> tuple[list[HealthPackage], int]:
        query = select(HealthPackage)
        count_query = select(func.count()).select_from(HealthPackage)

        if is_active is not None:
            query = query.where(HealthPackage.is_active == is_active)
            count_query = count_query.where(HealthPackage.is_active == is_active)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(HealthPackage.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()

        return list(items), total_count

    async def update_package(self, db: AsyncSession, package_id: UUID, data: dict) -> HealthPackage:
        if not data:
            return await self.get_package_by_id(db, package_id)

        try:
            stmt = update(HealthPackage).where(HealthPackage.id == package_id).values(**data).returning(HealthPackage)
            result = await db.execute(stmt)
            package = result.scalar_one_or_none()

            if not package:
                raise HealthPackageNotFoundError()

            await db.commit()
            return package
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating health package: {e}")
            raise HealthPackageError("Failed to update health package.")

    async def delete_package(self, db: AsyncSession, package_id: UUID) -> None:
        try:
            stmt = delete(HealthPackage).where(HealthPackage.id == package_id)
            result = await db.execute(stmt)
            if result.rowcount == 0:
                raise HealthPackageNotFoundError()
            await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error deleting health package: {e}")
            raise HealthPackageError("Failed to delete health package.")