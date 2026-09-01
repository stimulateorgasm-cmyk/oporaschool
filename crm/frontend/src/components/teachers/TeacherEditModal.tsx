import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { AttachmentsPanel } from '../common/AttachmentsPanel';
import { SubjectRead, TeacherRead, TeacherStatus, TeacherUpdate } from '../../types';

interface TeacherEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherRead;
  subjects: SubjectRead[];
  onSubmit: (data: TeacherUpdate) => Promise<void>;
}

export const TeacherEditModal: React.FC<TeacherEditModalProps> = ({
  isOpen,
  onClose,
  teacher,
  subjects,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState(teacher.full_name);
  const [phone, setPhone] = useState(teacher.phone);
  const [startDate, setStartDate] = useState(teacher.start_date || '');
  const [status, setStatus] = useState<TeacherStatus>(teacher.status);
  const [comment, setComment] = useState(teacher.comment || '');
  const [subjectIds, setSubjectIds] = useState<string[]>(teacher.subjects.map((s) => s.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(teacher.full_name);
      setPhone(teacher.phone);
      setStartDate(teacher.start_date || '');
      setStatus(teacher.status);
      setComment(teacher.comment || '');
      setSubjectIds(teacher.subjects.map((s) => s.id));
      setError(null);
    }
  }, [isOpen, teacher]);

  const toggleSubject = (id: string) => {
    setSubjectIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
      await onSubmit({
        full_name: fullName.trim(),
        phone: phone.trim(),
        start_date: startDate || undefined,
        status,
        comment: comment.trim() || undefined,
        subject_ids: subjectIds,
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
      title="Редактировать педагога"
      subtitle={teacher.full_name}
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
              ФИО преподавателя <span className="text-rose-500">*</span>
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
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Телефон <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Дата начала работы</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TeacherStatus)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value={TeacherStatus.active}>Активный</option>
              <option value={TeacherStatus.vacation}>В отпуске</option>
              <option value={TeacherStatus.inactive}>Неактивный</option>
              <option value={TeacherStatus.archived}>В архиве</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Направления
            </label>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <label
                  key={s.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer ${
                    subjectIds.includes(s.id)
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-white text-stone-600 border-stone-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={subjectIds.includes(s.id)}
                    onChange={() => toggleSubject(s.id)}
                    className="hidden"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Комментарий / Квалификация
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Опыт работы, категория, регалии..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white resize-none"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100">
          <AttachmentsPanel ownerType="teacher" ownerId={teacher.id} />
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
