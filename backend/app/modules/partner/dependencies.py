from app.modules.partner.service import PartnerService

def get_partner_service() -> PartnerService:
    return PartnerService()