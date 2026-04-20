from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from contextlib import asynccontextmanager

from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.logger import setup_logging
from app.core.exceptions import add_exception_handlers
from app.core.config import settings
from app.core.rate_limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler

# Import your routers
from app.modules.user.router import router as user_router
from app.modules.prescription.router import router as prescription_router
from app.modules.chat.router import router as chat_router
from app.modules.doctor.router import router as doctor_router
from app.modules.labtest.router import router as labtest_router
from app.modules.blog.router import router as blog_router
from app.modules.coupon.router import router as coupon_router
from app.modules.symptom_checker.router import router as symptom_checker_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    logger.info("Application starting up...")
    yield
    # --- Shutdown ---
    logger.info("Application shutting down...")


setup_logging()


def create_application() -> FastAPI:
    application = FastAPI(
        title="KnowMyHealth API",
        description="Routes for KnowMyHealth backend",
        version="1.0.2",
        lifespan=lifespan,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
        openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
    )

    # --- Rate Limiter Middleware ---
    application.state.limiter = limiter
    application.add_exception_handler(
        RateLimitExceeded,
        _rate_limit_exceeded_handler
    )
    application.add_middleware(SlowAPIMiddleware)

    # --- CORS Middleware ---
    if settings.ENVIRONMENT != "production":
        application.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # --- Exception Handlers ---
    add_exception_handlers(application)

    # --- Routers ---
    application.include_router(user_router, prefix=settings.API_VERSION)
    application.include_router(prescription_router, prefix=settings.API_VERSION)
    application.include_router(chat_router, prefix=settings.API_VERSION)
    application.include_router(doctor_router, prefix=settings.API_VERSION)
    application.include_router(labtest_router, prefix=settings.API_VERSION)
    application.include_router(blog_router, prefix=settings.API_VERSION)
    application.include_router(coupon_router, prefix=settings.API_VERSION)
    application.include_router(symptom_checker_router, prefix=settings.API_VERSION)

    return application


app = create_application()


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_config=None
    )