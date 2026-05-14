// src/components/BlueprintIcons.jsx
import React from 'react';

// ─── МЕРИДИАННЫЕ ЧАСЫ (Meridian Clock) ───
export const MeridianClock = ({ activeMeridian, size = 200 }) => {
  const meridians = [
    { name: 'Лёгкие', time: '3-5' },
    { name: 'Тол. Кишечник', time: '5-7' },
    { name: 'Желудок', time: '7-9' },
    { name: 'Селезёнка', time: '9-11' },
    { name: 'Сердце', time: '11-13' },
    { name: 'Тон. Кишечник', time: '13-15' },
    { name: 'Мочевой', time: '15-17' },
    { name: 'Почки', time: '17-19' },
    { name: 'Перикард', time: '19-21' },
    { name: '3 Обогревателя', time: '21-23' },
    { name: 'Желчный', time: '23-1' },
    { name: 'Печень', time: '1-3' }
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 200 200">
        {/* Фоновая сетка */}
        <defs>
            <pattern id="clockGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0,112,192,0.05)" strokeWidth="0.5"/>
            </pattern>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#clockGrid)"/>

        {/* Круги */}
        <circle cx="100" cy="100" r="90" fill="none" stroke="var(--blue)" strokeWidth="1" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="var(--blue)" strokeWidth="0.5" strokeDasharray="4 2" />
        
        {/* Сектора */}
        {meridians.map((m, i) => {
          const angle = (i * 30) - 90;
          const rad = (angle * Math.PI) / 180;
          const x = 100 + 80 * Math.cos(rad);
          const y = 100 + 80 * Math.sin(rad);
          
          // Проверяем совпадение по имени (убираем пробелы для надежности)
          const isActive = m.name.trim() === activeMeridian?.trim();
          
          return (
            <g key={i}>
              <line x1="100" y1="100" x2={x} y2={y} stroke={isActive ? "var(--blue)" : "var(--line)"} strokeWidth={isActive ? "2" : "1"} />
              <text
                x={100 + 55 * Math.cos(rad)}                y={100 + 55 * Math.sin(rad)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isActive ? "10" : "8"}
                fill={isActive ? "var(--blue)" : "var(--text3)"}
                fontWeight={isActive ? "bold" : "normal"}
                fontFamily="JetBrains Mono, monospace"
              >
                {m.name}
              </text>
              {/* Время */}
              <text
                x={100 + 40 * Math.cos(rad)}
                y={100 + 40 * Math.sin(rad)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fill="var(--text3)"
                fontFamily="JetBrains Mono, monospace"
              >
                {m.time}
              </text>
            </g>
          );
        })}
        
        {/* Центр */}
        <circle cx="100" cy="100" r="5" fill="var(--gold)" />
        
        {/* Уголки Blueprint */}
        <path d="M 10 10 L 20 10 M 10 10 L 10 20" stroke="var(--gold)" strokeWidth="2" fill="none"/>
        <path d="M 190 10 L 180 10 M 190 10 L 190 20" stroke="var(--gold)" strokeWidth="2" fill="none"/>
        <path d="M 10 190 L 20 190 M 10 190 L 10 180" stroke="var(--gold)" strokeWidth="2" fill="none"/>
        <path d="M 190 190 L 180 190 M 190 190 L 190 180" stroke="var(--gold)" strokeWidth="2" fill="none"/>
      </svg>
    </div>
  );
};

// ─── ГРАФИК ЖИЗНЕННЫХ ЦИКЛОВ (Спираль) ───
export const LifeCycleSpiral = ({ age, size = 250 }) => {
  // Генерация спирали Фибоначчи
  let points = [];
  for (let i = 0; i < 720; i++) {
    const angle = i * 0.1;
    const radius = 2 + i * 0.15; // Чуть плотнее витки
    points.push([
      100 + radius * Math.cos(angle),
      100 + radius * Math.sin(angle)
    ]);  }
  const pathData = points.map(p => `L ${p[0]} ${p[1]}`).join(' ');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
      <svg width={size} height={size} viewBox="0 0 200 200">
         {/* Фоновая сетка */}
         <defs>
            <pattern id="spiralGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(200,164,90,0.05)" strokeWidth="0.5"/>
            </pattern>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#spiralGrid)"/>

        {/* Спираль */}
        <path d={`M 100 100 ${pathData}`} fill="none" stroke="var(--blue)" strokeWidth="2" />
        
        {/* Маркер текущего возраста (примерно 1 виток = 10 лет) */}
        {age && points.map((p, i) => {
          // Простая аппроксимация: возраст 30 = индекс 300
          if (i === age * 10) {
            return <circle key="marker" cx={p[0]} cy={p[1]} r="5" fill="var(--gold)" stroke="#fff" strokeWidth="2" />
          }
          return null;
        })}
        
        <text x="100" y="105" textAnchor="middle" fontSize="10" fill="var(--text3)" fontFamily="JetBrains Mono, monospace">
          Life Cycle
        </text>
        
        {/* Уголки Blueprint */}
        <path d="M 10 10 L 20 10 M 10 10 L 10 20" stroke="var(--blue)" strokeWidth="2" fill="none"/>
        <path d="M 190 10 L 180 10 M 190 10 L 190 20" stroke="var(--blue)" strokeWidth="2" fill="none"/>
        <path d="M 10 190 L 20 190 M 10 190 L 10 180" stroke="var(--blue)" strokeWidth="2" fill="none"/>
        <path d="M 190 190 L 180 190 M 190 190 L 190 180" stroke="var(--blue)" strokeWidth="2" fill="none"/>
      </svg>
    </div>
  );
};
