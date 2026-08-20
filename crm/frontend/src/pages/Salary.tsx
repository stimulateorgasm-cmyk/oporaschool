import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  TeacherRead,
  TeacherSalaryAccrualRead,
  TeacherSalaryPaymentRead,
  TeacherSalarySummary,
} from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  BadgeRussianRuble,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  User,
  History,
  Coins,
} from 'lucide-react';
import { SalaryPaymentModal } from '../components/salary/SalaryPaymentModal';

export const Salary: React.FC = () => {
  const { isManager } = useAuth();
  const [summary, setSummary] = useState<TeacherSalarySummary[]>([]);
  const [accruals, setAccruals] = useState<TeacherSalaryAccrualRead[]>([]);
  const [payments, setPayments] = useState<TeacherSalaryPaymentRead[]>([]);
  const [teachers, setTeachers] = useState<TeacherRead[]>([]);
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'summary' | 'accruals' | 'payments'>('summary');
  const [isSalaryPaymentModalOpen, setIsSalaryPaymentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sum, acc, pmt, tch] = await Promise.all([
        api.getSalarySummary(),
        api.getSalaryAccruals({
          teacher_id: selectedTeacherFilter !== 'all' ? selectedTeacherFilter : undefined,
        }),
        api.getSalaryPayments({
          teacher_id: selectedTeacherFilter !== 'all' ? selectedTeacherFilter : undefined,
        }),
        api.getTeachers(),
      ]);
      setSummary(sum);
      setAccruals(acc);
      setPayments(pmt);
      setTeachers(tch);
    } catch (err) {
      console.error('Failed to load salary data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTeacherFilter]);

  const totalAccrued = summary.reduce((acc, s) => acc + Number(s.total_accrued), 0);
  const totalPaid = summary.reduce((acc, s) => acc + Number(s.total_paid), 0);
  const totalDebt = summary.reduce((acc, s) => acc + Number(s.debt), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Заработная плата и Начисления педагогам
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Автоматический расчет вознаграждений за проведенные занятия и история выплат
          </p>
        </div>

        {isManager && (
          <button
            id="btn-salary-payment-open"
            onClick={() => setIsSalaryPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Выплатить зарплату</span>
          </button>
        )}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Начислено педагогам</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">
            {Number(totalAccrued).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            За проведённые подтвержденные уроки
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Фактически выплачено</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-stone-900">
            {Number(totalPaid).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            Через кассу и безналичные переводы
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Текущий долг центра</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <BadgeRussianRuble className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {Number(totalDebt).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
            Остаток к выдаче по педагогам
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-4">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'summary'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Сводка по преподавателям ({summary.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('accruals')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'accruals'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Начисления за уроки ({accruals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Журнал выплат ({payments.length})</span>
        </button>
      </div>

      {/* Tab 1: Summary Table */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-100">
                <tr>
                  <th className="p-3.5">Преподаватель</th>
                  <th className="p-3.5">Начислено всего</th>
                  <th className="p-3.5">Выплачено всего</th>
                  <th className="p-3.5">Задолженность центра</th>
                  {isManager && <th className="p-3.5 text-right">Действия</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {summary.map((s) => (
                  <tr key={s.teacher_id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                      {s.teacher_name}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-stone-800 whitespace-nowrap">
                      {Number(s.total_accrued).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-3.5 font-mono text-emerald-700 whitespace-nowrap">
                      {Number(s.total_paid).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {Number(s.debt).toLocaleString('ru-RU')} ₽
                      </span>
                    </td>
                    {isManager && (
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setIsSalaryPaymentModalOpen(true)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs"
                        >
                          Выплатить
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Accruals Table */}
      {activeTab === 'accruals' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-100">
                <tr>
                  <th className="p-3.5">Дата урока</th>
                  <th className="p-3.5">Преподаватель</th>
                  <th className="p-3.5">Ученик и предмет</th>
                  <th className="p-3.5">Сумма начисления</th>
                  <th className="p-3.5">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {accruals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400">
                      Начислений нет
                    </td>
                  </tr>
                ) : (
                  accruals.map((a) => (
                    <tr key={a.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3.5 text-stone-600 whitespace-nowrap font-mono">
                        {new Date(a.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                        {a.teacher_name}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-stone-800">{a.child_name}</div>
                        <div className="text-[11px] text-stone-500">{a.subject_name}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-mono font-bold text-emerald-700">
                        +{Number(a.amount).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700">
                          {a.status === 'accrued' ? 'Начислено' : a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Payments Table */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-100">
                <tr>
                  <th className="p-3.5">Дата выплаты</th>
                  <th className="p-3.5">Преподаватель</th>
                  <th className="p-3.5">Сумма выплаты</th>
                  <th className="p-3.5">Способ оплаты</th>
                  <th className="p-3.5">Период</th>
                  <th className="p-3.5">Назначение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      Выплат пока не производилось
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3.5 text-stone-600 whitespace-nowrap font-mono">
                        {new Date(p.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                        {p.teacher_name}
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-mono font-bold text-stone-900">
                        {Number(p.amount).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <StatusBadge status={p.payment_method} />
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-stone-500 text-[11px]">
                        {p.period_from && p.period_to
                          ? `${p.period_from} — ${p.period_to}`
                          : '—'}
                      </td>
                      <td className="p-3.5 text-stone-600 text-[11px]">
                        {p.comment || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salary Payment Modal */}
      <SalaryPaymentModal
        isOpen={isSalaryPaymentModalOpen}
        onClose={() => setIsSalaryPaymentModalOpen(false)}
        teachers={teachers}
        onSubmit={async (data) => {
          await api.createSalaryPayment(data);
          await loadData();
        }}
      />
    </div>
  );
};
