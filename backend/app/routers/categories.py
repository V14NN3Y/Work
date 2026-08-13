from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.models.category import Category
from app.schemas.category import CategoryListResponse, CategoryRead

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=CategoryListResponse)
async def list_categories(db: AsyncSession = Depends(get_db)) -> CategoryListResponse:
    stmt = select(Category).order_by(Category.name)
    categories = (await db.execute(stmt)).scalars().all()
    return CategoryListResponse(items=[CategoryRead.model_validate(c) for c in categories])
