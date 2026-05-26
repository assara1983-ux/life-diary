// src/sections/TodaySection.jsx
import { useState, useEffect, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { Icon } from "../components/Icon";
import { getProfileInsights, getMoonDay, getCurrentMeridian } from "../utils/knowledgeEngine";

// ─── УТИЛИТА: локальная дата без UTC-сдвига ───
function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ─── УТИЛИТА: единая логика проверки задачи на день ───
function isDueOnDay(task, dStr) {
  const d = new Date(dStr + 'T00:00:00');
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
    const diffDays = Math.floor((new Date(dStr + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000);
    return diffDays >= 0 && diffDays % n === 0;
  }
  if (task.freq.startsWith('monthly:')) {
    return task.freq.split(':')[1].split(',').map(Number).includes(d.getDate());
  }
  return false;
}

// ─── УТИЛИТА: добавить минуты к времени ───
function addMinutes(time, mins) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ─── УТИЛИТА: группировка beauty-задач в блоки «Уход» ───
function groupBeautyTasks(tasks) {
  if (!tasks.length) return [];
  const sorted = [...tasks].sort((a, b) => (a.preferredTime || '').localeCompare(b.preferredTime || ''));
  const blocks = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1];
    const prevEnd = addMinutes(prev.preferredTime, prev.beautyDuration || 10);
    const gap = (() => {
      if (!prev.preferredTime || !sorted[i].preferredTime) return 999;
      const [ph, pm] = prevEnd.split(':').map(Number);
      const [nh, nm] = sorted[i].preferredTime.split(':').map(Number);
      return (nh * 60 + nm) - (ph * 60 + pm);
    })();
    if (gap <= 15) { current.push(sorted[i]); }
    else { blocks.push(current); current = [sorted[i]]; }
  }
  blocks.push(current);
  return blocks;
}

