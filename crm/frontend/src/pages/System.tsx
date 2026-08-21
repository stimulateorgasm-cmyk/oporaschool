import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AuditLogRead, UserRead } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Users,
  History,
  Plus,
  Lock,
  Calendar,
  Globe,
  Database,
  Search,
} from 'lucide-react';
import { UserModal } from '../components/system/UserModal';

export const System: React.FC = () => {
  const { isManager } = useAuth();
  const [logs, setLogs] = useState<AuditLogRead[]>([]);
  const [users, setUsers] = useState<UserRead[]>([]);
  const [activeTab, setActiveTab] = useState<'audit' | 'users'>('audit');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [l, u] = await Promise.all([
        api.getAuditLogs({
          entity_type: entityFilter !== 'all' ? entityFilter : undefined,
          limit: 100,
        }),
        api.getUsers(),
      ]);
      setLogs(l);
      setUsers(u);
    } catch (err) {
      console.error('Failed to load system data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [entityFilter]);

  const filteredLogs = logs.filter((l) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      l.entity_type.toLowerCase().includes(term) ||
      l.action.toLowerCase().includes(term) ||
      (l.user_name ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            Системное администрирование и Аудит
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Управление учетными записями персонала и журнал всех действий в системе
          </p>
        </div>

        {activeTab === 'users' && isManager && (
          <button
            id="btn-create-user"
            onClick={() => setIsUserModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Новый пользователь</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-4">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Журнал безопасности и Аудит ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Сотрудники и Права доступа ({users.length})</span>
        </button>
      </div>

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Поиск по действию, сотруднику..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-stone-500">Сущность:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
              >
                <option value="all">Все сущности</option>
                <option value="parent">Родитель (parent)</option>
                <option value="child">Ребенок (child)</option>
                <option value="lesson">Занятие (lesson)</option>
                <option value="payment">Платеж (payment)</option>
                <option value="balance">Баланс (balance)</option>
                <option value="teacher_salary_payment">Зарплата (salary)</option>
                <option value="user">Пользователь (user)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-100">
                  <tr>
                    <th className="p-3.5">Время события</th>
                    <th className="p-3.5">Сотрудник</th>
                    <th className="p-3.5">Действие</th>
                    <th className="p-3.5">Объект</th>
                    <th className="p-3.5">IP-адрес</th>
                    <th className="p-3.5">Детали изменений</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-400 font-sans">
                        Событий аудита не обнаружено
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="p-3.5 text-stone-600 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('ru-RU')}
                        </td>
                        <td className="p-3.5 font-sans font-bold text-stone-900 whitespace-nowrap">
                          {log.user_name}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                              log.action.includes('create') || log.action.includes('payment')
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : log.action.includes('cancel') || log.action.includes('delete')
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 font-sans text-stone-700 whitespace-nowrap">
                          <span className="font-semibold">{log.entity_type}</span>
                          <span className="text-stone-400 text-[11px] ml-1">
                            #{log.entity_id?.substring(0, 8)}
                          </span>
                        </td>
                        <td className="p-3.5 text-stone-500 whitespace-nowrap text-[11px]">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                        <td className="p-3.5 font-sans text-stone-600 text-[11px] max-w-xs truncate">
                          {log.new_values ? JSON.stringify(log.new_values) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              id={`user-card-${user.id}`}
              className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{user.full_name}</h3>
                  <div className="text-xs text-stone-500 font-mono mt-0.5">{user.phone}</div>
                </div>
                <StatusBadge status={user.status} />
              </div>

              {user.email && (
                <div className="text-xs text-stone-600">Email: {user.email}</div>
              )}

              <div className="pt-2 border-t border-stone-100">
                <div className="text-[11px] font-semibold text-stone-500 mb-1">
                  Назначенные роли:
                </div>
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role) => (
                    <span
                      key={role.id}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200"
                    >
                      {role.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-stone-400 pt-1">
                Создан: {new Date(user.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={async (data) => {
          await api.createUser(data);
          await loadData();
        }}
      />
    </div>
  );
};
