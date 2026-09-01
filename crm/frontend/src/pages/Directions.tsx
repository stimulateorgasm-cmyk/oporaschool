import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { SubjectRead } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import {
  Compass,
  Plus,
  Users,
  GraduationCap,
  Pencil,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

interface DirectionTeacher {
  id: string;
  full_name: string;
  phone: string;
  status: string;
}

interface DirectionChild {
  id: string;
  full_name: string;
  grade?: string;
  teacher_name?: string;
}

export const Directions: React.FC = () => {
  const { isManager } = useAuth();
  const [subjects, setSubjects] = useState<SubjectRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create / rename modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectRead | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drill-down state
  const [drillSubject, setDrillSubject] = useState<SubjectRead | null>(null);
  const [teachers, setTeachers] = useState<DirectionTeacher[]>([]);
  const [children, setChildren] = useState<DirectionChild[]>([]);
  const [isDrillLoading, setIsDrillLoading] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const s = await api.getSubjects();
      setSubjects(s);
    } catch (err) {
      console.error('Failed to load directions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingSubject(null);
    setName('');
    setDescription('');
    setIsCreateOpen(true);
  };

  const openEdit = (subject: SubjectRead) => {
    setEditingSubject(subject);
    setName(subject.name);
    setDescription(subject.description || '');
    setIsCreateOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setIsSubmitting(true);
      if (editingSubject) {
        await api.updateSubject(editingSubject.id, {
          name: name.trim(),
          description: description.trim(),
        });
      } else {
        await api.createSubject({
          name: name.trim(),
          description: description.trim(),
        });
      }
      setIsCreateOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения направления');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (subject: SubjectRead) => {
    const archiving = subject.is_active;
    const action = archiving ? 'архивировать' : 'восстановить';
    if (!window.confirm(`${action === 'архивировать' ? 'Архивировать' : 'Восстановить'} направление «${subject.name}»?`)) return;
    try {
      await api.updateSubject(subject.id, { is_active: !archiving });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Ошибка изменения статуса');
    }
  };

  const openDrillDown = async (subject: SubjectRead) => {
    setDrillSubject(subject);
    setIsDrillLoading(true);
    setTeachers([]);
    setChildren([]);
    try {
      const [t, c] = await Promise.all([
        api.getSubjectTeachers(subject.id),
        api.getSubjectChildren(subject.id),
      ]);
      setTeachers(t);
      setChildren(c);
    } catch (err) {
      console.error('Failed to load direction details', err);
    } finally {
      setIsDrillLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Направления</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Справочник направлений центра «Опора»: педагоги и ученики по каждому направлению
          </p>
        </div>

        {isManager && (
          <button
            id="btn-create-direction"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Новое направление</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-stone-500 py-12 text-center">Загрузка направлений...</div>
      ) : subjects.length === 0 ? (
        <div className="text-sm text-stone-500 py-12 text-center">Направления пока не добавлены</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              id={`direction-card-${subject.id}`}
              className={`bg-white rounded-xl border shadow-2xs overflow-hidden flex flex-col ${
                subject.is_active ? 'border-stone-200' : 'border-stone-200 opacity-60'
              }`}
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 leading-tight">{subject.name}</h3>
                      {!subject.is_active && (
                        <span className="text-[11px] font-medium text-stone-400">В архиве</span>
                      )}
                    </div>
                  </div>
                </div>

                {subject.description && (
                  <p className="text-xs text-stone-500 leading-relaxed">{subject.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-stone-500 pt-1 border-t border-stone-100">
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-stone-400" />
                    {subject.teachers_count ?? 0} педагогов
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    {subject.children_count ?? 0} учеников
                  </span>
                </div>
              </div>

              <div className="p-3 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => openDrillDown(subject)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                >
                  Педагоги и ученики
                </button>

                {isManager && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(subject)}
                      title="Переименовать"
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(subject)}
                      title={subject.is_active ? 'Архивировать' : 'Восстановить'}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      {subject.is_active ? (
                        <Archive className="w-3.5 h-3.5" />
                      ) : (
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Rename modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingSubject ? 'Переименовать направление' : 'Новое направление'}
        subtitle={editingSubject ? `Текущее название: ${editingSubject.name}` : 'Добавьте новое направление в справочник'}
        maxWidth="sm"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Название <span className="text-rose-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Drill-down modal */}
      <Modal
        isOpen={!!drillSubject}
        onClose={() => setDrillSubject(null)}
        title={drillSubject?.name || ''}
        subtitle="Педагоги и ученики направления"
        maxWidth="xl"
      >
        {isDrillLoading ? (
          <div className="text-sm text-stone-500 py-8 text-center">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Teachers */}
            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Педагоги ({teachers.length})
              </h4>
              {teachers.length === 0 ? (
                <div className="text-xs text-stone-400">Педагоги не назначены</div>
              ) : (
                <div className="space-y-1.5">
                  {teachers.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-200 text-xs"
                    >
                      <span className="font-semibold text-stone-800">{t.full_name}</span>
                      <span className="text-stone-400">{t.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Children */}
            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Ученики ({children.length})
              </h4>
              {children.length === 0 ? (
                <div className="text-xs text-stone-400">Ученики не записаны</div>
              ) : (
                <div className="space-y-1.5">
                  {children.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 rounded bg-stone-50 border border-stone-200 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-800">{c.full_name}</span>
                        {c.grade && <span className="text-stone-400">{c.grade}</span>}
                      </div>
                      {c.teacher_name && (
                        <div className="text-stone-500 mt-0.5 truncate">
                          <span>Педагог: {c.teacher_name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
