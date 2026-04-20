import time
from agora_token_builder import RtcTokenBuilder
from app.core.config import settings

def generate_agora_token(channel_name: str, account: str, expiration_time_in_seconds: int = 3600) -> str:
    """
    Generates an Agora RTC token for a user to join a video call channel.
    `account` is usually the string representation of the User's UUID.
    """
    app_id = settings.AGORA_APP_ID.get_secret_value()
    app_certificate = settings.AGORA_APP_CERTIFICATE.get_secret_value()
    
    current_timestamp = int(time.time())
    privilege_expired_ts = current_timestamp + expiration_time_in_seconds

    # Role 1 = Publisher (Can send and receive video/audio)
    token = RtcTokenBuilder.buildTokenWithAccount(
        app_id, 
        app_certificate, 
        channel_name, 
        account, 
        1, 
        privilege_expired_ts
    )
    return token