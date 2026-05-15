// src/sections/ProfileSection.jsx
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";

// ─── ДАННЫЕ ИЗ БАЗЫ ЗНАНИЙ (ЦИКЛ ЦЯЦЗЫ & ВЕДИЧЕСКИЙ КАЛЕНДАРЬ) ───
const JIAZI_STAGES = [
  { name: 'Рождение', spheres: { health: 'Иммунитет, конституция', career: 'Обучение, адаптация', relations: 'Семья, корни', spirit: 'Поиск смысла', finance: 'Накопление' }, tips: 'Закладка фундамента. Избегай перегрузок.' },
  { name: 'Купание', spheres: { health: 'Нервная система, адаптация', career: 'Поиск пути', relations: 'Первые связи', spirit: 'Духовный выбор', finance: 'Зависимость → самостоятельность' }, tips: 'Формирование реакций. Учитесь говорить "нет".' },
  { name: 'Облачение', spheres: { health: 'Гормоны, кожа', career: 'Карьерный старт', relations: 'Партнёрство', spirit: 'Самоидентификация', finance: 'Первые доходы' }, tips: 'Публичный выход. Формируйте имидж осознанно.' },
  { name: 'Взросление', spheres: { health: 'Энергия, выносливость', career: 'Проф. рост', relations: 'Стабильные союзы', spirit: 'Философия жизни', finance: 'Инвестиции' }, tips: 'Стабилизация. Долгосрочные проекты приносят плоды.' },
  { name: 'Расцвет', spheres: { health: 'Пик тонуса', career: 'Лидерство', relations: 'Глубокие связи', spirit: 'Духовный авторитет', finance: 'Капитал' }, tips: 'Пик сил. Реализуйте главные цели, но берегите нервную систему.' },
  { name: 'Старение', spheres: { health: 'Восстановление', career: 'Наставничество', relations: 'Передача опыта', spirit: 'Интеграция', finance: 'Сохранение' }, tips: 'Переход. Мудрость важнее скорости.' },
  { name: 'Болезнь', spheres: { health: 'Терапия, баланс', career: 'Смена формата', relations: 'Качество связей', spirit: 'Очищение', finance: 'Оптимизация' }, tips: 'Пересмотр приоритетов. Профилактика критична.' },
  { name: 'Смерть', spheres: { health: 'Глубокая терапия', career: 'Уход с позиций', relations: 'Прощение', spirit: 'Принятие', finance: 'Распределение' }, tips: 'Завершение цикла. Отпускайте старое.' },
  { name: 'Хранилище', spheres: { health: 'Покой, медитация', career: 'Творчество в тени', relations: 'Тихие связи', spirit: 'Внутренний диалог', finance: 'Пассив' }, tips: 'Сохранение Ци. Накапливайте ресурсы для нового цикла.' },
  { name: 'Отдых', spheres: { health: 'Регенерация', career: 'Перерыв', relations: 'Одиночество', spirit: 'Медитация', finance: 'Экономия' }, tips: 'Полное восстановление. Не форсируйте события.' },
  { name: 'Зачатие', spheres: { health: 'Подготовка', career: 'Идеи', relations: 'Новые знакомства', spirit: 'Намерение', finance: 'Планирование' }, tips: 'Скрытый росток. Задавайте вектор будущего цикла.' },
  { name: 'Созревание', spheres: { health: 'Активация', career: 'Запуск', relations: 'Переговоры', spirit: 'Фокус', finance: 'Стартовый капитал' }, tips: 'Подготовка к новому рождению. Действуйте решительно.' }
];

