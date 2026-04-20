from uuid import UUID
from loguru import logger
from sqlalchemy import select, func, delete, update
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.utils.pagination import PaginationParams
from app.modules.labtest.models import LabTest, LabTestCategory
from app.modules.labtest.schemas import LabTestCreateRequest, CategoryCreateRequest
from app.modules.labtest.exceptions import (
    LabTestNotFoundError, 
    CategoryNotFoundError, 
    LabTestCreationError
)

class LabTestService:
    # --- Categories ---
    async def create_category(self, db: AsyncSession, data: CategoryCreateRequest) -> LabTestCategory:
        try:
            category = LabTestCategory(**data.model_dump())
            db.add(category)
            await db.commit()
            await db.refresh(category)
            return category
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
            logger.info(f"Deleted lab test category {category_id}")
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error deleting lab test category: {e}")
            raise LabTestCreationError("Failed to delete category.")

    # --- Lab Tests ---
    async def create_test(self, db: AsyncSession, data: LabTestCreateRequest) -> LabTest:
        try:
            # Verify category exists
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
        stmt = (
            select(LabTest)
            .options(selectinload(LabTest.category))
            .where(LabTest.id == test_id)
        )
        result = await db.execute(stmt)
        lab_test = result.scalar_one_or_none()
        
        if not lab_test:
            raise LabTestNotFoundError()
        return lab_test

    async def list_tests(
        self, 
        db: AsyncSession, 
        params: PaginationParams,
        category_id: UUID | None = None,
        is_active: bool | None = None
    ) -> tuple[list[LabTest], int]:
        
        query = select(LabTest).options(selectinload(LabTest.category))
        count_query = select(func.count()).select_from(LabTest)

        # Filters
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
        if not data:
            return await self.get_test_by_id(db, test_id)

        try:
            stmt = (
                update(LabTest)
                .where(LabTest.id == test_id)
                .values(**data)
                .returning(LabTest)
            )
            result = await db.execute(stmt)
            updated_test = result.scalar_one_or_none()

            if not updated_test:
                raise LabTestNotFoundError()

            await db.commit()
            
            # Fetch again to populate relationship
            return await self.get_test_by_id(db, test_id)
            
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Error updating lab test: {e}")
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
            logger.error(f"Error deleting lab test: {e}")
            raise LabTestCreationError("Failed to delete lab test.")