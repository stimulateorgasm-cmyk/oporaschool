import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { AttachmentsPanel } from '../common/AttachmentsPanel';
import { ClientStatus, ParentRead, ParentUpdate } from '../../types';

interface ClientEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ParentRead;
  onSubmit: (data: ParentUpdate) => Promise<void>;
}

export const ClientEditModal: React.FC<ClientEditModalProps> = ({ isOpen, onClose, client, onSubmit }) => {
  const [fullName, setFullName] = useState(client.full_name);
  const [phone, setPhone] = useState(client.phone);
  const [secondaryPhone, setSecondaryPhone] = useState(client.secondary_phone || '');
  const [comment, setComment] = useState(client.comment || '');
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(client.full_name);
      setPhone(client.phone);
      setSecondaryPhone(client.secondary_phone || '');
      setComment(client.comment || '');
      setStatus(client.status);
      setError(null);
    }
  }, [isOpen, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Заполните ФИО и телефон родителя');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        full_name: fullName.trim(),
        phone: phone.trim(),
        secondary_phone: secondaryPhone.trim() || undefined,
        comment: comment.trim() || undefined,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать клиента"
      subtitle={client.full_name}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              ФИО родителя <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Основной телефон <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Дополнительный телефон
            </label>
            <input
              type="tel"
              value={secondaryPhone}
              onChange={(e) => setSecondaryPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"
            >
              <option value={ClientStatus.active}>Активный</option>
              <option value={ClientStatus.paused}>На паузе</option>
              <option value={ClientStatus.completed}>Завершенный</option>
              <option value={ClientStatus.archived}>В архиве</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Комментарий</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Особые пожелания или примечания..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white resize-none"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100">
          <AttachmentsPanel ownerType="parent" ownerId={client.id} />
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
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
