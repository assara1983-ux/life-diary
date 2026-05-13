// src/sections/TodaySection.jsx
import { useState, useEffect } from "react";
import { useApp } from "../store/AppContext";
import { Icon } from "../components/Icon";
import { 
  getProfileInsights, 
  getMoonDay, 
  getCurrentMeridian 
} from "../utils/knowledgeEngine";

export function TodaySection() {
  const { profile } = useApp();
  
  // Состояние для обновления времени (чтобы меридиан менялся в реальном времени)
  const [now, setNow] = useState(new Date());

  // Получаем данные из Мозга приложения
  const insights = getProfileInsights(profile) || {};
  const moonDay = getMoonDay(now) || 1;
  
  // Обновляем меридиан каждую минуту
  const meridian = getCurrentMeridian(now);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Логика продуктивности на основе хроно-типа
  const getChronoAdvice = () => {
    const type = profile?.chronotype || "🕊️ Голубь";
    const hour = now.getHours();
    
    if (type.includes("Сова")) {
      return hour >= 14 ? "Сейчас ваш пик! Беритесь за сложные задачи." : "Утро для рутины. Пик энергии наступит вечером.";
    }
    if (type.includes("Жаворонок")) {
      return hour < 12 ? "Идеальное время для аналитики и решений." : "Сложные дела на завтра. Время для отдыха.";
    }
    return "Сбалансированный ритм. Распределяйте нагрузку равномерно.";
  };

  const chronoText = getChronoAdvice();
  const restriction = insights.moonRestriction?.forbidden || "Нет строгих запретов";

  return (
    <div className="page" style={{ position: "relative" }}>
      
      {/* ─── 1. ВИТАЛ-СТАТУС (Меридиан + Луна) ─── */}
      <div className="g2" style={{ marginBottom: 16 }}>        
        {/* Карточка: Меридиан (ТКМ) */}
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

        {/* Карточка: Лунный день */}
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
          <div style={{ 
            marginTop: 6, 
            padding: 6, 
            borderRadius: 4,
            background: restriction !== "Нет строгих запретов" ? "rgba(139,32,32,0.05)" : "rgba(200,164,90,0.05)",
            fontSize: 11,
            color: restriction !== "Нет строгих запретов" ? "var(--error)" : "var(--text2)",
            lineHeight: 1.4
          }}>
            ⚠️ <strong>Запрет:</strong> {restriction}
          </div>
        </div>
      </div>

      {/* ─── 2. ПРОДУКТИВНОСТЬ (Хроно-тип) ─── */}
      <div className="card" style={{ borderLeft: "3px solid var(--success)", marginBottom: 16 }}>
        <div className="card-hd">          <div className="card-title">⏰ Окно продуктивности</div>
          <span className="badge bgr">{profile?.chronotype || "🕊️ Голубь"}</span>
        </div>
        <div style={{ fontFamily: "var(--font-italic)", fontSize: 14, color: "var(--text1)", lineHeight: 1.5 }}>
          {chronoText}
        </div>
      </div>

      {/* ─── 3. ПЛАНИРОВЩИК ДНЯ ─── */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">📅 План на сегодня</div>
          <button className="btn btn-ghost btn-sm" style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
            + Добавить
          </button>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {/* Заглушка для задач */}
          {[
            { time: "09:00", title: "Утренний ритуал (Дыхание Сам Чон До)", done: true },
            { time: "10:30", title: "Блок глубокой работы (Аналитика)", done: false },
            { time: "13:00", title: "Обед + Прогулка (Активация меридиана)", done: false }
          ].map((task, i) => (
            <div key={i} className="task-row" style={{ opacity: task.done ? 0.5 : 1 }}>
              <div className={`chk ${task.done ? "done" : ""}`}>
                {task.done && "✓"}
              </div>
              <div className="task-body">
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)", marginBottom: 2 }}>
                  {task.time}
                </div>
                <div className={`task-name ${task.done ? "done" : ""}`}>
                  {task.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
