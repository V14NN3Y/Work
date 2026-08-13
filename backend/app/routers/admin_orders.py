import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_current_admin, get_db
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.schemas.order import OrderListResponse, OrderRead, OrderStatusUpdate
from app.utils.pagination import clamp_page_size, offset_for

router = APIRouter(prefix="/api/admin/orders", tags=["admin-orders"], dependencies=[Depends(get_current_admin)])


@router.get("", response_model=OrderListResponse)
async def list_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> OrderListResponse:
    page_size = clamp_page_size(page_size)

    stmt = select(Order).options(selectinload(Order.items))
    count_stmt = select(func.count()).select_from(Order)

    if status_filter is not None:
        stmt = stmt.where(Order.status == status_filter)
        count_stmt = count_stmt.where(Order.status == status_filter)
    if date_from is not None:
        stmt = stmt.where(Order.created_at >= date_from)
        count_stmt = count_stmt.where(Order.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Order.created_at <= date_to)
        count_stmt = count_stmt.where(Order.created_at <= date_to)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Order.created_at.desc()).offset(offset_for(page, page_size)).limit(page_size)
    orders = (await db.execute(stmt)).scalars().all()

    return OrderListResponse(
        items=[OrderRead.model_validate(o) for o in orders], total=total, page=page, page_size=page_size
    )


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> OrderRead:
    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    return OrderRead.model_validate(order)


@router.patch("/{order_id}/status", response_model=OrderRead)
async def update_order_status(
    order_id: uuid.UUID, payload: OrderStatusUpdate, db: AsyncSession = Depends(get_db)
) -> OrderRead:
    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    was_cancelled = order.status == OrderStatus.cancelled
    becomes_cancelled = payload.status == OrderStatus.cancelled

    if becomes_cancelled and not was_cancelled:
        product_ids = [item.product_id for item in order.items if item.product_id is not None]
        if product_ids:
            products = {
                p.id: p
                for p in (await db.execute(select(Product).where(Product.id.in_(product_ids)).with_for_update())).scalars()
            }
            for item in order.items:
                product = products.get(item.product_id)
                if product is not None:
                    product.stock_quantity += item.quantity

    order.status = payload.status
    await db.commit()
    await db.refresh(order, attribute_names=["items"])
    return OrderRead.model_validate(order)
