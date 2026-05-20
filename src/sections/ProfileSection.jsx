// src/sections/ProfileSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";

// ─── БАЗА ДАННЫХ ЦЯЦЗЫ (12 СТАДИЙ) ───
const JIAZI_STAGES = [
  { name: 'Рождение', spheres: { health: 40, career: 20, relations: 30, spirit: 50, finance: 10 }, tips: 'Закладка фундамента. Избегай перегрузок.', critical: 'Формирование базовых реакций.' },
  { name: 'Купание', spheres: { health: 60, career: 30, relations: 40, spirit: 60, finance: 20 }, tips: 'Формирование реакций. Учитесь говорить "нет".', critical: 'Эмоциональные тесты.' },
  { name: 'Облачение', spheres: { health: 70, career: 40, relations: 50, spirit: 70, finance: 30 }, tips: 'Публичный выход. Формируйте имидж осознанно.', critical: 'Риск чужих обёрток.' },
  { name: 'Взросление', spheres: { health: 80, career: 60, relations: 60, spirit: 80, finance: 50 }, tips: 'Стабилизация. Долгосрочные проекты приносят плоды.', critical: 'Переход к ответственности.' },
  { name: 'Расцвет', spheres: { health: 90, career: 80, relations: 70, spirit: 90, finance: 70 }, tips: 'Пик сил. Реализуй главные цели, но береги нервную систему.', critical: 'Риск выгорания.' },
  { name: 'Старение', spheres: { health: 70, career: 60, relations: 60, spirit: 80, finance: 60 }, tips: 'Переход. Мудрость важнее скорости.', critical: 'Упадок энергии Ци.' },
  { name: 'Болезнь', spheres: { health: 40, career: 40, relations: 50, spirit: 60, finance: 40 }, tips: 'Пересмотр приоритетов. Профилактика критична.', critical: 'Период слабости.' },
  { name: 'Смерть', spheres: { health: 30, career: 30, relations: 40, spirit: 50, finance: 30 }, tips: 'Завершение цикла. Отпускай старое.', critical: 'Кризис идентичности.' },
  { name: 'Хранилище', spheres: { health: 40, career: 40, relations: 50, spirit: 70, finance: 50 }, tips: 'Сохранение Ци. Накапливай ресурсы.', critical: 'Фаза накопления.' },
  { name: 'Отдых', spheres: { health: 50, career: 30, relations: 40, spirit: 60, finance: 40 }, tips: 'Полное восстановление.', critical: 'Принудительный перерыв.' },
  { name: 'Зачатие', spheres: { health: 60, career: 50, relations: 50, spirit: 70, finance: 50 }, tips: 'Скрытый росток. Задавай вектор.', critical: 'Формулирование намерений.' },
  { name: 'Созревание', spheres: { health: 80, career: 70, relations: 60, spirit: 80, finance: 70 }, tips: 'Подготовка к новому рождению.', critical: 'Момент истины.' }
];

// ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ───
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

const getFrontImage = (category, value) => {
  if (!value && category !== 'destiny') return null;
  const raw = String(value).trim().toLowerCase();
  if (category === 'chrono') {
    const map = { 'жаворонок': 'front-chrono-lark.png', 'голубь': 'front-chrono-pigeon.png', 'сова': 'front-chrono-owl.png' };
    for (const [k, v] of Object.entries(map)) { if (raw.includes(k)) return `/assets/avatars-icons/${v}`; }
    return '/assets/avatars-icons/front-chrono-pigeon.png';
  }
  if (category === 'destiny') return '/assets/avatars-icons/front-destiny.png';
  if (category === 'vedic-sun') return '/assets/avatars-icons/vedic-sun.png';
  if (category === 'vedic-moon') return '/assets/avatars-icons/vedic-moon.png';
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
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--blue)", letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--gold)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>▼</span>
      </div>
      {open && <div style={{ padding: "0 12px 12px", fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>{children}</div>}
    </div>
  );
}

