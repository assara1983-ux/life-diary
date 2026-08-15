// src/sections/TodaySection.jsx
import { useState, useEffect, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getMoonDay, getCurrentMeridian } from "../utils/knowledgeEngine";
import { openGoogleCalendar } from "../utils/googleCalendar";

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function anchorDate(task, fallback) {
  if (task.dueDate) return task.dueDate;
  if (task.beautyStartDate) return task.beautyStartDate;
  if (task.createdAt) return task.createdAt.split('T')[0];
  // У старых задач без даты создания id — это Date.now(), можно достать реальную дату отсюда
  const idNum = typeof task.id === 'number' ? task.id : parseInt(task.id);
  if (idNum && idNum > 1600000000000 && idNum < 4000000000000) {
    return new Date(idNum).toISOString().split('T')[0];
  }
  return fallback;
}

function isDueOnDay(task, dStr) {
  const d = new Date(dStr + 'T00:00:00');

  // Задача с конкретной датой начала — показываем начиная с этой даты
  if (task.dueDate) {
    if (dStr < task.dueDate) return false; // ещё не наступила
  }

  if (!task.freq) return !!task.dueDate && dStr === task.dueDate;
  if (task.freq === 'once') return task.dueDate === dStr;
  if (task.freq === 'daily') return true;
  if (task.freq === 'workdays') { const dn = d.getDay(); return dn >= 1 && dn <= 5; }
  if (task.freq.startsWith('weekly:')) return task.freq.split(':')[1].split(',').map(Number).includes(d.getDay());
  if (task.freq.startsWith('every:')) {
    const n = parseInt(task.freq.split(':')[1]);
    const start = anchorDate(task, '2024-01-01');
    if (dStr < start) return false;
    const diffDays = Math.floor((new Date(dStr+'T00:00:00') - new Date(start+'T00:00:00')) / 86400000);
    return diffDays >= 0 && diffDays % n === 0;
  }
  if (task.freq.startsWith('monthly:')) return task.freq.split(':')[1].split(',').map(Number).includes(d.getDate());
  return false;
}

function addMinutes(time, mins) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

function groupBeautyTasks(tasks) {
  if (!tasks.length) return [];
  const sorted = [...tasks].sort((a,b) => (a.preferredTime||'').localeCompare(b.preferredTime||''));
  const blocks = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length-1];
    const prevEnd = addMinutes(prev.preferredTime, prev.beautyDuration||10);
    const gap = (() => {
      if (!prev.preferredTime || !sorted[i].preferredTime) return 999;
      const [ph,pm] = prevEnd.split(':').map(Number);
      const [nh,nm] = sorted[i].preferredTime.split(':').map(Number);
      return (nh*60+nm)-(ph*60+pm);
    })();
    if (gap <= 15) current.push(sorted[i]);
    else { blocks.push(current); current = [sorted[i]]; }
  }
  blocks.push(current);
  return blocks;
}

// ─── ЛУННЫЕ ФАЗЫ ───
const MOON_PHASES = [
  { days:[1],         phase:'Новолуние',        energy:'🌑', color:'#1E3A5F',
    rec:'Начинайте новые проекты. Ставьте намерения на месяц.',
    forbid:'Хирургические операции, большие финансовые решения.' },
  { days:[2,3,4],     phase:'Растущий серп',    energy:'🌒', color:'#2C4F7A',
    rec:'Активно действуйте, учитесь новому, налаживайте контакты.',
    forbid:'Откладывать важные дела, пассивность.' },
  { days:[5,6,7],     phase:'Первая четверть',  energy:'🌓', color:'#3D6B9C',
    rec:'Решайте конфликты, принимайте решения, действуйте решительно.',
    forbid:'Избегать конфронтации, быть нерешительным.' },
  { days:[8,9,10,11], phase:'Прибывающая',      energy:'🌔', color:'#4A7AB5',
    rec:'Максимум активности, переговоры, творческая работа.',
    forbid:'Переедание — всё хорошо усваивается, лишнее тоже.' },
  { days:[12,13,14,15,16], phase:'Полнолуние',  energy:'🌕', color:'#D4AF37',
    rec:'Медитация, творчество, интуиция на пике. Завершайте дела.',
    forbid:'Алкоголь, ссоры — эмоции обострены.' },
  { days:[17,18,19,20],    phase:'Убывающая',   energy:'🌖', color:'#8B6914',
    rec:'Избавляйтесь от лишнего, очищение, анализ прошедшего.',
    forbid:'Начинать новое, брать кредиты.' },
  { days:[21,22,23],       phase:'Последняя четверть', energy:'🌗', color:'#6B7E8F',
    rec:'Отдых, завершение, прощание с ненужным.',
    forbid:'Важные начинания, операции.' },
  { days:[24,25,26,27,28,29,30], phase:'Старый месяц', energy:'🌘', color:'#4A6480',
    rec:'Глубокий отдых, медитация, подготовка к новому циклу.',
    forbid:'Важные решения, хирургия, большие траты.' },
];

