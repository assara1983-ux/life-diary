// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar, WesternZodiacIcons, EasternZodiacIcons } from "../components/BlueprintAvatars";

// ─── КОМПОНЕНТ АККОРДЕОНА (Blueprint Style) ───
function BlueprintAccordion({ title, icon, children, defaultOpen = false }) {
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
          {/* Иконка слева от заголовка */}
          <span style={{ fontSize: 24, width: 28, display: "flex", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
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

// ─── ОСНОВНОЙ КОМПОНЕНТ ───export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>Загрузка профиля...</div>;

  const insights = getProfileInsights(profile);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  // Безопасный доступ к иконкам (PNG)
  const WesternIcon = WesternZodiacIcons[insights.zodiac?.trim()] || (() => <span>?</span>);
  const EasternIcon = EasternZodiacIcons[insights.eastern?.trim()] || (() => <span>?</span>);

  // Обработчики кнопок
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      notify?.("✅ Данные обновлены");
    }, 600);
  };

  const handleReset = () => {
    if (window.confirm("Вы уверены? Это удалит профиль и вернёт к этапу настройки.")) {
      setProfile(null);
      notify?.("🗑️ Профиль сброшен");
    }
  };

  // Динамическая расшифровка градуса
  const destinyDegree = insights.destiny?.degree || 241;
  const destinyExpl = destinyDegree < 120
    ? "Фаза активного созидания. Ваша сила — в инициации новых проектов и смелых начинаниях. Сейчас энергия направлена на рост."
    : destinyDegree < 240
    ? "Фаза структурирования и профессионального роста. Закрепляйте опыт, стройте устойчивые системы. Время мастерства."
    : "Фаза интеграции и мудрости. Вы видите суть вещей, которой другие не замечают. Ваша задача — передавать опыт и наставлять.";

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      
      {/* 1. ВЕРХНЯЯ КАРТОЧКА: Аватар (центр), Имя, Возраст */}
      <div className="card" style={{ textAlign: "center", padding: "24px 16px", marginBottom: 20, borderLeft: "5px solid var(--blue)" }}>
        <div style={{ 
          width: 100, height: 100, margin: "0 auto 16px", borderRadius: "50%", overflow: "hidden", 
          border: "2px solid var(--bg)", boxShadow: "0 4px 12px rgba(0,112,192,0.15)" 
        }}>
          {profile.gender === 'Мужской' ? <MaleAvatar size={100} /> : <FemaleAvatar size={100} />}
        </div>
                <h1 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", margin: "0 0 8px 0", letterSpacing: "1px" }}>
          {profile.name || "Пользователь"}
        </h1>
        
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <span className="badge bgr" style={{ fontSize: 12 }}>🎂 {age ?? "—"} лет</span>
        </div>
      </div>

      {/* 2. ЗАПАДНЫЙ ЗОДИАК */}
      <BlueprintAccordion title="Западный Зодиак" icon={<WesternIcon />}>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text2)" }}>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--blue)", fontSize: 16 }}>{insights.zodiac || "—"}</strong> 
            <span> ({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.</span>
          </p>
          
          <div style={{ padding: 12, background: "rgba(45,106,79,0.06)", borderRadius: 8, marginBottom: 12, borderLeft: "3px solid var(--success)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--success)", letterSpacing: 1, marginBottom: 6 }}>◈ СИЛЬНЫЕ СТОРОНЫ</div>
            <p style={{ margin: 0 }}>{insights.zodiacStrengths || "Адаптивность, интеллект, коммуникация"}</p>
          </div>
          
          <div style={{ padding: 12, background: "rgba(139,32,32,0.05)", borderRadius: 8, marginBottom: 12, borderLeft: "3px solid var(--error)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--error)", letterSpacing: 1, marginBottom: 6 }}>◈ УЯЗВИМЫЕ ЗОНЫ</div>
            <p style={{ margin: 0 }}>{insights.zodiacWeaknesses || "Лёгкие, нервная система, плечи"}</p>
          </div>
          
          <div style={{ padding: 12, background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--blue)", letterSpacing: 1, marginBottom: 6 }}>◈ ЧТО ЭТО ЗНАЧИТ ДЛЯ ТЕБЯ</div>
            <p style={{ margin: 0 }}>
              Твоя стихия наделяет тебя интеллектуальной гибкостью. Планируй важные дела на утро (пик концентрации).
              Избегай многозадачности — фокусируйся на одном деле. Дыхательные практики укрепляют твои слабые зоны.
            </p>
          </div>
        </div>
      </BlueprintAccordion>

      {/* 3. ВОСТОЧНЫЙ ЗНАК */}
      <BlueprintAccordion title="Восточный Знак" icon={<EasternIcon />}>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text2)" }}>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--gold-dark)", fontSize: 16 }}>{insights.eastern || "—"}</strong> 
            <span> ({insights.easternElement || "Вода"}).</span>
          </p>
          
          <div style={{ padding: 12, background: "rgba(200,164,90,0.06)", borderRadius: 8, marginBottom: 12, borderLeft: "3px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold-dark)", letterSpacing: 1, marginBottom: 6 }}>◈ ЭНЕРГЕТИЧЕСКИЙ ПОРТРЕТ</div>
            <p style={{ margin: 0 }}>
              {insights.easternTraits || "Честность и терпимость"}. Твоя стихия ({insights.easternElement}) наделяет тебя
              {insights.easternElement === 'Вода' ? ' гибкостью, мудростью и адаптивностью' :                insights.easternElement === 'Дерево' ? ' ростом, творчеством и упорством' :
               insights.easternElement === 'Огонь' ? ' страстью, харизмой и лидерством' :
               insights.easternElement === 'Земля' ? ' стабильностью, надёжностью и заботой' :
               ' решительностью и справедливостью'}.
            </p>
          </div>
          
          <div style={{ padding: 12, background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--blue)", letterSpacing: 1, marginBottom: 6 }}>◈ КАРМИЧЕСКАЯ ЗАДАЧА</div>
            <p style={{ margin: 0 }}>
              {insights.easternKarma || "Научиться говорить 'нет' без чувства вины"}. Твой рост связан с умением выстраивать границы.
              Используй периоды спада энергии для восстановления, а не борьбы. Доверяй интуиции в важных решениях.
            </p>
          </div>
        </div>
      </BlueprintAccordion>

      {/* 4. ГРАДУС СУДЬБЫ */}
      <BlueprintAccordion title="Градус Судьбы" icon="🧭">
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 32, color: "var(--gold)", fontWeight: 600, letterSpacing: "2px" }}>
            {destinyDegree}°
          </div>
          <div style={{ fontFamily: "var(--font-italic)", fontSize: 14, color: "var(--text2)", marginTop: 6, fontStyle: "italic" }}>
            {insights.destiny?.interpretation || "Интеграция опыта"}
          </div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text2)", padding: 14, background: "rgba(200,164,90,0.05)", borderRadius: 8, borderLeft: "3px solid var(--gold)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold-dark)", letterSpacing: 1, marginBottom: 8 }}>◈ ЗОНА РАЗВИТИЯ</div>
          <p style={{ margin: 0 }}>{destinyExpl}</p>
          <ul style={{ margin: "12px 0 0 18px", fontSize: 13, lineHeight: 1.8 }}>
            <li>Доверяй интуиции, но проверяй фактами</li>
            <li>Каждое утро спрашивай: «Какой урок я могу извлечь сегодня?»</li>
            <li>Веди дневник наблюдений — это усиливает твой градус</li>
          </ul>
        </div>
      </BlueprintAccordion>

      {/* 5. ХРОНО-ТИП */}
      <BlueprintAccordion title="Хроно-тип" icon={chronoPeaks.emoji || "🦅"}>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text2)" }}>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--blue)", fontSize: 16 }}>{profile.chronotype || "🕊️ Голубь"}</strong>
            <span> · Пик: <strong>{chronoPeaks.focus?.hours || "10:00–14:00"}</strong></span>
          </p>
          
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 14, background: "rgba(45,106,79,0.06)", borderRadius: 8, borderLeft: "3px solid var(--success)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--success)", letterSpacing: 1, marginBottom: 6 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
              <p style={{ margin: 0 }}>{chronoPeaks.focus?.tip || "Самые сложные задачи — в это время. Мозг работает на максимуме."}</p>            </div>
            <div style={{ padding: 14, background: "rgba(139,32,32,0.05)", borderRadius: 8, borderLeft: "3px solid var(--error)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--error)", letterSpacing: 1, marginBottom: 6 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
              <p style={{ margin: 0 }}>{chronoPeaks.rest?.tip || "Идеально для рутины, звонков, несрочной почты. Не планируй важных решений."}</p>
            </div>
          </div>
          
          <div style={{ padding: 14, background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--blue)", letterSpacing: 1, marginBottom: 6 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
              <li>Синхронизируй расписание с биоритмами — КПД вырастет на 30–40%</li>
              <li>Сложные решения — только в пиковые часы</li>
              <li>Провалы энергии — для делегирования и рутины</li>
              <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"} — критично для восстановления</li>
            </ul>
          </div>
        </div>
      </BlueprintAccordion>

      {/* 6. КНОПКИ УПРАВЛЕНИЯ */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button 
          className="btn btn-primary" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1, cursor: isRefreshing ? "wait" : "pointer" }}
        >
          {isRefreshing ? "⏳ Обновление..." : "🔄 Обновить данные"}
        </button>
        
        <button 
          className="btn btn-ghost" 
          onClick={handleReset} 
          style={{ flex: 1, borderColor: "rgba(139,32,32,0.3)", color: "var(--error)" }}
        >
          🗑️ Сброс профиля
        </button>
      </div>

    </div>
  );
}
