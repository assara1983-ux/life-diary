// ══════════════════════════════════════════════════════════════
//  ТКМ: ТРАДИЦИОННАЯ КИТАЙСКАЯ МЕДИЦИНА — ВСЕ РАСЧЁТЫ
// ══════════════════════════════════════════════════════════════

export function getChineseElement(dob) {
  if (!dob) return null;
  const year = new Date(dob).getFullYear();
  const last = year % 10;
  const elements = [
    { name: "Металл", emoji: "⚙️", yin: false, organ: "Лёгкие / Толстый кишечник", season: "Осень", taste: "Острое", color: "Белый", virtue: "Справедливость" },
    { name: "Металл", emoji: "⚙️", yin: true,  organ: "Лёгкие / Толстый кишечник", season: "Осень", taste: "Острое", color: "Белый", virtue: "Справедливость" },
    { name: "Вода",   emoji: "💧", yin: false, organ: "Почки / Мочевой пузырь",     season: "Зима",  taste: "Солёное", color: "Чёрный/синий", virtue: "Мудрость" },
    { name: "Вода",   emoji: "💧", yin: true,  organ: "Почки / Мочевой пузырь",     season: "Зима",  taste: "Солёное", color: "Чёрный/синий", virtue: "Мудрость" },
    { name: "Дерево", emoji: "🌿", yin: false, organ: "Печень / Желчный пузырь",    season: "Весна", taste: "Кислое",  color: "Зелёный", virtue: "Доброта" },
    { name: "Дерево", emoji: "🌿", yin: true,  organ: "Печень / Желчный пузырь",    season: "Весна", taste: "Кислое",  color: "Зелёный", virtue: "Доброта" },
    { name: "Огонь",  emoji: "🔥", yin: false, organ: "Сердце / Тонкий кишечник",   season: "Лето",  taste: "Горькое", color: "Красный", virtue: "Любовь" },
    // ✅ ИСПРАВЛЕНО: было emoji: "" — теперь "🔥"
    { name: "Огонь",  emoji: "🔥", yin: true,  organ: "Сердце / Тонкий кишечник",   season: "Лето",  taste: "Горькое", color: "Красный", virtue: "Любовь" },
    { name: "Земля",  emoji: "🌍", yin: false, organ: "Селезёнка / Желудок",        season: "Межсезонье", taste: "Сладкое", color: "Жёлтый", virtue: "Честность" },
    { name: "Земля",  emoji: "🌍", yin: true,  organ: "Селезёнка / Желудок",        season: "Межсезонье", taste: "Сладкое", color: "Жёлтый", virtue: "Честность" },
  ];
  return elements[last];
}

export function getTCMConstitution(dob) {
  if (!dob) return null;
  const m = new Date(dob).getMonth();
  if (m >= 2 && m <= 4) return { type: "Весенняя (Дерево)", desc: "Активная Ци, склонность к стрессу печени", foods: "Зелёные овощи, кислые продукты, проростки" };
  if (m >= 5 && m <= 7) return { type: "Летняя (Огонь)", desc: "Избыток Ян, жар сердца, энергичность", foods: "Горькие травы, красные продукты, охлаждающие блюда" };
  if (m >= 8 && m <= 10) return { type: "Осенняя (Металл)", desc: "Сухость лёгких, чёткость ума", foods: "Белые продукты, острые специи, груша, редис" };
  return { type: "Зимняя (Вода)", desc: "Глубокая Инь, сила почек, интуиция", foods: "Солёные продукты, чёрные бобы, морепродукты, орехи" };
}

