// src/components/MeridianClock.jsx
import React from 'react';

// Данные точек для наложения на картинку (в % от размера картинки)
// Картинка должна быть фронтальная анатомия (как на скриншоте)
const MERIDIAN_POINTS = [
  { id: 1, h: "03-05", name: "Лёгкие", x: "32%", y: "25%", desc: "Пик активности. Дыхание, кожа.", warning: "Не перегружать физически." },
  { id: 2, h: "05-07", name: "Толстый кишечник", x: "62%", y: "25%", desc: "Выведение токсинов.", benefit: "Выпейте теплую воду." },
  { id: 3, h: "07-09", name: "Желудок", x: "50%", y: "40%", desc: "Пищеварение.", benefit: "Плотный завтрак." },
  { id: 4, h: "09-11", name: "Селезенка", x: "60%", y: "35%", desc: "Метаболизм, мышление.", warning: "Избегайте тяжелой пищи." },
  { id: 5, h: "11-13", name: "Сердце", x: "38%", y: "30%", desc: "Циркуляция, радость.", warning: "Отдых, не нервничайте." },
  { id: 6, h: "13-15", name: "Тонкий кишечник", x: "58%", y: "32%", desc: "Усвоение.", benefit: "Легкий перекус." },
  { id: 7, h: "15-17", name: "Мочевой пузырь", x: "50%", y: "75%", desc: "Детокс.", benefit: "Интенсивная работа мозга." },
  { id: 8, h: "17-19", name: "Почки", x: "50%", y: "65%", desc: "Ресурс, кости.", warning: "Берегите энергию." },
  { id: 9, h: "19-21", name: "Перикард", x: "42%", y: "32%", desc: "Защита сердца.", benefit: "Романтика, спокойствие." },
  { id: 10, h: "21-23", name: "Тройной обогреватель", x: "55%", y: "30%", desc: "Регуляция.", warning: "Подготовка ко сну." },
  { id: 11, h: "23-01", name: "Тройной обогреватель (Ночь)", x: "50%", y: "10%", desc: "Сброс систем.", warning: "Сон обязателен." },
  { id: 12, h: "01-03", name: "Печень", x: "62%", y: "38%", desc: "Очищение крови.", warning: "Глубокий сон." },
];

export function MeridianClock({ activeMeridian, onSelect }) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '350px', margin: '0 auto', border: '2px solid var(--blue)', padding: '10px', background: '#f9f9f9' }}>
      {/* Фоновая картинка (Blueprint Style) */}
      <img 
        src="/assets/meridian-body-base.png" 
        alt="Body Constitution" 
        style={{ width: '100%', height: 'auto', display: 'block', filter: 'sepia(1) hue-rotate(180deg) opacity(0.8)' }} 
      />
      
      {/* SVG Overlay */}
      <svg style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* Сетка Blueprint */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

        {/* Точки меридианов */}
        {MERIDIAN_POINTS.map((pt) => {
          const isActive = activeMeridian && (activeMeridian.h === pt.h || activeMeridian.name === pt.name);
          return (
            <g key={pt.id} style={{ pointerEvents: 'auto', cursor: 'pointer' }} onClick={() => onSelect({ title: pt.name, desc: pt.desc, warning: pt.warning, benefit: pt.benefit })}>
              {/* Линия от центра */}
              <line x1="50%" y1="50%" x2={pt.x} y2={pt.y} stroke={isActive ? "#d32f2f" : "rgba(0,112,192,0.3)"} strokeWidth="1" strokeDasharray="4" />
              {/* Кружок точки */}
              <circle cx={pt.x} cy={pt.y} r="6" fill={isActive ? "#d32f2f" : "var(--blue)"} stroke="#fff" strokeWidth="2" className="meridian-point">
                <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Подпись */}
              <text x={parseFloat(pt.x) + 1.5} y={pt.y} fontSize="8" fill="#000" fontFamily="monospace" dy="3">{pt.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
