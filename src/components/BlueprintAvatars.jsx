// src/components/BlueprintAvatars.jsx
import React from 'react';

// ─── МУЖСКОЙ АВАТАР (Blueprint Style) ───
// Обновлен: добавлен геометрический стиль, лунные фазы, спираль
export function MaleAvatar({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 2px 4px rgba(0,112,192,0.15))" }}>
      <defs>
        <pattern id="mGrid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(0,112,192,0.05)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      
      {/* Фон с сеткой */}
      <circle cx="50" cy="50" r="48" fill="url(#mGrid)" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5"/>
      
      {/* Вспомогательные линии и геометрия */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5" strokeDasharray="2 2"/>
      <path d="M 20 20 L 80 20 L 80 80 L 20 80 Z" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5"/>
      
      {/* Силуэт профиля (мужской) */}
      <path d="M 45 30 Q 40 30 38 40 Q 35 50 40 60 Q 42 65 45 68 Q 48 70 50 68 Q 52 70 55 68 Q 58 65 60 60 Q 65 50 62 40 Q 60 30 55 30" 
            fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Плечи */}
      <path d="M 35 65 Q 50 75 65 65" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      
      {/* Геометрические акценты */}
      <path d="M 50 30 L 50 15" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
      <circle cx="50" cy="12" r="3" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
      
      {/* Спираль Фибоначчи (символ роста) */}
      <path d="M 65 65 Q 60 70 55 65 Q 50 60 55 55 Q 60 50 65 55 Q 70 60 65 65" fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.7"/>
      
      {/* Уголки чертежа */}
      <path d="M 10 10 L 15 10 M 10 10 L 10 15" stroke="var(--gold)" strokeWidth="1"/>
      <path d="M 90 10 L 85 10 M 90 10 L 90 15" stroke="var(--gold)" strokeWidth="1"/>
      <path d="M 10 90 L 15 90 M 10 90 L 10 85" stroke="var(--gold)" strokeWidth="1"/>
      <path d="M 90 90 L 85 90 M 90 90 L 90 85" stroke="var(--gold)" strokeWidth="1"/>
    </svg>
  );
}

// ─── ЖЕНСКИЙ АВАТАР (Blueprint Style) ───
// Обновлен: добавлен лотос, луны, более изящный профиль
export function FemaleAvatar({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 2px 4px rgba(200,164,90,0.15))" }}>
      <defs>
        <pattern id="fGrid" width="5" height="5" patternUnits="userSpaceOnUse">          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(200,164,90,0.05)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      
      {/* Фон */}
      <circle cx="50" cy="50" r="48" fill="url(#fGrid)" stroke="rgba(200,164,90,0.2)" strokeWidth="0.5"/>
      
      {/* Силуэт профиля (женский) */}
      <path d="M 42 35 Q 38 45 40 55 Q 42 65 45 68 Q 48 70 50 68 Q 52 70 55 68 Q 58 65 60 55 Q 62 45 58 35" 
            fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Волосы */}
      <path d="M 42 35 Q 45 30 50 32 Q 55 34 58 40 Q 60 45 58 50" fill="none" stroke="var(--gold)" strokeWidth="1.2"/>
      {/* Плечи */}
      <path d="M 35 68 Q 50 78 65 68" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      
      {/* Лотос (символ гармонии) */}
      <g transform="translate(50, 82) scale(0.8)">
        <path d="M 0 0 Q -5 8 0 12 Q 5 8 0 0" fill="none" stroke="var(--blue)" strokeWidth="1"/>
        <path d="M -8 4 Q -4 10 0 8 Q 4 10 8 4" fill="none" stroke="var(--blue)" strokeWidth="0.8"/>
      </g>
      
      {/* Лунные фазы */}
      <path d="M 20 20 A 3 3 0 1 0 20 26 A 3 3 0 1 1 20 20" fill="none" stroke="var(--blue)" strokeWidth="0.8"/>
      <circle cx="80" cy="20" r="2" fill="var(--blue)" opacity="0.5"/>
      <path d="M 80 22 A 2 2 0 1 0 80 26 A 2 2 0 1 1 80 22" fill="none" stroke="var(--blue)" strokeWidth="0.8"/>
      
      {/* Уголки */}
      <path d="M 10 10 L 15 10 M 10 10 L 10 15" stroke="var(--blue)" strokeWidth="1"/>
      <path d="M 90 10 L 85 10 M 90 10 L 90 15" stroke="var(--blue)" strokeWidth="1"/>
      <path d="M 10 90 L 15 90 M 10 90 L 10 85" stroke="var(--blue)" strokeWidth="1"/>
      <path d="M 90 90 L 85 90 M 90 90 L 90 85" stroke="var(--blue)" strokeWidth="1"/>
    </svg>
  );
}

