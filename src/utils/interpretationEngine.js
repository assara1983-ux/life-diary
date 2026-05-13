// src/utils/interpretationEngine.js
import { getZodiac, getEastern, calculateDestinyDegree, getTCMProfile } from './knowledgeEngine';

/**
 * Генерирует персонализированные расшифровки на основе профиля
 * Формат: { icon, title, personalImpact, strength, weakness, advice }
 */
export function generateProfileInterpretation(profile) {
  if (!profile?.dob) return null;

  const zodiac = getZodiac(profile.dob);
  const eastern = getEastern(profile.dob);
  const destiny = calculateDestinyDegree(profile.fullName);
  const tcm = getTCMProfile(profile.dob, profile.birthTime);
  const chronotype = profile.chronotype || '🕊️ Голубь';

  return {
    zodiac: {
      icon: zodiac.emoji,
      title: `Западный знак: ${zodiac.name}`,
      personalImpact: `Ваша природная энергия резонирует с ${zodiac.element.toLowerCase()}. В стрессе вы интуитивно тянетесь к ${zodiac.stressCoping}.`,
      strength: zodiac.strengths,
      weakness: zodiac.weaknesses,
      advice: `Фокус на развитие: ${zodiac.growthArea}. Избегайте: ${zodiac.avoid}.`
    },
    eastern: {
      icon: eastern.emoji,
      title: `Восточный знак: ${eastern.name}`,
      personalImpact: `Ваш годовой цикл задаёт ритм ${eastern.element.toLowerCase()}. В периоды ${eastern.hardMonths} будьте особенно внимательны к ${eastern.healthFocus}.`,
      strength: eastern.strengths,
      advice: `Ваша кармическая задача в этом воплощении: ${eastern.karmicTask}.`
    },
    destiny: {
      icon: '🎯',
      title: `Градус Судьбы: ${destiny.degree}°`,
      personalImpact: `Вибрация вашего имени программирует путь через ${destiny.theme.toLowerCase()}. Вы легче всего раскрываетесь в сферах, где требуется ${destiny.activationMode}.`,
      lesson: destiny.lifeLesson,
      talent: destiny.innateTalent,
      advice: `Чтобы выйти из «круга» в «спираль», практикуйте: ${destiny.spiralPractice}.`
    },
    tcm: {
      icon: '⚡',
      title: `ТКМ-конституция: ${tcm.type}`,
      personalImpact: `Ваш меридиан-${tcm.weakMeridian.toLowerCase()} сейчас требует поддержки. Сезон ${tcm.season} усиливает ${tcm.seasonalRisk}.`,
      weakMeridian: tcm.weakMeridian,
      practice: tcm.recommendedPractice,
      advice: `Ежедневно: ${tcm.dailyRitual}. В питании сделайте акцент на: ${tcm.nutritionFocus}.`
    },
    chronotype: {
      icon: chronotype.includes('Жаворонок') ? '🌅' : chronotype.includes('Сова') ? '🦉' : '🕊️',      title: `Хроно-тип: ${chronotype}`,
      personalImpact: `Ваш пик когнитивной функции приходится на ${chronotype.includes('Жаворонок') ? '09:00–12:00' : chronotype.includes('Сова') ? '16:00–20:00' : '11:00–15:00'}. Планируйте аналитику и решения на это окно.`,
      advice: `Рутина и административные задачи лучше сместить на ${chronotype.includes('Жаворонок') ? 'после 15:00' : 'до 11:00'}.`
    }
  };
}

// Словарь данных (можно вынести в отдельный JSON-файл базы знаний)
const getZodiac = (dob) => {
  const d = new Date(dob), m = d.getMonth() + 1, day = d.getDate();
  if ((m===3&&day>=21)||(m===4&&day<=20)) return { emoji:'♈', name:'Овен', element:'Огонь', stressCoping:'физической активности', strengths:'решительность, лидерство', weaknesses:'нетерпение, импульсивность', growthArea:'эмоциональная стабильность', avoid:'конфликтов ради спора' };
  if ((m===4&&day>=21)||(m===5&&day<=20)) return { emoji:'♉', name:'Телец', element:'Земля', stressCoping:'тактильного комфорта', strengths:'упорство, надёжность', weaknesses:'ригидность, переедание', growthArea:'гибкость мышления', avoid:'сопротивления изменениям' };
  if ((m===5&&day>=21)||(m===6&&day<=21)) return { emoji:'♊', name:'Близнецы', element:'Воздух', stressCoping:'информационного обмена', strengths:'коммуникация, адаптивность', weaknesses:'поверхностность, тревожность', growthArea:'фокус на глубине', avoid:'многозадачности без приоритетов' };
  // ... остальные 9 знаков (для примера сокращено, легко расширить)
  return { emoji:'♊', name:'Близнецы', element:'Воздух', stressCoping:'информационного обмена', strengths:'коммуникация, адаптивность', weaknesses:'поверхностность, тревожность', growthArea:'фокус на глубине', avoid:'многозадачности без приоритетов' };
};

const getEastern = (dob) => {
  const year = new Date(dob).getFullYear();
  const animals = ['Крыса','Бык','Тигр','Кролик','Дракон','Змея','Лошадь','Коза','Обезьяна','Петух','Собака','Свинья'];
  const animal = animals[(year - 4) % 12];
  return {
    emoji: '🐗', name: animal, element: 'Вода', hardMonths: 'Овца, Лошадь', healthFocus: 'почки и нервная система',
    strengths: 'честность, щедрость, терпимость', karmicTask: 'научиться говорить «нет» без чувства вины'
  };
};

const calculateDestinyDegree = (fullName) => {
  if (!fullName) return { degree: 0, theme:'Не задано', lifeLesson:'', innateTalent:'', spiralPractice:'' };
  const ru = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  let s = 0;
  for (const c of fullName.toLowerCase()) if (ru.includes(c)) s += ru.indexOf(c) + 1;
  const deg = s % 360 || 360;
  return {
    degree: deg,
    theme: deg < 120 ? 'Начало и инициация' : deg < 240 ? 'Развитие и структура' : 'Завершение и мудрость',
    lifeLesson: 'Принятие ответственности за свой выбор без оглядки на чужие ожидания.',
    innateTalent: 'Синтезировать информацию и находить неочевидные связи.',
    activationMode: 'постоянного движения и новизны',
    spiralPractice: 'ведение дневника рефлексии + еженедельный аудит целей'
  };
};

const getTCMProfile = (dob, birthTime) => ({
  type: 'Дерево-Ветер',
  weakMeridian: 'Печени',
  seasonalRisk: 'весенние перепады давления',
  recommendedPractice: 'дыхание «Ш-Ш-Ш» + постукивание по меридиану',
  dailyRitual: 'тёплая вода с лимоном натощак',
  nutritionFocus: 'горькая зелень, кислые фрукты умеренно'});
