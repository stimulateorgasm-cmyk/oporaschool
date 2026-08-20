import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardMetrics, LessonRead, ParentRead } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Calendar,
  CreditCard,
  Building,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { ClientModal } from '../components/clients/ClientModal';
import { LessonModal } from '../components/schedule/LessonModal';
import { PaymentModal } from '../components/payments/PaymentModal';
import { AttendanceModal } from '../components/schedule/AttendanceModal';

export const Dashboard: React.FC = () => {
  const { isManager } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [todayLessons, setTodayLessons] = useState<LessonRead[]>([]);
  const [parents, setParents] = useState<ParentRead[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [childSubjects, setChildSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedLessonForAttendance, setSelectedLessonForAttendance] = useState<LessonRead | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [m, l, p, r] = await Promise.all([
        api.getDashboardMetrics(),
        api.getLessons(),
        api.getClients(),
        api.getRooms(),
      ]);
      setMetrics(m);
      setTodayLessons(l);
      setParents(p);
      setRooms(r);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Главный пульт управления
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Сводка ключевых показателей центра, расписание на сегодня и оперативные задачи
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="dash-add-client-btn"
            onClick={() => setIsClientModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-stone-500" />
            <span>Новый клиент</span>
          </button>

          <button
            id="dash-add-lesson-btn"
            onClick={() => setIsLessonModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-stone-500" />
            <span>Назначить урок</span>
          </button>

          <button
            id="dash-add-payment-btn"
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Принять оплату</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Клиенты / Дети</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">
            {metrics?.total_clients ?? 0}
            <span className="text-xs font-normal text-stone-500 ml-1.5">
              ({metrics?.active_children ?? 0} учеников)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Активные договоры
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Занятий сегодня</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">
            {metrics?.lessons_today ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            Завершено за месяц: <span className="font-semibold text-stone-700">{metrics?.lessons_completed_month ?? 0}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Выручка за месяц</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">
            {Number(metrics?.revenue_month ?? 0).toLocaleString('ru-RU')} ₽
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Оплаты абонементов
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Кабинеты центра</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">
            {metrics?.free_rooms_now ?? 0}
            <span className="text-xs font-normal text-stone-500 ml-1">каб. свободно</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            Всего в центре: 4 аудитории
          </div>
        </div>
      </div>

      {/* Manager Specific Financial Alert Banner */}
      {isManager && Number(metrics?.total_teacher_debt ?? 0) > 0 && (
        <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950">
                Задолженность по зарплате педагогам: {Number(metrics?.total_teacher_debt).toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-[11px] text-amber-800">
                Начислено за месяц: {Number(metrics?.salary_accrued_month).toLocaleString('ru-RU')} ₽ | Выплачено:{' '}
                {Number(metrics?.salary_paid_month).toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>
          <button
            onClick={() => (window.location.href = '/salary')}
            className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-lg border border-amber-300 transition-colors"
          >
            Перейти к выплатам
          </button>
        </div>
      )}

      {/* Main Content Grid: Today's Schedule & Low Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Lessons (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Занятия на сегодня
              </h2>
              <p className="text-[11px] text-stone-500">
                Оперативный список уроков с возможностью быстрой отметки присутствия
              </p>
            </div>
            <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
              {todayLessons.length} уроков
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {todayLessons.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                На сегодня занятий не запланировано
              </div>
            ) : (
              todayLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="p-4 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-center font-mono py-1 px-2 rounded-lg bg-stone-100 border border-stone-200 text-stone-800 text-xs shrink-0">
                      <div className="font-bold">
                        {lesson.starts_at.includes('T') ? lesson.starts_at.split('T')[1].substring(0, 5) : '14:00'}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {lesson.ends_at.includes('T') ? lesson.ends_at.split('T')[1].substring(0, 5) : '15:00'}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-stone-900">
                          {lesson.child_name}
                        </span>
                        <StatusBadge status={lesson.status} />
                        <StatusBadge status={lesson.attendance_status} />
                      </div>
                      <div className="text-xs text-stone-600 mt-0.5">
                        {lesson.subject_name} • {lesson.teacher_name}
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {lesson.room_name} • {lesson.comment || 'Без комментария'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedLessonForAttendance(lesson)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      Отметить (Был/Не был)
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attention Panel / Low Balances (1 col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 bg-rose-50/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Требуют пополнения (≤2 зан.)
                </h3>
              </div>
            </div>

            <div className="p-4 divide-y divide-stone-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stone-900">Ковалев Максим</div>
                  <div className="text-[11px] text-stone-500">Логопед-дефектолог</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-rose-50 text-rose-700 border border-rose-200">
                    0 зан.
                  </span>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stone-900">Петрова София</div>
                  <div className="text-[11px] text-stone-500">Подготовка к школе</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                    1 зан.
                  </span>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-stone-900">Иванов Артем</div>
                  <div className="text-[11px] text-stone-500">Русский язык</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                    1 зан.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-50/50 border-t border-stone-100 text-center">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-1.5 text-xs font-semibold text-amber-800 bg-white border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                Пополнить баланс абонементом
              </button>
            </div>
          </div>

          {/* Center Info Card */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs text-xs space-y-2">
            <div className="font-bold text-stone-900">Правила списания центра:</div>
            <ul className="list-disc list-inside text-stone-600 space-y-1 text-[11px]">
              <li>При статусе «Был» занятие списывается с баланса автоматически.</li>
              <li>При пропуске без предупреждения («Не был») действует списание согласно договору.</li>
              <li>Отмена за 24 часа сохраняет баланс ученика.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSubmit={async (data) => {
          await api.createClient(data);
          await loadData();
        }}
      />

      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        rooms={rooms}
        childSubjects={[
          {
            id: 'cs-1',
            child_id: 'c-1',
            subject_id: 'sub-1',
            subject_name: 'Математика (ОГЭ/ЕГЭ)',
            teacher_id: 't-1',
            teacher_name: 'Елена Викторовна Смирнова',
            lesson_format: 'individual' as any,
            lesson_price: 1200,
            default_duration_minutes: 60,
            start_date: '2024-01-15',
            is_active: true,
            balance_lessons: 4,
            completed_lessons: 12,
          },
        ]}
        onSubmit={async (data) => {
          await api.createLesson(data);
          await loadData();
        }}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        parents={parents}
        onSubmit={async (data) => {
          await api.createPayment(data);
          await loadData();
        }}
      />

      <AttendanceModal
        isOpen={!!selectedLessonForAttendance}
        onClose={() => setSelectedLessonForAttendance(null)}
        lesson={selectedLessonForAttendance}
        onSubmit={async (data) => {
          if (selectedLessonForAttendance) {
            await api.markAttendance(selectedLessonForAttendance.id, data);
            await loadData();
          }
        }}
      />
    </div>
  );
};
