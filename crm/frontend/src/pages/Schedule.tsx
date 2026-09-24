import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LessonRead, RoomRead, TeacherRead, ChildRead, ChildSubjectRead, OccupancySlot } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Building,
} from 'lucide-react';
import { LessonModal } from '../components/schedule/LessonModal';
import { AttendanceModal } from '../components/schedule/AttendanceModal';
import { LessonMoveModal } from '../components/schedule/LessonMoveModal';
import { Modal } from '../components/common/Modal';

// ponytail: фиксированная сетка 08:00–21:00 — предсказуемые «свободные слоты» без динамического расчёта
const HOUR_START = 8;
const HOUR_END = 21;
const PX_PER_HOUR = 48;
const TOTAL_H = (HOUR_END - HOUR_START) * PX_PER_HOUR;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-amber-100 border-amber-300 text-amber-900',
  completed: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  absent: 'bg-rose-100 border-rose-300 text-rose-900',
  cancelled: 'bg-stone-100 border-stone-300 text-stone-400',
  moved: 'bg-violet-100 border-violet-300 text-violet-900',
};

const formatLabel = (f: string) => (f === 'individual' ? 'Индивидуально' : 'Группа');

const fmtTime = (iso: string) => {
  const t = iso.includes('T') ? iso.split('T')[1] : '00:00:00';
  return t.substring(0, 5);
};

const lessonDate = (iso: string) => iso.split('T')[0];

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

// понедельник недели, на которую приходится дата
const startOfWeek = (d: Date) => {
  const r = new Date(d);
  const dow = r.getDay();
  r.setDate(r.getDate() - (dow === 0 ? 6 : dow - 1));
  return r;
};

