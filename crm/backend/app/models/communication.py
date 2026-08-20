import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import MailingStatus, MessageStatus


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    channel: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[MessageStatus] = mapped_column(
        String(20), default=MessageStatus.created, nullable=False, index=True
    )
    provider_message_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, index=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            "parent_id IS NOT NULL OR teacher_id IS NOT NULL",
            name="chk_message_recipient_binding",
        ),
    )

    parent: Mapped[Optional["Parent"]] = relationship("Parent", back_populates="messages")
    teacher: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="messages")


class MailingCampaign(Base):
    __tablename__ = "mailing_campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    channel: Mapped[str] = mapped_column(String(30), default="sms", nullable=False)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    filters: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    status: Mapped[MailingStatus] = mapped_column(
        String(20), default=MailingStatus.draft, nullable=False, index=True
    )
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    recipients: Mapped[List["MailingRecipient"]] = relationship(
        "MailingRecipient", back_populates="campaign", cascade="all, delete-orphan", lazy="selectin"
    )


class MailingRecipient(Base):
    __tablename__ = "mailing_recipients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mailing_campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[MessageStatus] = mapped_column(
        String(20), default=MessageStatus.created, nullable=False, index=True
    )
    provider_message_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ux_mailing_campaign_recipient", "campaign_id", "recipient", unique=True),
    )

    campaign: Mapped["MailingCampaign"] = relationship("MailingCampaign", back_populates="recipients")
    parent: Mapped[Optional["Parent"]] = relationship("Parent")
