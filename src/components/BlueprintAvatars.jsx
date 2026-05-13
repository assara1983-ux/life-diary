// src/components/BlueprintAvatars.jsx
import React from 'react';

// ─── МУЖСКОЙ АВАТАР (Blueprint стиль) ───
export function MaleAvatar({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 2px 4px rgba(0,112,192,0.2))" }}>
      {/* Сетка фона */}
      <defs>
        <pattern id="maleGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#maleGrid)" stroke="rgba(0,112,192,0.3)" strokeWidth="1.5"/>
      
      {/* Контур головы */}
      <circle cx="50" cy="40" r="18" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      
      {/* Плечи */}
      <path d="M 25 65 Q 50 75 75 65" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      
      {/* Линии чертежа */}
      <line x1="50" y1="22" x2="50" y2="58" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5" strokeDasharray="2 2"/>
      <line x1="32" y1="40" x2="68" y2="40" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5" strokeDasharray="2 2"/>
      
      {/* Уголки Blueprint */}
      <path d="M 8 8 L 15 8 M 8 8 L 8 15" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
      <path d="M 92 8 L 85 8 M 92 8 L 92 15" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
      <path d="M 8 92 L 15 92 M 8 92 L 8 85" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
      <path d="M 92 92 L 85 92 M 92 92 L 92 85" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

// ─── ЖЕНСКИЙ АВАТАР (Blueprint стиль) ───
export function FemaleAvatar({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 2px 4px rgba(200,164,90,0.2))" }}>
      {/* Сетка фона */}
      <defs>
        <pattern id="femaleGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(200,164,90,0.1)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#femaleGrid)" stroke="rgba(200,164,90,0.3)" strokeWidth="1.5"/>
      
      {/* Контур головы */}
      <circle cx="50" cy="42" r="16" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      
      {/* Волосы */}      <path d="M 34 38 Q 30 50 34 60 M 66 38 Q 70 50 66 60" fill="none" stroke="var(--gold)" strokeWidth="1.2"/>
      
      {/* Плечи (более покатые) */}
      <path d="M 28 65 Q 50 72 72 65" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      
      {/* Талия */}
      <path d="M 38 72 Q 50 76 62 72" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.6"/>
      
      {/* Уголки Blueprint */}
      <path d="M 8 8 L 15 8 M 8 8 L 8 15" stroke="var(--blue)" strokeWidth="1.5" fill="none"/>
      <path d="M 92 8 L 85 8 M 92 8 L 92 15" stroke="var(--blue)" strokeWidth="1.5" fill="none"/>
      <path d="M 8 92 L 15 92 M 8 92 L 8 85" stroke="var(--blue)" strokeWidth="1.5" fill="none"/>
      <path d="M 92 92 L 85 92 M 92 92 L 92 85" stroke="var(--blue)" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

// ─── ЗАПАДНЫЕ ЗНАКИ ЗОДИАКА (12 знаков) ───
export const WesternZodiacIcons = {
  'Овен': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 8 28 Q 12 18 20 20 Q 28 18 32 28" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 10 26 Q 14 12 20 14 Q 26 12 30 26" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5" strokeDasharray="2 2"/>
    </svg>
  ),
  'Телец': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="22" r="10" fill="none" stroke="var(--blue)" strokeWidth="2"/>
      <path d="M 10 14 L 6 8 M 30 14 L 34 8" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 8 28 Q 20 34 32 28" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
    </svg>
  ),
  'Близнецы': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <line x1="12" y1="8" x2="12" y2="32" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="28" y1="8" x2="28" y2="32" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="16" x2="28" y2="16" stroke="var(--blue)" strokeWidth="1.5"/>
      <line x1="12" y1="24" x2="28" y2="24" stroke="var(--blue)" strokeWidth="1.5"/>
    </svg>
  ),
  'Рак': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 6 12 Q 2 16 6 20" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 34 12 Q 38 16 34 20" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="14" cy="16" r="4" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <circle cx="26" cy="16" r="4" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 14 20 Q 20 28 26 20" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
    </svg>
  ),  'Лев': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="20" r="8" fill="none" stroke="var(--blue)" strokeWidth="2"/>
      <path d="M 20 8 L 22 12 M 20 8 L 18 12" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 28 20 L 32 18 M 28 20 L 32 22" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 20 32 L 18 28 M 20 32 L 22 28" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 12 20 L 8 18 M 12 20 L 8 22" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'Дева': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <line x1="20" y1="8" x2="20" y2="32" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 14 14 Q 20 10 26 14" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 16 20 L 20 18 L 24 20" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 14 26 Q 20 30 26 26" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
    </svg>
  ),
  'Весы': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <line x1="20" y1="6" x2="20" y2="34" stroke="var(--blue)" strokeWidth="1.5"/>
      <line x1="12" y1="12" x2="28" y2="12" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 10 12 L 10 22 Q 10 26 14 26 L 18 26" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 30 12 L 30 22 Q 30 26 26 26 L 22 26" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
    </svg>
  ),
  'Скорпион': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 10 20 Q 14 14 20 14 Q 26 14 30 20" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 30 20 Q 34 26 30 32" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="20" y1="14" x2="20" y2="26" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 16 20 L 20 24 L 24 20" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
    </svg>
  ),
  'Стрелец': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <line x1="8" y1="32" x2="32" y2="8" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 24 8 L 32 8 L 32 16" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="32" cy="8" r="2" fill="var(--blue)"/>
    </svg>
  ),
  'Козерог': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 10 12 Q 14 8 18 12 Q 22 16 26 12 Q 30 8 34 12" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 10 12 Q 6 20 10 28 Q 14 32 20 28 Q 26 24 30 28" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'Водолей': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 8 16 Q 14 12 20 16 Q 26 20 32 16" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 8 24 Q 14 20 20 24 Q 26 28 32 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>    </svg>
  ),
  'Рыбы': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 10 12 Q 6 20 10 28" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M 30 12 Q 34 20 30 28" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="10" y1="20" x2="30" y2="20" stroke="var(--blue)" strokeWidth="1.5" strokeDasharray="3 2"/>
    </svg>
  )
};

