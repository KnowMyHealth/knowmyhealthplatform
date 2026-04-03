from typing import AsyncGenerator
from app.db.session import AsyncSessionFactory

# Postgres Dependency
async def get_db() -> AsyncGenerator:
    async with AsyncSessionFactory() as db:
        yield db
