// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";

// ─── ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: ПОЛУЧЕНИЕ ПУТИ К ИЛЛЮСТРАЦИИ ───
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

// ─── КОМПОНЕНТ: ИНТЕРАКТИВНАЯ ПЕРЕВОРАЧИВАЮЩАЯСЯ КАРТОЧКА ───
function FlipCardBlock({ title, frontImage, accentColor = "var(--blue)", children }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div style={{ perspective: "1000px", marginBottom: 28 }}>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          position: "relative",
          width: "100%",
          minHeight: 300,
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "none",
          cursor: "pointer",
          borderRadius: 12
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
        }}>          {frontImage ? (
            <img src={frontImage} alt={title} style={{ maxHeight: "75%", maxWidth: "90%", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }} onError={(e) => e.target.style.display = "none"} />
          ) : (
            <div style={{ width: "80%", height: "60%", background: "rgba(0,112,192,0.05)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12 }}>Иллюстрация не загружена</div>
          )}
          <div style={{ marginTop: 12, fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", letterSpacing: "1px", fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Нажмите, чтобы развернуть</div>
        </div>

        {/* ОБРАТНАЯ СТОРОНА */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          transform: "rotateY(180deg) translateZ(0)",
          borderRadius: 12, overflow: "hidden",
          background: "rgba(255,255,255,0.96)", border: "1.5px solid rgba(0,112,192,0.25)",
          boxShadow: "0 4px 16px rgba(0,112,192,0.12)", padding: 20,
          display: "flex", flexDirection: "column"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: "0.6px", fontWeight: 600 }}>{title}</h3>
          </div>
          <div style={{ overflowY: "auto", flex: 1, fontSize: 14, lineHeight: 1.7, color: "var(--text2)" }}>
            {children}
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

  const meridianInfo = getMeridianInfo(insights.zodiac);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const destiny = insights.destiny || { degree: 241, interpretation: "Интеграция опыта" };

  const handleRefresh = () => {
    setIsRefreshing(true);    setTimeout(() => { setIsRefreshing(false); notify?.("✅ Данные обновлены"); }, 800);
  };

  const handleReset = () => {
    if (window.confirm("Вы уверены? Это удалит ваш профиль и вернет к началу настройки.")) {
      setProfile(null);
      notify?.("🗑️ Профиль сброшен");
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      
      {/* 1. АВАТАР (центрирован, без изменений) */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div style={{
          width: 140, height: 140, borderRadius: "50%", overflow: "hidden",
          border: "2px solid var(--bg)", boxShadow: "0 6px 20px rgba(0,112,192,0.15), inset 0 0 0 3px rgba(255,255,255,0.6)",
          background: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {isMale ? <MaleAvatar size={140} /> : <FemaleAvatar size={140} />}
        </div>
      </div>

      {/* 2. КАРТОЧКА ПРОФИЛЯ (спущена под аватар) */}
      <div className="card" style={{
        textAlign: "center", padding: "20px 18px", borderLeft: "5px solid var(--blue)",
        marginBottom: 28, borderRadius: 12, background: "linear-gradient(145deg, #ffffff 0%, #f8f4e8 100%)",
        boxShadow: "0 4px 16px rgba(0,112,192,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
        border: "1.5px solid rgba(0,112,192,0.25)"
      }}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 26, color: "var(--text1)", margin: "0 0 12px 0", letterSpacing: "1.5px", fontWeight: 600 }}>
          {profile.name || "Пользователь"}
        </h1>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <span className="badge bgr" style={{ fontSize: 13, padding: "5px 12px", fontWeight: 500 }}>🎂 {age ?? "—"} лет</span>
          {profile.chronotype && <span className="badge bt" style={{ fontSize: 13, padding: "5px 12px", fontWeight: 500 }}>⏱ {profile.chronotype}</span>}
          {insights.zodiac && <span className="badge bm" style={{ fontSize: 13, padding: "5px 12px", fontWeight: 500 }}>♈ {insights.zodiac}</span>}
        </div>
        <div style={{
          fontSize: 14, color: "var(--text2)", lineHeight: 1.7, padding: "14px 18px",
          background: "rgba(0,112,192,0.06)", borderRadius: 10, borderLeft: "4px solid var(--gold)",
          textAlign: "left", fontWeight: 450
        }}>
          <strong style={{ color: "var(--gold-dark)" }}>Профиль:</strong>{" "}
          {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) ·{" "}
          {insights.eastern || "—"} ({insights.easternElement || "Вода"}) ·{" "}
          Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
        </div>
      </div>
      {/* 3. ЗАПАДНЫЙ ЗОДИАК */}
      <FlipCardBlock title="Западный Зодиак" frontImage={getFrontImage("western", insights.zodiac)} accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 16, fontWeight: 500 }}>
            <strong style={{ color: "var(--blue)", fontSize: 17 }}>{insights.zodiac || "—"}</strong>{" "}
            <span>({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.</span>
          </p>
          <div style={{ padding: 16, background: "rgba(45,106,79,0.08)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--success)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1.2, marginBottom: 8 }}>◈ СИЛЬНЫЕ СТОРОНЫ</div>
            <p style={{ margin: 0, fontSize: 14 }}>{insights.zodiacStrengths || "Коммуникация, адаптивность, интеллект"}</p>
          </div>
          <div style={{ padding: 16, background: "rgba(139,32,32,0.06)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--error)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1.2, marginBottom: 8 }}>◈ УЯЗВИМЫЕ ЗОНЫ</div>
            <p style={{ margin: 0, fontSize: 14 }}>{insights.zodiacWeaknesses || "Лёгкие, бронхи, плечи, нервная система"}</p>
          </div>
          <div style={{ padding: 16, background: "rgba(0,112,192,0.07)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Планируй важные дела на утро (пик {chronoPeaks.focus?.hours || "10:00–14:00"})</li>
              <li>Избегай многозадачности — фокусируйся на одном деле за раз</li>
              <li>Дыхательные практики укрепляют слабые зоны</li>
              <li>{meridianInfo.tip || "Регулярность питания и режим критичны"}</li>
            </ul>
          </div>
        </div>
      </FlipCardBlock>

      {/* 4. ВОСТОЧНЫЙ ЗНАК */}
      <FlipCardBlock title="Восточный Знак" frontImage={getFrontImage("eastern", insights.eastern)} accentColor="var(--gold)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 16, fontWeight: 500 }}>
            <strong style={{ color: "var(--gold-dark)", fontSize: 17 }}>{insights.eastern || "—"}</strong>{" "}
            <span>({insights.easternElement || "Вода"}).</span>
          </p>
          <div style={{ padding: 16, background: "rgba(200,164,90,0.08)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ ЭНЕРГЕТИЧЕСКИЙ ПОРТРЕТ</div>
            <p style={{ margin: 0, fontSize: 14 }}>{insights.easternTraits || "Честность и терпимость"}. Твоя стихия наделяет тебя глубокой интуицией и способностью видеть скрытые мотивы.</p>
          </div>
          <div style={{ padding: 16, background: "rgba(200,164,90,0.06)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ КАРМИЧЕСКАЯ ЗАДАЧА</div>
            <p style={{ margin: 0, fontSize: 14 }}>{insights.easternKarma || "Научиться говорить 'нет' без чувства вины"}. Выстраивай границы, не теряя эмпатии.</p>
          </div>
          <div style={{ padding: 16, background: "rgba(0,112,192,0.07)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ РЕКОМЕНДАЦИИ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Используй спады энергии для восстановления</li>
              <li>Доверяй интуиции в финансовых вопросах</li>
              <li>Избегай токсичных связей</li>
            </ul>          </div>
        </div>
      </FlipCardBlock>

      {/* 5. ГРАДУС СУДЬБЫ */}
      <FlipCardBlock title="Градус Судьбы" frontImage={getFrontImage("destiny")} accentColor="var(--gold)">
        <div style={{ textAlign: "center", padding: "10px 0 18px" }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 40, color: "var(--gold)", fontWeight: 600, letterSpacing: "2.5px" }}>{destiny.degree || 241}°</div>
          <div style={{ fontFamily: "var(--font-italic)", fontSize: 16, color: "var(--text2)", marginTop: 8, fontStyle: "italic" }}>{destiny.interpretation || "Интеграция опыта"}</div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <div style={{ padding: 16, background: "rgba(200,164,90,0.08)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ ЗОНА РАЗВИТИЯ</div>
            <p style={{ margin: 0 }}>Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла. {destiny.degree < 120 ? "Активное созидание и инициация." : destiny.degree < 240 ? "Структурирование и профессиональный рост." : "Интеграция и передача опыта."}</p>
          </div>
          <div style={{ padding: 16, background: "rgba(0,112,192,0.07)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Доверяй интуиции, проверяй фактами</li>
              <li>Каждое утро спрашивай: «Какой урок я могу извлечь сегодня?»</li>
              <li>Веди дневник наблюдений</li>
            </ul>
          </div>
        </div>
      </FlipCardBlock>

      {/* 6. ХРОНО-ТИП */}
      <FlipCardBlock title="Хроно-тип" frontImage={getFrontImage("chrono", profile.chronotype)} accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 18, fontWeight: 500 }}><strong style={{ color: "var(--blue)", fontSize: 17 }}>{profile.chronotype || "🕊️ Голубь"}</strong></p>
          <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
            <div style={{ padding: 16, background: "rgba(45,106,79,0.08)", borderRadius: 10, borderLeft: "4px solid var(--success)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1.2, marginBottom: 8 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
              <p style={{ margin: 0, fontSize: 14 }}>{chronoPeaks.focus?.tip || "Самые сложные задачи — в это время. Мозг работает на максимуме."}</p>
            </div>
            <div style={{ padding: 16, background: "rgba(139,32,32,0.06)", borderRadius: 10, borderLeft: "4px solid var(--error)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1.2, marginBottom: 8 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
              <p style={{ margin: 0, fontSize: 14 }}>{chronoPeaks.rest?.tip || "Идеально для рутины, звонков, несрочной почты."}</p>
            </div>
          </div>
          <div style={{ padding: 16, background: "rgba(0,112,192,0.07)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Синхронизируй расписание с биоритмами — КПД +30–40%</li>
              <li>Сложные решения — только в пиковые часы</li>
              <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"}</li>
              {chronoPeaks.meridian_peak && <li>Активный меридиан: {chronoPeaks.meridian_peak}</li>}
            </ul>
          </div>
        </div>      </FlipCardBlock>

      {/* 7. КНОПКИ УПРАВЛЕНИЯ */}
      <div style={{ display: "flex", gap: 14, marginTop: 32 }}>
        <button className="btn btn-primary" onClick={handleRefresh} disabled={isRefreshing} style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}>
          {isRefreshing ? "⏳ Обновление..." : "🔄 Обновить данные"}
        </button>
        <button className="btn btn-ghost" onClick={handleReset} style={{ flex: 1, borderColor: "rgba(139,32,32,0.4)", color: "var(--error)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}>
          🗑️ Сброс профиля
        </button>
      </div>
    </div>
  );
}