// ─── КАРТОЧКА (МОДИФИЦИРОВАНА: frontContent) ───
function FlipCardBlock({ title, frontImage, frontContent, accentColor = "var(--blue)", children, minHeight = 340 }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: "1200px", marginBottom: 28 }}>
      <div onClick={() => setFlipped(!flipped)} style={{ position: "relative", width: "100%", minHeight, transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)", transform: flipped ? "rotateY(180deg)" : "none", cursor: "pointer", borderRadius: 12 }}>
        
        {/* ЛИЦЕВАЯ СТОРОНА */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg, #f8f4e8 0%, #e8d8c0 100%)", border: "2px solid var(--gold)", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", alignItems: "center", transform: "translateZ(0)" }}>
          
          {frontImage ? (
             <img src={frontImage} alt={title} style={{ maxHeight: "55%", maxWidth: "90%", marginTop: 16, objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }} onError={(e) => e.target.style.display = "none"} />
          ) : (
             <div style={{ width: "80%", height: "40%", background: "rgba(0,112,192,0.05)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12, marginTop: 24 }}>Иллюстрация</div>
          )}
          
          {frontContent && (
            <div style={{ padding: "0 20px 20px", width: "100%", textAlign: "center", overflowY: "auto", maxHeight: "50%" }}>
              {frontContent}
            </div>
          )}

          {!frontContent && (
            <>
              <div style={{ marginTop: 14, fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", letterSpacing: "1px", fontWeight: 500 }}>{title}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Нажмите для деталей</div>
            </>
          )}
        </div>

        {/* ОБОРОТНАЯ СТОРОНА */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.98)", border: "1.5px solid rgba(0,112,192,0.25)", boxShadow: "0 4px 16px rgba(0,112,192,0.12)", padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: "0.6px", fontWeight: 600 }}>{title}</h3>
          </div>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "65vh", fontSize: 14, lineHeight: 1.7, color: "var(--text2)", paddingRight: 4 }}>{children}</div>
        </div>

      </div>
    </div>
  );
}

// ─── ГРАФИЧЕСКИЙ ТАЙМЛАЙН (ЦИЯЦЗЫ) ───
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

  // Генерация данных для графика на основе стадий Цяцзы
  const generateChartData = () => {
    const points = { health: [], career: [], relations: [], spirit: [], finance: [] };
    years.forEach((y, i) => {
      const stageIndex = Math.floor((y % 60) / 5) % 12;
      const stage = JIAZI_STAGES[stageIndex];
      Object.keys(points).forEach(k => {
        // Добавляем вариативность для плавности
        const base = stage.spheres[k] || 50;
        const variation = Math.sin(i * 0.5) * 10; 
        points[k].push({ x: i, y: Math.max(0, Math.min(100, base + variation)) });
      });
    });
    return points;
  };

  const chartData = generateChartData();
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
        {/* Сетка */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Линии сетки */}
        {[0, 25, 50, 75, 100].map(pct => (
           <line key={pct} x1={paddingX} y1={getScaledY(pct)} x2={width - paddingX} y2={getScaledY(pct)} stroke="rgba(0,112,192,0.1)" strokeWidth="1" />
        ))}

        {/* Кривые сфер */}
        {spheres.map(sphere => {
          const data = chartData[sphere];
          const d = data.map((pt, i) => {
            const x = paddingX + (i / (years.length - 1)) * graphWidth;
            const y = getScaledY(pt.y);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ');
          return (
            <path key={sphere} d={d} fill="none" stroke={getSphereColor(sphere)} strokeWidth="2" opacity="0.8" />
          );
        })}

        {/* Маркеры лет и тултипы */}
        {years.map((y, i) => {
          const x = paddingX + (i / (years.length - 1)) * graphWidth;
          return (
            <g key={y} onMouseEnter={() => setHoverYear(y)} onMouseLeave={() => setHoverYear(null)} style={{ cursor: 'pointer' }}>
              {/* Невидимая область для наведения */}
              <rect x={x - 15} y={0} width={30} height={height} fill="transparent" />
              
              {/* Точки маркеров */}
              {spheres.map(sphere => {
                const pt = chartData[sphere][i];
                const py = getScaledY(pt.y);
                return <circle key={sphere} cx={x} cy={py} r={hoverYear === y ? 5 : 3} fill={getSphereColor(sphere)} opacity={hoverYear === y ? 1 : 0} />;
              })}
              
              {/* Метка года */}
              <text x={x} y={height - 5} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill={hoverYear === y ? "var(--blue)" : "var(--text3)"}>{y}</text>
            </g>
          );
        })}
      </svg>

      {/* Заголовок и Легенда */}
      <div style={{ position: "relative", zIndex: 1, padding: "0 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
           <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>🌊 Жизненный цикл (Цяцзы)</h3>
           <span className="badge bgr" style={{ fontSize: 11, padding: "4px 10px" }}>Текущий: {age} лет</span>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
           {spheres.map(s => (
             <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
               <span style={{ width: 8, height: 8, borderRadius: "50%", background: getSphereColor(s) }}></span>
               <span style={{ textTransform: "capitalize", color: "var(--text2)" }}>{s}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Тултип при наведении */}
      {hoverYear !== null && (
        <div style={{
          position: "absolute", bottom: 20, left: 20, right: 20,
          background: "rgba(255,255,255,0.95)", border: "1px solid var(--line)",
          borderRadius: 8, padding: 12, zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", marginBottom: 8 }}>Возраст: {hoverYear} лет</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
            {spheres.map(s => {
              const idx = hoverYear / 5;
              const val = chartData[s][idx] ? Math.round(chartData[s][idx].y) : "—";
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

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
         Нажмите на год для детализации. Наведите для просмотра баланса сфер.
      </div>
    </div>
  );
}

// ─── МОДАЛЬНОЕ ОКНО ПЕРИОДА ───
function YearModal({ year, currentAge, onClose }) {
  const stageIndex = Math.floor((year % 60) / 5) % 12;
  const stage = JIAZI_STAGES[stageIndex];
  const isCurrent = year === currentAge;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "90%", maxWidth: 620, maxHeight: "85vh", overflowY: "auto",
        background: "rgba(255,255,255,0.98)", borderRadius: 12, padding: 24,
        border: "1.5px solid rgba(0,112,192,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        position: "relative"
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text3)" }}>✕</button>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", margin: "0 0 16px 0", letterSpacing: "1px" }}>
          Период {year} лет
        </h2>
        <InnerAccordion title="Фаза Цзяцзы" defaultOpen={true}>
          <strong style={{ color: "var(--blue)", fontSize: 15 }}>{stage.name}</strong>
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>{stage.tips}</p>
        </InnerAccordion>
        {isCurrent && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(0,112,192,0.06)", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
            <strong style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", letterSpacing: 1 }}>🧭 ВАШ ТЕКУЩИЙ ПУТЬ</strong>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>Вы сейчас в фазе {stage.name}.</p>
          </div>
        )}
      </div>
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
          {/* КАРТОЧКА ПРОФИЛЬ */}
          <FlipCardBlock 
            title="Профиль" 
            frontImage={isMale ? '/assets/avatars-icons/male-avatar.png' : '/assets/avatars-icons/female-avatar.png'} 
            accentColor="var(--blue)" 
            minHeight={360}
            frontContent={
              <div style={{ textAlign: "center", marginTop: 10 }}>
                 <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--text1)", margin: "0 0 8px 0", letterSpacing: "1.2px", fontWeight: 600 }}>{profile.name || "Пользователь"}</h2>
                 <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
                    <span className="badge bgr" style={{ fontSize: 12, padding: "4px 10px" }}>🎂 {age ?? "—"} лет</span>
                    {profile.chronotype && <span className="badge bt" style={{ fontSize: 12, padding: "4px 10px" }}>⏱ {profile.chronotype}</span>}
                    {insights.zodiac && <span className="badge bm" style={{ fontSize: 12, padding: "4px 10px" }}>♈ {insights.zodiac}</span>}
                 </div>
                 <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5, padding: "8px 12px", background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--gold)", textAlign: "left" }}>
                    <strong style={{ color: "var(--gold-dark)" }}>Сводка:</strong> {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) · {insights.eastern || "—"} ({insights.easternElement || "Вода"}) · Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
                 </div>
              </div>
            }
          >
            <div style={{ textAlign: "center", color: "var(--text3)", marginTop: 40 }}>
               <p style={{ fontSize: 12 }}>Подробная информация доступна в настройках приложения.</p>
            </div>
          </FlipCardBlock>

          {/* ОСТАЛЬНЫЕ КАРТОЧКИ MAIN (ЗАПАДНЫЙ, ВОСТОЧНЫЙ, ГРАДУС, ХРОНО) — БЕЗ ИЗМЕНЕНИЙ */}
          <FlipCardBlock title="Западный Зодиак" frontImage={getFrontImage("western", insights.zodiac)} accentColor="var(--blue)">
             <InnerAccordion title="Сильные стороны" defaultOpen={true}>{insights.zodiacStrengths || "Коммуникация"}</InnerAccordion>
             <InnerAccordion title="Уязвимые зоны">{insights.zodiacWeaknesses || "Лёгкие"}</InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="Восточный Знак" frontImage={getFrontImage("eastern", insights.eastern)} accentColor="var(--gold)">
             <InnerAccordion title="Энергетический портрет" defaultOpen={true}>{insights.easternTraits || "Честность"}</InnerAccordion>
             <InnerAccordion title="Кармическая задача">{insights.easternKarma || "Границы"}</InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="Градус Судьбы" frontImage={getFrontImage("destiny")} accentColor="var(--gold)">
             <div style={{ textAlign: "center", padding: "0 10px" }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 32, color: "var(--gold)", fontWeight: 600 }}>{destiny.degree}°</div>
                <InnerAccordion title="Описание" defaultOpen={true}>{destiny.interpretation}</InnerAccordion>
             </div>
          </FlipCardBlock>

          <FlipCardBlock title="Хроно-тип" frontImage={getFrontImage("chrono", profile.chronotype)} accentColor="var(--blue)">
             <div style={{ fontSize: 13 }}>
                <div style={{ padding: 10, background: "rgba(45,106,79,0.08)", borderRadius: 8, borderLeft: "3px solid var(--success)", marginBottom: 10 }}>
                   <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--success)" }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
                   <p style={{ margin: 0 }}>{chronoPeaks.focus?.tip || "Утро."}</p>
                </div>
                <InnerAccordion title="Как использовать" defaultOpen={true}>Синхронизируй расписание с биоритмами.</InnerAccordion>
             </div>
          </FlipCardBlock>
        </>
      )}

      {activeTab === 'deep' && (
         <>
          {/* 1. ГРАФИК ЖИЗНЕННОГО ЦИКЛА */}
           <CycleTimeline dob={profile.dob} onYearSelect={handleYearSelect} />

          {/* 2. ВЕДИЧЕСКИЙ КАЛЕНДАРЬ (КАРТОЧКИ) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
             <FlipCardBlock 
                title="Солнечный сезон" 
                frontImage={getFrontImage("vedic-sun")} 
                accentColor="var(--success)"
                frontContent={
                   <div style={{ fontSize: 13, lineHeight: 1.6, padding: "0 10px" }}>
                      <strong style={{ color: "var(--blue)", fontSize: 15 }}>Сезон & Ци</strong>
                      <p style={{ marginTop: 4 }}>{insights.zodiac === 'Близнецы' ? 'Весна/Лето: рост Ян-Ци' : 'Сезонный фон: гармонизация Инь-Ян'}</p>
                   </div>
                }
             >
                <p>Энергия парит, болезни поднимаются на поверхность. Применяйте методы рассеивания Ци и лёгкие практики.</p>
             </FlipCardBlock>

             <FlipCardBlock 
                title="Лунный фон" 
                frontImage={getFrontImage("vedic-moon")} 
                accentColor="var(--error)"
                frontContent={
                   <div style={{ fontSize: 13, lineHeight: 1.6, padding: "0 10px" }}>
                      <strong style={{ color: "var(--text1)", fontSize: 15 }}>Запреты</strong>
                      <p style={{ marginTop: 4 }}>В дни новолуния/полнолуния организм ослаблен.</p>
                   </div>
                }
             >
                <p>Избегайте малой хирургии, иглотерапии и агрессивных процедур на коже.</p>
             </FlipCardBlock>
          </div>

          {/* 3. ГЛУБОКИЙ АНАЛИЗ ПРОФИЛЯ (ВИЗУАЛЬНЫЕ БЛОКИ) */}
           <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 18, border: "1px solid var(--line)" }}>
             <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
               <div style={{ width: 4, height: 24, background: "var(--blue)", borderRadius: 2 }} />
               <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>🔍 Глубокий анализ</h3>
             </div>
             
             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                {/* Методология */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--blue)" }}>
                   <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", margin: "0 0 8px 0" }}>Методология</h4>
                   <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                      Пересечение 60-фазного цикла Цзяцзы, ведического календаря и кн. Рао.
                   </p>
                </div>

                {/* Синхронизация */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--gold)" }}>
                   <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--gold)", margin: "0 0 8px 0" }}>Синхронизация</h4>
                   <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                      Текущая фаза: <strong>{currentJiaziStage.name}</strong>. Требует {currentJiaziStage.name === 'Расцвет' ? 'лидерства' : 'восстановления'}.
                   </p>
                </div>

                {/* Рекомендации */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--success)" }}>
                   <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--success)", margin: "0 0 8px 0" }}>Рекомендации</h4>
                   <ul style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", margin: "0 0 0 16px", padding: 0 }}>
                      <li>Планируйте на пиковые часы</li>
                      <li>Фокус на {currentJiaziStage.spheres.career || 'карьере'}</li>
                   </ul>
                </div>

                {/* Зоны внимания */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--error)" }}>
                   <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--error)", margin: "0 0 8px 0" }}>Зоны внимания</h4>
                   <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                      {meridianInfo.tip || 'Регулярность питания'}. Мягкая коррекция Ци в сезоны перехода.
                   </p>
                </div>
             </div>
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

      {selectedYear !== null && <YearModal year={selectedYear} currentAge={age} onClose={() => setSelectedYear(null)} />}
    </div>
  );
}
