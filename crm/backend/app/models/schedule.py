import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import (
    AttendanceStatus,
    LessonFormat,
    LessonPaymentStatus,
    LessonStatus,
)


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    number: Mapped[int] = mapped_column(SmallInteger, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    capacity: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("number > 0", name="chk_room_number"),
        CheckConstraint("capacity IS NULL OR capacity > 0", name="chk_room_capacity"),
    )

    lessons: Mapped[List["Lesson"]] = relationship("Lesson", back_populates="room")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    child_subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("child_subjects.id", ondelete="RESTRICT"),
        nullable=False,
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    ends_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    status: Mapped[LessonStatus] = mapped_column(
        String(20), default=LessonStatus.scheduled, nullable=False, index=True
    )
    attendance_status: Mapped[AttendanceStatus] = mapped_column(
        String(30), default=AttendanceStatus.unknown, nullable=False, index=True
    )
    payment_status: Mapped[LessonPaymentStatus] = mapped_column(
        String(30), default=LessonPaymentStatus.unpaid, nullable=False, index=True
    )
    lesson_format: Mapped[LessonFormat] = mapped_column(
        String(20), default=LessonFormat.individual, nullable=False
    )
    client_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    teacher_rate_snapshot: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
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

    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="chk_lesson_time_range"),
        CheckConstraint("client_price >= 0", name="chk_lesson_client_price"),
        CheckConstraint(
            "teacher_rate_snapshot IS NULL OR teacher_rate_snapshot >= 0",
            name="chk_lesson_teacher_rate",
        ),
        Index("ix_lessons_child_time", "child_id", "starts_at"),
        Index("ix_lessons_teacher_time", "teacher_id", "starts_at"),
        Index("ix_lessons_room_time", "room_id", "starts_at"),
    )

    child_subject: Mapped["ChildSubject"] = relationship("ChildSubject", back_populates="lessons")
    child: Mapped["Child"] = relationship("Child", back_populates="lessons", lazy="joined")
    subject: Mapped["Subject"] = relationship("Subject", lazy="joined")
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="lessons", lazy="joined")
    room: Mapped["Room"] = relationship("Room", back_populates="lessons", lazy="joined")
    history: Mapped[List["LessonHistory"]] = relationship(
        "LessonHistory", back_populates="lesson", cascade="all, delete-orphan", lazy="selectin"
    )
    balance_transactions: Mapped[List["LessonBalanceTransaction"]] = relationship(
        "LessonBalanceTransaction", back_populates="lesson"
    )
    salary_accrual: Mapped[Optional["TeacherSalaryAccrual"]] = relationship(
        "TeacherSalaryAccrual", back_populates="lesson", uselist=False
    )
    payment_link: Mapped[Optional["LessonPaymentLink"]] = relationship(
        "LessonPaymentLink", back_populates="lesson", uselist=False
    )


class LessonHistory(Base):
    __tablename__ = "lesson_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    change_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    old_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="history")
