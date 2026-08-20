import asyncio
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.academic import ChildSubject, Subject, Teacher, TeacherRate, TeacherSubject
from app.models.auth import Permission, Role, RolePermission, User, UserRole
from app.models.client import Child, Parent
from app.models.enums import (
    AttendanceStatus,
    BalanceTransactionType,
    ChildStatus,
    ClientStatus,
    LessonFormat,
    LessonPaymentStatus,
    LessonStatus,
    PaymentMethod,
    TeacherStatus,
    UserStatus,
)
from app.models.finance import ClientPayment, LessonBalanceTransaction, LessonPackage
from app.models.schedule import Lesson, Room


async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing_user = (await db.execute(select(User).limit(1))).scalar_one_or_none()
        if existing_user:
            print("Database already seeded.")
            return

        print("Seeding initial data...")

        # 1. Create Roles
        role_manager = Role(code="manager", name="Руководитель", description="Полный доступ ко всей системе", is_system=True)
        role_admin = Role(code="administrator", name="Администратор", description="Управление клиентами, расписанием, платежами", is_system=True)
        role_teacher = Role(code="teacher", name="Педагог", description="Просмотр своего расписания и отметка посещаемости", is_system=True)
        db.add_all([role_manager, role_admin, role_teacher])
        await db.flush()

        # 2. Create Users
        # Manager
        user_manager = User(
            full_name="Иванова Екатерина Сергеевна",
            phone="+79180000001",
            email="manager@opora.ru",
            password_hash=get_password_hash("Manager2026!"),
            status=UserStatus.active,
        )
        # Admin
        user_admin = User(
            full_name="Смирнова Ольга Владимировна",
            phone="+79180000002",
            email="admin@opora.ru",
            password_hash=get_password_hash("Admin2026!"),
            status=UserStatus.active,
        )
        # Teacher 1
        user_teacher1 = User(
            full_name="Ягодинцева Ангелина Викторовна",
            phone="+79180000003",
            email="teacher1@opora.ru",
            password_hash=get_password_hash("Teacher2026!"),
            status=UserStatus.active,
        )
        # Teacher 2
        user_teacher2 = User(
            full_name="Шумкина Надежда Сергеевна",
            phone="+79180000004",
            email="teacher2@opora.ru",
            password_hash=get_password_hash("Teacher2026!"),
            status=UserStatus.active,
        )
        db.add_all([user_manager, user_admin, user_teacher1, user_teacher2])
        await db.flush()

        # Bind roles
        db.add(UserRole(user_id=user_manager.id, role_id=role_manager.id))
        db.add(UserRole(user_id=user_admin.id, role_id=role_admin.id))
        db.add(UserRole(user_id=user_teacher1.id, role_id=role_teacher.id))
        db.add(UserRole(user_id=user_teacher2.id, role_id=role_teacher.id))

        # 3. Create Rooms
        r1 = Room(number=1, name="Кабинет математики (№1)", capacity=4)
        r2 = Room(number=2, name="Кабинет логопедии (№2)", capacity=2)
        r3 = Room(number=3, name="Кабинет русского языка (№3)", capacity=6)
        r4 = Room(number=4, name="Сенсорная комната (№4)", capacity=3)
        db.add_all([r1, r2, r3, r4])
        await db.flush()

        # 4. Create Subjects
        s_math = Subject(name="Математика", code="MATH", description="Математика и логика")
        s_rus = Subject(name="Русский язык", code="RUS", description="Русский язык и литература")
        s_neuro = Subject(name="Нейропсихология", code="NEURO", description="Развитие внимания и моторики")
        s_logoped = Subject(name="Логопедия", code="LOGO", description="Постановка речи и звуков")
        db.add_all([s_math, s_rus, s_neuro, s_logoped])
        await db.flush()

        # 5. Create Teachers
        t1 = Teacher(
            user_id=user_teacher1.id,
            full_name="Ягодинцева Ангелина Викторовна",
            phone="+79180000003",
            start_date=date(2023, 1, 15),
            status=TeacherStatus.active,
            comment="Стаж 15 лет. Высшее педагогическое образование.",
        )
        t2 = Teacher(
            user_id=user_teacher2.id,
            full_name="Шумкина Надежда Сергеевна",
            phone="+79180000004",
            start_date=date(2023, 3, 1),
            status=TeacherStatus.active,
            comment="Детский психолог и нейропсихолог.",
        )
        db.add_all([t1, t2])
        await db.flush()

        db.add(TeacherSubject(teacher_id=t1.id, subject_id=s_math.id))
        db.add(TeacherSubject(teacher_id=t2.id, subject_id=s_rus.id))
        db.add(TeacherSubject(teacher_id=t2.id, subject_id=s_neuro.id))

        # Teacher Rates
        rate1 = TeacherRate(
            teacher_id=t1.id,
            subject_id=s_math.id,
            lesson_format=LessonFormat.individual,
            amount=Decimal("600.00"),
            valid_from=date(2023, 1, 1),
        )
        rate2 = TeacherRate(
            teacher_id=t2.id,
            subject_id=s_rus.id,
            lesson_format=LessonFormat.individual,
            amount=Decimal("600.00"),
            valid_from=date(2023, 1, 1),
        )
        rate3 = TeacherRate(
            teacher_id=t2.id,
            subject_id=s_neuro.id,
            lesson_format=LessonFormat.individual,
            amount=Decimal("700.00"),
            valid_from=date(2023, 1, 1),
        )
        db.add_all([rate1, rate2, rate3])
        await db.flush()

        # 6. Create Parents and Children
        p1 = Parent(
            full_name="Кузнецова Марина Анатольевна",
            phone="+79181112233",
            address="г. Краснодар, ул. Красная, 120, кв. 45",
            comment="Предпочтительно вечернее время",
            status=ClientStatus.active,
            created_by=user_admin.id,
        )
        p2 = Parent(
            full_name="Морозов Дмитрий Павлович",
            phone="+79182223344",
            address="г. Краснодар, ул. Северная, 45",
            status=ClientStatus.active,
            created_by=user_admin.id,
        )
        db.add_all([p1, p2])
        await db.flush()

        c1 = Child(
            parent_id=p1.id,
            full_name="Кузнецов Артем",
            birth_date=date(2016, 5, 12),
            comment="3 класс",
            status=ChildStatus.active,
        )
        c2 = Child(
            parent_id=p2.id,
            full_name="Морозова София",
            birth_date=date(2018, 9, 20),
            comment="Дошкольник",
            status=ChildStatus.active,
        )
        db.add_all([c1, c2])
        await db.flush()

        # 7. Child Subjects
        cs1 = ChildSubject(
            child_id=c1.id,
            subject_id=s_math.id,
            teacher_id=t1.id,
            lesson_format=LessonFormat.individual,
            lesson_price=Decimal("1200.00"),
            default_duration_minutes=60,
            start_date=date(2024, 1, 10),
        )
        cs2 = ChildSubject(
            child_id=c2.id,
            subject_id=s_neuro.id,
            teacher_id=t2.id,
            lesson_format=LessonFormat.individual,
            lesson_price=Decimal("1400.00"),
            default_duration_minutes=60,
            start_date=date(2024, 1, 15),
        )
        db.add_all([cs1, cs2])
        await db.flush()

        # 8. Payments and Packages
        pay1 = ClientPayment(
            parent_id=p1.id,
            child_id=c1.id,
            child_subject_id=cs1.id,
            subject_id=s_math.id,
            amount=Decimal("9600.00"),
            payment_method=PaymentMethod.card,
            lessons_count=8,
            price_per_lesson=Decimal("1200.00"),
            comment="Абонемент на 8 занятий",
            created_by=user_admin.id,
        )
        db.add(pay1)
        await db.flush()

        pkg1 = LessonPackage(
            child_id=c1.id,
            child_subject_id=cs1.id,
            subject_id=s_math.id,
            payment_id=pay1.id,
            total_lessons=8,
            price_per_lesson=Decimal("1200.00"),
            total_amount=Decimal("9600.00"),
        )
        db.add(pkg1)
        await db.flush()

        # Ledger transaction
        tx1 = LessonBalanceTransaction(
            child_id=c1.id,
            child_subject_id=cs1.id,
            subject_id=s_math.id,
            package_id=pkg1.id,
            payment_id=pay1.id,
            transaction_type=BalanceTransactionType.purchase,
            quantity=8,
            comment="Приобретение пакета на 8 занятий",
            created_by=user_admin.id,
        )
        db.add(tx1)

        # 9. Lessons (Schedule)
        today = datetime.now().replace(minute=0, second=0, microsecond=0)
        l1 = Lesson(
            child_subject_id=cs1.id,
            child_id=c1.id,
            subject_id=s_math.id,
            teacher_id=t1.id,
            room_id=r1.id,
            starts_at=today.replace(hour=14),
            ends_at=today.replace(hour=15),
            status=LessonStatus.scheduled,
            attendance_status=AttendanceStatus.unknown,
            payment_status=LessonPaymentStatus.covered_by_package,
            lesson_format=LessonFormat.individual,
            client_price=Decimal("1200.00"),
            created_by=user_admin.id,
        )
        l2 = Lesson(
            child_subject_id=cs2.id,
            child_id=c2.id,
            subject_id=s_neuro.id,
            teacher_id=t2.id,
            room_id=r4.id,
            starts_at=today.replace(hour=16),
            ends_at=today.replace(hour=17),
            status=LessonStatus.scheduled,
            attendance_status=AttendanceStatus.unknown,
            payment_status=LessonPaymentStatus.unpaid,
            lesson_format=LessonFormat.individual,
            client_price=Decimal("1400.00"),
            created_by=user_admin.id,
        )
        db.add_all([l1, l2])

        await db.commit()
        print("Database successfully seeded with realistic center data!")


if __name__ == "__main__":
    asyncio.run(seed_data())
