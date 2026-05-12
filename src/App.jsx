// src/App.jsx — Blueprint Theme v2
import { useState, useEffect } from "react";
import { AppProvider, useApp } from './store/AppContext';
import { Onboarding } from './components/Onboarding';
import { getMoon } from './utils/helpers';
import { Icon } from './components/Icon';
import { getSectionGraphic } from './config/sectionGraphics';
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
import { GoalsSection }    from './sections/GoalsSection';
import { MentalSection }   from './sections/MentalSection';
import { TravelSection }   from './sections/TravelSection';
import { JournalSection }  from './sections/JournalSection';
import { ProfileSection }  from './sections/ProfileSection';

const DEF_SECTIONS = [
  { id:"today",    name:"Сегодня",   vis:true },
  { id:"schedule", name:"Расписание", vis:true },
  { id:"work",     name:"Работа",     vis:true },
  { id:"home",     name:"Дом",        vis:true },
  { id:"shopping", name:"Покупки",    vis:true },
  { id:"pets",     name:"Питомцы",    vis:true },
  { id:"car",      name:"Авто",       vis:true },
  { id:"health",   name:"Здоровье",   vis:true },
  { id:"beauty",   name:"Уход",       vis:true },
  { id:"hobbies",  name:"Хобби",      vis:true },
  { id:"goals",    name:"Мои цели",   vis:true },
  { id:"mental",   name:"Ментальное", vis:true },
  { id:"travel",   name:"Поездки",    vis:true },
  { id:"journal",  name:"Журнал",     vis:true },
  { id:"profile",  name:"Профиль",    vis:true },
];

function AppContent() {
  const { profile, sections, setSections, toastMsg } = useApp();
  const [active, setActive] = useState("today");
  const [bgLoaded, setBgLoaded] = useState(false);
  const [bgUrl, setBgUrl] = useState(null);

  useEffect(() => {    if (!profile) return;
    const current = sections.length > 0 ? sections : DEF_SECTIONS;
    const merged = [...current];
    let changed = sections.length === 0;
    DEF_SECTIONS.forEach(def => {
      if (!merged.find(s => s.id === def.id)) { merged.push(def); changed = true; }
    });
    if (changed) setSections(merged);
  }, [profile]);

  // Загрузка фона для текущей секции
  useEffect(() => {
    const graphic = getSectionGraphic(active);
    if (graphic?.image) {
      setBgUrl(graphic.image);
      setBgLoaded(false);
      const img = new Image();
      img.onload = () => setBgLoaded(true);
      img.src = graphic.image;
    }
  }, [active]);

  if (!profile) return <Onboarding />;

  const vis = sections.length > 0 ? sections : DEF_SECTIONS;
  const activeSection = vis.find(s => s.id === active) || vis[0];
  const moon = getMoon();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="app" style={{ display: 'grid', gridTemplateColumns: '80px 1fr', height: '100vh', overflow: 'hidden' }}>
      {/* Background Watermark */}
      {bgUrl && bgLoaded && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.08,
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          filter: 'grayscale(20%) sepia(10%)',
        }} />
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',          background: '#fff', color: '#0070c0', padding: '10px 20px',
          borderRadius: 6, fontSize: 13, fontWeight: 500, zIndex: 9999,
          border: '1.5px solid rgba(0,112,192,0.4)',
          boxShadow: '0 4px 16px rgba(0,112,192,0.15)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {toastMsg}
        </div>
      )}

      {/* SIDEBAR — WIDE */}
      <nav className="sidebar-wide" style={{
        gridColumn: '1 / 2',
        background: 'rgba(245,240,225,0.95)',
        borderRight: '1px solid rgba(0,112,192,0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 6,
        overflowY: 'auto',
        zIndex: 10,
      }}>
        <div className="s-logo" style={{ fontSize: 16, fontWeight: 700, color: '#0070c0', marginBottom: 12 }}>LD</div>
        {vis.map(s => (
          <div
            key={s.id}
            onClick={() => s.vis && setActive(s.id)}
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              background: active === s.id ? 'rgba(0,112,192,0.12)' : 'transparent',
              border: active === s.id ? '1px solid #0070c0' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <Icon name={s.id} size={20} animated={active === s.id} />
            <span style={{ fontSize: 9, color: active === s.id ? '#0070c0' : '#5c4a30', textAlign: 'center', lineHeight: 1.1 }}>
              {s.name.slice(0, 6)}
            </span>
          </div>
        ))}
      </nav>
      {/* MAIN CONTENT */}
      <main className="main" style={{
        gridColumn: '2 / 3',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header */}
        <div className="hdr" style={{
          padding: '16px 24px',
          background: 'rgba(245,240,225,0.9)',
          borderBottom: '1px solid rgba(0,112,192,0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div className="hdr-title" style={{ fontSize: 20, fontWeight: 600, color: '#0070c0' }}>{activeSection?.name}</div>
            <div className="hdr-sub" style={{ fontSize: 12, color: '#5c4a30' }}>
              {new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}
            </div>
          </div>
          <div className="hdr-r" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="moon-tag" style={{ fontSize: 12, color: '#5c4a30' }}>{moon.e} {moon.n}</div>
            <div className="date-tag" style={{ fontSize: 12, fontFamily: "'JetBrains Mono'", color: '#0070c0' }}>{today}</div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="page" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {active==='today'    && <TodaySection />}
          {active==='schedule' && <ScheduleSection />}
          {active==='work'     && <WorkSection />}
          {active==='home'     && <HomeSection />}
          {active==='shopping' && <ShoppingSection />}
          {active==='pets'     && <PetsSection />}
          {active==='car'      && <CarSection />}
          {active==='health'   && <HealthSection />}
          {active==='beauty'   && <BeautySection />}
          {active==='hobbies'  && <HobbiesSection />}
          {active==='goals'    && <GoalsSection />}
          {active==='mental'   && <MentalSection />}
          {active==='travel'   && <TravelSection />}
          {active==='journal'  && <JournalSection />}
          {active==='profile'  && <ProfileSection />}
        </div>
      </main>    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