export function TodaySection() {
  const { profile, tasks, setTasks } = useApp();
  const [now, setNow] = useState(new Date());

  const insights = getProfileInsights(profile) || {};
  const moonDay = getMoonDay(now) || 1;
  const meridian = getCurrentMeridian(now);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ─── ЛОКАЛЬНАЯ дата — без UTC-сдвига ───
  const today = localDateStr(now);

  // ─── Формируем план на сегодня ───
  const todayItems = useMemo(() => {
    const result = [];

    const regularTasks = tasks.filter(t =>
      t.section !== 'beauty' &&
      t.preferredTime &&
      (isDueOnDay(t, today) || t.doneDate === today)
    );
    regularTasks.forEach(t => result.push({ type: 'task', time: t.preferredTime, task: t }));

    const beautyDue = tasks.filter(t =>
      t.section === 'beauty' &&
      t.preferredTime &&
      (isDueOnDay(t, today) || t.doneDate === today)
    );
    const beautyBlocks = groupBeautyTasks(beautyDue);
    beautyBlocks.forEach(block => {
      const startTime = block[0].preferredTime;
      const lastTask = block[block.length - 1];
      const endTime = addMinutes(lastTask.preferredTime, lastTask.beautyDuration || 10);
      const allDone = block.every(t => t.doneDate === today);
      result.push({ type: 'beauty', time: startTime, endTime, block, allDone });
    });

    if (profile?.wake) result.push({ type: 'anchor', time: profile.wake, title: '☀️ Подъём' });
    if (profile?.sleep) result.push({ type: 'anchor', time: profile.sleep, title: '🌙 Отбой' });
    const isWorkDay = (profile?.workDaysList || [1, 2, 3, 4, 5]).includes(now.getDay());
    if (isWorkDay && profile?.workStart) result.push({ type: 'anchor', time: profile.workStart, title: '💼 Работа' });
    if (isWorkDay && profile?.workEnd) result.push({ type: 'anchor', time: profile.workEnd, title: '💼 Конец работы' });

    return result.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [tasks, today, profile, now]);

  const getChronoAdvice = () => {
    const type = profile?.chronotype || "🕊️ Голубь";
    const hour = now.getHours();
    if (type.includes("Сова")) return hour >= 14 ? "Сейчас ваш пик! Беритесь за сложные задачи." : "Утро для рутины. Пик энергии наступит вечером.";
    if (type.includes("Жаворонок")) return hour < 12 ? "Идеальное время для аналитики и решений." : "Сложные дела на завтра. Время для отдыха.";
    return "Сбалансированный ритм. Распределяйте нагрузку равномерно.";
  };

  const restriction = insights.moonRestriction?.forbidden || "Нет строгих запретов";

  const toggleTask = (taskId) => {
    setTasks(p => p.map(t => t.id === taskId
      ? { ...t, doneDate: t.doneDate === today ? null : today, lastDone: t.doneDate === today ? t.lastDone : today }
      : t
    ));
  };

  const toggleBeautyBlock = (block) => {
    const allDone = block.every(t => t.doneDate === today);
    setTasks(p => p.map(t => {
      if (!block.find(b => b.id === t.id)) return t;
      return { ...t, doneDate: allDone ? null : today, lastDone: allDone ? t.lastDone : today };
    }));
  };

  return (
    <div className="page" style={{ position: "relative" }}>

      {/* ─── 1. ВИТАЛ-СТАТУС ─── */}
      <div className="g2" style={{ marginBottom: 16 }}>
        <div className="card" style={{ borderLeft: "3px solid var(--blue)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="health" size={20} color="var(--blue)" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", letterSpacing: 1 }}>
              АКТИВЕН СЕЙЧАС ({meridian.time})
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, color: "var(--text1)" }}>
            Меридиан {meridian.name}
          </div>
          <div style={{ fontFamily: "var(--font-italic)", fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
            ({meridian.sign})
          </div>
          <div className="ai-box" style={{ marginTop: 8, padding: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.4 }}>
              💡 <strong>Совет:</strong> {meridian.advice}
            </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: restriction !== "Нет строгих запретов" ? "3px solid var(--error)" : "3px solid var(--gold)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="mental" size={20} color="var(--gold)" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", letterSpacing: 1 }}>
              ЛУННЫЙ ЦИКЛ
            </span>
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, color: "var(--text1)" }}>
            {moonDay}-й день
          </div>
          <div style={{ marginTop: 6, padding: 6, borderRadius: 4, background: restriction !== "Нет строгих запретов" ? "rgba(139,32,32,0.05)" : "rgba(200,164,90,0.05)", fontSize: 11, color: restriction !== "Нет строгих запретов" ? "var(--error)" : "var(--text2)", lineHeight: 1.4 }}>
            ⚠️ <strong>Запрет:</strong> {restriction}
          </div>
        </div>
      </div>

      {/* ─── 2. ХРОНОТИП ─── */}
      <div className="card" style={{ borderLeft: "3px solid var(--success)", marginBottom: 16 }}>
        <div className="card-hd">
          <div className="card-title">⏰ Окно продуктивности</div>
          <span className="badge bgr">{profile?.chronotype || "🕊️ Голубь"}</span>
        </div>
        <div style={{ fontFamily: "var(--font-italic)", fontSize: 14, color: "var(--text1)", lineHeight: 1.5 }}>
          {getChronoAdvice()}
        </div>
      </div>

      {/* ─── 3. ПЛАН НА СЕГОДНЯ ─── */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">📅 План на сегодня</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)" }}>
            {todayItems.filter(i => i.type === 'task' && i.task?.doneDate === today).length +
             todayItems.filter(i => i.type === 'beauty' && i.allDone).length} / {todayItems.filter(i => i.type !== 'anchor').length} выполнено
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {todayItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 13 }}>
              Задач на сегодня нет
            </div>
          )}

          {todayItems.map((item, idx) => {

            if (item.type === 'anchor') {
              return (
                <div key={`anchor-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.55 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)", width: 42, flexShrink: 0 }}>{item.time}</div>
                  <div style={{ height: 1, flex: 1, background: 'var(--line)' }} />
                  <div style={{ fontSize: 12, color: "var(--text2)", whiteSpace: 'nowrap' }}>{item.title}</div>
                </div>
              );
            }

            if (item.type === 'task') {
              const t = item.task;
              const done = t.doneDate === today;
              return (
                <div key={t.id} className="task-row" style={{ opacity: done ? 0.5 : 1 }}>
                  <div
                    className={`chk ${done ? "done" : ""}`}
                    onClick={() => toggleTask(t.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {done && "✓"}
                  </div>
                  <div className="task-body">
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)", marginBottom: 2 }}>
                      {t.preferredTime}
                    </div>
                    <div className={`task-name ${done ? "done" : ""}`}>{t.title}</div>
                  </div>
                </div>
              );
            }

            if (item.type === 'beauty') {
              const allDone = item.block.every(t => t.doneDate === today);
              return (
                <div
                  key={`beauty-${idx}`}
                  style={{ padding: '8px 10px', borderRadius: 8, background: allDone ? 'rgba(45,106,79,0.06)' : 'rgba(184,107,93,0.06)', border: `1px solid ${allDone ? 'rgba(45,106,79,0.2)' : 'rgba(184,107,93,0.2)'}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      onClick={() => toggleBeautyBlock(item.block)}
                      style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${allDone ? 'rgba(45,106,79,0.6)' : 'rgba(184,107,93,0.5)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: allDone ? 'rgba(45,106,79,0.15)' : 'transparent', flexShrink: 0 }}
                    >
                      {allDone && <span style={{ fontSize: 11, color: '#2d6a4f' }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)", marginBottom: 2 }}>
                        {item.block.length > 1 ? `${item.time} – ${item.endTime}` : item.time}
                      </div>
                      <div style={{ fontSize: 13, color: allDone ? 'var(--text3)' : 'var(--text1)', textDecoration: allDone ? 'line-through' : 'none', fontWeight: 500 }}>
                        ✨ Уход {item.block.length > 1 ? `(${item.block.length} процедуры)` : `· ${item.block[0].title}`}
                      </div>
                      {item.block.length > 1 && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          {item.block.map(t => t.title).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}
