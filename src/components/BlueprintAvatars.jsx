// src/components/BlueprintAvatars.jsx
import React from 'react';

// ─── МУЖСКОЙ АВАТАР (PNG изображение) ───
export function MaleAvatar({ size = 120 }) {
  return (
    <img 
      src="/assets/avatars-icons/male-avatar.png" 
      alt="Male Avatar"
      width={size}
      height={size}
      style={{ 
        objectFit: 'contain',
        filter: "drop-shadow(0 4px 8px rgba(0,112,192,0.2))"
      }}
    />
  );
}

// ─── ЖЕНСКИЙ АВАТАР (PNG изображение) ───
export function FemaleAvatar({ size = 120 }) {
  return (
    <img 
      src="/assets/avatars-icons/female-avatar.png" 
      alt="Female Avatar"
      width={size}
      height={size}
      style={{ 
        objectFit: 'contain',
        filter: "drop-shadow(0 4px 8px rgba(200,164,90,0.2))"
      }}
    />
  );
}

// ─── ЗАПАДНЫЕ ЗНАКИ ЗОДИАКА (PNG изображения) ───
export const WesternZodiacIcons = {
  'Овен': () => <img src="/assets/avatars-icons/zodiac-aries.png" alt="Овен" width="48" height="48" />,
  'Телец': () => <img src="/assets/avatars-icons/zodiac-taurus.png" alt="Телец" width="48" height="48" />,
  'Близнецы': () => <img src="/assets/avatars-icons/zodiac-gemini.png" alt="Близнецы" width="48" height="48" />,
  'Рак': () => <img src="/assets/avatars-icons/zodiac-cancer.png" alt="Рак" width="48" height="48" />,
  'Лев': () => <img src="/assets/avatars-icons/zodiac-leo.png" alt="Лев" width="48" height="48" />,
  'Дева': () => <img src="/assets/avatars-icons/zodiac-virgo.png" alt="Дева" width="48" height="48" />,
  'Весы': () => <img src="/assets/avatars-icons/zodiac-libra.png" alt="Весы" width="48" height="48" />,
  'Скорпион': () => <img src="/assets/avatars-icons/zodiac-scorpio.png" alt="Скорпион" width="48" height="48" />,
  'Стрелец': () => <img src="/assets/avatars-icons/zodiac-sagittarius.png" alt="Стрелец" width="48" height="48" />,
  'Козерог': () => <img src="/assets/avatars-icons/zodiac-capricorn.png" alt="Козерог" width="48" height="48" />,
  'Водолей': () => <img src="/assets/avatars-icons/zodiac-aquarius.png" alt="Водолей" width="48" height="48" />,
  'Рыбы': () => <img src="/assets/avatars-icons/zodiac-pisces.png" alt="Рыбы" width="48" height="48" />,
};

// ─── ВОСТОЧНЫЕ ЗНАКИ (PNG изображения) ───
export const EasternZodiacIcons = {
  'Крыса': () => <img src="/assets/avatars-icons/eastern-rat.png" alt="Крыса" width="48" height="48" />,
  'Бык': () => <img src="/assets/avatars-icons/eastern-ox.png" alt="Бык" width="48" height="48" />,
  'Тигр': () => <img src="/assets/avatars-icons/eastern-tiger.png" alt="Тигр" width="48" height="48" />,
  'Кролик': () => <img src="/assets/avatars-icons/eastern-rabbit.png" alt="Кролик" width="48" height="48" />,
  'Дракон': () => <img src="/assets/avatars-icons/eastern-dragon.png" alt="Дракон" width="48" height="48" />,
  'Змея': () => <img src="/assets/avatars-icons/eastern-snake.png" alt="Змея" width="48" height="48" />,
  'Лошадь': () => <img src="/assets/avatars-icons/eastern-horse.png" alt="Лошадь" width="48" height="48" />,
  'Коза': () => <img src="/assets/avatars-icons/eastern-goat.png" alt="Коза" width="48" height="48" />,
  'Обезьяна': () => <img src="/assets/avatars-icons/eastern-monkey.png" alt="Обезьяна" width="48" height="48" />,
  'Петух': () => <img src="/assets/avatars-icons/eastern-rooster.png" alt="Петух" width="48" height="48" />,
  'Собака': () => <img src="/assets/avatars-icons/eastern-dog.png" alt="Собака" width="48" height="48" />,
  'Свинья': () => <img src="/assets/avatars-icons/eastern-pig.png" alt="Свинья" width="48" height="48" />,
};

export default { MaleAvatar, FemaleAvatar, WesternZodiacIcons, EasternZodiacIcons };
