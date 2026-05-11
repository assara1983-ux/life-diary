// src/App.jsx
import { useState, useEffect } from "react";
import { AppProvider, useApp } from './store/AppContext';
import { Onboarding } from './components/Onboarding';
import { T } from './utils/theme';
import './index.css';
import { useNotificationCheck } from './hooks/useNotificationCheck';
// ✅ ИСПРАВЛЕНО: getMoon импортируется из helpers, не дублируется
import { getMoon } from './utils/helpers';

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

// --- Компонент приложения ---
function AppContent() {
  const { profile, sections, setSections, notify, toastMsg } = useApp();
  const [active, setActive] = useState("today");
  const [isLoaded, setIsLoaded] = useState(false);

  useNotificationCheck();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => { console.log('SW registered: ', reg); })
          .catch(err => { console.log('SW registration failed: ', err); });
      });
    }
  }, []);

  // Миграция: добавляем новые разделы если их нет
  useEffect(() => {
    if (profile && sections.length > 0) {
      const DEF_SECTIONS = [
        { id: "today", emoji: "☀️", name: "Сегодня", vis: true },
        { id: "schedule", emoji: "🗓️", name: "Расписание", vis: true },
        { id: "work", emoji: "💼", name: "Работа", vis: true },
        { id: "home", emoji: "🏡", name: "Дом", vis: true },
        { id: "shopping", emoji: "🛒", name: "Покупки", vis: true },
        { id: "pets", emoji: "🐾", name: "Питомцы", vis: true },
        { id: "car", emoji: "🚗", name: "Авто", vis: true },
        { id: "health", emoji: "🌿", name: "Здоровье", vis: true },
        { id: "beauty", emoji: "✨", name: "Уход", vis: true },
        { id: "hobbies", emoji: "🎨", name: "Хобби", vis: true },
        { id: "goals", emoji: "🎯", name: "Мои цели", vis: true },
        { id: "mental", emoji: "🧘", name: "Ментальное", vis: true },
        { id: "travel", emoji: "✈️", name: "Поездки", vis: true },
        { id: "journal", emoji: "📖", name: "Журнал", vis: true },
        { id: "profile", emoji: "👤", name: "Профиль", vis: true },
      ];
      const newSections = [...sections];
      let changed = false;
      DEF_SECTIONS.forEach(def => {
        if (!newSections.find(s => s.id === def.id)) {
          newSections.push(def);
          changed = true;
        }
      });
      if (changed) setSections(newSections);
    }
    setIsLoaded(true);
  }, [profile, sections, setSections]);

  if (!isLoaded) return null;
  if (!profile) return <Onboarding />;

  const activeSection = sections.find(s => s.id === active) || sections[0];
  // ✅ ИСПРАВЛЕНО: getMoon из helpers, не дублируется
  const moon = getMoon();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="app">
      <div className="ambient" />

      {/* ✅ ДОБАВЛЕНО: Toast уведомления */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30,22,12,0.95)', color: T.gold, padding: '10px 20px',
          borderRadius: 12, fontSize: 13, fontWeight: 500, zIndex: 9999,
          border: `1px solid ${T.gold}44`, backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toastMsg}
        </div>
      )}

      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="s-logo">LD</div>
        {sections.map(s => (
          <div
            key={s.id}
            className={`s-nav ${!s.vis ? 'dim' : ''} ${active === s.id ? 'act' : ''}`}
            onClick={() => s.vis && setActive(s.id)}
            title={s.name}
          >
            <span className="s-ico">{s.emoji}</span>
            {/* ✅ ИСПРАВЛЕНО: убрано slice(0,5) — используем полное имя, tooltip показывает название */}
            <span className="s-lbl" style={{ fontSize: 9 }}>{s.name.slice(0, 6)}</span>
          </div>
        ))}
      </nav>

      {/* MAIN */}
      <div className="main">
        {/* HEADER */}
        <div className="hdr">
          <div className="hdr-l">
            <div className="hdr-title">{activeSection.name}</div>
            <div className="hdr-sub">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>
          <div className="hdr-r">
            <div className="moon-tag">{moon.e || '🌙'} {moon.n}</div>
            <div className="date-tag">{today}</div>
          </div>
        </div>

        {/* SECTIONS */}
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

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
