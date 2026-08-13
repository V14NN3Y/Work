from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.deps import get_current_admin, get_db
from app.models.admin import Admin
from app.schemas.auth import AdminCredentialsUpdate, LoginRequest, TokenResponse
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    admin = (await db.execute(select(Admin).where(Admin.username == payload.username))).scalar_one_or_none()
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")

    token = create_access_token(subject=admin.username)
    return TokenResponse(access_token=token, expires_in=settings.jwt_expire_minutes * 60)


@router.patch("/credentials", response_model=TokenResponse)
async def update_credentials(
    payload: AdminCredentialsUpdate,
    current_username: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    admin = (await db.execute(select(Admin).where(Admin.username == current_username))).scalar_one_or_none()
    if admin is None or not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mot de passe actuel incorrect")

    if payload.new_username:
        admin.username = payload.new_username
    if payload.new_password:
        admin.password_hash = hash_password(payload.new_password)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce nom d'utilisateur est déjà pris")
    await db.refresh(admin)

    # The username may have changed — issue a fresh token under the new identity rather than
    # leaving the caller's current token pointing at a `sub` that no longer matches.
    token = create_access_token(subject=admin.username)
    return TokenResponse(access_token=token, expires_in=settings.jwt_expire_minutes * 60)
