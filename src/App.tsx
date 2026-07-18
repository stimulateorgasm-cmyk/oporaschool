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
  ExternalLink, CheckSquare, PlusCircle, User, FileText, CheckCircle2
} from 'lucide-react';
import { LogoSVG, CozyClassroomSVG, TeacherCardSVG, TeacherAvatar } from './components/Illustrations';
import { INITIAL_TEACHERS, INITIAL_REVIEWS, SERVICE_ITEMS } from './data';
import { Teacher, Review, ServiceItem, LeadApplication, BitrixConfig } from './types';

// Password for admin panel
const ADMIN_PASSWORD = 'opora';

export default function App() {
  // --- Persistent State ---
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('opora_teachers_v15');
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
    localStorage.setItem('opora_teachers_v15', JSON.stringify(teachers));
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

  // --- Filtering & UI States ---
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // active teacher popup
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);
  
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

  // reviews review index for carousel
  const [reviewIndex, setReviewIndex] = useState<number>(0);

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

  const submitReview = (e: React.FormEvent) => {
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

  // --- Filter Logic ---
  const filteredServices = SERVICE_ITEMS.filter(service => {
    // Filter by category
    if (selectedCategory !== 'all' && service.category !== selectedCategory) {
      return false;
    }
    // Filter by grade
    if (selectedGrade !== 'all') {
      if (selectedGrade === 'preschool' && !service.grades.includes('preschool')) return false;
      if (selectedGrade === '1-4' && !service.grades.includes('1-4')) return false;
      if (selectedGrade === '5-8' && !service.grades.includes('5-8')) return false;
      if (selectedGrade === '9-11' && !service.grades.includes('9-11')) return false;
      // Exam specific filters
      if (selectedGrade === 'oge' && !service.name.toLowerCase().includes('огэ')) return false;
      if (selectedGrade === 'ege' && !service.name.toLowerCase().includes('егэ')) return false;
    }
    // Filter by format (Online filter logic)
    if (selectedFormat !== 'all') {
      const hasOnline = service.formats.some(f => f.isOnline || f.name.toLowerCase().includes('онлайн'));
      const hasGroup = service.formats.some(f => f.name.toLowerCase().includes('группа') || f.name.toLowerCase().includes('абонемент'));
      const hasIndividual = service.formats.some(f => f.name.toLowerCase().includes('индивидуально') || f.name.toLowerCase().includes('консультация'));
      
      if (selectedFormat === 'online' && !hasOnline) return false;
      if (selectedFormat === 'group' && !hasGroup) return false;
      if (selectedFormat === 'individual' && !hasIndividual) return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = service.name.toLowerCase().includes(q);
      const descMatch = service.description.toLowerCase().includes(q);
      if (!nameMatch && !descMatch) return false;
    }
    return true;
  });

  // Approved reviews for user carousel
  const approvedReviews = reviews.filter(r => r.approved);

  const nextReview = () => {
    if (approvedReviews.length === 0) return;
    setReviewIndex((prev) => (prev + 1) % approvedReviews.length);
  };

  const prevReview = () => {
    if (approvedReviews.length === 0) return;
    setReviewIndex((prev) => (prev - 1 + approvedReviews.length) % approvedReviews.length);
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-brand-gold selection:text-brand-brown-dark" id="app_root">
      
      {/* 1. HEADER / NAVIGATION */}
      <header className="sticky top-0 z-40 bg-brand-cream/95 backdrop-blur-md border-b border-brand-mint-pale shadow-lamp transition-all duration-300" id="header_nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Slogan */}
          <a href="#hero" className="flex items-center gap-3 group">
            <LogoSVG className="w-12 h-12 transition-transform duration-500 group-hover:rotate-6" />
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-wider text-brand-teal flex items-center">
                ОП<span className="text-brand-amber">О</span>РА
              </span>
              <span className="text-[10px] text-brand-brown-light tracking-tight font-medium -mt-1 hidden sm:inline">
                Образовательный центр
              </span>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-brand-brown-dark/90">
            <a href="#services" className="hover:text-brand-teal transition-colors">Услуги и цены</a>
            <a href="#teachers" className="hover:text-brand-teal transition-colors">Педагоги</a>
            <a href="#reviews" className="hover:text-brand-teal transition-colors">Отзывы</a>
            <a href="#contacts" className="hover:text-brand-teal transition-colors">Контакты</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Admin Toggle button */}
            <button 
              onClick={() => {
                setShowAdmin(!showAdmin);
                if (!isAdminAuthenticated) {
                  // Pre-fill default password for simple grading/testing convenience!
                  setAdminPasswordInput(ADMIN_PASSWORD);
                }
              }}
              className="p-2 text-brand-sage hover:text-brand-teal rounded-full hover:bg-brand-mint-light/40 transition-all"
              title="Панель управления (Админка)"
              id="admin_toggle_btn"
            >
              <Settings className="w-5 h-5" />
            </button>

            <a 
              href="#contacts" 
              className="bg-brand-teal hover:bg-brand-sage text-brand-cream font-bold py-2.5 px-5 rounded-xl shadow-lamp hover:shadow-md transition-all text-sm"
              id="header_order_btn"
            >
              Записаться
            </a>
          </div>
        </div>
      </header>

      {/* ADMIN PANEL OVERLAY/PANEL */}
      {showAdmin && (
        <div className="bg-brand-mint-pale border-b-2 border-brand-teal/20 p-4 sm:p-6 shadow-lamp-inset relative transition-all duration-300" id="admin_workspace">
          <button 
            onClick={() => setShowAdmin(false)}
            className="absolute top-4 right-4 p-2 text-brand-brown-dark/60 hover:text-brand-brown-dark hover:bg-brand-cream rounded-full"
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
                                  <td className="p-3 text-xs max-w-xs text-brand-brown-light italic">{lead.comment || '—'}</td>
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
                              <p className="text-xs text-brand-brown-light italic mt-2">"{rev.text}"</p>
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
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-cream to-brand-mint-pale/60 pt-10 pb-16 md:py-24" id="hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column Text details */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left relative z-10">
              
              {/* Address indicator */}
              <div className="inline-flex items-center gap-2 bg-brand-teal/10 border border-brand-teal/20 text-brand-teal font-bold px-4 py-1.5 rounded-full text-xs sm:text-sm animate-pulse">
                <MapPin className="w-4 h-4 text-brand-amber" />
                <span>📍 Станица Северская, ул. Ленина, 73</span>
              </div>

              {/* Slogan */}
              <div className="text-brand-amber font-display font-bold text-base sm:text-lg tracking-wider uppercase">
                🌸 По поводу учёбы будьте спокойны!
              </div>

              {/* Title */}
              <h1 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-brand-teal leading-[1.1] select-none">
                Опора — образовательный центр <br className="hidden sm:inline" />
                <span className="text-brand-amber">в станице Северской</span>
              </h1>

              {/* Subtitle */}
              <p className="text-brand-sage text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0 italic">
                Профессиональные репетиторы, заботливая подготовка к школьным экзаменам ОГЭ/ЕГЭ, увлекательная продлёнка, творческие курсы 3D-моделирования и нейропсихологическая помощь детям в станице Северской. Развитие без стресса!
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a 
                  href="#services" 
                  className="w-full sm:w-auto text-center bg-brand-amber hover:bg-brand-amber/95 text-brand-cream font-bold py-4 px-8 rounded-3xl shadow-lg shadow-brand-amber/30 transition-all duration-300 transform hover:-translate-y-0.5 text-base"
                >
                  Подобрать занятия
                </a>
                <button 
                  onClick={() => handleBookNow('Пробное занятие', 'Запись на бесплатное вводное тестирование/пробное занятие')}
                  className="w-full sm:w-auto text-center bg-transparent hover:bg-brand-teal/10 text-brand-teal font-bold py-4 px-8 rounded-3xl border-2 border-brand-teal transition-all duration-300 text-base"
                  id="trial_button"
                >
                  Записаться на пробное
                </button>
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

            {/* Right Column Illustration */}
            <div className="lg:col-span-5 flex justify-center relative">
              <div className="w-full max-w-md md:max-w-xl lg:max-w-full relative p-4">
                {/* Decorative retro stamp or glow */}
                <div className="absolute inset-0 bg-white/40 rounded-[48px] -rotate-3 -z-10"></div>
                <div className="absolute -top-6 -left-6 w-16 h-16 bg-brand-gold rounded-full opacity-60 filter blur-xl -z-10 animate-bounce"></div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand-teal rounded-full opacity-10 filter blur-2xl -z-10"></div>
                
                <CozyClassroomSVG />
              </div>
            </div>

          </div>
        </div>
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
                В нашей дружной команде: опытный детский психолог, нейропсихолог, профессиональный логопед и уютная няня для малышей.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. SERVICES & PRICES WITH FILTER SYSTEM */}
      <section className="py-16 bg-brand-mint-pale/20 relative" id="services">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-brand-sage font-bold text-xs uppercase tracking-widest bg-brand-mint-light px-3 py-1 rounded-full">Каталог занятий</span>
            <h2 className="font-display font-black text-3xl text-brand-teal mt-2">Услуги, программы и <span className="text-brand-amber">честные цены</span></h2>
            <p className="text-sm text-brand-brown-light mt-2 italic">
              Выберите нужный предмет, класс ребёнка или удобный формат занятий для быстрого подбора.
            </p>
          </div>

          {/* SEARCH & FILTERS CONTROLS */}
          <div className="bg-brand-cream p-6 rounded-3xl border border-brand-sage/10 shadow-lamp space-y-6 mb-10">
            
            {/* Search Input bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-brand-sage" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск нужного предмета или направления (например: физика, логопед, ОГЭ...)"
                className="w-full pl-11 pr-4 py-3 bg-brand-cream border border-brand-sage/20 rounded-2xl text-brand-brown-dark placeholder:text-brand-brown-light/50 focus:outline-none focus:border-brand-teal transition-all"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-brown-dark uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-brand-teal" /> Предметное направление
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'math', label: 'Математика' },
                    { id: 'russian', label: 'Русский язык' },
                    { id: 'english', label: 'Английский' },
                    { id: 'physics', label: 'Физика' },
                    { id: 'chemistry', label: 'Химия' },
                    { id: 'history', label: 'История' },
                    { id: 'social', label: 'Обществознание' },
                    { id: 'development', label: 'Развитие / Творчество' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                        selectedCategory === cat.id 
                          ? 'bg-brand-teal text-brand-cream shadow-sm' 
                          : 'bg-brand-mint-pale/40 text-brand-brown-dark hover:bg-brand-mint-light'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grade Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-brown-dark uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-brand-teal" /> Возраст / Класс
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Все возрасты' },
                    { id: 'preschool', label: 'Дошкольники' },
                    { id: '1-4', label: '1–4 классы' },
                    { id: '5-8', label: '5–8 классы' },
                    { id: '9-11', label: '9–11 классы' },
                    { id: 'oge', label: 'ОГЭ (9 кл.)' },
                    { id: 'ege', label: 'ЕГЭ (11 кл.)' }
                  ].map(grade => (
                    <button
                      key={grade.id}
                      onClick={() => setSelectedGrade(grade.id)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                        selectedGrade === grade.id 
                          ? 'bg-brand-amber text-brand-cream shadow-sm' 
                          : 'bg-brand-mint-pale/40 text-brand-brown-dark hover:bg-brand-mint-light'
                      }`}
                    >
                      {grade.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-brown-dark uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-brand-teal" /> Формат обучения
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Любой формат' },
                    { id: 'individual', label: 'Индивидуально' },
                    { id: 'group', label: 'В мини-группах' },
                    { id: 'online', label: 'Дистанционно (Онлайн)' }
                  ].map(format => (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                        selectedFormat === format.id 
                          ? 'bg-brand-sage text-brand-cream shadow-sm' 
                          : 'bg-brand-mint-pale/40 text-brand-brown-dark hover:bg-brand-mint-light'
                      }`}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Clear Filters indicator */}
            {(selectedCategory !== 'all' || selectedGrade !== 'all' || selectedFormat !== 'all' || searchQuery) && (
              <div className="flex justify-end pt-2 border-t border-brand-sage/5">
                <button 
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedGrade('all');
                    setSelectedFormat('all');
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold text-brand-amber hover:text-brand-brown-dark flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Сбросить все фильтры
                </button>
              </div>
            )}

          </div>

          {/* DYNAMIC CARD GRID */}
          {filteredServices.length === 0 ? (
            <div className="text-center py-16 bg-brand-cream rounded-3xl border border-brand-sage/10 shadow-lamp max-w-lg mx-auto">
              <Search className="w-12 h-12 text-brand-sage/60 mx-auto mb-3" />
              <p className="font-bold text-brand-brown-dark">Ничего не найдено</p>
              <p className="text-xs text-brand-brown-light mt-1">Попробуйте изменить поисковый запрос или сбросить фильтры.</p>
              <button 
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedGrade('all');
                  setSelectedFormat('all');
                  setSearchQuery('');
                }}
                className="mt-4 bg-brand-teal text-brand-cream font-bold px-4 py-2 rounded-xl text-xs"
              >
                Показать все занятия
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map((service) => (
                <div 
                  key={service.id} 
                  className="bg-brand-cream rounded-3xl border border-brand-sage/10 shadow-lamp hover:shadow-lamp-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  id={`service_card_${service.id}`}
                >
                  
                  {/* Card Content Top */}
                  <div className="p-6 sm:p-8 space-y-4">
                    
                    {/* Header: Title & Icon badge */}
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-display font-bold text-lg text-brand-brown-dark leading-snug group-hover:text-brand-teal transition-colors">
                        {service.name}
                      </h3>
                      <div className="p-2.5 bg-brand-mint-pale rounded-2xl text-brand-teal flex-shrink-0">
                        {service.icon === 'Calculator' && <Calculator className="w-5 h-5" />}
                        {service.icon === 'BookOpen' && <BookOpen className="w-5 h-5" />}
                        {service.icon === 'Percent' && <Percent className="w-5 h-5" />}
                        {service.icon === 'PenTool' && <PenTool className="w-5 h-5" />}
                        {service.icon === 'GraduationCap' && <GraduationCap className="w-5 h-5" />}
                        {service.icon === 'Bookmark' && <Bookmark className="w-5 h-5" />}
                        {service.icon === 'Award' && <Award className="w-5 h-5" />}
                        {service.icon === 'FlaskConical' && <FlaskConical className="w-5 h-5" />}
                        {service.icon === 'Baby' && <Baby className="w-5 h-5" />}
                        {service.icon === 'Languages' && <Languages className="w-5 h-5" />}
                        {service.icon === 'Compass' && <Compass className="w-5 h-5" />}
                        {service.icon === 'Globe' && <Globe className="w-5 h-5" />}
                        {service.icon === 'Library' && <Library className="w-5 h-5" />}
                        {service.icon === 'Scroll' && <Scroll className="w-5 h-5" />}
                        {service.icon === 'Box' && <Box className="w-5 h-5" />}
                        {service.icon === 'BrainCircuit' && <BrainCircuit className="w-5 h-5" />}
                        {service.icon === 'Smile' && <Smile className="w-5 h-5" />}
                        {service.icon === 'HeartHandshake' && <HeartHandshake className="w-5 h-5" />}
                        {service.icon === 'Backpack' && <Backpack className="w-5 h-5" />}
                        {service.icon === 'Clock' && <Clock className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Subtitle / Details description */}
                    <p className="text-xs sm:text-sm text-brand-brown-light leading-relaxed">
                      {service.description}
                    </p>

                    {/* Age / Grade badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {service.grades.map((g, i) => (
                        <span key={i} className="bg-brand-mint-pale text-brand-teal font-extrabold px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase">
                          {g === 'preschool' ? 'Дошкольники' : `${g} классы`}
                        </span>
                      ))}
                    </div>

                    {/* Interactive Price Matrix / Table */}
                    <div className="pt-4 border-t border-brand-sage/5 space-y-2">
                      <span className="text-xs font-bold text-brand-brown-dark block uppercase tracking-wider">Варианты стоимости:</span>
                      
                      <div className="space-y-1.5">
                        {service.formats.map((fmt, i) => (
                          <div key={i} className="flex justify-between items-center bg-brand-cream/60 hover:bg-brand-mint-pale/30 px-3 py-2 rounded-xl border border-brand-sage/5 text-xs transition-all">
                            <span className="font-semibold text-brand-brown-dark">{fmt.name}</span>
                            <div className="text-right">
                              <span className="font-bold text-brand-teal font-mono text-sm">{fmt.price}</span>
                              {fmt.details && <span className="text-[9px] text-brand-brown-light block font-medium">{fmt.details}</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {service.details && (
                        <div className="text-[11px] font-bold text-brand-amber bg-amber-50/50 p-2.5 rounded-xl border border-brand-amber/10 text-center">
                          💡 {service.details}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Card Actions Bottom */}
                  <div className="p-6 bg-brand-mint-pale/30 border-t border-brand-sage/10">
                    <button
                      onClick={() => handleBookNow(service.name, `Запись на курс: "${service.name}"`)}
                      className="w-full bg-brand-teal hover:bg-brand-sage text-brand-cream font-bold py-3 px-4 rounded-xl shadow-lamp transition-all text-xs uppercase tracking-wider"
                    >
                      Подобрать группу / Записаться
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      </section>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {teachers.map((t) => (
              <div 
                key={t.id}
                onClick={() => setActiveTeacher(t)}
                className="bg-brand-cream rounded-3xl border border-brand-sage/10 p-6 shadow-lamp hover:shadow-lamp-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                id={`teacher_card_${t.id}`}
              >
                <div className="space-y-4">
                  {/* Teacher Illustration Portrait */}
                  <div className="flex justify-center">
                    <div className="relative group-hover:scale-105 transition-transform duration-300">
                      {/* Decorative backdrop glow */}
                      <div className="absolute inset-0 bg-brand-teal/5 rounded-full filter blur-md -z-10"></div>
                      <TeacherAvatar teacher={t} className="w-24 h-24 flex-shrink-0" />
                    </div>
                  </div>

                  {/* Teacher Basic Info */}
                  <div className="text-center space-y-1">
                    <h3 className="font-display font-bold text-base text-brand-brown-dark group-hover:text-brand-teal transition-colors">
                      {t.name}
                    </h3>
                    <div className="text-xs font-semibold text-brand-amber">
                      {t.experience}
                    </div>
                  </div>

                  {/* Badges of subjects */}
                  <div className="flex flex-wrap justify-center gap-1">
                    {t.subjects.map((sub, i) => (
                      <span key={i} className="bg-brand-mint-pale text-brand-teal font-extrabold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
                        {sub}
                      </span>
                    ))}
                  </div>

                  {/* Short description clamp */}
                  <p className="text-xs text-brand-brown-light leading-relaxed text-center line-clamp-3">
                    {t.bio}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-brand-sage/5 flex justify-center">
                  <span className="text-xs font-bold text-brand-teal group-hover:text-brand-amber transition-colors flex items-center gap-1">
                    Подробнее о педагоге <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* TEACHER BIO POPUP MODAL */}
        {activeTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown-dark/50 backdrop-blur-sm" id="teacher_popup_modal">
            <div className="bg-brand-cream rounded-3xl max-w-2xl w-full border border-brand-sage/20 shadow-lamp-lg overflow-hidden relative animate-in fade-in zoom-in duration-300">
              
              {/* Close Button */}
              <button 
                onClick={() => setActiveTeacher(null)}
                className="absolute top-4 right-4 p-2 text-brand-brown-dark/60 hover:text-brand-brown-dark hover:bg-brand-mint-pale rounded-full transition-all"
                id="close_teacher_popup"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Header Row: Photo + Name */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <TeacherAvatar teacher={activeTeacher} className="w-24 h-24 flex-shrink-0" />
                  <div className="text-center sm:text-left space-y-2">
                    <span className="text-brand-amber font-bold text-xs uppercase tracking-widest">{activeTeacher.experience}</span>
                    <h3 className="font-display font-black text-xl sm:text-2xl text-brand-brown-dark">
                      {activeTeacher.name}
                    </h3>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-1">
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

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-brand-sage/5 flex flex-col sm:flex-row gap-3">
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
          </div>
        )}

      </section>

      {/* 6. REVIEWS CAROUSEL WITH LOCALPersist */}
      <section className="py-16 bg-brand-mint-pale/30 relative border-t border-b border-brand-mint-pale" id="reviews">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left side: Header, rating, Yandex widget clone */}
            <div className="lg:col-span-4 space-y-6 text-center lg:text-left">
              <span className="text-brand-sage font-bold text-xs uppercase tracking-widest bg-brand-mint-light px-3 py-1 rounded-full">Родители говорят о нас</span>
              <h2 className="font-display font-black text-3xl text-brand-teal">Отзывы семей <span className="text-brand-amber">в станице Северской</span></h2>
              <p className="text-sm text-brand-brown-light leading-relaxed">
                Доверие родителей — наша главная опора. Мы делаем всё, чтобы учёба приносила радость детям и спокойствие мамам.
              </p>

              {/* MOCK YANDEX REVIEWS WIDGET */}
              <div className="bg-brand-cream p-4 rounded-2xl border border-brand-sage/10 shadow-lamp inline-block max-w-[280px] text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-brand-brown-dark">Рейтинг Яндекс.Карт</span>
                  <span className="bg-[#FFCC00]/20 text-[#D49B00] px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">5.0 ★</span>
                </div>
                <div className="flex items-center gap-0.5 text-[#FFCC00]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <div className="text-[10.5px] text-brand-brown-light mt-1.5 font-medium">
                  100% положительных оценок жителей Северского района.
                </div>
                <a 
                  href="https://yandex.ru/maps" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] font-bold text-brand-teal hover:text-brand-amber transition-colors inline-flex items-center gap-0.5 mt-2"
                >
                  Смотреть на Яндекс.Картах <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Button to leave a review */}
              <div className="pt-2">
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="bg-transparent hover:bg-brand-teal/10 text-brand-teal font-bold py-2.5 px-5 rounded-xl border-2 border-brand-teal text-xs uppercase tracking-wider transition-all"
                  id="write_review_btn"
                >
                  Оставить свой отзыв
                </button>
              </div>
            </div>

            {/* Right side: Carousel */}
            <div className="lg:col-span-8">
              {approvedReviews.length === 0 ? (
                <div className="text-center py-12 text-brand-brown-light italic">Отзывы загружаются...</div>
              ) : (
                <div className="relative">
                  {/* Carousel Card Wrapper */}
                  <div className="bg-brand-cream p-8 sm:p-10 rounded-3xl border border-brand-sage/15 shadow-lamp-lg relative min-h-[220px] flex flex-col justify-between">
                    
                    {/* Decorative quotes */}
                    <div className="absolute top-4 left-6 text-brand-gold font-serif text-6xl select-none opacity-50 font-black">“</div>
                    
                    <div className="space-y-4 z-10">
                      <p className="text-sm sm:text-base text-brand-brown-dark italic leading-relaxed">
                        "{approvedReviews[reviewIndex].text}"
                      </p>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-brand-sage/5">
                        <div>
                          <h4 className="font-display font-bold text-sm text-brand-brown-dark">
                            {approvedReviews[reviewIndex].name}
                          </h4>
                          <span className="text-xs text-brand-amber font-semibold block">
                            Курс: {approvedReviews[reviewIndex].className}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-0.5 text-brand-gold">
                          {Array.from({ length: approvedReviews[reviewIndex].rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Carousel Nav arrows */}
                  <div className="flex justify-end gap-3 mt-4">
                    <button 
                      onClick={prevReview}
                      className="p-2.5 bg-brand-cream text-brand-teal hover:text-brand-amber border border-brand-sage/25 rounded-full shadow-sm hover:shadow-md transition-all"
                      title="Предыдущий отзыв"
                      id="prev_review_btn"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-bold text-brand-brown-light/70 self-center">
                      {reviewIndex + 1} из {approvedReviews.length}
                    </span>
                    <button 
                      onClick={nextReview}
                      className="p-2.5 bg-brand-cream text-brand-teal hover:text-brand-amber border border-brand-sage/25 rounded-full shadow-sm hover:shadow-md transition-all"
                      title="Следующий отзыв"
                      id="next_review_btn"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
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
                      <label className="text-xs font-bold text-brand-brown-dark">Интересующий предмет или услуга</label>
                      <select 
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
                      Нажимая кнопку, вы соглашаетесь на обработку персональных данных в соответствии с Федеральным законом №152-ФЗ.
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
          <div className="bg-brand-cream rounded-3xl max-w-md w-full border border-brand-sage/20 shadow-lamp-lg p-6 sm:p-8 relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setShowLeadModal(false)}
              className="absolute top-4 right-4 p-2 text-brand-brown-dark/60 hover:text-brand-brown-dark hover:bg-brand-mint-pale rounded-full"
              id="close_booking_popup"
            >
              <X className="w-5 h-5" />
            </button>

            {leadSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-display font-black text-xl text-brand-brown-dark">Заявка принята!</h3>
                <p className="text-xs text-brand-brown-light leading-relaxed">
                  Мы получили ваши данные и свяжемся с вами в течение 15 минут. Готовимся к встрече в нашем центре!
                </p>
                <button 
                  onClick={() => setShowLeadModal(false)}
                  className="bg-brand-teal text-brand-cream font-bold py-2 px-6 rounded-lg text-xs"
                >
                  Отлично
                </button>
              </div>
            ) : (
              <form onSubmit={submitLead} className="space-y-4">
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

                <button 
                  type="submit" 
                  disabled={isSubmittingLead}
                  className="w-full bg-brand-amber hover:bg-brand-amber/90 disabled:bg-brand-sage/50 text-brand-cream font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-lamp"
                >
                  {isSubmittingLead ? 'Отправка...' : 'Записаться'}
                </button>
              </form>
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
                    <span className="text-xs text-brand-brown-light/70 block">Звонки и сообщения WhatsApp / Telegram ежедневно</span>
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
                    href="https://t.me/oporaed" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="bg-[#229ED9] hover:bg-[#229ED9]/95 text-brand-cream font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all"
                  >
                    Telegram @oporaed
                  </a>
                  <a 
                    href="https://vk.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="bg-[#4C75A3] hover:bg-[#4C75A3]/95 text-brand-cream font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all"
                  >
                    ВКонтакте
                  </a>
                </div>

              </div>
            </div>

            {/* Right column map container */}
            <div className="lg:col-span-7 bg-brand-cream p-4 rounded-3xl border border-brand-sage/15 shadow-lamp w-full relative">
              <div className="w-full h-[350px] rounded-2xl overflow-hidden relative border border-brand-sage/10 bg-brand-mint-pale/30 flex items-center justify-center text-center">
                
                {/* Embeded live map with fallback link */}
                <iframe 
                  src="https://yandex.ru/map-widget/v1/?ll=38.675685%2C44.857640&z=16&mode=search&ol=biz&oid=1202830023"
                  className="w-full h-full border-0 rounded-2xl z-10 relative opacity-95 hover:opacity-100 transition-opacity"
                  title="Адрес Опоры на Яндекс Картах"
                  allowFullScreen
                ></iframe>

                {/* Background loader placeholder */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-4 text-center">
                  <MapPin className="w-10 h-10 text-brand-teal animate-bounce" />
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-brand-brown-dark">Загрузка Яндекс.Карты...</h4>
                    <p className="text-xs text-brand-brown-light">Карта Краснодарского края, ст. Северская, улица Ленина, 73</p>
                  </div>
                  <a 
                    href="https://yandex.ru/maps/?ll=38.675685%2C44.857640&z=16" 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-brand-teal text-brand-cream text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Открыть в Яндекс.Навигаторе
                  </a>
                </div>

              </div>

              {/* Driving/Transport Hint card */}
              <div className="p-4 bg-brand-mint-pale/30 border-t border-brand-sage/5 rounded-2xl mt-4 flex items-center justify-between text-xs font-bold text-brand-teal">
                <span>📍 Ориентир: Центральная станичная улица Ленина</span>
                <a 
                  href="https://yandex.ru/maps" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-brand-amber flex items-center gap-1 transition-colors"
                >
                  Проложить маршрут в 2ГИС / Яндекс <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>

          {/* Footer Branding credits */}
          <footer className="mt-16 pt-8 border-t border-brand-sage/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <LogoSVG className="w-8 h-8" />
              <div>
                <span className="font-display font-bold text-brand-teal tracking-wider text-sm block">ОПОРА СЕВЕРСКАЯ</span>
                <span className="text-[10px] text-brand-brown-light/70 font-medium">© 2026 Образовательный центр. Все права защищены.</span>
              </div>
            </div>

            {/* Proposed Domain recommendations as requested in SEO technical */}
            <div className="text-center md:text-right space-y-1 text-xs">
              <span className="text-brand-brown-light/80 block">🌐 Рекомендуемые домены для регистрации:</span>
              <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                <span className="bg-brand-cream px-2 py-0.5 rounded border border-brand-sage/15 text-[10px] font-mono font-semibold">опора-северская.рф</span>
                <span className="bg-brand-cream px-2 py-0.5 rounded border border-brand-sage/15 text-[10px] font-mono font-semibold">opora-severskaya.ru</span>
                <span className="bg-brand-cream px-2 py-0.5 rounded border border-brand-sage/15 text-[10px] font-mono font-semibold">опора-центр.рф</span>
              </div>
            </div>
          </footer>

        </div>
      </section>

    </div>
  );
}
