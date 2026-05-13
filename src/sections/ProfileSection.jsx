// src/sections/ProfileSection.jsx
import { useState, useEffect } from "react";
import { useApp } from "../store/AppContext";
// Импортируем движок знаний (предполагаем, что он есть)
import { getProfileInsights, getMoonDay, getCurrentMeridian } from "../utils/knowledgeEngine";

// ─── КОМПОНЕНТ: КАРТОЧКА ИНСАЙТА (Смысл + Действие) ───
function InsightCard({ title, icon, meaning, impact, action, color = "blue" }) {
  const styles = {
    blue: { bg: "rgba(0,112,192,0.05)", border: "rgba(0,112,192,0.2)", text: "var(--blue)" },
    gold: { bg: "rgba(200,164,90,0.05)", border: "rgba(200,164,90,0.2)", text: "var(--gold-dark)" },
    success: { bg: "rgba(45,106,79,0.05)", border: "rgba(45,106,79,0.2)", text: "var(--success)" }
  };
  const s = styles[color];

  return (
    <div style={{ 
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, 
      padding: 16, marginBottom: 16, position: "relative", overflow: "hidden" 
    }}>
      {/* Декоративный уголок Blueprint */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: `2px solid ${s.text}`, borderLeft: `2px solid ${s.text}` }} />
      
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: s.text, margin: 0 }}>{title}</h3>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--text1)", marginBottom: 8 }}>
        <strong>Суть:</strong> {meaning}
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.4, color: "var(--text2)", marginBottom: 12, fontStyle: "italic" }}>
        <strong>Влияние:</strong> {impact}
      </div>

      {action && (
        <div style={{ 
          padding: 8, background: "rgba(255,255,255,0.6)", borderRadius: 6, 
          fontSize: 12, color: s.text, display: "flex", alignItems: "center", gap: 6 
        }}>
          <span>💡</span> {action}
        </div>
      )}
    </div>
  );
}

// ─── ОСНОВНОЙ ЭКРАН ───
export function ProfileSection() {  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | details
  
  // Данные
  const insights = getProfileInsights(profile);
  const meridian = getCurrentMeridian();
  const moonDay = getMoonDay();

  if (!profile) return <div>Загрузка...</div>;

  return (
    <div className="page" style={{ position: "relative" }}>
      
      {/* --- ФОНОВЫЙ ВОДЯНОЙ ЗНАК (Image 5 из твоего архива) --- */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        backgroundImage: `url('/assets/tcm-geometry.png')`, // Замени на путь к твоей картинке
        backgroundSize: "contain", backgroundPosition: "center",
        opacity: 0.06, mixBlendMode: "multiply", pointerEvents: "none"
      }} />

      {/* --- ШАПКА ПРОФИЛЯ --- */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginBottom: 24 }}>
        <div style={{ 
          width: 80, height: 80, borderRadius: "50%", background: "var(--blue)", 
          color: "#fff", fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px", border: "3px solid var(--bg)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
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

      {/* --- ГЛАВНЫЙ ИНСАЙТ: ГРАДУС СУДЬБЫ --- */}
      <InsightCard 
        title={`Градус Судьбы: ${insights.destiny?.degree || 241}°`}
        icon="🧭"
        meaning={insights.destiny?.interpretation || "Интеграция опыта и мудрость."}
        impact="Ты находишься на этапе, когда накопленный опыт становится твоим главным капиталом. Интуиция работает на пике."
        action="Сегодня удели 10 минут анализу: какой урок ты вынесла из последней ситуации?"
        color="gold"
      />
      {/* --- ТЕКУЩИЙ КОНТЕКСТ (Динамика) --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, position: "relative", zIndex: 1 }}>
        <InsightCard 
          title="Меридиан"
          icon="⚡"
          meaning={`${meridian.name} (${meridian.time})`}
          impact="Энергия тела сейчас направлена на эту зону."
          action={meridian.advice}
          color="blue"
        />
        <InsightCard 
          title="Лунный день"
          icon="🌙"
          meaning={`${moonDay}-й день`}
          impact={moonDay > 25 ? "День духовной работы и интуиции." : "День активности."}
          action="Следи за словами — они материальны сегодня."
          color="success"
        />
      </div>

      {/* --- ПРАКТИКИ (С кнопками) --- */}
      <div style={{ position: "relative", zIndex: 1, marginTop: 24 }}>
        <div className="sec-lbl">◈ ПРАКТИКИ ДЛЯ ТЕБЯ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Пример карточки практики */}
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text1)" }}>Сам Чон До</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>Базовое дыхание (5 мин)</div>
            </div>
            <button className="btn btn-primary btn-sm">Старт</button>
          </div>
          
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text1)" }}>6 Звуков</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>Очищение органов (10 мин)</div>
            </div>
            <button className="btn btn-ghost btn-sm">Старт</button>
          </div>
        </div>
      </div>

    </div>
  );
                                 }
