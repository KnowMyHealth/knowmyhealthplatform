from loguru import logger
from fastapi import APIRouter, Depends, status, Body, Request

from app.utils.api_response import ApiResponse
from app.core.security import get_current_user
from app.core.rate_limiter import limiter

from app.modules.chat.schemas import ChatRequest, ChatResponse
from app.modules.chat.service import ChatService
from app.modules.chat.dependencies import get_chat_service


router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post(
    "/",
    status_code=status.HTTP_200_OK,
    summary="Chat with AI agent",
)
@limiter.limit("30/minute")
async def chat(
    request: Request,
    body: ChatRequest = Body(...),
    current_user = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service)
):
    logger.debug("--> POST /chat")

    response = await service.chat(body.prompt)

    validated = ChatResponse(response=response)

    return ApiResponse.success(
        data=validated,
        message="Chat response generated successfully"
    )