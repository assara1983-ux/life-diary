// src/sections/HomeSection.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

export function HomeSection() {
  const { profile, tasks, setTasks, notify } = useApp();
  const [modal, setModal] = useState(null);
  const [adviceOpen, setAdviceOpen] = useState(true);
  const [tasksOpen, setTasksOpen] = useState(true);
  
  // Форма для добавления своей задачи (быстрая)
  const [ht, setHt] = useState({ title: "", freq: "daily", priority: "m", preferredTime: "", notes: "", section: "home" });
  const updHt = (k, v) => setHt(p => ({ ...p, [k]: v }));

  // --- Логика авто-генерации расписания уборки ---
  const autoHome = () => {
    const items = [];
    const beds = parseInt(profile.bedrooms) || 1;
    const baths = parseInt(profile.bathrooms) || 1;
    const rooms = profile.homeRooms || [];
    const hasKitchen = rooms.includes("Кухня") || true;
    const hasHall = rooms.includes("Коридор") || true;
    const hasLiving = rooms.includes("Гостиная");
    const hasBalcony = rooms.includes("Балкон");
    const hasStudy = rooms.includes("Кабинет");
    const hasNursery = rooms.includes("Детская");
    const hasPantry = rooms.includes("Кладовка");

    // Ежедневно
    items.push({ title: "Вытереть пыль", freq: "daily", priority: "l" });
    items.push({ title: "Помыть посуду", freq: "daily", priority: "m" });
    items.push({ title: "Вынести мусор", freq: "daily", priority: "m" });
    if (hasKitchen) items.push({ title: "Протереть плиту и варочную", freq: "daily", priority: "l" });
    if (hasKitchen) items.push({ title: "Протереть кухонные поверхности", freq: "every:2", priority: "l" });

    // Спальни
    for (let i = 1; i <= beds; i++) {
      const lbl = beds > 1 ? ` (спальня ${i})` : "";
      items.push({ title: `Проветрить спальню${lbl}`, freq: "daily", priority: "l" });
      items.push({ title: `Смена постельного${lbl}`, freq: "every:7", priority: "m" });
      items.push({ title: `Пылесос в спальне${lbl}`, freq: "every:7", priority: "m" });
      items.push({ title: `Влажная уборка спальни${lbl}`, freq: "every:14", priority: "l" });
    }

    // Санузлы
    for (let i = 1; i <= baths; i++) {
      const lbl = baths > 1 ? ` (санузел ${i})` : "";      items.push({ title: `Сантехника${lbl}`, freq: "weekly:3", priority: "m" });
      items.push({ title: `Унитаз и раковина${lbl}`, freq: "weekly:3", priority: "m" });
      items.push({ title: `Зеркала${lbl}`, freq: "weekly:1", priority: "l" });
      items.push({ title: `Генуборка ванной${lbl}`, freq: "every:14", priority: "h" });
    }

    // Коридор
    if (hasHall) {
      items.push({ title: "Подмести коридор", freq: "every:2", priority: "l" });
      items.push({ title: "Влажная уборка коридора", freq: "weekly:5", priority: "l" });
    }

    // Гостиная
    if (hasLiving) {
      items.push({ title: "Пылесос в гостиной", freq: "weekly:2", priority: "m" });
      items.push({ title: "Влажная уборка гостиной", freq: "every:14", priority: "l" });
      items.push({ title: "Вытереть пыль с мебели", freq: "weekly:1", priority: "l" });
    }

    // Балкон
    if (hasBalcony) items.push({ title: "Уборка на балконе", freq: "every:14", priority: "l" });

    // Кабинет
    if (hasStudy) items.push({ title: "Порядок в кабинете", freq: "weekly:5", priority: "l" });

    // Детская
    if (hasNursery) {
      items.push({ title: "Уборка детской", freq: "every:2", priority: "h" });
      items.push({ title: "Дезинфекция игрушек", freq: "every:7", priority: "m" });
    }

    // Кладовка
    if (hasPantry) items.push({ title: "Разбор кладовки", freq: "every:30", priority: "l" });

    // Общее
    items.push({ title: "Мытьё окон", freq: "every:30", priority: "l" });
    items.push({ title: "Генеральная уборка", freq: "every:90", priority: "h" });
    items.push({ title: "Чистка холодильника", freq: "weekly:5", priority: "l" });

    // Растения
    if (profile.plants && profile.plants !== "Нет")
      items.push({ title: "Полить цветы", freq: profile.plants.includes("день") ? "daily" : "every:2", priority: "m" });

    // Сезонные задачи
    const month = new Date().getMonth() + 1;
    if (month === 3 || month === 4) {
      items.push({ title: "🌸 Сезон: Убрать зимние вещи", freq: "once", priority: "h", notes: "Стирка и хранение в вакуумных пакетах" });
      items.push({ title: "🌸 Сезон: Весенняя генеральная уборка", freq: "once", priority: "h" });
    }
    if (month === 10 || month === 11) {      items.push({ title: "🍂 Сезон: Достать зимние вещи", freq: "once", priority: "h" });
      items.push({ title: "❄️ Сезон: Проверить отопление", freq: "once", priority: "h" });
    }

    return items.map(t => ({
      ...t, id: Date.now() + Math.random(), section: "home", lastDone: "", doneDate: "", notes: t.notes || ""
    }));
  };

  // Фильтрация задач для рендера
  const today = new Date().toISOString().split("T")[0];
  const homeTasks = tasks.filter(t => t.section === "home");
  const isDue = (t, dateStr) => {
    if (!t.freq) return false;
    if (t.doneDate === dateStr) return false;
    if (t.freq === "daily") return t.lastDone !== dateStr;
    if (t.freq === "workdays") { const d = new Date(dateStr); return d.getDay() >= 1 && d.getDay() <= 5 && t.lastDone !== dateStr; }
    if (t.freq.startsWith("every:")) {
      const n = parseInt(t.freq.split(":")[1]);
      if (!t.lastDone) return false;
      return Math.floor((new Date(dateStr) - new Date(t.lastDone)) / 86400000) >= n;
    }
    if (t.freq.startsWith("weekly:")) {
      const dayIndex = parseInt(t.freq.split(":")[1]);
      return new Date(dateStr).getDay() === dayIndex && t.lastDone !== dateStr;
    }
    return false;
  };

  const renderGroup = (title, emoji, color, list, showFreq) => {
    if (!list.length) return null;
    return (
      <div className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${color}` }}>
        <div className="card-hd">
          <div className="card-title"> <span style={{ marginRight: 8 }}>{emoji}</span>{title}</div>
          <span className="badge bm">{list.filter(t => t.doneDate !== today).length}/{list.length}</span>
        </div>
        {list.map(task => (
          <div key={task.id} className="task-row">
            <div className={`chk${task.doneDate === today ? " done" : ""}`}
              onClick={() => setTasks(p => p.map(t => t.id === task.id ? { ...t, doneDate: t.doneDate === today ? null : today, lastDone: t.doneDate === today ? t.lastDone : today } : t))}>
              {task.doneDate === today ? "✓" : " "}
            </div>
            <div className="task-body">
              <div className={`task-name${task.doneDate === today ? " done" : ""}`}>{task.title}</div>
              <div className="task-meta">
                {showFreq && <span className="badge bt">{task.freq === "daily" ? "Ежедневно" : task.freq === "workdays" ? "Будни" : task.freq}</span>}
                {task.notes && <span className="badge bm" style={{ fontStyle: "italic" }}>{task.notes.slice(0, 30)}</span>}
              </div>
            </div>            <div className="ico-btn" style={{ color: T.teal, opacity: 0.7 }} onClick={() => setModal(task)}>✏️</div>
            <div className="ico-btn danger" onClick={() => setTasks(p => p.filter(t => t.id !== task.id))}>✕</div>
          </div>
        ))}
      </div>
    );
  };

  // Классификация задач
  const todayTasks = homeTasks.filter(t => (t.freq === "daily" || t.freq === "workdays") && isDue(t, today));
  const weekTasks = homeTasks.filter(t => t.freq.includes("weekly") && isDue(t, today));
  const monthTasks = homeTasks.filter(t => t.freq.includes("every:30") && isDue(t, today));
  const otherTasks = homeTasks.filter(t => (t.freq.includes("every:90") || t.freq.includes("every:14")) && isDue(t, today));

  return (
    <div>
      <SectionHero sectionId="home" />
      {/* Шапка дома */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(45,32,16,0.05)", borderRadius: 10, marginBottom: 10, flexWrap: "wrap" }}>
        {profile.homeType && <span style={{ fontSize: 12, color: T.text2 }}>🏠 {profile.homeType}{profile.homeArea ? ` ${profile.homeArea}м²` : " "}</span>}
        {(profile.livesWith || []).length > 0 && <span style={{ fontSize: 12, color: T.text3 }}>· {(profile.livesWith || []).join(", ")}</span>}
        {(profile.cleanDays || []).length > 0 && <span style={{ fontSize: 12, color: T.gold, marginLeft: "auto" }}>🧹 {profile.cleanDays.join(", ")}</span>}
      </div>

      {/* AI Советы */}
      <div style={{ marginBottom: 12 }}>
        <div onClick={() => setAdviceOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: adviceOpen ? "12px 12px 0 0" : "12px", cursor: "pointer", background: "rgba(200,164,90,0.06)", border: "1px solid rgba(200,164,90,0.15)" }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>Советы по быту</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{adviceOpen ? "▲" : "▼"}</span>
        </div>
        {adviceOpen && (
          <div style={{ border: "1px solid rgba(200,164,90,0.12)", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
            <AiBox
              profile={profile}
              label="Быт и дом"
              prompt={`Дай 3 конкретные рекомендации по организации быта для ${profile.name}. 
              Тип жилья: ${profile.homeType}, Площадь: ${profile.homeArea}. 
              Живут: ${(profile.livesWith || []).join(", ")}. 
              Свободное время после: ${profile.workEnd || "18:00"}.
              Стиль: ${profile.planningStyle}.
              1. [Приоритет сегодня] 2. [Оптимизация] 3. [Система].`}
              btnText="Советы по быту"
              placeholder="Анализирую профиль и даю конкретные советы..."
            />
          </div>
        )}
      </div>

      {/* Список задач */}
      <div onClick={() => setTasksOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: tasksOpen ? "12px 12px 0 0" : "12px", cursor: "pointer", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: tasksOpen ? 0 : 8 }}>        <span style={{ fontSize: 16 }}>🏡</span>
        <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.text0, fontWeight: 500 }}>Дела по дому</span>
        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => {
            const ts = autoHome();
            setTasks(p => {
              const exist = new Set(p.filter(x => x.section === "home").map(x => x.title.toLowerCase()));
              const filtered = ts.filter(t => !exist.has(t.title.toLowerCase()));
              notify(`Добавлено ${filtered.length} задач`);
              return [...p, ...filtered];
            });
          }}>+ Авто</button>
          <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => setModal({})}>+</button>
        </div>
        <span style={{ fontSize: 11, color: T.text3 }}>{tasksOpen ? "▲" : "▼"}</span>
      </div>

      {tasksOpen && (
        <div>
          {renderGroup("Сегодня", "☀️", T.success, todayTasks, false)}
          {renderGroup("На этой неделе", "📅", T.teal, weekTasks, true)}
          {renderGroup("В этом месяце", "🗓️", T.warn, monthTasks, true)}
          {renderGroup("Прочее", "📋", T.text3, otherTasks, true)}
          {todayTasks.length === 0 && weekTasks.length === 0 && monthTasks.length === 0 && (
            <div className="empty">
              <span className="empty-ico">🏡</span>
              <p>Дел нет! Нажмите «+ Авто», чтобы создать расписание.</p>
            </div>
          )}
        </div>
      )}

      {/* Модалка добавления/редактирования */}
      {modal !== null && (
        <TaskModal
          task={modal?.id ? modal : null}
          defaultSection="home"
          onSave={t => {
            setTasks(p => modal?.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]);
            notify(modal?.id ? "Обновлено" : "Добавлено");
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
                                                      }
