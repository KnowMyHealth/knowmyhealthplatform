import os
import uuid
import jwt
from jwt import PyJWKClient
from loguru import logger
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionFactory
from app.core.config import settings
from app.db.all_models import *
from app.modules.user.schemas import Role

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


class RequireRole:
    """
    Dependency to check if the current authenticated user has one of the required roles.
    Usage: current_user: User = Depends(RequireRole([Role.ADMIN, Role.DOCTOR]))
    """
    def __init__(self, allowed_roles: List[Role]):
        self.allowed_roles = allowed_roles

    async def __call__(self, current_user: AuthenticatedUser = Depends(get_current_user)) -> User:
        try:
            user_uuid = uuid.UUID(str(current_user.id))
            
            # Fetch user from DB to get the most up-to-date role
            async with AsyncSessionFactory() as db:
                user = await db.get(User, user_uuid)
                
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, 
                    detail="User profile not found"
                )
            
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Account is inactive or banned"
                )

            if user.role not in self.allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail=f"Access denied. Required roles: {[r.value for r in self.allowed_roles]}"
                )
                
            return user
            
        except HTTPException:
            raise # Re-raise HTTP exceptions so FastAPI handles them correctly
        except Exception as e:
            logger.error(f"Database error verifying user role: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Internal Server Error"
            )