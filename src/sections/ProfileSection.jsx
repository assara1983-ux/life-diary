// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
// Импорт данных и движка
import { getProfileInsights, getMoonDay, getCurrentMeridian } from "../utils/knowledgeEngine";
// Импорт графики (убедись, что файл src/components/BlueprintIcons.jsx существует)
import { 
  MaleAvatar, FemaleAvatar, 
  WesternZodiac, EasternZodiac, 
  MeridianClock, LifeCycleSpiral 
} from "../components/BlueprintIcons";

// ─── КОМПОНЕНТ АККОРДЕОНА (Раскрывающийся блок) ───
function Accordion({ title, icon, children, defaultOpen = false, accent = "blue" }) {
  const [open, setOpen] = useState(defaultOpen);
  
  const styles = {
    blue: { bg: "rgba(0,112,192,0.05)", border: "rgba(0,112,192,0.2)", text: "var(--blue)" },
    gold: { bg: "rgba(200,164,90,0.05)", border: "rgba(200,164,90,0.2)", text: "var(--gold-dark)" },
    success: { bg: "rgba(45,106,79,0.05)", border: "rgba(45,106,79,0.2)", text: "var(--success)" }
  };
  const s = styles[accent] || styles.blue;

  return (
    <div style={{ 
      background: "#fff", border: `1.5px solid ${s.border}`, borderRadius: 8, 
      marginBottom: 12, overflow: "hidden" 
    }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          padding: "14px 16px", background: s.bg, cursor: "pointer", 
          display: "flex", justifyContent: "space-between", alignItems: "center", 
          fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: 1.5, 
          color: s.text, transition: "background 0.2s" 
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = accent === "gold" ? "rgba(200,164,90,0.1)" : "rgba(0,112,192,0.1)"}
        onMouseLeave={(e) => e.currentTarget.style.background = s.bg}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span>{title}</span>
        </div>
        <div style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0)", color: s.text }}>▼</div>
      </div>
      
      <div style={{ maxHeight: open ? "1000px" : "0", overflow: "hidden", transition: "max-height 0.4s ease" }}>
        <div style={{ padding: "16px", borderTop: `1px solid ${s.border}` }}>
          {children}
        </div>      </div>
    </div>
  );
}

