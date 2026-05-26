from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.groq import GroqProvider
from pydantic_ai.models.groq import GroqModel

from app.core.config import settings

provider = GoogleProvider(
    api_key=settings.GOOGLE_API_KEY.get_secret_value(),
)

model = GoogleModel(
    model_name="gemini-2.5-flash",
    provider=provider,
)