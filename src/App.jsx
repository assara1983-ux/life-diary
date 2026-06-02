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

const C = {
  bg:       '#F5E8C7',
  bgCard:   '#FAF3E0',
  navy:     '#0A2540',
  navyMid:  '#1E3A5F',
  gold:     '#D4AF37',
  goldPale: '#F0DC90',
  goldDeep: '#B8941E',
  text2:    '#1E3A5F',
  text3:    '#4A6480',
  line:     'rgba(10,37,64,0.28)',
};

const SECTIONS = [
  { id: 'today',    name: 'Сегодня',    emoji: '☀️', color: '#0A2540', img: '/sections/today.jpg',    wide: true },
  { id: 'schedule', name: 'Расписание', emoji: '🗓', color: '#1E3A5F', img: '/sections/schedule.jpg' },
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
  { id: 'profile',  name: 'Профиль',    emoji: '👤', color: '#8B6914', img: '/sections/profile.jpg' },
];

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      background:C.bgCard, color:C.navy,
      padding:'11px 24px', borderRadius:5,
      fontSize:13, fontWeight:600, zIndex:9999,
      border:`2px solid ${C.navyMid}`,
      boxShadow:`0 4px 20px rgba(10,37,64,0.20)`,
      fontFamily:"'JetBrains Mono',monospace",
    }}>{msg}</div>
  );
}

const bgGrid = {
  backgroundColor: C.bg,
  backgroundImage:`
    radial-gradient(ellipse at 12% 88%, rgba(212,175,55,0.07) 0%, transparent 45%),
    radial-gradient(ellipse at 88% 12%, rgba(10,37,64,0.05) 0%, transparent 45%),
    linear-gradient(rgba(10,37,64,0.07)  1px, transparent 1px),
    linear-gradient(90deg, rgba(10,37,64,0.07)  1px, transparent 1px),
    linear-gradient(rgba(10,37,64,0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(10,37,64,0.028) 1px, transparent 1px)
  `,
  backgroundSize:'100% 100%, 100% 100%, 100px 100px, 100px 100px, 20px 20px, 20px 20px',
};

function SectionCard({ section, onClick, fullWidth }) {
  const [imgOk,  setImgOk]  = useState(true);
  const [hovered,setHovered] = useState(false);
  const isToday = section.id === 'today';
  const moon = getMoon();
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })
  );
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() =>
      setTime(new Date().toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' }))
    , 10000);
    return () => clearInterval(id);
  }, [isToday]);

  const dateStr = new Date().toLocaleDateString('ru-RU', {
    weekday:'long', day:'numeric', month:'long',
  });

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:'relative', borderRadius:14, overflow:'hidden', cursor:'pointer',
        gridColumn: fullWidth ? '1 / -1' : undefined,
        height: fullWidth ? 120 : undefined,
        aspectRatio: fullWidth ? undefined : '4/3',
        background: section.color,
        boxShadow: hovered
          ? `0 10px 28px rgba(10,37,64,0.24), 0 0 0 2.5px ${C.gold}`
          : `0 4px 16px rgba(10,37,64,0.16), 0 0 0 1.5px ${C.line}`,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition:'transform 0.22s, box-shadow 0.22s',
      }}
    >
      {/* ✅ Картинка — всегда показываем */}
      {imgOk && (
        <img src={section.img} alt={section.name}
          onError={() => setImgOk(false)}
          style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%',
            objectFit:'cover',
            // Для «Сегодня» чуть темнее чтобы текст читался
            opacity: isToday ? 0.75 : 1,
          }}
        />
      )}

      {/* Без фото — emoji + название */}
      {!imgOk && (
        <div style={{
          position:'absolute', inset:0,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <span style={{ fontSize: fullWidth ? 36 : 42 }}>{section.emoji}</span>
          {!isToday && (
            <span style={{
              fontFamily:"'Cinzel',serif", fontSize:16, fontWeight:700,
              color:'rgba(255,255,255,0.9)', letterSpacing:2.5,
              textTransform:'uppercase', textShadow:'0 2px 6px rgba(0,0,0,0.5)',
            }}>{section.name}</span>
          )}
        </div>
      )}

      {/* ✅ Градиент — для «Сегодня» лёгкий снизу, для остальных стандартный */}
      <div style={{
        position:'absolute', inset:0,
        background: isToday
          ? 'linear-gradient(to top, rgba(10,37,64,0.80) 0%, rgba(10,37,64,0.35) 50%, rgba(10,37,64,0.10) 100%)'
          : 'linear-gradient(to top, rgba(10,25,45,0.85) 0%, rgba(10,25,45,0.25) 55%, transparent 100%)',
      }} />

      {/* Золотая рамка при наведении */}
      {hovered && (
        <div style={{ position:'absolute', inset:0,
          border:`1.5px solid rgba(212,175,55,0.65)`,
          borderRadius:14, pointerEvents:'none' }} />
      )}

      {/* Угловые маркеры */}
      <div style={{ position:'absolute', top:7, left:7, width:11, height:11,
        borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}`, opacity:0.85 }} />
      <div style={{ position:'absolute', bottom:7, right:7, width:11, height:11,
        borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}`, opacity:0.85 }} />

      {/* Контент «Сегодня» */}
      {isToday && (
        <div style={{
          position:'absolute', inset:0,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 24px',
        }}>
          <div>
            <div style={{
              fontSize:10, color:C.goldPale,
              fontFamily:"'JetBrains Mono',monospace",
              textTransform:'uppercase', letterSpacing:3, marginBottom:5, opacity:0.95,
            }}>Сегодня</div>
            <div style={{
              fontSize:20, fontWeight:700, color:'#fff',
              fontFamily:"'Cinzel',serif", letterSpacing:1.5,
              textShadow:'0 2px 8px rgba(0,0,0,0.6)',
            }}>{dateStr}</div>
            <div style={{
              fontSize:13, color:C.goldPale, marginTop:4, opacity:0.9,
              fontFamily:"'Cormorant Infant',serif", fontStyle:'italic',
            }}>{moon.e} {moon.n}</div>
          </div>
          <div style={{
            fontSize:42, fontWeight:700, color:C.goldPale,
            fontFamily:"'JetBrains Mono',monospace", letterSpacing:3,
            textShadow:`0 2px 16px rgba(212,175,55,0.60)`,
          }}>{time}</div>
        </div>
      )}

      {/* Контент обычных карточек */}
      {!isToday && (
        <>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'10px 13px 13px' }}>
            <div style={{
              fontSize:14, fontWeight:700, color:'#fff',
              fontFamily:"'Cinzel',serif", letterSpacing:2.5,
              textTransform:'uppercase', textShadow:'0 2px 6px rgba(0,0,0,0.7)',
            }}>{section.name}</div>
          </div>
          <div style={{ position:'absolute', top:10, right:10, fontSize:18,
            filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>{section.emoji}</div>
        </>
      )}
    </div>
  );
}

