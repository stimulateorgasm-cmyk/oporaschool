import uuid
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.academic import ChildSubject
from app.models.enums import AttendanceStatus, LessonPaymentStatus, LessonStatus
from app.models.schedule import Lesson, LessonHistory, Room
from app.services.audit_service import AuditService
from app.services.balance_service import BalanceService


class ScheduleService:
    @staticmethod
    async def validate_conflicts(
        db: AsyncSession,
        starts_at: datetime,
        ends_at: datetime,
        room_id: uuid.UUID,
        teacher_id: uuid.UUID,
        child_id: uuid.UUID,
        exclude_lesson_id: Optional[uuid.UUID] = None,
    ) -> None:
        """
        Validates interval collisions: new_start < existing_end AND new_end > existing_start.
        Checks:
        1. Room availability
        2. Teacher availability
        3. Child availability
        """
        if ends_at <= starts_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Время окончания занятия должно быть позже времени начала",
            )

        base_condition = and_(
            Lesson.deleted_at.is_(None),
            Lesson.status != LessonStatus.cancelled,
            Lesson.starts_at < ends_at,
            Lesson.ends_at > starts_at,
        )
        if exclude_lesson_id:
            base_condition = and_(base_condition, Lesson.id != exclude_lesson_id)

        # 1. Room conflict
        room_stmt = (
            select(Lesson, Room)
            .join(Room, Lesson.room_id == Room.id)
            .where(base_condition, Lesson.room_id == room_id)
        )
        room_conflict = (await db.execute(room_stmt)).first()
        if room_conflict:
            conflict_lesson, room = room_conflict
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Кабинет «{room.name}» занят в интервале с {conflict_lesson.starts_at.strftime('%H:%M')} до {conflict_lesson.ends_at.strftime('%H:%M')}",
            )

        # 2. Teacher conflict
        teacher_stmt = select(Lesson).where(
            base_condition, Lesson.teacher_id == teacher_id
        )
        teacher_conflict = (await db.execute(teacher_stmt)).scalar_one_or_none()
        if teacher_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"У педагога уже запланировано занятие в интервале с {teacher_conflict.starts_at.strftime('%H:%M')} до {teacher_conflict.ends_at.strftime('%H:%M')}",
            )

        # 3. Child conflict
        child_stmt = select(Lesson).where(base_condition, Lesson.child_id == child_id)
        child_conflict = (await db.execute(child_stmt)).scalar_one_or_none()
        if child_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"У ученика уже запланировано другое занятие в это время ({child_conflict.starts_at.strftime('%H:%M')} - {child_conflict.ends_at.strftime('%H:%M')})",
            )

    @staticmethod
    async def create_lesson(
        db: AsyncSession,
        child_subject_id: uuid.UUID,
        room_id: uuid.UUID,
        starts_at: datetime,
        ends_at: datetime,
        user_id: Optional[uuid.UUID] = None,
        comment: Optional[str] = None,
    ) -> Lesson:
        cs = await db.get(ChildSubject, child_subject_id)
        if not cs or not cs.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Активная привязка предмета ребенка не найдена",
            )

        # Validate conflicts
        await ScheduleService.validate_conflicts(
            db=db,
            starts_at=starts_at,
            ends_at=ends_at,
            room_id=room_id,
            teacher_id=cs.teacher_id,
            child_id=cs.child_id,
        )

        lesson = Lesson(
            child_subject_id=cs.id,
            child_id=cs.child_id,
            subject_id=cs.subject_id,
            teacher_id=cs.teacher_id,
            room_id=room_id,
            starts_at=starts_at,
            ends_at=ends_at,
            status=LessonStatus.scheduled,
            attendance_status=AttendanceStatus.unknown,
            payment_status=LessonPaymentStatus.unpaid,
            lesson_format=cs.lesson_format,
            client_price=cs.lesson_price,
            comment=comment,
            created_by=user_id,
            updated_by=user_id,
        )
        db.add(lesson)
        await db.flush()

        await AuditService.log_action(
            db=db,
            action="LESSON_CREATED",
            entity_type="lessons",
            entity_id=lesson.id,
            user_id=user_id,
            new_values={
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "room_id": str(room_id),
                "teacher_id": str(cs.teacher_id),
                "child_id": str(cs.child_id),
            },
        )
        return lesson

    @staticmethod
    async def move_lesson(
        db: AsyncSession,
        lesson_id: uuid.UUID,
        new_starts_at: datetime,
        new_ends_at: datetime,
        new_room_id: Optional[uuid.UUID] = None,
        reason: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> Lesson:
        lesson = await db.get(Lesson, lesson_id)
        if not lesson or lesson.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Занятие не найдено",
            )
        if lesson.status == LessonStatus.completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя перенести уже проведенное занятие",
            )

        target_room_id = new_room_id or lesson.room_id

        # Validate conflicts for the new time slot
        await ScheduleService.validate_conflicts(
            db=db,
            starts_at=new_starts_at,
            ends_at=new_ends_at,
            room_id=target_room_id,
            teacher_id=lesson.teacher_id,
            child_id=lesson.child_id,
            exclude_lesson_id=lesson.id,
        )

        old_values = {
            "starts_at": lesson.starts_at.isoformat(),
            "ends_at": lesson.ends_at.isoformat(),
            "room_id": str(lesson.room_id),
            "status": lesson.status.value,
        }

        lesson.starts_at = new_starts_at
        lesson.ends_at = new_ends_at
        lesson.room_id = target_room_id
        lesson.status = LessonStatus.moved
        lesson.updated_by = user_id

        new_values = {
            "starts_at": new_starts_at.isoformat(),
            "ends_at": new_ends_at.isoformat(),
            "room_id": str(target_room_id),
            "status": LessonStatus.moved.value,
        }

        # Log to lesson_history
        history = LessonHistory(
            lesson_id=lesson.id,
            changed_by=user_id,
            change_type="MOVE",
            old_values=old_values,
            new_values=new_values,
            reason=reason or "Перенос занятия",
        )
        db.add(history)

        await AuditService.log_action(
            db=db,
            action="LESSON_MOVED",
            entity_type="lessons",
            entity_id=lesson.id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
        )
        return lesson
