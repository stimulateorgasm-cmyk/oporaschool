import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.academic import Teacher
from app.models.auth import User
from app.models.enums import SalaryPaymentStatus
from app.models.finance import TeacherSalaryAccrual, TeacherSalaryPayment
from app.schemas.finance import (
    TeacherSalaryAccrualRead,
    TeacherSalaryPaymentCreate,
    TeacherSalaryPaymentRead,
    TeacherSalarySummary,
)
from app.services.audit_service import AuditService
from app.services.salary_service import SalaryService

router = APIRouter(prefix="/salary", tags=["Зарплата педагогов"])


@router.get("/summary/{teacher_id}", response_model=TeacherSalarySummary, summary="Финансовая сводка по педагогу")
async def get_teacher_salary_summary(
    teacher_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    teacher = await db.get(Teacher, teacher_id)
    if not teacher or teacher.deleted_at:
        raise HTTPException(status_code=404, detail="Педагог не найден")

    # If teacher role, verify ownership
    user_roles = [r.code for r in current_user.roles]
    if "teacher" in user_roles and "manager" not in user_roles and "administrator" not in user_roles:
        if teacher.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Доступ только к собственному балансу")

    accrued, paid, debt, overpayment = await SalaryService.calculate_teacher_balance(
        db, teacher_id
    )

    # Fetch recent accruals
    accruals_stmt = (
        select(TeacherSalaryAccrual)
        .where(TeacherSalaryAccrual.teacher_id == teacher_id)
        .order_by(TeacherSalaryAccrual.accrued_at.desc())
        .limit(50)
    )
    accruals = (await db.execute(accruals_stmt)).scalars().all()

    # Fetch payments
    payments_stmt = (
        select(TeacherSalaryPayment)
        .where(TeacherSalaryPayment.teacher_id == teacher_id)
        .order_by(TeacherSalaryPayment.payment_date.desc())
        .limit(50)
    )
    payments = (await db.execute(payments_stmt)).scalars().all()

    return TeacherSalarySummary(
        teacher_id=teacher.id,
        teacher_name=teacher.full_name,
        total_accrued=accrued,
        total_paid=paid,
        debt=debt,
        overpayment=overpayment,
        accruals=[
            TeacherSalaryAccrualRead(
                id=a.id,
                teacher_id=a.teacher_id,
                lesson_id=a.lesson_id,
                amount=a.amount,
                accrued_at=a.accrued_at,
                is_reversed=a.is_reversed,
                reversal_reason=a.reversal_reason,
            )
            for a in accruals
        ],
        payments=[
            TeacherSalaryPaymentRead(
                id=p.id,
                teacher_id=p.teacher_id,
                teacher_name=teacher.full_name,
                amount=p.amount,
                payment_date=p.payment_date,
                period_from=p.period_from,
                period_to=p.period_to,
                payment_method=p.payment_method,
                status=p.status,
                comment=p.comment,
                created_at=p.created_at,
            )
            for p in payments
        ],
    )


@router.get("/summary", response_model=List[TeacherSalarySummary], summary="Сводка по всем педагогам")
async def get_all_salary_summaries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    teachers = (
        await db.execute(
            select(Teacher)
            .where(Teacher.deleted_at.is_(None))
            .order_by(Teacher.full_name)
        )
    ).scalars().all()

    summaries = []
    for teacher in teachers:
        accrued, paid, debt, overpayment = await SalaryService.calculate_teacher_balance(
            db, teacher.id
        )
        summaries.append(
            TeacherSalarySummary(
                teacher_id=teacher.id,
                teacher_name=teacher.full_name,
                total_accrued=accrued,
                total_paid=paid,
                debt=debt,
                overpayment=overpayment,
                accruals=[],
                payments=[],
            )
        )
    return summaries


@router.get("/accruals", response_model=List[TeacherSalaryAccrualRead], summary="Все начисления по урокам")
async def get_salary_accruals(
    teacher_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(TeacherSalaryAccrual)
        .options(
            selectinload(TeacherSalaryAccrual.teacher),
            selectinload(TeacherSalaryAccrual.lesson),
        )
        .order_by(TeacherSalaryAccrual.accrued_at.desc())
    )
    if teacher_id:
        stmt = stmt.where(TeacherSalaryAccrual.teacher_id == teacher_id)
    accruals = (await db.execute(stmt)).scalars().all()

    return [
        TeacherSalaryAccrualRead(
            id=a.id,
            teacher_id=a.teacher_id,
            teacher_name=a.teacher.full_name if a.teacher else None,
            lesson_id=a.lesson_id,
            lesson_date=a.lesson.starts_at if a.lesson else None,
            child_name=a.lesson.child.full_name if a.lesson and a.lesson.child else None,
            subject_name=a.lesson.subject.name if a.lesson and a.lesson.subject else None,
            amount=a.amount,
            accrued_at=a.accrued_at,
            is_reversed=a.is_reversed,
            reversal_reason=a.reversal_reason,
        )
        for a in accruals
    ]


@router.get("/payments", response_model=List[TeacherSalaryPaymentRead], summary="Все выплаты зарплаты")
async def get_salary_payments(
    teacher_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(TeacherSalaryPayment)
        .options(selectinload(TeacherSalaryPayment.teacher))
        .order_by(TeacherSalaryPayment.payment_date.desc())
    )
    if teacher_id:
        stmt = stmt.where(TeacherSalaryPayment.teacher_id == teacher_id)
    payments = (await db.execute(stmt)).scalars().all()

    return [
        TeacherSalaryPaymentRead(
            id=p.id,
            teacher_id=p.teacher_id,
            teacher_name=p.teacher.full_name if p.teacher else None,
            amount=p.amount,
            payment_date=p.payment_date,
            period_from=p.period_from,
            period_to=p.period_to,
            payment_method=p.payment_method,
            status=p.status,
            comment=p.comment,
            created_at=p.created_at,
        )
        for p in payments
    ]


@router.post("/payments", response_model=TeacherSalaryPaymentRead, summary="Выплата зарплаты педагогу (Руководитель)")
async def create_salary_payment(
    data: TeacherSalaryPaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    teacher = await db.get(Teacher, data.teacher_id)
    if not teacher or teacher.deleted_at:
        raise HTTPException(status_code=404, detail="Педагог не найден")

    payment = TeacherSalaryPayment(
        teacher_id=data.teacher_id,
        amount=data.amount,
        period_from=data.period_from,
        period_to=data.period_to,
        payment_method=data.payment_method,
        status=SalaryPaymentStatus.active,
        comment=data.comment,
        created_by=current_user.id,
    )
    db.add(payment)
    await db.flush()

    await AuditService.log_action(
        db=db,
        action="SALARY_PAYMENT",
        entity_type="teacher_salary_payments",
        entity_id=payment.id,
        user_id=current_user.id,
        new_values={"amount": str(data.amount), "teacher_id": str(data.teacher_id)},
    )

    await db.commit()
    await db.refresh(payment)

    return TeacherSalaryPaymentRead(
        id=payment.id,
        teacher_id=payment.teacher_id,
        teacher_name=teacher.full_name,
        amount=payment.amount,
        payment_date=payment.payment_date,
        period_from=payment.period_from,
        period_to=payment.period_to,
        payment_method=payment.payment_method,
        status=payment.status,
        comment=payment.comment,
        created_at=payment.created_at,
    )
