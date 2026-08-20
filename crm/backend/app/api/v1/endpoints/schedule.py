import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.academic import Teacher
from app.models.auth import User
from app.models.enums import AttendanceStatus, LessonStatus
from app.models.schedule import Lesson, Room
from app.schemas.schedule import (
    LessonAttendanceRequest,
    LessonCancelRequest,
    LessonCreate,
    LessonMoveRequest,
    LessonRead,
    RoomCreate,
    RoomRead,
)
from app.services.attendance_service import AttendanceService
from app.services.schedule_service import ScheduleService

router = APIRouter(prefix="/schedule", tags=["Расписание и Кабинеты"])


@router.get("/rooms", response_model=List[RoomRead], summary="Список кабинетов")
async def get_rooms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Room).where(Room.is_active == True).order_by(Room.number))
    return result.scalars().all()


@router.post("/rooms", response_model=RoomRead, summary="Добавить кабинет (Руководитель)")
async def create_room(
    data: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    room = Room(number=data.number, name=data.name, capacity=data.capacity, is_active=data.is_active)
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.get("/lessons", response_model=List[LessonRead], summary="Список занятий (календарь)")
async def get_lessons(
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    teacher_id: Optional[uuid.UUID] = None,
    child_id: Optional[uuid.UUID] = None,
    room_id: Optional[uuid.UUID] = None,
    status: Optional[LessonStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_roles = [r.code for r in current_user.roles]
    query = (
        select(Lesson)
        .where(Lesson.deleted_at.is_(None))
        .options(
            selectinload(Lesson.child),
            selectinload(Lesson.subject),
            selectinload(Lesson.teacher),
            selectinload(Lesson.room),
            selectinload(Lesson.history),
        )
    )

    # If teacher role and not admin/manager, filter by teacher's user_id
    if "teacher" in user_roles and "manager" not in user_roles and "administrator" not in user_roles:
        t_stmt = select(Teacher.id).where(Teacher.user_id == current_user.id)
        current_teacher_id = (await db.execute(t_stmt)).scalar_one_or_none()
        if current_teacher_id:
            query = query.where(Lesson.teacher_id == current_teacher_id)
        else:
            return []

    if from_date:
        query = query.where(Lesson.starts_at >= from_date)
    if to_date:
        query = query.where(Lesson.ends_at <= to_date)
    if teacher_id:
        query = query.where(Lesson.teacher_id == teacher_id)
    if child_id:
        query = query.where(Lesson.child_id == child_id)
    if room_id:
        query = query.where(Lesson.room_id == room_id)
    if status:
        query = query.where(Lesson.status == status)

    query = query.order_by(Lesson.starts_at.asc())
    result = await db.execute(query)
    lessons = result.scalars().all()

    return [
        LessonRead(
            id=l.id,
            child_subject_id=l.child_subject_id,
            child_id=l.child_id,
            child_name=l.child.full_name,
            parent_id=l.child.parent_id if l.child else None,
            subject_id=l.subject_id,
            subject_name=l.subject.name,
            teacher_id=l.teacher_id,
            teacher_name=l.teacher.full_name,
            room_id=l.room_id,
            room_name=l.room.name,
            starts_at=l.starts_at,
            ends_at=l.ends_at,
            status=l.status,
            attendance_status=l.attendance_status,
            payment_status=l.payment_status,
            lesson_format=l.lesson_format,
            client_price=l.client_price,
            teacher_rate_snapshot=l.teacher_rate_snapshot,
            comment=l.comment,
            created_at=l.created_at,
            history=[],
        )
        for l in lessons
    ]


@router.post("/lessons", response_model=LessonRead, summary="Создание занятия (с защитой от конфликтов)")
async def create_lesson(
    data: LessonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    lesson = await ScheduleService.create_lesson(
        db=db,
        child_subject_id=data.child_subject_id,
        room_id=data.room_id,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        user_id=current_user.id,
        comment=data.comment,
    )
    await db.commit()
    await db.refresh(lesson)
    return await get_lessons(from_date=lesson.starts_at, to_date=lesson.ends_at, child_id=lesson.child_id, db=db, current_user=current_user).then(lambda l: l[0]) if False else lesson


@router.post("/lessons/{lesson_id}/move", summary="Перенос занятия")
async def move_lesson(
    lesson_id: uuid.UUID,
    data: LessonMoveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Занятие не найдено")

    # If teacher, verify ownership
    user_roles = [r.code for r in current_user.roles]
    if "teacher" in user_roles and "manager" not in user_roles and "administrator" not in user_roles:
        t_stmt = select(Teacher.id).where(Teacher.user_id == current_user.id)
        curr_t_id = (await db.execute(t_stmt)).scalar_one_or_none()
        if lesson.teacher_id != curr_t_id:
            raise HTTPException(status_code=403, detail="Педагог может переносить только собственные занятия")

    moved = await ScheduleService.move_lesson(
        db=db,
        lesson_id=lesson_id,
        new_starts_at=data.new_starts_at,
        new_ends_at=data.new_ends_at,
        new_room_id=data.new_room_id,
        reason=data.reason,
        user_id=current_user.id,
    )
    await db.commit()
    return {"status": "success", "message": "Занятие успешно перенесено", "lesson_id": moved.id}


@router.post("/lessons/{lesson_id}/attendance", summary="Отметка посещаемости (Был/Не был)")
async def mark_attendance(
    lesson_id: uuid.UUID,
    data: LessonAttendanceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Занятие не найдено")

    # Teachers can mark attendance for their own lessons
    user_roles = [r.code for r in current_user.roles]
    if "teacher" in user_roles and "manager" not in user_roles and "administrator" not in user_roles:
        t_stmt = select(Teacher.id).where(Teacher.user_id == current_user.id)
        curr_t_id = (await db.execute(t_stmt)).scalar_one_or_none()
        if lesson.teacher_id != curr_t_id:
            raise HTTPException(status_code=403, detail="Педагог может отмечать только свои занятия")

    updated = await AttendanceService.mark_attendance(
        db=db,
        lesson_id=lesson_id,
        attendance_status=data.attendance_status,
        charge_absent=data.charge_absent or False,
        comment=data.comment,
        user_id=current_user.id,
    )
    await db.commit()

    # Get remaining balance for child subject
    rem_balance = await AttendanceService.BalanceService.get_balance(db, lesson.child_subject_id) if hasattr(AttendanceService, 'BalanceService') else 0
    return {
        "status": "success",
        "message": f"Посещаемость отмечена: {data.attendance_status.value}",
        "lesson_status": updated.status.value,
        "remaining_balance": rem_balance,
    }


@router.post("/lessons/{lesson_id}/cancel", summary="Отмена занятия (с возвратом)")
async def cancel_lesson(
    lesson_id: uuid.UUID,
    data: LessonCancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    cancelled = await AttendanceService.cancel_lesson(
        db=db,
        lesson_id=lesson_id,
        reason=data.reason,
        refund_balance=data.refund_balance,
        user_id=current_user.id,
    )
    await db.commit()
    return {"status": "success", "message": "Занятие отменено"}
