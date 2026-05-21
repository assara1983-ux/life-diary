// src/sections/ProfileSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
// Убедитесь, что пути к файлам знаний верные
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";

// ─── БАЗА ДАННЫХ ЦЯЦЗЫ (12 СТАДИЙ) ───
const JIAZI_STAGES = [
  { name: 'Рождение', spheres: { health: 'Иммунитет', career: 'Обучение', relations: 'Семья', spirit: 'Поиск смысла', finance: 'Накопление' }, tips: 'Закладка фундамента.', critical: 'Формирование реакций.' },
  { name: 'Купание', spheres: { health: 'Нервная система', career: 'Поиск пути', relations: 'Первые связи', spirit: 'Духовный выбор', finance: 'Самостоятельность' }, tips: 'Учитесь говорить "нет".', critical: 'Эмоциональные тесты.' },
  { name: 'Облачение', spheres: { health: 'Гормоны', career: 'Карьерный старт', relations: 'Партнёрство', spirit: 'Самоидентификация', finance: 'Первые доходы' }, tips: 'Формируйте имидж.', critical: 'Риск чужих обёрток.' },
  { name: 'Взросление', spheres: { health: 'Энергия', career: 'Проф. рост', relations: 'Стабильные союзы', spirit: 'Философия', finance: 'Инвестиции' }, tips: 'Стабилизация.', critical: 'Ответственность.' },
  { name: 'Расцвет', spheres: { health: 'Пик тонуса', career: 'Лидерство', relations: 'Глубокие связи', spirit: 'Авторитет', finance: 'Капитал' }, tips: 'Реализуй цели.', critical: 'Риск выгорания.' },
  { name: 'Старение', spheres: { health: 'Восстановление', career: 'Наставничество', relations: 'Передача опыта', spirit: 'Интеграция', finance: 'Сохранение' }, tips: 'Мудрость важнее скорости.', critical: 'Упадок энергии.' },
  { name: 'Болезнь', spheres: { health: 'Терапия', career: 'Смена формата', relations: 'Качество связей', spirit: 'Очищение', finance: 'Оптимизация' }, tips: 'Пересмотр приоритетов.', critical: 'Период слабости.' },
  { name: 'Смерть', spheres: { health: 'Глубокая терапия', career: 'Уход', relations: 'Прощение', spirit: 'Принятие', finance: 'Распределение' }, tips: 'Завершение цикла.', critical: 'Кризис идентичности.' },
  { name: 'Хранилище', spheres: { health: 'Покой', career: 'Творчество', relations: 'Тихие связи', spirit: 'Диалог', finance: 'Пассив' }, tips: 'Накапливай ресурсы.', critical: 'Фаза накопления.' },
  { name: 'Отдых', spheres: { health: 'Регенерация', career: 'Перерыв', relations: 'Одиночество', spirit: 'Медитация', finance: 'Экономия' }, tips: 'Не форсируй события.', critical: 'Принудительный перерыв.' },
  { name: 'Зачатие', spheres: { health: 'Подготовка', career: 'Идеи', relations: 'Новые знакомства', spirit: 'Намерение', finance: 'Планирование' }, tips: 'Задавай вектор.', critical: 'Решение о запуске.' },
  { name: 'Созревание', spheres: { health: 'Активация', career: 'Запуск', relations: 'Переговоры', spirit: 'Фокус', finance: 'Капитал' }, tips: 'Действуй решительно.', critical: 'Момент истины.' }
];

// ─── ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ───

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
          transition: "all 0.2s"
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function InnerAccordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10, background: "rgba(0,112,192,0.04)", borderRadius: 8, border: "1px solid rgba(0,112,192,0.15)" }}>
      <div onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{ padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--gold)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>▼</span>
      </div>
      {open && <div style={{ padding: "0 12px 12px", fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>{children}</div>}
    </div>
  );
}

