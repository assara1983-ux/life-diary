// src/sections/ProfileSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";

// ─── БАЗА ДАННЫХ ЦЯЦЗЫ (12 СТАДИЙ) ───
const JIAZI_STAGES = [
  { name: 'Рождение', spheres: { health: 'Иммунитет, конституция', career: 'Обучение, адаптация', relations: 'Семья, корни', spirit: 'Поиск смысла', finance: 'Накопление' }, tips: 'Закладка фундамента. Избегай перегрузок.', critical: 'Формирование базовых реакций.' },
  { name: 'Купание', spheres: { health: 'Нервная система, адаптация', career: 'Поиск пути', relations: 'Первые связи', spirit: 'Духовный выбор', finance: 'Зависимость → самостоятельность' }, tips: 'Формирование реакций. Учитесь говорить "нет".', critical: 'Эмоциональные тесты, создание комплексов.' },
  { name: 'Облачение', spheres: { health: 'Гормоны, кожа', career: 'Карьерный старт', relations: 'Партнёрство', spirit: 'Самоидентификация', finance: 'Первые доходы' }, tips: 'Публичный выход. Формируйте имидж осознанно.', critical: 'Риск чужих обёрток и непродуманных связей.' },
  { name: 'Взросление', spheres: { health: 'Энергия, выносливость', career: 'Проф. рост', relations: 'Стабильные союзы', spirit: 'Философия жизни', finance: 'Инвестиции' }, tips: 'Стабилизация. Долгосрочные проекты приносят плоды.', critical: 'Переход от экспериментов к ответственности.' },
  { name: 'Расцвет', spheres: { health: 'Пик тонуса', career: 'Лидерство', relations: 'Глубокие связи', spirit: 'Духовный авторитет', finance: 'Капитал' }, tips: 'Пик сил. Реализуй главные цели, но береги нервную систему.', critical: 'Риск выгорания при игнорировании восстановления.' },
  { name: 'Старение', spheres: { health: 'Восстановление', career: 'Наставничество', relations: 'Передача опыта', spirit: 'Интеграция', finance: 'Сохранение' }, tips: 'Переход. Мудрость важнее скорости.', critical: 'Начало упадка энергии Ци. Делегируй.' },
  { name: 'Болезнь', spheres: { health: 'Терапия, баланс', career: 'Смена формата', relations: 'Качество связей', spirit: 'Очищение', finance: 'Оптимизация' }, tips: 'Пересмотр приоритетов. Профилактика критична.', critical: 'Период слабости. Осторожность в действиях.' },
  { name: 'Смерть', spheres: { health: 'Глубокая терапия', career: 'Уход с позиций', relations: 'Прощение', spirit: 'Принятие', finance: 'Распределение' }, tips: 'Завершение цикла. Отпускай старое.', critical: 'Кризис идентичности при цеплянии за прошлое.' },
  { name: 'Хранилище', spheres: { health: 'Покой, медитация', career: 'Творчество в тени', relations: 'Тихие связи', spirit: 'Внутренний диалог', finance: 'Пассив' }, tips: 'Сохранение Ци. Накапливай ресурсы для нового цикла.', critical: 'Фаза накопления. Действуй тихо и глубоко.' },
  { name: 'Отдых', spheres: { health: 'Регенерация', career: 'Перерыв', relations: 'Одиночество', spirit: 'Медитация', finance: 'Экономия' }, tips: 'Полное восстановление. Не форсируй события.', critical: 'Принудительный перерыв для избежания сбоев.' },
  { name: 'Зачатие', spheres: { health: 'Подготовка', career: 'Идеи', relations: 'Новые знакомства', spirit: 'Намерение', finance: 'Планирование' }, tips: 'Скрытый росток. Задавай вектор будущего цикла.', critical: 'Формулирование намерений. Решение о запуске.' },
  { name: 'Созревание', spheres: { health: 'Активация', career: 'Запуск', relations: 'Переговоры', spirit: 'Фокус', finance: 'Стартовый капитал' }, tips: 'Подготовка к новому рождению. Действуй решительно.', critical: 'Момент истины для реализации задуманного.' }
];

