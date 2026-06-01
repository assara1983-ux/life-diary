// src/App.jsx — Home Screen Navigation
import { useState, useEffect } from "react";
import { AppProvider, useApp } from './store/AppContext';
import { Onboarding } from './components/Onboarding';
import { getMoon } from './utils/helpers';
import { SyncPanel } from './components/SyncPanel';
import './index.css';
import { TodaySection }    from './sections/TodaySection';
import { ScheduleSection } from './sections/ScheduleSection';
import { WorkSection }     from './sections/WorkSection';
import { HomeSection }     from './sections/HomeSection';
import { ShoppingSection } from './sections/ShoppingSection';
import { PetsSection }     from './sections/PetsSection';
import { CarSection }      from './sections/CarSection';
import { HealthSection }   from './sections/HealthSection';
import { BeautySection }   from './sections/BeautySection';
import { HobbiesSection }  from './sections/HobbiesSection';
import { TravelSection }   from './sections/TravelSection';
import { JournalSection }  from './sections/JournalSection';
import { ProfileSection }  from './sections/ProfileSection';

// ─── РАЗДЕЛЫ ───
const SECTIONS = [
  { id: 'today',    name: 'Сегодня',    emoji: '☀️', color: '#0070c0', img: '/sections/today.jpg' },
  { id: 'schedule', name: 'Расписание', emoji: '🗓', color: '#1565c0', img: '/sections/schedule.jpg' },
  { id: 'work',     name: 'Работа',     emoji: '💼', color: '#0d47a1', img: '/sections/work.jpg' },
  { id: 'home',     name: 'Дом',        emoji: '🏠', color: '#2e7d32', img: '/sections/home.jpg' },
  { id: 'shopping', name: 'Покупки',    emoji: '🛒', color: '#e65100', img: '/sections/shopping.jpg' },
  { id: 'pets',     name: 'Питомцы',    emoji: '🐾', color: '#6a1b9a', img: '/sections/pets.jpg' },
  { id: 'car',      name: 'Авто',       emoji: '🚗', color: '#37474f', img: '/sections/car.jpg' },
  { id: 'health',   name: 'Здоровье',   emoji: '💚', color: '#1b5e20', img: '/sections/health.jpg' },
  { id: 'beauty',   name: 'Уход',       emoji: '✨', color: '#880e4f', img: '/sections/beauty.jpg' },
  { id: 'hobbies',  name: 'Хобби',      emoji: '🎨', color: '#e65100', img: '/sections/hobbies.jpg' },
  { id: 'travel',   name: 'Поездки',    emoji: '✈️', color: '#01579b', img: '/sections/travel.jpg' },
  { id: 'journal',  name: 'Журнал',     emoji: '📖', color: '#4a148c', img: '/sections/journal.jpg' },
  { id: 'profile',  name: 'Профиль',    emoji: '👤', color: '#c8a45a', img: '/sections/profile.jpg' },
];

// ─── КАРТОЧКА РАЗДЕЛА ───
function SectionCard({ section, onClick }) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: '4/3',
        background: section.color,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        transition: 'transform 0.18s, box-shadow 0.18s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      }}
    >
      {/* Фоновое изображение */}
      {imgOk && (
        <img
          src={section.img}
          alt={section.name}
          onError={() => setImgOk(false)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {/* Если нет картинки — эмодзи по центру */}
      {!imgOk && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48,
        }}>
          {section.emoji}
        </div>
      )}

      {/* Градиент снизу */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
      }} />

      {/* Название */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 14px',
      }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: '#fff',
          fontFamily: "'Cinzel', serif",
          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          lineHeight: 1.2,
        }}>
          {section.name}
        </div>
      </div>

      {/* Эмодзи-бейдж сверху */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        fontSize: 20, lineHeight: 1,
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
      }}>
        {section.emoji}
      </div>
    </div>
  );
}

// ─── HOME SCREEN ───
function HomeScreen({ onNavigate }) {
  const { profile, toastMsg } = useApp();
  const moon  = getMoon();
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f0e1',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff', color: '#0070c0',
          padding: '10px 20px', borderRadius: 6,
          fontSize: 13, fontWeight: 500, zIndex: 9999,
          border: '1.5px solid rgba(0,112,192,0.4)',
          boxShadow: '0 4px 16px rgba(0,112,192,0.15)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {toastMsg}
        </div>
      )}

      {/* Шапка */}
      <div style={{
        padding: '20px 20px 16px',
        background: 'rgba(245,240,225,0.95)',
        borderBottom: '1px solid rgba(0,112,192,0.12)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{
              fontSize: 28, fontWeight: 800, color: '#0070c0',
              fontFamily: "'Cinzel', serif", letterSpacing: 2,
            }}>
              Life Diary
            </div>
            {profile?.name && (
              <div style={{ fontSize: 13, color: '#8c7a5a', marginTop: 2 }}>
                Привет, {profile.name.split(' ')[0]} 👋
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: '#0070c0', fontWeight: 600 }}>
              {moon.e} {moon.n}
            </div>
            <div style={{ fontSize: 11, color: '#8c7a5a', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>

        {/* День недели */}
        <div style={{
          marginTop: 10, fontSize: 11, color: '#8c7a5a',
          fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: 2,
        }}>
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long' })}
        </div>
      </div>

      {/* Сетка разделов */}
      <div style={{
        flex: 1, padding: '16px 16px 32px',
        overflowY: 'auto',
      }}>
        {/* Быстрый доступ — Сегодня */}
        <div
          onClick={() => onNavigate('today')}
          style={{
            position: 'relative', borderRadius: 16, overflow: 'hidden',
            cursor: 'pointer', marginBottom: 12, height: 120,
            background: '#0070c0',
            boxShadow: '0 4px 16px rgba(0,112,192,0.25)',
            transition: 'transform 0.18s',
          }}
        >
          <TodayBanner />
        </div>

        {/* Сетка 2 колонки */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}>
          {SECTIONS.filter(s => s.id !== 'today').map(section => (
            <SectionCard
              key={section.id}
              section={section}
              onClick={() => onNavigate(section.id)}
            />
          ))}
        </div>
      </div>

      <SyncPanel />
    </div>
  );
}

