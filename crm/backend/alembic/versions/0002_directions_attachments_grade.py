"""add child grade/learning_goal, attachments, lesson attachment, seed 15 directions

Revision ID: 0002_directions_attachments
Revises: 0001_initial
Create Date: 2026-08-25 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import uuid
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0002_directions_attachments"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# 15 реальных направлений центра «Опора» (из JSON-LD сайта opora.school)
DIRECTIONS = [
    ("Математика 1-4 классы", "MATH_1_4", "Математика для начальной школы (1-4 классы)"),
    ("Русский язык 1-4 классы", "RUS_1_4", "Русский язык для начальной школы (1-4 классы)"),
    ("Математика 5-8 классы", "MATH_5_8", "Математика для средней школы (5-8 классы)"),
    ("Русский язык 5-8 классы", "RUS_5_8", "Русский язык для средней школы (5-8 классы)"),
    ("Подготовка к ОГЭ по Математике", "OGE_MATH", "Подготовка к ОГЭ по математике"),
    ("Подготовка к ОГЭ по Русскому языку", "OGE_RUS", "Подготовка к ОГЭ по русскому языку"),
    ("Подготовка к ЕГЭ по Математике", "EGE_MATH", "Подготовка к ЕГЭ по математике"),
    ("Химия", "CHEM", "Химия, подготовка к экзаменам"),
    ("Физика", "PHYS", "Физика, подготовка к экзаменам"),
    ("Английский язык", "ENG", "Английский язык для школьников"),
    ("История ОГЭ/ЕГЭ", "HIST", "История, подготовка к ОГЭ и ЕГЭ"),
    ("Обществознание ОГЭ/ЕГЭ", "SOC", "Обществознание, подготовка к ОГЭ и ЕГЭ"),
    ("Литература ОГЭ/ЕГЭ", "LIT", "Литература, подготовка к ОГЭ и ЕГЭ"),
    ("Логопед", "LOGOPED", "Логопедия: постановка речи и звуков"),
    ("Нейропсихолог", "NEUROPSY", "Детская нейропсихология"),
]


def upgrade() -> None:
    # 1. Ребёнок: класс + цель обучения вместо даты рождения в форме
    op.add_column("children", sa.Column("grade", sa.String(20), nullable=True))
    op.add_column("children", sa.Column("learning_goal", sa.Text(), nullable=True))

    # 2. Вложения (метаданные + путь на локальном диске)
    op.create_table(
        "attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_type", sa.String(20), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_attachments_owner_type", "attachments", ["owner_type"])
    op.create_index("ix_attachments_owner_id", "attachments", ["owner_id"])
    op.create_index("ix_attachments_owner", "attachments", ["owner_type", "owner_id"])

    # 3. Занятие: обязательное вложение
    op.add_column(
        "lessons",
        sa.Column("attachment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("attachments.id", ondelete="SET NULL"), nullable=True),
    )

    # 4. Направления: архивируем старые 4 заглушки и заводим 15 реальных
    op.execute("UPDATE subjects SET is_active = false WHERE code IN ('MATH', 'RUS', 'NEURO', 'LOGO')")

    subjects_table = sa.table(
        "subjects",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String()),
        sa.column("code", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(
        subjects_table,
        [
            {
                "id": uuid.uuid4(),
                "name": name,
                "code": code,
                "description": desc,
                "is_active": True,
            }
            for name, code, desc in DIRECTIONS
        ],
    )


def downgrade() -> None:
    op.drop_column("lessons", "attachment_id")
    op.drop_index("ix_attachments_owner", table_name="attachments")
    op.drop_index("ix_attachments_owner_id", table_name="attachments")
    op.drop_index("ix_attachments_owner_type", table_name="attachments")
    op.drop_table("attachments")
    op.drop_column("children", "learning_goal")
    op.drop_column("children", "grade")
