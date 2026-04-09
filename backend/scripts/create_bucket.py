import asyncio
from loguru import logger

# Assuming get_supabase is in app.core.storage where you defined the lazy loader
from app.core.storage import get_supabase 

async def create_buckets():
    # Initialize the async client
    client = await get_supabase()

    # Await the network call to list buckets
    buckets = await client.storage.list_buckets()
    existing_buckets = [bucket.name for bucket in buckets]

    required_buckets = ["image_assets", "video_assets", "pdf_assets"]

    for bucket_name in required_buckets:
        if bucket_name not in existing_buckets:
            # Await the network call to create the bucket
            await client.storage.create_bucket(
                bucket_name,
                options={"public": True} # Ensure the bucket is public
            )
            logger.info(f"Bucket Created: {bucket_name}")
        else:
            logger.info(f"Bucket already exists: {bucket_name}")

if __name__ == "__main__":
    try:
        # Use asyncio.run() to execute the async function from a synchronous entry point
        asyncio.run(create_buckets())
    except Exception as e:
        logger.error(f"Bucket creation failed: {e}")
        raise