// src/components/MeridianClock.jsx
import React from 'react';

const ORGAN_REGIONS = [
  { id: 1, name: 'Лёгкие', time: '03:00-05:00', desc: 'Дыхание, кожа, иммунная защита.', path: 'M100,140 C80,140 70,180 70,230 C70,290 90,310 140,310 C180,310 190,270 180,220 C170,170 160,140 100,140 Z M220,140 C260,140 270,180 270,230 C270,290 290,310 240,310 C200,310 190,270 200,220 C210,170 220,140 220,140 Z' },
  { id: 2, name: 'Толстый кишечник', time: '05:00-07:00', desc: 'Выведение токсинов, детокс.', path: 'M90,320 L90,460 C90,490 120,510 160,510 L240,510 C280,510 310,490 310,460 L310,320 L290,320 L290,480 C290,490 270,500 240,500 L160,500 C130,500 110,490 110,480 L110,320 Z' },
  { id: 3, name: 'Желудок', time: '07:00-09:00', desc: 'Пищеварение, усвоение нутриентов.', path: 'M120,290 C140,280 170,290 180,320 C190,350 170,380 140,390 C110,400 100,370 120,340 C130,320 110,300 120,290 Z' },
  { id: 4, name: 'Селезёнка', time: '09:00-11:00', desc: 'Метаболизм, мышление, тонус мышц.', path: 'M130,310 C120,330 130,370 150,380 C170,390 190,370 180,340 C170,310 140,300 130,310 Z' },
  { id: 5, name: 'Сердце', time: '11:00-13:00', desc: 'Циркуляция, радость, ясность.', path: 'M160,180 C150,200 160,240 190,250 C220,240 230,200 200,180 C190,170 170,170 160,180 Z' },
  { id: 6, name: 'Тонкий кишечник', time: '13:00-15:00', desc: 'Усвоение, разделение чистого/нечистого.', path: 'M140,400 C130,430 140,470 170,490 C200,510 230,490 240,460 C250,430 230,400 200,390 C170,380 150,390 140,400 Z' },
  { id: 7, name: 'Мочевой пузырь', time: '15:00-17:00', desc: 'Детокс, память, воля, фильтрация.', path: 'M170,510 C160,540 170,580 200,590 C230,580 240,540 230,510 C220,500 180,500 170,510 Z' },
  { id: 8, name: 'Почки', time: '17:00-19:00', desc: 'Ресурс, страхи, кости.', path: 'M100,290 C90,310 90,340 110,350 C130,360 140,330 130,300 C120,280 110,280 100,290 Z M300,290 C310,310 310,340 290,350 C270,360 260,330 270,300 C280,280 290,280 300,290 Z' },
  { id: 9, name: 'Перикард', time: '19:00-21:00', desc: 'Защита сердца, эмоции.', path: 'M170,190 C160,210 170,250 200,260 C230,250 240,210 230,190 C220,180 180,180 170,190 Z' },
  { id: 10, name: '3 Обогревателя (верх)', time: '21:00-23:00', desc: 'Распределение тепла.', path: 'M180,110 C170,130 180,160 200,170 C220,160 230,130 220,110 C210,100 190,100 180,110 Z' },
  { id: 11, name: '3 Обогревателя (низ)', time: '23:00-01:00', desc: 'Сброс ритмов, сон.', path: 'M180,320 C170,340 180,370 200,380 C220,370 230,340 220,320 C210,310 190,310 180,320 Z' },
  { id: 12, name: 'Печень', time: '01:00-03:00', desc: 'Очищение крови, сны, стратегия.', path: 'M220,270 C210,300 230,340 270,350 C310,360 330,320 310,280 C290,240 240,250 220,270 Z' }
];

export function MeridianClock({ activeMeridian, onSelect }) {
  const activeId = activeMeridian?.id || (activeMeridian?.name && ORGAN_REGIONS.find(o => o.name === activeMeridian.name)?.id);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '350px', margin: '0 auto', border: '2px solid var(--blue)', padding: '10px', background: '#f9f9f9' }}>
      <style>{`
        .meridian-shape { transition: all 0.3s ease; cursor: pointer; }
        .meridian-shape:hover { fill: rgba(211, 47, 47, 0.6); stroke-width: 2.5; }
        .meridian-shape.active { fill: rgba(211, 47, 47, 0.85); stroke: #b71c1c; stroke-width: 2.5; filter: drop-shadow(0 0 6px rgba(211, 47, 47, 0.6)); }
        @keyframes pulse-meridian { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .meridian-shape.active { animation: pulse-meridian 3s infinite ease-in-out; transform-origin: center; }
      `}</style>

      <img 
        src="/assets/meridian-body-base.png" 
        alt="Body Constitution" 
        style={{ width: '100%', height: 'auto', display: 'block', filter: 'sepia(1) hue-rotate(180deg) opacity(0.8)' }} 
      />

      <svg viewBox="0 0 400 700" style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

        {ORGAN_REGIONS.map((organ) => {
          const isActive = activeId === organ.id;
          return (
            <g key={organ.id} style={{ pointerEvents: 'auto' }} onClick={() => onSelect({ title: organ.name, time: organ.time, desc: organ.desc })}>
              <path
                className={`meridian-shape ${isActive ? 'active' : ''}`}
                d={organ.path}
                fill={isActive ? "rgba(211, 47, 47, 0.8)" : "rgba(211, 47, 47, 0.4)"}
                stroke="#d32f2f"
                strokeWidth="1.5"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
