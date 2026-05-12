// src/core/knowledgeEngine.js
// Мозг приложения: связывает профиль с базой знаний

import { getMoon } from '../utils/helpers';

// === БАЗА ДАННЫХ РИСКОВ ПО МЕСЯЦАМ (Давыдов) ===
const MONTHLY_RISKS = {
  'Овен': { 5: { organs: 'Сердце, сосуды', advice: 'Избегайте стрессов, показана терапия лёгких' }, 11: { organs: 'Грудная клетка', advice: 'Профилактика дыхательной системы' } },
  'Телец': { 4: { organs: 'Печень, горло', advice: 'Терапия для плеч и рук' }, 10: { organs: 'Сердце, сосуды', advice: 'Контроль АД, диета' } },
  'Близнецы': { 3: { organs: 'Лёгкие, горло', advice: 'Показана терапия органов дыхания' }, 9: { organs: 'ЖКТ', advice: 'Следите за кислотностью' } },
  // ... можно заполнить все 12 знаков из файла monthly-health-by-sign.md
};

// === КОГНИТИВНЫЕ ОКНА (Болотова) ===
const COGNITIVE_WINDOWS = {
  '🌅 Жаворонок': { start: '09:00', end: '12:00', type: 'deep_work' },
  '🕊️ Голубь': { start: '10:00', end: '16:00', type: 'moderate_work' },
  '🦉 Сова': { start: '14:00', end: '20:00', type: 'deep_work' },
};

// === ДЫХАТЕЛЬНЫЕ ПРАКТИКИ ПО СОСТОЯНИЮ (Хван) ===
const BREATHING_TECHNIQUES = {
  stress: { name: 'Дыхание Сам Чон До', duration: '5 мин', steps: ['Вдох 3с', 'Выдох 6с', 'Пауза 2с'] },
  fatigue: { name: 'Рыдающее дыхание', duration: '3 мин', steps: ['Вдох через рот', 'Выдох "с-с-с"', 'Пауза 2-3с'] },
  focus: { name: 'Нади-шодхана', duration: '7 мин', steps: ['Вдох левая', 'Выдох правая', 'Чередование'] },
};

/**
 * Получить персонализированные рекомендации для секции
 */
export function getSectionRecommendations(profile, sectionId) {
  if (!profile?.dob) return [];
  
  const recommendations = [];
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const zodiac = getZodiacByDOB(profile.dob);
  const moon = getMoon(today);
  
  // 1. Здоровье: риски по месяцу
  if (sectionId === 'health' && MONTHLY_RISKS[zodiac]?.[currentMonth]) {
    const risk = MONTHLY_RISKS[zodiac][currentMonth];
    recommendations.push({
      type: 'warning',
      icon: '⚠️',
      title: `Внимание: ${risk.organs}`,
      text: risk.advice,
      source: 'Давыдов М.А. «Восточный Зодиак»'
    });
  }  
  // 2. Планирование: когнитивное окно
  if (sectionId === 'schedule' && profile.chronotype) {
    const window = COGNITIVE_WINDOWS[profile.chronotype];
    if (window) {
      recommendations.push({
        type: 'tip',
        icon: '🧠',
        title: 'Окно продуктивности',
        text: `Сложные задачи: ${window.start}–${window.end}. Тип: ${window.type === 'deep_work' ? 'глубокая работа' : 'умеренная'}`,
        source: 'Болотова А.К. «Психология организации времени»'
      });
    }
  }
  
  // 3. Ментальное: дыхание под состояние
  if (sectionId === 'mental') {
    const stressLevel = profile.stressLevel || 5;
    const technique = stressLevel > 7 ? BREATHING_TECHNIQUES.stress : 
                      stressLevel < 4 ? BREATHING_TECHNIQUES.focus : 
                      BREATHING_TECHNIQUES.fatigue;
    recommendations.push({
      type: 'practice',
      icon: '🌬️',
      title: `Техника: ${technique.name}`,
      text: `Длительность: ${technique.duration}. Шаги: ${technique.steps.join(' → ')}`,
      source: 'Хван Ю.Е. «Дыхание — чудо-лекарство»'
    });
  }
  
  // 4. Уход: лунный календарь
  if (sectionId === 'beauty') {
    const moonDay = getMoonDay(today);
    const forbidden = getForbiddenBodyParts(moonDay);
    if (forbidden.length > 0) {
      recommendations.push({
        type: 'warning',
        icon: '🌙',
        title: `Лунный день ${moonDay}: избегайте`,
        text: `Не воздействовать на: ${forbidden.join(', ')}`,
        source: 'Давыдов М.А. «Лунный календарь»'
      });
    }
  }
  
  return recommendations;
}

/**
 * Получить слабые органы по профилю (Body Blueprint) */
export function getBodyWeaknesses(profile) {
  if (!profile?.dob) return [];
  const zodiac = getZodiacByDOB(profile.dob);
  const year = new Date(profile.dob).getFullYear();
  
  // Из файла medical-astro.md
  const weaknesses = {
    'Овен': 'Голова, лицо, шея',
    'Телец': 'Горло, щитовидка, шейные позвонки',
    'Близнецы': 'Лопатки, плечи, лёгкие, трахея',
    'Рак': 'Грудина, желудок, поджелудочная, печень',
    'Лев': 'Позвоночник, сердце, сосуды',
    'Дева': 'Пупок, кишечник, печень, аппендикс',
    'Весы': 'Поясница, мочевой пузырь, мочеполовая',
    'Скорпион': 'Нос, половые органы, прямая кишка',
    'Стрелец': 'Бёдра, крестец, ягодицы, печень',
    'Козерог': 'Колени, зубы, кости, суставы, селезёнка',
    'Водолей': 'Голени, лодыжки, нервная система',
    'Рыбы': 'Стопы, лимфа, иммунитет, нервная система',
  };
  
  return [{ area: weaknesses[zodiac] || 'Не определено', zodiac, year }];
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function getZodiacByDOB(dob) {
  const d = new Date(dob);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 3 && day >= 21) || (m === 4 && day <= 20)) return 'Овен';
  if ((m === 4 && day >= 21) || (m === 5 && day <= 20)) return 'Телец';
  if ((m === 5 && day >= 21) || (m === 6 && day <= 21)) return 'Близнецы';
  if ((m === 6 && day >= 22) || (m === 7 && day <= 22)) return 'Рак';
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Лев';
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Дева';
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Весы';
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Скорпион';
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'Стрелец';
  if ((m === 12 && day >= 22) || (m === 1 && day <= 20)) return 'Козерог';
  if ((m === 1 && day >= 21) || (m === 2 && day <= 19)) return 'Водолей';
  return 'Рыбы';
}

function getMoonDay(date) {
  // Упрощённый расчёт лунного дня
  const knownNewMoon = new Date('2024-01-11');
  const diff = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const cycle = 29.53;
  const day = Math.floor((diff % cycle)) + 1;  return day > 30 ? 30 : day;
}

function getForbiddenBodyParts(moonDay) {
  // Из файла lunar-calendar.md
  const map = {
    1: ['Мизинец руки', 'Большой палец ноги', 'Кончик носа'],
    11: ['Грудной отдел позвоночника'],
    21: ['Уши', 'Висок'],
    // ... можно заполнить все 30 дней
  };
  return map[moonDay] || [];
}
