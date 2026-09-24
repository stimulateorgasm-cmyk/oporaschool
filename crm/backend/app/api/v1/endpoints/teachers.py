import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.academic import Subject, Teacher, TeacherSubject
from app.models.auth import User
from app.models.finance import TeacherRate
from app.models.enums import TeacherStatus
from app.schemas.academic import (
    SubjectCreate,
    SubjectRead,
    TeacherCreate,
    TeacherRateCreate,
    TeacherRateRead,
    TeacherRead,
    TeacherUpdate,
)
from app.services.salary_service import SalaryService

router = APIRouter(prefix="/teachers", tags=["Педагоги и Предметы"])

PHOTO_EXT = {"image/jpeg": ".jpg", "image/png": ".png"}


async def _teacher_read(db: AsyncSession, t: Teacher) -> TeacherRead:
    accrued, paid, debt, overpayment = await SalaryService.calculate_teacher_balance(
        db, t.id
    )
    return TeacherRead(
        id=t.id,
        user_id=t.user_id,
        full_name=t.full_name,
        phone=t.phone,
        start_date=t.start_date,
        status=t.status,
        comment=t.comment,
        photo_url=t.photo_url,
        created_at=t.created_at,
        subjects=[SubjectRead.model_validate(s) for s in t.subjects],
        rates=[TeacherRateRead.model_validate(r) for r in t.rates],
        total_accrued=accrued,
        total_paid=paid,
        debt=debt,
        overpayment=overpayment,
    )


@router.get("", response_model=List[TeacherRead], summary="Список педагогов")
async def get_teachers(
    status: Optional[TeacherStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # If teacher role, only allow own profile if requested
    user_roles = [r.code for r in current_user.roles]
    query = (
        select(Teacher)
        .where(Teacher.deleted_at.is_(None))
        .options(selectinload(Teacher.subjects), selectinload(Teacher.rates))
    )

    if "teacher" in user_roles and "manager" not in user_roles and "administrator" not in user_roles:
        query = query.where(Teacher.user_id == current_user.id)
    elif status:
        query = query.where(Teacher.status == status)

    result = await db.execute(query)
    teachers = result.scalars().all()

    response = []
    for t in teachers:
        response.append(await _teacher_read(db, t))
    return response


@router.post("", response_model=TeacherRead, summary="Создание педагога (Руководитель)")
async def create_teacher(
    data: TeacherCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    teacher = Teacher(
        user_id=data.user_id,
        full_name=data.full_name,
        phone=data.phone,
        start_date=data.start_date,
        status=data.status,
        comment=data.comment,
    )
    db.add(teacher)
    await db.flush()

    for s_id in data.subject_ids:
        ts = TeacherSubject(teacher_id=teacher.id, subject_id=s_id)
        db.add(ts)

    if data.initial_rates:
        for r in data.initial_rates:
            rate = TeacherRate(
                teacher_id=teacher.id,
                subject_id=r.subject_id,
                lesson_format=r.lesson_format,
                amount=r.amount,
                valid_from=r.valid_from,
                valid_until=r.valid_until,
                created_by=current_user.id,
            )
            db.add(rate)

    await db.commit()
    await db.refresh(teacher)
    return await get_teachers(status=None, db=db, current_user=current_user)


@router.post("/{teacher_id}/rates", response_model=TeacherRateRead, summary="Добавить ставку педагога (Руководитель)")
async def add_teacher_rate(
    teacher_id: uuid.UUID,
    data: TeacherRateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    teacher = await db.get(Teacher, teacher_id)
    if not teacher or teacher.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Педагог не найден")

    rate = TeacherRate(
        teacher_id=teacher_id,
        subject_id=data.subject_id,
        lesson_format=data.lesson_format,
        amount=data.amount,
        valid_from=data.valid_from,
        valid_until=data.valid_until,
        created_by=current_user.id,
    )
    db.add(rate)
    await db.commit()
    await db.refresh(rate)
    return rate


@router.patch("/{teacher_id}", response_model=TeacherRead, summary="Обновить педагога (Руководитель)")
async def update_teacher(
    teacher_id: uuid.UUID,
    data: TeacherUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    teacher = await db.get(Teacher, teacher_id)
    if not teacher or teacher.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Педагог не найден")

    payload = data.model_dump(exclude_unset=True)
    subject_ids = payload.pop("subject_ids", None)

    for field, value in payload.items():
        setattr(teacher, field, value)

    if subject_ids is not None:
        await db.execute(delete(TeacherSubject).where(TeacherSubject.teacher_id == teacher_id))
        for s_id in subject_ids:
            db.add(TeacherSubject(teacher_id=teacher_id, subject_id=s_id))

    await db.commit()

    # Перечитываем с загруженными направлениями и ставками
    stmt = (
        select(Teacher)
        .where(Teacher.id == teacher_id)
        .options(selectinload(Teacher.subjects), selectinload(Teacher.rates))
    )
    teacher = (await db.execute(stmt)).scalar_one()
    return await _teacher_read(db, teacher)


@router.post("/{teacher_id}/photo", response_model=TeacherRead, summary="Загрузить фото педагога (Руководитель)")
async def upload_teacher_photo(
    teacher_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    teacher = await db.get(Teacher, teacher_id)
    if not teacher or teacher.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Педагог не найден")

    if file.content_type not in PHOTO_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Фото должно быть в формате JPEG или PNG",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой. Максимум {settings.MAX_UPLOAD_SIZE_MB} МБ",
        )
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл пустой")

    filename = f"{uuid.uuid4()}{PHOTO_EXT[file.content_type]}"
    rel_path = f"teachers/{filename}"
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "teachers"), exist_ok=True)
    with open(os.path.join(settings.UPLOAD_DIR, rel_path), "wb") as f:
        f.write(content)

    teacher.photo_path = rel_path
    await db.commit()

    stmt = (
        select(Teacher)
        .where(Teacher.id == teacher_id)
        .options(selectinload(Teacher.subjects), selectinload(Teacher.rates))
    )
    teacher = (await db.execute(stmt)).scalar_one()
    return await _teacher_read(db, teacher)


@router.delete("/{teacher_id}/rates/{rate_id}", summary="Удалить ставку педагога (Руководитель)")
async def delete_teacher_rate(
    teacher_id: uuid.UUID,
    rate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    rate = await db.get(TeacherRate, rate_id)
    if not rate or rate.teacher_id != teacher_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ставка не найдена")

    await db.delete(rate)
    await db.commit()
    return {"status": "success", "message": "Ставка удалена"}
