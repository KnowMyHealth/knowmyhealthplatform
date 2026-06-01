# app/modules/labtest/service.py
from uuid import UUID
from loguru import logger
from datetime import datetime, date, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select, func, delete, update
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.utils.pagination import PaginationParams
from app.db.all_models import User
from app.modules.labtest.models import LabTest, LabTestCategory, LabTestBooking, LabTestBookingStatus, LabTestAvailability
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
        except SQLAlchemyError:
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
        except SQLAlchemyError:
            await db.rollback()
            raise LabTestCreationError("Failed to update lab test.")

    async def delete_test(self, db: AsyncSession, test_id: UUID) -> None:
        try:
            stmt = delete(LabTest).where(LabTest.id == test_id)
            result = await db.execute(stmt)
            if result.rowcount == 0:
                raise LabTestNotFoundError()
            await db.commit()
        except SQLAlchemyError:
            await db.rollback()
            raise LabTestCreationError("Failed to delete lab test.")

    # --- NEW: Availability & Slots ---
    async def set_test_availability(self, db: AsyncSession, test_id: UUID, schedule: list[dict]):
        try:
            test = await self.get_test_by_id(db, test_id)
            if not test:
                raise LabTestNotFoundError()

            await db.execute(delete(LabTestAvailability).where(LabTestAvailability.lab_test_id == test_id))
            
            for slot in schedule:
                db.add(LabTestAvailability(
                    lab_test_id=test_id,
                    day_of_week=slot["day_of_week"],
                    start_time=slot["start_time"],
                    end_time=slot["end_time"]
                ))
            
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise LabTestError(f"Failed to save availability: {e}")

    async def get_test_availability(self, db: AsyncSession, test_id: UUID) -> list[LabTestAvailability]:
        stmt = select(LabTestAvailability).where(LabTestAvailability.lab_test_id == test_id).order_by(LabTestAvailability.day_of_week, LabTestAvailability.start_time)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_available_slots(self, db: AsyncSession, test_id: UUID, target_date: date, timezone_offset: int = 0) -> list[dict]:
        tz = timezone(timedelta(minutes=timezone_offset))
        now = datetime.now(tz)
        day_of_week = target_date.weekday()

        avail_stmt = select(LabTestAvailability).where(
            LabTestAvailability.lab_test_id == test_id,
            LabTestAvailability.day_of_week == day_of_week
        )
        availabilities = (await db.execute(avail_stmt)).scalars().all()

        if not availabilities:
            return []

        start_of_day = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=tz)
        end_of_day = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=tz)

        book_stmt = select(LabTestBooking.scheduled_at).where(
            LabTestBooking.lab_test_id == test_id,
            LabTestBooking.scheduled_at >= start_of_day,
            LabTestBooking.scheduled_at <= end_of_day,
            LabTestBooking.status.in_([LabTestBookingStatus.PAID, LabTestBookingStatus.ADVANCE_PAID, LabTestBookingStatus.COMPLETED])
        )
        booked_times = (await db.execute(book_stmt)).scalars().all()
        booked_iso_strings = {bt.astimezone(tz).isoformat() for bt in booked_times}

        slots = []
        for avail in availabilities:
            current_time = datetime.combine(target_date, avail.start_time).replace(tzinfo=tz)
            end_time = datetime.combine(target_date, avail.end_time).replace(tzinfo=tz)

            # Generate slots in 20 MINUTE intervals
            while current_time + timedelta(minutes=20) <= end_time:
                if current_time > now:
                    slot_iso = current_time.isoformat()
                    slots.append({
                        "time": slot_iso,
                        "is_booked": slot_iso in booked_iso_strings
                    })
                current_time += timedelta(minutes=20)

        return slots

    # --- Booking Methods ---
    async def book_test(self, db: AsyncSession, user_id: UUID, payload: BookLabTestRequest) -> LabTestBooking:
        # Enforce 20-minute increments
        if payload.scheduled_at.minute % 20 != 0 or payload.scheduled_at.second != 0:
            raise LabTestError("Appointments must be booked in 20-minute increments.", status_code=400)

        test = await db.get(LabTest, payload.lab_test_id)
        if not test or not test.is_active:
            raise LabTestNotFoundError("Requested lab test is currently unavailable.")

        # Check 15-day booking window
        now = datetime.now(timezone.utc)
        if payload.scheduled_at < now or payload.scheduled_at > now + timedelta(days=15):
            raise LabTestError("Booking must be within the next 15 days.")

        # Availability Check
        day_of_week = payload.scheduled_at.weekday()
        booking_time = payload.scheduled_at.time()

        avail_stmt = select(LabTestAvailability).where(
            LabTestAvailability.lab_test_id == payload.lab_test_id,
            LabTestAvailability.day_of_week == day_of_week,
            LabTestAvailability.start_time <= booking_time,
            LabTestAvailability.end_time > booking_time
        )
        is_available = (await db.execute(avail_stmt)).scalar_one_or_none()
        if not is_available:
            raise LabTestError("Lab is not available at this time.")

        # Conflict check
        conflict_stmt = select(LabTestBooking).where(
            LabTestBooking.lab_test_id == payload.lab_test_id,
            LabTestBooking.scheduled_at == payload.scheduled_at,
            LabTestBooking.status.in_([LabTestBookingStatus.PAID, LabTestBookingStatus.ADVANCE_PAID, LabTestBookingStatus.COMPLETED])
        )
        if (await db.execute(conflict_stmt)).scalar_one_or_none():
            raise LabTestError("This time slot is already taken.", status_code=409)

        try:
            booking = LabTestBooking(
                patient_user_id=user_id,
                lab_test_id=payload.lab_test_id,
                scheduled_at=payload.scheduled_at,
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