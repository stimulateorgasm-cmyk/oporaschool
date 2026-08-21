from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import get_current_user
from app.models.academic import Subject
from app.models.auth import User
from app.schemas.academic import SubjectRead

router = APIRouter(prefix="/academic", tags=["Предметы"])


@router.get("/subjects", response_model=List[SubjectRead], summary="Список предметов")
async def get_subjects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Subject).where(Subject.is_active == True).order_by(Subject.name)
    result = await db.execute(stmt)
    return result.scalars().all()
