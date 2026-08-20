import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import LessonFormat, TeacherStatus


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    teachers: Mapped[List["Teacher"]] = relationship(
        "Teacher", secondary="teacher_subjects", back_populates="subjects"
    )
    child_subjects: Mapped[List["ChildSubject"]] = relationship(
        "ChildSubject", back_populates="subject"
    )
    teacher_rates: Mapped[List["TeacherRate"]] = relationship(
        "TeacherRate", back_populates="subject"
    )


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"

    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="CASCADE"),
        primary_key=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="RESTRICT"),
        primary_key=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[TeacherStatus] = mapped_column(
        String(20), default=TeacherStatus.active, nullable=False, index=True
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped[Optional["User"]] = relationship(
        "User", back_populates="teacher_profile"
    )
    subjects: Mapped[List["Subject"]] = relationship(
        "Subject",
        secondary="teacher_subjects",
        back_populates="teachers",
        lazy="selectin",
    )
    child_subjects: Mapped[List["ChildSubject"]] = relationship(
        "ChildSubject", back_populates="teacher"
    )
    lessons: Mapped[List["Lesson"]] = relationship(
        "Lesson", back_populates="teacher"
    )
    rates: Mapped[List["TeacherRate"]] = relationship(
        "TeacherRate", back_populates="teacher", cascade="all, delete-orphan", lazy="selectin"
    )
    salary_accruals: Mapped[List["TeacherSalaryAccrual"]] = relationship(
        "TeacherSalaryAccrual", back_populates="teacher"
    )
    salary_payments: Mapped[List["TeacherSalaryPayment"]] = relationship(
        "TeacherSalaryPayment", back_populates="teacher"
    )
    messages: Mapped[List["Message"]] = relationship(
        "Message", back_populates="teacher"
    )


class ChildSubject(Base):
    __tablename__ = "child_subjects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
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
    lesson_format: Mapped[LessonFormat] = mapped_column(
        String(20), default=LessonFormat.individual, nullable=False
    )
    lesson_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    default_duration_minutes: Mapped[int] = mapped_column(
        SmallInteger, default=60, nullable=False
    )
    start_date: Mapped[date] = mapped_column(
        Date, default=date.today, nullable=False
    )
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("lesson_price >= 0", name="chk_child_subjects_price"),
        CheckConstraint("default_duration_minutes > 0", name="chk_child_subjects_duration"),
        Index(
            "ux_child_subject_active",
            "child_id",
            "subject_id",
            "teacher_id",
            "lesson_format",
            unique=True,
            postgresql_where=(is_active == True),
        ),
    )

    child: Mapped["Child"] = relationship("Child", back_populates="child_subjects")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="child_subjects", lazy="joined")
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="child_subjects", lazy="joined")
    lessons: Mapped[List["Lesson"]] = relationship("Lesson", back_populates="child_subject")
    packages: Mapped[List["LessonPackage"]] = relationship("LessonPackage", back_populates="child_subject")
    balance_transactions: Mapped[List["LessonBalanceTransaction"]] = relationship(
        "LessonBalanceTransaction", back_populates="child_subject"
    )
