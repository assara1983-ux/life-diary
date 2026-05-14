// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar, WesternZodiacIcons, EasternZodiacIcons } from "../components/BlueprintAvatars";

// ─── КОМПОНЕНТ ИНФО-КАРТОЧКИ (Blueprint Style) ───
function InfoCard({ title, icon, children, accentColor = "var(--blue)" }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid rgba(0,112,192,0.2)",
      borderRadius: 8,
      marginBottom: 16,
      overflow: "hidden",
      position: "relative",
      paddingLeft: 0,
    }}>
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "3px",
        background: accentColor,
      }} />
      
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "14px 16px 14px 24px",
          background: open ? "rgba(0,112,192,0.06)" : "rgba(0,112,192,0.02)",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "background 0.2s",
          borderLeft: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{
            fontSize: 26,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",            flexShrink: 0,
          }}>
            {icon}
          </span>
          <h3 style={{
            fontFamily: "var(--font-head)",
            fontSize: 15,
            color: "var(--blue)",
            margin: 0,
            letterSpacing: "0.5px",
          }}>
            {title}
          </h3>
        </div>
        <div style={{
          fontSize: 16,
          color: "var(--gold)",
          transition: "transform 0.3s",
          transform: open ? "rotate(180deg)" : "rotate(0)",
        }}>
          ▼
        </div>
      </div>
      
      {open && (
        <div style={{
          padding: "16px 16px 16px 24px",
          borderTop: "1px solid rgba(0,112,192,0.1)",
          background: "rgba(255,255,255,0.8)",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>Загрузка профиля...</div>;

  const insights = getProfileInsights(profile);
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  
  const WesternIcon = WesternZodiacIcons[insights.zodiac?.trim()] || WesternZodiacIcons['Близнецы'];
  const EasternIcon = EasternZodiacIcons[insights.eastern?.trim()] || EasternZodiacIcons['Свинья'];
    const meridianInfo = getMeridianInfo(insights.zodiac);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const destiny = insights.destiny || { degree: 241, interpretation: 'Интеграция опыта' };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      notify?.("✅ Данные обновлены");
    }, 800);
  };

  const handleReset = () => {
    if (window.confirm("Вы уверены? Это удалит ваш профиль и вернет к началу настройки.")) {
      setProfile(null);
      notify?.("🗑️ Профиль сброшен");
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      
      {/* 1. ВЕРХНЯЯ КАРТОЧКА */}
      <div className="card" style={{
        textAlign: "center",
        padding: "24px 20px",
        borderLeft: "5px solid var(--blue)",
        marginBottom: 24,
      }}>
        <div style={{
          width: 90,
          height: 90,
          margin: "0 auto 16px",
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid var(--bg)",
          boxShadow: "0 4px 12px rgba(0,112,192,0.15)",
        }}>
          {profile.gender === 'Мужской' 
            ? <MaleAvatar size={90} /> 
            : <FemaleAvatar size={90} />}
        </div>
        
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 22,
          color: "var(--blue)",
          margin: "0 0 8px 0",
          letterSpacing: "1px",
        }}>          {profile.name || "Пользователь"}
        </h1>
        
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <span className="badge bgr" style={{ fontSize: 12 }}>🎂 {age ?? "—"} лет</span>
          {profile.chronotype && (
            <span className="badge bt" style={{ fontSize: 12 }}>⏱ {profile.chronotype}</span>
          )}
          {insights.zodiac && (
            <span className="badge bm" style={{ fontSize: 12 }}>♈ {insights.zodiac}</span>
          )}
        </div>
        
        <div style={{
          fontSize: 13,
          color: "var(--text2)",
          lineHeight: 1.6,
          padding: "12px 16px",
          background: "rgba(0,112,192,0.05)",
          borderRadius: 8,
          borderLeft: "3px solid var(--gold)",
          textAlign: "left",
        }}>
          <strong style={{ color: "var(--gold-dark)" }}>Ваш профиль:</strong> {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) · 
          {insights.eastern || "—"} ({insights.easternElement || "Вода"}) · 
          Градус судьбы: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
        </div>
      </div>

      {/* 2. ЗАПАДНЫЙ ЗОДИАК */}
      <InfoCard title="Западный Зодиак" icon={<WesternIcon />} accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text2)" }}>
          <p style={{ marginBottom: 16 }}>
            <strong style={{ color: "var(--blue)", fontSize: 16 }}>{insights.zodiac || "—"}</strong> 
            <span> ({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}. 
            Меридиан: <strong>{meridianInfo.meridian || "—"}</strong> {meridianInfo.emoji}.</span>
          </p>
          
          <div style={{ padding: 14, background: "rgba(45,106,79,0.06)", borderRadius: 8, marginBottom: 14, borderLeft: "3px solid var(--success)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--success)", letterSpacing: 1, marginBottom: 6 }}>◈ СИЛЬНЫЕ СТОРОНЫ</div>
            <p style={{ margin: 0, fontSize: 13 }}>{insights.zodiacStrengths || "Адаптивность, интеллект, коммуникация"}</p>
          </div>
          
          <div style={{ padding: 14, background: "rgba(139,32,32,0.05)", borderRadius: 8, marginBottom: 14, borderLeft: "3px solid var(--error)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--error)", letterSpacing: 1, marginBottom: 6 }}>◈ УЯЗВИМЫЕ ЗОНЫ</div>
            <p style={{ margin: 0, fontSize: 13 }}>{insights.zodiacWeaknesses || "Лёгкие, нервная система, плечи"}</p>
          </div>
          
          <div style={{ padding: 14, background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--blue)", letterSpacing: 1, marginBottom: 6 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
              <li>Планируй важные дела на утро (пик {chronoPeaks.focus?.hours || "10:00–14:00"})</li>
              <li>Избегай многозадачности — фокусируйся на одном деле за раз</li>
              <li>Дыхательные практики укрепляют твои слабые зоны (лёгкие/нервы)</li>
              <li>{meridianInfo.tip || "Регулярность питания и режим критичны для твоего меридиана"}</li>
            </ul>
          </div>
        </div>
      </InfoCard>

      {/* 3. ВОСТОЧНЫЙ ЗНАК */}
      <InfoCard title="Восточный Знак" icon={<EasternIcon />} accentColor="var(--gold)">
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text2)" }}>
          <p style={{ marginBottom: 16 }}>
            <strong style={{ color: "var(--gold-dark)", fontSize: 16 }}>{insights.eastern || "—"}</strong> 
            <span> ({insights.easternElement || "Вода"}).</span>
          </p>
          
          <div style={{ padding: 14, background: "rgba(200,164,90,0.06)", borderRadius: 8, marginBottom: 14, borderLeft: "3px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold-dark)", letterSpacing: 1, marginBottom: 6 }}>◈ ЭНЕРГЕТИЧЕСКИЙ ПОРТРЕТ</div>
            <p style={{ margin: 0, fontSize: 13 }}>
              {insights.easternTraits || "Честность и терпимость"}. Ты обладаешь глубокой интуицией. 
              Твоя стихия ({insights.easternElement}) наделяет тебя
              {insights.easternElement === 'Вода' ? ' гибкостью, мудростью и адаптивностью' : 
               insights.easternElement === 'Дерево' ? ' ростом, творчеством и упорством' :
               insights.easternElement === 'Огонь' ? ' страстью, харизмой и лидерством' :
               insights.easternElement === 'Земля' ? ' стабильностью, надёжностью и заботой' :
               ' решительностью и справедливостью'}.
            </p>
          </div>
          
          <div style={{ padding: 14, background: "rgba(200,164,90,0.04)", borderRadius: 8, marginBottom: 14, borderLeft: "3px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold-dark)", letterSpacing: 1, marginBottom: 6 }}>◈ КАРМИЧЕСКАЯ ЗАДАЧА</div>
            <p style={{ margin: 0, fontSize: 13 }}>
              {insights.easternKarma || "Научиться говорить 'нет' без чувства вины"}. 
              Твой рост связан с умением выстраивать границы. Доверяй интуиции в финансовых решениях.
            </p>
          </div>
          
          <div style={{ padding: 14, background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--blue)", letterSpacing: 1, marginBottom: 6 }}>◈ РЕКОМЕНДАЦИИ</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
              <li>Используй периоды спада энергии для восстановления, а не борьбы</li>
              <li>Доверяй интуиции в финансовых вопросах — она у тебя сильна</li>
              <li>Избегай токсичных связей — ты впитываешь чужую энергию</li>
              <li>Практикуй водные процедуры для баланса стихии</li>
            </ul>
          </div>
        </div>
      </InfoCard>
      {/* 4. ГРАДУС СУДЬБЫ */}
      <InfoCard title="Градус Судьбы" icon="🧭" accentColor="var(--gold)">
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{
            fontFamily: "var(--font-head)",
            fontSize: 36,
            color: "var(--gold)",
            fontWeight: 600,
            letterSpacing: "2px",
          }}>
            {destiny.degree || 241}°
          </div>
          <div style={{
            fontFamily: "var(--font-italic)",
            fontSize: 15,
            color: "var(--text2)",
            marginTop: 6,
            fontStyle: "italic",
          }}>
            {destiny.interpretation || "Интеграция опыта"}
          </div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text2)" }}>
          <div style={{ padding: 14, background: "rgba(200,164,90,0.05)", borderRadius: 8, marginBottom: 14, borderLeft: "3px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gold-dark)", letterSpacing: 1, marginBottom: 6 }}>◈ ЗОНА РАЗВИТИЯ</div>
            <p style={{ margin: 0 }}>
              Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла. 
              {destiny.degree < 120 ? ' Ты в зоне активного созидания. Твоя сила — в смелости начинать.' :
               destiny.degree < 240 ? ' Ты в зоне структурирования и роста. Закрепляй опыт, строй системы.' :
               ' Ты в зоне интеграции и мудрости. Твоя суперсила — видеть суть, передавать опыт.'}
            </p>
          </div>
          
          <div style={{ padding: 14, background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--blue)", letterSpacing: 1, marginBottom: 6 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
              <li>Доверяй интуиции, но проверяй фактами</li>
              <li>Каждое утро спрашивай: «Какой урок я могу извлечь сегодня?»</li>
              <li>Веди дневник наблюдений — это усиливает твой градус</li>
              <li>Избегай рутины, которая не несёт смысла</li>
            </ul>
          </div>
        </div>
      </InfoCard>

      {/* 5. ХРОНО-ТИП */}
      <InfoCard title="Хроно-тип" icon="🦉" accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text2)" }}>
          <p style={{ marginBottom: 16 }}>            <strong style={{ color: "var(--blue)", fontSize: 16 }}>{profile.chronotype || "🕊️ Голубь"}</strong>
            <span> · Пик: <strong>{chronoPeaks.focus?.hours || "10:00–14:00"}</strong></span>
          </p>
          
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 14, background: "rgba(45,106,79,0.06)", borderRadius: 8, borderLeft: "3px solid var(--success)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--success)", letterSpacing: 1, marginBottom: 6 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
              <p style={{ margin: 0, fontSize: 13 }}>
                {chronoPeaks.focus?.tip || "Самые сложные задачи — в это время. Мозг работает на максимуме."}
              </p>
            </div>
            <div style={{ padding: 14, background: "rgba(139,32,32,0.05)", borderRadius: 8, borderLeft: "3px solid var(--error)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--error)", letterSpacing: 1, marginBottom: 6 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
              <p style={{ margin: 0, fontSize: 13 }}>
                {chronoPeaks.rest?.tip || "Идеально для рутины, звонков, несрочной почты. Не планируй важных решений."}
              </p>
            </div>
          </div>
          
          <div style={{ padding: 14, background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--blue)", letterSpacing: 1, marginBottom: 6 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
              <li>Синхронизируй расписание с биоритмами — это повысит КПД на 30–40%</li>
              <li>Сложные решения — только в пиковые часы</li>
              <li>Провалы энергии — для делегирования и рутины</li>
              <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"} — критично для восстановления</li>
              {chronoPeaks.meridian_peak && <li>Активный меридиан: {chronoPeaks.meridian_peak}</li>}
            </ul>
          </div>
        </div>
      </InfoCard>

      {/* 6. КНОПКИ УПРАВЛЕНИЯ */}
      <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
        <button
          className="btn btn-primary"
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}
        >
          {isRefreshing ? "⏳ Обновление..." : "🔄 Обновить данные"}
        </button>
        
        <button
          className="btn btn-ghost"
          onClick={handleReset}
          style={{ flex: 1, borderColor: "rgba(139,32,32,0.3)", color: "var(--error)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}
        >
          🗑️ Сброс профиля
        </button>      </div>

    </div>
  );
}