// ─── БАННЕР "СЕГОДНЯ" ───
function TodayBanner() {
  const [imgOk, setImgOk] = useState(true);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const moon = getMoon();

  return (
    <>
      {imgOk && (
        <img
          src="/sections/today.jpg"
          alt="Сегодня"
          onError={() => setImgOk(false)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', objectFit: 'cover',
          }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(0,70,140,0.85) 0%, rgba(0,112,192,0.6) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
      }}>
        <div>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.8)',
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4,
          }}>Сегодня</div>
          <div style={{
            fontSize: 18, fontWeight: 700, color: '#fff',
            fontFamily: "'Cinzel', serif",
          }}>{dateStr}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            {moon.e} {moon.n}
          </div>
        </div>
        <div style={{
          fontSize: 36, fontWeight: 800, color: '#fff',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 2,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {timeStr}
        </div>
      </div>
    </>
  );
}

// ─── SECTION SCREEN ───
function SectionScreen({ sectionId, onBack }) {
  const section = SECTIONS.find(s => s.id === sectionId) || SECTIONS[0];
  const { toastMsg } = useApp();
  const [imgOk, setImgOk] = useState(true);

  const COMPONENTS = {
    today:    TodaySection,
    schedule: ScheduleSection,
    work:     WorkSection,
    home:     HomeSection,
    shopping: ShoppingSection,
    pets:     PetsSection,
    car:      CarSection,
    health:   HealthSection,
    beauty:   BeautySection,
    hobbies:  HobbiesSection,
    travel:   TravelSection,
    journal:  JournalSection,
    profile:  ProfileSection,
  };

  const Component = COMPONENTS[sectionId];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f0e1',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff', color: '#0070c0',
          padding: '10px 20px', borderRadius: 6,
          fontSize: 13, fontWeight: 500, zIndex: 9999,
          border: '1.5px solid rgba(0,112,192,0.4)',
          boxShadow: '0 4px 16px rgba(0,112,192,0.15)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {toastMsg}
        </div>
      )}

      {/* Шапка раздела */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(245,240,225,0.97)',
        borderBottom: '1px solid rgba(0,112,192,0.12)',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Фоновая картинка раздела в шапке */}
        <div style={{ position: 'relative', height: 80, overflow: 'hidden' }}>
          {imgOk && (
            <img
              src={section.img}
              alt={section.name}
              onError={() => setImgOk(false)}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: 0.25,
              }}
            />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 12,
          }}>
            {/* Кнопка назад */}
            <button
              onClick={onBack}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0,112,192,0.1)',
                border: '1px solid rgba(0,112,192,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 16, color: '#0070c0',
                flexShrink: 0,
              }}
            >
              ←
            </button>

            {/* Иконка + название */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: section.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                overflow: 'hidden',
              }}>
                {imgOk ? (
                  <img
                    src={section.img}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span>{section.emoji}</span>
                )}
              </div>
              <div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: '#0070c0',
                  fontFamily: "'Cinzel', serif",
                }}>
                  {section.name}
                </div>
                <div style={{
                  fontSize: 10, color: '#8c7a5a',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Контент раздела */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 80px 0' }}>
        {Component && <Component />}
      </div>

      <SyncPanel />
    </div>
  );
}

// ─── APP CONTENT ───
function AppContent() {
  const { profile, sections, setSections } = useApp();
  const [active, setActive] = useState(null); // null = Home Screen

  // ✅ Удаляем goals из localStorage при старте
  useEffect(() => {
    if (!profile) return;

    // Чистим старые sections с goals
    const stored = sections.filter(s => s.id !== 'goals');
    const needsUpdate = sections.some(s => s.id === 'goals') || sections.length === 0;

    if (needsUpdate) {
      const base = SECTIONS.map(s => ({ id: s.id, name: s.name, vis: true }));
      setSections(base);
    }
  }, [profile]);

  if (!profile) return <Onboarding />;

  // Главная экран
  if (!active) {
    return <HomeScreen onNavigate={setActive} />;
  }

  // Раздел
  return (
    <SectionScreen
      sectionId={active}
      onBack={() => setActive(null)}
    />
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
