import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { AttendanceStatus, LessonAttendanceRequest, LessonRead } from '../../types';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonRead | null;
  onSubmit: (data: LessonAttendanceRequest) => Promise<void>;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  lesson,
  onSubmit,
}) => {
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.present);
  const [chargeAbsent, setChargeAbsent] = useState<boolean>(true);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lesson) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        attendance_status: status,
        charge_absent: status === AttendanceStatus.absent ? chargeAbsent : undefined,
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения посещаемости');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Отметка посещаемости"
      subtitle={`${lesson.subject_name} • Ученик: ${lesson.child_name}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-stone-700">
            Статус присутствия
          </label>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setStatus(AttendanceStatus.present)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                status === AttendanceStatus.present
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <CheckCircle2 className={`w-5 h-5 ${status === AttendanceStatus.present ? 'text-emerald-600' : 'text-stone-400'}`} />
              <div>
                <div className="text-xs font-bold">Был на занятии (Присутствовал)</div>
                <div className="text-[11px] text-stone-500">Списать 1 занятие с баланса ученика и начислить ставку педагогу</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatus(AttendanceStatus.absent)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                status === AttendanceStatus.absent
                  ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <AlertCircle className={`w-5 h-5 ${status === AttendanceStatus.absent ? 'text-amber-600' : 'text-stone-400'}`} />
              <div>
                <div className="text-xs font-bold">Не был (Пропуск без уважительной причины)</div>
                <div className="text-[11px] text-stone-500">Ученик не пришел на запланированный урок</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatus(AttendanceStatus.cancelled_by_client)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                status === AttendanceStatus.cancelled_by_client
                  ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-700'
              }`}
            >
              <XCircle className={`w-5 h-5 ${status === AttendanceStatus.cancelled_by_client ? 'text-rose-600' : 'text-stone-400'}`} />
              <div>
                <div className="text-xs font-bold">Отмена клиентом (Заблаговременно)</div>
                <div className="text-[11px] text-stone-500">Баланс не списывается, занятие сохраняется</div>
              </div>
            </button>
          </div>
        </div>

        {status === AttendanceStatus.absent && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-amber-950 font-medium">
              <input
                type="checkbox"
                checked={chargeAbsent}
                onChange={(e) => setChargeAbsent(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              Списать занятие с баланса (неуважительный пропуск)
            </label>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Комментарий к занятию
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Успеваемость, домашнее задание, причина..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Сохранение...' : 'Зафиксировать'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
