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

// ─── УТИЛИТЫ ─── (без изменений)
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

// ─── ПАЛИТРА ───
const C = {
  navy:     '#0A2540',
  navyMid:  '#1E3A5F',
  navyLight:'#2C4F7A',
  gold:     '#D4AF37',
  goldDeep: '#B8941E',
  goldPale: '#F0DC90',
  bg:       '#F5E8C7',
  bgCard:   '#FAF3E0',
  bgCard2:  '#F2E8CE',
  text1:    '#0A2540',
  text2:    '#1E3A5F',
  text3:    '#4A6480',
  success:  '#1A4D2E',
  error:    '#6B1010',
  line:     'rgba(10,37,64,0.22)',
  lineS:    'rgba(10,37,64,0.10)',
};

// ─── ВКЛАДКИ — blueprint стиль ───
function ProfileTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'main',  label: 'ОСНОВНОЙ' },
    { id: 'deep',  label: 'АНАЛИЗ' },
    { id: 'cycle', label: 'ЦИКЛЫ' },
  ];
  return (
    <div style={{
      display:'flex', gap:3, marginBottom:24,
      background:`rgba(10,37,64,0.06)`,
      border:`2px solid ${C.line}`,
      borderRadius:6, padding:4,
      position:'relative',
    }}>
      {/* Gold rule под вкладками */}
      <div style={{
        position:'absolute', bottom:-1, left:16, right:16, height:1,
        background:`linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
        opacity:0.4,
      }} />
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            flex:1, padding:'10px 0', border:'none', borderRadius:4,
            cursor:'pointer',
            fontFamily:"'JetBrains Mono',monospace",
            fontSize:11, letterSpacing:1.5,
            background: activeTab === tab.id ? C.navy : 'transparent',
            color: activeTab === tab.id ? C.goldPale : C.text3,
            transition:'all 0.2s', userSelect:'none',
            fontWeight: activeTab === tab.id ? 600 : 400,
            boxShadow: activeTab === tab.id ? `0 2px 10px rgba(10,37,64,0.28)` : 'none',
          }}
        >{tab.label}</button>
      ))}
    </div>
  );
}

// ─── INNER ACCORDION — blueprint стиль ───
function InnerAccordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      marginBottom:8,
      background:`rgba(10,37,64,0.04)`,
      borderRadius:6,
      border:`1px solid ${C.lineS}`,
      borderLeft:`2px solid ${C.gold}`,
      overflow:'hidden',
    }}>
      <div
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        style={{
          padding:'8px 12px', cursor:'pointer',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          userSelect:'none',
          background: open ? `rgba(10,37,64,0.05)` : 'transparent',
        }}
      >
        <span style={{
          fontFamily:"'JetBrains Mono',monospace",
          fontSize:10, color:C.navyMid,
          letterSpacing:1, fontWeight:600,
          textTransform:'uppercase',
        }}>{title}</span>
        <span style={{
          fontSize:12, color:C.gold,
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          transition:'0.2s',
        }}>▼</span>
      </div>
      {open && (
        <div style={{
          padding:'0 12px 12px',
          fontSize:13, lineHeight:1.6,
          color:C.text2,
        }}>{children}</div>
      )}
    </div>
  );
}

// ─── FLIP CARD — лицевая: только картинка + название
//                оборот: пергаментный фон, читаемый текст ───
function FlipCardBlock({ title, frontImage, accentColor, children, minHeight = 260, frontContent }) {
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
    <div style={{ perspective:'1200px', marginBottom:14, userSelect:'none' }}>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          position:'relative', width:'100%', minHeight,
          transformStyle:'preserve-3d',
          transition:'transform 0.65s cubic-bezier(0.4,0.2,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'none',
          cursor:'pointer', borderRadius:12,
        }}
      >
        {/* ── ЛИЦЕВАЯ СТОРОНА — только картинка + название ── */}
        <div style={{
          position:'absolute', inset:0,
          backfaceVisibility:'hidden',
          borderRadius:12, overflow:'hidden',
          background:`linear-gradient(160deg, ${C.bgCard} 0%, ${C.bgCard2} 100%)`,
          border:`2px solid ${C.line}`,
          boxShadow:`0 4px 16px rgba(10,37,64,0.12), inset 0 1px 0 rgba(255,255,255,0.9)`,
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          padding:'16px 12px 14px', boxSizing:'border-box',
        }}>
          {/* Угловые маркеры */}
          <div style={{ position:'absolute', top:6, left:6, width:12, height:12,
            borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}`, opacity:0.8 }} />
          <div style={{ position:'absolute', bottom:6, right:6, width:12, height:12,
            borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}`, opacity:0.8 }} />

          {/* Хинт */}
          <div style={{
            position:'absolute', top:8, right:10,
            fontFamily:"'JetBrains Mono',monospace",
            fontSize:7, color:`rgba(10,37,64,0.35)`,
            letterSpacing:1.5, textTransform:'uppercase',
          }}>подробнее →</div>

          {/* ✅ Картинка — крупная, без мелкого контента рядом */}
          {!imgError && frontImage ? (
            <img
              src={frontImage} alt={title}
              style={{
                width:'100%', maxWidth:180, height:'auto',
                objectFit:'contain', marginBottom:14,
                flexShrink:0, pointerEvents:'none',
              }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{ fontSize:64, marginBottom:14, opacity:0.5, color:C.text3 }}>
              {getFallbackEmoji()}
            </div>
          )}

          {/* ✅ Только название — крупно и красиво */}
          <div style={{
            fontFamily:"'Cinzel',serif",
            fontSize:16, color:C.navy,
            letterSpacing:2, fontWeight:700,
            textTransform:'uppercase',
            textAlign:'center',
            lineHeight:1.3,
          }}>{title}</div>
        </div>

        {/* ── ОБОРОТНАЯ СТОРОНА — пергамент, читаемый текст ── */}
        <div style={{
          position:'absolute', inset:0,
          backfaceVisibility:'hidden',
          transform:'rotateY(180deg)',
          borderRadius:12, overflow:'hidden',
          // ✅ Светлый пергаментный фон вместо тёмно-синего
          background:`linear-gradient(160deg, ${C.bgCard} 0%, ${C.bgCard2} 100%)`,
          border:`2px solid ${C.goldDeep}`,
          padding:16,
          display:'flex', flexDirection:'column',
          backgroundImage:`
            linear-gradient(160deg, ${C.bgCard} 0%, ${C.bgCard2} 100%),
            repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(10,37,64,0.04) 28px)
          `,
        }}>
          {/* Угловые маркеры золотые */}
          <div style={{ position:'absolute', top:6, left:6, width:12, height:12,
            borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}` }} />
          <div style={{ position:'absolute', bottom:6, right:6, width:12, height:12,
            borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}` }} />

          {/* Хинт */}
          <div style={{
            position:'absolute', top:8, right:10,
            fontFamily:"'JetBrains Mono',monospace",
            fontSize:7, color:`rgba(10,37,64,0.35)`,
            letterSpacing:1.5, textTransform:'uppercase',
          }}>← назад</div>

          {/* Заголовок оборота — navy на пергаменте */}
          <h3 style={{
            fontFamily:"'Cinzel',serif",
            fontSize:14, color:C.navy,
            margin:'0 0 12px 0',
            paddingBottom:8,
            borderBottom:`1.5px solid ${C.line}`,
            letterSpacing:1.5, textTransform:'uppercase',
          }}>{title}</h3>

          {/* ✅ Весь контент — frontContent + children — на обороте */}
          <div style={{ overflowY:'auto', flex:1, fontSize:13, lineHeight:1.65, color:C.text1 }}>
            {frontContent && (
              <div style={{ marginBottom: children ? 14 : 0 }}>
                {frontContent}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── YEAR MODAL — blueprint стиль ───
function YearModal({ year, currentAge, onClose }) {
  const safeIdx = Math.max(0, Math.min(11, Math.floor((year % 60) / 5) % 12));
  const stage = JIAZI_STAGES[safeIdx];
  if (!stage) return null;

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(10,25,45,0.65)',
      backdropFilter:'blur(4px)',
      userSelect:'none',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'90%', maxWidth:560, maxHeight:'80vh', overflowY:'auto',
        background:C.bgCard,
        borderRadius:12, padding:26,
        border:`2px solid ${C.navyMid}`,
        boxShadow:`0 20px 60px rgba(10,37,64,0.28), 0 0 0 1px rgba(212,175,55,0.2)`,
        position:'relative',
        backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(10,37,64,0.04) 28px)`,
      }}>
        {/* Угловые маркеры */}
        <div style={{ position:'absolute', top:8, left:8, width:14, height:14,
          borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}` }} />
        <div style={{ position:'absolute', bottom:8, right:8, width:14, height:14,
          borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}` }} />

        <button onClick={onClose} style={{
          position:'absolute', top:12, right:14,
          background:'none', border:'none', fontSize:20,
          cursor:'pointer', color:C.text3,
        }}>✕</button>

        <h2 style={{
          fontFamily:"'Cinzel',serif",
          fontSize:18, color:C.navy,
          marginBottom:16, letterSpacing:2,
          textTransform:'uppercase',
          borderBottom:`1.5px solid ${C.line}`,
          paddingBottom:10,
        }}>Период {year} лет</h2>

        <InnerAccordion title="Фаза Цзяцзы" defaultOpen={true}>
          <strong>{stage.name}</strong>
          <p>{stage.tips}</p>
          <div style={{ marginTop:8, padding:8,
            background:'rgba(107,16,16,0.05)', borderRadius:4,
            borderLeft:`3px solid ${C.error}` }}>
            <small style={{ color:C.error }}>⚠️ {stage.critical}</small>
          </div>
        </InnerAccordion>
        <InnerAccordion title="Сферы жизни">
          {Object.entries(stage.spheres).map(([k,v]) => (
            <div key={k} style={{ marginBottom:4, fontSize:13 }}>
              <strong>{k}:</strong> {v}
            </div>
          ))}
        </InnerAccordion>
      </div>
    </div>
  );
}