const minsOf = (iso: string) => {
  const t = iso.includes('T') ? iso.split('T')[1] : '00:00:00';
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const blockTop = (iso: string) => Math.max(0, ((minsOf(iso) - HOUR_START * 60) / 60) * PX_PER_HOUR);
const blockHeight = (startIso: string, endIso: string) =>
  Math.max(22, ((minsOf(endIso) - minsOf(startIso)) / 60) * PX_PER_HOUR);

interface TimelineColumn {
  key: string;
  label: string;
  sub?: string;
}

interface TimelineProps {
  columns: TimelineColumn[];
  bucketKey: (l: LessonRead) => string;
  lessons: LessonRead[];
  occupancy?: OccupancySlot[]; // серые «занято» — только для педагога (день, колонки = кабинеты)
  onLessonClick: (l: LessonRead) => void;
}

const Timeline: React.FC<TimelineProps> = ({ columns, bucketKey, lessons, occupancy, onLessonClick }) => {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[880px]">
        {/* Header row */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          <div className="h-10" />
          {columns.map((c) => (
            <div key={c.key} className="h-10 px-2 border-l border-stone-100 flex flex-col justify-center">
              <div className="text-xs font-bold text-stone-800 leading-tight">{c.label}</div>
              {c.sub && <div className="text-[10px] text-stone-400 leading-tight">{c.sub}</div>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {/* Hour labels */}
          <div className="relative" style={{ height: TOTAL_H }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-stone-400 -translate-y-1/2"
                style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Columns */}
          {columns.map((col) => {
            const colLessons = lessons.filter((l) => bucketKey(l) === col.key);
            const colOccupancy = occupancy ? occupancy.filter((o) => o.room_id === col.key) : [];
            return (
              <div
                key={col.key}
                className="relative border-l border-stone-100 bg-white"
                style={{ height: TOTAL_H }}
              >
                {/* hour gridlines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-stone-100"
                    style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
                  />
                ))}

                {/* занятость чужих кабинетов (педагог) */}
                {colOccupancy.map((o, i) => (
                  <div
                    key={`occ-${col.key}-${i}`}
                    className="absolute left-1 right-1 rounded-md bg-stone-200/70 border border-stone-300 flex items-center justify-center overflow-hidden"
                    style={{
                      top: blockTop(o.starts_at),
                      height: Math.min(TOTAL_H - blockTop(o.starts_at), blockHeight(o.starts_at, o.ends_at)),
                    }}
                  >
                    <span className="text-[10px] font-semibold text-stone-500">Занято</span>
                  </div>
                ))}

                {/* занятия */}
                {colLessons.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => onLessonClick(l)}
                    title={`${l.child_name} • ${l.subject_name} • ${l.teacher_name}`}
                    className={`absolute left-1 right-1 overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-2xs ${
                      STATUS_STYLE[l.status] || STATUS_STYLE.scheduled
                    }`}
                    style={{
                      top: blockTop(l.starts_at),
                      height: Math.min(TOTAL_H - blockTop(l.starts_at), blockHeight(l.starts_at, l.ends_at)),
                    }}
                  >
                    <div className="text-[10px] font-bold leading-tight truncate">
                      {fmtTime(l.starts_at)} · {l.child_name}
                    </div>
                    <div className="text-[10px] leading-tight truncate opacity-80">{l.subject_name}</div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

type View = 'day' | 'week' | 'month';

export const Schedule: React.FC = () => {
  const { isAdmin, isTeacher } = useAuth();
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(toISODate(new Date()));
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [childFilter, setChildFilter] = useState('all');

  const [lessons, setLessons] = useState<LessonRead[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancySlot[]>([]);
  const [rooms, setRooms] = useState<RoomRead[]>([]);
  const [teachers, setTeachers] = useState<TeacherRead[]>([]);
  const [children, setChildren] = useState<ChildRead[]>([]);
  const [childSubjects, setChildSubjects] = useState<ChildSubjectRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonRead | null>(null);
  const [selectedLessonForAttendance, setSelectedLessonForAttendance] = useState<LessonRead | null>(null);
  const [selectedLessonForMove, setSelectedLessonForMove] = useState<LessonRead | null>(null);

  const getRange = (v: View, a: string) => {
    const d = parseISODate(a);
    if (v === 'day') return { from: d, to: d };
    if (v === 'week') {
      const s = startOfWeek(d);
      return { from: s, to: addDays(s, 6) };
    }
    return {
      from: new Date(d.getFullYear(), d.getMonth(), 1),
      to: new Date(d.getFullYear(), d.getMonth() + 1, 0),
    };
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { from, to } = getRange(view, anchor);
      const fromS = `${toISODate(from)}T00:00:00`;
      const toS = `${toISODate(to)}T23:59:59`;
      const [l, r, t] = await Promise.all([
        api.getLessons({
          from_date: fromS,
          to_date: toS,
          teacher_id: teacherFilter !== 'all' ? teacherFilter : undefined,
          child_id: childFilter !== 'all' ? childFilter : undefined,
          room_id: roomFilter !== 'all' ? roomFilter : undefined,
        }),
        api.getRooms(),
        api.getTeachers(),
      ]);
      setLessons(l);
      setRooms(r);
      setTeachers(t);
      if (isTeacher) {
        const occ = await api.getOccupancy({ from_date: fromS, to_date: toS });
        setOccupancy(occ);
      }
    } catch (err) {
      console.error('Failed to load schedule', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor, teacherFilter, roomFilter, childFilter]);

  // Ученики + привязки для формы создания занятия и фильтра — только руководитель/администратор
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const [clients, cs] = await Promise.all([api.getClients(), api.getChildSubjects()]);
        setChildren(clients.flatMap((p) => p.children));
        setChildSubjects(cs);
      } catch (err) {
        console.error('Failed to load lesson form data', err);
      }
    })();
  }, [isAdmin]);

  const changePeriod = (dir: number) => {
    const d = parseISODate(anchor);
    if (view === 'day') setAnchor(toISODate(addDays(d, dir)));
    else if (view === 'week') setAnchor(toISODate(addDays(d, dir * 7)));
    else setAnchor(toISODate(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
  };

  const periodLabel = () => {
    const d = parseISODate(anchor);
    if (view === 'day')
      return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const s = startOfWeek(d);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`;
    }
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  const handleCancelLesson = async (lesson: LessonRead) => {
    const reason = prompt('Укажите причину отмены занятия:');
    if (reason === null) return;
    try {
      await api.cancelLesson(lesson.id, { reason: reason || 'Отмена администратором', refund_balance: true });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Ошибка отмены занятия');
    }
  };

  const sortedRooms = [...rooms].sort((a, b) => a.number - b.number);

  // колонки для таймлайна
  const dayColumns: TimelineColumn[] = sortedRooms.map((r) => ({
    key: r.id,
    label: `Кабинет №${r.number}`,
    sub: `до ${r.capacity || 0} чел.`,
  }));

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(parseISODate(anchor)), i));
  const weekColumns: TimelineColumn[] = weekDates.map((d) => ({
    key: toISODate(d),
    label: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
    sub: toISODate(d).slice(8),
  }));

  // месяц: сетка 7×N
  const monthCells: (string | null)[] = (() => {
    const d = parseISODate(anchor);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const startDow = (first.getDay() + 6) % 7;
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let dd = 1; dd <= daysInMonth; dd++) cells.push(toISODate(new Date(d.getFullYear(), d.getMonth(), dd)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  const isToday = (iso: string) => iso === toISODate(new Date());

  return (
    <div className="space-y-6">
      {/* Header & New Lesson CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Расписание занятий</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Единый календарь центра «Опора»: занятость 7 кабинетов, расписание преподавателей и посещаемость
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-create-lesson-schedule"
            onClick={() => setIsLessonModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Назначить занятие</span>
          </button>
        )}
      </div>

      {/* Toolbar: view switch + date nav + filters */}
      <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs flex flex-col gap-3">
        {/* View switch + period nav */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-lg border border-stone-200 overflow-hidden self-start">
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  view === v ? 'bg-amber-600 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {v === 'day' ? 'День' : v === 'week' ? 'Неделя' : 'Месяц'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => changePeriod(-1)}
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-lg border border-stone-200">
              <CalendarIcon className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-stone-800 capitalize">{periodLabel()}</span>
            </div>
            <button
              onClick={() => changePeriod(1)}
              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAnchor(toISODate(new Date()))}
              className="px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Сегодня
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap border-t border-stone-100 pt-3">
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500">Педагог:</span>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
              >
                <option value="all">Все педагоги</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500">Ученик:</span>
              <select
                value={childFilter}
                onChange={(e) => setChildFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
              >
                <option value="all">Все ученики</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500">Кабинет:</span>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
            >
              <option value="all">Все кабинеты (1–7)</option>
              {sortedRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Кабинет №{r.number}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timeline (day/week) */}
      {view !== 'month' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-4">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-stone-400 text-xs">Загрузка расписания…</div>
          ) : view === 'day' ? (
            <Timeline
              columns={dayColumns}
              bucketKey={(l) => l.room_id}
              lessons={lessons}
              occupancy={isTeacher ? occupancy : undefined}
              onLessonClick={setSelectedLesson}
            />
          ) : (
            <Timeline
              columns={weekColumns}
              bucketKey={(l) => lessonDate(l.starts_at)}
              lessons={lessons}
              onLessonClick={setSelectedLesson}
            />
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-300" /> Запланировано
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-300" /> Проведено
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-300" /> Пропуск
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-stone-200 border border-stone-300" /> Занято / отменено
            </span>
            <span className="text-stone-400">Пустые ячейки — свободные слоты</span>
          </div>
        </div>
      )}

      {/* Month view */}
      {view === 'month' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-4">
          <div className="grid grid-cols-7 gap-px bg-stone-100 border border-stone-200 rounded-lg overflow-hidden">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((w) => (
              <div key={w} className="bg-stone-50 px-2 py-1.5 text-[11px] font-bold text-stone-500 text-center">
                {w}
              </div>
            ))}
            {monthCells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} className="bg-white min-h-[88px]" />;
              const dayLessons = lessons.filter((l) => lessonDate(l.starts_at) === cell);
              return (
                <button
                  key={cell}
                  onClick={() => {
                    setAnchor(cell);
                    setView('day');
                  }}
                  className={`bg-white min-h-[88px] p-1.5 text-left hover:bg-amber-50/50 transition-colors border-t border-stone-100 ${
                    isToday(cell) ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold mb-1 ${
                      isToday(cell) ? 'text-amber-700' : 'text-stone-700'
                    }`}
                  >
                    {Number(cell.slice(8))}
                  </div>
                  <div className="space-y-0.5">
                    {dayLessons.slice(0, 3).map((l) => (
                      <div
                        key={l.id}
                        className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded border ${STATUS_STYLE[l.status] || STATUS_STYLE.scheduled}`}
                      >
                        {fmtTime(l.starts_at)} {l.child_name}
                      </div>
                    ))}
                    {dayLessons.length > 3 && (
                      <div className="text-[10px] text-stone-400">+{dayLessons.length - 3}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        rooms={rooms}
        children={children}
        childSubjects={childSubjects}
        defaultDate={anchor}
        onSubmit={async (data) => {
          await api.createLesson(data);
          await loadData();
        }}
      />

      {/* Карточка занятия: посещаемость / перенос / отмена */}
      <Modal
        isOpen={!!selectedLesson}
        onClose={() => setSelectedLesson(null)}
        title="Занятие"
        subtitle={selectedLesson ? `${selectedLesson.subject_name} • ${selectedLesson.child_name}` : undefined}
        maxWidth="sm"
      >
        {selectedLesson && (
          <div className="space-y-4">
            <div className="space-y-1 text-xs text-stone-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span className="font-mono font-semibold text-stone-800">
                  {fmtTime(selectedLesson.starts_at)} – {fmtTime(selectedLesson.ends_at)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-stone-400" />
                <span>Кабинет №{selectedLesson.room_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  Педагог: {selectedLesson.teacher_name} • {formatLabel(selectedLesson.lesson_format)}
                </span>
              </div>
              {selectedLesson.comment && (
                <div className="italic text-stone-400">«{selectedLesson.comment}»</div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setSelectedLessonForAttendance(selectedLesson);
                  setSelectedLesson(null);
                }}
                className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
              >
                Отметить посещаемость
              </button>
              <button
                onClick={() => {
                  setSelectedLessonForMove(selectedLesson);
                  setSelectedLesson(null);
                }}
                className="px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200"
              >
                Перенести занятие
              </button>
              <button
                onClick={() => {
                  handleCancelLesson(selectedLesson);
                  setSelectedLesson(null);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
              >
                Отменить занятие
              </button>
            </div>
          </div>
        )}
      </Modal>

      <AttendanceModal
        isOpen={!!selectedLessonForAttendance}
        onClose={() => setSelectedLessonForAttendance(null)}
        lesson={selectedLessonForAttendance}
        onSubmit={async (data) => {
          if (selectedLessonForAttendance) {
            await api.markAttendance(selectedLessonForAttendance.id, data);
            await loadData();
          }
        }}
      />

      <LessonMoveModal
        isOpen={!!selectedLessonForMove}
        onClose={() => setSelectedLessonForMove(null)}
        lesson={selectedLessonForMove}
        rooms={rooms}
        onSubmit={async (id, data) => {
          await api.moveLesson(id, data);
          await loadData();
        }}
      />
    </div>
  );
};