function FlipCardBlock({ title, frontImage, accentColor = "var(--blue)", children, minHeight = 340, frontContent }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: "1200px", marginBottom: 28 }}>
      <div onClick={() => setFlipped(!flipped)} style={{ position: "relative", width: "100%", minHeight, transformStyle: "preserve-3d", transition: "transform 0.6s", transform: flipped ? "rotateY(180deg)" : "none", cursor: "pointer", borderRadius: 12 }}>
        {/* ЛИЦЕВАЯ СТОРОНА */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg, #f8f4e8 0%, #e8d8c0 100%)", border: "2px solid var(--gold)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {frontImage ? <img src={frontImage} alt={title} style={{ maxHeight: "70%", maxWidth: "90%", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} /> : <div style={{ fontSize: 12, color: "var(--text3)" }}>Нет иллюстрации</div>}
          {frontContent ? <div style={{ padding: "0 20px 20px", width: "100%", textAlign: "center" }}>{frontContent}</div> : <div style={{ marginTop: 14, fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)" }}>{title}</div>}
        </div>
        {/* ОБОРОТНАЯ СТОРОНА */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 12, overflow: "hidden", background: "#fff", border: "1.5px solid rgba(0,112,192,0.25)", padding: 18, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", margin: "0 0 14px 0", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>{title}</h3>
          <div style={{ overflowY: "auto", flex: 1, fontSize: 14, lineHeight: 1.7, color: "var(--text2)" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function YearModal({ year, currentAge, onClose }) {
  const stageIndex = Math.floor((year % 60) / 5) % 12;
  const stage = JIAZI_STAGES[stageIndex];
  if (!stage) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto", background: "#fff", borderRadius: 12, padding: 24, border: "1px solid var(--line)" }}>
        <button onClick={onClose} style={{ float: "right", background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--blue)", marginBottom: 16 }}>Период {year} лет</h2>
        <InnerAccordion title="Фаза Цзяцзы" defaultOpen={true}>
          <strong>{stage.name}</strong>
          <p>{stage.tips}</p>
          <div style={{ marginTop: 8, padding: 8, background: "rgba(139,32,32,0.05)", borderRadius: 4, borderLeft: "3px solid var(--error)" }}>
            <small style={{ color: "var(--error)" }}>⚠️ {stage.critical}</small>
          </div>
        </InnerAccordion>
        <InnerAccordion title="Сферы жизни">
          {Object.entries(stage.spheres).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 4, fontSize: 13 }}><strong>{k}:</strong> {v}</div>
          ))}
        </InnerAccordion>
      </div>
    </div>
  );
}

// ─── SVG КОМПОНЕНТЫ ДЛЯ ВИЗУАЛИЗАЦИИ (ПУНКТ 2) ───

// 1. Синхронизация: 3 концентрических круга
function SyncRadialChart({ jiaziStage, chronotype, moonPhase }) {
  return (
    <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 200, margin: "0 auto" }}>
      <circle cx="100" cy="100" r="90" fill="none" stroke="var(--blue)" strokeWidth="3" opacity="0.3" />
      <text x="100" y="20" textAnchor="middle" fontSize="10" fill="var(--blue)" fontFamily="var(--font-mono)">ЦЗЯЦЗЫ</text>
      
      <circle cx="100" cy="100" r="60" fill="none" stroke="var(--gold)" strokeWidth="2" opacity="0.5" />
      <text x="100" y="105" textAnchor="middle" fontSize="9" fill="var(--gold)" fontFamily="var(--font-mono)">БИОРИТМЫ</text>
      
      <circle cx="100" cy="100" r="30" fill="none" stroke="var(--success)" strokeWidth="2" opacity="0.7" />
      <text x="100" y="105" textAnchor="middle" fontSize="8" fill="var(--success)" fontFamily="var(--font-mono)">ЛУНА</text>
      
      <circle cx="100" cy="10" r="4" fill="var(--blue)" />
      <circle cx="160" cy="100" r="3" fill="var(--gold)" />
      <circle cx="100" cy="70" r="2" fill="var(--success)" />
      
      <line x1="100" y1="10" x2="100" y2="70" stroke="var(--blue)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
    </svg>
  );
}

