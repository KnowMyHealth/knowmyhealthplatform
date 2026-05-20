from app.modules.health_package.service import HealthPackageService

def get_health_package_service() -> HealthPackageService:
    return HealthPackageService()