// ─── getFrontImage ───
const getFrontImage = (category, value) => {
  if (!value && category !== 'destiny') return null;
  const raw = String(value).trim().toLowerCase();
  if (category === 'chrono') {
    const map = { 'жаворонок': 'front-chrono-lark.png', 'голубь': 'front-chrono-pigeon.png', 'сова': 'front-chrono-owl.png' };
    for (const [k, v] of Object.entries(map)) { if (raw.includes(k)) return `/assets/avatars-icons/${v}`; }
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

const getSphereColor = (sphere) => {
  switch(sphere) {
    case 'health': return '#2d6a4f';
    case 'career': return '#0070c0';
    case 'relations': return '#e8556d';
    case 'spirit': return '#b882e8';
    case 'finance': return '#c8a45a';
    default: return '#ccc';
  }
};

// ─── ВКЛАДКИ ───
function ProfileTabs({ activeTab, setActiveTab }) {
  const tabs = [{ id: 'main', label: 'ОСНОВНОЙ' }, { id: 'deep', label: 'ГЛУБОКИЙ АНАЛИЗ' }];
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "rgba(0,112,192,0.06)", borderRadius: 8, padding: 4, border: "1px solid var(--line)" }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
          flex: 1, padding: "10px 0", border: "none", borderRadius: 6, cursor: "pointer",
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

// ─── FLIPCARD ───
function FlipCardBlock({ title, frontImage, accentColor = "var(--blue)", children, minHeight = 340, frontContent }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: "1200px", marginBottom: 28 }}>
      <div onClick={() => setFlipped(!flipped)} style={{ position: "relative", width: "100%", minHeight, transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)", transform: flipped ? "rotateY(180deg)" : "none", cursor: "pointer", borderRadius: 12 }}>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg, #f8f4e8 0%, #e8d8c0 100%)", border: "2px solid var(--gold)", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {frontImage ? <img src={frontImage} alt={title} style={{ maxHeight: "70%", maxWidth: "90%", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }} onError={(e) => e.target.style.display = "none"} /> : null}
          {frontContent}
        </div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.98)", border: "1.5px solid rgba(0,112,192,0.25)", boxShadow: "0 4px 16px rgba(0,112,192,0.12)", padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2 }} />
            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", margin: 0, letterSpacing: "0.6px", fontWeight: 600 }}>{title}</h3>
          </div>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "65vh", fontSize: 14, lineHeight: 1.7, color: "var(--text2)", paddingRight: 4 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── YearModal ───
function YearModal({ year, currentAge, onClose }) {
  const stageIndex = Math.floor((year % 60) / 5) % 12;
  const stage = JIAZI_STAGES[stageIndex];
  const isCurrent = year === currentAge;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: 620, maxHeight: "85vh", overflowY: "auto", background: "rgba(255,255,255,0.98)", borderRadius: 12, padding: 24, border: "1.5px solid rgba(0,112,192,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text3)" }}>✕</button>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", margin: "0 0 16px 0" }}>
          Период {year} лет {isCurrent ? '(текущий)' : year < currentAge ? '(прошлый)' : '(будущий)'}
        </h2>
        <InnerAccordion title="Фаза Цзяцзы и значение периода" defaultOpen={true}>
          <strong style={{ color: "var(--blue)", fontSize: 15 }}>{stage.name}</strong>
          <p style={{ margin: "8px 0", fontSize: 14 }}>{stage.tips}</p>
          <div style={{ marginTop: 10, padding: 10, background: "rgba(139,32,32,0.06)", borderRadius: 6, borderLeft: "3px solid var(--error)" }}>
            <strong style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)" }}>⚠️ КРИТИЧЕСКАЯ ТОЧКА</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>{stage.critical}</p>
          </div>
        </InnerAccordion>
        <InnerAccordion title="Разбор по сферам жизни">
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(stage.spheres).map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                <span style={{ color: "var(--gold-dark)", fontWeight: 600, minWidth: 90 }}>{k.toUpperCase()}: </span> <span>{v}</span>
              </div>
            ))}
          </div>
        </InnerAccordion>
      </div>
    </div>
  );
}

