import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  WalletCards,
  GraduationCap,
  BadgeRussianRuble,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { isManager, isTeacher } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Главная',
      icon: LayoutDashboard,
      roles: ['manager', 'administrator', 'teacher'],
    },
    {
      to: '/clients',
      label: 'Клиенты и Дети',
      icon: Users,
      roles: ['manager', 'administrator'],
    },
    {
      to: '/schedule',
      label: 'Расписание',
      icon: Calendar,
      roles: ['manager', 'administrator', 'teacher'],
    },
    {
      to: '/payments',
      label: 'Платежи',
      icon: CreditCard,
      roles: ['manager', 'administrator'],
    },
    {
      to: '/balance',
      label: 'Баланс занятий',
      icon: WalletCards,
      roles: ['manager', 'administrator', 'teacher'],
    },
    {
      to: '/teachers',
      label: 'Педагоги',
      icon: GraduationCap,
      roles: ['manager', 'administrator', 'teacher'],
    },
    {
      to: '/salary',
      label: 'Зарплата',
      icon: BadgeRussianRuble,
      roles: ['manager', 'teacher'],
    },
    {
      to: '/system',
      label: 'Система и Аудит',
      icon: ShieldCheck,
      roles: ['manager'],
    },
  ];

  const allowedNavItems = navItems.filter((item) => {
    if (isManager) return true;
    if (isTeacher) return item.roles.includes('teacher');
    return item.roles.includes('administrator');
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          id="sidebar-mobile-backdrop"
          className="fixed inset-0 bg-stone-900/50 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="crm-sidebar"
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r border-stone-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-stone-100 bg-stone-50/50">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-stone-900 leading-none">ОПОРА</div>
            <div className="text-[11px] text-stone-500 mt-1">CRM Образовательного центра</div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            Разделы управления
          </div>
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={`nav-link-${item.to.replace('/', '')}`}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200/60 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-stone-500" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/30 text-xs text-stone-500">
          <div className="flex items-center justify-between">
            <span>ст. Северская</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
              v1.0.0 Online
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
