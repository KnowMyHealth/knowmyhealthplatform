from app.modules.coupon.service import CouponService

def get_coupon_service() -> CouponService:
    return CouponService()