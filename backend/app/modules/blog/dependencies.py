from app.modules.blog.service import BlogService

def get_blog_service() -> BlogService:
    return BlogService()