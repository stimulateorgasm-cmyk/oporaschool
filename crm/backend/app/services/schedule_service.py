import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.academic import ChildSubject
from app.models.attachment import Attachment
from app.models.enums import (
    AttendanceStatus,
    LessonFormat,
    LessonPaymentStatus,
    LessonStatus,
)
from app.models.schedule import Group, GroupMember, Lesson, LessonHistory, Room
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
        child_id: Optional[uuid.UUID] = None,
        group_id: Optional[uuid.UUID] = None,
        exclude_lesson_id: Optional[uuid.UUID] = None,
    ) -> None:
        """
        Validates interval collisions: new_start < existing_end AND new_end > existing_start.
        Checks:
        1. Room availability
        2. Teacher availability
        3. Child availability (индивидуально — один ребёнок; группа — каждый участник)
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

        # 3. Child conflicts
        if group_id:
            child_ids = (
                await db.execute(
                    select(GroupMember.child_id).where(GroupMember.group_id == group_id)
                )
            ).scalars().all()
        elif child_id:
            child_ids = [child_id]
        else:
            child_ids = []

        for cid in child_ids:
            child_stmt = select(Lesson).where(base_condition, Lesson.child_id == cid)
            child_conflict = (await db.execute(child_stmt)).scalar_one_or_none()
            if child_conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"У ученика уже запланировано другое занятие в это время ({child_conflict.starts_at.strftime('%H:%M')} - {child_conflict.ends_at.strftime('%H:%M')})",
                )

    @staticmethod
    async def create_lesson(
        db: AsyncSession,
        child_id: Optional[uuid.UUID],
        subject_id: uuid.UUID,
        teacher_id: uuid.UUID,
        room_id: uuid.UUID,
        starts_at: datetime,
        ends_at: datetime,
        attachment_id: Optional[uuid.UUID],
        user_id: Optional[uuid.UUID] = None,
        comment: Optional[str] = None,
        group_id: Optional[uuid.UUID] = None,
    ) -> Lesson:
        # 1. Вложение опционально (пункт 7)
        if attachment_id:
            attachment = await db.get(Attachment, attachment_id)
            if not attachment or attachment.deleted_at:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Вложение не найдено.",
                )

        if group_id:
            group = await db.get(Group, group_id)
            if not group:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Группа не найдена",
                )
            await ScheduleService.validate_conflicts(
                db=db,
                starts_at=starts_at,
                ends_at=ends_at,
                room_id=room_id,
                teacher_id=teacher_id,
                group_id=group_id,
            )
            # групповое занятие: без ребёнка/привязки, цена 0 (прайса групп в ТЗ нет)
            lesson = Lesson(
                child_subject_id=None,
                child_id=None,
                group_id=group_id,
                subject_id=subject_id,
                teacher_id=teacher_id,
                room_id=room_id,
                starts_at=starts_at,
                ends_at=ends_at,
                status=LessonStatus.scheduled,
                attendance_status=AttendanceStatus.unknown,
                payment_status=LessonPaymentStatus.unpaid,
                lesson_format=LessonFormat.group,
                client_price=Decimal("0"),
                attachment_id=attachment_id,
                comment=comment,
                created_by=user_id,
                updated_by=user_id,
            )
            new_values = {
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "room_id": str(room_id),
                "teacher_id": str(teacher_id),
                "subject_id": str(subject_id),
                "group_id": str(group_id),
            }
        else:
            if not child_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Укажите ребёнка или группу",
                )
            # Активная привязка «ребёнок × направление × педагог» задаёт цену и формат
            cs = (
                await db.execute(
                    select(ChildSubject).where(
                        ChildSubject.child_id == child_id,
                        ChildSubject.subject_id == subject_id,
                        ChildSubject.teacher_id == teacher_id,
                        ChildSubject.is_active == True,
                    )
                )
            ).scalar_one_or_none()
            if not cs:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="У ребёнка нет активной привязки к выбранному направлению и педагогу",
                )

            await ScheduleService.validate_conflicts(
                db=db,
                starts_at=starts_at,
                ends_at=ends_at,
                room_id=room_id,
                teacher_id=teacher_id,
                child_id=child_id,
            )

            lesson = Lesson(
                child_subject_id=cs.id,
                child_id=child_id,
                group_id=None,
                subject_id=subject_id,
                teacher_id=teacher_id,
                room_id=room_id,
                starts_at=starts_at,
                ends_at=ends_at,
                status=LessonStatus.scheduled,
                attendance_status=AttendanceStatus.unknown,
                payment_status=LessonPaymentStatus.unpaid,
                lesson_format=cs.lesson_format,
                client_price=cs.lesson_price,
                attachment_id=attachment_id,
                comment=comment,
                created_by=user_id,
                updated_by=user_id,
            )
            new_values = {
                "starts_at": starts_at.isoformat(),
                "ends_at": ends_at.isoformat(),
                "room_id": str(room_id),
                "teacher_id": str(teacher_id),
                "child_id": str(child_id),
                "subject_id": str(subject_id),
            }

        if attachment_id:
            new_values["attachment_id"] = str(attachment_id)

        db.add(lesson)
        await db.flush()

        await AuditService.log_action(
            db=db,
            action="LESSON_CREATED",
            entity_type="lessons",
            entity_id=lesson.id,
            user_id=user_id,
            new_values=new_values,
        )
        return lesson

    @staticmethod
    async def update_lesson(
        db: AsyncSession,
        lesson_id: uuid.UUID,
        payload: dict,
        user_id: Optional[uuid.UUID] = None,
    ) -> Lesson:
        """Полное редактирование занятия (пункт 6). payload — model_dump(exclude_unset=True)."""
        lesson = await db.get(Lesson, lesson_id)
        if not lesson or lesson.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Занятие не найдено",
            )
        lesson_status_str = getattr(lesson.status, "value", lesson.status)
        if lesson_status_str in (
            LessonStatus.completed.value,
            LessonStatus.cancelled.value,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя редактировать проведённое или отменённое занятие",
            )

        old_values = {
            "starts_at": lesson.starts_at.isoformat(),
            "ends_at": lesson.ends_at.isoformat(),
            "room_id": str(lesson.room_id),
            "teacher_id": str(lesson.teacher_id),
            "child_id": str(lesson.child_id) if lesson.child_id else None,
            "subject_id": str(lesson.subject_id),
            "comment": lesson.comment,
        }

        # ponytail: применяем поля как есть; при смене subject/teacher child_subject_id
        # не пересчитываем — чек-лист этого не требует, а баланс по проведённым занятиям заблокирован.
        for field, value in payload.items():
            setattr(lesson, field, value)

        await ScheduleService.validate_conflicts(
            db=db,
            starts_at=lesson.starts_at,
            ends_at=lesson.ends_at,
            room_id=lesson.room_id,
            teacher_id=lesson.teacher_id,
            child_id=lesson.child_id,
            group_id=lesson.group_id,
            exclude_lesson_id=lesson.id,
        )

        lesson.updated_by = user_id
        new_values = {
            "starts_at": lesson.starts_at.isoformat(),
            "ends_at": lesson.ends_at.isoformat(),
            "room_id": str(lesson.room_id),
            "teacher_id": str(lesson.teacher_id),
            "child_id": str(lesson.child_id) if lesson.child_id else None,
            "subject_id": str(lesson.subject_id),
            "comment": lesson.comment,
        }

        db.add(
            LessonHistory(
                lesson_id=lesson.id,
                changed_by=user_id,
                change_type="EDIT",
                old_values=old_values,
                new_values=new_values,
                reason="Редактирование занятия",
            )
        )

        await AuditService.log_action(
            db=db,
            action="LESSON_UPDATED",
            entity_type="lessons",
            entity_id=lesson.id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
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
        # status хранится как String(20), при чтении из БД приходит строкой — нормализуем для сравнения
        lesson_status_str = getattr(lesson.status, "value", lesson.status)
        if lesson_status_str == LessonStatus.completed.value:
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
            group_id=lesson.group_id,
            exclude_lesson_id=lesson.id,
        )

        old_values = {
            "starts_at": lesson.starts_at.isoformat(),
            "ends_at": lesson.ends_at.isoformat(),
            "room_id": str(lesson.room_id),
            "status": getattr(lesson.status, "value", lesson.status),
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
