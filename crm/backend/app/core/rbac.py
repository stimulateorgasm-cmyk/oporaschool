import uuid
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.core.database import get_db
from app.models.auth import Role, User
from app.models.enums import UserStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = (
        select(User)
        .where(User.id == uuid.UUID(user_id), User.deleted_at.is_(None))
        .options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.teacher_profile),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь заблокирован или неактивен",
        )
    return user


def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = [role.code for role in current_user.roles]
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав. Требуются роли: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


def require_permissions(required_permissions: List[str]):
    async def permission_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_permissions = set()
        for role in current_user.roles:
            for perm in role.permissions:
                user_permissions.add(perm.code)

        # Manager has full access
        user_roles = [role.code for role in current_user.roles]
        if "manager" in user_roles:
            return current_user

        if not all(p in user_permissions for p in required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Отсутствуют необходимые разрешения: {', '.join(required_permissions)}",
            )
        return current_user

    return permission_checker
