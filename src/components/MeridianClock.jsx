// src/components/MeridianClock.jsx
import React from 'react';

// Координаты пересчитаны под пропорцию 1:2 (viewBox="0 0 400 800")
// Центральная ось (пупок) находится примерно в y=400
const ORGAN_REGIONS = [
  { id: 1, name: 'Лёгкие', time: '03:00-05:00', desc: 'Дыхание, кожа, иммунная защита.', path: 'M130,180 C120,210 130,260 160,270 C180,280 190,250 180,220 C170,190 140,180 130,180 Z M210,180 C220,190 250,190 260,220 C270,250 260,280 240,270 C210,260 200,210 210,180 Z' },
  { id: 2, name: 'Толстый кишечник', time: '05:00-07:00', desc: 'Выведение токсинов, детокс.', path: 'M140,350 L140,500 C140,520 160,540 200,540 C240,540 260,520 260,500 L260,350 L240,350 L240,510 C240,520 220,530 200,530 C180,530 160,520 160,510 L160,350 Z' },
  { id: 3, name: 'Желудок', time: '07:00-09:00', desc: 'Пищеварение, усвоение.', path: 'M180,300 C190,290 220,300 230,330 C240,360 220,390 200,400 C170,410 160,380 180,350 C190,330 170,310 180,300 Z' },
  { id: 4, name: 'Селезёнка', time: '09:00-11:00', desc: 'Метаболизм, мышление.', path: 'M140,320 C130,350 140,390 160,400 C180,410 190,390 180,360 C170,330 150,310 140,320 Z' },
  { id: 5, name: 'Сердце', time: '11:00-13:00', desc: 'Циркуляция, радость.', path: 'M180,200 C170,220 180,260 200,270 C220,260 230,220 200,200 C190,195 190,195 180,200 Z' },
  { id: 6, name: 'Тонкий кишечник', time: '13:00-15:00', desc: 'Усвоение.', path: 'M160,410 C150,440 160,480 180,490 C200,500 220,490 230,480 C240,440 230,410 210,400 C190,390 170,400 160,410 Z' },
  { id: 7, name: 'Мочевой пузырь', time: '15:00-17:00', desc: 'Детокс, память.', path: 'M170,550 C160,570 170,600 200,610 C230,600 240,570 230,550 C220,540 180,540 170,550 Z' },
  { id: 8, name: 'Почки', time: '17:00-19:00', desc: 'Ресурс, кости.', path: 'M130,450 C120,470 120,510 150,520 C180,530 190,510 180,480 C170,450 140,440 130,450 Z M210,480 C200,510 210,530 240,520 C270,510 270,470 260,450 C250,440 220,450 210,480 Z' },
  { id: 9, name: 'Перикард', time: '19:00-21:00', desc: 'Защита сердца.', path: 'M185,205 C175,225 185,255 200,265 C215,255 225,225 215,205 C205,200 195,200 185,205 Z' },
  { id: 10, name: '3 Обогревателя (верх)', time: '21:00-23:00', desc: 'Распределение тепла.', path: 'M180,120 C170,140 180,170 200,180 C220,170 230,140 220,120 C210,110 190,110 180,120 Z' },
  { id: 11, name: '3 Обогревателя (низ)', time: '23:00-01:00', desc: 'Сброс ритмов.', path: 'M180,300 C170,320 180,350 200,360 C220,350 230,320 220,300 C210,290 190,290 180,300 Z' },
  { id: 12, name: 'Печень', time: '01:00-03:00', desc: 'Очищение крови.', path: 'M220,310 C210,340 230,380 260,390 C290,400 300,370 280,340 C260,310 230,300 220,310 Z' }
];

export function MeridianClock({ activeMeridian, onSelect }) {
  // Определяем активный ID
  const activeId = activeMeridian?.id || (activeMeridian?.name && ORGAN_REGIONS.find(o => o.name === activeMeridian.name)?.id);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '350px', margin: '0 auto', border: '2px solid var(--blue)', padding: '0', background: '#fff' }}>
      <style>{`
        .meridian-shape { transition: all 0.5s ease; cursor: pointer; }
        .meridian-shape:hover { fill: rgba(211, 47, 47, 0.8); stroke-width: 2.5; }
        .meridian-shape.active { fill: rgba(211, 47, 47, 0.9); stroke: #b71c1c; stroke-width: 2; filter: drop-shadow(0 0 8px rgba(211, 47, 47, 0.6)); }
        @keyframes pulse-meridian { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        .meridian-shape.active { animation: pulse-meridian 3s infinite ease-in-out; transform-origin: center; }
      `}</style>

      {/* Фоновое изображение */}
      <img 
        src="/assets/meridian-body-base.png" 
        alt="Body Constitution" 
        style={{ width: '100%', height: 'auto', display: 'block', filter: 'sepia(1) hue-rotate(180deg) opacity(0.8)' }} 
      />

      {/* SVG наложение */}
      <svg 
        viewBox="0 0 400 800" 
        preserveAspectRatio="xMidYMid meet" 
        style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none' }} 
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

        {/* ЛОГИКА: Рендерим ТОЛЬКО активный орган */}
        {ORGAN_REGIONS.map((organ) => {
          const isActive = activeId === organ.id;
          
          // Если орган не активен и не под курсором, он не рисуется
          if (!isActive) return null;

          return (
            <g key={organ.id} style={{ pointerEvents: 'auto' }} onClick={() => onSelect({ title: organ.name, time: organ.time, desc: organ.desc })}>
              <path
                className="meridian-shape active"
                d={organ.path}
                stroke="#b71c1c"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
