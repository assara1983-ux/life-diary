// src/components/BlueprintAvatars.jsx
import React from 'react';

// ─── МУЖСКОЙ АВАТАР (Blueprint Style) ───
export function MaleAvatar({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 2px 4px rgba(0,112,192,0.15))" }}>
      <defs>
        <pattern id="mGrid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(0,112,192,0.05)" strokeWidth="0.3"/>
        </pattern>
      </defs>
      
      {/* Фон с сеткой */}
      <circle cx="50" cy="50" r="48" fill="url(#mGrid)" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5"/>

      {/* Орбита */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="var(--blue)" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6"/>

      {/* Силуэт (Фронтальный) */}
      <path d="M 50 15 Q 65 15 65 30 Q 65 45 55 50 L 55 65 Q 70 70 80 85 L 20 85 Q 30 70 45 65 L 45 50 Q 35 45 35 30 Q 35 15 50 15" 
            fill="none" stroke="var(--blue)" strokeWidth="1.2" strokeLinecap="round"/>
            
      {/* Лицо */}
      <path d="M 45 30 L 40 35 M 55 30 L 60 35" stroke="var(--blue)" strokeWidth="1" strokeLinecap="round"/> {/* Брови */}
      <path d="M 42 40 L 46 40 M 54 40 L 58 40" stroke="var(--blue)" strokeWidth="1" strokeLinecap="round"/> {/* Глаза */}
      <path d="M 48 48 L 50 52 L 52 48" stroke="var(--blue)" strokeWidth="1" strokeLinecap="round"/> {/* Нос */}
      
      {/* Золотой куб на груди */}
      <g transform="translate(50, 72)">
         <path d="M -8 -4 L 0 -8 L 8 -4 L 8 4 L 0 8 L -8 4 Z" fill="none" stroke="var(--gold)" strokeWidth="1.2"/>
         <path d="M 0 -8 L 0 0 L 8 4 M 0 0 L -8 4" stroke="var(--gold)" strokeWidth="0.8"/>
      </g>
      
      {/* Уголки */}
      <path d="M 5 5 L 12 5 M 5 5 L 5 12" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 95 5 L 88 5 M 95 5 L 95 12" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 5 95 L 12 95 M 5 95 L 5 88" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 95 95 L 88 95 M 95 95 L 95 88" stroke="var(--gold)" strokeWidth="1.5"/>
    </svg>
  );
}

