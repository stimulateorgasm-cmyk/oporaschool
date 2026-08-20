import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { PaymentMethod, TeacherRead, TeacherSalaryPaymentCreate } from '../../types';

interface SalaryPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: TeacherRead[];
  onSubmit: (data: TeacherSalaryPaymentCreate) => Promise<void>;
  preselectedTeacherId?: string;
}

export const SalaryPaymentModal: React.FC<SalaryPaymentModalProps> = ({
  isOpen,
  onClose,
  teachers,
  onSubmit,
  preselectedTeacherId,
}) => {
  const [teacherId, setTeacherId] = useState(preselectedTeacherId || teachers[0]?.id || '');
  const selectedTeacher = teachers.find((t) => t.id === teacherId) || teachers[0];
  const [amount, setAmount] = useState<number | string>(selectedTeacher ? selectedTeacher.debt || 5000 : 5000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.bank_transfer);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || Number(amount) <= 0) {
      setError('Выберите педагога и укажите сумму выплаты');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        teacher_id: teacherId,
        amount: Number(amount),
        payment_method: paymentMethod,
        period_from: periodFrom || undefined,
        period_to: periodTo || undefined,
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка проведения выплаты зарплаты');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Выплата заработной платы"
      subtitle="Проведение расчетной выплаты педагогу с записью в аудит"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Преподаватель <span className="text-rose-500">*</span>
          </label>
          <select
            value={teacherId}
            onChange={(e) => {
              setTeacherId(e.target.value);
              const t = teachers.find((item) => item.id === e.target.value);
              if (t && Number(t.debt) > 0) {
                setAmount(t.debt);
              }
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name} (Задолженность центра: {Number(t.debt).toLocaleString('ru-RU')} ₽)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Сумма выплаты (₽) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="100"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Способ выплаты
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value={PaymentMethod.bank_transfer}>Банковский перевод (СБП/Карта)</option>
              <option value={PaymentMethod.cash}>Наличные из кассы</option>
              <option value={PaymentMethod.card}>Прямой перевод</option>
              <option value={PaymentMethod.other}>Другое</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Расчетный период с
            </label>
            <input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              по
            </label>
            <input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Назначение / Комментарий
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Например: Выплата аванса за февраль 2026"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Проведение...' : 'Выплатить зарплату'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
