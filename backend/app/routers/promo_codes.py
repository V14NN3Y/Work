from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.promo_code import PromoCode
from app.schemas.promo_code import PromoValidateRequest, PromoValidateResponse
from app.services.promo import PromoValidationError, calculate_discount, validate_promo_eligibility

router = APIRouter(prefix="/api/promo-codes", tags=["promo-codes"])


@router.post("/validate", response_model=PromoValidateResponse)
async def validate_promo_code(
    payload: PromoValidateRequest, db: AsyncSession = Depends(get_db)
) -> PromoValidateResponse:
    stmt = select(PromoCode).where(PromoCode.code == payload.code.strip().upper())
    promo = (await db.execute(stmt)).scalar_one_or_none()
    if promo is None:
        return PromoValidateResponse(valid=False, message="Code promo introuvable.")

    try:
        validate_promo_eligibility(promo, payload.subtotal)
    except PromoValidationError as exc:
        return PromoValidateResponse(valid=False, message=exc.message)

    discount_amount = calculate_discount(promo, payload.subtotal)
    return PromoValidateResponse(valid=True, discount_amount=discount_amount)
