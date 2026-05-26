// src/sections/ScheduleSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

// ─── УТИЛИТЫ ───
function isDueOnDay(task, dStr) {
  const d = new Date(dStr); d.setHours(0, 0, 0, 0);
  const last = task.lastDone;
  const done = task.doneDate;
  if (!task.freq) return false;
  if (task.freq === 'daily') return true;
  if (task.freq === 'workdays') { const dn = d.getDay(); return dn >= 1 && dn <= 5; }
  if (task.freq.startsWith('weekly:')) {
    return task.freq.split(':')[1].split(',').map(Number).includes(d.getDay());
  }
  if (task.freq.startsWith('every:')) {
    const n = parseInt(task.freq.split(':')[1]);
    const start = task.beautyStartDate || task.createdAt?.split('T')[0] || dStr;
    if (dStr < start) return false;
    const diffDays = Math.floor((d - new Date(start)) / 86400000);
    return diffDays >= 0 && diffDays % n === 0;
  }
  if (task.freq.startsWith('monthly:')) {
    return task.freq.split(':')[1].split(',').map(Number).includes(d.getDate());
  }
  return false;
}

function addMinutes(time, mins) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + (mins || 0);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function timeToMinutes(time) {
  if (!time) return 9999;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function ScheduleSection() {
  const { profile, tasks, setTasks, notify } = useApp();
  const [view, setView] = useState('week');
  const [offset, setOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [taskModal, setTaskModal] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const changeOffset = (newOffset) => {
    setOffset(newOffset);
    setSelectedDay(null);
  };

  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  startOfWeek.setDate(now.getDate() - dayOfWeek + offset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const DAY_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const toggleTask = (taskId, dStr) => {
    setTasks(p => p.map(t =>
      t.id === taskId
        ? { ...t, doneDate: t.doneDate === dStr ? null : dStr, lastDone: t.doneDate === dStr ? t.lastDone : dStr }
        : t
    ));
  };

  const toggleBeautyBlock = (bTasks, dStr) => {
    const allDone = bTasks.every(t => t.doneDate === dStr);
    setTasks(p => p.map(t => {
      if (!bTasks.find(b => b.id === t.id)) return t;
      return { ...t, doneDate: allDone ? null : dStr, lastDone: allDone ? t.lastDone : dStr };
    }));
  };

  return (
    <div>
      <SectionHero sectionId="schedule" />

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 2, background: 'rgba(45,32,16,0.05)', border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {[['week','🗓️ Неделя'],['ai','✨ ИИ-план']].map(([v,l]) => (
          <div key={v} onClick={() => setView(v)}
            style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', fontSize: 14, background: view === v ? 'rgba(45,106,79,0.12)' : 'transparent', color: view === v ? T.gold : T.text2, transition: 'all .18s' }}
          >{l}</div>
        ))}
      </div>

      {view === 'week' && (
        <div>
          {/* Навигация */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => changeOffset(offset - 1)}>←</button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 14, color: T.text2 }}>
              {offset === 0 ? 'Эта неделя' : `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${weekDays[6].toLocaleString('ru-RU', { month: 'short' })}`}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => changeOffset(offset + 1)}>→</button>
            <button className="btn btn-ghost btn-sm" onClick={() => changeOffset(0)}>Сегодня</button>
          </div>

          {/* Сетка дней */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {weekDays.map((d, i) => {
              const dStr = d.toISOString().split('T')[0];
              const isToday = dStr === todayStr;
              const isSelected = selectedDay === dStr;
              const isWork = (profile.workDaysList || [1,2,3,4,5]).includes(d.getDay());

              // ─── Собираем ВСЕ события дня в единый список ───

              // 1. Якорные события профиля
              const anchors = [];
              if (profile.wake) anchors.push({ type: 'anchor', time: profile.wake, label: '☀️ Подъём' });
              if (isWork && profile.workStart) anchors.push({ type: 'anchor', time: profile.workStart, label: '💼 Работа' });
              if (isWork && profile.workEnd) anchors.push({ type: 'anchor', time: profile.workEnd, label: '💼 Конец работы' });
              if (profile.sleep) anchors.push({ type: 'anchor', time: profile.sleep, label: '🌙 Отбой' });

              // 2. Обычные задачи (не beauty)
              const regularTasks = tasks
                .filter(t => t.section !== 'beauty' && t.preferredTime && (isDueOnDay(t, dStr) || t.doneDate === dStr))
                .map(t => ({ type: 'task', time: t.preferredTime, task: t }));

              // 3. Beauty-блок
              const beautyDue = tasks.filter(t =>
                t.section === 'beauty' &&
                t.preferredTime &&
                (isDueOnDay(t, dStr) || t.doneDate === dStr)
              );

              // Группируем beauty по времени — подряд идущие в один блок
              const beautyBlocks = [];
              if (beautyDue.length > 0) {
                const sorted = [...beautyDue].sort((a, b) => (a.preferredTime || '').localeCompare(b.preferredTime || ''));
                let current = [sorted[0]];
                for (let j = 1; j < sorted.length; j++) {
                  const prev = current[current.length - 1];
                  const prevEnd = addMinutes(prev.preferredTime, prev.beautyDuration || 10);
                  const gap = timeToMinutes(sorted[j].preferredTime) - timeToMinutes(prevEnd);
                  if (gap <= 15) { current.push(sorted[j]); }
                  else { beautyBlocks.push(current); current = [sorted[j]]; }
                }
                beautyBlocks.push(current);
              }

              const beautyItems = beautyBlocks.map(block => {
                const startTime = block[0].preferredTime;
                const lastTask = block[block.length - 1];
                const endTime = addMinutes(lastTask.preferredTime, lastTask.beautyDuration || 10);
                const allDone = block.every(t => t.doneDate === dStr);
                return { type: 'beauty', time: startTime, endTime, block, allDone };
              });

              // 4. Объединяем и сортируем строго по времени
              const allEvents = [...anchors, ...regularTasks, ...beautyItems]
                .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

              // Для счётчика выполненных
              const totalTaskCount = regularTasks.length + beautyItems.length;
              const doneCount = regularTasks.filter(e => e.task.doneDate === dStr).length
                + beautyItems.filter(e => e.allDone).length;

              // Показываем максимум 4 строки в ячейке
              const visibleEvents = allEvents.slice(0, 4);
              const hiddenCount = allEvents.length - visibleEvents.length;

              return (
                <div
                  key={dStr}
                  onClick={() => setSelectedDay(isSelected ? null : dStr)}
                  style={{
                    borderRadius: 12, padding: '10px 12px', cursor: 'pointer',
                    border: `1px solid ${isToday ? T.gold : isSelected ? T.teal : T.bdr}`,
                    background: isToday ? 'rgba(45,106,79,0.08)' : isSelected ? 'rgba(78,201,190,0.06)' : 'rgba(45,32,16,0.03)',
                    transition: 'all .15s',
                  }}
                >
                  {/* Шапка дня */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 11, color: isToday ? T.gold : T.text3, fontFamily: "'JetBrains Mono'" }}>{DAY_RU[i]}</span>
                      <span style={{ fontSize: 22, fontWeight: isToday ? 700 : 400, color: isToday ? T.gold : T.text0, marginLeft: 6, fontFamily: "'Cormorant Infant',serif" }}>{d.getDate()}</span>
                    </div>
                    <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>
                      {doneCount}/{totalTaskCount}
                    </span>
                  </div>

                  {/* Единый хронологический список */}
                  {visibleEvents.map((event, ei) => {

                    // Якорное событие — без чекбокса
                    if (event.type === 'anchor') {
                      return (
                        <div key={`a-${ei}`} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", minWidth: 32, flexShrink: 0 }}>{event.time}</span>
                          <span style={{ fontSize: 11, color: T.text2 }}>{event.label}</span>
                        </div>
                      );
                    }

                    // Обычная задача — с чекбоксом
                    if (event.type === 'task') {
                      const t = event.task;
                      const done = t.doneDate === dStr;
                      return (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, opacity: done ? 0.55 : 1 }}>
                          <div
                            onClick={(e) => { e.stopPropagation(); toggleTask(t.id, dStr); }}
                            style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${done ? T.success : T.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: T.success, flexShrink: 0, cursor: 'pointer' }}
                          >
                            {done ? '✓' : ''}
                          </div>
                          <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", minWidth: 32, flexShrink: 0 }}>{t.preferredTime}</span>
                          <span style={{ fontSize: 11, color: done ? T.text3 : T.text1, textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                        </div>
                      );
                    }

                    // Beauty-блок — с чекбоксом
                    if (event.type === 'beauty') {
                      const done = event.allDone;
                      return (
                        <div key={`b-${ei}`} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, opacity: done ? 0.55 : 1 }}>
                          <div
                            onClick={(e) => { e.stopPropagation(); toggleBeautyBlock(event.block, dStr); }}
                            style={{ width: 13, height: 13, borderRadius: 3, border: `1px solid ${done ? T.success : 'rgba(184,107,93,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: T.success, flexShrink: 0, cursor: 'pointer' }}
                          >
                            {done ? '✓' : ''}
                          </div>
                          <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", minWidth: 32, flexShrink: 0 }}>
                            {event.time}
                          </span>
                          <span style={{ fontSize: 11, color: done ? T.text3 : T.text1, textDecoration: done ? 'line-through' : 'none' }}>
                            ✨ Уход{event.block.length > 1 ? ` –${event.endTime}` : ''}
                          </span>
                        </div>
                      );
                    }

                    return null;
                  })}

                  {hiddenCount > 0 && (
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>+{hiddenCount} ещё</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Детальный день */}
          {selectedDay && (
            <div className="card" style={{ marginTop: 12, borderLeft: `3px solid ${T.teal}` }}>
              <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 20, color: T.text0, marginBottom: 12 }}>
                {new Date(selectedDay).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setTaskModal({})}>+ Добавить событие</button>
              <div style={{ marginTop: 8, fontSize: 12, color: T.text3 }}>
                (Детальное расписание для этого дня отображается в разделе «Сегодня»)
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'ai' && (
        <div>
          <AiBox
            profile={profile}
            label="ИИ-Расписание"
            prompt={`Составь оптимальное расписание на неделю с учетом моего хронотипа (${profile?.chronotype || '—'}) и рабочего графика (${profile?.workStart || '09:00'}–${profile?.workEnd || '18:00'}).`}
            btnText="Составить расписание"
          />
        </div>
      )}

      {taskModal && (
        <TaskModal
          task={taskModal.id ? taskModal : null}
          defaultSection="tasks"
          onSave={(t) => {
            setTasks(p => taskModal.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]);
            notify('Сохранено');
          }}
          onClose={() => setTaskModal(null)}
        />
      )}
    </div>
  );
}
