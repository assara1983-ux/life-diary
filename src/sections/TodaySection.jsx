import { useState, useEffect } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getMoonDay } from "../utils/knowledgeEngine";

export function TodaySection() {
  const { profile } = useApp();
  const insights = getProfileInsights(profile);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = now.getHours();
  let activeMeridian = "Перикард";
  if (currentHour >= 3 && currentHour < 5) activeMeridian = "Лёгкие";
  else if (currentHour >= 5 && currentHour < 7) activeMeridian = "Толстый кишечник";
  else if (currentHour >= 7 && currentHour < 9) activeMeridian = "Желудок";
  else if (currentHour >= 9 && currentHour < 11) activeMeridian = "Селезёнка";
  else if (currentHour >= 11 && currentHour < 13) activeMeridian = "Сердце";
  else if (currentHour >= 13 && currentHour < 15) activeMeridian = "Тонкий кишечник";
  else if (currentHour >= 15 && currentHour < 17) activeMeridian = "Мочевой пузырь";
  else if (currentHour >= 17 && currentHour < 19) activeMeridian = "Почки";
  else if (currentHour >= 19 && currentHour < 21) activeMeridian = "Перикард";
  else if (currentHour >= 21 && currentHour < 23) activeMeridian = "3 обогревателя";

  const moon = getMoonDay();

  return (
    <div className="page">
      <div className="card" style={{ background: "linear-gradient(135deg, #fff 0%, #f8f4e8 100%)", borderLeft: "4px solid var(--blue)" }}>
        <div className="card-hd">
          <div className="card-title">☀️ Энергия дня</div>
          <div className="badge bm">🌙 {moon}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div className="badge bg" style={{ justifyContent: "center" }}>🫁 {activeMeridian}</div>
          <div className="badge bgr" style={{ justifyContent: "center" }}>🧠 {insights.chronotype}</div>
        </div>
        <div className="ai-box" style={{ marginTop: 12 }}>
          <div className="ai-label">◈ СОВЕТ ДНЯ</div>
          <div className="ai-text">
            Сейчас активен меридиан <strong>{activeMeridian}</strong>. 
            Рекомендация: {insights.health.advice}
          </div>
        </div>
      </div>

      <div className="sec-lbl">◈ ПЛАНИРОВЩИК ДНЯ</div>
      <div className="card">
        <div className="card-title">📅 Сегодня</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="task-row">
            <div className="chk" />
            <div className="task-body">
              <div className="task-name">07:00 Подъём</div>
            </div>
          </div>
          <div className="task-row">
            <div className="chk" />
            <div className="task-body">
              <div className="task-name">09:00 Работа</div>
            </div>
          </div>
          <div className="task-row">
            <div className="chk" />
            <div className="task-body">
              <div className="task-name">13:00 Обед + Дыхание Сам Чон До</div>
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
          + Добавить событие
        </button>
      </div>
    </div>
  );
}
