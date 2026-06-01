// src/App.jsx — Vintage Blueprint Manuscript
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

// ── Palette constants (match CSS vars) ──
const C = {
  bg:        '#F5E8C7',
  bg1:       '#EDE0C4',
  bg2:       '#E8D9B8',
  bgCard:    '#FAF3E0',
  navy:      '#1E3A5F',
  navyDark:  '#0A2540',
  navyMid:   '#2C4F7A',
  gold:      '#D4AF37',
  goldPale:  '#F0DC90',
  goldDeep:  '#C49B2A',
  text1:     '#1A2D40',
  text2:     '#3A4E63',
  text3:     '#6B7E8F',
  line:      'rgba(30,58,95,0.22)',
  lineS:     'rgba(30,58,95,0.10)',
};

// ─── РАЗДЕЛЫ ───
const SECTIONS = [
  { id: 'today',    name: 'Сегодня',    emoji: '☀️', color: '#1E3A5F', img: '/sections/today.jpg' },
  { id: 'schedule', name: 'Расписание', emoji: '🗓', color: '#2C4F7A', img: '/sections/schedule.jpg' },
  { id: 'work',     name: 'Работа',     emoji: '💼', color: '#0A2540', img: '/sections/work.jpg' },
  { id: 'home',     name: 'Дом',        emoji: '🏠', color: '#2D5A3D', img: '/sections/home.jpg' },
  { id: 'shopping', name: 'Покупки',    emoji: '🛒', color: '#7A3B1E', img: '/sections/shopping.jpg' },
  { id: 'pets',     name: 'Питомцы',    emoji: '🐾', color: '#4A2D6A', img: '/sections/pets.jpg' },
  { id: 'car',      name: 'Авто',       emoji: '🚗', color: '#2C3E4A', img: '/sections/car.jpg' },
  { id: 'health',   name: 'Здоровье',   emoji: '💚', color: '#1B4D2A', img: '/sections/health.jpg' },
  { id: 'beauty',   name: 'Уход',       emoji: '✨', color: '#6B1E3A', img: '/sections/beauty.jpg' },
  { id: 'hobbies',  name: 'Хобби',      emoji: '🎨', color: '#7A3B1E', img: '/sections/hobbies.jpg' },
  { id: 'travel',   name: 'Поездки',    emoji: '✈️', color: '#1E4A6B', img: '/sections/travel.jpg' },
  { id: 'journal',  name: 'Журнал',     emoji: '📖', color: '#3A1E6B', img: '/sections/journal.jpg' },
  { id: 'profile',  name: 'Профиль',    emoji: '👤', color: '#C49B2A', img: '/sections/profile.jpg' },
];

// ─── TOAST ───
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%',
      transform: 'translateX(-50%)',
      background: C.bgCard,
      color: C.navyDark,
      padding: '10px 22px', borderRadius: 5,
      fontSize: 13, fontWeight: 500, zIndex: 9999,
      border: `1.5px solid ${C.navy}`,
      boxShadow: `0 4px 18px rgba(10,37,64,0.18), 0 0 0 1px rgba(212,175,55,0.2)`,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '0.5px',
    }}>
      {msg}
    </div>
  );
}

// ─── SECTION CARD ───
function SectionCard({ section, onClick }) {
  const [imgOk, setImgOk] = useState(true);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: '4/3',
        background: section.color,
        boxShadow: hovered
          ? `0 10px 28px rgba(10,37,64,0.22), 0 0 0 2px ${C.gold}`
          : `0 4px 14px rgba(10,37,64,0.14), 0 0 0 1.5px ${C.line}`,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.22s, box-shadow 0.22s',
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

      {/* Без картинки — крупное название */}
      {!imgOk && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 42 }}>{section.emoji}</span>
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 16, fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: 2, textAlign: 'center',
            padding: '0 8px',
            textShadow: '0 2px 6px rgba(0,0,0,0.5)',
          }}>{section.name}</span>
        </div>
      )}

      {/* Градиент */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(10,25,45,0.82) 0%, rgba(10,25,45,0.25) 55%, transparent 100%)',
      }} />

      {/* Золотая рамка при наведении */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          border: `1.5px solid rgba(212,175,55,0.6)`,
          borderRadius: 14, pointerEvents: 'none',
        }} />
      )}

      {/* Угловые маркеры */}
      <div style={{
        position: 'absolute', top: 7, left: 7,
        width: 10, height: 10,
        borderTop: `1.5px solid ${C.gold}`,
        borderLeft: `1.5px solid ${C.gold}`,
        opacity: 0.7,
      }} />
      <div style={{
        position: 'absolute', bottom: 7, right: 7,
        width: 10, height: 10,
        borderBottom: `1.5px solid ${C.gold}`,
        borderRight: `1.5px solid ${C.gold}`,
        opacity: 0.7,
      }} />

      {/* Название снизу */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '10px 12px 12px',
      }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: '#fff',
          fontFamily: "'Cinzel', serif",
          letterSpacing: 2,
          textTransform: 'uppercase',
          textShadow: '0 2px 6px rgba(0,0,0,0.65)',
          lineHeight: 1.2,
        }}>
          {section.name}
        </div>
      </div>

      {/* Эмодзи */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        fontSize: 18, lineHeight: 1,
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))',
      }}>
        {section.emoji}
      </div>
    </div>
  );
}

