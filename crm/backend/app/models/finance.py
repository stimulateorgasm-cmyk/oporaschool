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
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import (
    BalanceTransactionType,
    LessonFormat,
    PaymentMethod,
    SalaryPaymentStatus,
)


class LessonPackage(Base):
    __tablename__ = "lesson_packages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    child_subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("child_subjects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_payments.id", ondelete="RESTRICT"),
        nullable=True,
    )
    total_lessons: Mapped[int] = mapped_column(Integer, nullable=False)
    price_per_lesson: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    valid_from: Mapped[date] = mapped_column(
        Date, default=date.today, nullable=False
    )
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("total_lessons > 0", name="chk_package_total_lessons"),
        CheckConstraint("price_per_lesson >= 0", name="chk_package_price_per_lesson"),
        CheckConstraint("total_amount >= 0", name="chk_package_total_amount"),
        CheckConstraint(
            "valid_until IS NULL OR valid_until >= valid_from",
            name="chk_package_valid_until",
        ),
    )

    child: Mapped["Child"] = relationship("Child", back_populates="packages")
    child_subject: Mapped["ChildSubject"] = relationship("ChildSubject", back_populates="packages")
    subject: Mapped["Subject"] = relationship("Subject")
    payment: Mapped[Optional["ClientPayment"]] = relationship(
        "ClientPayment", back_populates="package"
    )
    balance_transactions: Mapped[List["LessonBalanceTransaction"]] = relationship(
        "LessonBalanceTransaction", back_populates="package"
    )
    payment_links: Mapped[List["LessonPaymentLink"]] = relationship(
        "LessonPaymentLink", back_populates="package"
    )


class ClientPayment(Base):
    __tablename__ = "client_payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parents.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    child_subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("child_subjects.id", ondelete="RESTRICT"),
        nullable=True,
    )
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    payment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    payment_method: Mapped[PaymentMethod] = mapped_column(
        String(20), default=PaymentMethod.card, nullable=False
    )
    lessons_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_per_lesson: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    is_reversed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    reversed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reversed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reversal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_payment_amount"),
        CheckConstraint("lessons_count IS NULL OR lessons_count > 0", name="chk_payment_lessons_count"),
        CheckConstraint("price_per_lesson IS NULL OR price_per_lesson >= 0", name="chk_payment_price_per_lesson"),
    )

    parent: Mapped["Parent"] = relationship("Parent", back_populates="payments", lazy="joined")
    child: Mapped["Child"] = relationship("Child", back_populates="payments", lazy="joined")
    package: Mapped[Optional["LessonPackage"]] = relationship(
        "LessonPackage", back_populates="payment", uselist=False
    )
    balance_transactions: Mapped[List["LessonBalanceTransaction"]] = relationship(
        "LessonBalanceTransaction", back_populates="payment"
    )
    payment_links: Mapped[List["LessonPaymentLink"]] = relationship(
        "LessonPaymentLink", back_populates="payment"
    )


class LessonBalanceTransaction(Base):
    __tablename__ = "lesson_balance_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("children.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    child_subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("child_subjects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    package_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lesson_packages.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    lesson_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_payments.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    transaction_type: Mapped[BalanceTransactionType] = mapped_column(
        String(30), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    reversal_of_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lesson_balance_transactions.id", ondelete="RESTRICT"),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint("quantity <> 0", name="chk_balance_quantity_not_zero"),
        Index("ix_lbt_child_subject_date", "child_id", "subject_id", "created_at"),
        Index("ix_lbt_child_subj_link_date", "child_subject_id", "created_at"),
        Index(
            "ux_balance_consumption_per_lesson",
            "lesson_id",
            unique=True,
            postgresql_where=(
                (transaction_type == "consumption") & (lesson_id != None)
            ),
        ),
        Index(
            "ux_balance_refund_per_lesson",
            "lesson_id",
            unique=True,
            postgresql_where=(
                (transaction_type == "refund") & (lesson_id != None)
            ),
        ),
    )

    child: Mapped["Child"] = relationship("Child", back_populates="balance_transactions")
    child_subject: Mapped["ChildSubject"] = relationship(
        "ChildSubject", back_populates="balance_transactions"
    )
    subject: Mapped["Subject"] = relationship("Subject")
    package: Mapped[Optional["LessonPackage"]] = relationship(
        "LessonPackage", back_populates="balance_transactions"
    )
    lesson: Mapped[Optional["Lesson"]] = relationship(
        "Lesson", back_populates="balance_transactions"
    )
    payment: Mapped[Optional["ClientPayment"]] = relationship(
        "ClientPayment", back_populates="balance_transactions"
    )


class LessonPaymentLink(Base):
    __tablename__ = "lesson_payment_links"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    package_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lesson_packages.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_payments.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    amount_covered: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("amount_covered >= 0", name="chk_lpl_amount_covered"),
        CheckConstraint(
            "package_id IS NOT NULL OR payment_id IS NOT NULL",
            name="chk_lpl_has_package_or_payment",
        ),
        Index("ux_lesson_package_link", "lesson_id", "package_id", unique=True),
    )

    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="payment_link")
    package: Mapped[Optional["LessonPackage"]] = relationship(
        "LessonPackage", back_populates="payment_links"
    )
    payment: Mapped[Optional["ClientPayment"]] = relationship(
        "ClientPayment", back_populates="payment_links"
    )


class TeacherRate(Base):
    __tablename__ = "teacher_rates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subjects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    lesson_format: Mapped[LessonFormat] = mapped_column(
        String(20), default=LessonFormat.individual, nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    valid_from: Mapped[date] = mapped_column(
        Date, default=date.today, nullable=False, index=True
    )
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_teacher_rate_amount"),
        CheckConstraint(
            "valid_until IS NULL OR valid_until >= valid_from",
            name="chk_teacher_rate_valid_until",
        ),
        Index("ix_tr_lookup", "teacher_id", "subject_id", "lesson_format", "valid_from"),
    )

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="rates")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="teacher_rates")


class TeacherSalaryAccrual(Base):
    __tablename__ = "teacher_salary_accruals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    teacher_rate_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teacher_rates.id", ondelete="SET NULL"),
        nullable=True,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    accrued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    is_reversed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    reversed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reversal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_salary_accrual_amount"),
    )

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="salary_accruals")
    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="salary_accrual")
    rate: Mapped[Optional["TeacherRate"]] = relationship("TeacherRate")


class TeacherSalaryPayment(Base):
    __tablename__ = "teacher_salary_payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teachers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    payment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    period_from: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    period_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        String(20), default=PaymentMethod.bank_transfer, nullable=False
    )
    status: Mapped[SalaryPaymentStatus] = mapped_column(
        String(20), default=SalaryPaymentStatus.active, nullable=False, index=True
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reversed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reversed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reversal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_salary_payment_amount"),
        CheckConstraint(
            "period_to IS NULL OR period_from IS NULL OR period_to >= period_from",
            name="chk_salary_payment_period",
        ),
    )

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="salary_payments")
