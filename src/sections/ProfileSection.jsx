// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";

// ─── 1. НАДЕЖНАЯ ФУНКЦИЯ ПОЛУЧЕНИЯ ПУТИ К ИЛЛЮСТРАЦИИ ───
const getFrontImage = (category, value) => {
  if (!value && category !== 'destiny') return null;
  const raw = String(value).trim().toLowerCase();

  // 1. Хроно-тип: ищем подстроку (работает даже с эмодзи "🦉 Сова")
  if (category === 'chrono') {
    const chronoMap = {
      'жаворонок': 'front-chrono-lark.png',
      'голубь': 'front-chrono-pigeon.png',
      'сова': 'front-chrono-owl.png'
    };
    for (const [key, file] of Object.entries(chronoMap)) {
      if (raw.includes(key)) return `/assets/avatars-icons/${file}`;
    }
    // Фолбэк, если тип не распознан
    return `/assets/avatars-icons/front-chrono-pigeon.png`;
  }

  // 2. Градус Судьбы: всегда один файл
  if (category === 'destiny') return `/assets/avatars-icons/front-destiny.png`;

  // 3. Зодиак и Восточный: точное совпадение (приводим к нижнему регистру)
  const paths = {
    western: {
      'овен':'front-zodiac-aries.png','телец':'front-zodiac-taurus.png','близнецы':'front-zodiac-gemini.png',
      'рак':'front-zodiac-cancer.png','лев':'front-zodiac-leo.png','дева':'front-zodiac-virgo.png',
      'весы':'front-zodiac-libra.png','скорпион':'front-zodiac-scorpio.png','стрелец':'front-zodiac-sagittarius.png',
      'козерог':'front-zodiac-capricorn.png','водолей':'front-zodiac-aquarius.png','рыбы':'front-zodiac-pisces.png'
    },
    eastern: {
      'крыса':'front-eastern-rat.png','бык':'front-eastern-ox.png','тигр':'front-eastern-tiger.png',
      'кролик':'front-eastern-rabbit.png','дракон':'front-eastern-dragon.png','змея':'front-eastern-snake.png',
      'лошадь':'front-eastern-horse.png','коза':'front-eastern-goat.png','обезьяна':'front-eastern-monkey.png',
      'петух':'front-eastern-rooster.png','собака':'front-eastern-dog.png','свинья':'front-eastern-pig.png'
    }
  };
  const list = paths[category];
  if (list && list[raw]) return `/assets/avatars-icons/${list[raw]}`;
  
  return null; // Если ничего не нашли
};
// ─── 2. ВНУТРЕННИЙ АККОРДЕОН ───
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

