import React, { useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { ChildRead, ChildSubjectRead, LessonCreate, RoomRead } from '../../types';
import { Paperclip } from 'lucide-react';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ChildRead[];
  childSubjects: ChildSubjectRead[];
  rooms: RoomRead[];
  onSubmit: (data: LessonCreate) => Promise<void>;
  defaultDate?: string;
}

// Вложение создаётся до занятия, поэтому для owner_id используем пустой UUID-заглушку:
// реальная связь занятия с файлом идёт через lesson.attachment_id.
const PLACEHOLDER_OWNER_ID = '00000000-0000-0000-0000-000000000000';

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  children,
  childSubjects,
  rooms,
  onSubmit,
  defaultDate,
}) => {
  const today = defaultDate || new Date().toISOString().split('T')[0];

  const [childId, setChildId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [roomId, setRoomId] = useState(rooms[0]?.id || '');
  const [lessonDate, setLessonDate] = useState(today);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Направления текущего ребёнка
  const childDirections = useMemo(() => {
    const map = new Map<string, string>();
    childSubjects
      .filter((cs) => cs.child_id === childId)
      .forEach((cs) => map.set(cs.subject_id, cs.subject_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [childSubjects, childId]);

  // Педагоги выбранного направления (для текущего ребёнка)
  const directionTeachers = useMemo(() => {
    return childSubjects.filter(
      (cs) => cs.child_id === childId && cs.subject_id === subjectId
    );
  }, [childSubjects, childId, subjectId]);

  const handleChildChange = (id: string) => {
    setChildId(id);
    setSubjectId('');
    setTeacherId('');
  };

  const handleSubjectChange = (id: string) => {
    setSubjectId(id);
    setTeacherId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!childId || !subjectId || !teacherId || !roomId) {
      setError('Заполните ученика, направление, педагога и кабинет');
      return;
    }
    if (!file) {
      setError('Прикрепите файл к занятию (обязательно)');
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
      // 1. Загружаем файл и получаем attachment_id
      const attachment = await api.uploadAttachment('lesson', PLACEHOLDER_OWNER_ID, file);
      // 2. Создаём занятие с привязкой к вложению
      await onSubmit({
        child_id: childId,
        subject_id: subjectId,
        teacher_id: teacherId,
        room_id: roomId,
        starts_at: startsAt,
        ends_at: endsAt,
        attachment_id: attachment.id,
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
      subtitle="Ученик → направление → педагог → кабинет и время → файл"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        {/* Шаг 1: Ребёнок */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            1. Ученик <span className="text-rose-500">*</span>
          </label>
          <select
            value={childId}
            onChange={(e) => handleChildChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          >
            <option value="">Выберите ученика</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Шаг 2: Направление */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            2. Направление <span className="text-rose-500">*</span>
          </label>
          <select
            value={subjectId}
            onChange={(e) => handleSubjectChange(e.target.value)}
            disabled={!childId}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white disabled:bg-stone-50 disabled:text-stone-400"
          >
            <option value="">{childId ? 'Выберите направление' : 'Сначала выберите ученика'}</option>
            {childDirections.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Шаг 3: Педагог */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            3. Педагог <span className="text-rose-500">*</span>
          </label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            disabled={!subjectId}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white disabled:bg-stone-50 disabled:text-stone-400"
          >
            <option value="">{subjectId ? 'Выберите педагога' : 'Сначала выберите направление'}</option>
            {directionTeachers.map((cs) => (
              <option key={cs.teacher_id} value={cs.teacher_id}>
                {cs.teacher_name}
              </option>
            ))}
          </select>
        </div>

        {/* Шаг 4: Кабинет */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            4. Кабинет <span className="text-rose-500">*</span>
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

        {/* Дата и время */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Дата</label>
            <input
              type="date"
              required
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Начало</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Конец</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
            />
          </div>
        </div>

        {/* Шаг 5: Файл (обязательно) */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            5. Вложение (PDF / JPEG / PNG / WORD) <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white cursor-pointer hover:bg-stone-50">
              <Paperclip className="w-3.5 h-3.5 text-stone-400" />
              <span className={file ? 'text-stone-800 truncate' : 'text-stone-400'}>
                {file ? file.name : 'Выберите файл...'}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs text-stone-500 hover:text-rose-600"
              >
                Сбросить
              </button>
            )}
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
