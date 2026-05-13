// src/utils/knowledgeEngine.js
// Мозг приложения: связывает Онбординг с Базой Знаний

// --- ДАННЫЕ ИЗ БАЗЫ ЗНАНИЙ (Сжатые версии для примера) ---

// 1. Здоровье по знакам Зодиака (Источник: zodiac-body-projections-luna.md)
export const HEALTH_BY_ZODIAC = {
  'Овен': { area: 'Голова, лицо, шея', organs: 'Мозг, надпочечники, глаза', advice: 'Избегай стрессов, береги зрение. Полезны дыхательные практики.' },
  'Телец': { area: 'Горло, щитовидка, шея', organs: 'Голосовые связки, лимфоузлы', advice: 'Береги горло, следи за голосом. Избегай сквозняков.' },
  'Близнецы': { area: 'Плечи, ключицы, легкие', organs: 'Нервная система, руки', advice: 'Дыши свежим воздухом. Береги плечи и руки.' },
  'Рак': { area: 'Грудь, печень, ЖКТ', organs: 'Пищеварение, молочные железы', advice: 'Следи за питанием. Избегай переедания на ночь.' },
  'Лев': { area: 'Сердце, спина', organs: 'Сосудистая система, позвоночник', advice: 'Укрепляй спину. Избегай резких физических нагрузок на сердце.' },
  'Дева': { area: 'Кишечник, пупок', organs: 'ЖКТ, нервная система', advice: 'Следи за микрофлорой. Избегай стрессов (бьют по животу).' },
  'Весы': { area: 'Поясница, почки', organs: 'Мочеполовая система', advice: 'Пей больше воды. Береги поясницу.' },
  'Скорпион': { area: 'Половые органы, нос', organs: 'Репродуктивная система', advice: 'Следи за детоксом организма. Избегай инфекций.' },
  'Стрелец': { area: 'Бедра, таз', organs: 'Кровеносная система', advice: 'Укрепляй мышцы ног. Береги от травм.' },
  'Козерог': { area: 'Колени, кости', organs: 'Суставы, зубы', advice: 'Укрепляй кости (кальций). Береги колени.' },
  'Водолей': { area: 'Голени, лодыжки', organs: 'Нервная система, вены', advice: 'Береги вены. Избегай отеков.' },
  'Рыбы': { area: 'Стопы, лимфа', organs: 'Иммунитет, эндокринная система', advice: 'Делай ванночки для ног. Следи за иммунитетом.' }
};

// 2. Лунные запреты для красоты (Источник: lunar-calendar.md)
export const BEAUTY_RESTRICTIONS = {
  1: { forbidden: 'Мизинец руки, большой палец ноги, кончик носа', icon: '👃' },
  2: { forbidden: 'Наружная лодыжка', icon: '🦶' },
  3: { forbidden: 'Внутренняя часть бедра, печень, дёсна', icon: '🦷' },
  4: { forbidden: 'Поясница, врата желудка', icon: '🥘' },
  5: { forbidden: 'Ротовая полость', icon: '👄' },
  6: { forbidden: 'Ладони, запястья', icon: '✋' },
  7: { forbidden: 'Внутренняя лодыжка, колени', icon: '🦵' },
  8: { forbidden: 'Запястья, половые органы', icon: '⛔' },
  9: { forbidden: 'Копчик, крестец', icon: '🦴' },
  10: { forbidden: 'Лопатки, лодыжки', icon: '' },
  11: { forbidden: 'Грудной отдел позвоночника', icon: '🧍' },
  12: { forbidden: 'Сердце (перикард)', icon: '❤️' },
  13: { forbidden: 'Поджелудочная железа', icon: '🥪' },
  14: { forbidden: 'Тонкий кишечник', icon: '🌀' },
  15: { forbidden: 'Поджелудочная, диафрагма', icon: '🫁' },
  16: { forbidden: 'Селезёнка', icon: '🟤' },
  17: { forbidden: 'Почки, надпочечники', icon: '🫘' },
  18: { forbidden: 'Кожные покровы тела', icon: '🧴' },
  19: { forbidden: 'Аппендикс, толстая кишка', icon: '🧻' },
  20: { forbidden: 'Верхняя часть спины, лопатки', icon: '🦴' },
  21: { forbidden: 'Печень, желчный пузырь', icon: '🟢' },
  22: { forbidden: 'Тазобедренный сустав', icon: '🦵' },
  23: { forbidden: 'Яичники, яички', icon: '🚺' },
  24: { forbidden: 'Наружные половые органы', icon: '🚹' },
  25: { forbidden: 'Уши, висок', icon: '👂' },
  26: { forbidden: 'Бёдра, кожа, колени', icon: '🦵' },
  27: { forbidden: 'Голени, подъём стопы', icon: '🦶' },  28: { forbidden: 'Глаза, голова, мозг', icon: '🧠' },
  29: { forbidden: 'Прямая кишка, пальцы ног', icon: '🦶' },
  30: { forbidden: 'Сердце, голова', icon: '🧠' }
};

