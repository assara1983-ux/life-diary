// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";

// ─── ТОЧНЫЕ ПУТИ К ИЛЛЮСТРАЦИЯМ ───
const ZODIAC_IMG = {
  'Овен': '/assets/avatars-icons/zodiac-aries.png',
  'Телец': '/assets/avatars-icons/zodiac-taurus.png',
  'Близнецы': '/assets/avatars-icons/zodiac-gemini.png',
  'Рак': '/assets/avatars-icons/zodiac-cancer.png',
  'Лев': '/assets/avatars-icons/zodiac-leo.png',
  'Дева': '/assets/avatars-icons/zodiac-virgo.png',
  'Весы': '/assets/avatars-icons/zodiac-libra.png',
  'Скорпион': '/assets/avatars-icons/zodiac-scorpio.png',
  'Стрелец': '/assets/avatars-icons/zodiac-sagittarius.png',
  'Козерог': '/assets/avatars-icons/zodiac-capricorn.png',
  'Водолей': '/assets/avatars-icons/zodiac-aquarius.png',
  'Рыбы': '/assets/avatars-icons/zodiac-pisces.png'
};
const EASTERN_IMG = {
  'Крыса': '/assets/avatars-icons/eastern-rat.png',
  'Бык': '/assets/avatars-icons/eastern-ox.png',
  'Тигр': '/assets/avatars-icons/eastern-tiger.png',
  'Кролик': '/assets/avatars-icons/eastern-rabbit.png',
  'Дракон': '/assets/avatars-icons/eastern-dragon.png',
  'Змея': '/assets/avatars-icons/eastern-snake.png',
  'Лошадь': '/assets/avatars-icons/eastern-horse.png',
  'Коза': '/assets/avatars-icons/eastern-goat.png',
  'Обезьяна': '/assets/avatars-icons/eastern-monkey.png',
  'Петух': '/assets/avatars-icons/eastern-rooster.png',
  'Собака': '/assets/avatars-icons/eastern-dog.png',
  'Свинья': '/assets/avatars-icons/eastern-pig.png'
};

