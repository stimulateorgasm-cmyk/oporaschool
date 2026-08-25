import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { LessonFormat, SubjectRead, TeacherCreate, TeacherStatus } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectRead[];
  onSubmit: (data: TeacherCreate) => Promise<void>;
}

interface RateRow {
  subject_id: string;
  lesson_format: LessonFormat;
  amount: number | string;
}

const emptyRow = (): RateRow => ({
  subject_id: '',
  lesson_format: LessonFormat.individual,
  amount: 600,
});

export const TeacherModal: React.FC<TeacherModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<TeacherStatus>(TeacherStatus.active);
  const [comment, setComment] = useState('');
  const [rates, setRates] = useState<RateRow[]>([emptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRateRow = () => {
    setRates([...rates, emptyRow()]);
  };

  const removeRateRow = (index: number) => {
    setRates(rates.filter((_, i) => i !== index));
  };

  const updateRateRow = (index: number, field: keyof RateRow, value: string) => {
    setRates(rates.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  // Предметы, которые ещё не выбраны в других строках (чтобы не дублировать направление)
  const selectedSubjectIds = rates.map((r) => r.subject_id).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Заполните ФИО и телефон педагога');
      return;
    }

    const validRates = rates.filter((r) => r.subject_id && Number(r.amount) > 0);

    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit({
        full_name: fullName.trim(),
        phone: phone.trim(),
        start_date: startDate,
        status,
        comment: comment.trim() || undefined,
        subject_ids: validRates.map((r) => r.subject_id),
        initial_rates: validRates.length > 0
          ? validRates.map((r) => ({
              subject_id: r.subject_id,
              lesson_format: r.lesson_format,
              amount: Number(r.amount),
              valid_from: startDate,
            }))
          : undefined,
      });

      // Reset
      setFullName('');
      setPhone('');
      setComment('');
      setRates([emptyRow()]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания педагога');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Новый педагог"
      subtitle="Профиль преподавателя и направления со ставками"
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
            ФИО преподавателя <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Смирнова Елена Викторовна"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Телефон <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (918) 000-00-00"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Дата начала работы
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>
        </div>

        {/* Направления + ставки */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Направления и ставки
            </span>
            <button
              type="button"
              onClick={addRateRow}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              <Plus className="w-3.5 h-3.5" /> Добавить направление + ставку
            </button>
          </div>

          <div className="space-y-2">
            {rates.map((row, idx) => {
              const availableSubjects = subjects.filter(
                (s) => !selectedSubjectIds.includes(s.id) || s.id === row.subject_id
              );
              return (
                <div key={idx} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] text-stone-600 mb-0.5">Направление</label>
                      <select
                        value={row.subject_id}
                        onChange={(e) => updateRateRow(idx, 'subject_id', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200 bg-white"
                      >
                        <option value="">Выберите направление</option>
                        {availableSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-stone-600 mb-0.5">Формат</label>
                      <select
                        value={row.lesson_format}
                        onChange={(e) =>
                          updateRateRow(idx, 'lesson_format', e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200 bg-white"
                      >
                        <option value={LessonFormat.individual}>Индивид.</option>
                        <option value={LessonFormat.group}>Группа</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-stone-600 mb-0.5">Ставка (₽)</label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={row.amount}
                        onChange={(e) => updateRateRow(idx, 'amount', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200 bg-white font-mono"
                      />
                    </div>
                    <div className="sm:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeRateRow(idx)}
                        disabled={rates.length === 1}
                        className="p-1.5 text-stone-400 hover:text-rose-600 disabled:opacity-30"
                        title="Убрать строку"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Комментарий / Квалификация
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Опыт работы, категория, регалии..."
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
            {isSubmitting ? 'Сохранение...' : 'Создать педагога'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
