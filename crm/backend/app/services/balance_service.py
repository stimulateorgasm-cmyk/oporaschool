import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.academic import ChildSubject
from app.models.enums import BalanceTransactionType
from app.models.finance import LessonBalanceTransaction, LessonPackage
from app.services.audit_service import AuditService


class BalanceService:
    @staticmethod
    async def get_balance(db: AsyncSession, child_subject_id: uuid.UUID) -> int:
        """
        Calculates the true current lesson balance as the sum of all ledger transactions.
        Source of Truth: lesson_balance_transactions table.
        """
        stmt = select(func.coalesce(func.sum(LessonBalanceTransaction.quantity), 0)).where(
            LessonBalanceTransaction.child_subject_id == child_subject_id
        )
        result = await db.execute(stmt)
        return int(result.scalar_one())

    @staticmethod
    async def record_package_purchase(
        db: AsyncSession,
        package: LessonPackage,
        user_id: Optional[uuid.UUID] = None,
    ) -> LessonBalanceTransaction:
        """
        Registers a package purchase in the ledger (+N lessons).
        """
        transaction = LessonBalanceTransaction(
            child_id=package.child_id,
            child_subject_id=package.child_subject_id,
            subject_id=package.subject_id,
            package_id=package.id,
            payment_id=package.payment_id,
            transaction_type=BalanceTransactionType.purchase,
            quantity=package.total_lessons,
            comment=f"Приобретение пакета на {package.total_lessons} занятий",
            created_by=user_id,
        )
        db.add(transaction)
        await db.flush()

        await AuditService.log_action(
            db=db,
            action="BALANCE_PURCHASE",
            entity_type="lesson_balance_transactions",
            entity_id=transaction.id,
            user_id=user_id,
            new_values={
                "quantity": package.total_lessons,
                "child_subject_id": str(package.child_subject_id),
                "package_id": str(package.id),
            },
        )
        return transaction

    @staticmethod
    async def record_lesson_consumption(
        db: AsyncSession,
        child_subject_id: uuid.UUID,
        child_id: uuid.UUID,
        subject_id: uuid.UUID,
        lesson_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
        comment: Optional[str] = "Списание за проведенное занятие",
    ) -> LessonBalanceTransaction:
        """
        Idempotent lesson consumption (-1 lesson).
        If a consumption transaction for this lesson_id already exists, returns it without creating a duplicate.
        """
        # 1. Idempotency check:
        existing_stmt = select(LessonBalanceTransaction).where(
            LessonBalanceTransaction.lesson_id == lesson_id,
            LessonBalanceTransaction.transaction_type == BalanceTransactionType.consumption,
        )
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            return existing

        transaction = LessonBalanceTransaction(
            child_id=child_id,
            child_subject_id=child_subject_id,
            subject_id=subject_id,
            lesson_id=lesson_id,
            transaction_type=BalanceTransactionType.consumption,
            quantity=-1,
            comment=comment,
            created_by=user_id,
        )
        db.add(transaction)
        await db.flush()

        await AuditService.log_action(
            db=db,
            action="BALANCE_CONSUMPTION",
            entity_type="lesson_balance_transactions",
            entity_id=transaction.id,
            user_id=user_id,
            new_values={
                "quantity": -1,
                "lesson_id": str(lesson_id),
                "child_subject_id": str(child_subject_id),
            },
        )
        return transaction

    @staticmethod
    async def record_lesson_refund(
        db: AsyncSession,
        child_subject_id: uuid.UUID,
        child_id: uuid.UUID,
        subject_id: uuid.UUID,
        lesson_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
        reason: Optional[str] = "Возврат занятия после отмены",
    ) -> LessonBalanceTransaction:
        """
        Idempotent lesson refund (+1 lesson) after cancellation.
        Does not delete initial consumption record, preserving full ledger audit trail.
        """
        existing_stmt = select(LessonBalanceTransaction).where(
            LessonBalanceTransaction.lesson_id == lesson_id,
            LessonBalanceTransaction.transaction_type == BalanceTransactionType.refund,
        )
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            return existing

        transaction = LessonBalanceTransaction(
            child_id=child_id,
            child_subject_id=child_subject_id,
            subject_id=subject_id,
            lesson_id=lesson_id,
            transaction_type=BalanceTransactionType.refund,
            quantity=1,
            comment=reason,
            created_by=user_id,
        )
        db.add(transaction)
        await db.flush()

        await AuditService.log_action(
            db=db,
            action="BALANCE_REFUND",
            entity_type="lesson_balance_transactions",
            entity_id=transaction.id,
            user_id=user_id,
            new_values={
                "quantity": 1,
                "lesson_id": str(lesson_id),
                "reason": reason,
            },
        )
        return transaction

    @staticmethod
    async def record_manual_correction(
        db: AsyncSession,
        child_id: uuid.UUID,
        child_subject_id: uuid.UUID,
        quantity: int,
        reason: str,
        user_id: Optional[uuid.UUID] = None,
        comment: Optional[str] = None,
    ) -> LessonBalanceTransaction:
        """
        Records a manual balance correction (+N or -N) with mandatory audit reason.
        """
        if quantity == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Величина корректировки не может быть равной 0",
            )
        if not reason or len(reason.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Для ручной корректировки баланса обязательно указать причину",
            )

        # Get subject_id from child_subject
        cs = await db.get(ChildSubject, child_subject_id)
        if not cs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Привязка предмета ребенка не найдена",
            )

        t_type = (
            BalanceTransactionType.correction_plus
            if quantity > 0
            else BalanceTransactionType.correction_minus
        )

        full_comment = f"Ручная корректировка: {reason}"
        if comment:
            full_comment += f" ({comment})"

        transaction = LessonBalanceTransaction(
            child_id=child_id,
            child_subject_id=child_subject_id,
            subject_id=cs.subject_id,
            transaction_type=t_type,
            quantity=quantity,
            comment=full_comment,
            created_by=user_id,
        )
        db.add(transaction)
        await db.flush()

        await AuditService.log_action(
            db=db,
            action="BALANCE_CORRECTION",
            entity_type="lesson_balance_transactions",
            entity_id=transaction.id,
            user_id=user_id,
            new_values={
                "quantity": quantity,
                "reason": reason,
                "child_subject_id": str(child_subject_id),
            },
        )
        return transaction
