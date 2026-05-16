// src/utils/healthCalculator.js
const ELEMENTS = ["Металл", "Вода", "Дерево", "Огонь", "Земля"];

export function calculateHealthProfile(profile) {
  if (!profile || !profile.dob) return { element: "—", yinyang: "—", stress: 5, uxinPattern: "neutral" };

  const dob = new Date(profile.dob);
  const year = dob.getFullYear();
  
  // 1. Стихия (по циклу 10 лет)
  const elementIndex = (year - 4) % 10; 
  const element = elementIndex < 2 ? "Дерево" : elementIndex < 4 ? "Огонь" : elementIndex < 6 ? "Земля" : elementIndex < 8 ? "Металл" : "Вода";

  // 2. Инь/Ян
  const yinyang = year % 2 === 0 ? "Ян" : "Инь";

  // 3. У-Син паттерн
  const stress = profile.stressLevel || 5;
  let uxinPattern = "equal";
  
  // ИСПРАВЛЕНИЕ: & & заменен на &&, убраны лишние пробелы в строках
  if (stress > 8) uxinPattern = "neutral"; 
  if (stress < 3 && profile.coreValue === "giver") uxinPattern = "donor";
  if (stress > 5 && profile.coreValue === "taker") uxinPattern = "vampire";

  return {
    element,
    yinyang,
    stress,
    uxinPattern,
    chronotype: profile.chronotype || "Ворона", 
    zodiac: "Весы", 
    jiaziPhase: "Фаза роста",
    lunarNodes: "Северный узел"
  };
}

export function getTimeRecommendation(profile) {
  const now = new Date();
  const hours = now.getHours();
  
  let mIndex = Math.floor(hours / 2);
  if (mIndex > 11) mIndex = 0; 

  const MERIDIANS = [
    { name: "Печень", h: "01-03", desc: "Очищение крови. Сон.", warning: "Будильник выключить." },
    { name: "Лёгкие", h: "03-05", desc: "Распределение Ци. Пробуждение.", benefit: "Дышите глубже." },
    { name: "Толстый кишечник", h: "05-07", desc: "Выведение.", benefit: "Туалет, вода." },
    { name: "Желудок", h: "07-09", desc: "Еда.", benefit: "Завтрак обязателен." },
    { name: "Селезенка", h: "09-11", desc: "Мышление.", benefit: "Сложные задачи." },
    { name: "Сердце", h: "11-13", desc: "Эмоции.", warning: "Избегайте конфликтов." },
    { name: "Тонкий кишечник", h: "13-15", desc: "Сортировка.", benefit: "Обед." },
    { name: "Мочевой пузырь", h: "15-17", desc: "Детокс.", benefit: "Работа с данными." },
    { name: "Почки", h: "17-19", desc: "Ресурс.", warning: "Не перетруждайтесь." },
    { name: "Перикард", h: "19-21", desc: "Спокойствие.", benefit: "Ужин." },
    { name: "Сань Цзяо", h: "21-23", desc: "Регуляция.", warning: "Готовься ко сну." },
    { name: "Желчный пузырь", h: "23-01", desc: "Сон.", warning: "Категорически спать." }
  ];

  return {
    hourSlot: `${hours}:00`,
    currentMeridian: MERIDIANS[mIndex],
    recommendation: "Следуйте ритму тела."
  };
}