// ─── ЖЕНСКИЙ АВАТАР (Detailed Blueprint Style) ───
export function FemaleAvatar({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 2px 4px rgba(0,112,192,0.15))" }}>
      <defs>
        <pattern id="fGrid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(0,112,192,0.05)" strokeWidth="0.3"/>        </pattern>
      </defs>

      {/* 1. Фоновый круг с сеткой */}
      <circle cx="50" cy="50" r="48" fill="url(#fGrid)" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5"/>

      {/* 2. Орбита Луны */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="var(--blue)" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6"/>

      {/* 3. Фазы Луны (8 точек вокруг) */}
      <g stroke="var(--blue)" strokeWidth="0.8" fill="none">
        {/* Верх (Полнолуние) */}
        <circle cx="50" cy="6" r="3.5" /> 
        <circle cx="50" cy="6" r="1.5" fill="var(--blue)" />
        {/* Верх-Право (Убывающая) */}
        <circle cx="81" cy="19" r="3.5" />
        <path d="M 81 15.5 A 3.5 3.5 0 0 0 81 22.5 A 2.5 2.5 0 0 1 81 15.5" fill="var(--blue)" />
        {/* Право (Последняя четверть) */}
        <circle cx="94" cy="50" r="3.5" />
        <path d="M 94 46.5 A 3.5 3.5 0 0 0 94 53.5 L 94 46.5 Z" fill="var(--blue)" />
        {/* Низ-Право (Новолуние) */}
        <circle cx="81" cy="81" r="3.5" />
        {/* Низ (Растущая) */}
        <circle cx="50" cy="94" r="3.5" />
        <circle cx="50" cy="94" r="1.5" fill="var(--blue)" />
        {/* Низ-Лево (Растущая) */}
        <circle cx="19" cy="81" r="3.5" />
        <path d="M 19 77.5 A 3.5 3.5 0 0 1 19 84.5 A 2.5 2.5 0 0 0 19 77.5" fill="var(--blue)" />
        {/* Лево (Первая четверть) */}
        <circle cx="6" cy="50" r="3.5" />
        <path d="M 6 46.5 A 3.5 3.5 0 0 1 6 53.5 L 6 46.5 Z" fill="var(--blue)" />
        {/* Верх-Лево (Растущая) */}
        <circle cx="19" cy="19" r="3.5" />
        <path d="M 19 15.5 A 3.5 3.5 0 0 1 19 22.5 A 2.5 2.5 0 0 0 19 15.5" fill="var(--blue)" />
      </g>

      {/* 4. Профиль Лица (Детализированный) */}
      <g stroke="var(--blue)" strokeWidth="1" fill="none">
         {/* Контур */}
         <path d="M 52 20 Q 58 20 60 25 Q 62 30 55 35 Q 52 38 58 45 Q 60 50 55 55 Q 50 60 48 65 Q 46 70 50 75" strokeWidth="1.2"/>
         {/* Линия шеи */}
         <path d="M 48 65 L 45 85" />
         {/* Бровь и глаз */}
         <path d="M 53 30 Q 56 29 58 30 M 53 33 Q 56 32 58 33" strokeWidth="0.8"/>
         {/* Нос (тонкие линии) */}
         <path d="M 55 35 Q 58 45 55 55 M 55 45 Q 57 46 58 45" strokeWidth="0.8"/>
         {/* Губы */}
         <path d="M 50 60 Q 53 59 55 60 Q 53 62 50 60" strokeWidth="0.8"/>
         {/* Штриховка на лице (объем) */}
         <path d="M 58 25 L 58 28 M 59 26 L 59 29 M 60 27 L 60 30 M 61 28 L 61 31" strokeWidth="0.4" opacity="0.5"/>         <path d="M 55 50 L 53 52 M 56 51 L 54 53" strokeWidth="0.4" opacity="0.5"/>
      </g>

      {/* 5. Волосы (Текстура прядями) */}
      <g stroke="var(--blue)" strokeWidth="0.8" fill="none">
         {/* Основной контур волос */}
         <path d="M 52 20 Q 65 15 70 25 Q 75 35 65 45 Q 55 50 48 55 Q 40 50 45 35 Q 48 25 52 20" strokeWidth="1"/>
         {/* Пучок волос */}
         <path d="M 70 25 Q 85 20 85 35 Q 85 50 70 55 Q 60 60 55 50" strokeWidth="1"/>
         
         {/* Текстура прядей (основные линии) */}
         <path d="M 60 18 Q 65 25 60 35 M 65 20 Q 70 28 65 38 M 70 22 Q 75 30 70 40 M 75 25 Q 80 35 75 45 M 80 30 Q 82 40 78 50 M 82 35 Q 80 45 75 52"/>
         {/* Текстура пучка */}
         <path d="M 72 28 Q 78 30 78 38 M 74 30 Q 80 32 80 40 M 76 32 Q 82 35 80 42 M 72 35 Q 75 38 70 42 M 70 40 Q 68 45 62 48"/>
         
         {/* Отдельные локоны */}
         <path d="M 45 35 Q 40 40 45 45 M 48 55 Q 42 60 46 65 M 52 60 Q 48 65 50 70" strokeWidth="0.6" opacity="0.7"/>
      </g>

      {/* 6. Лотос на груди (Золотой акцент, детализированный) */}
      <g transform="translate(50, 86) scale(0.9)">
         <g stroke="var(--gold)" strokeWidth="0.8" fill="none">
            {/* Лепестки */}
            <path d="M 0 0 Q -3 -3 0 -6 Q 3 -3 0 0 Z" />
            <path d="M 0 0 Q -5 -1 -6 -4 Q -3 -3 0 0 Z" />
            <path d="M 0 0 Q 5 -1 6 -4 Q 3 -3 0 0 Z" />
            <path d="M 0 0 Q -3 0 -4 2 Q 0 0 Z" />
            <path d="M 0 0 Q 3 0 4 2 Q 0 0 Z" />
            {/* Сердцевина */}
            <circle cx="0" cy="-2" r="1.5" fill="var(--gold)" stroke="none" opacity="0.5"/>
         </g>
      </g>

      {/* 7. Золотое сечение (Спираль) */}
      <path d="M 60 40 Q 70 30 70 40 Q 70 50 60 50 Q 50 50 50 40 Q 50 30 60 30" 
            fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.6"/>

      {/* 8. Уголки чертежа */}
      <path d="M 5 5 L 12 5 M 5 5 L 5 12" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 95 5 L 88 5 M 95 5 L 95 12" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 5 95 L 12 95 M 5 95 L 5 88" stroke="var(--gold)" strokeWidth="1.5"/>
      <path d="M 95 95 L 88 95 M 95 95 L 95 88" stroke="var(--gold)" strokeWidth="1.5"/>

    </svg>
  );
}

