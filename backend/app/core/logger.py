import os
import sys
import logging
from loguru import logger

from app.core.config import settings

class InterceptHandler(logging.Handler):
    """
    Redirects standard logging messages (from Uvicorn/FastAPI) to Loguru.
    """
    def emit(self, record):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )

def setup_logging():
    logging.getLogger().handlers = []
    logger.remove() 
    
    # 1. Terminal Output (Keep this for Docker/AWS logs)
    if settings.ENVIRONMENT != "production":
        logger.add(sys.stdout, level="DEBUG", format="<green>{time}</green> <level>{message}</level>")
    else:
        logger.add(sys.stdout, serialize=True, level="INFO")

    # 2. File Output
    logger.add(
        os.path.join(os.path.dirname(__file__), "..", "..", "logs", "app.log"),
        rotation="100 MB",          # Create new file when size hits 100MB
        retention="10 days",        # Delete files older than 10 days
        compression="zip",          # Zip old files to save space
        level="INFO",               # Only save INFO and above to file
        serialize=True              # Save as JSON (optional, good for parsing)
    )

    for logger_name in logging.root.manager.loggerDict:
        if logger_name.startswith("uvicorn") or logger_name.startswith("fastapi"):
            logger_obj = logging.getLogger(logger_name)
            logger_obj.handlers = []
            logger_obj.propagate = True
    
    logging.basicConfig(handlers=[InterceptHandler()], level=logging.INFO, force=True)
    
    # If you want to see SQL queries in local, uncomment this:
    # if settings.ENVIRONMENT != "production":
    #     logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)