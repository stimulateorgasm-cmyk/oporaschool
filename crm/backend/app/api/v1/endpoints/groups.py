import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.rbac import require_roles
from app.models.auth import User
from app.models.client import Child
from app.models.schedule import Group, GroupMember
from app.schemas.schedule import GroupCreate, GroupMemberAdd, GroupRead, GroupUpdate

router = APIRouter(prefix="/groups", tags=["Группы"])


def _with_members():
    # участников грузим selectin, чтобы свойство group.children не лезло в lazy-load
    return selectinload(Group.members).selectinload(GroupMember.child)


def _loaded_group(db, group_id):
    stmt = select(Group).where(Group.id == group_id).options(_with_members())
    return db.execute(stmt)


async def _get_group(db, group_id) -> Group:
    group = (await _loaded_group(db, group_id)).scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")
    return group


@router.get("", response_model=List[GroupRead], summary="Список групп")
async def list_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    stmt = select(Group).order_by(Group.name).options(_with_members())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=GroupRead, summary="Создать группу")
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    exists = (
        await db.execute(select(Group).where(Group.name == data.name))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Группа с таким названием уже есть",
        )
    group = Group(name=data.name)
    db.add(group)
    await db.commit()
    return await _get_group(db, group.id)


@router.get("/{group_id}", response_model=GroupRead, summary="Детали группы")
async def get_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    return await _get_group(db, group_id)


@router.patch("/{group_id}", response_model=GroupRead, summary="Переименовать группу")
async def update_group(
    group_id: uuid.UUID,
    data: GroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")
    if data.name:
        dup = (
            await db.execute(
                select(Group).where(Group.name == data.name, Group.id != group_id)
            )
        ).scalar_one_or_none()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Группа с таким названием уже есть",
            )
        group.name = data.name
        await db.commit()
    return await _get_group(db, group_id)


@router.delete("/{group_id}", summary="Удалить группу")
async def delete_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")
    await db.delete(group)
    await db.commit()
    return {"status": "success", "message": "Группа удалена"}


@router.post("/{group_id}/members", response_model=GroupRead, summary="Добавить участника")
async def add_member(
    group_id: uuid.UUID,
    data: GroupMemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Группа не найдена")
    child = await db.get(Child, data.child_id)
    if not child or child.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ребёнок не найден")

    exists = (
        await db.execute(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.child_id == data.child_id,
            )
        )
    ).scalar_one_or_none()
    if not exists:
        db.add(GroupMember(group_id=group_id, child_id=data.child_id))
        await db.commit()
    return await _get_group(db, group_id)


@router.delete("/{group_id}/members/{child_id}", response_model=GroupRead, summary="Убрать участника")
async def remove_member(
    group_id: uuid.UUID,
    child_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["administrator", "manager"])),
):
    member = (
        await db.execute(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.child_id == child_id,
            )
        )
    ).scalar_one_or_none()
    if member:
        await db.delete(member)
        await db.commit()
    return await _get_group(db, group_id)
