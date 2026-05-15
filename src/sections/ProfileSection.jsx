// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";

// ─── ПУТИ К ИЛЛЮСТРАЦИЯМ ───
const getFrontImage = (category, value) => {
  if (!value) return null;
  const base = value.trim();
  const paths = {
    western: { 'Овен':'front-zodiac-aries.png','Телец':'front-zodiac-taurus.png','Близнецы':'front-zodiac-gemini.png','Рак':'front-zodiac-cancer.png','Лев':'front-zodiac-leo.png','Дева':'front-zodiac-virgo.png','Весы':'front-zodiac-libra.png','Скорпион':'front-zodiac-scorpio.png','Стрелец':'front-zodiac-sagittarius.png','Козерог':'front-zodiac-capricorn.png','Водолей':'front-zodiac-aquarius.png','Рыбы':'front-zodiac-pisces.png' },
    eastern: { 'Крыса':'front-eastern-rat.png','Бык':'front-eastern-ox.png','Тигр':'front-eastern-tiger.png','Кролик':'front-eastern-rabbit.png','Дракон':'front-eastern-dragon.png','Змея':'front-eastern-snake.png','Лошадь':'front-eastern-horse.png','Коза':'front-eastern-goat.png','Обезьяна':'front-eastern-monkey.png','Петух':'front-eastern-rooster.png','Собака':'front-eastern-dog.png','Свинья':'front-eastern-pig.png' },
    chrono: { 'Жаворонок':'front-chrono-lark.png','Голубь':'front-chrono-pigeon.png','Сова':'front-chrono-owl.png' },
    destiny: 'front-destiny.png'
  };
  const list = paths[category];
  if (typeof list === 'string') return `/assets/avatars-icons/${list}`;
  return list?.[base] ? `/assets/avatars-icons/${list[base]}` : null;
};

