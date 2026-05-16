// src/components/MeridianClock.jsx
import React from "react";

// Упрощённые координаты для 12 меридианов на силуэте (viewBox 0 0 300 500)
const MERIDIAN_POINTS = [
  { id: 0, cx: 150, cy: 60, label: "3Обг", hour: "23-01" },
  { id: 1, cx: 150, cy: 90, label: "Печень", hour: "01-03" },
  { id: 2, cx: 130, cy: 130, label: "Лёгкие", hour: "03-05" },
  { id: 3, cx: 150, cy: 160, label: "Т.К.", hour: "05-07" },
  { id: 4, cx: 150, cy: 190, label: "Желудок", hour: "07-09" },
  { id: 5, cx: 170, cy: 130, label: "Селёз", hour: "09-11" },
  { id: 6, cx: 150, cy: 220, label: "Сердце", hour: "11-13" },
  { id: 7, cx: 150, cy: 250, label: "Т.Кш", hour: "13-15" },
  { id: 8, cx: 130, cy: 290, label: "М.П.", hour: "15-17" },
  { id: 9, cx: 150, cy: 320, label: "Почки", hour: "17-19" },
  { id: 10, cx: 170, cy: 290, label: "Перик", hour: "19-21" },
  { id: 11, cx: 150, cy: 360, label: "3Обг", hour: "21-23" }
];

export function MeridianClock({ current, profile, onOpen }) {
  const now = new Date();
  const hour = now.getHours();
  const isActive = (h) => {
    const [start] = h.split("-").map(Number);
    return hour >= start && hour < start + 2;
  };

  return (
    <div className="hm-clock-wrap">
      <style>{`
        .hm-clock-wrap { position: relative; width: 100%; max-width: 320px; margin: 0 auto; }
        .hm-silhouette { width: 100%; height: auto; background: rgba(0,112,192,0.02); border-radius: 12px; }
        .hm-meridian { cursor: pointer; transition: all 0.2s; }
        .hm-meridian:hover { filter: brightness(1.2); }
        .hm-meridian.active { animation: hm-pulse 2s infinite; }
        @keyframes hm-pulse { 0% { r: 6; opacity: 0.8; } 50% { r: 9; opacity: 1; } 100% { r: 6; opacity: 0.8; } }
        .hm-ring { transform-origin: 150px 200px; transition: transform 0.5s ease; }
        .hm-ring-text { font-family: var(--font-mono); font-size: 10px; fill: var(--text3); }
      `}</style>

      <svg className="hm-silhouette" viewBox="0 0 300 500">
        {/* Blueprint сетка */}
        <defs>
          <pattern id="hm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="300" height="500" fill="url(#hm-grid)" />

        {/* Кольцо часов */}
        <circle cx="150" cy="200" r="130" fill="none" stroke="rgba(0,112,192,0.15)" strokeWidth="1" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x = 150 + 125 * Math.cos(angle);
          const y = 200 + 125 * Math.sin(angle);
          return (
            <g key={i} className="hm-ring">
              <circle cx={x} cy={y} r="2" fill="var(--blue)" />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="hm-ring-text">
                {MERIDIAN_POINTS[i].hour}
              </text>
            </g>
          );
        })}

        {/* Силуэт (упрощённый) */}
        <path d="M150 30 C170 30, 180 50, 180 70 C180 90, 170 100, 150 100 C130 100, 120 90, 120 70 C120 50, 130 30, 150 30 Z" fill="rgba(0,112,192,0.06)" stroke="var(--line)" strokeWidth="1" />
        <path d="M150 105 C140 110, 130 130, 130 180 C130 250, 140 300, 140 400 C140 430, 130 460, 130 480" fill="none" stroke="var(--line)" strokeWidth="1.5" />
        <path d="M150 105 C160 110, 170 130, 170 180 C170 250, 160 300, 160 400 C160 430, 170 460, 170 480" fill="none" stroke="var(--line)" strokeWidth="1.5" />
        <path d="M130 130 C110 150, 90 180, 80 220" fill="none" stroke="var(--line)" strokeWidth="1" />
        <path d="M170 130 C190 150, 210 180, 220 220" fill="none" stroke="var(--line)" strokeWidth="1" />

        {/* Интерактивные точки */}
        {MERIDIAN_POINTS.map((p) => (
          <g
            key={p.id}
            className={`hm-meridian ${isActive(p.hour) ? "active" : ""}`}
            onClick={() => onOpen({ type: "meridian", data: p, current: current, profile })}
          >
            <circle cx={p.cx} cy={p.cy} r={isActive(p.hour) ? 8 : 6} fill={isActive(p.hour) ? "var(--gold)" : "var(--blue)"} stroke="#fff" strokeWidth="2" />
            <text x={p.cx} y={p.cy - 14} textAnchor="middle" fontSize="10" fill="var(--text2)" fontFamily="var(--font-mono)">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
