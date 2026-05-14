// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar, WesternZodiacIcons, EasternZodiacIcons } from "../components/BlueprintAvatars";

// ─── КОМПОНЕНТ: ИКОНКА + КАРТОЧКА (горизонтальная раскладка) ───
function IconCardRow({ icon, iconSize = 120, title, children, accentColor = "var(--blue)" }) {
  const [open, setOpen] = useState(true);
  
  return (
    <div style={{ 
      display: "flex", 
      gap: 16, 
      marginBottom: 28,
      alignItems: "flex-start",
    }}>
      {/* Иконка слева, 120px, без контура */}
      <div style={{
        width: iconSize,
        height: iconSize,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      
      {/* Карточка справа */}
      <div style={{
        flex: 1,
        background: "#fff",
        border: "1.5px solid rgba(0,112,192,0.2)",
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 3px 10px rgba(0,112,192,0.08)",
      }}>
        {/* Акцентная линия */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          background: accentColor,
        }} />
                {/* Заголовок */}
        <div
          onClick={() => setOpen(!open)}
          style={{
            padding: "16px 16px 16px 22px",
            background: open ? "rgba(0,112,192,0.07)" : "rgba(0,112,192,0.03)",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "background 0.2s",
            borderLeft: "none",
          }}
        >
          <h3 style={{
            fontFamily: "var(--font-head)",
            fontSize: 16,
            color: "var(--blue)",
            margin: 0,
            letterSpacing: "0.5px",
            paddingLeft: 10,
          }}>
            {title}
          </h3>
          <div style={{
            fontSize: 18,
            color: "var(--gold)",
            transition: "transform 0.3s",
            transform: open ? "rotate(180deg)" : "rotate(0)",
          }}>
            ▼
          </div>
        </div>
        
        {/* Контент */}
        {open && (
          <div style={{
            padding: "18px 18px 18px 22px",
            borderTop: "1px solid rgba(0,112,192,0.12)",
            background: "rgba(255,255,255,0.85)",
          }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───export function ProfileSection() {
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
      
      {/* 1. ШАПКА: Аватар слева (120px, без контура) + Карточка справа */}
      <div style={{
        display: "flex",
        gap: 20,
        marginBottom: 28,
        alignItems: "center",
      }}>
        {/* Аватар 120px, слева, без контура */}
        <div style={{
          width: 120,
          height: 120,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>          {profile.gender === 'Мужской' 
            ? <MaleAvatar size={120} /> 
            : <FemaleAvatar size={120} />}
        </div>
        
        {/* Карточка с данными */}
        <div className="card" style={{
          flex: 1,
          padding: "22px 20px",
          borderLeft: "5px solid var(--blue)",
          borderRadius: 12,
        }}>
          <h1 style={{
            fontFamily: "var(--font-head)",
            fontSize: 24,
            color: "var(--blue)",
            margin: "0 0 10px 0",
            letterSpacing: "1.5px",
          }}>
            {profile.name || "Пользователь"}
          </h1>
          
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <span className="badge bgr" style={{ fontSize: 13, padding: "4px 10px" }}>🎂 {age ?? "—"} лет</span>
            {profile.chronotype && (
              <span className="badge bt" style={{ fontSize: 13, padding: "4px 10px" }}>⏱ {profile.chronotype}</span>
            )}
            {insights.zodiac && (
              <span className="badge bm" style={{ fontSize: 13, padding: "4px 10px" }}>♈ {insights.zodiac}</span>
            )}
          </div>
          
          <div style={{
            fontSize: 14,
            color: "var(--text2)",
            lineHeight: 1.7,
            padding: "12px 16px",
            background: "rgba(0,112,192,0.06)",
            borderRadius: 10,
            borderLeft: "4px solid var(--gold)",
          }}>
            <strong style={{ color: "var(--gold-dark)" }}>Профиль:</strong> {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) · 
            {insights.eastern || "—"} ({insights.easternElement || "Вода"}) · 
            Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
          </div>
        </div>
      </div>

      {/* 2. ЗАПАДНЫЙ ЗОДИАК */}
      <IconCardRow icon={<WesternIcon />} iconSize={120} title="Западный Зодиак" accentColor="var(--blue)">        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 18 }}>
            <strong style={{ color: "var(--blue)", fontSize: 17 }}>{insights.zodiac || "—"}</strong> 
            <span> ({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}. 
            Меридиан: <strong>{meridianInfo.meridian || "—"}</strong> {meridianInfo.emoji}.</span>
          </p>
          
          <div style={{ padding: 16, background: "rgba(45,106,79,0.07)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--success)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1.2, marginBottom: 8 }}>◈ СИЛЬНЫЕ СТОРОНЫ</div>
            <p style={{ margin: 0, fontSize: 14 }}>{insights.zodiacStrengths || "Адаптивность, интеллект, коммуникация"}</p>
          </div>
          
          <div style={{ padding: 16, background: "rgba(139,32,32,0.06)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--error)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1.2, marginBottom: 8 }}>◈ УЯЗВИМЫЕ ЗОНЫ</div>
            <p style={{ margin: 0, fontSize: 14 }}>{insights.zodiacWeaknesses || "Лёгкие, нервная система, плечи"}</p>
          </div>
          
          <div style={{ padding: 16, background: "rgba(0,112,192,0.06)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Планируй важные дела на утро (пик {chronoPeaks.focus?.hours || "10:00–14:00"})</li>
              <li>Избегай многозадачности — фокусируйся на одном деле за раз</li>
              <li>Дыхательные практики укрепляют твои слабые зоны</li>
              <li>{meridianInfo.tip || "Регулярность питания и режим критичны"}</li>
            </ul>
          </div>
        </div>
      </IconCardRow>

      {/* 3. ВОСТОЧНЫЙ ЗНАК */}
      <IconCardRow icon={<EasternIcon />} iconSize={120} title="Восточный Знак" accentColor="var(--gold)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 18 }}>
            <strong style={{ color: "var(--gold-dark)", fontSize: 17 }}>{insights.eastern || "—"}</strong> 
            <span> ({insights.easternElement || "Вода"}).</span>
          </p>
          
          <div style={{ padding: 16, background: "rgba(200,164,90,0.07)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ ЭНЕРГЕТИЧЕСКИЙ ПОРТРЕТ</div>
            <p style={{ margin: 0, fontSize: 14 }}>
              {insights.easternTraits || "Честность и терпимость"}. 
              Твоя стихия ({insights.easternElement}) наделяет тебя
              {insights.easternElement === 'Вода' ? ' гибкостью, мудростью и адаптивностью' : 
               insights.easternElement === 'Дерево' ? ' ростом, творчеством и упорством' :
               insights.easternElement === 'Огонь' ? ' страстью, харизмой и лидерством' :
               insights.easternElement === 'Земля' ? ' стабильностью, надёжностью и заботой' :
               ' решительностью и справедливостью'}.
            </p>
          </div>
                    <div style={{ padding: 16, background: "rgba(200,164,90,0.05)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ КАРМИЧЕСКАЯ ЗАДАЧА</div>
            <p style={{ margin: 0, fontSize: 14 }}>
              {insights.easternKarma || "Научиться говорить 'нет' без чувства вины"}. 
              Твой рост связан с умением выстраивать границы.
            </p>
          </div>
          
          <div style={{ padding: 16, background: "rgba(0,112,192,0.06)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ РЕКОМЕНДАЦИИ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Используй периоды спада энергии для восстановления</li>
              <li>Доверяй интуиции в финансовых вопросах</li>
              <li>Избегай токсичных связей</li>
              <li>Практикуй водные процедуры для баланса стихии</li>
            </ul>
          </div>
        </div>
      </IconCardRow>

      {/* 4. ГРАДУС СУДЬБЫ */}
      <IconCardRow icon="🧭" iconSize={120} title="Градус Судьбы" accentColor="var(--gold)">
        <div style={{ textAlign: "center", padding: "10px 0 18px" }}>
          <div style={{
            fontFamily: "var(--font-head)",
            fontSize: 40,
            color: "var(--gold)",
            fontWeight: 600,
            letterSpacing: "2.5px",
          }}>
            {destiny.degree || 241}°
          </div>
          <div style={{
            fontFamily: "var(--font-italic)",
            fontSize: 16,
            color: "var(--text2)",
            marginTop: 8,
            fontStyle: "italic",
          }}>
            {destiny.interpretation || "Интеграция опыта"}
          </div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <div style={{ padding: 16, background: "rgba(200,164,90,0.07)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ ЗОНА РАЗВИТИЯ</div>
            <p style={{ margin: 0 }}>
              Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла. 
              {destiny.degree < 120 ? ' Ты в зоне активного созидания. Твоя сила — в смелости начинать.' :
               destiny.degree < 240 ? ' Ты в зоне структурирования и роста. Закрепляй опыт, строй системы.' :
               ' Ты в зоне интеграции и мудрости. Твоя суперсила — видеть суть, передавать опыт.'}            </p>
          </div>
          
          <div style={{ padding: 16, background: "rgba(0,112,192,0.06)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Доверяй интуиции, но проверяй фактами</li>
              <li>Каждое утро спрашивай: «Какой урок я могу извлечь сегодня?»</li>
              <li>Веди дневник наблюдений</li>
              <li>Избегай рутины, которая не несёт смысла</li>
            </ul>
          </div>
        </div>
      </IconCardRow>

      {/* 5. ХРОНО-ТИП */}
      <IconCardRow icon="🦉" iconSize={120} title="Хроно-тип" accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 18 }}>
            <strong style={{ color: "var(--blue)", fontSize: 17 }}>{profile.chronotype || "🕊️ Голубь"}</strong>
            <span> · Пик: <strong>{chronoPeaks.focus?.hours || "10:00–14:00"}</strong></span>
          </p>
          
          <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
            <div style={{ padding: 16, background: "rgba(45,106,79,0.07)", borderRadius: 10, borderLeft: "4px solid var(--success)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1.2, marginBottom: 8 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
              <p style={{ margin: 0, fontSize: 14 }}>
                {chronoPeaks.focus?.tip || "Самые сложные задачи — в это время. Мозг работает на максимуме."}
              </p>
            </div>
            <div style={{ padding: 16, background: "rgba(139,32,32,0.06)", borderRadius: 10, borderLeft: "4px solid var(--error)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1.2, marginBottom: 8 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
              <p style={{ margin: 0, fontSize: 14 }}>
                {chronoPeaks.rest?.tip || "Идеально для рутины, звонков, несрочной почты."}
              </p>
            </div>
          </div>
          
          <div style={{ padding: 16, background: "rgba(0,112,192,0.06)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Синхронизируй расписание с биоритмами — КПД +30–40%</li>
              <li>Сложные решения — только в пиковые часы</li>
              <li>Провалы энергии — для делегирования и рутины</li>
              <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"}</li>
              {chronoPeaks.meridian_peak && <li>Активный меридиан: {chronoPeaks.meridian_peak}</li>}
            </ul>
          </div>
        </div>
      </IconCardRow>
      {/* 6. КНОПКИ УПРАВЛЕНИЯ */}
      <div style={{ display: "flex", gap: 14, marginTop: 32 }}>
        <button
          className="btn btn-primary"
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}
        >
          {isRefreshing ? "⏳ Обновление..." : "🔄 Обновить данные"}
        </button>
        
        <button
          className="btn btn-ghost"
          onClick={handleReset}
          style={{ flex: 1, borderColor: "rgba(139,32,32,0.4)", color: "var(--error)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}
        >
          🗑️ Сброс профиля
        </button>
      </div>

    </div>
  );
}
