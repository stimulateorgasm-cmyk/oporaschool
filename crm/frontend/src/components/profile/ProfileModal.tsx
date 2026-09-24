import React, { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { api, resolveUploadUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Camera } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (user: any) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roleTitle = user?.roles?.map((r) => r.name).join(', ') || '';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      setIsSubmitting(true);
      const payload: any = {};
      if (fullName.trim() !== user?.full_name) payload.full_name = fullName.trim();
      if (phone.trim() !== user?.phone) payload.phone = phone.trim();
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }
      const updated = await api.updateMe(payload);
      onUpdated(updated);
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Профиль сохранён');
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      setIsSubmitting(true);
      const updated = await api.uploadAvatar(file);
      onUpdated(updated);
      setSuccess('Фото обновлено');
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки фото');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avatarUrl = resolveUploadUrl(user?.avatar_url);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Мой профиль" subtitle={roleTitle} maxWidth="md">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">{success}</div>
        )}

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-semibold text-xl border border-stone-300 overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              user?.full_name?.charAt(0) || <UserIcon className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              <Camera className="w-3.5 h-3.5" />
              {avatarUrl ? 'Сменить фото' : 'Загрузить фото'}
            </button>
            <div className="text-[11px] text-stone-400">JPEG или PNG, до 20 МБ</div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Name + phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">ФИО</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Телефон (логин)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Роль</label>
            <div className="px-3 py-2 text-sm text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
              {roleTitle}
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="pt-3 border-t border-stone-100">
          <div className="text-xs font-bold text-stone-700 mb-2">Смена пароля</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Текущий пароль</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Новый пароль (мин. 6)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
          >
            Закрыть
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
