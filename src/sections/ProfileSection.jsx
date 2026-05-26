// src/sections/ProfileSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
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

// ─── УТИЛИТЫ ДЛЯ ПУТЕЙ К КАРТИНКАМ ───
const ZODIAC_SLUGS = {
  'овен': 'aries', 'телец': 'taurus', 'близнецы': 'gemini', 'рак': 'cancer',
  'лев': 'leo', 'дева': 'virgo', 'весы': 'libra', 'скорпион': 'scorpio',
  'стрелец': 'sagittarius', 'козерог': 'capricorn', 'водолей': 'aquarius', 'рыбы': 'pisces'
};
const EASTERN_SLUGS = {
  'крыса': 'rat', 'бык': 'ox', 'корова': 'ox', 'тигр': 'tiger', 'кролик': 'rabbit',
  'дракон': 'dragon', 'змея': 'snake', 'лошадь': 'horse', 'коза': 'goat', 'овца': 'goat',
  'обезьяна': 'monkey', 'петух': 'rooster', 'собака': 'dog', 'свинья': 'pig'
};

function getSafeImagePath(type, name, fallback) {
  const map = type === 'zodiac' ? ZODIAC_SLUGS : type === 'eastern' ? EASTERN_SLUGS : {};
  const raw = name ? String(name).toLowerCase().trim() : fallback;
  const slug = map[raw] || raw.replace(/\s+/g, '-');
  return `/assets/avatars-icons/front-${type}-${slug}.png`;
}

// ─── ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ───
function ProfileTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'main', label: 'ОСНОВНОЙ' },
    { id: 'deep', label: 'ГЛУБОКИЙ АНАЛИЗ' },
    { id: 'cycle', label: 'ЦИКЛЫ' }
  ];
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "rgba(0,112,192,0.06)", borderRadius: 8, padding: 4, border: "1px solid var(--line)" }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            flex: 1, padding: "10px 0", border: "none", borderRadius: 6, cursor: "pointer",
            fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1,
            background: activeTab === tab.id ? "var(--blue)" : "transparent",
            color: activeTab === tab.id ? "#fff" : "var(--text2)",
            transition: "all 0.2s", userSelect: "none"
          }}
        >
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
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--gold)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>▼</span>
      </div>
      {open && <div style={{ padding: "0 12px 12px", fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>{children}</div>}
    </div>
  );
}

