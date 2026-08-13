import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_admin, get_db
from app.models.promo_code import PromoCode
from app.schemas.promo_code import PromoCodeCreate, PromoCodeListResponse, PromoCodeRead, PromoCodeUpdate

router = APIRouter(
    prefix="/api/admin/promo-codes", tags=["admin-promo-codes"], dependencies=[Depends(get_current_admin)]
)

DUPLICATE_CODE_DETAIL = "Un code promo porte déjà ce nom"


async def _get_promo_or_404(promo_id: uuid.UUID, db: AsyncSession) -> PromoCode:
    promo = await db.get(PromoCode, promo_id)
    if promo is None:
        raise HTTPException(status_code=404, detail="Code promo introuvable")
    return promo


@router.get("", response_model=PromoCodeListResponse)
async def list_promo_codes(db: AsyncSession = Depends(get_db)) -> PromoCodeListResponse:
    stmt = select(PromoCode).order_by(PromoCode.created_at.desc())
    promos = (await db.execute(stmt)).scalars().all()
    return PromoCodeListResponse(items=[PromoCodeRead.model_validate(p) for p in promos])


@router.post("", response_model=PromoCodeRead, status_code=status.HTTP_201_CREATED)
async def create_promo_code(payload: PromoCodeCreate, db: AsyncSession = Depends(get_db)) -> PromoCodeRead:
    data = payload.model_dump()
    data["code"] = data["code"].strip().upper()
    promo = PromoCode(**data)
    db.add(promo)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE_CODE_DETAIL)
    await db.refresh(promo)
    return PromoCodeRead.model_validate(promo)


@router.patch("/{promo_id}", response_model=PromoCodeRead)
async def update_promo_code(
    promo_id: uuid.UUID, payload: PromoCodeUpdate, db: AsyncSession = Depends(get_db)
) -> PromoCodeRead:
    promo = await _get_promo_or_404(promo_id, db)
    updates = payload.model_dump(exclude_unset=True)
    if "code" in updates:
        updates["code"] = updates["code"].strip().upper()
    for field, value in updates.items():
        setattr(promo, field, value)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE_CODE_DETAIL)
    await db.refresh(promo)
    return PromoCodeRead.model_validate(promo)


@router.delete("/{promo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_promo_code(promo_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> None:
    promo = await _get_promo_or_404(promo_id, db)
    if promo.usage_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce code promo a déjà été utilisé et ne peut pas être supprimé. Désactivez-le à la place.",
        )
    await db.delete(promo)
    await db.commit()
