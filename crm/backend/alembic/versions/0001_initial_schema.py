"""initial schema with roles, users, clients, subjects, lessons, ledger balance, rates, and audit log

Revision ID: 0001_initial
Revises: 
Create Date: 2026-08-20 10:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users & RBAC
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(20), unique=True, nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_phone", "users", ["phone"])

    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_system", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(100), unique=True, nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
    )

    op.create_table(
        "user_roles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )

    op.create_table(
        "role_permissions",
        sa.Column("role_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("permission_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 2. Clients
    op.create_table(
        "parents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("secondary_phone", sa.String(20), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_parents_phone", "parents", ["phone"])

    op.create_table(
        "children",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("parents.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_children_parent_id", "children", ["parent_id"])

    # 3. Academic Structure
    op.create_table(
        "subjects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(150), unique=True, nullable=False),
        sa.Column("code", sa.String(50), unique=True, nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "teachers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "teacher_subjects",
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teachers.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "child_subjects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("lesson_format", sa.String(20), server_default="individual", nullable=False),
        sa.Column("lesson_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("default_duration_minutes", sa.SmallInteger(), server_default="60", nullable=False),
        sa.Column("start_date", sa.Date(), server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("lesson_price >= 0", name="chk_child_subject_price"),
        sa.CheckConstraint("default_duration_minutes > 0", name="chk_child_subject_duration"),
    )
    op.create_index("ix_cs_child_subject_teacher", "child_subjects", ["child_id", "subject_id", "teacher_id"])

    # 4. Rooms and Schedule
    op.create_table(
        "rooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("number", sa.SmallInteger(), unique=True, nullable=False),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("capacity", sa.SmallInteger(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_subjects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), server_default="scheduled", nullable=False),
        sa.Column("attendance_status", sa.String(30), server_default="unknown", nullable=False),
        sa.Column("payment_status", sa.String(30), server_default="unpaid", nullable=False),
        sa.Column("lesson_format", sa.String(20), server_default="individual", nullable=False),
        sa.Column("client_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("teacher_rate_snapshot", sa.Numeric(12, 2), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("ends_at > starts_at", name="chk_lesson_time_range"),
        sa.CheckConstraint("client_price >= 0", name="chk_lesson_client_price"),
    )
    op.create_index("ix_lessons_child_time", "lessons", ["child_id", "starts_at"])
    op.create_index("ix_lessons_teacher_time", "lessons", ["teacher_id", "starts_at"])
    op.create_index("ix_lessons_room_time", "lessons", ["room_id", "starts_at"])

    op.create_table(
        "lesson_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("change_type", sa.String(50), nullable=False),
        sa.Column("old_values", postgresql.JSONB(), nullable=True),
        sa.Column("new_values", postgresql.JSONB(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    # 5. Finance, Payments, Packages, Ledger
    op.create_table(
        "client_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("parents.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("child_subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_subjects.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("payment_method", sa.String(20), server_default="card", nullable=False),
        sa.Column("lessons_count", sa.Integer(), nullable=True),
        sa.Column("price_per_lesson", sa.Numeric(12, 2), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_reversed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reversed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reversal_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("amount > 0", name="chk_payment_amount"),
    )

    op.create_table(
        "lesson_packages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("child_subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_subjects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("client_payments.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("total_lessons", sa.Integer(), nullable=False),
        sa.Column("price_per_lesson", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("valid_from", sa.Date(), server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("total_lessons > 0", name="chk_package_total_lessons"),
        sa.CheckConstraint("price_per_lesson >= 0", name="chk_package_price_per_lesson"),
        sa.CheckConstraint("total_amount >= 0", name="chk_package_total_amount"),
    )

    op.create_table(
        "lesson_balance_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("child_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("children.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("child_subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("child_subjects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("package_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lesson_packages.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("client_payments.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("transaction_type", sa.String(30), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("reversal_of_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lesson_balance_transactions.id", ondelete="RESTRICT"), nullable=True),
        sa.CheckConstraint("quantity <> 0", name="chk_balance_quantity_not_zero"),
    )
    op.create_index("ix_lbt_child_subject_date", "lesson_balance_transactions", ["child_id", "subject_id", "created_at"])
    op.create_index("ix_lbt_child_subj_link_date", "lesson_balance_transactions", ["child_subject_id", "created_at"])
    op.create_index(
        "ux_balance_consumption_per_lesson",
        "lesson_balance_transactions",
        ["lesson_id"],
        unique=True,
        postgresql_where=sa.text("transaction_type = 'consumption' AND lesson_id IS NOT NULL"),
    )
    op.create_index(
        "ux_balance_refund_per_lesson",
        "lesson_balance_transactions",
        ["lesson_id"],
        unique=True,
        postgresql_where=sa.text("transaction_type = 'refund' AND lesson_id IS NOT NULL"),
    )

    op.create_table(
        "teacher_rates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("lesson_format", sa.String(20), server_default="individual", nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("valid_from", sa.Date(), server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("amount >= 0", name="chk_teacher_rate_amount"),
    )

    op.create_table(
        "teacher_salary_accruals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="RESTRICT"), unique=True, nullable=False),
        sa.Column("teacher_rate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teacher_rates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("accrued_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("is_reversed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reversal_reason", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("amount >= 0", name="chk_salary_accrual_amount"),
    )

    op.create_table(
        "teacher_salary_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_date", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("period_from", sa.Date(), nullable=True),
        sa.Column("period_to", sa.Date(), nullable=True),
        sa.Column("payment_method", sa.String(20), server_default="bank_transfer", nullable=False),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reversed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reversal_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("amount > 0", name="chk_salary_payment_amount"),
    )

    # 6. Audit & System
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("old_values", postgresql.JSONB(), nullable=True),
        sa.Column("new_values", postgresql.JSONB(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_audit_log_user_date", "audit_log", ["user_id", "created_at"])
    op.create_index("ix_audit_log_entity", "audit_log", ["entity_type", "entity_id"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("teacher_salary_payments")
    op.drop_table("teacher_salary_accruals")
    op.drop_table("teacher_rates")
    op.drop_table("lesson_balance_transactions")
    op.drop_table("lesson_packages")
    op.drop_table("client_payments")
    op.drop_table("lesson_history")
    op.drop_table("lessons")
    op.drop_table("rooms")
    op.drop_table("child_subjects")
    op.drop_table("teacher_subjects")
    op.drop_table("teachers")
    op.drop_table("subjects")
    op.drop_table("children")
    op.drop_table("parents")
    op.drop_table("refresh_tokens")
    op.drop_table("role_permissions")
    op.drop_table("user_roles")
    op.drop_table("permissions")
    op.drop_table("roles")
    op.drop_table("users")
