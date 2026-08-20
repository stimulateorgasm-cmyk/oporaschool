import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import MailingStatus, MessageStatus


class MessageCreate(BaseModel):
    parent_id: Optional[uuid.UUID] = None
    teacher_id: Optional[uuid.UUID] = None
    recipient: str = Field(..., example="+79180000000")
    channel: str = Field(default="sms", example="sms")
    message_text: str = Field(..., min_length=1)


class MessageRead(BaseModel):
    id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    teacher_id: Optional[uuid.UUID] = None
    channel: str
    recipient: str
    message_text: str
    status: MessageStatus
    created_at: datetime
    sent_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MailingCampaignFilter(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    teacher_id: Optional[uuid.UUID] = None
    zero_balance_only: bool = False
    low_balance_only: bool = False
    with_debt_only: bool = False
    parent_ids: Optional[List[uuid.UUID]] = None


class MailingCampaignCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    channel: str = Field(default="sms")
    message_text: str = Field(..., min_length=1)
    filters: Optional[MailingCampaignFilter] = None
    scheduled_at: Optional[datetime] = None


class MailingRecipientRead(BaseModel):
    id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    recipient: str
    status: MessageStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MailingCampaignRead(BaseModel):
    id: uuid.UUID
    name: str
    channel: str
    message_text: str
    filters: Optional[dict] = None
    status: MailingStatus
    recipients_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
