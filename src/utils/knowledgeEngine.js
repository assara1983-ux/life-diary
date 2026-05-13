// src/utils/knowledgeEngine.js
// 🧠 МОЗГ ПРИЛОЖЕНИЯ: связывает данные Онбординга с Базой Знаний (Болотова, Давыдов, Рао, Хван, Азнауров и др.)
// Экспортирует функции, используемые в ProfileSection.jsx, HealthSection.jsx, TodaySection.jsx

// ─── 1. БАЗЫ ДАННЫХ (извлечены из Markdown-файлов) ──────────────────────────────

const ZODIAC_MAP = [
  { sign: 'Козерог', start: [12, 22], end: [1, 20], element: 'Земля', planet: 'Сатурн', strength: 'Дисциплина, терпение, стратегия', weakness: 'Суставы, зубы, колени, селезёнка', growth: 'Гибкость, делегирование' },
  { sign: 'Водолей', start: [1, 21], end: [2, 19], element: 'Воздух', planet: 'Уран/Сатурн', strength: 'Инновации, гуманизм, свобода', weakness: 'Голени, лодыжки, нервная система', growth: 'Эмоциональная стабильность, заземление' },
  { sign: 'Рыбы', start: [2, 20], end: [3, 20], element: 'Вода', planet: 'Нептун/Юпитер', strength: 'Интуиция, эмпатия, творчество', weakness: 'Стопы, лимфа, иммунитет, психосоматика', growth: 'Границы, структурирование, детокс' },
  { sign: 'Овен', start: [3, 21], end: [4, 20], element: 'Огонь', planet: 'Марс', strength: 'Лидерство, инициатива, решительность', weakness: 'Голова, лицо, глаза, надпочечники', growth: 'Терпение, тактика, самоконтроль' },
  { sign: 'Телец', start: [4, 21], end: [5, 21], element: 'Земля', planet: 'Венера', strength: 'Надёжность, чувственность, упорство', weakness: 'Горло, щитовидка, шея, челюсть', growth: 'Адаптивность, отпускание контроля' },
  { sign: 'Близнецы', start: [5, 22], end: [6, 21], element: 'Воздух', planet: 'Меркурий', strength: 'Коммуникация, адаптивность, интеллект', weakness: 'Лёгкие, бронхи, плечи, нервная система', growth: 'Фокус, глубина, завершение дел' },
  { sign: 'Рак', start: [6, 22], end: [7, 23], element: 'Вода', planet: 'Луна', strength: 'Забота, интуиция, память, эмпатия', weakness: 'Грудь, желудок, печень, эмоциональная нестабильность', growth: 'Автономия, выход из созависимости' },
  { sign: 'Лев', start: [7, 24], end: [8, 23], element: 'Огонь', planet: 'Солнце', strength: 'Харизма, творчество, великодушие', weakness: 'Сердце, позвоночник, спина, сосуды', growth: 'Скромность, командная игра, отдых' },
  { sign: 'Дева', start: [8, 24], end: [9, 23], element: 'Земля', planet: 'Меркурий', strength: 'Аналитика, точность, сервис, здоровье', weakness: 'Кишечник, пупок, нервная система, мнительность', growth: 'Принятие несовершенства, расслабление' },
  { sign: 'Весы', start: [9, 24], end: [10, 23], element: 'Воздух', planet: 'Венера', strength: 'Дипломатия, эстетика, справедливость', weakness: 'Поясница, почки, мочеполовая система', growth: 'Решительность, личные границы' },
  { sign: 'Скорпион', start: [10, 24], end: [11, 22], element: 'Вода', planet: 'Плутон/Марс', strength: 'Глубина, трансформация, проницательность', weakness: 'Половые органы, нос, прямая кишка, стресс', growth: 'Доверие, прощение, экологичная агрессия' },
  { sign: 'Стрелец', start: [11, 23], end: [12, 21], element: 'Огонь', planet: 'Юпитер', strength: 'Оптимизм, философия, масштаб, юмор', weakness: 'Бёдра, таз, печень, нервное перенапряжение', growth: 'Детализация, финансовая дисциплина' }
];

