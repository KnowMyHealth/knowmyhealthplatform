from uuid import UUID
from loguru import logger
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.all_models import User
from app.modules.user.schemas import Role
from app.modules.user.exceptions import (
    UserNotFoundError,
    UserUpdateError
)


class UsersService:
    def __init__(self):
        pass

    async def get_user_by_id(self, db: AsyncSession, user_id: UUID) -> User | None:
        """Fetches a user from the database by their UUID."""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def update_user_role(
        self,
        db: AsyncSession,
        user_id: UUID,
        role: Role
    ) -> User:
        """
        Updates the role of a user.
        """
        try:
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(role=role.value)
                .returning(User)
            )

            result = await db.execute(stmt)
            updated_user = result.scalar_one_or_none()

            if not updated_user:
                logger.warning(f"Update role failed: User {user_id} not found.")
                raise UserNotFoundError(f"User {user_id} not found.")

            await db.commit()
            logger.info(f"Updated role for user {user_id} → {role.value}")

            return updated_user

        except IntegrityError as e:
            await db.rollback()
            logger.warning(f"Integrity error updating role for user {user_id}: {e}")
            raise UserUpdateError("Invalid role value or constraint violation.")

        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error updating role for user {user_id}: {e}")
            raise UserUpdateError("A database error occurred while updating the role.")