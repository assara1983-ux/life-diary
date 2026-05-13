// src/sections/GoalsSection.jsx
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { Icon } from "../components/Icon";
import { T } from "../utils/theme";

export function GoalsSection() {
  const { profile } = useApp();
  const [tab, setTab] = useState("wheel"); // wheel | goal | helpers
  const [wheelData, setWheelData] = useState({
    health: 6,
    relationships: 5,
    career: 7,
    finances: 4,
    growth: 6,
    leisure: 3,
    spirituality: 5,
    creativity: 4
  });

  // === КОЛЕСО ЖИЗНИ — BLUEPRINT СТИЛЬ ===
  const renderWheel = () => {
    const categories = [
      { id: "health", label: "Здоровье", icon: "health", color: T.success },
      { id: "relationships", label: "Отношения", icon: "heart", color: T.blue },
      { id: "career", label: "Карьера", icon: "work", color: T.gold },
      { id: "finances", label: "Финансы", icon: "shopping", color: T.teal },
      { id: "growth", label: "Рост", icon: "hobbies", color: T.blue },
      { id: "leisure", label: "Отдых", icon: "mental", color: T.gold },
      { id: "spirituality", label: "Духовность", icon: "profile", color: T.success },
      { id: "creativity", label: "Творчество", icon: "travel", color: T.blue }
    ];

    const centerX = 200;
    const centerY = 200;
    const radius = 150;
    const angleStep = (Math.PI * 2) / categories.length;

    // Генерация точек для полигона
    const points = categories.map((cat, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (wheelData[cat.id] / 10) * radius;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");

    return (
      <div className="card" style={{ background: "rgba(255,255,255,0.7)" }}>
        <div className="card-hd">          <div className="card-title" style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: T.blue }}>
            Колесо баланса жизни
          </div>
          <div className="badge bm" style={{ fontFamily: "'JetBrains Mono'", fontSize: 9 }}>
            1:1
          </div>
        </div>
        
        <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 13, color: T.text3, fontStyle: "italic", marginBottom: 16 }}>
          Оцени каждую сферу от 1 до 10. Идеальный баланс — ровный круг.
        </div>

        {/* SVG КОЛЕСО В СТИЛЕ BLUEPRINT */}
        <div style={{ position: "relative", width: "100%", maxWidth: 400, margin: "0 auto" }}>
          <svg viewBox="0 0 400 400" style={{ width: "100%", height: "auto" }}>
            {/* Фоновая сетка */}
            {[1, 2, 3, 4, 5].map(r => (
              <circle
                key={r}
                cx={centerX}
                cy={centerY}
                r={r * 30}
                fill="none"
                stroke="rgba(0,112,192,0.15)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            ))}
            
            {/* Оси */}
            {categories.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={centerX}
                  y1={centerY}
                  x2={x}
                  y2={y}
                  stroke="rgba(0,112,192,0.2)"
                  strokeWidth="1"
                />
              );
            })}
            
            {/* Полигон текущих значений */}
            <polygon
              points={points}              fill="rgba(200,164,90,0.2)"
              stroke={T.gold}
              strokeWidth="2"
            />
            
            {/* Точки и подписи */}
            {categories.map((cat, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const x = centerX + (radius + 30) * Math.cos(angle);
              const y = centerY + (radius + 30) * Math.sin(angle);
              return (
                <g key={cat.id}>
                  <circle
                    cx={centerX + (wheelData[cat.id] / 10) * radius * Math.cos(angle)}
                    cy={centerY + (wheelData[cat.id] / 10) * radius * Math.sin(angle)}
                    r="4"
                    fill={T.gold}
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="'JetBrains Mono', monospace"
                    fontSize="9"
                    fill={T.text2}
                    style={{ letterSpacing: "0.5px" }}
                  >
                    {cat.label}
                  </text>
                </g>
              );
            })}
          </svg>
          
          {/* Масштаб */}
          <div style={{ 
            position: "absolute", 
            bottom: 8, 
            right: 10, 
            fontFamily: "'JetBrains Mono'", 
            fontSize: 7, 
            color: T.text3,
            letterSpacing: 1
          }}>
            1:1
          </div>
        </div>

        {/* Слайдеры для редактирования */}        <div className="sec-lbl" style={{ marginTop: 20, fontFamily: "'JetBrains Mono'", fontSize: 9 }}>
          ◈ РЕДАКТИРОВАНИЕ ОЦЕНОК
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ 
                fontFamily: "'JetBrains Mono'", 
                fontSize: 8, 
                color: T.text3,
                letterSpacing: 1,
                textTransform: "uppercase"
              }}>
                {cat.label}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={wheelData[cat.id]}
                onChange={(e) => setWheelData({ ...wheelData, [cat.id]: +e.target.value })}
                style={{ accentColor: cat.color }}
              />
              <div style={{ 
                fontFamily: "'JetBrains Mono'", 
                fontSize: 10, 
                color: cat.color,
                textAlign: "center"
              }}>
                {wheelData[cat.id]}/10
              </div>
            </div>
          ))}
        </div>

        {/* Рекомендации */}
        {Object.entries(wheelData).filter(([_, val]) => val < 5).length > 0 && (
          <div className="ai-box" style={{ marginTop: 16, borderLeftColor: T.gold }}>
            <div className="ai-label" style={{ fontFamily: "'JetBrains Mono'", fontSize: 8 }}>
              ◈ ЗОНЫ ВНИМАНИЯ
            </div>
            <div className="ai-text" style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 13 }}>
              {Object.entries(wheelData)
                .filter(([_, val]) => val < 5)
                .map(([key, val]) => categories.find(c => c.id === key)?.label)
                .join(", ")} требуют вашего внимания. 
              Начните с одной микро-цели на этой неделе.
            </div>
          </div>
        )}      </div>
    );
  };

  // === ВКЛАДКА "ЦЕЛЬ" — ФУНКЦИОНАЛ ===
  const renderGoalTab = () => {
    const [goals, setGoals] = useState([
      { id: 1, title: "Научиться медитировать", sphere: "spirituality", deadline: "2024-12-31", progress: 30 },
      { id: 2, title: "Прочитать 12 книг", sphere: "growth", deadline: "2024-12-31", progress: 50 }
    ]);

    return (
      <div>
        <div className="card">
          <div className="card-hd">
            <div className="card-title" style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: T.blue }}>
              Мои цели
            </div>
            <button className="btn btn-primary btn-sm" style={{ fontFamily: "'JetBrains Mono'", fontSize: 10 }}>
              + Добавить цель
            </button>
          </div>

          {goals.map(goal => (
            <div key={goal.id} style={{ 
              padding: "12px 0", 
              borderBottom: "1px solid rgba(0,112,192,0.1)",
              marginBottom: 12
            }}>
              <div style={{ 
                fontFamily: "'Crimson Pro', serif", 
                fontSize: 14, 
                color: T.text1,
                marginBottom: 6
              }}>
                {goal.title}
              </div>
              <div style={{ 
                display: "flex", 
                gap: 8, 
                alignItems: "center",
                marginBottom: 8
              }}>
                <span style={{ 
                  fontFamily: "'JetBrains Mono'", 
                  fontSize: 8, 
                  color: T.text3,
                  padding: "2px 6px",
                  background: "rgba(0,112,192,0.08)",
                  borderRadius: 3                }}>
                  {goal.sphere}
                </span>
                <span style={{ 
                  fontFamily: "'JetBrains Mono'", 
                  fontSize: 8, 
                  color: T.text3
                }}>
                  {goal.deadline}
                </span>
              </div>
              <div className="prog-track" style={{ height: 6 }}>
                <div 
                  className="prog-fill gold" 
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
              <div style={{ 
                fontFamily: "'JetBrains Mono'", 
                fontSize: 9, 
                color: T.gold,
                textAlign: "right",
                marginTop: 4
              }}>
                {goal.progress}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // === ВКЛАДКА "ПОМОЩНИКИ" — BLUEPRINT СТИЛЬ ===
  const renderHelpersTab = () => {
    const helpers = [
      { id: 1, name: "Александр Петров", role: "Ментор по карьере", sphere: "career", contact: "telegram" },
      { id: 2, name: "Мария Иванова", role: "Йога-инструктор", sphere: "health", contact: "phone" }
    ];

    return (
      <div>
        <div className="card">
          <div className="card-hd">
            <div className="card-title" style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: T.blue }}>
              Мои помощники
            </div>
            <button className="btn btn-primary btn-sm" style={{ fontFamily: "'JetBrains Mono'", fontSize: 10 }}>
              + Добавить
            </button>          </div>

          <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 13, color: T.text3, fontStyle: "italic", marginBottom: 16 }}>
            Люди, которые помогают достигать целей
          </div>

          {helpers.map(helper => (
            <div key={helper.id} style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 12,
              padding: "12px 0",
              borderBottom: "1px solid rgba(0,112,192,0.1)"
            }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: "50%", 
                background: "rgba(0,112,192,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Cinzel', serif",
                fontSize: 18,
                color: T.blue
              }}>
                {helper.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontFamily: "'Crimson Pro', serif", 
                  fontSize: 14, 
                  color: T.text1
                }}>
                  {helper.name}
                </div>
                <div style={{ 
                  fontFamily: "'JetBrains Mono'", 
                  fontSize: 9, 
                  color: T.text3,
                  letterSpacing: 0.5
                }}>
                  {helper.role}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ fontFamily: "'JetBrains Mono'", fontSize: 9 }}>
                Связаться
              </button>
            </div>
          ))}        </div>
      </div>
    );
  };

  return (
    <div className="page">
      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button 
          className={`tab ${tab === "wheel" ? "on" : ""}`}
          onClick={() => setTab("wheel")}
          style={{ fontFamily: "'Cinzel', serif", fontSize: 12 }}
        >
          Колесо
        </button>
        <button 
          className={`tab ${tab === "goal" ? "on" : ""}`}
          onClick={() => setTab("goal")}
          style={{ fontFamily: "'Cinzel', serif", fontSize: 12 }}
        >
          Цели
        </button>
        <button 
          className={`tab ${tab === "helpers" ? "on" : ""}`}
          onClick={() => setTab("helpers")}
          style={{ fontFamily: "'Cinzel', serif", fontSize: 12 }}
        >
          Помощники
        </button>
      </div>

      {tab === "wheel" && renderWheel()}
      {tab === "goal" && renderGoalTab()}
      {tab === "helpers" && renderHelpersTab()}
    </div>
  );
}
