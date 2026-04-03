import asyncio
from uuid import uuid4
from supabase import create_async_client, AsyncClient
from app.core.config import settings

IMAGE_BUCKET_NAME = "image_assets"

_supabase_client: AsyncClient | None = None
_supabase_lock = asyncio.Lock()

async def get_supabase() -> AsyncClient:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    async with _supabase_lock:
        if _supabase_client is None:
            _supabase_client = await create_async_client(
                settings.PUBLIC_SUPABASE_URL,
                settings.SUPABASE_SECRET_KEY
            )
    return _supabase_client

async def upload_webp_image(file_bytes: bytes) -> tuple[str, str]:
    client = await get_supabase()
    file_id = str(uuid4())
    file_name = f"{file_id}.webp"
    
    await client.storage.from_(IMAGE_BUCKET_NAME).upload(
        file_name,
        file_bytes,
        {"content-type": "image/webp", "upsert": False}
    )

    public_url = await client.storage.from_(IMAGE_BUCKET_NAME).get_public_url(file_name)
    return file_id, public_url