import React from 'react';
import {
  AttendanceStatus,
  BalanceTransactionType,
  ChildStatus,
  ClientStatus,
  LessonFormat,
  LessonPaymentStatus,
  LessonStatus,
  PaymentMethod,
  SalaryPaymentStatus,
  TeacherStatus,
  UserStatus,
} from '../../types';

interface StatusBadgeProps {
  status:
    | LessonStatus
    | AttendanceStatus
    | ClientStatus
    | ChildStatus
    | TeacherStatus
    | UserStatus
    | LessonPaymentStatus
    | LessonFormat
    | PaymentMethod
    | BalanceTransactionType
    | SalaryPaymentStatus
    | string;
  type?: 'lesson' | 'attendance' | 'client' | 'teacher' | 'user' | 'payment' | 'format' | 'method' | 'transaction' | 'salary';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let label = status;
  let bgClass = 'bg-stone-100 text-stone-700 border-stone-200';

  // Lesson Status
  if (status === LessonStatus.scheduled) {
    label = 'Запланировано';
    bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (status === LessonStatus.completed) {
    label = 'Проведено';
    bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (status === LessonStatus.absent) {
    label = 'Пропуск';
    bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (status === LessonStatus.cancelled) {
    label = 'Отменено';
    bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (status === LessonStatus.moved) {
    label = 'Перенесено';
    bgClass = 'bg-purple-50 text-purple-700 border-purple-200';
  }

  // Attendance Status
  else if (status === AttendanceStatus.present) {
    label = 'Был на занятии';
    bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (status === AttendanceStatus.absent) {
    label = 'Не был';
    bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (status === AttendanceStatus.cancelled_by_client) {
    label = 'Отмена клиентом';
    bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (status === AttendanceStatus.cancelled_by_center) {
    label = 'Отмена центром';
    bgClass = 'bg-stone-100 text-stone-700 border-stone-200';
  } else if (status === AttendanceStatus.unknown) {
    label = 'Не отмечено';
    bgClass = 'bg-stone-100 text-stone-600 border-stone-200';
  }

  // Entity Statuses
  else if (status === ClientStatus.active || status === ChildStatus.active || status === TeacherStatus.active || status === UserStatus.active) {
    label = 'Активен';
    bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (status === ClientStatus.paused || status === ChildStatus.paused) {
    label = 'Пауза';
    bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (status === TeacherStatus.vacation) {
    label = 'В отпуске';
    bgClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (status === ClientStatus.completed || status === ChildStatus.completed) {
    label = 'Завершен';
    bgClass = 'bg-stone-100 text-stone-700 border-stone-200';
  } else if (status === ClientStatus.archived || status === ChildStatus.archived || status === TeacherStatus.archived || status === UserStatus.archived) {
    label = 'В архиве';
    bgClass = 'bg-stone-100 text-stone-500 border-stone-200';
  } else if (status === UserStatus.blocked) {
    label = 'Заблокирован';
    bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  // Payment Status
  else if (status === LessonPaymentStatus.paid) {
    label = 'Оплачено';
    bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (status === LessonPaymentStatus.covered_by_package) {
    label = 'Из абонемента';
    bgClass = 'bg-teal-50 text-teal-700 border-teal-200';
  } else if (status === LessonPaymentStatus.unpaid) {
    label = 'Не оплачено';
    bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (status === LessonPaymentStatus.partial) {
    label = 'Частично';
    bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  // Lesson Format
  else if (status === LessonFormat.individual) {
    label = 'Индивидуально';
    bgClass = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (status === LessonFormat.group) {
    label = 'Группа';
    bgClass = 'bg-violet-50 text-violet-700 border-violet-200';
  }

  // Payment Method
  else if (status === PaymentMethod.card) {
    label = 'Банковская карта';
  } else if (status === PaymentMethod.cash) {
    label = 'Наличные';
  } else if (status === PaymentMethod.bank_transfer) {
    label = 'СБП / Перевод';
  } else if (status === PaymentMethod.online) {
    label = 'Онлайн';
  } else if (status === PaymentMethod.other) {
    label = 'Другое';
  }

  // Balance Transaction Type
  else if (status === BalanceTransactionType.purchase) {
    label = '+ Покупка абонемента';
    bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
  } else if (status === BalanceTransactionType.consumption) {
    label = '- Списание занятия';
    bgClass = 'bg-stone-100 text-stone-700 border-stone-200';
  } else if (status === BalanceTransactionType.correction_plus) {
    label = '+ Ручная корректировка';
    bgClass = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (status === BalanceTransactionType.correction_minus) {
    label = '- Ручная корректировка';
    bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (status === BalanceTransactionType.refund) {
    label = 'Возврат';
    bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return (
    <span
      id={`status-badge-${String(status)}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap ${bgClass}`}
    >
      {label}
    </span>
  );
};