function getMoonPhase(day) {
  return MOON_PHASES.find(p => p.days.includes(day)) || MOON_PHASES[0];
}

const SCHEDULE_HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00','23:00',
];

// ─── КАРТОЧКА-ПЕРЕВЁРТЫШ ───
function FlipCard({ front, back }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      onClick={() => setFlipped(f => !f)}
      style={{ perspective:1000, cursor:'pointer', marginBottom:16, userSelect:'none' }}
    >
      <div style={{
        position:'relative',
        transformStyle:'preserve-3d',
        transition:'transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        minHeight:300,
      }}>

        {/* ── ЛИЦЕВАЯ СТОРОНА ── */}
        <div style={{
          position:'absolute', inset:0,
          backfaceVisibility:'hidden',
          WebkitBackfaceVisibility:'hidden',
          borderRadius:14, overflow:'hidden',
          boxShadow:'0 6px 24px rgba(10,37,64,0.18), 0 0 0 2px rgba(10,37,64,0.22)',
        }}>
          {/* ✅ Картинка — видна, opacity высокий */}
          <img
            src="/sections/today-front.jpg"
            alt=""
            style={{
              position:'absolute', inset:0,
              width:'100%', height:'100%',
              objectFit:'cover',
              opacity: 0.85,
            }}
            onError={e => { e.target.style.display = 'none'; }}
          />

          {/* ✅ Пергаментный оверлей — более прозрачный чтобы картинка просвечивала */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(160deg, rgba(245,232,199,0.45) 0%, rgba(232,217,184,0.42) 100%)',
            backgroundImage:`
              linear-gradient(160deg, rgba(245,232,199,0.45) 0%, rgba(232,217,184,0.42) 100%),
              linear-gradient(rgba(10,37,64,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(10,37,64,0.04) 1px, transparent 1px)
            `,
            backgroundSize:'100%, 20px 20px, 20px 20px',
          }} />

          {/* Угловые маркеры */}
          <div style={{ position:'absolute', top:8, left:8, width:14, height:14,
            borderTop:'2px solid #D4AF37', borderLeft:'2px solid #D4AF37', opacity:0.85 }} />
          <div style={{ position:'absolute', bottom:8, right:8, width:14, height:14,
            borderBottom:'2px solid #D4AF37', borderRight:'2px solid #D4AF37', opacity:0.85 }} />

          <div style={{
            position:'absolute', top:10, right:14,
            fontFamily:"'JetBrains Mono',monospace",
            fontSize:8, color:'rgba(10,37,64,0.50)',
            letterSpacing:1.5, textTransform:'uppercase',
          }}>перевернуть →</div>

          {front}
        </div>

        {/* ── ОБОРОТНАЯ СТОРОНА ── */}
        <div style={{
          position:'absolute', inset:0,
          backfaceVisibility:'hidden',
          WebkitBackfaceVisibility:'hidden',
          transform:'rotateY(180deg)',
          borderRadius:14, overflow:'hidden',
          boxShadow:'0 6px 24px rgba(10,37,64,0.22), 0 0 0 2px rgba(212,175,55,0.4)',
        }}>
          {/* ✅ Картинка оборота */}
          <img
            src="/sections/today-back.jpg"
            alt=""
            style={{
              position:'absolute', inset:0,
              width:'100%', height:'100%',
              objectFit:'cover',
              opacity:0.75,
            }}
            onError={e => { e.target.style.display = 'none'; }}
          />

          {/* Тёмно-синий фон */}
          <div style={{
            position:'absolute', inset:0,
            background:'linear-gradient(160deg, rgba(10,37,64,0.60) 0%, rgba(30,58,95,0.55) 100%)',
            backgroundImage:`
              linear-gradient(160deg, rgba(10,37,64,0.60) 0%, rgba(30,58,95,0.55) 100%),
              linear-gradient(rgba(212,175,55,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(212,175,55,0.06) 1px, transparent 1px)
            `,
            backgroundSize:'100%, 20px 20px, 20px 20px',
          }} />

          {/* Угловые маркеры */}
          <div style={{ position:'absolute', top:8, left:8, width:14, height:14,
            borderTop:'2px solid #D4AF37', borderLeft:'2px solid #D4AF37' }} />
          <div style={{ position:'absolute', bottom:8, right:8, width:14, height:14,
            borderBottom:'2px solid #D4AF37', borderRight:'2px solid #D4AF37' }} />

          <div style={{
            position:'absolute', top:10, right:14,
            fontFamily:"'JetBrains Mono',monospace",
            fontSize:8, color:'rgba(212,175,55,0.55)',
            letterSpacing:1.5, textTransform:'uppercase',
          }}>← вернуть</div>

          {back}
        </div>
      </div>
    </div>
  );
}

