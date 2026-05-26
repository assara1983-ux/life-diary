// src/sections/BeautySection.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { TaskModal } from '../components/TaskModal';
import { SectionHero } from '../components/SectionHero';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';

// ─── УТИЛИТЫ ───
function isDue(task, today) {
  const last = task.lastDone;
  const d = new Date(today); d.setHours(0, 0, 0, 0);
  if (!task.freq) return false;
  if (task.doneDate === today) return false;
  if (task.freq === 'daily') return last !== today;
  if (task.freq === 'workdays') { const dn = d.getDay(); return dn >= 1 && dn <= 5 && last !== today; }
  if (task.freq.startsWith('weekly:')) return task.freq.split(':')[1].split(',').map(Number).includes(d.getDay()) && last !== today;
  if (task.freq.startsWith('every:')) {
    const n = parseInt(task.freq.split(':')[1]);
    if (!last) {
      if (task.beautyStartDate) return today >= task.beautyStartDate;
      return true;
    }
    return Math.floor((d - new Date(last)) / 86400000) >= n;
  }
  if (task.freq.startsWith('monthly:')) return task.freq.split(':')[1].split(',').map(Number).includes(d.getDate()) && last !== today;
  return false;
}

function freqLabel(f) {
  if (!f || f === 'once') return 'разово';
  if (f === 'daily') return 'ежедневно';
  if (f === 'workdays') return 'пн–пт';
  if (f.startsWith('weekly:')) {
    const m = { 0: 'вс', 1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб' };
    return f.split(':')[1].split(',').map(n => m[n]).join(', ');
  }
  if (f.startsWith('every:')) return `каждые ${f.split(':')[1]} дн.`;
  if (f.startsWith('monthly:')) return `${f.split(':')[1]} числа`;
  return f;
}

function timeSlot(time) {
  if (!time) return 'вечер';
  const h = parseInt(time.split(':')[0]);
  if (h < 12) return 'утро';
  if (h < 17) return 'день';
  return 'вечер';
}

const SLOT_LABELS = { утро: '🌅 Утро', день: '☀️ День', вечер: '🌙 Вечер' };

// ─── SVG ИЛЛЮСТРАЦИЯ ───
function BeautyIllustration() {
  return (
    <svg viewBox="0 0 360 140" style={{ width: '100%', height: 'auto', display: 'block', marginBottom: 20 }}>
      <defs>
        <radialGradient id="bbg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(184,107,93,0.15)" />
          <stop offset="100%" stopColor="rgba(184,107,93,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="70" rx="160" ry="60" fill="url(#bbg)" />
      {/* Зеркало */}
      <ellipse cx="180" cy="65" rx="38" ry="44" fill="none" stroke="rgba(184,107,93,0.5)" strokeWidth="2" />
      <ellipse cx="180" cy="63" rx="30" ry="36" fill="rgba(184,107,93,0.06)" stroke="rgba(184,107,93,0.3)" strokeWidth="1" />
      <line x1="180" y1="109" x2="180" y2="125" stroke="rgba(184,107,93,0.4)" strokeWidth="2" />
      <ellipse cx="180" cy="128" rx="14" ry="4" fill="none" stroke="rgba(184,107,93,0.3)" strokeWidth="1.5" />
      {/* Блики */}
      <ellipse cx="165" cy="52" rx="5" ry="8" fill="rgba(255,255,255,0.25)" transform="rotate(-20 165 52)" />
      {/* Искры */}
      {[[60,30],[300,25],[40,95],[320,90],[130,18],[230,18]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="rgba(184,107,93,0.6)">
          <animate attributeName="opacity" values="0;1;0" dur={`${1.5+i*0.3}s`} begin={`${i*0.2}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* Цветы */}
      {[[80,85],[280,80]].map(([cx,cy],fi) => (
        <g key={fi}>
          {[0,60,120,180,240,300].map((a,pi) => (
            <ellipse key={pi} cx={cx + 10*Math.cos(a*Math.PI/180)} cy={cy + 10*Math.sin(a*Math.PI/180)} rx="5" ry="3" fill="rgba(184,107,93,0.25)" transform={`rotate(${a} ${cx + 10*Math.cos(a*Math.PI/180)} ${cy + 10*Math.sin(a*Math.PI/180)})`} />
          ))}
          <circle cx={cx} cy={cy} r="4" fill="rgba(200,164,90,0.5)" />
        </g>
      ))}
      <text x="180" y="72" textAnchor="middle" fontSize="11" fill="rgba(184,107,93,0.7)" fontFamily="'Cormorant Infant',serif" fontStyle="italic">Beauty Journal</text>
    </svg>
  );
}

// ─── ПРОГРЕСС-КОЛЬЦО ───
function ProgressRing({ done, total, size = 56 }) {
  const r = 22, c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(184,107,93,0.15)" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(184,107,93,0.7)" strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fill="rgba(184,107,93,0.9)" fontFamily="'JetBrains Mono',monospace">{done}/{total}</text>
    </svg>
  );
}

// ─── КОМПОНЕНТ: Inline-форма настройки процедуры ───
function ProcSettingsForm({ item, value, onChange }) {
  const isSliding = item.freq && item.freq.startsWith('every:') && parseInt(item.freq.split(':')[1]) > 0;
  const isWeekly = item.freq && item.freq.startsWith('weekly:');
  const weekDays = [['1','Пн'],['2','Вт'],['3','Ср'],['4','Чт'],['5','Пт'],['6','Сб'],['0','Вс']];

  return (
    <div style={{ padding: '10px 12px', background: 'rgba(184,107,93,0.05)', borderRadius: 8, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>ВРЕМЯ</span>
          <input
            type="time"
            value={value.time || item.time || ''}
            onChange={e => onChange({ ...value, time: e.target.value })}
            style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,107,93,0.3)', borderRadius: 6, color: T.text0, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, outline: 'none', width: 100 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>ДЛИТ. (МИН)</span>
          <input
            type="number"
            value={value.duration || item.dur || ''}
            onChange={e => onChange({ ...value, duration: e.target.value })}
            style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,107,93,0.3)', borderRadius: 6, color: T.text0, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, outline: 'none', width: 80 }}
          />
        </div>
      </div>
      {isWeekly && (
        <div>
          <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, display: 'block', marginBottom: 4 }}>ДЕНЬ НЕДЕЛИ</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {weekDays.map(([v, l]) => (
              <div key={v}
                onClick={() => onChange({ ...value, weekDay: v })}
                style={{ padding: '4px 10px', borderRadius: 14, fontSize: 12, cursor: 'pointer', border: `1px solid ${value.weekDay === v ? 'rgba(184,107,93,0.6)' : 'rgba(255,255,255,0.1)'}`, background: value.weekDay === v ? 'rgba(184,107,93,0.2)' : 'transparent', color: value.weekDay === v ? 'rgba(184,107,93,1)' : T.text2 }}
              >{l}</div>
            ))}
          </div>
        </div>
      )}
      {isSliding && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>ДАТА НАЧАЛА</span>
          <input
            type="date"
            value={value.startDate || new Date().toISOString().split('T')[0]}
            onChange={e => onChange({ ...value, startDate: e.target.value })}
            style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(184,107,93,0.3)', borderRadius: 6, color: T.text0, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function BeautySection() {
  const app = useApp();
  const profile = app.profile || {};
  const tasks = app.tasks || [];
  const setTasks = app.setTasks || (() => {});
  const beautyProcs = app.beautyProcs || {};
  const setBeautyProcs = app.setBeautyProcs || (() => {});
  const beautyTopics = app.beautyTopics || [];
  const setBeautyTopics = app.setBeautyTopics || (() => {});

  const [modal, setModal] = useState(null);
  const [openCats, setOpenCats] = useState({});
  const [settingsOpen, setSettingsOpen] = useState({});
  const [pendingSettings, setPendingSettings] = useState({});
  const [myProcsOpen, setMyProcsOpen] = useState(true);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const isMale = profile.gender === 'Мужской';
  const today = new Date().toISOString().split('T')[0];
  const beautyTasks = tasks.filter(t => t.section === 'beauty');
  const due = beautyTasks.filter(t => isDue(t, today));
  const doneToday = beautyTasks.filter(t => t.doneDate === today).length;

  // ─── Рекомендации по типу кожи ───
  const skinTips = {
    'Сухая': 'Увлажнение — приоритет. Избегай спиртосодержащих средств.',
    'Жирная': 'Лёгкие некомедогенные текстуры. Кислотное очищение 2×/нед.',
    'Комбинированная': 'Раздельный уход для Т-зоны и щёк.',
    'Чувствительная': 'Минимализм в составах. Без отдушек и агрессивных кислот.',
    'Нормальная': 'Поддерживающий уход. Профилактика — лучшее лечение.',
  };

  const TOPICS = isMale ? [
    { cat: 'Лицо', items: [
      { id: 'face_morning', name: 'Умывание утром', freq: 'daily', time: '07:00', icon: '💧', dur: 10 },
      { id: 'face_evening', name: 'Умывание вечером', freq: 'daily', time: '21:00', icon: '🌙', dur: 10 },
      { id: 'face_scrub', name: 'Скраб для лица', freq: 'every:7', time: '19:00', icon: '🫧', dur: 10 },
      { id: 'face_mask', name: 'Маска для лица', freq: 'every:7', time: '20:00', icon: '🎭', dur: 20 },
    ]},
    { cat: 'Тело', items: [
      { id: 'body_cream', name: 'Крем для тела', freq: 'daily', time: '20:00', icon: '🧴', dur: 5 },
      { id: 'body_scrub', name: 'Скраб для тела', freq: 'every:7', time: '20:00', icon: '🫧', dur: 15 },
    ]},
    { cat: 'Борода и волосы', items: [
      { id: 'beard_care', name: 'Уход за бородой', freq: 'every:2', time: '08:00', icon: '🧔', dur: 10 },
      { id: 'hair_wash', name: 'Мытьё волос', freq: 'every:2', time: '20:00', icon: '🚿', dur: 20 },
      { id: 'haircut', name: 'Стрижка / барбер', freq: 'every:30', time: '', icon: '✂️', dur: 60 },
    ]},
    { cat: 'Руки и ногти', items: [
      { id: 'hand_cream', name: 'Крем для рук', freq: 'daily', time: '21:00', icon: '🤲', dur: 3 },
      { id: 'nails_m', name: 'Стрижка ногтей', freq: 'every:10', time: '', icon: '💅', dur: 10 },
    ]},
  ] : [
    { cat: 'Уход за лицом', items: [
      { id: 'face_morning', name: 'Утренний уход', freq: 'daily', time: '07:00', icon: '☀️', dur: 10, note: 'Очищение → тоник → крем' },
      { id: 'face_evening', name: 'Вечерний уход', freq: 'daily', time: '21:00', icon: '🌙', dur: 15, note: 'Снятие макияжа → очищение → сыворотка → крем' },
      { id: 'face_mask', name: 'Маска для лица', freq: 'every:3', time: '20:00', icon: '🎭', dur: 20 },
      { id: 'face_scrub', name: 'Скраб / пилинг', freq: 'every:7', time: '20:00', icon: '🫧', dur: 10 },
      { id: 'eye_care', name: 'Крем для глаз', freq: 'daily', time: '21:00', icon: '👁', dur: 3 },
    ]},
    { cat: 'Уход за телом', items: [
      { id: 'body_cream', name: 'Крем для тела', freq: 'daily', time: '20:00', icon: '🧴', dur: 5 },
      { id: 'body_scrub', name: 'Скраб для тела', freq: 'every:4', time: '20:00', icon: '🫧', dur: 15 },
      { id: 'depo', name: 'Депиляция / эпиляция', freq: 'every:14', time: '', icon: '✨', dur: 30 },
      { id: 'tan', name: 'Автозагар', freq: 'every:7', time: '', icon: '🌅', dur: 10 },
    ]},
    { cat: 'Уход за волосами', items: [
      { id: 'hair_wash', name: 'Мытьё волос', freq: 'every:2', time: '20:00', icon: '🚿', dur: 20 },
      { id: 'hair_mask', name: 'Маска для волос', freq: 'every:7', time: '20:00', icon: '💆', dur: 40 },
      { id: 'hair_oil', name: 'Масло для волос', freq: 'every:7', time: '', icon: '🫙', dur: 10 },
      { id: 'haircut', name: 'Стрижка', freq: 'every:30', time: '', icon: '✂️', dur: 60 },
      { id: 'coloring', name: 'Окрашивание', freq: 'every:42', time: '', icon: '🎨', dur: 120 },
    ]},
    { cat: 'Маникюр и ногти', items: [
      { id: 'nails', name: 'Маникюр', freq: 'every:21', time: '', icon: '💅', dur: 60 },
      { id: 'ped', name: 'Педикюр', freq: 'every:30', time: '', icon: '🦶', dur: 60 },
      { id: 'nail_care', name: 'Уход за кутикулой', freq: 'every:3', time: '21:00', icon: '🤲', dur: 5 },
    ]},
    { cat: 'Брови и ресницы', items: [
      { id: 'brows', name: 'Коррекция бровей', freq: 'every:14', time: '', icon: '🪞', dur: 20 },
      { id: 'lash', name: 'Наращивание ресниц', freq: 'every:21', time: '', icon: '✨', dur: 90 },
    ]},
    { cat: 'Массаж и релакс', items: [
      { id: 'massage', name: 'Массаж лица', freq: 'every:3', time: '21:00', icon: '💆', dur: 15 },
      { id: 'lymph', name: 'Лимфодренажный массаж', freq: 'every:7', time: '', icon: '🫀', dur: 30 },
      { id: 'bath', name: 'Ванна с солью / пеной', freq: 'every:7', time: '21:00', icon: '🛁', dur: 30 },
    ]},
  ];

  const allItems = TOPICS.flatMap(t => t.items);

  const confirmProc = (item) => {
    const s = pendingSettings[item.id] || {};
    const time = s.time || item.time || '';
    const duration = s.duration || item.dur || 10;
    const startDate = s.startDate || today;
    const weekDay = s.weekDay || '';

    const freq = weekDay && item.freq.startsWith('weekly:')
      ? `weekly:${weekDay}`
      : item.freq;

    setTasks(p => {
      const without = p.filter(t => !(t.section === 'beauty' && t.beautyId === item.id));
      return [...without, {
        id: Date.now() + Math.random(),
        beautyId: item.id,
        title: item.name,
        section: 'beauty',
        freq,
        priority: 'm',
        preferredTime: time,
        beautyDuration: parseInt(duration),
        beautyStartDate: startDate,
        notes: item.note || '',
        lastDone: '', doneDate: ''
      }];
    });
    setBeautyProcs(p => ({ ...p, [item.id]: { time, duration, startDate, weekDay, confirmed: true } }));
    setBeautyTopics(p => p.includes(item.id) ? p : [...p, item.id]);
    setSettingsOpen(p => ({ ...p, [item.id]: false }));
  };

  const removeProc = (beautyId) => {
    setTasks(p => p.filter(t => !(t.section === 'beauty' && t.beautyId === beautyId)));
    setBeautyProcs(p => { const n = { ...p }; delete n[beautyId]; return n; });
    setBeautyTopics(p => p.filter(id => id !== beautyId));
  };

  const updateProcTime = (task, newTime) => {
    setTasks(p => p.map(t => t.id === task.id ? { ...t, preferredTime: newTime } : t));
    if (task.beautyId) {
      setBeautyProcs(p => ({ ...p, [task.beautyId]: { ...(p[task.beautyId] || {}), time: newTime } }));
    }
  };

  // Группировка моих процедур по времени суток
  const groupedBySlot = useMemo(() => {
    const groups = { утро: [], день: [], вечер: [] };
    beautyTasks.forEach(t => {
      const slot = timeSlot(t.preferredTime);
      groups[slot].push(t);
    });
    Object.keys(groups).forEach(k => {
      groups[k].sort((a, b) => (a.preferredTime || '').localeCompare(b.preferredTime || ''));
    });
    return groups;
  }, [beautyTasks]);

  return (
    <div>
      <SectionHero sectionId="beauty" />
      <BeautyIllustration />

      {/* ─── Шапка: прогресс + рекомендация по коже ─── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
        <ProgressRing done={doneToday} total={due.length + doneToday} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 18, color: T.text0, marginBottom: 4 }}>
            Beauty Journal
          </div>
          {profile.skinType && (
            <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5, padding: '6px 10px', background: 'rgba(184,107,93,0.06)', borderRadius: 8, borderLeft: '2px solid rgba(184,107,93,0.4)' }}>
              💆 <strong>{profile.skinType} кожа:</strong> {skinTips[profile.skinType] || 'Регулярный уход — основа здоровья кожи.'}
            </div>
          )}
        </div>
      </div>

      {/* ─── Мои процедуры — сгруппированы по времени суток ─── */}
      <div style={{ marginBottom: 14 }}>
        <div
          onClick={() => setMyProcsOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: myProcsOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(184,107,93,0.06)', border: '1px solid rgba(184,107,93,0.2)' }}
        >
          <span style={{ fontSize: 16 }}>✨</span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: 'rgba(184,107,93,1)', fontWeight: 500 }}>
            Мои ритуалы ({beautyTasks.length})
          </span>
          <span style={{ fontSize: 11, color: T.text3 }}>{myProcsOpen ? '▲' : '▼'}</span>
        </div>

        {myProcsOpen && (
          <div style={{ border: '1px solid rgba(184,107,93,0.15)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 12 }}>
            {beautyTasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: T.text3, fontSize: 13, fontStyle: 'italic' }}>
                Выбери процедуры из каталога ниже
              </div>
            )}
            {Object.entries(SLOT_LABELS).map(([slot, label]) => {
              const items = groupedBySlot[slot];
              if (!items?.length) return null;
              return (
                <div key={slot} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(184,107,93,0.8)', letterSpacing: 1.5, marginBottom: 8 }}>{label}</div>
                  {items.map(task => {
                    const itemDef = allItems.find(i => i.id === task.beautyId);
                    const isDueToday = isDue(task, today);
                    return (
                      <div key={task.id} style={{ padding: '8px 10px', marginBottom: 6, background: task.doneDate === today ? 'rgba(45,106,79,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${task.doneDate === today ? 'rgba(45,106,79,0.2)' : 'rgba(184,107,93,0.12)'}`, borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Чекбокс */}
                          <div
                            onClick={() => setTasks(p => p.map(t => t.id === task.id ? { ...t, doneDate: t.doneDate === today ? null : today, lastDone: t.doneDate === today ? t.lastDone : today } : t))}
                            style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${task.doneDate === today ? 'rgba(45,106,79,0.6)' : 'rgba(184,107,93,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: task.doneDate === today ? 'rgba(45,106,79,0.15)' : 'transparent', flexShrink: 0 }}
                          >
                            {task.doneDate === today && <span style={{ fontSize: 11, color: '#2d6a4f' }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 16 }}>{itemDef?.icon || '✨'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: task.doneDate === today ? T.text3 : T.text1, textDecoration: task.doneDate === today ? 'line-through' : 'none' }}>{task.title}</div>
                            <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>
                              {task.preferredTime} · {task.beautyDuration} мин · {freqLabel(task.freq)}
                              {!isDueToday && <span style={{ marginLeft: 6, color: 'rgba(184,107,93,0.5)' }}>· не сегодня</span>}
                            </div>
                          </div>
                          {/* Редактировать время */}
                          <input
                            type="time"
                            value={task.preferredTime || ''}
                            onChange={e => updateProcTime(task, e.target.value)}
                            style={{ width: 80, padding: '3px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(184,107,93,0.2)', borderRadius: 6, color: T.text2, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, outline: 'none' }}
                          />
                          {/* Удалить */}
                          <span onClick={() => removeProc(task.beautyId)} style={{ fontSize: 12, color: T.text3, cursor: 'pointer', opacity: 0.5, padding: '0 4px' }}>✕</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Каталог процедур (аккордеон) ─── */}
      <div style={{ marginBottom: 14 }}>
        <div
          onClick={() => setChooseOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: chooseOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span style={{ fontSize: 16 }}>📋</span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.text1, fontWeight: 500 }}>Каталог процедур</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{chooseOpen ? '▲' : '▼'}</span>
        </div>

        {chooseOpen && (
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 12 }}>
            {TOPICS.map(cat => {
              const isCatOpen = openCats[cat.cat];
              return (
                <div key={cat.cat} style={{ marginBottom: 8 }}>
                  <div
                    onClick={() => setOpenCats(p => ({ ...p, [cat.cat]: !p[cat.cat] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(184,107,93,0.06)', borderRadius: isCatOpen ? '8px 8px 0 0' : 8, cursor: 'pointer', border: '1px solid rgba(184,107,93,0.15)' }}
                  >
                    <span style={{ flex: 1, fontSize: 13, color: 'rgba(184,107,93,0.9)', fontFamily: "'Crimson Pro',serif", fontWeight: 500 }}>{cat.cat}</span>
                    <span style={{ fontSize: 11, color: T.text3 }}>{isCatOpen ? '▲' : '▼'}</span>
                  </div>

                  {isCatOpen && (
                    <div style={{ border: '1px solid rgba(184,107,93,0.1)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '4px 0' }}>
                      {cat.items.map(item => {
                        const confirmed = beautyProcs[item.id]?.confirmed;
                        const isSettOpen = settingsOpen[item.id];
                        return (
                          <div key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '8px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 18 }}>{item.icon}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, color: confirmed ? '#2d6a4f' : T.text1, fontWeight: confirmed ? 600 : 400 }}>{item.name}</div>
                                <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>
                                  {freqLabel(item.freq)} · {item.dur} мин
                                </div>
                              </div>
                              {confirmed
                                ? <span style={{ fontSize: 13, color: '#2d6a4f' }}>✓ Добавлено</span>
                                : (
                                  <button
                                    onClick={() => setSettingsOpen(p => ({ ...p, [item.id]: !p[item.id] }))}
                                    style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(184,107,93,0.4)', background: isSettOpen ? 'rgba(184,107,93,0.15)' : 'transparent', color: 'rgba(184,107,93,0.9)', cursor: 'pointer', fontSize: 12 }}
                                  >
                                    {isSettOpen ? 'Скрыть' : '+ Добавить'}
                                  </button>
                                )
                              }
                            </div>

                            {/* Inline-форма настройки */}
                            {isSettOpen && !confirmed && (
                              <>
                                <ProcSettingsForm
                                  item={item}
                                  value={pendingSettings[item.id] || {}}
                                  onChange={v => setPendingSettings(p => ({ ...p, [item.id]: v }))}
                                />
                                <button
                                  onClick={() => confirmProc(item)}
                                  style={{ marginTop: 8, padding: '7px 18px', borderRadius: 8, border: 'none', background: 'rgba(184,107,93,0.8)', color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: "'Crimson Pro',serif" }}
                                >
                                  ✓ Подтвердить
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── ИИ-рекомендации ─── */}
      <div>
        <div
          onClick={() => setAiOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: aiOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span>🤖</span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.text1, fontWeight: 500 }}>ИИ-рекомендации по уходу</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{aiOpen ? '▲' : '▼'}</span>
        </div>
        {aiOpen && (
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <AiBox
              kb={`Профиль: ${profile.name || '—'}, ${profile.gender || '—'}. Тип кожи: ${profile.skinType || '—'}. Тип волос: ${profile.hairType || '—'}. Приоритет ухода: ${profile.beautyPriority || '—'}. Маникюр: ${profile.nailFreq || '—'}. ТКМ-конституция: температура ${profile.tcmTemp || '—'}, влажность ${profile.tcmMoisture || '—'}, эмоции ${profile.tcmEmotion || '—'}.`}
              prompt={`Тип кожи: ${profile.skinType || '—'}. Тип волос: ${profile.hairType || '—'}. Приоритет: ${profile.beautyPriority || '—'}. ТКМ: ${profile.tcmTemp || '—'}, ${profile.tcmMoisture || '—'}. Выбранные процедуры: ${beautyTasks.map(t => t.title).join(', ') || 'не выбраны'}.\n\nДай персональные рекомендации:\n1. Что добавить в рутину исходя из типа кожи и ТКМ-профиля\n2. Какие процедуры лучше делать по У-Син в текущий сезон\n3. Три простых лайфхака для усиления эффекта выбранных процедур`}
              label="Персональный уход"
              btnText="✦ Получить рекомендации"
              placeholder="Анализирую профиль и составляю план ухода..."
            />
          </div>
        )}
      </div>

      {modal !== null && (
        <TaskModal
          task={modal.id ? modal : null}
          defaultSection="beauty"
          onSave={t => setTasks(p => modal.id ? p.map(x => x.id === t.id ? t : x) : [...p, t])}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