const VEDIC_SEASONS = [
  { name: 'Начало весны', qi: 'Ян растёт, Инь убывает', health: 'Иммунитет борется с холодом', tips: 'Устраняйте ветер и холод. Лёгкие и печень в фокусе.' },
  { name: 'Весеннее равноденствие', qi: 'Ян = Инь, мягкая погода', health: 'Болезни активируются', tips: 'Устраняйте патогены. Не перегружайте ЖКТ.' },
  { name: 'Начало лета', qi: 'Ян парит, бурный рост', health: 'Болезни поднимаются на поверхность', tips: 'Рассеивайте Ци. Потогонные и лёгкие практики.' },
  { name: 'Летнее солнцестояние', qi: 'Огонь, жар, зной', health: 'Жар, истощение Инь', tips: 'Очищение, укрепление Инь. Берегите сердце и сосуды.' },
  { name: 'Начало осени', qi: 'Ян спускается вниз', health: 'Заболевания наполовину внутри', tips: 'Гармонизация Инь-Ян. Укрепляйте селезёнку.' },
  { name: 'Осеннее равноденствие', qi: 'Инь нарастает, прохладно', health: 'Ян ослабевает', tips: 'Тонизация, питание Ян. Берегите почки и спину.' },
  { name: 'Начало зимы', qi: 'Ян собирается внутри', health: 'Болезни уходят внутрь', tips: 'Внутренняя гармонизация. Умеренное питание.' },
  { name: 'Зимнее солнцестояние', qi: 'Инь расцветает, холод макс.', health: 'Цзан-органы под угрозой', tips: 'Согревание, прижигание. Не переохлаждайтесь.' }
];

// ─── ГЕНЕРАЦИЯ ДАННЫХ ПО ГОДАМ ───
const generateYearInsights = (year, dob) => {
  const jiaziStage = JIAZI_STAGES[(year % 60) % 12];
  const vedicSeason = VEDIC_SEASONS[Math.floor((year * 12) / 12) % 8];
  return {
    year,
    jiazi: jiaziStage,
    vedic: vedicSeason,
    warnings: year % 5 === 0 ? 'Переходная фаза. Осторожность в планах.' : year % 7 === 0 ? 'Кармическая проверка. Анализируйте прошлое.' : 'Стабильный период. Действуйте последовательно.',
    recommendations: `Акцент на ${Object.values(jiaziStage.spheres).join(', ')}. Сезон: ${vedicSeason.qi}. ${vedicSeason.tips}`
  };
};

// ─── ВКЛАДКИ ───
function ProfileTabs({ activeTab, setActiveTab }) {
  const tabs = [    { id: 'main', label: 'ОСНОВНОЙ' },
    { id: 'deep', label: 'ГЛУБОКИЙ АНАЛИЗ' },
    { id: 'jiazi', label: 'ЖИЗНЕННЫЙ ЦИКЛ' },
    { id: 'vedic', label: 'ВЕДИЧЕСКИЙ КАЛЕНДАРЬ' }
  ];
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "rgba(0,112,192,0.06)", borderRadius: 8, padding: 4, border: "1px solid var(--line)", flexWrap: "wrap" }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
          flex: 1, minWidth: 120, padding: "10px 0", border: "none", borderRadius: 6, cursor: "pointer",
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

// ─── ВНУТРЕННИЙ АККОРДЕОН ───
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

// ─── ПЕРЕВОРАЧИВАЮЩАЯСЯ КАРТОЧКА ───
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
            <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", margin: 0, letterSpacing: "0.6px", fontWeight: 600 }}>{title}</h3>
          </div>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "65vh", fontSize: 14, lineHeight: 1.7, color: "var(--text2)", paddingRight: 4 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── МОДАЛЬНОЕ ОКНО ГОДА ───
