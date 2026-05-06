// src/utils/helpers.js

/**
 * Рассчитывает фазу луны для заданной даты
 * @param {Date|string} date - Дата (по умолчанию сегодня)
 * @returns {{ n: string, t: string, p: number }} Объект с данными о луне
 *   n: название фазы (на русском)
 *   t: тип фазы (растущая/убывающая/полнолуние/новолуние)
 *   p: процент освещённости (0-100)
 */
export function getMoon(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  
  // Алгоритм расчёта фазы луны (упрощённый, но достаточно точный для визуализации)
  // Источник: https://en.wikipedia.org/wiki/Lunar_phase#Calculation
  
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  let c, e, jd, b;
  
  if (month < 3) {
    year--;
    month += 12;
  }
  
  ++month;
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09; // Юлианская дата
  jd /= 29.5305882; // Синодический месяц
  b = parseInt(jd);
  jd -= b;
  b = Math.round(jd * 8);
  
  if (b >= 8) b = 0;
  
  // Маппинг фаз луны (8 основных фаз)
  const phases = [
    { n: 'Новолуние', t: 'новолуние', p: 0 },
    { n: 'Молодая', t: 'растущая', p: 12.5 },
    { n: 'Первая четверть', t: 'растущая', p: 25 },
    { n: 'Растущая', t: 'растущая', p: 37.5 },
    { n: 'Полнолуние', t: 'полнолуние', p: 50 },
    { n: 'Убывающая', t: 'убывающая', p: 62.5 },
    { n: 'Последняя четверть', t: 'убывающая', p: 75 },
    { n: 'Старая', t: 'убывающая', p: 87.5 }
  ];
    return phases[b] || phases[0];
}

/**
 * Форматирует дату в строку "ДД.ММ"
 * @param {Date|string} date 
 * @returns {string}
 */
export function formatDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/**
 * Возвращает название дня недели (короткое)
 * @param {Date|string} date 
 * @returns {string}
 */
export function getDayName(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[d.getDay()];
}

/**
 * Проверяет, является ли дата "сегодня"
 * @param {Date|string} date 
 * @returns {boolean}
 */
export function isToday(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Добавляет дни к дате
 * @param {Date} date 
 * @param {number} days 
 * @returns {Date}
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ✅ Заглушки для совместимости (чтобы приложение не падало)
export function getZodiac(date) { return { sign: '—', element: '—' }; }export function getEastern(date) { return { animal: '—', element: '—' }; }
export function calcDegree(date) { return 0; }

export default { getMoon, formatDate, getDayName, isToday, addDays, getZodiac, getEastern, calcDegree };