// ─── ВОСТОЧНЫЕ ЗНАКИ (12 животных) ───
export const EasternZodiacIcons = {
  'Крыса': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="22" r="8" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <circle cx="14" cy="18" r="2" fill="var(--gold)"/>
      <circle cx="26" cy="18" r="2" fill="var(--gold)"/>
      <path d="M 20 14 L 20 10 M 18 12 L 22 12" stroke="var(--gold)" strokeWidth="1"/>
      <path d="M 12 22 Q 6 24 6 28" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 28 22 Q 34 24 34 28" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'Бык': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <ellipse cx="20" cy="24" rx="10" ry="8" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 12 18 L 8 12 M 28 18 L 32 12" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="22" r="2" fill="var(--gold)"/>
      <circle cx="24" cy="22" r="2" fill="var(--gold)"/>
    </svg>
  ),
  'Тигр': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="22" r="9" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 14 16 L 12 10 M 20 14 L 20 8 M 26 16 L 28 10" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 12 20 L 16 22 L 12 24 M 28 20 L 24 22 L 28 24" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="22" r="1.5" fill="var(--gold)"/>
      <circle cx="24" cy="22" r="1.5" fill="var(--gold)"/>
    </svg>
  ),
  'Кролик': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <ellipse cx="20" cy="24" rx="8" ry="7" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <ellipse cx="16" cy="14" rx="2" ry="6" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <ellipse cx="24" cy="14" rx="2" ry="6" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <circle cx="17" cy="23" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="23" r="1.5" fill="var(--gold)"/>
    </svg>
  ),
  'Дракон': () => (    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 10 24 Q 14 18 20 20 Q 26 18 30 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 12 16 Q 16 12 20 14 Q 24 12 28 16" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 20 14 L 20 8 M 18 10 L 22 10" stroke="var(--gold)" strokeWidth="1"/>
      <circle cx="17" cy="22" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="22" r="1.5" fill="var(--gold)"/>
    </svg>
  ),
  'Змея': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 12 28 Q 16 20 20 24 Q 24 28 28 20" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="20" cy="18" r="4" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <circle cx="18" cy="17" r="1" fill="var(--gold)"/>
      <circle cx="22" cy="17" r="1" fill="var(--gold)"/>
      <path d="M 20 20 L 20 22" stroke="var(--gold)" strokeWidth="1"/>
    </svg>
  ),
  'Лошадь': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <ellipse cx="22" cy="24" rx="9" ry="7" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 14 20 Q 10 16 12 12" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="26" cy="22" r="2" fill="var(--gold)"/>
      <path d="M 14 24 L 10 26 M 14 28 L 10 30" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'Коза': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <ellipse cx="20" cy="24" rx="8" ry="7" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 14 18 Q 12 14 14 12 M 26 18 Q 28 14 26 12" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17" cy="23" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="23" r="1.5" fill="var(--gold)"/>
      <path d="M 16 28 Q 20 30 24 28" stroke="var(--gold)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  'Обезьяна': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="22" r="8" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 12 20 Q 8 18 8 22 Q 8 26 12 24" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
      <path d="M 28 20 Q 32 18 32 22 Q 32 26 28 24" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
      <circle cx="17" cy="21" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="21" r="1.5" fill="var(--gold)"/>
      <path d="M 18 26 Q 20 28 22 26" stroke="var(--gold)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  'Петух': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="22" cy="24" r="7" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 16 18 L 14 12 L 18 14 L 20 10 L 22 16" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
      <circle cx="24" cy="22" r="1.5" fill="var(--gold)"/>
      <path d="M 26 24 L 30 22" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>    </svg>
  ),
  'Собака': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <ellipse cx="20" cy="24" rx="8" ry="7" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 14 20 L 12 14 M 26 20 L 28 14" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17" cy="23" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="23" r="1.5" fill="var(--gold)"/>
      <ellipse cx="20" cy="26" rx="2" ry="1.5" fill="var(--gold)"/>
    </svg>
  ),
  'Свинья': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <ellipse cx="20" cy="24" rx="9" ry="7" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <ellipse cx="20" cy="20" rx="3" ry="2" fill="var(--gold)" opacity="0.3"/>
      <circle cx="17" cy="23" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="23" r="1.5" fill="var(--gold)"/>
      <path d="M 14 18 L 12 14 M 26 18 L 28 14" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
};

export default { MaleAvatar, FemaleAvatar, WesternZodiacIcons, EasternZodiacIcons };
