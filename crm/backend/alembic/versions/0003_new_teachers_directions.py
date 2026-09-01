"""add 2 directions + 2 new teachers (Ткачёва, Вершинина)

Revision ID: 0003_new_teachers_directions
Revises: 0002_directions_attachments
Create Date: 2026-09-01 12:00:00.000000

Доводим направления до 17: добавляем «Детский психолог» и «Продлёнку»,
переименовываем «Логопед» → «Логопед-дефектолог» и «Нейропсихолог» → «Детский нейропсихолог».
Заводим двух новых педагогов (Ткачёва, Вершинина) с аккаунтами, направлениями и ставками.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import uuid
from datetime import date

from alembic import op
from app.core.security import get_password_hash

revision: str = "0003_new_teachers_directions"
down_revision: Union[str, None] = "0002_directions_attachments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# 2 недостающих направления (в сумме с 15 из 0002 — 17)
NEW_DIRECTIONS = [
    ("Детский психолог", "CHILD_PSYCH", "Детская психология, развитие и поддержка"),
    ("Продлёнка", "AFTERSCHOOL", "Группа продлённого дня"),
]

# Новые педагоги: направление по code + ставка (руб/занятие)
NEW_TEACHERS = [
    {
        "full_name": "Ткачёва Алёна Валерьевна",
        "phone": "+79180000005",
        "email": "teacher3@opora.ru",
        "comment": "Детский нейропсихолог. 26 лет в профессии.",
        "subjects": ["NEUROPSY"],
        "rates": {"NEUROPSY": "700.00"},
    },
    {
        "full_name": "Вершинина Ирина Иннокентьевна",
        "phone": "+79180000006",
        "email": "teacher4@opora.ru",
        "comment": "Математика и физика. 40 лет в педагогике.",
        "subjects": ["MATH_1_4", "MATH_5_8", "PHYS"],
        "rates": {"MATH_1_4": "600.00", "MATH_5_8": "600.00", "PHYS": "600.00"},
    },
]


def _scalar(conn, sql: str, params: dict):
    return conn.execute(sa.text(sql), params).scalar()


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Переименовываем 2 направления по стабильному code
    conn.execute(sa.text("UPDATE subjects SET name = 'Логопед-дефектолог' WHERE code = 'LOGOPED'"))
    conn.execute(sa.text("UPDATE subjects SET name = 'Детский нейропсихолог' WHERE code = 'NEUROPSY'"))

    # 2. Добавляем 2 новых направления
    for name, code, desc in NEW_DIRECTIONS:
        conn.execute(
            sa.text(
                "INSERT INTO subjects (id, name, code, description, is_active) "
                "VALUES (:id, :name, :code, :desc, true)"
            ),
            {"id": uuid.uuid4(), "name": name, "code": code, "desc": desc},
        )

    # 3. Новые педагоги с аккаунтами, направлениями и ставками
    teacher_role_id = _scalar(conn, "SELECT id FROM roles WHERE code = 'teacher'", {})

    for t in NEW_TEACHERS:
        user_id = uuid.uuid4()
        conn.execute(
            sa.text(
                "INSERT INTO users (id, full_name, phone, email, password_hash, status) "
                "VALUES (:id, :full_name, :phone, :email, :ph, 'active')"
            ),
            {
                "id": user_id,
                "full_name": t["full_name"],
                "phone": t["phone"],
                "email": t["email"],
                "ph": get_password_hash("Teacher2026!"),
            },
        )
        conn.execute(
            sa.text("INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r)"),
            {"u": user_id, "r": teacher_role_id},
        )

        teacher_id = uuid.uuid4()
        conn.execute(
            sa.text(
                "INSERT INTO teachers (id, user_id, full_name, phone, start_date, status, comment) "
                "VALUES (:id, :uid, :fn, :phone, :sd, 'active', :comment)"
            ),
            {
                "id": teacher_id,
                "uid": user_id,
                "fn": t["full_name"],
                "phone": t["phone"],
                "sd": date(2023, 9, 1),
                "comment": t["comment"],
            },
        )

        for code in t["subjects"]:
            subject_id = _scalar(conn, "SELECT id FROM subjects WHERE code = :c", {"c": code})
            conn.execute(
                sa.text("INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (:tid, :sid)"),
                {"tid": teacher_id, "sid": subject_id},
            )

        for code, amount in t["rates"].items():
            subject_id = _scalar(conn, "SELECT id FROM subjects WHERE code = :c", {"c": code})
            conn.execute(
                sa.text(
                    "INSERT INTO teacher_rates (id, teacher_id, subject_id, lesson_format, amount, valid_from) "
                    "VALUES (:id, :tid, :sid, 'individual', :amount, :vf)"
                ),
                {
                    "id": uuid.uuid4(),
                    "tid": teacher_id,
                    "sid": subject_id,
                    "amount": amount,
                    "vf": date(2023, 9, 1),
                },
            )


def downgrade() -> None:
    conn = op.get_bind()

    for email in ["teacher3@opora.ru", "teacher4@opora.ru"]:
        user_id = _scalar(conn, "SELECT id FROM users WHERE email = :e", {"e": email})
        if not user_id:
            continue
        teacher_id = _scalar(conn, "SELECT id FROM teachers WHERE user_id = :u", {"u": user_id})
        if teacher_id:
            conn.execute(sa.text("DELETE FROM teacher_rates WHERE teacher_id = :t"), {"t": teacher_id})
            conn.execute(sa.text("DELETE FROM teacher_subjects WHERE teacher_id = :t"), {"t": teacher_id})
            conn.execute(sa.text("DELETE FROM teachers WHERE id = :t"), {"t": teacher_id})
        conn.execute(sa.text("DELETE FROM user_roles WHERE user_id = :u"), {"u": user_id})
        conn.execute(sa.text("DELETE FROM users WHERE id = :u"), {"u": user_id})

    conn.execute(sa.text("DELETE FROM subjects WHERE code IN ('CHILD_PSYCH', 'AFTERSCHOOL')"))
    conn.execute(sa.text("UPDATE subjects SET name = 'Логопед' WHERE code = 'LOGOPED'"))
    conn.execute(sa.text("UPDATE subjects SET name = 'Нейропсихолог' WHERE code = 'NEUROPSY'"))
