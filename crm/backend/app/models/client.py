import uuid
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import ChildStatus, ClientStatus


class Parent(Base):
    __tablename__ = "parents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    secondary_phone: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, index=True
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ClientStatus] = mapped_column(
        String(20), default=ClientStatus.active, nullable=False, index=True
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
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    children: Mapped[List["Child"]] = relationship(
        "Child", back_populates="parent", cascade="all, delete-orphan", lazy="selectin"
    )
    payments: Mapped[List["ClientPayment"]] = relationship(
        "ClientPayment", back_populates="parent"
    )
    messages: Mapped[List["Message"]] = relationship(
        "Message", back_populates="parent"
    )


class Child(Base):
    __tablename__ = "children"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parents.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    birth_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ChildStatus] = mapped_column(
        String(20), default=ChildStatus.active, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    parent: Mapped["Parent"] = relationship("Parent", back_populates="children")
    child_subjects: Mapped[List["ChildSubject"]] = relationship(
        "ChildSubject", back_populates="child", cascade="all, delete-orphan", lazy="selectin"
    )
    lessons: Mapped[List["Lesson"]] = relationship(
        "Lesson", back_populates="child"
    )
    payments: Mapped[List["ClientPayment"]] = relationship(
        "ClientPayment", back_populates="child"
    )
    balance_transactions: Mapped[List["LessonBalanceTransaction"]] = relationship(
        "LessonBalanceTransaction", back_populates="child"
    )
    packages: Mapped[List["LessonPackage"]] = relationship(
        "LessonPackage", back_populates="child"
    )