export function getTCMFullProfile(profile) {
  if (!profile || !profile.dob) return null;
  const el = getChineseElement(profile.dob);
  const cn = getTCMConstitution(profile.dob);
  const syndromes = [];
  if (profile.tcmTemp?.includes("жарко"))   syndromes.push("Избыток Ян / Жар");
  if (profile.tcmTemp?.includes("мёрзну"))  syndromes.push("Недостаток Ян / Холод");
  if (profile.tcmMoisture?.includes("Отёки"))    syndromes.push("Сырость-Слизь");
  if (profile.tcmMoisture?.includes("Сухость"))  syndromes.push("Недостаток Инь / Сухость");
  if (profile.tcmMoisture?.includes("потливость")) syndromes.push("Неустойчивость защитной Ци");

  const birthOrgan   = profile.birthHour ? profile.birthHour.split("—")[1]?.trim().replace("Нет", "") : null;
  const emotionOrgan = profile.tcmEmotion?.includes("Дерево") ? "Печень" :
                       profile.tcmEmotion?.includes("Огонь")  ? "Сердце" :
                       profile.tcmEmotion?.includes("Земля")  ? "Селезёнка/Желудок" :
                       profile.tcmEmotion?.includes("Металл") ? "Лёгкие" :
                       profile.tcmEmotion?.includes("Вода")   ? "Почки" : null;
  const sleepOrgan   = profile.tcmSleep?.includes("1–3") ? "Печень" :
                       profile.tcmSleep?.includes("3–5") ? "Лёгкие" :
                       profile.tcmSleep?.includes("5–7") ? "Толстый кишечник" : null;
  const tasteOrgan   = profile.tcmTaste?.includes("Кислое")  ? "Печень/Желчный пузырь" :
                       profile.tcmTaste?.includes("Горькое") ? "Сердце" :
                       profile.tcmTaste?.includes("Сладкое") ? "Селезёнка" :
                       profile.tcmTaste?.includes("Острое")  ? "Лёгкие" :
                       profile.tcmTaste?.includes("Солёное") ? "Почки" : null;
  const digestionNote = profile.tcmDigestion?.includes("Вздутие")      ? "Застой Ци в Желудке" :
                        profile.tcmDigestion?.includes("Тяжесть")      ? "Недостаток Ян Селезёнки" :
                        profile.tcmDigestion?.includes("Изжога")       ? "Жар Желудка" :
                        profile.tcmDigestion?.includes("Нестабильность") ? "Дисгармония Печени и Желудка" :
                        profile.tcmDigestion?.includes("аппетита")     ? "Недостаток Ци Селезёнки" : null;

  const organs = [birthOrgan, emotionOrgan, sleepOrgan, tasteOrgan].filter(Boolean);
  const uniqueOrgans = [...new Set(organs)];

  let foodRecs = cn?.foods || "";
  if (syndromes.includes("Избыток Ян / Жар"))     foodRecs += ". Избегай: острого, жареного, алкоголя. Добавь: огурец, арбуз, листовой салат, зелёный чай";
  if (syndromes.includes("Недостаток Ян / Холод")) foodRecs += ". Добавь: имбирь, корицу, тушёные блюда, тёплые супы. Избегай: сырого, холодного";
  if (syndromes.includes("Сырость-Слизь"))         foodRecs += ". Избегай: молочного, сладкого, жирного. Добавь: редис, пшено, ячмень, имбирь";
  if (syndromes.includes("Недостаток Инь / Сухость")) foodRecs += ". Добавь: кунжут, мёд, груша, лилейная луковица, чёрный кунжут";

  return { el, cn, syndromes, birthOrgan, emotionOrgan, sleepOrgan, tasteOrgan, uniqueOrgans, digestionNote, foodRecs };
}

export function getSeasonalTCM(profile) {
  const month = new Date().getMonth() + 1;
  const age = profile?.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : 35;
  const el = getChineseElement(profile?.dob);
  const season = month >= 3 && month <= 5 ? "Весна" : month >= 6 && month <= 8 ? "Лето" : month >= 9 && month <= 11 ? "Осень" : "Зима";
  const seasons = {
    "Весна": { element: "Дерево", organ: "Печень / Желчный пузырь", emotion: "Гнев → Решимость",
      doList: ["Зелёные овощи, проростки", "Ранние прогулки на природе", "Растяжка и йога", "Завершай незаконченные дела", "Очищение печени (вода с лимоном)"],
      avoidList: ["Алкоголь и жирная пища", "Подавление эмоций", "Длительное сидение", "Поздние ужины"],
      color: "#228B22", emoji: "🌿" },
    "Лето": { element: "Огонь", organ: "Сердце / Тонкий кишечник", emotion: "Тревога → Радость",
      doList: ["Лёгкая пища, горькие травы", "Активность в первой половине дня", "Медитация и пение", "Общение и праздники", "Охлаждающие напитки"],
      avoidList: ["Перегрев и прямое солнце", "Холодные напитки натощак", "Переутомление", "Сильные стрессы"],
      color: "#DC143C", emoji: "☀️" },
    "Осень": { element: "Металл", organ: "Лёгкие / Толстый кишечник", emotion: "Грусть → Принятие",
      doList: ["Белые продукты (груша, дайкон, лук)", "Дыхательные практики", "Уборка и порядок", "Подводи итоги", "Тёплая одежда"],
      avoidList: ["Сырая и холодная пища", "Подавление грусти", "Переохлаждение", "Резкие перемены"],
      color: "#A9A9A9", emoji: "🍂" },
    "Зима": { element: "Вода", organ: "Почки / Мочевой пузырь", emotion: "Страх → Мудрость",
      doList: ["Тёплые супы, мясные бульоны", "Ранний отбой", "Глубокое дыхание", "Планирование на год", "Тепло на поясницу"],
      avoidList: ["Переохлаждение", "Поздние ночи", "Избыток солёного", "Интенсивный спорт на холоде"],
      color: "#1E3A5F", emoji: "❄️" },
  };
  const s = seasons[season];
  let interaction = "";
  if (el) {
    if (el.name === s.element) interaction = "🔥 Твоя стихия совпадает с сезоном — двойная энергия. Будь внимателен к переизбытку.";
    else if (el.yin) interaction = "⚡ Твоя стихия Инь — в этом сезоне важно поддерживать тепло и восстановление.";
    else interaction = "⚡ Твоя стихия Ян — в этом сезоне направь энергию в созидание.";
  }
  const ageNote = age < 30 ? "В твоём возрасте энергия Ци сильна — используй сезон для активного роста." :
                  age < 50 ? "В этом возрасте важно поддерживать баланс между активностью и восстановлением." :
                  "В зрелом возрасте особенно важно следовать сезонным ритмам и беречь почечную Ци.";
  return { ...s, season, interaction, ageNote, age };
}

