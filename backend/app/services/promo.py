from datetime import datetime, timezone
from decimal import Decimal

from app.models.promo_code import DiscountType, PromoCode


class PromoValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def validate_promo_eligibility(promo: PromoCode, subtotal: Decimal) -> None:
    now = datetime.now(timezone.utc)
    if not promo.is_active:
        raise PromoValidationError("Ce code promo n'est plus actif.")
    if promo.starts_at is not None and now < promo.starts_at:
        raise PromoValidationError("Ce code promo n'est pas encore valide.")
    if promo.expires_at is not None and now > promo.expires_at:
        raise PromoValidationError("Ce code promo a expiré.")
    if promo.usage_limit is not None and promo.usage_count >= promo.usage_limit:
        raise PromoValidationError("Ce code promo a atteint sa limite d'utilisation.")
    if promo.min_order_amount is not None and subtotal < promo.min_order_amount:
        raise PromoValidationError(f"Montant minimum de commande non atteint ({promo.min_order_amount} FCFA).")


def calculate_discount(promo: PromoCode, subtotal: Decimal) -> Decimal:
    if promo.discount_type == DiscountType.percentage:
        raw = (subtotal * promo.discount_value / Decimal("100")).quantize(Decimal("0.01"))
    else:
        raw = promo.discount_value

    if promo.max_discount_amount is not None:
        raw = min(raw, promo.max_discount_amount)

    return min(raw, subtotal)