// --- ФУНКЦИИ РАСЧЕТА ---

// Расчет Градуса Судьбы (Нумерология)
export function calculateDestinyDegree(fullName) {
  if (!fullName) return { degree: 0, text: 'Не рассчитан' };
  const ru = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
  let sum = 0;
  for (const char of fullName.toLowerCase()) {
    if (ru.includes(char)) sum += ru.indexOf(char) + 1;
  }
  const degree = sum % 360 || 360;
  
  // Интерпретация по базе знаний
  let interpretation = "Универсальный потенциал.";
  if (degree > 0 && degree <= 60) interpretation = "Начало пути. Сила нового. Активность.";
  if (degree > 60 && degree <= 120) interpretation = "Стабилизация. Творчество и развитие.";
  if (degree > 120 && degree <= 180) interpretation = "Переход. Переосмысление ценностей.";
  if (degree > 180 && degree <= 240) interpretation = "Внутренняя работа. Духовный рост.";
  if (degree > 240 && degree <= 300) interpretation = "Результаты. Жатва и завершение.";
  if (degree > 300 && degree <= 360) interpretation = "Мудрость. Подготовка к новому циклу.";
  
  return { degree, interpretation };
}

// Расчет Лунного дня
export function getMoonDay(date = new Date()) {
  // Упрощенный алгоритм (для продакшена нужна точная эфемеридная формула)
  const knownNewMoon = new Date(2024, 0, 11); // Известное новолуние
  const diff = date - knownNewMoon;
  const synodicMonth = 29.53;
  const moonCyclePos = (diff / 1000 / 60 / 60 / 24) % synodicMonth;
  return Math.floor(moonCyclePos) + 1;
}

// Определение знака Зодиака
export function getZodiacSign(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  
  if ((m === 3 && day >= 21) || (m === 4 && day <= 20)) return 'Овен';
  if ((m === 4 && day >= 21) || (m === 5 && day <= 20)) return 'Телец';
  if ((m === 5 && day >= 21) || (m === 6 && day <= 21)) return 'Близнецы';
  if ((m === 6 && day >= 22) || (m === 7 && day <= 22)) return 'Рак';  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Лев';
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Дева';
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Весы';
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Скорпион';
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'Стрелец';
  if ((m === 12 && day >= 22) || (m === 1 && day <= 20)) return 'Козерог';
  if ((m === 1 && day >= 21) || (m === 2 && day <= 19)) return 'Водолей';
  return 'Рыбы';
}

// --- ГЛАВНЫЙ ЭКСПОРТ (ИНСАЙТЫ) ---
export function getProfileInsights(profile) {
  const zodiac = getZodiacSign(profile.dob);
  const health = HEALTH_BY_ZODIAC[zodiac] || HEALTH_BY_ZODIAC['Овен'];
  
  const moonDay = getMoonDay();
  const moonRestriction = BEAUTY_RESTRICTIONS[moonDay] || { forbidden: 'Нет данных', icon: '❓' };
  
  const destiny = calculateDestinyDegree(profile.fullName);
  
  return {
    zodiac,
    health,
    moonDay,
    moonRestriction,
    destiny,
    chronotype: profile.chronotype || '🕊️ Голубь (Стандартный)',
    tcmType: profile.tcmType || 'Вода (Стандартный)'
  };
}
