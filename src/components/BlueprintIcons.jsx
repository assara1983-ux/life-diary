// src/components/BlueprintIcons.jsx
import React from 'react';

// ─── АВТАРЫ ───
export const MaleAvatar = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className="blueprint-icon">
    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--blue)" strokeWidth="2" />
    <path d="M50 80 L50 95 M35 80 Q50 60 65 80" stroke="var(--blue)" strokeWidth="2" fill="none" />
    <circle cx="50" cy="45" r="15" fill="none" stroke="var(--blue)" strokeWidth="2" />
    <path d="M30 30 L70 30 M30 70 L70 70" stroke="var(--gold)" strokeWidth="1" strokeDasharray="4 2" />
  </svg>
);

export const FemaleAvatar = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className="blueprint-icon">
    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--gold)" strokeWidth="2" />
    <path d="M50 85 Q30 85 35 95 M50 85 Q70 85 65 95" stroke="var(--gold)" strokeWidth="2" fill="none" />
    <path d="M40 35 Q50 20 60 35" stroke="var(--gold)" strokeWidth="2" fill="none" />
    <circle cx="50" cy="45" r="12" fill="none" stroke="var(--gold)" strokeWidth="2" />
  </svg>
);

// ─── ЗОДИАКИ (Западные) ───
export const WesternZodiac = ({ sign, size = 40 }) => {
  const paths = {
    'Овен': 'M 10 30 Q 15 10 20 30 M 20 30 Q 25 10 30 30 M 15 35 L 25 35',
    'Телец': 'M 15 20 L 10 10 M 25 20 L 30 10 M 10 20 Q 20 40 30 20',
    'Близнецы': 'M 15 10 L 15 30 M 25 10 L 25 30 M 15 15 L 25 25 M 15 25 L 25 15',
    'Рак': 'M 10 15 L 20 15 L 20 25 L 10 25 Z M 25 15 L 35 15 L 35 25 L 25 25 Z M 15 20 L 30 20',
    'Лев': 'M 20 15 Q 10 25 20 35 M 25 15 Q 35 25 25 35 M 15 25 L 30 25',
    'Дева': 'M 15 10 L 15 30 M 25 10 L 25 30 M 15 20 L 20 15 L 25 20',
    'Весы': 'M 20 10 L 20 30 M 10 20 L 30 20 M 12 18 L 28 18',
    'Скорпион': 'M 10 20 L 20 10 L 30 20 L 30 30 M 30 30 L 20 25 L 10 30',
    'Стрелец': 'M 10 30 L 30 10 M 30 10 L 30 20 M 30 10 L 20 10',
    'Козерог': 'M 15 15 Q 25 30 15 30 M 25 15 Q 15 30 25 30',
    'Водолей': 'M 10 15 Q 20 25 10 35 M 15 10 Q 25 20 15 30',
    'Рыбы': 'M 10 15 Q 20 25 10 35 M 30 15 Q 20 25 30 35 M 10 25 L 30 25'
  };
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <path d={paths[sign] || paths['Овен']} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

// ─── ЗОДИАКИ (Восточные) ───
export const EasternZodiac = ({ sign, size = 40 }) => {
  // Упрощенные иконки для примера
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">      <circle cx="20" cy="20" r="15" fill="none" stroke="var(--gold)" strokeWidth="2" />
      <text x="20" y="25" textAnchor="middle" fontSize="12" fill="var(--gold)" fontFamily="serif">
        {sign ? sign[0] : '?'}
      </text>
    </svg>
  );
};

// ─── МЕРИДИАННЫЕ ЧАСЫ ───
export const MeridianClock = ({ activeMeridian, size = 200 }) => {
  const meridians = [
    { name: 'Легкие', time: '3-5' }, { name: 'Тол. Кишечник', time: '5-7' },
    { name: 'Желудок', time: '7-9' }, { name: 'Селезенка', time: '9-11' },
    { name: 'Сердце', time: '11-13' }, { name: 'Тон. Кишечник', time: '13-15' },
    { name: 'Мочевой', time: '15-17' }, { name: 'Почки', time: '17-19' },
    { name: 'Перикард', time: '19-21' }, { name: '3 Обогревателя', time: '21-23' },
    { name: 'Желчный', time: '23-1' }, { name: 'Печень', time: '1-3' }
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 200 200">
        {/* Круги */}
        <circle cx="100" cy="100" r="90" fill="none" stroke="var(--blue)" strokeWidth="1" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="var(--blue)" strokeWidth="0.5" strokeDasharray="4 2" />
        
        {/* Сектора */}
        {meridians.map((m, i) => {
          const angle = (i * 30) - 90;
          const rad = (angle * Math.PI) / 180;
          const x = 100 + 80 * Math.cos(rad);
          const y = 100 + 80 * Math.sin(rad);
          const isActive = m.name === activeMeridian;
          
          return (
            <g key={i}>
              <line x1="100" y1="100" x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />
              <text 
                x={100 + 50 * Math.cos(rad)} 
                y={100 + 50 * Math.sin(rad)} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fontSize={isActive ? "11" : "8"}
                fill={isActive ? "var(--blue)" : "var(--text3)"}
                fontWeight={isActive ? "bold" : "normal"}
              >
                {m.name}
              </text>
            </g>
          );        })}
        
        {/* Центр */}
        <circle cx="100" cy="100" r="5" fill="var(--gold)" />
      </svg>
    </div>
  );
};

// ─── ГРАФИК ЖИЗНЕННЫХ ЦИКЛОВ (Спираль) ───
export const LifeCycleSpiral = ({ age, size = 250 }) => {
  // Генерация спирали
  let points = [];
  for (let i = 0; i < 720; i++) {
    const angle = i * 0.1;
    const radius = 2 + i * 0.12;
    points.push([
      100 + radius * Math.cos(angle),
      100 + radius * Math.sin(angle)
    ]);
  }
  
  const pathData = points.map(p => `L ${p[0]} ${p[1]}`).join(' ');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
      <svg width={size} height={size} viewBox="0 0 200 200">
        {/* Спираль */}
        <path d={`M 100 100 ${pathData}`} fill="none" stroke="var(--blue)" strokeWidth="2" />
        
        {/* Маркер текущего возраста */}
        {points.map((p, i) => {
          // Примерное позиционирование маркера (упрощенно)
          if (i === age * 10) { 
             return <circle key="marker" cx={p[0]} cy={p[1]} r="4" fill="var(--gold)" stroke="white" strokeWidth="2" />
          }
          return null;
        })}
        
        <text x="100" y="105" textAnchor="middle" fontSize="10" fill="var(--text3)">
          Цикл Жизни
        </text>
      </svg>
    </div>
  );
};
