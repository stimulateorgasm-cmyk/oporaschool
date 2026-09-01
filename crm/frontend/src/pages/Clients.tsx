import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  ParentRead,
  ChildRead,
  ChildSubjectRead,
  SubjectRead,
  TeacherRead,
  ClientStatus,
  ChildStatus,
} from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Users,
  Search,
  Plus,
  Phone,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CreditCard,
  UserPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { ClientModal } from '../components/clients/ClientModal';
import { ChildSubjectModal } from '../components/clients/ChildSubjectModal';
import { ClientEditModal } from '../components/clients/ClientEditModal';
import { ChildEditModal } from '../components/clients/ChildEditModal';
import { PaymentModal } from '../components/payments/PaymentModal';
import { Modal } from '../components/common/Modal';

const formatLabel = (f: string) => (f === 'individual' ? 'Индивидуально' : 'Группа');

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<ParentRead[]>([]);
  const [subjects, setSubjects] = useState<SubjectRead[]>([]);
  const [teachers, setTeachers] = useState<TeacherRead[]>([]);
  const [childSubjects, setChildSubjects] = useState<ChildSubjectRead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedParentForPayment, setSelectedParentForPayment] = useState<string | undefined>(undefined);

  // Attach Subject Modal
  const [attachingChild, setAttachingChild] = useState<{ id: string; name: string } | null>(null);

  // Edit modals
  const [editingParent, setEditingParent] = useState<ParentRead | null>(null);
  const [editingChild, setEditingChild] = useState<ChildRead | null>(null);

  // Add Child Modal
  const [addingChildForParent, setAddingChildForParent] = useState<{ id: string; name: string } | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [newChildGrade, setNewChildGrade] = useState('');
  const [newChildComment, setNewChildComment] = useState('');
  const [isSubmittingChild, setIsSubmittingChild] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [c, s, t, cs] = await Promise.all([
        api.getClients({ search: search || undefined }),
        api.getSubjects(),
        api.getTeachers(),
        api.getChildSubjects(),
      ]);
      setClients(c);
      setSubjects(s);
      setTeachers(t);
      setChildSubjects(cs);
      const initialExpanded: Record<string, boolean> = {};
      c.forEach((p) => (initialExpanded[p.id] = true));
      setExpandedParents(initialExpanded);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const toggleParentExpand = (id: string) => {
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingChildForParent || !newChildName.trim()) return;

    try {
      setIsSubmittingChild(true);
      await api.createChild(addingChildForParent.id, {
        full_name: newChildName.trim(),
        grade: newChildGrade || undefined,
        comment: newChildComment.trim() || undefined,
        status: ChildStatus.active,
      });
      setAddingChildForParent(null);
      setNewChildName('');
      setNewChildGrade('');
      setNewChildComment('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Ошибка добавления ребенка');
    } finally {
      setIsSubmittingChild(false);
    }
  };

  const handleDetachSubject = async (cs: ChildSubjectRead) => {
    if (!window.confirm(`Открепить направление «${cs.subject_name}»?`)) return;
    try {
      await api.archiveChildSubject(cs.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Ошибка открепления направления');
    }
  };

  const filteredClients = clients.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Клиенты и Дети
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Учет семей, контактных данных родителей, карточек детей и прикрепленных направлений
          </p>
        </div>

        <button
          id="btn-create-client"
          onClick={() => setIsClientModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Новый клиент</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Поиск по ФИО родителя, ребенка или телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-stone-500 whitespace-nowrap">Статус:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
          >
            <option value="all">Все статусы</option>
            <option value={ClientStatus.active}>Активные</option>
            <option value={ClientStatus.paused}>На паузе</option>
            <option value={ClientStatus.completed}>Завершенные</option>
            <option value={ClientStatus.archived}>В архиве</option>
          </select>
        </div>
      </div>

      {/* Client List */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-stone-200 text-stone-500 text-xs">
            Клиентов по заданным критериям не найдено
          </div>
        ) : (
          filteredClients.map((parent) => {
            const isExpanded = !!expandedParents[parent.id];
            return (
              <div
                key={parent.id}
                id={`client-card-${parent.id}`}
                className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden transition-all"
              >
                {/* Parent Row Header */}
                <div
                  onClick={() => toggleParentExpand(parent.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-stone-50/70 border-b border-stone-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-stone-900">
                          {parent.full_name}
                        </span>
                        <StatusBadge status={parent.status} />
                        <span className="text-xs text-stone-400">
                          ID: #{parent.id.substring(0, 8)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-xs text-stone-600 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-semibold text-stone-800">{parent.phone}</span>
                          {parent.secondary_phone && (
                            <span className="text-stone-400">({parent.secondary_phone})</span>
                          )}
                        </span>
                        {parent.comment && (
                          <span className="italic text-stone-500">«{parent.comment}»</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingParent(parent);
                      }}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg"
                      title="Редактировать клиента"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedParentForPayment(parent.id);
                        setIsPaymentModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Принять оплату</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingChildForParent({ id: parent.id, name: parent.full_name });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Ребенок</span>
                    </button>

                    <div className="p-1.5 text-stone-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Children & Attached Subjects */}
                {isExpanded && (
                  <div className="p-4 bg-stone-50/40 space-y-3">
                    <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Дети и направления обучения ({parent.children?.length || 0})
                    </div>

                    {parent.children?.length === 0 ? (
                      <div className="p-4 text-center text-xs text-stone-400 bg-white rounded-lg border border-dashed border-stone-200">
                        У этого родителя пока нет добавленных детей
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {parent.children?.map((child) => {
                          const childDirs = childSubjects.filter((cs) => cs.child_id === child.id && cs.is_active);
                          return (
                            <div
                              key={child.id}
                              id={`child-card-${child.id}`}
                              className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-stone-900">
                                    {child.full_name}
                                  </span>
                                  {child.grade && (
                                    <span className="text-[11px] text-stone-500">
                                      {child.grade === 'дошкольник' ? 'дошкольник' : `${child.grade} класс`}
                                    </span>
                                  )}
                                  <StatusBadge status={child.status} />
                                  {child.comment && (
                                    <span className="text-xs text-stone-500 italic">
                                      - {child.comment}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                  <button
                                    onClick={() => setEditingChild(child)}
                                    title="Редактировать ребенка"
                                    className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setAttachingChild({ id: child.id, name: child.full_name })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Прикрепить направление</span>
                                  </button>
                                </div>
                              </div>

                              {/* Child Subjects (направления и баланс) */}
                              <div>
                                <div className="text-[11px] font-semibold text-stone-600 mb-1.5">
                                  Изучаемые направления и текущий баланс:
                                </div>
                                {childDirs.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-stone-400 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                                    Направления не прикреплены
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {childDirs.map((cs) => (
                                      <div
                                        key={cs.id}
                                        className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs"
                                      >
                                        <div className="min-w-0">
                                          <div className="font-bold text-stone-900">{cs.subject_name}</div>
                                          <div className="text-[11px] text-stone-500 truncate">
                                            Педагог: {cs.teacher_name} • {formatLabel(cs.lesson_format)} ({Number(cs.lesson_price).toLocaleString('ru-RU')} ₽)
                                          </div>
                                          <div className="text-[11px] text-stone-400 mt-0.5">
                                            Пройдено уроков: {cs.completed_lessons}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="text-right">
                                            <div className="text-[11px] font-semibold text-stone-500">Баланс:</div>
                                            <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                                              {cs.balance_lessons} зан.
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => handleDetachSubject(cs)}
                                            title="Открепить направление"
                                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded-lg"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSubmit={async (data) => {
          await api.createClient(data);
          await loadData();
        }}
      />

      {editingParent && (
        <ClientEditModal
          isOpen={!!editingParent}
          onClose={() => setEditingParent(null)}
          client={editingParent}
          onSubmit={async (data) => {
            await api.updateClient(editingParent.id, data);
            await loadData();
          }}
        />
      )}

      {editingChild && (
        <ChildEditModal
          isOpen={!!editingChild}
          onClose={() => setEditingChild(null)}
          child={editingChild}
          onSubmit={async (data) => {
            await api.updateChild(editingChild.id, data);
            await loadData();
          }}
        />
      )}

      {attachingChild && (
        <ChildSubjectModal
          isOpen={!!attachingChild}
          onClose={() => setAttachingChild(null)}
          childId={attachingChild.id}
          childName={attachingChild.name}
          subjects={subjects}
          teachers={teachers}
          onSubmit={async (data) => {
            await api.attachSubjectToChild(data);
            await loadData();
          }}
        />
      )}

      {selectedParentForPayment && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedParentForPayment(undefined);
          }}
          parents={clients}
          preselectedParentId={selectedParentForPayment}
          onSubmit={async (data) => {
            await api.createPayment(data);
            await loadData();
          }}
        />
      )}

      {/* Add Child Dialog */}
      <Modal
        isOpen={!!addingChildForParent}
        onClose={() => setAddingChildForParent(null)}
        title="Добавить ребенка к родителю"
        subtitle={`Родитель: ${addingChildForParent?.name}`}
        maxWidth="sm"
      >
        <form onSubmit={handleAddChildSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              ФИО ребенка <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              placeholder="Иванов Даниил"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Класс
            </label>
            <select
              value={newChildGrade}
              onChange={(e) => setNewChildGrade(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value="">Не указан</option>
              <option value="дошкольник">дошкольник</option>
              {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  {n} класс
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Примечание
            </label>
            <input
              type="text"
              value={newChildComment}
              onChange={(e) => setNewChildComment(e.target.value)}
              placeholder="Особенности, пожелания..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setAddingChildForParent(null)}
              className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmittingChild}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
            >
              {isSubmittingChild ? 'Сохранение...' : 'Добавить ребенка'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
