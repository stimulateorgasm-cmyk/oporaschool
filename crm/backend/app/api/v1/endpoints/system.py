import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.academic import ChildSubject, Teacher
from app.models.auth import User
from app.models.client import Child, Parent
from app.models.enums import ChildStatus, LessonStatus, SalaryPaymentStatus
from app.models.finance import (
    ClientPayment,
    LessonBalanceTransaction,
    TeacherSalaryAccrual,
    TeacherSalaryPayment,
)
from app.models.schedule import Lesson, Room
from app.models.system import AuditLog, NotificationSetting, SystemSetting
from app.schemas.system import AuditLogRead, DashboardMetrics, SettingRead, SettingUpdate

router = APIRouter(prefix="/system", tags=["Система, Настройки и Дашборд"])


@router.get("/dashboard", response_model=DashboardMetrics, summary="Главные метрики образовательного центра")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Total clients
    clients_count = (
        await db.execute(select(func.count(Parent.id)).where(Parent.deleted_at.is_(None)))
    ).scalar_one()

    # Active children
    active_children = (
        await db.execute(
            select(func.count(Child.id)).where(
                Child.deleted_at.is_(None), Child.status == ChildStatus.active
            )
        )
    ).scalar_one()

    # Lessons today
    now_day_start = func.date_trunc("day", func.now())
    now_day_end = now_day_start + func.cast("1 day", func.interval if hasattr(func, "interval") else None)
    # Simple count
    today_lessons = (
        await db.execute(
            select(func.count(Lesson.id)).where(
                Lesson.deleted_at.is_(None),
                Lesson.status != LessonStatus.cancelled,
            )
        )
    ).scalar_one()

    # Revenue
    revenue = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(ClientPayment.amount), 0)).where(
                    ClientPayment.is_reversed == False
                )
            )
        ).scalar_one()
    )

    # Salary accrued
    salary_accrued = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(TeacherSalaryAccrual.amount), 0)).where(
                    TeacherSalaryAccrual.is_reversed == False
                )
            )
        ).scalar_one()
    )

    # Salary paid
    salary_paid = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(TeacherSalaryPayment.amount), 0)).where(
                    TeacherSalaryPayment.status == SalaryPaymentStatus.active
                )
            )
        ).scalar_one()
    )

    # Free rooms
    total_rooms = (
        await db.execute(select(func.count(Room.id)).where(Room.is_active == True))
    ).scalar_one()

    return DashboardMetrics(
        total_clients=clients_count,
        active_children=active_children,
        lessons_today=today_lessons,
        lessons_completed_month=today_lessons,
        revenue_month=revenue,
        salary_accrued_month=salary_accrued,
        salary_paid_month=salary_paid,
        total_teacher_debt=max(salary_accrued - salary_paid, 0.0),
        total_teacher_overpayment=max(salary_paid - salary_accrued, 0.0),
        free_rooms_now=total_rooms,
        zero_balance_children_count=0,
        low_balance_children_count=0,
    )


@router.get("/audit-logs", response_model=List[AuditLogRead], summary="Аудит-лог системы (Руководитель)")
async def get_audit_logs(
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"])),
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        AuditLogRead(
            id=log.id,
            user_id=log.user_id,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            action=log.action,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]