function FlipCardBlock({ title, frontImage, accentColor = "var(--blue)", children, minHeight = 260, frontContent }) {
  const [flipped, setFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);

  const getFallbackEmoji = () => {
    if (title.includes("Западный")) return "♈";
    if (title.includes("Восточный")) return "🐲";
    if (title.includes("Хроно")) return "⏱️";
    if (title.includes("Градус")) return "✨";
    if (title.includes("Профиль")) return "👤";
    if (title.includes("Солнечный")) return "☀️";
    if (title.includes("Лунный")) return "🌙";
    return "📄";
  };

  return (
    <div style={{ perspective: "1200px", marginBottom: 20, userSelect: "none" }}>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{ position: "relative", width: "100%", minHeight, transformStyle: "preserve-3d", transition: "transform 0.6s", transform: flipped ? "rotateY(180deg)" : "none", cursor: "pointer", borderRadius: 12 }}
      >
        {/* ЛИЦЕВАЯ СТОРОНА */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg, #f8f4e8 0%, #e8d8c0 100%)", border: "2px solid var(--gold)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: 8, boxSizing: "border-box" }}>
          {!imgError && frontImage ? (
            <img src={frontImage} alt={title} style={{ width: "100%", maxWidth: 220, height: "auto", objectFit: "contain", marginBottom: 6, flexShrink: 0, pointerEvents: "none" }} onError={() => setImgError(true)} />
          ) : (
            <div style={{ fontSize: 56, marginBottom: 6, opacity: 0.4, color: "var(--text3)" }}>{getFallbackEmoji()}</div>
          )}
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", letterSpacing: "0.5px", fontWeight: 600 }}>{title}</div>
          </div>
          {frontContent && (
            <div style={{ width: "100%", textAlign: "center", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {frontContent}
            </div>
          )}
          {!frontContent && (
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Нажмите для деталей</div>
          )}
        </div>
        {/* ОБОРОТНАЯ СТОРОНА */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 12, overflow: "hidden", background: "#fff", border: "1.5px solid rgba(0,112,192,0.25)", padding: 14, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", margin: "0 0 10px 0", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>{title}</h3>
          <div style={{ overflowY: "auto", flex: 1, fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function YearModal({ year, currentAge, onClose }) {
  const safeIdx = Math.max(0, Math.min(11, Math.floor((year % 60) / 5) % 12));
  const stage = JIAZI_STAGES[safeIdx];
  if (!stage) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", userSelect: "none" }}>
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

// ─── SVG КОМПОНЕНТЫ С АНИМАЦИЕЙ ───
function SyncRadialChart() {
  return (
    <div style={{ position: "relative", width: "100%", height: 220, userSelect: "none" }}>
      <img src="/assets/avatars-icons/bazi-sync-orbital.png" alt="Sync" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0.3, filter: "grayscale(100%) sepia(20%)", pointerEvents: "none" }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 200 220">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="100" cy="110" r="85" fill="none" stroke="var(--blue)" strokeWidth="2" strokeDasharray="4,4" opacity="0.6">
          <animateTransform attributeName="transform" type="rotate" from="0 100 110" to="360 100 110" dur="30s" repeatCount="indefinite" />
        </circle>
        <text x="100" y="25" textAnchor="middle" fontSize="9" fill="var(--blue)" fontFamily="var(--font-mono)" fontWeight="600">{"ЦЗЯЦЗЫ (60 лет)"}</text>
        <circle cx="100" cy="110" r="60" fill="none" stroke="var(--gold)" strokeWidth="2" strokeDasharray="2,3" opacity="0.8">
          <animateTransform attributeName="transform" type="rotate" from="360 100 110" to="0 100 110" dur="20s" repeatCount="indefinite" />
        </circle>
        <text x="100" y="195" textAnchor="middle" fontSize="9" fill="var(--gold)" fontFamily="var(--font-mono)" fontWeight="600">{"БИОРИТМЫ"}</text>
        <circle cx="100" cy="110" r="35" fill="none" stroke="var(--success)" strokeWidth="2" opacity="0.9">
          <animate attributeName="r" values="35;37;35" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x="100" y="115" textAnchor="middle" fontSize="8" fill="var(--success)" fontFamily="var(--font-mono)">{"ЛУНА (28 дней)"}</text>
        <circle r="4" fill="var(--blue)" filter="url(#glow)">
          <animateMotion dur="10s" repeatCount="indefinite" path="M100,25 A85,85 0 1,1 100,195 A85,85 0 1,1 100,25" />
        </circle>
        <circle r="3" fill="var(--gold)">
          <animateMotion dur="7s" repeatCount="indefinite" path="M100,50 A60,60 0 1,1 100,170 A60,60 0 1,1 100,50" />
        </circle>
      </svg>
    </div>
  );
}

function RecommendationsChecklist({ insights, profile }) {
  const goals = profile?.goalAreas || [];
  const stress = profile?.stressLevel || 5;

  const calc = (keywords, penaltyThreshold, penaltyVal) => {
    let base = 55;
    const match = keywords.some(k => goals.some(g => String(g).toLowerCase().includes(k.toLowerCase())));
    if (match) base += 25;
    if (stress > penaltyThreshold) base -= penaltyVal;
    return Math.max(10, Math.min(100, base));
  };

  const spheres = [
    { key: 'health',    label: 'Здоровье',   icon: '❤️', value: calc(['Здоровье', 'Спорт', 'Энергия'], 7, 20) },
    { key: 'career',    label: 'Карьера',     icon: '💼', value: calc(['Карьера', 'Бизнес', 'Работа'], 9, 5) },
    { key: 'relations', label: 'Отношения',   icon: '🤝', value: calc(['Отношения', 'Семья', 'Друзья'], 8, 10) },
    { key: 'spirit',    label: 'Духовность',  icon: '🌟', value: calc(['Духовность', 'Развитие', 'Осознанность'], 6, 15) },
    { key: 'finance',   label: 'Финансы',     icon: '💰', value: calc(['Финансы', 'Доход', 'Бюджет'], 9, 5) }
  ];

  const practices = insights?.practices || [];

  return (
    <div style={{ position: "relative", width: "100%", padding: "10px 0", userSelect: "none" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {spheres.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ fontSize: 14, pointerEvents: "none" }}>{s.icon}</span>
            <span style={{ width: 80, color: "var(--text2)", fontWeight: 500, pointerEvents: "none" }}>{s.label}</span>
            <div style={{ flex: 1, height: 8, background: "rgba(0,112,192,0.1)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                width: `${s.value}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--blue), var(--gold))",
                borderRadius: 4,
                transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                pointerEvents: "none"
              }} />
            </div>
            <span style={{ width: 30, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, pointerEvents: "none" }}>{s.value}%</span>
          </div>
        ))}
      </div>

      {practices.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 1, marginBottom: 8 }}>📚 РЕКОМЕНДАЦИИ ИЗ БАЗЫ ЗНАНИЙ</div>
          {practices.map(p => (
            <div key={p.id} style={{ fontSize: 12, marginBottom: 6, color: "var(--text2)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text1)" }}>{p.title}</strong> <span style={{ color: "var(--success)", fontSize: 10 }}>({p.duration} мин)</span> — {p.desc}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttentionZonesOrgans({ zodiac, insights }) {
  const normalize = (s) => s ? String(s).trim().toLowerCase() : '';
  const weakZones = {
    'овен':      ['head', 'eyes'],
    'телец':     ['throat', 'neck'],
    'близнецы':  ['lungs', 'arms'],
    'рак':       ['stomach', 'chest'],
    'лев':       ['heart', 'back'],
    'дева':      ['intestines', 'nerves'],
    'весы':      ['kidneys', 'waist'],
    'скорпион':  ['reproductive', 'nose'],
    'стрелец':   ['liver', 'hips'],
    'козерог':   ['bones', 'knees'],
    'водолей':   ['ankles', 'nerves'],
    'рыбы':      ['feet', 'immune']
  };
  const zones = weakZones[normalize(zodiac)] || ['stomach', 'nerves'];

  const zoneShapes = {
    head:         <ellipse cx="100" cy="28" rx="18" ry="20" />,
    eyes:         <><ellipse cx="91" cy="24" rx="5" ry="4" /><ellipse cx="109" cy="24" rx="5" ry="4" /></>,
    throat:       <ellipse cx="100" cy="50" rx="12" ry="8" />,
    neck:         <ellipse cx="100" cy="50" rx="10" ry="10" />,
    lungs:        <><ellipse cx="84" cy="82" rx="14" ry="18" /><ellipse cx="116" cy="82" rx="14" ry="18" /></>,
    arms:         <><ellipse cx="66" cy="105" rx="9" ry="22" /><ellipse cx="134" cy="105" rx="9" ry="22" /></>,
    chest:        <ellipse cx="100" cy="80" rx="28" ry="20" />,
    heart:        <ellipse cx="90" cy="78" rx="12" ry="12" />,
    back:         <ellipse cx="100" cy="90" rx="30" ry="22" />,
    stomach:      <ellipse cx="100" cy="118" rx="22" ry="14" />,
    intestines:   <ellipse cx="100" cy="132" rx="24" ry="16" />,
    nerves:       <><line x1="100" y1="55" x2="100" y2="160" stroke="var(--error)" strokeWidth="3" fill="none" /><line x1="80" y1="90" x2="120" y2="90" stroke="var(--error)" strokeWidth="2" fill="none" /></>,
    kidneys:      <><ellipse cx="84" cy="122" rx="10" ry="13" /><ellipse cx="116" cy="122" rx="10" ry="13" /></>,
    waist:        <ellipse cx="100" cy="140" rx="26" ry="10" />,
    reproductive: <ellipse cx="100" cy="152" rx="18" ry="14" />,
    nose:         <ellipse cx="100" cy="36" rx="5" ry="6" />,
    liver:        <ellipse cx="112" cy="116" rx="16" ry="12" />,
    hips:         <><ellipse cx="82" cy="158" rx="14" ry="16" /><ellipse cx="118" cy="158" rx="14" ry="16" /></>,
    bones:        <><ellipse cx="84" cy="155" rx="8" ry="20" /><ellipse cx="116" cy="155" rx="8" ry="20" /></>,
    knees:        <><ellipse cx="84" cy="178" rx="10" ry="10" /><ellipse cx="116" cy="178" rx="10" ry="10" /></>,
    ankles:       <><ellipse cx="87" cy="200" rx="8" ry="7" /><ellipse cx="113" cy="200" rx="8" ry="7" /></>,
    feet:         <><ellipse cx="87" cy="210" rx="10" ry="7" /><ellipse cx="113" cy="210" rx="10" ry="7" /></>,
    immune:       <ellipse cx="100" cy="110" rx="35" ry="50" />,
  };

  const durations = ['1.5s', '1.8s', '2.0s', '2.2s', '2.5s'];

  return (
    <div style={{ position: "relative", width: "100%", height: 220, marginBottom: 16, userSelect: "none" }}>
      <img
        src="/assets/avatars-icons/attention-organs-meridians.png"
        alt="Zones"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0.4, pointerEvents: "none" }}
      />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 200 220">
        <defs>
          <filter id="pulse-glow-organs">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {zones.map((zone, idx) => {
          const shape = zoneShapes[zone];
          if (!shape) return null;
          const dur = durations[idx % durations.length];
          return (
            <g
              key={zone}
              fill="rgba(139,32,32,0.25)"
              stroke="var(--error)"
              strokeWidth="2"
              filter="url(#pulse-glow-organs)"
              style={{ pointerEvents: "none" }}
            >
              <animate attributeName="opacity" values="0.35;0.9;0.35" dur={dur} repeatCount="indefinite" />
              {shape}
            </g>
          );
        })}

        {/* меридианные линии */}
        <path d="M 100 60 Q 130 90 100 140" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.7">
          <animate attributeName="stroke-dashoffset" values="0;8" dur="1.2s" repeatCount="indefinite" />
        </path>
        <path d="M 100 60 Q 70 90 100 140" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.7">
          <animate attributeName="stroke-dashoffset" values="0;8" dur="1.2s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}

function CycleTimeline({ dob, onYearSelect }) {
  const age = useMemo(() => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let ageVal = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) ageVal--;
    return Math.max(0, ageVal);
  }, [dob]);

  const [expandedIdx, setExpandedIdx] = useState(null);

  const SPHERE_LABELS = {
    health:    { label: 'Здоровье',   icon: '❤️', color: '#2d6a4f' },
    career:    { label: 'Карьера',    icon: '💼', color: '#0070c0' },
    relations: { label: 'Отношения',  icon: '🤝', color: '#e8556d' },
    spirit:    { label: 'Духовность', icon: '🌟', color: '#b882e8' },
    finance:   { label: 'Финансы',    icon: '💰', color: '#c8a45a' },
  };

  const periods = Array.from({ length: 20 }, (_, i) => {
    const startAge = i * 5;
    const endAge = startAge + 4;
    const stageIdx = Math.max(0, Math.min(11, Math.floor((startAge % 60) / 5) % 12));
    const stage = JIAZI_STAGES[stageIdx];
    const isPast = endAge < age;
    const isCurrent = startAge <= age && age <= endAge;
    const isFuture = startAge > age;
    return { startAge, endAge, stage, stageIdx, isPast, isCurrent, isFuture, idx: i };
  });

  const safeStageIdx = Math.max(0, Math.min(11, Math.floor((age % 60) / 5) % 12));
  const currentStage = JIAZI_STAGES[safeStageIdx];

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid var(--line)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", userSelect: "none" }}>
      {/* Заголовок */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, color: "var(--blue)", margin: 0 }}>🌊 Жизненный цикл (Цзяцзы)</h3>
        <span className="badge bgr">{age} лет · {currentStage?.name}</span>
      </div>

      {/* Легенда */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20, padding: "10px 14px", background: "rgba(0,112,192,0.04)", borderRadius: 8, fontSize: 11, color: "var(--text2)" }}>
        <span>⬛ Прошлое</span>
        <span style={{ color: "var(--gold)", fontWeight: 600 }}>▶ Сейчас</span>
        <span style={{ opacity: 0.5 }}>◻ Прогноз</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10 }}>Нажмите период для деталей</span>
      </div>

      {/* Таймлайн */}
      <div style={{ position: "relative" }}>
        {/* Вертикальная линия */}
        <div style={{ position: "absolute", left: 28, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, var(--blue) 0%, rgba(0,112,192,0.1) 100%)", borderRadius: 2 }} />

        {periods.map((p) => {
          const isExpanded = expandedIdx === p.idx;
          const dotColor = p.isCurrent ? "var(--gold)" : p.isPast ? "var(--blue)" : "rgba(0,112,192,0.25)";
          const cardBg = p.isCurrent
            ? "linear-gradient(135deg, #fffbe6 0%, #fff8d6 100%)"
            : p.isPast
            ? "rgba(0,112,192,0.03)"
            : "rgba(240,240,255,0.4)";
          const borderColor = p.isCurrent ? "var(--gold)" : p.isPast ? "rgba(0,112,192,0.2)" : "rgba(0,0,0,0.06)";

          return (
            <div key={p.idx} style={{ display: "flex", gap: 0, marginBottom: 6, alignItems: "flex-start" }}>
              {/* Точка на линии */}
              <div style={{ position: "relative", width: 58, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12 }}>
                <div style={{
                  width: p.isCurrent ? 18 : 12,
                  height: p.isCurrent ? 18 : 12,
                  borderRadius: "50%",
                  background: dotColor,
                  border: p.isCurrent ? "3px solid #b8860b" : "2px solid " + dotColor,
                  zIndex: 1,
                  position: "relative",
                  boxShadow: p.isCurrent ? "0 0 10px rgba(200,164,90,0.6)" : "none",
                  transition: "all 0.3s"
                }}>
                  {p.isCurrent && (
                    <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: "2px solid var(--gold)", opacity: 0.5, animation: "pulse-ring-cycle 2s infinite" }} />
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: p.isCurrent ? "var(--gold)" : "var(--text3)", marginTop: 4, textAlign: "center", fontWeight: p.isCurrent ? 700 : 400, lineHeight: 1.2 }}>
                  {p.startAge}–{p.endAge}
                </div>
              </div>

              {/* Карточка периода */}
              <div
                onClick={() => { setExpandedIdx(isExpanded ? null : p.idx); onYearSelect(p.startAge); }}
                style={{
                  flex: 1,
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderLeft: p.isCurrent ? "3px solid var(--gold)" : `1px solid ${borderColor}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  opacity: p.isFuture ? 0.75 : 1,
                  transition: "all 0.2s",
                }}
              >
                {/* Заголовок карточки */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-head)", fontSize: 13, color: p.isCurrent ? "var(--gold)" : p.isPast ? "var(--text1)" : "var(--text2)", fontWeight: p.isCurrent ? 700 : 500 }}>
                      {p.isCurrent && "▶ "}{p.stage?.name}
                    </span>
                    {p.isFuture && (
                      <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--blue)", background: "rgba(0,112,192,0.08)", padding: "1px 5px", borderRadius: 3 }}>ПРОГНОЗ</span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text3)", transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▾</span>
                </div>

                {/* Краткое описание */}
                <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4, lineHeight: 1.4 }}>
                  {p.stage?.tips}
                  {p.stage?.critical && (
                    <span style={{ marginLeft: 6, color: "var(--error)", fontSize: 10 }}>⚠ {p.stage.critical}</span>
                  )}
                </div>

                {/* Сферы — мини-теги, всегда видны */}
                <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                  {Object.entries(SPHERE_LABELS).map(([key, meta]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--text3)" }}>
                      <span style={{ fontSize: 11 }}>{meta.icon}</span>
                      <span style={{ color: meta.color, fontWeight: 500 }}>{p.stage?.spheres?.[key]}</span>
                    </div>
                  ))}
                </div>

                {/* Раскрытая детализация */}
                {isExpanded && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)", animation: "fadeInUp 0.2s ease" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--blue)", letterSpacing: 0.5, marginBottom: 8 }}>ДЕТАЛИЗАЦИЯ ПО СФЕРАМ</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6 }}>
                      {Object.entries(SPHERE_LABELS).map(([key, meta]) => (
                        <div key={key} style={{ padding: "6px 8px", background: "#fff", borderRadius: 6, border: `1px solid ${meta.color}30`, borderLeft: `3px solid ${meta.color}` }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: meta.color, marginBottom: 2 }}>{meta.icon} {meta.label}</div>
                          <div style={{ fontSize: 12, color: "var(--text1)", lineHeight: 1.4 }}>{p.stage?.spheres?.[key]}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(139,32,32,0.04)", borderRadius: 6, borderLeft: "3px solid var(--error)" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--error)", marginBottom: 2 }}>⚠ КРИТИЧЕСКИЙ МОМЕНТ</div>
                      <div style={{ fontSize: 12, color: "var(--text2)" }}>{p.stage?.critical}</div>
                    </div>
                    <div style={{ marginTop: 6, padding: "8px 10px", background: "rgba(0,112,192,0.04)", borderRadius: 6, borderLeft: "3px solid var(--blue)" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--blue)", marginBottom: 2 }}>💡 СОВЕТ</div>
                      <div style={{ fontSize: 12, color: "var(--text2)" }}>{p.stage?.tips}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse-ring-cycle {
          0%   { transform: scale(0.9); opacity: 0.6; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
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
    return Math.max(0, ageVal);
  }, [profile?.dob]);

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Загрузка профиля...</div>;

  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("муж") || genderStr.toLowerCase() === "male";
  const meridianInfo = insights ? getMeridianInfo(insights.zodiac) : { tip: "" };
  const chronoPeaks = insights ? getChronotypePeaks(profile.chronotype) : {};
  const destiny = insights?.destiny || { degree: 241, interpretation: "Интеграция опыта" };

  const safeStageIdx = age !== null && age !== undefined
    ? Math.max(0, Math.min(11, Math.floor((age % 60) / 5) % 12))
    : 0;
  const currentStage = JIAZI_STAGES[safeStageIdx];

  const handleRefresh = () => { setIsRefreshing(true); setTimeout(() => { setIsRefreshing(false); notify?.("✅ Данные обновлены"); }, 800); };
  const handleReset = () => { if (window.confirm("Сбросить профиль?")) { setProfile(null); notify?.("🗑️ Профиль сброшен"); } };

  return (
    <div className="page" style={{ paddingBottom: 100, userSelect: "none" }}>
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ВКЛАДКА: ОСНОВНОЙ */}
      {activeTab === 'main' && (
        <>
          <FlipCardBlock title="Профиль" frontImage={isMale ? '/assets/avatars-icons/male-avatar.png' : '/assets/avatars-icons/female-avatar.png'} accentColor="var(--blue)" minHeight={280}
            frontContent={
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--text1)", margin: "0 0 6px 0" }}>{profile.name || "Пользователь"}</h2>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <span className="badge bgr">🎂 {age ?? "—"} лет</span>
                  {profile.chronotype && <span className="badge bt">⏱ {profile.chronotype}</span>}
                  {insights?.zodiac && <span className="badge bm">♈ {insights.zodiac}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.4, padding: "6px 10px", background: "rgba(0,112,192,0.05)", borderRadius: 6, borderLeft: "2px solid var(--gold)", textAlign: "left" }}>
                  <strong style={{ color: "var(--gold-dark)" }}>Сводка:</strong> {insights?.zodiac || "—"} ({insights?.zodiacElement || "Воздух"}) · {insights?.eastern || "—"} ({insights?.easternElement || "Вода"}) · Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
                </div>
              </div>
            }
          >
            <div style={{ textAlign: "center", color: "var(--text3)", marginTop: 40, fontSize: 12 }}>
              <p>Подробная информация доступна в настройках приложения.</p>
            </div>
          </FlipCardBlock>

          <FlipCardBlock title="Западный Зодиак" frontImage={getSafeImagePath('zodiac', insights?.zodiac, 'gemini')} accentColor="var(--blue)"
            frontContent={
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text2)", padding: "0 6px" }}>
                <p style={{ marginBottom: 6, fontWeight: 500 }}>
                  <strong style={{ color: "var(--blue)", fontSize: 14 }}>{insights?.zodiac || "—"}</strong> <span>({insights?.zodiacElement || "Воздух"}) под управлением {insights?.rulingPlanet || "Меркурия"}.</span>
                </p>
                <InnerAccordion title="Сильные стороны" defaultOpen={true}>{insights?.zodiacStrengths || "Коммуникация, адаптивность"}</InnerAccordion>
              </div>
            }
          >
            <InnerAccordion title="Уязвимые зоны">{insights?.zodiacWeaknesses || "Лёгкие, бронхи, плечи, нервная система"}</InnerAccordion>
            <InnerAccordion title="Как использовать">
              <ul style={{ margin: "0 0 0 16px", lineHeight: 1.6, fontSize: 12 }}>
                <li>Планируй важные дела на {chronoPeaks.focus?.hours || "утро"}</li>
                <li>Избегай многозадачности</li>
                <li>Дыхательные практики укрепляют слабые зоны</li>
              </ul>
            </InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="Восточный Знак" frontImage={getSafeImagePath('eastern', insights?.eastern, 'rabbit')} accentColor="var(--gold)"
            frontContent={
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text2)", padding: "0 6px" }}>
                <p style={{ marginBottom: 6, fontWeight: 500 }}>
                  <strong style={{ color: "var(--gold-dark)", fontSize: 14 }}>{insights?.eastern || "—"}</strong> <span>({insights?.easternElement || "Вода"}).</span>
                </p>
                <InnerAccordion title="Энергетический портрет" defaultOpen={true}>{insights?.easternTraits || "Честность и терпимость"}. Твоя стихия наделяет тебя глубокой интуицией.</InnerAccordion>
              </div>
            }
          >
            <InnerAccordion title="Кармическая задача">{insights?.easternKarma || "Научиться говорить 'нет' без чувства вины"}. Выстраивай границы.</InnerAccordion>
            <InnerAccordion title="Рекомендации">
              <ul style={{ margin: "0 0 0 16px", lineHeight: 1.6, fontSize: 12 }}>
                <li>Используй спады энергии для восстановления</li>
                <li>Доверяй интуиции в финансовых вопросах</li>
                <li>Избегай токсичных связей</li>
              </ul>
            </InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="Градус Судьбы" frontImage="/assets/avatars-icons/front-destiny.png" accentColor="var(--gold)"
            frontContent={
              <div style={{ textAlign: "center", padding: "0 6px" }}>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 24, color: "var(--gold)", fontWeight: 600, letterSpacing: "2px" }}>{destiny.degree || 241}°</div>
                <div style={{ fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text2)", marginTop: 2, fontStyle: "italic" }}>{destiny.interpretation || "Интеграция опыта"}</div>
                <InnerAccordion title="Описание" defaultOpen={true} style={{ marginTop: 8, textAlign: "left" }}>
                  Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла. {destiny.degree < 120 ? "Активное созидание. " : destiny.degree < 240 ? "Структурирование роста. " : "Интеграция опыта. "}
                </InnerAccordion>
              </div>
            }
          >
            <div style={{ textAlign: "center", color: "var(--text3)", marginTop: 20, fontSize: 12 }}>
              <p>Детальный разбор градуса доступен в расширенной версии.</p>
            </div>
          </FlipCardBlock>

          <FlipCardBlock title="Хроно-тип" frontImage={`/assets/avatars-icons/front-chrono-${profile.chronotype?.toLowerCase().includes('жаворонок') ? 'lark' : profile.chronotype?.toLowerCase().includes('сова') ? 'owl' : 'pigeon'}.png`} accentColor="var(--blue)"
            frontContent={
              <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text2)", padding: "0 6px" }}>
                <p style={{ marginBottom: 8, fontWeight: 500 }}>
                  <strong style={{ color: "var(--blue)", fontSize: 14 }}>{profile.chronotype || "🕊️ Голубь"}</strong>
                </p>
                <div style={{ padding: 8, background: "rgba(45,106,79,0.08)", borderRadius: 6, borderLeft: "2px solid var(--success)", marginBottom: 8 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--success)", letterSpacing: 1, marginBottom: 2 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
                  <p style={{ margin: 0, fontSize: 11 }}>{chronoPeaks.focus?.tip || "Самые сложные задачи — в это время."}</p>
                </div>
              </div>
            }
          >
            <div style={{ padding: 8, background: "rgba(139,32,32,0.06)", borderRadius: 6, borderLeft: "2px solid var(--error)", marginBottom: 10 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--error)", letterSpacing: 1, marginBottom: 2 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
              <p style={{ margin: 0, fontSize: 11 }}>{chronoPeaks.rest?.tip || "Идеально для рутины."}</p>
            </div>
            <InnerAccordion title="Как использовать" defaultOpen={true}>
              <ul style={{ margin: "0 0 0 16px", lineHeight: 1.6, fontSize: 12 }}>
                <li>Синхронизируй расписание с биоритмами — КПД +30–40%</li>
                <li>Сложные решения — только в пиковые часы</li>
                <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"}</li>
              </ul>
            </InnerAccordion>
          </FlipCardBlock>
        </>
      )}

      {/* ВКЛАДКА: ГЛУБОКИЙ АНАЛИЗ */}
      {activeTab === 'deep' && (
        <>
          <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 18, border: "1px solid var(--line)", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
              <div style={{ width: 4, height: 24, background: "var(--blue)", borderRadius: 2 }} />
              <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>🔍 Глубокий анализ профиля</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

              {/* 2.1 СИНХРОНИЗАЦИЯ */}
              <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--gold)" }}>
                <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--gold)", margin: "0 0 8px 0" }}>Синхронизация</h4>
                <SyncRadialChart />
                <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.6, color: "var(--text2)", background: "rgba(0,112,192,0.03)", padding: 10, borderRadius: 6 }}>
                  <p style={{ margin: "0 0 6px 0" }}><strong style={{ color: "var(--blue)" }}>🔄 Цзяцзы (60 лет):</strong> Текущий цикл: <em>{currentStage?.name || "Начало пути"}</em>. Задаёт вектор Ци для здоровья, карьеры и отношений.</p>
                  <p style={{ margin: "0 0 6px 0" }}><strong style={{ color: "var(--gold)" }}>📊 Биоритмы:</strong> Тип {profile.chronotype}. Пик когнитивной функции: <em>{chronoPeaks.focus?.hours || "10:00–14:00"}</em>. Планируй сложные задачи на это окно.</p>
                  <p style={{ margin: 0 }}><strong style={{ color: "var(--success)" }}>🌙 Лунный день {insights?.moonDay}:</strong> {insights?.moonRestriction?.forbidden ? `⚠️ Ограничь воздействие на: ${insights.moonRestriction.forbidden}` : "Благоприятный фон для активных действий."}</p>
                </div>
              </div>

              {/* 2.2 РЕКОМЕНДАЦИИ */}
              <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--success)", animation: "fadeInUp 0.8s ease-out" }}>
                <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--success)", margin: "0 0 8px 0" }}>Рекомендации</h4>
                <RecommendationsChecklist insights={insights} profile={profile} />
              </div>

              {/* 2.3 ЗОНЫ ВНИМАНИЯ */}
              <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--error)", animation: "fadeInUp 0.8s ease-out 0.15s both" }}>
                <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--error)", margin: "0 0 8px 0" }}>Зоны внимания</h4>
                <AttentionZonesOrgans zodiac={insights?.zodiac} insights={insights} />
                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
                  <p style={{ margin: "0 0 4px 0" }}><strong>Знак:</strong> {insights?.zodiac || '—'}</p>
                  <p style={{ margin: "0 0 4px 0" }}><strong>Уязвимости:</strong> {insights?.zodiacWeaknesses || 'Нет данных'}</p>
                  <p style={{ margin: 0, color: "var(--blue)" }}><strong>Меридиан:</strong> {meridianInfo?.tip || 'Следите за балансом'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2.4 КАРТОЧКИ СОЛНЕЧНЫЙ/ЛУННЫЙ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
            <FlipCardBlock title="Солнечный сезон" frontImage="/assets/avatars-icons/bazi-five-elements.png" accentColor="var(--success)" minHeight={220}>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>Энергия парит. Применяйте методы рассеивания Ци и лёгкие практики. Текущий сезон: <strong>{insights?.season || '—'}</strong>.</p>
              <div style={{ marginTop: 8, padding: 8, background: "rgba(45,106,79,0.08)", borderRadius: 6 }}>
                <small style={{ color: "var(--success)" }}>Совет: Баланс Инь-Ян в питании. Пейте больше тёплой воды, избегайте резких температурных перепадов.</small>
              </div>
            </FlipCardBlock>
            <FlipCardBlock title="Лунный фон" frontImage="/assets/avatars-icons/bazi-ten-gods.png" accentColor="var(--error)" minHeight={220}>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>В новолуние/полнолуние организм ослаблен. Избегайте агрессивных процедур. Лунный день: <strong>{insights?.moonDay}</strong>.</p>
              <div style={{ marginTop: 8, padding: 8, background: "rgba(139,32,32,0.06)", borderRadius: 6 }}>
                <small style={{ color: "var(--error)" }}>⚠️ Внимание: Ограничьте хирургические вмешательства и интенсивные тренировки в полнолуние. Делайте акцент на восстановлении.</small>
              </div>
            </FlipCardBlock>
          </div>
        </>
      )}

      {/* ВКЛАДКА: ЦИКЛЫ */}
      {activeTab === 'cycle' && (
        <CycleTimeline dob={profile.dob} onYearSelect={setSelectedYear} />
      )}

      <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
        <button className="btn btn-primary" onClick={handleRefresh} disabled={isRefreshing} style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1 }}>
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
