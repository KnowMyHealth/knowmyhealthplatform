from loguru import logger

from app.modules.chat.agent import get_chat_agent
from app.modules.chat.exception import ChatAgentError

class ChatService:
    def __init__(self):
        pass

    async def chat(self, user_prompt: str) -> str:
        try:
            response = await get_chat_agent(user_prompt)
            return response
        except Exception as e:
            logger.error(f"Error in chat service: {e}")
            raise ChatAgentError("Chat agent failed to process the request") 