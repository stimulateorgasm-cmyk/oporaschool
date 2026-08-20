import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, Phone, ArrowRight, Shield } from 'lucide-react';

export const Login: React.FC = () => {
  const [phone, setPhone] = useState('+79180000001');
  const [password, setPassword] = useState('Manager2026!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(phone.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (p: string, pwd: string) => {
    setPhone(p);
    setPassword(pwd);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-md">
            <Building2 className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-stone-900">
          ОПОРА CRM
        </h2>
        <p className="mt-1 text-center text-xs text-stone-600">
          Информационная система образовательного центра • ст. Северская
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-stone-200 sm:rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Номер телефона
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (918) 000-00-01"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Вход в систему...' : 'Войти в CRM'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick role presets for instant review */}
          <div className="mt-6 pt-6 border-t border-stone-100">
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> Быстрый вход (Демо-роли)
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('+79180000001', 'Manager2026!')}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-center font-medium"
              >
                Руководитель
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('+79180000002', 'Admin2026!')}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-center font-medium"
              >
                Администратор
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('+79181112233', 'Teacher2026!')}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-center font-medium"
              >
                Педагог
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
