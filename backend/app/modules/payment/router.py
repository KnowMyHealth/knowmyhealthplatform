# app/modules/payment/router.py
from uuid import UUID
from fastapi import APIRouter, Depends, status, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.utils.api_response import ApiResponse
from app.core.security import get_current_user
from app.core.rate_limiter import limiter

from app.utils.pagination import PaginationParams
from app.core.security import RequireRole
from app.modules.user.schemas import Role
from app.db.all_models import User
from app.modules.payment.schemas import AdminTransactionSchema
from app.modules.payment.models import PaymentStatus, BookingType

from app.modules.payment.schemas import OrderCreateRequest, OrderCreateResponse, PaymentVerifyRequest
from app.modules.payment.service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/order", response_model=OrderCreateResponse, summary="Create Razorpay Order (Patient)")
@limiter.limit("10/minute")
async def create_payment_order(
    request: Request,
    payload: OrderCreateRequest = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PaymentService = Depends(PaymentService)
):
    payment = await service.create_order(db, UUID(str(current_user.id)), payload)
    
    response_data = OrderCreateResponse(
        payment_id=payment.id,
        razorpay_order_id=payment.razorpay_order_id,
        amount=payment.amount,
        currency=payment.currency
    )
    return response_data

@router.post("/verify", summary="Verify Payment Signature (Patient)")
@limiter.limit("20/minute")
async def verify_payment_signature(
    request: Request,
    payload: PaymentVerifyRequest = Body(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    service: PaymentService = Depends(PaymentService)
):
    payment = await service.verify_payment(db, payload)
    return ApiResponse.success(message="Payment verified and booking confirmed!")


@router.get(
    "", 
    summary="List All Transactions (Admin)",
    description="View all platform payments. Filter by status or booking_type."
)
@limiter.limit("30/minute")
async def list_all_transactions(
    request: Request,
    params: PaginationParams = Depends(),
    status: PaymentStatus | None = None,
    booking_type: BookingType | None = None,
    current_user: User = Depends(RequireRole([Role.ADMIN])),
    db: AsyncSession = Depends(get_db),
    service: PaymentService = Depends(PaymentService)
):
    items, total = await service.list_all_payments(db, params, status, booking_type)
    validated = [AdminTransactionSchema.model_validate(i) for i in items]
    
    return ApiResponse.paginated(
        items=validated, 
        total_items=total, 
        params=params,
        message="Transactions retrieved successfully."
    )