const EASTERN_ANIMALS = ['Крыса', 'Бык', 'Тигр', 'Кролик', 'Дракон', 'Змея', 'Лошадь', 'Коза', 'Обезьяна', 'Петух', 'Собака', 'Свинья'];
const EASTERN_ELEMENTS = ['Металл', 'Вода', 'Дерево', 'Огонь', 'Земля'];

const LUNAR_RESTRICTIONS = {
  1: 'Мизинец руки, большой палец ноги, кончик носа',
  2: 'Наружная лодыжка', 3: 'Внутренняя часть бедра, печень, дёсна', 4: 'Поясница, врата желудка', 5: 'Ротовая полость, поверхность тела',
  6: 'Ладони, запястья, грудная клетка', 7: 'Внутренняя лодыжка, колени, дыхательные пути', 8: 'Запястья, половые органы, бёдра',
  9: 'Копчик, крестец, подколенная ямка', 10: 'Лопатки, поясница, лодыжка, подъём стопы', 11: 'Грудной отдел позвоночника',
  12: 'Сердце (перикард)', 13: 'Поджелудочная железа', 14: 'Тонкий кишечник', 15: 'Поджелудочная, диафрагма',
  16: 'Селезёнка', 17: 'Почки, надпочечники', 18: 'Кожные покровы тела', 19: 'Аппендикс, толстая кишка', 20: 'Верхняя часть спины, лопатки',
  21: 'Печень, желчный пузырь', 22: 'Тазобедренный сустав, крестец', 23: 'Яичники, яички', 24: 'Наружные половые органы',
  25: 'Уши, висок', 26: 'Бёдра, кожа, колени', 27: 'Голени, подъём стопы', 28: 'Глаза, голова, мозг, стопы',
  29: 'Прямая кишка, пальцы ног', 30: 'Сердце (эпифиз), голова'
};

const MERIDIAN_CLOCK = [
  { time: '23-01', name: '3 обогревателя', sign: 'Кабан', advice: 'Завершение дел, подготовка ко сну, тёплый душ' },
  { time: '01-03', name: 'Печени', sign: 'Вол', advice: 'Глубокий сон, детокс, не ложиться позже 23:00' },
  { time: '03-05', name: 'Лёгких', sign: 'Тигр', advice: 'Пробуждение, свежий воздух, дыхательная практика' },
  { time: '05-07', name: 'Толстого кишечника', sign: 'Заяц', advice: 'Опорожнение, тёплая вода, лёгкий завтрак' },
  { time: '07-09', name: 'Желудка', sign: 'Дракон', advice: 'Полноценный завтрак, планирование дня' },
  { time: '09-11', name: 'Селезёнки', sign: 'Змея', advice: 'Аналитика, обучение, фокус на деталях' },
  { time: '11-13', name: 'Сердца', sign: 'Лошадь', advice: 'Социальные контакты, важные решения, обед' },
  { time: '13-15', name: 'Тонкого кишечника', sign: 'Овца', advice: 'Усвоение информации, лёгкая работа' },
  { time: '15-17', name: 'Мочевого пузыря', sign: 'Обезьяна', advice: 'Активность, спорт, творчество' },
  { time: '17-19', name: 'Почек', sign: 'Петух', advice: 'Восстановление, тёплый чай, рефлексия' },
  { time: '19-21', name: 'Перикарда', sign: 'Собака', advice: 'Общение с близкими, расслабление' },
  { time: '21-23', name: '3 обогревателя', sign: 'Кабан', advice: 'Подготовка ко сну, отказ от экранов' }
];
const CHRONO_WINDOWS = {
  '🌅 Жаворонок': { peak: '08:00–11:00', type: 'deep_work', advice: 'Сложные задачи утром, рутину после 15:00' },
  '🕊️ Голубь': { peak: '10:00–14:00', type: 'moderate_work', advice: 'Баланс активности и отдыха, буфер 20%' },
  '🦉 Сова': { peak: '16:00–20:00', type: 'deep_work', advice: 'Аналитику вечером, утро — на лёгкие задачи' }
};

