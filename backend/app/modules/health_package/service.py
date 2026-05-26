# app/modules/health_package/service.py
from uuid import UUID
from loguru import logger
from sqlalchemy import update, select, delete, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.utils.pagination import PaginationParams
from app.db.all_models import User
from app.modules.health_package.models import HealthPackage, HealthPackageBooking, HealthPackageBookingStatus
from app.modules.health_package.schemas import HealthPackageCreateRequest, BookHealthPackageRequest
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

    # --- Booking Methods ---
    async def book_package(self, db: AsyncSession, user_id: UUID, payload: BookHealthPackageRequest) -> HealthPackageBooking:
        package = await db.get(HealthPackage, payload.health_package_id)
        if not package or not package.is_active:
            raise HealthPackageNotFoundError("Requested health package is currently unavailable.")

        try:
            booking = HealthPackageBooking(
                patient_user_id=user_id,
                health_package_id=payload.health_package_id,
                scheduled_date=payload.scheduled_date,
                status=HealthPackageBookingStatus.PENDING
            )
            db.add(booking)
            await db.commit()
            
            fetch_stmt = (
                select(HealthPackageBooking)
                .options(
                    selectinload(HealthPackageBooking.health_package),
                    selectinload(HealthPackageBooking.patient_user).selectinload(User.patient_profile)
                )
                .where(HealthPackageBooking.id == booking.id)
            )
            result = await db.execute(fetch_stmt)
            return result.scalar_one()
            
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Failed to create health package booking: {e}")
            raise HealthPackageError("Failed to schedule health package booking.")

    async def list_bookings(self, db: AsyncSession, params: PaginationParams, status: HealthPackageBookingStatus | None = None) -> tuple[list[HealthPackageBooking], int]:
        query = (
            select(HealthPackageBooking)
            .options(
                selectinload(HealthPackageBooking.health_package),
                selectinload(HealthPackageBooking.patient_user).selectinload(User.patient_profile)
            )
        )
        count_query = select(func.count()).select_from(HealthPackageBooking)

        if status:
            query = query.where(HealthPackageBooking.status == status)
            count_query = count_query.where(HealthPackageBooking.status == status)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(HealthPackageBooking.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()
        
        return list(items), total_count

    async def get_patient_bookings(self, db: AsyncSession, patient_user_id: UUID, params: PaginationParams) -> tuple[list[HealthPackageBooking], int]:
        query = (
            select(HealthPackageBooking)
            .options(
                selectinload(HealthPackageBooking.health_package),
                selectinload(HealthPackageBooking.patient_user).selectinload(User.patient_profile)
            )
            .where(HealthPackageBooking.patient_user_id == patient_user_id)
        )
        count_query = select(func.count()).select_from(HealthPackageBooking).where(HealthPackageBooking.patient_user_id == patient_user_id)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(HealthPackageBooking.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()
        
        return list(items), total_count