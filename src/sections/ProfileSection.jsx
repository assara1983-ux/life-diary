// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar, getWesternZodiacSrc, getEasternZodiacSrc } from "../components/BlueprintAvatars";

// ─── КОМПОНЕНТ КАРТОЧКИ С ИЛЛЮСТРАЦИЕЙ ───
function BlueprintCard({ title, illustrationSrc, accentColor = "var(--blue)", children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid rgba(0,112,192,0.2)",
      borderRadius: 10,
      marginBottom: 24,
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,112,192,0.08)",
      position: "relative"
    }}>
      {/* Шапка с иллюстрацией */}
      {illustrationSrc && (
        <div style={{
          width: "100%",
          height: 120,
          background: "rgba(0,112,192,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderBottom: "1px solid rgba(0,112,192,0.15)"
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(rgba(0,112,192,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,112,192,0.08) 1px, transparent 1px)",
            backgroundSize: "16px 16px"
          }} />
          <img
            src={illustrationSrc}
            alt={title}
            style={{
              height: 90,
              objectFit: "contain",
              opacity: 0.9,
              filter: "drop-shadow(0 2px 4px rgba(0,112,192,0.15))",
              zIndex: 1
            }}
            onError={(e) => { e.target.style.display = "none"; }}          />
        </div>
      )}

      {/* Заголовок карточки */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: "14px 16px",
          background: open ? "rgba(0,112,192,0.06)" : "rgba(0,112,192,0.02)",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "background 0.2s",
          borderTopLeftRadius: illustrationSrc ? 0 : 10,
          borderTopRightRadius: illustrationSrc ? 0 : 10
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2 }} />
          <h3 style={{
            fontFamily: "var(--font-head)",
            fontSize: 15,
            color: "var(--blue)",
            margin: 0,
            letterSpacing: "0.5px"
          }}>
            {title}
          </h3>
        </div>
        <div style={{
          fontSize: 16,
          color: "var(--gold)",
          transition: "transform 0.3s",
          transform: open ? "rotate(180deg)" : "rotate(0)"
        }}>
          ▼
        </div>
      </div>

      {/* Контент */}
      {open && (
        <div style={{
          padding: "18px 16px",
          borderTop: "1px solid rgba(0,112,192,0.1)",
          background: "rgba(255,255,255,0.9)"
        }}>
          {children}
        </div>      )}
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!profile) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>Загрузка профиля...</div>;
  }

  const insights = getProfileInsights(profile);
  const age = profile?.dob
    ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Надежная проверка пола (игнорирует регистр и пробелы)
  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("муж") || genderStr.toLowerCase() === "male";

  // Пути к иллюстрациям через маппинг
  const westernImgSrc = getWesternZodiacSrc(insights.zodiac);
  const easternImgSrc = getEasternZodiacSrc(insights.eastern);

  const meridianInfo = getMeridianInfo(insights.zodiac);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const destiny = insights.destiny || { degree: 241, interpretation: "Интеграция опыта" };

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
      {/* 1. ШАПКА ПРОФИЛЯ */}
      <div className="card" style={{        textAlign: "center",
        padding: "28px 20px",
        borderLeft: "5px solid var(--blue)",
        marginBottom: 28,
        borderRadius: 12,
        background: "linear-gradient(180deg, #fff 0%, #f8f4e8 100%)"
      }}>
        <div style={{
          width: 140,
          height: 140,
          margin: "0 auto 20px",
          borderRadius: "50%",
          overflow: "hidden",
          border: "3px solid var(--bg)",
          boxShadow: "0 6px 18px rgba(0,112,192,0.18)",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(rgba(0,112,192,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,112,192,0.08) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
            zIndex: 0
          }} />
          {isMale ? <MaleAvatar size={140} /> : <FemaleAvatar size={140} />}
        </div>

        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 26,
          color: "var(--blue)",
          margin: "0 0 12px 0",
          letterSpacing: "1.5px"
        }}>
          {profile.name || "Пользователь"}
        </h1>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <span className="badge bgr" style={{ fontSize: 13, padding: "5px 12px" }}>🎂 {age ?? "—"} лет</span>
          {profile.chronotype && (
            <span className="badge bt" style={{ fontSize: 13, padding: "5px 12px" }}>⏱ {profile.chronotype}</span>
          )}
          {insights.zodiac && (
            <span className="badge bm" style={{ fontSize: 13, padding: "5px 12px" }}>♈ {insights.zodiac}</span>
          )}
        </div>
        <div style={{
          fontSize: 14,
          color: "var(--text2)",
          lineHeight: 1.7,
          padding: "14px 18px",
          background: "rgba(0,112,192,0.06)",
          borderRadius: 10,
          borderLeft: "4px solid var(--gold)",
          textAlign: "left"
        }}>
          <strong style={{ color: "var(--gold-dark)" }}>Профиль:</strong>{" "}
          {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) ·{" "}
          {insights.eastern || "—"} ({insights.easternElement || "Вода"}) ·{" "}
          Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
        </div>
      </div>

      {/* 2. ЗАПАДНЫЙ ЗОДИАК */}
      <BlueprintCard title="Западный Зодиак" illustrationSrc={westernImgSrc} accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 18 }}>
            <strong style={{ color: "var(--blue)", fontSize: 17 }}>{insights.zodiac || "—"}</strong>{" "}
            <span>({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.{" "}
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
              <li>Дыхательные практики укрепляют слабые зоны</li>
              <li>{meridianInfo.tip || "Регулярность питания и режим критичны"}</li>
            </ul>
          </div>
        </div>
      </BlueprintCard>

      {/* 3. ВОСТОЧНЫЙ ЗНАК */}
      <BlueprintCard title="Восточный Знак" illustrationSrc={easternImgSrc} accentColor="var(--gold)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 18 }}>
            <strong style={{ color: "var(--gold-dark)", fontSize: 17 }}>{insights.eastern || "—"}</strong>{" "}            <span>({insights.easternElement || "Вода"}).</span>
          </p>
          <div style={{ padding: 16, background: "rgba(200,164,90,0.07)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ ЭНЕРГЕТИЧЕСКИЙ ПОРТРЕТ</div>
            <p style={{ margin: 0, fontSize: 14 }}>
              {insights.easternTraits || "Честность и терпимость"}. Твоя стихия наделяет тебя глубокой интуицией и способностью видеть скрытые мотивы.
            </p>
          </div>
          <div style={{ padding: 16, background: "rgba(200,164,90,0.05)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ КАРМИЧЕСКАЯ ЗАДАЧА</div>
            <p style={{ margin: 0, fontSize: 14 }}>
              {insights.easternKarma || "Научиться говорить 'нет' без чувства вины"}. Выстраивай границы, не теряя эмпатии.
            </p>
          </div>
          <div style={{ padding: 16, background: "rgba(0,112,192,0.06)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ РЕКОМЕНДАЦИИ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Используй спады энергии для восстановления</li>
              <li>Доверяй интуиции в финансовых вопросах</li>
              <li>Избегай токсичных связей</li>
              <li>Практикуй водные процедуры для баланса</li>
            </ul>
          </div>
        </div>
      </BlueprintCard>

      {/* 4. ГРАДУС СУДЬБЫ */}
      <BlueprintCard title="Градус Судьбы" accentColor="var(--gold)">
        <div style={{ textAlign: "center", padding: "10px 0 18px" }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 40, color: "var(--gold)", fontWeight: 600, letterSpacing: "2.5px" }}>
            {destiny.degree || 241}°
          </div>
          <div style={{ fontFamily: "var(--font-italic)", fontSize: 16, color: "var(--text2)", marginTop: 8, fontStyle: "italic" }}>
            {destiny.interpretation || "Интеграция опыта"}
          </div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <div style={{ padding: 16, background: "rgba(200,164,90,0.07)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ ЗОНА РАЗВИТИЯ</div>
            <p style={{ margin: 0 }}>
              Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла.{" "}
              {destiny.degree < 120 ? "Активное созидание и инициация." : destiny.degree < 240 ? "Структурирование и профессиональный рост." : "Интеграция и передача опыта."}
            </p>
          </div>
          <div style={{ padding: 16, background: "rgba(0,112,192,0.06)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Доверяй интуиции, проверяй фактами</li>
              <li>Каждое утро спрашивай: «Какой урок я могу извлечь сегодня?»</li>
              <li>Веди дневник наблюдений</li>            </ul>
          </div>
        </div>
      </BlueprintCard>

      {/* 5. ХРОНО-ТИП */}
      <BlueprintCard title="Хроно-тип" accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 18 }}>
            <strong style={{ color: "var(--blue)", fontSize: 17 }}>{profile.chronotype || "🕊️ Голубь"}</strong>{" "}
            <span>· Пик: <strong>{chronoPeaks.focus?.hours || "10:00–14:00"}</strong></span>
          </p>
          <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
            <div style={{ padding: 16, background: "rgba(45,106,79,0.07)", borderRadius: 10, borderLeft: "4px solid var(--success)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1.2, marginBottom: 8 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
              <p style={{ margin: 0, fontSize: 14 }}>{chronoPeaks.focus?.tip || "Самые сложные задачи — в это время. Мозг работает на максимуме."}</p>
            </div>
            <div style={{ padding: 16, background: "rgba(139,32,32,0.06)", borderRadius: 10, borderLeft: "4px solid var(--error)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1.2, marginBottom: 8 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
              <p style={{ margin: 0, fontSize: 14 }}>{chronoPeaks.rest?.tip || "Идеально для рутины, звонков, несрочной почты."}</p>
            </div>
          </div>
          <div style={{ padding: 16, background: "rgba(0,112,192,0.06)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Синхронизируй расписание с биоритмами — КПД +30–40%</li>
              <li>Сложные решения — только в пиковые часы</li>
              <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"}</li>
              {chronoPeaks.meridian_peak && <li>Активный меридиан: {chronoPeaks.meridian_peak}</li>}
            </ul>
          </div>
        </div>
      </BlueprintCard>

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
          🗑️ Сброс профиля        </button>
      </div>
    </div>
  );
}
