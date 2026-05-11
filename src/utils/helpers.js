// src/utils/helpers.js

/**
 * Рассчитывает фазу луны для заданной даты
 * ✅ ИСПРАВЛЕНО: year и month были const, но изменялись — TypeError
 */
export function getMoon(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);

  // ✅ let вместо const — значения меняются в алгоритме
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  const day = d.getDate();

  let c, e, jd, b;

  if (month < 3) {
    year--;
    month += 12;
  }

  ++month;
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = parseInt(jd);
  jd -= b;
  b = Math.round(jd * 8);

  if (b >= 8) b = 0;

  const phases = [
    { n: 'Новолуние',        e: '🌑', t: 'новолуние',  p: 0    },
    { n: 'Молодая',          e: '🌒', t: 'растущая',   p: 12.5 },
    { n: 'Первая четверть',  e: '🌓', t: 'растущая',   p: 25   },
    { n: 'Растущая',         e: '🌔', t: 'растущая',   p: 37.5 },
    { n: 'Полнолуние',       e: '🌕', t: 'полнолуние', p: 50   },
    { n: 'Убывающая',        e: '🌖', t: 'убывающая',  p: 62.5 },
    { n: 'Последняя четверть',e: '🌗', t: 'убывающая', p: 75   },
    { n: 'Старая',           e: '🌘', t: 'убывающая',  p: 87.5 },
  ];
  return phases[b] || phases[0];
}

/**
 * Форматирует дату в строку "ДД.ММ"
 */
export function formatDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/**
 * Возвращает название дня недели (короткое)
 */
export function getDayName(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[d.getDay()];
}

/**
 * Проверяет, является ли дата "сегодня"
 */
export function isToday(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  return d.toDateString() === new Date().toDateString();
}

/**
 * Добавляет дни к дате
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Заглушки для совместимости (реальные реализации в ProfileSection и Onboarding)
export function getZodiac(date) { return { sign: '—', element: '—' }; }
export function getEastern(date) { return { animal: '—', element: '—' }; }
export function calcDegree(date) { return 0; }

export default { getMoon, formatDate, getDayName, isToday, addDays, getZodiac, getEastern, calcDegree };
