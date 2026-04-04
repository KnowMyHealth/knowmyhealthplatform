from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="User input prompt")


class ChatResponse(BaseModel):
    response: str