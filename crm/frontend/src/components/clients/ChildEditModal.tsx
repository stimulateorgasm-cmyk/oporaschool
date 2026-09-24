import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { AttachmentsPanel } from '../common/AttachmentsPanel';
import { ChildRead, ChildStatus, ChildUpdate } from '../../types';

interface ChildEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: ChildRead;
  onSubmit: (data: ChildUpdate) => Promise<void>;
}

const GRADES = ['дошкольник', ...Array.from({ length: 11 }, (_, i) => String(i + 1))];

export const ChildEditModal: React.FC<ChildEditModalProps> = ({ isOpen, onClose, child, onSubmit }) => {
  const [fullName, setFullName] = useState(child.full_name);
  const [grade, setGrade] = useState(child.grade || '');
  const [status, setStatus] = useState<ChildStatus>(child.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(child.full_name);
      setGrade(child.grade || '');
      setStatus(child.status);
      setError(null);
    }
  }, [isOpen, child]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Заполните ФИО ребенка');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        full_name: fullName.trim(),
        grade: grade || undefined,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать ребенка"
      subtitle={child.full_name}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              ФИО ребенка <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Класс</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value="">Не указан</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g === 'дошкольник' ? 'дошкольник' : `${g} класс`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ChildStatus)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value={ChildStatus.active}>Активный</option>
              <option value={ChildStatus.paused}>На паузе</option>
              <option value={ChildStatus.completed}>Завершенный</option>
              <option value={ChildStatus.archived}>В архиве</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100">
          <AttachmentsPanel ownerType="child" ownerId={child.id} />
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
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
