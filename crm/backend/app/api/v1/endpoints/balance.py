import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.academic import ChildSubject
from app.models.auth import User
from app.models.client import Child
from app.models.finance import LessonBalanceTransaction
from app.schemas.finance import (
    BalanceCorrectionRequest,
    BalanceTransactionRead,
    SubjectBalanceSummary,
)
from app.services.balance_service import BalanceService

router = APIRouter(prefix="/balance", tags=["Баланс и Журнал операций"])


@router.get("/children/{child_id}", response_model=List[SubjectBalanceSummary], summary="Балансы ребенка по предметам")
async def get_child_balances(
    child_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    child = await db.get(Child, child_id)
    if not child or child.deleted_at:
        raise HTTPException(status_code=404, detail="Ребенок не найден")

    # Fetch active subjects
    stmt = (
        select(ChildSubject)
        .where(ChildSubject.child_id == child_id, ChildSubject.is_active == True)
        .options(selectinload(ChildSubject.subject), selectinload(ChildSubject.teacher))
    )
    child_subjects = (await db.execute(stmt)).scalars().all()

    summaries = []
    for cs in child_subjects:
        # Sum transactions
        bal = await BalanceService.get_balance(db, cs.id)

        # Total purchased
        p_stmt = select(func.coalesce(func.sum(LessonBalanceTransaction.quantity), 0)).where(
            LessonBalanceTransaction.child_subject_id == cs.id,
            LessonBalanceTransaction.quantity > 0,
        )
        total_purchased = int((await db.execute(p_stmt)).scalar_one())

        # Total consumed
        c_stmt = select(func.coalesce(func.sum(LessonBalanceTransaction.quantity), 0)).where(
            LessonBalanceTransaction.child_subject_id == cs.id,
            LessonBalanceTransaction.quantity < 0,
        )
        total_consumed = abs(int((await db.execute(c_stmt)).scalar_one()))

        # Low balance warning (threshold = 2)
        low_warning = bal <= settings.LOW_BALANCE_THRESHOLD

        summaries.append(
            SubjectBalanceSummary(
                child_subject_id=cs.id,
                subject_id=cs.subject_id,
                subject_name=cs.subject.name,
                teacher_name=cs.teacher.full_name,
                total_purchased=total_purchased,
                total_consumed=total_consumed,
                remaining_balance=bal,
                low_balance_warning=low_warning,
                transactions=[],
            )
        )
    return summaries


@router.get("/history/{child_subject_id}", response_model=List[BalanceTransactionRead], summary="Полный журнал транзакций баланса")
async def get_balance_history(
    child_subject_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(LessonBalanceTransaction)
        .where(LessonBalanceTransaction.child_subject_id == child_subject_id)
        .options(selectinload(LessonBalanceTransaction.subject))
        .order_by(LessonBalanceTransaction.created_at.desc())
    )
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    return [
        BalanceTransactionRead(
            id=t.id,
            child_id=t.child_id,
            child_subject_id=t.child_subject_id,
            subject_id=t.subject_id,
            subject_name=t.subject.name if t.subject else None,
            package_id=t.package_id,
            lesson_id=t.lesson_id,
            payment_id=t.payment_id,
            transaction_type=t.transaction_type,
            quantity=t.quantity,
            comment=t.comment,
            created_at=t.created_at,
        )
        for t in transactions
    ]


@router.post("/correction", response_model=BalanceTransactionRead, summary="Ручная корректировка баланса (только Руководитель)")
async def manual_balance_correction(
    data: BalanceCorrectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    tx = await BalanceService.record_manual_correction(
        db=db,
        child_id=data.child_id,
        child_subject_id=data.child_subject_id,
        quantity=data.quantity,
        reason=data.reason,
        user_id=current_user.id,
        comment=data.comment,
    )
    await db.commit()
    await db.refresh(tx)

    return BalanceTransactionRead(
        id=tx.id,
        child_id=tx.child_id,
        child_subject_id=tx.child_subject_id,
        subject_id=tx.subject_id,
        transaction_type=tx.transaction_type,
        quantity=tx.quantity,
        comment=tx.comment,
        created_at=tx.created_at,
    )
