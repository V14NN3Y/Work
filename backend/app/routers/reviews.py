import re
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_db
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.review import Review, ReviewStatus
from app.schemas.order import PHONE_REGEX
from app.schemas.review import ReviewCreate, ReviewListResponse, ReviewRead
from app.utils.pagination import clamp_page_size, offset_for

router = APIRouter(prefix="/api", tags=["reviews"])

ORDER_NOT_FOUND_DETAIL = "Commande introuvable. Vérifiez la référence et le numéro de téléphone."
NOT_ELIGIBLE_DETAIL = "Vous ne pouvez laisser un avis que pour un produit reçu (commande terminée)."


@router.post("/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(payload: ReviewCreate, db: AsyncSession = Depends(get_db)) -> ReviewRead:
    product = await db.get(Product, payload.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    normalized_phone = re.sub(r"[\s-]", "", payload.phone_number)
    if not PHONE_REGEX.match(normalized_phone):
        raise HTTPException(status_code=404, detail=ORDER_NOT_FOUND_DETAIL)

    stmt = (
        select(Order)
        .where(Order.order_ref == payload.order_ref.strip().upper())
        .options(selectinload(Order.items))
    )
    order = (await db.execute(stmt)).scalar_one_or_none()

    if order is None or not secrets.compare_digest(order.phone_number, normalized_phone):
        raise HTTPException(status_code=404, detail=ORDER_NOT_FOUND_DETAIL)

    owns_product = any(item.product_id == payload.product_id for item in order.items)
    if order.status != OrderStatus.completed or not owns_product:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=NOT_ELIGIBLE_DETAIL)

    review = Review(
        product_id=payload.product_id,
        order_id=order.id,
        customer_name=order.customer_name,
        rating=payload.rating,
        comment=payload.comment,
        status=ReviewStatus.pending,
    )
    db.add(review)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vous avez déjà laissé un avis pour ce produit avec cette commande.")
    await db.refresh(review)
    return ReviewRead.model_validate(review)


@router.get("/products/{product_id}/reviews", response_model=ReviewListResponse)
async def list_product_reviews(
    product_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> ReviewListResponse:
    page_size = clamp_page_size(page_size)

    base_filter = (Review.product_id == product_id, Review.status == ReviewStatus.approved)

    agg_stmt = select(func.count(), func.avg(Review.rating)).select_from(Review).where(*base_filter)
    total, average_rating = (await db.execute(agg_stmt)).one()

    stmt = (
        select(Review)
        .where(*base_filter)
        .order_by(Review.created_at.desc())
        .offset(offset_for(page, page_size))
        .limit(page_size)
    )
    reviews = (await db.execute(stmt)).scalars().all()

    return ReviewListResponse(
        items=[ReviewRead.model_validate(r) for r in reviews],
        total=total,
        average_rating=round(float(average_rating), 1) if average_rating is not None else None,
        page=page,
        page_size=page_size,
    )
