// src/components/BlueprintAvatars.jsx
import React from 'react';

// Точный маппинг русских названий на английские имена файлов в public/assets/avatars-icons/
const ZODIAC_MAP = {
  'Овен': 'zodiac-aries.png',
  'Телец': 'zodiac-taurus.png',
  'Близнецы': 'zodiac-gemini.png',
  'Рак': 'zodiac-cancer.png',
  'Лев': 'zodiac-leo.png',
  'Дева': 'zodiac-virgo.png',
  'Весы': 'zodiac-libra.png',
  'Скорпион': 'zodiac-scorpio.png',
  'Стрелец': 'zodiac-sagittarius.png',
  'Козерог': 'zodiac-capricorn.png',
  'Водолей': 'zodiac-aquarius.png',
  'Рыбы': 'zodiac-pisces.png',
};

const EASTERN_MAP = {
  'Крыса': 'eastern-rat.png',
  'Бык': 'eastern-ox.png',
  'Тигр': 'eastern-tiger.png',
  'Кролик': 'eastern-rabbit.png',
  'Дракон': 'eastern-dragon.png',
  'Змея': 'eastern-snake.png',
  'Лошадь': 'eastern-horse.png',
  'Коза': 'eastern-goat.png',
  'Обезьяна': 'eastern-monkey.png',
  'Петух': 'eastern-rooster.png',
  'Собака': 'eastern-dog.png',
  'Свинья': 'eastern-pig.png',
};

// ─── АВАТАРЫ ───
export function MaleAvatar({ size = 80 }) {
  return (
    <img
      src="/assets/avatars-icons/male-avatar.png"
      alt="Male Avatar"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        display: 'block',
        filter: "drop-shadow(0 2px 4px rgba(0,112,192,0.2))"
      }}
    />
  );
}
export function FemaleAvatar({ size = 80 }) {
  return (
    <img
      src="/assets/avatars-icons/female-avatar.png"
      alt="Female Avatar"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        display: 'block',
        filter: "drop-shadow(0 2px 4px rgba(200,164,90,0.2))"
      }}
    />
  );
}

// ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ПУТЕЙ К ИЛЛЮСТРАЦИЯМ ───
export const getWesternZodiacSrc = (sign) => {
  if (!sign) return null;
  const key = sign.trim();
  return ZODIAC_MAP[key] ? `/assets/avatars-icons/${ZODIAC_MAP[key]}` : null;
};

export const getEasternZodiacSrc = (sign) => {
  if (!sign) return null;
  const key = sign.trim();
  return EASTERN_MAP[key] ? `/assets/avatars-icons/${EASTERN_MAP[key]}` : null;
};

// ─── ИКОНКИ ДЛЯ СПИСКОВ (если нужны мелкими) ───
export const WesternZodiacIcons = {
  'Овен': () => <img src="/assets/avatars-icons/zodiac-aries.png" alt="Овен" width="32" height="32" />,
  'Телец': () => <img src="/assets/avatars-icons/zodiac-taurus.png" alt="Телец" width="32" height="32" />,
  'Близнецы': () => <img src="/assets/avatars-icons/zodiac-gemini.png" alt="Близнецы" width="32" height="32" />,
  'Рак': () => <img src="/assets/avatars-icons/zodiac-cancer.png" alt="Рак" width="32" height="32" />,
  'Лев': () => <img src="/assets/avatars-icons/zodiac-leo.png" alt="Лев" width="32" height="32" />,
  'Дева': () => <img src="/assets/avatars-icons/zodiac-virgo.png" alt="Дева" width="32" height="32" />,
  'Весы': () => <img src="/assets/avatars-icons/zodiac-libra.png" alt="Весы" width="32" height="32" />,
  'Скорпион': () => <img src="/assets/avatars-icons/zodiac-scorpio.png" alt="Скорпион" width="32" height="32" />,
  'Стрелец': () => <img src="/assets/avatars-icons/zodiac-sagittarius.png" alt="Стрелец" width="32" height="32" />,
  'Козерог': () => <img src="/assets/avatars-icons/zodiac-capricorn.png" alt="Козерог" width="32" height="32" />,
  'Водолей': () => <img src="/assets/avatars-icons/zodiac-aquarius.png" alt="Водолей" width="32" height="32" />,
  'Рыбы': () => <img src="/assets/avatars-icons/zodiac-pisces.png" alt="Рыбы" width="32" height="32" />,
};

export const EasternZodiacIcons = {
  'Крыса': () => <img src="/assets/avatars-icons/eastern-rat.png" alt="Крыса" width="32" height="32" />,
  'Бык': () => <img src="/assets/avatars-icons/eastern-ox.png" alt="Бык" width="32" height="32" />,
  'Тигр': () => <img src="/assets/avatars-icons/eastern-tiger.png" alt="Тигр" width="32" height="32" />,  'Кролик': () => <img src="/assets/avatars-icons/eastern-rabbit.png" alt="Кролик" width="32" height="32" />,
  'Дракон': () => <img src="/assets/avatars-icons/eastern-dragon.png" alt="Дракон" width="32" height="32" />,
  'Змея': () => <img src="/assets/avatars-icons/eastern-snake.png" alt="Змея" width="32" height="32" />,
  'Лошадь': () => <img src="/assets/avatars-icons/eastern-horse.png" alt="Лошадь" width="32" height="32" />,
  'Коза': () => <img src="/assets/avatars-icons/eastern-goat.png" alt="Коза" width="32" height="32" />,
  'Обезьяна': () => <img src="/assets/avatars-icons/eastern-monkey.png" alt="Обезьяна" width="32" height="32" />,
  'Петух': () => <img src="/assets/avatars-icons/eastern-rooster.png" alt="Петух" width="32" height="32" />,
  'Собака': () => <img src="/assets/avatars-icons/eastern-dog.png" alt="Собака" width="32" height="32" />,
  'Свинья': () => <img src="/assets/avatars-icons/eastern-pig.png" alt="Свинья" width="32" height="32" />,
};

export default { MaleAvatar, FemaleAvatar, WesternZodiacIcons, EasternZodiacIcons, getWesternZodiacSrc, getEasternZodiacSrc };
