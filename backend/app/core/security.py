import os
import uuid
import jwt
from jwt import PyJWKClient
from loguru import logger
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionFactory
from app.core.config import settings
from app.db.all_models import *

class AuthenticatedUser:
    def __init__(self, id: str, email: str = None):
        self.id = id
        self.email = email

security = HTTPBearer()
jwks_client = PyJWKClient(settings.SUPABASE_JWKS_URL, cache_keys=True)

def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)):
    token = auth.credentials
    
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            key=signing_key.key,
            algorithms=["ES256"], 
            audience="authenticated",
        )
        
        return AuthenticatedUser(id=payload['sub'], email=payload.get('email'))

    except jwt.ExpiredSignatureError:
        logger.info("User presented expired token.") 
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token attempt. Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected Auth System Failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed due to internal error",
        )

async def get_user_id_for_rate_limiting(request: Request) -> str:
    ip = request.client.host if request.client else "127.0.0.1"
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return f"ip:{ip}"
    try:
        scheme, _, token = auth_header.partition(" ")
        if not scheme or scheme.lower() != "bearer":
            return f"ip:{ip}"
        payload = jwt.decode(token, options={"verify_signature": False})
        
        user_id = payload.get("sub")
        
        if not user_id:
            logger.warning("Token present but missing 'sub' claim. Limiting by IP.")
            return f"ip:{ip}"
        return f"uid:{user_id}"

    except jwt.DecodeError:
        return f"ip:{ip}"
        
    except Exception as e:
        logger.debug(f"Rate limit fallback to IP due to: {e}")
        return f"ip:{ip}"

async def require_eligible_premium_user(
    current_user = Depends(get_current_user)
) -> User:
    try:
        user_uuid = uuid.UUID(str(current_user.id))
        
        # Open connection, fetch user, and close connection IMMEDIATELY
        async with AsyncSessionFactory() as db:
            user = await db.get(User, user_uuid)

    except ValueError:
        logger.warning(f"Token contained invalid UUID: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid User ID format in credentials"
        )
    except Exception as e:
        logger.error(f"Database error fetching user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error"
        )
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User profile not found"
        )
    if user.is_active == False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or banned"
        )
    if user.tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This requires a paid subscription"
        )
    if user.credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits"
        )
        
    return user

