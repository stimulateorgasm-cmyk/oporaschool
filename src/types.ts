/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Teacher {
  id: string;
  name: string;
  photoUrl: string; // SVG identification or image URL
  subjects: string[];
  bio: string;
  education: string;
  experience: string;
  avatarBg: string; // Tailwind bg color for friendly avatar styling
}

export interface Review {
  id: string;
  name: string;
  className: string;
  text: string;
  rating: number;
  approved: boolean;
  date: string;
}

export interface PriceFormat {
  name: string;      // e.g., "Индивидуально", "Группа 2 чел."
  price: string;     // e.g., "1000 ₽", "900 ₽ / зан."
  details?: string;  // e.g., "За 60 минут", "Занятие 90 минут"
  isOnline?: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  grades: ('preschool' | '1-4' | '5-8' | '9-11')[];
  formats: PriceFormat[];
  icon: string;      // Name of lucide-react icon
  details?: string;  // Extra notes, e.g., "Абонемент на 8 занятий: 6000 ₽"
}

export interface LeadApplication {
  id: string;
  name: string;
  phone: string;
  subject: string;
  comment?: string;
  status: 'new' | 'in_progress' | 'completed';
  date: string;
}

export interface BitrixConfig {
  webhookUrl: string;
  isEnabled: boolean;
}
