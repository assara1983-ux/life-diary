// src/sections/BeautySection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function isDue(task, today) {
  const last = task.lastDone;
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);

  if (!task.freq) return false;
  if (task.doneDate === today) return false;

  if (task.freq === 'daily') return last !== today;
  if (task.freq === 'workdays') {
    const dn = d.getDay();
    return dn >= 1 && dn <= 5 && last !== today;
  }
  if (task.freq.startsWith('weekly:')) {
    return task.freq.split(':')[1].split(',').map(Number).includes(d.getDay()) && last !== today;
  }
  if (task.freq.startsWith('every:')) {
    const n = parseInt(task.freq.split(':')[1]);
    if (!last) return true;
    return Math.floor((d - new Date(last)) / 86400000) >= n;
  }
  if (task.freq.startsWith('monthly:')) {
    return task.freq.split(':')[1].split(',').map(Number).includes(d.getDate()) && last !== today;
  }
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

function buildKB(p) {
  return `Пользователь: ${p.name || '—'}, ${p.gender || '—'}. Тип кожи: ${p.skinType || '—'}. ${p.gender === 'Мужской' ? 'Борода: ' + (p.beard || '—') : 'Волосы: ' + (p.hairType || '—')}. Приоритет в уходе: ${p.beautyPriority || '—'}.`;
}
export function BeautySection() {
  const { profile, tasks, setTasks, beautyProcs, setBeautyProcs, beautyTopics, setBeautyTopics } = useApp();
  const [modal, setModal] = useState(null);
  const [procsOpen, setProcsOpen] = useState(true);
  const [todayOpen, setTodayOpen] = useState(true);
  const [chooseOpen, setChooseOpen] = useState(true);

  const isMale = profile.gender === 'Мужской';
  const beautyTasks = tasks.filter(t => t.section === 'beauty');
  const today = new Date().toISOString().split('T')[0];
  const due = beautyTasks.filter(t => isDue(t, today));

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
      { id: 'face_mask', name: 'Маска для лица', freq: 'every:3', time: '20:00', icon: '🎭', dur: 20, moon: true },
      { id: 'face_scrub', name: 'Скраб / пилинг', freq: 'every:7', time: '20:00', icon: '🫧', dur: 10, moon: 'убывающая' },
      { id: 'eye_care', name: 'Крем для глаз', freq: 'daily', time: '21:00', icon: '👁', dur: 3 },
    ]},
    { cat: 'Уход за телом', items: [
      { id: 'body_cream', name: 'Крем для тела', freq: 'daily', time: '20:00', icon: '🧴', dur: 5 },
      { id: 'body_scrub', name: 'Скраб для тела', freq: 'every:4', time: '20:00', icon: '🫧', dur: 15, moon: 'убывающая' },
      { id: 'depo', name: 'Депиляция / эпиляция', freq: 'every:14', time: '', icon: '✨', dur: 30, moon: 'убывающая' },
      { id: 'tan', name: 'Автозагар', freq: 'every:7', time: '', icon: '🌅', dur: 10 },
    ]},
    { cat: 'Уход за волосами', items: [
      { id: 'hair_wash', name: 'Мытьё волос', freq: 'every:2', time: '20:00', icon: '🚿', dur: 20 },
      { id: 'hair_mask', name: 'Маска для волос', freq: 'every:7', time: '20:00', icon: '💆', dur: 40, moon: true },      { id: 'hair_oil', name: 'Масло для волос', freq: 'every:7', time: '', icon: '🫙', dur: 10 },
      { id: 'haircut', name: 'Стрижка', freq: 'every:30', time: '', icon: '✂️', dur: 60, moon: 'растущая' },
      { id: 'coloring', name: 'Окрашивание', freq: 'every:42', time: '', icon: '🎨', dur: 120 },
    ]},
    { cat: 'Маникюр и ногти', items: [
      { id: 'nails', name: 'Маникюр', freq: 'every:21', time: '', icon: '💅', dur: 60, moon: true },
      { id: 'ped', name: 'Педикюр', freq: 'every:30', time: '', icon: '🦶', dur: 60 },
      { id: 'nail_care', name: 'Уход за кутикулой', freq: 'every:3', time: '21:00', icon: '🤲', dur: 5 },
    ]},
    { cat: 'Брови и ресницы', items: [
      { id: 'brows', name: 'Коррекция бровей', freq: 'every:14', time: '', icon: '🪞', dur: 20 },
      { id: 'lash', name: 'Наращивание ресниц', freq: 'every:21', time: '', icon: '✨', dur: 90 },
    ]},
    { cat: 'Массаж и тело', items: [
      { id: 'massage', name: 'Массаж лица', freq: 'every:3', time: '21:00', icon: '💆', dur: 15 },
      { id: 'lymph', name: 'Лимфодренажный массаж', freq: 'every:7', time: '', icon: '🫀', dur: 30 },
      { id: 'bath', name: 'Ванна с солью / пеной', freq: 'every:7', time: '21:00', icon: '🛁', dur: 30, moon: true },
    ]},
  ];

  const allItems = TOPICS.flatMap(t => t.items);

  const confirmProc = (item, settings) => {
    const { time, duration, day, date, startDate } = settings;
    const n = parseInt((item.freq || '').split(':')[1] || 0);
    const isRareFreq = item.freq && item.freq.startsWith('every:') && n >= 14;
    const isSliding = item.freq && item.freq.startsWith('every:') && n > 0 && n < 14;

    setTasks(p => {
      const without = p.filter(t => !(t.section === 'beauty' && t.beautyId === item.id));
      const newTask = {
        id: Date.now() + Math.random(),
        beautyId: item.id,
        title: item.name,
        section: 'beauty',
        freq: item.freq,
        priority: 'm',
        preferredTime: time,
        beautyDuration: duration,
        deadline: isRareFreq ? (date || '') : '',
        beautyStartDate: isSliding ? (startDate || new Date().toISOString().split('T')[0]) : '',
        notes: item.note || '',
        lastDone: '', doneDate: ''
      };
      return [...without, newTask];
    });

    setBeautyProcs(p => ({ ...p, [item.id]: { time, duration, day, date, startDate, confirmed: true } }));
  };
  // --- СТИЛИ "ВИКТОРИАНСКИЙ ДНЕВНИК" ---
  const styles = {
    page: {
      background: 'linear-gradient(180deg, #f4ecd8 0%, #e8dcc4 50%, #d4c4a8 100%)',
      padding: '24px 20px',
      minHeight: '100%',
      color: '#2c241b',
      fontFamily: "'Cormorant Garamond', serif",
      boxShadow: 'inset 0 0 60px rgba(101,67,33,0.2)',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(139,115,85,0.05) 31px, rgba(139,115,85,0.05) 32px)',
    },
    header: {
      fontFamily: "'Dancing Script', cursive",
      fontSize: '32px',
      color: '#3d2817',
      textAlign: 'center',
      marginBottom: '20px',
      fontWeight: 700,
      textShadow: '1px 1px 0 rgba(255,255,255,0.5)',
    },
    section: {
      marginBottom: '20px',
      padding: '15px',
      background: 'rgba(255,255,255,0.25)',
      borderLeft: '3px solid #8b7355',
      borderRadius: '2px',
    },
    sectionTitle: {
      fontFamily: "'Playfair Display', serif",
      fontSize: '16px',
      color: '#5d4a3a',
      fontStyle: 'italic',
      marginBottom: '10px',
      borderBottom: '1px solid #a89070',
      paddingBottom: '4px',
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 0',
      borderBottom: '1px dotted #c4b898',
      fontSize: '16px',
    },
    itemTime: {
      marginLeft: 'auto',
      fontFamily: "'Marck Script', cursive",
      color: '#6b5a4a',
      fontSize: '16px',
    },    buttonVintage: {
      width: '100%',
      padding: '10px',
      marginTop: '15px',
      background: 'linear-gradient(180deg, #e8dcc4 0%, #d4c4a8 100%)',
      border: '2px solid #8b7355',
      borderRadius: '4px',
      color: '#2c241b',
      fontFamily: "'Playfair Display', serif",
      fontSize: '14px',
      cursor: 'pointer',
      fontWeight: 600,
    },
    tag: {
      fontSize: '12px',
      padding: '2px 8px',
      borderRadius: '12px',
      background: 'rgba(139,115,85,0.15)',
      border: '1px solid #8b7355',
      color: '#5d4a3a',
    }
  };

  return (
    <div style={styles.page}>
      {/* Шапка */}
      <div style={styles.header}>Beauty Journal</div>

      {/* Профиль */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 20, opacity: 0.8 }}>
        {profile.skinType && <span style={styles.tag}>✨ {profile.skinType}</span>}
        {!isMale && profile.hairType && <span style={styles.tag}>💇 {profile.hairType}</span>}
      </div>

      {/* Выбор процедур */}
      <div onClick={() => setChooseOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginBottom: chooseOpen ? 10 : 0, color: '#5d4a3a', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
        <span style={{ fontSize: '14px' }}>{chooseOpen ? '▲' : '▼'}</span>
        <span>Выбрать процедуры</span>
      </div>

      {chooseOpen && (
        <div>
          {TOPICS.map(cat => (
            <div key={cat.cat} style={styles.section}>
              <div style={styles.sectionTitle}>{cat.cat}</div>
              {cat.items.map(item => {
                const sel = beautyTopics.includes(item.id);
                const s = beautyProcs[item.id] || {};
                const confirmed = s.confirmed === true;
                return (                  <div key={item.id} style={{ ...styles.item, borderBottom: 'none', cursor: 'pointer' }} onClick={() => { if (!sel) setBeautyTopics(p => [...p, item.id]); }}>
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: confirmed ? 700 : 400, color: confirmed ? '#1a4d3e' : '#2c241b' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', opacity: 0.7 }}>{freqLabel(item.freq)}</div>
                    </div>
                    {confirmed && <span style={{ color: '#1a4d3e', fontSize: '18px' }}>✓</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Мои процедуры */}
      {beautyTasks.length > 0 && (
        <div style={styles.section}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: procsOpen ? 10 : 0, color: '#5d4a3a', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }} onClick={() => setProcsOpen(o => !o)}>
            <span>{procsOpen ? '▲' : '▼'}</span>
            <span>Мои ритуалы ({beautyTasks.length})</span>
          </div>
          {procsOpen && beautyTasks.map(task => (
            <div key={task.id} style={styles.item}>
              <span style={{ fontSize: '18px' }}>{allItems.find(i => i.id === task.beautyId)?.icon || '✨'}</span>
              <div style={{ flex: 1 }}>
                <div>{task.title}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{freqLabel(task.freq)} · {task.beautyDuration} мин</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Сегодня */}
      {due.length > 0 && (
        <div style={{ ...styles.section, background: 'rgba(255,255,255,0.4)', borderLeft: '3px solid #b86b5d' }}>
          <div style={{ ...styles.sectionTitle, color: '#b86b5d', borderColor: '#b86b5d' }}>Сегодня</div>
          {due.map(task => (
            <div key={task.id} style={{ ...styles.item, borderBottom: 'none' }}>
              <div 
                onClick={() => setTasks(p => p.map(t => t.id === task.id ? { ...t, doneDate: t.doneDate === today ? null : today, lastDone: t.doneDate === today ? t.lastDone : today } : t))}
                style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #b86b5d', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: '#b86b5d', background: task.doneDate === today ? 'rgba(184,107,93,0.1)' : 'transparent' }}
              >
                {task.doneDate === today ? '✓' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ textDecoration: task.doneDate === today ? 'line-through' : 'none' }}>{task.title}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>{task.preferredTime}</div>
              </div>            </div>
          ))}
          <button style={styles.buttonVintage} onClick={() => setModal({})}>+ Добавить в дневник</button>
        </div>
      )}

      {/* AI советы */}
      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #a89070' }}>
        <AiBox
          kb={buildKB(profile)}
          prompt={`Дай персональные рекомендации по уходу. Пол: ${profile.gender}. Тип кожи: ${profile.skinType || '—'}. ${!isMale ? 'Тип волос: ' + (profile.hairType || '—') + '.' : 'Борода: ' + (profile.beard || '—') + '.'} Приоритет: ${profile.beautyPriority || '—'}. Свободное время: с ${profile.workEnd || '18:00'} до ${profile.sleep || '23:00'}.`}
          label="Советы по уходу"
          btnText="Получить советы"
          placeholder="Анализирую профиль..."
          customStyles={{
            wrapper: { background: 'rgba(255,255,255,0.3)', border: '1px solid #8b7355', borderRadius: '4px', padding: '15px' },
            title: { fontFamily: "'Playfair Display', serif", color: '#3d2817', fontSize: '18px', fontStyle: 'italic', marginBottom: '10px' },
            button: { background: '#8b7355', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontFamily: "'Playfair Display', serif" },
            input: { background: 'rgba(255,255,255,0.5)', border: '1px solid #a89070', borderRadius: '4px', padding: '8px', width: '100%', color: '#2c241b', marginBottom: '10px' }
          }}
        />
      </div>

      {modal !== null && (
        <TaskModal
          task={modal.id ? modal : null}
          defaultSection="beauty"
          onSave={t => {
            setTasks(p => modal.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
