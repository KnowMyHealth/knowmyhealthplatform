from app.common.exceptions import BaseDomainException

class CouponError(BaseDomainException):
    def __init__(self, message: str = "A coupon error occurred", status_code: int = 400):
        super().__init__(message, status_code)

class CouponNotFoundError(CouponError):
    def __init__(self, message: str = "Coupon not found", status_code: int = 404):
        super().__init__(message, status_code)

class CouponValidationError(CouponError):
    def __init__(self, message: str = "Invalid or expired coupon", status_code: int = 400):
        super().__init__(message, status_code)