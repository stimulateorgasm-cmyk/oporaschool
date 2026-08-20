import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import ChildStatus, ClientStatus


class ChildBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    birth_date: Optional[date] = None
    comment: Optional[str] = None
    status: ChildStatus = ChildStatus.active


class ChildCreate(ChildBase):
    pass


class ChildUpdate(BaseModel):
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    comment: Optional[str] = None
    status: Optional[ChildStatus] = None


class ChildRead(ChildBase):
    id: uuid.UUID
    parent_id: uuid.UUID
    created_at: datetime
    active_subjects_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ParentBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    address: Optional[str] = None
    phone: str = Field(..., min_length=10, max_length=20)
    secondary_phone: Optional[str] = None
    comment: Optional[str] = None
    status: ClientStatus = ClientStatus.active


class ParentCreate(ParentBase):
    children: Optional[List[ChildCreate]] = None


class ParentUpdate(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    comment: Optional[str] = None
    status: Optional[ClientStatus] = None


class ParentRead(ParentBase):
    id: uuid.UUID
    created_at: datetime
    children: List[ChildRead] = []
    total_balance_lessons: int = 0

    model_config = ConfigDict(from_attributes=True)