// ─── CycleTimeline (полный оригинальный) ───
function CycleTimeline({ dob, onYearSelect }) {
  const age = useMemo(() => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let ageVal = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) ageVal--;
    return ageVal;
  }, [dob]);

  const years = useMemo(() => Array.from({ length: 21 }, (_, i) => i * 5), []);
  const [hoverYear, setHoverYear] = useState(null);

  const stagePower = {
    health: [30, 40, 55, 70, 90, 80, 60, 40, 35, 45, 55, 65],
    career: [20, 35, 50, 70, 90, 75, 55, 35, 40, 55, 70, 80],
    relations: [40, 50, 60, 70, 80, 90, 70, 50, 60, 70, 80, 90],
    spirit: [90, 80, 70, 60, 50, 60, 80, 95, 85, 75, 65, 55],
    finance: [10, 30, 50, 70, 80, 70, 50, 30, 40, 60, 80, 95]
  };

  const getChartData = (sphere) => {
    const data = stagePower[sphere];
    const points = [];
    for (let i = 0; i < 20; i++) {
      const idx = (i / 20) * 12;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx) % 12;
      const frac = idx - lower;
      const val = data[lower] + (data[upper] - data[lower]) * frac;
      points.push({ x: i, y: val });
    }
    return points;
  };

  const width = 800;
  const height = 200;
  const paddingX = 40;
  const paddingY = 20;
  const graphWidth = width - 2 * paddingX;
  const graphHeight = height - 2 * paddingY;

  const getScaledY = (val) => graphHeight - (val / 100) * graphHeight + paddingY;
  const spheres = ['health', 'career', 'relations', 'spirit', 'finance'];

  return (
    <div style={{ position: "relative", padding: "20px 0", overflow: "hidden", borderRadius: 12, background: "rgba(255,255,255,0.8)", border: "1px solid var(--line)", marginBottom: 24 }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.6 }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {[0, 25, 50, 75, 100].map(pct => (
          <line key={pct} x1={paddingX} y1={getScaledY(pct)} x2={width - paddingX} y2={getScaledY(pct)} stroke="rgba(0,112,192,0.1)" strokeWidth="1" />
        ))}
        {spheres.map(sphere => {
          const data = getChartData(sphere);
          const d = data.map((pt, i) => {
            const x = paddingX + (i / 19) * graphWidth;
            const y = getScaledY(pt.y);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ');
          return <path key={sphere} d={d} fill="none" stroke={getSphereColor(sphere)} strokeWidth="2" opacity="0.8" />;
        })}
        {years.map((y, i) => {
          const x = paddingX + (i / 19) * graphWidth;
          return (
            <g key={y} onMouseEnter={() => setHoverYear(y)} onMouseLeave={() => setHoverYear(null)} style={{ cursor: 'pointer' }}>
              <rect x={x - 15} y={0} width={30} height={height} fill="transparent" />
              {spheres.map(sphere => {
                const data = getChartData(sphere);
                const py = getScaledY(data[i] ? data[i].y : 50);
                return <circle key={sphere} cx={x} cy={py} r={hoverYear === y ? 5 : 3} fill={getSphereColor(sphere)} opacity={hoverYear === y ? 1 : 0} />;
              })}
              <text x={x} y={height - 5} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill={hoverYear === y ? "var(--blue)" : "var(--text3)"}>{y}</text>
            </g>
          );
        })}
      </svg>

      <div style={{ position: "relative", zIndex: 1, padding: "0 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>🌊 Жизненный цикл (Цяцзы)</h3>
          <span className="badge bgr" style={{ fontSize: 11, padding: "4px 10px" }}>Текущий: {age} лет</span>
        </div>
      </div>

      {hoverYear !== null && (
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, background: "rgba(255,255,255,0.95)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", marginBottom: 8 }}>Возраст: {hoverYear} лет</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
            {spheres.map(s => {
              const data = getChartData(s);
              const idx = Math.round((hoverYear / 100) * 19);
              const val = data[idx] ? Math.round(data[idx].y) : "—";
              return (
                <div key={s} style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text3)" }}>{s}:</span>
                  <strong style={{ color: getSphereColor(s) }}>{val}%</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  const [selectedYear, setSelectedYear] = useState(null);

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Загрузка профиля...</div>;

  const insights = getProfileInsights(profile);
  
  const age = useMemo(() => {
    if (!profile.dob) return null;
    const today = new Date();
    const birthDate = new Date(profile.dob);
    let ageVal = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) ageVal--;
    return ageVal;
  }, [profile.dob]);

  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("муж") || genderStr.toLowerCase() === "male";
  const meridianInfo = getMeridianInfo(insights.zodiac);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const destiny = insights.destiny || { degree: 241, interpretation: "Интеграция опыта" };
  const currentJiaziIndex = age ? Math.floor((age % 60) / 5) % 12 : 0;
  const currentJiaziStage = JIAZI_STAGES[currentJiaziIndex];

  const handleRefresh = () => { setIsRefreshing(true); setTimeout(() => { setIsRefreshing(false); notify?.("✅ Данные обновлены"); }, 800); };
  const handleReset = () => { if (window.confirm("Вы уверены? Это удалит ваш профиль и вернет к началу настройки.")) { setProfile(null); notify?.("🗑️ Профиль сброшен"); } };
  const handleYearSelect = (y) => setSelectedYear(y);

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'main' && (
        <>
          <FlipCardBlock title="Профиль" frontImage={isMale ? '/assets/avatars-icons/male-avatar.png' : '/assets/avatars-icons/female-avatar.png'} accentColor="var(--blue)" minHeight={360}
            frontContent={
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--text1)", margin: "0 0 8px 0", letterSpacing: "1.2px", fontWeight: 600 }}>{profile.name || "Пользователь"}</h2>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
                  <span className="badge bgr" style={{ fontSize: 12, padding: "4px 10px" }}>🎂 {age ?? "—"} лет</span>
                  {profile.chronotype && <span className="badge bt" style={{ fontSize: 12, padding: "4px 10px" }}>⏱ {profile.chronotype}</span>}
                  {insights.zodiac && <span className="badge bm" style={{ fontSize: 12, padding: "4px 10px" }}>♈ {insights.zodiac}</span>}
                </div>
                <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, padding: "8px 12px", background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--gold)", textAlign: "left" }}>
                  <strong style={{ color: "var(--gold-dark)" }}>Сводка:</strong> {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) · {insights.eastern || "—"} ({insights.easternElement || "Вода"}) · Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
                </div>
              </div>
            }>
            <div style={{ textAlign: "center", color: "var(--text3)", marginTop: 40, fontSize: 12 }}>
              <p>Подробная информация доступна в настройках приложения.</p>
            </div>
          </FlipCardBlock>

          <FlipCardBlock title="Западный Зодиак" frontImage={getFrontImage("western", insights.zodiac)} accentColor="var(--blue)"
            frontContent={
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", padding: "0 10px" }}>
                <p style={{ marginBottom: 8, fontWeight: 500 }}>
                  <strong style={{ color: "var(--blue)", fontSize: 15 }}>{insights.zodiac || "—"}</strong> <span>({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.</span>
                </p>
                <InnerAccordion title="Сильные стороны" defaultOpen={true}>
                  {insights.zodiacStrengths || "Коммуникация, адаптивность, интеллект"}
                </InnerAccordion>
              </div>
            }>
            <InnerAccordion title="Уязвимые зоны">
              {insights.zodiacWeaknesses || "Лёгкие, бронхи, плечи, нервная система"}
            </InnerAccordion>
            <InnerAccordion title="Как использовать">
              <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                <li>Планируй важные дела на {chronoPeaks.focus?.hours || "утро"}</li>
                <li>Избегай многозадачности</li>
                <li>Дыхательные практики укрепляют слабые зоны</li>
              </ul>
            </InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="Восточный Знак" frontImage={getFrontImage("eastern", insights.eastern)} accentColor="var(--gold)"
            frontContent={
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", padding: "0 10px" }}>
                <p style={{ marginBottom: 8, fontWeight: 500 }}>
                  <strong style={{ color: "var(--gold-dark)", fontSize: 15 }}>{insights.eastern || "—"}</strong> <span>({insights.easternElement || "Вода"}).</span>
                </p>
                <InnerAccordion title="Энергетический портрет" defaultOpen={true}>
                  {insights.easternTraits || "Честность и терпимость"}. Твоя стихия наделяет тебя глубокой интуицией.
                </InnerAccordion>
              </div>
            }>
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
          </FlipCardBlock>

          <FlipCardBlock title="Градус Судьбы" frontImage={getFrontImage("destiny")} accentColor="var(--gold)"
            frontContent={
              <div style={{ textAlign: "center", padding: "0 10px" }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 28, color: "var(--gold)", fontWeight: 600, letterSpacing: "2.5px" }}>{destiny.degree || 241}°</div>
                <div style={{ fontFamily: "var(--font-italic)", fontSize: 14, color: "var(--text2)", marginTop: 4, fontStyle: "italic" }}>{destiny.interpretation || "Интеграция опыта"}</div>
                <InnerAccordion title="Описание" defaultOpen={true} style={{ marginTop: 12, textAlign: "left" }}>
                  Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла.
                </InnerAccordion>
              </div>
            }>
            <InnerAccordion title="Как использовать">
              <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                <li>Доверяй интуиции, проверяй фактами</li>
                <li>Веди дневник наблюдений</li>
              </ul>
            </InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="Хроно-тип" frontImage={getFrontImage("chrono", profile.chronotype)} accentColor="var(--blue)"
            frontContent={
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", padding: "0 10px" }}>
                <p style={{ marginBottom: 10, fontWeight: 500 }}>
                  <strong style={{ color: "var(--blue)", fontSize: 15 }}>{profile.chronotype || "🕊️ Голубь"}</strong>
                </p>
                <div style={{ padding: 10, background: "rgba(45,106,79,0.08)", borderRadius: 8, borderLeft: "3px solid var(--success)", marginBottom: 10 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--success)", letterSpacing: 1, marginBottom: 4 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
                  <p style={{ margin: 0, fontSize: 12 }}>{chronoPeaks.focus?.tip || "Самые сложные задачи — в это время."}</p>
                </div>
              </div>
            }>
            <div style={{ padding: 10, background: "rgba(139,32,32,0.06)", borderRadius: 8, borderLeft: "3px solid var(--error)", marginBottom: 12 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--error)", letterSpacing: 1, marginBottom: 4 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
              <p style={{ margin: 0, fontSize: 12 }}>{chronoPeaks.rest?.tip || "Идеально для рутины."}</p>
            </div>
            <InnerAccordion title="Как использовать" defaultOpen={true}>
              <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                <li>Синхронизируй расписание с биоритмами — КПД +30–40%</li>
                <li>Сложные решения — только в пиковые часы</li>
                <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"}</li>
              </ul>
            </InnerAccordion>
          </FlipCardBlock>
        </>
      )}

      {activeTab === 'deep' && (
        <>
          <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 18, border: "1px solid var(--line)", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 4, height: 24, background: "var(--blue)", borderRadius: 2 }} />
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>🔍 Глубокий анализ профиля</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {/* Здесь можно оставить ваш оригинальный контент 2x2 */}
            </div>
          </div>

          {/* Ведический календарь */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            <FlipCardBlock 
              title="Солнечный сезон" 
              frontImage="/assets/avatars-icons/vedic-sun.png" 
              accentColor="var(--success)"
              frontContent={<div style={{ fontSize: 13, lineHeight: 1.6, padding: "0 10px" }}><strong>Сезон & Ци</strong></div>}
            >
              <p>Энергия парит, болезни поднимаются на поверхность.</p>
            </FlipCardBlock>

            <FlipCardBlock 
              title="Лунный фон" 
              frontImage="/assets/avatars-icons/vedic-moon.png" 
              accentColor="var(--error)"
              frontContent={<div style={{ fontSize: 13, lineHeight: 1.6, padding: "0 10px" }}><strong>Запреты</strong></div>}
            >
              <p>Избегайте процедур в дни новолуния/полнолуния.</p>
            </FlipCardBlock>
          </div>

          {/* Ба Цзы */}
          <FlipCardBlock 
            title="Ба Цзы • Пять Элементов & 10 Богов" 
            frontImage="/assets/avatars-icons/bazi-five-elements.png" 
            accentColor="#8b5cf6"
            minHeight={420}
            frontContent={
              <div style={{ textAlign: "center", padding: "0 10px" }}>
                <div style={{ fontSize: 42, marginBottom: 8 }}>八字</div>
                <strong style={{ fontSize: 18, color: "#8b5cf6" }}>
                  {insights.bazi?.dayMaster.full || "Ба Цзы"}
                </strong>
              </div>
            }
          >
            <InnerAccordion title="Day Master" defaultOpen={true}>
              <strong>{insights.bazi?.dayMaster.full}</strong><br/>
              Элемент: <strong>{insights.tenGodsInsight?.element || "—"}</strong>
            </InnerAccordion>

            <InnerAccordion title="Благоприятные элементы" defaultOpen={true}>
              <p><strong>Усиливать:</strong> {insights.tenGodsInsight?.favorable || "Вода и Металл"}</p>
              <p><strong>Ограничить:</strong> {insights.tenGodsInsight?.unfavorable || "Избыток Огня"}</p>
            </InnerAccordion>

            <InnerAccordion title="10 Богов">
              <p>{insights.tenGodsInsight?.tenGods || "Анализ показывает ваши ключевые архетипы"}</p>
            </InnerAccordion>
          </FlipCardBlock>

          <CycleTimeline dob={profile.dob} onYearSelect={handleYearSelect} />
        </>
      )}

      <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
        <button className="btn btn-primary" onClick={handleRefresh} disabled={isRefreshing} style={{ flex: 1 }}>
          {isRefreshing ? "⏳ Обновление..." : "🔄 Обновить данные"}
        </button>
        <button className="btn btn-ghost" onClick={handleReset} style={{ flex: 1, color: "var(--error)" }}>
          🗑️ Сброс профиля
        </button>
      </div>

      {selectedYear !== null && <YearModal year={selectedYear} currentAge={age} onClose={() => setSelectedYear(null)} />}
    </div>
  );
    }
