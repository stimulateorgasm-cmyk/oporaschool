import React from 'react';
import { Menu, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { user, logout, isManager, isAdmin, isTeacher } = useAuth();

  let roleTitle = 'Пользователь';
  if (isManager) roleTitle = 'Руководитель';
  else if (isAdmin) roleTitle = 'Администратор';
  else if (isTeacher) roleTitle = 'Педагог';

  return (
    <header
      id="crm-header"
      className="h-16 bg-white border-b border-stone-200 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8"
    >
      <div className="flex items-center gap-3">
        <button
          id="toggle-mobile-sidebar-btn"
          onClick={onToggleMobileSidebar}
          className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-800 hidden sm:inline">
            Центр «Опора»
          </span>
          <span className="hidden sm:inline text-stone-300">/</span>
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Учебный год 2025–2026
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Role Tag */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-xs">
          <Shield className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-medium text-stone-700">{roleTitle}</span>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-semibold text-xs border border-stone-300">
            {user?.full_name ? user.full_name.charAt(0) : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-stone-900 leading-tight">
              {user?.full_name || 'Пользователь'}
            </div>
            <div className="text-[10px] text-stone-500">{user?.phone || '+7 (918) 000-00-01'}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          id="crm-logout-btn"
          onClick={logout}
          title="Выйти из системы"
          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
