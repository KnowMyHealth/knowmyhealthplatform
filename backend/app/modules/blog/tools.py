from loguru import logger
from pexels_api import API

from app.core.config import settings
from pydantic_ai import ImageUrl

def fetch_images(query: str, no_of_images: int) -> dict:
    """
    Searches for high-quality images on Pexels.
    
    Use this tool to find images for the blog post. Request multiple images 
    (e.g., 3-5). Use one of the returned URLs for the 'cover_image_url' field, 
    and embed the remaining URLs directly into the Markdown 'content' field 
    using the syntax: ![Alt Text](image_url).

    Args:
        query (str): The search term for the images (e.g., "healthy heart", "doctor").
        no_of_images (int): The number of images to fetch (usually 3 to 5).

    Returns:
        dict: A dictionary containing a list of image URLs.
    """
    logger.debug(f"--> Called fetch_images tool with args: query={query}, no_of_images={no_of_images}")
    
    # Initialize Pexels API
    api = API(settings.PEXELS_API_KEY.get_secret_value())

    # Fetch images
    api.search(query, page=1, results_per_page=no_of_images)
    photos = api.get_entries()

    image_urls = []
    if photos:
        for photo in photos:
            # Use 'large' or 'original' based on your preference
            image_urls.append(photo.original) 

    return {
        "query": query,
        "image_count": len(image_urls),
        "images": image_urls
    }

async def look_at_image(url: str) -> ImageUrl:
    """Fetches an image URL so the model can visually inspect it to ensure it fits the context."""
    logger.debug(f"--> Called look_at_image tool with args: url={url}")
    return ImageUrl(url=url)