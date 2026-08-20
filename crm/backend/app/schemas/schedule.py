import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import (
    AttendanceStatus,
    LessonFormat,
    LessonPaymentStatus,
    LessonStatus,
)


class RoomBase(BaseModel):
    number: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=100)
    capacity: Optional[int] = Field(default=None, gt=0)
    is_active: bool = True


class RoomCreate(RoomBase):
    pass


class RoomRead(RoomBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LessonCreate(BaseModel):
    child_subject_id: uuid.UUID
    room_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    comment: Optional[str] = None


class LessonMoveRequest(BaseModel):
    new_starts_at: datetime
    new_ends_at: datetime
    new_room_id: Optional[uuid.UUID] = None
    reason: Optional[str] = Field(None, description="Причина переноса")


class LessonAttendanceRequest(BaseModel):
    attendance_status: AttendanceStatus = Field(..., description="present, absent, etc.")
    charge_absent: Optional[bool] = Field(
        None, description="Списать ли занятие при статусе absent (если None - согласно правилам центра)"
    )
    comment: Optional[str] = None


class LessonCancelRequest(BaseModel):
    reason: Optional[str] = None
    refund_balance: bool = True


class LessonHistoryRead(BaseModel):
    id: uuid.UUID
    change_type: str
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    reason: Optional[str] = None
    created_at: datetime
    changed_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LessonRead(BaseModel):
    id: uuid.UUID
    child_subject_id: uuid.UUID
    child_id: uuid.UUID
    child_name: str
    parent_id: Optional[uuid.UUID] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    subject_id: uuid.UUID
    subject_name: str
    teacher_id: uuid.UUID
    teacher_name: str
    room_id: uuid.UUID
    room_name: str
    starts_at: datetime
    ends_at: datetime
    status: LessonStatus
    attendance_status: AttendanceStatus
    payment_status: LessonPaymentStatus
    lesson_format: LessonFormat
    client_price: Decimal
    teacher_rate_snapshot: Optional[Decimal] = None
    comment: Optional[str] = None
    created_at: datetime
    history: List[LessonHistoryRead] = []

    model_config = ConfigDict(from_attributes=True)
