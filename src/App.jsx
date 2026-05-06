// src/App.jsx
import { useState, useEffect, useMemo } from "react";
import { AppProvider, useApp } from './store/AppContext';
import { T } from './utils/theme';
import './index.css';

// Импорт всех секций
import { TodaySection } from './sections/TodaySection';
import { ScheduleSection } from './sections/ScheduleSection';
import { WorkSection } from './sections/WorkSection';
import { HomeSection } from './sections/HomeSection';
import { ShoppingSection } from './sections/ShoppingSection';
import { PetsSection } from './sections/PetsSection';
import { CarSection } from './sections/CarSection';
import { HealthSection } from './sections/HealthSection';
import { BeautySection } from './sections/BeautySection';
import { HobbiesSection } from './sections/HobbiesSection';
import { GoalsSection } from './sections/GoalsSection';
import { MentalSection } from './sections/MentalSection';
import { TravelSection } from './sections/TravelSection';
import { JournalSection } from './sections/JournalSection';
import { ProfileSection } from './sections/ProfileSection';

// Импорт компонента онбординга (если вынесен в отдельный файл)
// Если Onboarding еще внутри старого App.jsx, убедитесь, что вынесли его или импортируйте здесь
import { Onboarding } from './components/Onboarding'; 

// Хелпер для получения фазы луны (используется в шапке)
function getMoon(dt = new Date()) {
  const p = ((dt - new Date("2024-01-11")) / 86400000 % 29.53 + 29.53) % 29.53;
  if (p < 1.85) return { n: "Новолуние", e: "🌑", t: "Начало" };
  if (p < 7.38) return { n: "Растущая", e: "🌒", t: "Рост" };
  if (p < 14.76) return { n: "Полнолуние", e: "🌕", t: "Пик" };
  return { n: "Убывающая", e: "🌖", t: "Итоги" };
}

// --- Компонент содержимого приложения ---
function AppContent() {
  const { profile, sections, setSections } = useApp();
  const [active, setActive] = useState("today");
  const [isLoaded, setIsLoaded] = useState(false);

  // Миграция: проверка и добавление недостающих разделов
  useEffect(() => {
    if (profile && sections.length > 0) {
      const existingIds = new Set(sections.map(s => s.id));
      // Стандартный список всех доступных разделов
      const DEF_SECTIONS = [
        {id: "today",    emoji: "☀️",  name: "Сегодня",     vis: true},
        {id: "schedule", emoji: "🗓️",  name: "Расписание", vis: true},        {id: "work",     emoji: "💼",  name: "Работа",     vis: true},
        {id: "home",     emoji: "🏡",  name: "Дом",        vis: true},
        {id: "shopping", emoji: "🛒",  name: "Покупки",    vis: true},
        {id: "pets",     emoji: "🐾",  name: "Питомцы",    vis: true},
        {id: "car",      emoji: "🚗",  name: "Авто",       vis: true},
        {id: "health",   emoji: "🌿",  name: "Здоровье",   vis: true},
        {id: "beauty",   emoji: "✨",  name: "Уход",       vis: true},
        {id: "hobbies",  emoji: "🎨",  name: "Хобби",      vis: true},
        {id: "goals",    emoji: "🎯",  name: "Мои цели",   vis: true},
        {id: "mental",   emoji: "🧘",  name: "Ментальное", vis: true},
        {id: "travel",   emoji: "✈️",  name: "Поездки",    vis: true},
        {id: "journal",  emoji: "📖",  name: "Журнал",     vis: true},
        {id: "profile",  emoji: "👤",  name: "Профиль",    vis: true},
      ];

      const newSections = [...sections];
      let changed = false;

      // Добавляем разделы, которых нет в списке пользователя
      DEF_SECTIONS.forEach(def => {
        if (!existingIds.has(def.id)) {
          newSections.push(def);
          changed = true;
        }
      });

      if (changed) {
        setSections(newSections);
      }
    }
    setIsLoaded(true);
  }, [profile, sections, setSections]);

  if (!isLoaded) return null;

  // Если профиля нет — показываем онбординг
  if (!profile) {
    return <Onboarding />;
  }

  const activeSection = sections.find(s => s.id === active) || sections[0];
  const moon = getMoon();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="app">
      <div className="ambient" />
      
      {/* SIDEBAR (Боковое меню) */}
      <nav className="sidebar">        <div className="s-logo">LD</div>
        {sections.map(s => (
          <div 
            key={s.id} 
            className={`s-nav ${!s.vis ? 'dim' : ''} ${active === s.id ? 'act' : ''}`}
            onClick={() => s.vis && setActive(s.id)}
            title={s.name}
          >
            <span className="s-ico">{s.emoji}</span>
            <span className="s-lbl">{s.name.slice(0, 5)}</span>
          </div>
        ))}
      </nav>

      {/* MAIN CONTENT (Основная область) */}
      <div className="main">
        {/* HEADER (Шапка) */}
        <div className="hdr">
           <div className="hdr-l">
             <div className="hdr-title">{activeSection.name}</div>
             <div className="hdr-sub">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div>
           </div>
           <div className="hdr-r">
             <div className="moon-tag">{moon.e} {moon.n}</div>
             <div className="date-tag">{today}</div>
           </div>
        </div>

        {/* SECTIONS (Рендеринг активной секции) */}
        <div className="page">
           {active === 'today' && <TodaySection />}
           {active === 'schedule' && <ScheduleSection />}
           {active === 'work' && <WorkSection />}
           {active === 'home' && <HomeSection />}
           {active === 'shopping' && <ShoppingSection />}
           {active === 'pets' && <PetsSection />}
           {active === 'car' && <CarSection />}
           {active === 'health' && <HealthSection />}
           {active === 'beauty' && <BeautySection />}
           {active === 'hobbies' && <HobbiesSection />}
           {active === 'goals' && <GoalsSection />}
           {active === 'mental' && <MentalSection />}
           {active === 'travel' && <TravelSection />}
           {active === 'journal' && <JournalSection />}
           {active === 'profile' && <ProfileSection />}
        </div>
      </div>
    </div>
  );
}
// --- Главный экспорт приложения ---
export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
