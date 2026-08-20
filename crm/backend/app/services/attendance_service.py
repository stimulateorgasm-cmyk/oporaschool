import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.enums import (
    AttendanceStatus,
    LessonPaymentStatus,
    LessonStatus,
)
from app.models.schedule import Lesson
from app.services.audit_service import AuditService
from app.services.balance_service import BalanceService
from app.services.salary_service import SalaryService


class AttendanceService:
    @staticmethod
    async def mark_attendance(
        db: AsyncSession,
        lesson_id: uuid.UUID,
        attendance_status: AttendanceStatus,
        charge_absent: Optional[bool] = False,
        comment: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> Lesson:
        """
        Executes atomic attendance marking.
        Ensures idempotency for balance deduction and salary accruals.
        """
        lesson = await db.get(Lesson, lesson_id)
        if not lesson or lesson.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Занятие не найдено",
            )

        old_status = lesson.status
        old_attendance = lesson.attendance_status

        lesson.attendance_status = attendance_status
        lesson.comment = comment or lesson.comment
        lesson.updated_by = user_id

        if attendance_status == AttendanceStatus.present:
            lesson.status = LessonStatus.completed
            lesson.payment_status = LessonPaymentStatus.covered_by_package

            # 1. Deduct 1 lesson from ledger idempotently
            await BalanceService.record_lesson_consumption(
                db=db,
                child_subject_id=lesson.child_subject_id,
                child_id=lesson.child_id,
                subject_id=lesson.subject_id,
                lesson_id=lesson.id,
                user_id=user_id,
                comment=f"Списание: проведено занятие от {lesson.starts_at.strftime('%d.%m.%Y')}",
            )

            # 2. Accrue teacher salary idempotently
            await SalaryService.record_salary_accrual(
                db=db,
                lesson=lesson,
                user_id=user_id,
            )

        elif attendance_status == AttendanceStatus.absent:
            lesson.status = LessonStatus.absent

            # Check if absent lesson should be charged
            if charge_absent:
                lesson.payment_status = LessonPaymentStatus.covered_by_package
                await BalanceService.record_lesson_consumption(
                    db=db,
                    child_subject_id=lesson.child_subject_id,
                    child_id=lesson.child_id,
                    subject_id=lesson.subject_id,
                    lesson_id=lesson.id,
                    user_id=user_id,
                    comment=f"Списание за пропуск занятия (по правилам центра) от {lesson.starts_at.strftime('%d.%m.%Y')}",
                )
                await SalaryService.record_salary_accrual(
                    db=db,
                    lesson=lesson,
                    user_id=user_id,
                )

        await db.flush()

        await AuditService.log_action(
            db=db,
            action="ATTENDANCE_MARKED",
            entity_type="lessons",
            entity_id=lesson.id,
            user_id=user_id,
            old_values={
                "status": old_status.value,
                "attendance_status": old_attendance.value,
            },
            new_values={
                "status": lesson.status.value,
                "attendance_status": attendance_status.value,
                "charge_absent": charge_absent,
            },
        )
        return lesson

    @staticmethod
    async def cancel_lesson(
        db: AsyncSession,
        lesson_id: uuid.UUID,
        reason: Optional[str] = "Отмена занятия",
        refund_balance: bool = True,
        user_id: Optional[uuid.UUID] = None,
    ) -> Lesson:
        """
        Cancels a lesson. If it was already completed & deducted, issues a refund (+1) transaction.
        """
        lesson = await db.get(Lesson, lesson_id)
        if not lesson or lesson.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Занятие не найдено",
            )

        old_status = lesson.status
        lesson.status = LessonStatus.cancelled
        lesson.attendance_status = AttendanceStatus.cancelled_by_center
        lesson.updated_by = user_id

        # If balance was previously consumed and refund is enabled, issue refund (+1)
        if refund_balance:
            await BalanceService.record_lesson_refund(
                db=db,
                child_subject_id=lesson.child_subject_id,
                child_id=lesson.child_id,
                subject_id=lesson.subject_id,
                lesson_id=lesson.id,
                user_id=user_id,
                reason=f"Возврат занятия: {reason}",
            )

        # Reverse salary accrual if any
        await SalaryService.reverse_salary_accrual(
            db=db,
            lesson_id=lesson.id,
            reason=reason or "Отмена занятия",
            user_id=user_id,
        )

        await db.flush()

        await AuditService.log_action(
            db=db,
            action="LESSON_CANCELLED",
            entity_type="lessons",
            entity_id=lesson.id,
            user_id=user_id,
            old_values={"status": old_status.value},
            new_values={"status": LessonStatus.cancelled.value, "reason": reason},
        )
        return lesson
