# app/modules/callback/dependencies.py
from app.modules.callback.service import CallbackService

def get_callback_service() -> CallbackService:
    return CallbackService()