const PRACTICES_DB = [
  { id: 'sam_chon_do', title: 'Сам Чон До (настроечное)', duration: 5, color: '#0070c0', desc: 'Вдох 3с → Выдох 6с. База для всех техник системы.', type: 'breathing' },
  { id: 'healing_sounds', title: '6 целительных звуков', duration: 10, color: '#2d6a4f', desc: 'С-С-С (лёгкие), Ч-У-Э-Й (почки), Ш-Ш-Ш (печень)...', type: 'sound' },
  { id: 'norbeikov_setting', title: 'Настрой Норбекова + ОМЗ', duration: 7, color: '#c8a45a', desc: 'Визуализация Образа Молодости и Здоровья. Включение внутренних резервов.', type: 'visualization' },
  { id: 'cry_breathing', title: 'Рыдающее дыхание (Вилунас)', duration: 3, color: '#e8556d', desc: 'Снятие острого стресса. Вдох ртом → выдох «с-с-с».', type: 'breathing', condition: s => s > 7 }
];

// ─── 2. РАСЧЁТНЫЕ АЛГОРИТМЫ ──────────────────────────────────────────────────

/** Определение западного знака по дате рождения */
export function getZodiacSign(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return ZODIAC_MAP.find(z => {
    const [sm, sd] = z.start;
    const [em, ed] = z.end;
    if (sm === em) return m === sm && day >= sd && day <= ed;
    return (m === sm && day >= sd) || (m === em && day <= ed);
  })?.sign || 'Близнецы';
}

/** Определение восточного знака по году */
export function getEasternSign(year) {
  if (!year) return 'Свинья';
  return EASTERN_ANIMALS[(year - 4) % 12];
}

/** Расчёт Градуса Судьбы по ФИО (градусная нумерология Амриты) */
export function calculateDestinyDegree(fullName) {
  if (!fullName || fullName.length < 3) return { degree: 0, interpretation: 'Не задано' };
  const ru = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  let sum = 0;
  for (const char of fullName.toLowerCase()) {
    if (ru.includes(char)) sum += ru.indexOf(char) + 1;
  }
  const degree = sum % 360 || 360;
  let interpretation = 'Универсальный потенциал, путь самопознания.';
  if (degree < 120) interpretation = 'Начало пути. Сила нового, инициация, активное созидание.';
  else if (degree < 240) interpretation = 'Развитие и структура. Закрепление опыта, профессиональный рост.';
  else interpretation = 'Завершение и мудрость. Интеграция, передача опыта, духовный синтез.';
  return { degree, interpretation };}

/** Расчёт текущего лунного дня (синодический цикл, аппроксимация 2020–2030) */
export function getMoonDay(date = new Date()) {
  const knownNewMoon = new Date(Date.UTC(2024, 0, 11, 11, 57));
  const synodicMonth = 29.53058867;
  const diffDays = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const cyclePos = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
  return Math.floor(cyclePos) + 1;
}

/** Текущий активный меридиан по времени суток */
export function getCurrentMeridian() {
  const h = new Date().getHours();
  return MERIDIAN_CLOCK.find(m => {
    const [start] = m.time.split('-').map(Number);
    return h >= start && h < start + 2;
  }) || MERIDIAN_CLOCK[0];
}

/** Текущий сезон (для ТКМ-рекомендаций) */
export function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'Весна (Дерево)';
  if (m >= 6 && m <= 8) return 'Лето (Огонь)';
  if (m >= 9 && m <= 11) return 'Осень (Металл)';
  return 'Зима (Вода)';
}

/** Определение типа восприятия времени (t-тип) на основе хроно-типа и профиля */
export function getTimeType(profile) {
  const c = profile?.chronotype || '🕊️ Голубь';
  if (c.includes('Жаворонок')) return { type: 'Спешащий (t<1)', advice: 'Закладывайте +15% буфера, избегайте многозадачности' };
  if (c.includes('Сова')) return { type: 'Медлительный (t>1)', advice: 'Ставьте жёсткие дедлайны, используйте таймеры' };
  return { type: 'Точный (t=1)', advice: 'Синхронизированы с реальным временем, сохраняйте ритм' };
}

