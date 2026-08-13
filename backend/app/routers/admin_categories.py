import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_admin, get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryListResponse, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/api/admin/categories", tags=["admin-categories"], dependencies=[Depends(get_current_admin)])


async def _get_category_or_404(category_id: uuid.UUID, db: AsyncSession) -> Category:
    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    return category


@router.get("", response_model=CategoryListResponse)
async def list_categories(db: AsyncSession = Depends(get_db)) -> CategoryListResponse:
    stmt = select(Category).order_by(Category.name)
    categories = (await db.execute(stmt)).scalars().all()
    return CategoryListResponse(items=[CategoryRead.model_validate(c) for c in categories])


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate, db: AsyncSession = Depends(get_db)) -> CategoryRead:
    category = Category(name=payload.name)
    db.add(category)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Une catégorie porte déjà ce nom")
    await db.refresh(category)
    return CategoryRead.model_validate(category)


@router.patch("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: uuid.UUID, payload: CategoryUpdate, db: AsyncSession = Depends(get_db)
) -> CategoryRead:
    category = await _get_category_or_404(category_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Une catégorie porte déjà ce nom")
    await db.refresh(category)
    return CategoryRead.model_validate(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    category = await _get_category_or_404(category_id, db)
    # ON DELETE SET NULL on products.category_id — products in this category simply become
    # uncategorized, no ordered-product-style block needed (unlike product deletion).
    await db.delete(category)
    await db.commit()
