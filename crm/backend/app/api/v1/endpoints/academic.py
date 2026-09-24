import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.academic import ChildSubject, Subject, Teacher, TeacherSubject
from app.models.auth import User
from app.schemas.academic import SubjectCreate, SubjectRead, SubjectUpdate

router = APIRouter(prefix="/academic", tags=["Предметы"])


async def _subject_read(db: AsyncSession, subject: Subject) -> SubjectRead:
    """Собирает SubjectRead с количеством педагогов и учеников."""
    teachers_count = (
        await db.execute(
            select(func.count(TeacherSubject.teacher_id)).where(
                TeacherSubject.subject_id == subject.id
            )
        )
    ).scalar_one()
    children_count = (
        await db.execute(
            select(func.count(func.distinct(ChildSubject.child_id))).where(
                ChildSubject.subject_id == subject.id,
                ChildSubject.is_active == True,
            )
        )
    ).scalar_one()
    return SubjectRead(
        id=subject.id,
        name=subject.name,
        code=subject.code,
        description=subject.description,
        is_active=subject.is_active,
        created_at=subject.created_at,
        teachers_count=teachers_count,
        children_count=children_count,
    )


@router.get("/subjects", response_model=List[SubjectRead], summary="Список направлений")
async def get_subjects(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Subject)
    if not include_inactive:
        stmt = stmt.where(Subject.is_active == True)
    stmt = stmt.order_by(Subject.name)
    result = await db.execute(stmt)
    subjects = result.scalars().all()
    return [await _subject_read(db, s) for s in subjects]


@router.post("/subjects", response_model=SubjectRead, summary="Создать направление (Руководитель)")
async def create_subject(
    data: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    exists = (
        await db.execute(select(Subject).where(Subject.name == data.name))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Направление с таким названием уже существует")

    subject = Subject(
        name=data.name,
        code=data.code,
        description=data.description,
        is_active=data.is_active,
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return await _subject_read(db, subject)


@router.patch("/subjects/{subject_id}", response_model=SubjectRead, summary="Переименовать/архивировать направление (Руководитель)")
async def update_subject(
    subject_id: uuid.UUID,
    data: SubjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Направление не найдено")

    if data.name is not None and data.name != subject.name:
        exists = (
            await db.execute(select(Subject).where(Subject.name == data.name, Subject.id != subject_id))
        ).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Направление с таким названием уже существует")
        subject.name = data.name
    if data.code is not None:
        subject.code = data.code
    if data.description is not None:
        subject.description = data.description
    if data.is_active is not None:
        subject.is_active = data.is_active

    await db.commit()
    await db.refresh(subject)
    return await _subject_read(db, subject)


@router.get("/subjects/{subject_id}/teachers", response_model=List[dict], summary="Педагоги направления")
async def get_subject_teachers(
    subject_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Направление не найдено")

    stmt = (
        select(Teacher)
        .join(TeacherSubject, TeacherSubject.teacher_id == Teacher.id)
        .where(TeacherSubject.subject_id == subject_id, Teacher.deleted_at.is_(None))
        .options(selectinload(Teacher.subjects))
        .order_by(Teacher.full_name)
    )
    teachers = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": t.id,
            "full_name": t.full_name,
            "phone": t.phone,
            "status": t.status,
        }
        for t in teachers
    ]


@router.get("/subjects/{subject_id}/children", response_model=List[dict], summary="Ученики направления")
async def get_subject_children(
    subject_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Направление не найдено")

    stmt = (
        select(ChildSubject)
        .where(ChildSubject.subject_id == subject_id, ChildSubject.is_active == True)
        .options(
            selectinload(ChildSubject.child),
            selectinload(ChildSubject.teacher),
        )
        .order_by(ChildSubject.created_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()

    seen = set()
    children = []
    for cs in rows:
        if cs.child is None or cs.child.id in seen:
            continue
        seen.add(cs.child.id)
        children.append(
            {
                "id": cs.child.id,
                "full_name": cs.child.full_name,
                "grade": cs.child.grade,
                "teacher_name": cs.teacher.full_name if cs.teacher else None,
            }
        )
    return children
