import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

async def drop_enums():
    engine = create_async_engine(settings.DATABASE_URL.get_secret_value())
    commands = [
        "DROP TYPE IF EXISTS role CASCADE;",
        "DROP TYPE IF EXISTS doctorstatus CASCADE;"
    ]
    async with engine.begin() as conn:
        for cmd in commands:
            try:
                await conn.execute(text(cmd))
                print(f"Executed: {cmd}")
            except Exception as e:
                print(f"Failed: {cmd} (Likely already gone)")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(drop_enums())