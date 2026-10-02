import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ParentRead, PaymentCreate, PaymentMethod, ChildSubjectRead } from '../../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  parents: ParentRead[];
  childSubjects: ChildSubjectRead[];
  onSubmit: (data: PaymentCreate) => Promise<void>;
  preselectedParentId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  parents,
  childSubjects,
  onSubmit,
  preselectedParentId,
}) => {
  const [parentId, setParentId] = useState(preselectedParentId || parents[0]?.id || '');
  const selectedParent = parents.find((p) => p.id === parentId) || parents[0];
  const [childId, setChildId] = useState(selectedParent?.children[0]?.id || '');
  const [childSubjectId, setChildSubjectId] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [lessonsCount, setLessonsCount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.card);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // активные направления выбранного ребёнка
  const childActiveSubjects = childSubjects.filter(
    (cs) => cs.child_id === childId && cs.is_active
  );

  const pricePerLesson = Number(lessonsCount) > 0 ? (Number(amount) / Number(lessonsCount)).toFixed(0) : '0';

  const handleParentChange = (newParentId: string) => {
    setParentId(newParentId);
    const p = parents.find((item) => item.id === newParentId);
    if (p && p.children.length > 0) {
      setChildId(p.children[0].id);
    } else {
      setChildId('');
    }
    setChildSubjectId('');
  };

  // при смене ребёнка/родителя — сбросить направление, если оно не принадлежит ребёнку
  const handleChildChange = (newChildId: string) => {
    setChildId(newChildId);
    setChildSubjectId('');
    // авто-выбор единственного направления, если оно одно
    const subs = childSubjects.filter((cs) => cs.child_id === newChildId && cs.is_active);
    if (subs.length === 1) {
      setChildSubjectId(subs[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentId || !childId) {
      setError('Выберите родителя и ребенка');
      return;
    }
    if (!childSubjectId) {
      setError('Выберите направление (предмет и педагога)');
      return;
    }
    if (Number(amount) <= 0 || Number(lessonsCount) <= 0) {
      setError('Сумма и количество занятий должны быть больше нуля');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        parent_id: parentId,
        child_id: childId,
        child_subject_id: childSubjectId,
        amount: Number(amount),
        payment_method: paymentMethod,
        lessons_count: Number(lessonsCount),
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации платежа');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Прием оплаты и начисление абонемента"
      subtitle="Автоматическое пополнение баланса занятий ученика"
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
            Клиент (Родитель) <span className="text-rose-500">*</span>
          </label>
          <select
            value={parentId}
            onChange={(e) => handleParentChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.phone})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Ученик (Ребенок) <span className="text-rose-500">*</span>
          </label>
          <select
            value={childId}
            onChange={(e) => handleChildChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            {selectedParent?.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Направление (предмет и педагог) <span className="text-rose-500">*</span>
          </label>
          <select
            value={childSubjectId}
            onChange={(e) => setChildSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            <option value="">— Выберите направление —</option>
            {childActiveSubjects.map((cs) => (
              <option key={cs.id} value={cs.id}>
                {cs.subject_name} • {cs.teacher_name} ({Number(cs.lesson_price).toLocaleString('ru-RU')} ₽)
              </option>
            ))}
          </select>
          {childActiveSubjects.length === 0 && (
            <p className="text-[11px] text-stone-400 mt-1">
              У этого ребёнка нет активных направлений — сначала прикрепите направление в карточке клиента.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Сумма оплаты (₽) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="100"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Кол-во занятий <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              max="100"
              value={lessonsCount}
              onChange={(e) => setLessonsCount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>
        </div>

        <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
          <span className="text-stone-600">Расчетная стоимость 1 занятия:</span>
          <span className="font-bold text-amber-900">{pricePerLesson} ₽ / урок</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Способ оплаты <span className="text-rose-500">*</span>
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            <option value={PaymentMethod.card}>Банковская карта (Терминал)</option>
            <option value={PaymentMethod.bank_transfer}>СБП / Перевод на р/с</option>
            <option value={PaymentMethod.cash}>Наличные в кассу</option>
            <option value={PaymentMethod.online}>Онлайн-оплата</option>
            <option value={PaymentMethod.other}>Другое</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Примечание / Номер чека
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Например: Абонемент на 8 уроков по математике"
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
            className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Проведение...' : 'Зачислить оплату'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
