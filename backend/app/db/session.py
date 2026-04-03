from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL.get_secret_value(), 
    pool_pre_ping=True, 
    future=True,
    echo=False 
)

AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    autocommit=False, 
    autoflush=False,
    expire_on_commit=False
)