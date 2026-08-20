import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SettingRead(BaseModel):
    id: uuid.UUID
    key: str
    value: dict
    description: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SettingUpdate(BaseModel):
    value: dict
    description: Optional[str] = None


class AuditLogRead(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user_name: Optional[str] = None
    entity_type: str
    entity_id: Optional[uuid.UUID] = None
    action: str
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardMetrics(BaseModel):
    total_clients: int
    active_children: int
    lessons_today: int
    lessons_completed_month: int
    revenue_month: float
    salary_accrued_month: float
    salary_paid_month: float
    total_teacher_debt: float
    total_teacher_overpayment: float
    free_rooms_now: int
    zero_balance_children_count: int
    low_balance_children_count: int
