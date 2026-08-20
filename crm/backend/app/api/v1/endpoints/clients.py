import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.core.database import get_db
from app.core.rbac import get_current_user, require_roles
from app.models.academic import ChildSubject
from app.models.auth import User
from app.models.client import Child, Parent
from app.models.enums import ChildStatus, ClientStatus
from app.schemas.academic import ChildSubjectCreate, ChildSubjectRead
from app.schemas.client import (
    ChildCreate,
    ChildRead,
    ChildUpdate,
    ParentCreate,
    ParentRead,
    ParentUpdate,
)
from app.services.audit_service import AuditService
from app.services.balance_service import BalanceService

router = APIRouter(prefix="/clients", tags=["Клиенты и Дети"])


@router.get("", response_model=List[ParentRead], summary="Список клиентов (родителей)")
async def get_parents(
    search: Optional[str] = Query(None, description="Поиск по ФИО или телефону"),
    status: Optional[ClientStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    query = select(Parent).where(Parent.deleted_at.is_(None)).options(selectinload(Parent.children))

    if status:
        query = query.where(Parent.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (Parent.full_name.ilike(search_pattern)) | (Parent.phone.ilike(search_pattern))
        )

    query = query.order_by(Parent.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    parents = result.scalars().all()
    return parents


@router.post("", response_model=ParentRead, summary="Создание клиента")
async def create_parent(
    data: ParentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    parent = Parent(
        full_name=data.full_name,
        address=data.address,
        phone=data.phone,
        secondary_phone=data.secondary_phone,
        comment=data.comment,
        status=data.status,
        created_by=current_user.id,
    )
    db.add(parent)
    await db.flush()

    if data.children:
        if len(data.children) > settings.MAX_CHILDREN_PER_PARENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"К одному родителю нельзя прикрепить более {settings.MAX_CHILDREN_PER_PARENT} детей",
            )
        for child_data in data.children:
            child = Child(
                parent_id=parent.id,
                full_name=child_data.full_name,
                birth_date=child_data.birth_date,
                comment=child_data.comment,
                status=child_data.status,
            )
            db.add(child)

    await db.commit()
    await db.refresh(parent)
    return parent


@router.get("/{parent_id}", response_model=ParentRead, summary="Детали клиента")
async def get_parent(
    parent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    stmt = (
        select(Parent)
        .where(Parent.id == parent_id, Parent.deleted_at.is_(None))
        .options(selectinload(Parent.children))
    )
    parent = (await db.execute(stmt)).scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    return parent


@router.post("/{parent_id}/children", response_model=ChildRead, summary="Добавить ребенка родителю")
async def add_child(
    parent_id: uuid.UUID,
    data: ChildCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    parent = await db.get(Parent, parent_id)
    if not parent or parent.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")

    # Check 5 children limit
    count_stmt = select(func.count(Child.id)).where(
        Child.parent_id == parent_id,
        Child.deleted_at.is_(None),
        Child.status == ChildStatus.active,
    )
    current_children_count = (await db.execute(count_stmt)).scalar_one()
    if current_children_count >= settings.MAX_CHILDREN_PER_PARENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Достигнуто ограничение: максимум {settings.MAX_CHILDREN_PER_PARENT} активных детей у одного родителя",
        )

    child = Child(
        parent_id=parent_id,
        full_name=data.full_name,
        birth_date=data.birth_date,
        comment=data.comment,
        status=data.status,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)
    return child


@router.post("/child-subjects", response_model=ChildSubjectRead, summary="Прикрепить предмет и педагога к ребенку")
async def create_child_subject(
    data: ChildSubjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    child = await db.get(Child, data.child_id)
    if not child or child.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ребенок не найден")

    # Check 5 subjects limit
    count_stmt = select(func.count(ChildSubject.id)).where(
        ChildSubject.child_id == data.child_id,
        ChildSubject.is_active == True,
    )
    current_subjects_count = (await db.execute(count_stmt)).scalar_one()
    if current_subjects_count >= settings.MAX_SUBJECTS_PER_CHILD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Достигнуто ограничение: максимум {settings.MAX_SUBJECTS_PER_CHILD} активных предметов у одного ребенка",
        )

    cs = ChildSubject(
        child_id=data.child_id,
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        lesson_format=data.lesson_format,
        lesson_price=data.lesson_price,
        default_duration_minutes=data.default_duration_minutes,
        start_date=data.start_date,
        comment=data.comment,
    )
    db.add(cs)
    await db.commit()
    await db.refresh(cs)

    # Return with mapped fields
    return ChildSubjectRead(
        id=cs.id,
        child_id=cs.child_id,
        subject_id=cs.subject_id,
        subject_name=cs.subject.name,
        teacher_id=cs.teacher_id,
        teacher_name=cs.teacher.full_name,
        lesson_format=cs.lesson_format,
        lesson_price=cs.lesson_price,
        default_duration_minutes=cs.default_duration_minutes,
        start_date=cs.start_date,
        end_date=cs.end_date,
        is_active=cs.is_active,
        balance_lessons=0,
        completed_lessons=0,
    )
