from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, delete, func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.pagination import PaginationParams
from app.modules.coupon.models import Coupon
from app.modules.labtest.models import LabTest # Imported to verify prices
from app.modules.coupon.schemas import CouponCreateRequest, CouponValidateResponse
from app.modules.coupon.exceptions import CouponNotFoundError, CouponValidationError, CouponError

class CouponService:
    async def create_coupon(self, db: AsyncSession, data: CouponCreateRequest) -> Coupon:
        try:
            dump_data = data.model_dump()
            dump_data["code"] = dump_data["code"].upper()
            
            coupon = Coupon(**dump_data)
            db.add(coupon)
            await db.commit()
            await db.refresh(coupon)
            return coupon
        except IntegrityError:
            await db.rollback()
            raise CouponError("A coupon with this code already exists.")

    async def list_coupons(self, db: AsyncSession, params: PaginationParams) -> tuple[list[Coupon], int]:
        query = select(Coupon)
        count_query = select(func.count()).select_from(Coupon)

        total_count = (await db.execute(count_query)).scalar() or 0
        query = query.order_by(Coupon.created_at.desc()).offset(params.offset).limit(params.limit)
        items = (await db.execute(query)).scalars().all()

        return list(items), total_count

    async def delete_coupon(self, db: AsyncSession, coupon_id: UUID) -> None:
        stmt = delete(Coupon).where(Coupon.id == coupon_id)
        result = await db.execute(stmt)
        if result.rowcount == 0:
            raise CouponNotFoundError()
        await db.commit()

    async def update_coupon(self, db: AsyncSession, coupon_id: UUID, data: dict) -> Coupon:
        # If no data was sent, just return the existing coupon
        if not data:
            coupon = (await db.execute(select(Coupon).where(Coupon.id == coupon_id))).scalar_one_or_none()
            if not coupon:
                raise CouponNotFoundError()
            return coupon

        # Force uppercase if they are updating the code
        if "code" in data and data["code"]:
            data["code"] = data["code"].upper()

        try:
            stmt = (
                update(Coupon)
                .where(Coupon.id == coupon_id)
                .values(**data)
                .returning(Coupon)
            )
            result = await db.execute(stmt)
            updated_coupon = result.scalar_one_or_none()

            if not updated_coupon:
                raise CouponNotFoundError()

            await db.commit()
            return updated_coupon

        except IntegrityError:
            await db.rollback()
            raise CouponError("Another coupon with this code already exists.")

    async def validate_coupon(self, db: AsyncSession, code: str, lab_test_id: UUID) -> CouponValidateResponse:
        code_upper = code.upper()
        
        # 1. Fetch Coupon
        coupon = (await db.execute(select(Coupon).where(Coupon.code == code_upper))).scalar_one_or_none()
        if not coupon:
            raise CouponValidationError("Coupon code does not exist.")
        if not coupon.is_active:
            raise CouponValidationError("This coupon is no longer active.")
        if coupon.valid_until and coupon.valid_until < datetime.now(timezone.utc):
            raise CouponValidationError("This coupon has expired.")

        # 2. Fetch Lab Test to verify eligibility and get price
        lab_test = (await db.execute(select(LabTest).where(LabTest.id == lab_test_id))).scalar_one_or_none()
        if not lab_test:
            raise CouponValidationError("Lab test not found.")

        # 3. Check Restrictions
        if coupon.lab_test_id and coupon.lab_test_id != lab_test.id:
            raise CouponValidationError("This coupon is not valid for this specific test.")
        if coupon.category_id and coupon.category_id != lab_test.category_id:
            raise CouponValidationError("This coupon is not valid for this category of tests.")

        # 4. Calculate Prices
        original_price = lab_test.price
        discount_amount = (original_price * coupon.discount_percentage) / 100
        final_price = max(0, original_price - discount_amount) # Prevents negative prices

        return CouponValidateResponse(
            is_valid=True,
            message="Coupon applied successfully!",
            original_price=original_price,
            discount_percentage=coupon.discount_percentage,
            discount_amount=round(discount_amount, 2),
            final_price=round(final_price, 2)
        )