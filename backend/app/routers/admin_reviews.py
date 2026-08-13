import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_current_admin, get_db
from app.models.review import Review, ReviewStatus
from app.schemas.review import ReviewAdminListResponse, ReviewAdminRead, ReviewModerate
from app.utils.pagination import clamp_page_size, offset_for

router = APIRouter(prefix="/api/admin/reviews", tags=["admin-reviews"], dependencies=[Depends(get_current_admin)])


def _to_admin_read(review: Review) -> ReviewAdminRead:
    return ReviewAdminRead(
        id=review.id,
        product_id=review.product_id,
        product_title=review.product.title,
        order_id=review.order_id,
        customer_name=review.customer_name,
        rating=review.rating,
        comment=review.comment,
        status=review.status,
        created_at=review.created_at,
        moderated_at=review.moderated_at,
    )


@router.get("", response_model=ReviewAdminListResponse)
async def list_reviews(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: ReviewStatus | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
) -> ReviewAdminListResponse:
    page_size = clamp_page_size(page_size)

    stmt = select(Review).options(selectinload(Review.product))
    count_stmt = select(func.count()).select_from(Review)

    if status_filter is not None:
        stmt = stmt.where(Review.status == status_filter)
        count_stmt = count_stmt.where(Review.status == status_filter)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Review.created_at.desc()).offset(offset_for(page, page_size)).limit(page_size)
    reviews = (await db.execute(stmt)).scalars().all()

    return ReviewAdminListResponse(
        items=[_to_admin_read(r) for r in reviews], total=total, page=page, page_size=page_size
    )


@router.patch("/{review_id}/moderate", response_model=ReviewAdminRead)
async def moderate_review(
    review_id: uuid.UUID, payload: ReviewModerate, db: AsyncSession = Depends(get_db)
) -> ReviewAdminRead:
    stmt = select(Review).where(Review.id == review_id).options(selectinload(Review.product))
    review = (await db.execute(stmt)).scalar_one_or_none()
    if review is None:
        raise HTTPException(status_code=404, detail="Avis introuvable")

    review.status = payload.status
    review.moderated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(review, attribute_names=["status", "moderated_at"])
    return _to_admin_read(review)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(review_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    review = await db.get(Review, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Avis introuvable")
    await db.delete(review)
    await db.commit()
