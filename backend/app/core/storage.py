import asyncio
from uuid import uuid4
from supabase import create_async_client, AsyncClient
from app.core.config import settings

IMAGE_BUCKET_NAME = "image_assets"
PDF_BUCKET_NAME = "pdf_assets"

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
                settings.SUPABASE_SECRET_KEY.get_secret_value()
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

async def upload_pdf_document(file_bytes: bytes) -> tuple[str, str]:
    """Uploads a PDF file to Supabase storage and returns (file_id, public_url)."""
    client = await get_supabase()
    file_id = str(uuid4())
    file_name = f"licenses/{file_id}.pdf"
    
    await client.storage.from_(PDF_BUCKET_NAME).upload(
        file_name,
        file_bytes,
        {"content-type": "application/pdf", "upsert": False}
    )

    public_url = await client.storage.from_(PDF_BUCKET_NAME).get_public_url(file_name)
    return file_id, public_url