import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_current_admin, get_db
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.product_image import ProductImage
from app.schemas.product import (
    ImageReorderItem,
    ProductCreate,
    ProductImageRead,
    ProductListResponse,
    ProductRead,
    ProductUpdate,
)
from app.services.image_storage import delete_product_image, save_product_image
from app.utils.pagination import clamp_page_size, offset_for

router = APIRouter(prefix="/api/admin/products", tags=["admin-products"], dependencies=[Depends(get_current_admin)])


async def _get_product_or_404(product_id: uuid.UUID, db: AsyncSession) -> Product:
    stmt = (
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.images), selectinload(Product.category))
    )
    product = (await db.execute(stmt)).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return product


@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    category_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    page_size = clamp_page_size(page_size)

    stmt = select(Product).options(selectinload(Product.images), selectinload(Product.category))
    count_stmt = select(func.count()).select_from(Product)

    if not include_inactive:
        stmt = stmt.where(Product.is_active.is_(True))
        count_stmt = count_stmt.where(Product.is_active.is_(True))

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
    product = await _get_product_or_404(product_id, db)
    return ProductRead.model_validate(product)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db)) -> ProductRead:
    product = Product(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product, attribute_names=["images", "category"])
    return ProductRead.model_validate(product)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: uuid.UUID, payload: ProductUpdate, db: AsyncSession = Depends(get_db)
) -> ProductRead:
    product = await _get_product_or_404(product_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product, attribute_names=["images", "category"])
    return ProductRead.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    product = await _get_product_or_404(product_id, db)

    ordered_count = (
        await db.execute(select(func.count()).select_from(OrderItem).where(OrderItem.product_id == product_id))
    ).scalar_one()
    if ordered_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce produit a déjà été commandé et ne peut pas être supprimé définitivement. Archivez-le (is_active=false) à la place.",
        )

    for image in product.images:
        delete_product_image(image.image_url)

    await db.delete(product)
    await db.commit()


@router.post("/{product_id}/images", response_model=list[ProductImageRead])
async def upload_product_images(
    product_id: uuid.UUID, files: list[UploadFile], db: AsyncSession = Depends(get_db)
) -> list[ProductImageRead]:
    product = await _get_product_or_404(product_id, db)

    max_order = max((img.display_order for img in product.images), default=-1)
    for offset, file in enumerate(files, start=1):
        url = await save_product_image(file)
        db.add(ProductImage(product_id=product.id, image_url=url, display_order=max_order + offset))

    await db.commit()
    await db.refresh(product, attribute_names=["images"])
    return [ProductImageRead.model_validate(img) for img in product.images]


@router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_image_route(
    product_id: uuid.UUID, image_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> None:
    stmt = select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id)
    image = (await db.execute(stmt)).scalar_one_or_none()
    if image is None:
        raise HTTPException(status_code=404, detail="Image introuvable")

    delete_product_image(image.image_url)
    await db.delete(image)
    await db.commit()


@router.patch("/{product_id}/images/reorder", response_model=list[ProductImageRead])
async def reorder_product_images(
    product_id: uuid.UUID, payload: list[ImageReorderItem], db: AsyncSession = Depends(get_db)
) -> list[ProductImageRead]:
    product = await _get_product_or_404(product_id, db)
    images_by_id = {img.id: img for img in product.images}

    for item in payload:
        image = images_by_id.get(item.id)
        if image is None:
            raise HTTPException(status_code=404, detail=f"Image {item.id} introuvable pour ce produit")
        image.display_order = item.display_order

    await db.commit()
    await db.refresh(product, attribute_names=["images"])
    return [ProductImageRead.model_validate(img) for img in product.images]
