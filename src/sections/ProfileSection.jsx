// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getMoonDay, getCurrentMeridian } from "../utils/knowledgeEngine";

// ─── КОМПОНЕНТ АККОРДЕОНА ───
function Accordion({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ 
      background: "#fff", 
      border: "1.5px solid rgba(0,112,192,0.2)", 
      borderRadius: 8, 
      marginBottom: 16, 
      overflow: "hidden" 
    }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          padding: "16px", 
          background: "rgba(0,112,192,0.05)", 
          cursor: "pointer", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <h3 style={{ 
            fontFamily: "var(--font-head)", 
            fontSize: 16, 
            color: "var(--blue)", 
            margin: 0 
          }}>
            {title}
          </h3>
        </div>
        <div style={{ 
          fontSize: 20, 
          color: "var(--gold)", 
          transition: "transform 0.3s",
          transform: open ? "rotate(180deg)" : "rotate(0)"
        }}>
          ▼
        </div>
      </div>
      
      {open && (        <div style={{ padding: "16px", borderTop: "1px solid rgba(0,112,192,0.1)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── КАРТОЧКА С ПОЯСНЕНИЕМ ───
function InsightCard({ title, icon, meaning, impact, action }) {
  return (
    <div style={{ 
      background: "rgba(200,164,90,0.05)", 
      border: "1.5px solid rgba(200,164,90,0.2)", 
      borderRadius: 8, 
      padding: 16, 
      marginBottom: 16 
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h3 style={{ 
          fontFamily: "var(--font-head)", 
          fontSize: 16, 
          color: "var(--gold-dark)", 
          margin: 0 
        }}>
          {title}
        </h3>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
        {meaning}
      </div>

      <div style={{ 
        padding: 12, 
        background: "rgba(255,255,255,0.6)", 
        borderRadius: 6, 
        borderLeft: "3px solid var(--gold)", 
        marginBottom: 12 
      }}>
        <div style={{ 
          fontFamily: "var(--font-mono)", 
          fontSize: 9, 
          color: "var(--gold-dark)", 
          letterSpacing: 1, 
          marginBottom: 4 
        }}>
          ◈ ЧТО ЭТО ЗНАЧИТ ДЛЯ ТЕБЯ
        </div>        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>
          {impact}
        </div>
      </div>

      {action && (
        <div style={{ 
          padding: 10, 
          background: "rgba(255,255,255,0.4)", 
          borderRadius: 6,
          fontSize: 12, 
          color: "var(--text2)", 
          display: "flex", 
          alignItems: "flex-start", 
          gap: 8 
        }}>
          <span style={{ fontSize: 16 }}>💡</span> 
          <div>
            <strong style={{ display: "block", marginBottom: 4, color: "var(--gold-dark)" }}>
              Как использовать:
            </strong>
            {action}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── МЕРИДИАННЫЕ ЧАСЫ (SVG) ───
function MeridianClock({ activeMeridian }) {
  const meridians = [
    { name: "Лёгкие", time: "03-05", angle: 30 },
    { name: "Т. кишечник", time: "05-07", angle: 60 },
    { name: "Желудок", time: "07-09", angle: 90 },
    { name: "Селезёнка", time: "09-11", angle: 120 },
    { name: "Сердце", time: "11-13", angle: 150 },
    { name: "Т. кишечник", time: "13-15", angle: 180 },
    { name: "М. пузырь", time: "15-17", angle: 210 },
    { name: "Почки", time: "17-19", angle: 240 },
    { name: "Перикард", time: "19-21", angle: 270 },
    { name: "3 обогревателя", time: "21-23", angle: 300 },
    { name: "Желчный", time: "23-01", angle: 330 },
    { name: "Печень", time: "01-03", angle: 0 }
  ];

  const advice = {
    "М. пузырь": "Активность, спорт, творчество. В это время энергия Ци концентрируется в этом органе.",
    "Сердце": "Социальные контакты, важные решения, обед.",
    "Почки": "Восстановление, тёплый чай, рефлексия.",    "Лёгкие": "Пробуждение, свежий воздух, дыхательная практика."
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ 
        fontSize: 18, 
        fontFamily: "var(--font-head)", 
        color: "var(--blue)", 
        marginBottom: 16 
      }}>
        ⏰ МЕРИДИАННЫЕ ЧАСЫ
      </div>
      
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        marginBottom: 20 
      }}>
        <svg width="280" height="280" viewBox="0 0 300 300">
          {/* Круги */}
          <circle cx="150" cy="150" r="130" fill="none" stroke="rgba(0,112,192,0.2)" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="100" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="1" strokeDasharray="4 2" />
          <circle cx="150" cy="150" r="70" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="1" strokeDasharray="4 2" />
          
          {/* Линии секторов */}
          {meridians.map((m, i) => {
            const rad = (m.angle - 90) * (Math.PI / 180);
            const x = 150 + 125 * Math.cos(rad);
            const y = 150 + 125 * Math.sin(rad);
            return (
              <line 
                key={i} 
                x1="150" y1="150" x2={x} y2={y} 
                stroke="rgba(0,112,192,0.15)" 
                strokeWidth="1" 
              />
            );
          })}

          {/* Подписи */}
          {meridians.map((m, i) => {
            const rad = (m.angle - 90) * (Math.PI / 180);
            const x = 150 + 110 * Math.cos(rad);
            const y = 150 + 110 * Math.sin(rad);
            const isActive = m.name === activeMeridian;
            return (
              <g key={i}>
                <text 
                  x={x} y={y}                   textAnchor="middle" 
                  dominantBaseline="middle" 
                  fontSize={isActive ? "11" : "8"} 
                  fill={isActive ? "var(--blue)" : "var(--text3)"} 
                  fontFamily="var(--font-mono)"
                  fontWeight={isActive ? "bold" : "normal"}
                >
                  {m.name}
                </text>
                <text 
                  x={x} y={y + 12} 
                  textAnchor="middle" 
                  fontSize="7" 
                  fill={isActive ? "var(--blue)" : "var(--text3)"} 
                  fontFamily="var(--font-mono)"
                >
                  {m.time}
                </text>
              </g>
            );
          })}

          {/* Указатель */}
          <line 
            x1="150" y1="150" x2="150" y2="40" 
            stroke="var(--blue)" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
          <circle cx="150" cy="40" r="6" fill="var(--gold)" stroke="#fff" strokeWidth="2" />
          <circle cx="150" cy="150" r="8" fill="var(--blue)" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>

      <div style={{ 
        fontSize: 14, 
        color: "var(--text2)", 
        lineHeight: 1.6 
      }}>
        <strong style={{ color: "var(--blue)" }}>
          Активен меридиан {activeMeridian}
        </strong>
        <div style={{ marginTop: 8 }}>
          {advice[activeMeridian] || "Время для работы с этим органом."}
        </div>
      </div>
    </div>
  );
}
// ─── ЖИЗНЕННЫЕ ЦИКЛЫ (SVG) ───
function LifeCycleChart({ age }) {
  const cycles = [
    { label: "Детство", start: 0, end: 12, color: "rgba(0,112,192,0.2)" },
    { label: "Юность", start: 12, end: 24, color: "rgba(200,164,90,0.2)" },
    { label: "Молодость", start: 24, end: 36, color: "rgba(45,106,79,0.2)" },
    { label: "Зрелость", start: 36, end: 48, color: "rgba(139,32,32,0.2)" },
    { label: "Мудрость", start: 48, end: 60, color: "rgba(29,78,107,0.2)" },
    { label: "Долголетие", start: 60, end: 72, color: "rgba(139,32,32,0.15)" }
  ];

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ 
        fontSize: 18, 
        fontFamily: "var(--font-head)", 
        color: "var(--blue)", 
        marginBottom: 20 
      }}>
        🔄 ЖИЗНЕННЫЕ ЦИКЛЫ
      </div>

      <svg width="320" height="120" viewBox="0 0 320 120" style={{ marginBottom: 16 }}>
        {/* Полосы циклов */}
        {cycles.map((c, i) => {
          const width = ((c.end - c.start) / 72) * 300;
          const x = (c.start / 72) * 300 + 10;
          return (
            <rect 
              key={i} 
              x={x} y="40" 
              width={width} height="40" 
              fill={c.color} 
              stroke="rgba(0,112,192,0.3)" 
              strokeWidth="1"
            />
          );
        })}
        
        {/* Подписи */}
        {cycles.map((c, i) => {
          const x = (c.start / 72) * 300 + ((c.end - c.start) / 72) * 150 + 10;
          return (
            <text 
              key={i} 
              x={x} y="65" 
              textAnchor="middle" 
              fontSize="9" 
              fill="var(--text2)" 
              fontFamily="var(--font-mono)"            >
              {c.label}
            </text>
          );
        })}

        {/* Указатель возраста */}
        <line 
          x1={(age / 72) * 300 + 10} y1="30" 
          x2={(age / 72) * 300 + 10} y2="90" 
          stroke="var(--blue)" 
          strokeWidth="2" 
          strokeDasharray="4 2" 
        />
        <circle 
          cx={(age / 72) * 300 + 10} cy="30" r="5" 
          fill="var(--gold)" stroke="#fff" strokeWidth="2" 
        />
        <text 
          x={(age / 72) * 300 + 10} y="22" 
          textAnchor="middle" 
          fontSize="11" 
          fill="var(--blue)" 
          fontFamily="var(--font-mono)" 
          fontWeight="bold"
        >
          {age} лет
        </text>
      </svg>

      <div style={{ 
        fontSize: 13, 
        color: "var(--text2)", 
        lineHeight: 1.6,
        padding: "12px",
        background: "rgba(0,112,192,0.05)",
        borderRadius: 6
      }}>
        <strong>Текущий этап:</strong> {age >= 36 && age < 48 ? "Зрелость" : age >= 24 && age < 36 ? "Молодость" : "Другой этап"}<br/>
        <strong>Характеристика:</strong> {age >= 36 && age < 48 ? "Пик продуктивности и передачи опыта. Время закрепления достижений." : "Время накопления ресурсов и поиска своего пути."}
      </div>
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("insights");
    const insights = getProfileInsights(profile);
  const meridian = getCurrentMeridian();
  const moonDay = getMoonDay();
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 42;

  if (!profile) return <div style={{ padding: 40, textAlign: "center" }}>Загрузка...</div>;

  return (
    <div className="page">
      {/* ШАПКА */}
      <div className="card" style={{ borderLeft: "4px solid var(--blue)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ 
              fontFamily: "var(--font-head)", 
              fontSize: 24, 
              color: "var(--blue)", 
              marginBottom: 8,
              margin: 0
            }}>
              {profile.name}
            </h1>
            <div style={{ 
              fontFamily: "var(--font-italic)", 
              fontSize: 13, 
              color: "var(--text3)", 
              fontStyle: "italic",
              marginBottom: 12
            }}>
              {profile.fullName}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge bg">♊ {insights.zodiac}</span>
              <span className="badge bm">🐗 {insights.eastern}</span>
              <span className="badge bgr">🎂 {age} лет</span>
              <span className="badge bt">{profile.chronotype}</span>
            </div>
          </div>
          
          <div style={{ textAlign: "right", minWidth: 140 }}>
            <div style={{ 
              fontFamily: "var(--font-mono)", 
              fontSize: 9, 
              color: "var(--text3)", 
              letterSpacing: 1.5, 
              marginBottom: 4 
            }}>
              ГРАДУС СУДЬБЫ
            </div>
            <div style={{               fontFamily: "var(--font-head)", 
              fontSize: 28, 
              color: "var(--gold)", 
              fontWeight: 600 
            }}>
              {insights.destiny?.degree || 241}°
            </div>
            <div style={{ 
              fontFamily: "var(--font-italic)", 
              fontSize: 11, 
              color: "var(--text3)", 
              maxWidth: 180, 
              marginTop: 4, 
              lineHeight: 1.4 
            }}>
              {insights.destiny?.interpretation}
            </div>
          </div>
        </div>
      </div>

      {/* ТАБЫ */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button 
          className={`tab ${activeTab === "insights" ? "on" : ""}`} 
          onClick={() => setActiveTab("insights")}
        >
          Инсайты
        </button>
        <button 
          className={`tab ${activeTab === "cycles" ? "on" : ""}`} 
          onClick={() => setActiveTab("cycles")}
        >
          Циклы
        </button>
        <button 
          className={`tab ${activeTab === "practices" ? "on" : ""}`} 
          onClick={() => setActiveTab("practices")}
        >
          Практики
        </button>
      </div>

      {/* ВКЛАДКА 1: ИНСАЙТЫ */}
      {activeTab === "insights" && (
        <div>
          <InsightCard 
            title="Градус Судьбы"
            icon="🧭"
            meaning={`Твой градус ${insights.destiny?.degree || 241}° находится в зоне "${insights.destiny?.interpretation || "Интеграция опыта"}".`}            impact="Ты прошла большой путь накопления опыта. Сейчас твоя суперсила — видеть суть вещей, которую другие не замечают. Твоя задача в этом цикле — не создавать новое с нуля, а систематизировать то, что уже есть, и передавать мудрость другим."
            action="Каждое утро спрашивай себя: 'Какой урок я могу извлечь из сегодняшнего дня?' Веди дневник наблюдений — это усилит твою природную способность к анализу."
          />

          <Accordion title="Астрологический портрет" icon="♈" defaultOpen={true}>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
              <strong>{insights.zodiac}</strong> ({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.
            </div>
            <div style={{ 
              padding: 12, 
              background: "rgba(0,112,192,0.05)", 
              borderRadius: 6, 
              borderLeft: "3px solid var(--blue)",
              marginBottom: 12
            }}>
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--blue)", marginBottom: 4 }}>
                ◈ ЧТО ЭТО ЗНАЧИТ ДЛЯ ТЕБЯ
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>
                Твоя стихия {insights.zodiacElement || "Воздух"} наделяет тебя быстрой адаптивностью и интеллектом. Ты легко схватываешь информацию, но можешь распыляться. Твои слабые зоны — {insights.zodiacWeaknesses || "лёгкие и нервная система"} — первыми реагируют на стресс.
              </div>
            </div>
            <div style={{ 
              padding: 10, 
              background: "rgba(255,255,255,0.4)", 
              borderRadius: 6,
              fontSize: 12, 
              color: "var(--text2)"
            }}>
              <strong style={{ color: "var(--blue)", display: "block", marginBottom: 4 }}>💡 Как использовать:</strong>
              Планируй важные дела на утро (пик активности Воздуха). Избегай многозадачности — фокусируйся на одном проекте. Ежедневная дыхательная практика (5 мин) укрепит твои слабые зоны.
            </div>
          </Accordion>

          <Accordion title="Восточный знак" icon="🐗">
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
              <strong>{insights.eastern}</strong> ({insights.easternElement || "Вода"}).
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>
              {insights.eastern} наделяет тебя {insights.easternTraits || "честностью, щедростью и терпимостью"}. Твоя кармическая задача — {insights.easternKarma || "научиться говорить 'нет' без чувства вины"}.
            </div>
          </Accordion>

          <Accordion title="Хроно-тип" icon="🦉">
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
              <strong>{profile.chronotype || "🕊️ Голубь"}</strong>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>
              {profile.chronotype?.includes("Сова") 
                ? "Твой пик продуктивности наступает вечером. Утро — это время 'разгона', а не сложных решений."                : "Твой мозг лучше всего работает в первой половине дня. Вечером энергия падает."
              }
            </div>
          </Accordion>
        </div>
      )}

      {/* ВКЛАДКА 2: ЦИКЛЫ */}
      {activeTab === "cycles" && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <MeridianClock activeMeridian={meridian.name} />
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontFamily: "var(--font-head)", color: "var(--gold-dark)", marginBottom: 16 }}>
              🌙 ЛУННЫЙ ЦИКЛ
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text2)" }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Сейчас:</strong> {moonDay > 25 ? "Завершение лунного месяца" : moonDay > 15 ? "Убывающая Луна" : "Растущая Луна"}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Запрет сегодня:</strong> {insights.moonRestriction?.forbidden || "Нет строгих запретов"}
              </div>
              <div>
                <strong>Рекомендация:</strong> {moonDay > 25 ? "Завершай начатое, не начинай нового. Идеально для подведения итогов." : moonDay > 15 ? "Время очищения — физического и ментального. Избавляйся от лишнего." : "Время роста и новых начинаний. Планируй и действуй."}
              </div>
            </div>
          </div>

          <div className="card">
            <LifeCycleChart age={age} />
          </div>
        </div>
      )}

      {/* ВКЛАДКА 3: ПРАКТИКИ */}
      {activeTab === "practices" && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontFamily: "var(--font-head)", color: "var(--blue)", marginBottom: 16 }}>
              🧘 Персональные практики
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { title: "Сам Чон До", time: "5 мин", desc: "Настроечное дыхание: вдох 3с → выдох 6с", color: "#0070c0" },
                { title: "6 целительных звуков", time: "10 мин", desc: "С-С-С, Ч-У-Э-Й, Ш-Ш-Ш...", color: "#2d6a4f" },
                { title: "Настрой Норбекова", time: "7 мин", desc: "Визуализация ОМЗ", color: "#c8a45a" }
              ].map((p, i) => (                <div key={i} className="card" style={{ 
                  cursor: "pointer", 
                  borderLeft: `3px solid ${p.color}`, 
                  padding: "12px 16px" 
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ 
                        fontFamily: "var(--font-serif)", 
                        fontSize: 14, 
                        fontWeight: 500 
                      }}>
                        {p.title}
                      </div>
                      <div style={{ 
                        fontSize: 12, 
                        color: "var(--text3)", 
                        marginTop: 2, 
                        fontStyle: "italic" 
                      }}>
                        {p.desc}
                      </div>
                    </div>
                    <span className="badge bg">{p.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
      }
