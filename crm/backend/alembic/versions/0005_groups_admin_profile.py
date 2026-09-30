"""группы + служебные поля админа + повтор занятий + редактирование

Revision ID: 0005_groups_admin_profile_recurrence
Revises: 0004_profile_rooms_teachers
Create Date: 2026-09-30

- users: first_name/last_name (разделение ФИО), work_schedule, rate, shifts_count
- groups + group_members (группы учеников)
- lessons: group_id FK (SET NULL), child_id/child_subject_id теперь nullable (групповые занятия без ребёнка)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0005_groups_admin_profile"
down_revision: Union[str, None] = "0004_profile_rooms_teachers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # — служебные поля админа (пункт 1)
    op.add_column("users", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("work_schedule", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("rate", sa.Numeric(12, 2), nullable=True))
    op.add_column("users", sa.Column("shifts_count", sa.Integer(), nullable=True))

    # — группы (пункт 4)
    op.create_table(
        "groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(150), unique=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_table(
        "group_members",
        sa.Column(
            "group_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "child_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("children.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # — групповые занятия (пункт 4): group_id + ослабляем обязательность ребёнка
    op.add_column("lessons", sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_lessons_group_id_groups",
        "lessons",
        "groups",
        ["group_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_lessons_group_id", "lessons", ["group_id"])
    op.alter_column("lessons", "child_id", existing_type=postgresql.UUID(), nullable=True)
    op.alter_column("lessons", "child_subject_id", existing_type=postgresql.UUID(), nullable=True)


def downgrade() -> None:
    op.alter_column("lessons", "child_subject_id", existing_type=postgresql.UUID(), nullable=False)
    op.alter_column("lessons", "child_id", existing_type=postgresql.UUID(), nullable=False)
    op.drop_index("ix_lessons_group_id", table_name="lessons")
    op.drop_constraint("fk_lessons_group_id_groups", "lessons", type_="foreignkey")
    op.drop_column("lessons", "group_id")

    op.drop_table("group_members")
    op.drop_table("groups")

    op.drop_column("users", "shifts_count")
    op.drop_column("users", "rate")
    op.drop_column("users", "work_schedule")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
