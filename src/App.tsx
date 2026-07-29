/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, Calendar, MapPin, Phone, MessageSquare, Clock,
  ChevronLeft, ChevronRight, Star, X, Check, Plus, Edit2, Trash2,
  Settings, Shield, Sliders, Database, BookOpen, Calculator,
  Percent, PenTool, GraduationCap, Bookmark, Award, FlaskConical,
  Baby, Languages, Compass, Globe, Library, Scroll, Box,
  BrainCircuit, Smile, HeartHandshake, Backpack, Send, Sparkles,
  ExternalLink, CheckSquare, PlusCircle, User, FileText, CheckCircle2, ZoomIn, Menu
} from 'lucide-react';
import { LogoSVG, CozyClassroomSVG, TeacherCardSVG, TeacherAvatar } from './components/Illustrations';
import CatalogFilter from './components/CatalogFilter';
import { INITIAL_TEACHERS, INITIAL_REVIEWS, SERVICE_ITEMS } from './data';
import { Teacher, Review, ServiceItem, LeadApplication, BitrixConfig } from './types';

// Password for admin panel
const ADMIN_PASSWORD = 'opora';

// Версия данных -- меняем при изменении структуры teachers/data
const DATA_VERSION = 14;

export default function App() {
  // Авто-миграция: если версия старая -- сбрасываем кэш учителей
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const storedVersion = localStorage.getItem('opora_data_version');
    if (!storedVersion || Number(storedVersion) < DATA_VERSION) {
      // Чистим все старые ключи с учителями
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('opora_teachers')) {
          localStorage.removeItem(key);
        }
      }
      localStorage.setItem('opora_data_version', String(DATA_VERSION));
      return INITIAL_TEACHERS;
    }
    const saved = localStorage.getItem('opora_teachers');
    return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('opora_reviews');
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  const [leads, setLeads] = useState<LeadApplication[]>(() => {
    const saved = localStorage.getItem('opora_leads');
    return saved ? JSON.parse(saved) : [
      {
        id: 'lead-1',
        name: 'Татьяна Юрьевна',
        phone: '+7 (918) 456-12-34',
        subject: 'Подготовка к школе',
        comment: 'Хотим записаться в группу подготовки к школе, дочке 6 лет.',
        status: 'new',
        date: '2026-06-25 14:30'
      },
      {
        id: 'lead-2',
        name: 'Игорь Дмитриевич',
        phone: '+7 (961) 987-65-43',
        subject: 'Математика (ОГЭ по Математике (9 класс))',
        comment: 'Нужен репетитор, чтобы подтянуть геометрию к экзамену.',
        status: 'in_progress',
        date: '2026-06-25 17:15'
      }
    ];
  });

  const [bitrixConfig, setBitrixConfig] = useState<BitrixConfig>(() => {
    const saved = localStorage.getItem('opora_bitrix');
    return saved ? JSON.parse(saved) : { webhookUrl: '', isEnabled: false };
  });

  // Save states to localStorage on change
  useEffect(() => {
    localStorage.setItem('opora_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('opora_reviews', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('opora_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('opora_bitrix', JSON.stringify(bitrixConfig));
  }, [bitrixConfig]);

  // --- UI States ---

  // trial button subject picker
  const [showTrialSubjects, setShowTrialSubjects] = useState(false);

  // Закрытие дропдауна выбора предмета по клику вне
  useEffect(() => {
    if (!showTrialSubjects) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#trial_button') && !target.closest('#trial_subjects_dropdown')) {
        setShowTrialSubjects(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTrialSubjects]);

  // Ленивая загрузка Яндекс.Карты -- iframe грузится только когда секция видна
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setMapVisible(true); obs.disconnect(); } },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // active teacher popup
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);

  // unified helper: сколько карточек/колонок видно в одном экране
  const cardsPerView = () => isMobile() ? 1 : 3;

  // teacher slider -- перемешиваем всех кроме Надежды (t7), она всегда первая
  const [shuffledTeachers] = useState<Teacher[]>(() => {
    const shumkina = teachers.find(t => t.id === 't7');
    const others = teachers.filter(t => t.id !== 't7');
    // Fisher-Yates shuffle
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    return shumkina ? [shumkina, ...others] : teachers;
  });

  const teacherSliderRef = useRef<HTMLDivElement>(null);

  const [teacherScrollIdx, setTeacherScrollIdx] = useState<number>(0);
  const [teacherCanScrollLeft, setTeacherCanScrollLeft] = useState(false);
  const [teacherCanScrollRight, setTeacherCanScrollRight] = useState(true);
  
  // interior gallery lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [bigPhotoUrl, setBigPhotoUrl] = useState<string | null>(null);
  // review screenshots lightbox (листается как интерьеры)
  const [reviewLightboxIndex, setReviewLightboxIndex] = useState<number | null>(null);
  // process photos — герой: стопка + лайтбокс
  const [heroPhotoIdx, setHeroPhotoIdx] = useState<number>(0);
  const [processLightboxIndex, setProcessLightboxIndex] = useState<number | null>(null);
  const [interiorScrollIdx, setInteriorScrollIdx] = useState<number>(0);
  const interiorSliderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Мобильное меню
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // lazy load яндекс-карты
  const [mapVisible, setMapVisible] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // refs для клавиатурной навигации (чтобы не было проблем с замыканием)
  const lightboxIndexRef = useRef<number | null>(null);
  lightboxIndexRef.current = lightboxIndex;
  const reviewLightboxRef = useRef<number | null>(null);
  reviewLightboxRef.current = reviewLightboxIndex;
  const processLightboxRef = useRef<number | null>(null);
  processLightboxRef.current = processLightboxIndex;
  const activeTeacherRef = useRef<Teacher | null>(null);
  activeTeacherRef.current = activeTeacher;

  // interior photos list (entrance -- фасад здания, всегда первое)
  const INTERIOR_PHOTOS = ['entrance', 'IMG_5203', 'IMG_5205', 'IMG_5207', 'IMG_5208', 'IMG_5209', 'IMG_5210', 'IMG_5211', 'IMG_5225', 'IMG_5226', 'IMG_5227', 'IMG_5229'];

  // process photos (учебный процесс — фото с занятий)
  const PROCESS_PHOTOS = Array.from({length: 7}, (_, i) => i + 1); // process-1.jpg … process-7.jpg

  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 640;

  const scrollTeachersBy = (dir: 'left' | 'right') => {
    const el = teacherSliderRef.current;
    if (!el) return;
    const card = el.querySelector('.teacher-slide-card') as HTMLElement;
    if (!card) return;
    const cardWidth = card.offsetWidth + 24;
    const step = cardsPerView();
    const scrollAmount = cardWidth * step * (dir === 'left' ? -1 : 1);
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const scrollInteriorBy = (dir: 'left' | 'right') => {
    const el = interiorSliderRef.current;
    if (!el) return;
    const card = el.querySelector('.interior-slide-card') as HTMLElement;
    if (!card) return;
    const cardWidth = card.offsetWidth + 16;
    const scrollAmount = cardWidth * cardsPerView() * (dir === 'left' ? -1 : 1);
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Блокировка скролла фона при открытом попапе или лайтбоксе
  // Стрелки клавиатуры листают фото в лайтбоксе или переключают педагогов
  const isOverlayOpen = activeTeacher !== null || lightboxIndex !== null || bigPhotoUrl !== null || reviewLightboxIndex !== null || processLightboxIndex !== null;
  useEffect(() => {
    if (!isOverlayOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeys = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].includes(e.key)) {
        e.preventDefault();
        // Навигация в лайтбоксе интерьеров
        const idx = lightboxIndexRef.current;
        if (idx !== null) {
          if (e.key === 'ArrowLeft' && idx > 0) {
            setLightboxIndex(idx - 1);
          } else if (e.key === 'ArrowRight' && idx < INTERIOR_PHOTOS.length - 1) {
            setLightboxIndex(idx + 1);
          }
          return;
        }
        // Навигация в лайтбоксе скриншотов отзывов
        const ri = reviewLightboxRef.current;
        if (ri !== null) {
          if (e.key === 'ArrowLeft' && ri > 0) {
            setReviewLightboxIndex(ri - 1);
          } else if (e.key === 'ArrowRight' && ri < approvedReviews.length - 1) {
            setReviewLightboxIndex(ri + 1);
          }
          return;
        }
        // Навигация в лайтбоксе фото процесса
        const pi = processLightboxRef.current;
        if (pi !== null) {
          if (e.key === 'ArrowLeft' && pi > 0) {
            setProcessLightboxIndex(pi - 1);
          } else if (e.key === 'ArrowRight' && pi < PROCESS_PHOTOS.length - 1) {
            setProcessLightboxIndex(pi + 1);
          }
          return;
        }
        // Навигация между преподавателями в открытом попапе
        const t = activeTeacherRef.current;
        if (t) {
          const idx = shuffledTeachers.findIndex(s => s.id === t.id);
          if (e.key === 'ArrowLeft' && idx > 0) {
            setActiveTeacher(shuffledTeachers[idx - 1]);
          } else if (e.key === 'ArrowRight' && idx < shuffledTeachers.length - 1) {
            setActiveTeacher(shuffledTeachers[idx + 1]);
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeys, { capture: true });
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeys, { capture: true });
    };
  }, [isOverlayOpen]);

  // review creation modal
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [newReview, setNewReview] = useState({ name: '', className: '', text: '', rating: 5 });

  // lead booking modal
  const [showLeadModal, setShowLeadModal] = useState<boolean>(false);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', subject: '', comment: '' });
  const [phoneError, setPhoneError] = useState<string>('');
  const [isSubmittingLead, setIsSubmittingLead] = useState<boolean>(false);
  const [leadSuccess, setLeadSuccess] = useState<boolean>(false);

  // admin panel states
  const [showAdmin, setShowAdmin] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminError, setAdminError] = useState<string>('');
  const [adminTab, setAdminTab] = useState<'leads' | 'teachers' | 'reviews' | 'settings'>('leads');

  // teacher crud states
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isCreatingTeacher, setIsCreatingTeacher] = useState<boolean>(false);
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({
    name: '', subjects: [], bio: '', education: '', experience: '', photoUrl: '', avatarBg: 'bg-emerald-100 text-emerald-800'
  });

  // review slider (horizontal scroll)
  const reviewSliderRef = useRef<HTMLDivElement>(null);
  const [reviewScrollIdx, setReviewScrollIdx] = useState<number>(0);

  // Стрелки клавиатуры для слайдера отзывов — глобальный обработчик,
  // работает когда секция видна в окне и нет открытых оверлеев
  useEffect(() => {
    const handleReviewKeys = (e: KeyboardEvent) => {
      if (isOverlayOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const slider = reviewSliderRef.current;
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      e.preventDefault();
      const card = slider.querySelector('.review-slide-card') as HTMLElement;
      if (!card) return;
      const cardW = card.offsetWidth + 16;
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      slider.scrollBy({ left: cardW * dir, behavior: 'smooth' });
    };
    document.addEventListener('keydown', handleReviewKeys, { capture: true });
    return () => document.removeEventListener('keydown', handleReviewKeys, { capture: true });
  }, [isOverlayOpen]);

  // --- Helpers & Logic ---
  const handlePhoneChange = (value: string) => {
    // Basic Russian phone mask implementation
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('7') || cleaned.startsWith('8')) {
      cleaned = cleaned.substring(1);
    }
    cleaned = cleaned.substring(0, 10);
    
    let formatted = '+7 ';
    if (cleaned.length > 0) {
      formatted += '(' + cleaned.substring(0, 3);
    }
    if (cleaned.length >= 3) {
      formatted += ') ' + cleaned.substring(3, 6);
    } else {
      formatted += cleaned.substring(3);
    }
    if (cleaned.length >= 6) {
      formatted += '-' + cleaned.substring(6, 8);
    }
    if (cleaned.length >= 8) {
      formatted += '-' + cleaned.substring(8, 10);
    }
    
    setLeadForm(prev => ({ ...prev, phone: formatted }));
    if (cleaned.length === 10) {
      setPhoneError('');
    } else {
      setPhoneError('Введите корректный номер (10 цифр)');
    }
  };

  const handleBookNow = (subject: string, commentPrefix = '') => {
    setLeadForm({
      name: '',
      phone: '',
      subject: subject,
      comment: commentPrefix
    });
    setPhoneError('');
    setLeadSuccess(false);
    setShowLeadModal(true);
    setActiveTeacher(null); // close teacher popup if open
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = leadForm.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      setPhoneError('Пожалуйста, введите полный номер телефона');
      return;
    }

    setIsSubmittingLead(true);

    const newLead: LeadApplication = {
      id: 'lead-' + Date.now(),
      name: leadForm.name,
      phone: leadForm.phone,
      subject: leadForm.subject,
      comment: leadForm.comment,
      status: 'new',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    // Update local state
    setLeads(prev => [newLead, ...prev]);

    // Отправка в Telegram-бота (всегда, независимо от Bitrix)
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadForm.name,
          phone: leadForm.phone,
          subject: leadForm.subject,
          comment: leadForm.comment
        })
      });
    } catch (err) {
      console.error('Ошибка отправки в Telegram:', err);
    }

    // Dispatch to Bitrix24 if enabled and filled
    if (bitrixConfig.isEnabled && bitrixConfig.webhookUrl) {
      try {
        // Construct the Bitrix24 REST JSON fields payload
        const payload = {
          fields: {
            TITLE: `Заявка с сайта ОПОРА: ${leadForm.subject}`,
            NAME: leadForm.name,
            PHONE: [ { VALUE: leadForm.phone, VALUE_TYPE: 'WORK' } ],
            COMMENTS: `Предмет: ${leadForm.subject}\nКомментарий: ${leadForm.comment || 'нет'}`,
            STATUS_ID: 'NEW',
            SOURCE_ID: 'WEB'
          }
        };

        const response = await fetch(bitrixConfig.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          console.error('Ошибка отправки в Битрикс24:', response.statusText);
        }
      } catch (err) {
        console.error('Сбой сети при отправке в Битрикс24:', err);
      }
    }

    // Simulate database delay
    setTimeout(() => {
      setIsSubmittingLead(false);
      setLeadSuccess(true);
      // Reset form
      setLeadForm({ name: '', phone: '', subject: '', comment: '' });
    }, 800);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.name || !newReview.text) return;

    const review: Review = {
      id: 'review-' + Date.now(),
      name: newReview.name,
      className: newReview.className || 'Общий отзыв',
      text: newReview.text,
      rating: newReview.rating,
      approved: false, // Must be approved by administrator in admin panel
      date: new Date().toISOString().substring(0, 10)
    };

    setReviews(prev => [...prev, review]);
    setShowReviewModal(false);
    setNewReview({ name: '', className: '', text: '', rating: 5 });

    // Отправка в Telegram-бота
    try {
      await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newReview.name,
          className: newReview.className || 'Общий отзыв',
          text: newReview.text
        })
      });
    } catch (err) {
      console.error('Ошибка отправки в Telegram:', err);
    }

    alert('Спасибо за ваш теплый отзыв! Он появится на сайте после модерации администратором в целях безопасности.');
  };

  // --- Admin Login ---
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setAdminError('');
    } else {
      setAdminError('Неверный пароль. Попробуйте "opora"');
    }
  };

  // --- Teacher CRUD Actions ---
  const saveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.subjects?.length) {
      alert('Пожалуйста, заполните ФИО и хотя бы один предмет');
      return;
    }

    if (editingTeacher) {
      setTeachers(prev => prev.map(t => t.id === editingTeacher.id ? { ...t, ...teacherForm } as Teacher : t));
      setEditingTeacher(null);
    } else {
      const newT: Teacher = {
        id: 't-' + Date.now(),
        name: teacherForm.name || '',
        photoUrl: teacherForm.photoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop', // Default visual avatar type or high quality teacher photo
        subjects: teacherForm.subjects || [],
        bio: teacherForm.bio || '',
        education: teacherForm.education || '',
        experience: teacherForm.experience || '',
        avatarBg: teacherForm.avatarBg || 'bg-teal-100 text-teal-800'
      };
      setTeachers(prev => [...prev, newT]);
      setIsCreatingTeacher(false);
    }

    // Reset Form
    setTeacherForm({ name: '', subjects: [], bio: '', education: '', experience: '', photoUrl: '', avatarBg: 'bg-teal-100 text-teal-800' });
  };

  const deleteTeacher = (id: string) => {
    if (window.confirm('Вы действительно хотите удалить информацию об этом педагоге?')) {
      setTeachers(prev => prev.filter(t => t.id !== id));
    }
  };

  const editTeacherClick = (t: Teacher) => {
    setEditingTeacher(t);
    setTeacherForm(t);
    setIsCreatingTeacher(false);
  };

  // --- Lead Status Change ---
  const updateLeadStatus = (id: string, status: 'new' | 'in_progress' | 'completed') => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const deleteLead = (id: string) => {
    if (window.confirm('Удалить эту заявку?')) {
      setLeads(prev => prev.filter(l => l.id !== id));
    }
  };

  // --- Reviews Moderation ---
  const approveReview = (id: string) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, approved: true } : r));
  };

  const deleteReview = (id: string) => {
    if (window.confirm('Удалить этот отзыв?')) {
      setReviews(prev => prev.filter(r => r.id !== id));
    }
  };

  // --- Test Bitrix Connection ---
  const testBitrix = async () => {
    if (!bitrixConfig.webhookUrl) {
      alert('Введите вебхук URL для тестирования!');
      return;
    }
    try {
      const payload = {
        fields: {
          TITLE: "Тестовая заявка (Проверка ОПОРА)",
          NAME: "Администратор Тест",
          PHONE: [ { VALUE: "+7 (999) 999-99-99", VALUE_TYPE: "WORK" } ],
          COMMENTS: "Это проверочное сообщение интеграции Битрикс24"
        }
      };
      alert('Отправка проверочного лида... Пожалуйста, подождите.');
      const res = await fetch(bitrixConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Успешно! Проверьте ваш кабинет Битрикс24 — в разделе лидов должен появиться новый лид "Тестовая заявка".');
      } else {
        alert('Ошибка при отправке! Код ответа: ' + res.status + '. Проверьте корректность URL вебхука.');
      }
    } catch (e) {
      alert('Ошибка соединения! Проверьте CORS, интернет-подключение или правильность адреса: ' + e);
    }
  };

  // Approved reviews for user carousel
  const approvedReviews = reviews.filter(r => r.approved);

  return (
    <div className="min-h-screen flex flex-col selection:bg-brand-gold selection:text-brand-brown-dark" id="app_root">
      
      {/* 1. HEADER / NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white border-b border-brand-mint-pale shadow-lamp transition-all duration-300" id="header_nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-3 group flex-shrink-0">
            <img
              src="/assets/logos/logo-long.jpg"
              alt="Образовательный центр Опора"
              width="176"
              height="40"
              className="h-10 w-auto transition-transform duration-500 group-hover:scale-105"
            />
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-brand-brown-dark/90">
            <a href="#services" className="hover:text-brand-teal transition-colors">Услуги и цены</a>
            <a href="#promos" className="hover:text-brand-amber transition-colors">Акции</a>
            <a href="#teachers" className="hover:text-brand-teal transition-colors">Педагоги</a>
            <a href="#interior" className="hover:text-brand-teal transition-colors">Пространство</a>
            <a href="#founder" className="hover:text-brand-teal transition-colors">Основатель</a>
            <a href="#reviews" className="hover:text-brand-teal transition-colors">Отзывы</a>
            <a href="#contacts" className="hover:text-brand-teal transition-colors">Контакты</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <a
              href="#booking_section"
              className="bg-brand-teal hover:bg-brand-sage text-brand-cream font-bold py-2.5 px-5 rounded-xl shadow-lamp hover:shadow-md transition-all text-sm"
              id="header_order_btn"
            >
              Записаться
            </a>

            {/* Бургер-меню — мобилки */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-brand-teal hover:text-brand-sage transition-colors"
              aria-label="Меню"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-30 md:hidden bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <nav className="bg-white mx-4 mt-2 rounded-2xl shadow-xl border border-brand-sage/20 p-4 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-brand-mint-pale text-brand-brown-dark font-semibold text-sm transition-colors">Услуги и цены</a>
            <a href="#promos" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-brand-mint-pale text-brand-amber font-semibold text-sm transition-colors">Акции</a>
            <a href="#teachers" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-brand-mint-pale text-brand-brown-dark font-semibold text-sm transition-colors">Педагоги</a>
            <a href="#interior" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-brand-mint-pale text-brand-brown-dark font-semibold text-sm transition-colors">Пространство</a>
            <a href="#founder" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-brand-mint-pale text-brand-brown-dark font-semibold text-sm transition-colors">Основатель</a>
            <a href="#reviews" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-brand-mint-pale text-brand-brown-dark font-semibold text-sm transition-colors">Отзывы</a>
            <a href="#contacts" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-brand-mint-pale text-brand-brown-dark font-semibold text-sm transition-colors">Контакты</a>
            <a href="#booking_section" onClick={() => setMobileMenuOpen(false)} className="mt-1 px-4 py-3 rounded-xl bg-brand-teal text-brand-cream font-bold text-sm text-center transition-colors hover:bg-brand-sage">Записаться</a>
          </nav>
        </div>
      )}

      {/* ADMIN PANEL OVERLAY/PANEL */}
      {showAdmin && (
        <div className="bg-brand-mint-pale border-b-2 border-brand-teal/20 p-4 sm:p-6 shadow-lamp-inset relative transition-all duration-300" id="admin_workspace">
          <button 
            onClick={() => setShowAdmin(false)}
            className="absolute top-4 right-4 p-3 text-brand-brown-dark/60 hover:text-brand-brown-dark hover:bg-brand-cream rounded-full"
            id="close_admin_btn"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-brand-amber" />
              <h2 className="font-display font-bold text-xl text-brand-brown-dark">Панель управления образовательным центром</h2>
              <span className="bg-brand-amber/20 text-brand-amber px-2.5 py-0.5 rounded-full text-xs font-bold">Admin Mode</span>
            </div>

            {!isAdminAuthenticated ? (
              /* Password Login form */
              <form onSubmit={handleAdminLogin} className="max-w-md bg-brand-cream p-6 rounded-2xl border border-brand-sage/20 shadow-lamp" id="admin_login_form">
                <p className="text-sm text-brand-brown-light mb-4">
                  Введите пароль администратора для управления педагогами, отзывами родителей и просмотра входящих заявок.
                </p>
                <div className="flex flex-col gap-1 mb-3">
                  <label className="text-xs font-bold text-brand-brown-dark">Пароль</label>
                  <input 
                    type="password" 
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="p-2.5 rounded-xl border border-brand-sage/30 bg-brand-cream text-brand-brown-dark focus:outline-none focus:border-brand-teal"
                    placeholder="Пароль администратора"
                    required
                  />
                  {adminError && <span className="text-xs text-red-600 mt-1">{adminError}</span>}
                </div>
                <button type="submit" className="w-full bg-brand-teal hover:bg-brand-sage text-brand-cream font-bold py-2.5 rounded-xl transition-all">
                  Войти в панель
                </button>
                <p className="text-[10px] text-center text-brand-brown-light/60 mt-2">Кодовый пароль разработчика: <strong className="font-mono">opora</strong></p>
              </form>
            ) : (
              /* Authenticated Admin Area */
              <div className="bg-brand-cream rounded-2xl border border-brand-sage/20 shadow-lamp overflow-hidden" id="admin_authorized_panel">
                
                {/* Admin Tabs */}
                <div className="flex flex-wrap border-b border-brand-sage/10 bg-brand-mint-pale/50 p-2 gap-1">
                  <button 
                    onClick={() => setAdminTab('leads')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all ${adminTab === 'leads' ? 'bg-brand-teal text-brand-cream' : 'text-brand-brown-dark/70 hover:bg-brand-mint-light'}`}
                  >
                    <FileText className="w-4 h-4" />
                    Заявки ({leads.length})
                  </button>
                  <button 
                    onClick={() => setAdminTab('teachers')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all ${adminTab === 'teachers' ? 'bg-brand-teal text-brand-cream' : 'text-brand-brown-dark/70 hover:bg-brand-mint-light'}`}
                  >
                    <User className="w-4 h-4" />
                    Преподаватели ({teachers.length})
                  </button>
                  <button 
                    onClick={() => setAdminTab('reviews')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all ${adminTab === 'reviews' ? 'bg-brand-teal text-brand-cream' : 'text-brand-brown-dark/70 hover:bg-brand-mint-light'}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Отзывы ({reviews.length})
                  </button>
                  <button 
                    onClick={() => setAdminTab('settings')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg font-bold text-xs sm:text-sm transition-all ${adminTab === 'settings' ? 'bg-brand-teal text-brand-cream' : 'text-brand-brown-dark/70 hover:bg-brand-mint-light'}`}
                  >
                    <Settings className="w-4 h-4" />
                    Битрикс24 CRM
                  </button>
                </div>

                <div className="p-4 sm:p-6 min-h-[300px]" id="admin_tab_content">
                  
                  {/* TAB 1: LEADS APPLICATION LIST */}
                  {adminTab === 'leads' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h3 className="font-display font-bold text-lg text-brand-brown-dark">Входящие заявки на обучение</h3>
                        <span className="text-xs text-brand-brown-light font-semibold">Всего в базе: {leads.length}</span>
                      </div>
                      
                      {leads.length === 0 ? (
                        <div className="text-center py-12 text-brand-brown-light">Заявок пока нет. Заполните форму заказа на сайте!</div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-brand-sage/10">
                          <table className="w-full text-left border-collapse bg-brand-cream">
                            <thead>
                              <tr className="bg-brand-mint-pale/30 border-b border-brand-sage/10 text-xs font-bold text-brand-sage uppercase">
                                <th className="p-3">Дата / Имя</th>
                                <th className="p-3">Телефон</th>
                                <th className="p-3">Выбранный курс</th>
                                <th className="p-3">Комментарий родителя</th>
                                <th className="p-3">Статус лида</th>
                                <th className="p-3">Действия</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-sage/5 text-sm">
                              {leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-brand-mint-light/20 transition-colors">
                                  <td className="p-3 font-semibold">
                                    <div className="text-xs text-brand-brown-light">{lead.date}</div>
                                    <div className="text-brand-brown-dark">{lead.name}</div>
                                  </td>
                                  <td className="p-3 font-mono text-brand-teal">{lead.phone}</td>
                                  <td className="p-3 font-medium text-brand-brown-dark">{lead.subject}</td>
                                  <td className="p-3 text-xs max-w-xs text-brand-brown-light italic">{lead.comment || '--'}</td>
                                  <td className="p-3">
                                    <select 
                                      value={lead.status}
                                      onChange={(e) => updateLeadStatus(lead.id, e.target.value as any)}
                                      className={`p-1.5 rounded-lg text-xs font-bold focus:outline-none ${
                                        lead.status === 'new' ? 'bg-amber-100 text-amber-800' :
                                        lead.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                        'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      <option value="new">Новый</option>
                                      <option value="in_progress">В работе</option>
                                      <option value="completed">Завершён</option>
                                    </select>
                                  </td>
                                  <td className="p-3">
                                    <button 
                                      onClick={() => deleteLead(lead.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Удалить заявку"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: TEACHERS CRUD */}
                  {adminTab === 'teachers' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h3 className="font-display font-bold text-lg text-brand-brown-dark">Редактирование базы педагогов</h3>
                        <button 
                          onClick={() => {
                            setIsCreatingTeacher(true);
                            setEditingTeacher(null);
                            setTeacherForm({ name: '', subjects: [], bio: '', education: '', experience: '', avatarBg: 'bg-teal-100 text-teal-800' });
                          }}
                          className="flex items-center gap-1 bg-brand-teal hover:bg-brand-sage text-brand-cream font-bold py-1.5 px-3 rounded-lg text-xs transition-all"
                        >
                          <Plus className="w-4 h-4" /> Добавить преподавателя
                        </button>
                      </div>

                      {/* Create/Edit Form */}
                      {(isCreatingTeacher || editingTeacher) && (
                        <form onSubmit={saveTeacher} className="bg-brand-mint-pale/30 p-4 sm:p-6 rounded-2xl border border-brand-sage/10 space-y-4">
                          <h4 className="font-display font-bold text-brand-brown-dark">
                            {editingTeacher ? `Редактирование профиля: ${editingTeacher.name}` : 'Добавление нового педагога'}
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold">ФИО преподавателя</label>
                              <input 
                                type="text"
                                value={teacherForm.name || ''}
                                onChange={(e) => setTeacherForm(prev => ({ ...prev, name: e.target.value }))}
                                className="p-2 rounded-lg bg-brand-cream border border-brand-sage/20 focus:outline-none"
                                required
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold">Предметы (через запятую)</label>
                              <input 
                                type="text"
                                value={teacherForm.subjects?.join(', ') || ''}
                                onChange={(e) => setTeacherForm(prev => ({ ...prev, subjects: e.target.value.split(',').map(s => s.trim()) }))}
                                className="p-2 rounded-lg bg-brand-cream border border-brand-sage/20 focus:outline-none"
                                placeholder="Например: Русский язык, Литература"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold">Краткая биография / Философия преподавания</label>
                            <textarea 
                              value={teacherForm.bio || ''}
                              onChange={(e) => setTeacherForm(prev => ({ ...prev, bio: e.target.value }))}
                              className="p-2 rounded-lg bg-brand-cream border border-brand-sage/20 focus:outline-none h-20"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold">Образование</label>
                              <input 
                                type="text"
                                value={teacherForm.education || ''}
                                onChange={(e) => setTeacherForm(prev => ({ ...prev, education: e.target.value }))}
                                className="p-2 rounded-lg bg-brand-cream border border-brand-sage/20 focus:outline-none"
                                placeholder="ВУЗ, специальность"
                                required
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold">Опыт работы</label>
                              <input 
                                type="text"
                                value={teacherForm.experience || ''}
                                onChange={(e) => setTeacherForm(prev => ({ ...prev, experience: e.target.value }))}
                                className="p-2 rounded-lg bg-brand-cream border border-brand-sage/20 focus:outline-none"
                                placeholder="Например: 12 лет"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold">Ссылка на фотографию (URL)</label>
                            <input 
                              type="text"
                              value={teacherForm.photoUrl || ''}
                              onChange={(e) => setTeacherForm(prev => ({ ...prev, photoUrl: e.target.value }))}
                              className="p-2 rounded-lg bg-brand-cream border border-brand-sage/20 focus:outline-none"
                              placeholder="Вставьте ссылку на реальную фотографию преподавателя"
                            />
                            <p className="text-[10px] text-brand-brown-dark/50">
                              Оставьте пустым для использования фотографии по умолчанию, или укажите ссылку на реальное фото.
                            </p>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button 
                              type="button"
                              onClick={() => {
                                setIsCreatingTeacher(false);
                                setEditingTeacher(null);
                              }}
                              className="px-4 py-2 border border-brand-sage/30 hover:bg-brand-cream rounded-lg text-xs font-bold"
                            >
                              Отмена
                            </button>
                            <button 
                              type="submit"
                              className="px-4 py-2 bg-brand-teal text-brand-cream rounded-lg text-xs font-bold"
                            >
                              Сохранить
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Teachers list table */}
                      <div className="overflow-x-auto rounded-xl border border-brand-sage/10">
                        <table className="w-full text-left border-collapse bg-brand-cream">
                          <thead>
                            <tr className="bg-brand-mint-pale/30 border-b border-brand-sage/10 text-xs font-bold text-brand-sage">
                              <th className="p-3">Педагог</th>
                              <th className="p-3">Предметы</th>
                              <th className="p-3">Опыт / Образование</th>
                              <th className="p-3">Действия</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-sage/5 text-sm">
                            {teachers.map((t) => (
                              <tr key={t.id} className="hover:bg-brand-mint-light/10">
                                <td className="p-3 flex items-center gap-3">
                                  <TeacherAvatar teacher={t} className="w-10 h-10 flex-shrink-0" />
                                  <div className="font-bold text-brand-brown-dark">{t.name}</div>
                                </td>
                                <td className="p-3 text-xs">
                                  <div className="flex flex-wrap gap-1">
                                    {t.subjects.map((sub, i) => (
                                      <span key={i} className="bg-brand-mint-pale text-brand-teal px-1.5 py-0.5 rounded text-[10px] font-bold">{sub}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3 text-xs">
                                  <div className="font-semibold text-brand-brown-light">{t.experience}</div>
                                  <div className="text-brand-brown-light/70 truncate max-w-xs">{t.education}</div>
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => editTeacherClick(t)}
                                      className="p-1.5 text-brand-teal hover:bg-brand-mint-light/40 rounded-lg transition-colors"
                                      title="Редактировать"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => deleteTeacher(t.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Удалить"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: REVIEWS APPROVAL */}
                  {adminTab === 'reviews' && (
                    <div className="space-y-4">
                      <h3 className="font-display font-bold text-lg text-brand-brown-dark">Модерация отзывов родителей</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reviews.map((rev) => (
                          <div key={rev.id} className={`p-4 rounded-2xl border ${rev.approved ? 'bg-brand-cream border-brand-sage/20' : 'bg-amber-50/50 border-brand-amber/30'} flex flex-col justify-between space-y-3`}>
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-bold text-brand-brown-dark">{rev.name}</span>
                                  <span className="text-xs text-brand-brown-light block">{rev.className} • {rev.date}</span>
                                </div>
                                <div className="flex items-center gap-0.5 text-brand-gold">
                                  {Array.from({ length: rev.rating }).map((_, i) => (
                                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                  ))}
                                </div>
                              </div>
                              {rev.screenshotUrl ? (
                                <img src={rev.screenshotUrl} alt={rev.name} className="w-full h-20 object-cover rounded-lg border border-brand-sage/10 mt-1" />
                              ) : (
                                <p className="text-xs text-brand-brown-light italic mt-2">"{rev.text}"</p>
                              )}
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-brand-sage/5">
                              <div>
                                {rev.approved ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" /> Одобрен
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-brand-amber font-bold bg-brand-amber/20 px-2 py-0.5 rounded-full">
                                    На модерации
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1.5">
                                {!rev.approved && (
                                  <button 
                                    onClick={() => approveReview(rev.id)}
                                    className="text-xs bg-emerald-700 hover:bg-emerald-800 text-brand-cream font-bold px-2.5 py-1 rounded-lg transition-all"
                                  >
                                    Одобрить на сайт
                                  </button>
                                )}
                                <button 
                                  onClick={() => deleteReview(rev.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: BITRIX24 CONFIG */}
                  {adminTab === 'settings' && (
                    <div className="max-w-2xl space-y-6">
                      <div className="space-y-2">
                        <h3 className="font-display font-bold text-lg text-brand-brown-dark">Настройка интеграции Битрикс24 CRM</h3>
                        <p className="text-sm text-brand-brown-light leading-relaxed">
                          Для того чтобы все заявки с сайта автоматически улетали в CRM-систему Битрикс24, создайте входящий вебхук в Битрикс24 (вебхук на создание Лида / <code className="font-mono text-xs bg-brand-mint-pale p-1">crm.lead.add</code>).
                        </p>
                      </div>

                      <div className="bg-brand-mint-pale/30 p-4 rounded-xl border border-brand-sage/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-sm text-brand-brown-dark">Включить интеграцию CRM</label>
                          <input 
                            type="checkbox" 
                            checked={bitrixConfig.isEnabled}
                            onChange={(e) => setBitrixConfig(prev => ({ ...prev, isEnabled: e.target.checked }))}
                            className="w-5 h-5 accent-brand-teal"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-brand-brown-dark">Адрес REST-вебхука Битрикс24</label>
                          <input 
                            type="url"
                            value={bitrixConfig.webhookUrl}
                            onChange={(e) => setBitrixConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                            placeholder="https://company.bitrix24.ru/rest/1/abcde12345/crm.lead.add.json"
                            className="p-2.5 rounded-lg border border-brand-sage/20 bg-brand-cream text-sm text-brand-brown-dark w-full focus:outline-none focus:border-brand-teal"
                          />
                          <p className="text-[10px] text-brand-brown-light/70">
                            Секретный вебхук URL содержит в конце <code className="font-mono bg-brand-cream p-0.5">crm.lead.add.json</code>
                          </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button 
                            type="button"
                            onClick={testBitrix}
                            className="bg-brand-amber hover:bg-brand-amber/90 text-brand-cream font-bold px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" /> Проверить подключение
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <main>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream to-brand-mint-pale/60 pt-10 pb-16 md:py-24" id="hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column Text details */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left relative z-10">
              
              {/* Address indicator */}
              <a href="#contacts" className="inline-flex items-center gap-2 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal font-bold px-4 py-1.5 rounded-full text-xs sm:text-sm animate-pulse hover:bg-brand-teal/20 hover:border-brand-teal/30 transition-colors cursor-pointer">
                <MapPin className="w-4 h-4 text-brand-amber" />
                <span>📍 Станица Северская, ул. Ленина, 73</span>
              </a>

              {/* Slogan */}
              <div className="text-brand-amber font-display font-bold text-base sm:text-lg tracking-wider uppercase">
                🌸 По поводу учёбы будьте спокойны!
              </div>

              {/* Title */}
              <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl text-brand-teal leading-[1.05] select-none">
                Опора
              </h1>
              <p className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-brand-amber leading-tight">
                образовательный центр<br className="sm:hidden" /> в станице Северской
              </p>

              {/* Subtitle */}
              <p className="text-brand-sage text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0 italic">
                Профессиональные репетиторы, аккуратная подготовка к школьным экзаменам ОГЭ/ЕГЭ, увлекательная продлёнка, творческие курсы 3D-моделирования и нейропсихологическая помощь детям в станице Северской. Развитие без стресса!
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a 
                  href="#services" 
                  className="w-full sm:w-auto text-center bg-brand-amber hover:bg-brand-amber/95 text-brand-cream font-bold py-4 px-8 rounded-3xl shadow-lg shadow-brand-amber/30 transition-all duration-300 transform hover:-translate-y-0.5 text-base"
                >
                  Подобрать занятия
                </a>
                <div className="relative w-full sm:w-auto">
                  <button
                    onClick={() => setShowTrialSubjects(!showTrialSubjects)}
                    className="w-full text-center bg-transparent hover:bg-brand-teal/10 text-brand-teal font-bold py-4 px-8 rounded-3xl border-2 border-brand-teal transition-all duration-300 text-base"
                    id="trial_button"
                  >
                    Записаться на пробное
                  </button>
                  {showTrialSubjects && (
                    <div id="trial_subjects_dropdown" className="absolute top-full mt-2 left-0 right-0 sm:w-72 bg-white rounded-2xl shadow-xl border border-brand-sage/20 p-3 z-30 grid gap-1">
                      <p className="text-xs text-brand-brown-light font-medium px-2 pb-1">Выберите предмет:</p>
                      {[
                        { id: 'math', label: 'Математика' },
                        { id: 'russian', label: 'Русский язык' },
                        { id: 'english', label: 'Английский язык' },
                        { id: 'physics', label: 'Физика' },
                        { id: 'chemistry', label: 'Химия' },
                        { id: 'history', label: 'История' },
                        { id: 'social', label: 'Обществознание' },
                        { id: 'development', label: 'Развитие / Творчество' },
                        { id: 'creativity', label: '3D-моделирование' },
                        { id: 'other', label: 'Продлёнка' },
                      ].map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setShowTrialSubjects(false);
                            handleBookNow(cat.label, `Запись на бесплатное вводное тестирование/пробное занятие: ${cat.label}`);
                          }}
                          className="text-left px-3 py-2 rounded-xl hover:bg-brand-mint-pale/40 text-sm font-medium text-brand-brown-dark hover:text-brand-teal transition-colors"
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Small details */}
              <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-brand-brown-light font-bold">
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-4 h-4 text-brand-sage" /> Более 10 предметов
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-4 h-4 text-brand-sage" /> Группы до 5 человек
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-4 h-4 text-brand-sage" /> Опыт учителей 10+ лет
                </span>
              </div>
            </div>

            {/* Right Column — стопка фотографий */}
            <div className="lg:col-span-6 flex justify-center relative">
              <div className="w-full max-w-lg md:max-w-2xl lg:max-w-full relative px-2 sm:px-0" style={{ touchAction: 'pan-y' }}
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }}
                onTouchEnd={(e) => {
                  const dx = e.changedTouches[0].clientX - touchStartX.current;
                  const dy = e.changedTouches[0].clientY - touchStartY.current;
                  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
                  setHeroPhotoIdx(prev => dx < 0 ? (prev + 1) % PROCESS_PHOTOS.length : (prev - 1 + PROCESS_PHOTOS.length) % PROCESS_PHOTOS.length);
                }}
              >
                {/* Декоративный фон */}
                <div className="absolute inset-0 bg-white/40 rounded-[48px] -rotate-3 -z-10"></div>
                <div className="absolute -top-6 -left-6 w-16 h-16 bg-brand-gold rounded-full opacity-60 filter blur-xl -z-10"></div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand-teal rounded-full opacity-10 filter blur-2xl -z-10"></div>

                <div className="relative group/carousel">
                  {/* Стопка: 3 слоя */}
                  <div className="relative">
                    {/* Задний слой (heroPhotoIdx + 2) */}
                    <div className="absolute top-4 left-4 right-4 bottom-[-10px] rounded-[32px] overflow-hidden opacity-20 -rotate-6 transition-all duration-500 ease-out pointer-events-none">
                      <picture>
                        <source srcSet={`/assets/process/process-${PROCESS_PHOTOS[(heroPhotoIdx + 2) % PROCESS_PHOTOS.length]}.webp`} type="image/webp" />
                        <img src={`/assets/process/process-${PROCESS_PHOTOS[(heroPhotoIdx + 2) % PROCESS_PHOTOS.length]}.jpg`} alt="" width="400" height="267" className="w-full h-72 sm:h-80 md:h-96 object-cover" />
                      </picture>
                    </div>

                    {/* Средний слой (heroPhotoIdx + 1) */}
                    <div className="absolute top-2 left-2 right-2 bottom-[-5px] rounded-[32px] overflow-hidden opacity-40 -rotate-2 transition-all duration-500 ease-out pointer-events-none">
                      <picture>
                        <source srcSet={`/assets/process/process-${PROCESS_PHOTOS[(heroPhotoIdx + 1) % PROCESS_PHOTOS.length]}.webp`} type="image/webp" />
                        <img src={`/assets/process/process-${PROCESS_PHOTOS[(heroPhotoIdx + 1) % PROCESS_PHOTOS.length]}.jpg`} alt="" width="400" height="267" className="w-full h-72 sm:h-80 md:h-96 object-cover" />
                      </picture>
                    </div>

                    {/* Передний слой — клик = лайтбокс */}
                    <button
                      onClick={() => setProcessLightboxIndex(heroPhotoIdx)}
                      className="relative w-full rounded-[32px] overflow-hidden shadow-lamp border border-brand-sage/10 transition-all duration-500 ease-out"
                    >
                      <picture>
                        <source srcSet={`/assets/process/process-${PROCESS_PHOTOS[heroPhotoIdx]}.webp`} type="image/webp" />
                        <img
                          src={`/assets/process/process-${PROCESS_PHOTOS[heroPhotoIdx]}.jpg`}
                          alt="Учебный процесс в образовательном центре Опора"
                          width="800" height="534"
                          fetchPriority="high"
                          className="w-full h-72 sm:h-80 md:h-96 object-cover"
                        />
                      </picture>
                    </button>

                    {/* Стрелки слева/справа */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setHeroPhotoIdx(prev => (prev - 1 + PROCESS_PHOTOS.length) % PROCESS_PHOTOS.length); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md text-brand-teal hover:bg-white hover:shadow-lg opacity-0 group-hover/carousel:opacity-100 sm:opacity-70 transition-all"
                      aria-label="Предыдущее фото"
                    >
                      <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setHeroPhotoIdx(prev => (prev + 1) % PROCESS_PHOTOS.length); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md text-brand-teal hover:bg-white hover:shadow-lg opacity-0 group-hover/carousel:opacity-100 sm:opacity-70 transition-all"
                      aria-label="Следующее фото"
                    >
                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                </div>

                {/* Точки-индикаторы */}
                <div className="flex justify-center gap-1.5 mt-5">
                  {PROCESS_PHOTOS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroPhotoIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${i === heroPhotoIdx ? 'bg-brand-teal w-4' : 'bg-brand-sage/30 hover:bg-brand-sage/50 w-1.5'}`}
                      aria-label={`Фото ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>


        {/* Лайтбокс фото процесса */}
        {processLightboxIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setProcessLightboxIndex(null)}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              const dy = e.changedTouches[0].clientY - touchStartY.current;
              if (dy > 50 && Math.abs(dy) > Math.abs(dx)) { setProcessLightboxIndex(null); return; }
              if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
              if (dx < 0 && processLightboxIndex < PROCESS_PHOTOS.length - 1) setProcessLightboxIndex(processLightboxIndex + 1);
              if (dx > 0 && processLightboxIndex > 0) setProcessLightboxIndex(processLightboxIndex - 1);
            }}
          >
            <button
              onClick={() => setProcessLightboxIndex(null)}
              className="absolute top-4 right-4 z-10 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {processLightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setProcessLightboxIndex(processLightboxIndex - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            {processLightboxIndex < PROCESS_PHOTOS.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setProcessLightboxIndex(processLightboxIndex + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                aria-label="Следующее фото"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}

            <span className="absolute top-4 left-4 z-10 text-white/60 text-sm font-mono pointer-events-none">
              {processLightboxIndex + 1} / {PROCESS_PHOTOS.length}
            </span>

            <picture>
              <source srcSet={`/assets/process/process-${PROCESS_PHOTOS[processLightboxIndex]}.webp`} type="image/webp" />
              <img
                src={`/assets/process/process-${PROCESS_PHOTOS[processLightboxIndex]}.jpg`}
                alt={`Учебный процесс в центре Опора — фото ${processLightboxIndex + 1}`}
                width="1600"
                height="1200"
                className="rounded-2xl shadow-2xl"
                style={{ maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', width: 'auto', height: 'auto' }}
                onClick={(e) => e.stopPropagation()}
                key={processLightboxIndex}
              />
            </picture>
          </div>
        )}
      </section>

      {/* 3. CORE BROCHURE FEATURE GRID */}
      <section className="py-12 bg-brand-cream border-t border-brand-mint-pale" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-brand-amber font-bold text-xs uppercase tracking-widest bg-brand-gold/20 px-3 py-1 rounded-full">Опора даёт уверенность</span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-brand-brown-dark mt-2">Здесь мы бережно и качественно помогаем</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-brand-cream p-6 rounded-2xl border border-brand-sage/10 shadow-lamp hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-brand-mint-pale rounded-2xl text-brand-teal">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-sm text-brand-brown-dark">Подготовка к ОГЭ, ЕГЭ, ВПР</h3>
              <p className="text-xs text-brand-brown-light">
                Пошаговые алгоритмы, проработка сложных критериев ФИПИ, регулярные пробные тесты и полное снятие тревожности у школьника.
              </p>
            </div>

            <div className="bg-brand-cream p-6 rounded-2xl border border-brand-sage/10 shadow-lamp hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-brand-gold/30 rounded-2xl text-brand-amber">
                <Percent className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-sm text-brand-brown-dark">Повысим успеваемость</h3>
              <p className="text-xs text-brand-brown-light">
                Выявим и восполним пробелы в знаниях, поможем легко разобраться со сложными школьными домашними заданиями.
              </p>
            </div>

            <div className="bg-brand-cream p-6 rounded-2xl border border-brand-sage/10 shadow-lamp hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-brand-mint-light rounded-2xl text-brand-teal">
                <Smile className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-sm text-brand-brown-dark">Мотивируем к учёбе</h3>
              <p className="text-xs text-brand-brown-light">
                Заменим скучную зубрёжку на интерактивное понимание. Учим любить сам процесс открытий и побед.
              </p>
            </div>

            <div className="bg-brand-cream p-6 rounded-2xl border border-brand-sage/10 shadow-lamp hover:shadow-md transition-all duration-300 flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-brand-gold/20 rounded-2xl text-brand-brown-dark">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-sm text-brand-brown-dark">Специалисты центра</h3>
              <p className="text-xs text-brand-brown-light">
                В нашей дружной команде: опытный детский психолог, нейропсихолог, профессиональный логопед и профессиональные репетиторы по всем предметам.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3.5 АКЦИИ */}
      <section className="py-12 bg-brand-mint-pale/30 border-t border-brand-mint-pale" id="promos">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-brand-amber font-bold text-xs uppercase tracking-widest bg-brand-gold/20 px-3 py-1 rounded-full">Акции и спецпредложения</span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-brand-brown-dark mt-2">
              Выгодные условия <span className="text-brand-teal">для ваших детей</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Акция 1 — пробный урок в подарок */}
            <div className="bg-gradient-to-br from-brand-teal/5 to-brand-teal/10 rounded-3xl border border-brand-teal/15 p-6 shadow-lamp flex flex-col items-center text-center space-y-4 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 rounded-2xl bg-brand-teal/15 flex items-center justify-center text-3xl">
                🎁
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-lg text-brand-teal">Пробный урок в подарок</h3>
                <p className="text-sm text-brand-brown-light leading-relaxed">
                  Для учеников, пришедших по рекомендации друзей и знакомых. Познакомимся, определим уровень и подберём программу без оплаты.
                </p>
              </div>
              <a href="#booking_section" className="text-xs font-bold text-brand-teal hover:text-brand-amber transition-colors flex items-center gap-1 mt-auto pt-2">
                Записаться <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Акция 2 — скидка 10% на 4 занятия */}
            <div className="bg-gradient-to-br from-brand-amber/5 to-brand-amber/10 rounded-3xl border border-brand-amber/15 p-6 shadow-lamp flex flex-col items-center text-center space-y-4 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 rounded-2xl bg-brand-amber/15 flex items-center justify-center text-3xl">
                💰
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-lg text-brand-amber">Скидка 10% на абонемент</h3>
                <p className="text-sm text-brand-brown-light leading-relaxed">
                  При единовременной оплате от 4 занятий — фиксированная скидка 10%. Действует на все предметы и направления центра.
                </p>
              </div>
              <a href="#booking_section" className="text-xs font-bold text-brand-amber hover:text-brand-brown-dark transition-colors flex items-center gap-1 mt-auto pt-2">
                Записаться <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Акция 3 — скидка за рекомендацию */}
            <div className="bg-gradient-to-br from-brand-mint-pale to-brand-mint-light/40 rounded-3xl border border-brand-sage/15 p-6 shadow-lamp flex flex-col items-center text-center space-y-4 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 rounded-2xl bg-brand-sage/15 flex items-center justify-center text-3xl">
                🤝
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-lg text-brand-brown-dark">Приведи друга — получи скидку</h3>
                <p className="text-sm text-brand-brown-light leading-relaxed">
                  Порекомендовали нас знакомым — получаете скидку 10% на следующие 4 занятия. Друзьям тоже подарок!
                </p>
              </div>
              <a href="#booking_section" className="text-xs font-bold text-brand-brown-dark hover:text-brand-teal transition-colors flex items-center gap-1 mt-auto pt-2">
                Записаться <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Нижняя плашка — уточнение */}
          <p className="text-center text-[10px] text-brand-brown-light/50 mt-6">
            Акции суммируются при выполнении условий. Подробности у администратора центра.
          </p>
        </div>
      </section>

      {/* 4. SERVICES: INTERACTIVE CATALOG FILTER */}
      <CatalogFilter teachers={teachers} onBookNow={handleBookNow} />

      {/* 5. TEACHERS & TEAM POPUPS */}
      <section className="py-16 bg-brand-cream relative" id="teachers">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-brand-amber font-bold text-xs uppercase tracking-widest bg-brand-gold/20 px-3 py-1 rounded-full">Наша гордость</span>
            <h2 className="font-display font-black text-3xl text-brand-teal mt-2">Квалифицированные педагоги <span className="text-brand-amber">центра «Опора»</span></h2>
            <p className="text-sm text-brand-brown-light mt-2 italic">
              Мы тщательно подбираем преподавателей. Наши специалисты находят ключ к каждому ребёнку. Нажмите на карточку, чтобы узнать больше!
            </p>
          </div>

          <div className="relative">
            {/* Стрелки навигации -- только рабочая */}
            {shuffledTeachers.length > 6 && (
              <>
                {teacherCanScrollLeft && (
                  <button
                    onClick={() => scrollTeachersBy('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 z-10 p-2 bg-brand-cream rounded-full shadow-lamp border border-brand-sage/20 text-brand-teal hover:bg-brand-mint-pale transition-all hidden sm:block"
                    aria-label="Предыдущие педагоги"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {teacherCanScrollRight && (
                  <button
                    onClick={() => scrollTeachersBy('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 z-10 p-2 bg-brand-cream rounded-full shadow-lamp border border-brand-sage/20 text-brand-teal hover:bg-brand-mint-pale transition-all hidden sm:block"
                    aria-label="Следующие педагоги"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </>
            )}

            {/* Карточки педагогов -- двухрядный горизонтальный скролл */}
            <div
              ref={teacherSliderRef}
              onScroll={() => {
                const el = teacherSliderRef.current;
                if (!el) return;
                const card = el.querySelector('.teacher-slide-card') as HTMLElement;
                if (!card) return;
                const cardW = card.offsetWidth + 24;
                const step = cardsPerView();
                const maxScroll = el.scrollWidth - el.clientWidth;
                // колонок (2 учителя в колонке) = сколько раз по 2 помещается
                const columns = Math.ceil(shuffledTeachers.length / 2);
                const dotsCount = Math.ceil(columns / step);
                let idx = Math.round(el.scrollLeft / (cardW * step));
                // зажать в пределах и докрутить последнюю точку
                if (el.scrollLeft >= maxScroll - 2) idx = dotsCount - 1;
                idx = Math.max(0, Math.min(idx, dotsCount - 1));
                setTeacherScrollIdx(idx);
                setTeacherCanScrollLeft(el.scrollLeft > 8);
                setTeacherCanScrollRight(el.scrollLeft < maxScroll - 8);
              }}
              className="grid grid-flow-col auto-cols-[calc(100vw-2rem)] sm:auto-cols-[calc(50%-12px)] lg:auto-cols-[calc(33.333%-16px)] grid-rows-2 gap-6 overflow-x-auto scroll-smooth pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 scroll-pl-4 sm:scroll-pl-0"
            >
              {shuffledTeachers.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveTeacher(t)}
                  className="teacher-slide-card bg-brand-cream rounded-3xl border border-brand-sage/10 p-5 shadow-lamp hover:shadow-lamp-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between snap-start"
                  id={`teacher_card_${t.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <div className="relative group-hover:scale-105 transition-transform duration-300">
                        <div className="absolute inset-0 bg-brand-teal/5 rounded-full filter blur-md -z-10"></div>
                        <TeacherAvatar teacher={t} className="w-20 h-20 flex-shrink-0" />
                      </div>
                    </div>

                    <div className="text-center space-y-0.5">
                      <h3 className="font-display font-bold text-sm text-brand-brown-dark group-hover:text-brand-teal transition-colors">
                        {t.name}
                      </h3>
                      <div className="text-[11px] font-semibold text-brand-amber">
                        {t.experience}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-1">
                      {t.subjects.map((sub, i) => (
                        <span key={i} className="bg-brand-mint-pale text-brand-teal font-extrabold px-1.5 py-0.5 rounded text-[10px] tracking-wide uppercase">
                          {sub}
                        </span>
                      ))}
                    </div>

                    <p className="text-[11px] text-brand-brown-light leading-relaxed text-center line-clamp-2">
                      {t.bio}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-brand-sage/5 flex justify-center">
                    <span className="text-[11px] font-bold text-brand-teal group-hover:text-brand-amber transition-colors flex items-center gap-1">
                      Подробнее <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Точки-индикаторы */}
            <div className="flex justify-center gap-1.5 mt-4">
              {Array.from({ length: Math.ceil(Math.ceil(shuffledTeachers.length / 2) / cardsPerView()) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const el = teacherSliderRef.current;
                    if (!el) return;
                    const card = el.querySelector('.teacher-slide-card') as HTMLElement;
                    if (!card) return;
                    const cardW = card.offsetWidth + 24;
                    const step = cardsPerView();
                    const maxScroll = el.scrollWidth - el.clientWidth;
                    el.scrollTo({ left: Math.min(cardW * step * i, maxScroll), behavior: 'smooth' });
                  }}
                  className={`h-1.5 rounded-full transition-all ${i === teacherScrollIdx ? 'bg-brand-teal w-4' : 'bg-brand-sage/30 hover:bg-brand-sage/50 w-1.5'}`}
                  aria-label={`Педагоги ${i + 1}`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* TEACHER BIO POPUP MODAL */}
        {activeTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown-dark/50 backdrop-blur-sm" id="teacher_popup_modal" onClick={() => setActiveTeacher(null)} onWheel={(e) => e.stopPropagation()} style={{ overscrollBehavior: 'contain' }}>
            <div className="bg-brand-cream rounded-3xl max-w-2xl w-full max-h-[90vh] border border-brand-sage/20 shadow-lamp-lg overflow-hidden relative animate-in fade-in zoom-in duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>

              {/* Close Button */}
              <button
                onClick={() => setActiveTeacher(null)}
                className="absolute top-4 right-4 z-10 p-3 text-brand-brown-dark/60 hover:text-brand-brown-dark hover:bg-brand-mint-pale rounded-full transition-all"
                id="close_teacher_popup"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                
                {/* Header: Large rectangular photo + Name */}
                <div className="flex flex-col items-center gap-5">
                  <button
                    onClick={() => setBigPhotoUrl(activeTeacher.photoUrl)}
                    className="relative w-40 h-52 sm:w-56 sm:h-72 rounded-2xl overflow-hidden shadow-lamp border-2 border-brand-mint-pale cursor-pointer group"
                  >
                    <img
                      src={activeTeacher.photoUrl}
                      alt={activeTeacher.name}
                      width="400"
                      height="533"
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Скрываем битую картинку -- TeacherAvatar отрисуется ниже как фолбэк
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {/* Иконка лупы */}
                    <div className="absolute inset-0 hover:bg-black/10 transition-colors flex items-center justify-center">
                      <svg className="w-8 h-8 text-white opacity-0 hover:opacity-80 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                  </button>
                  <div className="text-center space-y-1">
                    <span className="text-brand-amber font-bold text-xs uppercase tracking-widest">{activeTeacher.experience}</span>
                    <h3 className="font-display font-black text-xl sm:text-2xl text-brand-brown-dark">
                      {activeTeacher.name}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-1">
                      {activeTeacher.subjects.map((sub, i) => (
                        <span key={i} className="bg-brand-mint-pale text-brand-teal font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4 text-sm leading-relaxed text-brand-brown-light">
                  <div className="space-y-1">
                    <span className="font-bold text-brand-brown-dark uppercase tracking-wider text-xs block">🎓 Образование:</span>
                    <p className="bg-brand-mint-pale/30 p-2.5 rounded-xl border border-brand-sage/10 text-xs sm:text-sm">{activeTeacher.education}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-brand-brown-dark uppercase tracking-wider text-xs block">✍️ О преподавателе:</span>
                    <p className="italic text-brand-brown-dark bg-brand-cream p-1">{activeTeacher.bio}</p>
                  </div>
                </div>

              </div>{/* конец скроллящейся области */}

              {/* Footer Buttons -- sticky, вне скролла */}
              <div className="p-6 sm:px-8 pt-4 border-t border-brand-sage/5 flex flex-col sm:flex-row gap-3 flex-shrink-0 bg-brand-cream rounded-b-3xl">
                <button
                  onClick={() => handleBookNow(activeTeacher.subjects[0], `Запись к преподавателю: ${activeTeacher.name}`)}
                  className="w-full sm:w-1/2 bg-brand-teal hover:bg-brand-sage text-brand-cream font-bold py-3 px-4 rounded-xl transition-all text-xs uppercase tracking-wider"
                >
                  Записаться к педагогу
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTeacher(null)}
                  className="w-full sm:w-1/2 border border-brand-sage/30 hover:bg-brand-mint-pale/40 text-brand-brown-dark font-bold py-3 px-4 rounded-xl transition-all text-xs uppercase tracking-wider"
                >
                  Вернуться к списку
                </button>
              </div>

            </div>
          </div>
        )}

      </section>

      {/* 5.5. FOUNDER SECTION */}
      <section className="py-16 bg-brand-cream relative border-t border-brand-mint-pale" id="founder">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-brand-amber font-bold text-xs uppercase tracking-widest bg-brand-gold/20 px-3 py-1 rounded-full">Основатель центра</span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-brand-brown-dark mt-2">
              Как я не любила детей и стала учительницей? 🤓
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Photo -- вертикальное, крупнее, кликабельно */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <button
                onClick={() => setBigPhotoUrl('/assets/photos/shumkinadirector.jpg')}
                className="relative w-80 sm:w-[28rem] lg:w-[50rem] rounded-3xl overflow-hidden shadow-lamp border-4 border-brand-cream cursor-pointer hover:shadow-lg transition-shadow"
                style={{ aspectRatio: '3/4' }}
              >
                <picture>
                  <source srcSet="/assets/photos/shumkinadirector.webp" type="image/webp" />
                  <img
                    src="/assets/photos/shumkinadirector.jpg"
                    alt="Надежда Шумкина — основатель образовательного центра Опора"
                    width="1200"
                    height="1600"
                    loading="lazy"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </picture>
                {/* Иконка лупы при наведении */}
                <div className="absolute inset-0 hover:bg-black/10 transition-colors flex items-center justify-center">
                  <svg className="w-10 h-10 text-white opacity-0 hover:opacity-80 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
              </button>
            </div>

            {/* Text */}
            <div className="lg:col-span-7 space-y-5 text-brand-brown-dark">
              <div className="space-y-4 leading-relaxed">
                <p className="text-lg font-medium text-brand-teal">
                  Рада приветствовать вас! Меня зовут <strong>Надежда Шумкина</strong>. Я мама троих детей, педагог и создатель этого образовательного пространства.
                </p>

                <p>
                  Если бы до 25 лет мне сказали, что я открою свою школу, я бы сильно удивилась. Я была абсолютно уверена, что дети — это не моё, строила карьеру в журналистике, жила исключительно для себя и ни в чём себе не отказывала.
                </p>

                <p>
                  Всё перевернулось с рождением первого ребёнка. Это была глубокая личная трансформация, через сложности и вызовы, которая полностью изменила мои приоритеты. Я начала преподавать, и со временем поняла, что именно это даёт мне самую большую радость и опору.
                </p>

                <p>
                  Я оставила руководящие должности в маркетинге и медиа, получила профессиональное педагогическое образование и с головой ушла в изучение детской психологии и нейропсихологии.
                </p>

                <p>
                  Сегодня я счастлива открыть двери нашего центра. Это моя сбывшаяся мечта. Я собрала здесь сильную и опытную команду преподавателей — тех самых профессионалов, которым я уже не первый год доверяю обучение собственных детей.
                </p>

                <p className="text-brand-teal font-medium">
                  Мы создали место, где академические знания передаются с любовью, а развитие ребёнка происходит в атмосфере искренней поддержки и радости.
                </p>

                <p className="font-display font-bold text-lg text-brand-amber">
                  Добро пожаловать!
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5.7. INTERIOR GALLERY */}
      <section className="py-16 bg-brand-mint-pale/30 relative border-t border-brand-mint-pale" id="interior">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-brand-amber font-bold text-xs uppercase tracking-widest bg-brand-gold/20 px-3 py-1 rounded-full">Уют и атмосфера</span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-brand-brown-dark mt-2">
              Наш центр <span className="text-brand-teal">в фотографиях</span>
            </h2>
            <p className="text-sm text-brand-brown-light mt-2 italic">
              Светлые кабинеты, удобные зоны ожидания для родителей и атмосфера, в которой хочется учиться.
            </p>
          </div>

          <div className="relative">
            {/* Стрелки навигации -- только рабочая */}
            {INTERIOR_PHOTOS.length > 3 && (
              <>
                {interiorScrollIdx > 0 && (
                  <button
                    onClick={() => scrollInteriorBy('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 z-10 p-2 bg-brand-cream rounded-full shadow-lamp border border-brand-sage/20 text-brand-teal hover:bg-brand-mint-pale transition-all hidden sm:block"
                    aria-label="Предыдущие фото"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {interiorScrollIdx < Math.ceil(INTERIOR_PHOTOS.length / cardsPerView()) - 1 && (
                  <button
                    onClick={() => scrollInteriorBy('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 z-10 p-2 bg-brand-cream rounded-full shadow-lamp border border-brand-sage/20 text-brand-teal hover:bg-brand-mint-pale transition-all hidden sm:block"
                    aria-label="Следующие фото"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </>
            )}

            {/* Горизонтальный скролл с фото */}
            <div
              ref={interiorSliderRef}
              onScroll={() => {
                const el = interiorSliderRef.current;
                if (!el) return;
                const card = el.querySelector('.interior-slide-card') as HTMLElement;
                if (!card) return;
                const cardW = card.offsetWidth + 16;
                const step = cardsPerView();
                const maxScroll = el.scrollWidth - el.clientWidth;
                const dotsCount = Math.ceil(INTERIOR_PHOTOS.length / step);
                let idx = Math.round(el.scrollLeft / (cardW * step));
                if (el.scrollLeft >= maxScroll - 2) idx = dotsCount - 1;
                idx = Math.max(0, Math.min(idx, dotsCount - 1));
                setInteriorScrollIdx(idx);
              }}
              className="flex gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:px-0 sm:mx-0 scroll-pl-4 sm:scroll-pl-0"
            >
              {INTERIOR_PHOTOS.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => setLightboxIndex(idx)}
                  className="interior-slide-card flex-shrink-0 w-[calc(100vw-2rem)] sm:w-[calc(33.333%-11px)] rounded-2xl overflow-hidden shadow-lamp border border-brand-sage/10 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group snap-start"
                >
                  <img
                    src={`/assets/interior/${name}.jpg`}
                    alt="Интерьер образовательного центра Опора"
                    width="400"
                    height="267"
                    className="w-full h-56 sm:h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>

            {/* Точки-индикаторы */}
            {INTERIOR_PHOTOS.length > 3 && (
              <div className="flex justify-center gap-1.5 mt-6">
                {Array.from({ length: Math.ceil(INTERIOR_PHOTOS.length / cardsPerView()) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const el = interiorSliderRef.current;
                      if (!el) return;
                      const card = el.querySelector('.interior-slide-card') as HTMLElement;
                      if (!card) return;
                      const cardW = card.offsetWidth + 16;
                      const maxScroll = el.scrollWidth - el.clientWidth;
                      el.scrollTo({ left: Math.min(cardW * cardsPerView() * i, maxScroll), behavior: 'smooth' });
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${i === interiorScrollIdx ? 'bg-brand-teal w-4' : 'bg-brand-sage/30 hover:bg-brand-sage/50'}`}
                    aria-label={`Группа фото ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Подсказка для мобильных */}
            <p className="text-center text-[10px] text-brand-brown-light/50 mt-3 sm:hidden">
              ← Листайте, чтобы увидеть все фото →
            </p>
          </div>

        </div>

        {/* Лайтбокс с навигацией */}
        {lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              const dy = e.changedTouches[0].clientY - touchStartY.current;
              // Свайп вниз — закрыть
              if (dy > 50 && Math.abs(dy) > Math.abs(dx)) { setLightboxIndex(null); return; }
              if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
              if (dx < 0 && lightboxIndex < INTERIOR_PHOTOS.length - 1) setLightboxIndex(lightboxIndex + 1);
              if (dx > 0 && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 z-10 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left arrow */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            {/* Right arrow */}
            {lightboxIndex < INTERIOR_PHOTOS.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                aria-label="Следующее фото"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}

            {/* Photo counter */}
            <span className="absolute top-4 left-4 z-10 text-white/60 text-sm font-mono pointer-events-none">
              {lightboxIndex + 1} / {INTERIOR_PHOTOS.length}
            </span>

            {/* Фото: stopPropagation чтобы клик по нему не закрывал */}
            <img
              src={`/assets/interior/${INTERIOR_PHOTOS[lightboxIndex]}.jpg`}
              alt={`Интерьер центра Опора — фото ${lightboxIndex + 1}`}
              width="1400"
              height="1050"
              className="rounded-2xl shadow-2xl"
              style={{ maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', width: 'auto', height: 'auto' }}
              onClick={(e) => e.stopPropagation()}
              key={lightboxIndex}
            />
          </div>
        )}

        {/* Лайтбокс для отдельного большого фото (основатель, фото препода) */}
        {bigPhotoUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setBigPhotoUrl(null)}
          >
            <button
              onClick={() => setBigPhotoUrl(null)}
              className="absolute top-4 right-4 z-10 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <picture>
              <source srcSet={bigPhotoUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp')} type="image/webp" />
              <img
                src={bigPhotoUrl}
                alt="Фото"
                width="1800"
                height="1400"
                className="rounded-2xl shadow-2xl"
                style={{ maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', width: 'auto', height: 'auto' }}
                onClick={(e) => e.stopPropagation()}
              />
            </picture>
          </div>
        )}

        {/* Лайтбокс для скриншотов отзывов — листается как интерьеры */}
        {reviewLightboxIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setReviewLightboxIndex(null)}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              const dy = e.changedTouches[0].clientY - touchStartY.current;
              // Свайп вниз — закрыть
              if (dy > 50 && Math.abs(dy) > Math.abs(dx)) { setReviewLightboxIndex(null); return; }
              if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
              if (dx < 0 && reviewLightboxIndex < approvedReviews.length - 1) setReviewLightboxIndex(reviewLightboxIndex + 1);
              if (dx > 0 && reviewLightboxIndex > 0) setReviewLightboxIndex(reviewLightboxIndex - 1);
            }}
          >
            {/* Закрыть */}
            <button
              onClick={() => setReviewLightboxIndex(null)}
              className="absolute top-4 right-4 z-10 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Предыдущий */}
            {reviewLightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setReviewLightboxIndex(reviewLightboxIndex - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                aria-label="Предыдущий отзыв"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            {/* Следующий */}
            {reviewLightboxIndex < approvedReviews.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setReviewLightboxIndex(reviewLightboxIndex + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                aria-label="Следующий отзыв"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}

            {/* Счётчик */}
            <span className="absolute top-4 left-4 z-10 text-white/60 text-sm font-mono pointer-events-none">
              {reviewLightboxIndex + 1} / {approvedReviews.length}
            </span>

            {/* Скриншот */}
            <picture>
              <source srcSet={approvedReviews[reviewLightboxIndex].screenshotUrl!.replace(/\.(jpg|jpeg|png)$/i, '.webp')} type="image/webp" />
              <img
                src={approvedReviews[reviewLightboxIndex].screenshotUrl}
                alt="Результаты учеников образовательного центра Опора"
                width="1206"
                height="1280"
                className="rounded-2xl shadow-2xl"
                style={{ maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', width: 'auto', height: 'auto' }}
                onClick={(e) => e.stopPropagation()}
                key={reviewLightboxIndex}
              />
            </picture>
          </div>
        )}
      </section>

      {/* 6. REVIEWS CAROUSEL — скриншоты реальных отзывов */}
      <section className="py-16 bg-brand-mint-pale/30 relative border-t border-b border-brand-mint-pale" id="reviews">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-brand-sage font-bold text-xs uppercase tracking-widest bg-brand-mint-light px-3 py-1 rounded-full">Родители говорят о нас</span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-brand-brown-dark mt-2">
              Отзывы семей <span className="text-brand-teal">в станице Северской</span>
            </h2>
            <p className="text-sm text-brand-brown-light mt-2 italic">
              Доверие родителей — наша главная опора. Мы делаем всё, чтобы учёба приносила радость детям и спокойствие мамам.
            </p>
            {/* Ссылка на Яндекс.Карты */}
            <a
              href="https://yandex.ru/navi/org/obrazovatelny_tsentr_opora/28677234672?si=qrzj1g9rguwa6pgpxqydhjtc74"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-brand-teal hover:text-brand-amber transition-colors"
            >
              Смотреть все отзывы на Яндекс.Картах <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {approvedReviews.length === 0 ? (
            <div className="text-center py-12 text-brand-brown-light italic">Отзывы загружаются...</div>
          ) : (
            <div className="relative">
              {/* Стрелки навигации */}
              {approvedReviews.length > 3 && (
                <>
                  {reviewScrollIdx > 0 && (
                    <button
                      onClick={() => {
                        const el = reviewSliderRef.current;
                        if (!el) return;
                        const card = el.querySelector('.review-slide-card') as HTMLElement;
                        if (!card) return;
                        const cardW = card.offsetWidth + 16;
                        el.scrollBy({ left: -cardW * cardsPerView(), behavior: 'smooth' });
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 z-10 p-2 bg-brand-cream rounded-full shadow-lamp border border-brand-sage/20 text-brand-teal hover:bg-brand-mint-pale transition-all hidden sm:block"
                      aria-label="Предыдущие отзывы"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {reviewScrollIdx < Math.ceil(approvedReviews.length / cardsPerView()) - 1 && (
                    <button
                      onClick={() => {
                        const el = reviewSliderRef.current;
                        if (!el) return;
                        const card = el.querySelector('.review-slide-card') as HTMLElement;
                        if (!card) return;
                        const cardW = card.offsetWidth + 16;
                        el.scrollBy({ left: cardW * cardsPerView(), behavior: 'smooth' });
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 z-10 p-2 bg-brand-cream rounded-full shadow-lamp border border-brand-sage/20 text-brand-teal hover:bg-brand-mint-pale transition-all hidden sm:block"
                      aria-label="Следующие отзывы"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}

              {/* Горизонтальный скролл со скриншотами */}
              <div
                ref={reviewSliderRef}
                onScroll={() => {
                  const el = reviewSliderRef.current;
                  if (!el) return;
                  const card = el.querySelector('.review-slide-card') as HTMLElement;
                  if (!card) return;
                  const cardW = card.offsetWidth + 16;
                  const step = cardsPerView();
                  const maxScroll = el.scrollWidth - el.clientWidth;
                  const dotsCount = Math.ceil(approvedReviews.length / step);
                  let idx = Math.round(el.scrollLeft / (cardW * step));
                  if (el.scrollLeft >= maxScroll - 2) idx = dotsCount - 1;
                  idx = Math.max(0, Math.min(idx, dotsCount - 1));
                  setReviewScrollIdx(idx);
                }}
                className="flex gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:px-0 sm:mx-0 scroll-pl-4 sm:scroll-pl-0"
              >
                {approvedReviews.map((rev, idx) => (
                  <button
                    key={rev.id}
                    onClick={() => {
                      if (rev.screenshotUrl) setReviewLightboxIndex(idx);
                    }}
                    className="review-slide-card flex-shrink-0 w-[calc(100vw-2rem)] sm:w-[calc(33.333%-11px)] snap-start group"
                  >
                    <div className="h-72 sm:h-80 rounded-2xl overflow-hidden shadow-lamp border border-brand-sage/10 bg-brand-mint-pale/20 relative flex items-center justify-center">
                      <picture>
                        <source srcSet={rev.screenshotUrl!.replace(/\.(jpg|jpeg|png)$/i, '.webp')} type="image/webp" />
                        <img
                          src={rev.screenshotUrl}
                          alt="Результаты учеников образовательного центра Опора"
                          width="1206"
                          height="1280"
                          loading="lazy"
                          className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      </picture>
                      {/* Оверлей при наведении */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                      </div>
                      {/* Платформа */}
                      <span className="absolute top-2 left-2 bg-black/45 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-lg pointer-events-none">
                        Результаты учеников
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Точки-индикаторы */}
              {approvedReviews.length > 3 && (
                <div className="flex justify-center gap-1.5 mt-6">
                  {Array.from({ length: Math.ceil(approvedReviews.length / cardsPerView()) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const el = reviewSliderRef.current;
                        if (!el) return;
                        const card = el.querySelector('.review-slide-card') as HTMLElement;
                        if (!card) return;
                        const cardW = card.offsetWidth + 16;
                        const maxScroll = el.scrollWidth - el.clientWidth;
                        el.scrollTo({ left: Math.min(cardW * cardsPerView() * i, maxScroll), behavior: 'smooth' });
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${i === reviewScrollIdx ? 'bg-brand-teal w-4' : 'bg-brand-sage/30 hover:bg-brand-sage/50'}`}
                      aria-label={`Страница отзывов ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Кнопка "Оставить отзыв" */}
              <div className="text-center mt-8">
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="bg-transparent hover:bg-brand-teal/10 text-brand-teal font-bold py-2.5 px-5 rounded-xl border-2 border-brand-teal text-xs uppercase tracking-wider transition-all"
                  id="write_review_btn"
                >
                  Оставить свой отзыв
                </button>
              </div>
            </div>
          )}

        </div>

        {/* WRITE REVIEW MODAL FORM */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown-dark/50 backdrop-blur-sm" id="write_review_modal">
            <div className="bg-brand-cream rounded-3xl max-w-md w-full border border-brand-sage/20 shadow-lamp-lg p-6 sm:p-8 relative animate-in fade-in zoom-in duration-300">
              <button 
                onClick={() => setShowReviewModal(false)}
                className="absolute top-4 right-4 p-2 text-brand-brown-dark/60 hover:text-brand-brown-dark hover:bg-brand-mint-pale rounded-full"
                id="close_review_modal"
              >
                <X className="w-5 h-5" />
              </button>

              <form onSubmit={submitReview} className="space-y-4">
                <h3 className="font-display font-bold text-lg text-brand-brown-dark">Оставить отзыв об Опоре</h3>
                <p className="text-xs text-brand-brown-light">Поделитесь вашим честным опытом обучения, чтобы помочь другим родителям Северской сделать правильный выбор!</p>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-brand-brown-dark">Ваше Имя (как к вам обращаться)</label>
                  <input 
                    type="text"
                    value={newReview.name}
                    onChange={(e) => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                    className="p-2 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal"
                    placeholder="Мария (мама Саши, 5 класс)"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-brand-brown-dark">Какое направление посещали</label>
                  <input 
                    type="text"
                    value={newReview.className}
                    onChange={(e) => setNewReview(prev => ({ ...prev, className: e.target.value }))}
                    className="p-2 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal"
                    placeholder="Например: Продлёнка или Подготовка к ОГЭ по математике"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-brand-brown-dark">Оценка</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => setNewReview(prev => ({ ...prev, rating: stars }))}
                        className="text-brand-gold p-1"
                      >
                        <Star className={`w-6 h-6 ${stars <= newReview.rating ? 'fill-current' : 'text-brand-sage/20'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-brand-brown-dark">Текст вашего отзыва</label>
                  <textarea 
                    value={newReview.text}
                    onChange={(e) => setNewReview(prev => ({ ...prev, text: e.target.value }))}
                    className="p-2 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal h-24 text-sm"
                    placeholder="Напишите несколько слов о педагоге, атмосфере и результатах ребёнка..."
                    required
                  />
                </div>

                <button type="submit" className="w-full bg-brand-teal hover:bg-brand-sage text-brand-cream font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-lamp">
                  Отправить на модерацию
                </button>
              </form>
            </div>
          </div>
        )}

      </section>

      {/* 7. LEAD FORM SECTION & BITRIX CRM DISPATCH */}
      <section className="py-16 bg-brand-cream relative" id="booking_section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-brand-teal to-brand-sage p-8 sm:p-12 rounded-3xl shadow-lamp-lg text-brand-cream relative overflow-hidden">
            
            {/* Background design accents */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-amber rounded-full opacity-25 filter blur-3xl"></div>
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-brand-gold rounded-full opacity-20 filter blur-3xl"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
              
              {/* Left Column Information */}
              <div className="lg:col-span-6 space-y-6">
                <span className="text-brand-gold font-bold text-xs uppercase tracking-widest bg-brand-cream/10 px-3 py-1 rounded-full">Запись на 2026/2027 учебный год</span>
                <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl leading-tight">
                  Запишитесь на пробное занятие или получите консультацию
                </h2>
                <p className="text-sm text-brand-cream/80 leading-relaxed">
                  Мы свяжемся с вами в течение 15 минут, поможем подобрать идеальную группу для вашего ребёнка, ответим на вопросы о расписании и сориентируем по индивидуальным предложениям.
                </p>
                
                {/* List advantages */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-xs sm:text-sm">
                    <span className="p-1 bg-brand-cream/15 rounded-full text-brand-gold">✓</span>
                    <span>Бесплатное вводное тестирование знаний перед репетиторством</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm">
                    <span className="p-1 bg-brand-cream/15 rounded-full text-brand-gold">✓</span>
                    <span>Скидка 10% на покупку абонемента для двоих детей из одной семьи</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm">
                    <span className="p-1 bg-brand-cream/15 rounded-full text-brand-gold">✓</span>
                    <span>Возможность оплаты материнским капиталом или оформление налогового вычета</span>
                  </div>
                </div>
              </div>

              {/* Right Column Interactive Form */}
              <div className="lg:col-span-6 bg-brand-cream p-6 sm:p-8 rounded-2xl border border-brand-teal/10 text-brand-brown-dark shadow-lamp relative">
                
                {leadSuccess ? (
                  /* Success Screen layout */
                  <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-300" id="lead_success_msg">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="font-display font-black text-xl text-brand-brown-dark">Заявка успешно отправлена!</h3>
                    <p className="text-xs sm:text-sm text-brand-brown-light leading-relaxed">
                      Уважаемая мама! Благодарим за доверие к центру «Опора». Наш администратор уже фильтрует входящую почту и свяжется с вами по указанному телефону в течение 15 минут.
                    </p>
                    <button 
                      onClick={() => setLeadSuccess(false)}
                      className="bg-brand-teal hover:bg-brand-sage text-brand-cream font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      Отправить ещё одну заявку
                    </button>
                  </div>
                ) : (
                  /* Lead form schema */
                  <form onSubmit={submitLead} className="space-y-4" id="lead_form">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-brand-brown-dark">Как к вам обращаться? (Имя родителя)</label>
                      <input 
                        type="text"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                        className="p-2.5 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal text-sm"
                        placeholder="Например: Екатерина"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-brand-brown-dark">Ваш контактный телефон</label>
                      <input 
                        type="tel"
                        value={leadForm.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="p-2.5 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal text-sm font-mono"
                        placeholder="+7 (___) ___-__-__"
                        required
                      />
                      {phoneError && <span className="text-[10px] text-red-600 font-bold">{phoneError}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="lead-subject" className="text-xs font-bold text-brand-brown-dark">Интересующий предмет или услуга</label>
                      <select
                        id="lead-subject"
                        value={leadForm.subject}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="p-2.5 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal text-sm"
                        required
                      >
                        <option value="">Выберите программу...</option>
                        {SERVICE_ITEMS.map((item) => (
                          <option key={item.id} value={item.name}>{item.name}</option>
                        ))}
                        <option value="Консультация">Общая консультация по расписанию</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-brand-brown-dark">Дополнительные пожелания (необязательно)</label>
                      <textarea 
                        value={leadForm.comment}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, comment: e.target.value }))}
                        className="p-2.5 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal text-sm h-16"
                        placeholder="Укажите класс ребёнка, удобные дни или пожелания к педагогу..."
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmittingLead}
                      className="w-full bg-brand-amber hover:bg-brand-amber/90 disabled:bg-brand-sage/50 text-brand-cream font-bold py-3.5 rounded-xl transition-all duration-300 text-xs uppercase tracking-wider shadow-lamp mt-2 flex items-center justify-center gap-2"
                    >
                      {isSubmittingLead ? (
                        <>Отправка лида...</>
                      ) : (
                        <>Отправить заявку в Опору</>
                      )}
                    </button>

                    <p className="text-[10px] text-center text-brand-brown-light leading-snug">
                      Нажимая кнопку, вы соглашаетесь на <a href="/privacy.html" target="_blank" className="underline hover:text-brand-teal transition-colors">обработку персональных данных</a> в соответствии с Федеральным законом №152-ФЗ.
                    </p>
                  </form>
                )}

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* LEAD BOOKING FLOATING MODAL */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown-dark/50 backdrop-blur-sm" id="booking_popup_modal">
          <div className="bg-brand-cream rounded-3xl max-w-md w-full max-h-[90vh] border border-brand-sage/20 shadow-lamp-lg relative animate-in fade-in zoom-in duration-300 flex flex-col">
            <button
              onClick={() => setShowLeadModal(false)}
              className="absolute top-4 right-4 z-10 p-2 text-brand-brown-dark/60 hover:text-brand-brown-dark hover:bg-brand-mint-pale rounded-full"
              id="close_booking_popup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto flex-1 p-6 sm:pb-2">
            {leadSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-display font-black text-xl text-brand-brown-dark">Заявка принята!</h3>
                <p className="text-xs text-brand-brown-light leading-relaxed">
                  Мы получили ваши данные и свяжемся с вами в течение 15 минут. Готовимся к встрече в нашем центре!
                </p>
              </div>
            ) : (
              <form onSubmit={submitLead} className="space-y-4" id="lead_modal_form">
                <h3 className="font-display font-bold text-lg text-brand-brown-dark">Запись на занятие</h3>
                <p className="text-xs text-brand-brown-light">Оставьте ваши контакты, и мы перезвоним вам в ближайшие минуты для детального обсуждения.</p>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-brand-brown-dark">Ваше Имя</label>
                  <input
                    type="text"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                    className="p-2.5 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal text-sm"
                    placeholder="Например: Мария"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-brand-brown-dark">Контактный телефон</label>
                  <input
                    type="tel"
                    value={leadForm.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="p-2.5 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal text-sm font-mono"
                    placeholder="+7 (___) ___-__-__"
                    required
                  />
                  {phoneError && <span className="text-[10px] text-red-600 font-bold">{phoneError}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-brand-brown-dark">Выбранное направление</label>
                  <input
                    type="text"
                    value={leadForm.subject}
                    readOnly
                    className="p-2.5 rounded-xl bg-brand-mint-pale border border-brand-sage/10 text-brand-teal font-bold text-sm focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-brand-brown-dark">Комментарий</label>
                  <textarea
                    value={leadForm.comment}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, comment: e.target.value }))}
                    className="p-2.5 rounded-xl bg-brand-cream border border-brand-sage/20 focus:outline-none focus:border-brand-teal text-sm h-16"
                    placeholder="Класс ребёнка, пожелания к преподавателю..."
                  />
                </div>

                <p className="text-[10px] text-center text-brand-brown-light leading-snug">
                  Нажимая кнопку, вы соглашаетесь на <a href="/privacy.html" target="_blank" className="underline hover:text-brand-teal transition-colors">обработку персональных данных</a> в соответствии с Федеральным законом №152-ФЗ.
                </p>
              </form>
            )}
            </div>{/* конец скроллящейся области */}

            {/* Кнопка отправки -- sticky, вне скролла */}
            {!leadSuccess && (
              <div className="px-6 sm:px-8 pb-6 pt-2 flex-shrink-0 bg-brand-cream rounded-b-3xl">
                <button
                  type="submit"
                  form="lead_modal_form"
                  disabled={isSubmittingLead}
                  className="w-full bg-brand-amber hover:bg-brand-amber/90 disabled:bg-brand-sage/50 text-brand-cream font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-lamp"
                >
                  {isSubmittingLead ? 'Отправка...' : 'Записаться'}
                </button>
              </div>
            )}

            {leadSuccess && (
              <div className="px-6 sm:px-8 pb-6 pt-2 flex-shrink-0 bg-brand-cream rounded-b-3xl">
                <button
                  onClick={() => setShowLeadModal(false)}
                  className="w-full bg-brand-teal text-brand-cream font-bold py-3 rounded-xl text-xs uppercase tracking-wider"
                >
                  Отлично
                </button>
              </div>
            )}
            </div>
          </div>
        )}

      {/* 8. CONTACTS, MAP & FOOTER */}
      <section className="py-16 bg-brand-mint-pale/40 relative border-t border-brand-mint-pale" id="contacts">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left column details */}
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-3">
                <span className="text-brand-teal font-bold text-xs uppercase tracking-widest bg-brand-mint-pale px-3 py-1 rounded-full">Контакты</span>
                <h2 className="font-display font-black text-3xl text-brand-teal">Как нас <span className="text-brand-amber">найти</span></h2>
                <p className="text-sm text-brand-brown-light leading-relaxed">
                  Приходите в гости на экскурсию! Мы с удовольствием покажем наши уютные светлые кабинеты и познакомим вас с педагогами.
                </p>
              </div>

              {/* Direct Address / Details cards */}
              <div className="space-y-4">
                
                <div className="flex items-start gap-4 p-4 bg-brand-cream rounded-2xl border border-brand-sage/10 shadow-lamp">
                  <div className="p-3 bg-brand-mint-pale rounded-xl text-brand-teal flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-brand-brown-light block uppercase">Наш адрес:</span>
                    <span className="font-semibold text-sm text-brand-brown-dark">📍 Краснодарский край, Станица Северская, ул. Ленина, 73</span>
                    <span className="text-xs text-brand-brown-light/70 block mt-0.5">(Центральная часть станицы, удобная парковка для родителей)</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-brand-cream rounded-2xl border border-brand-sage/10 shadow-lamp">
                  <div className="p-3 bg-brand-mint-pale rounded-xl text-brand-teal flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-brand-brown-light block uppercase">Телефон администратора:</span>
                    <a href="tel:+79604787276" className="font-bold text-base text-brand-teal hover:text-brand-amber transition-colors">
                      +7 (960) 478-72-76
                    </a>
                    <span className="text-xs text-brand-brown-light/70 block">Звонки и сообщения WhatsApp ежедневно</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-brand-cream rounded-2xl border border-brand-sage/10 shadow-lamp">
                  <div className="p-3 bg-brand-mint-pale rounded-xl text-brand-teal flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-brand-brown-light block uppercase">Режим работы:</span>
                    <span className="font-semibold text-sm text-brand-brown-dark">Ежедневно с 09:00 до 20:00</span>
                    <span className="text-xs text-brand-brown-light/70 block">Занятия проводятся по согласованному гибкому расписанию</span>
                  </div>
                </div>

                {/* Social Badges */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-bold text-brand-brown-light uppercase">Мы в соцсетях:</span>
                  <a
                    href="https://max.ru/channel_oporaed"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-brand-cream font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all"
                  >
                    Наш канал в MAX
                  </a>
                </div>

              </div>
            </div>

            {/* Right column map container */}
            <div ref={mapContainerRef} className="lg:col-span-7 bg-brand-cream p-4 rounded-3xl border border-brand-sage/15 shadow-lamp w-full relative">
              <div className="w-full h-[350px] rounded-2xl overflow-hidden relative border border-brand-sage/10 bg-brand-mint-pale/30 flex items-center justify-center text-center">

                {/* Embeded live map -- грузится только когда секция видна */}
                {mapVisible ? (
                  <iframe
                    src="https://yandex.ru/map-widget/v1/?ll=38.675685%2C44.857640&z=16&mode=search&ol=biz&oid=28677234672"
                    className="w-full h-full border-0 rounded-2xl z-10 relative opacity-95 hover:opacity-100 transition-opacity"
                    title="Адрес Опоры на Яндекс Картах"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                    <MapPin className="w-10 h-10 text-brand-teal animate-bounce" />
                    <div className="space-y-1">
                      <p className="font-display font-bold text-brand-brown-dark">Карта загрузится при скролле</p>
                      <p className="text-xs text-brand-brown-light">Краснодарский край, ст. Северская, улица Ленина, 73</p>
                    </div>
                    <a
                      href="https://yandex.ru/navi/org/obrazovatelny_tsentr_opora/28677234672?si=qrzj1g9rguwa6pgpxqydhjtc74"
                      target="_blank"
                      rel="noreferrer"
                      className="bg-brand-teal text-brand-cream text-xs font-bold px-4 py-2 rounded-xl"
                    >
                      Открыть в Яндекс.Навигаторе
                    </a>
                  </div>
                )}

              </div>

              {/* Driving/Transport Hint card */}
              <div className="p-4 bg-brand-mint-pale/30 border-t border-brand-sage/5 rounded-2xl mt-4 flex items-center justify-between text-xs font-bold text-brand-teal">
                <span>📍 Ориентир: Центральная станичная улица Ленина</span>
                <a
                  href="https://yandex.ru/navi/org/obrazovatelny_tsentr_opora/28677234672?si=qrzj1g9rguwa6pgpxqydhjtc74"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-brand-amber flex items-center gap-1 transition-colors"
                >
                  Проложить маршрут в Яндекс.Навигаторе <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>

          {/* Footer Branding credits */}
          <footer className="mt-16 pt-8 border-t border-brand-sage/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <span className="text-[10px] text-brand-brown-light/70 font-medium">© 2026 Образовательный центр «Опора». Все права защищены.</span>
            <div className="flex items-center gap-4">
              <a
                href="/privacy.html"
                className="text-[10px] text-brand-brown-light/50 hover:text-brand-teal transition-colors"
              >
                Политика обработки персональных данных
              </a>
              <a
                href="https://molvamarketing.com"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-brand-brown-light/50 hover:text-brand-teal transition-colors"
              >
                Разработано в MOLVA
              </a>
            </div>
          </footer>

        </div>
      </section>

      </main>
    </div>
  );
}
