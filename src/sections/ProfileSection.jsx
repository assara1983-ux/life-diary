// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";

// ─── БАЗА ДАННЫХ ЦЯЦЗЫ (12 СТАДИЙ) ───
const JIAZI_STAGES = [
  { name: 'Рождение', spheres: { health: 'Иммунитет', career: 'Обучение', relations: 'Семья', spirit: 'Смысл', finance: 'Накопление' }, tips: 'Закладка фундамента.' },
  { name: 'Купание', spheres: { health: 'Нервы', career: 'Поиск пути', relations: 'Связи', spirit: 'Выбор', finance: 'Самостоятельность' }, tips: 'Формирование реакций.' },
  { name: 'Облачение', spheres: { health: 'Гормоны', career: 'Старт', relations: 'Партнёрство', spirit: 'Имидж', finance: 'Доходы' }, tips: 'Публичный выход.' },
  { name: 'Взросление', spheres: { health: 'Энергия', career: 'Рост', relations: 'Союзы', spirit: 'Философия', finance: 'Инвестиции' }, tips: 'Стабилизация.' },
  { name: 'Расцвет', spheres: { health: 'Пик', career: 'Лидерство', relations: 'Связи', spirit: 'Авторитет', finance: 'Капитал' }, tips: 'Максимум сил.' },
  { name: 'Старение', spheres: { health: 'Восстановление', career: 'Мудрость', relations: 'Опыт', spirit: 'Интеграция', finance: 'Сохранение' }, tips: 'Переход.' },
  { name: 'Болезнь', spheres: { health: 'Баланс', career: 'Формат', relations: 'Качество', spirit: 'Очищение', finance: 'Оптимизация' }, tips: 'Пересмотр.' },
  { name: 'Смерть', spheres: { health: 'Терапия', career: 'Уход', relations: 'Прощение', spirit: 'Принятие', finance: 'Распределение' }, tips: 'Отпускание.' },
  { name: 'Хранилище', spheres: { health: 'Покой', career: 'Тень', relations: 'Тишина', spirit: 'Диалог', finance: 'Пассив' }, tips: 'Сохранение Ци.' },
  { name: 'Отдых', spheres: { health: 'Регенерация', career: 'Перерыв', relations: 'Одни', spirit: 'Медитация', finance: 'Экономия' }, tips: 'Восстановление.' },
  { name: 'Зачатие', spheres: { health: 'Подготовка', career: 'Идеи', relations: 'Знакомства', spirit: 'Намерение', finance: 'План' }, tips: 'Новый росток.' },
  { name: 'Созревание', spheres: { health: 'Активация', career: 'Запуск', relations: 'Переговоры', spirit: 'Фокус', finance: 'Капитал' }, tips: 'Новое рождение.' }
];

// ─── НАДЁЖНАЯ ФУНКЦИЯ ПОЛУЧЕНИЯ ПУТИ К ИЛЛЮСТРАЦИИ ───
const getFrontImage = (category, value) => {
  if (!value && category !== 'destiny') return null;
  const raw = String(value).trim().toLowerCase();
  if (category === 'chrono') {
    const map = { 'жаворонок': 'front-chrono-lark.png', 'голубь': 'front-chrono-pigeon.png', 'сова': 'front-chrono-owl.png' };
    for (const [k, v] of Object.entries(map)) {
      if (raw.includes(k)) return `/assets/avatars-icons/${v}`;
    }
    return '/assets/avatars-icons/front-chrono-pigeon.png';
  }
  if (category === 'destiny') return '/assets/avatars-icons/front-destiny.png';
  const paths = {
    western: { 'овен':'front-zodiac-aries.png','телец':'front-zodiac-taurus.png','близнецы':'front-zodiac-gemini.png','рак':'front-zodiac-cancer.png','лев':'front-zodiac-leo.png','дева':'front-zodiac-virgo.png','весы':'front-zodiac-libra.png','скорпион':'front-zodiac-scorpio.png','стрелец':'front-zodiac-sagittarius.png','козерог':'front-zodiac-capricorn.png','водолей':'front-zodiac-aquarius.png','рыбы':'front-zodiac-pisces.png' },
    eastern: { 'крыса':'front-eastern-rat.png','бык':'front-eastern-ox.png','тигр':'front-eastern-tiger.png','кролик':'front-eastern-rabbit.png','дракон':'front-eastern-dragon.png','змея':'front-eastern-snake.png','лошадь':'front-eastern-horse.png','коза':'front-eastern-goat.png','обезьяна':'front-eastern-monkey.png','петух':'front-eastern-rooster.png','собака':'front-eastern-dog.png','свинья':'front-eastern-pig.png' }
  };
  const list = paths[category];
  return list?.[raw] ? `/assets/avatars-icons/${list[raw]}` : null;
};

