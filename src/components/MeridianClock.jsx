// src/components/MeridianClock.jsx
import React, { useMemo } from 'react';

// Статичная карта 12 меридианов для визуализации
const MERIDIANS = [
  { id: 'gallbladder', name: 'Желчный пузырь', time: '23-01', emoji: '💛', element: 'Дерево', sign: 'Мышь' },
  { id: 'liver', name: 'Печень', time: '01-03', emoji: '🌿', element: 'Дерево', sign: 'Вол' },
  { id: 'lungs', name: 'Лёгкие', time: '03-05', emoji: '🫁', element: 'Металл', sign: 'Тигр' },
  { id: 'large_intestine', name: 'Толстый кишечник', time: '05-07', emoji: '🌾', element: 'Металл', sign: 'Заяц' },
  { id: 'stomach', name: 'Желудок', time: '07-09', emoji: '🍽️', element: 'Земля', sign: 'Дракон' },
  { id: 'spleen', name: 'Селезёнка', time: '09-11', emoji: '🍂', element: 'Земля', sign: 'Змея' },
  { id: 'heart', name: 'Сердце', time: '11-13', emoji: '❤️', element: 'Огонь', sign: 'Лошадь' },
  { id: 'small_intestine', name: 'Тонкий кишечник', time: '13-15', emoji: '🌡️', element: 'Огонь', sign: 'Овца' },
  { id: 'bladder', name: 'Мочевой пузырь', time: '15-17', emoji: '💧', element: 'Вода', sign: 'Обезьяна' },
  { id: 'kidneys', name: 'Почки', time: '17-19', emoji: '🌊', element: 'Вода', sign: 'Петух' },
  { id: 'pericardium', name: 'Перикард', time: '19-21', emoji: '🛡️', element: 'Огонь II', sign: 'Собака' },
  { id: 'triple_burner', name: 'Тройной обогреватель', time: '21-23', emoji: '🔥', element: 'Огонь II', sign: 'Кабан' },
];

export function MeridianClock({ current, profile, onOpen, size = 240 }) {
  // Нормализация текущего меридиана для подсветки
  const activeMeridian = useMemo(() => {
    if (!current) return MERIDIANS[0];
    const cleanTime = (current.time || '').replace(/[\s–\-]/g, '-');
    return MERIDIANS.find(m => m.time === cleanTime) || MERIDIANS[0];
  }, [current]);

  // Генерация SVG-пути для сегмента
  const getSegmentPath = (index, outerR = 82, innerR = 38) => {
    const startRad = ((index * 30 - 90) * Math.PI) / 180;
    const endRad = (((index + 1) * 30 - 90) * Math.PI) / 180;
    const x1 = 100 + outerR * Math.cos(startRad);
    const y1 = 100 + outerR * Math.sin(startRad);
    const x2 = 100 + outerR * Math.cos(endRad);
    const y2 = 100 + outerR * Math.sin(endRad);
    const x3 = 100 + innerR * Math.cos(endRad);
    const y3 = 100 + innerR * Math.sin(endRad);
    const x4 = 100 + innerR * Math.cos(startRad);
    const y4 = 100 + innerR * Math.sin(startRad);
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`;
  };

  return (
    <div className="mc-wrap">
      <style>{`
        .mc-wrap { display: flex; justify-content: center; align-items: center; padding: 8px; }
        .mc-svg { width: ${size}px; height: ${size}px; cursor: pointer; user-select: none; }
        .mc-seg { transition: all 0.2s ease; stroke: var(--line); stroke-width: 0.5; }
        .mc-seg:hover { fill: rgba(0,112,192,0.12); stroke: var(--blue); }
        .mc-seg.active { fill: rgba(0,112,192,0.22); stroke: var(--blue); stroke-width: 1.5; }        .mc-label { font-size: 8px; fill: var(--text2); font-family: var(--font-mono); text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
        .mc-time { font-size: 7px; fill: var(--text3); font-family: var(--font-mono); text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
        .mc-center { fill: var(--blue); }
        .mc-dot { fill: #fff; }
        @media (hover: hover) { .mc-seg:hover { transform-origin: 100px 100px; } }
      `}</style>

      <svg viewBox="0 0 200 200" className="mc-svg">
        <defs>
          <filter id="mc-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.06)" />
          </filter>
        </defs>

        {/* Фоновый круг */}
        <circle cx="100" cy="100" r="96" fill="rgba(245,240,225,0.6)" stroke="var(--line)" strokeWidth="1" filter="url(#mc-shadow)" />
        
        {/* Разделительные линии */}
        {Array.from({ length: 12 }).map((_, i) => {
          const rad = ((i * 30 - 90) * Math.PI) / 180;
          return (
            <line 
              key={`line-${i}`}
              x1={100 + 38 * Math.cos(rad)} y1={100 + 38 * Math.sin(rad)}
              x2={100 + 96 * Math.cos(rad)} y2={100 + 96 * Math.sin(rad)}
              stroke="var(--line)" strokeWidth="0.5" opacity="0.5"
            />
          );
        })}

        {/* Сегменты меридианов */}
        {MERIDIANS.map((m, i) => {
          const isActive = m.id === activeMeridian.id;
          const midAngle = ((i + 0.5) * 30 - 90) * (Math.PI / 180);
          const lx = 100 + 64 * Math.cos(midAngle);
          const ly = 100 + 64 * Math.sin(midAngle);
          const tx = 100 + 52 * Math.cos(midAngle);
          const ty = 100 + 52 * Math.sin(midAngle);

          return (
            <g key={m.id} onClick={() => onOpen({ type: 'meridian', ...m })}>
              <path d={getSegmentPath(i)} className={`mc-seg ${isActive ? 'active' : ''}`} fill="rgba(0,112,192,0.05)" />
              <text x={lx} y={ly} className="mc-label">{m.emoji} {m.name}</text>
              <text x={tx} y={ty} className="mc-time">{m.time}</text>
            </g>
          );
        })}

        {/* Центр и указатель */}
        <circle cx="100" cy="100" r="10" className="mc-center" />        <circle cx="100" cy="100" r="5" className="mc-dot" />
        <text x="100" y="118" textAnchor="middle" fontSize="9" fill="var(--text2)" fontFamily="var(--font-mono)" fontWeight="600">
          ЦИ
        </text>
      </svg>
    </div>
  );
}
