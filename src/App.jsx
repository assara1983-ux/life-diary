// src/App.jsx — Blueprint Theme (Compact Sidebar)
import { useState, useEffect } from "react";
import { AppProvider, useApp } from './store/AppContext';
import { Onboarding } from './components/Onboarding';
import { getMoon } from './utils/helpers';
import { Icon } from './components/Icon';
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
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const current = sections.length > 0 ? sections : DEF_SECTIONS;    const merged = [...current];
    let changed = sections.length === 0;
    DEF_SECTIONS.forEach(def => {
      if (!merged.find(s => s.id === def.id)) { merged.push(def); changed = true; }
    });
    if (changed) setSections(merged);
  }, [profile]);

  if (!profile) return <Onboarding />;

  const vis = sections.length > 0 ? sections : DEF_SECTIONS;
  const activeSection = vis.find(s => s.id === active) || vis[0];
  const moon = getMoon();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="app">
      <div className="ambient" />

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#fff', color: '#0070c0', padding: '10px 20px',
          borderRadius: 6, fontSize: 13, fontWeight: 500, zIndex: 9999,
          border: '1.5px solid rgba(0,112,192,0.4)',
          boxShadow: '0 4px 16px rgba(0,112,192,0.15)',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '1px',
          whiteSpace: 'nowrap',
        }}>
          {toastMsg}
        </div>
      )}

      {/* SIDEBAR — COMPACT */}
      <nav className="sidebar sidebar-compact">
        <div className="s-logo">LD</div>
        {vis.map(s => (
          <div
            key={s.id}
            className={`s-nav${!s.vis?' dim':''}${active===s.id?' act':''}`}
            onClick={() => s.vis && setActive(s.id)}
            onMouseEnter={() => setTooltip(s.name)}
            onMouseLeave={() => setTooltip(null)}
          >
            <span className="s-ico">
              <Icon name={s.id} size={18} animated={active === s.id} />
            </span>
          </div>        ))}
        
        {/* Tooltip */}
        {tooltip && (
          <div className="sidebar-tooltip">{tooltip}</div>
        )}
      </nav>

      {/* MAIN */}
      <div className="main">
        <div className="hdr">
          <div className="hdr-l">
            <div className="hdr-title">{activeSection?.name}</div>
            <div className="hdr-sub">
              {new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}
            </div>
          </div>
          <div className="hdr-r">
            <div className="moon-tag">{moon.e || '🌙'} {moon.n}</div>
            <div className="date-tag">{today}</div>
          </div>
        </div>

        <div className="page">
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
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>  );
}
