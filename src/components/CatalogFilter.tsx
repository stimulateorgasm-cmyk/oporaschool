/**
 * CatalogFilter — пошаговый интерактивный подбор занятий
 * Предмет → Класс → Педагог → Формат → Цена + Запись
 */
import React, { useState, useMemo } from 'react';
import {
  Calculator, BookOpen, Percent, PenTool, GraduationCap, Bookmark, Award,
  FlaskConical, Baby, Languages, Compass, Globe, Library, Scroll, Box,
  BrainCircuit, Smile, HeartHandshake, Backpack, Clock, ChevronRight,
  ArrowLeft, Check, User, Sparkles, Phone
} from 'lucide-react';
import { SERVICE_ITEMS, TEACHER_LINKS, INDIVIDUAL_ONLY_CATEGORIES } from '../data';
import { Teacher } from '../types';
import { TeacherAvatar } from './Illustrations';

interface CatalogFilterProps {
  teachers: Teacher[];
  onBookNow: (subject: string, comment: string) => void;
}

type Step = 'subject' | 'grade' | 'teacher' | 'format' | 'result';

const SUBJECT_CATEGORIES = [
  { id: 'math', label: 'Математика', icon: Calculator, color: 'text-blue-600 bg-blue-50', border: 'border-blue-200 hover:border-blue-400' },
  { id: 'russian', label: 'Русский язык', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-200 hover:border-emerald-400' },
  { id: 'english', label: 'Английский язык', icon: Languages, color: 'text-violet-600 bg-violet-50', border: 'border-violet-200 hover:border-violet-400' },
  { id: 'physics', label: 'Физика', icon: Compass, color: 'text-orange-600 bg-orange-50', border: 'border-orange-200 hover:border-orange-400' },
  { id: 'chemistry', label: 'Химия', icon: FlaskConical, color: 'text-red-600 bg-red-50', border: 'border-red-200 hover:border-red-400' },
  { id: 'history', label: 'История', icon: Library, color: 'text-amber-600 bg-amber-50', border: 'border-amber-200 hover:border-amber-400' },
  { id: 'social', label: 'Обществознание', icon: Award, color: 'text-cyan-600 bg-cyan-50', border: 'border-cyan-200 hover:border-cyan-400' },
  { id: 'literature', label: 'Литература', icon: Scroll, color: 'text-rose-600 bg-rose-50', border: 'border-rose-200 hover:border-rose-400' },
  { id: 'development', label: 'Развитие / Творчество', icon: Sparkles, color: 'text-pink-600 bg-pink-50', border: 'border-pink-200 hover:border-pink-400' },
  { id: 'preschool', label: 'Подготовка к школе', icon: Baby, color: 'text-fuchsia-600 bg-fuchsia-50', border: 'border-fuchsia-200 hover:border-fuchsia-400' },
  { id: 'creativity', label: '3D-моделирование', icon: Box, color: 'text-lime-600 bg-lime-50', border: 'border-lime-200 hover:border-lime-400' },
  { id: 'other', label: 'Продлёнка', icon: Clock, color: 'text-teal-600 bg-teal-50', border: 'border-teal-200 hover:border-teal-400' },
];

const GRADE_OPTIONS = [
  { id: 'preschool', label: 'Дошкольники', emoji: '🧸' },
  { id: '1-4', label: '1–4 классы', emoji: '📚' },
  { id: '5-8', label: '5–8 классы', emoji: '📐' },
  { id: '9-11', label: '9–11 классы', emoji: '🎓' },
];

const FORMAT_OPTIONS = [
  { id: 'individual', label: 'Индивидуально', desc: '1 на 1 с педагогом' },
  { id: 'group', label: 'В мини-группе', desc: '2–5 человек' },
  { id: 'online', label: 'Онлайн', desc: 'Дистанционно' },
];

const STEPS: { id: Step; label: string; num: number }[] = [
  { id: 'subject', label: 'Предмет', num: 1 },
  { id: 'grade', label: 'Класс', num: 2 },
  { id: 'teacher', label: 'Педагог', num: 3 },
  { id: 'format', label: 'Формат', num: 4 },
  { id: 'result', label: 'Цена', num: 5 },
];

export default function CatalogFilter({ teachers, onBookNow }: CatalogFilterProps) {
  const [step, setStep] = useState<Step>('subject');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  const resetAll = () => {
    setStep('subject');
    setSelectedCategory('');
    setSelectedGrade('');
    setSelectedTeacherId('');
    setSelectedFormat('');
  };

  // Доступные классы для выбранного предмета
  const availableGrades = useMemo(() => {
    if (!selectedCategory) return [];
    const services = SERVICE_ITEMS.filter(s => s.category === selectedCategory);
    const gradeSet = new Set<string>();
    services.forEach(s => s.grades.forEach(g => gradeSet.add(g)));
    return GRADE_OPTIONS.filter(g => gradeSet.has(g.id));
  }, [selectedCategory]);

  // Услуги после выбора предмета + класса
  const filteredServices = useMemo(() => {
    return SERVICE_ITEMS.filter(s => {
      if (selectedCategory && s.category !== selectedCategory) return false;
      if (selectedGrade && !s.grades.includes(selectedGrade)) return false;
      return true;
    });
  }, [selectedCategory, selectedGrade]);

  // Педагоги для выбранных предмета + класса
  const availableTeachers = useMemo(() => {
    if (!selectedCategory || !selectedGrade) return [];
    const links = TEACHER_LINKS.filter(
      l => l.category === selectedCategory && l.grades.includes(selectedGrade)
    );
    return teachers.filter(t => links.some(l => l.teacherId === t.id));
  }, [selectedCategory, selectedGrade, teachers]);

  // Доступные форматы
  const availableFormats = useMemo(() => {
    if (filteredServices.length === 0) return [];
    const isIndividualOnly = INDIVIDUAL_ONLY_CATEGORIES.includes(selectedCategory);
    const formatSet = new Set<string>();

    filteredServices.forEach(service => {
      service.formats.forEach(f => {
        const name = f.name.toLowerCase();
        if (name.includes('индивидуально') || name.includes('консультация')) {
          formatSet.add('individual');
        }
        if (!isIndividualOnly) {
          if (name.includes('группа') || name.includes('абонемент')) {
            formatSet.add('group');
          }
          if (name.includes('онлайн')) {
            formatSet.add('online');
          }
        }
      });
    });

    return FORMAT_OPTIONS.filter(f => formatSet.has(f.id));
  }, [filteredServices, selectedCategory]);

  // Финальная услуга + цена
  const resultService = useMemo(() => {
    if (!selectedCategory || !selectedGrade || !selectedFormat) return null;
    let best = filteredServices[0];
    const exactGrade = filteredServices.filter(s => s.grades.includes(selectedGrade));
    if (exactGrade.length > 0) best = exactGrade[0];
    return best;
  }, [filteredServices, selectedCategory, selectedGrade, selectedFormat]);

  const resultFormat = useMemo(() => {
    if (!resultService || !selectedFormat) return null;
    const fmtName = selectedFormat === 'individual' ? 'индивидуально' :
                    selectedFormat === 'group' ? 'группа' :
                    selectedFormat === 'online' ? 'онлайн' : '';
    return resultService.formats.find(f => f.name.toLowerCase().includes(fmtName)) || resultService.formats[0];
  }, [resultService, selectedFormat]);

  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId) || null;
  }, [teachers, selectedTeacherId]);

  const goToStep = (s: Step) => setStep(s);

  const handleSubjectSelect = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedGrade('');
    setSelectedTeacherId('');
    setSelectedFormat('');
    setStep('grade');
  };

  const handleGradeSelect = (gradeId: string) => {
    setSelectedGrade(gradeId);
    setSelectedTeacherId('');
    setSelectedFormat('');
    setStep('teacher');
  };

  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setSelectedFormat('');
    setStep('format');
  };

  const handleFormatSelect = (formatId: string) => {
    setSelectedFormat(formatId);
    setStep('result');
  };

  const handleBooking = () => {
    const subject = resultService?.name || selectedCategory;
    const teacherName = selectedTeacher ? `\nПедагог: ${selectedTeacher.name}` : '';
    const formatName = FORMAT_OPTIONS.find(f => f.id === selectedFormat)?.label || '';
    const gradeName = GRADE_OPTIONS.find(g => g.id === selectedGrade)?.label || '';
    onBookNow(subject, `Запись через подбор: ${subject}, ${gradeName}, ${formatName}${teacherName}`);
  };

  const currentStepNum = STEPS.find(s => s.id === step)?.num || 1;
  const categoryLabel = SUBJECT_CATEGORIES.find(c => c.id === selectedCategory)?.label || '';
  const gradeLabel = GRADE_OPTIONS.find(g => g.id === selectedGrade)?.label || '';

  return (
    <section className="py-16 bg-brand-mint-pale/20 relative" id="services">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-brand-sage font-bold text-xs uppercase tracking-widest bg-brand-mint-light px-3 py-1 rounded-full">
            Каталог занятий
          </span>
          <h2 className="font-display font-black text-3xl text-brand-teal mt-2">
            Подберите занятие за <span className="text-brand-amber">30 секунд</span>
          </h2>
          <p className="text-sm text-brand-brown-light mt-2 italic">
            Выберите предмет, класс и формат — мы покажем цену и свободных педагогов.
          </p>
        </div>

        {/* Индикатор шагов */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 flex-wrap">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                onClick={() => { if (s.num <= currentStepNum) goToStep(s.id); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  s.num < currentStepNum
                    ? 'bg-brand-teal/10 text-brand-teal cursor-pointer hover:bg-brand-teal/20'
                    : s.num === currentStepNum
                    ? 'bg-brand-teal text-white shadow-md'
                    : 'bg-gray-100 text-gray-400 cursor-default'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  s.num < currentStepNum ? 'bg-brand-teal text-white' :
                  s.num === currentStepNum ? 'bg-white text-brand-teal' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {s.num < currentStepNum ? '✓' : s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Карточка шага */}
        <div className="bg-brand-cream rounded-3xl border border-brand-sage/10 shadow-lamp p-6 sm:p-8 min-h-[320px] transition-all duration-300">

          {/* ШАГ 1: ПРЕДМЕТ */}
          {step === 'subject' && (
            <div className="space-y-6">
              <h3 className="font-display font-bold text-xl text-brand-brown-dark text-center">
                Что будем подтягивать?
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {SUBJECT_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const hasServices = SERVICE_ITEMS.some(s => s.category === cat.id);
                  if (!hasServices) return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleSubjectSelect(cat.id)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all duration-200 ${cat.border} ${cat.color} hover:shadow-md hover:-translate-y-0.5`}
                    >
                      <Icon className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-xs font-bold text-brand-brown-dark leading-tight block">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ШАГ 2: КЛАСС */}
          {step === 'grade' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => goToStep('subject')} className="p-2 hover:bg-brand-mint-pale rounded-xl transition-colors">
                  <ArrowLeft className="w-5 h-5 text-brand-sage" />
                </button>
                <div>
                  <h3 className="font-display font-bold text-xl text-brand-brown-dark">
                    {categoryLabel} — какой класс?
                  </h3>
                  <p className="text-xs text-brand-brown-light mt-0.5">Выберите возрастную группу</p>
                </div>
              </div>

              {availableGrades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-brand-brown-light text-sm">Для этого предмета пока нет программ.</p>
                  <button onClick={() => goToStep('subject')} className="mt-3 text-brand-teal font-bold text-sm hover:underline">
                    ← Вернуться к выбору предмета
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {availableGrades.map(g => (
                    <button
                      key={g.id}
                      onClick={() => handleGradeSelect(g.id)}
                      className="p-5 rounded-2xl border-2 border-brand-sage/20 hover:border-brand-teal hover:bg-brand-mint-pale/30 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    >
                      <span className="text-3xl block mb-2">{g.emoji}</span>
                      <span className="text-sm font-bold text-brand-brown-dark block">{g.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ШАГ 3: ПЕДАГОГ */}
          {step === 'teacher' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => goToStep('grade')} className="p-2 hover:bg-brand-mint-pale rounded-xl transition-colors">
                  <ArrowLeft className="w-5 h-5 text-brand-sage" />
                </button>
                <div>
                  <h3 className="font-display font-bold text-xl text-brand-brown-dark">
                    {categoryLabel}, {gradeLabel} — выберите педагога
                  </h3>
                  <p className="text-xs text-brand-brown-light mt-0.5">Или пропустите — администратор подберёт специалиста</p>
                </div>
              </div>

              {availableTeachers.length === 0 ? (
                <div className="text-center py-8 bg-brand-mint-pale/30 rounded-2xl">
                  <User className="w-10 h-10 text-brand-sage/60 mx-auto mb-2" />
                  <p className="text-brand-brown-light text-sm">Педагог уточняется — администратор подберёт специалиста.</p>
                  <button
                    onClick={() => handleTeacherSelect('')}
                    className="mt-4 bg-brand-teal text-brand-cream font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-brand-sage transition-colors"
                  >
                    Продолжить без выбора педагога
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableTeachers.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleTeacherSelect(t.id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-md ${
                          selectedTeacherId === t.id
                            ? 'border-brand-teal bg-brand-mint-pale/30'
                            : 'border-brand-sage/20 hover:border-brand-teal/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <TeacherAvatar teacher={t} className="w-14 h-14 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-brand-brown-dark">{t.name}</div>
                            <div className="text-xs text-brand-amber font-semibold">{t.experience}</div>
                            <div className="text-[10px] text-brand-brown-light mt-0.5 line-clamp-1">{t.subjects.join(', ')}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => handleTeacherSelect('')}
                      className="text-brand-sage hover:text-brand-teal font-bold text-sm transition-colors"
                    >
                      Пропустить — подберём педагога сами
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ШАГ 4: ФОРМАТ */}
          {step === 'format' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => goToStep('teacher')} className="p-2 hover:bg-brand-mint-pale rounded-xl transition-colors">
                  <ArrowLeft className="w-5 h-5 text-brand-sage" />
                </button>
                <div>
                  <h3 className="font-display font-bold text-xl text-brand-brown-dark">
                    {categoryLabel}, {gradeLabel} — формат занятий
                  </h3>
                  <p className="text-xs text-brand-brown-light mt-0.5">
                    {INDIVIDUAL_ONLY_CATEGORIES.includes(selectedCategory)
                      ? '⚠️ Для этого предмета доступны только индивидуальные занятия.'
                      : 'Выберите удобный формат обучения'}
                  </p>
                </div>
              </div>

              {availableFormats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-brand-brown-light text-sm">Нет доступных форматов. Вернитесь назад.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {availableFormats.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleFormatSelect(f.id)}
                      className="p-5 rounded-2xl border-2 border-brand-sage/20 hover:border-brand-teal hover:bg-brand-mint-pale/30 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="text-2xl mb-2">
                        {f.id === 'individual' ? '👤' : f.id === 'group' ? '👥' : '💻'}
                      </div>
                      <div className="font-bold text-sm text-brand-brown-dark">{f.label}</div>
                      <div className="text-xs text-brand-brown-light mt-1">{f.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ШАГ 5: РЕЗУЛЬТАТ + ЦЕНА */}
          {step === 'result' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => goToStep('format')} className="p-2 hover:bg-brand-mint-pale rounded-xl transition-colors">
                  <ArrowLeft className="w-5 h-5 text-brand-sage" />
                </button>
                <div>
                  <h3 className="font-display font-bold text-xl text-brand-brown-dark">
                    Отличный выбор! 🎉
                  </h3>
                  <p className="text-xs text-brand-brown-light mt-0.5">Вот что мы для вас подобрали:</p>
                </div>
              </div>

              {/* Сводка */}
              <div className="bg-brand-mint-pale/30 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-brand-sage/10">
                    <div className="text-[10px] text-brand-brown-light uppercase font-bold">Предмет</div>
                    <div className="font-bold text-sm text-brand-brown-dark">{categoryLabel}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-brand-sage/10">
                    <div className="text-[10px] text-brand-brown-light uppercase font-bold">Класс</div>
                    <div className="font-bold text-sm text-brand-brown-dark">{gradeLabel}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-brand-sage/10">
                    <div className="text-[10px] text-brand-brown-light uppercase font-bold">Формат</div>
                    <div className="font-bold text-sm text-brand-brown-dark">
                      {FORMAT_OPTIONS.find(f => f.id === selectedFormat)?.label || '—'}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-brand-sage/10">
                    <div className="text-[10px] text-brand-brown-light uppercase font-bold">Педагог</div>
                    <div className="font-bold text-sm text-brand-brown-dark">
                      {selectedTeacher ? selectedTeacher.name : 'Подберём сами'}
                    </div>
                  </div>
                </div>

                {/* Цена */}
                {resultFormat && (
                  <div className="bg-brand-teal text-white rounded-2xl p-5 text-center">
                    <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Стоимость занятия</div>
                    <div className="font-black text-3xl">{resultFormat.price}</div>
                    {resultFormat.details && (
                      <div className="text-xs opacity-80 mt-1">{resultFormat.details}</div>
                    )}
                  </div>
                )}

                {resultService?.details && (
                  <div className="text-xs font-bold text-brand-amber bg-amber-50/50 p-3 rounded-xl border border-brand-amber/10 text-center">
                    💡 {resultService.details}
                  </div>
                )}
              </div>

              {/* Кнопки */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleBooking}
                  className="flex-1 bg-brand-teal hover:bg-brand-sage text-brand-cream font-bold py-4 px-6 rounded-2xl shadow-lamp transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Записаться на занятие
                </button>
                <button
                  onClick={resetAll}
                  className="flex-1 border-2 border-brand-sage/20 hover:bg-brand-mint-pale/30 text-brand-brown-dark font-bold py-4 px-6 rounded-2xl transition-all text-sm"
                >
                  Подобрать другое занятие
                </button>
              </div>

              {resultService && (
                <p className="text-xs text-brand-brown-light text-center leading-relaxed">
                  {resultService.description}
                </p>
              )}
            </div>
          )}

        </div>

        {step !== 'subject' && (
          <div className="text-center mt-4">
            <button
              onClick={resetAll}
              className="text-xs font-bold text-brand-sage hover:text-brand-amber transition-colors"
            >
              Начать подбор заново
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