// ─── TODAY BANNER ───
function TodayBanner() {
  const [imgOk, setImgOk] = useState(true);
  const now     = new Date();
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const moon    = getMoon();

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
      {/* Тёмно-синий оверлей */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, rgba(10,37,64,0.88) 0%, rgba(30,58,95,0.72) 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 22px',
      }}>
        <div>
          <div style={{
            fontSize: 10, color: C.goldPale,
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase', letterSpacing: 3, marginBottom: 5,
          }}>Сегодня</div>
          <div style={{
            fontSize: 17, fontWeight: 700, color: '#fff',
            fontFamily: "'Cinzel', serif",
            letterSpacing: 1,
            textShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}>{dateStr}</div>
          <div style={{ fontSize: 12, color: C.goldPale, marginTop: 3, opacity: 0.85 }}>
            {moon.e} {moon.n}
          </div>
        </div>
        <div style={{
          fontSize: 34, fontWeight: 700, color: C.goldPale,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 2,
          textShadow: `0 2px 12px rgba(212,175,55,0.4)`,
        }}>
          {timeStr}
        </div>
      </div>

      {/* Угловые маркеры */}
      {[
        { top: 8, left: 8, bt: true, bl: true },
        { bottom: 8, right: 8, bb: true, br: true },
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: pos.top, left: pos.left,
          bottom: pos.bottom, right: pos.right,
          width: 12, height: 12,
          borderTop:    pos.bt ? `1.5px solid ${C.gold}` : undefined,
          borderLeft:   pos.bl ? `1.5px solid ${C.gold}` : undefined,
          borderBottom: pos.bb ? `1.5px solid ${C.gold}` : undefined,
          borderRight:  pos.br ? `1.5px solid ${C.gold}` : undefined,
          opacity: 0.7,
        }} />
      ))}
    </>
  );
}

