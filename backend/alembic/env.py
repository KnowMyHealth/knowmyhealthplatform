import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

sys.path.append(os.getcwd())

from app.core.config import settings
from app.db.base import Base
from app.db import all_models  # noqa: F401

config = context.config

# Force the URL to be the one from settings (Asyncpg)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.get_secret_value())

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# ----------------------------------------------------------------
# 1. OFFLINE MODE
# ----------------------------------------------------------------
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.
    
    This configures the context with just a URL
    and not an Engine.
    """
    url = config.get_main_option("sqlalchemy.url")
    
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

# ----------------------------------------------------------------
# 2. HELPER: FILTER SUPABASE TABLES
# ----------------------------------------------------------------
def include_object(object, name, type_, reflected, compare_to):
    # Ignore the 'auth' schema (Supabase internal)
    if type_ == "table" and object.schema == "auth":
        return False
    return True

# ----------------------------------------------------------------
# 3. ONLINE MODE (ASYNC HELPER)
# ----------------------------------------------------------------
def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object 
    )

    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()