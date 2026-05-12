// src/sections/ScheduleSection.jsx
import { useState, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

export function ScheduleSection() {
  const { profile, tasks, setTasks, notify } = useApp();
  const [view, setView] = useState("week"); // week | ai
  const [offset, setOffset] = useState(0);
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [taskModal, setTaskModal] = useState(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const changeOffset = (newOffset) => {
    setOffset(newOffset);
    setSelectedDay(null);
  };

  const getAiSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const prompt = `Составь детальное расписание на неделю для ${profile.name || "меня"}.
        Работа: ${profile.workStart || "9:00"}–${profile.workEnd || "18:00"} (${profile.workType || "офис"}),
        дорога: ${profile.commuteTime || "нет"}. Подъём: ${profile.wake || "7:00"}, отбой: ${profile.sleep || "23:00"}.
        Хронотип: ${profile.chronotype || "—"}.
        ВАЖНО: практики и спорт ТОЛЬКО после ${profile.workEnd || "18:00"}.`;
      
      setAiText("Используйте виджет 'ИИ-план недели' ниже для генерации."); 
    } catch (e) {
      setAiText("Ошибка соединения.");
    }
    setLoading(false);
  }, [profile]);

  // Строим неделю
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  startOfWeek.setDate(now.getDate() - dayOfWeek + offset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;  });

  const DAY_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  // Хелпер для проверки даты (локальная копия)
  const isDue = (task, today) => {
    const last = task.lastDone;
    const d = new Date(today); d.setHours(0,0,0,0);
    if (!task.freq) return false;
    if (task.doneDate === today) return false;
    if (task.freq === "daily") return last !== today;
    if (task.freq === "workdays") { const dn = d.getDay(); return dn >= 1 && dn <= 5 && last !== today; }
    if (task.freq.startsWith("weekly:")) { return task.freq.split(":")[1].split(",").map(Number).includes(d.getDay()) && last !== today; }
    if (task.freq.startsWith("every:")) {
      const n = parseInt(task.freq.split(":")[1]);
      if (!last) return true;
      return Math.floor((d - new Date(last)) / 86400000) >= n;
    }
    return false;
  };

  return (
    <div>
      <SectionHero sectionId="schedule" />
      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 2, background: 'rgba(45,32,16,0.05)', border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 4, marginBottom: 20 }}>
        <div 
          onClick={() => setView("week")}
          style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', fontSize: 14, background: view === "week" ? 'rgba(45,106,79,0.12)' : 'transparent', color: view === "week" ? T.gold : T.text2, transition: 'all .18s' }}>
          🗓️ Неделя
        </div>
        <div 
          onClick={() => setView("ai")}
          style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', fontSize: 14, background: view === "ai" ? 'rgba(45,106,79,0.12)' : 'transparent', color: view === "ai" ? T.gold : T.text2, transition: 'all .18s' }}>
          ✨ ИИ-план
        </div>
      </div>

      {view === "week" && (
        <div>
          {/* Навигация */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => changeOffset(offset - 1)}>←</button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 14, color: T.text2 }}>
              {offset === 0 ? "Эта неделя" : `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${weekDays[6].toLocaleString('ru-RU', { month: 'short' })}`}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => changeOffset(offset + 1)}>→</button>
            <button className="btn btn-ghost btn-sm" onClick={() => changeOffset(0)}>Сегодня</button>
          </div>

          {/* Дни недели */}          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {weekDays.map((d, i) => {
              const dStr = d.toISOString().split("T")[0];
              const isToday = dStr === todayStr;
              const isSelected = selectedDay === dStr;
              const isWork = (profile.workDaysList || [1, 2, 3, 4, 5]).includes(d.getDay());
              
              // ✅ ИСПРАВЛЕНО: комментарий и const на разных строках
              // Фильтрация задач на этот день
              const dayTasks = tasks.filter(t => 
                t.preferredTime && (
                  isDue(t, dStr) || t.doneDate === dStr
                )
              );

              return (
                <div 
                  key={dStr} 
                  onClick={() =>
(isSelected ? null : dStr)}
                  style={{ 
                    borderRadius: 12, padding: '10px 12px', cursor: 'pointer', 
                    border: `1px solid ${isToday ? T.gold : (isSelected ? T.teal : T.bdr)}`,
                    background: isToday ? 'rgba(45,106,79,0.08)' : (isSelected ? 'rgba(78,201,190,0.06)' : 'rgba(45,32,16,0.03)'),
                    transition: 'all .15s' 
                  }}
                >
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
                    <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", minWidth: 32 }}>{profile.wake || "07:00"}</span>
                    <span style={{ fontSize: 12, color: T.text2 }}>☀️ Подъём</span>
                  </div>
                  {isWork && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", minWidth: 32 }}>{profile.workStart || "09:00"}</span>
                      <span style={{ fontSize: 12, color: T.info }}>💼 Работа</span>
                    </div>
                  )}

                  {/* Список задач */}
                  {dayTasks.slice(0, 3).map(t => (                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: t.doneDate === dStr ? T.text3 : T.text1, textDecoration: t.doneDate === dStr ? 'line-through' : 'none' }}>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setTasks(p => p.map(x => x.id === t.id ? { ...x, doneDate: x.doneDate === dStr ? null : dStr } : x)); }}
                        style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${t.doneDate === dStr ? T.success : T.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: T.success }}
                      >
                        {t.doneDate === dStr ? "✓" : " "}
                      </div>
                      <span>{t.preferredTime} {t.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>+{dayTasks.length - 3} ещё</div>}
                </div>
              );
            })}
          </div>

          {/* Детальный день (если выбран) */}
          {selectedDay && (
            <div className="card" style={{ marginTop: 12, borderLeft: `3px solid ${T.teal}` }}>
              <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 20, color: T.text0, marginBottom: 12 }}>
                {new Date(selectedDay).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setTaskModal({})}>+ Добавить событие</button>
              <div style={{ marginTop: 8, fontSize: 12, color: T.text3 }}>
                (Детальное расписание для этого дня отображается в разделе "Сегодня")
              </div>
            </div>
          )}
        </div>
      )}

      {view === "ai" && (
        <div>
          <AiBox 
            profile={profile}
            label=" ИИ-Расписание" 
            prompt={`Составь оптимальное расписание на неделю с учетом моего хронотипа (${profile.chronotype || '—'}) и рабочего графика (${profile.workStart || '09:00'}–${profile.workEnd || '18:00'}).`}
            btnText="Составить расписание"
          />
        </div>
      )}

      {taskModal && (
        <TaskModal 
          task={taskModal.id ? taskModal : null} 
          defaultSection="tasks"
          onSave={(t) => { setTasks(p => taskModal.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]); notify("Сохранено"); }} 
          onClose={() => setTaskModal(null)} 
        />
      )}    </div>
  );
}
