import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LessonRead, RoomRead, TeacherRead, LessonStatus, AttendanceStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Building,
  CheckCircle2,
  MoveRight,
  XCircle,
} from 'lucide-react';
import { LessonModal } from '../components/schedule/LessonModal';
import { AttendanceModal } from '../components/schedule/AttendanceModal';
import { LessonMoveModal } from '../components/schedule/LessonMoveModal';

export const Schedule: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [lessons, setLessons] = useState<LessonRead[]>([]);
  const [rooms, setRooms] = useState<RoomRead[]>([]);
  const [teachers, setTeachers] = useState<TeacherRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [selectedLessonForAttendance, setSelectedLessonForAttendance] = useState<LessonRead | null>(null);
  const [selectedLessonForMove, setSelectedLessonForMove] = useState<LessonRead | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [l, r, t] = await Promise.all([
        api.getLessons({
          date_from: `${selectedDate}T00:00:00`,
          date_to: `${selectedDate}T23:59:59`,
          teacher_id: teacherFilter !== 'all' ? teacherFilter : undefined,
          room_id: roomFilter !== 'all' ? roomFilter : undefined,
        }),
        api.getRooms(),
        api.getTeachers(),
      ]);
      setLessons(l);
      setRooms(r);
      setTeachers(t);
    } catch (err) {
      console.error('Failed to load schedule', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, teacherFilter, roomFilter]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleCancelLesson = async (lesson: LessonRead) => {
    const reason = prompt('Укажите причину отмены занятия:');
    if (reason === null) return;
    try {
      await api.cancelLesson(lesson.id, {
        reason: reason || 'Отмена администратором',
        refund_balance: true,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Ошибка отмены занятия');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & New Lesson CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Расписание занятий
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Контроль занятости 4-х кабинетов центра, расписания преподавателей и посещаемости
          </p>
        </div>

        <button
          id="btn-create-lesson-schedule"
          onClick={() => setIsLessonModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Назначить занятие</span>
        </button>
      </div>

      {/* Date Navigation & Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-lg border border-stone-200">
            <CalendarIcon className="w-4 h-4 text-amber-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-stone-800 bg-transparent focus:outline-hidden"
            />
          </div>

          <button
            onClick={() => changeDate(1)}
            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
          >
            Сегодня
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3 flex-wrap">
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

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-500">Кабинет:</span>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
            >
              <option value="all">Все кабинеты (1-4)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (№{r.number})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedule Grid by Room / Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {rooms.map((room) => {
          const roomLessons = lessons.filter((l) => l.room_id === room.id);
          return (
            <div
              key={room.id}
              className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden flex flex-col min-h-[480px]"
            >
              {/* Room Header */}
              <div className="p-3.5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="text-xs font-bold text-stone-900">{room.name}</div>
                    <div className="text-[10px] text-stone-500">Кабинет №{room.number} • макс {room.capacity} чел.</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-stone-600 bg-stone-200/60 px-2 py-0.5 rounded">
                  {roomLessons.length}
                </span>
              </div>

              {/* Room Lessons Stack */}
              <div className="p-3 flex-1 space-y-3 overflow-y-auto bg-stone-50/20">
                {roomLessons.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 text-xs">
                    <p>Кабинет свободен</p>
                    <p className="text-[11px] mt-0.5">Нет запланированных уроков</p>
                  </div>
                ) : (
                  roomLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      id={`lesson-card-${lesson.id}`}
                      className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-amber-400 transition-all space-y-2.5"
                    >
                      {/* Time & Badges */}
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1 text-xs font-bold font-mono text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>
                            {lesson.starts_at.includes('T') ? lesson.starts_at.split('T')[1].substring(0, 5) : '14:00'} -{' '}
                            {lesson.ends_at.includes('T') ? lesson.ends_at.split('T')[1].substring(0, 5) : '15:00'}
                          </span>
                        </div>
                        <StatusBadge status={lesson.status} />
                      </div>

                      {/* Info */}
                      <div>
                        <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-stone-400" />
                          {lesson.child_name}
                        </div>
                        <div className="text-[11px] font-medium text-amber-900 mt-0.5">
                          {lesson.subject_name}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Преподаватель: {lesson.teacher_name}
                        </div>
                        {lesson.attendance_status && (
                          <div className="mt-1.5">
                            <StatusBadge status={lesson.attendance_status} />
                          </div>
                        )}
                        {lesson.comment && (
                          <div className="text-[10px] text-stone-400 italic mt-1">
                            «{lesson.comment}»
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1">
                        <button
                          onClick={() => setSelectedLessonForAttendance(lesson)}
                          title="Отметить посещаемость"
                          className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Был / Не был</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedLessonForMove(lesson)}
                            title="Перенести занятие"
                            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg"
                          >
                            <MoveRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleCancelLesson(lesson)}
                            title="Отменить занятие"
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        rooms={rooms}
        defaultDate={selectedDate}
        childSubjects={[
          {
            id: 'cs-1',
            child_id: 'c-1',
            subject_id: 'sub-1',
            subject_name: 'Математика (ОГЭ/ЕГЭ)',
            teacher_id: 't-1',
            teacher_name: 'Елена Викторовна Смирнова',
            lesson_format: 'individual' as any,
            lesson_price: 1200,
            default_duration_minutes: 60,
            start_date: '2024-01-15',
            is_active: true,
            balance_lessons: 4,
            completed_lessons: 12,
          },
        ]}
        onSubmit={async (data) => {
          await api.createLesson(data);
          await loadData();
        }}
      />

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
