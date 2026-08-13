import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_db
from app.models.product import Product
from app.schemas.product import ProductListResponse, ProductRead
from app.utils.pagination import clamp_page_size, offset_for

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    category_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    page_size = clamp_page_size(page_size)

    stmt = (
        select(Product)
        .where(Product.is_active.is_(True))
        .options(selectinload(Product.images), selectinload(Product.category))
    )
    count_stmt = select(func.count()).select_from(Product).where(Product.is_active.is_(True))

    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Product.title.ilike(pattern))
        count_stmt = count_stmt.where(Product.title.ilike(pattern))

    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
        count_stmt = count_stmt.where(Product.category_id == category_id)

    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Product.created_at.desc()).offset(offset_for(page, page_size)).limit(page_size)
    products = (await db.execute(stmt)).scalars().all()

    return ProductListResponse(
        items=[ProductRead.model_validate(p) for p in products], total=total, page=page, page_size=page_size
    )


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> ProductRead:
    stmt = (
        select(Product)
        .where(Product.id == product_id, Product.is_active.is_(True))
        .options(selectinload(Product.images), selectinload(Product.category))
    )
    product = (await db.execute(stmt)).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return ProductRead.model_validate(product)
