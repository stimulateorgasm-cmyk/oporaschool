import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import (
    BalanceTransactionType,
    PaymentMethod,
    SalaryPaymentStatus,
)


class PaymentCreate(BaseModel):
    parent_id: uuid.UUID
    child_id: uuid.UUID
    child_subject_id: uuid.UUID
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.card
    lessons_count: int = Field(..., gt=0)
    comment: Optional[str] = None


class PaymentRead(BaseModel):
    id: uuid.UUID
    parent_id: uuid.UUID
    parent_name: Optional[str] = None
    child_id: uuid.UUID
    child_name: Optional[str] = None
    subject_id: Optional[uuid.UUID] = None
    subject_name: Optional[str] = None
    amount: Decimal
    payment_date: datetime
    payment_method: PaymentMethod
    lessons_count: Optional[int] = None
    price_per_lesson: Optional[Decimal] = None
    comment: Optional[str] = None
    is_reversed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BalanceTransactionRead(BaseModel):
    id: uuid.UUID
    child_id: uuid.UUID
    child_subject_id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: Optional[str] = None
    package_id: Optional[uuid.UUID] = None
    lesson_id: Optional[uuid.UUID] = None
    payment_id: Optional[uuid.UUID] = None
    transaction_type: BalanceTransactionType
    quantity: int
    comment: Optional[str] = None
    created_at: datetime
    created_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BalanceCorrectionRequest(BaseModel):
    child_id: uuid.UUID
    child_subject_id: uuid.UUID
    quantity: int = Field(..., description="Положительное или отрицательное число (не 0)")
    reason: str = Field(..., min_length=3, description="Обязательная причина ручной корректировки")
    comment: Optional[str] = None


class SubjectBalanceSummary(BaseModel):
    child_subject_id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: str
    teacher_name: str
    total_purchased: int
    total_consumed: int
    remaining_balance: int
    low_balance_warning: bool
    transactions: List[BalanceTransactionRead] = []


class TeacherSalaryAccrualRead(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    lesson_id: uuid.UUID
    lesson_date: Optional[datetime] = None
    subject_name: Optional[str] = None
    amount: Decimal
    accrued_at: datetime
    is_reversed: bool
    reversal_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TeacherSalaryPaymentCreate(BaseModel):
    teacher_id: uuid.UUID
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod = PaymentMethod.bank_transfer
    period_from: Optional[date] = None
    period_to: Optional[date] = None
    comment: Optional[str] = None


class TeacherSalaryPaymentRead(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    teacher_name: Optional[str] = None
    amount: Decimal
    payment_date: datetime
    period_from: Optional[date] = None
    period_to: Optional[date] = None
    payment_method: PaymentMethod
    status: SalaryPaymentStatus
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeacherSalarySummary(BaseModel):
    teacher_id: uuid.UUID
    teacher_name: str
    total_accrued: Decimal
    total_paid: Decimal
    debt: Decimal
    overpayment: Decimal
    accruals: List[TeacherSalaryAccrualRead] = []
    payments: List[TeacherSalaryPaymentRead] = []
