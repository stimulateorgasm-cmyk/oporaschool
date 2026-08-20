import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { LessonFormat, SubjectRead, TeacherCreate, TeacherStatus } from '../../types';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectRead[];
  onSubmit: (data: TeacherCreate) => Promise<void>;
}

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
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [rateAmount, setRateAmount] = useState<number | string>(600);
  const [rateFormat, setRateFormat] = useState<LessonFormat>(LessonFormat.individual);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSubject = (id: string) => {
    if (selectedSubjectIds.includes(id)) {
      setSelectedSubjectIds(selectedSubjectIds.filter((s) => s !== id));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Заполните ФИО и телефон педагога');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const initialRates =
        selectedSubjectIds.length > 0 && Number(rateAmount) > 0
          ? [
              {
                subject_id: selectedSubjectIds[0],
                lesson_format: rateFormat,
                amount: Number(rateAmount),
                valid_from: startDate,
              },
            ]
          : undefined;

      await onSubmit({
        full_name: fullName.trim(),
        phone: phone.trim(),
        start_date: startDate,
        status,
        comment: comment.trim() || undefined,
        subject_ids: selectedSubjectIds,
        initial_rates: initialRates,
      });

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
      subtitle="Профиль преподавателя, прикрепление предметов и базовой ставки"
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

        {/* Subjects checkboxes */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Преподаваемые предметы
          </label>
          <div className="grid grid-cols-2 gap-2">
            {subjects.map((sub) => {
              const isChecked = selectedSubjectIds.includes(sub.id);
              return (
                <label
                  key={sub.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSubject(sub.id)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>{sub.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Initial Rate */}
        {selectedSubjectIds.length > 0 && (
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
            <div className="text-xs font-bold text-stone-800">
              Базовая ставка за урок (для первого выбранного предмета)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-stone-600 mb-0.5">Формат</label>
                <select
                  value={rateFormat}
                  onChange={(e) => setRateFormat(e.target.value as LessonFormat)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200 bg-white"
                >
                  <option value={LessonFormat.individual}>Индивидуально</option>
                  <option value={LessonFormat.group}>Группа</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-stone-600 mb-0.5">Ставка педагогу (₽)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200 bg-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

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