// ─── ЗАПАДНЫЕ ЗНАКИ ЗОДИАКА (12 знаков) ───
// Обновлены все 12 знаков, включая 4 недостающих
export const WesternZodiacIcons = {
  'Овен': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Рога */}
      <path d="M 12 25 Q 10 15 15 10 Q 20 5 25 10 Q 30 15 28 25" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Голова */}
      <path d="M 15 25 Q 20 30 25 25" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      {/* Спираль */}
      <path d="M 20 15 Q 25 20 20 25" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5" strokeDasharray="2 2"/>
    </svg>
  ),
  'Телец': () => (    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Рога */}
      <path d="M 10 15 L 15 20 M 30 15 L 25 20" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Морда */}
      <path d="M 15 20 Q 20 25 25 20" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <circle cx="17" cy="22" r="1.5" fill="var(--blue)"/>
      <circle cx="23" cy="22" r="1.5" fill="var(--blue)"/>
      {/* Геометрия */}
      <circle cx="20" cy="20" r="14" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5"/>
    </svg>
  ),
  'Близнецы': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Две фигуры */}
      <line x1="12" y1="10" x2="12" y2="30" stroke="var(--blue)" strokeWidth="1.5"/>
      <line x1="28" y1="10" x2="28" y2="30" stroke="var(--blue)" strokeWidth="1.5"/>
      {/* Связь */}
      <path d="M 12 20 Q 20 25 28 20" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
      {/* Головы */}
      <circle cx="12" cy="12" r="2" fill="var(--blue)"/>
      <circle cx="28" cy="12" r="2" fill="var(--blue)"/>
    </svg>
  ),
  'Рак': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Клешни */}
      <path d="M 8 15 L 12 20 L 8 25" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 32 15 L 28 20 L 32 25" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      {/* Панцирь */}
      <path d="M 12 20 Q 20 30 28 20" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      {/* Спираль */}
      <path d="M 20 25 Q 25 20 20 15" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
    </svg>
  ),
  'Лев': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Грива */}
      <path d="M 20 10 Q 10 15 10 25 Q 15 30 20 30 Q 25 30 30 25 Q 30 15 20 10" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      {/* Морда */}
      <circle cx="20" cy="22" r="6" fill="none" stroke="var(--gold)" strokeWidth="1"/>
      <circle cx="17" cy="20" r="1" fill="var(--gold)"/>
      <circle cx="23" cy="20" r="1" fill="var(--gold)"/>
      <path d="M 18 25 Q 20 27 22 25" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
    </svg>
  ),
  'Дева': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Две фигуры с колосом */}
      <line x1="15" y1="10" x2="15" y2="30" stroke="var(--blue)" strokeWidth="1.5"/>
      <line x1="25" y1="10" x2="25" y2="30" stroke="var(--blue)" strokeWidth="1.5"/>      <path d="M 15 15 L 20 15 M 25 15 L 20 15" stroke="var(--gold)" strokeWidth="0.8"/>
      {/* Колос */}
      <path d="M 20 15 L 20 5 M 18 10 L 20 12 L 22 10" stroke="var(--gold)" strokeWidth="0.8"/>
    </svg>
  ),
  'Весы': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Основание */}
      <path d="M 15 30 L 25 30 L 20 10 Z" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      {/* Перекладина */}
      <line x1="8" y1="15" x2="32" y2="15" stroke="var(--blue)" strokeWidth="1.5"/>
      {/* Чашки */}
      <path d="M 8 15 Q 5 25 12 25 M 32 15 Q 35 25 28 25" fill="none" stroke="var(--gold)" strokeWidth="1"/>
    </svg>
  ),
  'Скорпион': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Тело */}
      <path d="M 10 20 Q 20 10 30 20 Q 35 25 30 30" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Жало */}
      <path d="M 30 30 L 25 25 L 30 20" fill="none" stroke="var(--gold)" strokeWidth="1"/>
      {/* Клешни */}
      <path d="M 10 20 L 5 15 L 10 10" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
    </svg>
  ),
  'Стрелец': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Лук */}
      <path d="M 10 30 Q 15 20 30 10" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Стрела */}
      <line x1="10" y1="30" x2="30" y2="10" stroke="var(--gold)" strokeWidth="1"/>
      {/* Оперение */}
      <path d="M 12 28 L 10 30 L 8 28" stroke="var(--gold)" strokeWidth="0.8"/>
      {/* Звезда */}
      <path d="M 30 10 L 32 5 L 28 8 L 35 8 L 31 5 Z" fill="var(--gold)" opacity="0.5"/>
    </svg>
  ),
  'Козерог': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Голова козла */}
      <path d="M 15 15 Q 20 10 25 15 Q 30 20 25 25 Q 20 30 15 25 Q 10 20 15 15" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      {/* Рога */}
      <path d="M 15 15 L 10 5 M 25 15 L 30 5" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Рыбий хвост */}
      <path d="M 15 25 Q 20 35 25 25" fill="none" stroke="var(--gold)" strokeWidth="1"/>
      {/* Гора */}
      <path d="M 5 30 L 20 15 L 35 30" fill="none" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5"/>
    </svg>
  ),
  'Водолей': () => (    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Волны */}
      <path d="M 5 15 Q 10 10 15 15 T 25 15 T 35 15" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 5 25 Q 10 20 15 25 T 25 25 T 35 25" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      {/* Кувшин */}
      <path d="M 25 10 Q 30 15 25 20 Q 20 25 25 30" fill="none" stroke="var(--gold)" strokeWidth="1"/>
    </svg>
  ),
  'Рыбы': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      {/* Две рыбы */}
      <path d="M 5 20 Q 10 10 20 20 Q 10 30 5 20" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <path d="M 35 20 Q 30 10 20 20 Q 30 30 35 20" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      {/* Нить */}
      <line x1="20" y1="10" x2="20" y2="30" stroke="var(--gold)" strokeWidth="0.8"/>
    </svg>
  )
};

