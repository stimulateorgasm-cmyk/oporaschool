import {
  AuditLogRead,
  BalanceCorrectionRequest,
  BalanceReportItem,
  BalanceTransactionRead,
  ChildCreate,
  ChildRead,
  ChildSubjectCreate,
  ChildSubjectRead,
  DashboardMetrics,
  LessonAttendanceRequest,
  LessonCancelRequest,
  LessonCreate,
  LessonMoveRequest,
  LessonRead,
  LoginRequest,
  ParentCreate,
  ParentRead,
  PaymentCreate,
  PaymentRead,
  RoomCreate,
  RoomRead,
  SubjectBalanceSummary,
  SubjectRead,
  TeacherCreate,
  TeacherRateCreate,
  TeacherRateRead,
  TeacherRead,
  TeacherSalaryAccrualRead,
  TeacherSalaryPaymentCreate,
  TeacherSalaryPaymentRead,
  TeacherSalarySummary,
  Token,
  UserCreate,
  UserRead,
  UserStatus,
  ClientStatus,
  ChildStatus,
  TeacherStatus,
  LessonStatus,
  AttendanceStatus,
  LessonPaymentStatus,
  LessonFormat,
  PaymentMethod,
  BalanceTransactionType,
  SalaryPaymentStatus,
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor() {
    this.token = localStorage.getItem('opora_access_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('opora_access_token', token);
    } else {
      localStorage.removeItem('opora_access_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public onUnauthorized(cb: () => void) {
    this.onUnauthorizedCallback = cb;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        this.setToken(null);
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
        throw new Error('Сессия истекла. Пожалуйста, авторизуйтесь заново.');
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorBody.detail || `Ошибка сервера: ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      // Демо-режим только для локальной разработки (npm run dev).
      // В production-сборке ошибки API пробрасываются дальше, а не маскируются демо-данными.
      if (import.meta.env.DEV) {
        console.warn(`API call failed for ${endpoint}, using fallback handler:`, err);
        return this.handleFallback<T>(endpoint, options);
      }
      throw err;
    }
  }

  // Fallback demo state store for preview resilience
  private demoState = this.initDemoState();

  private initDemoState() {
    const rooms: RoomRead[] = [
      { id: 'r-1', number: 1, name: 'Кабинет Математики (№1)', capacity: 6, is_active: true, created_at: new Date().toISOString() },
      { id: 'r-2', number: 2, name: 'Кабинет Русского языка (№2)', capacity: 6, is_active: true, created_at: new Date().toISOString() },
      { id: 'r-3', number: 3, name: 'Кабинет Начальных классов (№3)', capacity: 8, is_active: true, created_at: new Date().toISOString() },
      { id: 'r-4', number: 4, name: 'Кабинет Логопедии (№4)', capacity: 2, is_active: true, created_at: new Date().toISOString() },
    ];

    const subjects: SubjectRead[] = [
      { id: 'sub-1', name: 'Математика (ОГЭ/ЕГЭ)', code: 'MATH', description: 'Подготовка к экзаменам и школьная программа', is_active: true, created_at: new Date().toISOString() },
      { id: 'sub-2', name: 'Русский язык', code: 'RUS', description: 'Грамотность, диктанты, сочинения, ОГЭ/ЕГЭ', is_active: true, created_at: new Date().toISOString() },
      { id: 'sub-3', name: 'Подготовка к школе', code: 'PREP', description: 'Чтение, счет, письмо, моторика для дошкольников', is_active: true, created_at: new Date().toISOString() },
      { id: 'sub-4', name: 'Логопед-дефектолог', code: 'LOGO', description: 'Постановка звуков, развитие связной речи', is_active: true, created_at: new Date().toISOString() },
    ];

    const teachers: TeacherRead[] = [
      {
        id: 't-1',
        full_name: 'Елена Викторовна Смирнова',
        phone: '+79181112233',
        start_date: '2023-09-01',
        status: TeacherStatus.active,
        comment: 'Ведущий педагог по математике, опыт 15 лет',
        created_at: new Date().toISOString(),
        subjects: [subjects[0]],
        rates: [
          { id: 'tr-1', teacher_id: 't-1', subject_id: 'sub-1', subject_name: 'Математика (ОГЭ/ЕГЭ)', lesson_format: LessonFormat.individual, amount: 600, valid_from: '2024-01-01', created_at: new Date().toISOString() },
          { id: 'tr-2', teacher_id: 't-1', subject_id: 'sub-1', subject_name: 'Математика (ОГЭ/ЕГЭ)', lesson_format: LessonFormat.group, amount: 400, valid_from: '2024-01-01', created_at: new Date().toISOString() },
        ],
        total_accrued: 24600,
        total_paid: 20000,
        debt: 4600,
        overpayment: 0,
      },
      {
        id: 't-2',
        full_name: 'Ольга Николаевна Васильева',
        phone: '+79182223344',
        start_date: '2023-10-15',
        status: TeacherStatus.active,
        comment: 'Русский язык и литература',
        created_at: new Date().toISOString(),
        subjects: [subjects[1]],
        rates: [
          { id: 'tr-3', teacher_id: 't-2', subject_id: 'sub-2', subject_name: 'Русский язык', lesson_format: LessonFormat.individual, amount: 550, valid_from: '2024-01-01', created_at: new Date().toISOString() },
        ],
        total_accrued: 18700,
        total_paid: 18700,
        debt: 0,
        overpayment: 0,
      },
      {
        id: 't-3',
        full_name: 'Анна Сергеевна Кузнецова',
        phone: '+79183334455',
        start_date: '2024-01-10',
        status: TeacherStatus.active,
        comment: 'Логопед высшей категории',
        created_at: new Date().toISOString(),
        subjects: [subjects[3]],
        rates: [
          { id: 'tr-4', teacher_id: 't-3', subject_id: 'sub-4', subject_name: 'Логопед-дефектолог', lesson_format: LessonFormat.individual, amount: 700, valid_from: '2024-01-01', created_at: new Date().toISOString() },
        ],
        total_accrued: 14000,
        total_paid: 12000,
        debt: 2000,
        overpayment: 0,
      },
    ];

    const parents: ParentRead[] = [
      {
        id: 'p-1',
        full_name: 'Иванова Марина Алексеевна',
        address: 'ст. Северская, ул. Ленина, д. 45',
        phone: '+79184567890',
        secondary_phone: '+79184567891',
        comment: 'Оплата всегда вовремя',
        status: ClientStatus.active,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        total_balance_lessons: 5,
        children: [
          {
            id: 'c-1',
            parent_id: 'p-1',
            full_name: 'Иванов Артем Дмитриевич',
            birth_date: '2012-05-14',
            comment: '7 класс, готовимся к олимпиадам',
            status: ChildStatus.active,
            created_at: new Date().toISOString(),
            active_subjects_count: 2,
          },
        ],
      },
      {
        id: 'p-2',
        full_name: 'Петров Сергей Михайлович',
        address: 'ст. Северская, ул. Казачья, д. 12',
        phone: '+79185556677',
        comment: 'Предупреждать об изменениях за сутки',
        status: ClientStatus.active,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
        total_balance_lessons: 1,
        children: [
          {
            id: 'c-2',
            parent_id: 'p-2',
            full_name: 'Петрова София Сергеевна',
            birth_date: '2018-09-20',
            comment: 'Подготовка к 1 классу',
            status: ChildStatus.active,
            created_at: new Date().toISOString(),
            active_subjects_count: 1,
          },
        ],
      },
      {
        id: 'p-3',
        full_name: 'Ковалева Татьяна Юрьевна',
        address: 'ст. Северская, ул. Мира, д. 88',
        phone: '+79189990011',
        comment: 'Нужен перерасчет за больничный',
        status: ClientStatus.active,
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        total_balance_lessons: 0,
        children: [
          {
            id: 'c-3',
            parent_id: 'p-3',
            full_name: 'Ковалев Максим',
            birth_date: '2015-03-10',
            comment: 'Коррекция речи',
            status: ChildStatus.active,
            created_at: new Date().toISOString(),
            active_subjects_count: 1,
          },
        ],
      },
    ];

    const childSubjects: ChildSubjectRead[] = [
      {
        id: 'cs-1',
        child_id: 'c-1',
        subject_id: 'sub-1',
        subject_name: 'Математика (ОГЭ/ЕГЭ)',
        teacher_id: 't-1',
        teacher_name: 'Елена Викторовна Смирнова',
        lesson_format: LessonFormat.individual,
        lesson_price: 1200,
        default_duration_minutes: 60,
        start_date: '2024-01-15',
        is_active: true,
        balance_lessons: 4,
        completed_lessons: 12,
      },
      {
        id: 'cs-2',
        child_id: 'c-1',
        subject_id: 'sub-2',
        subject_name: 'Русский язык',
        teacher_id: 't-2',
        teacher_name: 'Ольга Николаевна Васильева',
        lesson_format: LessonFormat.individual,
        lesson_price: 1100,
        default_duration_minutes: 60,
        start_date: '2024-02-01',
        is_active: true,
        balance_lessons: 1,
        completed_lessons: 8,
      },
      {
        id: 'cs-3',
        child_id: 'c-2',
        subject_id: 'sub-3',
        subject_name: 'Подготовка к школе',
        teacher_id: 't-2',
        teacher_name: 'Ольга Николаевна Васильева',
        lesson_format: LessonFormat.group,
        lesson_price: 800,
        default_duration_minutes: 60,
        start_date: '2024-01-20',
        is_active: true,
        balance_lessons: 1,
        completed_lessons: 10,
      },
      {
        id: 'cs-4',
        child_id: 'c-3',
        subject_id: 'sub-4',
        subject_name: 'Логопед-дефектолог',
        teacher_id: 't-3',
        teacher_name: 'Анна Сергеевна Кузнецова',
        lesson_format: LessonFormat.individual,
        lesson_price: 1300,
        default_duration_minutes: 45,
        start_date: '2024-02-10',
        is_active: true,
        balance_lessons: 0,
        completed_lessons: 6,
      },
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    const lessons: LessonRead[] = [
      {
        id: 'l-1',
        child_subject_id: 'cs-1',
        child_id: 'c-1',
        child_name: 'Иванов Артем Дмитриевич',
        parent_id: 'p-1',
        parent_name: 'Иванова Марина Алексеевна',
        parent_phone: '+79184567890',
        subject_id: 'sub-1',
        subject_name: 'Математика (ОГЭ/ЕГЭ)',
        teacher_id: 't-1',
        teacher_name: 'Елена Викторовна Смирнова',
        room_id: 'r-1',
        room_name: 'Кабинет Математики (№1)',
        starts_at: `${todayStr}T14:00:00`,
        ends_at: `${todayStr}T15:00:00`,
        status: LessonStatus.scheduled,
        attendance_status: AttendanceStatus.unknown,
        payment_status: LessonPaymentStatus.covered_by_package,
        lesson_format: LessonFormat.individual,
        client_price: 1200,
        teacher_rate_snapshot: 600,
        comment: 'Тема: Квадратные уравнения',
        created_at: new Date().toISOString(),
        history: [],
      },
      {
        id: 'l-2',
        child_subject_id: 'cs-3',
        child_id: 'c-2',
        child_name: 'Петрова София Сергеевна',
        parent_id: 'p-2',
        parent_name: 'Петров Сергей Михайлович',
        parent_phone: '+79185556677',
        subject_id: 'sub-3',
        subject_name: 'Подготовка к школе',
        teacher_id: 't-2',
        teacher_name: 'Ольга Николаевна Васильева',
        room_id: 'r-3',
        room_name: 'Кабинет Начальных классов (№3)',
        starts_at: `${todayStr}T15:30:00`,
        ends_at: `${todayStr}T16:30:00`,
        status: LessonStatus.scheduled,
        attendance_status: AttendanceStatus.unknown,
        payment_status: LessonPaymentStatus.covered_by_package,
        lesson_format: LessonFormat.group,
        client_price: 800,
        teacher_rate_snapshot: 400,
        comment: 'Звуковой анализ слов',
        created_at: new Date().toISOString(),
        history: [],
      },
      {
        id: 'l-3',
        child_subject_id: 'cs-4',
        child_id: 'c-3',
        child_name: 'Ковалев Максим',
        parent_id: 'p-3',
        parent_name: 'Ковалева Татьяна Юрьевна',
        parent_phone: '+79189990011',
        subject_id: 'sub-4',
        subject_name: 'Логопед-дефектолог',
        teacher_id: 't-3',
        teacher_name: 'Анна Сергеевна Кузнецова',
        room_id: 'r-4',
        room_name: 'Кабинет Логопедии (№4)',
        starts_at: `${todayStr}T17:00:00`,
        ends_at: `${todayStr}T17:45:00`,
        status: LessonStatus.scheduled,
        attendance_status: AttendanceStatus.unknown,
        payment_status: LessonPaymentStatus.unpaid,
        lesson_format: LessonFormat.individual,
        client_price: 1300,
        teacher_rate_snapshot: 700,
        comment: 'Автоматизация звука [Р]',
        created_at: new Date().toISOString(),
        history: [],
      },
    ];

    const payments: PaymentRead[] = [
      {
        id: 'pay-1',
        parent_id: 'p-1',
        parent_name: 'Иванова Марина Алексеевна',
        child_id: 'c-1',
        child_name: 'Иванов Артем Дмитриевич',
        subject_id: 'sub-1',
        subject_name: 'Математика (ОГЭ/ЕГЭ)',
        amount: 9600,
        payment_date: new Date(Date.now() - 5 * 86400000).toISOString(),
        payment_method: PaymentMethod.card,
        lessons_count: 8,
        price_per_lesson: 1200,
        comment: 'Абонемент на 8 занятий',
        is_reversed: false,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'pay-2',
        parent_id: 'p-2',
        parent_name: 'Петров Сергей Михайлович',
        child_id: 'c-2',
        child_name: 'Петрова София Сергеевна',
        subject_id: 'sub-3',
        subject_name: 'Подготовка к школе',
        amount: 6400,
        payment_date: new Date(Date.now() - 12 * 86400000).toISOString(),
        payment_method: PaymentMethod.bank_transfer,
        lessons_count: 8,
        price_per_lesson: 800,
        comment: 'Оплата по СБП',
        is_reversed: false,
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
    ];

    const transactions: BalanceTransactionRead[] = [
      {
        id: 'tx-1',
        child_id: 'c-1',
        child_subject_id: 'cs-1',
        subject_id: 'sub-1',
        subject_name: 'Математика (ОГЭ/ЕГЭ)',
        payment_id: 'pay-1',
        transaction_type: BalanceTransactionType.purchase,
        quantity: 8,
        comment: 'Покупка пакета на 8 занятий',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        created_by_name: 'Администратор',
      },
      {
        id: 'tx-2',
        child_id: 'c-1',
        child_subject_id: 'cs-1',
        subject_id: 'sub-1',
        subject_name: 'Математика (ОГЭ/ЕГЭ)',
        transaction_type: BalanceTransactionType.consumption,
        quantity: -1,
        comment: 'Списание за проведенное занятие',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        created_by_name: 'Система',
      },
      {
        id: 'tx-3',
        child_id: 'c-1',
        child_subject_id: 'cs-1',
        subject_id: 'sub-1',
        subject_name: 'Математика (ОГЭ/ЕГЭ)',
        transaction_type: BalanceTransactionType.consumption,
        quantity: -1,
        comment: 'Списание за проведенное занятие',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        created_by_name: 'Система',
      },
    ];

    const auditLogs: AuditLogRead[] = [
      {
        id: 'log-1',
        user_name: 'Администратор Опоры',
        entity_type: 'client_payments',
        entity_id: 'pay-1',
        action: 'PAYMENT_RECEIVED',
        new_values: { amount: 9600, lessons_count: 8, parent: 'Иванова М.А.' },
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: 'log-2',
        user_name: 'Смирнова Е.В.',
        entity_type: 'lessons',
        entity_id: 'l-1',
        action: 'ATTENDANCE_MARKED',
        new_values: { status: 'completed', attendance: 'present' },
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
    ];

    const users: UserRead[] = [
      {
        id: 'u-1',
        full_name: 'Администратор Центра',
        phone: '+79180000001',
        email: 'admin@opora-center.ru',
        status: UserStatus.active,
        created_at: '2024-01-01T00:00:00Z',
        roles: [
          { id: 'r-m', code: 'manager', name: 'Руководитель', is_system: true, permissions: [] },
          { id: 'r-a', code: 'administrator', name: 'Администратор', is_system: true, permissions: [] },
        ],
      },
      {
        id: 'u-2',
        full_name: 'Смирнова Елена Викторовна',
        phone: '+79181112233',
        email: 'smirnova@opora-center.ru',
        status: UserStatus.active,
        created_at: '2024-01-10T00:00:00Z',
        roles: [
          { id: 'r-t', code: 'teacher', name: 'Педагог', is_system: true, permissions: [] },
        ],
        teacher_id: 't-1',
      },
    ];

    return {
      rooms,
      subjects,
      teachers,
      parents,
      childSubjects,
      lessons,
      payments,
      transactions,
      auditLogs,
      users,
    };
  }

  private handleFallback<T>(endpoint: string, options: RequestInit): T {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : {};

    // Auth
    if (endpoint.includes('/auth/login')) {
      const mockToken: Token = {
        access_token: 'mock-jwt-token-opora-2026',
        refresh_token: 'mock-refresh-token-opora-2026',
        token_type: 'bearer',
        expires_in: 86400,
      };
      this.setToken(mockToken.access_token);
      return mockToken as T;
    }

    if (endpoint.includes('/auth/me')) {
      const user = this.demoState.users[0];
      return user as T;
    }

    if (endpoint.includes('/auth/users') && method === 'POST') {
      const newUser: UserRead = {
        id: `u-${Date.now()}`,
        full_name: body.full_name,
        phone: body.phone,
        email: body.email,
        status: body.status || UserStatus.active,
        created_at: new Date().toISOString(),
        roles: (body.role_codes || ['administrator']).map((code: string) => ({
          id: `role-${code}`,
          code,
          name: code === 'manager' ? 'Руководитель' : code === 'administrator' ? 'Администратор' : 'Педагог',
          is_system: true,
          permissions: [],
        })),
      };
      this.demoState.users.push(newUser);
      return newUser as T;
    }

    // Dashboard
    if (endpoint.includes('/system/dashboard')) {
      const metrics: DashboardMetrics = {
        total_clients: this.demoState.parents.length,
        active_children: this.demoState.parents.reduce((sum, p) => sum + p.children.length, 0),
        lessons_today: this.demoState.lessons.length,
        lessons_completed_month: 48,
        revenue_month: this.demoState.payments.reduce((sum, p) => sum + Number(p.amount), 0),
        salary_accrued_month: 57300,
        salary_paid_month: 50700,
        total_teacher_debt: 6600,
        total_teacher_overpayment: 0,
        free_rooms_now: 2,
        zero_balance_children_count: 1,
        low_balance_children_count: 2,
      };
      return metrics as T;
    }

    if (endpoint.includes('/system/audit-logs')) {
      return this.demoState.auditLogs as T;
    }

    // Clients
    if (endpoint.startsWith('/clients') && method === 'GET') {
      return this.demoState.parents as T;
    }

    if (endpoint.startsWith('/clients') && method === 'POST') {
      if (endpoint.includes('/children')) {
        const parentId = endpoint.split('/')[2];
        const newChild: ChildRead = {
          id: `c-${Date.now()}`,
          parent_id: parentId,
          full_name: body.full_name,
          birth_date: body.birth_date,
          comment: body.comment,
          status: body.status || ChildStatus.active,
          created_at: new Date().toISOString(),
          active_subjects_count: 0,
        };
        const p = this.demoState.parents.find((item) => item.id === parentId);
        if (p) p.children.push(newChild);
        return newChild as T;
      }

      if (endpoint.includes('/child-subjects')) {
        const sub = this.demoState.subjects.find((s) => s.id === body.subject_id);
        const teach = this.demoState.teachers.find((t) => t.id === body.teacher_id);
        const newCs: ChildSubjectRead = {
          id: `cs-${Date.now()}`,
          child_id: body.child_id,
          subject_id: body.subject_id,
          subject_name: sub?.name || 'Предмет',
          teacher_id: body.teacher_id,
          teacher_name: teach?.full_name || 'Педагог',
          lesson_format: body.lesson_format || LessonFormat.individual,
          lesson_price: body.lesson_price || 1000,
          default_duration_minutes: body.default_duration_minutes || 60,
          start_date: body.start_date || new Date().toISOString().split('T')[0],
          is_active: true,
          balance_lessons: 0,
          completed_lessons: 0,
        };
        this.demoState.childSubjects.push(newCs);
        return newCs as T;
      }

      const newParent: ParentRead = {
        id: `p-${Date.now()}`,
        full_name: body.full_name,
        address: body.address,
        phone: body.phone,
        secondary_phone: body.secondary_phone,
        comment: body.comment,
        status: body.status || ClientStatus.active,
        created_at: new Date().toISOString(),
        children: (body.children || []).map((ch: any) => ({
          id: `c-${Date.now()}-${Math.random()}`,
          parent_id: `p-${Date.now()}`,
          full_name: ch.full_name,
          birth_date: ch.birth_date,
          comment: ch.comment,
          status: ch.status || ChildStatus.active,
          created_at: new Date().toISOString(),
          active_subjects_count: 0,
        })),
        total_balance_lessons: 0,
      };
      this.demoState.parents.unshift(newParent);
      return newParent as T;
    }

    // Schedule & Rooms
    if (endpoint.includes('/schedule/rooms') && method === 'GET') {
      return this.demoState.rooms as T;
    }

    if (endpoint.includes('/schedule/rooms') && method === 'POST') {
      const newRoom: RoomRead = {
        id: `r-${Date.now()}`,
        number: body.number,
        name: body.name,
        capacity: body.capacity,
        is_active: body.is_active !== undefined ? body.is_active : true,
        created_at: new Date().toISOString(),
      };
      this.demoState.rooms.push(newRoom);
      return newRoom as T;
    }

    if (endpoint.includes('/schedule/lessons') && method === 'GET') {
      return this.demoState.lessons as T;
    }

    if (endpoint.includes('/schedule/lessons') && method === 'POST') {
      if (endpoint.includes('/move')) {
        const lessonId = endpoint.split('/')[3];
        const lesson = this.demoState.lessons.find((l) => l.id === lessonId);
        if (lesson) {
          lesson.starts_at = body.new_starts_at;
          lesson.ends_at = body.new_ends_at;
          if (body.new_room_id) {
            const rm = this.demoState.rooms.find((r) => r.id === body.new_room_id);
            if (rm) {
              lesson.room_id = rm.id;
              lesson.room_name = rm.name;
            }
          }
          lesson.status = LessonStatus.moved;
        }
        return { status: 'success', message: 'Занятие перенесено' } as T;
      }

      if (endpoint.includes('/attendance')) {
        const lessonId = endpoint.split('/')[3];
        const lesson = this.demoState.lessons.find((l) => l.id === lessonId);
        if (lesson) {
          lesson.attendance_status = body.attendance_status;
          lesson.status =
            body.attendance_status === AttendanceStatus.present
              ? LessonStatus.completed
              : body.attendance_status === AttendanceStatus.absent
              ? LessonStatus.absent
              : LessonStatus.cancelled;
        }
        return { status: 'success', message: 'Посещаемость сохранена' } as T;
      }

      if (endpoint.includes('/cancel')) {
        const lessonId = endpoint.split('/')[3];
        const lesson = this.demoState.lessons.find((l) => l.id === lessonId);
        if (lesson) {
          lesson.status = LessonStatus.cancelled;
        }
        return { status: 'success', message: 'Занятие отменено' } as T;
      }

      const cs = this.demoState.childSubjects.find((c) => c.id === body.child_subject_id);
      const rm = this.demoState.rooms.find((r) => r.id === body.room_id);
      const newLesson: LessonRead = {
        id: `l-${Date.now()}`,
        child_subject_id: body.child_subject_id,
        child_id: cs?.child_id || 'c-1',
        child_name: 'Иванов Артем Дмитриевич',
        subject_id: cs?.subject_id || 'sub-1',
        subject_name: cs?.subject_name || 'Математика',
        teacher_id: cs?.teacher_id || 't-1',
        teacher_name: cs?.teacher_name || 'Смирнова Е.В.',
        room_id: body.room_id,
        room_name: rm?.name || 'Кабинет №1',
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        status: LessonStatus.scheduled,
        attendance_status: AttendanceStatus.unknown,
        payment_status: LessonPaymentStatus.covered_by_package,
        lesson_format: cs?.lesson_format || LessonFormat.individual,
        client_price: cs?.lesson_price || 1200,
        comment: body.comment,
        created_at: new Date().toISOString(),
        history: [],
      };
      this.demoState.lessons.push(newLesson);
      return newLesson as T;
    }

    // Teachers
    if (endpoint.startsWith('/teachers') && method === 'GET') {
      return this.demoState.teachers as T;
    }

    if (endpoint.startsWith('/teachers') && method === 'POST') {
      if (endpoint.includes('/rates')) {
        const teacherId = endpoint.split('/')[2];
        const newRate: TeacherRateRead = {
          id: `tr-${Date.now()}`,
          teacher_id: teacherId,
          subject_id: body.subject_id,
          lesson_format: body.lesson_format,
          amount: body.amount,
          valid_from: body.valid_from || new Date().toISOString().split('T')[0],
          valid_until: body.valid_until,
          created_at: new Date().toISOString(),
        };
        const teacher = this.demoState.teachers.find((t) => t.id === teacherId);
        if (teacher) teacher.rates.push(newRate);
        return newRate as T;
      }

      const newTeacher: TeacherRead = {
        id: `t-${Date.now()}`,
        full_name: body.full_name,
        phone: body.phone,
        start_date: body.start_date || new Date().toISOString().split('T')[0],
        status: body.status || TeacherStatus.active,
        comment: body.comment,
        created_at: new Date().toISOString(),
        subjects: this.demoState.subjects.filter((s) => (body.subject_ids || []).includes(s.id)),
        rates: (body.initial_rates || []).map((r: any) => ({
          id: `tr-${Date.now()}-${Math.random()}`,
          teacher_id: `t-${Date.now()}`,
          subject_id: r.subject_id,
          lesson_format: r.lesson_format,
          amount: r.amount,
          valid_from: r.valid_from || new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        })),
        total_accrued: 0,
        total_paid: 0,
        debt: 0,
        overpayment: 0,
      };
      this.demoState.teachers.push(newTeacher);
      return [newTeacher] as T;
    }

    // Payments
    if (endpoint.startsWith('/payments') && method === 'GET') {
      return this.demoState.payments as T;
    }

    if (endpoint.startsWith('/payments') && method === 'POST') {
      const p = this.demoState.parents.find((par) => par.id === body.parent_id);
      const ch = p?.children.find((c) => c.id === body.child_id);
      const cs = this.demoState.childSubjects.find((s) => s.id === body.child_subject_id);

      const newPayment: PaymentRead = {
        id: `pay-${Date.now()}`,
        parent_id: body.parent_id,
        parent_name: p?.full_name,
        child_id: body.child_id,
        child_name: ch?.full_name,
        subject_id: cs?.subject_id,
        subject_name: cs?.subject_name,
        amount: body.amount,
        payment_date: new Date().toISOString(),
        payment_method: body.payment_method || PaymentMethod.card,
        lessons_count: body.lessons_count,
        price_per_lesson: Number(body.amount) / Number(body.lessons_count || 1),
        comment: body.comment,
        is_reversed: false,
        created_at: new Date().toISOString(),
      };
      this.demoState.payments.unshift(newPayment);

      if (cs) {
        cs.balance_lessons += Number(body.lessons_count || 0);
      }
      if (p) {
        p.total_balance_lessons += Number(body.lessons_count || 0);
      }

      this.demoState.transactions.unshift({
        id: `tx-${Date.now()}`,
        child_id: body.child_id,
        child_subject_id: body.child_subject_id,
        subject_id: cs?.subject_id || '',
        subject_name: cs?.subject_name,
        payment_id: newPayment.id,
        transaction_type: BalanceTransactionType.purchase,
        quantity: Number(body.lessons_count || 0),
        comment: `Покупка пакета: ${body.comment || ''}`,
        created_at: new Date().toISOString(),
        created_by_name: 'Администратор',
      });

      return newPayment as T;
    }

    // Balance
    if (endpoint.includes('/balance/children/')) {
      const childId = endpoint.split('/')[3];
      const subjectsForChild = this.demoState.childSubjects.filter((cs) => cs.child_id === childId);
      const summaries: SubjectBalanceSummary[] = subjectsForChild.map((cs) => ({
        child_subject_id: cs.id,
        subject_id: cs.subject_id,
        subject_name: cs.subject_name,
        teacher_name: cs.teacher_name,
        total_purchased: cs.balance_lessons + cs.completed_lessons,
        total_consumed: cs.completed_lessons,
        remaining_balance: cs.balance_lessons,
        low_balance_warning: cs.balance_lessons <= 2,
        transactions: this.demoState.transactions.filter((tx) => tx.child_subject_id === cs.id),
      }));
      return summaries as T;
    }

    if (endpoint.includes('/balance/history/')) {
      const csId = endpoint.split('/')[3];
      return this.demoState.transactions.filter((tx) => tx.child_subject_id === csId) as T;
    }

    if (endpoint.includes('/balance/correction') && method === 'POST') {
      const cs = this.demoState.childSubjects.find((s) => s.id === body.child_subject_id);
      if (cs) {
        cs.balance_lessons += Number(body.quantity);
      }
      const newTx: BalanceTransactionRead = {
        id: `tx-${Date.now()}`,
        child_id: body.child_id,
        child_subject_id: body.child_subject_id,
        subject_id: cs?.subject_id || '',
        subject_name: cs?.subject_name,
        transaction_type: Number(body.quantity) > 0 ? BalanceTransactionType.correction_plus : BalanceTransactionType.correction_minus,
        quantity: Number(body.quantity),
        comment: `Корректировка: ${body.reason} (${body.comment || ''})`,
        created_at: new Date().toISOString(),
        created_by_name: 'Руководитель',
      };
      this.demoState.transactions.unshift(newTx);
      return newTx as T;
    }

    // Salary
    if (endpoint.includes('/salary/summary/')) {
      const teacherId = endpoint.split('/')[3];
      const t = this.demoState.teachers.find((tech) => tech.id === teacherId);
      const summary: TeacherSalarySummary = {
        teacher_id: teacherId,
        teacher_name: t?.full_name || 'Педагог',
        total_accrued: t?.total_accrued || 20000,
        total_paid: t?.total_paid || 18000,
        debt: t?.debt || 2000,
        overpayment: t?.overpayment || 0,
        accruals: [
          {
            id: `acc-1`,
            teacher_id: teacherId,
            lesson_id: 'l-1',
            lesson_date: new Date().toISOString(),
            subject_name: 'Математика',
            amount: 600,
            accrued_at: new Date().toISOString(),
            is_reversed: false,
          },
        ],
        payments: [
          {
            id: `sp-1`,
            teacher_id: teacherId,
            teacher_name: t?.full_name,
            amount: 10000,
            payment_date: new Date(Date.now() - 7 * 86400000).toISOString(),
            payment_method: PaymentMethod.bank_transfer,
            status: SalaryPaymentStatus.active,
            comment: 'Выплата за первую половину месяца',
            created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
        ],
      };
      return summary as T;
    }

    if (endpoint.includes('/salary/payments') && method === 'POST') {
      const t = this.demoState.teachers.find((tech) => tech.id === body.teacher_id);
      const newPay: TeacherSalaryPaymentRead = {
        id: `sp-${Date.now()}`,
        teacher_id: body.teacher_id,
        teacher_name: t?.full_name,
        amount: body.amount,
        payment_date: new Date().toISOString(),
        period_from: body.period_from,
        period_to: body.period_to,
        payment_method: body.payment_method || PaymentMethod.bank_transfer,
        status: SalaryPaymentStatus.active,
        comment: body.comment,
        created_at: new Date().toISOString(),
      };
      if (t) {
        t.total_paid = Number(t.total_paid) + Number(body.amount);
        t.debt = Math.max(0, Number(t.total_accrued) - Number(t.total_paid));
      }
      return newPay as T;
    }

    return [] as unknown as T;
  }

  // Public Methods matching Backend Endpoints
  // Auth
  public async login(data: LoginRequest): Promise<Token> {
    return this.request<Token>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getMe(): Promise<UserRead> {
    return this.request<UserRead>('/auth/me');
  }

  public async createUser(data: UserCreate): Promise<UserRead> {
    return this.request<UserRead>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Clients
  public async getClients(params?: { search?: string; status?: ClientStatus; skip?: number; limit?: number }): Promise<ParentRead[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.skip !== undefined) query.append('skip', String(params.skip));
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<ParentRead[]>(`/clients${qs}`);
  }

  public async getClient(parentId: string): Promise<ParentRead> {
    return this.request<ParentRead>(`/clients/${parentId}`);
  }

  public async createClient(data: ParentCreate): Promise<ParentRead> {
    return this.request<ParentRead>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async addChild(parentId: string, data: ChildCreate): Promise<ChildRead> {
    return this.request<ChildRead>(`/clients/${parentId}/children`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async createChild(parentId: string, data: ChildCreate): Promise<ChildRead> {
    return this.addChild(parentId, data);
  }

  public async getSubjects(): Promise<SubjectRead[]> {
    return this.request<SubjectRead[]>('/academic/subjects');
  }

  public async createChildSubject(data: ChildSubjectCreate): Promise<ChildSubjectRead> {
    return this.request<ChildSubjectRead>('/clients/child-subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async attachSubjectToChild(data: ChildSubjectCreate): Promise<ChildSubjectRead> {
    return this.createChildSubject(data);
  }

  // Teachers
  public async getTeachers(status?: TeacherStatus): Promise<TeacherRead[]> {
    const qs = status ? `?status=${status}` : '';
    return this.request<TeacherRead[]>(`/teachers${qs}`);
  }

  public async createTeacher(data: TeacherCreate): Promise<TeacherRead> {
    return this.request<TeacherRead>('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async addTeacherRate(teacherId: string, data: TeacherRateCreate): Promise<TeacherRateRead> {
    return this.request<TeacherRateRead>(`/teachers/${teacherId}/rates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async createTeacherRate(teacherId: string, data: TeacherRateCreate): Promise<TeacherRateRead> {
    return this.addTeacherRate(teacherId, data);
  }

  // Schedule & Rooms
  public async getRooms(): Promise<RoomRead[]> {
    return this.request<RoomRead[]>('/schedule/rooms');
  }

  public async createRoom(data: RoomCreate): Promise<RoomRead> {
    return this.request<RoomRead>('/schedule/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getLessons(params?: {
    from_date?: string;
    date_from?: string;
    to_date?: string;
    date_to?: string;
    teacher_id?: string;
    child_id?: string;
    room_id?: string;
    status?: LessonStatus;
  }): Promise<LessonRead[]> {
    const query = new URLSearchParams();
    const from = params?.from_date || params?.date_from;
    const to = params?.to_date || params?.date_to;
    if (from) query.append('from_date', from);
    if (to) query.append('to_date', to);
    if (params?.teacher_id) query.append('teacher_id', params.teacher_id);
    if (params?.child_id) query.append('child_id', params.child_id);
    if (params?.room_id) query.append('room_id', params.room_id);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<LessonRead[]>(`/schedule/lessons${qs}`);
  }

  public async createLesson(data: LessonCreate): Promise<LessonRead> {
    return this.request<LessonRead>('/schedule/lessons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async moveLesson(lessonId: string, data: LessonMoveRequest): Promise<any> {
    return this.request(`/schedule/lessons/${lessonId}/move`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async markAttendance(lessonId: string, data: LessonAttendanceRequest): Promise<any> {
    return this.request(`/schedule/lessons/${lessonId}/attendance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async cancelLesson(lessonId: string, data: LessonCancelRequest): Promise<any> {
    return this.request(`/schedule/lessons/${lessonId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Payments
  public async getPayments(params?: { parent_id?: string; child_id?: string; skip?: number; limit?: number }): Promise<PaymentRead[]> {
    const query = new URLSearchParams();
    if (params?.parent_id) query.append('parent_id', params.parent_id);
    if (params?.child_id) query.append('child_id', params.child_id);
    if (params?.skip !== undefined) query.append('skip', String(params.skip));
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<PaymentRead[]>(`/payments${qs}`);
  }

  public async createPayment(data: PaymentCreate): Promise<PaymentRead> {
    return this.request<PaymentRead>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Balance
  public async getChildBalances(childId: string): Promise<SubjectBalanceSummary[]> {
    return this.request<SubjectBalanceSummary[]>(`/balance/children/${childId}`);
  }

  public async getBalanceReport(): Promise<BalanceReportItem[]> {
    return this.request<BalanceReportItem[]>('/balance/report');
  }

  public async getBalanceTransactions(): Promise<BalanceTransactionRead[]> {
    return this.request<BalanceTransactionRead[]>('/balance/transactions');
  }

  public async getBalanceHistory(childSubjectId: string): Promise<BalanceTransactionRead[]> {
    return this.request<BalanceTransactionRead[]>(`/balance/history/${childSubjectId}`);
  }

  public async manualBalanceCorrection(data: BalanceCorrectionRequest): Promise<BalanceTransactionRead> {
    return this.request<BalanceTransactionRead>('/balance/correction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async correctBalance(data: BalanceCorrectionRequest): Promise<BalanceTransactionRead> {
    return this.manualBalanceCorrection(data);
  }

  // Salary
  public async getSalarySummary(params?: { teacher_id?: string }): Promise<TeacherSalarySummary[]> {
    const qs = params?.teacher_id ? `?teacher_id=${params.teacher_id}` : '';
    return this.request<TeacherSalarySummary[]>(`/salary/summary${qs}`);
  }

  public async getSalaryAccruals(params?: { teacher_id?: string }): Promise<TeacherSalaryAccrualRead[]> {
    const qs = params?.teacher_id ? `?teacher_id=${params.teacher_id}` : '';
    return this.request<TeacherSalaryAccrualRead[]>(`/salary/accruals${qs}`);
  }

  public async getSalaryPayments(params?: { teacher_id?: string }): Promise<TeacherSalaryPaymentRead[]> {
    const qs = params?.teacher_id ? `?teacher_id=${params.teacher_id}` : '';
    return this.request<TeacherSalaryPaymentRead[]>(`/salary/payments${qs}`);
  }

  public async getTeacherSalarySummary(teacherId: string): Promise<TeacherSalarySummary> {
    return this.request<TeacherSalarySummary>(`/salary/summary/${teacherId}`);
  }

  public async createSalaryPayment(data: TeacherSalaryPaymentCreate): Promise<TeacherSalaryPaymentRead> {
    return this.request<TeacherSalaryPaymentRead>('/salary/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Users & System
  public async getUsers(): Promise<UserRead[]> {
    return this.request<UserRead[]>('/auth/users');
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('/system/dashboard');
  }

  public async getAuditLogs(params?: { entity_type?: string; skip?: number; limit?: number }): Promise<AuditLogRead[]> {
    const query = new URLSearchParams();
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    if (params?.skip !== undefined) query.append('skip', String(params.skip));
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<AuditLogRead[]>(`/system/audit-logs${qs}`);
  }
}

export const api = new ApiClient();
