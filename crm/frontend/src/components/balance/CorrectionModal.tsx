import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { BalanceCorrectionRequest } from '../../types';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  childSubjectId: string;
  subjectName: string;
  currentBalance: number;
  onSubmit: (data: BalanceCorrectionRequest) => Promise<void>;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  isOpen,
  onClose,
  childId,
  childSubjectId,
  subjectName,
  currentBalance,
  onSubmit,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity === 0) {
      setError('Количество занятий не может быть равным нулю');
      return;
    }
    if (reason.trim().length < 3) {
      setError('Укажите обязательную причину корректировки (не менее 3 символов)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        child_id: childId,
        child_subject_id: childSubjectId,
        quantity: Number(quantity),
        reason: reason.trim(),
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка корректировки баланса');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ручная корректировка баланса"
      subtitle={`Направление: ${subjectName} • Текущий остаток: ${currentBalance} зан.`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
          <p className="font-semibold mb-0.5">Внимание (Право Руководителя):</p>
          <p>Каждая ручная корректировка строго фиксируется в неизменяемом журнале аудита системы.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Количество уроков (+ для начисления, - для списания) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            required
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white font-mono font-bold"
          />
          <div className="text-[11px] text-stone-500 mt-1">
            Новый баланс после операции:{' '}
            <span className="font-bold text-stone-800">{currentBalance + Number(quantity)} зан.</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Причина корректировки <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            minLength={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: Компенсация за срыв урока / Бонус"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Дополнительный комментарий
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Служебная записка или номер обращения..."
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
            {isSubmitting ? 'Сохранение...' : 'Применить корректировку'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