// ─── ВОСТОЧНЫЕ ЗНАКИ (12 животных) ───
// Оставлены как есть, так как новые рисунки не присылались, но можно добавить геометрию
export const EasternZodiacIcons = {
  'Крыса': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="22" r="8" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 12 22 Q 8 20 6 22" fill="none" stroke="var(--gold)" strokeWidth="1"/>
      <path d="M 28 22 Q 32 20 34 22" fill="none" stroke="var(--gold)" strokeWidth="1"/>
      <circle cx="17" cy="20" r="1" fill="var(--gold)"/>
      <circle cx="23" cy="20" r="1" fill="var(--gold)"/>
    </svg>
  ),
  'Бык': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <ellipse cx="20" cy="22" rx="9" ry="7" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 13 18 L 10 12 M 27 18 L 30 12" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17" cy="21" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="21" r="1.5" fill="var(--gold)"/>
    </svg>
  ),
  'Тигр': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="22" r="9" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 12 16 L 10 10 M 20 14 L 20 8 M 28 16 L 30 10" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 14 22 L 12 24 M 26 22 L 28 24" stroke="var(--gold)" strokeWidth="1"/>
      <circle cx="17" cy="21" r="1" fill="var(--gold)"/>
      <circle cx="23" cy="21" r="1" fill="var(--gold)"/>
    </svg>
  ),
  'Кролик': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">      <ellipse cx="20" cy="24" rx="8" ry="7" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <ellipse cx="16" cy="14" rx="2" ry="6" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <ellipse cx="24" cy="14" rx="2" ry="6" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <circle cx="17" cy="23" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="23" r="1.5" fill="var(--gold)"/>
    </svg>
  ),
  'Дракон': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 10 24 Q 14 18 20 20 Q 26 18 30 24" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 12 16 Q 16 12 20 14 Q 24 12 28 16" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <circle cx="17" cy="22" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="22" r="1.5" fill="var(--gold)"/>
      <path d="M 20 14 L 20 8 M 18 10 L 22 10" stroke="var(--gold)" strokeWidth="1"/>
    </svg>
  ),
  'Змея': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 12 28 Q 16 20 20 24 Q 24 28 28 20" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="20" cy="18" r="4" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <circle cx="18" cy="17" r="1" fill="var(--gold)"/>
      <circle cx="22" cy="17" r="1" fill="var(--gold)"/>
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
    </svg>
  ),
  'Обезьяна': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="22" r="8" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 12 20 Q 8 18 8 22 Q 8 26 12 24" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
      <path d="M 28 20 Q 32 18 32 22 Q 32 26 28 24" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
      <circle cx="17" cy="21" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="21" r="1.5" fill="var(--gold)"/>
    </svg>
  ),
  'Петух': () => (    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="22" cy="24" r="7" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 16 18 L 14 12 L 18 14 L 20 10 L 22 16" stroke="var(--gold)" strokeWidth="1.5" fill="none"/>
      <circle cx="24" cy="22" r="1.5" fill="var(--gold)"/>
      <path d="M 26 24 L 30 22" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
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
