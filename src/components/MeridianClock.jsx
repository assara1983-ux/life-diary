// src/components/MeridianClock.jsx
import React from 'react';

// Координаты приведены к сетке 400x650
// Ключевое: сохранение пропорций отключено (none), чтобы наложение следовало за изображением при ресайзе
const ORGAN_REGIONS = [
  { id: 1, name: 'Лёгкие', time: '03:00-05:00', desc: 'Дыхание, кожа, иммунная защита.', path: 'M100,130 C90,130 85,160 85,195 C85,220 100,230 130,230 C155,230 160,205 155,175 C150,150 115,135 100,130 Z M240,130 C255,135 290,150 295,175 C300,205 295,230 270,230 C240,230 225,220 225,195 C225,160 230,130 240,130 Z' },
  { id: 2, name: 'Толстый кишечник', time: '05:00-07:00', desc: 'Выведение токсинов.', path: 'M90,240 L90,360 C90,380 110,390 150,390 L250,390 C290,390 310,380 310,360 L310,240 L290,240 L290,370 C290,375 280,380 250,380 L150,380 C120,380 110,375 110,370 L110,240 Z' },
  { id: 3, name: 'Желудок', time: '07:00-09:00', desc: 'Пищеварение.', path: 'M130,220 C150,210 180,220 190,250 C200,280 180,300 160,310 C130,320 120,290 130,260 C135,240 120,230 130,220 Z' },
  { id: 4, name: 'Селезёнка', time: '09:00-11:00', desc: 'Метаболизм, мышление.', path: 'M140,240 C130,260 140,290 160,300 C180,310 190,290 180,270 C170,250 150,230 140,240 Z' },
  { id: 5, name: 'Сердце', time: '11:00-13:00', desc: 'Циркуляция, радость.', path: 'M170,170 C160,190 170,220 190,230 C210,220 220,190 200,170 C190,165 180,165 170,170 Z' },
  { id: 6, name: 'Тонкий кишечник', time: '13:00-15:00', desc: 'Усвоение.', path: 'M150,330 C140,360 150,390 170,400 C190,410 210,400 220,380 C230,360 210,330 190,320 C170,310 160,320 150,330 Z' },
  { id: 7, name: 'Мочевой пузырь', time: '15:00-17:00', desc: 'Детокс, память.', path: 'M180,420 C170,440 180,470 200,480 C220,470 230,440 220,420 C210,410 190,410 180,420 Z' },
  { id: 8, name: 'Почки', time: '17:00-19:00', desc: 'Ресурс, кости.', path: 'M110,260 C100,280 100,300 120,310 C140,320 150,290 140,270 C130,250 120,250 110,260 Z M250,260 C260,280 260,300 240,310 C220,320 210,290 220,270 C230,250 240,250 250,260 Z' },
  { id: 9, name: 'Перикард', time: '19:00-21:00', desc: 'Защита сердца.', path: 'M180,180 C170,200 180,230 200,240 C220,230 230,200 220,180 C210,170 190,170 180,180 Z' },
  { id: 10, name: '3 Обогревателя (верх)', time: '21:00-23:00', desc: 'Распределение тепла.', path: 'M190,110 C180,130 190,150 200,160 C210,150 220,130 210,110 C200,105 195,105 190,110 Z' },
  { id: 11, name: '3 Обогревателя (низ)', time: '23:00-01:00', desc: 'Сброс ритмов.', path: 'M190,250 C180,270 190,290 200,300 C210,290 220,270 210,250 C200,245 195,245 190,250 Z' },
  { id: 12, name: 'Печень', time: '01:00-03:00', desc: 'Очищение крови.', path: 'M230,230 C220,250 240,280 270,290 C300,300 310,270 290,240 C270,210 240,220 230,230 Z' }
];

export function MeridianClock({ activeMeridian, onSelect }) {
  const activeId = activeMeridian?.id || (activeMeridian?.name && ORGAN_REGIONS.find(o => o.name === activeMeridian.name)?.id);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '450px', margin: '0 auto', border: '2px solid var(--blue)', padding: '0', background: '#fff' }}>
      <style>{`
        .meridian-shape { transition: all 0.3s ease; cursor: pointer; }
        .meridian-shape:hover { fill: rgba(211, 47, 47, 0.6); stroke-width: 2.5; }
        .meridian-shape.active { fill: rgba(211, 47, 47, 0.85); stroke: #b71c1c; stroke-width: 2.5; filter: drop-shadow(0 0 6px rgba(211, 47, 47, 0.6)); }
        @keyframes pulse-meridian { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .meridian-shape.active { animation: pulse-meridian 3s infinite ease-in-out; transform-origin: center; }
      `}</style>

      {/* Картинка растягивается на всю ширину */}
      <img 
        src="/assets/meridian-body-base.png" 
        alt="Body Constitution" 
        style={{ width: '100%', height: 'auto', display: 'block', filter: 'sepia(1) hue-rotate(180deg) opacity(0.8)' }} 
      />

      {/* SVG накладывается поверх. preserveAspectRatio="none" заставляет SVG растягиваться точно так же, как IMG, 
          даже если соотношение сторон меняется. Это исправляет "кривое" наложение. */}
      <svg 
        viewBox="0 0 400 650" 
        preserveAspectRatio="none" 
        style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none' }} 
      >
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
