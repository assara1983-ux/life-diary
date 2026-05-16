// src/components/BlueprintSectionIcons.jsx
import React from 'react';

const base = {
  width: '100%',
  height: '100%',
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
};

const ICONS = {
  today: (
    <svg viewBox="0 0 24 24" style={base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      <path d="M8 12h8M12 8v8" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  ),
  schedule: (
    <svg viewBox="0 0 24 24" style={base}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
      <path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  work: (
    <svg viewBox="0 0 24 24" style={base}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M8 13h8M8 17h4" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" style={base}>
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" />
      <path d="M9 22V14h6v8M12 3v2M8 7h8" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  ),
  shopping: (
    <svg viewBox="0 0 24 24" style={base}>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
      <path d="M9 14h6M9 18h4" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  pets: (    <svg viewBox="0 0 24 24" style={base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M8 8c1.5-2 3-2.5 4-2s2.5.5 4 2M8 16c1.5 2 3 2.5 4 2s2.5-.5 4-2M16 8c2 1.5 2.5 3 2 4s-.5 2.5-2 4M8 16c-2 1.5-2.5 3-2 4s.5 2.5 2 4" />
      <path d="M12 9v-3M12 15v3M9 12H6M18 12h-3" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  ),
  car: (
    <svg viewBox="0 0 24 24" style={base}>
      <path d="M5 17h14v-5l-2-5H7L5 12v5z" />
      <circle cx="7.5" cy="17.5" r="2" />
      <circle cx="16.5" cy="17.5" r="2" />
      <path d="M5 12h14M7 12v-3h10v3" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  ),
  health_mental: (
    <svg viewBox="0 0 24 24" style={base}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      <path d="M8 12h8M12 8v8M10 14l-2 2M14 10l2-2" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  beauty: (
    <svg viewBox="0 0 24 24" style={base}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M12 6v6l4 2M8 14l4-2" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  hobbies: (
    <svg viewBox="0 0 24 24" style={base}>
      <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
      <path d="M12 8v4M10 10h4M8 12h8" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  ),
  goals: (
    <svg viewBox="0 0 24 24" style={base}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  travel: (
    <svg viewBox="0 0 24 24" style={base}>
      <path d="M2 12l10-8 10 8-10 8z" />
      <path d="M12 4v16M4 12h16" strokeDasharray="2 2" opacity="0.4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  journal: (
    <svg viewBox="0 0 24 24" style={base}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6M8 15h4" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" style={base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
      <path d="M12 14v4M9 16h6" strokeDasharray="2 2" opacity="0.4" />
    </svg>
  ),
};

export const SectionIcon = ({ name, size = 32, animated = false, active = false }) => {
  const icon = ICONS[name] || ICONS.today;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? 'var(--blue)' : 'var(--text3)',
        filter: active ? 'drop-shadow(0 2px 6px rgba(0,112,192,0.25))' : 'none',
        transform: active ? 'scale(1.08)' : 'scale(1)',
      }}
    >
      {icon}
    </div>
  );
};