// ─── ВНУТРЕННИЙ АККОРДЕОН ───
function InnerAccordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10, background: "rgba(0,112,192,0.04)", borderRadius: 8, border: "1px solid rgba(0,112,192,0.15)" }}>
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--gold)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>▼</span>
      </div>
      {open && (
        <div style={{ padding: "0 12px 12px", fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── ПЕРЕВОРАЧИВАЮЩАЯСЯ КАРТОЧКА ───
function FlipCardBlock({ title, frontImage, accentColor = "var(--blue)", children, minHeight = 340 }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div style={{ perspective: "1200px", marginBottom: 28 }}>
      <div
        onClick={() => setFlipped(!flipped)}        style={{
          position: "relative",
          width: "100%",
          minHeight: minHeight,
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "none",
          cursor: "pointer",
          borderRadius: 12,
        }}
      >
        {/* ЛИЦЕВАЯ СТОРОНА */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          borderRadius: 12, overflow: "hidden",
          background: "linear-gradient(135deg, #f8f4e8 0%, #e8d8c0 100%)",
          border: "2px solid var(--gold)", boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          transform: "translateZ(0)"
        }}>
          {frontImage ? (
            <img
              src={frontImage}
              alt={title}
              style={{ maxHeight: "70%", maxWidth: "90%", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div style={{ width: "80%", height: "60%", background: "rgba(0,112,192,0.05)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12 }}>
              Иллюстрация
            </div>
          )}
          <div style={{ marginTop: 14, fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", letterSpacing: "1px", fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Нажмите для деталей</div>
        </div>

        {/* ОБРАТНАЯ СТОРОНА */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          transform: "rotateY(180deg) translateZ(0)",
          borderRadius: 12, overflow: "hidden",
          background: "rgba(255,255,255,0.98)", border: "1.5px solid rgba(0,112,192,0.25)",
          boxShadow: "0 4px 16px rgba(0,112,192,0.12)", padding: 18,
          display: "flex", flexDirection: "column"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", margin: 0, letterSpacing: "0.6px", fontWeight: 600 }}>{title}</h3>
          </div>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "65vh", fontSize: 14, lineHeight: 1.7, color: "var(--text2)", paddingRight: 4 }}>            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Загрузка профиля...</div>;

  const insights = getProfileInsights(profile);
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("муж") || genderStr.toLowerCase() === "male";

  const meridianInfo = insights.meridian || { name: "—", tip: "" };
  const chronoData = insights.chronoData || { peak: "10:00–14:00", advice: "Пик активности в первой половине дня" };
  const destiny = insights.destiny || { degree: 241, interpretation: "Интеграция опыта" };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => { setIsRefreshing(false); notify?.("✅ Данные обновлены"); }, 800);
  };

  const handleReset = () => {
    if (window.confirm("Вы уверены? Это удалит ваш профиль и вернет к началу настройки.")) {
      setProfile(null);
      notify?.("🗑️ Профиль сброшен");
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>

      {/* 1. АВАТАР → ПЕРЕВОРАЧИВАЕТСЯ В ПРОФИЛЬ */}
      <FlipCardBlock title="Профиль" frontImage={null} accentColor="var(--blue)" minHeight={360}>
        <div style={{ textAlign: "center", marginTop: 10, marginBottom: 16 }}>
          <div style={{ width: 100, height: 100, margin: "0 auto 12px", borderRadius: "50%", overflow: "hidden", border: "2px solid var(--bg)", boxShadow: "0 4px 12px rgba(0,112,192,0.15)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isMale ? <MaleAvatar size={100} /> : <FemaleAvatar size={100} />}
          </div>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--text1)", margin: "0 0 8px 0", letterSpacing: "1.2px", fontWeight: 600 }}>
            {profile.name || "Пользователь"}
          </h2>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <span className="badge bgr" style={{ fontSize: 12, padding: "4px 10px" }}>🎂 {age ?? "—"} лет</span>            {profile.chronotype && <span className="badge bt" style={{ fontSize: 12, padding: "4px 10px" }}>⏱ {profile.chronotype}</span>}
            {insights.zodiac && <span className="badge bm" style={{ fontSize: 12, padding: "4px 10px" }}>♈ {insights.zodiac}</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, padding: "12px 14px", background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--gold)", textAlign: "left" }}>
            <strong style={{ color: "var(--gold-dark)" }}>Сводка:</strong> {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) · {insights.eastern || "—"} ({insights.easternElement || "Вода"}) · Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
          </div>
        </div>
        <InnerAccordion title="Данные аккаунта" defaultOpen={true}>
          <div>ФИО: {profile.fullName || "—"}<br/>Дата рождения: {profile.dob || "—"}<br/>Пол: {profile.gender || "—"}<br/>Хроно-тип: {profile.chronotype || "—"}</div>
        </InnerAccordion>
      </FlipCardBlock>

      {/* 2. ЗАПАДНЫЙ ЗОДИАК */}
      <FlipCardBlock title="Западный Зодиак" frontImage={getFrontImage("western", insights.zodiac)} accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 12, fontWeight: 500 }}>
            <strong style={{ color: "var(--blue)", fontSize: 16 }}>{insights.zodiac || "—"}</strong>{" "}
            <span>({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.</span>
          </p>
          <InnerAccordion title="Сильные стороны" defaultOpen={true}>
            {insights.zodiacStrengths || "Коммуникация, адаптивность, интеллект"}
          </InnerAccordion>
          <InnerAccordion title="Уязвимые зоны">
            {insights.zodiacWeaknesses || "Лёгкие, бронхи, плечи, нервная система"}
          </InnerAccordion>
          <InnerAccordion title="Как использовать">
            <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
              <li>Планируй важные дела на {chronoData.peak || "утро"}</li>
              <li>Избегай многозадачности — фокусируйся на одном деле за раз</li>
              <li>Дыхательные практики укрепляют слабые зоны</li>
              <li>{meridianInfo.tip || "Регулярность питания и режим критичны"}</li>
            </ul>
          </InnerAccordion>
        </div>
      </FlipCardBlock>

      {/* 3. ВОСТОЧНЫЙ ЗНАК */}
      <FlipCardBlock title="Восточный Знак" frontImage={getFrontImage("eastern", insights.eastern)} accentColor="var(--gold)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 12, fontWeight: 500 }}>
            <strong style={{ color: "var(--gold-dark)", fontSize: 16 }}>{insights.eastern || "—"}</strong>{" "}
            <span>({insights.easternElement || "Вода"}).</span>
          </p>
          <InnerAccordion title="Энергетический портрет" defaultOpen={true}>
            {insights.easternTraits || "Честность и терпимость"}. Твоя стихия наделяет тебя глубокой интуицией и способностью видеть скрытые мотивы.
          </InnerAccordion>
          <InnerAccordion title="Кармическая задача">
            {insights.easternKarma || "Научиться говорить 'нет' без чувства вины"}. Выстраивай границы, не теряя эмпатии.
          </InnerAccordion>
          <InnerAccordion title="Рекомендации">            <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
              <li>Используй спады энергии для восстановления</li>
              <li>Доверяй интуиции в финансовых вопросах</li>
              <li>Избегай токсичных связей</li>
              <li>Практикуй водные процедуры для баланса</li>
            </ul>
          </InnerAccordion>
        </div>
      </FlipCardBlock>

      {/* 4. ГРАДУС СУДЬБЫ */}
      <FlipCardBlock title="Градус Судьбы" frontImage={getFrontImage("destiny")} accentColor="var(--gold)">
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 38, color: "var(--gold)", fontWeight: 600, letterSpacing: "2.5px" }}>{destiny.degree || 241}°</div>
          <div style={{ fontFamily: "var(--font-italic)", fontSize: 15, color: "var(--text2)", marginTop: 6, fontStyle: "italic" }}>{destiny.interpretation || "Интеграция опыта"}</div>
        </div>
        <InnerAccordion title="Зона развития" defaultOpen={true}>
          Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла. {destiny.degree < 120 ? "Активное созидание и инициация." : destiny.degree < 240 ? "Структурирование и профессиональный рост." : "Интеграция и передача опыта."}
        </InnerAccordion>
        <InnerAccordion title="Как использовать">
          <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
            <li>Доверяй интуиции, проверяй фактами</li>
            <li>Каждое утро спрашивай: «Какой урок я могу извлечь сегодня?»</li>
            <li>Веди дневник наблюдений</li>
            <li>Избегай рутины, которая не несёт смысла</li>
          </ul>
        </InnerAccordion>
      </FlipCardBlock>

      {/* 5. ХРОНО-ТИП */}
      <FlipCardBlock title="Хроно-тип" frontImage={getFrontImage("chrono", profile.chronotype)} accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 14, fontWeight: 500 }}><strong style={{ color: "var(--blue)", fontSize: 16 }}>{profile.chronotype || "🕊️ Голубь"}</strong></p>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            <div style={{ padding: 12, background: "rgba(45,106,79,0.08)", borderRadius: 8, borderLeft: "3px solid var(--success)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1, marginBottom: 6 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
              <p style={{ margin: 0, fontSize: 13 }}>{chronoData.peak ? `С ${chronoData.peak.split("–")[0]}` : "Утро/День"}. Самые сложные задачи — в это время.</p>
            </div>
            <div style={{ padding: 12, background: "rgba(139,32,32,0.06)", borderRadius: 8, borderLeft: "3px solid var(--error)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1, marginBottom: 6 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
              <p style={{ margin: 0, fontSize: 13 }}>Идеально для рутины, звонков, делегирования. Не планируй важных решений.</p>
            </div>
          </div>
          <InnerAccordion title="Как использовать" defaultOpen={true}>
            <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
              <li>Синхронизируй расписание с биоритмами — КПД +30–40%</li>
              <li>Сложные решения — только в пиковые часы</li>
              <li>Соблюдай режим сна и восстановления</li>
              <li>{chronoData.advice || "Умеренность и баланс — ключ к силе"}</li>
            </ul>          </InnerAccordion>
        </div>
      </FlipCardBlock>

      {/* 6. КНОПКИ УПРАВЛЕНИЯ */}
      <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
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
