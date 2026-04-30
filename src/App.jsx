import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ── PWA: регистрация Service Worker для офлайн-режима ──────────
if("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(r => console.log("SW registered:", r.scope))
      .catch(e => console.log("SW error:", e));
  });
}

// ── Push-уведомления о дедлайнах ───────────────────────────────
async function requestNotificationPermission() {
  if(!("Notification" in window)) return false;
  if(Notification.permission === "granted") return true;
  const p = await Notification.requestPermission();
  return p === "granted";
}

function scheduleDeadlineNotifications(tasks) {
  if(!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then(reg => {
    if(reg.active) {
      reg.active.postMessage({ type: "CHECK_DEADLINES", tasks });
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  TELEGRAM INTEGRATION
// ══════════════════════════════════════════════════════════════
const tg = window.Telegram?.WebApp
const TG_USER = tg?.initDataUnsafe?.user
const TG_NAME = TG_USER?.first_name || null
function haptic(type = "light") { tg?.HapticFeedback?.impactOccurred(type) }
function hapticNotify(type = "success") { tg?.HapticFeedback?.notificationOccurred(type) }

// ══════════════════════════════════════════════════════════════
//  API — Gemini через Vercel serverless прокси (ключ спрятан)
// ══════════════════════════════════════════════════════════════
async function askClaude(system, user, maxTokens = 1200) {
  // Кэш на день — уникальный ключ по всему тексту запроса
  const today = new Date().toISOString().split("T")[0];
  let hash = 0;
  const str = user + system;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  const cacheKey = "ai_cache_" + today + "_" + Math.abs(hash);
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
  } catch {}
  try {
    const r = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, user, maxTokens }),
    });
    const d = await r.json();
    const text = d.text || "Не удалось получить ответ.";
    if (d.text) { try { localStorage.setItem(cacheKey, text); } catch {} }
    return text;
  } catch { return "Ошибка соединения с ИИ."; }
}

// ══════════════════════════════════════════════════════════════
//  STORAGE
// ══════════════════════════════════════════════════════════════
function useStorage(key, def) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
const toDay = (d = new Date()) => d.toISOString().split("T")[0];
const DAY_RU = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const MON_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

function getZodiac(dob) {
  if (!dob) return { name:"—", emoji:"⭐" };
  const d = new Date(dob), m = d.getMonth()+1, day = d.getDate();
  const z = [["Козерог","♑",12,22,1,19],["Водолей","♒",1,20,2,18],["Рыбы","♓",2,19,3,20],["Овен","♈",3,21,4,19],["Телец","♉",4,20,5,20],["Близнецы","♊",5,21,6,20],["Рак","♋",6,21,7,22],["Лев","♌",7,23,8,22],["Дева","♍",8,23,9,22],["Весы","⚖️",9,23,10,22],["Скорпион","♏",10,23,11,21],["Стрелец","♐",11,22,12,21]];
  for (const [name,emoji,sm,sd,em,ed] of z) { if ((m===sm&&day>=sd)||(m===em&&day<=ed)) return {name,emoji}; }
  return {name:"Козерог",emoji:"♑"};
}
function getEastern(dob) { if(!dob) return "—"; return ["Крыса","Бык","Тигр","Кролик","Дракон","Змея","Лошадь","Коза","Обезьяна","Петух","Собака","Свинья"][(new Date(dob).getFullYear()-4)%12]; }

// Стихия по году рождения (ТКМ: 五行 — пять первоэлементов)
function getChineseElement(dob) {
  if(!dob) return null;
  const year = new Date(dob).getFullYear();
  // Последняя цифра года определяет стихию и полярность
  const last = year % 10;
  const elements = [
    {name:"Металл", emoji:"⚙️", yin:false, organ:"Лёгкие / Толстый кишечник", season:"Осень", taste:"Острое", color:"Белый", virtue:"Справедливость"},
    {name:"Металл", emoji:"⚙️", yin:true,  organ:"Лёгкие / Толстый кишечник", season:"Осень", taste:"Острое", color:"Белый", virtue:"Справедливость"},
    {name:"Вода",   emoji:"💧", yin:false, organ:"Почки / Мочевой пузырь",    season:"Зима",  taste:"Солёное", color:"Чёрный/синий", virtue:"Мудрость"},
    {name:"Вода",   emoji:"💧", yin:true,  organ:"Почки / Мочевой пузырь",    season:"Зима",  taste:"Солёное", color:"Чёрный/синий", virtue:"Мудрость"},
    {name:"Дерево", emoji:"🌿", yin:false, organ:"Печень / Желчный пузырь",   season:"Весна", taste:"Кислое",  color:"Зелёный", virtue:"Доброта"},
    {name:"Дерево", emoji:"🌿", yin:true,  organ:"Печень / Желчный пузырь",   season:"Весна", taste:"Кислое",  color:"Зелёный", virtue:"Доброта"},
    {name:"Огонь",  emoji:"🔥", yin:false, organ:"Сердце / Тонкий кишечник",  season:"Лето",  taste:"Горькое", color:"Красный", virtue:"Любовь"},
    {name:"Огонь",  emoji:"🔥", yin:true,  organ:"Сердце / Тонкий кишечник",  season:"Лето",  taste:"Горькое", color:"Красный", virtue:"Любовь"},
    {name:"Земля",  emoji:"🌍", yin:false, organ:"Селезёнка / Желудок",       season:"Межсезонье", taste:"Сладкое", color:"Жёлтый", virtue:"Честность"},
    {name:"Земля",  emoji:"🌍", yin:true,  organ:"Селезёнка / Желудок",       season:"Межсезонье", taste:"Сладкое", color:"Жёлтый", virtue:"Честность"},
  ];
  return elements[last];
}

// Конституция по ТКМ (по сезону рождения — базовая)
function getTCMConstitution(dob) {
  if(!dob) return null;
  const m = new Date(dob).getMonth();
  if(m>=2&&m<=4) return {type:"Весенняя (Дерево)", desc:"Активная Ци, склонность к стрессу печени", foods:"Зелёные овощи, кислые продукты, проростки"};
  if(m>=5&&m<=7) return {type:"Летняя (Огонь)", desc:"Избыток Ян, жар сердца, энергичность", foods:"Горькие травы, красные продукты, охлаждающие блюда"};
  if(m>=8&&m<=10) return {type:"Осенняя (Металл)", desc:"Сухость лёгких, чёткость ума", foods:"Белые продукты, острые специи, груша, редис"};
  return {type:"Зимняя (Вода)", desc:"Глубокая Инь, сила почек, интуиция", foods:"Солёные продукты, чёрные бобы, морепродукты, орехи"};
}
function getTCMFullProfile(profile) {
  if(!profile.dob) return null;
  const el = getChineseElement(profile.dob);
  const cn = getTCMConstitution(profile.dob);

  // Определяем синдром на основе симптомов
  const syndromes = [];
  if(profile.tcmTemp?.includes("жарко")) syndromes.push("Избыток Ян / Жар");
  if(profile.tcmTemp?.includes("мёрзну")) syndromes.push("Недостаток Ян / Холод");
  if(profile.tcmMoisture?.includes("Отёки")) syndromes.push("Сырость-Слизь");
  if(profile.tcmMoisture?.includes("Сухость")) syndromes.push("Недостаток Инь / Сухость");
  if(profile.tcmMoisture?.includes("потливость")) syndromes.push("Неустойчивость защитной Ци");

  // Орган из часа рождения
  const birthOrgan = profile.birthHour ? profile.birthHour.split("—")[1]?.trim().replace("Нет","") : null;

  // Орган из эмоции
  const emotionOrgan = profile.tcmEmotion?.includes("Дерево") ? "Печень" :
    profile.tcmEmotion?.includes("Огонь") ? "Сердце" :
    profile.tcmEmotion?.includes("Земля") ? "Селезёнка/Желудок" :
    profile.tcmEmotion?.includes("Металл") ? "Лёгкие" :
    profile.tcmEmotion?.includes("Вода") ? "Почки" : null;

  // Орган из сна
  const sleepOrgan = profile.tcmSleep?.includes("1–3") ? "Печень" :
    profile.tcmSleep?.includes("3–5") ? "Лёгкие" :
    profile.tcmSleep?.includes("5–7") ? "Толстый кишечник" : null;

  // Орган из вкуса
  const tasteOrgan = profile.tcmTaste?.includes("Кислое") ? "Печень/Желчный пузырь" :
    profile.tcmTaste?.includes("Горькое") ? "Сердце" :
    profile.tcmTaste?.includes("Сладкое") ? "Селезёнка" :
    profile.tcmTaste?.includes("Острое") ? "Лёгкие" :
    profile.tcmTaste?.includes("Солёное") ? "Почки" : null;

  // Пищеварение
  const digestionNote = profile.tcmDigestion?.includes("Вздутие") ? "Застой Ци в Желудке" :
    profile.tcmDigestion?.includes("Тяжесть") ? "Недостаток Ян Селезёнки" :
    profile.tcmDigestion?.includes("Изжога") ? "Жар Желудка" :
    profile.tcmDigestion?.includes("Нестабильность") ? "Дисгармония Печени и Желудка" :
    profile.tcmDigestion?.includes("аппетита") ? "Недостаток Ци Селезёнки" : null;

  // Собираем уязвимые органы (можно несколько совпадений)
  const organs = [birthOrgan, emotionOrgan, sleepOrgan, tasteOrgan].filter(Boolean);
  const uniqueOrgans = [...new Set(organs)];

  // Рекомендации по питанию на основе синдромов
  let foodRecs = cn?.foods || "";
  if(syndromes.includes("Избыток Ян / Жар")) foodRecs += ". Избегай: острого, жареного, алкоголя. Добавь: огурец, арбуз, листовой салат, зелёный чай";
  if(syndromes.includes("Недостаток Ян / Холод")) foodRecs += ". Добавь: имбирь, корицу, тушёные блюда, тёплые супы. Избегай: сырого, холодного";
  if(syndromes.includes("Сырость-Слизь")) foodRecs += ". Избегай: молочного, сладкого, жирного. Добавь: редис, пшено, ячмень, имбирь";
  if(syndromes.includes("Недостаток Инь / Сухость")) foodRecs += ". Добавь: кунжут, мёд, груша, лилейный луковица, чёрный кунжут";

  return { el, cn, syndromes, birthOrgan, emotionOrgan, sleepOrgan, tasteOrgan, uniqueOrgans, digestionNote, foodRecs };
}
function calcDegree(name) { if(!name) return null; const ru="абвгдеёжзийклмнопрстуфхцчшщъыьэюя"; let s=0; for(const c of name.toLowerCase()){const i=ru.indexOf(c);if(i>=0)s+=i+1;} return s%360||360; }
function getMoon(dt=new Date()) { const p=((dt-new Date("2024-01-11"))/86400000%29.53+29.53)%29.53; if(p<1.85)return{n:"Новолуние",e:"🌑",t:"Начало — сей намерения"}; if(p<7.38)return{n:"Растущая",e:"🌒",t:"Рост — начинай новое"}; if(p<9.22)return{n:"Первая четверть",e:"🌓",t:"Действие — преодолевай"}; if(p<14.76)return{n:"Прибывающая",e:"🌔",t:"Сила — активно действуй"}; if(p<16.61)return{n:"Полнолуние",e:"🌕",t:"Пик — завершай"}; if(p<22.15)return{n:"Убывающая",e:"🌖",t:"Отдача — анализируй"}; if(p<23.99)return{n:"Последняя четверть",e:"🌗",t:"Итоги — очищай"}; return{n:"Тёмная луна",e:"🌘",t:"Отдых — переосмысли"}; }
function openGCal(title,date,desc="") { const s=new Date(date),e=new Date(s.getTime()+3600000),f=d=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(desc)}`,"_blank"); }

function isDue(task, today) {
  const last = task.lastDone, d = new Date(today);
  if (!task.freq) return false;
  if (task.freq==="daily") return last!==today;
  if (task.freq==="workdays") { const dn=d.getDay(); return dn>=1&&dn<=5&&last!==today; }
  if (task.freq.startsWith("weekly:")) { return task.freq.split(":")[1].split(",").map(Number).includes(d.getDay())&&last!==today; }
  if (task.freq.startsWith("every:")) { if(!last) return true; return Math.floor((d-new Date(last))/86400000)>=parseInt(task.freq.split(":")[1]); }
  if (task.freq.startsWith("monthly:")) { return task.freq.split(":")[1].split(",").map(Number).includes(d.getDate())&&last!==today; }
  return false;
}
function freqLabel(f) {
  if(!f||f==="once") return "разово"; if(f==="daily") return "ежедневно"; if(f==="workdays") return "пн–пт";
  if(f.startsWith("weekly:")) { const m={0:"вс",1:"пн",2:"вт",3:"ср",4:"чт",5:"пт",6:"сб"}; return f.split(":")[1].split(",").map(n=>m[n]).join(", "); }
  if(f.startsWith("every:")) return `каждые ${f.split(":")[1]} дн.`;
  if(f.startsWith("monthly:")) return `${f.split(":")[1]} числа`;
  return f;
}

function buildKB(p) {
  const age = p.dob ? new Date().getFullYear()-new Date(p.dob).getFullYear() : null;
  const freeFrom = p.workEnd || "18:00";
  const wakeTime = p.wake || "07:00";
  return `Ты — личный жизненный советник Life Diary. Говори тепло, как умный близкий друг. Конкретно и по делу. ВСЕГДА учитывай весь профиль при ответе.

ПРОФИЛЬ: ${p.name||"—"}, ${age?age+" лет":""}, ${p.gender||""}, ${p.city||""}
КАЗАХСТАН · ГОРОД: ${p.city||"—"} · ПОЛ: ${p.gender||"не указан"}
АСТРО: ${getZodiac(p.dob).name}, восточный знак-${getEastern(p.dob)}, хронотип: ${p.chronotype||"—"}, подъём-${wakeTime}, отбой-${p.sleep||"23:00"}
ЛИЧНОСТЬ: решения-${p.decisionStyle||"—"}, энергия из-${p.energySource||"—"}, планирование-${p.planningStyle||"—"}, ценность-${p.coreValue||"—"}
СТРЕСС: от-${(p.stressors||[]).join(",")||"—"}, восстановление-${(p.recovery||[]).join(",")||"—"}
РАБОТА: ${p.profession||"—"} в ${p.jobSphere||"—"}, формат-${p.workType||"—"}, график: ${p.workStart||"?"}–${p.workEnd||"?"}, дорога-${p.commuteTime||"нет"}
СВОБОДНОЕ ВРЕМЯ: с ${freeFrom} до ${p.sleep||"23:00"} (практики ТОЛЬКО в это время!)
ДОМ: ${p.homeType||"—"} ${p.homeArea||"?"}м², с: ${(p.livesWith||[]).join(",")||"один(а)"}, уборка: ${(p.cleanDays||[]).join(",")||"—"}
АВТО: ${p.hasCar==="Да"?p.carModel+" "+p.carYear+", пробег "+p.carMileage+" км, последнее ТО "+p.carLastTO+", резина "+p.carTireType:"нет"}
ПИТОМЦЫ: ${(p.pets||[]).map(pt=>`${pt.name}(${pt.type},${pt.feedTimes}х/д,еда:${pt.food||"—"})`).join(";")||"нет"}
ЗДОРОВЬЕ: зоны-${(p.healthFocus||[]).join(",")||"—"}, цель-${p.healthGoal||"—"}, хрон.-${p.chronic||"нет"}, спорт-${(p.sport||[]).join(",")||"—"}, практики-${(p.practices||[]).join(",")||"—"}
ПИТАНИЕ: ${p.nutrition||"обычное"}, цель-${p.healthGoal||p.mainGoal||"—"}, всегда дома-${(p.staples||[]).join(",")||"—"}, закупка-${p.shopDay||"—"}
СЕМЬЯ: ${(p.livesWith||["один(а)"]).join(", ")}, человек-${p.familySize||"1"}, дети-${p.childrenAges||"нет"}, особые потребности-${p.familyNeeds||"нет"}
УХОД: кожа-${p.skinType||"—"}, ${p.gender==="Мужской"?"борода-"+(p.beard||"—")+", барбер-"+(p.haircutFreq||"—"):"волосы-"+(p.hairType||"—")+", ногти-"+(p.nailFreq||"—")}, приоритет-${p.beautyPriority||"—"}
ХОББИ: ${(p.hobbies||[]).join(",")||"—"}, проект-${p.hobbyProject||"—"}
ЦЕЛИ: ${p.mainGoal||"—"}, вдохновляет-${p.workInspire||"—"}, истощает-${(p.workDrain||[]).join(",")||"—"}

ПРАВИЛА: 1) Никогда не предлагай занятия в рабочее время (${p.workStart||"9:00"}–${p.workEnd||"18:00"}). 2) Хронотип "сова" = поздние практики, "жаворонок" = ранние. 3) Уход — строго под тип кожи и волос. 4) Меню — под тип питания и сезон. 5) Йога/цигун/медитация — только после ${freeFrom}.

ЗНАНИЯ: Уборка-ежедневно(постель,посуда,мусор), еженедельно(пн-зеркала,вт-полы,ср-сантехника,чт-ванная,пт-холодильник,сб-бельё,вс-глажка), ежемесячно(окна,генуборка). Питомцы-вакцинация раз в год, антипаразит раз в 3 мес. Красота-маска лица 2р/нед, маска волос 1р/нед, скраб тела 2р/нед. Цигун-утренний комплекс 15мин, вечерний 10мин.`;
}

// ══════════════════════════════════════════════════════════════
//  DESIGN TOKENS
// ══════════════════════════════════════════════════════════════
const T = {
  bg0:"#F5F0E8", bg1:"#EDE8DC", bg2:"#E4DDD0", bg3:"#DDD5C5", bg4:"#D4CBB8",
  gold:"#2D6A4F", goldL:"#40916C", goldM:"#1B4332", goldD:"#B7D9C8",
  goldGlow:"rgba(45,106,79,0.12)",
  teal:"#1D4E6B", tealL:"#2E7DA8", tealD:"#BDD5E3",
  tealGlow:"rgba(29,78,107,0.10)",
  text0:"#1A1208", text1:"#2C2010", text2:"#5C4A30", text3:"#8C7A5A",
  success:"#2D6A4F", danger:"#8B2020", warn:"#7A5010", info:"#1D4E6B", purple:"#4A2D7A",
  bdr:"rgba(45,32,16,0.15)", bdrH:"rgba(45,32,16,0.40)", bdrS:"rgba(45,32,16,0.07)",
};

// ══════════════════════════════════════════════════════════════
//  GLOBAL CSS
// ══════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Cinzel:wght@400;500;600&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;1,300;1,400&family=JetBrains+Mono:wght@300;400;500&display=swap');

/* ── RESET & BASE ── */
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
html { height:100%; }
body {
  background:${T.bg0};
  color:${T.text0};
  font-family:'Crimson Pro', serif;
  font-size:19px;
  line-height:1.65;
  min-height:100vh;
  overflow-x:hidden;
}
input, select, textarea, button { font-family:'Crimson Pro', serif; }
::selection { background:rgba(45,106,79,0.2); color:${T.goldM}; }
::-webkit-scrollbar { width:4px; height:4px; }
::-webkit-scrollbar-track { background:${T.bg1}; }
::-webkit-scrollbar-thumb { background:${T.text3}; border-radius:2px; }
body::before {
  content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23paper)' opacity='0.08'/%3E%3C/svg%3E");
  background-repeat:repeat; background-size:300px 300px; opacity:0.6; mix-blend-mode:multiply;
}

/* ── AMBIENT GLOW ── */
.ambient {
  position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden;
}
.ambient::before {
  content:''; position:absolute;
  width:600px; height:600px; border-radius:50%;
  background:radial-gradient(circle, rgba(210,195,165,0.4) 0%, transparent 70%);
  top:-200px; left:-150px;
}
.ambient::after {
  content:''; position:absolute;
  width:500px; height:500px; border-radius:50%;
  background:radial-gradient(circle, rgba(180,200,185,0.3) 0%, transparent 70%);
  bottom:-150px; right:-100px;
}

/* ── LAYOUT ── */
.app { display:flex; min-height:100vh; position:relative; z-index:1; }

/* ── SIDEBAR ── */
.sidebar {
  width:72px;
  background:linear-gradient(180deg, ${T.bg2} 0%, ${T.bg3} 100%);
  border-right:1px solid ${T.bdr};
  display:flex; flex-direction:column; align-items:center;
  padding:16px 0 24px;
  position:fixed; top:0; left:0; bottom:0; z-index:100;
  gap:3px;
  box-shadow:2px 0 12px rgba(45,32,16,0.08);
}
.sidebar::after {
  content:''; position:absolute; top:0; right:0; bottom:0; width:1px;
  background:linear-gradient(180deg, transparent, ${T.gold}44, ${T.teal}33, transparent);
}

.s-logo {
  font-family:'Cinzel', serif;
  font-size:13px; letter-spacing:3px;
  color:${T.gold};
  padding:0 0 18px; margin-bottom:4px;
  border-bottom:1px solid ${T.bdr};
  width:100%; text-align:center;
  flex-shrink:0;
}

.s-nav {
  width:52px; height:52px; border-radius:14px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  cursor:pointer; transition:all .22s cubic-bezier(.4,0,.2,1);
  gap:3px; position:relative; flex-shrink:0;
}
.s-nav:hover { background:rgba(200,164,90,0.08); }
.s-nav.act {
  background:linear-gradient(135deg, rgba(200,164,90,0.14), rgba(78,201,190,0.07));
}
.s-nav.act::before {
  content:''; position:absolute; left:-16px; top:50%; transform:translateY(-50%);
  width:3px; height:28px;
  background:linear-gradient(180deg, ${T.gold}, ${T.teal});
  border-radius:0 3px 3px 0;
  box-shadow:0 0 12px ${T.gold}66;
}
.s-nav.dim { opacity:0.25; }
.s-ico { font-size:19px; line-height:1; }
.s-lbl {
  font-size:7px; color:${T.text3};
  font-family:'JetBrains Mono'; letter-spacing:.3px;
  text-align:center; line-height:1.2;
  transition:color .22s;
}
.s-nav:hover .s-lbl { color:${T.text2}; }
.s-nav.act .s-lbl { color:${T.gold}; }

/* ── MAIN ── */
.main { margin-left:72px; flex:1; display:flex; flex-direction:column; }

/* ── HEADER ── */
.hdr {
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 32px;
  border-bottom:1px solid ${T.bdr};
  position:sticky; top:0;
  background:linear-gradient(180deg, ${T.bg0}f0 0%, ${T.bg0}cc 100%);
  z-index:50; backdrop-filter:blur(20px);
}
.hdr-l {}
.hdr-title {
  font-family:'Cinzel', serif;
  font-size:14px; letter-spacing:3px;
  color:${T.gold};
  text-transform:uppercase;
}
.hdr-sub {
  font-family:'JetBrains Mono';
  font-size:11px; color:${T.text2};
  margin-top:2px; letter-spacing:.5px;
}
.hdr-r { display:flex; gap:10px; align-items:center; }

.moon-tag {
  display:flex; align-items:center; gap:7px;
  padding:6px 14px; border-radius:20px;
  background:rgba(78,201,190,0.07);
  border:1px solid rgba(78,201,190,0.18);
  font-family:'JetBrains Mono'; font-size:11px; color:${T.teal};
  letter-spacing:.3px;
}
.date-tag {
  padding:6px 14px; border-radius:20px;
  background:rgba(200,164,90,0.07);
  border:1px solid rgba(200,164,90,0.18);
  font-family:'JetBrains Mono'; font-size:11px; color:${T.goldM};
  letter-spacing:.5px;
}

/* ── PAGE ── */
.page { padding:28px 32px; flex:1; max-width:1000px; animation:pageIn .3s ease; }
@keyframes pageIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

/* ── CARDS ── */
.card {
  background:linear-gradient(135deg, ${T.bg1} 0%, ${T.bg2} 100%);
  border:1px solid ${T.bdr};
  border-radius:14px;
  box-shadow:0 2px 8px rgba(45,32,16,0.08), 0 1px 0 rgba(255,255,255,0.6) inset;
  padding:22px 24px;
  margin-bottom:14px;
  transition:border-color .22s, box-shadow .22s;
  position:relative; overflow:hidden;
}
.card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg, transparent, ${T.gold}22, transparent);
}
.card:hover { border-color:${T.bdrH}; box-shadow:0 4px 18px rgba(45,32,16,0.12); }

.card-accent {
  background:linear-gradient(135deg, rgba(45,106,79,0.08) 0%, rgba(29,78,107,0.05) 100%);
  border-color:rgba(45,106,79,0.25);
}
.card-accent::before { background:linear-gradient(90deg, transparent, ${T.gold}44, ${T.teal}22, transparent); }

.card-hd {
  display:flex; align-items:center; justify-content:space-between;
  margin-bottom:16px;
}
.card-title {
  font-family:'Cinzel', serif;
  font-size:12px; letter-spacing:2.5px; color:${T.gold};
  text-transform:uppercase;
  display:flex; align-items:center; gap:8px;
}
.card-acts { display:flex; gap:6px; align-items:center; }

/* ── SECTION DIVIDER ── */
.sec-lbl {
  font-family:'JetBrains Mono'; font-size:9px;
  color:${T.text3}; letter-spacing:3px;
  text-transform:uppercase;
  margin:20px 0 10px;
  display:flex; align-items:center; gap:10px;
}
.sec-lbl::after {
  content:''; flex:1; height:1px;
  background:linear-gradient(90deg, ${T.bdr}, transparent);
}

/* ── GRID ── */
.g2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.g3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
.g4 { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.gfull { grid-column:1/-1; }

/* ── STAT CARDS ── */
.stat {
  background:linear-gradient(135deg, ${T.bg1}, ${T.bg2});
  border:1px solid ${T.bdr};
  border-radius:14px; padding:16px 18px;
  position:relative; overflow:hidden;
  transition:all .22s;
}
.stat:hover { border-color:${T.bdrH}; }
.stat::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, ${T.gold}44, ${T.teal}22, transparent);
}
.stat-n {
  font-family:'Cormorant Infant', serif;
  font-size:34px; color:${T.gold};
  font-weight:300; line-height:1.1;
}
.stat-l {
  font-family:'JetBrains Mono'; font-size:9px;
  color:${T.text3}; letter-spacing:2px;
  margin-top:4px; text-transform:uppercase;
}
.stat-s { font-size:15px; color:${T.text2}; margin-top:3px; }

/* ── BUTTONS ── */
.btn {
  display:inline-flex; align-items:center; gap:7px;
  padding:10px 22px; border-radius:10px;
  font-family:'Cinzel', serif; font-size:11px;
  letter-spacing:1.5px; text-transform:uppercase;
  cursor:pointer; border:none;
  transition:all .22s cubic-bezier(.4,0,.2,1);
  white-space:nowrap; flex-shrink:0; position:relative;
}
.btn-primary {
  background:linear-gradient(135deg, ${T.gold} 0%, ${T.goldL} 100%);
  color:#fff; font-weight:600;
  box-shadow:0 2px 10px rgba(45,106,79,0.3);
}
.btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(45,106,79,0.4); }
.btn-primary:disabled { opacity:.45; transform:none; cursor:default; box-shadow:none; }

.btn-ghost {
  background:rgba(45,32,16,0.05);
  border:1px solid ${T.bdr};
  color:${T.text2};
}
.btn-ghost:hover { border-color:${T.bdrH}; color:${T.text0}; background:rgba(45,32,16,0.09); }

.btn-teal {
  background:linear-gradient(135deg, ${T.teal}, ${T.tealD});
  color:#fff; font-weight:600;
  box-shadow:0 2px 10px rgba(29,78,107,0.25);
}
.btn-teal:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(29,78,107,0.35); }
.btn-teal:disabled { opacity:.45; transform:none; cursor:default; }

.btn-danger {
  background:rgba(139,32,32,0.07);
  border:1px solid rgba(139,32,32,0.2);
  color:${T.danger};
}
.btn-danger:hover { background:rgba(139,32,32,0.14); }

.btn-sm { padding:6px 14px; font-size:9px; letter-spacing:1px; border-radius:8px; }
.btn-xs { padding:4px 10px; font-size:8.5px; border-radius:7px; }
.btn-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }

.ico-btn {
  width:30px; height:30px; border-radius:8px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; background:transparent;
  border:1px solid ${T.bdr}; font-size:13px;
  transition:all .18s; flex-shrink:0; color:${T.text3};
}
.ico-btn:hover { border-color:${T.bdrH}; color:${T.gold}; }
.ico-btn.danger:hover { border-color:rgba(200,80,80,.4); color:${T.danger}; }

/* ── INPUTS ── */
.fld { margin-bottom:16px; }
.fld label {
  display:block; font-family:'JetBrains Mono';
  font-size:11px; color:${T.text2};
  margin-bottom:6px; letter-spacing:2px; text-transform:uppercase;
}
.fld input, .fld select, .fld textarea {
  width:100%; padding:11px 15px;
  background:rgba(255,255,255,0.7);
  border:1px solid ${T.bdr};
  border-radius:10px;
  color:${T.text0};
  font-family:'Crimson Pro', serif; font-size:18px;
  outline:none; transition:border .2s, background .2s;
}
.fld input:focus, .fld select:focus, .fld textarea:focus {
  border-color:${T.gold}; background:rgba(255,255,255,0.95);
}
.fld select option { background:${T.bg1}; color:${T.text0}; }
.fld textarea { resize:vertical; min-height:72px; line-height:1.6; }
.fld-hint { font-size:14px; color:${T.text2}; margin-top:5px; line-height:1.5; }
.fld-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.fld-row3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }

/* ── CHIPS ── */
.chips { display:flex; flex-wrap:wrap; gap:7px; }
.chip {
  padding:8px 16px; border-radius:20px;
  border:1px solid ${T.bdr};
  cursor:pointer; font-size:16px;
  font-family:'Crimson Pro', serif;
  transition:all .18s; background:rgba(255,255,255,0.5);
  color:${T.text1}; white-space:nowrap; user-select:none;
  box-shadow:0 1px 3px rgba(45,32,16,0.08);
}
.chip:hover { border-color:${T.bdrH}; color:${T.text0}; background:rgba(255,255,255,0.8); }
.chip.on {
  border-color:${T.gold};
  color:${T.gold};
  background:rgba(45,106,79,0.1);
  box-shadow:0 1px 4px rgba(45,106,79,0.2);
}
.chip.on-t { border-color:${T.teal}; color:${T.teal}; background:rgba(29,78,107,0.08); }

/* ── BADGES ── */
.badge {
  display:inline-flex; align-items:center; gap:3px;
  padding:3px 10px; border-radius:10px;
  font-size:12px; font-family:'JetBrains Mono';
  white-space:nowrap; letter-spacing:.3px;
}
.bg  { background:rgba(45,106,79,0.12);  color:${T.gold};    border:1px solid rgba(45,106,79,0.25); }
.bt  { background:rgba(29,78,107,0.10);  color:${T.teal};    border:1px solid rgba(29,78,107,0.25); }
.br  { background:rgba(139,32,32,0.09);  color:${T.danger};  border:1px solid rgba(139,32,32,0.2); }
.bw  { background:rgba(122,80,16,0.09);  color:${T.warn};    border:1px solid rgba(122,80,16,0.2); }
.bgr { background:rgba(45,106,79,0.10);  color:${T.success}; border:1px solid rgba(45,106,79,0.22); }
.bm  { background:rgba(45,32,16,0.07);   color:${T.text2};   border:1px solid ${T.bdr}; }
.bi  { background:rgba(29,78,107,0.09);  color:${T.info};    border:1px solid rgba(29,78,107,0.22); }
.bp  { background:rgba(74,45,122,0.09);  color:${T.purple};  border:1px solid rgba(74,45,122,0.22); }

/* ── TASK ROWS ── */
.task-row {
  display:flex; align-items:flex-start; gap:10px;
  padding:10px 0;
  border-bottom:1px solid rgba(255,255,255,0.04);
  transition:background .18s;
}
.task-row:last-child { border-bottom:none; }
.task-row:hover { background:rgba(255,255,255,0.015); border-radius:8px; padding:10px 8px; margin:0 -8px; }

.chk {
  width:19px; height:19px; border-radius:5px;
  border:1px solid ${T.bdr};
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:all .18s; margin-top:3px; font-size:10px;
}
.chk:hover { border-color:${T.gold}66; }
.chk.done { border-color:${T.success}; background:${T.success}22; color:${T.success}; }

.task-body { flex:1; min-width:0; }
.task-name { font-size:18px; line-height:1.4; font-family:'Crimson Pro', serif; }
.task-name.done { text-decoration:line-through; color:${T.text3}; }
.task-meta { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; align-items:center; }
.task-notes { font-size:15px; color:${T.text2}; margin-top:3px; font-style:italic; }

.prio { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:6px; }
.ph { background:${T.danger}; box-shadow:0 0 6px ${T.danger}66; }
.pm { background:${T.warn}; }
.pl { background:${T.success}; }

/* ── AI BOX ── */
.ai-box {
  background:linear-gradient(135deg, rgba(45,106,79,0.06) 0%, rgba(29,78,107,0.04) 100%);
  border:1px solid rgba(45,32,16,0.18);
  border-radius:14px;
  box-shadow:0 2px 10px rgba(45,32,16,0.07); padding:22px 24px;
  margin-bottom:14px; position:relative;
}
.ai-box::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg, transparent, ${T.gold}66, ${T.teal}44, transparent);
  border-radius:14px 14px 0 0;
}
.ai-hd { display:flex; align-items:center; gap:8px; margin-bottom:13px; }
.ai-pulse {
  width:7px; height:7px; border-radius:50%; background:${T.teal};
  box-shadow:0 0 8px ${T.teal}; animation:pulse 2s ease infinite;
}
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.85)} }
.ai-lbl {
  font-family:'JetBrains Mono'; font-size:9px;
  color:${T.teal}; letter-spacing:2.5px; text-transform:uppercase;
}
.ai-text { font-size:16px; line-height:1.8; color:${T.text1}; white-space:pre-wrap; font-family:'Crimson Pro', serif; }
.ai-dim { color:${T.text2}; font-style:italic; font-size:16px; font-family:'Cormorant Infant', serif; }

/* ── AI CONTENT BLOCKS ── */
.ai-content { display:flex; flex-direction:column; gap:14px; margin-top:6px; }

.ai-header {
  display:flex; align-items:center; gap:10px;
  font-family:'Cormorant Infant', serif;
  font-size:20px; font-weight:600;
  color:${T.goldL};
  letter-spacing:.3px;
  padding:12px 16px;
  background:rgba(45,106,79,0.08);
  border-left:4px solid ${T.gold};
  border-radius:10px;
}
.ai-header-mark {
  font-size:14px; color:${T.gold}; opacity:.9;
}

.ai-list { display:flex; flex-direction:column; gap:10px; }

.ai-list-item {
  position:relative;
  padding:14px 16px 14px 44px;
  background:rgba(255,255,255,0.5);
  border:1px solid ${T.bdr};
  border-radius:10px;
  transition:all .2s;
}
.ai-list-item:hover {
  border-color:rgba(200,164,90,0.35);
  background:rgba(255,255,255,0.75);
}
.ai-list-num {
  position:absolute; top:14px; left:14px;
  width:22px; height:22px; border-radius:50%;
  background:${T.gold};
  color:#fff;
  display:flex; align-items:center; justify-content:center;
  font-family:'JetBrains Mono'; font-size:11px; font-weight:700;
  box-shadow:0 1px 4px rgba(200,164,90,0.3);
}
.ai-list-body { padding-left:0; }
.ai-list-title {
  font-family:'Cormorant Infant', serif;
  font-size:19px; font-weight:600;
  color:${T.text0};
  margin-bottom:5px;
  line-height:1.3;
}

.ai-list-text {
  font-family:'Crimson Pro', serif;
  font-size:17px; line-height:1.7;
  color:${T.text1};
}

.ai-paragraph {
  font-family:'Crimson Pro', serif;
  font-size:17px; line-height:1.75;
  color:${T.text1};
  padding:14px 16px;
  background:rgba(255,255,255,0.4);
  border-left:3px solid ${T.gold};
  border-radius:8px;
}

.ai-actions {
  margin-top:18px; padding-top:14px;
  border-top:1px solid ${T.bdr};
  display:flex; gap:8px; flex-wrap:wrap;
}


.ai-item-actions {
  margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;
}
.btn-mini {
  padding:5px 10px; font-size:11px;
  background:rgba(45,32,16,0.06);
  border:1px solid ${T.bdr};
  color:${T.text2};
  border-radius:8px; cursor:pointer;
  font-family:'JetBrains Mono'; letter-spacing:.3px;
  transition:all .15s;
}
.btn-mini:hover {
  background:rgba(200,164,90,0.2);
  border-color:rgba(200,164,90,0.5);
}
@media(max-width:380px) {
  .ai-list-item { padding:12px 14px 12px 38px; }
  .ai-list-num { width:20px; height:20px; font-size:10px; top:12px; left:12px; }
  .ai-list-title { font-size:17px; }
  .ai-list-text { font-size:15px; }
  .ai-header { font-size:19px; padding:10px 14px; }
  .s-nav { width:42px; height:48px; }
  .s-ico { font-size:17px; }
  .s-lbl { font-size:6px; }
}

/* ── ORNAMENTAL DIVIDER ── */
.ornament {
  display:flex; align-items:center; gap:12px;
  margin:6px 0; color:${T.goldD}; font-size:12px;
}
.ornament::before, .ornament::after {
  content:''; flex:1; height:1px;
  background:linear-gradient(90deg, transparent, ${T.bdr});
}
.ornament::after { background:linear-gradient(270deg, transparent, ${T.bdr}); }

/* ── MODAL ── */
.overlay {
  position:fixed; inset:0; z-index:200;
  background:rgba(5,8,15,0.88);
  display:flex; align-items:center; justify-content:center;
  padding:20px; backdrop-filter:blur(10px);
  animation:overlayIn .2s ease;
}
@keyframes overlayIn { from{opacity:0} to{opacity:1} }

.modal {
  background:linear-gradient(160deg, ${T.bg3} 0%, ${T.bg2} 100%);
  border:1px solid ${T.bdrH};
  border-radius:22px; padding:36px;
  max-width:620px; width:100%;
  max-height:88vh; overflow-y:auto;
  position:relative; animation:modalIn .25s cubic-bezier(.4,0,.2,1);
  box-shadow:0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,164,90,0.08);
}
@keyframes modalIn { from{transform:translateY(20px) scale(.97);opacity:0} to{transform:none;opacity:1} }
.modal::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, ${T.teal}66, ${T.gold}, ${T.teal}44);
  border-radius:22px 22px 0 0;
}
.modal-title {
  font-family:'Cinzel', serif; font-size:16px;
  letter-spacing:2px; color:${T.gold};
  margin-bottom:22px; text-transform:uppercase;
}
.modal-x {
  position:absolute; top:14px; right:14px;
  cursor:pointer; font-size:16px; color:${T.text3};
  width:30px; height:30px; display:flex; align-items:center; justify-content:center;
  border-radius:8px; transition:all .18s;
}
.modal-x:hover { color:${T.text0}; background:rgba(255,255,255,0.06); }
.modal-foot {
  display:flex; gap:9px; justify-content:flex-end;
  margin-top:22px; padding-top:18px; border-top:1px solid ${T.bdr};
}

/* ── ONBOARD ── */
.ob-wrap {
  min-height:100vh; display:flex; align-items:center; justify-content:center;
  padding:20px; position:relative;
  background:
    radial-gradient(ellipse 70% 50% at 15% 60%, rgba(200,164,90,0.07) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 20%, rgba(78,201,190,0.05) 0%, transparent 55%),
    ${T.bg0};
}
.ob-wrap::before {
  content:''; position:absolute; inset:0; z-index:0;
  background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C8A45A' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.ob-card {
  max-width:580px; width:100%;
  background:linear-gradient(160deg, ${T.bg3} 0%, ${T.bg2} 100%);
  border:1px solid ${T.bdrH};
  border-radius:24px; padding:44px 42px;
  position:relative; overflow:hidden;
  animation:fadeUp .4s cubic-bezier(.4,0,.2,1);
  box-shadow:0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(200,164,90,0.06);
  z-index:1;
}
@keyframes fadeUp { from{transform:translateY(24px);opacity:0} to{transform:none;opacity:1} }
.ob-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, ${T.teal}66, ${T.gold}, ${T.goldL}66, ${T.teal}44);
}
.ob-card::after {
  content:''; position:absolute; bottom:0; left:10%; right:10%; height:1px;
  background:linear-gradient(90deg, transparent, ${T.bdr}, transparent);
}

.ob-step {
  font-family:'JetBrains Mono'; font-size:9px;
  color:${T.goldD}; letter-spacing:3px;
  text-transform:uppercase; margin-bottom:6px;
}
.ob-bar { height:1px; background:${T.bdr}; margin-bottom:28px; position:relative; }
.ob-fill {
  position:absolute; top:0; left:0; height:100%;
  background:linear-gradient(90deg, ${T.gold}, ${T.teal}88);
  transition:width .45s cubic-bezier(.4,0,.2,1);
  box-shadow:0 0 8px ${T.gold}66;
}
.ob-title {
  font-family:'Cormorant Infant', serif; font-size:26px;
  color:${T.gold}; margin-bottom:6px; font-weight:400;
  line-height:1.3;
}
.ob-sub { font-size:15px; color:${T.text2}; margin-bottom:26px; line-height:1.6; }
.ob-foot { display:flex; gap:9px; justify-content:flex-end; margin-top:28px; }

/* Calculated preview box in onboarding */
.calc-preview {
  background:linear-gradient(135deg, rgba(200,164,90,0.08), rgba(78,201,190,0.05));
  border:1px solid rgba(200,164,90,0.2);
  border-radius:12px; padding:14px 18px;
  margin-bottom:20px;
  animation:fadeIn .3s ease;
}
@keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
.calc-row { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.calc-item {}
.calc-l { font-family:'JetBrains Mono'; font-size:8px; color:${T.text3}; letter-spacing:2px; margin-bottom:3px; text-transform:uppercase; }
.calc-v { font-family:'Cormorant Infant', serif; font-size:19px; color:${T.text0}; font-weight:400; }

/* ── TABS ── */
.tabs {
  display:flex; gap:2px;
  background:rgba(45,32,16,0.05);
  border:1px solid ${T.bdr};
  border-radius:12px; padding:4px;
  margin-bottom:20px;
  overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none;
}
.tabs::-webkit-scrollbar { display:none; }
.tab {
  padding:8px 16px; border-radius:9px;
  cursor:pointer; font-size:14px;
  font-family:'Crimson Pro', serif;
  color:${T.text2}; transition:all .18s;
  white-space:nowrap; flex-shrink:0; letter-spacing:.3px;
}
.tab:hover { color:${T.text0}; background:rgba(45,32,16,0.06); }
.tab.on { background:rgba(45,106,79,0.12); color:${T.gold}; font-weight:500; }

/* ── TOGGLE ── */
.tog {
  width:40px; height:22px; border-radius:11px;
  background:rgba(255,255,255,0.08); cursor:pointer;
  position:relative; transition:all .22s; flex-shrink:0;
  border:1px solid ${T.bdr};
}
.tog.on { background:linear-gradient(90deg, ${T.gold}cc, ${T.goldL}99); border-color:${T.gold}66; }
.tog-th {
  width:16px; height:16px; border-radius:50%; background:white;
  position:absolute; top:2px; left:2px; transition:all .22s;
  box-shadow:0 1px 4px rgba(0,0,0,0.4);
}
.tog.on .tog-th { left:20px; }

/* ── WEEK GRID ── */
.week-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; margin-bottom:14px; }
.wday {
  background:linear-gradient(180deg, ${T.bg3}, ${T.bg2});
  border:1px solid ${T.bdr};
  border-radius:12px; padding:10px 8px; min-height:110px;
  transition:border-color .18s;
}
.wday:hover { border-color:${T.bdrH}; }
.wday.today { border-color:rgba(200,164,90,0.35); background:linear-gradient(180deg, rgba(200,164,90,0.07), ${T.bg2}); }
.wday-hd { font-family:'JetBrains Mono'; font-size:9px; color:${T.text3}; text-align:center; margin-bottom:3px; letter-spacing:1px; }
.wday-n { font-family:'Cormorant Infant', serif; font-size:20px; text-align:center; margin-bottom:6px; color:${T.text2}; }
.wday-n.today-n { color:${T.gold}; }
.wtask {
  font-size:10px; padding:2px 6px; border-radius:5px; margin-bottom:2px;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  cursor:pointer; font-family:'Crimson Pro', serif;
}
.wtask.done { opacity:.35; text-decoration:line-through; }

/* ── PET CARD ── */
.pet-card {
  background:linear-gradient(135deg, rgba(78,201,190,0.08), rgba(200,164,90,0.04));
  border:1px solid rgba(78,201,190,0.2);
  border-radius:18px; padding:20px 22px; margin-bottom:12px;
}
.pet-ava {
  width:50px; height:50px; border-radius:50%;
  background:linear-gradient(135deg, ${T.teal}66, ${T.tealD});
  display:flex; align-items:center; justify-content:center;
  font-size:22px; flex-shrink:0;
  border:1px solid rgba(78,201,190,0.3);
}

/* ── TRIP CARD ── */
.trip-card {
  background:linear-gradient(135deg, rgba(90,142,200,0.08), rgba(200,164,90,0.04));
  border:1px solid rgba(90,142,200,0.2);
  border-radius:18px; padding:20px 22px; margin-bottom:12px;
}

/* ── HOBBY CARD ── */
.hobby-card {
  background:linear-gradient(135deg, rgba(140,90,200,0.08), rgba(78,201,190,0.04));
  border:1px solid rgba(140,90,200,0.2);
  border-radius:18px; padding:20px 22px; margin-bottom:12px;
}

/* ── PROGRESS ── */
.prog { height:4px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; }
.prog-fill { height:100%; border-radius:3px; transition:width .5s cubic-bezier(.4,0,.2,1); }

/* ── NOTIFICATION ── */
.notif {
  position:fixed; bottom:24px; right:24px; z-index:300;
  background:linear-gradient(135deg, ${T.bg4}, ${T.bg3});
  border:1px solid ${T.gold}55;
  border-radius:12px; padding:13px 18px;
  font-size:14px; font-family:'Crimson Pro', serif;
  animation:notifIn .3s cubic-bezier(.4,0,.2,1);
  max-width:320px;
  box-shadow:0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,164,90,0.1);
}
.notif::before {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg, transparent, ${T.gold}88, transparent);
  border-radius:12px 12px 0 0;
}
@keyframes notifIn { from{transform:translateX(110%);opacity:0} to{transform:none;opacity:1} }

/* ── PROFILE GRID ── */
.pf-item { }
.pf-l { font-family:'JetBrains Mono'; font-size:11px; color:${T.text2}; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px; }
.pf-v { font-family:'Cormorant Infant', serif; font-size:18px; color:${T.text0}; font-weight:400; line-height:1.3; }
.pf-s { font-size:15px; color:${T.text2}; margin-top:2px; font-family:'Crimson Pro', serif; }

/* ── EMPTY STATE ── */
.empty { text-align:center; padding:48px 24px; color:${T.text3}; }
.empty-ico { font-size:44px; display:block; margin-bottom:12px; }
.empty p { font-size:15px; font-family:'Cormorant Infant', serif; font-style:italic; }

/* ── MOOD PICKER ── */
.mood-pick { display:flex; gap:8px; }
.mood-btn {
  font-size:26px; cursor:pointer; padding:4px 8px;
  border-radius:10px; border:1px solid transparent;
  transition:all .18s;
}
.mood-btn.on { border-color:${T.gold}66; background:rgba(200,164,90,0.1); }
.mood-btn:hover { transform:scale(1.15); }

/* ── ENERGY ── */
.en-dot {
  width:32px; height:32px; border-radius:50%;
  border:1px solid ${T.bdr};
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  font-family:'JetBrains Mono'; font-size:11px; color:${T.text3};
  transition:all .18s;
}
.en-dot.on { border-color:${T.gold}88; background:rgba(200,164,90,0.15); color:${T.gold}; }

/* ── VIS ROW ── */
.vis-row {
  display:flex; align-items:center; justify-content:space-between;
  padding:11px 0; border-bottom:1px solid rgba(255,255,255,0.04);
}
.vis-row:last-child { border-bottom:none; }
.vis-name { font-size:16px; font-family:'Crimson Pro', serif; color:${T.text1}; }

/* ── FEEDING ── */
.feed-btn {
  cursor:pointer; padding:6px 14px; border-radius:8px; font-size:13px;
  border:1px solid ${T.bdr}; transition:all .18s;
  font-family:'Cinzel', serif; letter-spacing:1px; font-size:10px;
  color:${T.text3};
}
.feed-btn:hover { border-color:${T.bdrH}; }
.feed-btn.done { border-color:${T.teal}66; background:rgba(78,201,190,0.12); color:${T.teal}; }

/* ── DEGREE DISPLAY ── */
.degree-big {
  font-family:'Cormorant Infant', serif;
  font-size:80px; color:${T.gold}; line-height:1;
  font-weight:300; letter-spacing:-2px;
  text-shadow:0 0 40px rgba(200,164,90,0.3);
}

/* ── AI MORNING CARD ── */
.morning-card {
  background:linear-gradient(135deg,
    rgba(200,164,90,0.1) 0%,
    rgba(78,201,190,0.06) 50%,
    rgba(200,164,90,0.05) 100%);
  border:1px solid rgba(200,164,90,0.28);
  border-radius:22px; padding:26px 28px; margin-bottom:16px;
  position:relative; overflow:hidden;
}
.morning-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, ${T.gold}88, ${T.goldL}, ${T.teal}66);
}
.morning-card::after {
  content:'☀'; position:absolute; top:16px; right:20px;
  font-size:64px; opacity:.04; pointer-events:none;
}

/* ── RESPONSIVE ── */
@media(max-width:700px) {
  .sidebar { width:100%; height:56px; top:auto; bottom:0; left:0; right:0; flex-direction:row; padding:0 4px; border-right:none; border-top:1px solid ${T.bdr}; overflow-x:auto; overflow-y:hidden; justify-content:flex-start; gap:0; -webkit-overflow-scrolling:touch; box-shadow:0 -2px 10px rgba(45,32,16,0.08); }
  .sidebar::after { top:0; bottom:auto; left:0; right:0; width:auto; height:1px; background:linear-gradient(90deg, transparent, ${T.gold}44, ${T.teal}33, transparent); }
  .s-logo { display:none; }
  .s-nav { width:48px; height:48px; border-radius:10px; flex-shrink:0; }
  .s-nav.act::before { left:50%; top:auto; bottom:-2px; transform:translateX(-50%); width:24px; height:3px; background:linear-gradient(90deg, ${T.gold}, ${T.teal}); border-radius:3px 3px 0 0; }
  .main { margin-left:0; padding-bottom:60px; }
  .page { padding:12px 14px; }
  .hdr { padding:10px 14px; }
  .hdr-r { gap:6px; }
  .moon-tag,.date-tag { padding:5px 10px; font-size:10px; }
  .g2,.g3,.g4 { grid-template-columns:1fr; }
  .fld-row,.fld-row3 { grid-template-columns:1fr; }
  .week-grid { grid-template-columns:repeat(3,1fr); }
  .ob-card { padding:24px 16px; }
  .calc-row { grid-template-columns:1fr 1fr; }
  .overlay { padding:0; align-items:flex-end; }
  .modal { border-radius:22px 22px 0 0; max-height:92vh; width:100%; padding:28px 18px 36px; }
}
`;

// ══════════════════════════════════════════════════════════════
//  SECTIONS CONFIG
// ══════════════════════════════════════════════════════════════
const DEF_SECTIONS = [
  {id:"today",    emoji:"☀️",  name:"Сегодня",    vis:true},
  {id:"tasks",    emoji:"✅",  name:"Все дела",   vis:true},
  {id:"schedule", emoji:"🗓️",  name:"Расписание", vis:true},
  {id:"work",     emoji:"💼",  name:"Работа",     vis:true},
  {id:"home",     emoji:"🏡",  name:"Дом",        vis:true},
  {id:"shopping", emoji:"🛒",  name:"Покупки",    vis:true},
  {id:"pets",     emoji:"🐾",  name:"Питомцы",    vis:true},
  {id:"car",      emoji:"🚗",  name:"Авто",       vis:true},
  {id:"health",   emoji:"🌿",  name:"Здоровье",   vis:true},
  {id:"beauty",   emoji:"✨",  name:"Красота",    vis:true},
  {id:"hobbies",  emoji:"🎨",  name:"Хобби",      vis:true},
  {id:"goals",    emoji:"🎯",  name:"Мои цели",   vis:true},
  {id:"mental",   emoji:"🧘",  name:"Ментальное", vis:true},
  {id:"travel",   emoji:"✈️",  name:"Поездки",    vis:true},
  {id:"journal",  emoji:"📖",  name:"Журнал",     vis:true},
  {id:"profile",  emoji:"👤",  name:"Профиль",    vis:true},
];
// Адаптация текста под пол пользователя
function genderText(profile, female, male) {
  return profile.gender === "Мужской" ? male : female;
}
function genderPrompt(profile) {
  const g = profile.gender === "Мужской";
  return {
    free:   g ? "Свободен после" : "Свободна после",
    tired:  g ? "устал" : "устала",
    can:    g ? "могу" : "могу",
    name:   profile.name || (g ? "меня" : "меня"),
    he_she: g ? "он" : "она",
    his:    g ? "его" : "её",
    dear:   g ? profile.name||"друг" : profile.name||"подруга",
    suffix: g ? "й" : "я", // "рабочий"/"рабочая"
    gender: g ? "мужской" : "женский",
    address: g ? "Обращайся к пользователю как к мужчине, используй мужские окончания и формы (устал, готов, свободен, занят, увлечён и т.д.)" 
               : "Обращайся к пользователю как к женщине, используй женские окончания (устала, готова, свободна, занята, увлечена и т.д.)",
  };
}



// ══════════════════════════════════════════════════════════════
//  ONBOARDING
// ══════════════════════════════════════════════════════════════
const OB_STEPS = [
  {id:"welcome",  title:"Добро пожаловать",              sub:"Твой личный организатор жизни — знает тебя, думает за тебя, помогает всё успевать. Займёт 7–10 минут."},
  {id:"basic",    title:"Кто ты?",                       sub:"Самое главное — имя, дата рождения и место. Из этого рассчитываются знак зодиака, восточный знак и градус судьбы."},
  {id:"persona",  title:"Как ты устроен(а)?",            sub:"Не тест — честные вопросы о твоей природе. Чем точнее ответишь, тем лучше работают советы."},
  {id:"persona2", title:"Энергия и восстановление",      sub:"Как ты работаешь изнутри — откуда берутся силы и что их забирает."},
  {id:"schedule", title:"Твой ритм дня",                 sub:"Подъём, отбой, хронотип — выстроим всё расписание вокруг твоей природы."},
  {id:"work",     title:"Работа и карьера",              sub:"Чем занимаешься и что для тебя в этом важно."},
  {id:"work2",    title:"Рабочий распорядок",            sub:"Из чего состоит твой рабочий день — включим в общее расписание."},
  {id:"home",     title:"Твой дом",                      sub:"Тип жилья, кто с тобой живёт, растения — для правильного графика быта."},
  {id:"pets",     title:"Питомцы",                       sub:"Добавь всех — кормление, ветеринарные дела войдут в расписание автоматически."},
  {id:"health",   title:"Здоровье",                      sub:"Чтобы расписание строилось с заботой о тебе, а не вопреки."},
  {id:"tcm",      title:"ТКМ-диагностика",               sub:"5 вопросов для точного профиля по традиционной китайской медицине. Это позволит составить меню и рекомендации, идеально подходящие именно твоему телу."},
  {id:"beauty",   title:"Уход за собой",                 sub:"Уход за кожей и внешним видом — поставим в расписание."}, 
  {id:"shopping", title:"Продукты и покупки",            sub:"Когда и как закупаешься — напомним вовремя."},
  {id:"hobbies",  title:"Хобби и увлечения",             sub:"Твои увлечения заслуживают места в жизни — не только дела."},
  {id:"travel",   title:"Путешествия",                   sub:"Куда хочешь поехать? Поможем спланировать мягко, шаг за шагом."},
  {id:"goals",    title:"Цели",                          sub:"Чего хочешь достичь? Приложение будет напоминать и поддерживать."},
  {id:"done",     title:"Профиль готов",                 sub:"Теперь ты можешь положиться на Life Diary — он держит всё в голове вместо тебя."},
];

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({ pets:[], trips:[], hobbies:[] });
  const set = (k,v) => setD(p=>({...p,[k]:v}));
  const tog = (k,v) => { const a=d[k]||[]; set(k, a.includes(v)?a.filter(x=>x!==v):[...a,v]); };
  const s = OB_STEPS[step];
  const pct = (step/(OB_STEPS.length-1))*100;

  const addPet = () => set("pets",[...d.pets,{id:Date.now(),name:"",type:"Кошка",breed:"",dob:"",food:"",feedTimes:"2",weightKg:"",notes:"",vacDate:"",parasiteDate:""}]);
  const updPet = (id,k,v) => set("pets",d.pets.map(p=>p.id===id?{...p,[k]:v}:p));
  const delPet = id => set("pets",d.pets.filter(p=>p.id!==id));
  const addTrip = () => set("trips",[...d.trips,{id:Date.now(),destination:"",targetDate:"",budget:"",saved:"",stage:"💭 Мечта",notes:""}]);
  const updTrip = (id,k,v) => set("trips",d.trips.map(t=>t.id===id?{...t,[k]:v}:t));
  const delTrip = id => set("trips",d.trips.filter(t=>t.id!==id));

  const zodiac = d.dob ? getZodiac(d.dob) : null;
  const eastern = d.dob ? getEastern(d.dob) : null;
  const degree = d.fullName ? calcDegree(d.fullName) : null;
  const age = d.dob ? new Date().getFullYear()-new Date(d.dob).getFullYear() : null;

  return (
    <div className="ob-wrap">
      <div className="ob-card">
        <div className="ob-step">Шаг {step+1} из {OB_STEPS.length}</div>
        <div className="ob-bar"><div className="ob-fill" style={{width:pct+"%"}}/></div>
        <div className="ob-title">{s.title}</div>
        <div className="ob-sub">{s.sub}</div>

        {s.id==="welcome" && (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:56,marginBottom:16}}>📖</div>
            <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:16,color:T.text3,fontStyle:"italic",lineHeight:1.7}}>
              «Всё записано — ничего не потеряно»
            </div>
          </div>
        )}

        {s.id==="basic" && <>
          <div className="fld">
            <label>Имя — как тебя называть</label>
            <input placeholder="Мария" value={d.name||""} onChange={e=>set("name",e.target.value)}/>
          </div>
          <div className="fld">
            <label>Полное ФИО — для расчёта градуса судьбы</label>
            <input placeholder="Иванова Мария Петровна" value={d.fullName||""} onChange={e=>set("fullName",e.target.value)}/>
            <div className="fld-hint">Каждая буква имеет числовое значение — сумма определяет твой <span style={{color:T.gold}}>градус судьбы</span> (1–360°)</div>
          </div>
          <div className="fld-row">
            <div className="fld">
              <label>Дата рождения</label>
              <input type="date" value={d.dob||""} onChange={e=>set("dob",e.target.value)}/>
              <div className="fld-hint">Знак зодиака · Восточный знак · Слабые места здоровья</div>
            </div>
            <div className="fld">
              <label>Пол</label>
              <select value={d.gender||""} onChange={e=>set("gender",e.target.value)}>
                <option value="">—</option>
                <option>Женский</option><option>Мужской</option>
              </select>
              <div className="fld-hint">Советы по здоровью и красоте</div>
            </div>
          </div>

          {/* Live calculation preview */}
          {(d.dob||d.fullName) && (
            <div className="calc-preview">
              <div style={{fontFamily:"'JetBrains Mono'",fontSize:8,color:T.text3,letterSpacing:3,marginBottom:10,textTransform:"uppercase"}}>Рассчитано автоматически</div>
              <div className="calc-row">
                {zodiac && <div className="calc-item"><div className="calc-l">Знак зодиака</div><div className="calc-v">{zodiac.emoji} {zodiac.name}</div></div>}
                {eastern && <div className="calc-item"><div className="calc-l">Восточный знак</div><div className="calc-v">🐾 {eastern}</div></div>}
                {age && <div className="calc-item"><div className="calc-l">Возраст</div><div className="calc-v">{age} лет</div></div>}
                {degree && <div className="calc-item"><div className="calc-l">Градус судьбы</div><div className="calc-v" style={{color:T.gold,fontSize:22}}>{degree}°</div></div>}
              </div>
            </div>
          )}

          <div className="fld-row">
            <div className="fld">
              <label>Город</label>
              <input placeholder="Москва" value={d.city||""} onChange={e=>set("city",e.target.value)}/>
            </div>
            <div className="fld">
              <label>Часовой пояс</label>
              <select value={d.tz||""} onChange={e=>set("tz",e.target.value)}>
                <option value="">—</option>
                {["UTC+5 Актобе, Атырау, Западный Казахстан","UTC+6 Алматы, Нур-Султан, Шымкент, Восточный Казахстан"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </>}

        {s.id==="persona" && <>
          {[
            ["Как принимаешь решения?","decisionStyle",["Логика и анализ","Интуиция и чувства","Советуюсь с другими","Смотрю на факты","Долго взвешиваю"],false],
            ["Откуда берёшь энергию?","energySource",["Из общения","Из одиночества","Из движения","Из творчества","Из природы","Из порядка"],false],
            ["Отношение к планированию","planningStyle",["Люблю чёткий план","Предпочитаю гибкость","Скелет + свобода","Планы сковывают меня"],false],
            ["Отношение к порядку","orderStyle",["Порядок = спокойствие","Творческий беспорядок норма","Часть в порядке","Хочу порядка, но не всегда"],false],
            ["Главная ценность","coreValue",["Свобода","Безопасность","Развитие","Любовь","Достижения","Гармония","Творчество","Здоровье"],false],
          ].map(([label,key,opts])=>(
            <div className="fld" key={key}>
              <label>{label}</label>
              <div className="chips">{opts.map(v=><div key={v} className={`chip ${d[key]===v?"on":""}`} onClick={()=>set(key,v)}>{v}</div>)}</div>
            </div>
          ))}
          <div className="fld"><label>Что тебя мотивирует?</label><input placeholder="Видеть результат, похвала, интерес, деньги..." value={d.motivates||""} onChange={e=>set("motivates",e.target.value)}/></div>
        </>}

        {s.id==="persona2" && <>
          {[
            ["Что выбивает из колеи?","stressors",["Неопределённость","Много задач сразу","Конфликты","Нехватка времени","Усталость","Критика","Хаос","Сложные решения","Шум и суета"],true],
            ["Как восстанавливаешься?","recovery",["Сон и тишина","Прогулка на природе","Общение с близкими","Любимое хобби","Спорт и движение","Уход за собой","Вкусная еда","Кино / книга","Музыка","Медитация","Горячая ванна","Время в одиночестве","Творчество","Путешествие"],true],
          ].map(([label,key,opts])=>(
            <div className="fld" key={key}>
              <label>{label}</label>
              <div className="chips">{opts.map(v=><div key={v} className={`chip ${(d[key]||[]).includes(v)?"on":""}`} onClick={()=>tog(key,v)}>{v}</div>)}</div>
            </div>
          ))}
          {[
            ["Уровень энергии сейчас","stressLevel",d.gender==="Мужской"?["Полон сил","В балансе","Немного устал","Нужна подзарядка"]:["Полна сил","В балансе","Немного устала","Нужна подзарядка"]],
            ["Отношение к своему телу","bodyRelation",["Люблю и забочусь","Хочу больше внимания","Стремлюсь к гармонии","Учусь принимать себя"]],
            ["Отношение ко времени","timeStyle",["Планирую заранее","Умею расставлять приоритеты","Живу в моменте","Учусь управлять временем"]],
          ].map(([label,key,opts])=>(
            <div className="fld" key={key}>
              <label>{label}</label>
              <div className="chips">{opts.map(v=><div key={v} className={`chip ${d[key]===v?"on":""}`} onClick={()=>set(key,v)}>{v}</div>)}</div>
            </div>
          ))}
        </>}

        {s.id==="schedule" && <>
          <div className="fld-row">
            <div className="fld"><label>Подъём</label><input type="time" value={d.wake||"07:00"} onChange={e=>set("wake",e.target.value)}/></div>
            <div className="fld"><label>Отбой</label><input type="time" value={d.sleep||"23:00"} onChange={e=>set("sleep",e.target.value)}/></div>
          </div>
          <div className="fld"><label>Хронотип</label>
            <div className="chips">{["🌅 Жаворонок — пик до полудня","🕊️ Голубь — пик с 10 до 16","🦉 Сова — пик после 16"].map(v=><div key={v} className={`chip ${d.chronotype===v?"on":""}`} onClick={()=>set("chronotype",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Минут в день на себя (уход, хобби, практики)</label>
            <div className="chips">{["15","30","45","60","90+"].map(v=><div key={v} className={`chip ${d.selfTime===v?"on":""}`} onClick={()=>set("selfTime",v)}>{v} мин</div>)}</div>
          </div>
          <div className="fld"><label>Качество сна</label>
            <div className="chips">{["Отличное","Хорошее","Среднее","Плохое"].map(v=><div key={v} className={`chip ${d.sleepQuality===v?"on":""}`} onClick={()=>set("sleepQuality",v)}>{v}</div>)}</div>
          </div>
        </>}

        {s.id==="work" && <>
          <div className="fld-row">
            <div className="fld"><label>Профессия / должность</label><input placeholder="Менеджер, дизайнер, врач..." value={d.profession||""} onChange={e=>set("profession",e.target.value)}/></div>
            <div className="fld"><label>Сфера</label><input placeholder="IT, медицина, образование..." value={d.jobSphere||""} onChange={e=>set("jobSphere",e.target.value)}/></div>
          </div>
          <div className="fld"><label>Формат занятости</label>
            <div className="chips">{["Офис","Удалёнка","Гибрид","Фриланс","Своё дело","Учусь","Декрет / не работаю"].map(v=><div key={v} className={`chip ${d.workType===v?"on":""}`} onClick={()=>set("workType",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Что на работе забирает энергию?</label>
            <div className="chips">{["Много встреч","Однообразие","Дедлайны","Конфликты","Переработки","Скучные задачи","Неопределённость"].map(v=><div key={v} className={`chip ${(d.workDrain||[]).includes(v)?"on":""}`} onClick={()=>tog("workDrain",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Что вдохновляет в работе?</label><input placeholder="Результат, команда, творчество, признание, деньги, свобода..." value={d.workInspire||""} onChange={e=>set("workInspire",e.target.value)}/></div>
          <div className="fld"><label>Рабочая цель</label>
            <div className="chips">{["Карьерный рост","Повышение дохода","Сменить профессию","Своё дело","Работать меньше","Прокачать навыки","Стабильность"].map(v=><div key={v} className={"chip "+(d.careerGoal===v?"on":"")} onClick={()=>set("careerGoal",v)}>{v}</div>)}</div>
          </div>
          <div className="fld">
            <label>Профессиональные отчёты и дедлайны</label>
            <div className="fld-hint">Выбери свою специализацию — нужные дедлайны добавятся в рабочие задачи автоматически</div>
            <div className="chips">{["Бухгалтер / ИП","HR / Кадры","Юрист","Врач / Мед. работник","Педагог","Госслужащий","Нет отчётности"].map(v=><div key={v} className={"chip "+(d.profDeadlines===v?"on":"")} onClick={()=>set("profDeadlines",v)}>{v}</div>)}</div>
          </div>
        </>}

        {s.id==="work2" && <>
          <div className="fld-row">
            <div className="fld"><label>Начало работы</label><input type="time" value={d.workStart||"09:00"} onChange={e=>set("workStart",e.target.value)}/></div>
            <div className="fld"><label>Конец работы</label><input type="time" value={d.workEnd||"18:00"} onChange={e=>set("workEnd",e.target.value)}/></div>
          </div>
          <div className="fld"><label>Рабочие дни</label>
            <div className="chips">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((v,i)=><div key={v} className={`chip ${(d.workDaysList||[1,2,3,4,5]).includes(i+1)?"on":""}`} onClick={()=>{const c=d.workDaysList||[1,2,3,4,5]; set("workDaysList",c.includes(i+1)?c.filter(x=>x!==i+1):[...c,i+1]);}}>{v}</div>)}</div>
          </div>
          <div className="fld-row">
            <div className="fld"><label>Обед</label><input type="time" value={d.lunchTime||"13:00"} onChange={e=>set("lunchTime",e.target.value)}/></div>
            <div className="fld"><label>Длительность обеда</label><input type="number" placeholder="60 мин" value={d.lunchDur||""} onChange={e=>set("lunchDur",e.target.value)}/></div>
          </div>
          <div className="fld"><label>Дорога до работы</label>
            <div className="chips">{["Дома","5–15 мин","15–30 мин","30–60 мин","60+ мин"].map(v=><div key={v} className={`chip ${d.commuteTime===v?"on":""}`} onClick={()=>set("commuteTime",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Транспорт</label>
            <div className="chips">{["Пешком","Метро","Автобус","Машина","Велосипед","Такси"].map(v=><div key={v} className={`chip ${d.commuteWay===v?"on":""}`} onClick={()=>set("commuteWay",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Регулярные рабочие задачи</label>
            <div className="chips">{["Отчёты","Встречи","Звонки","Контент","Почта","Документы","Обучение","Аналитика"].map(v=><div key={v} className={`chip ${(d.workRoutines||[]).includes(v)?"on":""}`} onClick={()=>tog("workRoutines",v)}>{v}</div>)}</div>
          </div>
        </>}

        {s.id==="home" && <>
          <div className="fld-row">
            <div className="fld"><label>Тип жилья</label>
              <div className="chips">{["Квартира","Дом","Комната","Студия"].map(v=><div key={v} className={`chip ${d.homeType===v?"on":""}`} onClick={()=>set("homeType",v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Площадь (м²)</label><input type="number" placeholder="45" value={d.homeArea||""} onChange={e=>set("homeArea",e.target.value)}/></div>
          </div>
          <div className="fld-row">
            <div className="fld"><label>Спален</label><input type="number" placeholder="1" min="0" max="10" value={d.bedrooms||""} onChange={e=>set("bedrooms",e.target.value)}/></div>
            <div className="fld"><label>Санузлов</label><input type="number" placeholder="1" min="0" max="5" value={d.bathrooms||""} onChange={e=>set("bathrooms",e.target.value)}/></div>
          </div>
          <div className="fld">
            <label>Помещения</label>
            <div className="chips">{["Кухня","Гостиная","Коридор","Балкон","Кабинет","Детская","Кладовка","Гараж"].map(v=><div key={v} className={`chip ${(d.homeRooms||[]).includes(v)?"on":""}`} onClick={()=>tog("homeRooms",v)}>{v}</div>)}</div>
          </div>
          <div className="fld-row">
            <div className="fld"><label>Комнат</label><input type="number" placeholder="2" value={d.rooms||""} onChange={e=>set("rooms",e.target.value)}/></div>
            <div className="fld"><label>Живёшь с</label>
              <div className="chips">{["Один(а)","Партнёр","Дети","Родители","Соседи"].map(v=><div key={v} className={`chip ${(d.livesWith||[]).includes(v)?"on":""}`} onClick={()=>tog("livesWith",v)}>{v}</div>)}</div>
            </div>
          </div>
          <div className="fld"><label>Растения</label>
            <div className="chips">{["Нет","1–3","4–10","Много — полив каждый день"].map(v=><div key={v} className={`chip ${d.plants===v?"on":""}`} onClick={()=>set("plants",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Удобные дни для уборки</label>
            <div className="chips">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(v=><div key={v} className={`chip ${(d.cleanDays||[]).includes(v)?"on":""}`} onClick={()=>tog("cleanDays",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Помощь по хозяйству</label>
            <div className="chips">{["Только я","Помогает партнёр","Делим поровну","Приходит помощница"].map(v=><div key={v} className={`chip ${d.houseHelp===v?"on":""}`} onClick={()=>set("houseHelp",v)}>{v}</div>)}</div>
          </div>
          {/* Автомобиль */}
          <div className="fld">
            <label>Есть автомобиль?</label>
            <div className="chips">{["Нет","Да"].map(v=><div key={v} className={"chip "+(d.hasCar===v?"on":"")} onClick={()=>set("hasCar",v)}>{v}</div>)}</div>
          </div>
          {d.hasCar==="Да"&&<>
            <div className="fld-row">
              <div className="fld"><label>Марка и модель</label><input placeholder="Toyota Camry..." value={d.carModel||""} onChange={e=>set("carModel",e.target.value)}/></div>
              <div className="fld"><label>Год выпуска</label><input type="number" placeholder="2020" value={d.carYear||""} onChange={e=>set("carYear",e.target.value)}/></div>
            </div>
            <div className="fld-row">
              <div className="fld"><label>Пробег сейчас (км)</label><input type="number" placeholder="45000" value={d.carMileage||""} onChange={e=>set("carMileage",e.target.value)}/></div>
              <div className="fld"><label>Последнее ТО (дата)</label><input type="date" value={d.carLastTO||""} onChange={e=>set("carLastTO",e.target.value)}/></div>
            </div>
            <div className="fld"><label>Тип резины сейчас</label>
              <div className="chips">{["Летняя","Зимняя","Всесезонная"].map(v=><div key={v} className={"chip "+(d.carTireType===v?"on":"")} onClick={()=>set("carTireType",v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Когда меняли резину</label>
              <input type="month" value={d.carTireDate||""} onChange={e=>set("carTireDate",e.target.value)} placeholder="2023-10"/>
            </div>
            <div className="fld"><label>Страховка (срок окончания)</label>
              <input type="date" value={d.carInsurance||""} onChange={e=>set("carInsurance",e.target.value)}/>
            </div>
            <div className="fld"><label>Техосмотр (срок окончания)</label>
              <input type="date" value={d.carTechCheck||""} onChange={e=>set("carTechCheck",e.target.value)}/>
            </div>
          </>}
        </>}

        {s.id==="pets" && <>
          <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:15,color:T.text3,fontStyle:"italic",marginBottom:16,lineHeight:1.7}}>
            Каждый питомец — это кормление, ветеринарные визиты, обработки. Добавь всех — всё попадёт в расписание автоматически.
          </div>
          {(d.pets||[]).map((pet,i)=>(
            <div key={pet.id} style={{background:"rgba(78,201,190,0.06)",border:"1px solid rgba(78,201,190,0.18)",borderRadius:14,padding:18,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:T.teal,letterSpacing:3}}>ПИТОМЕЦ {i+1}</span>
                <div className="ico-btn danger" onClick={()=>delPet(pet.id)}>✕</div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Кличка</label><input placeholder="Мурка" value={pet.name} onChange={e=>updPet(pet.id,"name",e.target.value)}/></div>
                <div className="fld"><label>Вид</label>
                  <select value={pet.type} onChange={e=>updPet(pet.id,"type",e.target.value)}>
                    {["Кошка","Собака","Попугай","Кролик","Хомяк","Черепаха","Рыбки","Другое"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Порода</label><input value={pet.breed} onChange={e=>updPet(pet.id,"breed",e.target.value)}/></div>
                <div className="fld"><label>Дата рождения</label><input type="date" value={pet.dob} onChange={e=>updPet(pet.id,"dob",e.target.value)}/></div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Корм</label><input placeholder="Royal Canin..." value={pet.food} onChange={e=>updPet(pet.id,"food",e.target.value)}/></div>
                <div className="fld"><label>Вес питомца (кг)</label><input type="number" step="0.1" placeholder="4.5" value={pet.weightKg||""} onChange={e=>updPet(pet.id,"weightKg",e.target.value)}/></div>
                <div className="fld"><label>Кормлений в день</label>
                  <div className="chips">{["1","2","3","4"].map(v=><div key={v} className={`chip ${pet.feedTimes===v?"on":""}`} onClick={()=>updPet(pet.id,"feedTimes",v)}>{v}</div>)}</div>
                </div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Последняя вакцинация</label><input type="date" value={pet.vacDate} onChange={e=>updPet(pet.id,"vacDate",e.target.value)}/></div>
                <div className="fld"><label>Антипаразитарная</label><input type="date" value={pet.parasiteDate} onChange={e=>updPet(pet.id,"parasiteDate",e.target.value)}/></div>
              </div>
              <div className="fld"><label>Особенности / болезни</label><input value={pet.notes} onChange={e=>updPet(pet.id,"notes",e.target.value)}/></div>
            </div>
          ))}
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={addPet}>+ Добавить питомца</button>
            {d.pets.length===0&&<span style={{fontSize:14,color:T.text3,fontStyle:"italic"}}>Нет питомцев — просто продолжи</span>}
          </div>
        </>}

        {s.id==="health" && <>
          <div className="fld"><label>Зоны здоровья — на что обращаешь внимание</label>
            <div className="chips">{["Сердце","ЖКТ","Суставы и спина","Нервная система","Гормоны","Кожа","Зрение","Иммунитет","Вес","Давление"].map(v=><div key={v} className={`chip ${(d.healthFocus||[]).includes(v)?"on":""}`} onClick={()=>tog("healthFocus",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Хронические заболевания</label><input placeholder="Нет / гастрит / гипертония..." value={d.chronic||""} onChange={e=>set("chronic",e.target.value)}/></div>
          <div className="fld"><label>Главная цель по здоровью</label>
            <div className="chips">{["Похудеть","Набрать мышцы","Больше энергии","Улучшить сон","Снизить стресс","Лечение","Просто поддерживать"].map(v=><div key={v} className={`chip ${d.healthGoal===v?"on":""}`} onClick={()=>set("healthGoal",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Физическая активность</label>
            <div className="chips">{(d.gender==="Мужской"?["Не занимаюсь","Тренажёр","Бег","Плавание","Велосипед","Единоборства","Футбол","Баскетбол","Йога","Цигун","Прогулки","Туризм","Лыжи","Теннис"]:["Не занимаюсь","Прогулки","Йога","Цигун","Тренажёр","Бег","Плавание","Танцы","Велосипед","Пилатес","Стретчинг"]).map(v=><div key={v} className={`chip ${(d.sport||[]).includes(v)?"on":""}`} onClick={()=>tog("sport",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Практики</label>
            <div className="chips">{["Нет","Медитация","Цигун","Дыхательные","Молитва","Аффирмации","Ведение дневника"].map(v=><div key={v} className={`chip ${(d.practices||[]).includes(v)?"on":""}`} onClick={()=>tog("practices",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Питание</label>
            <div className="chips">{["Обычное","Вегетарианское","Веганское","Без глютена","Кето","Интервальное","ПП"].map(v=><div key={v} className={`chip ${d.nutrition===v?"on":""}`} onClick={()=>set("nutrition",v)}>{v}</div>)}</div>
          </div>
        </>}

        {s.id==="tcm" && <>
          <div style={{padding:"12px 16px",background:"rgba(45,106,79,0.08)",borderRadius:12,marginBottom:20,fontSize:14,color:T.text2,lineHeight:1.6,borderLeft:"3px solid "+T.gold}}>
            {d.dob && (()=>{
              const el=getChineseElement(d.dob);
              const cn=getTCMConstitution(d.dob);
              return el ? <span>По году рождения твоя стихия — <strong style={{color:T.gold}}>{el.emoji} {el.name} ({el.yin?"Инь":"Ян"})</strong>. Эти вопросы уточнят твой индивидуальный ТКМ-профиль.</span> : null;
            })()}
            {!d.dob && <span>Ответь на вопросы — это позволит составить персональные рекомендации по питанию и здоровью на основе ТКМ.</span>}
          </div>

          {/* 1. Час рождения */}
          <div className="fld">
            <label>Примерный час рождения</label>
            <div className="fld-hint">Определяет главный меридиан и тип Ци</div>
            <div className="chips">{[
              "🌙 Ночь (23–01) — Желчный пузырь",
              "🌑 Глубокая ночь (01–03) — Печень",
              "🌒 Ранее утро (03–05) — Лёгкие",
              "🌅 Рассвет (05–07) — Толстый кишечник",
              "☀️ Утро (07–09) — Желудок",
              "🌤 Позднее утро (09–11) — Селезёнка",
              "💛 Полдень (11–13) — Сердце",
              "🌞 День (13–15) — Тонкий кишечник",
              "🌇 Послеполуденное (15–17) — Мочевой пузырь",
              "🌆 Ранний вечер (17–19) — Почки",
              "🌃 Вечер (19–21) — Перикард",
              "🌙 Поздний вечер (21–23) — Тройной обогреватель",
              "❓ Не знаю",
            ].map(v=><div key={v} className={"chip "+(d.birthHour===v?"on":"")} onClick={()=>set("birthHour",v)}>{v}</div>)}</div>
          </div>

          {/* 2. Ощущение температуры */}
          <div className="fld">
            <label>Как ты обычно себя чувствуешь по температуре тела?</label>
            <div className="fld-hint">Диагностика Инь/Ян дисбаланса</div>
            <div className="chips">{[
              "🥵 Часто жарко, потею",
              "🥶 Часто мёрзну, руки/ноги холодные",
              "🌡 Бывает и так, и так",
              "✅ Обычно комфортно",
            ].map(v=><div key={v} className={"chip "+(d.tcmTemp===v?"on":"")} onClick={()=>set("tcmTemp",v)}>{v}</div>)}</div>
          </div>

          {/* 3. Влажность/сухость */}
          <div className="fld">
            <label>Какие симптомы сухости или влажности замечаешь?</label>
            <div className="fld-hint">Определяет тип Сырость/Сухость по ТКМ</div>
            <div className="chips">{[
              "💧 Отёки, тяжесть, слизь — влажность",
              "🏜 Сухость кожи, губ, глаз — сухость",
              "😓 Избыточная потливость",
              "🌿 Нормально, ничего особенного",
              "🤔 Сложно сказать",
            ].map(v=><div key={v} className={"chip "+(d.tcmMoisture===v?"on":"")} onClick={()=>set("tcmMoisture",v)}>{v}</div>)}</div>
          </div>

          {/* 4. Эмоциональный паттерн */}
          <div className="fld">
            <label>Какие эмоции преобладают в твоей жизни?</label>
            <div className="fld-hint">Каждая стихия связана с определёнными эмоциями</div>
            <div className="chips">{[
              "😤 Раздражение, гнев, нетерпение — Дерево",
              "😰 Тревога, суета, перевозбуждение — Огонь",
              "😟 Беспокойство, навязчивые мысли — Земля",
              "😢 Печаль, грусть, ностальгия — Металл",
              "😨 Страх, неуверенность, изоляция — Вода",
              "😊 В целом гармонично",
            ].map(v=><div key={v} className={"chip "+(d.tcmEmotion===v?"on":"")} onClick={()=>set("tcmEmotion",v)}>{v}</div>)}</div>
          </div>

          {/* 5. Пищевые предпочтения */}
          <div className="fld">
            <label>Что тянет есть чаще всего?</label>
            <div className="fld-hint">Тяга к определённому вкусу — сигнал органа</div>
            <div className="chips">{[
              "🍋 Кислое (лимон, уксус, квашеное) — Печень",
              "🌶 Горькое (кофе, шоколад тёмный) — Сердце",
              "🍬 Сладкое (хлеб, сахар, фрукты) — Селезёнка",
              "🧂 Острое и пряное (специи, имбирь) — Лёгкие",
              "🥓 Солёное (соленья, сыр, морепродукты) — Почки",
              "🤷 Всё одинаково",
            ].map(v=><div key={v} className={"chip "+(d.tcmTaste===v?"on":"")} onClick={()=>set("tcmTaste",v)}>{v}</div>)}</div>
          </div>

          {/* 6. Сон */}
          <div className="fld">
            <label>Особенности сна по ТКМ</label>
            <div className="fld-hint">Время пробуждения указывает на орган требующий внимания</div>
            <div className="chips">{[
              "⏰ Просыпаюсь в 1–3 ночи — Печень",
              "⏰ Просыпаюсь в 3–5 утра — Лёгкие",
              "⏰ Просыпаюсь в 5–7 утра — Толстый кишечник",
              "💤 Сплю крепко всю ночь",
              "😴 Засыпаю с трудом, долго",
              "🥱 Сонливость днём, усталость",
            ].map(v=><div key={v} className={"chip "+(d.tcmSleep===v?"on":"")} onClick={()=>set("tcmSleep",v)}>{v}</div>)}</div>
          </div>

          {/* 7. Пищеварение */}
          <div className="fld">
            <label>Как работает пищеварение?</label>
            <div className="fld-hint">Желудок и Селезёнка — центр Ци в ТКМ</div>
            <div className="chips">{[
              "✅ Всё хорошо",
              "🎈 Вздутие, газы после еды",
              "❄️ Тяжесть, еда долго переваривается",
              "🔥 Изжога, кислотность",
              "💨 Нестабильность (то запор, то нет)",
              "😩 Часто нет аппетита",
            ].map(v=><div key={v} className={"chip "+(d.tcmDigestion===v?"on":"")} onClick={()=>set("tcmDigestion",v)}>{v}</div>)}</div>
          </div>
        </>}

        {s.id==="beauty" && <>
          {/* Тип кожи — для всех */}
          <div className="fld"><label>Тип кожи</label>
            <div className="chips">{["Нормальная","Сухая","Жирная","Комбинированная","Чувствительная"].map(v=><div key={v} className={`chip ${d.skinType===v?"on":""}`} onClick={()=>set("skinType",v)}>{v}</div>)}</div>
          </div>

          {d.gender==="Мужской" ? <>
            {/* Мужской блок */}
            <div className="fld"><label>Борода / усы</label>
              <div className="chips">{["Нет","Щетина","Короткая борода","Длинная борода","Усы"].map(v=><div key={v} className={"chip "+(d.beard===v?"on":"")} onClick={()=>set("beard",v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Как часто бреешься / стрижёшь бороду</label>
              <div className="chips">{["Каждый день","Раз в 2–3 дня","Раз в неделю","Реже"].map(v=><div key={v} className={`chip ${d.beardFreq===v?"on":""}`} onClick={()=>set("beardFreq",v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Стрижка в барбершопе</label>
              <div className="chips">{["Раз в 2–3 нед.","Раз в месяц","Раз в 2 мес.","Стригусь сам","Редко"].map(v=><div key={v} className={`chip ${d.haircutFreq===v?"on":""}`} onClick={()=>set("haircutFreq",v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Приоритет в уходе</label>
              <div className="chips">{["Кожа лица","Борода","Тело","Всё одинаково"].map(v=><div key={v} className={`chip ${d.beautyPriority===v?"on":""}`} onClick={()=>set("beautyPriority",v)}>{v}</div>)}</div>
            </div>
          </> : <>
            {/* Женский блок */}
            <div className="fld"><label>Волосы</label>
              <div className="chips">{["Нормальные","Сухие","Жирные","Окрашенные","Вьющиеся","Тонкие"].map(v=><div key={v} className={`chip ${d.hairType===v?"on":""}`} onClick={()=>set("hairType",v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Ногти</label>
              <div className="chips">{["Не делаю","Раз в 2–3 нед.","Раз в месяц","Нарощенные (коррекция 3 нед.)","Сама дома"].map(v=><div key={v} className={`chip ${d.nailFreq===v?"on":""}`} onClick={()=>set("nailFreq",v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Стрижка</label>
              <div className="chips">{["Раз в месяц","Раз в 6 нед.","Раз в 2 мес.","Редко"].map(v=><div key={v} className={`chip ${d.haircutFreq===v?"on":""}`} onClick={()=>set("haircutFreq",v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Главный приоритет в уходе</label>
              <div className="chips">{["Кожа лица","Тело","Волосы","Ногти","Всё одинаково"].map(v=><div key={v} className={`chip ${d.beautyPriority===v?"on":""}`} onClick={()=>set("beautyPriority",v)}>{v}</div>)}</div>
            </div>
          </>}
        </>}

        {s.id==="shopping" && <>
          {/* Состав семьи */}
          <div className="fld">
            <label>Кто живёт с тобой?</label>
            <div className="chips">{["Живу один(а)","Партнёр/супруг(а)","Дети","Родители","Другие родственники"].map(v=><div key={v} className={"chip "+((d.livesWith||[]).includes(v)?"on":"")} onClick={()=>tog("livesWith",v)}>{v}</div>)}</div>
          </div>
          {(d.livesWith||[]).some(x=>["Партнёр/супруг(а)","Дети","Родители","Другие родственники"].includes(x))&&<>
            <div className="fld">
              <label>Общее количество человек в семье (включая тебя)</label>
              <div className="chips">{["1","2","3","4","5","6+"].map(v=><div key={v} className={"chip "+(d.familySize===v?"on":"")} onClick={()=>set("familySize",v)}>{v}</div>)}</div>
            </div>
            {(d.livesWith||[]).includes("Дети")&&(
              <div className="fld">
                <label>Дети — возраст</label>
                <input placeholder="Например: 3 года, 7 лет, 12 лет" value={d.childrenAges||""} onChange={e=>set("childrenAges",e.target.value)}/>
              </div>
            )}
            {(d.livesWith||[]).includes("Родители")&&(
              <div className="fld">
                <label>Особые потребности у членов семьи</label>
                <input placeholder="Диабет, аллергия на глютен, вегетарианец..." value={d.familyNeeds||""} onChange={e=>set("familyNeeds",e.target.value)}/>
              </div>
            )}
          </>}
          <div className="fld"><label>Как часто закупаешься</label>
            <div className="chips">{["Каждый день","2–3 раза в неделю","Раз в неделю","Раз в 2 недели","Заказываю онлайн"].map(v=><div key={v} className={`chip ${d.shopFreq===v?"on":""}`} onClick={()=>set("shopFreq",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Удобный день для основной закупки</label>
            <div className="chips">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(v=><div key={v} className={`chip ${d.shopDay===v?"on":""}`} onClick={()=>set("shopDay",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Онлайн-заказы</label>
            <div className="chips">{["Нет","Иногда","Продукты онлайн","Всё онлайн"].map(v=><div key={v} className={`chip ${d.onlineShopping===v?"on":""}`} onClick={()=>set("onlineShopping",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Что всегда должно быть дома</label>
            <div className="chips">{["Яйца","Крупы","Молочное","Фрукты","Овощи","Мясо","Рыба","Хлеб","Консервы","Орехи","Бобовые","Зелень"].map(v=><div key={v} className={`chip ${(d.staples||[]).includes(v)?"on":""}`} onClick={()=>tog("staples",v)}>{v}</div>)}</div>
          </div>
        </>}

        {s.id==="hobbies" && <>
          <div className="fld"><label>Хобби и увлечения</label>
            <div className="chips">{(d.gender==="Мужской"
              ? ["Чтение","Фотография","Музыка","Готовка","Садоводство","Видеоигры","Кино","Путешествия","Спорт","Рисование","Блогинг","Языки","Рыбалка","Авто / мото","Туризм / походы","Единоборства","Программирование","Настольные игры"]
              : ["Чтение","Рисование","Вязание/шитьё","Фотография","Музыка","Готовка","Садоводство","Видеоигры","Кино","Путешествия","Танцы","Рукоделие","Блогинг","Языки","Спорт","Йога","Декор / дизайн"]
            ).map(v=><div key={v} className={`chip ${(d.hobbies||[]).includes(v)?"on":""}`} onClick={()=>tog("hobbies",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Хобби-проект — что {d.gender==="Мужской"?"хочешь":"хочешь"} развивать</label>
            <input placeholder={d.gender==="Мужской"?"Освоить гитару, прочитать 12 книг, научиться сёрфингу...":"Научиться акварели, прочитать 12 книг, освоить гитару..."} value={d.hobbyProject||""} onChange={e=>set("hobbyProject",e.target.value)}/>
          </div>
          <div className="fld"><label>Как часто удаётся заниматься хобби</label>
            <div className="chips">{["Почти никогда","Раз в месяц","Раз в неделю","Несколько раз в неделю","Каждый день"].map(v=><div key={v} className={`chip ${d.hobbyFreq===v?"on":""}`} onClick={()=>set("hobbyFreq",v)}>{v}</div>)}</div>
          </div>
        </>}

        {s.id==="travel" && <>
          <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:15,color:T.text3,fontStyle:"italic",marginBottom:16,lineHeight:1.7}}>
            Добавь куда хочешь поехать — приложение будет мягко напоминать о подготовке. Без давления.
          </div>
          {(d.trips||[]).map((trip,i)=>(
            <div key={trip.id} style={{background:"rgba(90,142,200,0.06)",border:"1px solid rgba(90,142,200,0.2)",borderRadius:14,padding:18,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:T.info,letterSpacing:3}}>ПОЕЗДКА {i+1}</span>
                <div className="ico-btn danger" onClick={()=>delTrip(trip.id)}>✕</div>
              </div>
              <div className="fld"><label>Куда?</label><input placeholder="Стамбул, Бали, Байкал..." value={trip.destination} onChange={e=>updTrip(trip.id,"destination",e.target.value)}/></div>
              <div className="fld-row">
                <div className="fld"><label>Планируемая дата</label><input type="month" value={trip.targetDate} onChange={e=>updTrip(trip.id,"targetDate",e.target.value)}/></div>
                <div className="fld"><label>Бюджет (₽)</label><input type="number" value={trip.budget} onChange={e=>updTrip(trip.id,"budget",e.target.value)}/></div>
              </div>
              <div className="fld"><label>Стадия</label>
                <div className="chips">{["💭 Мечта","🗺️ Планирую","💰 Коплю","🎫 Билеты куплены","✅ Всё готово"].map(v=><div key={v} className={`chip ${trip.stage===v?"on":""}`} onClick={()=>updTrip(trip.id,"stage",v)}>{v}</div>)}</div>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" onClick={addTrip}>+ Добавить поездку</button>
            {d.trips.length===0&&<span style={{fontSize:14,color:T.text3,fontStyle:"italic"}}>Нет поездок — продолжи</span>}
          </div>
        </>}

        {s.id==="goals" && <>
          <div className="fld"><label>Главная цель на ближайшие 3 месяца</label><textarea placeholder="Наладить режим, похудеть на 5 кг, сменить работу..." value={d.mainGoal||""} onChange={e=>set("mainGoal",e.target.value)}/></div>
          <div className="fld"><label>Сферы где хочешь прогресса</label>
            <div className="chips">{["Здоровье","Карьера","Финансы","Отношения","Саморазвитие","Творчество","Путешествия","Духовность","Семья","Внешность"].map(v=><div key={v} className={`chip ${(d.goalAreas||[]).includes(v)?"on":""}`} onClick={()=>tog("goalAreas",v)}>{v}</div>)}</div>
          </div>
          <div className="fld"><label>Что сдерживает от достижения целей?</label>
            <div className="chips">{["Нехватка времени","Нехватка энергии","Откладываю","Не знаю с чего начать","Много отвлекаюсь","Страх неудачи"].map(v=><div key={v} className={`chip ${(d.goalBlocks||[]).includes(v)?"on":""}`} onClick={()=>tog("goalBlocks",v)}>{v}</div>)}</div>
          </div>
        </>}

        {s.id==="done" && (
          <div style={{textAlign:"center",padding:"16px 0"}}>
            <div style={{fontSize:52,marginBottom:16}}>✨</div>
            {d.name&&<div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.gold,marginBottom:8}}>Привет, {d.name.split(" ")[0]||d.name}!</div>}
            <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:16,color:T.text2,lineHeight:1.8,fontStyle:"italic"}}>
              {d.dob&&`${getZodiac(d.dob).emoji} ${getZodiac(d.dob).name} · 🐾 ${getEastern(d.dob)}`}
              {d.fullName&&` · ✦ ${calcDegree(d.fullName)}° судьбы`}
              <br/>Life Diary знает тебя и готов держать всё в голове вместо тебя.
            </div>
          </div>
        )}

        <div className="ob-foot">
          {step>0&&<button className="btn btn-ghost" onClick={()=>setStep(s=>s-1)}>← Назад</button>}
          {step<OB_STEPS.length-1
            ? <button className="btn btn-primary" onClick={()=>setStep(s=>s+1)}>Далее →</button>
            : <button className="btn btn-primary" onClick={()=>onDone(d)}>Открыть Life Diary ✨</button>
          }
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════
export default function LifeDiary() {
  const [profile, setProfile] = useStorage("ld_pf_v3", null);
  const [sections, setSections] = useStorage("ld_sec_v3", DEF_SECTIONS);
  const [tasks, setTasks] = useStorage("ld_tasks_v3", []);
  const [journal, setJournal] = useStorage("ld_journal_v3", {});
  const [shopList, setShopList] = useStorage("ld_shop_v3", []);
  const [petLog, setPetLog] = useStorage("ld_petlog_v3", {});
  const [trips, setTrips] = useStorage("ld_trips_v3", []);
  const [hobbies, setHobbies] = useStorage("ld_hobbies_v3", []);
  const [active, setActive] = useState("today");
  const [notif, setNotif] = useState(null);

  const today = toDay();
  const moon = getMoon();
  const notify = useCallback((msg)=>{setNotif(msg);hapticNotify("success");setTimeout(()=>setNotif(null),3200);},[]);

  useEffect(()=>{
    if(profile&&trips.length===0&&(profile.trips||[]).length>0) setTrips(profile.trips);
    if(profile&&hobbies.length===0&&(profile.hobbies||[]).length>0) setHobbies((profile.hobbies||[]).map(h=>({id:Date.now()+Math.random(),name:h,sessions:[],goal:"",notes:""})));
  },[profile]);

  // Push-уведомления о дедлайнах при открытии приложения
  useEffect(()=>{
    if(profile && tasks.length > 0) {
      const deadlines = tasks.filter(t=>t.isDeadline);
      if(deadlines.length > 0 && Notification.permission === "granted") {
        scheduleDeadlineNotifications(deadlines);
      }
    }
  },[tasks, profile]);

  if(!profile) return <><style>{CSS}</style><Onboarding onDone={d=>{setProfile(d);if((d.trips||[]).length>0)setTrips(d.trips);}}/></>;

  const kb = buildKB(profile);
  const gp = genderPrompt(profile);
  const activeS = sections.find(s=>s.id===active)||sections[0];

  return (
    <>
      <style>{CSS}</style>
      <div className="ambient"/>
      <div className="app">
        {/* Кнопка включения уведомлений */}

        {/* SIDEBAR */}
        <nav className="sidebar">
          <div className="s-logo">LD</div>
          {sections.map(s=>(
            <div key={s.id} className={`s-nav${!s.vis?" dim":""}${active===s.id?" act":""}`} onClick={()=>setActive(s.id)} title={s.name}>
              <span className="s-ico">{s.emoji}</span>
              <span className="s-lbl">{s.name.slice(0,5)}</span>
            </div>
          ))}
        </nav>

        {/* MAIN */}
        <div className="main">
          {/* HEADER */}
          <div className="hdr">
            <div className="hdr-l">
              <div className="hdr-title">{activeS.name}</div>
              <div className="hdr-sub">{new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
            <div className="hdr-r">
              <div className="moon-tag">{moon.e} {moon.n}</div>
              <div className="date-tag">{today}</div>
            </div>
          </div>

          {/* SECTIONS */}
          <div className="page">
            {active==="today"    && <TodaySection profile={profile} tasks={tasks} setTasks={setTasks} journal={journal} setJournal={setJournal} today={today} moon={moon} kb={kb} notify={notify} petLog={petLog} setPetLog={setPetLog}/>}
            {active==="tasks"    && <TasksSection profile={profile} tasks={tasks} setTasks={setTasks} today={today} kb={kb} notify={notify}/>}
            {active==="schedule" && <ScheduleSection profile={profile} tasks={tasks} setTasks={setTasks} today={today} kb={kb} notify={notify}/>}
            {active==="work"     && <WorkSection profile={profile} tasks={tasks} setTasks={setTasks} today={today} kb={kb} notify={notify}/>}
            {active==="home"     && <HomeSection profile={profile} tasks={tasks} setTasks={setTasks} today={today} kb={kb} notify={notify}/>}
            {active==="shopping" && <ShoppingSection profile={profile} shopList={shopList} setShopList={setShopList} kb={kb} notify={notify}/>}
            {active==="car"      && <CarSection profile={profile} setProfile={setProfile} tasks={tasks} setTasks={setTasks} today={today} kb={kb} notify={notify}/>}
            {active==="pets"     && <PetsSection profile={profile} setProfile={setProfile} petLog={petLog} setPetLog={setPetLog} today={today} kb={kb} notify={notify}/>}
            {active==="health"   && <HealthSection profile={profile} tasks={tasks} setTasks={setTasks} setShopList={setShopList} today={today} kb={kb} notify={notify}/>}
            {active==="beauty"   && <BeautySection profile={profile} tasks={tasks} setTasks={setTasks} today={today} kb={kb} notify={notify}/>}
            {active==="hobbies"  && <HobbiesSection profile={profile} hobbies={hobbies} setHobbies={setHobbies} kb={kb} notify={notify}/>}
            {active==="goals"    && <GoalsSection profile={profile} setProfile={setProfile} tasks={tasks} setTasks={setTasks} kb={kb} notify={notify}/>}
            {active==="mental"   && <MentalSection profile={profile} kb={kb} notify={notify}/>}
            {active==="travel"   && <TravelSection profile={profile} trips={trips} setTrips={setTrips} kb={kb} notify={notify}/>}
            {active==="journal"  && <JournalSection journal={journal} setJournal={setJournal} today={today} notify={notify}/>}
            {active==="profile"  && <ProfileSection profile={profile} setProfile={setProfile} sections={sections} setSections={setSections} notify={notify} kb={kb}/>}
          </div>
        </div>
      </div>
      {notif&&<div className="notif">✦ {notif}</div>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
//  AI BOX COMPONENT
// ══════════════════════════════════════════════════════════════
// Парсер AI-ответа — превращает текст в структурированные блоки
function parseAiResponse(text) {
  if(!text) return [];
  
  // Очистить markdown bold ** оставив текст
  const stripBold = (s) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\*+|\*+$/g, "").trim();
  
  const blocks = [];
  const lines = text.split("\n");
  let currentList = null;
  let currentText = [];
  let pendingNumber = null; // когда строка содержит только цифру "1"
  
  const flushText = () => {
    if(currentText.length > 0) {
      const t = currentText.join(" ").trim();
      if(t) blocks.push({type:"paragraph", content: t});
      currentText = [];
    }
  };
  const flushList = () => {
    if(currentList && currentList.items.length > 0) blocks.push(currentList);
    currentList = null;
  };
  
  for(let i=0; i<lines.length; i++) {
    let raw = lines[i];
    let trimmed = raw.trim();
    
    if(!trimmed) {
      flushList(); flushText();
      pendingNumber = null;
      continue;
    }
    
    // ## заголовок (markdown)
    const mdHeader = trimmed.match(/^#{1,4}\s*(.+?)\s*$/);
    if(mdHeader) {
      flushList(); flushText();
      blocks.push({type:"header", content: stripBold(mdHeader[1])});
      pendingNumber = null;
      continue;
    }
    
    // **Заголовок** на отдельной строке
    if(/^\*\*[^*]+\*\*:?\s*$/.test(trimmed)) {
      flushList(); flushText();
      blocks.push({type:"header", content: stripBold(trimmed).replace(/:$/, "")});
      pendingNumber = null;
      continue;
    }
    
    // Только цифра "1" "2" итд — это начало пункта на следующей строке
    if(/^\d+\.?$/.test(trimmed)) {
      flushText();
      pendingNumber = parseInt(trimmed);
      continue;
    }
    
    // Если был pendingNumber — текущая строка это содержимое пункта
    if(pendingNumber !== null) {
      let itemRaw = trimmed;
      // Может начинаться с **Заголовок**: текст
      const titleMatch = itemRaw.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
      if(!currentList) currentList = {type:"list", items:[]};
      if(titleMatch) {
        const title = titleMatch[1].trim();
        let body = titleMatch[2].trim();
        // Может body занимать ещё строки — собираем пока не пусто или новый пункт
        while(i+1 < lines.length && lines[i+1].trim() && 
              !/^\d+\.?$/.test(lines[i+1].trim()) &&
              !/^\d+[.)]\s/.test(lines[i+1].trim()) &&
              !/^[-•*]\s/.test(lines[i+1].trim()) &&
              !/^#/.test(lines[i+1].trim()) &&
              !/^\*\*[^*]+\*\*:?\s*$/.test(lines[i+1].trim())) {
          body += " " + lines[i+1].trim();
          i++;
        }
        currentList.items.push({title: stripBold(title), body: stripBold(body)});
      } else {
        currentList.items.push({title: "", body: stripBold(itemRaw)});
      }
      pendingNumber = null;
      continue;
    }
    
    // 1. текст или 1) текст или 1**заголовок**: текст
    const numItem = trimmed.match(/^(\d+)[.)\s]\s*(.+)$/);
    if(numItem) {
      flushText();
      let body = numItem[2];
      const titleMatch = body.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
      if(!currentList) currentList = {type:"list", items:[]};
      if(titleMatch) {
        currentList.items.push({title: stripBold(titleMatch[1]), body: stripBold(titleMatch[2])});
      } else {
        // Если есть : разделим
        const colonIdx = body.indexOf(":");
        if(colonIdx > 0 && colonIdx < 60) {
          currentList.items.push({title: stripBold(body.slice(0,colonIdx)), body: stripBold(body.slice(colonIdx+1))});
        } else {
          currentList.items.push({title: "", body: stripBold(body)});
        }
      }
      continue;
    }
    
    // - текст • текст
    const dashItem = trimmed.match(/^[-•*]\s+(.+)$/);
    if(dashItem) {
      flushText();
      let body = dashItem[1];
      const titleMatch = body.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
      if(!currentList) currentList = {type:"list", items:[]};
      if(titleMatch) {
        currentList.items.push({title: stripBold(titleMatch[1]), body: stripBold(titleMatch[2])});
      } else {
        const colonIdx = body.indexOf(":");
        if(colonIdx > 0 && colonIdx < 60) {
          currentList.items.push({title: stripBold(body.slice(0,colonIdx)), body: stripBold(body.slice(colonIdx+1))});
        } else {
          currentList.items.push({title: "", body: stripBold(body)});
        }
      }
      continue;
    }
    
    // Короткая строка с двоеточием в конце = заголовок
    if(trimmed.length < 70 && trimmed.endsWith(":") && !trimmed.includes(",")) {
      flushList(); flushText();
      blocks.push({type:"header", content: stripBold(trimmed.slice(0, -1))});
      continue;
    }
    
    // Обычный абзац — но если есть открытый список, это продолжение последнего пункта
    if(currentList && currentList.items.length > 0) {
      const last = currentList.items[currentList.items.length-1];
      last.body = (last.body + " " + stripBold(trimmed)).trim();
      continue;
    }
    flushList();
    currentText.push(stripBold(trimmed));
  }
  flushList();
  flushText();
  return blocks;
}

function AiBox({ kb, prompt, label="ИИ-СОВЕТНИК", btnText="Получить совет", placeholder="Нажми — получи персональный совет...", actionType=null, onShopAdd=null, onTaskAdd=null, noActions=false, maxTokens=1200 }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const ask = async()=>{ setLoading(true); const r=await askClaude(kb,prompt,maxTokens); setText(r); setLoading(false); };
  const blocks = useMemo(()=>parseAiResponse(text), [text]);
  
  // Извлекаем все элементы списков для возможности добавить в задачи/покупки
  const allListItems = useMemo(()=>{
    const items = [];
    blocks.forEach(b => {
      if(b.type === "list") b.items.forEach(it => {
        if(typeof it === "string") items.push(it);
        else if(it.title && it.body) items.push(it.title + ": " + it.body);
        else items.push(it.body || it.title || "");
      });
    });
    return items.filter(x=>x);
  }, [blocks]);
  
  const addToTasks = () => {
    if(!allListItems.length) return;
    try {
      const tasks = JSON.parse(localStorage.getItem("ld_tasks_v3") || "[]");
      const newTasks = allListItems.map(t => ({
        id: Date.now() + Math.random(),
        title: t.length > 100 ? t.slice(0, 97) + "..." : t,
        section: "tasks", freq: "once", priority: "m",
        deadline: "", notes: "", preferredTime: "", lastDone: "", doneDate: ""
      }));
      const merged = [...tasks, ...newTasks];
      localStorage.setItem("ld_tasks_v3", JSON.stringify(merged));
      if(onTaskAdd) onTaskAdd(merged);
      alert("Добавлено " + newTasks.length + " задач");
    } catch(e) { alert("Ошибка"); }
  };
  
  const addToShopping = () => {
    if(!allListItems.length) return;
    try {
      const list = JSON.parse(localStorage.getItem("ld_shop_v3") || "[]");
      const catRules = [
        {cat:"Бытовая химия", words:["мыло","порошок","гель для стир","шампунь для","ополаск","чистящ","моющ","туалетн","губка","перчатк","пятновыв","отбелив","кондиц для бель","полотенца бумаж","салфетки","пакет","фольга","плёнка"]},
        {cat:"Красота и уход", words:["крем","маска для","сыворотк","тоник","скраб","пилинг","масло для","бальзам","помад","тушь","пудр","ватн","косметик","дезодорант","зубн паст","зубн нить","шампунь","кондиционер для волос"]},
        {cat:"Для питомцев", words:["корм для","лоток","наполнитель","когтет","ошейник","поводок","для котов","для собак","для кошек","для попуг","для хомяк"]},
        {cat:"Аптека", words:["витамин","омега","магний","мелатонин","пробиотик","антиб","сироп","таблетк","капл","мазь","бинт","пластыр","термометр","леденц","спрей от"]},
        {cat:"Одежда", words:["футболк","рубашк","брюк","юбк","платье","носки","нижне бель","пижам","халат","куртк","пальто","туфл","ботинк","кроссовк"]},
      ];
      const detect = (n)=>{ const l=n.toLowerCase(); for(const r of catRules) for(const w of r.words) if(l.includes(w)) return r.cat; return "Продукты"; };
      // Дедупликация уже добавленных товаров
      const existingNames = new Set(list.map(i=>i.name.toLowerCase().trim()));
      const newItems = [];
      const validCats = ["Продукты","Бытовая химия","Красота и уход","Для питомцев","Одежда","Аптека","Другое"];
      allListItems.forEach(t => {
        // Извлечь категорию [...]
        const m = t.match(/\[([^\]]+)\]/);
        let cat = "Продукты";
        if(m && validCats.includes(m[1])) cat = m[1];
        // Удалить ВСЕ метки [Категория] из имени
        let name = t.replace(/\[[^\]]+\]/g, "").trim();
        // Убрать ведущие двоеточия и пробелы
        name = name.replace(/^[:\s—-]+/, "").trim();
        if(!name || name.length < 2) return;
        if(!m) cat = detect(name);
        // Защита от дублей
        if(existingNames.has(name.toLowerCase())) return;
        existingNames.add(name.toLowerCase());
        newItems.push({id:Date.now()+Math.random(), name:name.length>80?name.slice(0,77)+"...":name, cat, done:false});
      });
      const merged = [...list, ...newItems];
      localStorage.setItem("ld_shop_v3", JSON.stringify(merged));
      if(onShopAdd) onShopAdd(merged);
      const byCat = {};
      newItems.forEach(i=>{byCat[i.cat]=(byCat[i.cat]||0)+1;});
      alert("Добавлено: " + Object.entries(byCat).map(([c,n])=>n+" в "+c).join(", "));
    } catch(e) { alert("Ошибка"); }
  };
  
  const addAllToCalendar = () => {
    if(!allListItems.length) return;
    const start = new Date(); start.setHours(start.getHours()+1, 0, 0, 0);
    const end = new Date(start.getTime()+3600000);
    const f = d => d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
    const desc = allListItems.map((t,i)=>(i+1)+". "+t).join("\n");
    window.open("https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(label)+"&dates="+f(start)+"/"+f(end)+"&details="+encodeURIComponent(desc), "_blank");
  };
  
  const saveAsNote = () => {
    if(!text) return;
    try {
      const notes = JSON.parse(localStorage.getItem("ld_ai_notes") || "[]");
      notes.unshift({date:new Date().toISOString(), label, text});
      localStorage.setItem("ld_ai_notes", JSON.stringify(notes.slice(0, 50)));
      alert("Сохранено в заметки");
    } catch(e) { alert("Ошибка сохранения"); }
  };
  
  // Состояние планировщика
  const [scheduling, setScheduling] = useState(null); // {item, hour, minute, withReminder}
  const [detailItem, setDetailItem] = useState(null); // для подробного описания
  const [detailText, setDetailText] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  
  const startScheduling = (item) => {
    const txt = typeof item==="string" ? item : (item.title||item.body);
    const now = new Date();
    setScheduling({item:txt, hour:now.getHours()+1, minute:0, duration:30, reminder:true});
  };
  
  const confirmSchedule = () => {
    if(!scheduling) return;
    const {item, hour, minute, duration, reminder} = scheduling;
    const start = new Date();
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + duration*60000);
    const f = d => d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
    const reminderStr = reminder ? "&reminders=POPUP,15" : "";
    window.open("https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(item)+"&dates="+f(start)+"/"+f(end)+reminderStr, "_blank");
    // Сохранить в задачи
    try {
      const tasks = JSON.parse(localStorage.getItem("ld_tasks_v3") || "[]");
      tasks.push({
        id: Date.now()+Math.random(),
        title: item.length>100?item.slice(0,97)+"...":item,
        section: "tasks", freq: "once", priority: "m",
        deadline: "", notes: "Запланировано из AI: "+label,
        preferredTime: (hour<10?"0":"")+hour+":"+(minute<10?"0":"")+minute,
        lastDone: "", doneDate: ""
      });
      localStorage.setItem("ld_tasks_v3", JSON.stringify(tasks));
    } catch{}
    setScheduling(null);
  };
  
  const askForDetails = async (item) => {
    const txt = typeof item==="string" ? item : ((item.title?item.title+": ":"")+item.body);
    setDetailItem(txt);
    setDetailText("");
    setDetailLoading(true);
    const r = await askClaude(kb, "Дай ПОЛНУЮ ПОДРОБНУЮ инструкцию как выполнить: \""+txt+"\". Структура: ## Что нужно (материалы, время); ## Шаги (нумерованным списком, очень детально); ## На что обратить внимание (3-4 пункта); ## Сколько времени займёт. Без воды, конкретно.");
    setDetailText(r);
    setDetailLoading(false);
  };

  return (
    <div className="ai-box">
      <div className="ai-hd"><div className="ai-pulse"/><div className="ai-lbl">{label}</div></div>
      {!text && <div className="ai-dim">{placeholder}</div>}
      {text && <div className="ai-content">
        {blocks.map((b, i) => {
          if(b.type === "header") return <div key={i} className="ai-header"><span className="ai-header-mark">◆</span>{b.content}</div>;
          if(b.type === "list") return <div key={i} className="ai-list">
            {b.items.map((item, j) => {
              const isObj = typeof item === "object";
              const title = isObj ? item.title : "";
              const body = isObj ? item.body : item;
              const itemKey = j;
              const showActionBtns = actionType !== "shopping";
              return <div key={j} className="ai-list-item">
                <span className="ai-list-num">{j+1}</span>
                <div className="ai-list-body">
                  {title && <div className="ai-list-title">{title}</div>}
                  {body && <div className="ai-list-text">{body}</div>}
                  {showActionBtns && !noActions && <div className="ai-item-actions">
                    <button className="btn-mini" onClick={()=>startScheduling(item)} title="Запланировать">⏰ Запланировать</button>
                    <button className="btn-mini" onClick={()=>askForDetails(item)} title="Подробнее">📖 Подробнее</button>
                  </div>}
                </div>
              </div>;
            })}
          </div>;
          return <div key={i} className="ai-paragraph">{b.content}</div>;
        })}
      </div>}
      
      {/* Модалка планирования */}
      {scheduling && <div className="overlay" onClick={()=>setScheduling(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
          <span className="modal-x" onClick={()=>setScheduling(null)}>✕</span>
          <div className="modal-title">Запланировать</div>
          <div style={{padding:"10px 14px",background:"rgba(200,164,90,0.08)",borderRadius:10,marginBottom:14,fontSize:14,color:T.text1,fontFamily:"'Crimson Pro',serif"}}>{scheduling.item}</div>
          <div className="fld-row">
            <div className="fld"><label>Начало (час)</label><input type="number" min="0" max="23" value={scheduling.hour} onChange={e=>setScheduling(s=>({...s,hour:parseInt(e.target.value)||0}))}/></div>
            <div className="fld"><label>Минуты</label><input type="number" min="0" max="59" step="5" value={scheduling.minute} onChange={e=>setScheduling(s=>({...s,minute:parseInt(e.target.value)||0}))}/></div>
          </div>
          <div className="fld"><label>Длительность (мин)</label><select value={scheduling.duration} onChange={e=>setScheduling(s=>({...s,duration:parseInt(e.target.value)}))}><option value="15">15 минут</option><option value="30">30 минут</option><option value="45">45 минут</option><option value="60">1 час</option><option value="90">1,5 часа</option><option value="120">2 часа</option></select></div>
          <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:"pointer"}}>
            <input type="checkbox" checked={scheduling.reminder} onChange={e=>setScheduling(s=>({...s,reminder:e.target.checked}))} style={{width:18,height:18}}/>
            <span style={{fontSize:15,color:T.text1}}>🔔 Напомнить за 15 минут</span>
          </label>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button className="btn btn-primary" onClick={confirmSchedule}>Запланировать</button>
            <button className="btn btn-ghost" onClick={()=>setScheduling(null)}>Отмена</button>
          </div>
        </div>
      </div>}
      
      {/* Модалка подробного описания */}
      {detailItem && <div className="overlay" onClick={()=>setDetailItem(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:600,maxHeight:"85vh",overflowY:"auto"}}>
          <span className="modal-x" onClick={()=>setDetailItem(null)}>✕</span>
          <div className="modal-title">Подробная инструкция</div>
          <div style={{padding:"10px 14px",background:"rgba(200,164,90,0.08)",borderRadius:10,marginBottom:14,fontSize:14,color:T.text1,fontFamily:"'Crimson Pro',serif"}}>{detailItem}</div>
          {detailLoading && <div className="ai-dim">Готовлю подробную инструкцию...</div>}
          {!detailLoading && detailText && <div className="ai-content">
            {parseAiResponse(detailText).map((b, i) => {
              if(b.type === "header") return <div key={i} className="ai-header"><span className="ai-header-mark">◆</span>{b.content}</div>;
              if(b.type === "list") return <div key={i} className="ai-list">
                {b.items.map((it, j) => {
                  const isObj = typeof it === "object";
                  return <div key={j} className="ai-list-item">
                    <span className="ai-list-num">{j+1}</span>
                    <div className="ai-list-body">
                      {isObj && it.title && <div className="ai-list-title">{it.title}</div>}
                      <div className="ai-list-text">{isObj?it.body:it}</div>
                    </div>
                  </div>;
                })}
              </div>;
              return <div key={i} className="ai-paragraph">{b.content}</div>;
            })}
          </div>}
        </div>
      </div>}
      <div className="ai-actions">
        <button className="btn btn-teal btn-sm" onClick={ask} disabled={loading}>{loading?"Думаю...":text?"Обновить":btnText}</button>
        {text && allListItems.length > 0 && <>
          {actionType !== "shopping" && <button className="btn btn-ghost btn-sm" onClick={addToTasks}>📋 В задачи</button>}
          {actionType === "shopping" && <button className="btn btn-ghost btn-sm" onClick={addToShopping}>🛒 В список покупок</button>}
          <button className="btn btn-ghost btn-sm" onClick={addAllToCalendar}>📅 В календарь</button>
        </>}
        {text && <button className="btn btn-ghost btn-sm" onClick={saveAsNote}>💾 Сохранить</button>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TASK MODAL
// ══════════════════════════════════════════════════════════════
function TaskModal({ task, onSave, onClose, defaultSection="tasks" }) {
  const [t, setT] = useState(task||{title:"",section:defaultSection,freq:"once",priority:"m",deadline:"",notes:"",preferredTime:"",lastDone:""});
  const u=(k,v)=>setT(p=>({...p,[k]:v}));
  const freqs=[["once","разово"],["daily","ежедневно"],["workdays","пн–пт"],["every:2","кажд. 2 дня"],["every:3","кажд. 3 дня"],["every:7","раз в нед."],["every:14","раз в 2 нед."],["every:30","раз в месяц"],["monthly:1","1-го числа"],["monthly:15","15-го числа"],["weekly:6,0","выходные"]];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <span className="modal-x" onClick={onClose}>✕</span>
        <div className="modal-title">{task?"Редактировать задачу":"Новая задача"}</div>
        <div className="fld"><label>Название</label><input autoFocus placeholder="Что нужно сделать?" value={t.title} onChange={e=>u("title",e.target.value)}/></div>
        <div className="fld-row">
          <div className="fld"><label>Раздел</label>
            <select value={t.section} onChange={e=>u("section",e.target.value)}>
              {[["tasks","Общие"],["work","Работа"],["home","Дом"],["health","Здоровье"],["beauty","Красота"],["pets","Питомцы"],["shopping","Покупки"],["hobbies","Хобби"],["travel","Поездки"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="fld"><label>Приоритет</label>
            <div className="chips">{[["h","Высокий"],["m","Средний"],["l","Низкий"]].map(([v,l])=><div key={v} className={`chip ${t.priority===v?"on":""}`} onClick={()=>u("priority",v)}>{l}</div>)}</div>
          </div>
        </div>
        <div className="fld"><label>Повторение</label>
          <div className="chips">{freqs.map(([v,l])=><div key={v} className={`chip ${t.freq===v?"on":""}`} onClick={()=>u("freq",v)}>{l}</div>)}</div>
        </div>
        <div className="fld-row">
          <div className="fld"><label>Дедлайн</label><input type="datetime-local" value={t.deadline} onChange={e=>u("deadline",e.target.value)}/></div>
          <div className="fld"><label>Удобное время</label><input type="time" value={t.preferredTime} onChange={e=>u("preferredTime",e.target.value)}/></div>
        </div>
        <div className="fld"><label>Заметка</label><textarea value={t.notes} onChange={e=>u("notes",e.target.value)}/></div>
        <div className="modal-foot">
          {t.deadline&&<button className="btn btn-ghost btn-sm" onClick={()=>openGCal(t.title,t.deadline,t.notes)}>📅 Google Cal</button>}
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={()=>{if(!t.title.trim())return;onSave({...t,id:t.id||Date.now()});onClose();}}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TODAY
// ══════════════════════════════════════════════════════════════
// ── ТКМ: активные меридианы по часу дня ──────────────────────
function getTCMHourOrgan(hour) {
  const map = [
    {h:[23,0],  organ:"Желчный пузырь", emoji:"💚", tip:"Время решений и смелости. Не принимай важных решений — лучше отдыхай."},
    {h:[1,2],   organ:"Печень",         emoji:"🌿", tip:"Очищение крови. Сон обязателен — тело восстанавливается."},
    {h:[3,4],   organ:"Лёгкие",         emoji:"🫁", tip:"Самый глубокий сон. Идеально для дыхательных практик ранним утром."},
    {h:[5,6],   organ:"Толстый кишечник",emoji:"🌅",tip:"Время пробуждения и очищения. Выпей воду, сходи в туалет."},
    {h:[7,8],   organ:"Желудок",        emoji:"🍚", tip:"Самое сильное пищеварение — лучшее время для завтрака."},
    {h:[9,10],  organ:"Селезёнка",      emoji:"🌾", tip:"Пик усвоения питательных веществ. Хорошо думается, продуктивная работа."},
    {h:[11,12], organ:"Сердце",         emoji:"❤️", tip:"Пик умственной активности и общения. Важные встречи — сейчас."},
    {h:[13,14], organ:"Тонкий кишечник",emoji:"☀️", tip:"Усвоение обеда. Небольшой отдых после еды очень полезен."},
    {h:[15,16], organ:"Мочевой пузырь", emoji:"💧", tip:"Второй пик энергии. Хорошо для спорта и физической работы."},
    {h:[17,18], organ:"Почки",          emoji:"🌊", tip:"Резервуар жизненной силы. Не перегружай себя в это время."},
    {h:[19,20], organ:"Перикард",       emoji:"🌇", tip:"Время для близких и тепла. Общение, ужин, нежность."},
    {h:[21,22], organ:"Тройной обогреватель",emoji:"🔥",tip:"Регуляция температуры. Готовься ко сну, не переедай."},
  ];
  const h = hour % 24;
  return map.find(m => h >= m.h[0] && h <= m.h[1]) || map[0];
}

// ── ТКМ: день недели по пяти стихиям ─────────────────────────
function getTCMDayInfo(date) {
  const dow = date.getDay(); // 0=вс
  const days = [
    {name:"Воскресенье", element:"Земля",  emoji:"🌍", color:"#B8860B",
     good:["Забота о себе","Семья","Приготовление еды","Планирование недели"],
     avoid:["Переедание","Беспокойство","Суета"],
     organs:"Желудок / Селезёнка", tip:"День питания и заботы. Корми себя тем, что даёт тепло."},
    {name:"Понедельник", element:"Металл",  emoji:"⚙️", color:"#708090",
     good:["Чёткие планы","Порядок","Дыхательные практики","Уборка"],
     avoid:["Хаос","Грусть","Нытьё"],
     organs:"Лёгкие / Толстый кишечник", tip:"День структуры. Наведи порядок — в делах и голове."},
    {name:"Вторник",    element:"Огонь",   emoji:"🔥", color:"#DC143C",
     good:["Активность","Общение","Важные переговоры","Спорт"],
     avoid:["Перевозбуждение","Кофе в избытке","Конфликты"],
     organs:"Сердце / Тонкий кишечник", tip:"Огненный день. Энергия высокая — направь её в дело."},
    {name:"Среда",      element:"Вода",    emoji:"💧", color:"#1E3A5F",
     good:["Глубокие размышления","Медитация","Работа с интуицией","Планирование"],
     avoid:["Страх","Изоляция","Холодная еда"],
     organs:"Почки / Мочевой пузырь", tip:"День мудрости. Слушай внутренний голос."},
    {name:"Четверг",    element:"Дерево",  emoji:"🌿", color:"#228B22",
     good:["Новые начинания","Движение","Зелёная еда","Растяжка"],
     avoid:["Гнев","Алкоголь","Жирная еда"],
     organs:"Печень / Желчный пузырь", tip:"День роста. Начни что-то новое или сделай шаг к цели."},
    {name:"Пятница",    element:"Земля",   emoji:"🌍", color:"#DAA520",
     good:["Завершение дел","Благодарность","Приятная еда","Общение"],
     avoid:["Переработка","Сладкое в избытке","Тревога"],
     organs:"Желудок / Селезёнка", tip:"День завершения. Закончи начатое, порадуй себя."},
    {name:"Суббота",    element:"Металл",  emoji:"⚙️", color:"#C0C0C0",
     good:["Отдых","Дыхание","Прогулки на свежем воздухе","Уборка"],
     avoid:["Грусть","Засиживаться дома","Переутомление"],
     organs:"Лёгкие / Толстый кишечник", tip:"День очищения. Выйди на воздух, дыши глубоко."},
  ];
  return days[dow];
}

// ── ТКМ: персональные рекомендации на день ────────────────────
function getTCMDayRecs(profile, dayInfo) {
  const tcm = getTCMFullProfile(profile);
  const recs = [];
  if(!tcm) return recs;
  const {el, syndromes, uniqueOrgans} = tcm;

  // Пересечение органов дня и слабых органов
  const dayOrgans = dayInfo.organs.toLowerCase();
  uniqueOrgans.forEach(organ => {
    if(dayOrgans.includes(organ.toLowerCase().split("/")[0].trim().toLowerCase())) {
      recs.push({type:"warn", text:"Сегодня активен орган «"+organ+"» — твоя зона внимания. Особенно береги себя."});
    }
  });

  // Рекомендации по синдромам
  if(syndromes.includes("Избыток Ян / Жар") && dayInfo.element==="Огонь")
    recs.push({type:"warn", text:"Огненный день + твой Жар = риск перегрева. Избегай острого и стресса, пей больше воды."});
  if(syndromes.includes("Недостаток Ян / Холод") && dayInfo.element==="Вода")
    recs.push({type:"warn", text:"Водный день + твой Холод = возможна вялость. Добавь имбирный чай и тёплую еду."});
  if(syndromes.includes("Сырость-Слизь") && (dayInfo.element==="Земля"))
    recs.push({type:"warn", text:"Земной день + Сырость = тяжесть. Пропусти молочное и сладкое сегодня."});

  // Совпадение стихий (усиление)
  if(el && el.name === dayInfo.element)
    recs.push({type:"good", text:"Твоя стихия "+el.name+" совпадает с днём — ты в потоке! Используй энергию для важного."});

  return recs;
}

function TodaySection({profile,tasks,setTasks,journal,setJournal,today,moon,kb,notify,petLog,setPetLog}) {
  // ── Все хуки на уровне компонента (React требует) ──────────
  const [addModal, setAddModal] = useState(false);
  const [modal, setModal] = useState(null);
  const [aiPlan, setAiPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [moodOpen, setMoodOpen] = useState(false);
  const [commuteOpen, setCommuteOpen] = useState(false);
  const [commuteRec, setCommuteRec] = useState("");
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState(null);

  const todayE = journal[today]||{};
  const saveJ = u => setJournal(p=>({...p,[today]:{...todayE,...u}}));

  const isTrulyDue = (t) => {
    if(!t.freq) return false;
    if(t.freq==="once") return !t.lastDone && !t.doneDate;
    if(t.freq==="daily" || t.freq==="workdays") return isDue(t,today);
    if(t.freq.startsWith("weekly:") || t.freq.startsWith("monthly:")) return isDue(t,today);
    if(t.freq.startsWith("every:")) {
      const n = parseInt(t.freq.split(":")[1]);
      if(n > 1 && !t.lastDone) return false;
      return isDue(t,today);
    }
    return false;
  };

  const dueTasks = tasks.filter(t => isTrulyDue(t) && t.section !== "work" && !t.isDeadline);
  const doneCnt = tasks.filter(t=>t.doneDate===today).length;
  const petEmoji = t=>({Кошка:"🐱",Собака:"🐶",Попугай:"🦜",Кролик:"🐰",Хомяк:"🐹",Черепаха:"🐢",Рыбки:"🐠"}[t]||"🐾");

  // ── Вычисляем данные для рендера ───────────────────────────
  const now = new Date();
  const currentH = now.getHours();
  const currentMin = now.getMinutes();
  const nowMinutes = currentH*60 + currentMin;
  const dayInfo = getTCMDayInfo(now);
  const hourOrgan = getTCMHourOrgan(currentH);
  const recs = getTCMDayRecs(profile, getTCMFullProfile(profile));
  const tcm = getTCMFullProfile(profile);
  const todayZodiac = getZodiac(now.toISOString().split("T")[0]);
  const isWorkDay = (profile.workDaysList||[1,2,3,4,5]).includes(now.getDay());
  const isWeekend = [0,6].includes(now.getDay());
  const wakeH = parseInt((profile.wake||"07:00").split(":")[0]);
  const workStartH = parseInt((profile.workStart||"09:00").split(":")[0]);
  const workEndH = parseInt((profile.workEnd||"18:00").split(":")[0]);
  const sleepH = parseInt((profile.sleep||"23:00").split(":")[0]);

  const getAiPlan = async()=>{
    setPlanLoading(true);
    const tcmD = getTCMFullProfile(profile);
    const r = await askClaude(kb,
      `Сегодня ${now.toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}. Луна: ${moon.n} — ${moon.t}.\n`+
      `ТКМ дня: стихия ${dayInfo.element}, органы ${dayInfo.organs}. ${dayInfo.tip}\n`+
      (tcmD?.el?`Моя стихия: ${tcmD.el.name}. Синдромы: ${(tcmD.syndromes||[]).join(", ")||"нет"}.\n`:"")+
      (todayE.todayEmotion?`Эмоция: ${todayE.todayEmotion}.\n`:"")+
      `Задачи: ${dueTasks.slice(0,5).map(t=>(t.preferredTime?t.preferredTime+" ":"")+t.title).join(", ")||"нет"}.\n`+
      `Работа ${isWorkDay?profile.workStart+"–"+profile.workEnd:"— выходной"}. Подъём ${profile.wake||"?"}.\n\n`+
      `Составь краткий тёплый план дня (3-4 предложения), учитывая ТКМ меридианы.`, 800);
    setAiPlan(r); setPlanLoading(false);
  };

  const getCommuteRec = async()=>{
    setCommuteLoading(true);
    const r = await askClaude(kb,
      `Еду — ${profile.commuteTime} на ${profile.commuteWay||"транспорте"}. Стихия дня — ${dayInfo.element}. Дай одну рекомендацию: что послушать, о чём подумать или короткую практику. 2-3 предложения.`, 300);
    setCommuteRec(r); setCommuteLoading(false);
  };

  // ── Планировщик: формируем события ────────────────────────
  const plannerEvents = [];
  // Напоминание о дне закупки
  const SHOP_DAYS={"Пн":1,"Вт":2,"Ср":3,"Чт":4,"Пт":5,"Сб":6,"Вс":0};
  const todayDayNum=now.getDay();
  const shopDayNum=SHOP_DAYS[profile.shopDay];
  if(profile.shopDay&&todayDayNum===shopDayNum){
    plannerEvents.push({id:"shopping",type:"anchor",emoji:"🛒",
      title:"День закупки продуктов"+((profile.familySize&&profile.familySize!=="1")?" (на "+profile.familySize+" чел.)":""),
      time:"10:00",timeH:10,timeM:0,done:false,fixed:true});
  }

  plannerEvents.push({id:"wake",type:"anchor",emoji:"☀️",title:"Подъём",time:profile.wake||"07:00",timeH:wakeH,timeM:0,done:false,fixed:true});

  // Кормление питомцев
  (profile.pets||[]).forEach(pet=>{
    const feeds=parseInt(pet.feedTimes)||2;
    const labels=feeds<=2?["Утро","Вечер"]:feeds===3?["Утро","День","Вечер"]:["1","2","3","4"];
    const autoTimes=feeds===1?["08:00"]:feeds===2?["08:00","19:00"]:feeds===3?["08:00","14:00","19:00"]:["07:00","11:00","15:00","19:00"];
    for(let i=0;i<feeds;i++){
      const t=(pet.feedSchedule||[])[i]||autoTimes[i]||"08:00";
      const [h,m]=t.split(":").map(Number);
      const log=petLog[today]?.[pet.id]||[];
      plannerEvents.push({
        id:"pet-"+pet.id+"-"+i, type:"pet", emoji:petEmoji(pet.type),
        title:"Покормить "+pet.name+" ("+labels[i]+")",
        time:t, timeH:h, timeM:m||0, done:log.includes(i),
        onDone:()=>{const cur=petLog[today]?.[pet.id]||[];const n=cur.includes(i)?cur.filter(x=>x!==i):[...cur,i];setPetLog(p=>({...p,[today]:{...(p[today]||{}),[pet.id]:n}}))}
      });
    }
  });

  // Дорога на работу
  if(isWorkDay && profile.commuteTime && profile.commuteTime!=="Дома") {
    const mins=parseInt((profile.commuteTime.match(/\d+/)||["30"])[0]);
    const commuteH=workStartH-Math.ceil(mins/60);
    plannerEvents.push({id:"commute",type:"commute",emoji:"🚌",
      title:"В дороге → ("+profile.commuteTime+")",
      time:commuteH+":00",timeH:commuteH,timeM:0,done:false,fixed:true});
  }

  // Практики и спорт
  if(isWorkDay) {
    (profile.practices||[]).filter(pr=>pr&&pr!=="Нет").forEach((pr,i)=>{
      const h=workEndH; const m=i*20;
      plannerEvents.push({id:"practice-"+i,type:"health",emoji:"🧘",
        title:pr,time:h+":"+(m<10?"0"+m:m),timeH:h,timeM:m,done:false});
    });
    if((profile.sport||[]).length>0 && !profile.sport.includes("Не занимаюсь")) {
      const h=workEndH+1;
      plannerEvents.push({id:"sport",type:"health",emoji:"🏃",
        title:"Спорт: "+(profile.sport||[]).slice(0,2).join(", "),
        time:h+":00",timeH:h,timeM:0,done:false});
    }
  } else {
    // Выходной — утренние практики
    (profile.practices||[]).filter(pr=>pr&&pr!=="Нет").forEach((pr,i)=>{
      const h=wakeH+1; const m=i*20;
      plannerEvents.push({id:"practice-w-"+i,type:"health",emoji:"🧘",
        title:pr,time:h+":"+(m<10?"0"+m:m),timeH:h,timeM:m,done:false});
    });
    if((profile.sport||[]).length>0 && !profile.sport.includes("Не занимаюсь")) {
      plannerEvents.push({id:"sport-w",type:"health",emoji:"🏃",
        title:"Спорт: "+(profile.sport||[]).slice(0,2).join(", "),
        time:(wakeH+3)+":00",timeH:wakeH+3,timeM:0,done:false});
    }
    plannerEvents.push({id:"weekend-free",type:"anchor",emoji:"🌿",
      title:"Свободное время / отдых",time:"12:00",timeH:12,timeM:0,done:false,fixed:true});
  }

  // Задачи с временем
  dueTasks.filter(t=>t.preferredTime).forEach(t=>{
    const [h,m]=(t.preferredTime||"12:00").split(":").map(Number);
    plannerEvents.push({
      id:"task-"+t.id, type:"task",
      emoji:t.section==="home"?"🏠":t.section==="health"?"💚":t.section==="beauty"?"✨":t.section==="hobbies"?"🎨":"📌",
      title:t.title, time:t.preferredTime, timeH:h, timeM:m||0,
      done:t.doneDate===today, taskId:t.id,
      onDone:()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:x.doneDate===today?null:today,lastDone:x.doneDate===today?x.lastDone:today}:x))
    });
  });

  // Отбой
  plannerEvents.push({id:"sleep",type:"anchor",emoji:"🌙",title:"Отбой",time:profile.sleep||"23:00",timeH:sleepH,timeM:0,done:false,fixed:true});
  plannerEvents.sort((a,b)=>a.timeH*60+a.timeM-(b.timeH*60+b.timeM));

  const noTimeTasks = dueTasks.filter(t=>!t.preferredTime);
  const sectionColor={home:T.gold,health:T.success,beauty:"#B882E8",pets:T.teal,hobbies:"#E8556D"};

  return (
    <div>
      {/* ═══ 1. ШАПКА — луна, знак зодиака, стихия ══════════════ */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div title={"Луна: "+moon.n+" — "+moon.t}
          style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"rgba(45,32,16,0.05)",borderRadius:12}}>
          <span style={{fontSize:22}}>{moon.e}</span>
          <div><div style={{fontSize:13,fontWeight:600,color:T.text0}}>{moon.n}</div><div style={{fontSize:10,color:T.text3}}>{moon.t}</div></div>
        </div>
        <div title={"Солнце в знаке "+todayZodiac.name}
          style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"rgba(45,32,16,0.05)",borderRadius:12}}>
          <span style={{fontSize:22}}>{todayZodiac.emoji}</span>
          <div><div style={{fontSize:13,fontWeight:600,color:T.text0}}>{todayZodiac.name}</div><div style={{fontSize:10,color:T.text3}}>Знак сегодня</div></div>
        </div>
        <div title={"Стихия "+dayInfo.element+": "+dayInfo.tip}
          style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"rgba(45,32,16,0.05)",borderRadius:12}}>
          <span style={{fontSize:22}}>{dayInfo.emoji}</span>
          <div><div style={{fontSize:13,fontWeight:600,color:dayInfo.color}}>{dayInfo.element}</div><div style={{fontSize:10,color:T.text3}}>Стихия дня</div></div>
        </div>
        {tcm?.el&&<div title={"Твоя стихия: "+tcm.el.name+(tcm.el.yin?" (Инь)":" (Ян)")+". Органы: "+tcm.el.organ}
          style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"rgba(45,106,79,0.08)",borderRadius:12}}>
          <span style={{fontSize:22}}>{tcm.el.emoji}</span>
          <div><div style={{fontSize:13,fontWeight:600,color:T.gold}}>{tcm.el.name}</div><div style={{fontSize:10,color:T.text3}}>Твоя стихия</div></div>
        </div>}
        <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:8,padding:"8px 12px",
          background:isWorkDay?"rgba(29,78,107,0.08)":"rgba(45,106,79,0.1)",borderRadius:12}}>
          <span style={{fontSize:16}}>{isWorkDay?"💼":"🌿"}</span>
          <span style={{fontSize:13,color:T.text1,fontWeight:500}}>
            {isWorkDay?"Рабочий день · "+(profile.workStart||"9:00")+"–"+(profile.workEnd||"18:00"):
             isWeekend?"Выходной день — время для себя":"Нерабочий день"}
          </span>
        </div>
      </div>

      {/* ═══ 2. ЛИЧНО ДЛЯ ТЕБЯ — ТКМ профиль ════════════════════ */}
      {tcm?.el&&(tcm.syndromes?.length>0||tcm.uniqueOrgans?.length>0)&&(
        <div style={{padding:"10px 14px",background:"rgba(45,106,79,0.07)",borderRadius:12,marginBottom:10,borderLeft:"3px solid "+T.gold}}>
          <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:6}}>ЛИЧНО ДЛЯ ТЕБЯ · ТКМ</div>
          {tcm.syndromes?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:5}}>
            {tcm.syndromes.map(s=><span key={s} className="badge bw" style={{fontSize:11}}>{s}</span>)}
          </div>}
          {tcm.uniqueOrgans?.length>0&&<div style={{fontSize:13,color:T.text2}}>
            Внимание: <span style={{color:T.warn}}>{tcm.uniqueOrgans.join(" · ")}</span>
          </div>}
          {tcm.digestionNote&&<div style={{fontSize:12,color:T.text3,marginTop:3,fontStyle:"italic"}}>{tcm.digestionNote}</div>}
        </div>
      )}

      {/* ═══ 3. ДЕНЬ ПО ТКМ ══════════════════════════════════════ */}
      <div className="card" style={{marginBottom:10,borderLeft:"3px solid "+dayInfo.color}}>
        <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>
          {dayInfo.emoji} {dayInfo.name.toUpperCase()} — {dayInfo.element.toUpperCase()}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div style={{background:"rgba(45,106,79,0.07)",borderRadius:9,padding:"8px 10px"}}>
            <div style={{fontSize:10,color:T.success,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:5}}>СЕГОДНЯ ХОРОШО</div>
            {dayInfo.good.map((g,i)=><div key={i} style={{fontSize:12,color:T.text1,marginBottom:2}}>✦ {g}</div>)}
          </div>
          <div style={{background:"rgba(139,32,32,0.05)",borderRadius:9,padding:"8px 10px"}}>
            <div style={{fontSize:10,color:T.danger,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:5}}>ЛУЧШЕ ИЗБЕГАТЬ</div>
            {dayInfo.avoid.map((a,i)=><div key={i} style={{fontSize:12,color:T.text2,marginBottom:2}}>✗ {a}</div>)}
          </div>
        </div>
        {recs?.length>0&&recs.map((r,i)=>(
          <div key={i} style={{display:"flex",gap:8,padding:"5px 8px",borderRadius:8,marginBottom:3,
            background:r.type==="warn"?"rgba(139,32,32,0.05)":"rgba(45,106,79,0.06)"}}>
            <span style={{fontSize:13,flexShrink:0}}>{r.type==="warn"?"⚠️":"⭐"}</span>
            <span style={{fontSize:12,color:r.type==="warn"?T.warn:T.success,lineHeight:1.4}}>{r.text}</span>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"rgba(45,32,16,0.05)",borderRadius:9,marginTop:6}}>
          <span style={{fontSize:18}}>{hourOrgan.emoji}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>МЕРИДИАН · {currentH}:00</div>
            <div style={{fontSize:14,color:T.gold,fontWeight:500}}>{hourOrgan.organ}</div>
            <div style={{fontSize:12,color:T.text2,lineHeight:1.4}}>{hourOrgan.tip}</div>
          </div>
        </div>
      </div>

      {/* ═══ 4. ПЛАНИРОВЩИК ══════════════════════════════════════ */}
      <div className="card" style={{marginBottom:12}}>
        <div className="card-hd" style={{cursor:"pointer"}} onClick={()=>setPlannerOpen(o=>!o)}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>📅</span>
            <div className="card-title">Планировщик дня</div>
            <span className="badge bm" style={{fontSize:10}}>
              {plannerEvents.filter(e=>e.done&&!e.fixed).length}/{plannerEvents.filter(e=>!e.fixed).length}
            </span>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button className="btn btn-ghost btn-sm" style={{fontSize:11,padding:"2px 8px"}}
              onClick={e=>{e.stopPropagation();setAddModal(true);}}>+</button>
            <span style={{color:T.text3,fontSize:14}}>{plannerOpen?"▲":"▼"}</span>
          </div>
        </div>
        {plannerOpen&&(
          <div style={{marginTop:8}}>
            {plannerEvents.map((ev,idx)=>{
              const evMin=ev.timeH*60+ev.timeM;
              const nextMin=idx<plannerEvents.length-1?plannerEvents[idx+1].timeH*60+plannerEvents[idx+1].timeM:sleepH*60+59;
              const isNow=evMin<=nowMinutes&&nowMinutes<nextMin;
              const isPast=evMin<nowMinutes&&!isNow;
              return(
                <div key={ev.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",
                  borderBottom:"1px solid "+T.bdrS,opacity:isPast&&ev.done?0.6:1}}>
                  <div style={{minWidth:44,textAlign:"right",paddingTop:2,flexShrink:0}}>
                    <span style={{fontSize:12,color:isNow?T.gold:isPast?T.text3:T.text2,
                      fontFamily:"'JetBrains Mono'",fontWeight:isNow?700:400}}>{ev.time}</span>
                  </div>
                  <div style={{width:2,alignSelf:"stretch",minHeight:18,
                    background:isNow?T.gold:isPast?T.bdrS:T.bdr,borderRadius:1,flexShrink:0}}/>
                  {!ev.fixed?(
                    <div onClick={()=>{if(ev.onDone)ev.onDone();}} style={{
                      width:18,height:18,borderRadius:4,flexShrink:0,marginTop:1,cursor:"pointer",
                      border:"1.5px solid "+(ev.done?T.success:T.bdr),
                      background:ev.done?"rgba(45,106,79,0.2)":"transparent",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.success}}>
                      {ev.done?"✓":""}
                    </div>
                  ):<div style={{width:18,flexShrink:0}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                      <span style={{fontSize:14}}>{ev.emoji}</span>
                      <span style={{fontSize:14,color:ev.done?T.text3:ev.type==="anchor"?T.text0:T.text1,
                        textDecoration:ev.done?"line-through":"none",fontWeight:ev.type==="anchor"?600:400,
                        lineHeight:1.3,flex:1}}>{ev.title}</span>
                      {isNow&&<span style={{fontSize:9,color:T.gold,fontFamily:"'JetBrains Mono'",
                        background:"rgba(45,106,79,0.15)",padding:"1px 5px",borderRadius:3,flexShrink:0}}>СЕЙЧАС</span>}
                    </div>
                    {ev.type&&ev.type!=="anchor"&&ev.type!=="commute"&&sectionColor[ev.section]&&(
                      <span style={{fontSize:10,color:sectionColor[ev.section]||T.text3,fontFamily:"'JetBrains Mono'"}}>{ev.section}</span>
                    )}
                  </div>
                  {!ev.fixed&&ev.taskId&&(
                    <div style={{display:"flex",gap:3,flexShrink:0}}>
                      <div className="ico-btn" style={{color:T.teal,opacity:.6,fontSize:12}}
                        onClick={()=>setModal(tasks.find(t=>t.id===ev.taskId)||{})}>✏️</div>
                      <div className="ico-btn danger" style={{fontSize:12}}
                        onClick={()=>{setTasks(p=>p.map(t=>t.id===ev.taskId?{...t,doneDate:today}:t));notify("Перенесено ✦");}}>↻</div>
                    </div>
                  )}
                </div>
              );
            })}
            {noTimeTasks.length>0&&(
              <div style={{marginTop:8,padding:"8px 10px",background:"rgba(45,32,16,0.04)",borderRadius:9}}>
                <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>
                  БЕЗ ВРЕМЕНИ — {noTimeTasks.length} дел
                </div>
                {noTimeTasks.map(t=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid "+T.bdrS}}>
                    <div onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:x.doneDate===today?null:today,lastDone:x.doneDate===today?x.lastDone:today}:x))}
                      style={{width:18,height:18,borderRadius:4,border:"1.5px solid "+(t.doneDate===today?T.success:T.bdr),
                        background:t.doneDate===today?"rgba(45,106,79,0.2)":"transparent",
                        display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,color:T.success}}>
                      {t.doneDate===today?"✓":""}
                    </div>
                    <span style={{flex:1,fontSize:14,color:t.doneDate===today?T.text3:T.text1,
                      textDecoration:t.doneDate===today?"line-through":"none"}}>{t.title}</span>
                    <input type="time" value={t.preferredTime||""}
                      onChange={e=>setTasks(p=>p.map(x=>x.id===t.id?{...x,preferredTime:e.target.value}:x))}
                      style={{width:52,fontSize:11,fontFamily:"'JetBrains Mono'",color:T.gold,
                        background:"transparent",border:"none",outline:"none"}}/>
                    <div className="ico-btn danger" style={{fontSize:12}}
                      onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))}>✕</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ 5. ЭМОЦИИ ═══════════════════════════════════════════ */}
      <div className="card" style={{marginBottom:12}}>
        <div className="card-hd" style={{cursor:"pointer"}} onClick={()=>setMoodOpen(o=>!o)}>
          <div className="card-title">Как ты сейчас?</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {todayE.mood&&<span style={{fontSize:16}}>{todayE.mood}</span>}
            {todayE.energy&&<span style={{fontSize:12,color:T.gold,fontFamily:"'JetBrains Mono'"}}>{todayE.energy}/5</span>}
            <span style={{color:T.text3,fontSize:14}}>{moodOpen?"▲":"▼"}</span>
          </div>
        </div>
        {moodOpen&&<>
          <div className="sec-lbl">Настроение</div>
          <div className="mood-pick" style={{marginBottom:14}}>
            {["😔","😕","😐","🙂","😊","🤩"].map(m=><span key={m} className={"mood-btn"+(todayE.mood===m?" on":"")} onClick={()=>saveJ({mood:m})}>{m}</span>)}
          </div>
          <div className="sec-lbl">Энергия</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[1,2,3,4,5].map(n=><div key={n} className={"en-dot"+((todayE.energy||0)>=n?" on":"")} onClick={()=>saveJ({energy:n})}>{n}</div>)}
          </div>
          <div className="sec-lbl">Преобладающая эмоция</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {[
              {emoji:"😤",label:"Раздражение",organ:"Печень",balance:["Прогулка 20 мин","Кислые продукты","Дыхание 4-6с","Завершить 1 дело"]},
              {emoji:"😰",label:"Тревога",organ:"Сердце",balance:["Медитация 10 мин","Горький шоколад","Убрать телефон","Запиши 3 вещи под контролем"]},
              {emoji:"😟",label:"Беспокойство",organ:"Желудок",balance:["Тёплый чай","Потрогай реальный предмет","Список 3 шагов","Музыка"]},
              {emoji:"😢",label:"Грусть",organ:"Лёгкие",balance:["Дыхание 5 мин","Прогулка","Белые продукты","Выброси ненужное"]},
              {emoji:"😨",label:"Страх",organ:"Почки",balance:["Тепло на поясницу","Тёплый бульон","Безопасное место","Запиши страх"]},
              {emoji:"😊",label:"Радость",organ:"Сердце",balance:["Поделись с близким","Важное дело","Прогулка","Не спеши с решениями"]},
              {emoji:"🌿",label:"Спокойствие",organ:"Все",balance:["Сохрани состояние","Помоги другому","Медитируй","Важная цель"]},
            ].map(e=>(
              <div key={e.label} onClick={()=>saveJ({todayEmotion:todayE.todayEmotion===e.label?null:e.label})}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"7px 10px",
                  borderRadius:12,border:"1px solid "+(todayE.todayEmotion===e.label?T.gold:T.bdr),
                  background:todayE.todayEmotion===e.label?"rgba(45,106,79,0.12)":"transparent",cursor:"pointer",minWidth:68}}>
                <span style={{fontSize:22}}>{e.emoji}</span>
                <span style={{fontSize:11,color:todayE.todayEmotion===e.label?T.gold:T.text2,textAlign:"center"}}>{e.label}</span>
              </div>
            ))}
          </div>
          {todayE.todayEmotion&&(()=>{
            const eData={
              "Раздражение":{organ:"Печень",balance:["Прогулка 20 мин","Кислые продукты","Дыхание 4-6с","Завершить 1 дело"]},
              "Тревога":{organ:"Сердце",balance:["Медитация 10 мин","Горький шоколад","Убрать телефон","Запиши 3 вещи под контролем"]},
              "Беспокойство":{organ:"Желудок",balance:["Тёплый чай","Потрогай реальный предмет","Список 3 шагов","Музыка"]},
              "Грусть":{organ:"Лёгкие",balance:["Дыхание 5 мин","Прогулка","Белые продукты","Выброси ненужное"]},
              "Страх":{organ:"Почки",balance:["Тепло на поясницу","Тёплый бульон","Безопасное место","Запиши страх"]},
              "Радость":{organ:"Сердце",balance:["Поделись с близким","Важное дело","Прогулка","Не спеши с решениями"]},
              "Спокойствие":{organ:"Все",balance:["Сохрани состояние","Помоги другому","Медитируй","Важная цель"]},
            }[todayE.todayEmotion];
            if(!eData) return null;
            return(
              <div style={{padding:"10px 12px",background:"rgba(45,106,79,0.06)",borderRadius:10,marginBottom:10}}>
                <div style={{fontSize:12,color:T.text2,marginBottom:6}}>
                  Орган: <span style={{color:T.gold}}>{eData.organ}</span> · Как вернуть баланс:
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                  {eData.balance.map((b,i)=><div key={i} style={{fontSize:12,color:T.text1,padding:"5px 8px",background:"rgba(45,32,16,0.04)",borderRadius:7}}>✦ {b}</div>)}
                </div>
              </div>
            );
          })()}
          <div className="fld" style={{marginBottom:0}}>
            <label>Главная мысль дня</label>
            <textarea style={{minHeight:48}} placeholder="Что важно сегодня для тебя?" value={todayE.thought||""} onChange={e=>saveJ({thought:e.target.value})}/>
          </div>
        </>}
      </div>

      {/* ═══ В дороге (компактно) ════════════════════════════════ */}
      {profile.commuteTime&&profile.commuteTime!=="Дома"&&(
        <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.teal}}>
          <div className="card-hd" style={{cursor:"pointer"}} onClick={()=>setCommuteOpen(o=>!o)}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span>🚌</span>
              <span style={{fontSize:14,fontWeight:500}}>В дороге</span>
              <span style={{fontSize:11,color:T.text3}}>{profile.commuteTime}</span>
            </div>
            <span style={{color:T.text3,fontSize:14}}>{commuteOpen?"▲":"▼"}</span>
          </div>
          {commuteOpen&&(
            <div style={{marginTop:10}}>
              {!commuteRec&&!commuteLoading&&<button className="btn btn-primary btn-sm" onClick={getCommuteRec}>✦ Рекомендация на дорогу</button>}
              {commuteLoading&&<div style={{fontSize:13,color:T.text3,fontStyle:"italic"}}>Подбираю...</div>}
              {commuteRec&&<>
                <div style={{fontSize:14,color:T.text1,lineHeight:1.6,fontStyle:"italic"}}>{commuteRec}</div>
                <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={()=>{setCommuteRec("");getCommuteRec();}}>↻</button>
              </>}
            </div>
          )}
        </div>
      )}

      {addModal&&<TaskModal defaultSection="today" onSave={t=>{setTasks(p=>[...p,t]);notify("Задача добавлена");}} onClose={()=>setAddModal(false)}/>}
      {modal!==null&&<TaskModal task={modal?.id?modal:null} defaultSection={modal?.section||"tasks"} onSave={t=>{setTasks(p=>modal?.id?p.map(x=>x.id===t.id?t:x):[...p,t]);setModal(null);notify("Сохранено");}} onClose={()=>setModal(null)}/>}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  TASKS
// ══════════════════════════════════════════════════════════════
function TasksSection({profile,tasks,setTasks,today,kb,notify}) {
  const [modal,setModal]=useState(null);
  const [editId,setEditId]=useState(null);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const secs=[["all","Все"],["work","Работа"],["home","Дом"],["health","Здоровье"],["beauty","Красота"],["pets","Питомцы"],["shopping","Покупки"],["hobbies","Хобби"]];
  const filtered=tasks.filter(t=>{if(filter!=="all"&&t.section!==filter)return false;if(search&&!t.title.toLowerCase().includes(search.toLowerCase()))return false;return true;});
  const isTrulyDue = (t) => {
    if(!t.freq) return false;
    if(t.freq==="once") return !t.lastDone && !t.doneDate;
    if(t.freq==="daily" || t.freq==="workdays") return isDue(t,today);
    if(t.freq.startsWith("weekly:") || t.freq.startsWith("monthly:")) return isDue(t,today);
    if(t.freq.startsWith("every:")) {
      const n = parseInt(t.freq.split(":")[1]);
      if(n > 7 && !t.lastDone) return false;
      return isDue(t,today);
    }
    return false;
  };
  const due=filtered.filter(isTrulyDue);
  const done=filtered.filter(t=>t.doneDate===today);
  const recurring=tasks.filter(t=>t.freq&&t.freq!=="once"&&!due.includes(t)&&(filter==="all"||t.section===filter));
  const toggleDone=id=>{setTasks(p=>p.map(t=>t.id===id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t));};

  return(
    <div>
      <AiBox kb={kb} prompt={`Мои задачи: ${tasks.map(t=>t.title).join(", ")}. Помоги расставить приоритеты — что важнее всего сделать сегодня и почему, учитывая мой хронотип ${profile.chronotype||"—"} и то что меня стрессит: ${(profile.stressors||[]).join(", ")||"—"}.`} label="Как расставить приоритеты" btnText="Расставить приоритеты" placeholder="Помогу понять что сделать в первую очередь..."/>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <input style={{flex:1,padding:"10px 14px",background:"rgba(255,255,255,.03)",border:"1px solid "+T.bdr,borderRadius:10,color:T.text0,fontFamily:"'Crimson Pro',serif",fontSize:16,outline:"none"}} placeholder="Поиск задач..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal({})}>+ Задача</button>
      </div>
      <div className="tabs">{secs.map(([v,l])=><div key={v} className={`tab${filter===v?" on":""}`} onClick={()=>setFilter(v)}>{l}</div>)}</div>
      <div className="g3" style={{marginBottom:16}}>
        <div className="stat"><div className="stat-n">{due.length}</div><div className="stat-l">На сегодня</div></div>
        <div className="stat"><div className="stat-n">{done.length}</div><div className="stat-l">Выполнено</div></div>
        <div className="stat"><div className="stat-n">{tasks.filter(t=>t.freq&&t.freq!=="once").length}</div><div className="stat-l">Регулярных</div></div>
      </div>
      {due.length>0&&<><div className="sec-lbl">На сегодня</div>
        <div className="card">{due.map(task=>(
          <div key={task.id} className="task-row">
            <div className={`prio p${task.priority||"m"}`}/>
            <div className={`chk${task.doneDate===today?" done":""}`} onClick={()=>toggleDone(task.id)}>{task.doneDate===today?"✓":""}</div>
            <div className="task-body">
              <div className={`task-name${task.doneDate===today?" done":""}`}>{task.title}</div>
              <div className="task-meta">
                {task.section&&<span className="badge bm">{task.section}</span>}
                {task.freq&&task.freq!=="once"&&<span className="badge bt">{freqLabel(task.freq)}</span>}
                {task.preferredTime&&<span className="badge bg">🕐 {task.preferredTime}</span>}
                {task.deadline&&<span className="badge bw">📅 {new Date(task.deadline).toLocaleDateString("ru-RU")}</span>}
              </div>
              {task.notes&&<div className="task-notes">{task.notes}</div>}
            </div>
            <div className="card-acts">
              <div className="ico-btn" onClick={()=>setModal(task)}>✏️</div>
              <div className="ico-btn" onClick={()=>setModal(task)} style={{color:T.teal,opacity:.7}}>✏️</div>
              <div className="ico-btn danger" onClick={()=>{setTasks(p=>p.filter(t=>t.id!==task.id));notify("Удалено");}}>✕</div>
            </div>
          </div>
        ))}</div></>}
      {done.length>0&&<><div className="sec-lbl" style={{marginTop:16}}>Выполнено сегодня</div>
        <div className="card" style={{opacity:.6}}>{done.map(task=>(
          <div key={task.id} className="task-row">
            <div className="chk done" onClick={()=>toggleDone(task.id)}>✓</div>
            <div className="task-body"><div className="task-name done">{task.title}</div></div>
          </div>
        ))}</div></>}
      {recurring.length>0&&<><div className="sec-lbl" style={{marginTop:16}}>Регулярные (не сегодня)</div>
        <div className="card">{recurring.map(task=>(
          <div key={task.id} className="task-row" style={{opacity:.55}}>
            <div className="task-body">
              <div className="task-name">{task.title}</div>
              <div className="task-meta"><span className="badge bm">{task.section}</span><span className="badge bt">{freqLabel(task.freq)}</span></div>
            </div>
            <div className="card-acts">
              <div className="ico-btn" onClick={()=>setModal(task)}>✏️</div>
              <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
            </div>
          </div>
        ))}</div></>}
      {filtered.length===0&&<div className="empty"><span className="empty-ico">✦</span><p>Задач нет. Добавь первую!</p></div>}
      {modal!==null&&<TaskModal task={modal.id?modal:null} defaultSection={filter!=="all"?filter:"tasks"} onSave={t=>{setTasks(p=>modal.id?p.map(x=>x.id===t.id?t:x):[...p,t]);notify(modal.id?"Обновлено":"Добавлено");}} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCHEDULE
// ══════════════════════════════════════════════════════════════
function ScheduleSection({profile,tasks,setTasks,today,kb,notify}) {
  const [view,setView]=useState("week");
  const [offset,setOffset]=useState(0);
  const [aiText,setAiText]=useState("");
  const [loading,setLoading]=useState(false);

  const weekDays=()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1+offset*7);return Array.from({length:7},(_,i)=>{const dd=new Date(d);dd.setDate(d.getDate()+i);return toDay(dd);});};
  const days=weekDays();

  const getAiSchedule=async()=>{setLoading(true);const r=await askClaude(kb,`Составь детальное расписание на неделю для ${profile.name||"меня"}. Работа: ${profile.workStart||"9:00"}–${profile.workEnd||"18:00"} (${profile.workType||"офис"}), дорога: ${profile.commuteTime||"нет"}. Подъём: ${profile.wake||"7:00"}, отбой: ${profile.sleep||"23:00"}. Хронотип: ${profile.chronotype||"—"}. Регулярные дела: ${tasks.filter(t=>t.freq&&t.freq!=="once").map(t=>`${t.title}(${freqLabel(t.freq)})`).join("; ")||"нет"}. Дни уборки: ${(profile.cleanDays||[]).join(", ")||"—"}. Закупки: ${profile.shopDay||"—"}. Практики: ${(profile.practices||[]).join(",")||"—"}. Спорт: ${(profile.sport||[]).join(",")||"—"}. ВАЖНО: все практики и спорт ТОЛЬКО после ${profile.workEnd||"18:00"}. Дай конкретный план по дням с точным временем.`,1000);setAiText(r);setLoading(false);};

  const SECT_COLORS={work:`rgba(90,142,200,.18)`,health:`rgba(91,173,122,.18)`,beauty:`rgba(140,90,200,.18)`,pets:`rgba(78,201,190,.18)`,home:`rgba(200,164,90,.12)`,shopping:`rgba(200,140,58,.15)`};
  const SECT_TEXT={work:T.info,health:T.success,beauty:T.purple,pets:T.teal,home:T.gold,shopping:T.warn};

  return(
    <div>
      <div className="tabs">{[["week","Неделя"],["ai","ИИ-план недели"]].map(([v,l])=><div key={v} className={`tab${view===v?" on":""}`} onClick={()=>setView(v)}>{l}</div>)}</div>
      {view==="week"&&<>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setOffset(o=>o-1)}>←</button>
          <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:T.text3}}>{offset===0?"Эта неделя":offset===1?"Следующая":`${offset>0?"+":""}${offset} нед.`}</span>
          <button className="btn btn-ghost btn-sm" onClick={()=>setOffset(o=>o+1)}>→</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setOffset(0)}>Сегодня</button>
        </div>
        <div className="week-grid">
          {days.map((day,i)=>{
            const dt=new Date(day);
            const dayTasks=tasks.filter(t=>isDue({...t},day));
            const isToday=day===today;
            return(
              <div key={day} className={`wday${isToday?" today":""}`}>
                <div className="wday-hd">{DAY_RU[dt.getDay()]}</div>
                <div className={`wday-n${isToday?" today-n":""}`}>{dt.getDate()}</div>
                {dayTasks.slice(0,5).map(t=>(
                  <div key={t.id} className={`wtask${t.doneDate===day?" done":""}`}
                    style={{background:SECT_COLORS[t.section]||"rgba(200,164,90,.1)",color:SECT_TEXT[t.section]||T.gold}}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length>5&&<div style={{fontSize:9,color:T.text3,textAlign:"center",marginTop:2}}>+{dayTasks.length-5}</div>}
              </div>
            );
          })}
        </div>
      </>}
      {view==="ai"&&<>
        <div className="ai-box" style={{background:"linear-gradient(135deg,rgba(45,106,79,0.1),rgba(29,78,107,0.07))",borderColor:"rgba(45,106,79,0.3)"}}>
          <div className="ai-hd"><div className="ai-pulse"/><div className="ai-lbl">ИИ-Планировщик недели</div></div>
          {aiText?<div className="ai-text">{aiText}</div>:<div className="ai-dim">Составлю оптимальное расписание под твой ритм и задачи — нажми кнопку</div>}
          <div style={{marginTop:14,display:"flex",gap:8}}>
            <button className="btn btn-primary btn-sm" onClick={getAiSchedule} disabled={loading}>{loading?"Составляю...":"✦ Составить план недели"}</button>
            {aiText&&<button className="btn btn-ghost btn-sm" onClick={()=>setAiText("")}>Обновить</button>}
          </div>
        </div>
        <AiBox kb={kb} prompt={`Как ${profile.name||"мне"} всё успевать и не надрываться? Хронотип: ${profile.chronotype||"—"}, работа до ${profile.workEnd||"18:00"}, подъём ${profile.wake||"7:00"}. Меня истощает: ${(profile.workDrain||[]).join(",")||"—"}, стрессоры: ${(profile.stressors||[]).join(",")||"—"}. Восстанавливаюсь через: ${(profile.recovery||[]).join(",")||"—"}. Тип планирования: ${profile.planningStyle||"—"}. Дай конкретные советы по управлению энергией именно для моего типа.`} label="Как всё успевать" btnText="Как организовать день" placeholder="Помогу найти твой ритм и баланс..."/>
      </>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  WORK
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
//  ПРОФЕССИОНАЛЬНЫЕ ДЕДЛАЙНЫ ПО ОТЧЁТНОСТИ
// ══════════════════════════════════════════════════════════════
function getProfDeadlines(profile) {
  const prof = profile.profDeadlines || "";
  const year = new Date().getFullYear(); // 2026
  const tasks = [];

  // Создаёт дедлайн в ТЕКУЩЕМ году — не сдвигает в будущее
  // Прошедшие → "Просроченные", будущие → "Ближайшие"
  const mk = (title, month, day, note="", organ="") => ({
    id: Date.now()+Math.random(),
    title, section:"work", freq:"once", priority:"h",
    deadline: new Date(year, month-1, day).toISOString().split("T")[0],
    notes: note, organ,
    lastDone:"", doneDate:"", preferredTime:"09:00", isDeadline:true,
  });

  // ══════════════════════════════════════════════════════
  //  БУХГАЛТЕР / ИП — КАЗАХСТАН 2026
  //  Источник: mybuh.kz/calendar/tax (официальный налоговый календарь КЗ)
  //  НК РК: ст.209 (ФНО 200), ст.424 (НДС), ст.305 (КПН авансы)
  //  ст.315 (КПН год), ст.524 (имущество/земля)
  //
  //  ТОЧНЫЕ СРОКИ С УЧЁТОМ ВЫХОДНЫХ И ПРАЗДНИКОВ 2026:
  //
  //  ФНО 200.00 — СДАЧА (до 15-го 2-го месяца после квартала):
  //    1кв → 15.05 (пт) ✓
  //    2кв → 15.08 (сб) → ПЕРЕНОС на 17.08 (пн)
  //    3кв → 15.11 (вс) → ПЕРЕНОС на 16.11 (пн)
  //    4кв → 15.02.2027 (пн) ✓
  //
  //  ФНО 300.00 — СДАЧА (те же даты что и ФНО 200):
  //    1кв → 15.05.2026 | 2кв → 17.08 | 3кв → 16.11 | 4кв → 15.02.2027
  //
  //  УПЛАТА ИПН+ОПВ+ОСМС+СО+НДС (до 25-го 2-го месяца после квартала):
  //    1кв → 25.05 (пн) ✓ | 2кв → 25.08 (вт) ✓
  //    3кв → 25.11 (ср) ✓ | 4кв → 25.02.2027 (чт) ✓
  //
  //  КПН АВАНСЫ — 25-го каждого месяца (с учётом переносов):
  //    июль → 27.07 (пн, т.к. 25.07 — сб)
  //    октябрь → 27.10 (вт, т.к. 25.10 — праздник День Республики)
  //    остальные месяцы — без переноса
  //
  //  ПРАЗДНИКИ 2026 влияющие на сроки:
  //    9 мая (сб) → перенос на 11 мая (пн)
  //    27 мая — Курбан-айт (ср) — но не влияет на 25 мая
  //    30 авг (вс) → перенос на 31 авг (пн) — не влияет на 25 авг
  //    25 окт — День Республики → перенос КПН аванса на 27 окт
  // ══════════════════════════════════════════════════════
  if(prof.includes("Бухгалтер") || prof.includes("ИП")) {

    // ── МАЙ 2026 ─────────────────────────────────────
    tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (1 кв. 2026)",          5, 15,
      "Декларация по ИПН, ОПВ, ВОСМС, ООСМС, СО за янв-март. Срок: 15 мая (пт). Ст.209 НК РК","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 300.00 — СДАЧА (1 кв. 2026)",          5, 15,
      "Декларация по НДС за янв-март. Срок: 15 мая (пт). Ст.424 НК РК. Нельзя сдать раньше 15 апреля","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА ИПН+ОПВ+ОСМС+СО (1 кв. 2026)",     5, 25,
      "Уплата налогов из ФНО 200.00 за янв-март. Срок: 25 мая (пн)","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА НДС (1 кв. 2026)",                   5, 25,
      "Уплата НДС по ФНО 300.00 за янв-март. Срок: 25 мая (пн). Ст.424 НК РК","КГД"));
    tasks.push(mk("💰 КГД: Аванс налог на имущество/землю (2-й срок)", 5, 25,
      "2-й из 4 авансовых платежей — 1/4 от годовой суммы. 25 мая (пн). Ст.512, 523 НК РК","КГД"));
    tasks.push(mk("💰 КГД: Аванс по КПН — май 2026",                   5, 25,
      "Ежемесячный аванс по КПН. 25 мая (пн). Ст.305 НК РК","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 150.00 — Трансфертное ценообразование", 5, 31,
      "При наличии контролируемых сделок с нерезидентами. Ст.295 НК РК","КГД"));

    // ── ИЮНЬ 2026 ────────────────────────────────────
    tasks.push(mk("💰 КГД: Аванс по КПН — июнь 2026",                  6, 25,
      "Ежемесячный аванс по КПН. 25 июня (чт)","КГД"));
    tasks.push(mk("📋 Годовое собрание ТОО / акционеров АО",           6, 30,
      "Не позднее 6 месяцев после конца фин. года. ЗРК «О ТОО» ст.45","МЮ"));

    // ── ИЮЛЬ 2026 ────────────────────────────────────
    tasks.push(mk("📊 БНС: Форма 1-Т (2 кв. 2026) — Труд и зарплата", 7, 10,
      "Численность и з/п за апрель-июнь 2026","БНС"));
    tasks.push(mk("📊 БНС: Форма 1-П — Промышленность (июль 2026)",    7, 10,
      "Ежемесячный отчёт за июль 2026 (для пром. предприятий)","БНС"));
    // 25 июля — суббота → перенос на 27 июля (пн)
    tasks.push(mk("💰 КГД: Аванс по КПН — июль 2026",                  7, 27,
      "Ежемесячный аванс по КПН. Перенос: 25.07 (сб) → 27.07 (пн). Ст.305 НК РК","КГД"));

    // ── АВГУСТ 2026 ───────────────────────────────────
    tasks.push(mk("📊 БНС: Форма 1-П — Промышленность (август 2026)",  8, 10,
      "Ежемесячный отчёт за август 2026","БНС"));
    // 15 августа — суббота → перенос на 17 августа (пн)
    tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (2 кв. 2026)",          8, 17,
      "Декларация по ИПН, ОПВ, ВОСМС, ООСМС, СО за апр-июнь. Перенос: 15.08 (сб) → 17.08 (пн)","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 300.00 — СДАЧА (2 кв. 2026)",          8, 17,
      "Декларация по НДС за апр-июнь. Перенос: 15.08 (сб) → 17.08 (пн)","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 910.00 — СДАЧА (1 п/г 2026)",          8, 17,
      "Упрощённая декларация за янв-июнь. Перенос: 15.08 (сб) → 17.08 (пн). Ст.688 НК РК","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА ИПН+ОПВ+ОСМС+СО (2 кв. 2026)",     8, 25,
      "Уплата налогов из ФНО 200.00 за апр-июнь. 25 авг (вт)","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА НДС (2 кв. 2026)",                   8, 25,
      "Уплата НДС по ФНО 300.00 за апр-июнь. 25 авг (вт)","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА по ФНО 910.00 (1 п/г 2026)",        8, 25,
      "Уплата ИПН/КПН + соцналог по упрощённой декларации. 25 авг (вт)","КГД"));
    tasks.push(mk("💰 КГД: Аванс налог на имущество/землю (3-й срок)", 8, 25,
      "3-й из 4 авансовых платежей. 25 авг (вт). Ст.512, 523 НК РК","КГД"));
    tasks.push(mk("💰 КГД: Аванс по КПН — август 2026",                8, 25,
      "Ежемесячный аванс по КПН. 25 авг (вт)","КГД"));

    // ── СЕНТЯБРЬ 2026 ─────────────────────────────────
    tasks.push(mk("📋 Воинский учёт — годовая сверка",                  9,  1,
      "Ежегодная сверка списков с военкоматом (ВЦУ)","HR"));
    tasks.push(mk("💰 КГД: Аванс по КПН — сентябрь 2026",              9, 25,
      "Ежемесячный аванс по КПН. 25 сен (пт)","КГД"));

    // ── ОКТЯБРЬ 2026 ──────────────────────────────────
    tasks.push(mk("📊 БНС: Форма 1-П — Промышленность (октябрь 2026)", 10, 10,
      "Ежемесячный отчёт за октябрь 2026","БНС"));
    tasks.push(mk("📊 БНС: Форма 1-Т (3 кв. 2026) — Труд и зарплата", 10, 10,
      "Численность и з/п за июль-сентябрь 2026","БНС"));
    // 25 октября — День Республики (праздник) → перенос на 27 октября (вт)
    tasks.push(mk("💰 КГД: Аванс по КПН — октябрь 2026",               10, 27,
      "Ежемесячный аванс по КПН. Перенос: 25.10 (День Республики) → 27.10 (вт). Ст.305 НК РК","КГД"));

    // ── НОЯБРЬ 2026 ───────────────────────────────────
    tasks.push(mk("📊 БНС: Форма 1-П — Промышленность (ноябрь 2026)",  11, 10,
      "Ежемесячный отчёт за ноябрь 2026","БНС"));
    // 15 ноября — воскресенье → перенос на 16 ноября (пн)
    tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (3 кв. 2026)",          11, 16,
      "Декларация за июль-сентябрь. Перенос: 15.11 (вс) → 16.11 (пн). Ст.209 НК РК","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 300.00 — СДАЧА (3 кв. 2026)",          11, 16,
      "Декларация по НДС за июль-сентябрь. Перенос: 15.11 (вс) → 16.11 (пн). Ст.424 НК РК","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА ИПН+ОПВ+ОСМС+СО (3 кв. 2026)",     11, 25,
      "Уплата налогов из ФНО 200.00 за июль-сен. 25 ноя (ср)","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА НДС (3 кв. 2026)",                   11, 25,
      "Уплата НДС по ФНО 300.00 за июль-сен. 25 ноя (ср)","КГД"));
    tasks.push(mk("💰 КГД: Аванс налог на имущество/землю (4-й срок)", 11, 25,
      "Последний (4-й) авансовый платёж. 25 ноя (ср). Ст.512, 523 НК РК","КГД"));
    tasks.push(mk("💰 КГД: Аванс по КПН — ноябрь 2026",               11, 25,
      "Ежемесячный аванс по КПН. 25 ноя (ср)","КГД"));

    // ── ДЕКАБРЬ 2026 ──────────────────────────────────
    tasks.push(mk("🏛 КГД: Проверка и продление лицензий",             12,  1,
      "Заблаговременно проверить сроки всех лицензий и разрешений","КГД"));
    tasks.push(mk("📋 График отпусков на 2027 год",                    12, 15,
      "Утвердить до 15 декабря. ТК РК ст.93","HR"));
    tasks.push(mk("💰 КГД: Аванс по КПН — декабрь 2026",              12, 25,
      "Ежемесячный аванс по КПН. 25 дек (пт)","КГД"));
  }
  // ══════════════════════════════════════════════════════
  //  HR / КАДРЫ — КАЗАХСТАН 2026
  // ══════════════════════════════════════════════════════
  if(prof.includes("HR") || prof.includes("Кадры")) {
    // ФНО 200 только если Бухгалтер не выбран (иначе дубль)
    if(!prof.includes("Бухгалтер") && !prof.includes("ИП")) {
      tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (1 кв. 2026)",  5, 15, "Зарплатная декларация за янв-март 2026. Ст.209 НК РК","КГД"));
      tasks.push(mk("💰 КГД: ФНО 200.00 — УПЛАТА (1 кв. 2026)", 5, 25, "Уплата ИПН + ОПВ + ОСМС + СО за янв-март 2026","КГД"));
      tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (2 кв. 2026)",  8, 15, "Зарплатная декларация за апр-июнь 2026","КГД"));
      tasks.push(mk("💰 КГД: ФНО 200.00 — УПЛАТА (2 кв. 2026)", 8, 25, "Уплата ИПН + ОПВ + ОСМС + СО за апр-июнь 2026","КГД"));
      tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (3 кв. 2026)", 11, 15, "Зарплатная декларация за июль-сен 2026","КГД"));
      tasks.push(mk("💰 КГД: ФНО 200.00 — УПЛАТА (3 кв. 2026)",11, 25, "Уплата ИПН + ОПВ + ОСМС + СО за июль-сен 2026","КГД"));
    }
    tasks.push(mk("📊 БНС: Форма 1-Т (2 кв. 2026) — Труд и зарплата",  7, 10, "Численность и з/п за 2 квартал 2026","БНС"));
    tasks.push(mk("📋 Воинский учёт — годовая сверка",                  9,  1, "Сверка с военкоматом (ВЦУ). ЗРК «О воинской обязанности» ст.22","HR"));
    tasks.push(mk("📊 БНС: Форма 1-Т (3 кв. 2026) — Труд и зарплата", 10, 10, "Численность и з/п за 3 квартал 2026","БНС"));
    tasks.push(mk("📋 График отпусков на 2027 год",                    12, 15, "Утвердить до 15 декабря. ТК РК ст.93","HR"));
  }

  // ══════════════════════════════════════════════════════
  //  ЮРИСТ — КАЗАХСТАН 2026
  // ══════════════════════════════════════════════════════
  if(prof.includes("Юрист")) {
    tasks.push(mk("📋 Годовое собрание ТОО / акционеров АО",           6, 30,
      "Не позднее 6 месяцев после конца фин. года. ЗРК «О ТОО» ст.45","МЮ"));
    tasks.push(mk("🏛 КГД: Проверка и продление лицензий",            12,  1,
      "Заблаговременно проверить сроки лицензий","КГД"));
  }

  // ══════════════════════════════════════════════════════
  //  ВРАЧ / МЕД. РАБОТНИК — КАЗАХСТАН 2026
  // ══════════════════════════════════════════════════════
  if(prof.includes("Врач") || prof.includes("Мед")) {
    tasks.push(mk("🏥 МЗ: Медстатистика (2 кв. 2026)",                 7, 10,
      "Квартальный отчёт в Минздрав за апрель-июнь 2026","МЗ"));
    tasks.push(mk("💊 Наркотические средства — отчёт (2 кв. 2026)",    7, 10,
      "В Комитет фармконтроля за 2 квартал 2026","КФК"));
    tasks.push(mk("🏥 МЗ: Медстатистика (3 кв. 2026)",                10, 10,
      "Квартальный отчёт в Минздрав за июль-сентябрь 2026","МЗ"));
    tasks.push(mk("💊 Наркотические средства — отчёт (3 кв. 2026)",   10, 10,
      "В Комитет фармконтроля за 3 квартал 2026","КФК"));
    tasks.push(mk("📋 КККМФД: Сертификация специалиста (плановая)",    9,  1,
      "Раз в 5 лет — подача документов в аттестационную комиссию","КККМФД"));
  }

  // ══════════════════════════════════════════════════════
  //  ПЕДАГОГ — КАЗАХСТАН 2026
  // ══════════════════════════════════════════════════════
  if(prof.includes("Педагог")) {
    tasks.push(mk("📚 МОН: Самоанализ за учебный год",                  6,  1,
      "Годовой самоанализ педагога","МОН"));
    tasks.push(mk("📚 МОН: Рабочие программы на учебный год",           9,  1,
      "Сдать до начала нового учебного года","МОН"));
    tasks.push(mk("📚 МОН: Итоговый отчёт 1-я четверть",              11,  5,
      "Отчёт по итогам 1-й четверти 2026-2027 уч.года","МОН"));
    tasks.push(mk("📊 БНС: Форма ОО-1 — Образовательная организация", 12, 20,
      "Годовой статотчёт по образованию за 2026 год","БНС"));
  }

  // ══════════════════════════════════════════════════════
  //  ГОССЛУЖАЩИЙ — КАЗАХСТАН 2026
  // ══════════════════════════════════════════════════════
  if(prof.includes("Госслужащий")) {
    tasks.push(mk("📊 МФ: Отчёт об исполнении бюджета (2 кв. 2026)",   7, 15,
      "Квартальный бюджетный отчёт в МФ РК","МФ"));
    tasks.push(mk("📊 МФ: Отчёт об исполнении бюджета (3 кв. 2026)",  10, 15,
      "Квартальный бюджетный отчёт в МФ РК","МФ"));
    tasks.push(mk("🔍 АПК: Антикоррупционное уведомление",             10, 31,
      "Ежегодное уведомление об отсутствии конфликта интересов","АПК"));
  }

  // Дедупликация по названию — на случай если выбраны несколько профессий
  const seen = new Set();
  return tasks.filter(t => { if(seen.has(t.title)) return false; seen.add(t.title); return true; });
}


function WorkSection({profile,tasks,setTasks,today,kb,notify}) {
  const [modal,setModal]=useState(null);
  const gp = genderPrompt(profile);
  const [editSchedule,setEditSchedule]=useState(false);
  const [schedStart,setSchedStart]=useState(profile.workStart||"09:00");
  const [schedEnd,setSchedEnd]=useState(profile.workEnd||"18:00");
  const [dlTab,setDlTab]=useState("upcoming");
  const [addDlModal,setAddDlModal]=useState(false);
  const [editDl,setEditDl]=useState(null);
  const [newDl,setNewDl]=useState({title:"",deadline:"",notes:"",organ:"КГД"});
  const workTasks=tasks.filter(t=>t.section==="work");
  const deadlineTasks=workTasks.filter(t=>t.isDeadline);
  const addDeadlines=()=>{
    const dl=getProfDeadlines(profile);
    const exist=new Set(workTasks.filter(t=>t.isDeadline).map(t=>t.title));
    const newDl=dl.filter(t=>!exist.has(t.title));
    if(newDl.length===0){notify("Все дедлайны уже добавлены");return;}
    setTasks(p=>[...p,...newDl]);
    notify("Добавлено "+newDl.length+" дедлайнов в рабочие задачи ✦");
  };
  const due=workTasks.filter(t=>isDue(t,today)||(t.freq==="once"&&!t.lastDone&&!t.doneDate));
  const isWorkDay=(profile.workDaysList||[1,2,3,4,5]).includes(new Date().getDay());
  return(
    <div>
      <div className="card card-accent">
        <div className="card-hd"><div className="card-title">Моя работа</div></div>
        <div className="g2">
          <div className="pf-item"><div className="pf-l">Должность</div><div className="pf-v">{profile.profession||"—"}</div></div>
          <div className="pf-item"><div className="pf-l">Сфера</div><div className="pf-v">{profile.jobSphere||"—"}</div></div>
          <div className="pf-item"><div className="pf-l">Формат</div><div className="pf-v">{profile.workType||"—"}</div></div>
          <div className="pf-item"><div className="pf-l">График</div>{editSchedule?(<div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}><input type="time" value={schedStart} onChange={e=>setSchedStart(e.target.value)} style={{padding:"4px 8px",background:"rgba(255,255,255,0.7)",border:"1px solid "+T.bdr,borderRadius:7,fontSize:15,color:T.text0,outline:"none",width:100}}/><span>–</span><input type="time" value={schedEnd} onChange={e=>setSchedEnd(e.target.value)} style={{padding:"4px 8px",background:"rgba(255,255,255,0.7)",border:"1px solid "+T.bdr,borderRadius:7,fontSize:15,color:T.text0,outline:"none",width:100}}/><button className="btn btn-primary btn-sm" style={{padding:"4px 10px"}} onClick={()=>{profile.workStart=schedStart;profile.workEnd=schedEnd;setEditSchedule(false);notify("График обновлён");}}>✓</button></div>):(<div style={{display:"flex",alignItems:"center",gap:8}}><div className="pf-v">{profile.workStart||"?"}–{profile.workEnd||"?"}</div><button className="btn btn-ghost btn-sm" style={{padding:"3px 8px",fontSize:11}} onClick={()=>setEditSchedule(true)}>✏️</button></div>)}</div>
        </div>
        {profile.commuteTime&&<div style={{marginTop:10,fontSize:13,color:T.text3}}>🚌 {profile.commuteTime} · {profile.commuteWay||""}</div>}
        {profile.profDeadlines&&!profile.profDeadlines.includes("Нет")&&(
          <div style={{marginTop:12,padding:"8px 14px",background:"rgba(45,106,79,0.08)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div>
              <div style={{fontSize:12,color:T.text2,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ОТЧЁТНОСТЬ</div>
              <div style={{fontSize:14,color:T.text1,marginTop:2}}>{profile.profDeadlines} · Казахстан</div>
            </div>
            <button className="btn btn-primary btn-sm" style={{flexShrink:0}} onClick={addDeadlines}>+ Дедлайны</button>
          </div>
        )}
        {!isWorkDay&&<div style={{marginTop:12,padding:"8px 14px",background:"rgba(200,164,90,.08)",borderRadius:9,fontSize:14,color:T.gold,fontStyle:"italic"}}>Сегодня нерабочий день ✦ Отдыхай</div>}
      </div>
      {/* ── Менеджер дедлайнов ── */}
      {profile.profDeadlines&&!profile.profDeadlines.includes("Нет")&&(()=>{
        const allDl=deadlineTasks.sort((a,b)=>a.deadline?.localeCompare(b.deadline||"")||0);
        const upcoming=allDl.filter(t=>!t.doneDate&&t.deadline>=today).slice(0,10);
        const overdue=allDl.filter(t=>!t.doneDate&&t.deadline&&t.deadline<today);
        const done=allDl.filter(t=>t.doneDate);

        // Google Calendar URL
        const toGCal=(t)=>{
          const d=new Date(t.deadline);
          const pad=n=>String(n).padStart(2,"0");
          const ymd=d.getFullYear()+""+pad(d.getMonth()+1)+""+pad(d.getDate());
          const title=encodeURIComponent(t.title+(t.notes?" — "+t.notes:""));
          return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+title+"&dates="+ymd+"/"+ymd+"&details="+encodeURIComponent("Дедлайн: "+(t.notes||""))+"&sf=true&output=xml";
        };

        // Экспорт всех в .ics
        const exportICS=()=>{
          const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//LifeDiary//RU","CALSCALE:GREGORIAN"];
          upcoming.concat(overdue).forEach(t=>{
            if(!t.deadline) return;
            const d=t.deadline.replace(/-/g,"");
            const uid=t.id+"@lifediary";
            const summary=t.title.replace(/[^\w\s\-а-яА-ЯёЁ().,]/g,"");
            const desc=t.notes||"";
            lines.push("BEGIN:VEVENT","UID:"+uid,"DTSTART;VALUE=DATE:"+d,"DTEND;VALUE=DATE:"+d,
              "SUMMARY:"+summary,"DESCRIPTION:"+desc,"STATUS:CONFIRMED","END:VEVENT");
          });
          lines.push("END:VCALENDAR");
          const blob=new Blob([lines.join("\r\n")],{type:"text/calendar"});
          const url=URL.createObjectURL(blob);
          const a=document.createElement("a");a.href=url;a.download="deadlines.ics";a.click();
          URL.revokeObjectURL(url);
          notify("Файл .ics скачан — импортируй в Google Calendar ✦");
        };

        const organs=["КГД","ЕНПФ","ФСМС","БНС","МЮ","АФН","МФ","МЗ","МОН","АДГС","АПК","МЭПР","КФМ","Другой орган"];

        return(
          <div className="card" style={{marginBottom:14,borderLeft:"3px solid "+T.danger}}>
            <div className="card-hd">
              <div className="card-title">📋 Отчётность</div>
              <div style={{display:"flex",gap:6}}>
                {overdue.length>0&&<span className="badge br">⚠ {overdue.length}</span>}
                <button className="btn btn-ghost btn-sm" onClick={()=>setAddDlModal(true)}>+ Свой</button>
                <button className="btn btn-ghost btn-sm" onClick={addDeadlines}>↻ Авто</button>
              </div>
            </div>

            {/* Компактная кнопка уведомлений */}
            {("Notification" in window) && Notification.permission === "default" && (
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"rgba(45,106,79,0.08)",borderRadius:8,marginBottom:8}}>
                <span style={{fontSize:13}}>🔔</span>
                <span style={{fontSize:12,color:T.text2,flex:1}}>Уведомления о дедлайнах</span>
                <button className="btn btn-primary btn-sm" style={{padding:"3px 10px",fontSize:12}} onClick={async()=>{
                  const ok=await requestNotificationPermission();
                  if(ok){scheduleDeadlineNotifications(tasks.filter(t=>t.isDeadline));notify("Уведомления включены ✦");}
                }}>Включить</button>
              </div>
            )}
            {/* Вкладки */}
            <div className="tabs" style={{marginBottom:12}}>
              {[["upcoming","Ближайшие"],["overdue","Просроченные"],["done","Выполненные"],["calendar","Календарь"],["gcal","Google Cal"]].map(([v,l])=>(
                <div key={v} className={"tab"+(dlTab===v?" on":"")} onClick={()=>setDlTab(v)}
                  style={{...(v==="overdue"&&overdue.length>0?{color:T.danger}:{})}}>{l}{v==="overdue"&&overdue.length>0?" ("+overdue.length+")":""}</div>
              ))}
            </div>

            {/* Ближайшие */}
            {dlTab==="upcoming"&&(
              upcoming.length===0
                ? <div className="empty"><span className="empty-ico">✅</span><p>Все дедлайны выполнены!</p></div>
                : upcoming.map(t=>{
                    const dl=new Date(t.deadline);
                    const daysLeft=Math.ceil((dl-new Date())/86400000);
                    const isClose=daysLeft<=7;
                    return(
                      <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"1px solid "+T.bdrS}}>
                        <div className={"chk"+(t.doneDate?" done":"")} style={{flexShrink:0,marginTop:2}} onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:x.doneDate?null:today,lastDone:x.doneDate?x.lastDone:today}:x))}>
                          {t.doneDate?"✓":""}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,color:T.text0,lineHeight:1.3}}>{t.title}</div>
                          {t.notes&&<div style={{fontSize:12,color:T.text3,marginTop:2}}>{t.notes}</div>}
                          <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                            <button className="btn-mini" onClick={()=>window.open(toGCal(t),"_blank")}>📅 В Google Cal</button>
                            <button className="btn-mini" onClick={()=>{setEditDl({...t});setAddDlModal(true);}}>✏️</button>
                            <button className="btn-mini" style={{color:T.danger}} onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))}>✕</button>
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:13,color:isClose?T.warn:T.text2,fontFamily:"'JetBrains Mono'",fontWeight:isClose?600:400}}>
                            {daysLeft===0?"Сегодня!":daysLeft===1?"Завтра":daysLeft+" дн."}
                          </div>
                          <div style={{fontSize:11,color:T.text3}}>{dl.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</div>
                        </div>
                      </div>
                    );
                  })
            )}

            {/* Просроченные */}
            {dlTab==="overdue"&&(
              overdue.length===0
                ? <div className="empty"><span className="empty-ico">✅</span><p>Просроченных нет!</p></div>
                : overdue.map(t=>{
                    const dl=new Date(t.deadline);
                    const daysOver=Math.ceil((new Date()-dl)/86400000);
                    return(
                      <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"1px solid "+T.bdrS,background:"rgba(139,32,32,0.04)",borderRadius:8,paddingLeft:10,marginBottom:4}}>
                        <div className="chk" style={{flexShrink:0,marginTop:2}} onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:today,lastDone:today}:x))}>{""}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:15,color:T.danger,fontWeight:600}}>{t.title}</div>
                          {t.notes&&<div style={{fontSize:12,color:T.text3,marginTop:2}}>{t.notes}</div>}
                          <div style={{display:"flex",gap:6,marginTop:6}}>
                            <button className="btn-mini" onClick={()=>{setEditDl({...t});setAddDlModal(true);}}>✏️ Изменить дату</button>
                            <button className="btn-mini" onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:today}:x))}>✓ Выполнено</button>
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:13,color:T.danger,fontFamily:"'JetBrains Mono'",fontWeight:700}}>-{daysOver} дн.</div>
                          <div style={{fontSize:11,color:T.text3}}>{dl.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</div>
                        </div>
                      </div>
                    );
                  })
            )}

            {/* Выполненные */}
            {dlTab==="done"&&(
              done.length===0
                ? <div className="empty"><span className="empty-ico">📋</span><p>Выполненных ещё нет</p></div>
                : done.slice(0,10).map(t=>(
                    <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid "+T.bdrS,opacity:.7}}>
                      <span style={{color:T.success,fontSize:18}}>✓</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,color:T.text2,textDecoration:"line-through"}}>{t.title}</div>
                        <div style={{fontSize:11,color:T.text3}}>{t.doneDate}</div>
                      </div>
                      <button className="btn-mini" style={{color:T.text3}} onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:null}:x))}>↩</button>
                    </div>
                  ))
            )}

            {/* Календарь — визуальный вид по месяцам */}
            {dlTab==="calendar"&&(()=>{
              const byMonth={};
              [...upcoming,...overdue].forEach(t=>{
                if(!t.deadline) return;
                const key=t.deadline.slice(0,7);
                if(!byMonth[key]) byMonth[key]=[];
                byMonth[key].push(t);
              });
              const months=Object.keys(byMonth).sort();
              const MON_RU=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
              return months.length===0
                ? <div className="empty"><span className="empty-ico">📅</span><p>Нет дедлайнов</p></div>
                : months.map(m=>{
                    const [y,mo]=m.split("-");
                    const isOverMonth=m<today.slice(0,7);
                    return(
                      <div key={m} style={{marginBottom:16}}>
                        <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:18,color:isOverMonth?T.danger:T.gold,marginBottom:8,borderBottom:"1px solid "+T.bdrS,paddingBottom:4}}>
                          {MON_RU[parseInt(mo)-1]} {y}
                          {byMonth[m].length>0&&<span style={{fontSize:12,color:T.text3,marginLeft:8,fontFamily:"'JetBrains Mono'"}}>{byMonth[m].length} дедл.</span>}
                        </div>
                        {byMonth[m].map(t=>{
                          const day=new Date(t.deadline).getDate();
                          return(
                            <div key={t.id} style={{display:"flex",gap:12,alignItems:"center",marginBottom:6}}>
                              <div style={{width:32,height:32,borderRadius:8,background:isOverMonth?"rgba(139,32,32,0.15)":"rgba(45,106,79,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono'",fontSize:13,color:isOverMonth?T.danger:T.gold,flexShrink:0}}>{day}</div>
                              <div style={{flex:1,fontSize:14,color:T.text1}}>{t.title.replace(/^[📋🏛🏦📊🔍💰🔒]+\s*/,"")}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
            })()}

            {/* Google Calendar — инструкция + экспорт */}
            {dlTab==="gcal"&&(
              <div>
                <div style={{padding:"14px 16px",background:"rgba(45,106,79,0.07)",borderRadius:12,marginBottom:14}}>
                  <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:18,color:T.gold,marginBottom:8}}>Два способа добавить в Google Calendar</div>

                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>СПОСОБ 1 — КАЖДЫЙ ДЕДЛАЙН ОТДЕЛЬНО</div>
                    <div style={{fontSize:14,color:T.text2,marginBottom:8,lineHeight:1.6}}>Нажми «📅 В Google Cal» рядом с любым дедлайном → откроется предзаполненная форма → нажми «Сохранить».</div>
                  </div>

                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>СПОСОБ 2 — ВСЕ СРАЗУ (файл .ics)</div>
                    <div style={{fontSize:14,color:T.text2,marginBottom:10,lineHeight:1.6}}>Скачай файл с дедлайнами и импортируй его в Google Calendar одним действием.</div>
                    <button className="btn btn-primary" style={{width:"100%"}} onClick={exportICS}>⬇️ Скачать все дедлайны (.ics)</button>
                  </div>

                  <div style={{borderTop:"1px solid "+T.bdr,paddingTop:14}}>
                    <div style={{fontSize:12,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8}}>КАК ИМПОРТИРОВАТЬ .ICS В GOOGLE CALENDAR</div>
                    {["1. Скачай файл deadlines.ics выше","2. Открой Google Calendar на компьютере (calendar.google.com)","3. Нажми ⚙️ → Настройки → Импорт и экспорт","4. Выбери файл deadlines.ics → нажми «Импорт»","5. Все дедлайны появятся в твоём календаре!"].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:14,color:T.text2}}>
                        <span style={{color:T.gold,fontFamily:"'JetBrains Mono'",flexShrink:0}}>{i+1}.</span>
                        <span>{s.replace(/^\d+\. /,"")}</span>
                      </div>
                    ))}
                    <div style={{marginTop:10,padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:8,fontSize:13,color:T.text3,fontStyle:"italic"}}>
                      💡 На телефоне: скачай .ics → открой файл → выбери «Добавить в календарь»
                    </div>
                  </div>
                </div>

                {/* Кнопки по одному */}
                <div style={{fontSize:12,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8}}>ИЛИ ДОБАВИТЬ ПО ОДНОМУ</div>
                {upcoming.slice(0,5).map(t=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"8px 12px",background:"rgba(45,106,79,0.06)",borderRadius:10}}>
                    <div style={{flex:1,fontSize:14,color:T.text1}}>{t.title.replace(/^[📋🏛🏦📊🔍💰🔒]+\s*/,"")}</div>
                    <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",flexShrink:0}}>{new Date(t.deadline).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</div>
                    <button className="btn-mini" onClick={()=>window.open(toGCal(t),"_blank")}>📅</button>
                  </div>
                ))}
              </div>
            )}

            {/* Модалка добавления/редактирования дедлайна */}
            {addDlModal&&(
              <div className="overlay" onClick={()=>{setAddDlModal(false);setEditDl(null);}}>
                <div className="modal" onClick={e=>e.stopPropagation()}>
                  <span className="modal-x" onClick={()=>{setAddDlModal(false);setEditDl(null);}}>✕</span>
                  <div className="modal-title">{editDl?"Редактировать дедлайн":"Добавить дедлайн"}</div>
                  <div className="fld"><label>Название отчёта</label>
                    <input placeholder="НДС за 1 квартал..." value={editDl?editDl.title:newDl.title} onChange={e=>editDl?setEditDl(p=>({...p,title:e.target.value})):setNewDl(p=>({...p,title:e.target.value}))}/>
                  </div>
                  <div className="fld"><label>Орган контроля</label>
                    <div className="chips">{organs.map(v=>(
                      <div key={v} className={"chip "+((editDl?editDl.organ:newDl.organ)===v?"on":"")} onClick={()=>editDl?setEditDl(p=>({...p,organ:v})):setNewDl(p=>({...p,organ:v}))}>{v}</div>
                    ))}</div>
                  </div>
                  <div className="fld"><label>Дата сдачи</label>
                    <input type="date" value={editDl?editDl.deadline:newDl.deadline} onChange={e=>editDl?setEditDl(p=>({...p,deadline:e.target.value})):setNewDl(p=>({...p,deadline:e.target.value}))}/>
                  </div>
                  <div className="fld"><label>Примечание</label>
                    <input placeholder="За какой период, куда сдавать..." value={editDl?editDl.notes:newDl.notes} onChange={e=>editDl?setEditDl(p=>({...p,notes:e.target.value})):setNewDl(p=>({...p,notes:e.target.value}))}/>
                  </div>
                  <div className="modal-foot">
                    <button className="btn btn-ghost" onClick={()=>{setAddDlModal(false);setEditDl(null);}}>Отмена</button>
                    <button className="btn btn-primary" onClick={()=>{
                      if(editDl) {
                        const prefix={"ФНС":"🏛 ФНС: ","СФР":"🏦 СФР: ","Росстат":"📊 Росстат: ","ФТС":"🏛 ФТС: ","ЦБ":"🔒 ЦБ: ","РПН":"🔍 РПН: ","Роспотребнадзор":"🔍 РПН: "}[editDl.organ]||"📋 ";
                        const title=editDl.title.match(/^[📋🏛🏦📊🔍💰🔒]/)?editDl.title:prefix+editDl.title;
                        setTasks(p=>p.map(x=>x.id===editDl.id?{...x,...editDl,title}:x));
                      } else {
                        const prefix={"ФНС":"🏛 ФНС: ","СФР":"🏦 СФР: ","Росстат":"📊 Росстат: "}[newDl.organ]||"📋 ";
                        setTasks(p=>[...p,{...newDl,id:Date.now()+Math.random(),title:prefix+newDl.title,section:"work",freq:"once",priority:"h",lastDone:"",doneDate:"",preferredTime:"09:00",isDeadline:true}]);
                      }
                      setAddDlModal(false);setEditDl(null);
                      setNewDl({title:"",deadline:"",notes:"",organ:"ФНС"});
                      notify(editDl?"Дедлайн обновлён ✦":"Дедлайн добавлен ✦");
                    }}>{editDl?"Сохранить":"Добавить"}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      <AiBox kb={kb} prompt={`${gp.address}. Как ${profile.profession||"мне"} организовать этот рабочий день? ${(profile.workDrain||[]).join(",")||"—"}, вдохновляет: ${profile.workInspire||"—"}. Дай 3-5 конкретных совета для моего типа личности.`} label="Рабочий день" btnText="Совет по дню" placeholder="Помогу сделать рабочий день продуктивнее..."/>

      {/* ── Рабочие задачи по подразделам ── */}
      {(()=>{
        const govTasks     = workTasks.filter(t=>t.isDeadline && t.organ && !["ВНУТР","HR","внутр"].includes(t.organ));
        const internalTasks= workTasks.filter(t=>!t.isDeadline || t.organ==="HR");
        const paymentTasks = workTasks.filter(t=>t.isDeadline && t.title?.startsWith("💰"));

        const renderSubTask=(task)=>(
          <div key={task.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"1px solid "+T.bdrS}}>
            <div className={"chk"+(task.doneDate===today?" done":"")} style={{flexShrink:0,marginTop:2}}
              onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t))}>
              {task.doneDate===today?"✓":""}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,color:task.doneDate===today?T.text3:T.text0,textDecoration:task.doneDate===today?"line-through":"none",lineHeight:1.3}}>{task.title.replace(/^[📋🏛🏦📊🔍💰🔒]+\s*/,"")}</div>
              {task.notes&&<div style={{fontSize:12,color:T.text3,marginTop:2}}>{task.notes}</div>}
              {task.deadline&&(()=>{
                const dl=new Date(task.deadline);
                const daysLeft=Math.ceil((dl-new Date())/86400000);
                const isOver=task.deadline<today;
                return <div style={{fontSize:12,marginTop:3,color:isOver?T.danger:daysLeft<=3?T.warn:T.text3,fontFamily:"'JetBrains Mono'",fontWeight:isOver||daysLeft<=3?600:400}}>
                  {isOver?"⚠️ Просрочен":daysLeft===0?"🔴 Сегодня!":daysLeft===1?"🟡 Завтра":daysLeft<=3?"🟡 "+daysLeft+" дн.":"📅 "+dl.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
                </div>;
              })()}
            </div>
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <div className="ico-btn" style={{color:T.teal,opacity:.7}} onClick={()=>setModal(task)}>✏️</div>
              <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
            </div>
          </div>
        );

        const SubSection=({title,emoji,color,items,onAdd,emptyText})=>{
          const doneCount=items.filter(t=>t.doneDate===today).length;
          return(
            <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+color}}>
              <div className="card-hd">
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{emoji}</span>
                  <div className="card-title">{title}</div>
                  {items.length>0&&<span className="badge bm" style={{fontSize:11}}>{doneCount}/{items.length}</span>}
                </div>
                {onAdd&&<button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();onAdd();}}
                  style={{padding:"3px 10px",fontSize:12}}>+ Своя</button>}
              </div>
              {items.length===0&&<div style={{padding:"8px 0",fontSize:14,color:T.text3,fontStyle:"italic"}}>{emptyText}</div>}
              {items.map(renderSubTask)}
            </div>
          );
        };

        return(
          <>
            <SubSection title="Отчётность в КГД" emoji="🏛" color={T.danger}
              items={workTasks.filter(t=>t.isDeadline&&!t.title?.startsWith("💰")&&["КГД","ЕНПФ","ФСМС","МЮ","АФН","МФ","МЗ","МОН","АДГС","АПК","МЭПР","КФМ"].includes(t.organ||"")).sort((a,b)=>a.deadline?.localeCompare(b.deadline||"")||0)}
              onAdd={()=>setModal({section:"work",isDeadline:true,organ:"КГД"})}
              emptyText="Нет дедлайнов КГД. Нажми «+ Дедлайны» выше."/>
            <SubSection title="Отчётность в БНС" emoji="📊" color="#1D4E6B"
              items={workTasks.filter(t=>t.isDeadline&&!t.title?.startsWith("💰")&&t.organ==="БНС").sort((a,b)=>a.deadline?.localeCompare(b.deadline||"")||0)}
              onAdd={()=>setModal({section:"work",isDeadline:true,organ:"БНС"})}
              emptyText="Нет дедлайнов БНС."
            />
            <SubSection title="Платежи" emoji="💰" color={T.warn}
              items={workTasks.filter(t=>t.isDeadline&&t.title?.startsWith("💰")).sort((a,b)=>a.deadline?.localeCompare(b.deadline||"")||0)}
              emptyText="Нет платежей"/>
            <SubSection title="Внутренние задачи" emoji="📋" color={T.teal}
              items={workTasks.filter(t=>!t.isDeadline).sort((a,b)=>(a.priority==="h"?0:a.priority==="m"?1:2)-(b.priority==="h"?0:b.priority==="m"?1:2))}
              onAdd={()=>setModal({})}
              emptyText="Нет рабочих задач"/>
          </>
        );
      })()}
      {profile.careerGoal&&<div className="card"><div className="card-hd"><div className="card-title">Карьерная цель</div></div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:18,color:T.text0}}>{profile.careerGoal}</div>{profile.workInspire&&<div style={{marginTop:6,fontSize:14,color:T.text3,fontStyle:"italic"}}>Вдохновляет: {profile.workInspire}</div>}</div>}
      {modal!==null&&<TaskModal task={modal.id?modal:null} defaultSection="work" onSave={t=>{setTasks(p=>modal.id?p.map(x=>x.id===t.id?t:x):[...p,t]);notify("Добавлено");}} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════════════════════════
function HomeSection({profile,tasks,setTasks,today,kb,notify}) {
  const [modal,setModal]=useState(null);
  const [ht,setHt]=useState({title:"", freq:"daily", priority:"m", preferredTime:"", notes:"", section:"home"});
  const updHt = (k,v) => setHt(p=>({...p,[k]:v}));
  const autoHome=()=>{
    const items=[];
    const beds   = parseInt(profile.bedrooms)||1;
    const baths  = parseInt(profile.bathrooms)||1;
    const rooms  = profile.homeRooms||[];
    const hasKitchen  = rooms.includes("Кухня")   || true; // кухня есть у всех
    const hasHall     = rooms.includes("Коридор")  || true;
    const hasLiving   = rooms.includes("Гостиная");
    const hasBalcony  = rooms.includes("Балкон");
    const hasStudy    = rooms.includes("Кабинет");
    const hasNursery  = rooms.includes("Детская");
    const hasPantry   = rooms.includes("Кладовка");

    // ── Ежедневно ──
    items.push({title:"Вытереть пыль",         freq:"daily",    priority:"l"});
    items.push({title:"Помыть посуду",          freq:"daily",    priority:"m"});
    items.push({title:"Вынести мусор",          freq:"daily",    priority:"m"});
    if(hasKitchen) items.push({title:"Протереть плиту и варочную",freq:"daily",priority:"l"});
    if(hasKitchen) items.push({title:"Протереть кухонные поверхности",freq:"every:2",priority:"l"});

    // ── Спальни ──
    for(let i=1;i<=beds;i++){
      const lbl = beds>1 ? ` (спальня ${i})` : "";
      items.push({title:`Проветрить спальню${lbl}`,  freq:"daily",    priority:"l"});
      items.push({title:`Смена постельного${lbl}`,   freq:"every:7",  priority:"m"});
      items.push({title:`Пылесос в спальне${lbl}`,   freq:"every:7",  priority:"m"});
      items.push({title:`Влажная уборка спальни${lbl}`,freq:"every:14",priority:"l"});
    }

    // ── Санузлы ──
    for(let i=1;i<=baths;i++){
      const lbl = baths>1 ? ` (санузел ${i})` : "";
      items.push({title:`Сантехника${lbl}`,          freq:"weekly:3", priority:"m"});
      items.push({title:`Унитаз и раковина${lbl}`,   freq:"weekly:3", priority:"m"});
      items.push({title:`Зеркала${lbl}`,             freq:"weekly:1", priority:"l"});
      items.push({title:`Генуборка ванной${lbl}`,    freq:"every:14", priority:"h"});
    }

    // ── Коридор ──
    if(hasHall){
      items.push({title:"Подмести коридор",           freq:"every:2",  priority:"l"});
      items.push({title:"Влажная уборка коридора",    freq:"weekly:5", priority:"l"});
    }

    // ── Гостиная ──
    if(hasLiving){
      items.push({title:"Пылесос в гостиной",         freq:"weekly:2", priority:"m"});
      items.push({title:"Влажная уборка гостиной",    freq:"every:14", priority:"l"});
      items.push({title:"Вытереть пыль с мебели",     freq:"weekly:1", priority:"l"});
    }

    // ── Балкон ──
    if(hasBalcony){
      items.push({title:"Уборка на балконе",          freq:"every:14", priority:"l"});
    }

    // ── Кабинет ──
    if(hasStudy){
      items.push({title:"Порядок в кабинете",         freq:"weekly:5", priority:"l"});
    }

    // ── Детская ──
    if(hasNursery){
      items.push({title:"Уборка детской",             freq:"every:2",  priority:"h"});
      items.push({title:"Дезинфекция игрушек",        freq:"every:7",  priority:"m"});
    }

    // ── Кладовка ──
    if(hasPantry){
      items.push({title:"Разбор кладовки",            freq:"every:30", priority:"l"});
    }

    // ── Общее ──
    items.push({title:"Мытьё окон",                   freq:"every:30", priority:"l"});
    items.push({title:"Генеральная уборка",            freq:"every:90", priority:"h"});
    items.push({title:"Чистка холодильника",           freq:"weekly:5", priority:"l"});

    // ── Растения ──
    if(profile.plants&&profile.plants!=="Нет")
      items.push({title:"Полить цветы", freq:profile.plants.includes("день")?"daily":"every:2", priority:"m"});

    // ── Сезонные задачи (определяем по текущему месяцу) ──
    const month = new Date().getMonth()+1; // 1-12
    const isMarch   = month===3;
    const isApril   = month===4;
    const isMay     = month===5;
    const isOct     = month===10;
    const isNov     = month===11;

    // Весна (март-май) — убрать зимнее, достать летнее
    if(isMarch||isApril){
      items.push({title:"🌸 Сезон: Убрать зимние вещи в хранение",          freq:"once", priority:"h", notes:"Пальто, пуховики, свитера — стирка и хранение в вакуумных пакетах"});
      items.push({title:"🌸 Сезон: Достать весенне-летнюю одежду",           freq:"once", priority:"h", notes:"Проверить состояние, постирать после хранения"});
      items.push({title:"🌸 Сезон: Весенняя генеральная уборка",             freq:"once", priority:"h", notes:"Мытьё окон, чистка карнизов, перестановка мебели"});
      items.push({title:"🌸 Сезон: Проветрить и выбить зимние одеяла",       freq:"once", priority:"m"});
      items.push({title:"🌸 Сезон: Разобрать гардероб — ненужное отдать",    freq:"once", priority:"l"});
    }
    if(isMay){
      items.push({title:"☀️ Сезон: Достать летнюю обувь",                    freq:"once", priority:"m", notes:"Почистить и подготовить к сезону"});
      items.push({title:"☀️ Сезон: Убрать зимнюю обувь",                     freq:"once", priority:"m", notes:"Почистить, смазать, убрать в коробки"});
      items.push({title:"☀️ Сезон: Подготовить балкон/террасу к лету",       freq:"once", priority:"l"});
    }
    // Осень (октябрь-ноябрь) — убрать летнее, достать зимнее
    if(isOct){
      items.push({title:"🍂 Сезон: Достать зимние вещи из хранения",         freq:"once", priority:"h", notes:"Пальто, пуховики, тёплые свитера — проветрить и проверить"});
      items.push({title:"🍂 Сезон: Убрать летнюю одежду на хранение",        freq:"once", priority:"h", notes:"Постирать, высушить, сложить в вакуумные пакеты"});
      items.push({title:"🍂 Сезон: Подготовить тёплые одеяла и пледы",       freq:"once", priority:"m"});
      items.push({title:"🍂 Сезон: Проверить отопление и батареи",           freq:"once", priority:"h"});
    }
    if(isNov){
      items.push({title:"❄️ Сезон: Убрать летнюю обувь на хранение",         freq:"once", priority:"m", notes:"Почистить, обработать водоотталкивающим, убрать"});
      items.push({title:"❄️ Сезон: Достать зимнюю обувь и аксессуары",       freq:"once", priority:"m"});
      items.push({title:"❄️ Сезон: Проверить тёплые аксессуары (шапки, шарфы)", freq:"once", priority:"l"});
    }

    return items.map(t=>({...t,id:Date.now()+Math.random(),section:"home",lastDone:"",doneDate:"",notes:t.notes||""}));
  };
  const homeTasks=tasks.filter(t=>t.section==="home");
  const due=homeTasks.filter(t=>isDue(t,today));
  return(
    <div>
      <div className="card card-accent">
        <div className="g3">
          <div className="pf-item"><div className="pf-l">Жильё</div><div className="pf-v">{profile.homeType||"—"} {profile.homeArea&&profile.homeArea+"м²"}</div></div>
          <div className="pf-item"><div className="pf-l">Комнат</div><div className="pf-v">{profile.rooms||"—"}</div></div>
          <div className="pf-item"><div className="pf-l">С кем</div><div className="pf-v" style={{fontSize:14}}>{(profile.livesWith||[]).join(", ")||"один(а)"}</div></div>
        </div>
        {(profile.cleanDays||[]).length>0&&<div style={{marginTop:10,fontSize:13,color:T.text3}}>✦ Дни уборки: {profile.cleanDays.join(", ")}</div>}
      </div>
      <AiBox kb={kb} prompt={`Советы по домашним делам для ${profile.homeType||"квартиры"} ${profile.homeArea||"?"}м² где живут: ${(profile.livesWith||[]).join(",")||"я один(а)"}. Питомцы: ${(profile.pets||[]).map(p=>p.name).join(",")||"нет"}. Дни уборки по расписанию: ${(profile.cleanDays||[]).join(",")||"—"}. Я работаю до ${profile.workEnd||"18:00"} — дела планируй после этого. Тип личности: ${profile.planningStyle||"—"}. Что важнее всего сделать сегодня с учётом моего расписания?`} label="Быт и дом" btnText="Советы по быту" placeholder="Подскажу как организовать дом легко..."/>
      {homeTasks.length===0&&(
        <div className="card" style={{textAlign:"center",padding:"28px 20px"}}>
          <div style={{fontSize:14,color:T.text3,marginBottom:16,fontStyle:"italic"}}>Добавь домашние дела или создай расписание уборки автоматически</div>
          <button className="btn btn-primary" onClick={()=>{const ts=autoHome();setTasks(p=>{const exist=new Set(p.filter(x=>x.section==="home").map(x=>x.title.toLowerCase()));const filtered=ts.filter(t=>!exist.has(t.title.toLowerCase()));notify("Добавлено "+filtered.length+" задач"+(filtered.length<ts.length?" (пропущено "+(ts.length-filtered.length)+" дубликатов)":""));return [...p,...filtered];});}}>✦ Создать расписание уборки</button>
        </div>
      )}
      {homeTasks.length>0&&(()=>{
        // Разбить дела по периодичности
        // Классификация: каждая задача попадает РОВНО в одну группу по периоду
        const classifyTask = (f) => {
          if(!f) return "other";
          if(f==="once") return "other";
          if(f==="daily" || f==="workdays") return "today";
          // every:N — N дней между повторами
          const ev = f.match(/^every:(\d+)$/);
          if(ev) {
            const n = parseInt(ev[1]);
            if(n <= 1) return "today";
            if(n <= 7) return "week";
            if(n <= 90) return "month";
            return "other";
          }
          // weekly:N — конкретный день недели
          if(f.startsWith("weekly:")) return "week";
          // monthly:N — конкретный день месяца
          if(f.startsWith("monthly:")) return "month";
          return "other";
        };
        
        const todayTasks = homeTasks.filter(t=>classifyTask(t.freq)==="today" && isDue(t,today) && (t.freq==="daily"||t.freq==="workdays"||(t.freq.startsWith("every:")&&(parseInt(t.freq.split(":")[1])<=1||t.lastDone))||t.freq.startsWith("weekly:")));
        const weekTasks = homeTasks.filter(t=>classifyTask(t.freq)==="week" && isDue(t,today) && t.lastDone);
        const monthTasks = homeTasks.filter(t=>classifyTask(t.freq)==="month" && isDue(t,today) && t.lastDone);
        const otherTasks = homeTasks.filter(t=>classifyTask(t.freq)==="other" && isDue(t,today) && t.lastDone);
        
        const renderGroup = (title, emoji, color, list, showFreq) => list.length===0 ? null : (
          <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+color}}>
            <div className="card-hd">
              <div className="card-title"><span style={{marginRight:8}}>{emoji}</span>{title}</div>
              <span className="badge bm">{list.filter(t=>t.doneDate!==today).length}/{list.length}</span>
            </div>
            {list.map(task=>(
              <div key={task.id} className="task-row">
                <div className={"chk"+(task.doneDate===today?" done":"")} onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t))}>{task.doneDate===today?"✓":""}</div>
                <div className="task-body">
                  <div className={"task-name"+(task.doneDate===today?" done":"")}>{task.title}</div>
                  <div className="task-meta">{showFreq&&<span className="badge bt">{freqLabel(task.freq)}</span>}{task.lastDone&&<span className="badge bm">был: {task.lastDone}</span>}{task.notes&&<span className="badge bm" style={{fontStyle:"italic"}}>{task.notes.slice(0,30)}</span>}</div>
                </div>
                <div className="ico-btn" style={{color:T.teal,opacity:.7}} onClick={()=>setModal(task)}>✏️</div>
                <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
              </div>
            ))}
          </div>
        );
        
        return (
          <>
            <div className="card-hd" style={{marginBottom:8}}>
              <div className="card-title">Дела по дому</div>
              <div className="btn-row">
                <button className="btn btn-ghost btn-sm" onClick={()=>{const ts=autoHome();setTasks(p=>{const exist=new Set(p.filter(x=>x.section==="home").map(x=>x.title.toLowerCase()));const filtered=ts.filter(t=>!exist.has(t.title.toLowerCase()));notify(filtered.length>0?"Добавлено "+filtered.length:"Все задачи уже есть");return [...p,...filtered];});}}>+ Авто</button>
                <button className="btn btn-primary btn-sm" onClick={()=>setModal({})}>+ Своё дело</button>
              </div>
            </div>
            {renderGroup("Сегодня", "☀️", T.success, todayTasks, false)}
            {renderGroup("На этой неделе", "📅", T.teal, weekTasks, true)}
            {renderGroup("В этом месяце", "🗓️", T.warn, monthTasks, true)}
            {otherTasks.length>0 && renderGroup("Прочее", "📋", T.text3, otherTasks, true)}
            {todayTasks.length===0&&weekTasks.length===0&&monthTasks.length===0&&<div className="empty"><span className="empty-ico">🏡</span><p>Дел нет!</p></div>}
          </>
        );
      })()}

      {/* ── Специализированная модалка домашних дел ── */}
      {modal!==null&&(()=>{
        const isEdit = !!modal.id;
        // При открытии редактирования — данные из task, при новом — из ht
        const cur = isEdit ? modal : ht;
        const upd = isEdit
          ? (k,v) => setModal(p=>({...p,[k]:v}))
          : updHt;

        // Популярные домашние дела — быстрый выбор
        const quickTasks = [
          {emoji:"👕",title:"Постирать бельё",        freq:"every:7"},
          {emoji:"🧺",title:"Погладить бельё",        freq:"every:7"},
          {emoji:"🧹",title:"Подмести полы",          freq:"daily"},
          {emoji:"🫧",title:"Помыть полы с мытьём",   freq:"every:3"},
          {emoji:"🪣",title:"Протереть столешницы",   freq:"daily"},
          {emoji:"🛁",title:"Помыть ванну/душ",       freq:"weekly:4"},
          {emoji:"🚽",title:"Почистить унитаз",       freq:"weekly:3"},
          {emoji:"🪟",title:"Протереть зеркала",      freq:"weekly:1"},
          {emoji:"🧊",title:"Разморозить холодильник",freq:"every:90"},
          {emoji:"🫙",title:"Разобрать шкаф/ящики",  freq:"every:90"},
          {emoji:"📦",title:"Разобрать кладовку",     freq:"every:30"},
          {emoji:"🌿",title:"Полить цветы",           freq:"every:2"},
          {emoji:"🪴",title:"Пересадить растения",    freq:"every:180"},
          {emoji:"💡",title:"Протереть лампы/плафоны",freq:"every:30"},
          {emoji:"🧴",title:"Пополнить запасы химии", freq:"every:30"},
          {emoji:"🗑",title:"Вынести мусор",          freq:"daily"},
          {emoji:"🛏",title:"Застелить постель",      freq:"daily"},
          {emoji:"🧦",title:"Разобрать чистое бельё", freq:"every:7"},
          {emoji:"🪥",title:"Почистить духовку",      freq:"every:30"},
          {emoji:"☕",title:"Почистить кофемашину",   freq:"every:14"},
          {emoji:"🐾",title:"Помыть миску питомца",   freq:"every:2"},
          {emoji:"🚗",title:"Помыть машину",          freq:"every:14"},
          {emoji:"📺",title:"Протереть технику",      freq:"every:14"},
          {emoji:"🧹",title:"Пропылесосить диван",    freq:"every:14"},
        ];

        const freqOptions = [
          {v:"daily",     l:"Каждый день"},
          {v:"every:2",   l:"Каждые 2 дня"},
          {v:"every:3",   l:"Каждые 3 дня"},
          {v:"weekly:1",  l:"Раз в неделю (пн)"},
          {v:"weekly:2",  l:"Раз в неделю (вт)"},
          {v:"weekly:3",  l:"Раз в неделю (ср)"},
          {v:"weekly:4",  l:"Раз в неделю (чт)"},
          {v:"weekly:5",  l:"Раз в неделю (пт)"},
          {v:"weekly:6",  l:"Раз в неделю (сб)"},
          {v:"weekly:0",  l:"Раз в неделю (вс)"},
          {v:"every:7",   l:"Раз в 7 дней"},
          {v:"every:14",  l:"Раз в 2 недели"},
          {v:"every:30",  l:"Раз в месяц"},
          {v:"every:90",  l:"Раз в 3 месяца"},
          {v:"once",      l:"Один раз"},
        ];

        return(
          <div className="overlay" onClick={()=>setModal(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()} style={{maxHeight:"92vh",overflowY:"auto"}}>
              <button className="btn btn-ghost btn-sm" style={{position:"absolute",top:16,left:16}} onClick={()=>setModal(null)}>← Назад</button>
              <span className="modal-x" onClick={()=>setModal(null)}>✕</span>
              <div className="modal-title" style={{marginTop:8}}>{isEdit?"Редактировать дело":"Добавить домашнее дело"}</div>

              {/* Быстрый выбор — только при добавлении нового */}
              {!isEdit&&(
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:10}}>БЫСТРЫЙ ВЫБОР</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                    {quickTasks.map(q=>(
                      <div key={q.title}
                        onClick={()=>{upd("title",q.title);upd("freq",q.freq);}}
                        style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
                          borderRadius:20,border:"1px solid "+(cur.title===q.title?T.gold:T.bdr),
                          background:cur.title===q.title?"rgba(45,106,79,0.12)":"rgba(255,255,255,0.5)",
                          cursor:"pointer",fontSize:14,color:cur.title===q.title?T.gold:T.text1,
                          transition:"all .15s"}}>
                        <span>{q.emoji}</span><span>{q.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Название */}
              <div className="fld">
                <label>Название дела</label>
                <input
                  placeholder="Погладить бельё, помыть окна..."
                  value={cur.title}
                  onChange={e=>upd("title",e.target.value)}
                  autoFocus
                />
              </div>

              {/* Периодичность */}
              <div className="fld">
                <label>Как часто?</label>
                <select value={cur.freq||"daily"} onChange={e=>upd("freq",e.target.value)}>
                  {freqOptions.map(f=><option key={f.v} value={f.v}>{f.l}</option>)}
                </select>
              </div>

              {/* Время */}
              <div className="fld-row">
                <div className="fld">
                  <label>Удобное время</label>
                  <input type="time" value={cur.preferredTime||""} onChange={e=>upd("preferredTime",e.target.value)}/>
                </div>
                <div className="fld">
                  <label>Приоритет</label>
                  <select value={cur.priority||"m"} onChange={e=>upd("priority",e.target.value)}>
                    <option value="l">Низкий — когда придётся</option>
                    <option value="m">Средний — в этот день</option>
                    <option value="h">Высокий — обязательно</option>
                  </select>
                </div>
              </div>

              {/* Заметка */}
              <div className="fld">
                <label>Заметка (необязательно)</label>
                <input placeholder="Тёмное бельё отдельно / использовать средство X..." value={cur.notes||""} onChange={e=>upd("notes",e.target.value)}/>
              </div>

              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={()=>setModal(null)}>Отмена</button>
                <button className="btn btn-primary" onClick={()=>{
                  if(!cur.title.trim()){notify("Введи название");return;}
                  const task={...cur,id:modal.id||Date.now()+Math.random(),section:"home",lastDone:"",doneDate:cur.doneDate||""};
                  setTasks(p=>modal.id?p.map(x=>x.id===task.id?task:x):[...p,task]);
                  setModal(null);
                  if(!isEdit) setHt({title:"",freq:"daily",priority:"m",preferredTime:"",notes:"",section:"home"});
                  notify(isEdit?"Дело обновлено ✦":"Дело добавлено ✦");
                }}>{isEdit?"Сохранить":"Добавить"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SHOPPING
// ══════════════════════════════════════════════════════════════
function ShoppingSection({profile,shopList,setShopList,kb,notify}) {
  const [newItem,setNewItem]=useState(""); const [newCat,setNewCat]=useState("Продукты");
  const cats=["Продукты","Бытовая химия","Красота и уход","Для питомцев","Одежда","Аптека","Другое"];
  
  // Очистка старых записей с [Категория] в названии — выполняется один раз при загрузке
  useEffect(()=>{
    const needsCleanup = shopList.some(item => /\[[^\]]+\]/.test(item.name));
    if(!needsCleanup) return;
    const validCats = cats;
    const cleaned = [];
    const seen = new Set();
    shopList.forEach(item => {
      const m = item.name.match(/\[([^\]]+)\]/);
      let cat = item.cat || "Продукты";
      if(m && validCats.includes(m[1])) cat = m[1];
      let name = item.name.replace(/\[[^\]]+\]/g, "").replace(/^[:\s—-]+/, "").trim();
      if(!name || name.length < 2) return;
      const key = name.toLowerCase();
      if(seen.has(key)) return;
      seen.add(key);
      cleaned.push({...item, name, cat});
    });
    setShopList(cleaned);
  }, []);
  
  const add=()=>{if(!newItem.trim())return;setShopList(p=>[...p,{id:Date.now(),name:newItem,cat:newCat,done:false}]);setNewItem("");notify("Добавлено");};
  const byCat=cats.reduce((a,c)=>({...a,[c]:shopList.filter(x=>x.cat===c)}),{});
  const doneN=shopList.filter(x=>x.done).length;
  return(
    <div>
      <div className="card card-accent">
        <div className="g3">
          <div className="pf-item"><div className="pf-l">Походы</div><div className="pf-v">{profile.shopFreq||"—"}</div></div>
          <div className="pf-item"><div className="pf-l">День закупки</div><div className="pf-v">{profile.shopDay||"—"}</div></div>
          <div className="pf-item"><div className="pf-l">Онлайн</div><div className="pf-v">{profile.onlineShopping||"—"}</div></div>
        </div>
      </div>
      {/* Напоминание о дне закупки */}
      {(()=>{
        const days={"Пн":1,"Вт":2,"Ср":3,"Чт":4,"Пт":5,"Сб":6,"Вс":0};
        const todayDay=new Date().getDay();
        const shopDayNum=days[profile.shopDay];
        const isShopDay=shopDay!==undefined&&todayDay===shopDayNum;
        const daysLeft=shopDayNum!==undefined?((shopDayNum-todayDay+7)%7||7):null;
        if(!profile.shopDay) return null;
        return(
          <div style={{padding:"10px 14px",borderRadius:12,marginBottom:12,
            background:isShopDay?"rgba(45,106,79,0.15)":"rgba(45,32,16,0.05)",
            border:"1px solid "+(isShopDay?T.success:T.bdrS),
            display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{isShopDay?"🛒":"📅"}</span>
            <div>
              <div style={{fontSize:14,color:isShopDay?T.success:T.text1,fontWeight:isShopDay?600:400}}>
                {isShopDay?"Сегодня день закупки! "+profile.shopDay:"День закупки: "+profile.shopDay}
              </div>
              <div style={{fontSize:12,color:T.text3}}>
                {isShopDay?"Список уже готов — прокрути вниз":"Через "+daysLeft+" "+(daysLeft===1?"день":daysLeft<5?"дня":"дней")}
              </div>
            </div>
            {isShopDay&&<span style={{marginLeft:"auto",fontSize:20}}>✦</span>}
          </div>
        );
      })()}

      {/* Умный список с учётом цели, семьи и питомцев */}
      {(()=>{
        const familySize=parseInt(profile.familySize||"1");
        const hasWeightGoal=(profile.mainGoal||"").toLowerCase().includes("похуде")||(profile.mainGoal||"").toLowerCase().includes("вес")||(profile.healthGoal||"").toLowerCase().includes("похуде");
        const hasChildren=(profile.livesWith||[]).includes("Дети");
        const hasParents=(profile.livesWith||[]).includes("Родители");
        const familyNeeds=profile.familyNeeds||"";
        const pets=(profile.pets||[]);

        const shopPrompt=
          "Составь подробный список покупок на неделю для "+familySize+" "+(familySize===1?"человека":"человек")+".\n"+
          "СОСТАВ СЕМЬИ: "+(profile.livesWith||["один(а)"]).join(", ")+
          (hasChildren?". Дети: "+profile.childrenAges:"")+
          (familyNeeds?". Особые потребности: "+familyNeeds:"")+".\n"+
          "ТИП ПИТАНИЯ: "+(profile.nutrition||"обычное")+".\n"+
          (hasWeightGoal?"ЦЕЛЬ: похудение — акцент на белок, овощи, ограничить простые углеводы и сладкое. Калорийность умеренная.\n":"")+
          "ТКМ-профиль учитывай при выборе продуктов.\n"+
          "Всегда есть дома: "+((profile.staples||[]).join(", ")||"—")+".\n"+
          (pets.length?"Питомцы: "+pets.map(p=>p.name+"("+p.type+"): "+(p.food||"стандартный корм")).join(", ")+".\n":"")+
          "День закупки: "+(profile.shopDay||"—")+".\n\n"+
          "ВАЖНО: укажи количество с учётом "+familySize+" "+(familySize===1?"человека":"человек")+". "+
          "Каждый товар начинай с метки [Продукты], [Бытовая химия], [Красота и уход], [Для питомцев] или [Аптека]. "+
          "Дай заголовки разделов через ## и нумерованный список.";

        return(
          <AiBox kb={kb} prompt={shopPrompt}
            label="Список покупок на неделю"
            btnText={`Составить список на ${familySize > 1 ? familySize+" чел." : "меня"}`}
            placeholder="Составлю список с учётом всей семьи и целей..."
            actionType="shopping" onShopAdd={setShopList}/>
        );
      })()}
      <div className="card">
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          <input style={{flex:"1 1 180px",padding:"10px 14px",background:"rgba(255,255,255,.03)",border:"1px solid "+T.bdr,borderRadius:10,color:T.text0,fontFamily:"'Crimson Pro',serif",fontSize:16,outline:"none"}} placeholder="Добавить товар..." value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
          <select style={{padding:"10px",background:T.bg2,border:"1px solid "+T.bdr,borderRadius:10,color:T.text1,fontSize:14,outline:"none"}} value={newCat} onChange={e=>setNewCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select>
          <button className="btn btn-primary btn-sm" onClick={add}>+</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>{
            const validCats = cats;
            const cleaned = [];
            const seen = new Set();
            shopList.forEach(item => {
              const m = item.name.match(/\[([^\]]+)\]/);
              let cat = item.cat || "Продукты";
              if(m && validCats.includes(m[1])) cat = m[1];
              let name = item.name.replace(/\[[^\]]+\]/g, "").replace(/^[:\s—-]+/, "").trim();
              if(!name || name.length < 2) return;
              const key = name.toLowerCase();
              if(seen.has(key)) return;
              seen.add(key);
              cleaned.push({...item, name, cat});
            });
            const removedCount = shopList.length - cleaned.length;
            setShopList(cleaned);
            notify(removedCount>0 ? "Очищено: убрано "+removedCount+" дубликатов и меток" : "Список уже чист");
          }}>🧹 Очистить дубли и метки</button>
          {shopList.length>0 && <button className="btn btn-ghost btn-sm" onClick={()=>{
            if(confirm("Удалить все товары из списка покупок?")) { setShopList([]); notify("Список очищен"); }
          }}>🗑 Сбросить список</button>}
        </div>
        {shopList.length===0&&<div className="empty"><span className="empty-ico">🛒</span><p>Список пуст. Нажми "Составить список" чтобы AI составил персональный список покупок.</p></div>}
        {cats.filter(c=>byCat[c].length>0).map(cat=>{
          const catEmoji = {"Продукты":"🥦","Бытовая химия":"🧼","Красота и уход":"✨","Для питомцев":"🐾","Одежда":"👕","Аптека":"💊","Другое":"📦"}[cat] || "📦";
          const catColor = {"Продукты":"#7BCCA0","Бытовая химия":"#82AADD","Красота и уход":"#E8A8C8","Для питомцев":"#E8A85A","Одежда":"#B882E8","Аптека":T.danger,"Другое":"#A8A49C"}[cat] || "#A8A49C";
          const itemsLeft = byCat[cat].filter(x=>!x.done).length;
          const itemsDone = byCat[cat].filter(x=>x.done).length;
          return (
            <div key={cat} style={{marginBottom:14,background:"rgba(255,255,255,0.02)",border:"1px solid "+catColor+"33",borderRadius:14,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"linear-gradient(135deg, "+catColor+"22, "+catColor+"08)",borderBottom:"1px solid "+catColor+"22"}}>
                <span style={{fontSize:22}}>{catEmoji}</span>
                <span style={{flex:1,fontFamily:"'Cormorant Infant',serif",fontSize:18,color:catColor,fontWeight:600}}>{cat}</span>
                <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:T.text2,letterSpacing:1}}>{itemsLeft}{itemsDone>0?` / ${itemsDone}✓`:""}</span>
              </div>
              <div style={{padding:"4px 12px"}}>
                {byCat[cat].map(item=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 4px",borderBottom:`1px solid rgba(255,255,255,.03)`}}>
                    <div className={`chk${item.done?" done":""}`} style={{borderColor:item.done?catColor:T.bdr,background:item.done?catColor:"transparent"}} onClick={()=>setShopList(p=>p.map(x=>x.id===item.id?{...x,done:!x.done}:x))}>{item.done?"✓":""}</div>
                    <span style={{flex:1,fontSize:15,textDecoration:item.done?"line-through":"none",color:item.done?T.text3:T.text0,fontFamily:"'Crimson Pro',serif"}}>{item.name}</span>
                    <div className="ico-btn danger" onClick={()=>setShopList(p=>p.filter(x=>x.id!==item.id))}>✕</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {doneN>0&&<button className="btn btn-ghost btn-sm" onClick={()=>setShopList(p=>p.filter(x=>!x.done))}>Очистить купленное ({doneN})</button>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PETS
// ══════════════════════════════════════════════════════════════
function PetsSection({profile,setProfile,petLog,setPetLog,today,kb,notify}) {
  const pets=profile.pets||[];
  const petEmoji=t=>({Кошка:"🐱",Собака:"🐶",Попугай:"🦜",Кролик:"🐰",Хомяк:"🐹",Черепаха:"🐢",Рыбки:"🐠"}[t]||"🐾");
  const getAge=dob=>{if(!dob)return null;const d=Date.now()-new Date(dob);const y=Math.floor(d/(365.25*86400000));const m=Math.floor((d%(365.25*86400000))/(30.44*86400000));return y>0?`${y} лет`:`${m} мес.`;};
  const daysUntil=dateStr=>{if(!dateStr)return null;const t=new Date(dateStr);t.setFullYear(t.getFullYear()+1);return Math.round((t-new Date())/86400000);};
  const markFeed=(petId,idx)=>{const c=petLog[today]?.[petId]||[];const n=c.includes(idx)?c.filter(x=>x!==idx):[...c,idx];setPetLog(p=>({...p,[today]:{...(p[today]||{}),[petId]:n}}));};
  return(
    <div>
      <AiBox kb={kb} prompt={`Советы по уходу за питомцами: ${pets.map(p=>`${p.name}(${p.type},${p.breed||"—"},особенности:${p.notes||"нет"})`).join(";")||"нет питомцев"}. Что важно для здоровья, на что обращать внимание?`} label="Уход за питомцами" btnText="Советы по уходу" placeholder="Дам советы по уходу за твоими питомцами..."/>
      {pets.length===0&&<div className="empty"><span className="empty-ico">🐾</span><p>Питомцев нет. Добавь в профиле!</p></div>}
      {pets.map(pet=>{
        const feeds=parseInt(pet.feedTimes)||2;
        const log=petLog[today]?.[pet.id]||[];
        const labels=feeds===1?["День"]:feeds===2?["Утро","Вечер"]:feeds===3?["Утро","День","Вечер"]:["1","2","3","4"];
        const vacDays=daysUntil(pet.vacDate);
        const parDays=daysUntil(pet.parasiteDate);
        return(
          <div key={pet.id} className="pet-card">
            <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:14}}>
              <div className="pet-ava">{petEmoji(pet.type)}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20,color:T.text0,marginBottom:3}}>{pet.name}</div>
                <div style={{fontSize:13,color:T.text3}}>{pet.type}{pet.breed&&" · "+pet.breed}{pet.dob&&" · "+getAge(pet.dob)}</div>
                {pet.food&&<div style={{fontSize:13,color:T.text2,marginTop:2}}>🍽 {pet.food}</div>}
                {pet.notes&&<div style={{fontSize:13,color:T.warn,marginTop:2}}>⚠ {pet.notes}</div>}
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:T.text3,letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Кормление ({log.length}/{feeds})</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {Array.from({length:feeds},(_,i)=>(
                  <button key={i} className={`feed-btn${log.includes(i)?" done":""}`} onClick={()=>markFeed(pet.id,i)}>
                    {log.includes(i)?"✓ ":""}{labels[i]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {vacDays!==null&&<span className={`badge ${vacDays<0?"br":vacDays<30?"bw":"bgr"}`}>💉 Вакцин.: {vacDays<0?"просрочена":vacDays===0?"сегодня":`через ${vacDays} дн.`}</span>}
              {parDays!==null&&<span className={`badge ${parDays<0?"br":parDays<14?"bw":"bm"}`}>🪲 Антипараз.: {parDays<0?"просрочено":`через ${parDays} дн.`}</span>}
            </div>
            {vacDays!==null&&vacDays<30&&<div style={{marginTop:10}}><button className="btn btn-ghost btn-xs" onClick={()=>openGCal(`Вакцинация ${pet.name}`,new Date(Date.now()+vacDays*86400000).toISOString(),`${pet.name}(${pet.type})`)}>📅 В Calendar</button></div>}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════════════════════════════
function HealthSection({profile,tasks,setTasks,setShopList,today,kb,notify}) {
  const gp = genderPrompt(profile);
  const [modal,setModal]=useState(null);
  const moon=getMoon();
  const moonN=moon.n; const moonT=moon.t;
  const season=(()=>{const m=new Date().getMonth();return m<2||m>10?"зима":m<5?"весна":m<8?"лето":"осень";})();
  const healthTasks=tasks.filter(t=>t.section==="health");
  const due=healthTasks.filter(t=>isDue(t,today));
  const autoHealth=()=>{
    const items=[];
    if((profile.sport||[]).length>0)items.push({title:profile.sport[0],freq:"weekly:1,3,5",priority:"m"});
    if((profile.practices||[]).includes("Медитация"))items.push({title:"Медитация 10–15 мин",freq:"daily",priority:"m",preferredTime:profile.wake});
    if((profile.practices||[]).includes("Цигун"))items.push({title:"Практика цигун",freq:"daily",priority:"m"});
    items.push({title:"8 стаканов воды",freq:"daily",priority:"l"});
    if((profile.healthFocus||[]).includes("Суставы и спина"))items.push({title:"Зарядка для спины",freq:"daily",priority:"m"});
    return items.map(t=>({...t,id:Date.now()+Math.random(),section:"health",lastDone:"",doneDate:"",notes:""}));
  };
  return(
    <div>
      <div className="card card-accent">
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8}}>{(profile.healthFocus||[]).map(h=><span key={h} className="badge bgr">{h}</span>)}{profile.chronic&&<span className="badge bw">⚠ {profile.chronic}</span>}</div>
        <div style={{fontSize:13,color:T.text3}}>Цель: {profile.healthGoal||"—"} · Питание: {profile.nutrition||"—"}</div>
        <div style={{marginTop:10,padding:"8px 13px",background:"rgba(78,201,190,.07)",borderRadius:9,fontSize:13,color:T.teal}}>🌙 {moon.n} — {moon.t}</div>
      </div>
      <AiBox kb={kb} prompt={`${gp.address}. Дай персональные советы по здоровью на сегодня. Луна: ${moon.n}(${moon.t}). Мои проблемные зоны: ${(profile.healthFocus||[]).join(",")||"—"}. Хронические болезни: ${profile.chronic||"нет"}. Цель: ${profile.healthGoal||"—"}. Питание: ${profile.nutrition||"обычное"}. Практики: ${(profile.practices||[]).join(",")||"—"}. Свободен(а) после: ${profile.workEnd||"18:00"}. ${gp.address}. Дай: 1) что полезно при этой фазе луны для моих зон здоровья, 2) конкретный рецепт под моё питание на сегодня, 3) комплекс практик 15-20 мин строго после ${profile.workEnd||"18:00"}.`} label="Здоровье на сегодня" btnText="Советы по здоровью" placeholder="Дам персональные советы по здоровью..."/>
      <div className="card">
        <div className="card-hd">
          <div className="card-title">Здоровые привычки</div>
          <div className="btn-row">{healthTasks.length===0&&<button className="btn btn-ghost btn-sm" onClick={()=>{const ts=autoHealth();setTasks(p=>[...p,...ts]);notify("Добавлено");}}>✦ Авто</button>}<button className="btn btn-ghost btn-sm" onClick={()=>setModal({})}>+ Своя</button></div>
        </div>
        {due.length===0&&<div className="empty"><span className="empty-ico">🌿</span><p>Здоровых задач на сегодня нет</p></div>}
        {due.map(task=>(
          <div key={task.id} className="task-row">
            <div className={`chk${task.doneDate===today?" done":""}`} onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t))}>{task.doneDate===today?"✓":""}</div>
            <div className="task-body"><div className={`task-name${task.doneDate===today?" done":""}`}>{task.title}</div><div className="task-meta"><span className="badge bt">{freqLabel(task.freq)}</span></div></div>
            <div className="ico-btn" onClick={()=>setModal(task)} style={{color:T.teal,opacity:.7}}>✏️</div>
            <div className="ico-btn" onClick={()=>setModal(task)} style={{color:T.teal,opacity:.7}}>✏️</div>
            <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
          </div>
        ))}
      </div>
      {modal!==null&&<TaskModal task={modal.id?modal:null} defaultSection="health" onSave={t=>{setTasks(p=>modal.id?p.map(x=>x.id===t.id?t:x):[...p,t]);notify("Добавлено");}} onClose={()=>setModal(null)}/>}
      <AiBox kb={kb} prompt={(()=>{
        const tcm=getTCMFullProfile(profile);
        const el=tcm?.el;
        const cn=tcm?.cn;
        const familySize2 = parseInt(profile.familySize||"1");
        const hasWeightGoalH = (profile.mainGoal||"").toLowerCase().includes("похуде")||(profile.mainGoal||"").toLowerCase().includes("вес")||(profile.healthGoal||"").toLowerCase().includes("похуде");
        const weightTarget = hasWeightGoalH?"\n• ЦЕЛЬ ПОХУДЕНИЯ: высокий белок (курица, рыба, яйца, бобовые), много овощей и клетчатки, минимум простых углеводов, сахара и мучного. Дефицит калорий ~300-500 ккал. Дробное питание 4-5 раз.":"";
        const familyNote2 = familySize2>1?"\n• Семья: "+familySize2+" чел. — "+(profile.livesWith||[]).join(", ")+(profile.childrenAges?", дети "+profile.childrenAges:"")+(profile.familyNeeds?". Особые потребности: "+profile.familyNeeds:""):"";
        return "Составь меню питания на неделю.\n\nПРОФИЛЬ ПИТАНИЯ:\n• Тип питания: "+(profile.nutrition||"обычное")+"\n• Цель здоровья: "+(profile.healthGoal||"—")+"\n• Главная цель: "+(profile.mainGoal||"—")+weightTarget+"\n• Зоны здоровья: "+((profile.healthFocus||[]).join(", ")||"—")+"\n• Хронические: "+(profile.chronic||"нет")+familyNote2+"\n\nТКМ-ПРОФИЛЬ:\n• Стихия: "+(el?el.name+" ("+(el.yin?"Инь":"Ян")+")":"—")+"\n• Органы: "+(el?el.organ:"—")+"\n• Вкус: "+(el?el.taste:"—")+"\n• Конституция: "+(cn?cn.type:"—")+"\n• Синдромы: "+((tcm?.syndromes||[]).join(", ")||"не определены")+"\n• Органы под вниманием: "+((tcm?.uniqueOrgans||[]).join(", ")||"—")+"\n• Пищеварение: "+(tcm?.digestionNote||"в норме")+"\n• ТКМ-продукты: "+(tcm?.foodRecs||cn?.foods||"—")+"\n\nЛУНА И СЕЗОН:\n• Луна: "+moonN+" ("+moonT+"). Сезон: "+season+"\n• Всегда дома: "+((profile.staples||[]).join(", ")||"—")+"\n\nПРАВИЛА:\n1) Продукты поддерживают органы стихии\n2) Учитывай вкус-союзник\n"+(hasWeightGoalH?"3) ПРИОРИТЕТ: цель похудения — калорийный дефицит, много белка и овощей\n":"3) Продукты простые и сезонные\n")+"4) Порции на "+familySize2+" "+(familySize2===1?"человека":"человек")+"\n\n## Меню на 7 дней\nЗавтрак, обед, ужин. Калорийность завтрака/обеда/ужина если цель похудение.\n\n## Список продуктов\nКАЖДЫЙ продукт с меткой [Продукты] или [Аптека], количество на "+familySize2+" чел.";
      })()}
        label="Меню на неделю (ТКМ)" btnText="Составить меню по ТКМ" placeholder="Составлю меню с учётом твоей стихии, синдромов и конституции по ТКМ..." actionType="shopping" onShopAdd={setShopList}/>
      <AiBox kb={kb} prompt={"Дай рецепт на сегодня для "+( profile.name||"меня")+". Тип питания: "+(profile.nutrition||"обычное")+". Луна: "+moonN+" ("+moonT+"). Зоны здоровья: "+((profile.healthFocus||[]).join(","))+". Что есть дома: "+((profile.staples||[]).join(","))+". Сезон: "+season+". Дай: 1) один конкретный рецепт под эту фазу луны и мои зоны здоровья, 2) почему именно этот рецепт полезен для меня сегодня, 3) какие добавки или суперфуды добавить для усиления эффекта."} label="Рецепт на сегодня" btnText="Рецепт дня" placeholder="Подберу рецепт под фазу луны и твоё здоровье..." noActions={true}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  BEAUTY
// ══════════════════════════════════════════════════════════════
function BeautySection({profile,tasks,setTasks,today,kb,notify}) {
  const [modal,setModal]=useState(null);
  const beautyTasks=tasks.filter(t=>t.section==="beauty");
  const due=beautyTasks.filter(t=>isDue(t,today));
  const isMale = profile.gender === "Мужской";
  const autoBeauty=()=>{
    const items = isMale ? [
      {title:"Уход за лицом — утро (умывание, крем)",freq:"daily",priority:"m"},
      {title:"Уход за лицом — вечер (умывание)",freq:"daily",priority:"m"},
      {title:"Уход за бородой / бритьё",freq:"every:2",priority:"m"},
      {title:"Скраб для лица",freq:"every:7",priority:"l"},
      {title:"Крем для рук",freq:"daily",priority:"l"},
      {title:"Уход за кожей тела (увлажнение)",freq:"every:2",priority:"l"},
    ] : [
      {title:"Уход за лицом — утро",freq:"daily",priority:"m"},
      {title:"Уход за лицом — вечер",freq:"daily",priority:"m"},
      {title:"Маска для лица",freq:"every:3",priority:"l"},
      {title:"Маска для волос",freq:"every:7",priority:"l"},
      {title:"Скраб для тела",freq:"every:4",priority:"l"},
      {title:"Крем для рук и тела",freq:"daily",priority:"l"},
    ];
    if(isMale) {
      items.push({title:"Барбер / стрижка",freq:"every:30",priority:"m"});
    } else {
      if(profile.nailFreq&&!profile.nailFreq.includes("Не"))items.push({title:"Маникюр / педикюр",freq:"every:21",priority:"m"});
      if(profile.haircutFreq)items.push({title:"Стрижка",freq:profile.haircutFreq.includes("месяц")?"every:30":"every:42",priority:"l"});
    }
    return items.map(t=>({...t,id:Date.now()+Math.random(),section:"beauty",lastDone:"",doneDate:"",notes:""}));
  };
  return(
    <div>
      <div className="card card-accent">
        <div className="g2">
          <div className="pf-item"><div className="pf-l">Кожа</div><div className="pf-v">{profile.skinType||"—"}</div></div>
          <div className="pf-item"><div className="pf-l">Волосы</div><div className="pf-v">{profile.hairType||"—"}</div></div>
          {profile.gender!=="Мужской"&&<div className="pf-item"><div className="pf-l">Ногти</div><div className="pf-v">{profile.nailFreq||"—"}</div></div>}
          {profile.gender==="Мужской"&&<div className="pf-item"><div className="pf-l">Борода</div><div className="pf-v">{profile.beard||"—"}</div></div>}
          <div className="pf-item"><div className="pf-l">Приоритет</div><div className="pf-v">{profile.beautyPriority||"—"}</div></div>
        </div>
      </div>
      <AiBox kb={kb} prompt={isMale
        ? "Дай советы по уходу за собой для мужчины. Тип кожи: "+(profile.skinType||"нормальная")+", борода: "+(profile.beard||"нет")+". Свободное время после "+(profile.workEnd||"18:00")+". Только мужской уход — НЕ упоминай маски, лак, педикюр. Структура:\n\n## Утренний уход\n3 шага нумерованным списком.\n\n## Вечерний уход\n3 шага.\n\n## Уход за бородой / бритьё\n3 совета.\n\n## Что сделать сегодня\n2 конкретных действия."
        : "Дай советы ТОЛЬКО по красоте и уходу за собой (кожа, волосы, ногти, тело). Тип кожи: "+(profile.skinType||"нормальная")+", тип волос: "+(profile.hairType||"нормальные")+", приоритет: "+(profile.beautyPriority||"—")+". Свободное время после "+(profile.workEnd||"18:00")+". Луна: "+getMoon().n+". ВАЖНО: НЕ упоминай уборку, дом, питомцев, работу, питание. Только КРАСОТА. Структура:\n\n## Утренний уход\n3-4 шага под твой тип кожи нумерованным списком.\n\n## Вечерний ритуал\n3-4 шага нумерованным списком.\n\n## Уход за волосами\n3 шага под твой тип волос.\n\n## Что сделать сегодня\n2-3 конкретные процедуры с учётом фазы луны нумерованным списком."
      } label={isMale?"Уход за собой":"Красота и уход"} btnText="Советы по уходу" placeholder="Дам персональные советы по уходу..."/>
      <div className="card">
        <div className="card-hd">
          <div className="card-title">Процедуры</div>
          <div className="btn-row">{beautyTasks.length===0&&<button className="btn btn-ghost btn-sm" onClick={()=>{const ts=autoBeauty();setTasks(p=>[...p,...ts]);notify(`Добавлено ${ts.length}`);}}>✦ Авто</button>}<button className="btn btn-ghost btn-sm" onClick={()=>setModal({})}>+ Своя</button></div>
        </div>
        {due.length===0&&<div className="empty"><span className="empty-ico">✨</span><p>Процедур на сегодня нет</p></div>}
        {due.map(task=>(
          <div key={task.id} className="task-row">
            <div className={`chk${task.doneDate===today?" done":""}`} onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t))}>{task.doneDate===today?"✓":""}</div>
            <div className="task-body"><div className={`task-name${task.doneDate===today?" done":""}`}>{task.title}</div><div className="task-meta"><span className="badge bp">{freqLabel(task.freq)}</span></div></div>
            <div className="ico-btn" onClick={()=>setModal(task)} style={{color:T.teal,opacity:.7}}>✏️</div>
            <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
          </div>
        ))}
      </div>
      {modal!==null&&<TaskModal task={modal.id?modal:null} defaultSection="beauty" onSave={t=>{setTasks(p=>modal.id?p.map(x=>x.id===t.id?t:x):[...p,t]);notify("Добавлено");}} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  HOBBIES
// ══════════════════════════════════════════════════════════════
function HobbiesSection({profile,hobbies,setHobbies,kb,notify}) {
  const [modal,setModal]=useState(false);
  const [nh,setNh]=useState({name:"",goal:"",notes:""});
  const logSession=id=>{setHobbies(p=>p.map(h=>h.id===id?{...h,sessions:[...(h.sessions||[]),toDay()]}:h));notify("Сессия отмечена!");};
  return(
    <div>
      <AiBox kb={kb} prompt={`Советы по хобби для ${profile.name||"меня"}. Мои хобби: ${(profile.hobbies||[]).join(",")||"—"}. Текущий проект: ${profile.hobbyProject||"—"}. Работаю до ${profile.workEnd||"18:00"}, значит свободное время с ${profile.workEnd||"18:00"} до ${profile.sleep||"23:00"}. Тип планирования: ${profile.planningStyle||"—"}. Восстанавливаюсь через: ${(profile.recovery||[]).join(",")||"—"}. Как встроить хобби в мой реальный распорядок? Дай конкретный пошаговый план развития моего проекта.`} label="Хобби и увлечения" btnText="Советы по хобби" placeholder="Помогу найти время для хобби..."/>
      {hobbies.length===0&&<div className="empty"><span className="empty-ico">🎨</span><p>Добавь свои хобби</p><button className="btn btn-primary btn-sm" style={{marginTop:12}} onClick={()=>setModal(true)}>+ Добавить хобби</button></div>}
      {hobbies.map(h=>{
        const wk=(h.sessions||[]).filter(s=>(new Date()-new Date(s))/86400000<=7).length;
        return(
          <div key={h.id} className="hobby-card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20,color:T.text0}}>{h.name}</div>
              <div className="ico-btn danger" onClick={()=>setHobbies(p=>p.filter(x=>x.id!==h.id))}>✕</div>
            </div>
            {h.goal&&<div style={{fontSize:13,color:T.text3,marginBottom:8,fontStyle:"italic"}}>✦ {h.goal}</div>}
            <div style={{display:"flex",gap:7,marginBottom:12}}>
              <span className="badge bp">За неделю: {wk} сессий</span>
              <span className="badge bm">Всего: {(h.sessions||[]).length}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>logSession(h.id)}>✓ Занимался(ась) сегодня</button>
          </div>
        );
      })}
      {hobbies.length>0&&<button className="btn btn-ghost btn-sm" onClick={()=>setModal(true)}>+ Добавить хобби</button>}
      {modal&&(
        <div className="overlay" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <span className="modal-x" onClick={()=>setModal(false)}>✕</span>
            <div className="modal-title">Новое хобби</div>
            <div className="fld"><label>Название</label><input placeholder="Фотография, чтение, вязание..." value={nh.name} onChange={e=>setNh(p=>({...p,name:e.target.value}))}/></div>
            <div className="fld"><label>Цель / проект</label><input placeholder="Освоить ретушь, прочитать 12 книг..." value={nh.goal} onChange={e=>setNh(p=>({...p,goal:e.target.value}))}/></div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={()=>{if(!nh.name.trim())return;setHobbies(p=>[...p,{...nh,id:Date.now(),sessions:[]}]);setModal(false);notify("Хобби добавлено");}}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  GOALS
// ══════════════════════════════════════════════════════════════
function GoalsSection({profile,setProfile,tasks,setTasks,kb,notify}) {
  const moon = getMoon();
  const [editGoal, setEditGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(profile.mainGoal||"");
  const [newAreas, setNewAreas] = useState(profile.goalAreas||[]);
  const [newBlocks, setNewBlocks] = useState(profile.goalBlocks||[]);
  const [newDeadline, setNewDeadline] = useState(profile.goalDeadline||"");
  const [newMetric, setNewMetric] = useState(profile.goalMetric||"");
  const [activeArea, setActiveArea] = useState(null);
  const [tab, setTab] = useState("goal");
  const [addModal, setAddModal] = useState(null); // {title, time, section}

  // Добавить задачу из AI плана в планировщик
  const addGoalTask = (title, time="", section="tasks") => {
    const task = {
      id: Date.now()+Math.random(),
      title: title.length>100?title.slice(0,97)+"...":title,
      section, freq:"once", priority:"m",
      preferredTime: time, deadline:"", notes:"Из плана целей",
      lastDone:"", doneDate:""
    };
    setTasks(p=>[...p, task]);
    notify("Добавлено в планировщик ✦");
  };

  // Callback для AiBox — разбирает пункты плана и добавляет задачи
  const onPlanTaskAdd = (merged) => {
    // merged уже обновлён через localStorage в AiBox
    // но мы используем setTasks напрямую
  };

  // Кастомный обработчик для добавления с временем
  const handleAddItem = (itemText) => {
    setAddModal({title: itemText.slice(0,100), time:"", section:"tasks"});
  };

  const goalAreas = profile.goalAreas||[];
  const goalBlocks = profile.goalBlocks||[];
  const mainGoal = profile.mainGoal||"";

  const [wheelScores, setWheelScores] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("ld_wheel")||"null")||{}; }
    catch { return {}; }
  });

  const AREA_EMOJI = {"Здоровье":"💚","Карьера":"💼","Финансы":"💰","Отношения":"❤️","Саморазвитие":"📚","Творчество":"🎨","Путешествия":"✈️","Духовность":"🌟","Семья":"👨‍👩‍👧","Внешность":"✨"};
  const BLOCK_TIP = {"Нехватка времени":"Помодоро + делегирование","Нехватка энергии":"Оптимизация сна + режим","Откладываю":"Правило 2 минут + декомпозиция","Не знаю с чего начать":"Шаги по 15 минут","Много отвлекаюсь":"Режим фокуса","Страх неудачи":"Маленькие победы каждый день"};

  const GOAL_PRESETS = [
    {emoji:"⚡",title:"Карьера и доход",   example:"Вырасти до руководителя / увеличить доход на 30%",   areas:["Карьера","Финансы"],    metric:"Должность / доход в тенге"},
    {emoji:"💪",title:"Здоровье и фигура", example:"Похудеть на 10 кг / пробежать 5 км",                 areas:["Здоровье","Внешность"],  metric:"Вес / км"},
    {emoji:"✨",title:"Внешность и уход",  example:"Выработать уходовый ритуал / улучшить кожу",          areas:["Внешность","Здоровье"], metric:"Привычки в неделю"},
    {emoji:"❤️",title:"Отношения",         example:"Найти партнёра / улучшить отношения в семье",         areas:["Отношения","Семья"],     metric:"Качество времени"},
    {emoji:"📚",title:"Обучение и рост",   example:"Получить сертификат / выучить язык",                  areas:["Саморазвитие"],          metric:"Часы обучения / уровень"},
    {emoji:"💰",title:"Финансы",           example:"Создать финансовую подушку 3 млн тг",                 areas:["Финансы"],               metric:"Сумма накоплений"},
    {emoji:"🌿",title:"Баланс и покой",    example:"Снизить стресс / выработать медитативную практику",   areas:["Здоровье","Духовность"], metric:"Уровень стресса 1-10"},
    {emoji:"🎨",title:"Творчество",        example:"Запустить проект / освоить новый навык",              areas:["Творчество","Саморазвитие"],metric:"Готовый результат"},
  ];

  // Умные рекомендации под цель
  const goalRecs = {
    "Здоровье":    ["Трекай сон каждый день","Добавь 20 мин движения утром","Убери сахар на 2 недели","Пей 8 стаканов воды"],
    "Внешность":   ["Утренний и вечерний уход — каждый день","Фото прогресса раз в неделю","Записаться к дерматологу","Трекай водный баланс"],
    "Карьера":     ["Выдели 1 час в день на главный проект","Нетворкинг — 1 знакомство в неделю","Изучи 1 новый навык в месяц","Веди дневник профессиональных побед"],
    "Финансы":     ["Фиксируй каждую трату","Отложи 10% до трат","Изучи 1 инвестиционный инструмент","Проведи ревизию подписок"],
    "Отношения":   ["Осознанное время без телефона каждый день","Напиши близкому что ценишь его","Разговор о чувствах раз в неделю","Сюрприз без повода"],
    "Саморазвитие":["30 мин чтения каждый день","Подкаст по пути на работу","1 онлайн-курс в месяц","Дневник инсайтов"],
    "Духовность":  ["10 мин медитации утром","Дневник благодарности вечером","Прогулка в тишине","Практика осознанности"],
    "Творчество":  ["15 мин на проект каждый день","Не оценивай — просто создавай","Найди сообщество по интересу","Закончи что-то маленькое"],
  };

  const saveGoal = () => {
    setProfile(p=>({...p,
      mainGoal: newGoal,
      goalAreas: newAreas,
      goalBlocks: newBlocks,
      goalDeadline: newDeadline,
      goalMetric: newMetric,
    }));
    setEditGoal(false);
    notify("Цель обновлена ✦");
  };

  const WHEEL_AREAS = [
    {name:"Здоровье",emoji:"💚",color:"#7BCCA0"},
    {name:"Карьера",emoji:"💼",color:"#82AADD"},
    {name:"Финансы",emoji:"💰",color:"#E5C87A"},
    {name:"Отношения",emoji:"❤️",color:"#E8556D"},
    {name:"Семья",emoji:"👨‍👩‍👧",color:"#B882E8"},
    {name:"Саморазвитие",emoji:"📚",color:"#4EC9BE"},
    {name:"Творчество",emoji:"🎨",color:"#E8A85A"},
    {name:"Духовность",emoji:"🌟",color:"#A8A49C"},
  ];
  const cx=150,cy=150,maxR=120;
  const sectorPath=(i,score)=>{
    const r=(score/10)*maxR;
    const a1=(i/8)*2*Math.PI-Math.PI/2;
    const a2=((i+1)/8)*2*Math.PI-Math.PI/2;
    return `M ${cx} ${cy} L ${cx+r*Math.cos(a1)} ${cy+r*Math.sin(a1)} A ${r} ${r} 0 0 1 ${cx+r*Math.cos(a2)} ${cy+r*Math.sin(a2)} Z`;
  };
  const updateScore=(name,val)=>{
    const next={...wheelScores,[name]:val};
    setWheelScores(next);
    try{localStorage.setItem("ld_wheel",JSON.stringify(next));}catch{}
  };

  const activeRecs = newAreas.flatMap(a=>goalRecs[a]||[]).slice(0,6);

  return(
    <div>
      {/* Модалка добавления задачи из плана в планировщик */}
      {addModal&&(
        <div className="overlay" onClick={()=>setAddModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <span className="modal-x" onClick={()=>setAddModal(null)}>✕</span>
            <div className="modal-title">Добавить в планировщик</div>
            <div className="fld">
              <label>Задача</label>
              <input value={addModal.title} onChange={e=>setAddModal(p=>({...p,title:e.target.value}))}/>
            </div>
            <div className="fld-row">
              <div className="fld">
                <label>Время выполнения</label>
                <input type="time" value={addModal.time||""} onChange={e=>setAddModal(p=>({...p,time:e.target.value}))}/>
              </div>
              <div className="fld">
                <label>Раздел</label>
                <select value={addModal.section||"tasks"} onChange={e=>setAddModal(p=>({...p,section:e.target.value}))}>
                  <option value="tasks">Общие задачи</option>
                  <option value="health">Здоровье</option>
                  <option value="home">Дом</option>
                  <option value="hobbies">Хобби</option>
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setAddModal(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={()=>{
                addGoalTask(addModal.title, addModal.time||"", addModal.section||"tasks");
                setAddModal(null);
              }}>📅 Добавить в планировщик</button>
            </div>
          </div>
        </div>
      )}
      {/* ── Вкладки ── */}
      <div className="tabs" style={{marginBottom:14}}>
        {[["goal","🎯 Моя цель"],["wheel","🔄 Колесо"],["plan","📋 План"]].map(([v,l])=>(
          <div key={v} className={"tab"+(tab===v?" on":"")} onClick={()=>setTab(v)}>{l}</div>
        ))}
      </div>

      {/* ══ ВКЛАДКА: МОЯ ЦЕЛЬ ══ */}
      {tab==="goal"&&<>
        {/* Текущая цель */}
        {!editGoal&&(
          <div className="card card-accent" style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2}}>ТЕКУЩАЯ ЦЕЛЬ</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>{
                setNewGoal(mainGoal);setNewAreas(goalAreas);setNewBlocks(goalBlocks);
                setNewDeadline(profile.goalDeadline||"");setNewMetric(profile.goalMetric||"");
                setEditGoal(true);
              }}>✏️ Изменить</button>
            </div>
            {mainGoal
              ? <>
                  <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.gold,lineHeight:1.3,marginBottom:8}}>{mainGoal}</div>
                  {profile.goalDeadline&&<div style={{fontSize:12,color:T.text3,marginBottom:4}}>📅 Срок: {new Date(profile.goalDeadline).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</div>}
                  {profile.goalMetric&&<div style={{fontSize:12,color:T.text3,marginBottom:8}}>📏 Как измеряю: {profile.goalMetric}</div>}
                  {goalAreas.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    {goalAreas.map(a=><span key={a} style={{fontSize:12,padding:"4px 10px",borderRadius:20,background:"rgba(45,106,79,0.12)",color:T.success}}>{AREA_EMOJI[a]||""} {a}</span>)}
                  </div>}
                  <div style={{fontSize:13,color:T.text3,fontStyle:"italic"}}>Луна {moon.n} — {moon.t}</div>
                </>
              : <div style={{fontSize:15,color:T.text3,fontStyle:"italic"}}>Цель не установлена. Нажми «Изменить» чтобы добавить.</div>
            }
          </div>
        )}

        {/* Редактор цели */}
        {editGoal&&(
          <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.gold}}>
            <div style={{fontSize:11,color:T.gold,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:12}}>
              {mainGoal?"ИЗМЕНИТЬ ЦЕЛЬ":"УСТАНОВИТЬ ЦЕЛЬ"}
            </div>

            {/* Быстрые шаблоны */}
            <div style={{fontSize:12,color:T.text3,marginBottom:8}}>Выбери направление или напиши своё:</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
              {GOAL_PRESETS.map(p=>(
                <div key={p.title} onClick={()=>{
                  setNewGoal(p.example);
                  setNewAreas(p.areas);
                  setNewMetric(p.metric);
                }} style={{
                  display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
                  borderRadius:20,cursor:"pointer",fontSize:13,
                  border:"1px solid "+(newAreas.join()===p.areas.join()?T.gold:T.bdr),
                  background:newAreas.join()===p.areas.join()?"rgba(45,106,79,0.12)":"transparent",
                  color:newAreas.join()===p.areas.join()?T.gold:T.text1,
                }}>
                  <span>{p.emoji}</span><span>{p.title}</span>
                </div>
              ))}
            </div>

            <div className="fld">
              <label>Моя цель</label>
              <textarea placeholder="Конкретно и измеримо: похудеть на 10 кг к лету, вырасти до старшего менеджера..." value={newGoal} onChange={e=>setNewGoal(e.target.value)} style={{minHeight:72}}/>
            </div>
            <div className="fld-row">
              <div className="fld">
                <label>Срок достижения</label>
                <input type="date" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)}/>
              </div>
              <div className="fld">
                <label>Как буду измерять</label>
                <input placeholder="кг / тенге / уровень..." value={newMetric} onChange={e=>setNewMetric(e.target.value)}/>
              </div>
            </div>
            <div className="fld">
              <label>Сферы жизни (можно несколько)</label>
              <div className="chips">{["Здоровье","Карьера","Финансы","Отношения","Саморазвитие","Творчество","Путешествия","Духовность","Семья","Внешность"].map(v=>(
                <div key={v} className={"chip "+(newAreas.includes(v)?"on":"")} onClick={()=>setNewAreas(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])}>{AREA_EMOJI[v]||""} {v}</div>
              ))}</div>
            </div>
            <div className="fld">
              <label>Что сдерживает?</label>
              <div className="chips">{["Нехватка времени","Нехватка энергии","Откладываю","Не знаю с чего начать","Много отвлекаюсь","Страх неудачи"].map(v=>(
                <div key={v} className={"chip "+(newBlocks.includes(v)?"on":"")} onClick={()=>setNewBlocks(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])}>{v}</div>
              ))}</div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button className="btn btn-ghost" onClick={()=>setEditGoal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={saveGoal}>Сохранить цель ✦</button>
            </div>
          </div>
        )}

        {/* Умные рекомендации под цель */}
        {activeRecs.length>0&&!editGoal&&(
          <div className="card" style={{marginBottom:12}}>
            <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:10}}>ЧТО ПОМОГАЕТ ДОСТИЧЬ ЦЕЛИ</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {activeRecs.map((r,i)=>(
                <div key={i} style={{padding:"8px 10px",background:"rgba(45,106,79,0.06)",borderRadius:10,cursor:"pointer"}}
                  onClick={()=>setAddModal({title:r,time:"",section:"tasks"})}>
                  <div style={{fontSize:13,color:T.text1,marginBottom:4}}>✦ {r}</div>
                  <div style={{fontSize:10,color:T.teal,fontFamily:"'JetBrains Mono'"}}>+ в планировщик</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Что сдерживает + решения */}
        {goalBlocks.length>0&&!editGoal&&(
          <div className="card" style={{marginBottom:12}}>
            <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:10}}>КАК ПРЕОДОЛЕТЬ БАРЬЕРЫ</div>
            {goalBlocks.map(b=>(
              <div key={b} style={{padding:"8px 0",borderBottom:"1px solid "+T.bdrS}}>
                <div style={{fontSize:14,color:T.text0,marginBottom:3}}>⚡ {b}</div>
                <div style={{fontSize:12,color:T.text3,fontStyle:"italic"}}>→ {BLOCK_TIP[b]||"Разбей на маленькие шаги"}</div>
              </div>
            ))}
          </div>
        )}

        {/* AI план */}
        {!editGoal&&mainGoal&&(
          <AiBox kb={kb} prompt={
            "Составь персональный план достижения цели. Цель: "+(mainGoal)+
            ". Срок: "+(profile.goalDeadline||"не указан")+
            ". Как измеряю: "+(profile.goalMetric||"—")+
            ". Сферы: "+(newAreas.join(",")||"—")+
            ". Барьеры: "+(goalBlocks.join(",")||"—")+
            ". Мотивирует: "+(profile.motivates||"—")+
            ". Ценность: "+(profile.coreValue||"—")+
            ". Свободное время: с "+(profile.workEnd||"18:00")+" до "+(profile.sleep||"23:00")+
            ", "+(profile.selfTime||"30")+" мин/день на себя."+
            " Луна: "+moon.n+"("+moon.t+")."+
            " Дай: 1) 3 конкретных шага на эту неделю с точным временем, 2) как преодолеть каждый барьер из списка, 3) аффирмацию под ценность, 4) что сделать СЕГОДНЯ за 15 минут."
          } label="AI план достижения цели" btnText="Составить план" placeholder="Составлю персональный план под твою цель..."
          onTaskAdd={(items)=>{ if(Array.isArray(items)) items.forEach(t=>handleAddItem(typeof t==="string"?t:t.title||"")); }}
          />
        )}
        {!editGoal&&mainGoal&&(
          <AiBox kb={kb} prompt={
            "Составь 5 персональных аффирмаций. Цель: "+mainGoal+
            ". Ценность: "+(profile.coreValue||"—")+
            ". Мотивирует: "+(profile.motivates||"—")+
            ". Знак зодиака: "+getZodiac(profile.dob).name+
            ". Луна: "+moon.n+". Хронотип: "+(profile.chronotype||"—")+
            ". Аффирмации — в настоящем времени, от первого лица, конкретные. Когда и как произносить."
          } label="Мои аффирмации" btnText="Создать аффирмации" placeholder="Создам аффирмации под твою цель..."/>
        )}
      </>}

      {/* ══ ВКЛАДКА: КОЛЕСО ЖИЗНИ ══ */}
      {tab==="wheel"&&<>
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:8,textAlign:"center"}}>КОЛЕСО ЖИЗНИ — нажми на сектор</div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
            <svg width="320" height="320" viewBox="-30 -30 360 360" style={{maxWidth:"100%"}}>
              {[2,4,6,8,10].map(n=><circle key={n} cx={cx} cy={cy} r={(n/10)*maxR} fill="none" stroke="rgba(45,32,16,0.1)" strokeWidth="1"/>)}
              {WHEEL_AREAS.map((_,i)=>{
                const a=(i/8)*2*Math.PI-Math.PI/2;
                return <line key={i} x1={cx} y1={cy} x2={cx+maxR*Math.cos(a)} y2={cy+maxR*Math.sin(a)} stroke="rgba(200,164,90,0.15)" strokeWidth="1"/>;
              })}
              {WHEEL_AREAS.map((area,i)=>(
                <path key={area.name} d={sectorPath(i,wheelScores[area.name]||5)}
                  fill={area.color} fillOpacity={activeArea===i?0.75:0.5}
                  stroke={area.color} strokeWidth={activeArea===i?2.5:1.5}
                  style={{cursor:"pointer",transition:"all .2s"}}
                  onClick={()=>setActiveArea(activeArea===i?null:i)}/>
              ))}
              {WHEEL_AREAS.map((area,i)=>{
                const a=((i+0.5)/8)*2*Math.PI-Math.PI/2;
                return <text key={area.name} x={cx+(maxR+20)*Math.cos(a)} y={cy+(maxR+20)*Math.sin(a)}
                  textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={T.text2}>{area.emoji}</text>;
              })}
            </svg>
          </div>
          {activeArea!==null&&(
            <div style={{padding:"12px 14px",background:"rgba(45,106,79,0.08)",borderRadius:12,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:22}}>{WHEEL_AREAS[activeArea].emoji}</span>
                <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:18,color:T.text0}}>{WHEEL_AREAS[activeArea].name}</div>
                <span style={{marginLeft:"auto",fontSize:20,fontWeight:700,color:WHEEL_AREAS[activeArea].color}}>{wheelScores[WHEEL_AREAS[activeArea].name]||5}/10</span>
              </div>
              <input type="range" min="1" max="10" value={wheelScores[WHEEL_AREAS[activeArea].name]||5}
                onChange={e=>updateScore(WHEEL_AREAS[activeArea].name,parseInt(e.target.value))}
                style={{width:"100%",marginBottom:8}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.text3}}>
                <span>1 — критично</span><span>10 — отлично</span>
              </div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:8}}>
            {WHEEL_AREAS.map((area,i)=>(
              <div key={area.name} onClick={()=>setActiveArea(activeArea===i?null:i)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:10,cursor:"pointer",
                  background:activeArea===i?"rgba(45,106,79,0.1)":"rgba(45,32,16,0.03)",border:"1px solid "+T.bdrS}}>
                <span style={{fontSize:16}}>{area.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:T.text1}}>{area.name}</div>
                  <div style={{height:4,borderRadius:2,background:T.bdrS,marginTop:3}}>
                    <div style={{height:4,borderRadius:2,background:area.color,width:((wheelScores[area.name]||5)/10*100)+"%",transition:"width .3s"}}/>
                  </div>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:area.color}}>{wheelScores[area.name]||5}</span>
              </div>
            ))}
          </div>
        </div>
        <AiBox kb={kb} prompt={
          "Проанализируй колесо жизни. Оценки: "+WHEEL_AREAS.map(a=>a.name+":"+(wheelScores[a.name]||5)).join(", ")+
          ". Приоритеты: "+(goalAreas.join(",")||"—")+
          ". Главная цель: "+(mainGoal||"—")+
          ". Дай с заголовками ##: Общий баланс; Слабые сферы — что делать; Сильные — как использовать; Действие на неделю по каждой слабой сфере."
        } label="Анализ колеса жизни" btnText="Проанализировать" placeholder="Проанализирую твой баланс жизни..."/>
      </>}

      {/* ══ ВКЛАДКА: ПЛАН ══ */}
      {tab==="plan"&&<>
        {mainGoal?(
          <>
            <div style={{padding:"12px 14px",background:"rgba(45,106,79,0.07)",borderRadius:12,marginBottom:12,borderLeft:"3px solid "+T.gold}}>
              <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:4}}>ЦЕЛЬ</div>
              <div style={{fontSize:16,color:T.gold,fontFamily:"'Cormorant Infant',serif"}}>{mainGoal}</div>
              {profile.goalDeadline&&<div style={{fontSize:12,color:T.text3,marginTop:4}}>
                До: {new Date(profile.goalDeadline).toLocaleDateString("ru-RU",{day:"numeric",month:"long"})} · 
                Осталось: {Math.max(0,Math.ceil((new Date(profile.goalDeadline)-new Date())/86400000))} дней
              </div>}
            </div>
            <AiBox kb={kb} prompt={
              "Составь детальный еженедельный план достижения цели: "+mainGoal+
              ". Срок: "+(profile.goalDeadline||"3 месяца")+
              ". Метрика: "+(profile.goalMetric||"—")+
              ". Сферы: "+(goalAreas.join(",")||"—")+
              ". Барьеры: "+(goalBlocks.join(",")||"—")+
              ". Свободное время: "+(profile.selfTime||"30")+" мин/день после "+(profile.workEnd||"18:00")+
              ". Хронотип: "+(profile.chronotype||"—")+
              ". Дай: 1) план на ближайшие 4 недели (неделя → конкретные задачи), 2) ежедневные микродействия по 15-20 мин, 3) как отслеживать прогресс, 4) что делать если сорвался."
            } label="Подробный план на месяц" btnText="Составить план" placeholder="Составлю пошаговый план к твоей цели..."/>
          </>
        ):(
          <div style={{textAlign:"center",padding:"32px 16px",color:T.text3}}>
            <div style={{fontSize:40,marginBottom:12}}>🎯</div>
            <div style={{fontSize:16,marginBottom:8}}>Цель не установлена</div>
            <button className="btn btn-primary" onClick={()=>{setTab("goal");setEditGoal(true);}}>Установить цель</button>
          </div>
        )}
      </>}
    </div>
  );
}

function MentalSection({profile,kb,notify}) {
  const [mood,setMood]=useState(3);
  const [stress,setStress]=useState(5);
  const [note,setNote]=useState("");
  const [saved,setSaved]=useState(false);
  const [tab,setTab]=useState("check");
  const moods=["😔","😟","😐","🙂","😊","🤩"];
  const moon=getMoon();
  const freeFrom=profile.workEnd||"18:00";
  const wakeTime=profile.wake||"07:00";
  const isHighStress=(profile.stressors||[]).length>=2||(profile.workDrain||[]).length>=2;
  const currentHour=new Date().getHours();
  const isSedentary=(profile.workType||"").includes("офис")||(profile.workType||"").includes("удалённо");
  const hasBadSleep=(profile.sleepQuality||"").includes("Плох")||(profile.sleepQuality||"").includes("Сред");
  const recovery=(profile.recovery||[]).join(",");
  const stressors=(profile.stressors||[]).join(",");

  const saveMoodLog=()=>{
    try{
      const logs=JSON.parse(localStorage.getItem("mental_log")||"[]");
      logs.unshift({date:new Date().toISOString(),mood,stress,note});
      localStorage.setItem("mental_log",JSON.stringify(logs.slice(0,60)));
    }catch{}
    setSaved(true);notify("Записано");setTimeout(()=>setSaved(false),2000);
  };

  return(
    <div>
      <div className="tabs">{[["check","Состояние"],["breath","Дыхание"],["practice","Практики"],["sound","Звук"],["history","История"]].map(([v,l])=><div key={v} className={"tab"+(tab===v?" on":"")} onClick={()=>setTab(v)}>{l}</div>)}</div>

      {tab==="check"&&<>
        <div className="card card-accent" style={{marginBottom:12}}>
          <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20,color:T.gold,marginBottom:12}}>Как ты сейчас{profile.name?", "+profile.name:""}?</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.text2,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:10}}>НАСТРОЕНИЕ</div>
            <div style={{display:"flex",gap:10}}>{moods.map((m,i)=><div key={i} onClick={()=>setMood(i)} style={{fontSize:30,cursor:"pointer",opacity:mood===i?1:0.35,transform:mood===i?"scale(1.25)":"scale(1)",transition:"all .2s"}}>{m}</div>)}</div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:T.text2,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:10}}>СТРЕСС: <span style={{color:stress<=3?T.success:stress<=6?T.warn:T.danger,fontWeight:600}}>{stress}/10</span></div>
            <div style={{display:"flex",gap:3}}>{[1,2,3,4,5,6,7,8,9,10].map(i=><div key={i} onClick={()=>setStress(i)} style={{flex:1,minWidth:0,height:36,borderRadius:6,border:"1px solid "+(stress>=i?(stress<=3?T.success:stress<=6?T.warn:T.danger):T.bdr),background:stress>=i?(stress<=3?"rgba(45,106,79,0.15)":stress<=6?"rgba(122,80,16,0.15)":"rgba(139,32,32,0.15)"):"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,color:stress>=i?(stress<=3?T.success:stress<=6?T.warn:T.danger):T.text3,fontFamily:"'JetBrains Mono'",transition:"all .15s"}}>{i}</div>)}</div>
          </div>
          <textarea style={{width:"100%",padding:"10px 14px",background:"rgba(255,255,255,0.6)",border:"1px solid "+T.bdr,borderRadius:10,color:T.text0,fontFamily:"'Crimson Pro',serif",fontSize:16,outline:"none",resize:"none",minHeight:80,lineHeight:1.6}} placeholder="Что на душе сегодня? Любые мысли..." value={note} onChange={e=>setNote(e.target.value)}/>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button className="btn btn-primary btn-sm" onClick={saveMoodLog}>{saved?"✓ Сохранено":"Сохранить запись"}</button>
          </div>
        </div>
        <AiBox kb={kb} prompt={"Дай персональный план восстановления для "+( profile.name||"меня")+" на сегодня. Стрессоры: "+stressors+". Что забирает энергию на работе: "+((profile.workDrain||[]).join(","))+". Восстанавливаюсь через: "+recovery+". Хронотип: "+(profile.chronotype||"—")+". Свободен(а) после: "+freeFrom+". Качество сна: "+(profile.sleepQuality||"—")+". Луна: "+moon.n+"("+moon.t+"). Сейчас высокий стресс: "+(isHighStress?"да":"нет")+". Дай: 1) экстренную технику при стрессе прямо сейчас (2-3 мин), 2) вечерний ритуал восстановления после "+freeFrom+" под мой тип восстановления ["+recovery+"], 3) что поможет со сном сегодня ночью, 4) одну аффирмацию под мою ценность "+(profile.coreValue||"—")+". Оформи нумерованным списком."} label="Состояние и восстановление" btnText="Получить план восстановления" placeholder="Составлю персональный план восстановления..."/>
      </>}

      {tab==="breath"&&<>
        <div className="card card-accent" style={{marginBottom:12}}>
          <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:18,color:T.gold,marginBottom:8}}>Дыхательные практики</div>
          <div style={{fontSize:15,color:T.text2,lineHeight:1.6}}>Дыхание — самый быстрый способ изменить состояние. Выбери нужное прямо сейчас.</div>
        </div>
        {[
          {name:"4-7-8 — снятие тревоги",desc:"Вдох 4с → задержка 7с → выдох 8с. Повтори 4 раза. Активирует парасимпатику.",time:"3 мин",icon:"🌬️",color:"rgba(78,201,190,0.15)"},
          {name:"Бокс-дыхание — при панике",desc:"Вдох 4с → задержка 4с → выдох 4с → задержка 4с. Квадрат. Используют военные.",time:"4 мин",icon:"⬜",color:"rgba(90,142,200,0.15)"},
          {name:"Когерентное — баланс НС",desc:"Вдох 5с → выдох 5с без пауз. 6 циклов в минуту. Синхронизирует сердце и мозг.",time:"5 мин",icon:"💫",color:"rgba(200,164,90,0.12)"},
          {name:"4-6 — перед сном",desc:"Вдох 4с → выдох 6с. Удлинённый выдох замедляет ЧСС и готовит к сну.",time:"5 мин",icon:"🌙",color:"rgba(140,90,200,0.12)"},
          {name:"Вим Хоф — заряд энергии",desc:"30 глубоких вдохов → выдох → задержка → вдох → задержка 15с. Только утром!",time:"10 мин",icon:"⚡",color:"rgba(200,140,58,0.12)"},
          {name:"Нади Шодхана — балансировка",desc:"Поочерёдное дыхание через ноздри. Балансирует полушария мозга.",time:"5 мин",icon:"☯️",color:"rgba(91,173,122,0.12)"},
        ].map((b,i)=><div key={i} style={{background:b.color,border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:22}}>{b.icon}</span>
              <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,color:T.text0,fontWeight:500}}>{b.name}</div>
            </div>
            <span style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",whiteSpace:"nowrap"}}>{b.time}</span>
          </div>
          <div style={{fontSize:14,color:"#A8A49C",lineHeight:1.6,marginLeft:32}}>{b.desc}</div>
          <div style={{marginTop:10,marginLeft:32}}>
            <button className="btn btn-ghost btn-xs" onClick={()=>openGCal("Дыхательная практика: "+b.name,new Date().toISOString(),"Техника: "+b.desc)}>📅 В календарь</button>
          </div>
        </div>)}
        <AiBox kb={kb} prompt={"Подбери дыхательную технику для "+( profile.name||"меня")+" прямо сейчас. Мои стрессоры: "+stressors+". Качество сна: "+(profile.sleepQuality||"—")+". Время суток: сейчас "+currentHour+":00. Хронотип: "+(profile.chronotype||"—")+". Объясни пошагово как выполнять выбранную технику и почему она подходит именно мне."} label="Подобрать технику" btnText="Подобрать мою технику" placeholder="Подберу дыхательную технику под твоё состояние..."/>
      </>}

      {tab==="practice"&&<>
        <AiBox kb={kb} prompt={"Составь персональный комплекс практик для "+( profile.name||"меня")+" на сегодня вечером после "+freeFrom+". Луна: "+moon.n+"("+moon.t+"). Зоны здоровья: "+((profile.healthFocus||[]).join(","))+". Стрессоры: "+stressors+". Восстановление: "+recovery+". Работа: "+((profile.workDrain||[]).join(","))+". Сидячая работа: "+(isSedentary?"да":"нет")+". Дай ПОШАГОВЫЙ комплекс: 1) цигун 10-15 мин — конкретные упражнения с описанием движений, 2) йога 10-15 мин — последовательность асан с временем удержания, 3) медитация 10 мин — текст для погружения. Каждую практику оформи как нумерованный список шагов с временем."} label="Комплекс практик на вечер" btnText="Составить мой комплекс" placeholder="Составлю персональный комплекс цигун, йоги и медитации..."/>
        <AiBox kb={kb} prompt={"Проведи утреннюю практику для "+( profile.name||"меня")+". Подъём в "+wakeTime+". Хронотип: "+(profile.chronotype||"—")+". Луна: "+moon.n+". Зоны здоровья: "+((profile.healthFocus||[]).join(","))+". У меня "+( profile.selfTime||"30")+" минут до начала рабочего дня. Дай: 1) утренний цигун 5-7 мин сразу после подъёма, 2) Сурья Намаскар или альтернативу 5-7 мин, 3) дыхательную практику 3 мин, 4) аффирмацию на день. Всё конкретно с описанием движений."} label="Утренняя практика" btnText="Утренний комплекс" placeholder="Составлю утренний комплекс под твой ритм..."/>
        <AiBox kb={kb} prompt={"Проведи вечерний ритуал для "+( profile.name||"меня")+" перед сном (отбой в "+(profile.sleep||"23:00")+"). Качество сна: "+(profile.sleepQuality||"—")+". Луна: "+moon.n+"("+moon.t+"). Восстановление: "+recovery+". Дай: 1) инь-йога или цигун 10 мин, 2) боди-скан медитация 10 мин — текст для расслабления каждой части тела, 3) дыхание 4-6 для засыпания, 4) ароматерапия под моё состояние. Говори мягко от второго лица."} label="Вечерний ритуал" btnText="Вечерний ритуал" placeholder="Проведу тебя через вечерний ритуал для глубокого сна..."/>
      </>}

      {tab==="sound"&&<>
        <div className="card card-accent" style={{marginBottom:12}}>
          <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:18,color:T.gold,marginBottom:8}}>Звукотерапия</div>
          <div style={{fontSize:15,color:T.text2,lineHeight:1.6}}>Звук влияет на мозговые волны и состояние. Выбери нужную частоту или звук.</div>
        </div>
        {[
          {hz:"432 Гц",name:"Расслабление",desc:"Снижает тревогу, гармонизирует нервную систему. Слушать вечером.",icon:"🎵",when:"Вечер, стресс"},
          {hz:"528 Гц",name:"Исцеление",desc:"Частота восстановления ДНК по некоторым исследованиям. При болезни или усталости.",icon:"💚",when:"Болезнь, усталость"},
          {hz:"396 Гц",name:"Освобождение от страха",desc:"Помогает отпустить тревогу и страх. При навязчивых мыслях.",icon:"🔓",when:"Тревога, страхи"},
          {hz:"Дельта (0.5-4 Гц)",name:"Глубокий сон",desc:"Бинауральные ритмы для глубокого сна. Слушать в наушниках перед сном.",icon:"🌑",when:"Перед сном"},
          {hz:"Тета (4-8 Гц)",name:"Медитация",desc:"Состояние глубокой медитации и творчества. Во время практик.",icon:"🌀",when:"Медитация"},
          {hz:"Альфа (8-14 Гц)",name:"Фокус и спокойствие",desc:"Расслабленное внимание. Лучше всего для работы и обучения.",icon:"✨",when:"Работа, учёба"},
          {hz:"Белый шум",name:"Сон и фокус",desc:"Маскирует посторонние звуки. Для сна и глубокой концентрации.",icon:"🌊",when:"Сон, работа"},
          {hz:"Мантра Ом",name:"Центрирование",desc:"Вибрация Ом синхронизирует внутренние ритмы. 10-15 мин пения.",icon:"🕉️",when:"Медитация, утро"},
        ].map((s,i)=><div key={i} style={{background:"rgba(140,90,200,0.08)",border:"1px solid rgba(140,90,200,0.2)",borderRadius:14,padding:"14px 16px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:22}}>{s.icon}</span>
              <div>
                <div style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:T.purple,letterSpacing:1}}>{s.hz}</div>
                <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,color:T.text0}}>{s.name}</div>
              </div>
            </div>
            <span style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",whiteSpace:"nowrap"}}>{s.when}</span>
          </div>
          <div style={{fontSize:14,color:"#A8A49C",lineHeight:1.6,marginLeft:32}}>{s.desc}</div>
          <div style={{marginTop:10,marginLeft:32}}>
            <button className="btn btn-ghost btn-xs" onClick={()=>openGCal("Звукотерапия: "+s.name,new Date().toISOString(),s.hz+": "+s.desc)}>📅 В календарь</button>
          </div>
        </div>)}
        <AiBox kb={kb} prompt={"Подбери звукотерапию для "+( profile.name||"меня")+" на сегодня. Стрессоры: "+stressors+". Качество сна: "+(profile.sleepQuality||"—")+". Восстановление: "+recovery+". Луна: "+moon.n+". Время суток: "+currentHour+":00. Дай: 1) какую частоту слушать сегодня и почему именно мне, 2) как правильно проводить сеанс (поза, время, условия), 3) с чем сочетать (дыхание, медитация, ароматерапия)."} label="Подобрать звукотерапию" btnText="Подобрать мою практику" placeholder="Подберу звуковую практику под твоё состояние и луну..."/>
      </>}

      {tab==="history"&&<div className="card">
        <div className="card-hd"><div className="card-title">История настроения</div></div>
        {(()=>{
          try{
            const logs=JSON.parse(localStorage.getItem("mental_log")||"[]");
            if(!logs.length)return(<div className="empty"><span className="empty-ico">🧘</span><p>Записей пока нет — отмечай своё состояние каждый день</p></div>);
            const avgMood=(logs.reduce((s,l)=>s+l.mood,0)/logs.length).toFixed(1);
            const avgStress=(logs.reduce((s,l)=>s+l.stress,0)/logs.length).toFixed(1);
            return(<>
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                <div style={{flex:1,background:T.goldGlow,borderRadius:12,padding:"12px",textAlign:"center"}}>
                  <div style={{fontSize:24}}>{moods[Math.round(avgMood)]}</div>
                  <div style={{fontSize:11,color:T.text2,fontFamily:"'JetBrains Mono'",marginTop:4}}>СР. НАСТР.</div>
                </div>
                <div style={{flex:1,background:"rgba(139,32,32,0.08)",borderRadius:12,padding:"12px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:28,color:T.danger}}>{avgStress}</div>
                  <div style={{fontSize:11,color:T.text2,fontFamily:"'JetBrains Mono'",marginTop:4}}>СР. СТРЕСС</div>
                </div>
                <div style={{flex:1,background:T.tealGlow,borderRadius:12,padding:"12px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:28,color:T.teal}}>{logs.length}</div>
                  <div style={{fontSize:11,color:T.text2,fontFamily:"'JetBrains Mono'",marginTop:4}}>ЗАПИСЕЙ</div>
                </div>
              </div>
              {logs.slice(0,14).map((l,i)=>(
                <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  <span style={{fontSize:24,flexShrink:0}}>{moods[l.mood]}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <div style={{fontSize:13,color:T.text2}}>{new Date(l.date).toLocaleDateString("ru-RU",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                      <span style={{fontSize:12,color:l.stress>=7?T.danger:l.stress>=5?T.warn:T.success,fontFamily:"'JetBrains Mono'"}}>стресс {l.stress}/10</span>
                    </div>
                    {l.note&&<div style={{fontSize:15,color:T.text1,lineHeight:1.5,fontStyle:"italic"}}>{l.note}</div>}
                  </div>
                </div>
              ))}
            </>);
          }catch{return null;}
        })()}
      </div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TRAVEL
// ══════════════════════════════════════════════════════════════
function TravelSection({profile,trips,setTrips,kb,notify}) {
  const [modal,setModal]=useState(false);
  const [nt,setNt]=useState({destination:"",targetDate:"",budget:"",saved:"",stage:"💭 Мечта",notes:""});
  const [checkin,setCheckin]=useState({});
  const [checking,setChecking]=useState({});
  const upd=(id,k,v)=>setTrips(p=>p.map(t=>t.id===id?{...t,[k]:v}:t));
  const stages=["💭 Мечта","🗺️ Планирую","💰 Коплю","🎫 Билеты куплены","🏨 Забронировано","🧳 Собираю вещи","✅ Всё готово"];
  const pct=s=>Math.round((stages.indexOf(s)+1)/stages.length*100);
  const getCheckin=async(trip)=>{setChecking(p=>({...p,[trip.id]:true}));const r=await askClaude(buildKB(profile),`Мягко спроси о прогрессе в подготовке к ${trip.destination}. Стадия: ${trip.stage}. Бюджет: ${trip.budget||"?"}₽. Отложено: ${trip.saved||"0"}₽. Дата: ${trip.targetDate||"—"}. Дай 2-3 следующих шага. Говори тепло без давления.`,500);setCheckin(p=>({...p,[trip.id]:r}));setChecking(p=>({...p,[trip.id]:false}));};
  return(
    <div>
      <AiBox kb={kb} prompt={`Поездки: ${trips.map(t=>`${t.destination}(${t.stage})`).join(";")||"нет"}. Как реализовать мечту о путешествии без стресса? Как правильно копить и планировать?`} label="Путешествия" btnText="Советы по путешествиям" placeholder="Помогу превратить мечту о поездке в реальность..."/>
      {trips.length===0&&<div className="empty"><span className="empty-ico">✈️</span><p>Поездок нет. Добавь мечту!</p><button className="btn btn-primary btn-sm" style={{marginTop:12}} onClick={()=>setModal(true)}>+ Добавить поездку</button></div>}
      {trips.map(trip=>{
        const progress=pct(trip.stage||"💭 Мечта");
        const savedPct=trip.budget&&trip.saved?Math.min(100,Math.round(parseInt(trip.saved)/parseInt(trip.budget)*100)):0;
        return(
          <div key={trip.id} className="trip-card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.text0}}>✈ {trip.destination}</div>
              <div className="ico-btn danger" onClick={()=>setTrips(p=>p.filter(t=>t.id!==trip.id))}>✕</div>
            </div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:12}}>
              <span className="badge bi">{trip.stage}</span>
              {trip.targetDate&&<span className="badge bm">📅 {trip.targetDate}</span>}
              {trip.budget&&<span className="badge bg">💰 {trip.budget}₽</span>}
            </div>
            <div style={{marginBottom:8}}>
              <div style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:T.text3,letterSpacing:2,marginBottom:6,textTransform:"uppercase"}}>Подготовка {progress}%</div>
              <div className="prog"><div className="prog-fill" style={{width:progress+"%",background:"linear-gradient(90deg,${T.info},"+(T.teal)+")"}}/></div>
              <div style={{display:"flex",gap:2,marginTop:6}}>
                {stages.map((s,i)=><div key={s} title={s} style={{flex:1,height:3,borderRadius:2,background:stages.indexOf(trip.stage)>=i?T.teal:T.bdr,cursor:"pointer",transition:"background .2s"}} onClick={()=>upd(trip.id,"stage",s)}/>)}
              </div>
            </div>
            {trip.budget&&<div style={{marginBottom:10}}>
              <div style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:T.text3,letterSpacing:2,marginBottom:6,textTransform:"uppercase"}}>Накоплено {trip.saved||0}₽ из {trip.budget}₽ ({savedPct}%)</div>
              <div className="prog"><div className="prog-fill" style={{width:savedPct+"%",background:"linear-gradient(90deg,${T.gold},"+(T.goldL)+")"}}/></div>
              <div style={{marginTop:8,display:"flex",gap:8,alignItems:"center"}}>
                <input style={{width:130,padding:"6px 11px",background:"rgba(255,255,255,.03)",border:"1px solid "+T.bdr,borderRadius:8,color:T.text0,fontFamily:"'Crimson Pro',serif",fontSize:14,outline:"none"}} placeholder="Отложено ₽" value={trip.saved||""} onChange={e=>upd(trip.id,"saved",e.target.value)}/>
                {trip.budget&&trip.saved&&<span style={{fontSize:12,color:T.text3}}>осталось: {Math.max(0,parseInt(trip.budget)-parseInt(trip.saved))}₽</span>}
              </div>
            </div>}
            {checkin[trip.id]&&<div style={{background:T.bdrS,borderRadius:10,padding:"12px 14px",marginBottom:10,fontSize:15,lineHeight:1.7,color:T.text1,fontStyle:"italic"}}>{checkin[trip.id]}</div>}
            <div style={{display:"flex",gap:7}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>getCheckin(trip)} disabled={checking[trip.id]}>{checking[trip.id]?"Думаю...":"🤖 Как дела с поездкой?"}</button>
              {trip.targetDate&&<button className="btn btn-ghost btn-sm" onClick={()=>openGCal(`✈ ${trip.destination}`,new Date(trip.targetDate).toISOString())}>📅 Cal</button>}
            </div>
          </div>
        );
      })}
      {trips.length>0&&<button className="btn btn-ghost btn-sm" style={{marginTop:4}} onClick={()=>setModal(true)}>+ Добавить поездку</button>}
      {modal&&(
        <div className="overlay" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <span className="modal-x" onClick={()=>setModal(false)}>✕</span>
            <div className="modal-title">Новая поездка</div>
            <div className="fld"><label>Куда?</label><input placeholder="Стамбул, Бали, Байкал..." value={nt.destination} onChange={e=>setNt(p=>({...p,destination:e.target.value}))}/></div>
            <div className="fld-row">
              <div className="fld"><label>Дата (мес/год)</label><input type="month" value={nt.targetDate} onChange={e=>setNt(p=>({...p,targetDate:e.target.value}))}/></div>
              <div className="fld"><label>Бюджет ₽</label><input type="number" value={nt.budget} onChange={e=>setNt(p=>({...p,budget:e.target.value}))}/></div>
            </div>
            <div className="fld"><label>Стадия</label><div className="chips">{stages.map(s=><div key={s} className={`chip${nt.stage===s?" on":""}`} onClick={()=>setNt(p=>({...p,stage:s}))}>{s}</div>)}</div></div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={()=>{if(!nt.destination.trim())return;setTrips(p=>[...p,{...nt,id:Date.now()}]);setModal(false);notify("Поездка добавлена ✈");}}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  JOURNAL
// ══════════════════════════════════════════════════════════════
function JournalSection({journal,setJournal,today,notify}) {
  const [view,setView]=useState("today");
  const [search,setSearch]=useState("");
  const e=journal[today]||{};
  const save=u=>setJournal(p=>({...p,[today]:{...e,...u}}));
  const moods=["😔","😕","😐","🙂","😊","🤩"];
  const entries=Object.entries(journal).sort((a,b)=>b[0].localeCompare(a[0]));
  return(
    <div>
      <div className="tabs">{[["today","Сегодня"],["all","Все записи"],["stats","Статистика"]].map(([v,l])=><div key={v} className={`tab${view===v?" on":""}`} onClick={()=>setView(v)}>{l}</div>)}</div>
      {view==="today"&&(
        <div className="card">
          <div style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:T.goldD,letterSpacing:3,marginBottom:16,textTransform:"uppercase"}}>{new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          <div className="sec-lbl">Настроение</div>
          <div className="mood-pick" style={{marginBottom:18}}>{moods.map(m=><span key={m} className={`mood-btn${e.mood===m?" on":""}`} onClick={()=>save({mood:m})}>{m}</span>)}</div>
          <div className="sec-lbl">Энергия</div>
          <div style={{display:"flex",gap:8,marginBottom:18}}>{[1,2,3,4,5].map(n=><div key={n} className={`en-dot${(e.energy||0)>=n?" on":""}`} onClick={()=>save({energy:n})}>{n}</div>)}</div>
          {[["win","Победа дня","Что получилось сегодня?"],["learn","Открытие","Что понял(а) сегодня?"],["gratitude","Благодарность","За что я благодарен(а)?"],["tomorrow","Завтра","Что важно сделать завтра?"]].map(([k,lbl,ph])=>(
            <div className="fld" key={k}><label>{lbl}</label><textarea style={{minHeight:56}} placeholder={ph} value={e[k]||""} onChange={ev=>save({[k]:ev.target.value})}/></div>
          ))}
          <button className="btn btn-primary btn-sm" onClick={()=>notify("Запись сохранена ✓")}>Сохранить</button>
        </div>
      )}
      {view==="all"&&<>
        <div style={{marginBottom:12}}><input style={{width:"100%",padding:"10px 14px",background:"rgba(255,255,255,.03)",border:"1px solid "+T.bdr,borderRadius:10,color:T.text0,fontFamily:"'Crimson Pro',serif",fontSize:16,outline:"none"}} placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        {entries.filter(([d,en])=>!search||(en.win||"").includes(search)||(en.gratitude||"").includes(search)).map(([d,en])=>(
          <div key={d} className="card">
            <div style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:T.goldD,letterSpacing:2,marginBottom:10,textTransform:"uppercase"}}>{new Date(d).toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}</div>
            <div style={{display:"flex",gap:10,marginBottom:8,alignItems:"center"}}>
              {en.mood&&<span style={{fontSize:22}}>{en.mood}</span>}
              {en.energy&&<div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(n=><div key={n} style={{width:6,height:6,borderRadius:"50%",background:n<=en.energy?T.gold:T.bdr}}/>)}</div>}
            </div>
            {en.win&&<p style={{fontFamily:"'Cormorant Infant',serif",fontSize:16,lineHeight:1.65,marginBottom:6}}><span style={{color:T.gold}}>✦</span> {en.win}</p>}
            {en.gratitude&&<p style={{fontSize:14,color:T.text3,fontStyle:"italic"}}>🙏 {en.gratitude}</p>}
          </div>
        ))}
      </>}
      {view==="stats"&&(
        <div>
          <div className="g3" style={{marginBottom:16}}>
            <div className="stat"><div className="stat-n">{entries.length}</div><div className="stat-l">Записей</div></div>
            <div className="stat"><div className="stat-n">{entries.length>0?(entries.reduce((s,[,e])=>s+(e.energy||0),0)/entries.length).toFixed(1):"—"}</div><div className="stat-l">Средняя энергия</div></div>
            <div className="stat"><div className="stat-n">{entries.filter(([,e])=>e.gratitude).length}</div><div className="stat-l">Благодарности</div></div>
          </div>
          <div className="card">
            <div className="card-hd"><div className="card-title">Настроение по дням</div></div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              {moods.map(m=>{const c=entries.filter(([,e])=>e.mood===m).length;return c>0?<div key={m} style={{textAlign:"center"}}><div style={{fontSize:28}}>{m}</div><div style={{fontSize:13,color:T.text3,marginTop:2}}>{c}</div></div>:null;})}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
//  CAR SECTION
// ══════════════════════════════════════════════════════════════
function CarSection({profile,setProfile,tasks,setTasks,today,kb,notify}) {
  const [editCar, setEditCar] = useState(false);
  const [car, setCar] = useState({
    model:    profile.carModel||"",
    year:     profile.carYear||"",
    mileage:  profile.carMileage||"",
    lastTO:   profile.carLastTO||"",
    tireType: profile.carTireType||"",
    tireDate: profile.carTireDate||"",
    insurance:profile.carInsurance||"",
    techCheck:profile.carTechCheck||"",
  });

  if(profile.hasCar!=="Да") return(
    <div style={{textAlign:"center",padding:"40px 16px"}}>
      <div style={{fontSize:48,marginBottom:12}}>🚗</div>
      <div style={{fontSize:16,color:T.text2,marginBottom:8}}>Автомобиль не указан в профиле</div>
      <div style={{fontSize:13,color:T.text3}}>Зайди в настройки профиля → Дом и укажи данные автомобиля</div>
    </div>
  );

  const saveCar = () => {
    setProfile(p=>({...p,
      carModel:car.model, carYear:car.year, carMileage:car.mileage,
      carLastTO:car.lastTO, carTireType:car.tireType, carTireDate:car.tireDate,
      carInsurance:car.insurance, carTechCheck:car.techCheck,
    }));
    setEditCar(false);
    notify("Данные автомобиля сохранены ✦");
  };

  // Умные предупреждения
  const now = new Date();
  const month = now.getMonth()+1;
  const warnings = [];

  // ТО — каждые 10 000 км или раз в год
  if(profile.carLastTO) {
    const lastTO = new Date(profile.carLastTO);
    const daysSince = Math.floor((now-lastTO)/86400000);
    if(daysSince>300) warnings.push({emoji:"🔧",title:"Пора на ТО",desc:"Прошло "+Math.floor(daysSince/30)+" мес. с последнего ТО. Рекомендуется раз в год или каждые 10 000 км.",color:T.danger,urgent:true});
    else if(daysSince>240) warnings.push({emoji:"🔧",title:"Скоро ТО",desc:"До следующего ТО примерно "+Math.floor((365-daysSince)/30)+" мес.",color:T.warn,urgent:false});
  }

  // Резина — переобуться весной (апрель) и осенью (октябрь-ноябрь)
  const isSpring = month>=3&&month<=5;
  const isAutumn = month>=9&&month<=11;
  if(profile.carTireType==="Зимняя"&&isSpring)
    warnings.push({emoji:"🔄",title:"Пора менять на летнюю резину",desc:"Оптимальная температура для смены — стабильно выше +7°C. Апрель — самое время.",color:T.warn,urgent:true});
  if(profile.carTireType==="Летняя"&&isAutumn)
    warnings.push({emoji:"🔄",title:"Пора менять на зимнюю резину",desc:"Меняй когда температура стабильно ниже +7°C. Не жди первого снега.",color:T.warn,urgent:true});

  // Страховка
  if(profile.carInsurance) {
    const insDate = new Date(profile.carInsurance);
    const daysLeft = Math.ceil((insDate-now)/86400000);
    if(daysLeft<30&&daysLeft>=0) warnings.push({emoji:"📋",title:"Страховка истекает через "+daysLeft+" дн.",desc:"Обнови полис заблаговременно, минимум за 3-5 дней до истечения.",color:T.danger,urgent:true});
    else if(daysLeft<60&&daysLeft>=0) warnings.push({emoji:"📋",title:"Страховка истекает через "+Math.floor(daysLeft/7)+" нед.",desc:"Стоит заранее подобрать предложения и обновить полис.",color:T.warn,urgent:false});
  }

  // Техосмотр
  if(profile.carTechCheck) {
    const techDate = new Date(profile.carTechCheck);
    const daysLeft = Math.ceil((techDate-now)/86400000);
    if(daysLeft<30&&daysLeft>=0) warnings.push({emoji:"🔍",title:"Техосмотр через "+daysLeft+" дн.",desc:"Запишись заранее — очереди бывают.",color:T.danger,urgent:true});
    else if(daysLeft<60&&daysLeft>=0) warnings.push({emoji:"🔍",title:"Техосмотр через "+Math.floor(daysLeft/7)+" нед.",desc:"Подготовь документы и проверь авто заранее.",color:T.warn,urgent:false});
  }

  // Задачи авто
  const addCarTask = (title,deadline="",notes="") => {
    setTasks(p=>[...p,{
      id:Date.now()+Math.random(), title, section:"work",
      freq:"once", priority:"h", deadline, notes,
      preferredTime:"09:00", lastDone:"", doneDate:""
    }]);
    notify("Добавлено в задачи ✦");
  };

  // Плановые задачи для авто
  const carTasks = [
    {emoji:"🔧",title:"Замена масла и фильтров",         freq:"every:180", notes:"Каждые 10 000 км или раз в год"},
    {emoji:"🔄",title:"Проверка тормозных колодок",       freq:"every:180", notes:"Каждые 20 000 км"},
    {emoji:"💧",title:"Проверка уровня жидкостей",        freq:"every:30",  notes:"Масло, охлаждающая, тормозная, омыватель"},
    {emoji:"🔋",title:"Проверка аккумулятора",            freq:"every:90",  notes:"Особенно важно перед зимой"},
    {emoji:"💨",title:"Давление в шинах",                 freq:"every:14",  notes:"Норма обычно 2.2-2.5 бар"},
    {emoji:"🚿",title:"Мойка автомобиля",                 freq:"every:14",  notes:""},
    {emoji:"🧹",title:"Уборка салона",                    freq:"every:30",  notes:"Пылесос, протереть поверхности"},
    {emoji:"🌙",title:"Антикоррозийная обработка",        freq:"every:365", notes:"Желательно перед зимой"},
  ];

  return(
    <div>
      {/* Карточка авто */}
      <div className="card card-accent" style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:6}}>МОЙ АВТОМОБИЛЬ</div>
            <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.text0,marginBottom:4}}>
              {profile.carModel||"—"} {profile.carYear&&"("+profile.carYear+")"}
            </div>
            <div style={{fontSize:13,color:T.text3}}>Пробег: {profile.carMileage?profile.carMileage+" км":"не указан"}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setEditCar(e=>!e)}>✏️ Изменить</button>
        </div>
        {!editCar&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
          <div style={{padding:"8px 10px",background:"rgba(45,32,16,0.05)",borderRadius:9}}>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>РЕЗИНА</div>
            <div style={{fontSize:14,color:T.text0,marginTop:2}}>{profile.carTireType||"—"}</div>
            {profile.carTireDate&&<div style={{fontSize:11,color:T.text3}}>с {profile.carTireDate}</div>}
          </div>
          <div style={{padding:"8px 10px",background:"rgba(45,32,16,0.05)",borderRadius:9}}>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ПОСЛЕДНЕЕ ТО</div>
            <div style={{fontSize:14,color:T.text0,marginTop:2}}>{profile.carLastTO?new Date(profile.carLastTO).toLocaleDateString("ru-RU",{month:"long",year:"numeric"}):"—"}</div>
          </div>
          <div style={{padding:"8px 10px",background:"rgba(45,32,16,0.05)",borderRadius:9}}>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>СТРАХОВКА</div>
            <div style={{fontSize:13,color:T.text0,marginTop:2}}>{profile.carInsurance?new Date(profile.carInsurance).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}):"—"}</div>
          </div>
          <div style={{padding:"8px 10px",background:"rgba(45,32,16,0.05)",borderRadius:9}}>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ТЕХОСМОТР</div>
            <div style={{fontSize:13,color:T.text0,marginTop:2}}>{profile.carTechCheck?new Date(profile.carTechCheck).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}):"—"}</div>
          </div>
        </div>}

        {editCar&&<div style={{marginTop:12}}>
          <div className="fld-row">
            <div className="fld"><label>Марка и модель</label><input value={car.model} onChange={e=>setCar(p=>({...p,model:e.target.value}))}/></div>
            <div className="fld"><label>Год</label><input type="number" value={car.year} onChange={e=>setCar(p=>({...p,year:e.target.value}))}/></div>
          </div>
          <div className="fld-row">
            <div className="fld"><label>Пробег (км)</label><input type="number" value={car.mileage} onChange={e=>setCar(p=>({...p,mileage:e.target.value}))}/></div>
            <div className="fld"><label>Последнее ТО</label><input type="date" value={car.lastTO} onChange={e=>setCar(p=>({...p,lastTO:e.target.value}))}/></div>
          </div>
          <div className="fld"><label>Тип резины</label>
            <div className="chips">{["Летняя","Зимняя","Всесезонная"].map(v=><div key={v} className={"chip "+(car.tireType===v?"on":"")} onClick={()=>setCar(p=>({...p,tireType:v}))}>{v}</div>)}</div>
          </div>
          <div className="fld-row">
            <div className="fld"><label>Дата смены резины</label><input type="month" value={car.tireDate} onChange={e=>setCar(p=>({...p,tireDate:e.target.value}))}/></div>
            <div className="fld"><label>Страховка до</label><input type="date" value={car.insurance} onChange={e=>setCar(p=>({...p,insurance:e.target.value}))}/></div>
          </div>
          <div className="fld"><label>Техосмотр до</label><input type="date" value={car.techCheck} onChange={e=>setCar(p=>({...p,techCheck:e.target.value}))}/></div>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button className="btn btn-ghost" onClick={()=>setEditCar(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={saveCar}>Сохранить</button>
          </div>
        </div>}
      </div>

      {/* Предупреждения */}
      {warnings.length>0&&(
        <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.danger}}>
          <div style={{fontSize:11,color:T.danger,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:10}}>⚠️ ТРЕБУЕТ ВНИМАНИЯ</div>
          {warnings.map((w,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid "+T.bdrS}}>
              <span style={{fontSize:22,flexShrink:0}}>{w.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:15,color:w.color,fontWeight:600,marginBottom:3}}>{w.title}</div>
                <div style={{fontSize:13,color:T.text2,lineHeight:1.5}}>{w.desc}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{flexShrink:0,fontSize:11}}
                onClick={()=>addCarTask(w.title,"",w.desc)}>+ В задачи</button>
            </div>
          ))}
        </div>
      )}

      {/* Плановое обслуживание */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:12}}>ПЛАНОВОЕ ОБСЛУЖИВАНИЕ</div>
        {carTasks.map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid "+T.bdrS}}>
            <span style={{fontSize:18}}>{t.emoji}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,color:T.text0}}>{t.title}</div>
              {t.notes&&<div style={{fontSize:11,color:T.text3}}>{t.notes}</div>}
            </div>
            <button className="btn btn-ghost btn-sm" style={{fontSize:11,flexShrink:0}}
              onClick={()=>addCarTask(t.title,"",t.notes)}>+ В задачи</button>
          </div>
        ))}
      </div>

      {/* Сезонные задачи авто */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:12}}>СЕЗОННЫЕ ЗАДАЧИ</div>
        {[
          {emoji:"🌸",season:"Весна",tasks:["Смена на летнюю резину","Мойка после зимы + антикор снизу","Проверка тормозов после зимы","Замена щёток стеклоочистителя","Сезонная чистка салона"]},
          {emoji:"☀️",season:"Лето",tasks:["Проверка кондиционера","Давление в шинах (жара увеличивает)","Защитная полироль кузова","Проверка охлаждающей жидкости"]},
          {emoji:"🍂",season:"Осень",tasks:["Смена на зимнюю резину","Проверка аккумулятора перед холодами","Антикоррозийная обработка","Проверка антифриза","Запас незамерзайки"]},
          {emoji:"❄️",season:"Зима",tasks:["Проверка давления шин (холод снижает)","Подогрев сидений и зеркал","Скребок и лопата в багажник","Цепи противоскольжения"]},
        ].map(s=>(
          <div key={s.season} style={{marginBottom:12}}>
            <div style={{fontSize:13,color:T.gold,fontWeight:500,marginBottom:6}}>{s.emoji} {s.season}</div>
            {s.tasks.map((t,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:13,color:T.text1,borderBottom:"1px solid "+T.bdrS}}>
                <span>✦ {t}</span>
                <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:"2px 7px"}}
                  onClick={()=>addCarTask(s.season+": "+t)}>+</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* AI советы по авто */}
      <AiBox kb={kb}
        prompt={"Дай советы по обслуживанию автомобиля "+profile.carModel+" "+profile.carYear+" г., пробег "+profile.carMileage+" км. Тип резины: "+profile.carTireType+". Последнее ТО: "+profile.carLastTO+". Регион: Казахстан. Текущий месяц: "+new Date().toLocaleString("ru-RU",{month:"long"})+". Дай: 1) что нужно сделать прямо сейчас (неотложно), 2) что запланировать на ближайший месяц, 3) сезонные советы для Казахстана, 4) на что обратить внимание при данном пробеге."}
        label="AI советы по авто" btnText="Получить советы" placeholder="Дам персональные советы по обслуживанию твоего авто..."/>
    </div>
  );
}

function ProfileSection({profile,setProfile,sections,setSections,notify,kb}) {
  const [view,setView]=useState("me");
  const z=getZodiac(profile.dob);
  const east=getEastern(profile.dob);
  const deg=calcDegree(profile.fullName||profile.name);
  return(
    <div>
      <div className="tabs">{[["me","Мой профиль"],["astro","Астрология"],["sections","Разделы"]].map(([v,l])=><div key={v} className={`tab${view===v?" on":""}`} onClick={()=>setView(v)}>{l}</div>)}</div>
      {view==="me"&&(
        <div>
          <div className="card card-accent">
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,${T.gold}66,"+(T.goldD)+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,border:"1px solid "+(T.gold)+"44"}}>{profile.gender==="Женский"?"👩":"👤"}</div>
              <div>
                <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:26,color:T.gold,marginBottom:3,fontWeight:400}}>{profile.name||"—"}</div>
                {profile.fullName&&profile.fullName!==profile.name&&<div style={{fontSize:14,color:T.text3,marginBottom:6}}>{profile.fullName}</div>}
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  {profile.dob&&<span className="badge bg">🎂 {new Date(profile.dob).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</span>}
                  {profile.dob&&<span className="badge bm">{new Date().getFullYear()-new Date(profile.dob).getFullYear()} лет</span>}
                  {profile.gender&&<span className="badge bm">{profile.gender}</span>}
                  {profile.city&&<span className="badge bm">📍 {profile.city}</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="sec-lbl">Рассчитано автоматически</div>
          <div className="g3" style={{marginBottom:14}}>
            <div className="card" style={{textAlign:"center"}}><div style={{fontSize:32,marginBottom:4}}>{z.emoji}</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:16}}>{z.name}</div><div style={{fontSize:10,color:T.text3,marginTop:2,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ЗОДИАК</div></div>
            <div className="card" style={{textAlign:"center"}}><div style={{fontSize:32,marginBottom:4}}>🐾</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:16}}>{east}</div><div style={{fontSize:10,color:T.text3,marginTop:2,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ВОСТОК</div></div>
            <div className="card card-accent" style={{textAlign:"center"}}><div className="degree-big">{deg||"—"}</div><div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginTop:2}}>ГРАДУС СУДЬБЫ</div></div>
          </div>
          {/* ── ТКМ блок ── */}
          {profile.dob&&(()=>{
            const tcm = getTCMFullProfile(profile);
            if(!tcm) return null;
            const {el, cn, syndromes, uniqueOrgans, digestionNote, foodRecs, birthOrgan, emotionOrgan, sleepOrgan, tasteOrgan} = tcm;
            const hasDiag = profile.tcmTemp||profile.tcmEmotion||profile.tcmTaste||profile.tcmSleep;
            return(<>
              <div className="sec-lbl">Традиционная китайская медицина (ТКМ)</div>
              <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.gold}}>
                {/* Стихия */}
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                  <div style={{fontSize:40}}>{el.emoji}</div>
                  <div>
                    <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:24,color:T.gold}}>{el.name} {el.yin?"(Инь)":"(Ян)"}</div>
                    <div style={{fontSize:13,color:T.text2,marginTop:2}}>{cn?.type}</div>
                  </div>
                </div>

                {/* Базовые параметры */}
                <div className="g2" style={{gap:8,marginBottom:12}}>
                  <div style={{padding:"8px 12px",background:"rgba(45,106,79,0.08)",borderRadius:10}}>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:3}}>ОРГАНЫ СТИХИИ</div>
                    <div style={{fontSize:14,color:T.text1}}>{el.organ}</div>
                  </div>
                  <div style={{padding:"8px 12px",background:"rgba(45,106,79,0.08)",borderRadius:10}}>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:3}}>СЕЗОН СИЛЫ</div>
                    <div style={{fontSize:14,color:T.text1}}>{el.season}</div>
                  </div>
                  <div style={{padding:"8px 12px",background:"rgba(45,106,79,0.08)",borderRadius:10}}>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:3}}>ВКУС-СОЮЗНИК</div>
                    <div style={{fontSize:14,color:T.text1}}>{el.taste}</div>
                  </div>
                  <div style={{padding:"8px 12px",background:"rgba(45,106,79,0.08)",borderRadius:10}}>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:3}}>ДОБРОДЕТЕЛЬ</div>
                    <div style={{fontSize:14,color:T.text1}}>{el.virtue}</div>
                  </div>
                </div>

                {/* Диагностика — если пройдена */}
                {hasDiag && <>
                  {syndromes.length>0&&<>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>ВЫЯВЛЕННЫЕ СИНДРОМЫ</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                      {syndromes.map(s=><span key={s} className="badge bw">{s}</span>)}
                    </div>
                  </>}
                  {uniqueOrgans.length>0&&<>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>ОРГАНЫ ТРЕБУЮЩИЕ ВНИМАНИЯ</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                      {uniqueOrgans.map(o=><span key={o} className="badge br">{o}</span>)}
                    </div>
                  </>}
                  {digestionNote&&<>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>ПИЩЕВАРЕНИЕ</div>
                    <div style={{fontSize:14,color:T.warn,marginBottom:12,fontStyle:"italic"}}>{digestionNote}</div>
                  </>}
                  {birthOrgan&&<>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>МЕРИДИАН РОЖДЕНИЯ</div>
                    <div style={{fontSize:14,color:T.text1,marginBottom:8}}>{birthOrgan}</div>
                  </>}
                </>}

                {/* Питание */}
                <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>ПИТАНИЕ ПО ТКМ</div>
                <div style={{fontSize:14,color:T.success,fontStyle:"italic",lineHeight:1.6}}>{foodRecs||cn?.foods}</div>

                {!hasDiag&&<div style={{marginTop:12,fontSize:13,color:T.text3,fontStyle:"italic"}}>Пройди ТКМ-диагностику в настройках профиля для расширенного анализа</div>}
              </div>
            </>);
          })()}
          <div className="sec-lbl">Характер и личность</div>
          <div className="g2" style={{marginBottom:14}}>
            {[["Решения",profile.decisionStyle],["Энергия",profile.energySource],["Планы",profile.planningStyle],["Ценность",profile.coreValue]].map(([l,v])=>v?<div key={l} className="card"><div className="pf-l">{l}</div><div className="pf-v" style={{fontSize:15}}>{v}</div></div>:null)}
          </div>
          {(profile.stressors||[]).length>0&&<div className="card" style={{marginBottom:8}}><div className="pf-l" style={{marginBottom:8}}>Стрессоры</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{profile.stressors.map(s=><span key={s} className="badge bw">{s}</span>)}</div></div>}
          {(profile.recovery||[]).length>0&&<div className="card" style={{marginBottom:8}}><div className="pf-l" style={{marginBottom:8}}>Восстановление</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{profile.recovery.map(s=><span key={s} className="badge bgr">{s}</span>)}</div></div>}
          <div className="sec-lbl">Работа и жизнь</div>
          <div className="g2" style={{marginBottom:14}}>
            <div className="card"><div className="pf-l">Работа</div><div className="pf-v">{profile.profession||"—"}</div><div className="pf-s">{profile.workType||""} · {profile.workStart||"?"}–{profile.workEnd||"?"}</div></div>
            <div className="card"><div className="pf-l">Хронотип</div><div className="pf-v">{profile.chronotype?.split("—")[0]?.trim()||"—"}</div><div className="pf-s">Качество сна: {profile.sleepQuality||"—"}</div></div>
          </div>
          <div className="card" style={{marginBottom:14}}>
            <div className="pf-l" style={{marginBottom:10}}>Режим дня</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <div><div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ПОДЪЁМ</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.gold}}>{profile.wake||"—"}</div></div>
              <div><div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ОТБОЙ</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.teal}}>{profile.sleep||"—"}</div></div>
              <div><div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>РАБОТА</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.text1}}>{profile.workStart||"?"}–{profile.workEnd||"?"}</div></div>
              <div><div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>СВОБОДНО</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.text1}}>{profile.workEnd||"?"}–{profile.sleep||"?"}</div></div>
            </div>
          </div>
          {(profile.hobbies||[]).length>0&&<div className="card" style={{marginBottom:8}}><div className="pf-l" style={{marginBottom:8}}>Хобби</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{profile.hobbies.map(h=><span key={h} className="badge bp">{h}</span>)}</div></div>}
          {(profile.pets||[]).length>0&&<div className="card" style={{marginBottom:8}}><div className="pf-l" style={{marginBottom:8}}>Питомцы</div><div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{profile.pets.map(p=><span key={p.id} style={{fontSize:16}}>{{Кошка:"🐱",Собака:"🐶",Попугай:"🦜",Кролик:"🐰",Хомяк:"🐹"}[p.type]||"🐾"} {p.name}</span>)}</div></div>}
          <div style={{marginTop:16,display:"flex",gap:8}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>{if(window.confirm("Пройти опрос заново?"))setProfile(null);}}>🔄 Обновить</button>
            <button className="btn btn-danger btn-sm" onClick={()=>{if(window.confirm("Удалить ВСЕ данные?﻿")){localStorage.clear();window.location.reload();}}}>⚠ Сбросить</button>
          </div>
        </div>
      )}
      {view==="astro"&&(
        <div>
          {deg&&<div className="card card-accent" style={{marginBottom:14,textAlign:"center",padding:"32px 24px"}}>
            <div className="degree-big">{deg}°</div>
            <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:16,color:T.text2,marginTop:6}}>Градус судьбы по ФИО</div>
          </div>}
          <div className="g2" style={{marginBottom:14}}>
            <div className="card" style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:6}}>{z.emoji}</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20}}>{z.name}</div><div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",marginTop:4,letterSpacing:1}}>ЗНАК ЗОДИАКА</div></div>
            <div className="card" style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:6}}>🐾</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20}}>{east}</div><div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",marginTop:4,letterSpacing:1}}>ВОСТОЧНЫЙ ЗНАК</div></div>
            {profile.dob&&(()=>{const el=getChineseElement(profile.dob);return(<div className="card" style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:6}}>{el.emoji}</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20}}>{el.name}</div><div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",marginTop:4,letterSpacing:1}}>СТИХИЯ ТКМ</div></div>);})()}
            <div className="card gfull"><div className="pf-l">Луна сегодня</div><div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.text0,marginTop:4}}>{getMoon().e} {getMoon().n}</div><div style={{fontSize:14,color:T.text3,marginTop:3,fontStyle:"italic"}}>{getMoon().t}</div></div>
          </div>
          <AiBox kb={kb} prompt={"Составь подробный астрологический и нумерологический портрет. ВАЖНО: говори ТОЛЬКО от второго лица (ты, твой, тебе) — никогда в третьем лице (она, Ирина). Дата рождения: "+(profile.dob||"—")+". Знак зодиака: "+z.name+", восточный: "+east+", градус судьбы: "+(deg||"—")+"°, дата рождения: "+(profile.dob||"—")+". Раздели ответ на чёткие блоки с заголовками: 1) **Характер и личность** — основные черты, 2) **Сильные стороны** — что использовать, 3) **Слабые места** — над чем работать, 4) **Здоровье** — на что обращать внимание, 5) **Любовь и отношения** — какой ты партнёр, 6) **Карьера и финансы** — где реализуешься. Каждый блок 3-5 пунктов нумерованным списком."} label="Персональный астропортрет" btnText="Составить мой портрет" placeholder="Получи свой полный астрологический портрет..." noActions={true} maxTokens={1800}/>
          <AiBox kb={kb} prompt={"Расшифруй мой жизненный путь по годам. ВАЖНО: говори ТОЛЬКО от второго лица (ты, твой). Дата рождения: "+(profile.dob||"—")+". Знак: "+z.name+", восточный: "+east+", градус: "+(deg||"—")+"°, дата рождения: "+(profile.dob||"—")+", сейчас "+(profile.dob?(new Date().getFullYear()-new Date(profile.dob).getFullYear())+" лет":"—")+". Дай: 1) **Детство (0-12)** — какой я была, 2) **Юность (13-21)** — что формировало личность, 3) **Молодость (22-35)** — главные уроки, 4) **Зрелость (36-50)** — пик реализации, 5) **Мудрость (50+)** — что важно. По каждому периоду 3-4 ключевых пункта."} label="Жизненный путь по годам" btnText="Расшифровать" placeholder="Покажу твой жизненный путь по этапам..." noActions={true} maxTokens={1800}/>
          <AiBox kb={kb} prompt={"Составь календарь ключевых дат прошлого и будущего для "+(profile.name||"меня")+". Знак: "+z.name+", восточный: "+east+", градус: "+(deg||"—")+"°, дата рождения: "+(profile.dob||"—")+". Используй нумерологию (личный год по дате рождения), астрологические циклы (Сатурн ~28-30 лет, Юпитер ~12 лет). Дай: 1) **Прошлые ключевые годы** — какие важные точки уже были (3-5 лет с пояснением), 2) **Этот год** — главная тема и события, 3) **Ближайшие 3 года** — что ждёт, к чему готовиться, 4) **Дальняя перспектива (5-10 лет)** — крупные циклы. Конкретные годы с месяцами где можно."} label="Ключевые даты жизни" btnText="Показать мои даты" placeholder="Покажу важные годы и события прошлого и будущего..." noActions={true}/>
        </div>
      )}
      {view==="sections"&&(
        <div className="card">
          <div className="card-hd"><div className="card-title">Управление разделами</div></div>
          {sections.map(s=>(
            <div key={s.id} className="vis-row">
              <div className="vis-name">{s.emoji} {s.name}</div>
              <div className={`tog${s.vis?" on":""}`} onClick={()=>setSections(p=>p.map(x=>x.id===s.id?{...x,vis:!x.vis}:x))}><div className="tog-th"/></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