// ─── 3. ПЕРЕВОРАЧИВАЮЩАЯСЯ КАРТОЧКА ───
function FlipCardBlock({ title, frontImage, accentColor = "var(--blue)", children, minHeight = 340 }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div style={{ perspective: "1200px", marginBottom: 28 }}>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          position: "relative", width: "100%", minHeight: minHeight,
          transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "none", cursor: "pointer", borderRadius: 12
        }}
      >
        {/* ЛИЦЕВАЯ СТОРОНА */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden",
          background: "linear-gradient(135deg, #f8f4e8 0%, #e8d8c0 100%)", border: "2px solid var(--gold)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", transform: "translateZ(0)"
        }}>
          {frontImage ? (
            <img
              src={frontImage}
              alt={title}
              style={{ maxHeight: "70%", maxWidth: "90%", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }}
              // Отладка: если картинка битая, скрываем её, но логический фолбэк ниже обработает это
              onError={(e) => { 
                console.log(`Ошибка загрузки: ${frontImage}`);                 e.target.style.display = "none"; 
              }}
            />
          ) : (
             // Отладочная заглушка: покажет название файла, который код пытался найти
             <div style={{ 
               width: "80%", height: "60%", background: "rgba(0,112,192,0.05)", borderRadius: 8, 
               display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
               color: "var(--text3)", fontSize: 11, padding: "10px", textAlign: "center" 
             }}>
               <div style={{ fontWeight: "bold", marginBottom: 4 }}>Файл не найден</div>
               <div style={{ fontFamily: "monospace", opacity: 0.8 }}>
                 {category === 'destiny' ? 'front-destiny.png' : 
                  category === 'chrono' ? 'front-chrono-*.png' : 
                  `front-${category}-${value?.toLowerCase()}.png`}
               </div>
             </div>
          )}
          <div style={{ marginTop: 14, fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", letterSpacing: "1px", fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Нажмите для деталей</div>
        </div>

        {/* ОБРАТНАЯ СТОРОНА */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0)",
          borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.98)", border: "1.5px solid rgba(0,112,192,0.25)",
          boxShadow: "0 4px 16px rgba(0,112,192,0.12)", padding: 18, display: "flex", flexDirection: "column"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", margin: 0, letterSpacing: "0.6px", fontWeight: 600 }}>{title}</h3>
          </div>
          {/* Прокручиваемый контейнер для контента */}
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "65vh", fontSize: 14, lineHeight: 1.7, color: "var(--text2)", paddingRight: 4 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Загрузка профиля...</div>;

  const insights = getProfileInsights(profile);  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("муж") || genderStr.toLowerCase() === "male";

  const meridianInfo = getMeridianInfo(insights.zodiac);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const destiny = insights.destiny || { degree: 241, interpretation: "Интеграция опыта" };

  // Пути к иллюстрациям
  const avatarFrontImage = isMale 
    ? '/assets/avatars-icons/male-avatar.png' 
    : '/assets/avatars-icons/female-avatar.png';

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
      <FlipCardBlock 
        title="Профиль" 
        frontImage={avatarFrontImage} 
        accentColor="var(--blue)" 
        minHeight={360} // Высота достаточна для аватара
      >
        <div style={{ textAlign: "center", marginTop: 10, marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--text1)", margin: "0 0 8px 0", letterSpacing: "1.2px", fontWeight: 600 }}>
            {profile.name || "Пользователь"}
          </h2>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <span className="badge bgr" style={{ fontSize: 12, padding: "4px 10px" }}>🎂 {age ?? "—"} лет</span>
            {profile.chronotype && <span className="badge bt" style={{ fontSize: 12, padding: "4px 10px" }}>⏱ {profile.chronotype}</span>}
            {insights.zodiac && <span className="badge bm" style={{ fontSize: 12, padding: "4px 10px" }}>♈ {insights.zodiac}</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, padding: "12px 14px", background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--gold)", textAlign: "left" }}>
            <strong style={{ color: "var(--gold-dark)" }}>Сводка:</strong> {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) · {insights.eastern || "—"} ({insights.easternElement || "Вода"}) · Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
          </div>
        </div>
        <InnerAccordion title="Данные аккаунта" defaultOpen={true}>
          <div>ФИО: {profile.fullName || "—"}<br/>Дата рождения: {profile.dob || "—"}<br/>Пол: {profile.gender || "—"}<br/>Хроно-тип: {profile.chronotype || "—"}</div>        </InnerAccordion>
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
              <li>Планируй важные дела на {chronoPeaks.focus?.hours || "утро"}</li>
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
          <InnerAccordion title="Рекомендации">
            <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
              <li>Используй спады энергии для восстановления</li>
              <li>Доверяй интуиции в финансовых вопросах</li>
              <li>Избегай токсичных связей</li>
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
              <p style={{ margin: 0, fontSize: 13 }}>{chronoPeaks.focus?.tip || "Самые сложные задачи — в это время."}</p>
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
              <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"}</li>
              {chronoPeaks.meridian_peak && <li>Активный меридиан: {chronoPeaks.meridian_peak}</li>}
            </ul>
          </InnerAccordion>
        </div>
      </FlipCardBlock>

      {/* 6. КНОПКИ УПРАВЛЕНИЯ */}
      <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
        <button
          className="btn btn-primary"
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}        >
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