function HomeScreen({ onNavigate }) {
  const { profile, toastMsg } = useApp();
  const moon = getMoon();

  return (
    <div style={{ minHeight:'100vh', ...bgGrid, display:'flex', flexDirection:'column' }}>
      <Toast msg={toastMsg} />

      {/* Шапка */}
      <div style={{
        position:'sticky', top:0, zIndex:10,
        background:`linear-gradient(135deg, rgba(245,232,199,0.99) 0%, rgba(232,217,184,0.98) 100%)`,
        borderBottom:`3px solid ${C.navy}`,
        boxShadow:'0 3px 16px rgba(10,37,64,0.12)',
      }}>
        <div style={{ position:'absolute', bottom:-1, left:0, right:0, height:1.5,
          background:`linear-gradient(90deg, transparent, ${C.gold} 20%, ${C.gold} 80%, transparent)`,
          opacity:0.6 }} />
        <div style={{ maxWidth:960, margin:'0 auto', padding:'20px 24px 16px',
          display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",
              fontSize:9, letterSpacing:3.5, color:C.text3,
              textTransform:'uppercase', marginBottom:3 }}>Personal Organizer</div>
            <div style={{ fontSize:34, fontWeight:700, fontFamily:"'Cinzel',serif",
              color:C.navy, letterSpacing:6, textTransform:'uppercase',
              textShadow:'0 2px 0 rgba(255,255,255,0.85)', lineHeight:1.1 }}>Life Diary</div>
            {profile?.name && (
              <div style={{ fontSize:14, color:C.text2,
                fontFamily:"'Cormorant Infant',serif", fontStyle:'italic', marginTop:4 }}>
                {profile.name.split(' ')[0]} · {new Date().toLocaleDateString('ru-RU', {
                  day:'numeric', month:'long' })}
              </div>
            )}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:18, color:C.gold, fontWeight:700,
              fontFamily:"'Cinzel',serif", letterSpacing:1,
              textShadow:`0 1px 6px rgba(212,175,55,0.35)` }}>{moon.e} {moon.n}</div>
            <div style={{ marginTop:4, fontSize:10, fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:2, color:C.text3, textTransform:'uppercase', fontWeight:500 }}>
              {new Date().toLocaleDateString('ru-RU', { weekday:'long' })}
            </div>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ maxWidth:960, margin:'0 auto', padding:'20px 24px 48px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg, transparent, ${C.navy})`, opacity:0.12 }} />
            <div style={{ fontFamily:"'JetBrains Mono',monospace",
              fontSize:9, letterSpacing:3.5, color:C.text3, textTransform:'uppercase' }}>Разделы</div>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg, ${C.navy}, transparent)`, opacity:0.12 }} />
          </div>

          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
            gap:14,
          }}>
            {SECTIONS.map(section => (
              <SectionCard
                key={section.id}
                section={section}
                fullWidth={section.wide}
                onClick={() => onNavigate(section.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <SyncPanel />
    </div>
  );
}

function SectionScreen({ sectionId, onBack }) {
  const section = SECTIONS.find(s => s.id === sectionId) || SECTIONS[0];
  const { toastMsg } = useApp();
  const [imgOk,       setImgOk]       = useState(true);
  const [imgHeaderOk, setImgHeaderOk] = useState(true);

  const COMPONENTS = {
    today: TodaySection, schedule: ScheduleSection, work: WorkSection,
    home: HomeSection, shopping: ShoppingSection, pets: PetsSection,
    car: CarSection, health: HealthSection, beauty: BeautySection,
    hobbies: HobbiesSection, travel: TravelSection,
    journal: JournalSection, profile: ProfileSection,
  };
  const Component = COMPONENTS[sectionId];

  return (
    <div style={{ minHeight:'100vh', ...bgGrid, display:'flex', flexDirection:'column' }}>
      <Toast msg={toastMsg} />

      {/* Шапка раздела */}
      <div style={{
        position:'sticky', top:0, zIndex:10,
        borderBottom:`3px solid ${C.navy}`,
        boxShadow:'0 3px 16px rgba(10,37,64,0.12)',
        overflow:'hidden',
      }}>
        <div style={{ position:'relative', height:90, overflow:'hidden' }}>
          {imgHeaderOk && (
            <img src={section.img} alt={section.name}
              onError={() => setImgHeaderOk(false)}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%',
                objectFit:'cover', opacity:0.22 }}
            />
          )}
          <div style={{ position:'absolute', inset:0,
            background:`linear-gradient(135deg, rgba(245,232,199,0.94) 0%, rgba(232,217,184,0.94) 100%)` }} />
          <div style={{ position:'absolute', inset:0,
            backgroundImage:`
              linear-gradient(rgba(10,37,64,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(10,37,64,0.04) 1px, transparent 1px)
            `,
            backgroundSize:'20px 20px' }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1.5,
            background:`linear-gradient(90deg, transparent, ${C.gold} 20%, ${C.gold} 80%, transparent)`,
            opacity:0.5 }} />

          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center' }}>
            <div style={{ maxWidth:960, width:'100%', margin:'0 auto',
              padding:'0 20px', display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={onBack} style={{
                width:38, height:38, borderRadius:'50%',
                background:'rgba(245,232,199,0.95)',
                border:`2px solid ${C.line}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', fontSize:18, color:C.navy,
                flexShrink:0, fontWeight:700,
              }}>←</button>

              <div style={{ width:44, height:44, borderRadius:9,
                background:section.color, flexShrink:0, overflow:'hidden',
                border:`2px solid ${C.goldDeep}`,
                boxShadow:'0 2px 8px rgba(10,37,64,0.20)' }}>
                {imgOk ? (
                  <img src={section.img} alt=""
                    onError={() => setImgOk(false)}
                    style={{ width:'100%', height:'100%', objectFit:'cover' }}
                  />
                ) : (
                  <div style={{ width:'100%', height:'100%',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                    {section.emoji}
                  </div>
                )}
              </div>

              <div style={{ flex:1 }}>
                <div style={{ fontSize:22, fontWeight:700, color:C.navy,
                  fontFamily:"'Cinzel',serif", letterSpacing:3, textTransform:'uppercase',
                  textShadow:'0 1px 0 rgba(255,255,255,0.7)', lineHeight:1.1 }}>
                  {section.name}
                </div>
                <div style={{ fontSize:10, color:C.text3,
                  fontFamily:"'JetBrains Mono',monospace",
                  letterSpacing:2, textTransform:'uppercase', marginTop:3, fontWeight:500 }}>
                  {new Date().toLocaleDateString('ru-RU', {
                    weekday:'short', day:'numeric', month:'long' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'0 0 80px 0' }}>
          {Component && <Component />}
        </div>
      </div>

      <SyncPanel />
    </div>
  );
}

function AppContent() {
  const { profile, sections, setSections } = useApp();
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!profile) return;
    const needsUpdate = sections.some(s => s.id === 'goals') || sections.length === 0;
    if (needsUpdate) {
      setSections(SECTIONS.map(s => ({ id: s.id, name: s.name, vis: true })));
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
