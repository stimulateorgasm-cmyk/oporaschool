import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import LessonFormat, TeacherStatus


class SubjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class SubjectCreate(SubjectBase):
    pass


class SubjectRead(SubjectBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeacherRateCreate(BaseModel):
    subject_id: uuid.UUID
    lesson_format: LessonFormat = LessonFormat.individual
    amount: Decimal = Field(..., ge=0)
    valid_from: date = Field(default_factory=date.today)
    valid_until: Optional[date] = None


class TeacherRateRead(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: Optional[str] = None
    lesson_format: LessonFormat
    amount: Decimal
    valid_from: date
    valid_until: Optional[date] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeacherBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=10, max_length=20)
    start_date: Optional[date] = None
    status: TeacherStatus = TeacherStatus.active
    comment: Optional[str] = None


class TeacherCreate(TeacherBase):
    user_id: Optional[uuid.UUID] = None
    subject_ids: List[uuid.UUID] = []
    initial_rates: Optional[List[TeacherRateCreate]] = None


class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    start_date: Optional[date] = None
    status: Optional[TeacherStatus] = None
    comment: Optional[str] = None
    subject_ids: Optional[List[uuid.UUID]] = None


class TeacherRead(TeacherBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    created_at: datetime
    subjects: List[SubjectRead] = []
    rates: List[TeacherRateRead] = []
    total_accrued: Decimal = Decimal("0.00")
    total_paid: Decimal = Decimal("0.00")
    debt: Decimal = Decimal("0.00")
    overpayment: Decimal = Decimal("0.00")

    model_config = ConfigDict(from_attributes=True)


class ChildSubjectCreate(BaseModel):
    child_id: uuid.UUID
    subject_id: uuid.UUID
    teacher_id: uuid.UUID
    lesson_format: LessonFormat = LessonFormat.individual
    lesson_price: Decimal = Field(..., ge=0)
    default_duration_minutes: int = Field(default=60, gt=0)
    start_date: date = Field(default_factory=date.today)
    comment: Optional[str] = None


class ChildSubjectRead(BaseModel):
    id: uuid.UUID
    child_id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: str
    teacher_id: uuid.UUID
    teacher_name: str
    lesson_format: LessonFormat
    lesson_price: Decimal
    default_duration_minutes: int
    start_date: date
    end_date: Optional[date] = None
    is_active: bool
    balance_lessons: int = 0
    completed_lessons: int = 0

    model_config = ConfigDict(from_attributes=True)
