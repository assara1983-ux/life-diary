// src/utils/googleCalendar.js
// Формирует ссылку быстрого добавления события в Google Calendar.
// Не требует OAuth/входа в аккаунт — просто открывает Google Calendar
// с уже заполненной формой, остаётся нажать «Сохранить».

function pad(n) { return String(n).padStart(2, '0'); }

function toGCalDate(d) {
  return d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) + 'T' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    '00';
}

/**
 * @param {string} title - название события
 * @param {string} dateStr - дата в формате 'YYYY-MM-DD' или ISO datetime
 * @param {string} [time] - время 'HH:MM', если dateStr — просто дата
 * @param {string} [details] - описание/заметка
 * @param {number} [durationMinutes] - длительность события, по умолчанию 60 мин
 */
export function googleCalendarUrl(title, dateStr, time = '', details = '', durationMinutes = 60) {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const timePart = time || (dateStr.includes('T') ? dateStr.split('T')[1]?.slice(0, 5) : '') || '09:00';
  const start = new Date(`${datePart}T${timePart}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Задача',
    dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    details: details || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openGoogleCalendar(title, dateStr, time = '', details = '', durationMinutes = 60) {
  const url = googleCalendarUrl(title, dateStr, time, details, durationMinutes);
  if (url) window.open(url, '_blank');
}
