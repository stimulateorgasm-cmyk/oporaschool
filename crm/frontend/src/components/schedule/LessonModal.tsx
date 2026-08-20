import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { LessonCreate, RoomRead, ChildSubjectRead } from '../../types';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomRead[];
  childSubjects: ChildSubjectRead[];
  onSubmit: (data: LessonCreate) => Promise<void>;
  defaultDate?: string;
  defaultRoomId?: string;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  rooms,
  childSubjects,
  onSubmit,
  defaultDate,
  defaultRoomId,
}) => {
  const today = defaultDate || new Date().toISOString().split('T')[0];
  const [childSubjectId, setChildSubjectId] = useState(childSubjects[0]?.id || '');
  const [roomId, setRoomId] = useState(defaultRoomId || rooms[0]?.id || '');
  const [lessonDate, setLessonDate] = useState(today);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childSubjectId || !roomId) {
      setError('Выберите ученика/предмет и кабинет');
      return;
    }

    const startsAt = `${lessonDate}T${startTime}:00`;
    const endsAt = `${lessonDate}T${endTime}:00`;

    if (new Date(startsAt) >= new Date(endsAt)) {
      setError('Время окончания должно быть позже времени начала');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        child_subject_id: childSubjectId,
        room_id: roomId,
        starts_at: startsAt,
        ends_at: endsAt,
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания занятия');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Назначить занятие в расписание"
      subtitle="Проверка занятости кабинета и педагога"
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
            Ученик и направление <span className="text-rose-500">*</span>
          </label>
          <select
            value={childSubjectId}
            onChange={(e) => setChildSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            {childSubjects.map((cs) => (
              <option key={cs.id} value={cs.id}>
                {cs.subject_name} — {cs.teacher_name} (остаток {cs.balance_lessons} зан.)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Кабинет центра <span className="text-rose-500">*</span>
          </label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Кабинет №{r.number})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Дата
            </label>
            <input
              type="date"
              required
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Начало
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Конец
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Тема занятия / Комментарий
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Например: Повторение тригонометрии"
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
            {isSubmitting ? 'Проверка и запись...' : 'Запланировать'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