export function getTCMHourOrgan(hour) {
  const h = hour % 24;
  const map = [
    { h: [23, 0], organ: "Желчный пузырь", emoji: "💚", tip: "Время решений. Лучше отдыхай, не принимай важных решений." },
    { h: [1, 2],  organ: "Печень",          emoji: "🌿", tip: "Очищение крови. Сон обязателен — тело восстанавливается." },
    { h: [3, 4],  organ: "Лёгкие",          emoji: "🫁", tip: "Самый глубокий сон. Дыхательные практики ранним утром." },
    { h: [5, 6],  organ: "Толстый кишечник",emoji: "🌅", tip: "Пробуждение и очищение. Выпей воду." },
    { h: [7, 8],  organ: "Желудок",         emoji: "🍵", tip: "Время завтрака. Тёплая пища активирует пищеварение." },
    { h: [9, 10], organ: "Селезёнка",       emoji: "🌟", tip: "Пик умственной активности. Решай сложные задачи." },
    { h: [11, 12],organ: "Сердце",          emoji: "❤️", tip: "Пик активности. Важные встречи, творчество." },
    { h: [13, 14],organ: "Тонкий кишечник", emoji: "🍽", tip: "Переварение пищи. Небольшой отдых полезен." },
    { h: [15, 16],organ: "Мочевой пузырь", emoji: "💧", tip: "Пей воду. Хорошо для учёбы и работы." },
    { h: [17, 18],organ: "Почки",           emoji: "🌙", tip: "Восстановление энергии. Лёгкие упражнения." },
    { h: [19, 20],organ: "Перикард",        emoji: "🕯", tip: "Время общения и отдыха. Избегай стрессов." },
    { h: [21, 22],organ: "Три обогревателя",emoji: "🌠", tip: "Подготовка ко сну. Спокойные практики." },
  ];
  return map.find(m => m.h.includes(h)) || map[0];
}

// ✅ ИСПРАВЛЕНО: правильные emoji для дней недели
export function getTCMDayInfo(date) {
  const dow = date.getDay();
  const days = [
    { name: "Воскресенье", element: "Земля",   emoji: "🌍", color: "#B8860B" },
    { name: "Понедельник", element: "Металл",  emoji: "⚙️", color: "#708090" },
    // ✅ ИСПРАВЛЕНО: было "" — теперь "🔥"
    { name: "Вторник",     element: "Огонь",   emoji: "🔥", color: "#DC143C" },
    // ✅ ИСПРАВЛЕНО: было "" — теперь "💧"
    { name: "Среда",       element: "Вода",    emoji: "💧", color: "#1E3A5F" },
    { name: "Четверг",     element: "Дерево",  emoji: "🌿", color: "#228B22" },
    // ✅ ИСПРАВЛЕНО: было "" — теперь "🌍"
    { name: "Пятница",     element: "Земля",   emoji: "🌍", color: "#DAA520" },
    { name: "Суббота",     element: "Металл",  emoji: "⚙️", color: "#C0C0C0" },
  ];
  return days[dow];
}

export function getTCMDayRecs(date) {
  const info = getTCMDayInfo(date);
  const recs = {
    "Дерево": { do: "Планируй и начинай новые дела. Прогулки на природе. Кислые продукты.", avoid: "Подавляй гнев. Алкоголь. Поздние ужины." },
    "Огонь":  { do: "Общение, творчество, радость. Горькие травы. Лёгкая активность.", avoid: "Перегрев. Холодные напитки. Стрессы." },
    "Земля":  { do: "Домашние дела, кулинария. Тёплая пища. Забота о близких.", avoid: "Переедание. Сладкое в избытке. Беспокойство." },
    "Металл": { do: "Уборка, порядок, планирование. Дыхательные практики.", avoid: "Печаль. Холодная пища. Переохлаждение." },
    "Вода":   { do: "Медитация, отдых, планирование. Тёплые напитки. Ранний сон.", avoid: "Страх. Переохлаждение. Поздние ночи." },
  };
  return { ...info, ...(recs[info.element] || { do: "", avoid: "" }) };
}
