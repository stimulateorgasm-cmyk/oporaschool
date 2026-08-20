import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { LessonMoveRequest, LessonRead, RoomRead } from '../../types';

interface LessonMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonRead | null;
  rooms: RoomRead[];
  onSubmit: (lessonId: string, data: LessonMoveRequest) => Promise<void>;
}

export const LessonMoveModal: React.FC<LessonMoveModalProps> = ({
  isOpen,
  onClose,
  lesson,
  rooms,
  onSubmit,
}) => {
  if (!lesson) return null;

  const originalDate = lesson.starts_at.split('T')[0];
  const [newDate, setNewDate] = useState(originalDate);
  const [newStartTime, setNewStartTime] = useState(
    lesson.starts_at.includes('T') ? lesson.starts_at.split('T')[1].substring(0, 5) : '15:00'
  );
  const [newEndTime, setNewEndTime] = useState(
    lesson.ends_at.includes('T') ? lesson.ends_at.split('T')[1].substring(0, 5) : '16:00'
  );
  const [newRoomId, setNewRoomId] = useState(lesson.room_id);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startsAt = `${newDate}T${newStartTime}:00`;
    const endsAt = `${newDate}T${newEndTime}:00`;

    if (new Date(startsAt) >= new Date(endsAt)) {
      setError('Время окончания должно быть позже начала');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(lesson.id, {
        new_starts_at: startsAt,
        new_ends_at: endsAt,
        new_room_id: newRoomId !== lesson.room_id ? newRoomId : undefined,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Не удалось перенести занятие');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Перенос времени занятия"
      subtitle={`${lesson.subject_name} • ${lesson.child_name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1 text-stone-600">
          <div><span className="font-semibold text-stone-800">Текущее время:</span> {new Date(lesson.starts_at).toLocaleString('ru-RU')}</div>
          <div><span className="font-semibold text-stone-800">Педагог:</span> {lesson.teacher_name}</div>
          <div><span className="font-semibold text-stone-800">Кабинет:</span> {lesson.room_name}</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Новая дата
            </label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
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
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
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
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Сменить кабинет (опционально)
          </label>
          <select
            value={newRoomId}
            onChange={(e) => setNewRoomId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Кабинет №{r.number})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Причина переноса
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: Просьба родителя по болезни"
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
            {isSubmitting ? 'Сохранение...' : 'Перенести занятие'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
