// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getMoonDay, getCurrentMeridian } from "../utils/knowledgeEngine";
// ─── ИМПОРТ ГРАФИЧЕСКИХ КОМПОНЕНТОВ ───
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";
import { WesternZodiacIcons, EasternZodiacIcons } from "../components/BlueprintAvatars";
import { MeridianClock, LifeCycleSpiral } from "../components/BlueprintIcons";

// ─── ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ───
function Accordion({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#fff", border: "1.5px solid rgba(0,112,192,0.2)", borderRadius: 8, marginBottom: 16, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "16px", background: "rgba(0,112,192,0.05)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0 }}>{title}</h3>
        </div>
        <div style={{ fontSize: 20, color: "var(--gold)", transition: "transform 0.3s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▼</div>
      </div>
      {open && <div style={{ padding: "16px", borderTop: "1px solid rgba(0,112,192,0.1)" }}>{children}</div>}
    </div>
  );
}

function InsightCard({ title, icon, meaning, impact, action }) {
  return (
    <div style={{ background: "rgba(200,164,90,0.05)", border: "1.5px solid rgba(200,164,90,0.2)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--gold-dark)", margin: 0 }}>{title}</h3>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{meaning}</div>
      <div style={{ padding: 12, background: "rgba(255,255,255,0.6)", borderRadius: 6, borderLeft: "3px solid var(--gold)", marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold-dark)", letterSpacing: 1, marginBottom: 4 }}>◈ ЧТО ЭТО ЗНАЧИТ ДЛЯ ТЕБЯ</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>{impact}</div>
      </div>
      {action && (
        <div style={{ padding: 10, background: "rgba(255,255,255,0.4)", borderRadius: 6, fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <div>
            <strong style={{ display: "block", marginBottom: 4, color: "var(--gold-dark)" }}>Как использовать:</strong>
            {action}
          </div>
        </div>
      )}
    </div>
  );
}
// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("about");
  const insights = getProfileInsights(profile);
  const meridian = getCurrentMeridian();
  const moonDay = getMoonDay();
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  if (!profile) return <div style={{ padding: 40, textAlign: "center" }}>Загрузка...</div>;

  // ✅ ИСПРАВЛЕНО: .trim() для совместимости с ключами из profileKnowledge.js
  const WesternIcon = WesternZodiacIcons[insights.zodiac?.trim()] || WesternZodiacIcons['Близнецы'];
  const EasternIcon = EasternZodiacIcons[insights.eastern?.trim()] || EasternZodiacIcons['Свинья'];

  return (
    <div className="page">
      {/* ШАПКА */}
      <div className="card" style={{ borderLeft: "4px solid var(--blue)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
          <div style={{ flexShrink: 0 }}>
            {/* ✅ ИСПРАВЛЕНО: проверка на "Мужской" вместо "male" */}
            {profile.gender === 'Мужской' ? <MaleAvatar size={80} /> : <FemaleAvatar size={80} />}
          </div>
          <div style={{ flexGrow: 1 }}>
            <h1 style={{ fontFamily: "var(--font-head)", fontSize: 24, color: "var(--blue)", margin: 0 }}>{profile.name}</h1>
            <div style={{ fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text3)", fontStyle: "italic", marginBottom: 12 }}>{profile.fullName}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge bgr">🎂 {age} лет</span>
              <span className="badge bt">{profile.chronotype}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "30px", marginTop: "16px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <WesternIcon />
            <div><div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>ЗАПАДНЫЙ</div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--blue)" }}>{insights.zodiac}</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <EasternIcon />
            <div><div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>ВОСТОЧНЫЙ</div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--gold)" }}>{insights.eastern}</div></div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "20px", padding: "16px", background: "rgba(200,164,90,0.05)", borderRadius: 8 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", letterSpacing: 1.5, marginBottom: 4 }}>ГРАДУС СУДЬБЫ</div>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 32, color: "var(--gold)", fontWeight: 600 }}>{insights.destiny?.degree || 241}°</div>
          <div style={{ fontFamily: "var(--font-italic)", fontSize: 12, color: "var(--text3)", marginTop: 8 }}>{insights.destiny?.interpretation}</div>
        </div>
      </div>
      {/* ТАБЫ */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${activeTab === "about" ? "on" : ""}`} onClick={() => setActiveTab("about")}>О тебе</button>
        <button className={`tab ${activeTab === "cycles" ? "on" : ""}`} onClick={() => setActiveTab("cycles")}>Циклы</button>
      </div>

      {/* ВКЛАДКА: О ТЕБЕ */}
      {activeTab === "about" && (
        <div>
          <InsightCard
            title="Градус Судьбы"
            icon="🧭"
            meaning={`Твой градус ${insights.destiny?.degree || 241}° находится в зоне "${insights.destiny?.interpretation || "Интеграция опыта"}".`}
            impact="Ты прошла большой путь накопления опыта. Сейчас твоя суперсила — видеть суть вещей, которую другие не замечают."
            action="Каждое утро спрашивай себя: 'Какой урок я могу извлечь из сегодняшнего дня?'"
          />
          <Accordion title="Астрологический портрет" icon="♈" defaultOpen={true}>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}><strong>{insights.zodiac}</strong> ({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.</div>
            <div style={{ padding: 12, background: "rgba(0,112,192,0.05)", borderRadius: 6, borderLeft: "3px solid var(--blue)", marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--blue)", marginBottom: 4 }}>◈ ЧТО ЭТО ЗНАЧИТ ДЛЯ ТЕБЯ</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>Твоя стихия наделяет тебя адаптивностью. Слабые зоны — {insights.zodiacWeaknesses || "лёгкие и нервная система"}.</div>
            </div>
            <div style={{ padding: 10, background: "rgba(255,255,255,0.4)", borderRadius: 6, fontSize: 12, color: "var(--text2)" }}>
              <strong style={{ color: "var(--blue)", display: "block", marginBottom: 4 }}>💡 Как использовать:</strong>
              Планируй важные дела на утро. Избегай многозадачности.
            </div>
          </Accordion>
          <Accordion title="Восточный знак" icon="🐗">
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}><strong>{insights.eastern}</strong> ({insights.easternElement || "Вода"}).</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>{insights.eastern} наделяет тебя {insights.easternTraits || "честностью и терпимостью"}. Задача — {insights.easternKarma || "научиться говорить 'нет'"}.</div>
          </Accordion>
          <Accordion title="Хроно-тип" icon="🦉">
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}><strong>{profile.chronotype || "🕊️ Голубь"}</strong></div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>
              {profile.chronotype?.includes("Сова") ? "Пик продуктивности вечером. Утро — для рутины." : "Пик активности в первой половине дня. Вечером энергия падает."}
            </div>
          </Accordion>
        </div>
      )}

      {/* ВКЛАДКА: ЦИКЛЫ */}
      {activeTab === "cycles" && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}><MeridianClock activeMeridian={meridian.name} /></div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontFamily: "var(--font-head)", color: "var(--gold-dark)", marginBottom: 16 }}>🌙 ЛУННЫЙ ЦИКЛ</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text2)" }}>
              <div style={{ marginBottom: 8 }}><strong>Сейчас:</strong> {moonDay > 25 ? "Завершение лунного месяца" : moonDay > 15 ? "Убывающая Луна" : "Растущая Луна"}</div>
              <div style={{ marginBottom: 8 }}><strong>Запрет сегодня:</strong> {insights.moonRestriction?.forbidden || "Нет строгих запретов"}</div>              <div><strong>Рекомендация:</strong> {moonDay > 25 ? "Завершай начатое." : moonDay > 15 ? "Время очищения." : "Время роста и новых начинаний."}</div>
            </div>
          </div>
          <div className="card"><LifeCycleSpiral age={age} /></div>
        </div>
      )}

      {/* КНОПКИ */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>✎ РЕДАКТИРОВАТЬ</button>
        <button className="btn btn-ghost" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>📊 АНАЛИЗ</button>
      </div>
    </div>
  );
}
