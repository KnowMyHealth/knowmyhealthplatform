import os
from typing import Literal
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings."""

    API_VERSION: str = "/api/v1"
    PROJECT_NAME: str = "KnowMyHealth API"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    DATABASE_URL: SecretStr
    SUPABASE_JWKS_URL: str
    PUBLIC_SUPABASE_URL: str
    SUPABASE_PUBLISHABLE_KEY: SecretStr
    SUPABASE_SECRET_KEY: SecretStr

    GOOGLE_API_KEY: SecretStr
    GROQ_API_KEY: SecretStr

    PEXELS_API_KEY: SecretStr

    RESEND_API_KEY: SecretStr

    AGORA_APP_ID: SecretStr
    AGORA_APP_CERTIFICATE: SecretStr

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
