# app/modules/labtest/service.py
from uuid import UUID
from loguru import logger
from datetime import date
from sqlalchemy import select, func, delete, update
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.utils.pagination import PaginationParams
from app.db.all_models import User
from app.modules.labtest.models import LabTest, LabTestCategory, LabTestBooking, LabTestBookingStatus
from app.modules.labtest.schemas import LabTestCreateRequest, CategoryCreateRequest, BookLabTestRequest
from app.modules.labtest.exceptions import (
    LabTestNotFoundError, 
    CategoryNotFoundError, 
    LabTestCreationError,
    LabTestError
)

class LabTestService:
    # --- Categories ---
    async def create_category(self, db: AsyncSession, data: CategoryCreateRequest) -> LabTestCategory:
        try:
            sa_cat = LabTestCategory(**data.model_dump())
            db.add(sa_cat)
            await db.commit()
            await db.refresh(sa_cat)
            return sa_cat
        except IntegrityError:
            await db.rollback()
            raise LabTestCreationError("A category with this name already exists.")
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating lab test category: {e}")
            raise LabTestCreationError("Failed to create category.")

    async def get_all_categories(self, db: AsyncSession) -> list[LabTestCategory]:
        stmt = select(LabTestCategory).order_by(LabTestCategory.name.asc())
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    async def delete_category(self, db: AsyncSession, category_id: UUID) -> None:
        try:
            stmt = delete(LabTestCategory).where(LabTestCategory.id == category_id)
            result = await db.execute(stmt)
            if result.rowcount == 0:
                raise CategoryNotFoundError()
            await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            raise LabTestCreationError("Failed to delete category.")

    # --- Lab Tests ---
    async def create_test(self, db: AsyncSession, data: LabTestCreateRequest) -> LabTest:
        try:
            category = await db.get(LabTestCategory, data.category_id)
            if not category:
                raise CategoryNotFoundError("Provided category_id does not exist.")

            lab_test = LabTest(**data.model_dump())
            db.add(lab_test)
            await db.commit()
            await db.refresh(lab_test)
            return lab_test
        except CategoryNotFoundError:
            raise
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error creating lab test: {e}")
            raise LabTestCreationError("Failed to create lab test.")

    async def get_test_by_id(self, db: AsyncSession, test_id: UUID) -> LabTest:
        stmt = select(LabTest).options(selectinload(LabTest.category)).where(LabTest.id == test_id)
        result = await db.execute(stmt)
        lab_test = result.scalar_one_or_none()
        if not lab_test:
            raise LabTestNotFoundError()
        return lab_test

    async def list_tests(self, db: AsyncSession, params: PaginationParams, category_id: UUID | None = None, is_active: bool | None = None) -> tuple[list[LabTest], int]:
        query = select(LabTest).options(selectinload(LabTest.category))
        count_query = select(func.count()).select_from(LabTest)

        if category_id:
            query = query.where(LabTest.category_id == category_id)
            count_query = count_query.where(LabTest.category_id == category_id)
            
        if is_active is not None:
            query = query.where(LabTest.is_active == is_active)
            count_query = count_query.where(LabTest.is_active == is_active)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(LabTest.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()
        return list(items), total_count

    async def update_test(self, db: AsyncSession, test_id: UUID, data: dict) -> LabTest:
        try:
            stmt = update(LabTest).where(LabTest.id == test_id).values(**data).returning(LabTest)
            result = await db.execute(stmt)
            updated_test = result.scalar_one_or_none()
            if not updated_test:
                raise LabTestNotFoundError()
            await db.commit()
            return await self.get_test_by_id(db, test_id)
        except SQLAlchemyError as e:
            await db.rollback()
            raise LabTestCreationError("Failed to update lab test.")

    async def delete_test(self, db: AsyncSession, test_id: UUID) -> None:
        try:
            stmt = delete(LabTest).where(LabTest.id == test_id)
            result = await db.execute(stmt)
            if result.rowcount == 0:
                raise LabTestNotFoundError()
            await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            raise LabTestCreationError("Failed to delete lab test.")

    # --- Lab Test Booking Methods ---
    async def book_test(self, db: AsyncSession, user_id: UUID, payload: BookLabTestRequest) -> LabTestBooking:
        test = await db.get(LabTest, payload.lab_test_id)
        if not test or not test.is_active:
            raise LabTestNotFoundError("Requested lab test is currently unavailable.")

        try:
            booking = LabTestBooking(
                patient_user_id=user_id,
                lab_test_id=payload.lab_test_id,
                scheduled_date=payload.scheduled_date,
                status=LabTestBookingStatus.PENDING
            )
            db.add(booking)
            await db.commit()
            
            fetch_stmt = (
                select(LabTestBooking)
                .options(
                    selectinload(LabTestBooking.lab_test).selectinload(LabTest.category),
                    selectinload(LabTestBooking.patient_user).selectinload(User.patient_profile)
                )
                .where(LabTestBooking.id == booking.id)
            )
            result = await db.execute(fetch_stmt)
            return result.scalar_one()
            
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Failed to create lab test booking: {e}")
            raise LabTestError("Failed to schedule lab test booking.")

    async def list_bookings(self, db: AsyncSession, params: PaginationParams, status: LabTestBookingStatus | None = None) -> tuple[list[LabTestBooking], int]:
        query = (
            select(LabTestBooking)
            .options(
                selectinload(LabTestBooking.lab_test).selectinload(LabTest.category),
                selectinload(LabTestBooking.patient_user).selectinload(User.patient_profile)
            )
        )
        count_query = select(func.count()).select_from(LabTestBooking)

        if status:
            query = query.where(LabTestBooking.status == status)
            count_query = count_query.where(LabTestBooking.status == status)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(LabTestBooking.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()
        
        return list(items), total_count

    async def get_patient_bookings(self, db: AsyncSession, patient_user_id: UUID, params: PaginationParams) -> tuple[list[LabTestBooking], int]:
        query = (
            select(LabTestBooking)
            .options(
                selectinload(LabTestBooking.lab_test).selectinload(LabTest.category),
                selectinload(LabTestBooking.patient_user).selectinload(User.patient_profile)
            )
            .where(LabTestBooking.patient_user_id == patient_user_id)
        )
        count_query = select(func.count()).select_from(LabTestBooking).where(LabTestBooking.patient_user_id == patient_user_id)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(LabTestBooking.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()
        
        return list(items), total_count