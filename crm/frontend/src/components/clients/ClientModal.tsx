import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ClientStatus, ParentCreate } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ParentCreate) => Promise<void>;
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<ClientStatus>(ClientStatus.active);
  const [children, setChildren] = useState<Array<{ full_name: string; birth_date?: string; comment?: string }>>([
    { full_name: '', birth_date: '', comment: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddChild = () => {
    if (children.length >= 5) return;
    setChildren([...children, { full_name: '', birth_date: '', comment: '' }]);
  };

  const handleRemoveChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleChildChange = (index: number, field: string, value: string) => {
    const updated = [...children];
    (updated[index] as any)[field] = value;
    setChildren(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !phone.trim()) {
      setError('Заполните обязательные поля: ФИО и телефон родителя');
      return;
    }

    const validChildren = children
      .filter((c) => c.full_name.trim().length > 0)
      .map((c) => ({
        full_name: c.full_name.trim(),
        birth_date: c.birth_date || undefined,
        comment: c.comment || undefined,
      }));

    try {
      setIsSubmitting(true);
      await onSubmit({
        full_name: fullName.trim(),
        phone: phone.trim(),
        secondary_phone: secondaryPhone.trim() || undefined,
        address: address.trim() || undefined,
        comment: comment.trim() || undefined,
        status,
        children: validChildren.length > 0 ? validChildren : undefined,
      });
      // Reset form
      setFullName('');
      setPhone('');
      setSecondaryPhone('');
      setAddress('');
      setComment('');
      setChildren([{ full_name: '', birth_date: '', comment: '' }]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Не удалось сохранить клиента');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Новый клиент (родитель)"
      subtitle="Создание карточки семьи и прикрепление детей"
      maxWidth="xl"
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
              placeholder="Иванова Анна Сергеевна"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
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
              placeholder="+7 (918) 000-00-00"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
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
              placeholder="+7 (918) 111-11-11"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Адрес</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ст. Северская, ул. Ленина, д. 10"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">Комментарий</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Особые пожелания или примечания..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>
        </div>

        {/* Children section */}
        <div className="pt-3 border-t border-stone-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Дети (максимум 5)
            </span>
            {children.length < 5 && (
              <button
                type="button"
                onClick={handleAddChild}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить ребенка
              </button>
            )}
          </div>

          <div className="space-y-2">
            {children.map((child, idx) => (
              <div key={idx} className="p-3 bg-stone-50 rounded-lg border border-stone-200 relative">
                {children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveChild(idx)}
                    className="absolute top-2 right-2 p-1 text-stone-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                      ФИО ребенка
                    </label>
                    <input
                      type="text"
                      value={child.full_name}
                      onChange={(e) => handleChildChange(idx, 'full_name', e.target.value)}
                      placeholder="Иванов Максим"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-0.5">
                      Дата рождения
                    </label>
                    <input
                      type="date"
                      value={child.birth_date}
                      onChange={(e) => handleChildChange(idx, 'birth_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={child.comment}
                      onChange={(e) => handleChildChange(idx, 'comment', e.target.value)}
                      placeholder="Класс, особенности, цели обучения..."
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
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
            {isSubmitting ? 'Сохранение...' : 'Создать клиента'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
