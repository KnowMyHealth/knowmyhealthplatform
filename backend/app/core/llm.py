from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.models.google import GoogleModel

from app.core.config import settings

provider = GoogleProvider(
    api_key=settings.GOOGLE_API_KEY.get_secret_value(),
)

model = GoogleModel(
    model_name="gemini-3.1-flash-lite-preview",
    provider=provider,
)
