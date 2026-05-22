import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

async def reset_partner_enums():
    engine = create_async_engine(settings.DATABASE_URL.get_secret_value())
    
    # 1. Drop only Partner ENUMs
    drop_commands = [
        "DROP TYPE IF EXISTS partnerstatus CASCADE;",
        "DROP TYPE IF EXISTS partnertype CASCADE;",
    ]

    # 2. Recreate them with the exact values from the Partner model
    create_commands = [
        "CREATE TYPE partnerstatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');",
        "CREATE TYPE partnertype AS ENUM ('PHARMACY', 'LABORATORY', 'HOSPITAL', 'CLINIC', 'OTHER');",
    ]

    async with engine.begin() as conn:
        print("--- Dropping Partner ENUMs ---")
        for cmd in drop_commands:
            try:
                await conn.execute(text(cmd))
                print(f"✅ Executed: {cmd}")
            except Exception as e:
                print(f"❌ Failed: {cmd} (Error: {e})")

        print("\n--- Creating Partner ENUMs ---")
        for cmd in create_commands:
            try:
                await conn.execute(text(cmd))
                print(f"✅ Executed: {cmd}")
            except Exception as e:
                print(f"❌ Failed: {cmd} (Error: {e})")

    await engine.dispose()
    print("\n🎉 Partner ENUMs reset complete!")

if __name__ == "__main__":
    asyncio.run(reset_partner_enums())