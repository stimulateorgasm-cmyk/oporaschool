from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.academic import Teacher
from app.models.enums import TeacherStatus

router = APIRouter(prefix="/public", tags=["Публичный API (сайт)"])


def _photo_url(photo_path: Optional[str]) -> Optional[str]:
    if not photo_path:
        return None
    return f"{settings.PUBLIC_BASE_URL}{settings.API_V1_STR}/uploads/{photo_path}"


@router.get("/teachers", summary="Публичный список педагогов для сайта")
async def public_teachers(request: Request, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Teacher)
        .where(Teacher.deleted_at.is_(None), Teacher.status == TeacherStatus.active)
        .options(selectinload(Teacher.subjects))
        .order_by(Teacher.full_name)
    )
    result = await db.execute(stmt)
    teachers = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "name": t.full_name,
            "photo_url": _photo_url(t.photo_path),
            "bio": t.comment,
            "subjects": [s.name for s in t.subjects],
        }
        for t in teachers
    ]
