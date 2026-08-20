import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.academic import Teacher, TeacherRate
from app.models.enums import LessonFormat, SalaryPaymentStatus
from app.models.finance import TeacherSalaryAccrual, TeacherSalaryPayment
from app.models.schedule import Lesson
from app.services.audit_service import AuditService


class SalaryService:
    @staticmethod
    async def resolve_teacher_rate(
        db: AsyncSession,
        teacher_id: uuid.UUID,
        subject_id: uuid.UUID,
        lesson_format: LessonFormat,
        lesson_date: date,
    ) -> Optional[TeacherRate]:
        """
        Finds the exact historical rate active for the teacher, subject, format, and lesson date.
        """
        stmt = (
            select(TeacherRate)
            .where(
                TeacherRate.teacher_id == teacher_id,
                TeacherRate.subject_id == subject_id,
                TeacherRate.lesson_format == lesson_format,
                TeacherRate.valid_from <= lesson_date,
                or_(
                    TeacherRate.valid_until.is_(None),
                    TeacherRate.valid_until >= lesson_date,
                ),
            )
            .order_by(TeacherRate.valid_from.desc())
            .limit(1)
        )
        return (await db.execute(stmt)).scalar_one_or_none()

    @staticmethod
    async def record_salary_accrual(
        db: AsyncSession,
        lesson: Lesson,
        user_id: Optional[uuid.UUID] = None,
    ) -> Optional[TeacherSalaryAccrual]:
        """
        Creates an immutable salary accrual for a completed lesson.
        Guarantees idempotency via UNIQUE(lesson_id).
        """
        # 1. Check existing
        existing_stmt = select(TeacherSalaryAccrual).where(
            TeacherSalaryAccrual.lesson_id == lesson.id
        )
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            return existing

        # 2. Resolve rate
        lesson_date = lesson.starts_at.date()
        rate = await SalaryService.resolve_teacher_rate(
            db=db,
            teacher_id=lesson.teacher_id,
            subject_id=lesson.subject_id,
            lesson_format=lesson.lesson_format,
            lesson_date=lesson_date,
        )

        amount = rate.amount if rate else Decimal("500.00")  # Default fallback rate

        # Snapshot rate on lesson
        lesson.teacher_rate_snapshot = amount

        accrual = TeacherSalaryAccrual(
            teacher_id=lesson.teacher_id,
            lesson_id=lesson.id,
            teacher_rate_id=rate.id if rate else None,
            amount=amount,
            accrued_at=datetime.now(),
            created_by=user_id,
        )
        db.add(accrual)
        await db.flush()

        await AuditService.log_action(
            db=db,
            action="SALARY_ACCRUAL",
            entity_type="teacher_salary_accruals",
            entity_id=accrual.id,
            user_id=user_id,
            new_values={
                "teacher_id": str(lesson.teacher_id),
                "lesson_id": str(lesson.id),
                "amount": str(amount),
            },
        )
        return accrual

    @staticmethod
    async def reverse_salary_accrual(
        db: AsyncSession,
        lesson_id: uuid.UUID,
        reason: str,
        user_id: Optional[uuid.UUID] = None,
    ) -> Optional[TeacherSalaryAccrual]:
        """
        Soft-reverses a salary accrual when a lesson is cancelled, keeping full audit trail.
        """
        stmt = select(TeacherSalaryAccrual).where(
            TeacherSalaryAccrual.lesson_id == lesson_id
        )
        accrual = (await db.execute(stmt)).scalar_one_or_none()
        if not accrual or accrual.is_reversed:
            return accrual

        accrual.is_reversed = True
        accrual.reversed_at = datetime.now()
        accrual.reversal_reason = reason

        await AuditService.log_action(
            db=db,
            action="SALARY_ACCRUAL_REVERSED",
            entity_type="teacher_salary_accruals",
            entity_id=accrual.id,
            user_id=user_id,
            new_values={"is_reversed": True, "reversal_reason": reason},
        )
        return accrual

    @staticmethod
    async def calculate_teacher_balance(
        db: AsyncSession,
        teacher_id: uuid.UUID,
    ) -> Tuple[Decimal, Decimal, Decimal, Decimal]:
        """
        Calculates (total_accrued, total_paid, debt, overpayment).
        Formula:
        debt = max(accrued - paid, 0)
        overpayment = max(paid - accrued, 0)
        """
        accrued_stmt = select(
            func.coalesce(func.sum(TeacherSalaryAccrual.amount), Decimal("0.00"))
        ).where(
            TeacherSalaryAccrual.teacher_id == teacher_id,
            TeacherSalaryAccrual.is_reversed == False,
        )
        accrued_result = await db.execute(accrued_stmt)
        total_accrued = Decimal(str(accrued_result.scalar_one()))

        paid_stmt = select(
            func.coalesce(func.sum(TeacherSalaryPayment.amount), Decimal("0.00"))
        ).where(
            TeacherSalaryPayment.teacher_id == teacher_id,
            TeacherSalaryPayment.status == SalaryPaymentStatus.active,
        )
        paid_result = await db.execute(paid_stmt)
        total_paid = Decimal(str(paid_result.scalar_one()))

        balance = total_accrued - total_paid
        debt = max(balance, Decimal("0.00"))
        overpayment = max(-balance, Decimal("0.00"))

        return total_accrued, total_paid, debt, overpayment
