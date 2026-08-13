import re
import secrets
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_db
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.promo_code import PromoCode
from app.schemas.order import PHONE_REGEX, OrderCreate, OrderRead
from app.services.order_ref import generate_order_ref
from app.services.promo import PromoValidationError, calculate_discount, validate_promo_eligibility

router = APIRouter(prefix="/api/orders", tags=["orders"])

MAX_ORDER_REF_ATTEMPTS = 5
ORDER_NOT_FOUND_DETAIL = "Commande introuvable. Vérifiez la référence et le numéro de téléphone."


async def _generate_unique_order_ref(db: AsyncSession) -> str:
    for attempt in range(MAX_ORDER_REF_ATTEMPTS):
        candidate = generate_order_ref()
        exists = (await db.execute(select(Order.id).where(Order.order_ref == candidate))).scalar_one_or_none()
        if exists is None:
            return candidate
    raise HTTPException(status_code=500, detail="Impossible de générer une référence de commande unique")


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_order(payload: OrderCreate, db: AsyncSession = Depends(get_db)) -> OrderRead:
    product_ids = [item.product_id for item in payload.items]

    stmt = select(Product).where(Product.id.in_(product_ids), Product.is_active.is_(True)).with_for_update()
    products = {p.id: p for p in (await db.execute(stmt)).scalars().all()}

    missing = [str(pid) for pid in product_ids if pid not in products]
    if missing:
        raise HTTPException(status_code=404, detail=f"Produit(s) introuvable(s): {', '.join(missing)}")

    subtotal = Decimal("0")
    order_items: list[OrderItem] = []
    for item in payload.items:
        product = products[item.product_id]
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stock insuffisant pour '{product.title}' (disponible: {product.stock_quantity})",
            )
        product.stock_quantity -= item.quantity
        subtotal += product.price * item.quantity
        order_items.append(OrderItem(product_id=product.id, quantity=item.quantity, unit_price=product.price))

    promo: PromoCode | None = None
    discount_amount = Decimal("0")
    if payload.promo_code:
        promo_stmt = select(PromoCode).where(PromoCode.code == payload.promo_code.strip().upper()).with_for_update()
        promo = (await db.execute(promo_stmt)).scalar_one_or_none()
        if promo is None:
            raise HTTPException(status_code=404, detail="Code promo introuvable.")
        try:
            validate_promo_eligibility(promo, subtotal)
        except PromoValidationError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
        discount_amount = calculate_discount(promo, subtotal)
        promo.usage_count += 1

    order_ref = await _generate_unique_order_ref(db)

    order = Order(
        id=uuid.uuid4(),
        order_ref=order_ref,
        customer_name=payload.customer_name,
        phone_number=payload.phone_number,
        address_text=payload.address_text,
        latitude=payload.latitude,
        longitude=payload.longitude,
        total_amount=subtotal - discount_amount,
        promo_code_id=promo.id if promo else None,
        promo_code=promo.code if promo else None,
        discount_amount=discount_amount,
        items=order_items,
    )
    db.add(order)
    await db.commit()

    stmt = (
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items))
        .execution_options(populate_existing=True)
    )
    order = (await db.execute(stmt)).scalar_one()
    return OrderRead.model_validate(order)


@router.get("/track", response_model=OrderRead)
async def track_order(
    ref: str = Query(min_length=1), phone: str = Query(min_length=1), db: AsyncSession = Depends(get_db)
) -> OrderRead:
    normalized_phone = re.sub(r"[\s-]", "", phone)
    if not PHONE_REGEX.match(normalized_phone):
        raise HTTPException(status_code=404, detail=ORDER_NOT_FOUND_DETAIL)

    stmt = select(Order).where(Order.order_ref == ref.strip().upper()).options(selectinload(Order.items))
    order = (await db.execute(stmt)).scalar_one_or_none()

    # Identical generic error whether the reference is unknown or the phone doesn't match —
    # never reveal which one was wrong, to prevent order_ref enumeration/guessing.
    if order is None or not secrets.compare_digest(order.phone_number, normalized_phone):
        raise HTTPException(status_code=404, detail=ORDER_NOT_FOUND_DETAIL)

    return OrderRead.model_validate(order)
