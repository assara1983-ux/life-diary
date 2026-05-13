// src/components/InteractiveVisuals.jsx
import { useState } from 'react';

// ─── 1. Интерактивный Body Blueprint ───
export function BodyBlueprint({ weakZones = ['Плечи', 'Лёгкие', 'Нервная система'], activeMeridian = 'Сердца', onZoneClick }) {
  const [hovered, setHovered] = useState(null);

  const zones = [
    { id: 'head', label: 'Голова / Мозг', cy: 60, r: 18, weak: weakZones.includes('Голова') },
    { id: 'chest', label: 'Грудь / Лёгкие', cy: 140, r: 22, weak: weakZones.includes('Лёгкие') },
    { id: 'core', label: 'ЖКТ / Печень', cy: 220, r: 24, weak: weakZones.includes('Печень') },
    { id: 'limbs', label: 'Конечности / Суставы', cy: 320, r: 20, weak: weakZones.includes('Суставы') },
  ];

  return (
    <div className="interactive-svg-container">
      <svg viewBox="0 0 300 400" className="blueprint-svg">
        {/* Фоновая сетка */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="300" height="400" fill="url(#grid)" />

        {/* Контур тела (упрощённый blueprint) */}
        <path d="M150,40 C130,40 125,70 125,90 L110,110 L105,180 L95,280 L90,360 L115,360 L120,290 L140,240 L145,290 L140,360 L165,360 L160,290 L155,240 L180,280 L175,360 L210,360 L205,280 L195,180 L190,110 L175,90 C175,70 170,40 150,40 Z" 
          fill="none" stroke="rgba(0,112,192,0.25)" strokeWidth="1.5" />

        {/* Зоны взаимодействия */}
        {zones.map(z => (
          <g key={z.id} 
             onClick={() => onZoneClick?.(z)}
             onMouseEnter={() => setHovered(z.id)}
             onMouseLeave={() => setHovered(null)}
             style={{ cursor: 'pointer', transition: 'all 0.3s' }}>
            <circle cx="150" cy={z.cy} r={z.r + 8} 
              fill={hovered === z.id ? 'rgba(0,112,192,0.1)' : 'transparent'}
              stroke={z.weak ? 'rgba(232,85,109,0.6)' : 'rgba(0,112,192,0.15)'}
              strokeWidth="1.5"
              strokeDasharray={z.weak ? '4 2' : 'none'}
            />
            <circle cx="150" cy={z.cy} r={z.r} 
              fill={hovered === z.id ? 'rgba(200,164,90,0.2)' : 'rgba(255,255,255,0.4)'}
              stroke={z.weak ? '#e8556d' : '#0070c0'}
              strokeWidth="1.5"
            />
            <text x="150" y={z.cy + 4} textAnchor="middle" fontSize="10" fill="var(--text2)" fontFamily="var(--font-mono)">
              {hovered === z.id ? z.label : '●'}
            </text>          </g>
        ))}

        {/* Активный меридиан (анимированная стрелка) */}
        <path d="M150,80 Q180,150 150,220" fill="none" stroke="var(--gold)" strokeWidth="2" strokeDasharray="5 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.5s" repeatCount="indefinite" />
        </path>
        <text x="185" y="150" fontSize="9" fill="var(--gold)" fontFamily="var(--font-mono)">
          {activeMeridian} (активен)
        </text>
      </svg>
    </div>
  );
}

// ─── 2. Таймлайн жизненных циклов ───
export function LifeCycleTimeline({ age = 42, cycles = [] }) {
  const [activePhase, setActivePhase] = useState(null);

  const phases = [
    { range: [0, 29], label: 'Становление', color: '#0070c0', desc: 'Накопление опыта, поиск направления.' },
    { range: [29, 42], label: 'Возврат Сатурна', color: '#c8a45a', desc: 'Кризис смысла, переоценка ценностей, первые серьёзные итоги.' },
    { range: [42, 56], label: 'Зрелость & Трансформация', color: '#2d6a4f', desc: 'Пик продуктивности, передача опыта, углубление мастерства.' },
    { range: [56, 75], label: 'Мудрость', color: '#8c7a5a', desc: 'Филантропия, наставничество, интеграция жизненного пути.' },
  ];

  const currentPhase = phases.find(p => age >= p.range[0] && age < p.range[1]);
  const progress = ((age - currentPhase.range[0]) / (currentPhase.range[1] - currentPhase.range[0])) * 100;

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <span className="timeline-title">Ключевые этапы пути</span>
        <span className="timeline-age">Ваш возраст: {age} лет</span>
      </div>
      
      <div className="timeline-track">
        {phases.map((ph, i) => {
          const isActive = activePhase === i || currentPhase === ph;
          return (
            <div key={i} className={`timeline-phase ${isActive ? 'active' : ''}`}
                 style={{ flex: ph.range[1] - ph.range[0], background: ph.color }}
                 onClick={() => setActivePhase(i)}>
              <div className="timeline-label">{ph.label}</div>
              <div className="timeline-years">{ph.range[0]}–{ph.range[1]}</div>
            </div>
          );
        })}
        {/* Текущая позиция */}
        <div className="timeline-pointer" style={{ left: `${((age / 75) * 100)}%` }}>          <div className="timeline-pointer-dot" />
          <div className="timeline-pointer-label">Сейчас</div>
        </div>
      </div>

      <div className="timeline-detail">
        <strong>{currentPhase?.label}:</strong> {currentPhase?.desc}
        {activePhase !== null && phases[activePhase] !== currentPhase && (
          <p style={{ marginTop: 6, color: 'var(--text3)' }}>
            📌 {phases[activePhase].desc}
          </p>
        )}
      </div>
    </div>
  );
}
