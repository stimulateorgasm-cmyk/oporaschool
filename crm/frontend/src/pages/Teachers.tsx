import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { TeacherRead, SubjectRead, TeacherRateRead, TeacherCreate } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Plus,
  Phone,
  Calendar,
  BadgeRussianRuble,
  BookOpen,
  Award,
} from 'lucide-react';
import { TeacherModal } from '../components/teachers/TeacherModal';
import { Modal } from '../components/common/Modal';

export const Teachers: React.FC = () => {
  const { isManager } = useAuth();
  const [teachers, setTeachers] = useState<TeacherRead[]>([]);
  const [subjects, setSubjects] = useState<SubjectRead[]>([]);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add Rate Modal state
  const [addingRateForTeacher, setAddingRateForTeacher] = useState<TeacherRead | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [lessonFormat, setLessonFormat] = useState('individual');
  const [rateAmount, setRateAmount] = useState<number | string>(600);
  const [rateValidFrom, setRateValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [t, s] = await Promise.all([api.getTeachers(), api.getSubjects()]);
      setTeachers(t);
      setSubjects(s);
      if (s.length > 0) setSelectedSubjectId(s[0].id);
    } catch (err) {
      console.error('Failed to load teachers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingRateForTeacher || !selectedSubjectId) return;

    try {
      setIsSubmittingRate(true);
      await api.createTeacherRate(addingRateForTeacher.id, {
        subject_id: selectedSubjectId,
        lesson_format: lessonFormat as any,
        amount: Number(rateAmount),
        valid_from: rateValidFrom,
      });
      setAddingRateForTeacher(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения ставки');
    } finally {
      setIsSubmittingRate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Педагогический состав
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Реестр преподавателей центра «Опора», ставки за проведенные уроки и контроль расчетов
          </p>
        </div>

        {isManager && (
          <button
            id="btn-create-teacher"
            onClick={() => setIsTeacherModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Новый педагог</span>
          </button>
        )}
      </div>

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            id={`teacher-card-${teacher.id}`}
            className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden flex flex-col justify-between"
          >
            <div className="p-5 space-y-4">
              {/* Header with name & status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-sm border border-amber-200">
                    {teacher.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{teacher.full_name}</h3>
                    <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                      <Phone className="w-3 h-3 text-stone-400" />
                      <span>{teacher.phone}</span>
                    </div>
                  </div>
                </div>
                <StatusBadge status={teacher.status} />
              </div>

              {/* Subjects & Qualification */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-stone-500 text-[11px] font-semibold">Направления:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {teacher.subjects?.map((sub) => (
                      <span
                        key={sub.id}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200"
                      >
                        {sub.name}
                      </span>
                    ))}
                  </div>
                </div>

                {teacher.comment && (
                  <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-stone-600 text-[11px] italic">
                    «{teacher.comment}»
                  </div>
                )}
              </div>

              {/* Rates list */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Ставки за занятие
                  </span>
                  {isManager && (
                    <button
                      onClick={() => setAddingRateForTeacher(teacher)}
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-800"
                    >
                      + Добавить ставку
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {teacher.rates?.length === 0 ? (
                    <div className="text-[11px] text-stone-400">Ставки пока не настроены</div>
                  ) : (
                    teacher.rates?.map((rate) => (
                      <div
                        key={rate.id}
                        className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-200 text-[11px]"
                      >
                        <div>
                          <span className="font-semibold text-stone-800">{rate.subject_name}</span>
                          <span className="text-stone-400 ml-1">
                            ({rate.lesson_format === 'individual' ? 'Индивид.' : 'Группа'})
                          </span>
                        </div>
                        <span className="font-mono font-bold text-stone-900">
                          {Number(rate.amount).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Financial balance card bottom */}
            {isManager && (
              <div className="p-4 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] font-semibold text-stone-500">Задолженность центра:</div>
                  <div className="font-mono font-bold text-amber-900 text-sm">
                    {Number(teacher.debt || 0).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
                <button
                  onClick={() => (window.location.href = `/salary?teacher_id=${teacher.id}`)}
                  className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 rounded-lg border border-stone-200 shadow-2xs"
                >
                  История начислений
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Teacher Create Modal */}
      <TeacherModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        subjects={subjects}
        onSubmit={async (data) => {
          await api.createTeacher(data);
          await loadData();
        }}
      />

      {/* Add Rate Modal */}
      <Modal
        isOpen={!!addingRateForTeacher}
        onClose={() => setAddingRateForTeacher(null)}
        title="Новая ставка педагога"
        subtitle={`Преподаватель: ${addingRateForTeacher?.full_name}`}
        maxWidth="sm"
      >
        <form onSubmit={handleAddRateSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Предмет / Направление <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Формат занятия
              </label>
              <select
                value={lessonFormat}
                onChange={(e) => setLessonFormat(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white"
              >
                <option value="individual">Индивидуально</option>
                <option value="group">Группа</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ставка (₽) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="50"
                value={rateAmount}
                onChange={(e) => setRateAmount(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-stone-200 bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Действует с даты
            </label>
            <input
              type="date"
              value={rateValidFrom}
              onChange={(e) => setRateValidFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setAddingRateForTeacher(null)}
              className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmittingRate}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
            >
              {isSubmittingRate ? 'Сохранение...' : 'Установить ставку'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
