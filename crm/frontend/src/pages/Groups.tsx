import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { GroupRead, ChildRead, ChildStatus } from '../types';
import { Plus, Trash2, Pencil, UsersRound, X } from 'lucide-react';

export const Groups: React.FC = () => {
  const [groups, setGroups] = useState<GroupRead[]>([]);
  const [children, setChildren] = useState<ChildRead[]>([]);
  const [memberSelections, setMemberSelections] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [grps, clients] = await Promise.all([api.getGroups(), api.getClients()]);
      setGroups(grps);
      setChildren(clients.flatMap((p) => p.children));
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createGroup({ name: newName.trim() });
      setNewName('');
      await load();
    } catch (err: any) {
      alert(err.message || 'Ошибка создания группы');
    }
  };

  const handleRename = async (group: GroupRead) => {
    const name = prompt('Новое название группы:', group.name);
    if (name === null || !name.trim()) return;
    try {
      await api.updateGroup(group.id, { name: name.trim() });
      await load();
    } catch (err: any) {
      alert(err.message || 'Ошибка переименования');
    }
  };

  const handleDelete = async (group: GroupRead) => {
    if (!confirm(`Удалить группу «${group.name}»? Занятия группы не удалятся.`)) return;
    try {
      await api.deleteGroup(group.id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления группы');
    }
  };

  const setMemberId = (groupId: string, v: string) =>
    setMemberSelections((s) => ({ ...s, [groupId]: v }));

  const activeChildren = children.filter((c) => c.status === ChildStatus.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Группы учеников</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Групповые занятия назначаются из расписания на выбранную группу
          </p>
        </div>

        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название новой группы"
            className="px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white w-56"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Создать
          </button>
        </form>
      </div>

      {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">{error}</div>}

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-stone-400 text-xs">Загрузка групп…</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-10 text-center text-stone-400 text-xs">
          Групп пока нет — создайте первую, чтобы назначать групповые занятия.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => {
            const memberIds = new Set(group.children.map((c) => c.id));
            const candidates = activeChildren.filter((c) => !memberIds.has(c.id));
            const memberId = memberSelections[group.id] || '';
            return (
              <div key={group.id} className="bg-white rounded-xl border border-stone-200 shadow-2xs p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <UsersRound className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-stone-900 truncate">{group.name}</div>
                      <div className="text-[11px] text-stone-400">{group.children.length} чел.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRename(group)}
                      className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
                      title="Переименовать"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(group)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {group.children.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {group.children.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-stone-100 text-xs text-stone-700"
                      >
                        {c.full_name}
                        <button
                          onClick={async () => {
                            try {
                              await api.removeGroupMember(group.id, c.id);
                              await load();
                            } catch (err: any) {
                              alert(err.message || 'Ошибка удаления ученика');
                            }
                          }}
                          className="p-0.5 rounded-full hover:bg-stone-200 text-stone-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-stone-400 italic">Пока пусто</div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(group.id, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
                  >
                    <option value="">Добавить ученика…</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      if (!memberId) return;
                      try {
                        await api.addGroupMember(group.id, memberId);
                        setMemberId(group.id, '');
                        await load();
                      } catch (err: any) {
                        alert(err.message || 'Ошибка добавления ученика');
                      }
                    }}
                    disabled={!memberId}
                    className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 disabled:opacity-50"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
