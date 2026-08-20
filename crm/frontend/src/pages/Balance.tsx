import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { BalanceReportItem, BalanceTransactionRead } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  WalletCards,
  AlertTriangle,
  FileSpreadsheet,
  History,
  Sliders,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { CorrectionModal } from '../components/balance/CorrectionModal';

export const Balance: React.FC = () => {
  const { isManager } = useAuth();
  const [report, setReport] = useState<BalanceReportItem[]>([]);
  const [transactions, setTransactions] = useState<BalanceTransactionRead[]>([]);
  const [activeTab, setActiveTab] = useState<'balances' | 'transactions'>('balances');
  const [isLoading, setIsLoading] = useState(true);

  // Correction Modal State
  const [selectedForCorrection, setSelectedForCorrection] = useState<BalanceReportItem | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rep, txs] = await Promise.all([
        api.getBalanceReport(),
        api.getBalanceTransactions(),
      ]);
      setReport(rep);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load balances', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const lowBalanceItems = report.filter((item) => item.is_low_balance);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Баланс занятий и Реестр списаний
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Контроль оплаченных остатков уроков по каждому ученику и прозрачная история транзакций
          </p>
        </div>

        {lowBalanceItems.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200 text-xs font-semibold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Требуют продления: {lowBalanceItems.length} уч.</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-4">
        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'balances'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <WalletCards className="w-4 h-4" />
          <span>Текущие остатки по направлениям ({report.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'transactions'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Журнал движения занятий ({transactions.length})</span>
        </button>
      </div>

      {/* Tab: Balances */}
      {activeTab === 'balances' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-100">
                <tr>
                  <th className="p-3.5">Ученик (Ребенок)</th>
                  <th className="p-3.5">Родитель и телефон</th>
                  <th className="p-3.5">Направление и педагог</th>
                  <th className="p-3.5">Остаток уроков</th>
                  <th className="p-3.5">Пройдено уроков</th>
                  <th className="p-3.5">Статус</th>
                  {isManager && <th className="p-3.5 text-right">Действия</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      Нет данных по балансам
                    </td>
                  </tr>
                ) : (
                  report.map((item) => (
                    <tr
                      key={item.child_subject_id}
                      className={`hover:bg-stone-50/60 transition-colors ${
                        item.is_low_balance ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                        {item.child_name}
                      </td>
                      <td className="p-3.5 text-stone-600 whitespace-nowrap">
                        <div className="font-semibold text-stone-800">{item.parent_name}</div>
                        <div className="text-[11px] text-stone-500">{item.parent_phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-stone-800">{item.subject_name}</div>
                        <div className="text-[11px] text-stone-500">{item.teacher_name}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-md font-mono font-bold text-xs border ${
                            item.balance_lessons <= 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : item.balance_lessons <= 2
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {item.balance_lessons} зан.
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-mono text-stone-600">
                        {item.completed_lessons} зан.
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {item.is_low_balance ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                            <AlertTriangle className="w-3 h-3" /> Низкий остаток
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> В норме
                          </span>
                        )}
                      </td>
                      {isManager && (
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedForCorrection(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5 text-stone-500" />
                            <span>Скорректировать</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Transactions Ledger */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-100">
                <tr>
                  <th className="p-3.5">Дата и время</th>
                  <th className="p-3.5">Тип транзакции</th>
                  <th className="p-3.5">Ученик</th>
                  <th className="p-3.5">Направление</th>
                  <th className="p-3.5">Изменение</th>
                  <th className="p-3.5">Баланс после</th>
                  <th className="p-3.5">Основание / Причина</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      Журнал операций пуст
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3.5 text-stone-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{new Date(tx.created_at).toLocaleString('ru-RU')}</span>
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <StatusBadge status={tx.transaction_type} />
                      </td>
                      <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                        {tx.child_name}
                      </td>
                      <td className="p-3.5 font-semibold text-stone-700 whitespace-nowrap">
                        {tx.subject_name}
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-mono font-bold">
                        <span
                          className={
                            tx.quantity > 0
                              ? 'text-emerald-700'
                              : tx.quantity < 0
                              ? 'text-rose-700'
                              : 'text-stone-700'
                          }
                        >
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} зан.
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-mono font-semibold text-stone-800">
                        {tx.balance_after} зан.
                      </td>
                      <td className="p-3.5 text-stone-600 text-[11px]">
                        {tx.reason || tx.comment || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Balance Correction Modal (Manager only) */}
      {selectedForCorrection && (
        <CorrectionModal
          isOpen={!!selectedForCorrection}
          onClose={() => setSelectedForCorrection(null)}
          childId={selectedForCorrection.child_id}
          childSubjectId={selectedForCorrection.child_subject_id}
          subjectName={selectedForCorrection.subject_name}
          currentBalance={selectedForCorrection.balance_lessons}
          onSubmit={async (data) => {
            await api.correctBalance(data);
            await loadData();
          }}
        />
      )}
    </div>
  );
};
