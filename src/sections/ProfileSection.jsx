// src/sections/ProfileSection.jsx
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getMoonDay, getCurrentMeridian } from "../utils/knowledgeEngine";
import { InsightCard } from "../components/InsightCard";

export function ProfileSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const insights = getProfileInsights(profile);
  const meridian = getCurrentMeridian();
  const moonDay = getMoonDay();

  if (!profile) return <div style={{padding: 20}}>Загрузка...</div>;

  return (
    <div className="page" style={{ position: "relative" }}>
      
      {/* ФОН (Watermark) */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        backgroundImage: `url('/assets/tcm-geometry.png')`, // Убедись, что картинка есть в папке public/assets
        backgroundSize: "contain", backgroundPosition: "center",
        opacity: 0.06, mixBlendMode: "multiply", pointerEvents: "none"
      }} />

      {/* --- ШАПКА ПРОФИЛЯ --- */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginBottom: 24 }}>
        <div style={{ 
          width: 80, height: 80, borderRadius: "50%", background: "var(--blue)", 
          color: "#fff", fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", border: "3px solid var(--bg)" 
        }}>
          {profile.name?.charAt(0)}
        </div>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 24, color: "var(--blue)", margin: 0 }}>{profile.name}</h1>
        <div style={{ fontFamily: "var(--font-italic)", color: "var(--text3)", marginTop: 4 }}>{profile.fullName}</div>
        
        {/* Бейджи */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <span className="badge bg">♊ {insights.zodiac}</span>
          <span className="badge bm">🐗 {insights.eastern}</span>
          <span className="badge bgr">🎂 {insights.age} лет</span>
        </div>
      </div>

      {/* --- ТАБЫ --- */}
      <div className="tabs" style={{ marginBottom: 16, position: "relative", zIndex: 1 }}>
        {[          { id: "dashboard", label: "Инсайты" },
          { id: "health", label: "Здоровье" },
          { id: "cycles", label: "Циклы" }
        ].map(t => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "on" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* --- КОНТЕНТ --- */}
      <div style={{ position: "relative", zIndex: 1 }}>
        
        {/* ВКЛАДКА 1: ГЛАВНЫЕ ИНСАЙТЫ */}
        {activeTab === "dashboard" && (
          <>
            {/* Градус Судьбы - Главная Карточка */}
            <InsightCard 
              title={`Градус Судьбы: ${insights.destiny?.degree || 241}°`}
              icon="🧭"
              meaning={insights.destiny?.interpretation || "Интеграция опыта и мудрость."}
              impact="Ты находишься на этапе, когда накопленный опыт становится твоим главным капиталом. Интуиция работает на пике. Ты видишь то, что другие упускают."
              action="Сегодня удели 10 минут анализу: какой главный урок ты вынесла из последней ситуации?"
              color="gold"
            />

            {/* Меридиан */}
            <InsightCard 
              title="Активный меридиан"
              icon="⚡"
              meaning={`${meridian.name} (${meridian.time})`}
              impact="Энергия тела сейчас направлена на эту зону. Это лучшее время для работы с соответствующим органом или эмоцией."
              action={meridian.advice}
              color="blue"
            />

             {/* Луна */}
             <InsightCard 
              title="Лунный ритм"
              icon="🌙"
              meaning={`${moonDay}-й день. ${moonDay > 25 ? "День интуиции." : "День активности."}`}
              impact="Энергия Луны влияет на твою эмоциональную устойчивость и отношения с людьми."
              action="Следи за словами — они материальны сегодня."
              color="success"
            />
          </>
        )}

        {/* ВКЛАДКА 2: ЗДОРОВЬЕ */}
        {activeTab === "health" && (           <InsightCard 
           title="Твоё слабое место (Body Blueprint)"
           icon="🫁"
           meaning={`Зоны риска: ${insights.health?.area || "Легкие, бронхи"}`}
           impact="По знаку Зодиака эти органы первыми реагируют на стресс. Если есть усталость — причина может быть здесь."
           action={insights.health?.advice || "Дыши свежим воздухом, избегай сквозняков."}
           color="success"
         />
        )}
      </div>
    </div>
  );
}