// ─── SVG КОМПОНЕНТЫ — без изменений ───
function SyncRadialChart() {
  return (
    <div style={{ position:'relative', width:'100%', height:220, userSelect:'none' }}>
      <img src="/assets/avatars-icons/bazi-sync-orbital.png" alt="Sync"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain', opacity:0.3, filter:'grayscale(100%) sepia(20%)', pointerEvents:'none' }}
      />
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 200 220">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="100" cy="110" r="85" fill="none" stroke={C.navyMid} strokeWidth="2" strokeDasharray="4,4" opacity="0.6">
          <animateTransform attributeName="transform" type="rotate" from="0 100 110" to="360 100 110" dur="30s" repeatCount="indefinite"/>
        </circle>
        <text x="100" y="25" textAnchor="middle" fontSize="9" fill={C.navyMid} fontFamily="'JetBrains Mono',monospace" fontWeight="600">ЦЗЯЦЗЫ (60 лет)</text>
        <circle cx="100" cy="110" r="60" fill="none" stroke={C.gold} strokeWidth="2" strokeDasharray="2,3" opacity="0.8">
          <animateTransform attributeName="transform" type="rotate" from="360 100 110" to="0 100 110" dur="20s" repeatCount="indefinite"/>
        </circle>
        <text x="100" y="195" textAnchor="middle" fontSize="9" fill={C.gold} fontFamily="'JetBrains Mono',monospace" fontWeight="600">БИОРИТМЫ</text>
        <circle cx="100" cy="110" r="35" fill="none" stroke={C.success} strokeWidth="2" opacity="0.9">
          <animate attributeName="r" values="35;37;35" dur="3s" repeatCount="indefinite"/>
        </circle>
        <text x="100" y="115" textAnchor="middle" fontSize="8" fill={C.success} fontFamily="'JetBrains Mono',monospace">ЛУНА (28 дней)</text>
        <circle r="4" fill={C.navyMid} filter="url(#glow)">
          <animateMotion dur="10s" repeatCount="indefinite" path="M100,25 A85,85 0 1,1 100,195 A85,85 0 1,1 100,25"/>
        </circle>
        <circle r="3" fill={C.gold}>
          <animateMotion dur="7s" repeatCount="indefinite" path="M100,50 A60,60 0 1,1 100,170 A60,60 0 1,1 100,50"/>
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
    { key:'health',    label:'Здоровье',  icon:'❤️', value:calc(['Здоровье','Спорт','Энергия'],7,20) },
    { key:'career',    label:'Карьера',   icon:'💼', value:calc(['Карьера','Бизнес','Работа'],9,5) },
    { key:'relations', label:'Отношения', icon:'🤝', value:calc(['Отношения','Семья','Друзья'],8,10) },
    { key:'spirit',    label:'Духовность',icon:'🌟', value:calc(['Духовность','Развитие','Осознанность'],6,15) },
    { key:'finance',   label:'Финансы',   icon:'💰', value:calc(['Финансы','Доход','Бюджет'],9,5) },
  ];

  const practices = insights?.practices || [];

  return (
    <div style={{ position:'relative', width:'100%', padding:'10px 0', userSelect:'none' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {spheres.map(s => (
          <div key={s.key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
            <span style={{ fontSize:14 }}>{s.icon}</span>
            <span style={{ width:80, color:C.text2, fontWeight:500 }}>{s.label}</span>
            <div style={{ flex:1, height:7, background:`rgba(10,37,64,0.09)`, borderRadius:3, overflow:'hidden', border:`1px solid ${C.lineS}` }}>
              <div style={{
                width:`${s.value}%`, height:'100%',
                background:`linear-gradient(90deg, ${C.navyMid}, ${C.gold})`,
                borderRadius:3,
                transition:'width 1.2s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            <span style={{ width:30, textAlign:'right', fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>{s.value}%</span>
          </div>
        ))}
      </div>
      {practices.length > 0 && (
        <div style={{ marginTop:16, paddingTop:12, borderTop:`1px solid ${C.lineS}` }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.navyMid, letterSpacing:1.5, marginBottom:8 }}>📚 РЕКОМЕНДАЦИИ ИЗ БАЗЫ ЗНАНИЙ</div>
          {practices.map(p => (
            <div key={p.id} style={{ fontSize:12, marginBottom:6, color:C.text2, lineHeight:1.5 }}>
              <strong style={{ color:C.text1 }}>{p.title}</strong>{' '}
              <span style={{ color:C.success, fontSize:10 }}>({p.duration} мин)</span> — {p.desc}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttentionZonesOrgans({ zodiac, insights }) {
  const normalize = s => s ? String(s).trim().toLowerCase() : '';
  const weakZones = {
    'овен':['head','eyes'], 'телец':['throat','neck'], 'близнецы':['lungs','arms'],
    'рак':['stomach','chest'], 'лев':['heart','back'], 'дева':['intestines','nerves'],
    'весы':['kidneys','waist'], 'скорпион':['reproductive','nose'], 'стрелец':['liver','hips'],
    'козерог':['bones','knees'], 'водолей':['ankles','nerves'], 'рыбы':['feet','immune'],
  };
  const zones = weakZones[normalize(zodiac)] || ['stomach','nerves'];
  const zoneShapes = {
    head:         <ellipse cx="100" cy="28" rx="18" ry="20" />,
    eyes:         <><ellipse cx="91" cy="24" rx="5" ry="4"/><ellipse cx="109" cy="24" rx="5" ry="4"/></>,
    throat:       <ellipse cx="100" cy="50" rx="12" ry="8"/>,
    neck:         <rect x="92" y="44" width="16" height="14" rx="4"/>,
    lungs:        <><ellipse cx="84" cy="85" rx="14" ry="22"/><ellipse cx="116" cy="85" rx="14" ry="22"/></>,
    arms:         <><ellipse cx="62" cy="100" rx="9" ry="30"/><ellipse cx="138" cy="100" rx="9" ry="30"/></>,
    stomach:      <ellipse cx="100" cy="112" rx="20" ry="18"/>,
    chest:        <ellipse cx="100" cy="80" rx="24" ry="22"/>,
    heart:        <ellipse cx="96" cy="82" rx="12" ry="14"/>,
    back:         <rect x="78" y="68" width="44" height="50" rx="6"/>,
    intestines:   <ellipse cx="100" cy="128" rx="22" ry="20"/>,
    nerves:       <><line x1="100" y1="60" x2="100" y2="160" strokeWidth="3"/><line x1="80" y1="100" x2="120" y2="100" strokeWidth="2"/></>,
    kidneys:      <><ellipse cx="84" cy="122" rx="10" ry="14"/><ellipse cx="116" cy="122" rx="10" ry="14"/></>,
    waist:        <rect x="74" y="128" width="52" height="16" rx="6"/>,
    reproductive: <ellipse cx="100" cy="150" rx="18" ry="14"/>,
    nose:         <ellipse cx="100" cy="36" rx="6" ry="8"/>,
    liver:        <ellipse cx="110" cy="108" rx="16" ry="14"/>,
    hips:         <><ellipse cx="80" cy="168" rx="18" ry="14"/><ellipse cx="120" cy="168" rx="18" ry="14"/></>,
    bones:        <><rect x="90" y="65" width="20" height="90" rx="5" opacity="0.6"/></>,
    knees:        <><ellipse cx="84" cy="188" rx="10" ry="10"/><ellipse cx="116" cy="188" rx="10" ry="10"/></>,
    ankles:       <><ellipse cx="84" cy="208" rx="8" ry="6"/><ellipse cx="116" cy="208" rx="8" ry="6"/></>,
    feet:         <><ellipse cx="84" cy="218" rx="12" ry="7"/><ellipse cx="116" cy="218" rx="12" ry="7"/></>,
    immune:       <circle cx="100" cy="100" r="55" fill="none" strokeDasharray="4,4"/>,
    bladder:      <ellipse cx="100" cy="148" rx="14" ry="12"/>,
    default:      <ellipse cx="100" cy="110" rx="30" ry="40"/>,
  };

  return (
    <svg viewBox="0 0 200 240" style={{ width:'100%', maxWidth:160, height:'auto', display:'block', margin:'0 auto 10px' }}>
      {/* Силуэт тела */}
      <ellipse cx="100" cy="28" rx="18" ry="20" fill="none" stroke={`${C.navyMid}55`} strokeWidth="1.5"/>
      <line x1="100" y1="48" x2="100" y2="60" stroke={`${C.navyMid}55`} strokeWidth="1.5"/>
      <ellipse cx="100" cy="95" rx="30" ry="45" fill="none" stroke={`${C.navyMid}55`} strokeWidth="1.5"/>
      <line x1="70" y1="65" x2="48" y2="120" stroke={`${C.navyMid}55`} strokeWidth="1.5"/>
      <line x1="130" y1="65" x2="152" y2="120" stroke={`${C.navyMid}55`} strokeWidth="1.5"/>
      <line x1="82" y1="140" x2="78" y2="210" stroke={`${C.navyMid}55`} strokeWidth="1.5"/>
      <line x1="118" y1="140" x2="122" y2="210" stroke={`${C.navyMid}55`} strokeWidth="1.5"/>
      {/* Зоны внимания */}
      {zones.map(z => (
        <g key={z} fill={`${C.goldDeep}55`} stroke={C.goldDeep} strokeWidth="1.5">
          {zoneShapes[z] || zoneShapes.default}
        </g>
      ))}
    </svg>
  );
}

// ─── SPHERE LABELS ───
const SPHERE_LABELS = {
  health:    { label:'Здоровье',  icon:'❤️', color:'#c0392b' },
  career:    { label:'Карьера',   icon:'💼', color:'#0A2540' },
  relations: { label:'Отношения', icon:'🤝', color:'#8e44ad' },
  spirit:    { label:'Духовность',icon:'🌟', color:'#D4AF37' },
  finance:   { label:'Финансы',   icon:'💰', color:'#1A4D2E' },
};

// ─── CYCLE TIMELINE — с blueprint стилем и картинкой ───
function CycleTimeline({ dob, onYearSelect }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [imgOk, setImgOk] = useState(true);

  const age = useMemo(() => {
    if (!dob) return 30;
    const today = new Date(); const birthDate = new Date(dob);
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
    return Math.max(0, a);
  }, [dob]);

  const periods = Array.from({ length: 12 }, (_, i) => {
    const startAge = i * 5; const endAge = startAge + 4;
    const stageIdx = i % 12;
    const stage = JIAZI_STAGES[stageIdx];
    const isPast = endAge < age; const isCurrent = startAge <= age && age <= endAge;
    const isFuture = startAge > age;
    return { startAge, endAge, stage, stageIdx, isPast, isCurrent, isFuture, idx: i };
  });

  const safeStageIdx = Math.max(0, Math.min(11, Math.floor((age % 60) / 5) % 12));
  const currentStage = JIAZI_STAGES[safeStageIdx];

  return (
    <div style={{
      position:'relative',
      borderRadius:12, overflow:'hidden',
      border:`2px solid ${C.line}`,
      boxShadow:`0 6px 24px rgba(10,37,64,0.14)`,
    }}>
      {/* ✅ Фоновая картинка жизненного цикла */}
      {imgOk && (
        <img
          src="/sections/profile-cycle.jpg"
          alt=""
          onError={() => setImgOk(false)}
          style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%',
            objectFit:'cover', opacity:0.18,
            pointerEvents:'none',
          }}
        />
      )}

      {/* Пергаментный фон */}
      <div style={{
        position:'absolute', inset:0,
        background:`linear-gradient(160deg, rgba(250,243,224,0.92) 0%, rgba(240,230,205,0.90) 100%)`,
        backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(10,37,64,0.04) 28px)`,
      }} />

      {/* Содержимое */}
      <div style={{ position:'relative', zIndex:1, padding:20 }}>

        {/* Заголовок */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16,
          paddingBottom:12, borderBottom:`1.5px solid ${C.line}` }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:3,
              color:C.text3, textTransform:'uppercase', marginBottom:3 }}>Жизненные циклы</div>
            <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:17, color:C.navy, margin:0,
              letterSpacing:2, textTransform:'uppercase' }}>🌊 Жизненный цикл (Цзяцзы)</h3>
          </div>
          <span style={{
            padding:'4px 10px', borderRadius:4,
            fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            background:`rgba(10,37,64,0.08)`,
            border:`1px solid ${C.line}`,
            color:C.navyMid, fontWeight:600,
          }}>{age} лет · {currentStage?.name}</span>
        </div>

        {/* Легенда */}
        <div style={{
          display:'flex', gap:16, flexWrap:'wrap', marginBottom:16,
          padding:'8px 12px',
          background:`rgba(10,37,64,0.04)`,
          border:`1px solid ${C.lineS}`,
          borderRadius:6, fontSize:11, color:C.text2,
        }}>
          <span>⬛ Прошлое</span>
          <span style={{ color:C.gold, fontWeight:700 }}>▶ Сейчас</span>
          <span style={{ opacity:0.5 }}>◻ Прогноз</span>
          <span style={{ marginLeft:'auto', fontFamily:"'JetBrains Mono',monospace", fontSize:9,
            color:C.text3 }}>Нажмите период для деталей</span>
        </div>

        {/* Таймлайн */}
        <div style={{ position:'relative' }}>
          {/* Вертикальная линия */}
          <div style={{
            position:'absolute', left:28, top:0, bottom:0, width:2,
            background:`linear-gradient(to bottom, ${C.navyMid} 0%, rgba(10,37,64,0.1) 100%)`,
            borderRadius:2,
          }} />

          {periods.map(p => {
            const isExpanded = expandedIdx === p.idx;
            const dotColor = p.isCurrent ? C.gold : p.isPast ? C.navyMid : `rgba(10,37,64,0.25)`;
            const cardBg = p.isCurrent
              ? `linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.06) 100%)`
              : p.isPast ? `rgba(10,37,64,0.04)` : `rgba(245,235,210,0.5)`;
            const borderColor = p.isCurrent ? C.gold : p.isPast ? `rgba(10,37,64,0.18)` : `rgba(10,37,64,0.08)`;

            return (
              <div key={p.idx} style={{ display:'flex', gap:0, marginBottom:6, alignItems:'flex-start' }}>
                {/* Точка */}
                <div style={{ position:'relative', width:58, flexShrink:0,
                  display:'flex', flexDirection:'column', alignItems:'center', paddingTop:12 }}>
                  <div style={{
                    width: p.isCurrent ? 18 : 12,
                    height: p.isCurrent ? 18 : 12,
                    borderRadius:'50%',
                    background: dotColor,
                    border: p.isCurrent ? `3px solid ${C.goldDeep}` : `2px solid ${dotColor}`,
                    zIndex:1, position:'relative',
                    boxShadow: p.isCurrent ? `0 0 12px rgba(212,175,55,0.55)` : 'none',
                    transition:'all 0.3s',
                  }}>
                    {p.isCurrent && (
                      <div style={{ position:'absolute', inset:-5, borderRadius:'50%',
                        border:`2px solid ${C.gold}`, opacity:0.5,
                        animation:'pulse-ring-cycle 2s infinite' }} />
                    )}
                  </div>
                  <div style={{
                    fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                    color: p.isCurrent ? C.gold : C.text3,
                    marginTop:4, textAlign:'center',
                    fontWeight: p.isCurrent ? 700 : 400, lineHeight:1.2,
                  }}>{p.startAge}–{p.endAge}</div>
                </div>

                {/* Карточка периода */}
                <div
                  onClick={() => { setExpandedIdx(isExpanded ? null : p.idx); onYearSelect(p.startAge); }}
                  style={{
                    flex:1, background:cardBg,
                    border:`1px solid ${borderColor}`,
                    borderLeft: p.isCurrent ? `3px solid ${C.gold}` : `1px solid ${borderColor}`,
                    borderRadius:8, padding:'10px 12px',
                    cursor:'pointer', opacity: p.isFuture ? 0.75 : 1,
                    transition:'all 0.2s',
                  }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{
                        fontFamily:"'Cinzel',serif", fontSize:13,
                        color: p.isCurrent ? C.gold : p.isPast ? C.text1 : C.text2,
                        fontWeight: p.isCurrent ? 700 : 500,
                        letterSpacing:1,
                      }}>
                        {p.isCurrent && '▶ '}{p.stage?.name}
                      </span>
                      {p.isFuture && (
                        <span style={{
                          fontSize:9, fontFamily:"'JetBrains Mono',monospace",
                          color:C.navyMid, background:`rgba(10,37,64,0.08)`,
                          padding:'1px 5px', borderRadius:3, letterSpacing:1,
                        }}>ПРОГНОЗ</span>
                      )}
                    </div>
                    <span style={{
                      fontSize:11, color:C.text3,
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      transition:'transform 0.2s', display:'inline-block',
                    }}>▾</span>
                  </div>

                  <div style={{ fontSize:11, color:C.text2, marginTop:4, lineHeight:1.4 }}>
                    {p.stage?.tips}
                    {p.stage?.critical && (
                      <span style={{ marginLeft:6, color:C.error, fontSize:10 }}>⚠ {p.stage.critical}</span>
                    )}
                  </div>

                  <div style={{ display:'flex', gap:4, marginTop:8, flexWrap:'wrap' }}>
                    {Object.entries(SPHERE_LABELS).map(([key,meta]) => (
                      <div key={key} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:C.text3 }}>
                        <span style={{ fontSize:11 }}>{meta.icon}</span>
                        <span style={{ color:meta.color, fontWeight:500 }}>{p.stage?.spheres?.[key]}</span>
                      </div>
                    ))}
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid rgba(10,37,64,0.08)` }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                        color:C.navyMid, letterSpacing:1, marginBottom:8,
                        textTransform:'uppercase' }}>Детализация по сферам</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:6 }}>
                        {Object.entries(SPHERE_LABELS).map(([key,meta]) => (
                          <div key={key} style={{
                            padding:'6px 8px', background:'rgba(255,255,255,0.8)',
                            borderRadius:6, border:`1px solid ${meta.color}30`,
                            borderLeft:`3px solid ${meta.color}`,
                          }}>
                            <div style={{ fontSize:11, fontWeight:600, color:meta.color, marginBottom:2 }}>
                              {meta.icon} {meta.label}
                            </div>
                            <div style={{ fontSize:12, color:C.text1, lineHeight:1.4 }}>
                              {p.stage?.spheres?.[key]}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop:10, padding:'8px 10px',
                        background:'rgba(107,16,16,0.04)', borderRadius:6,
                        borderLeft:`3px solid ${C.error}` }}>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                          color:C.error, marginBottom:2, letterSpacing:1 }}>⚠ КРИТИЧЕСКИЙ МОМЕНТ</div>
                        <div style={{ fontSize:12, color:C.text2 }}>{p.stage?.critical}</div>
                      </div>
                      <div style={{ marginTop:6, padding:'8px 10px',
                        background:`rgba(10,37,64,0.04)`, borderRadius:6,
                        borderLeft:`3px solid ${C.navyMid}` }}>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                          color:C.navyMid, marginBottom:2, letterSpacing:1 }}>💡 СОВЕТ</div>
                        <div style={{ fontSize:12, color:C.text2 }}>{p.stage?.tips}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring-cycle {
          0%   { transform:scale(0.9); opacity:0.6; }
          70%  { transform:scale(1.6); opacity:0; }
          100% { transform:scale(1.6); opacity:0; }
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
    const today = new Date(); const birthDate = new Date(profile.dob);
    let ageVal = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) ageVal--;
    return Math.max(0, ageVal);
  }, [profile?.dob]);

  if (!profile) return (
    <div style={{ padding:40, textAlign:'center', color:C.text2,
      fontFamily:"'Cormorant Infant',serif", fontSize:16, fontStyle:'italic' }}>
      Загрузка профиля...
    </div>
  );

  const genderStr = String(profile.gender || '').trim();
  const isMale = genderStr.toLowerCase().includes('муж') || genderStr.toLowerCase() === 'male';
  const meridianInfo = insights ? getMeridianInfo(insights.zodiac) : { tip:'' };
  const chronoPeaks  = insights ? getChronotypePeaks(profile.chronotype) : {};
  const destiny      = insights?.destiny || { degree:241, interpretation:'Интеграция опыта' };

  const safeStageIdx = age !== null && age !== undefined
    ? Math.max(0, Math.min(11, Math.floor((age % 60) / 5) % 12))
    : 0;
  const currentStage = JIAZI_STAGES[safeStageIdx];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => { setIsRefreshing(false); notify?.('✅ Данные обновлены'); }, 800);
  };
  const handleReset = () => {
    if (window.confirm('Сбросить профиль?')) { setProfile(null); notify?.('🗑️ Профиль сброшен'); }
  };

  return (
    <div className="page" style={{ paddingBottom:100, userSelect:'none' }}>
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* ════ ВКЛАДКА: ОСНОВНОЙ ════ */}
      {activeTab === 'main' && (
        <>
          {/* Шапка-профиль — широкая карточка */}
          <div style={{
            position:'relative', borderRadius:12, overflow:'hidden',
            border:`2px solid ${C.line}`,
            marginBottom:14,
            boxShadow:`0 4px 16px rgba(10,37,64,0.12)`,
            background:`linear-gradient(160deg, ${C.bgCard} 0%, ${C.bgCard2} 100%)`,
            backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(10,37,64,0.04) 28px)`,
            gridColumn:'1 / -1',
          }}>
            {/* Угловые маркеры */}
            <div style={{ position:'absolute', top:6, left:6, width:14, height:14,
              borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}`, opacity:0.8 }} />
            <div style={{ position:'absolute', bottom:6, right:6, width:14, height:14,
              borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}`, opacity:0.8 }} />

            {/* Gold rule сверху */}
            <div style={{ height:3, background:`linear-gradient(90deg, transparent, ${C.gold} 20%, ${C.gold} 80%, transparent)`, opacity:0.6 }} />

            <div style={{ padding:'20px 18px', display:'flex', alignItems:'center', gap:16 }}>
              {/* Аватар */}
              <div style={{ width:72, height:72, borderRadius:8, flexShrink:0,
                border:`2px solid ${C.goldDeep}`,
                overflow:'hidden', background:`rgba(10,37,64,0.06)`,
                boxShadow:`0 3px 12px rgba(10,37,64,0.15)` }}>
                <img
                  src={isMale ? '/assets/avatars-icons/male-avatar.png' : '/assets/avatars-icons/female-avatar.png'}
                  alt="avatar"
                  style={{ width:'100%', height:'100%', objectFit:'cover' }}
                  onError={e => { e.target.style.display='none'; }}
                />
              </div>

              {/* Данные */}
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Cinzel',serif",
                  fontSize:22, fontWeight:700, color:C.navy,
                  letterSpacing:2, textTransform:'uppercase',
                  marginBottom:6 }}>
                  {profile.name || 'Пользователь'}
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                  {age !== null && (
                    <span style={{ padding:'3px 10px', borderRadius:4,
                      fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                      background:`rgba(26,77,46,0.10)`, border:`1px solid rgba(26,77,46,0.30)`,
                      color:C.success, fontWeight:600 }}>🎂 {age} лет</span>
                  )}
                  {profile.chronotype && (
                    <span style={{ padding:'3px 10px', borderRadius:4,
                      fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                      background:`rgba(10,37,64,0.08)`, border:`1px solid ${C.lineS}`,
                      color:C.navyMid, fontWeight:600 }}>⏱ {profile.chronotype}</span>
                  )}
                  {insights?.zodiac && (
                    <span style={{ padding:'3px 10px', borderRadius:4,
                      fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                      background:`rgba(212,175,55,0.12)`, border:`1px solid rgba(212,175,55,0.35)`,
                      color:C.goldDeep, fontWeight:600 }}>♈ {insights.zodiac}</span>
                  )}
                </div>
                <div style={{
                  fontSize:12, color:C.text2, lineHeight:1.5,
                  padding:'7px 10px',
                  background:`rgba(10,37,64,0.04)`,
                  borderRadius:6, borderLeft:`3px solid ${C.gold}`,
                }}>
                  <strong style={{ color:C.goldDeep }}>Сводка:</strong>{' '}
                  {insights?.zodiac || '—'} ({insights?.zodiacElement || 'Воздух'}) ·{' '}
                  {insights?.eastern || '—'} ({insights?.easternElement || 'Вода'}) ·{' '}
                  Градус: <strong style={{ color:C.gold }}>{destiny.degree}°</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Сетка карточек 2 колонки */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <FlipCardBlock
              title="Западный Зодиак"
              frontImage={getSafeImagePath('zodiac', insights?.zodiac, 'gemini')}
              accentColor={C.navyMid}
              frontContent={
                <div style={{ fontSize:12, lineHeight:1.5, color:C.text2, padding:'0 6px' }}>
                  <p style={{ marginBottom:6, fontWeight:500 }}>
                    <strong style={{ color:C.navy, fontSize:14 }}>{insights?.zodiac || '—'}</strong>{' '}
                    <span>({insights?.zodiacElement || 'Воздух'}) под управлением {insights?.rulingPlanet || 'Меркурия'}.</span>
                  </p>
                  <InnerAccordion title="Сильные стороны" defaultOpen={true}>
                    {insights?.zodiacStrengths || 'Коммуникация, адаптивность'}
                  </InnerAccordion>
                </div>
              }
            >
              <InnerAccordion title="Уязвимые зоны">{insights?.zodiacWeaknesses || 'Лёгкие, бронхи, плечи, нервная система'}</InnerAccordion>
              <InnerAccordion title="Как использовать">
                <ul style={{ margin:'0 0 0 16px', lineHeight:1.6, fontSize:12 }}>
                  <li>Планируй важные дела на {chronoPeaks.focus?.hours || 'утро'}</li>
                  <li>Избегай многозадачности</li>
                  <li>Дыхательные практики укрепляют слабые зоны</li>
                </ul>
              </InnerAccordion>
            </FlipCardBlock>

            <FlipCardBlock
              title="Восточный Знак"
              frontImage={getSafeImagePath('eastern', insights?.eastern, 'rabbit')}
              accentColor={C.gold}
              frontContent={
                <div style={{ fontSize:12, lineHeight:1.5, color:C.text2, padding:'0 6px' }}>
                  <p style={{ marginBottom:6, fontWeight:500 }}>
                    <strong style={{ color:C.goldDeep, fontSize:14 }}>{insights?.eastern || '—'}</strong>{' '}
                    <span>({insights?.easternElement || 'Вода'}).</span>
                  </p>
                  <InnerAccordion title="Энергетический портрет" defaultOpen={true}>
                    {insights?.easternTraits || 'Честность и терпимость'}. Твоя стихия наделяет тебя глубокой интуицией.
                  </InnerAccordion>
                </div>
              }
            >
              <InnerAccordion title="Кармическая задача">{insights?.easternKarma || 'Научиться говорить "нет" без чувства вины'}. Выстраивай границы.</InnerAccordion>
              <InnerAccordion title="Рекомендации">
                <ul style={{ margin:'0 0 0 16px', lineHeight:1.6, fontSize:12 }}>
                  <li>Используй спады энергии для восстановления</li>
                  <li>Доверяй интуиции в финансовых вопросах</li>
                  <li>Избегай токсичных связей</li>
                </ul>
              </InnerAccordion>
            </FlipCardBlock>

            <FlipCardBlock
              title="Градус Судьбы"
              frontImage="/assets/avatars-icons/front-destiny.png"
              accentColor={C.gold}
              frontContent={
                <div style={{ textAlign:'center', padding:'0 6px' }}>
                  <div style={{ fontFamily:"'Cinzel',serif",
                    fontSize:28, color:C.gold, fontWeight:700, letterSpacing:3 }}>
                    {destiny.degree || 241}°
                  </div>
                  <div style={{ fontFamily:"'Cormorant Infant',serif",
                    fontSize:13, color:C.text2, marginTop:4, fontStyle:'italic' }}>
                    {destiny.interpretation || 'Интеграция опыта'}
                  </div>
                  <InnerAccordion title="Описание" defaultOpen={true}>
                    Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла.{' '}
                    {destiny.degree < 120 ? 'Активное созидание. ' : destiny.degree < 240 ? 'Структурирование роста. ' : 'Интеграция опыта. '}
                  </InnerAccordion>
                </div>
              }
            >
              <div style={{ textAlign:'center', color:'rgba(240,220,144,0.7)', marginTop:20, fontSize:12 }}>
                <p>Детальный разбор градуса доступен в расширенной версии.</p>
              </div>
            </FlipCardBlock>

            <FlipCardBlock
              title="Хроно-тип"
              frontImage={`/assets/avatars-icons/front-chrono-${profile.chronotype?.toLowerCase().includes('жаворонок') ? 'lark' : profile.chronotype?.toLowerCase().includes('сова') ? 'owl' : 'pigeon'}.png`}
              accentColor={C.navyMid}
              frontContent={
                <div style={{ fontSize:12, lineHeight:1.5, color:C.text2, padding:'0 6px' }}>
                  <p style={{ marginBottom:8, fontWeight:500 }}>
                    <strong style={{ color:C.navy, fontSize:14 }}>{profile.chronotype || '🕊️ Голубь'}</strong>
                  </p>
                  <div style={{ padding:8, background:`rgba(26,77,46,0.08)`, borderRadius:6,
                    borderLeft:`2px solid ${C.success}`, marginBottom:8 }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                      color:C.success, letterSpacing:1, marginBottom:2 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
                    <p style={{ margin:0, fontSize:11 }}>{chronoPeaks.focus?.tip || 'Самые сложные задачи — в это время.'}</p>
                  </div>
                </div>
              }
            >
              <div style={{ padding:8, background:'rgba(107,16,16,0.06)', borderRadius:6,
                borderLeft:`2px solid ${C.error}`, marginBottom:10 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                  color:C.error, letterSpacing:1, marginBottom:2 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
                <p style={{ margin:0, fontSize:11, color:'rgba(240,220,144,0.8)' }}>{chronoPeaks.rest?.tip || 'Идеально для рутины.'}</p>
              </div>
              <InnerAccordion title="Как использовать" defaultOpen={true}>
                <ul style={{ margin:'0 0 0 16px', lineHeight:1.6, fontSize:12 }}>
                  <li>Синхронизируй расписание с биоритмами — КПД +30–40%</li>
                  <li>Сложные решения — только в пиковые часы</li>
                  <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || '22:30–23:30'}</li>
                </ul>
              </InnerAccordion>
            </FlipCardBlock>
          </div>
        </>
      )}

      {/* ════ ВКЛАДКА: ГЛУБОКИЙ АНАЛИЗ ════ */}
      {activeTab === 'deep' && (
        <>
          <div style={{
            borderRadius:10, padding:18,
            border:`2px solid ${C.line}`,
            marginBottom:20,
            background:`linear-gradient(160deg, ${C.bgCard} 0%, ${C.bgCard2} 100%)`,
            backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(10,37,64,0.04) 28px)`,
            position:'relative', overflow:'hidden',
          }}>
            {/* Угловые маркеры */}
            <div style={{ position:'absolute', top:6, left:6, width:12, height:12,
              borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}`, opacity:0.7 }} />
            <div style={{ position:'absolute', bottom:6, right:6, width:12, height:12,
              borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}`, opacity:0.7 }} />

            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14,
              paddingBottom:10, borderBottom:`1.5px solid ${C.line}` }}>
              <div style={{ width:4, height:24, background:C.navyMid, borderRadius:2 }} />
              <h3 style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:C.navy,
                margin:0, letterSpacing:2, textTransform:'uppercase' }}>
                🔍 Глубокий анализ профиля
              </h3>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 }}>

              {/* Синхронизация */}
              <div style={{ padding:16, borderRadius:8,
                border:`1.5px solid ${C.line}`,
                borderTop:`3px solid ${C.gold}`,
                background:'rgba(255,255,255,0.6)',
                boxShadow:`0 2px 8px rgba(10,37,64,0.08)` }}>
                <h4 style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:C.goldDeep,
                  margin:'0 0 8px 0', letterSpacing:1.5, textTransform:'uppercase' }}>Синхронизация</h4>
                <SyncRadialChart />
                <div style={{ marginTop:12, fontSize:12, lineHeight:1.6, color:C.text2,
                  background:`rgba(10,37,64,0.04)`, padding:10, borderRadius:6,
                  border:`1px solid ${C.lineS}`, borderLeft:`3px solid ${C.navyMid}` }}>
                  <p style={{ margin:'0 0 6px 0' }}><strong style={{ color:C.navyMid }}>🔄 Цзяцзы (60 лет):</strong> Текущий цикл: <em>{currentStage?.name || 'Начало пути'}</em>. Задаёт вектор Ци для здоровья, карьеры и отношений.</p>
                  <p style={{ margin:'0 0 6px 0' }}><strong style={{ color:C.goldDeep }}>📊 Биоритмы:</strong> Тип {profile.chronotype}. Пик когнитивной функции: <em>{chronoPeaks.focus?.hours || '10:00–14:00'}</em>.</p>
                  <p style={{ margin:0 }}><strong style={{ color:C.success }}>🌙 Лунный день {insights?.moonDay}:</strong> {insights?.moonRestriction?.forbidden ? `⚠️ Ограничь воздействие на: ${insights.moonRestriction.forbidden}` : 'Благоприятный фон для активных действий.'}</p>
                </div>
              </div>

              {/* Рекомендации */}
              <div style={{ padding:16, borderRadius:8,
                border:`1.5px solid ${C.line}`,
                borderTop:`3px solid ${C.success}`,
                background:'rgba(255,255,255,0.6)',
                boxShadow:`0 2px 8px rgba(10,37,64,0.08)` }}>
                <h4 style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:C.success,
                  margin:'0 0 8px 0', letterSpacing:1.5, textTransform:'uppercase' }}>Рекомендации</h4>
                <RecommendationsChecklist insights={insights} profile={profile} />
              </div>

              {/* Зоны внимания */}
              <div style={{ padding:16, borderRadius:8,
                border:`1.5px solid ${C.line}`,
                borderTop:`3px solid ${C.error}`,
                background:'rgba(255,255,255,0.6)',
                boxShadow:`0 2px 8px rgba(10,37,64,0.08)` }}>
                <h4 style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:C.error,
                  margin:'0 0 8px 0', letterSpacing:1.5, textTransform:'uppercase' }}>Зоны внимания</h4>
                <AttentionZonesOrgans zodiac={insights?.zodiac} insights={insights} />
                <div style={{ fontSize:12, color:C.text2, lineHeight:1.5 }}>
                  <p style={{ margin:'0 0 4px 0' }}><strong>Знак:</strong> {insights?.zodiac || '—'}</p>
                  <p style={{ margin:'0 0 4px 0' }}><strong>Уязвимости:</strong> {insights?.zodiacWeaknesses || 'Нет данных'}</p>
                  <p style={{ margin:0, color:C.navyMid }}><strong>Меридиан:</strong> {meridianInfo?.tip || 'Следите за балансом'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Карточки Солнечный/Лунный */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
            <FlipCardBlock
              title="Солнечный сезон"
              frontImage="/assets/avatars-icons/bazi-five-elements.png"
              accentColor={C.success}
              minHeight={220}
            >
              <p style={{ fontSize:13, lineHeight:1.6, color:'rgba(240,220,144,0.85)' }}>
                Энергия парит. Применяйте методы рассеивания Ци и лёгкие практики.
                Текущий сезон: <strong style={{ color:C.goldPale }}>{insights?.season || '—'}</strong>.
              </p>
              <div style={{ marginTop:8, padding:8, background:'rgba(26,77,46,0.15)', borderRadius:6,
                borderLeft:`2px solid ${C.success}` }}>
                <small style={{ color:'rgba(100,220,120,0.9)' }}>Совет: Баланс Инь-Ян в питании. Пейте больше тёплой воды, избегайте резких температурных перепадов.</small>
              </div>
            </FlipCardBlock>

            <FlipCardBlock
              title="Лунный фон"
              frontImage="/assets/avatars-icons/bazi-ten-gods.png"
              accentColor={C.error}
              minHeight={220}
            >
              <p style={{ fontSize:13, lineHeight:1.6, color:'rgba(240,220,144,0.85)' }}>
                В новолуние/полнолуние организм ослаблен. Избегайте агрессивных процедур.
                Лунный день: <strong style={{ color:C.goldPale }}>{insights?.moonDay}</strong>.
              </p>
              <div style={{ marginTop:8, padding:8, background:'rgba(107,16,16,0.15)', borderRadius:6,
                borderLeft:`2px solid ${C.error}` }}>
                <small style={{ color:'rgba(220,100,100,0.9)' }}>⚠️ Внимание: Ограничьте хирургические вмешательства и интенсивные тренировки в полнолуние.</small>
              </div>
            </FlipCardBlock>
          </div>
        </>
      )}

      {/* ════ ВКЛАДКА: ЦИКЛЫ ════ */}
      {activeTab === 'cycle' && (
        <CycleTimeline dob={profile.dob} onYearSelect={setSelectedYear} />
      )}

      {/* Кнопки */}
      <div style={{ display:'flex', gap:12, marginTop:24 }}>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            flex:1, padding:'13px 0', borderRadius:6,
            fontFamily:"'Cinzel',serif", fontSize:13,
            fontWeight:600, letterSpacing:2,
            textTransform:'uppercase', cursor:'pointer',
            background:`linear-gradient(135deg, ${C.navyMid} 0%, ${C.navy} 100%)`,
            color:C.goldPale, border:`2px solid ${C.navy}`,
            boxShadow:`0 3px 10px rgba(10,37,64,0.22)`,
            opacity: isRefreshing ? 0.7 : 1,
          }}
        >
          {isRefreshing ? '⏳ Обновление...' : '🔄 Обновить данные'}
        </button>
        <button
          onClick={handleReset}
          style={{
            flex:1, padding:'13px 0', borderRadius:6,
            fontFamily:"'Cinzel',serif", fontSize:13,
            fontWeight:600, letterSpacing:2,
            textTransform:'uppercase', cursor:'pointer',
            background:'transparent',
            color:C.error,
            border:`2px dashed rgba(107,16,16,0.40)`,
          }}
        >
          🗑️ Сброс профиля
        </button>
      </div>

      {selectedYear !== null && (
        <YearModal year={selectedYear} currentAge={age} onClose={() => setSelectedYear(null)} />
      )}
    </div>
  );
          }
