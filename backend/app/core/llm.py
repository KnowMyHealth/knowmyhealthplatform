from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.groq import GroqProvider
from pydantic_ai.models.groq import GroqModel

from app.core.config import settings

provider = GoogleProvider(
    api_key=settings.GOOGLE_API_KEY.get_secret_value(),
)

groq_provider = GroqProvider(
    api_key=settings.GROQ_API_KEY.get_secret_value()
)

model = GoogleModel(
    model_name="gemini-2.5-flash",
    provider=provider,
)

groq_model = GroqModel(
    model_name="moonshotai/kimi-k2-instruct-0905",
    provider=groq_provider
)
