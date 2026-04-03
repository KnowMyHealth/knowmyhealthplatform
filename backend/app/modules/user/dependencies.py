from app.modules.user.service import UsersService

def get_users_service() -> UsersService:
    """Dependency to provide an instance of UsersService."""
    return UsersService()