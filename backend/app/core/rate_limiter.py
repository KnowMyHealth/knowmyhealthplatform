from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.security import get_user_id_for_rate_limiting

Limiter(key_func=get_user_id_for_rate_limiting)