import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { UserCreate, UserStatus } from '../../types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserCreate) => Promise<void>;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleCodes, setRoleCodes] = useState<string[]>(['administrator']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (code: string) => {
    if (roleCodes.includes(code)) {
      if (roleCodes.length > 1) {
        setRoleCodes(roleCodes.filter((r) => r !== code));
      }
    } else {
      setRoleCodes([...roleCodes, code]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || password.length < 6) {
      setError('Заполните обязательные поля. Пароль должен быть не менее 6 символов.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password,
        role_codes: roleCodes,
        status: UserStatus.active,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Новый пользователь системы"
      subtitle="Создание учетной записи сотрудника с назначением ролей"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            ФИО сотрудника <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Смирнов Алексей Викторович"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Телефон (Логин) <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (918) 000-00-00"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@opora-center.ru"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Пароль (мин. 6 знаков) <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Роли в системе
          </label>
          <div className="space-y-2">
            {[
              { code: 'manager', label: 'Руководитель (Полный доступ ко всем модулям и финансам)' },
              { code: 'administrator', label: 'Администратор (Клиенты, расписание, платежи, баланс)' },
              { code: 'teacher', label: 'Педагог (Личное расписание, отметка присутствия)' },
            ].map((role) => {
              const isChecked = roleCodes.includes(role.code);
              return (
                <label
                  key={role.code}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleRole(role.code)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>{role.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Создание...' : 'Создать пользователя'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
