// src/App.jsx
import { useState, useEffect } from "react";
import { AppProvider, useApp } from './store/AppContext';
import { Onboarding } from './components/Onboarding';
import { T } from './utils/theme';
import './index.css';
import { useNotificationCheck } from './hooks/useNotificationCheck';
import { getMoon } from './utils/helpers';

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

const DEF_SECTIONS = [
  { id: "today",    emoji: "☀️",  name: "Сегодня",    vis: true },
  { id: "schedule", emoji: "🗓️", name: "Расписание",  vis: true },
  { id: "work",     emoji: "💼",  name: "Работа",      vis: true },
  { id: "home",     emoji: "🏡",  name: "Дом",         vis: true },
  { id: "shopping", emoji: "🛒",  name: "Покупки",     vis: true },
  { id: "pets",     emoji: "🐾",  name: "Питомцы",     vis: true },
  { id: "car",      emoji: "🚗",  name: "Авто",        vis: true },
  { id: "health",   emoji: "🌿",  name: "Здоровье",    vis: true },
  { id: "beauty",   emoji: "✨",  name: "Уход",        vis: true },
  { id: "hobbies",  emoji: "🎨",  name: "Хобби",       vis: true },
  { id: "goals",    emoji: "🎯",  name: "Мои цели",    vis: true },
  { id: "mental",   emoji: "🧘",  name: "Ментальное",  vis: true },
  { id: "travel",   emoji: "✈️",  name: "Поездки",     vis: true },
  { id: "journal",  emoji: "📖",  name: "Журнал",      vis: true },
  { id: "profile",  emoji: "👤",  name: "Профиль",     vis: true },
];

function AppContent() {
  const { profile, sections, setSections, toastMsg } = useApp();
  const [active, setActive] = useState("today");

  useNotificationCheck();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registered:', reg))
          .catch(err => console.log('SW failed:', err));
      });
    }
  }, []);

  // Миграция: добавляем новые разделы если их нет
  useEffect(() => {
    if (!profile) return;
    const current = sections.length > 0 ? sections : DEF_SECTIONS;
    const merged = [...current];
    let changed = sections.length === 0; // если sections пустые — сразу ставим дефолт
    DEF_SECTIONS.forEach(def => {
      if (!merged.find(s => s.id === def.id)) {
        merged.push(def);
        changed = true;
      }
    });
    if (changed) setSections(merged);
  }, [profile]); // ✅ ИСПРАВЛЕНО: только profile в deps — не зависим от sections

  // ✅ ИСПРАВЛЕНО: isLoaded убран — он блокировал рендер после онбординга.
  // Онбординг показывается пока profile === null, всё остальное — сразу после.
  if (!profile) return <Onboarding />;

  const visibleSections = sections.length > 0 ? sections : DEF_SECTIONS;
  const activeSection = visibleSections.find(s => s.id === active) || visibleSections[0];
  const moon = getMoon();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="app">
      <div className="ambient" />

      {/* Toast уведомления */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30,22,12,0.95)', color: T.gold, padding: '10px 20px',
          borderRadius: 12, fontSize: 13, fontWeight: 500, zIndex: 9999,
          border: `1px solid ${T.gold}44`, backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
        }}>
          {toastMsg}
        </div>
      )}

      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="s-logo">LD</div>
        {visibleSections.map(s => (
          <div
            key={s.id}
            className={`s-nav ${!s.vis ? 'dim' : ''} ${active === s.id ? 'act' : ''}`}
            onClick={() => s.vis && setActive(s.id)}
            title={s.name}
          >
            <span className="s-ico">{s.emoji}</span>
            <span className="s-lbl" style={{ fontSize: 9 }}>{s.name.slice(0, 6)}</span>
          </div>
        ))}
      </nav>

      {/* MAIN */}
      <div className="main">
        <div className="hdr">
          <div className="hdr-l">
            <div className="hdr-title">{activeSection?.name}</div>
            <div className="hdr-sub">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>
          <div className="hdr-r">
            <div className="moon-tag">{moon.e || '🌙'} {moon.n}</div>
            <div className="date-tag">{today}</div>
          </div>
        </div>

        <div className="page">
          {active === 'today'    && <TodaySection />}
          {active === 'schedule' && <ScheduleSection />}
          {active === 'work'     && <WorkSection />}
          {active === 'home'     && <HomeSection />}
          {active === 'shopping' && <ShoppingSection />}
          {active === 'pets'     && <PetsSection />}
          {active === 'car'      && <CarSection />}
          {active === 'health'   && <HealthSection />}
          {active === 'beauty'   && <BeautySection />}
          {active === 'hobbies'  && <HobbiesSection />}
          {active === 'goals'    && <GoalsSection />}
          {active === 'mental'   && <MentalSection />}
          {active === 'travel'   && <TravelSection />}
          {active === 'journal'  && <JournalSection />}
          {active === 'profile'  && <ProfileSection />}
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
