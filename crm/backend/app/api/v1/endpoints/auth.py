import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.models.auth import RefreshToken, Role, User, UserRole
from app.models.enums import UserStatus
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    Token,
    UserCreate,
    UserRead,
    UserUpdate,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Аутентификация и пользователи"])


@router.post("/login", response_model=Token, summary="Авторизация пользователя")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(User)
        .where(User.phone == data.phone, User.deleted_at.is_(None))
        .options(selectinload(User.roles))
    )
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный номер телефона или пароль",
        )
    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Учетная запись заблокирована",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Save refresh token hash
    rt_entry = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token[-32:],  # store slice/hash
        expires_at=datetime_now_plus_days(settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt_entry)
    await db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def datetime_now_plus_days(days: int):
    from datetime import datetime, timedelta, timezone
    return datetime.now(timezone.utc) + timedelta(days=days)


@router.get("/me", response_model=UserRead, summary="Текущий профиль пользователя")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=List[UserRead], summary="Список пользователей (Руководитель/Администратор)")
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager", "administrator"])),
):
    stmt = (
        select(User)
        .where(User.deleted_at.is_(None))
        .options(selectinload(User.roles))
        .order_by(User.full_name)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/users", response_model=UserRead, summary="Создание пользователя (только Руководитель)")
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    existing = (
        await db.execute(select(User).where(User.phone == data.phone))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким номером телефона уже существует",
        )

    user = User(
        full_name=data.full_name,
        phone=data.phone,
        email=data.email,
        password_hash=get_password_hash(data.password),
        status=data.status,
    )
    db.add(user)
    await db.flush()

    for r_code in data.role_codes:
        role = (
            await db.execute(select(Role).where(Role.code == r_code))
        ).scalar_one_or_none()
        if role:
            ur = UserRole(user_id=user.id, role_id=role.id, assigned_by=current_user.id)
            db.add(ur)

    await db.commit()
    await db.refresh(user)
    return user
