import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ChildSubjectCreate, LessonFormat, SubjectRead, TeacherRead } from '../../types';

interface ChildSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  subjects: SubjectRead[];
  teachers: TeacherRead[];
  onSubmit: (data: ChildSubjectCreate) => Promise<void>;
}

export const ChildSubjectModal: React.FC<ChildSubjectModalProps> = ({
  isOpen,
  onClose,
  childId,
  childName,
  subjects,
  teachers,
  onSubmit,
}) => {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [lessonFormat, setLessonFormat] = useState<LessonFormat>(LessonFormat.individual);
  const [lessonPrice, setLessonPrice] = useState<number | string>(1200);
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState<number>(60);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !teacherId) {
      setError('Выберите предмет и педагога');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        child_id: childId,
        subject_id: subjectId,
        teacher_id: teacherId,
        lesson_format: lessonFormat,
        lesson_price: Number(lessonPrice),
        default_duration_minutes: Number(defaultDurationMinutes),
        start_date: startDate,
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка прикрепления предмета');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Прикрепить направление к ученику"
      subtitle={`Ученик: ${childName}`}
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
            Предмет / Направление <span className="text-rose-500">*</span>
          </label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Педагог <span className="text-rose-500">*</span>
          </label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name} ({t.phone})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Формат занятия
            </label>
            <select
              value={lessonFormat}
              onChange={(e) => setLessonFormat(e.target.value as LessonFormat)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value={LessonFormat.individual}>Индивидуально</option>
              <option value={LessonFormat.group}>В малой группе</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Стоимость за 1 урок (₽) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="50"
              required
              value={lessonPrice}
              onChange={(e) => setLessonPrice(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Длительность (мин)
            </label>
            <input
              type="number"
              min="15"
              step="15"
              value={defaultDurationMinutes}
              onChange={(e) => setDefaultDurationMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Дата старта
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Примечание к обучению
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Например: подготовка к сдаче ОГЭ на 5"
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
            {isSubmitting ? 'Сохранение...' : 'Прикрепить предмет'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