// ─── ЗАПАДНЫЕ ЗНАКИ ЗОДИАКА (12 знаков) ───
export const WesternZodiacIcons = {
  'Овен': () => (    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 12 25 Q 10 15 15 10 Q 20 5 25 10 Q 30 15 28 25" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 15 25 Q 20 30 25 25" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <path d="M 20 15 Q 25 20 20 25" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5" strokeDasharray="2 2"/>
    </svg>
  ),
  'Телец': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 10 15 L 15 20 M 30 15 L 25 20" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 15 20 Q 20 25 25 20" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <circle cx="17" cy="22" r="1.5" fill="var(--blue)"/>
      <circle cx="23" cy="22" r="1.5" fill="var(--blue)"/>
      <circle cx="20" cy="20" r="14" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5"/>
    </svg>
  ),
  'Близнецы': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <line x1="12" y1="10" x2="12" y2="30" stroke="var(--blue)" strokeWidth="1.5"/>
      <line x1="28" y1="10" x2="28" y2="30" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 12 20 Q 20 25 28 20" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
      <circle cx="12" cy="12" r="2" fill="var(--blue)"/>
      <circle cx="28" cy="12" r="2" fill="var(--blue)"/>
    </svg>
  ),
  'Рак': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 8 15 L 12 20 L 8 25" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 32 15 L 28 20 L 32 25" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 12 20 Q 20 30 28 20" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <path d="M 20 25 Q 25 20 20 15" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
    </svg>
  ),
  'Лев': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 20 10 Q 10 15 10 25 Q 15 30 20 30 Q 25 30 30 25 Q 30 15 20 10" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <circle cx="20" cy="22" r="6" fill="none" stroke="var(--gold)" strokeWidth="1"/>
      <circle cx="17" cy="20" r="1" fill="var(--gold)"/>
      <circle cx="23" cy="20" r="1" fill="var(--gold)"/>
      <path d="M 18 25 Q 20 27 22 25" fill="none" stroke="var(--gold)" strokeWidth="0.8"/>
    </svg>
  ),
  'Дева': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <line x1="15" y1="10" x2="15" y2="30" stroke="var(--blue)" strokeWidth="1.5"/>
      <line x1="25" y1="10" x2="25" y2="30" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 15 15 L 20 15 M 25 15 L 20 15" stroke="var(--gold)" strokeWidth="0.8"/>
      <path d="M 20 15 L 20 5 M 18 10 L 20 12 L 22 10" stroke="var(--gold)" strokeWidth="0.8"/>
    </svg>
  ),  'Весы': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 15 30 L 25 30 L 20 10 Z" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <line x1="8" y1="15" x2="32" y2="15" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 8 15 Q 5 25 12 25 M 32 15 Q 35 25 28 25" fill="none" stroke="var(--gold)" strokeWidth="1"/>
    </svg>
  ),
  'Скорпион': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 10 20 Q 20 10 30 20 Q 35 25 30 30" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 30 30 L 25 25 L 30 20" fill="none" stroke="var(--gold)" strokeWidth="1"/>
      <path d="M 10 20 L 5 15 L 10 10" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
    </svg>
  ),
  'Стрелец': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 10 30 Q 15 20 30 10" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="30" x2="30" y2="10" stroke="var(--gold)" strokeWidth="1"/>
      <path d="M 12 28 L 10 30 L 8 28" stroke="var(--gold)" strokeWidth="0.8"/>
      <path d="M 30 10 L 32 5 L 28 8 L 35 8 L 31 5 Z" fill="var(--gold)" opacity="0.5"/>
    </svg>
  ),
  'Козерог': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 15 15 Q 20 10 25 15 Q 30 20 25 25 Q 20 30 15 25 Q 10 20 15 15" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <path d="M 15 15 L 10 5 M 25 15 L 30 5" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M 15 25 Q 20 35 25 25" fill="none" stroke="var(--gold)" strokeWidth="1"/>
      <path d="M 5 30 L 20 15 L 35 30" fill="none" stroke="rgba(0,112,192,0.2)" strokeWidth="0.5"/>
    </svg>
  ),
  'Водолей': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 5 15 Q 10 10 15 15 T 25 15 T 35 15" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 5 25 Q 10 20 15 25 T 25 25 T 35 25" fill="none" stroke="var(--blue)" strokeWidth="1.5"/>
      <path d="M 25 10 Q 30 15 25 20 Q 20 25 25 30" fill="none" stroke="var(--gold)" strokeWidth="1"/>
    </svg>
  ),
  'Рыбы': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <path d="M 5 20 Q 10 10 20 20 Q 10 30 5 20" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <path d="M 35 20 Q 30 10 20 20 Q 30 30 35 20" fill="none" stroke="var(--blue)" strokeWidth="1.2"/>
      <line x1="20" y1="10" x2="20" y2="30" stroke="var(--gold)" strokeWidth="0.8"/>
    </svg>
  )
};

// ─── ВОСТОЧНЫЕ ЗНАКИ (12 животных) ───
export const EasternZodiacIcons = {
  'Крыса': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">      <circle cx="20" cy="22" r="8" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
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
  'Дракон': () => (
    <svg viewBox="0 0 40 40" width="32" height="32">
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
      <path d="M 20 20 L 20 22" stroke="var(--gold)" strokeWidth="1"/>    </svg>
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
      <ellipse cx="20" cy="20" rx="3" ry="2" fill="var(--gold)" opacity="0.3"/>      <circle cx="17" cy="23" r="1.5" fill="var(--gold)"/>
      <circle cx="23" cy="23" r="1.5" fill="var(--gold)"/>
      <path d="M 14 18 L 12 14 M 26 18 L 28 14" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
};

export default { MaleAvatar, FemaleAvatar, WesternZodiacIcons, EasternZodiacIcons };