// ─── ВКЛАДКИ ───
function ProfileTabs({ activeTab, setActiveTab }) {
  const tabs = [{ id: 'main', label: 'ОСНОВНОЙ' }, { id: 'deep', label: 'ГЛУБОКИЙ АНАЛИЗ' }];
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "rgba(0,112,192,0.06)", borderRadius: 8, padding: 4, border: "1px solid var(--line)" }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{          flex: 1, padding: "10px 0", border: "none", borderRadius: 6, cursor: "pointer",
          fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1,
          background: activeTab === tab.id ? "var(--blue)" : "transparent",
          color: activeTab === tab.id ? "#fff" : "var(--text2)",
          transition: "all 0.2s", boxShadow: activeTab === tab.id ? "0 2px 6px rgba(0,112,192,0.2)" : "none"
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── АККОРДЕОН ───
function InnerAccordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10, background: "rgba(0,112,192,0.04)", borderRadius: 8, border: "1px solid rgba(0,112,192,0.15)" }}>
      <div onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{ padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--gold)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>▼</span>
      </div>
      {open && <div style={{ padding: "0 12px 12px", fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>{children}</div>}
    </div>
  );
}

// ─── КАРТОЧКА ───
function FlipCardBlock({ title, frontImage, accentColor = "var(--blue)", children, minHeight = 340 }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: "1200px", marginBottom: 28 }}>
      <div onClick={() => setFlipped(!flipped)} style={{ position: "relative", width: "100%", minHeight, transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)", transform: flipped ? "rotateY(180deg)" : "none", cursor: "pointer", borderRadius: 12 }}>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg, #f8f4e8 0%, #e8d8c0 100%)", border: "2px solid var(--gold)", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "translateZ(0)" }}>
          {frontImage ? <img src={frontImage} alt={title} style={{ maxHeight: "70%", maxWidth: "90%", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }} onError={(e) => e.target.style.display = "none" } /> : <div style={{ width: "80%", height: "60%", background: "rgba(0,112,192,0.05)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12 }}>Иллюстрация</div>}
          <div style={{ marginTop: 14, fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", letterSpacing: "1px", fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Нажмите для деталей</div>
        </div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.98)", border: "1.5px solid rgba(0,112,192,0.25)", boxShadow: "0 4px 16px rgba(0,112,192,0.12)", padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", margin: 0, letterSpacing: "0.6px", fontWeight: 600 }}>{title}</h3>
          </div>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "65vh", fontSize: 14, lineHeight: 1.7, color: "var(--text2)", paddingRight: 4 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('main');

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Загрузка профиля...</div>;

  const insights = getProfileInsights(profile);
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("муж") || genderStr.toLowerCase() === "male";

  const meridianInfo = getMeridianInfo(insights.zodiac);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const destiny = insights.destiny || { degree: 241, interpretation: "Интеграция опыта" };

  // Безопасный расчёт стадии Цзяцзы
  const currentJiaziIndex = age ? Math.floor((age % 60) / 5) % 12 : 0;
  const currentJiaziStage = JIAZI_STAGES[currentJiaziIndex];
  const nextJiaziStage = JIAZI_STAGES[(currentJiaziIndex + 1) % 12];

  const handleRefresh = () => { setIsRefreshing(true); setTimeout(() => { setIsRefreshing(false); notify?.("✅ Данные обновлены"); }, 800); };
  const handleReset = () => { if (window.confirm("Вы уверены? Это удалит ваш профиль и вернет к началу настройки.")) { setProfile(null); notify?.("🗑️ Профиль сброшен"); } };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'main' && (
        <>
          <FlipCardBlock title="Профиль" frontImage={isMale ? '/assets/avatars-icons/male-avatar.png' : '/assets/avatars-icons/female-avatar.png'} accentColor="var(--blue)" minHeight={360}>
            <div style={{ textAlign: "center", marginTop: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--text1)", margin: "0 0 8px 0", letterSpacing: "1.2px", fontWeight: 600 }}>{profile.name || "Пользователь"}</h2>
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
              <div>ФИО: {profile.fullName || "—"}<br/>Дата рождения: {profile.dob || "—"}<br/>Пол: {profile.gender || "—"}<br/>Хроно-тип: {profile.chronotype || "—"}</div>
            </InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="Западный Зодиак" frontImage={getFrontImage("western", insights.zodiac)} accentColor="var(--blue)">
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>              <p style={{ marginBottom: 12, fontWeight: 500 }}><strong style={{ color: "var(--blue)", fontSize: 16 }}>{insights.zodiac || "—"}</strong> <span>({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.</span></p>
              <InnerAccordion title="Сильные стороны" defaultOpen={true}>{insights.zodiacStrengths || "Коммуникация, адаптивность, интеллект"}</InnerAccordion>
              <InnerAccordion title="Уязвимые зоны">{insights.zodiacWeaknesses || "Лёгкие, бронхи, плечи, нервная система"}</InnerAccordion>
              <InnerAccordion title="Как использовать">
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                  <li>Планируй важные дела на {chronoPeaks.focus?.hours || "утро"}</li>
                  <li>Избегай многозадачности</li>
                  <li>Дыхательные практики укрепляют слабые зоны</li>
                </ul>
              </InnerAccordion>
            </div>
          </FlipCardBlock>

          <FlipCardBlock title="Восточный Знак" frontImage={getFrontImage("eastern", insights.eastern)} accentColor="var(--gold)">
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
              <p style={{ marginBottom: 12, fontWeight: 500 }}><strong style={{ color: "var(--gold-dark)", fontSize: 16 }}>{insights.eastern || "—"}</strong> <span>({insights.easternElement || "Вода"}).</span></p>
              <InnerAccordion title="Энергетический портрет" defaultOpen={true}>{insights.easternTraits || "Честность и терпимость"}. Твоя стихия наделяет тебя глубокой интуицией.</InnerAccordion>
              <InnerAccordion title="Кармическая задача">{insights.easternKarma || "Научиться говорить 'нет' без чувства вины"}. Выстраивай границы, не теряя эмпатии.</InnerAccordion>
              <InnerAccordion title="Рекомендации">
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                  <li>Используй спады энергии для восстановления</li>
                  <li>Доверяй интуиции в финансовых вопросах</li>
                  <li>Избегай токсичных связей</li>
                </ul>
              </InnerAccordion>
            </div>
          </FlipCardBlock>

          <FlipCardBlock title="Градус Судьбы" frontImage={getFrontImage("destiny")} accentColor="var(--gold)">
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 38, color: "var(--gold)", fontWeight: 600, letterSpacing: "2.5px" }}>{destiny.degree || 241}°</div>
              <div style={{ fontFamily: "var(--font-italic)", fontSize: 15, color: "var(--text2)", marginTop: 6, fontStyle: "italic" }}>{destiny.interpretation || "Интеграция опыта"}</div>
            </div>
            <InnerAccordion title="Зона развития" defaultOpen={true}>Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла. {destiny.degree < 120 ? "Активное созидание." : destiny.degree < 240 ? "Структурирование роста." : "Интеграция опыта."}</InnerAccordion>
            <InnerAccordion title="Как использовать">
              <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                <li>Доверяй интуиции, проверяй фактами</li>
                <li>Веди дневник наблюдений</li>
              </ul>
            </InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="Хроно-тип" frontImage={getFrontImage("chrono", profile.chronotype)} accentColor="var(--blue)">
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
              <p style={{ marginBottom: 14, fontWeight: 500 }}><strong style={{ color: "var(--blue)", fontSize: 16 }}>{profile.chronotype || "🕊️ Голубь"}</strong></p>
              <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: 12, background: "rgba(45,106,79,0.08)", borderRadius: 8, borderLeft: "3px solid var(--success)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1, marginBottom: 6 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
                  <p style={{ margin: 0, fontSize: 13 }}>{chronoPeaks.focus?.tip || "Самые сложные задачи — в это время."}</p>
                </div>                <div style={{ padding: 12, background: "rgba(139,32,32,0.06)", borderRadius: 8, borderLeft: "3px solid var(--error)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1, marginBottom: 6 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
                  <p style={{ margin: 0, fontSize: 13 }}>Идеально для рутины и делегирования.</p>
                </div>
              </div>
              <InnerAccordion title="Как использовать" defaultOpen={true}>
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                  <li>Синхронизируй расписание с биоритмами — КПД +30–40%</li>
                  <li>Сложные решения — только в пиковые часы</li>
                  <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"}</li>
                </ul>
              </InnerAccordion>
            </div>
          </FlipCardBlock>
        </>
      )}

      {activeTab === 'deep' && (
        <>
          {/* 1. ЖИЗНЕННЫЙ ЦИКЛ (ЦЯЦЗЫ) */}
          <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 18, marginBottom: 24, border: "1px solid var(--line)", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 4, height: 24, background: "var(--blue)", borderRadius: 2 }} />
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>🌊 Жизненный цикл (Цяцзы)</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              <div style={{ padding: 14, background: "#fff", borderRadius: 8, borderLeft: "3px solid var(--gold)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1, marginBottom: 6 }}>◈ ТЕКУЩАЯ СТАДИЯ</div>
                <strong style={{ color: "var(--blue)", fontSize: 15 }}>{currentJiaziStage.name}</strong>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text2)" }}>{currentJiaziStage.tips}</p>
              </div>
              <div style={{ padding: 14, background: "#fff", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1, marginBottom: 6 }}>◈ ПЕРЕХОД К СЛЕДУЮЩЕЙ</div>
                <strong style={{ color: "var(--text1)", fontSize: 15 }}>{nextJiaziStage.name}</strong>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text2)" }}>{nextJiaziStage.tips}</p>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <InnerAccordion title="Сферы жизни в текущей фазе" defaultOpen={true}>
                <div style={{ display: "grid", gap: 8 }}>
                  {Object.entries(currentJiaziStage.spheres).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                      <span style={{ color: "var(--gold-dark)", fontWeight: 600, minWidth: 90 }}>{k.toUpperCase()}:</span><span>{v}</span>
                    </div>
                  ))}
                </div>
              </InnerAccordion>
            </div>
          </div>
          {/* 2. ВЕДИЧЕСКИЙ КАЛЕНДАРЬ */}
          <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 18, marginBottom: 24, border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 4, height: 24, background: "var(--gold)", borderRadius: 2 }} />
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--gold-dark)", margin: 0, letterSpacing: 1 }}>☀️ Ведический календарь</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              <div style={{ padding: 14, background: "#fff", borderRadius: 8, borderLeft: "3px solid var(--success)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1, marginBottom: 6 }}>◈ СОЛНЕЧНЫЙ СЕЗОН & ЦИ</div>
                <strong style={{ color: "var(--blue)", fontSize: 14 }}>{insights.zodiac === 'Близнецы' ? 'Весна/Лето: рост Ян-Ци' : 'Сезонный фон: гармонизация Инь-Ян'}</strong>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text2)" }}>Энергия парит, болезни поднимаются на поверхность. Применяйте методы рассеивания Ци и лёгкие практики.</p>
              </div>
              <div style={{ padding: 14, background: "#fff", borderRadius: 8, borderLeft: "3px solid var(--error)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1, marginBottom: 6 }}>◈ ЛУННЫЙ ФОН & МЕДИЦИНА</div>
                <strong style={{ color: "var(--text1)", fontSize: 14 }}>Запреты по Лунному циклу</strong>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text2)" }}>В дни новолуния/полнолуния организм ослаблен. Избегайте малой хирургии, иглотерапии и агрессивных процедур на коже.</p>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <InnerAccordion title="Планетарный фон & Сань Ша" defaultOpen={false}>
                <p style={{ marginBottom: 8 }}>По системе Рао и китайскому календарю: отслеживайте дни «Ша бедствий» и «Ша ограблений» для вашего годового знака. В эти периоды не начинайте диет, курсов терапии или крупных сделок.</p>
                <p>Благоприятные часы: выбирайте часы с 1–2 благоприятными звёздами (Зелёный Дракон, Нефритовый Чертог, Золотой Замок). Избегайте часов Белого Тигра и Наказания Дня.</p>
              </InnerAccordion>
            </div>
          </div>

          {/* 3. ГЛУБОКИЙ АНАЛИЗ */}
          <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 18, border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 4, height: 24, background: "var(--blue)", borderRadius: 2 }} />
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>🔍 Глубокий анализ профиля</h3>
            </div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 14, lineHeight: 1.7 }}>
              Анализ строится на пересечении трёх систем: <strong>60-фазного цикла Цзяцзы</strong> (жизненные стадии), <strong>ведического календаря</strong> (солнечные/лунные ритмы, сезоны, Сань Ша) и <strong>кн. Рао</strong> (раджайоги, мараки, умиротворение). Ниже — что именно рассчитано и как применять.
            </p>
            <InnerAccordion title="Методология расчёта" defaultOpen={true}>
              <div style={{ display: "grid", gap: 10 }}>
                <div><strong style={{ color: "var(--blue)" }}>Цзяцзы:</strong> Возраст редуцируется по модулю 60 → определяется стадия (0–5, 5–10… 55–60 лет). Каждая стадия задаёт вектор Ци для 5 сфер.</div>
                <div><strong style={{ color: "var(--gold-dark)" }}>Ведический календарь:</strong> Определяется сезонный фон (Ян/Инь Ци), лунные ограничения по декадам, конфликт дней с месяцем, благоприятные/неблагоприятные часы.</div>
                {/* ИСПРАВЛЕНИЕ: Добавлен закрывающий тег </strong> и убраны ** */}
                <div><strong style={{ color: "var(--success)" }}>Рао (Йоги/Мараки):</strong> Управители 1,5,9 домов → благотворные; 3,6,11 → злотворные; 2,8,12 → пагубно-нейтральные. Мараки (2+7) показывают зоны риска.</div>
              </div>
            </InnerAccordion>
            <InnerAccordion title="Синхронизация циклов для вашего профиля">
              <p style={{ marginBottom: 8 }}>Ваша текущая фаза Цзяцзы требует {currentJiaziStage.name === 'Расцвет' ? 'реализации и лидерства' : currentJiaziStage.name === 'Взросление' ? 'стабилизации и долгосрочных проектов' : 'восстановления и аккумулирования ресурсов'}.</p>
              <p style={{ marginBottom: 8 }}>Ведический фон указывает на необходимость {insights.zodiac === 'Близнецы' ? 'баланса речи и дыхательных практик' : 'гармонизации Инь-Ян через режим сна и питание'}.</p>
              <p>Пересечение показывает: благоприятно действовать в пиковые часы биоритмов, избегать агрессивной терапии в лунные запрещённые декады, использовать период для {insights.zodiacStrengths ? 'развития сильных зон' : 'укрепления базы'}.</p>
            </InnerAccordion>
            <InnerAccordion title="Практические рекомендации по применению">
              <ul style={{ margin: "0 0 0 18px", lineHeight: 1.8 }}>                <li>Планируйте важные решения на часы, совпадающие с пиком вашей энергии и благоприятными звёздами часа</li>
                <li>В стадии {currentJiaziStage.name} фокусируйтесь на {currentJiaziStage.spheres.career || 'развитии'} и {currentJiaziStage.spheres.health || 'здоровье'}</li>
                <li>Избегайте курсов лечения в дни угасания Ци и разделителей сезонной энергии</li>
                <li>Для умиротворения мараковых периодов: чтение стотр 108×, благотворительность, осознанное питание</li>
                <li>Отслеживайте конфликт дней с месячным знаком → в эти дни не начинайте нового</li>
              </ul>
            </InnerAccordion>
            <InnerAccordion title="Зоны внимания и профилактики">
              <p style={{ marginBottom: 8 }}>Учитывая знак {insights.zodiac || '—'} и лунные узлы, особое внимание уделите: {meridianInfo.tip || 'регулярности питания и режиму'}. В сезоны перехода (равноденствия/солнцестояния) проводится мягкая коррекция Ци.</p>
              <p>При наличии мараковых планет в активные периоды: минимизируйте риски, делайте чекапы, практикуйте дыхательные и заземляющие техники. Судьба = семя, воля = почва. Вы управляете урожаем.</p>
            </InnerAccordion>
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
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
