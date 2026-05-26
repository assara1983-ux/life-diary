// src/sections/ScheduleSection.jsx
import { useState, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

// ─── УТИЛИТЫ ───
function isDue(task, today) {
  const last = task.lastDone;
  const d = new Date(today); d.setHours(0, 0, 0, 0);
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
    if (!last) {
      if (task.beautyStartDate) return today >= task.beautyStartDate;
      return true;
    }
    return Math.floor((d - new Date(last)) / 86400000) >= n;
  }
  if (task.freq.startsWith('monthly:')) {
    return task.freq.split(':')[1].split(',').map(Number).includes(d.getDate()) && last !== today;
  }
  return false;
}

function addMinutes(time, mins) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + (mins || 0);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function buildBeautyBlockLabel(beautyTasks, dStr) {
  if (!beautyTasks.length) return null;
  const sorted = [...beautyTasks].sort((a, b) =>
    (a.preferredTime || '').localeCompare(b.preferredTime || '')
  );
  const start = sorted[0].preferredTime;
  const last = sorted[sorted.length - 1];
  const end = last.preferredTime
    ? addMinutes(last.preferredTime, last.beautyDuration || 10)
    : '';
  const allDone = beautyTasks.every(t => t.doneDate === dStr);
  return { start, end, allDone, count: beautyTasks.length, tasks: beautyTasks };
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

  // Строим неделю
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

  const toggleBeautyBlock = (beautyTasks, dStr) => {
    const allDone = beautyTasks.every(t => t.doneDate === dStr);
    setTasks(p => p.map(t => {
      if (!beautyTasks.find(b => b.id === t.id)) return t;
      return {
        ...t,
        doneDate: allDone ? null : dStr,
        lastDone: allDone ? t.lastDone : dStr,
      };
    }));
  };

  return (
    <div>
      <SectionHero sectionId="schedule" />

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 2, background: 'rgba(45,32,16,0.05)', border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 4, marginBottom: 20 }}>
        <div
          onClick={() => setView('week')}
          style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', fontSize: 14, background: view === 'week' ? 'rgba(45,106,79,0.12)' : 'transparent', color: view === 'week' ? T.gold : T.text2, transition: 'all .18s' }}
        >
          🗓️ Неделя
        </div>
        <div
          onClick={() => setView('ai')}
          style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', fontSize: 14, background: view === 'ai' ? 'rgba(45,106,79,0.12)' : 'transparent', color: view === 'ai' ? T.gold : T.text2, transition: 'all .18s' }}
        >
          ✨ ИИ-план
        </div>
      </div>

      {view === 'week' && (
        <div>
          {/* Навигация */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => changeOffset(offset - 1)}>←</button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 14, color: T.text2 }}>
              {offset === 0
                ? 'Эта неделя'
                : `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${weekDays[6].toLocaleString('ru-RU', { month: 'short' })}`}
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
              const isWork = (profile.workDaysList || [1, 2, 3, 4, 5]).includes(d.getDay());

              const dayTasks = tasks.filter(t =>
                t.preferredTime && (isDue(t, dStr) || t.doneDate === dStr)
              );

              const regularTasks = dayTasks.filter(t => t.section !== 'beauty');
              const beautyTasks = dayTasks.filter(t => t.section === 'beauty');
              const beautyBlock = buildBeautyBlockLabel(beautyTasks, dStr);

              // Сколько строк занимает beauty-блок
              const beautyRows = beautyBlock ? 1 : 0;
              const regularSlice = regularTasks.slice(0, 3 - beautyRows);
              const extraCount = regularTasks.length - regularSlice.length + (beautyBlock && beautyRows === 0 ? 0 : 0);

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
                      <span style={{ fontSize: 22, fontWeight: isToday ? 700 : 400, color: isToday ? T.gold : T.text0, marginLeft: 6, fontFamily: "'Cormorant Infant', serif" }}>{d.getDate()}</span>
                    </div>
                    <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>
                      {dayTasks.filter(t => t.doneDate === dStr).length}/{dayTasks.length}
                    </span>
                  </div>

                  {/* Якорные события */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", minWidth: 32 }}>{profile.wake || '07:00'}</span>
                    <span style={{ fontSize: 12, color: T.text2 }}>☀️ Подъём</span>
                  </div>
                  {isWork && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", minWidth: 32 }}>{profile.workStart || '09:00'}</span>
                      <span style={{ fontSize: 12, color: T.info }}>💼 Работа</span>
                    </div>
                  )}

                  {/* Beauty-блок */}
                  {beautyBlock && (
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleBeautyBlock(beautyBlock.tasks, dStr); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: beautyBlock.allDone ? T.text3 : T.text1, textDecoration: beautyBlock.allDone ? 'line-through' : 'none' }}
                    >
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${beautyBlock.allDone ? T.success : 'rgba(184,107,93,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: T.success, flexShrink: 0 }}>
                        {beautyBlock.allDone ? '✓' : ' '}
                      </div>
                      <span>
                        {beautyBlock.start}
                        {beautyBlock.end && beautyBlock.count > 1 ? `–${beautyBlock.end}` : ''}
                        {' '}✨ Уход
                      </span>
                    </div>
                  )}

                  {/* Обычные задачи */}
                  {regularSlice.map(t => (
                    <div
                      key={t.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: t.doneDate === dStr ? T.text3 : T.text1, textDecoration: t.doneDate === dStr ? 'line-through' : 'none' }}
                    >
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleTask(t.id, dStr); }}
                        style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${t.doneDate === dStr ? T.success : T.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: T.success, flexShrink: 0 }}
                      >
                        {t.doneDate === dStr ? '✓' : ' '}
                      </div>
                      <span>{t.preferredTime} {t.title}</span>
                    </div>
                  ))}

                  {/* Счётчик скрытых */}
                  {(regularTasks.length > regularSlice.length) && (
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>
                      +{regularTasks.length - regularSlice.length} ещё
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Детальный день */}
          {selectedDay && (
            <div className="card" style={{ marginTop: 12, borderLeft: `3px solid ${T.teal}` }}>
              <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 20, color: T.text0, marginBottom: 12 }}>
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
