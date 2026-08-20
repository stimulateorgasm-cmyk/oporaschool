import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.academic import ChildSubject
from app.models.auth import User
from app.models.finance import ClientPayment, LessonPackage
from app.schemas.finance import PaymentCreate, PaymentRead
from app.services.audit_service import AuditService
from app.services.balance_service import BalanceService

router = APIRouter(prefix="/payments", tags=["Платежи и Пакеты"])


@router.get("", response_model=List[PaymentRead], summary="История платежей")
async def get_payments(
    parent_id: Optional[uuid.UUID] = None,
    child_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    query = (
        select(ClientPayment)
        .options(selectinload(ClientPayment.parent), selectinload(ClientPayment.child))
        .order_by(ClientPayment.payment_date.desc())
    )
    if parent_id:
        query = query.where(ClientPayment.parent_id == parent_id)
    if child_id:
        query = query.where(ClientPayment.child_id == child_id)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    payments = result.scalars().all()

    return [
        PaymentRead(
            id=p.id,
            parent_id=p.parent_id,
            parent_name=p.parent.full_name if p.parent else None,
            child_id=p.child_id,
            child_name=p.child.full_name if p.child else None,
            subject_id=p.subject_id,
            amount=p.amount,
            payment_date=p.payment_date,
            payment_method=p.payment_method,
            lessons_count=p.lessons_count,
            price_per_lesson=p.price_per_lesson,
            comment=p.comment,
            is_reversed=p.is_reversed,
            created_at=p.created_at,
        )
        for p in payments
    ]


@router.post("", response_model=PaymentRead, summary="Регистрация оплаты и начисление пакета")
async def create_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    cs = await db.get(ChildSubject, data.child_subject_id)
    if not cs or not cs.is_active:
        raise HTTPException(status_code=404, detail="Активная привязка предмета не найдена")

    price_per_lesson = data.amount / data.lessons_count

    # 1. Create client payment
    payment = ClientPayment(
        parent_id=data.parent_id,
        child_id=data.child_id,
        child_subject_id=data.child_subject_id,
        subject_id=cs.subject_id,
        amount=data.amount,
        payment_method=data.payment_method,
        lessons_count=data.lessons_count,
        price_per_lesson=price_per_lesson,
        comment=data.comment,
        created_by=current_user.id,
    )
    db.add(payment)
    await db.flush()

    # 2. Create lesson package
    package = LessonPackage(
        child_id=data.child_id,
        child_subject_id=data.child_subject_id,
        subject_id=cs.subject_id,
        payment_id=payment.id,
        total_lessons=data.lessons_count,
        price_per_lesson=price_per_lesson,
        total_amount=data.amount,
    )
    db.add(package)
    await db.flush()

    # 3. Credit ledger (+N lessons)
    await BalanceService.record_package_purchase(
        db=db,
        package=package,
        user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(payment)

    return PaymentRead(
        id=payment.id,
        parent_id=payment.parent_id,
        child_id=payment.child_id,
        subject_id=payment.subject_id,
        amount=payment.amount,
        payment_date=payment.payment_date,
        payment_method=payment.payment_method,
        lessons_count=payment.lessons_count,
        price_per_lesson=payment.price_per_lesson,
        comment=payment.comment,
        is_reversed=payment.is_reversed,
        created_at=payment.created_at,
    )