// ─── КОМПОНЕНТ ИНСАЙТА (Карточка со смыслом) ───
function InsightCard({ title, icon, meaning, impact, action, color = "blue" }) {
  const styles = {
    blue: { bg: "rgba(0,112,192,0.05)", border: "rgba(0,112,192,0.2)", text: "var(--blue)", accent: "#0070c0" },
    gold: { bg: "rgba(200,164,90,0.05)", border: "rgba(200,164,90,0.2)", text: "var(--gold-dark)", accent: "#c8a45a" },
    success: { bg: "rgba(45,106,79,0.05)", border: "rgba(45,106,79,0.2)", text: "var(--success)", accent: "#2d6a4f" }
  };
  const s = styles[color];

  return (
    <div style={{ 
      background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 8, 
      padding: 16, marginBottom: 16, position: "relative" 
    }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: `2px solid ${s.text}`, borderLeft: `2px solid ${s.text}` }} />
      
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: s.text, margin: 0 }}>{title}</h3>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text1)", marginBottom: 12 }}>
        {meaning}
      </div>

      <div style={{ 
        padding: 12, background: "rgba(255,255,255,0.6)", borderRadius: 6, 
        borderLeft: `3px solid ${s.accent}`, marginBottom: 8 
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: s.text, letterSpacing: 1, marginBottom: 4 }}>
          ◈ ЧТО ЭТО ЗНАЧИТ ДЛЯ ТЕБЯ
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>
          {impact}
        </div>
      </div>

      {action && (
        <div style={{ 
          padding: 10, background: "rgba(255,255,255,0.4)", borderRadius: 6,
          fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "flex-start", gap: 8 
        }}>
          <span style={{ fontSize: 16 }}>💡</span> 
          <div>
            <strong style={{ display: "block", marginBottom: 4, color: s.text }}>Как использовать:</strong>            {action}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ОСНОВНОЙ ЭКРАН ───
export function ProfileSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | health | cycles
  
  // Данные из движка
  const insights = getProfileInsights(profile);
  const meridian = getCurrentMeridian();
  const moonDay = getMoonDay();
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const currentHour = new Date().getHours();

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>Загрузка профиля...</div>;

  return (
    <div className="page" style={{ position: "relative" }}>
      
      {/* ФОНОВЫЙ ВОДЯНОЙ ЗНАК */}
      <div style={{ 
        position: "fixed", top: 120, right: 40, width: 200, height: 200, zIndex: 0,
        backgroundImage: `url("image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='80' fill='none' stroke='%230070c0' stroke-width='1'/%3E%3Cpath d='M100 20 L100 180 M20 100 L180 100' stroke='%230070c0' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: "contain", backgroundRepeat: "no-repeat", opacity: 0.05, pointerEvents: "none"
      }} />

      {/* ─── 1. ШАПКА ПРОФИЛЯ (Аватар + Знаки) ─── */}
      <div className="card" style={{ borderLeft: "4px solid var(--blue)", marginBottom: 16, zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
          {/* Аватар */}
          <div style={{ flexShrink: 0 }}>
            {profile?.gender === 'male' ? <MaleAvatar size={80} /> : <FemaleAvatar size={80} />}
          </div>
          
          {/* Основная Инфо */}
          <div style={{ flexGrow: 1 }}>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", marginBottom: 4 }}>
              {profile.name || "Гость"}
            </div>
            <div style={{ fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
              {profile.fullName || "ФИО не указано"}
            </div>
            
            {/* Бейджи (Возраст, Хроно-тип) */}            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {age && <span className="badge bgr">🎂 {age} лет</span>}
              <span className="badge bt">{profile.chronotype || "🕊️ Голубь"}</span>
            </div>
          </div>
        </div>

        {/* Знаки Зодиака */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "30px", marginTop: "16px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <WesternZodiac sign={insights.zodiac} size={40} />
            <div>
              <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>ЗАПАДНЫЙ</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--blue)" }}>{insights.zodiac}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EasternZodiac sign={insights.eastern} size={40} />
            <div>
              <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>ВОСТОЧНЫЙ</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--gold)" }}>{insights.eastern}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. НАВИГАЦИЯ (Табы) ─── */}
      <div className="tabs" style={{ marginBottom: 16, zIndex: 1 }}>
        {[
          { id: "dashboard", label: "Инсайты" },
          { id: "health", label: "Здоровье" },
          { id: "cycles", label: "Циклы" }
        ].map(t => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "on" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 3. КОНТЕНТ ─── */}
      <div style={{ zIndex: 1 }}>
        
        {/* === ВКЛАДКА 1: ИНСАЙТЫ (Смыслы) === */}
        {activeTab === "dashboard" && (
          <>
            <InsightCard 
              title={`Градус Судьбы: ${insights.destiny?.degree || 241}°`}
              icon="🧭"
              meaning={insights.destiny?.interpretation || "Интеграция опыта и мудрость."}
              impact="Ты находишься на этапе, когда накопленный опыт становится твоим главным капиталом. Твоя интуиция сейчас работает на пике. Ты видишь то, что другие упускают."              action="Каждое утро спрашивай себя: 'Какой главный урок я вынесла из прошлого опыта?' Это усилит твою способность к синтезу."
              color="gold"
            />

            <InsightCard 
              title="Твоя стихия и характер"
              icon="♈"
              meaning={`${insights.zodiac} (${insights.zodiacElement || "Воздух"}). Планета: ${insights.rulingPlanet || "Меркурий"}.`}
              impact={`Как представитель стихии ${insights.zodiacElement || "Воздух"}, ты обладаешь быстрой адаптивностью. Твоя слабая зона — ${insights.zodiacWeaknesses || "нервная система"}. Стресс бьет именно туда.`}
              action="Планируй важные интеллектуальные дела на время активности своей стихии. Избегай многозадачности — фокусируйся на одной задаче."
              color="blue"
            />

            <InsightCard 
              title="Твой Хроно-тип"
              icon="🦉"
              meaning={`Ты: ${profile.chronotype || "Голубь"}.`}
              impact={profile.chronotype?.includes("Сова") 
                ? "Твой пик продуктивности наступает вечером. Утро — это время 'разгона', а не сложных решений."
                : "Твой мозг лучше всего работает в первой половине дня. Вечером энергия падает."
              }
              action={profile.chronotype?.includes("Сова")
                ? "Перенеси творческие и аналитические задачи на 16:00–20:00. Утром оставь только рутину."
                : "Сделай самые важные дела до 13:00. Вечером отдыхай."
              }
              color="success"
            />
          </>
        )}

        {/* === ВКЛАДКА 2: ЗДОРОВЬЕ === */}
        {activeTab === "health" && (
          <>
            <Accordion title="BODY BLUEPRINT (Твои уязвимые зоны)" icon="🫁" accent="success" defaultOpen>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text1)", marginBottom: 12 }}>
                <strong>Слабые органы:</strong> {insights.health?.area || "Плечи, ключицы, лёгкие"}.<br/>
                <strong>Органы под ударом:</strong> {insights.health?.organs || "Нервная система, руки"}.
              </div>
              <div style={{ 
                padding: 12, background: "rgba(45,106,79,0.06)", borderRadius: 6, 
                border: "1px solid rgba(45,106,79,0.15)" 
              }}>
                <div style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.5 }}>
                  💡 <strong>Рекомендация:</strong> {insights.health?.advice || "Дыши свежим воздухом, береги плечи и руки."}
                </div>
              </div>
            </Accordion>

            <Accordion title="Сезонный ритм" icon="🍂" accent="gold">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>                <strong>Сезон:</strong> {insights.season || "Весна (Дерево)"}<br/>
                <strong>Риск:</strong> {insights.seasonRisk || "Перепады настроения, спазмы"}<br/>
                <strong>Совет:</strong> {insights.seasonAdvice || "Растяжка, кислая пища умеренно, ранний подъём."}
              </div>
            </Accordion>

            <Accordion title="Лунный запрет" icon="🌙" accent="blue">
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
                Сегодня <strong>{moonDay}-й</strong> лунный день.<br/>
                ⛔ <strong>Не рекомендуется:</strong> {insights.moonRestriction?.forbidden || "Нет строгих запретов"}.<br/>
                <em style={{ fontSize: 12, color: "var(--text3)" }}>Если есть возможность, отложи процедуры на эти зоны.</em>
              </div>
            </Accordion>
          </>
        )}

        {/* === ВКЛАДКА 3: ЦИКЛЫ (Визуализация) === */}
        {activeTab === "cycles" && (
          <>
            {/* Меридианные Часы */}
            <div className="card" style={{ borderLeft: "3px solid var(--blue)" }}>
              <div className="card-hd">
                <div className="card-title">⏰ Меридианные часы</div>
                <div className="badge bg">{meridian.name}</div>
              </div>
              <MeridianClock activeMeridian={meridian.name} size={200} />
              <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--text2)", textAlign: "center" }}>
                <strong>Активен меридиан: {meridian.name} ({meridian.sign}).</strong><br/>
                {meridian.advice}<br/>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  Сейчас энергия тела сфокусирована здесь. Это лучшее время для работы с этим органом.
                </span>
              </div>
            </div>

            {/* Спираль Жизни */}
            <div className="card" style={{ borderLeft: "3px solid var(--gold)" }}>
              <div className="card-hd">
                <div className="card-title">🔄 Спираль Жизненных Циклов</div>
                <div className="badge bm">{age} лет</div>
              </div>
              <LifeCycleSpiral age={age} size={220} />
              <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Твой этап:</strong> {age >= 36 && age < 48 ? "Зрелость" : age >= 24 && age < 36 ? "Молодость" : "Другой этап"}.<br/>
                {age >= 36 && age < 48 
                  ? "Пик продуктивности и передачи опыта. Время закрепления достижений." 
                  : "Время накопления ресурсов и поиска своего пути."}
                <br/><br/>
                <strong>Кармическая задача:</strong> {profile.goalAreas ? `Развитие сфер: ${profile.goalAreas.join(", ")}` : "Определи свои цели в настройках."}
              </div>            </div>
          </>
        )}
      </div>

      {/* ─── 4. КНОПКИ ДЕЙСТВИЙ ─── */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, zIndex: 1 }}>
        <button className="btn btn-primary" style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>
          ✎ РЕДАКТИРОВАТЬ
        </button>
        <button className="btn btn-ghost" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>
          📊 АНАЛИЗ
        </button>
      </div>
    </div>
  );
}