// 2. Рекомендации: Radar chart (5 сфер)
function RecommendationsRadar({ insights }) {
  const spheres = ['health', 'career', 'relations', 'spirit', 'finance'];
  const colors = { health: '#2d6a4f', career: '#0070c0', relations: '#e8556d', spirit: '#b882e8', finance: '#c8a45a' };
  const centerX = 100, centerY = 100, radius = 80;
  const angleStep = (Math.PI * 2) / 5;
  
  const getPoint = (index, value) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
  };
  
  const values = spheres.map(() => Math.floor(Math.random() * 40) + 60); // Demo values
  
  const pathData = spheres.map((_, i) => {
    const point = getPoint(i, values[i]);
    return `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ') + ' Z';
  
  return (
    <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 200, margin: "0 auto" }}>
      {[20, 40, 60, 80, 100].map(pct => (
        <circle key={pct} cx={centerX} cy={centerY} r={(pct / 100) * radius} fill="none" stroke="var(--line)" strokeWidth="1" opacity="0.3" />
      ))}
      
      {spheres.map((sphere, i) => {
        const point = getPoint(i, 100);
        return <line key={sphere} x1={centerX} y1={centerY} x2={point.x} y2={point.y} stroke="var(--line)" strokeWidth="1" opacity="0.3" />;
      })}
      
      <path d={pathData} fill="rgba(0,112,192,0.2)" stroke="var(--blue)" strokeWidth="2" />
      
      {spheres.map((sphere, i) => {
        const point = getPoint(i, 100);
        const labelPoint = getPoint(i, 115);
        return (
          <g key={sphere}>
            <circle cx={point.x} cy={point.y} r="3" fill={colors[sphere]} />
            <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" fontSize="8" fill="var(--text2)" fontFamily="var(--font-mono)">{sphere[0].toUpperCase()}</text>
          </g>
        );
      })}
    </svg>
  );
}

// 3. Зоны внимания: Силуэт с меридианами
function AttentionZonesSVG({ zodiac, meridianInfo }) {
  const weakZones = {
    'Овен': ['head', 'eyes'], 'Телец': ['throat', 'neck'], 'Близнецы': ['lungs', 'arms'],
    'Рак': ['stomach', 'chest'], 'Лев': ['heart', 'back'], 'Дева': ['intestines', 'nerves'],
    'Весы': ['kidneys', 'waist'], 'Скорпион': ['reproductive', 'nose'], 'Стрелец': ['liver', 'hips'],
    'Козерог': ['bones', 'knees'], 'Водолей': ['ankles', 'nerves'], 'Рыбы': ['feet', 'immune']
  };
  const zones = weakZones[zodiac] || ['stomach', 'nerves'];
  
  return (
    <svg viewBox="0 0 200 200" style={{ width: "100%", maxWidth: 200, margin: "0 auto" }}>
      <ellipse cx="100" cy="30" rx="15" ry="18" fill="rgba(0,112,192,0.1)" stroke="var(--blue)" strokeWidth="1" />
      <line x1="100" y1="48" x2="100" y2="120" stroke="var(--blue)" strokeWidth="3" />
      <line x1="100" y1="60" x2="70" y2="90" stroke="var(--blue)" strokeWidth="2" />
      <line x1="100" y1="60" x2="130" y2="90" stroke="var(--blue)" strokeWidth="2" />
      <line x1="100" y1="120" x2="80" y2="170" stroke="var(--blue)" strokeWidth="2" />
      <line x1="100" y1="120" x2="120" y2="170" stroke="var(--blue)" strokeWidth="2" />
      
      {zones.includes('head') && <circle cx="100" cy="30" r="12" fill="rgba(139,32,32,0.3)" stroke="var(--error)" strokeWidth="2" />}
      {zones.includes('stomach') && <ellipse cx="100" cy="85" rx="12" ry="8" fill="rgba(139,32,32,0.3)" stroke="var(--error)" strokeWidth="2" />}
      
      <path d="M 100 48 Q 120 70 100 120" fill="none" stroke="var(--gold)" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
      <path d="M 100 48 Q 80 70 100 120" fill="none" stroke="var(--gold)" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
      
      <text x="100" y="190" textAnchor="middle" fontSize="9" fill="var(--text2)" fontFamily="var(--font-mono)">{meridianInfo?.organ || 'Меридианы'}</text>
    </svg>
  );
}

// ─── ГРАФИК ЖИЗНЕННОГО ЦИКЛА (ПУНКТ 4 - УЛУЧШЕННЫЙ) ───

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
  const height = 350; // УВЕЛИЧЕНО
  const paddingX = 40;
  const paddingY = 40;
  const graphWidth = width - 2 * paddingX;
  const graphHeight = height - 2 * paddingY;
  
  const getScaledY = (val) => graphHeight - (val / 100) * graphHeight + paddingY;
  const spheres = ['health', 'career', 'relations', 'spirit', 'finance'];
  const sphereColors = { health: '#2d6a4f', career: '#0070c0', relations: '#e8556d', spirit: '#b882e8', finance: '#c8a45a' };
  
  const currentStageIndex = Math.floor((age % 60) / 5) % 12;
  const currentStage = JIAZI_STAGES[currentStageIndex];
  const currentX = paddingX + (age / 100) * graphWidth;
  
  return (
    <div style={{ position: "relative", padding: "20px 0", overflow: "hidden", borderRadius: 12, background: "rgba(255,255,255,0.8)", border: "1px solid var(--line)", marginBottom: 24 }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.6 }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grad-health" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d6a4f" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2d6a4f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-career" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0070c0" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0070c0" stopOpacity="0" />
          </linearGradient>
          <style>{"@keyframes flow-bg { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-40} }"}</style>
        </defs>
        
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
          const fillPath = `${d} L ${paddingX + graphWidth} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`;
          return (
            <g key={sphere}>
              <path d={fillPath} fill={`url(#grad-${sphere})`} opacity="0.5" />
              <path d={d} fill="none" stroke={sphereColors[sphere]} strokeWidth="2.5" opacity="0.9" />
            </g>
          );
        })}
        
        <line x1={currentX} y1={paddingY} x2={currentX} y2={height - paddingY} stroke="var(--gold)" strokeWidth="2" strokeDasharray="5,3" opacity="0.8" />
        <text x={currentX} y={paddingY - 10} textAnchor="middle" fontSize="11" fill="var(--gold)" fontFamily="var(--font-mono)" fontWeight="600">
          ВЫ ЗДЕСЬ ({age} лет)
        </text>
        
        {years.map((y, i) => {
          const x = paddingX + (i / 19) * graphWidth;
          const dataIndex = Math.min(i, 19);
          return (
            <g key={y} onClick={() => onYearSelect(y)} onMouseEnter={() => setHoverYear(y)} onMouseLeave={() => setHoverYear(null)} style={{ cursor: 'pointer' }}>
              <rect x={x - 15} y={0} width={30} height={height} fill="transparent" />
              {spheres.map(sphere => {
                const data = getChartData(sphere);
                const py = getScaledY(data[dataIndex].y);
                return <circle key={sphere} cx={x} cy={py} r={hoverYear === y ? 6 : 3} fill={sphereColors[sphere]} opacity={hoverYear === y ? 1 : 0.6} />;
              })}
              <text x={x} y={height - 15} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill={hoverYear === y ? "var(--blue)" : "var(--text3)"} fontWeight={hoverYear === y ? "600" : "400"}>{y}</text>
            </g>
          );
        })}
      </svg>
      
      <div style={{ position: "relative", zIndex: 1, padding: "0 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>🌊 Жизненный цикл (Цяцзы)</h3>
          <span className="badge bgr" style={{ fontSize: 11, padding: "4px 10px" }}>Текущий: {age} лет · {currentStage?.name}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {spheres.map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: sphereColors[s] }}></span>
              <span style={{ textTransform: "capitalize", color: "var(--text2)" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      
      {hoverYear !== null && (
        <div style={{
          position: "absolute", bottom: 80, left: 20, right: 20,
          background: "rgba(255,255,255,0.98)", border: "1.5px solid var(--line)",
          borderRadius: 10, padding: 16, zIndex: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.12)"
        }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", marginBottom: 12, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
            Возраст: {hoverYear} лет
            <span style={{ marginLeft: 12, fontSize: 12, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
              {JIAZI_STAGES[Math.floor((hoverYear % 60) / 5) % 12]?.name}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {spheres.map(s => {
              const data = getChartData(s);
              const idx = Math.round((hoverYear / 100) * 19);
              const val = data[idx] ? Math.round(data[idx].y) : "—";
              return (
                <div key={s} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", padding: "4px 8px", background: "rgba(0,112,192,0.03)", borderRadius: 4 }}>
                  <span style={{ color: "var(--text3)", textTransform: "capitalize" }}>{s}:</span>
                  <strong style={{ color: sphereColors[s] }}>{val}%</strong>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)", textAlign: "center", fontStyle: "italic" }}>
            Кликните на год для детализации периода
          </div>
        </div>
      )}
      
      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
        Наведите на год для просмотра баланса сфер · Кликните для детализации
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
  
  const insights = useMemo(() => profile ? getProfileInsights(profile) : null, [profile]);
  
  const age = useMemo(() => {
    if (!profile?.dob) return null;
    const today = new Date();
    const birthDate = new Date(profile.dob);
    let ageVal = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) ageVal--;
    return ageVal;
  }, [profile?.dob]);
  
  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Загрузка профиля...</div>;
  
  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("муж") || genderStr.toLowerCase() === "male";
  
  const meridianInfo = insights ? getMeridianInfo(insights.zodiac) : { tip: "" };
  const chronoPeaks = insights ? getChronotypePeaks(profile.chronotype) : {};
  const destiny = insights?.destiny || { degree: 241, interpretation: "Интеграция опыта" };
  const currentJiaziIndex = age ? Math.floor((age % 60) / 5) % 12 : 0;
  const currentJiaziStage = JIAZI_STAGES[currentJiaziIndex];
  
  const handleRefresh = () => { setIsRefreshing(true); setTimeout(() => { setIsRefreshing(false); notify?.("✅ Данные обновлены"); }, 800); };
  const handleReset = () => { if (window.confirm("Сбросить профиль?")) { setProfile(null); notify?.("🗑️ Профиль сброшен"); } };
  
  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'main' && (
        <>
          <FlipCardBlock title="Профиль" frontImage={isMale ? '/assets/avatars-icons/male-avatar.png' : '/assets/avatars-icons/female-avatar.png'} accentColor="var(--blue)" minHeight={360}
            frontContent={
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--text1)", margin: "0 0 8px 0" }}>{profile.name || "Пользователь"}</h2>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
                  <span className="badge bgr" style={{ fontSize: 12, padding: "4px 10px" }}>🎂 {age ?? "—"} лет</span>
                  {profile.chronotype && <span className="badge bt" style={{ fontSize: 12, padding: "4px 10px" }}>⏱ {profile.chronotype}</span>}
                  {insights?.zodiac && <span className="badge bm" style={{ fontSize: 12, padding: "4px 10px" }}>♈ {insights.zodiac}</span>}
                </div>
              </div>
            }
          >
            <div style={{ textAlign: "center", color: "var(--text3)", marginTop: 40 }}>Подробная информация доступна в настройках.</div>
          </FlipCardBlock>
        </>
      )}
      
      {activeTab === 'deep' && (
        <>
          {/* 1. ГЛУБОКИЙ АНАЛИЗ (СЕТКА 2x2 С SVG) */}
          <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 18, border: "1px solid var(--line)", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 4, height: 24, background: "var(--blue)", borderRadius: 2 }} />
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>🔍 Глубокий анализ профиля</h3>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              
              {/* Методология (СКРЫТА) */}
              <div style={{ display: 'none', background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--blue)" }}>
                <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", margin: "0 0 8px 0" }}>Методология</h4>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                  <div><strong>Цзяцзы:</strong> Возраст редуцируется по модулю 60.</div>
                  <div style={{marginTop:4}}><strong>Ведический календарь:</strong> Сезонный фон (Ян/Инь Ци).</div>
                </div>
              </div>
              
              {/* Синхронизация (SVG RADIAL) */}
              <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--gold)" }}>
                <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--gold)", margin: "0 0 8px 0" }}>Синхронизация</h4>
                <SyncRadialChart jiaziStage={currentJiaziStage} chronotype={profile.chronotype} moonPhase="waxing" />
                <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--text2)", textAlign: "center" }}>
                  <p>Ваша текущая фаза: <strong style={{color:"var(--blue)"}}>{currentJiaziStage?.name}</strong></p>
                  <p style={{fontSize:12}}>Синхронизация биоритмов с лунным циклом</p>
                </div>
              </div>
              
              {/* Рекомендации (SVG RADAR) */}
              <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--success)" }}>
                <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--success)", margin: "0 0 8px 0" }}>Рекомендации</h4>
                <RecommendationsRadar insights={insights} />
                <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                  <ul style={{ margin: "0 0 0 16px", padding: 0 }}>
                    <li>Планируйте решения на часы пика биоритмов</li>
                    <li>Фокус на {currentJiaziStage?.spheres?.career || 'развитии'}</li>
                    <li>Избегайте терапии в запрещённые лунные дни</li>
                  </ul>
                </div>
              </div>
              
              {/* Зоны внимания (SVG SILHOUETTE) */}
              <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--error)" }}>
                <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--error)", margin: "0 0 8px 0" }}>Зоны внимания</h4>
                <AttentionZonesSVG zodiac={insights?.zodiac} meridianInfo={meridianInfo} />
                <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                  <p>Учитывая знак <strong>{insights?.zodiac || '—'}</strong>:</p>
                  <p style={{fontSize:12, marginTop:4}}>{meridianInfo?.tip || 'Регулярность питания и режим'}</p>
                </div>
              </div>
              
            </div>
          </div>
          
          {/* 2. ВЕДИЧЕСКИЙ КАЛЕНДАРЬ (ОБНОВЛЕННЫЕ ПУТИ И РАЗМЕРЫ) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            <FlipCardBlock 
              title="Солнечный сезон" 
              frontImage="/assets/avatars-icons/bazi-five-elements.png" 
              accentColor="var(--success)"
              minHeight={220}
              frontContent={
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", letterSpacing: 1 }}>ПЯТЬ ЭЛЕМЕНТОВ</div>
                </div>
              }
            >
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>Энергия парит, болезни поднимаются на поверхность. Применяйте методы рассеивания Ци и лёгкие практики.</p>
              <div style={{ marginTop: 8, padding: 8, background: "rgba(45,106,79,0.08)", borderRadius: 6 }}>
                <small style={{ color: "var(--success)" }}>Совет: Следите за балансом Инь-Ян в питании.</small>
              </div>
            </FlipCardBlock>
            
            <FlipCardBlock 
              title="Лунный фон" 
              frontImage="/assets/avatars-icons/bazi-ten-gods.png" 
              accentColor="var(--error)"
              minHeight={220}
              frontContent={
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", letterSpacing: 1 }}>ДЕСЯТЬ БОГОВ</div>
                </div>
              }
            >
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>В дни новолуния/полнолуния организм ослаблен. Избегайте малой хирургии, иглотерапии и агрессивных процедур на коже.</p>
              <div style={{ marginTop: 8, padding: 8, background: "rgba(139,32,32,0.06)", borderRadius: 6 }}>
                <small style={{ color: "var(--error)" }}>⚠️ Внимание: Избегайте агрессивных процедур.</small>
              </div>
            </FlipCardBlock>
          </div>
          
          {/* 3. ГРАФИК ЖИЗНЕННОГО ЦИКЛА (УЛУЧШЕННЫЙ) */}
          <CycleTimeline dob={profile.dob} onYearSelect={setSelectedYear} />
        </>
      )}
      
      <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
        <button className="btn btn-primary" onClick={handleRefresh} disabled={isRefreshing} style={{ flex: 1 }}>
          {isRefreshing ? "⏳ Обновление..." : "🔄 Обновить данные"}
        </button>
        <button className="btn btn-ghost" onClick={handleReset} style={{ flex: 1, borderColor: "rgba(139,32,32,0.4)", color: "var(--error)" }}>
          🗑️ Сброс профиля
        </button>
      </div>
      
      {selectedYear !== null && <YearModal year={selectedYear} currentAge={age} onClose={() => setSelectedYear(null)} />}
    </div>
  );
}
