import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AttachmentRead } from '../../types';
import { Paperclip, Download, Trash2, FileText } from 'lucide-react';

interface AttachmentsPanelProps {
  ownerType: 'parent' | 'child' | 'teacher';
  ownerId: string;
}

export const AttachmentsPanel: React.FC<AttachmentsPanelProps> = ({ ownerType, ownerId }) => {
  const [attachments, setAttachments] = useState<AttachmentRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const load = async () => {
    try {
      setIsLoading(true);
      const list = await api.getAttachments(ownerType, ownerId);
      setAttachments(list);
    } catch (err) {
      console.error('Failed to load attachments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ownerType, ownerId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      await api.uploadAttachment(ownerType, ownerId, file);
      await load();
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки файла');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить вложение?')) return;
    try {
      await api.deleteAttachment(id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления файла');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
          Вложения
        </span>
        <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 cursor-pointer">
          <Paperclip className="w-3.5 h-3.5" />
          <span>{isUploading ? 'Загрузка...' : 'Прикрепить файл'}</span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {isLoading ? (
        <div className="text-[11px] text-stone-400">Загрузка вложений...</div>
      ) : attachments.length === 0 ? (
        <div className="text-[11px] text-stone-400">Вложений пока нет</div>
      ) : (
        <div className="space-y-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between gap-2 p-2 rounded bg-stone-50 border border-stone-200 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate text-stone-700">{att.filename}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => api.downloadAttachment(att.id, att.filename)}
                  title="Скачать"
                  className="p-1 text-stone-500 hover:text-amber-700 hover:bg-stone-100 rounded"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(att.id)}
                  title="Удалить"
                  className="p-1 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
