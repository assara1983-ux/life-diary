// src/core/knowledgeEngine.js
// Мозг приложения: связывает профиль с базой знаний (Ба Цзы + 10 Богов + 5 Элементов)

import { getMoon } from '../utils/helpers';

// === БАЗА ДАННЫХ БА ЦЗЫ ===
const HEAVENLY_STEMS = {
  '甲': { element: 'Дерево', polarity: 'Ян', name: 'Ян Дерево' },
  '乙': { element: 'Дерево', polarity: 'Инь', name: 'Инь Дерево' },
  '丙': { element: 'Огонь', polarity: 'Ян', name: 'Ян Огонь' },
  '丁': { element: 'Огонь', polarity: 'Инь', name: 'Инь Огонь' },
  '戊': { element: 'Земля', polarity: 'Ян', name: 'Ян Земля' },
  '己': { element: 'Земля', polarity: 'Инь', name: 'Инь Земля' },
  '庚': { element: 'Металл', polarity: 'Ян', name: 'Ян Металл' },
  '辛': { element: 'Металл', polarity: 'Инь', name: 'Инь Металл' },
  '壬': { element: 'Вода', polarity: 'Ян', name: 'Ян Вода' },
  '癸': { element: 'Вода', polarity: 'Инь', name: 'Инь Вода' },
};

export function getBaZiChart(profile) {
  if (!profile?.dob) return null;
  const date = new Date(profile.dob);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const stemIndex = (year - 4) % 10;
  const stems = Object.keys(HEAVENLY_STEMS);
  const dayMasterStem = stems[stemIndex];

  return {
    dayMaster: {
      stem: dayMasterStem,
      info: HEAVENLY_STEMS[dayMasterStem],
      full: `${dayMasterStem} — ${HEAVENLY_STEMS[dayMasterStem].name}`
    },
    element: HEAVENLY_STEMS[dayMasterStem].element
  };
}

export function getTenGodsAndElementsInsight(dayMasterStem) {
  const data = {
    '甲': { element: 'Дерево', favorable: 'Вода (питание), Металл (структура)', unfavorable: 'Огонь (иссушает)', tenGods: 'Сильный 比肩 (независимость), 七杀 (амбиции), 正印 (поддержка)' },
    '乙': { element: 'Дерево', favorable: 'Вода, Металл', unfavorable: 'Огонь', tenGods: '劫财 (гибкость), 伤官 (креативность)' },
    '丙': { element: 'Огонь', favorable: 'Дерево, Вода', unfavorable: 'Вода (избыток)', tenGods: '食神 (радость), 正财 (стабильность)' },
    default: { element: '—', favorable: 'Баланс всех элементов', unfavorable: '—', tenGods: '10 Богов показывают ваши ключевые архетипы и стратегии' }
  };
  return data[dayMasterStem] || data.default;
}

// Основная функция insights
export function getProfileInsights(profile) {
  const zodiac = getZodiacByDOB(profile?.dob);
  const eastern = getEasternByDOB(profile?.dob);
  const bazi = getBaZiChart(profile);
  const tenGodsInsight = bazi ? getTenGodsAndElementsInsight(bazi.dayMaster.stem) : null;

  return {
    zodiac,
    eastern,
    bazi,
    tenGodsInsight,
    destiny: { degree: profile?.fullName ? calcDegree(profile.fullName) : 241 },
  };
}

// === Вспомогательные функции ===
function getZodiacByDOB(dob) {
  if (!dob) return "—";
  const d = new Date(dob), m = d.getMonth() + 1, day = d.getDate();
  const z = ["Козерог","Водолей","Рыбы","Овен","Телец","Близнецы","Рак","Лев","Дева","Весы","Скорпион","Стрелец"];
  const starts = [20,19,20,21,20,21,22,23,23,23,23,22];
  let idx = m - 1;
  if (day < starts[m-1]) idx = (m + 10) % 12;
  return z[idx];
}

function getEasternByDOB(dob) {
  if (!dob) return "—";
  return ["Крыса","Бык","Тигр","Кролик","Дракон","Змея","Лошадь","Коза","Обезьяна","Петух","Собака","Свинья"][(new Date(dob).getFullYear() - 4) % 12];
}

function calcDegree(name) {
  if (!name) return 241;
  const ru = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
  let s = 0;
  for (const c of name.toLowerCase()) {
    const i = ru.indexOf(c);
    if (i >= 0) s += i + 1;
  }
  return s % 360 || 360;
}

// Существующие функции (оставлены)
export function getSectionRecommendations(profile, sectionId) {
  return []; // можно расширить позже
}

export function getBodyWeaknesses(profile) {
  return [];
}

export { getMoon };
