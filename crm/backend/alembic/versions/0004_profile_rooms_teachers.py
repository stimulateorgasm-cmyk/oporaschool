"""профиль пользователя + фото педагогов + 7 кабинетов + убрать поля ребёнка

Revision ID: 0004_profile_rooms_teachers
Revises: 0003_new_teachers_directions
Create Date: 2026-09-24

- users.avatar_path (фото профиля, C1)
- teachers.photo_path (фото педагога, C7)
- children: убираем comment и learning_goal (C2 — комментарий остаётся только у родителя)
- кабинеты 1–7 без названий (name = номер строкой), upsert чтобы не порвать FK lessons.room_id
"""
from typing import Sequence, Union

import uuid

import sqlalchemy as sa
from alembic import op

revision: str = "0004_profile_rooms_teachers"
down_revision: Union[str, None] = "0003_new_teachers_directions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_path", sa.String(500), nullable=True))
    op.add_column("teachers", sa.Column("photo_path", sa.String(500), nullable=True))

    op.drop_column("children", "learning_goal")
    op.drop_column("children", "comment")

    conn = op.get_bind()
    for n in range(1, 8):
        name = str(n)
        exists = conn.execute(
            sa.text("SELECT id FROM rooms WHERE number = :n"), {"n": n}
        ).scalar()
        if exists:
            conn.execute(
                sa.text("UPDATE rooms SET name = :name WHERE number = :n"),
                {"name": name, "n": n},
            )
        else:
            conn.execute(
                sa.text(
                    "INSERT INTO rooms (id, number, name, capacity, is_active) "
                    "VALUES (:id, :n, :name, NULL, true)"
                ),
                {"id": uuid.uuid4(), "n": n, "name": name},
            )


def downgrade() -> None:
    op.drop_column("users", "avatar_path")
    op.drop_column("teachers", "photo_path")
    op.add_column("children", sa.Column("learning_goal", sa.Text(), nullable=True))
    op.add_column("children", sa.Column("comment", sa.Text(), nullable=True))
