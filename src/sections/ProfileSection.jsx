import { useState, useEffect } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getMoonDay } from "../utils/knowledgeEngine";
import { Icon } from "../components/Icon";
import { T } from "../utils/theme";

// ─── ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ───

function BlueprintCard({ children, className = "", accent = "blue" }) {
  const colors = {
    blue: { border: "rgba(0,112,192,0.3)", bg: "rgba(0,112,192,0.03)" },
    gold: { border: "rgba(200,164,90,0.3)", bg: "rgba(200,164,90,0.03)" },
    success: { border: "rgba(45,106,79,0.3)", bg: "rgba(45,106,79,0.03)" }
  };
  
  const c = colors[accent];
  
  return (
    <div 
      className={`card ${className}`}
      style={{
        background: `linear-gradient(135deg, #fff 0%, ${c.bg} 100%)`,
        border: `1.5px solid ${c.border}`,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Угловые маркеры Blueprint */}
      <div style={{
        position: "absolute", top: 6, left: 6, width: 12, height: 12,
        borderTop: `2px solid ${c.border}`, borderLeft: `2px solid ${c.border}`
      }} />
      <div style={{
        position: "absolute", top: 6, right: 6, width: 12, height: 12,
        borderTop: `2px solid ${c.border}`, borderRight: `2px solid ${c.border}`
      }} />
      <div style={{
        position: "absolute", bottom: 6, left: 6, width: 12, height: 12,
        borderBottom: `2px solid ${c.border}`, borderLeft: `2px solid ${c.border}`
      }} />
      <div style={{
        position: "absolute", bottom: 6, right: 6, width: 12, height: 12,
        borderBottom: `2px solid ${c.border}`, borderRight: `2px solid ${c.border}`
      }} />
      
      {children}
      
      {/* Масштаб */}
      <div style={{
        position: "absolute", bottom: 8, right: 12,        fontFamily: "var(--font-mono)", fontSize: 7,
        color: "rgba(0,112,192,0.3)", letterSpacing: 1
      }}>
        1:1
      </div>
    </div>
  );
}

function Accordion({ title, icon, children, defaultOpen = false, accent = "blue" }) {
  const [open, setOpen] = useState(defaultOpen);
  
  const icons = {
    lungs: "🫁", sparkles: "✨", bolt: "⚡", crystal: "🔮", 
    moon: "🌙", clock: "🕐", wheel: "🎡", karma: "🌀"
  };
  
  const colors = {
    blue: { bg: "rgba(0,112,192,0.05)", border: "rgba(0,112,192,0.2)" },
    gold: { bg: "rgba(200,164,90,0.05)", border: "rgba(200,164,90,0.2)" },
    success: { bg: "rgba(45,106,79,0.05)", border: "rgba(45,106,79,0.2)" }
  };
  
  const c = colors[accent];
  
  return (
    <div style={{
      border: `1.5px solid ${c.border}`,
      borderRadius: 6,
      marginBottom: 12,
      overflow: "hidden",
      background: "#fff"
    }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{
          padding: "14px 16px",
          background: c.bg,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-head)",
          fontSize: 12,
          letterSpacing: 1.5,
          color: accent === "gold" ? "var(--gold-dark)" : 
                   accent === "success" ? "var(--success)" : "var(--blue)",
          transition: "background 0.2s"
        }}
        onMouseEnter={(e) => e.target.style.background =           accent === "gold" ? "rgba(200,164,90,0.08)" : 
          accent === "success" ? "rgba(45,106,79,0.08)" : "rgba(0,112,192,0.08)"
        }
        onMouseLeave={(e) => e.target.style.background = c.bg}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{icons[icon] || icon}</span>
          <span>{title}</span>
        </div>
        <div style={{
          transition: "transform 0.3s ease",
          transform: open ? "rotate(180deg)" : "rotate(0)",
          color: "var(--gold)"
        }}>
          ▼
        </div>
      </div>
      
      <div style={{
        maxHeight: open ? "1000px" : "0",
        overflow: "hidden",
        transition: "max-height 0.4s ease"
      }}>
        <div style={{ padding: "16px", borderTop: `1px solid ${c.border}` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───

export function ProfileSection() {
  const { profile } = useApp();
  const insights = getProfileInsights(profile);
  const [now, setNow] = useState(new Date());
  
  // Расчёт возраста
  const age = profile?.dob ? 
    Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) 
    : null;
  
  // Текущий меридиан (ТКМ часы)
  const hour = now.getHours();
  const meridians = [
    { time: "23-01", name: "3 обогревателя", sign: "Кабан" },
    { time: "01-03", name: "Печени", sign: "Вол" },
    { time: "03-05", name: "Лёгких", sign: "Тигр" },
    { time: "05-07", name: "Толстого кишечника", sign: "Заяц" },    { time: "07-09", name: "Желудка", sign: "Дракон" },
    { time: "09-11", name: "Селезёнки", sign: "Змея" },
    { time: "11-13", name: "Сердца", sign: "Лошадь" },
    { time: "13-15", name: "Тонкого кишечника", sign: "Овца" },
    { time: "15-17", name: "Мочевого пузыря", sign: "Обезьяна" },
    { time: "17-19", name: "Почек", sign: "Петух" },
    { time: "19-21", name: "Перикарда", sign: "Собака" },
    { time: "21-23", name: "3 обогревателя", sign: "Кабан" }
  ];
  
  const currentMeridian = meridians.find(m => {
    const [start] = m.time.split("-").map(Number);
    return hour >= start && hour < start + 2;
  }) || meridians[0];
  
  const moonDay = getMoonDay(now);
  
  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: T.text3 }}>Загрузка...</div>;
  
  return (
    <div className="page" style={{ 
      position: "relative",
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='200' cy='200' r='150' fill='none' stroke='rgba(0,112,192,0.03)' stroke-width='1'/%3E%3C/svg%3E")`,
      backgroundSize: "400px 400px",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }}>
      
      {/* ─── ЗАГОЛОВОК ─── */}
      <div style={{
        fontFamily: "var(--font-head)",
        fontSize: 20,
        letterSpacing: 3,
        color: T.blue,
        marginBottom: 4,
        textTransform: "uppercase"
      }}>
        Профиль
      </div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        color: T.text3,
        letterSpacing: 1.5,
        marginBottom: 20
      }}>
        {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
      </div>
      
      {/* ─── БАЗОВАЯ ИНФОРМАЦИЯ ─── */}      <BlueprintCard accent="blue" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{
              fontFamily: "var(--font-head)",
              fontSize: 24,
              color: T.blue,
              marginBottom: 6,
              letterSpacing: 1
            }}>
              {profile.name}
            </div>
            <div style={{
              fontFamily: "var(--font-italic)",
              fontSize: 13,
              color: T.text3,
              fontStyle: "italic"
            }}>
              {profile.fullName || "Полное имя не указано"}
            </div>
          </div>
          
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: T.text3,
              letterSpacing: 1.5,
              marginBottom: 4
            }}>
              ГРАДУС СУДЬБЫ
            </div>
            <div style={{
              fontFamily: "var(--font-head)",
              fontSize: 28,
              color: T.gold,
              fontWeight: 600
            }}>
              {insights.destiny.degree}°
            </div>
            <div style={{
              fontFamily: "var(--font-italic)",
              fontSize: 11,
              color: T.text3,
              marginTop: 4,
              maxWidth: 180
            }}>
              {insights.destiny.interpretation}
            </div>
          </div>        </div>
        
        {/* Метки */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{
            padding: "6px 12px",
            background: "rgba(232,85,109,0.08)",
            border: `1px solid rgba(232,85,109,0.2)`,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            <span style={{ fontSize: 14 }}>♊</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.text2 }}>
              {insights.zodiac}
            </span>
          </div>
          
          <div style={{
            padding: "6px 12px",
            background: "rgba(200,164,90,0.08)",
            border: `1px solid rgba(200,164,90,0.2)`,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            <span style={{ fontSize: 14 }}>🐗</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.text2 }}>
              Свинья
            </span>
          </div>
          
          <div style={{
            padding: "6px 12px",
            background: "rgba(29,78,107,0.08)",
            border: `1px solid rgba(29,78,107,0.2)`,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            <span style={{ fontSize: 14 }}>💧</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.text2 }}>
              {insights.chronotype}
            </span>
          </div>
          
          {age && (            <div style={{
              padding: "6px 12px",
              background: "rgba(45,106,79,0.08)",
              border: `1px solid rgba(45,106,79,0.2)`,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              <span style={{ fontSize: 14 }}>🎂</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.text2 }}>
                {age} лет
              </span>
            </div>
          )}
        </div>
        
        {/* Текущий меридиан */}
        <div style={{
          padding: 10,
          background: "rgba(0,112,192,0.04)",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--blue)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-head)",
            fontSize: 16
          }}>
            ⚡
          </div>
          <div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: T.text3,
              letterSpacing: 1
            }}>
              СЕЙЧАС АКТИВЕН ({currentMeridian.time})
            </div>
            <div style={{              fontFamily: "var(--font-serif)",
              fontSize: 13,
              color: T.text1
            }}>
              Меридиан {currentMeridian.name} ({currentMeridian.sign})
            </div>
          </div>
        </div>
      </BlueprintCard>
      
      {/* ─── АККОРДЕОНЫ ─── */}
      
      {/* BODY BLUEPRINT */}
      <Accordion title="BODY BLUEPRINT" icon="lungs" accent="success" defaultOpen={true}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{
            padding: 12,
            background: "rgba(232,85,109,0.06)",
            borderRadius: 6,
            border: `1px solid rgba(232,85,109,0.15)`
          }}>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: "rgba(232,85,109,0.8)",
              letterSpacing: 1.5,
              marginBottom: 6
            }}>
              ⚠️ СЛАБЫЕ ЗОНЫ
            </div>
            <div style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13,
              color: T.text1,
              lineHeight: 1.6
            }}>
              {insights.health.area}
            </div>
            <div style={{
              fontFamily: "var(--font-italic)",
              fontSize: 12,
              color: T.text3,
              marginTop: 4
            }}>
              {insights.health.organs}
            </div>
          </div>
          
          <div style={{
            padding: 12,            background: "rgba(45,106,79,0.06)",
            borderRadius: 6,
            border: `1px solid rgba(45,106,79,0.15)`
          }}>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: "rgba(45,106,79,0.8)",
              letterSpacing: 1.5,
              marginBottom: 6
            }}>
              💡 РЕКОМЕНДАЦИЯ
            </div>
            <div style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13,
              color: T.text1,
              lineHeight: 1.6
            }}>
              {insights.health.advice}
            </div>
          </div>
        </div>
      </Accordion>
      
      {/* BEAUTY & CYCLES */}
      <Accordion title="BEAUTY & CYCLES" icon="moon" accent="gold">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            padding: 12,
            background: "rgba(200,164,90,0.06)",
            borderRadius: 6,
            border: `1px solid rgba(200,164,90,0.15)`
          }}>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: "var(--gold-dark)",
              letterSpacing: 1.5,
              marginBottom: 6
            }}>
              🌙 ЛУННЫЙ ДЕНЬ {moonDay}
            </div>
            <div style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13,
              color: T.text1,
              marginBottom: 6
            }}>
              Сегодня не рекомендуется локально воздействовать на:            </div>
            <div style={{
              fontFamily: "var(--font-head)",
              fontSize: 14,
              color: T.error,
              letterSpacing: 0.5
            }}>
              {insights.moonRestriction.forbidden}
            </div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: T.text3,
              marginTop: 8,
              fontStyle: "italic"
            }}>
              Источник: Давыдов М.А. «Восточный Зодиак»
            </div>
          </div>
        </div>
      </Accordion>
      
      {/* TCM & ENERGY */}
      <Accordion title="TCM & ENERGY" icon="bolt" accent="blue">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: T.text3,
              letterSpacing: 1.5,
              marginBottom: 6
            }}>
              ХРОНОТИП
            </div>
            <div style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: T.text1
            }}>
              {insights.chronotype}
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: T.text3,
              letterSpacing: 1.5,
              marginBottom: 6            }}>
              КОНСТИТУЦИЯ
            </div>
            <div style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: T.text1
            }}>
              {insights.tcmType}
            </div>
          </div>
        </div>
      </Accordion>
      
      {/* KARMIC TASKS */}
      <Accordion title="KARMIC TASKS" icon="karma" accent="gold">
        <div style={{ 
          padding: 12, 
          background: "rgba(200,164,90,0.04)",
          borderRadius: 6,
          fontFamily: "var(--font-italic)",
          fontSize: 13,
          color: T.text2,
          lineHeight: 1.8
        }}>
          <p style={{ marginBottom: 8 }}>
            <strong style={{ color: T.gold }}>🌱 Задача жизни:</strong>
            {" "}{profile.goalAreas ? `Развитие в сферах: ${profile.goalAreas.join(", ")}` : "Определите свои цели в настройках."}
          </p>
          <p>
            <strong style={{ color: T.gold }}>🚧 Блок:</strong>
            {" "}{profile.goalBlocks ? profile.goalBlocks.join(", ") : "Нет данных."}
          </p>
        </div>
      </Accordion>
      
      {/* КНОПКИ */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button 
          className="btn btn-primary" 
          style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}
        >
          ✎ РЕДАКТИРОВАТЬ
        </button>
        <button 
          className="btn btn-ghost"
          style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}
        >
          📊 АНАЛИЗ
        </button>      </div>
    </div>
  );
}
