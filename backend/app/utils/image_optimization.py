import asyncio
import io
from pydantic_ai import BinaryContent
from PIL import Image, ImageOps, ImageFilter

def _process_image_sync(image_bytes: bytes) -> bytes:
    """
    Core synchronous logic. 
    (Prefixed with an underscore to indicate it's an internal helper function).
    """
    with Image.open(io.BytesIO(image_bytes)) as img:
        img = ImageOps.exif_transpose(img)
        icc = img.info.get('icc_profile')
        
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGBA' if 'transparency' in img.info else 'RGB')
            
        img.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        img = img.filter(ImageFilter.UnsharpMask(radius=0.5, percent=50, threshold=3))
        
        output = io.BytesIO()
        img.save(output, format="WEBP", quality=80, method=6, icc_profile=icc)
        return output.getvalue()

async def optimize_image_to_webp(image_bytes: bytes) -> bytes:
    """
    Async wrapper that safely executes the CPU-bound image processing 
    in a separate thread so it doesn't block your application's event loop.
    """
    return await asyncio.to_thread(_process_image_sync, image_bytes)