// ─── РАСПИСАНИЕ ───
function ScheduleBlock({ todayItems, today, tasks, setTasks, profile, now }) {
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`ld_schedule_${today}`) || '{}'); }
    catch { return {}; }
  });
  const [imgOk, setImgOk] = useState(true);

  const saveNote = (hour, val) => {
    const next = { ...notes, [hour]: val };
    setNotes(next);
    try { localStorage.setItem(`ld_schedule_${today}`, JSON.stringify(next)); } catch {}
  };

  const getItemsForHour = (hour) => {
    const h = parseInt(hour);
    return todayItems.filter(item => {
      if (!item.time) return false;
      return parseInt(item.time.split(':')[0]) === h;
    });
  };

  const currentHour = now.getHours();

  return (
    <div style={{
      position:'relative', borderRadius:14, overflow:'hidden',
      border:'2px solid rgba(10,37,64,0.28)',
      boxShadow:'0 6px 24px rgba(10,37,64,0.14)',
      marginBottom:16,
    }}>
      {/* ✅ Фон-картинка расписания — более видимая */}
      {imgOk && (
        <img
          src="/sections/today-schedule.jpg"
          alt=""
          onError={() => setImgOk(false)}
          style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%',
            objectFit:'cover',
            opacity:0.70,
          }}
        />
      )}

      {/* ✅ Пергаментный фон — более прозрачный */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(160deg, rgba(250,243,224,0.55) 0%, rgba(240,230,205,0.52) 100%)',
      }} />

      {/* Содержимое */}
      <div style={{ position:'relative', zIndex:1 }}>

        {/* Заголовок */}
        <div style={{
          padding:'16px 18px 12px',
          borderBottom:'2px solid rgba(10,37,64,0.18)',
          background:'rgba(245,232,199,0.70)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",
              fontSize:9, letterSpacing:3, color:'rgba(10,37,64,0.50)',
              textTransform:'uppercase', marginBottom:3 }}>Daily Schedule</div>
            <div style={{ fontFamily:"'Cinzel',serif",
              fontSize:18, fontWeight:700, color:'#0A2540', letterSpacing:2.5,
              textTransform:'uppercase' }}>Расписание дня</div>
          </div>
          <div style={{ width:40, height:40,
            border:'2px solid rgba(10,37,64,0.25)', borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, color:'#D4AF37',
            background:'rgba(245,232,199,0.8)',
            boxShadow:'0 2px 8px rgba(10,37,64,0.10)' }}>🧭</div>
        </div>

        {/* Золотая линия */}
        <div style={{ height:1.5,
          background:'linear-gradient(90deg, transparent, #D4AF37 20%, #D4AF37 80%, transparent)',
          opacity:0.6 }} />

        {/* Строки */}
        <div style={{ padding:'8px 0 16px' }}>
          {SCHEDULE_HOURS.map((hour, i) => {
            const items = getItemsForHour(hour);
            const isNow  = parseInt(hour) === currentHour;
            const isPast = parseInt(hour) < currentHour;

            return (
              <div key={hour} style={{
                display:'flex', alignItems:'stretch',
                borderBottom: i < SCHEDULE_HOURS.length-1 ? '1px solid rgba(10,37,64,0.10)' : 'none',
                background: isNow ? 'rgba(212,175,55,0.12)' : 'transparent',
                transition:'background 0.2s',
              }}>
                {/* Час */}
                <div style={{
                  width:58, flexShrink:0,
                  padding:'10px 8px 10px 16px',
                  fontFamily:"'JetBrains Mono',monospace",
                  fontSize: isNow ? 14 : 13,
                  fontWeight: isNow ? 700 : 500,
                  color: isNow ? '#D4AF37' : isPast ? 'rgba(10,37,64,0.35)' : 'rgba(10,37,64,0.65)',
                  letterSpacing:0.5,
                  display:'flex', alignItems:'center',
                  borderRight:`2px solid ${isNow ? 'rgba(212,175,55,0.7)' : 'rgba(10,37,64,0.14)'}`,
                }}>{hour}</div>

                {/* Содержимое строки */}
                <div style={{
                  flex:1, padding:'6px 14px',
                  display:'flex', flexDirection:'column', gap:3,
                  minHeight:42, justifyContent:'center',
                }}>
                  {items.map((item, j) => {
                    if (item.type === 'anchor') return (
                      <div key={j} style={{
                        fontSize:13, color:'rgba(10,37,64,0.55)',
                        fontFamily:"'Cormorant Infant',serif", fontStyle:'italic',
                      }}>{item.title}</div>
                    );
                    if (item.type === 'task') {
                      const done = item.task.doneDate === today;
                      return (
                        <div key={j}
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'3px 0', cursor:'pointer' }}
                          onClick={e => {
                            e.stopPropagation();
                            setTasks(p => p.map(t => t.id === item.task.id
                              ? { ...t,
                                  doneDate: t.doneDate === today ? null : today,
                                  lastDone: t.doneDate === today ? t.lastDone : today }
                              : t));
                          }}
                        >
                          <div style={{
                            width:18, height:18, borderRadius:4, flexShrink:0,
                            border:`2px solid ${done ? '#2D5A3D' : 'rgba(10,37,64,0.30)'}`,
                            background: done ? '#2D5A3D' : 'rgba(255,255,255,0.7)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:11, color:'#fff', transition:'all 0.15s',
                          }}>{done ? '✓' : ''}</div>
                          <div style={{ flex:1 }}>
                            <div style={{
                              fontSize:16,
                              color: done ? 'rgba(10,37,64,0.40)' : '#0A2540',
                              textDecoration: done ? 'line-through' : 'none',
                              fontFamily:"'Crimson Pro',serif", lineHeight:1.3, fontWeight:500,
                            }}>{item.task.title}</div>
                            {item.task.section === 'home' && (
                              <div style={{ fontSize:11.5, color:'rgba(10,37,64,0.45)',
                                fontFamily:"'JetBrains Mono',monospace", letterSpacing:0.5 }}>
                                🏠 Дом
                              </div>
                            )}
                            {item.task.section === 'car' && (
                              <div style={{ fontSize:11.5, color:'rgba(10,37,64,0.45)',
                                fontFamily:"'JetBrains Mono',monospace", letterSpacing:0.5 }}>
                                🚗 Авто
                              </div>
                            )}
                          </div>
                          {!done&&(
                            <button onClick={e=>{e.stopPropagation();openGoogleCalendar(item.task.title,item.task.dueDate||today,item.task.preferredTime||hour,item.task.notes||'');}}
                              title="Добавить в Google Calendar"
                              style={{cursor:'pointer',fontSize:11.5,fontWeight:600,flexShrink:0,display:'flex',alignItems:'center',gap:3,
                                padding:'4px 9px',borderRadius:12,border:'1px solid rgba(66,133,244,0.35)',
                                background:'rgba(66,133,244,0.10)',color:'#3367D6',
                                fontFamily:"'JetBrains Mono',monospace"}}>
                              📆
                            </button>
                          )}
                        </div>
                      );
                    }
                    if (item.type === 'beauty') return (
                      <div key={j} style={{ fontSize:12, color:'#6B1E3A',
                        fontFamily:"'Crimson Pro',serif" }}>
                        ✨ {item.block.length > 1 ? `Уход (${item.block.length})` : item.block[0].title}
                      </div>
                    );
                    return null;
                  })}

                  {items.length === 0 && (
                    <input
                      value={notes[hour] || ''}
                      onChange={e => saveNote(hour, e.target.value)}
                      placeholder="·  ·  ·  ·  ·  ·  ·  ·  ·  ·"
                      onClick={e => e.stopPropagation()}
                      style={{
                        border:'none', outline:'none',
                        background:'transparent',
                        fontFamily:"'Crimson Pro',serif",
                        fontSize:13,
                        color: isPast ? 'rgba(10,37,64,0.30)' : '#0A2540',
                        width:'100%',
                      }}
                    />
                  )}

                  {items.length > 0 && notes[hour]?.trim() && (
                    <div style={{ fontSize:11, color:'rgba(10,37,64,0.45)',
                      fontFamily:"'Cormorant Infant',serif", fontStyle:'italic' }}>
                      {notes[hour]}
                    </div>
                  )}
                </div>

                {/* Маркер текущего часа */}
                {isNow && (
                  <div style={{ width:5, flexShrink:0,
                    background:'linear-gradient(180deg, #D4AF37, rgba(212,175,55,0.2))' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Лотос снизу */}
        <div style={{ textAlign:'center', padding:'8px 0 14px',
          borderTop:'1px solid rgba(10,37,64,0.10)' }}>
          <div style={{ fontSize:20, opacity:0.30 }}>🪷</div>
        </div>
      </div>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ───
export function TodaySection() {
  const { profile, tasks, setTasks } = useApp();
  const [now, setNow] = useState(new Date());

  const insights  = getProfileInsights(profile) || {};
  const moonDay   = getMoonDay(now) || 1;
  const meridian  = getCurrentMeridian(now);
  const moonPhase = getMoonPhase(moonDay);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const today = localDateStr(now);

  const todayItems = useMemo(() => {
    const result = [];
    const regularTasks = tasks.filter(t =>
      t.section !== 'beauty' &&
      (t.preferredTime || t.dueDate === today) &&
      (isDueOnDay(t, today) || t.doneDate === today)
    );
    regularTasks.forEach(t => result.push({ type:'task', time:t.preferredTime || '00:00', task:t }));

    const beautyDue = tasks.filter(t =>
      t.section === 'beauty' && t.preferredTime &&
      (isDueOnDay(t, today) || t.doneDate === today)
    );
    groupBeautyTasks(beautyDue).forEach(block => {
      const startTime = block[0].preferredTime;
      const lastTask  = block[block.length-1];
      const endTime   = addMinutes(lastTask.preferredTime, lastTask.beautyDuration||10);
      const allDone   = block.every(t => t.doneDate === today);
      result.push({ type:'beauty', time:startTime, endTime, block, allDone });
    });

    if (profile?.wake)  result.push({ type:'anchor', time:profile.wake,      title:'☀️ Подъём' });
    if (profile?.sleep) result.push({ type:'anchor', time:profile.sleep,     title:'🌙 Отбой' });
    const isWorkDay = (profile?.workDaysList||[1,2,3,4,5]).includes(now.getDay());
    if (isWorkDay && profile?.workStart) result.push({ type:'anchor', time:profile.workStart, title:'💼 Работа' });
    if (isWorkDay && profile?.workEnd)   result.push({ type:'anchor', time:profile.workEnd,   title:'💼 Конец работы' });

    return result.sort((a,b) => (a.time||'').localeCompare(b.time||''));
  }, [tasks, today, profile, now]);

  const getChronoAdvice = () => {
    const type = profile?.chronotype || '🕊️ Голубь';
    const hour = now.getHours();
    if (type.includes('Сова'))      return hour >= 14 ? 'Сейчас ваш пик! Беритесь за сложные задачи.' : 'Утро для рутины. Пик энергии наступит вечером.';
    if (type.includes('Жаворонок')) return hour < 12  ? 'Идеальное время для аналитики и решений.'    : 'Сложные дела на завтра. Время для отдыха.';
    return 'Сбалансированный ритм. Распределяйте нагрузку равномерно.';
  };

  // ─── ЛИЦЕВАЯ СТОРОНА ───
  const frontContent = (
    <div style={{ position:'relative', zIndex:1, padding:'24px 18px 20px' }}>

      {/* Лунный день */}
      <div style={{
        marginBottom:18, padding:'14px 16px',
        background:`linear-gradient(135deg, ${moonPhase.color}22, ${moonPhase.color}0A)`,
        border:`1.5px solid ${moonPhase.color}55`,
        borderRadius:10,
      }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace",
          fontSize:9, letterSpacing:3, color:moonPhase.color,
          textTransform:'uppercase', marginBottom:6, fontWeight:600 }}>
          Лунный цикл
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <span style={{ fontSize:30 }}>{moonPhase.energy}</span>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif",
              fontSize:18, fontWeight:700, color:'#0A2540', letterSpacing:1.5 }}>
              {moonDay}-й лунный день
            </div>
            <div style={{ fontFamily:"'Cormorant Infant',serif",
              fontSize:14, fontStyle:'italic', color:'#1E3A5F' }}>
              {moonPhase.phase}
            </div>
          </div>
        </div>

        {/* Полоска фазы */}
        <div style={{ height:4, background:'rgba(10,37,64,0.12)',
          borderRadius:2, overflow:'hidden', marginBottom:12 }}>
          <div style={{
            height:'100%', width:`${Math.round((moonDay/30)*100)}%`,
            background:`linear-gradient(90deg, ${moonPhase.color}, ${moonPhase.color}88)`,
            borderRadius:2,
          }} />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ padding:'8px 12px', borderRadius:8,
            background:'rgba(45,90,61,0.10)', border:'1px solid rgba(45,90,61,0.25)',
            fontSize:13, lineHeight:1.5, color:'#1A4D2E' }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",
              fontSize:9, letterSpacing:1.5, display:'block',
              marginBottom:3, fontWeight:600 }}>✦ РЕКОМЕНДУЮ</span>
            {moonPhase.rec}
          </div>
          <div style={{ padding:'8px 12px', borderRadius:8,
            background:'rgba(107,16,16,0.08)', border:'1px solid rgba(107,16,16,0.20)',
            fontSize:13, lineHeight:1.5, color:'#6B1010' }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",
              fontSize:9, letterSpacing:1.5, display:'block',
              marginBottom:3, fontWeight:600 }}>⚠ ЗАПРЕТ</span>
            {moonPhase.forbid}
          </div>
        </div>
      </div>

      {/* Меридиан */}
      <div style={{ padding:'14px 16px',
        background:'rgba(10,37,64,0.06)',
        border:'1.5px solid rgba(10,37,64,0.20)',
        borderRadius:10 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace",
          fontSize:9, letterSpacing:3, color:'rgba(10,37,64,0.55)',
          textTransform:'uppercase', marginBottom:6, fontWeight:600 }}>
          Активный меридиан · {meridian.time}
        </div>
        <div style={{ fontFamily:"'Cinzel',serif",
          fontSize:16, fontWeight:700, color:'#0A2540', letterSpacing:1.5, marginBottom:4 }}>
          {meridian.name}
        </div>
        <div style={{ fontFamily:"'Cormorant Infant',serif",
          fontSize:13, fontStyle:'italic', color:'#3A4E63', marginBottom:10 }}>
          {meridian.sign}
        </div>
        <div style={{ padding:'8px 12px', borderRadius:8,
          background:'rgba(212,175,55,0.12)', border:'1px solid rgba(212,175,55,0.35)',
          fontSize:13, lineHeight:1.5, color:'#1A2D40' }}>
          💡 {meridian.advice}
        </div>
      </div>
    </div>
  );

  // ─── ОБОРОТНАЯ СТОРОНА ───
  const backContent = (
    <div style={{ position:'relative', zIndex:1, padding:'24px 18px 20px' }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace",
        fontSize:9, letterSpacing:3.5, color:'rgba(212,175,55,0.70)',
        textTransform:'uppercase', marginBottom:16, fontWeight:600 }}>
        ⚡ Окно продуктивности
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ padding:'6px 14px', borderRadius:20, marginBottom:12,
          display:'inline-block',
          background:'rgba(212,175,55,0.18)', border:'1px solid rgba(212,175,55,0.45)',
          fontFamily:"'JetBrains Mono',monospace",
          fontSize:11, color:'#D4AF37', letterSpacing:1.5 }}>
          {profile?.chronotype || '🕊️ Голубь'}
        </div>

        <div style={{ fontFamily:"'Cormorant Infant',serif",
          fontSize:16, color:'rgba(240,220,144,0.92)',
          lineHeight:1.65, marginBottom:16, fontStyle:'italic' }}>
          {getChronoAdvice()}
        </div>
      </div>

      <div style={{ padding:'12px 14px',
        background:'rgba(212,175,55,0.10)', border:'1px solid rgba(212,175,55,0.28)',
        borderRadius:10, marginBottom:16 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace",
          fontSize:9, letterSpacing:2, color:'rgba(212,175,55,0.65)',
          textTransform:'uppercase', marginBottom:10, fontWeight:600 }}>Пиковые часы</div>
        {[
          { time: profile?.chronotype?.includes('Сова') ? '14:00–18:00' : profile?.chronotype?.includes('Жаворонок') ? '06:00–10:00' : '09:00–12:00', label:'Аналитика, решения', icon:'🧠' },
          { time: profile?.chronotype?.includes('Сова') ? '10:00–13:00' : profile?.chronotype?.includes('Жаворонок') ? '11:00–13:00' : '14:00–16:00', label:'Рутина, встречи',    icon:'📋' },
          { time: profile?.chronotype?.includes('Сова') ? '20:00–23:00' : profile?.chronotype?.includes('Жаворонок') ? '08:00–10:00' : '16:00–19:00', label:'Творчество',         icon:'✨' },
        ].map((p,i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:10, padding:'7px 0',
            borderBottom: i < 2 ? '1px solid rgba(212,175,55,0.14)' : 'none',
          }}>
            <span style={{ fontSize:18 }}>{p.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",
                fontSize:12, color:'#D4AF37', fontWeight:700 }}>{p.time}</div>
              <div style={{ fontSize:13, color:'rgba(240,220,144,0.70)',
                fontFamily:"'Crimson Pro',serif" }}>{p.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign:'center',
        fontFamily:"'Cormorant Infant',serif",
        fontSize:14, fontStyle:'italic',
        color:'rgba(212,175,55,0.45)', lineHeight:1.6 }}>
        «Знай своё время — и время будет твоим»
      </div>
    </div>
  );

  return (
    <div className="page" style={{ position:'relative' }}>
      <FlipCard front={frontContent} back={backContent} />
      <ScheduleBlock
        todayItems={todayItems}
        today={today}
        tasks={tasks}
        setTasks={setTasks}
        profile={profile}
        now={now}
      />
    </div>
  );
                     }