// ─── HOME SCREEN ───
function HomeScreen({ onNavigate }) {
  const { profile, toastMsg } = useApp();
  const moon = getMoon();

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      backgroundImage: `
        radial-gradient(ellipse at 15% 85%, rgba(212,175,55,0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 85% 15%, rgba(30,58,95,0.05) 0%, transparent 50%),
        linear-gradient(rgba(30,58,95,0.055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30,58,95,0.055) 1px, transparent 1px),
        linear-gradient(rgba(30,58,95,0.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30,58,95,0.022) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100px 100px, 100px 100px, 20px 20px, 20px 20px',
      display: 'flex', flexDirection: 'column',
    }}>
      <Toast msg={toastMsg} />

      {/* ── Шапка ── */}
      <div style={{
        padding: '22px 20px 14px',
        background: `linear-gradient(135deg, rgba(245,232,199,0.98) 0%, rgba(232,217,184,0.97) 100%)`,
        borderBottom: `2.5px solid ${C.navyDark}`,
        position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(8px)',
        backgroundImage: `
          linear-gradient(135deg, rgba(245,232,199,0.98) 0%, rgba(232,217,184,0.97) 100%),
          linear-gradient(rgba(30,58,95,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(30,58,95,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '100%, 20px 20px, 20px 20px',
        boxShadow: '0 3px 14px rgba(10,37,64,0.10)',
        position: 'relative',
      }}>
        {/* Gold rule bottom */}
        <div style={{
          position: 'absolute', bottom: -1, left: 20, right: 20,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${C.gold} 30%, ${C.gold} 70%, transparent)`,
          opacity: 0.55,
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {/* Лейбл */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, letterSpacing: 3,
              color: C.text3, textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              Personal Organizer
            </div>
            {/* Заголовок */}
            <div style={{
              fontSize: 30, fontWeight: 700,
              fontFamily: "'Cinzel', serif",
              color: C.navyDark, letterSpacing: 5,
              textTransform: 'uppercase',
              textShadow: '0 2px 0 rgba(255,255,255,0.8), 0 1px 6px rgba(10,37,64,0.10)',
              lineHeight: 1.1,
            }}>
              Life Diary
            </div>
            {profile?.name && (
              <div style={{
                fontSize: 13, color: C.text2,
                fontFamily: "'Cormorant Infant', serif",
                fontStyle: 'italic', marginTop: 3,
              }}>
                {profile.name.split(' ')[0]} · {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 16, color: C.gold, fontWeight: 700,
              fontFamily: "'Cinzel', serif",
              letterSpacing: 1,
              textShadow: `0 1px 4px rgba(212,175,55,0.3)`,
            }}>
              {moon.e} {moon.n}
            </div>
            <div style={{
              marginTop: 4, fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: 2, color: C.text3,
              textTransform: 'uppercase',
            }}>
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long' })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Контент ── */}
      <div style={{ flex: 1, padding: '16px 16px 40px', overflowY: 'auto' }}>

        {/* Баннер Сегодня */}
        <div
          onClick={() => onNavigate('today')}
          style={{
            position: 'relative', borderRadius: 14,
            overflow: 'hidden', cursor: 'pointer',
            marginBottom: 14, height: 110,
            background: C.navyDark,
            boxShadow: `0 5px 20px rgba(10,37,64,0.22), 0 0 0 1.5px ${C.line}`,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = `0 10px 28px rgba(10,37,64,0.28), 0 0 0 2px ${C.gold}`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 5px 20px rgba(10,37,64,0.22), 0 0 0 1.5px ${C.line}`;
          }}
        >
          <TodayBanner />
        </div>

        {/* Разделитель */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14,
        }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.navy})`, opacity: 0.15 }} />
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: 3,
            color: C.text3, textTransform: 'uppercase',
          }}>Разделы</div>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.navy}, transparent)`, opacity: 0.15 }} />
        </div>

        {/* Сетка */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

// ─── SECTION SCREEN ───
function SectionScreen({ sectionId, onBack }) {
  const section = SECTIONS.find(s => s.id === sectionId) || SECTIONS[0];
  const { toastMsg } = useApp();
  const [imgOk, setImgOk] = useState(true);
  const [imgHeaderOk, setImgHeaderOk] = useState(true);

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
      background: C.bg,
      backgroundImage: `
        linear-gradient(rgba(30,58,95,0.055) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30,58,95,0.055) 1px, transparent 1px),
        linear-gradient(rgba(30,58,95,0.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30,58,95,0.022) 1px, transparent 1px)
      `,
      backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
      display: 'flex', flexDirection: 'column',
    }}>
      <Toast msg={toastMsg} />

      {/* ── Шапка раздела ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        borderBottom: `2.5px solid ${C.navyDark}`,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 3px 14px rgba(10,37,64,0.10)',
        overflow: 'hidden',
      }}>
        {/* Фоновая картинка */}
        <div style={{ position: 'relative', height: 88, overflow: 'hidden' }}>
          {imgHeaderOk && (
            <img
              src={section.img}
              alt={section.name}
              onError={() => setImgHeaderOk(false)}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.22,
              }}
            />
          )}

          {/* Пергаментный оверлей */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, rgba(245,232,199,0.94) 0%, rgba(232,217,184,0.94) 100%)`,
            backgroundImage: `
              linear-gradient(135deg, rgba(245,232,199,0.94) 0%, rgba(232,217,184,0.94) 100%),
              linear-gradient(rgba(30,58,95,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30,58,95,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '100%, 20px 20px, 20px 20px',
          }} />

          {/* Gold rule bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 16, right: 16,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${C.gold} 20%, ${C.gold} 80%, transparent)`,
            opacity: 0.45,
          }} />

          {/* Controls */}
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
                background: 'rgba(245,232,199,0.9)',
                border: `1.5px solid ${C.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 17, color: C.navyDark,
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(10,37,64,0.10)',
                transition: 'all 0.15s',
              }}
            >
              ←
            </button>

            {/* Миниатюра раздела */}
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: section.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(10,37,64,0.18)',
              overflow: 'hidden',
              border: `1.5px solid ${C.goldDeep}`,
            }}>
              {imgOk ? (
                <img
                  src={section.img}
                  alt=""
                  onError={() => setImgOk(false)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 20 }}>{section.emoji}</span>
              )}
            </div>

            {/* Название */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 19, fontWeight: 700,
                color: C.navyDark,
                fontFamily: "'Cinzel', serif",
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                textShadow: '0 1px 0 rgba(255,255,255,0.7)',
              }}>
                {section.name}
              </div>
              <div style={{
                fontSize: 9.5, color: C.text3,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: 1.5, textTransform: 'uppercase',
                marginTop: 2,
              }}>
                {new Date().toLocaleDateString('ru-RU', {
                  weekday: 'short', day: 'numeric', month: 'long'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Контент ── */}
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
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const needsUpdate = sections.some(s => s.id === 'goals') || sections.length === 0;
    if (needsUpdate) {
      const base = SECTIONS.map(s => ({ id: s.id, name: s.name, vis: true }));
      setSections(base);
    }
  }, [profile]);

  if (!profile) return <Onboarding />;
  if (!active)  return <HomeScreen onNavigate={setActive} />;
  return <SectionScreen sectionId={active} onBack={() => setActive(null)} />;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
            }