function YearModal({ yearData, onClose, isVedic }) {
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "90%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto",
        background: "rgba(255,255,255,0.96)", borderRadius: 12, padding: 24,
        border: "1.5px solid rgba(0,112,192,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        position: "relative"
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text3)" }}>✕</button>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", margin: "0 0 16px 0", letterSpacing: "1px" }}>Год {yearData.year}</h2>
        
        <InnerAccordion title="Фаза Цзяцзы" defaultOpen={true}>
          <strong>{yearData.jiazi.name}</strong> — {yearData.jiazi.tips}<br/>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {Object.entries(yearData.jiazi.spheres).map(([k, v]) => <div key={k} style={{ display: "flex", gap: 8, fontSize: 13 }}><span style={{ color: "var(--gold-dark)", fontWeight: 500, minWidth: 90 }}>{k.toUpperCase()}:</span><span>{v}</span></div>)}
          </div>
        </InnerAccordion>

        <InnerAccordion title="Ведический сезон">
          <strong>{yearData.vedic.name}</strong> — {yearData.vedic.qi}<br/>
          <div style={{ marginTop: 6, fontSize: 13 }}>⚠️ {yearData.vedic.health}</div>
          <div style={{ marginTop: 6, fontSize: 13 }}>💡 {yearData.vedic.tips}</div>
        </InnerAccordion>

        <InnerAccordion title="Предупреждения & Рекомендации">
          <div style={{ padding: 10, background: "rgba(139,32,32,0.06)", borderRadius: 6, borderLeft: "3px solid var(--error)", marginBottom: 10 }}>⚠️ {yearData.warnings}</div>
          <div style={{ padding: 10, background: "rgba(0,112,192,0.06)", borderRadius: 6, borderLeft: "3px solid var(--blue)" }}>🧭 {yearData.recommendations}</div>
        </InnerAccordion>
      </div>
    </div>
  );
}
// ─── ТРАЙМЛАЙН С ФОНОВЫМ SVG ───
function CycleTimeline({ dob, isVedic, onYearSelect }) {
  const age = dob ? Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
  const currentYear = Math.min(age, 100);
  const years = useMemo(() => Array.from({ length: 21 }, (_, i) => i * 5), []);

  return (
    <div style={{ position: "relative", padding: "20px 0", overflow: "hidden", borderRadius: 12, background: "rgba(255,255,255,0.8)", border: "1px solid var(--line)" }}>
      {/* ФОНОВЫЙ SVG-ЧЕРТЕЖ */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.6 }} viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          <style>@keyframes flow-bg { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-40} }</style>
        </defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="0.5"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)"/>
        <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(0,112,192,0.2)" strokeWidth="1.5" strokeDasharray="6 4"/>
        {[...Array(11)].map((_, i) => <line key={i} x1={i * 80} y1="20" x2={i * 80} y2="180" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5"/> )}
        <path d="M 0 100 Q 100 40 200 100 T 400 100 T 600 100 T 800 100" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="8 4" style={{ animation: "flow-bg 6s linear infinite" }}/>
      </svg>

      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>{isVedic ? 'Ведический календарь: годовые циклы' : 'Жизненный цикл Цзяцзы: 0–100 лет'}</h3>
        <span className="badge bgr" style={{ fontSize: 11, padding: "4px 10px" }}>Текущий: {currentYear} лет</span>
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 8, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", minWidth: "800px", gap: 0, position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "var(--line)", transform: "translateY(-50%)" }} />
          {years.map((y, i) => {
            const isActive = y === currentYear;
            const isPast = y < currentYear;
            return (
              <div key={y} onClick={() => onYearSelect(y)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", zIndex: 2 }}>
                <div style={{
                  width: isActive ? 18 : 14, height: isActive ? 18 : 14, borderRadius: "50%",
                  background: isActive ? "var(--gold)" : isPast ? "var(--blue)" : "#fff",
                  border: `2px solid ${isActive ? "var(--gold)" : "var(--blue)"}`,
                  transition: "all 0.2s", boxShadow: isActive ? "0 0 10px var(--gold)" : "none",
                  transform: isActive ? "scale(1.1)" : "scale(1)"
                }} />
                <div style={{ fontSize: 10, color: isActive ? "var(--blue)" : "var(--text3)", marginTop: 8, fontFamily: "var(--font-mono)", fontWeight: isActive ? 600 : 400 }}>{y}</div>
              </div>
            );
          })}
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 12, fontFamily: "var(--font-mono)" }}>Нажмите на любой год для детализации</p>
    </div>  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  const [selectedYear, setSelectedYear] = useState(null);

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Загрузка профиля...</div>;

  const insights = getProfileInsights(profile);
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("муж") || genderStr.toLowerCase() === "male";

  const meridianInfo = getMeridianInfo(insights.zodiac);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const destiny = insights.destiny || { degree: 241, interpretation: "Интеграция опыта" };

  const handleRefresh = () => { setIsRefreshing(true); setTimeout(() => { setIsRefreshing(false); notify?.("✅ Данные обновлены"); }, 800); };
  const handleReset = () => { if (window.confirm("Вы уверены? Это удалит ваш профиль и вернет к началу настройки.")) { setProfile(null); notify?.("🗑️ Профиль сброшен"); } };
  const handleYearSelect = (y) => setSelectedYear(generateYearInsights(y, profile.dob));

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

          <FlipCardBlock title="Западный Зодиак" frontImage={null} accentColor="var(--blue)">
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

          <FlipCardBlock title="Восточный Знак" frontImage={null} accentColor="var(--gold)">
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

          <FlipCardBlock title="Градус Судьбы" frontImage={null} accentColor="var(--gold)">
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

          <FlipCardBlock title="Хроно-тип" frontImage={null} accentColor="var(--blue)">
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
          <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 16, marginBottom: 24, border: "1px solid var(--line)", position: "relative" }}>
            <div style={{ height: 120, marginBottom: 16, borderRadius: 8, overflow: "hidden", position: "relative", background: "rgba(255,255,255,0.5)" }}>
              <img src="/assets/avatars-icons/front-jiazi-cycle.svg" alt="Цикл Цзяцзы" style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.9 }} onError={(e) => e.target.style.display = "none" } />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>Цикл Цзяцзы: 12 стадий жизни</h3>
              <span className="badge bgr" style={{ fontSize: 10, padding: "3px 8px" }}>Текущая: {JIAZI_STAGES[0].name}</span>
            </div>
            <div style={{ overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
              <div style={{ display: "flex", minWidth: "600px", gap: 4, position: "relative" }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "var(--line)", transform: "translateY(-50%)" }} />
                {JIAZI_STAGES.map((s, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", zIndex: 1 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: i === 0 ? "var(--gold)" : "var(--blue)", border: "2px solid var(--blue)", transition: "all 0.2s" }} />
                    <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 6, fontFamily: "var(--font-mono)" }}>{i * 5}–{i * 5 + 5}</div>
                  </div>
                ))}
              </div>
            </div>
            <InnerAccordion title="Детали стадии" defaultOpen={true}>
              <p style={{ fontStyle: "italic" }}>{JIAZI_STAGES[0].desc}</p>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {Object.entries(JIAZI_STAGES[0].spheres).map(([key, val]) => (
                  <div key={key} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                    <span style={{ color: "var(--gold-dark)", fontWeight: 600, minWidth: 90 }}>{key.toUpperCase()}:</span><span>{val}</span>
                  </div>
                ))}
              </div>
            </InnerAccordion>
          </div>
          <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 16, border: "1px solid var(--line)", position: "relative" }}>            <div style={{ height: 120, marginBottom: 16, borderRadius: 8, overflow: "hidden", position: "relative", background: "rgba(255,255,255,0.5)" }}>
              <img src="/assets/avatars-icons/front-vedic-focus.svg" alt="Ведический фокус" style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.9 }} onError={(e) => e.target.style.display = "none" } />
            </div>
            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: "0 0 12px 0", letterSpacing: 1 }}>Ведический Паспорт</h3>
            <InnerAccordion title="Раджайоги (Возвышение)" defaultOpen={true}>Комбинации управителей Кендр и Трикун. Потенциал успеха через соединение или аспект.</InnerAccordion>
            <InnerAccordion title="Планетарный фокус">Дружеские планеты: {insights.zodiac === 'Близнецы' ? 'Меркурий, Венера, Сатурн' : '—'}. Развивайте их сферы.</InnerAccordion>
            <InnerAccordion title="Кармические вызовы (Мараки)">Управители 2 и 7 домов. Практика: Мритьюнджая-мантра 108×, благотворительность.</InnerAccordion>
          </div>
        </>
      )}

      {activeTab === 'jiazi' && (
        <CycleTimeline dob={profile.dob} isVedic={false} onYearSelect={handleYearSelect} />
      )}

      {activeTab === 'vedic' && (
        <CycleTimeline dob={profile.dob} isVedic={true} onYearSelect={handleYearSelect} />
      )}

      <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
        <button className="btn btn-primary" onClick={handleRefresh} disabled={isRefreshing} style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}>
          {isRefreshing ? "⏳ Обновление..." : "🔄 Обновить данные"}
        </button>
        <button className="btn btn-ghost" onClick={handleReset} style={{ flex: 1, borderColor: "rgba(139,32,32,0.4)", color: "var(--error)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}>
          🗑️ Сброс профиля
        </button>
      </div>

      {selectedYear && <YearModal yearData={selectedYear} onClose={() => setSelectedYear(null)} />}
    </div>
  );
        }
