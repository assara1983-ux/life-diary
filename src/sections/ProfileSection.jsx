// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { MaleAvatar, FemaleAvatar, WesternZodiacIcons, EasternZodiacIcons } from "../components/BlueprintAvatars";

// ─── КОМПОНЕНТ АККОРДЕОНА (Blueprint Style) ───
function Accordion({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ 
      background: "#fff", 
      border: "1.5px solid rgba(0,112,192,0.2)", 
      borderRadius: 8, 
      marginBottom: 14, 
      overflow: "hidden",
      boxShadow: "0 2px 6px rgba(0,112,192,0.05)"
    }}>
      <div 
        onClick={() => setOpen(!open)} 
        style={{ 
          padding: "14px 16px", 
          background: open ? "rgba(0,112,192,0.06)" : "rgba(0,112,192,0.02)", 
          cursor: "pointer", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          transition: "background 0.2s"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Иконка зодиака или эмодзи */}
          <span style={{ fontSize: 22, width: 28, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
          <h3 style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", margin: 0, letterSpacing: "0.5px" }}>
            {title}
          </h3>
        </div>
        <div style={{ fontSize: 16, color: "var(--gold)", transition: "transform 0.3s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▼</div>
      </div>
      {open && (
        <div style={{ padding: "16px", borderTop: "1px solid rgba(0,112,192,0.1)", background: "rgba(255,255,255,0.8)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>Загрузка профиля...</div>;

  const insights = getProfileInsights(profile);
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  
  // Безопасный доступ к иконкам
  const WesternIcon = WesternZodiacIcons[insights.zodiac?.trim()] || WesternZodiacIcons['Близнецы'];
  const EasternIcon = EasternZodiacIcons[insights.eastern?.trim()] || EasternZodiacIcons['Свинья'];

  // Обработчик кнопки "Обновить"
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Имитация обновления данных
    setTimeout(() => {
      setIsRefreshing(false);
      notify?.("✅ Данные обновлены");
    }, 800);
  };

  // Обработчик кнопки "Сброс"
  const handleReset = () => {
    if (window.confirm("Вы уверены? Это удалит ваш профиль и вернет к началу настройки.")) {
      setProfile(null);
      notify?.("🗑️ Профиль сброшен");
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      
      {/* 1. ВЕРХНЯЯ КАРТОЧКА: Аватар, Имя, Возраст */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: 24, borderLeft: "5px solid var(--blue)", padding: "20px" }}>
        <div style={{ flexShrink: 0, width: 75, height: 75, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--bg)", boxShadow: "0 4px 12px rgba(0,112,192,0.15)" }}>
           {profile.gender === 'Мужской' 
             ? <MaleAvatar size={75} /> 
             : <FemaleAvatar size={75} />}
        </div>
        <div style={{ flexGrow: 1 }}>
          <h1 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", margin: "0 0 6px 0", letterSpacing: "1px" }}>
            {profile.name || "Пользователь"}
          </h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="badge bgr" style={{ fontSize: 11 }}>🎂 {age ?? "—"} лет</span>
            {profile.chronotype && (
              <span className="badge bt" style={{ fontSize: 11 }}>⏱ {profile.chronotype}</span>
            )}
          </div>        </div>
      </div>

      {/* 2. АККОРДЕОН: ЗАПАДНЫЙ ЗОДИАК */}
      <Accordion title="Западный Зодиак" icon={<WesternIcon />} defaultOpen={false}>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text2)" }}>
          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--blue)", fontSize: 16 }}>{insights.zodiac || "—"}</strong> 
            <span style={{ opacity: 0.8 }}> ({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.</span>
          </div>
          
          <div style={{ padding: 12, background: "rgba(0,112,192,0.05)", borderRadius: 6, borderLeft: "3px solid var(--blue)", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--blue)", letterSpacing: 1, marginBottom: 6 }}>◈ ЧТО ЭТО ЗНАЧИТ ДЛЯ ТЕБЯ</div>
            <p style={{ margin: 0 }}>
              Твоя стихия наделяет тебя интеллектуальной гибкостью и адаптивностью. 
              Ты лучше всего чувствуешь себя в среде, где есть обмен информацией. 
              Слабые зоны — {insights.zodiacWeaknesses || "нервная система и лёгкие"}.
            </p>
          </div>
          
          <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
            💡 <strong>Совет:</strong> Планируй важные дела на утро. Избегай многозадачности.
          </div>
        </div>
      </Accordion>

      {/* 3. АККОРДЕОН: ВОСТОЧНЫЙ ЗНАК */}
      <Accordion title="Восточный Знак" icon={<EasternIcon />} defaultOpen={false}>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text2)" }}>
           <div style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--gold-dark)", fontSize: 16 }}>{insights.eastern || "—"}</strong> 
            <span style={{ opacity: 0.8 }}> ({insights.easternElement || "Вода"}).</span>
          </div>

          <div style={{ padding: 12, background: "rgba(200,164,90,0.05)", borderRadius: 6, borderLeft: "3px solid var(--gold)", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold-dark)", letterSpacing: 1, marginBottom: 6 }}>◈ ЭНЕРГЕТИЧЕСКИЙ ПОРТРЕТ</div>
            <p style={{ margin: 0 }}>
              {insights.easternTraits || "Честность и терпимость"}. 
              Твоя кармическая задача — {insights.easternKarma || "научиться говорить 'нет'"} 
              в ситуациях, которые отнимают твою энергию.
            </p>
          </div>
        </div>
      </Accordion>

      {/* 4. АККОРДЕОН: ГРАДУС СУДЬБЫ */}
      <Accordion title="Градус Судьбы" icon="🧭" defaultOpen={false}>
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 32, color: "var(--gold)", fontWeight: 600, letterSpacing: "1px" }}>
            {insights.destiny?.degree || 241}°          </div>
          <div style={{ fontFamily: "var(--font-italic)", fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
            {insights.destiny?.interpretation || "Интеграция опыта"}
          </div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", padding: 14, background: "rgba(200,164,90,0.05)", borderRadius: 6 }}>
          <strong style={{ display: "block", marginBottom: 6, color: "var(--gold-dark)" }}>◈ ЗОНА РАЗВИТИЯ:</strong>
          Твой градус указывает на текущую фазу жизненного цикла. 
          Сейчас ты в зоне структурирования знаний. Главный совет: доверяй интуиции, но проверяй фактами.
        </div>
      </Accordion>

      {/* 5. АККОРДЕОН: ХРОНО-ТИП */}
      <Accordion title="Хроно-тип" icon="🦉" defaultOpen={false}>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text2)" }}>
          <strong style={{ color: "var(--blue)", fontSize: 16 }}>{profile.chronotype || "🕊️ Голубь"}</strong>
          
          <div style={{ marginTop: 12, padding: 12, background: "rgba(0,112,192,0.05)", borderRadius: 6, fontSize: 13 }}>
            {profile.chronotype?.includes("Сова") ? (
              <>
                <p style={{ margin: "0 0 8px" }}>🌙 <strong>Пик продуктивности:</strong> Вечер (16:00 – 22:00).</p>
                <p style={{ margin: 0 }}>Творческие задачи лучше откладывать на вторую половину дня. Утро оставь для рутины и лёгких дел.</p>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 8px" }}>☀️ <strong>Пик продуктивности:</strong> Утро (08:00 – 14:00).</p>
                <p style={{ margin: 0 }}>Вечером энергия падает. Не планируй важные решения на время после 18:00.</p>
              </>
            )}
          </div>
        </div>
      </Accordion>

      {/* 6. КНОПКИ УПРАВЛЕНИЯ */}
      <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
        <button 
          className="btn btn-primary" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1 }}
        >
          {isRefreshing ? "⏳ Обновление..." : "🔄 Обновить данные"}
        </button>
        
        <button 
          className="btn btn-ghost" 
          onClick={handleReset} 
          style={{ flex: 1, borderColor: "rgba(139,32,32,0.3)", color: "var(--error)" }}
        >
          🗑️ Сброс профиля        </button>
      </div>

    </div>
  );
                                 }
