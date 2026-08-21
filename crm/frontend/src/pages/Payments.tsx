import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ParentRead, PaymentRead } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { CreditCard, Plus, ArrowDownRight, Calendar, User, Search } from 'lucide-react';
import { PaymentModal } from '../components/payments/PaymentModal';

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRead[]>([]);
  const [parents, setParents] = useState<ParentRead[]>([]);
  const [search, setSearch] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [pmts, prnts] = await Promise.all([api.getPayments(), api.getClients()]);
      setPayments(pmts);
      setParents(prnts);
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSum = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalLessonsBought = payments.reduce((acc, p) => acc + Number(p.lessons_count), 0);

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (p.parent_name ?? '').toLowerCase().includes(term) ||
      (p.child_name ?? '').toLowerCase().includes(term) ||
      (p.subject_name ?? '').toLowerCase().includes(term) ||
      (p.comment && p.comment.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Платежи и Абонементы
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Регистрация поступлений денежных средств и автоматическое начисление пакетов занятий
          </p>
        </div>

        <button
          id="btn-register-payment"
          onClick={() => setIsPaymentModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Принять оплату</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">Всего оплат в реестре</span>
          <div className="mt-1 text-2xl font-bold text-stone-900">
            {Number(totalSum).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            За все время работы центра
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">Продано занятий</span>
          <div className="mt-1 text-2xl font-bold text-stone-900">
            {totalLessonsBought} уроков
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            Средняя цена: {totalLessonsBought > 0 ? (totalSum / totalLessonsBought).toFixed(0) : 0} ₽ / урок
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">Операций в журнале</span>
          <div className="mt-1 text-2xl font-bold text-stone-900">
            {payments.length} чеков
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-0.5">
            <ArrowDownRight className="w-3.5 h-3.5" /> 100% зачислено на баланс
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Поиск по плательщику, ученику..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
            />
          </div>
          <span className="text-xs text-stone-500">{filteredPayments.length} записей</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-100">
              <tr>
                <th className="p-3.5">Дата и время</th>
                <th className="p-3.5">Плательщик (Родитель)</th>
                <th className="p-3.5">Ученик и направление</th>
                <th className="p-3.5">Сумма оплаты</th>
                <th className="p-3.5">Абонемент</th>
                <th className="p-3.5">Способ оплаты</th>
                <th className="p-3.5">Комментарий</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-400">
                    Платежей не найдено
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5 text-stone-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{new Date(p.created_at).toLocaleString('ru-RU')}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                      {p.parent_name}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-stone-800">{p.child_name}</div>
                      <div className="text-[11px] text-stone-500">{p.subject_name}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-mono font-bold text-emerald-700 text-sm">
                      +{Number(p.amount).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-semibold text-xs bg-amber-50 text-amber-900 border border-amber-200">
                        {p.lessons_count} зан. ({Number(p.price_per_lesson).toFixed(0)} ₽/ур)
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <StatusBadge status={p.payment_method} />
                    </td>
                    <td className="p-3.5 text-stone-500 text-[11px]">
                      {p.comment || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        parents={parents}
        onSubmit={async (data) => {
          await api.createPayment(data);
          await loadData();
        }}
      />
    </div>
  );
};
