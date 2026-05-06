// src/sections/BeautySection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';
import { T } from '../utils/theme';

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

  // Справочник длительностей
  const DURATIONS = {
    face_morning: 10, face_evening: 15, face_mask: 20, face_scrub: 10,
    eye_care: 3, body_cream: 5, body_scrub: 15, depo: 30, tan: 10,
    hair_wash: 20, hair_mask: 40, hair_oil: 10, haircut: 60, coloring: 120,
    nails: 60, ped: 60, nail_care: 5, brows: 20, lash: 90,
    massage: 15, lymph: 30, bath: 30,
    beard_care: 10, hair_wash_m: 20, nails_m: 10, body_scrub_m: 15, hand_cream: 3,
  };

  const DAY_RECS = {
    face_scrub: 'убывающая луна, пн/ср/пт',
    face_mask: 'растущая луна, вт/чт',
    hair_mask: 'растущая луна, вс',
    haircut: 'растущая луна',
    depo: 'убывающая луна',
    nails: 'растущая луна, сб/вс',
    bath: 'растущая луна, пт/сб',
    body_scrub: 'убывающая луна',
    lymph: 'вт/чт',
    massage: 'пн/чт',
    hair_oil: 'вс',
    brows: 'любой день, раз в 2 нед.',
  };

  const isRare = (freq) => {
    if (!freq) return false;
    const n = parseInt((freq.match(/every:(\d+)/) || [0, 0])[1]);
    return n >= 14;
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
      { id: 'hair_mask', name: 'Маска для волос', freq: 'every:7', time: '20:00', icon: '💆', dur: 40, moon: true },
      { id: 'hair_oil', name: 'Масло для волос', freq: 'every:7', time: '', icon: '🫙', dur: 10 },
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
    ]},    { cat: 'Массаж и тело', items: [
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

  return (
    <div>
      {/* Шапка профиля */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px', background: 'rgba(45,32,16,0.05)', borderRadius: 10, marginBottom: 12, alignItems: 'center' }}>
        {profile.skinType && <span style={{ fontSize: 12, color: T.text2 }}>✨ {profile.skinType}</span>}
        {!isMale && profile.hairType && <span style={{ fontSize: 12, color: T.text3 }}>· 💇 {profile.hairType}</span>}
        {isMale && profile.beard && <span style={{ fontSize: 12, color: T.text3 }}>· 🧔 {profile.beard}</span>}
      </div>

      {/* Выбор процедур */}
      <div onClick={() => setChooseOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: chooseOpen ? 8 : 12, padding: '6px 0' }}>
        <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5, flex: 1 }}>ВЫБЕРИ ПРОЦЕДУРЫ</div>
        <span style={{ fontSize: 11, color: T.text3 }}>{chooseOpen ? '▲' : '▼'}</span>      </div>

      {chooseOpen && (
        <div>
          {TOPICS.map(cat => (
            <div key={cat.cat} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.gold, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 6 }}>{cat.cat.toUpperCase()}</div>
              {cat.items.map(item => {
                const sel = beautyTopics.includes(item.id);
                const s = beautyProcs[item.id] || {};
                const confirmed = s.confirmed === true;

                return (
                  <div key={item.id}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', marginBottom: 6, marginRight: 6,
                      background: confirmed ? 'rgba(123,204,160,0.15)' : sel ? 'rgba(200,164,90,0.15)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid ' + (confirmed ? T.success + '88' : sel ? 'rgba(200,164,90,0.5)' : 'rgba(255,255,255,0.08)'),
                      transition: 'all .15s' }}
                      onClick={() => {
                        if (!sel) {
                          setBeautyTopics(p => [...p, item.id]);
                        }
                      }}>
                      <span style={{ fontSize: 16 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, color: confirmed ? T.success : sel ? T.gold : T.text0 }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>
                          {freqLabel(item.freq)}
                          {confirmed && s.time && <span style={{ color: T.success, marginLeft: 4 }}>· {s.time}</span>}
                        </div>
                      </div>
                      {confirmed && <span style={{ fontSize: 12, color: T.success }}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Мои процедуры */}
      {beautyTasks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div onClick={() => setProcsOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: procsOpen ? 8 : 0, padding: '6px 0' }}>
            <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5, flex: 1 }}>МОИ ПРОЦЕДУРЫ</div>
            <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>{beautyTasks.length}</span>
            <span style={{ fontSize: 11, color: T.text3 }}>{procsOpen ? '▲' : '▼'}</span>
          </div>
          {procsOpen && (
            <div>
              {beautyTasks.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 6, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{allItems.find(i => i.id === task.beautyId)?.icon || '✨'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: T.text0, lineHeight: 1.4 }}>{task.title}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      {task.preferredTime && <span style={{ fontSize: 10, color: '#E8A8C8', fontFamily: "'JetBrains Mono'" }}>🕐{task.preferredTime}</span>}
                      {task.beautyDuration && <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>{task.beautyDuration} мин</span>}
                      <span style={{ fontSize: 10, color: T.text3 }}>{freqLabel(task.freq)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Сегодня */}
      {due.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div onClick={() => setTodayOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 14px', borderRadius: todayOpen ? '12px 12px 0 0' : '12px', background: 'rgba(232,168,200,0.06)', border: '1px solid rgba(232,168,200,0.2)' }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: '#E8A8C8', fontWeight: 500 }}>Сегодня</span>
            <span style={{ fontSize: 10, color: '#E8A8C8', fontFamily: "'JetBrains Mono'", background: 'rgba(232,168,200,0.1)', padding: '1px 7px', borderRadius: 8 }}>{due.filter(t => t.doneDate === today).length}/{due.length}</span>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); setModal({}); }}>+ Своя</button>
            <span style={{ fontSize: 11, color: T.text3 }}>{todayOpen ? '▲' : '▼'}</span>
          </div>

          {todayOpen && (
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(232,168,200,0.1)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '4px 0' }}>
              {due.map(task => (
                <div key={task.id} className="task-row">
                  <div className={'chk' + (task.doneDate === today ? ' done' : '')} onClick={() => setTasks(p => p.map(t => t.id === task.id ? { ...t, doneDate: t.doneDate === today ? null : today, lastDone: t.doneDate === today ? t.lastDone : today } : t))}>
                    {task.doneDate === today ? '✓' : ' '}
                  </div>
                  <div className="task-body">
                    <div className={'task-name' + (task.doneDate === today ? ' done' : '')}>{task.title}</div>
                    <div className="task-meta">
                      <span className="badge bp">{freqLabel(task.freq)}</span>
                      {task.preferredTime && <span className="badge bg">🕐{task.preferredTime}</span>}
                    </div>
                    {task.notes && <div className="task-notes">{task.notes}</div>}
                  </div>
                  <div className="ico-btn" onClick={() => setModal(task)} style={{ color: T.teal, opacity: .7 }}>✏️</div>
                  <div className="ico-btn danger" onClick={() => setTasks(p => p.filter(t => t.id !== task.id))}>✕</div>
                </div>
              ))}            </div>
          )}
        </div>
      )}

      {/* AI советы */}
      <div style={{ marginBottom: 12 }}>
        <AiBox
          kb={buildKB(profile)}
          prompt={`Дай персональные рекомендации по уходу. Пол: ${profile.gender}. Тип кожи: ${profile.skinType || '—'}. ${!isMale ? 'Тип волос: ' + (profile.hairType || '—') + '.' : 'Борода: ' + (profile.beard || '—') + '.'} Приоритет: ${profile.beautyPriority || '—'}. Свободное время: с ${profile.workEnd || '18:00'} до ${profile.sleep || '23:00'}.`}
          label="Советы по уходу"
          btnText="Получить советы"
          placeholder="Анализирую профиль и даю конкретные рекомендации..."
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
    return Math.floor((d - new Date(last)) / 86400000) >= n;  }
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