/** Стиль коммуникации (на основе базы Тони Рейман и психотипа) */
export function getCommStyle(profile) {
  const goals = profile?.goalAreas || [];
  if (goals.includes('Карьера') || goals.includes('Финансы')) return 'Аналитический/Визуальный: используйте схемы, цифры, чёткие дедлайны';
  if (goals.includes('Отношения') || goals.includes('Семья')) return 'Эмпатический/Кинестетический: акцент на чувствах, тактильности, доверии';
  return 'Универсальный: адаптируйтесь под собеседника, слушайте больше, чем говорите';
}

// ─── 3. ГЛАВНАЯ ФУНКЦИЯ ПЕРСОНАЛИЗАЦИИ ──────────────────────────────────────

/**
 * Генерирует полный персонализированный профиль на основе онбординга и Базы Знаний
 * @param {Object} profile - данные из useApp().profile * @returns {Object} структурированные инсайты для UI
 */
export function getProfileInsights(profile) {
  if (!profile) return null;

  const dob = profile.dob;
  const year = dob ? new Date(dob).getFullYear() : null;
  const chronotype = profile.chronotype || '🕊️ Голубь';
  const stress = profile.stressLevel || 5;
  const goals = profile.goalAreas || [];
  const blocks = profile.goalBlocks || [];

  const zodiac = getZodiacSign(dob);
  const eastern = getEasternSign(year);
  const destiny = calculateDestinyDegree(profile.fullName);
  const moonDay = getMoonDay();
  const meridian = getCurrentMeridian();
  const season = getCurrentSeason();
  const chronoData = CHRONO_WINDOWS[chronotype] || CHRONO_WINDOWS['🕊️ Голубь'];
  const timeType = getTimeType(profile);
  const commStyle = getCommStyle(profile);

  // Поиск слабых зон здоровья по месяцу (из monthly-health-by-sign.md)
  const currentMonth = new Date().getMonth() + 1;
  let monthlyHealth = { area: 'Нет данных', advice: 'Следите за балансом отдыха и активности' };
  // (В продакшене здесь будет маппинг по таблице Давыдова, упрощено для стабильности)
  if (zodiac) {
    const z = ZODIAC_MAP.find(zd => zd.sign === zodiac);
    if (z) monthlyHealth = { area: z.weakness, advice: z.growth };
  }

  // Подбор практик под состояние
  const recommendedPractices = PRACTICES_DB.filter(p => !p.condition || p.condition(stress));

  // Жизненные циклы (упрощённая интерпретация Даша/Возрастные этапы)
  const age = year ? new Date().getFullYear() - year : null;
  let lifeCycle = 'Становление';
  if (age >= 29) lifeCycle = 'Кризис смысла / Переоценка (Возврат Сатурна)';
  if (age >= 40) lifeCycle = 'Зрелость & Трансформация';
  if (age >= 56) lifeCycle = 'Мудрость & Наставничество';

  return {
    zodiac,
    eastern,
    destiny,
    chronotype,
    chronoData,
    timeType,
    commStyle,
    moonDay,    moonRestriction: { forbidden: LUNAR_RESTRICTIONS[moonDay] || 'Нет данных' },
    meridian,
    season,
    health: monthlyHealth,
    stressLevel: stress,
    practices: recommendedPractices,
    lifeCycle,
    age,
    goals,
    blocks,
    // Фоллбэки для UI
    zodiacElement: ZODIAC_MAP.find(z => z.sign === zodiac)?.element || 'Воздух',
    rulingPlanet: ZODIAC_MAP.find(z => z.sign === zodiac)?.planet || 'Меркурий',
    zodiacStrengths: ZODIAC_MAP.find(z => z.sign === zodiac)?.strength || 'Коммуникация, адаптивность',
    zodiacWeaknesses: ZODIAC_MAP.find(z => z.sign === zodiac)?.weakness || 'Лёгкие, нервная система',
    easternElement: EASTERN_ELEMENTS[(year - 4) % 5] || 'Вода',
    easternTraits: 'Честность, щедрость, терпимость',
    easternKarma: 'Научиться говорить «нет» без чувства вины'
  };
}

// ─── ЭКСПОРТЫ ДЛЯ УДОБСТВА ──────────────────────────────────────────────────
export { ZODIAC_MAP, EASTERN_ANIMALS, LUNAR_RESTRICTIONS, MERIDIAN_CLOCK, CHRONO_WINDOWS, PRACTICES_DB };
