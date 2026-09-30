import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import {
  ChildRead,
  ChildSubjectRead,
  GroupRead,
  LessonCreate,
  LessonRead,
  LessonUpdate,
  Recurrence,
  RoomRead,
  SubjectRead,
  TeacherRead,
} from '../../types';
import { Paperclip } from 'lucide-react';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ChildRead[];
  childSubjects: ChildSubjectRead[];
  rooms: RoomRead[];
  teachers: TeacherRead[];
  subjects: SubjectRead[];
  groups?: GroupRead[];
  onSubmit?: (data: LessonCreate) => Promise<void>;
  editingLesson?: LessonRead | null;
  onUpdate?: (data: LessonUpdate) => Promise<void>;
  defaultDate?: string;
  preselectedChildId?: string;
}

// Вложение создаётся до занятия, поэтому для owner_id используем пустой UUID-заглушку:
// реальная связь занятия с файлом идёт через lesson.attachment_id.
const PLACEHOLDER_OWNER_ID = '00000000-0000-0000-0000-000000000000';

const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  children,
  childSubjects,
  rooms,
  teachers,
  subjects,
  groups = [],
  onSubmit,
  editingLesson = null,
  onUpdate,
  defaultDate,
  preselectedChildId,
}) => {
  const today = defaultDate || new Date().toISOString().split('T')[0];
  const isEdit = !!editingLesson;

  // ---- create state ----
  const [mode, setMode] = useState<'individual' | 'group'>('individual');
  const [childId, setChildId] = useState(preselectedChildId || '');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [roomId, setRoomId] = useState(rooms[0]?.id || '');
  const [lessonDate, setLessonDate] = useState(today);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [recurrence, setRecurrence] = useState<Recurrence>(Recurrence.once);
  const [occurrences, setOccurrences] = useState(1);

  // ---- edit state ----
  const editStart = editingLesson ? new Date(editingLesson.starts_at) : null;
  const editEnd = editingLesson ? new Date(editingLesson.ends_at) : null;
  const [eSubjectId, setESubjectId] = useState(editingLesson?.subject_id || '');
  const [eTeacherId, setETeacherId] = useState(editingLesson?.teacher_id || '');
  const [eRoomId, setERoomId] = useState(editingLesson?.room_id || '');
  const [eDate, setEDate] = useState(editStart ? toDateStr(editStart) : today);
  const [eStart, setEStart] = useState(editStart ? toTimeStr(editStart) : '14:00');
  const [eEnd, setEEnd] = useState(editEnd ? toTimeStr(editEnd) : '15:00');
  const [eComment, setEComment] = useState(editingLesson?.comment || '');
  const [eFile, setEFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // латает пропущенный кабинет при асинхронной загрузке rooms
  useEffect(() => {
    if (!isEdit && !roomId && rooms.length > 0) setRoomId(rooms[0].id);
    if (isEdit && !eRoomId && rooms.length > 0) setERoomId(rooms[0].id);
  }, [rooms, roomId, eRoomId, isEdit]);

  // Направления текущего ребёнка (individual)
  const childDirections = useMemo(() => {
    const map = new Map<string, string>();
    childSubjects
      .filter((cs) => cs.child_id === childId)
      .forEach((cs) => map.set(cs.subject_id, cs.subject_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [childSubjects, childId]);

  // Педагоги выбранного направления (для текущего ребёнка)
  const directionTeachers = useMemo(() => {
    return childSubjects.filter((cs) => cs.child_id === childId && cs.subject_id === subjectId);
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

  const upload = async (f: File | null) => (f ? (await api.uploadAttachment('lesson', PLACEHOLDER_OWNER_ID, f)).id : undefined);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'individual') {
      if (!childId || !subjectId || !teacherId) {
        setError('Заполните ученика, направление и педагога');
        return;
      }
    } else if (!groupId || !subjectId || !teacherId) {
      setError('Заполните группу, направление и педагога');
      return;
    }
    if (!roomId) {
      setError('Выберите кабинет');
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
      const attachmentId = await upload(file);
      if (onSubmit) {
        await onSubmit({
          child_id: mode === 'individual' ? childId || undefined : undefined,
          group_id: mode === 'group' ? groupId || undefined : undefined,
          subject_id: subjectId,
          teacher_id: teacherId,
          room_id: roomId,
          starts_at: startsAt,
          ends_at: endsAt,
          attachment_id: attachmentId,
          comment: comment.trim() || undefined,
          recurrence,
          occurrences: recurrence === Recurrence.once ? 1 : occurrences,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания занятия');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!eSubjectId || !eTeacherId || !eRoomId) {
      setError('Заполните направление, педагога и кабинет');
      return;
    }
    const startsAt = `${eDate}T${eStart}:00`;
    const endsAt = `${eDate}T${eEnd}:00`;
    if (new Date(startsAt) >= new Date(endsAt)) {
      setError('Время окончания должно быть позже времени начала');
      return;
    }

    try {
      setIsSubmitting(true);
      const attachmentId = await upload(eFile);
      const payload: LessonUpdate = {
        subject_id: eSubjectId,
        teacher_id: eTeacherId,
        room_id: eRoomId,
        starts_at: startsAt,
        ends_at: endsAt,
        comment: eComment.trim() || undefined,
      };
      if (attachmentId) payload.attachment_id = attachmentId;
      if (onUpdate) await onUpdate(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка редактирования занятия');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Редактировать занятие' : 'Назначить занятие в расписание'}
      subtitle={
        isEdit
          ? `${editingLesson?.subject_name} • ${editingLesson?.child_name || editingLesson?.group_name}`
          : 'Ученик/группа → направление → педагог → кабинет и время'
      }
      maxWidth="md"
    >
      {isEdit ? (
        <form onSubmit={handleEdit} className="space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Направление <span className="text-rose-500">*</span>
            </label>
            <select
              value={eSubjectId}
              onChange={(e) => setESubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value="">Выберите направление</option>
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
              value={eTeacherId}
              onChange={(e) => setETeacherId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value="">Выберите педагога</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Кабинет <span className="text-rose-500">*</span>
            </label>
            <select
              value={eRoomId}
              onChange={(e) => setERoomId(e.target.value)}
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
              <label className="block text-xs font-semibold text-stone-700 mb-1">Дата</label>
              <input
                type="date"
                required
                value={eDate}
                onChange={(e) => setEDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Начало</label>
              <input
                type="time"
                required
                value={eStart}
                onChange={(e) => setEStart(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Конец</label>
              <input
                type="time"
                required
                value={eEnd}
                onChange={(e) => setEEnd(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Вложение (необязательно)</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white cursor-pointer hover:bg-stone-50">
                <Paperclip className="w-3.5 h-3.5 text-stone-400" />
                <span className={eFile ? 'text-stone-800 truncate' : 'text-stone-400'}>
                  {eFile ? eFile.name : 'Заменить файл...'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(ev) => setEFile(ev.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Тема занятия / Комментарий</label>
            <input
              type="text"
              value={eComment}
              onChange={(e) => setEComment(e.target.value)}
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
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCreate} className="space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">{error}</div>
          )}

          {/* Индивидуально / Группа */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-700">Тип занятия:</span>
            <div className="inline-flex rounded-lg border border-stone-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setMode('individual')}
                className={`px-3 py-1.5 text-xs font-semibold ${mode === 'individual' ? 'bg-amber-600 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                Индивидуально
              </button>
              <button
                type="button"
                onClick={() => setMode('group')}
                className={`px-3 py-1.5 text-xs font-semibold ${mode === 'group' ? 'bg-amber-600 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                Группа
              </button>
            </div>
          </div>

          {/* Шаг 1: Ученик или Группа */}
          {mode === 'individual' ? (
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
          ) : (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                1. Группа <span className="text-rose-500">*</span>
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
              >
                <option value="">Выберите группу</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.children?.length || 0} чел.)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Шаг 2: Направление */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              2. Направление <span className="text-rose-500">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={mode === 'individual' && !childId}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white disabled:bg-stone-50 disabled:text-stone-400"
            >
              <option value="">
                {mode === 'individual' && !childId ? 'Сначала выберите ученика' : 'Выберите направление'}
              </option>
              {mode === 'individual'
                ? childDirections.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))
                : subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
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
              {mode === 'individual'
                ? directionTeachers.map((cs) => (
                    <option key={cs.teacher_id} value={cs.teacher_id}>
                      {cs.teacher_name}
                    </option>
                  ))
                : teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
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

          {/* Повтор */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Повтор</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
              >
                <option value={Recurrence.once}>Однократно</option>
                <option value={Recurrence.weekly}>Раз в неделю</option>
                <option value={Recurrence.twice_weekly}>Два раза в неделю</option>
              </select>
            </div>
            {recurrence !== Recurrence.once && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Кол-во занятий</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={occurrences}
                  onChange={(e) => setOccurrences(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
                />
              </div>
            )}
          </div>

          {/* Вложение (необязательно) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Вложение (PDF / JPEG / PNG / WORD) — необязательно
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
            <label className="block text-xs font-semibold text-stone-700 mb-1">Тема занятия / Комментарий</label>
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
      )}
    </Modal>
  );
};