// ─── КОМПОНЕНТ: КАРТОЧКА С ФОНОВОЙ ИЛЛЮСТРАЦИЕЙ ───
function ProfileBlock({ title, illustrationSrc, children, accentColor = "var(--blue)" }) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <div style={{
        position: "relative",
        background: "rgba(255, 255, 255, 0.12)", // Практически прозрачный
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1.5px solid rgba(0,112,192,0.3)",
        borderRadius: 12,
        marginBottom: 24,        overflow: "hidden",
        boxShadow: "0 6px 20px rgba(0,112,192,0.12)"
      }}>
        {/* Фоновая иллюстрация: линии выделены сильнее */}
        {illustrationSrc && (
          <img
            src={illustrationSrc}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.38,
              filter: "grayscale(100%) contrast(160%) brightness(95%)",
              mixBlendMode: "multiply",
              zIndex: 0,
              pointerEvents: "none"
            }}
          />
        )}

        {/* Заголовок */}
        <div
          onClick={() => setOpen(!open)}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "16px 20px",
            background: open ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.55)",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(0,112,192,0.2)",
            transition: "background 0.2s"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 5, height: 26, background: accentColor, borderRadius: 3, boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }} />
            <h3 style={{
              fontFamily: "var(--font-head)",
              fontSize: 16,
              color: "var(--text1)",
              margin: 0,
              letterSpacing: "0.6px",
              fontWeight: 600
            }}>
              {title}            </h3>
          </div>
          <div style={{
            fontSize: 18,
            color: "var(--gold)",
            transition: "transform 0.3s",
            transform: open ? "rotate(180deg)" : "rotate(0)",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
          }}>
            ▼
          </div>
        </div>

        {/* Контент */}
        {open && (
          <div style={{
            position: "relative",
            zIndex: 1,
            padding: "20px",
            borderTop: "1px solid rgba(0,112,192,0.2)",
            background: "rgba(255,255,255,0.7)"
          }}>
            {children}
          </div>
        )}
      </div>
    </>
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

  const westernBg = ZODIAC_IMG[insights.zodiac?.trim()] || null;
  const easternBg = EASTERN_IMG[insights.eastern?.trim()] || null;

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
    <div className="page" style={{ position: "relative", paddingBottom: 100 }}>
      
      {/* 1. ФОНОВЫЙ АВАТАР (покрывает верх страницы и карточку) */}
      <div style={{
        position: "absolute",
        top: -100,
        left: "50%",
        transform: "translateX(-50%)",
        width: 380,
        height: 380,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        borderRadius: "50%",
        filter: "drop-shadow(0 8px 24px rgba(0,112,192,0.15))"
      }}>
        {isMale ? <MaleAvatar size={380} /> : <FemaleAvatar size={380} />}
      </div>

      {/* 2. КАРТОЧКА ПРОФИЛЯ (поверх аватара, прозрачная) */}
      <div className="card" style={{
        position: "relative",
        zIndex: 1,
        textAlign: "center",
        padding: "24px 20px",
        borderLeft: "5px solid var(--blue)",
        marginBottom: 32,
        borderRadius: 12,
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 6px 20px rgba(0,112,192,0.12)",
        border: "1.5px solid rgba(0,112,192,0.3)"
      }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: 28,
          color: "var(--text1)",
          margin: "0 0 12px 0",          letterSpacing: "1.5px",
          fontWeight: 600
        }}>
          {profile.name || "Пользователь"}
        </h1>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <span className="badge bgr" style={{ fontSize: 13, padding: "5px 12px", fontWeight: 500 }}>🎂 {age ?? "—"} лет</span>
          {profile.chronotype && (
            <span className="badge bt" style={{ fontSize: 13, padding: "5px 12px", fontWeight: 500 }}>⏱ {profile.chronotype}</span>
          )}
          {insights.zodiac && (
            <span className="badge bm" style={{ fontSize: 13, padding: "5px 12px", fontWeight: 500 }}>♈ {insights.zodiac}</span>
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
          textAlign: "left",
          fontWeight: 450
        }}>
          <strong style={{ color: "var(--gold-dark)" }}>Профиль:</strong>{" "}
          {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) ·{" "}
          {insights.eastern || "—"} ({insights.easternElement || "Вода"}) ·{" "}
          Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
        </div>
      </div>

      {/* 3. ЗАПАДНЫЙ ЗОДИАК */}
      <ProfileBlock title="Западный Зодиак" illustrationSrc={westernBg} accentColor="var(--blue)">
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
          <div style={{ padding: 16, background: "rgba(0,112,192,0.07)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Планируй важные дела на утро</li>
              <li>Избегай многозадачности — фокусируйся на одном деле за раз</li>
              <li>Дыхательные практики укрепляют слабые зоны</li>
            </ul>
          </div>
        </div>
      </ProfileBlock>

      {/* 4. ВОСТОЧНЫЙ ЗНАК */}
      <ProfileBlock title="Восточный Знак" illustrationSrc={easternBg} accentColor="var(--gold)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 16, fontWeight: 500 }}>
            <strong style={{ color: "var(--gold-dark)", fontSize: 17 }}>{insights.eastern || "—"}</strong>{" "}
            <span>({insights.easternElement || "Вода"}).</span>
          </p>
          <div style={{ padding: 16, background: "rgba(200,164,90,0.08)", borderRadius: 10, marginBottom: 16, borderLeft: "4px solid var(--gold)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ ЭНЕРГЕТИЧЕСКИЙ ПОРТРЕТ</div>
            <p style={{ margin: 0, fontSize: 14 }}>{insights.easternTraits || "Честность и терпимость"}. Твоя стихия наделяет тебя глубокой интуицией.</p>
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
            </ul>
          </div>
        </div>
      </ProfileBlock>

      {/* 5. ГРАДУС СУДЬБЫ */}
      <ProfileBlock title="Градус Судьбы" accentColor="var(--gold)">
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
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>              <li>Доверяй интуиции, проверяй фактами</li>
              <li>Каждое утро спрашивай: «Какой урок я могу извлечь сегодня?»</li>
              <li>Веди дневник наблюдений</li>
            </ul>
          </div>
        </div>
      </ProfileBlock>

      {/* 6. ХРОНО-ТИП */}
      <ProfileBlock title="Хроно-тип" accentColor="var(--blue)">
        <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
          <p style={{ marginBottom: 18, fontWeight: 500 }}><strong style={{ color: "var(--blue)", fontSize: 17 }}>{profile.chronotype || "🕊️ Голубь"}</strong></p>
          <div style={{ padding: 16, background: "rgba(0,112,192,0.07)", borderRadius: 10, borderLeft: "4px solid var(--blue)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1.2, marginBottom: 10 }}>◈ КАК ИСПОЛЬЗОВАТЬ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.9 }}>
              <li>Синхронизируй расписание с биоритмами</li>
              <li>Сложные решения — только в пиковые часы</li>
              <li>Провалы энергии — для делегирования и рутины</li>
            </ul>
          </div>
        </div>
      </ProfileBlock>

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
