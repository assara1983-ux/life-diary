import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ── PWA: регистрация Service Worker + Push уведомления ──────────
const VAPID_PUBLIC_KEY = "BK2eeceu6qsPh_9sJMmGxI_5FO1s-ZzHC2nL0cW3qzjZNk-3bTPU5rq2r4wdfxJZ2vWM-Si3day25Kjx9-3RdK8";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw = window.atob(base64);
  return new Uint8Array([...raw].map(c=>c.charCodeAt(0)));
}

async function subscribeToPush(reg) {
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    // Сохраняем подписку на сервере
    await fetch('/api/save-subscription', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({subscription: sub.toJSON(), userId: 'user'})
    }).catch(()=>{});
    localStorage.setItem('push_subscribed', '1');
    return sub;
  } catch(e) {
    console.log('Push subscribe error:', e);
    return null;
  }
}

async function requestPushPermission() {
  if(!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if(Notification.permission === 'granted') return;
  if(Notification.permission === 'denied') return;
  // Небольшая задержка — не спрашиваем сразу при загрузке
  setTimeout(async () => {
    const permission = await Notification.requestPermission();
    if(permission === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      await subscribeToPush(reg);
    }
  }, 3000);
}

// Проверяем дедлайны и показываем локальные уведомления
async function checkDeadlinesAndNotify() {
  if(Notification.permission !== 'granted') return;
  try {
    const reports = JSON.parse(localStorage.getItem('ld_reports_v2')||'[]');
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    const notified = JSON.parse(localStorage.getItem('push_notified_'+todayStr)||'{}');

    for(const r of reports) {
      if(r.status==='done' || !r.deadline) continue;
      const dl = new Date(r.deadline); dl.setHours(0,0,0,0);
      const days = Math.ceil((dl - today)/86400000);

      if([0,1,3].includes(days)) {
        const key = r.id + '_' + days;
        if(notified[key]) continue; // уже уведомляли сегодня

        const label = days===0?'СЕГОДНЯ!':days===1?'завтра':'через 3 дня';
        const emoji = days===0?'🚨':days===1?'⚠️':'📅';

        if('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification(emoji+' Life Diary — Дедлайн '+label, {
            body: r.name + ' — срок '+new Date(r.deadline).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}),
            icon: '/icon-192.png',
            tag: 'dl-'+r.id+'-'+days,
            data: {url:'/?section=work'}
          });
        } else {
          new Notification(emoji+' Life Diary — '+r.name, {
            body: 'Срок: '+label
          });
        }
        notified[key] = 1;
      }
    }
    localStorage.setItem('push_notified_'+todayStr, JSON.stringify(notified));
  } catch(e) { console.log('notify check error:', e); }
}

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

// ── Число личного года (нумерология) ────────────────────────
function getPersonalYear(dob) {
  if(!dob) return null;
  const now = new Date();
  const cy = now.getFullYear();
  const bd = new Date(dob);
  // Складываем: день рождения + месяц рождения + текущий год
  const sum = d => { let s=d; while(s>9&&s!==11&&s!==22&&s!==33){s=String(s).split("").reduce((a,b)=>a+parseInt(b),0);} return s; };
  const daySum = sum(bd.getDate());
  const monSum = sum(bd.getMonth()+1);
  const yearSum = sum(String(cy).split("").reduce((a,b)=>a+parseInt(b),0));
  const py = sum(daySum+monSum+yearSum);
  const themes = {
    1:"Год новых начал. Время запускать проекты, делать первые шаги. Заложи фундамент на 9-летний цикл.",
    2:"Год партнёрства. Время сотрудничества, терпения, дипломатии. Важны отношения и детали.",
    3:"Год творчества. Время самовыражения, общения, радости. Твои идеи найдут отклик.",
    4:"Год труда. Время строить фундамент, работать системно. Усилия окупятся позже.",
    5:"Год перемен. Время свободы, движения, новых возможностей. Будь гибким.",
    6:"Год ответственности. Время семьи, заботы, гармонии дома. Баланс работы и близких.",
    7:"Год рефлексии. Время углублённого анализа, духовного поиска, уединения.",
    8:"Год достижений. Время карьеры, финансового роста, реализации амбиций.",
    9:"Год завершения. Время подводить итоги, отпускать старое, готовиться к новому циклу.",
    11:"Год интуиции. Мастер-число — высокая чувствительность, духовные откровения, творческий подъём.",
    22:"Год мастера. Масштабные достижения, строительство чего-то значимого для многих.",
    33:"Год учителя. Служение, вдохновение других, духовная мудрость.",
  };
  const avoids = {
    1:"Пассивность, ожидание. Не позволяй другим принимать решения за тебя.",
    2:"Конфликты, торопливость. Не форсируй события.",
    3:"Разбросанность. Сосредоточься на главном.",
    4:"Лень, уклонение от обязательств. Без труда нет результата.",
    5:"Хаос, безответственность. Не разбрасывайся.",
    6:"Гиперконтроль. Не жертвуй собой ради всех.",
    7:"Изоляция, паранойя. Доверяй близким.",
    8:"Жадность, трудоголизм без смысла. Деньги — инструмент, не цель.",
    9:"Цепляние за прошлое. Учись отпускать.",
    11:"Тревожность, перфекционизм. Заземляйся.",
    22:"Самонадеянность. Слушай команду.",
    33:"Самопожертвование в ущерб себе.",
  };
  return {py, theme:themes[py]||"", avoid:avoids[py]||""};
}

// ── Биоритмы ─────────────────────────────────────────────────
function getBiorhythms(dob) {
  if(!dob) return null;
  const now = new Date();
  const birth = new Date(dob);
  const days = Math.floor((now-birth)/86400000);
  const physical  = Math.round(Math.sin(2*Math.PI*days/23)*100);
  const emotional = Math.round(Math.sin(2*Math.PI*days/28)*100);
  const mental    = Math.round(Math.sin(2*Math.PI*days/33)*100);
  const level = v => v>50?"Высокий":v>0?"Нормальный":v>-50?"Низкий":"Критический";
  const color = v => v>50?"#7BCCA0":v>0?"#E5C87A":v>-50?"#E8A85A":"#E8556D";
  return {
    physical:{v:physical,  label:"Физический",  emoji:"💪", level:level(physical),  color:color(physical),  tip:physical>50?"Отличный день для спорта и активности":physical<0?"Береги силы, не перегружайся":"Умеренная активность"},
    emotional:{v:emotional, label:"Эмоциональный",emoji:"💚", level:level(emotional), color:color(emotional), tip:emotional>50?"Хороший день для общения и творчества":emotional<0?"Возможна раздражительность, будь мягче к себе":"Стабильный эмоциональный фон"},
    mental:{v:mental,    label:"Интеллектуальный",emoji:"🧠", level:level(mental),   color:color(mental),   tip:mental>50?"Лучший день для сложных задач и решений":mental<0?"Избегай важных решений, делай рутину":"Хороший день для обучения"},
  };
}

// ── Сезонные ТКМ-рекомендации ────────────────────────────────
function getSeasonalTCM(profile) {
  const month = new Date().getMonth()+1;
  const age   = profile.dob ? new Date().getFullYear()-new Date(profile.dob).getFullYear() : 35;
  const el    = getChineseElement(profile.dob);
  // Сезон по месяцу
  const season = month>=3&&month<=5?"Весна":month>=6&&month<=8?"Лето":month>=9&&month<=11?"Осень":"Зима";
  const seasons = {
    "Весна":{
      element:"Дерево",organ:"Печень / Желчный пузырь",emotion:"Гнев → Решимость",
      doList:["Зелёные овощи, проростки","Ранние прогулки на природе","Растяжка и йога","Завершай незаконченные дела","Очищение печени (вода с лимоном)"],
      avoidList:["Алкоголь и жирная пища","Подавление эмоций","Длительное сидение","Поздние ужины"],
      color:"#228B22",emoji:"🌿"
    },
    "Лето":{
      element:"Огонь",organ:"Сердце / Тонкий кишечник",emotion:"Тревога → Радость",
      doList:["Лёгкая пища, горькие травы","Активность в первой половине дня","Медитация и пение","Общение и праздники","Охлаждающие напитки"],
      avoidList:["Перегрев и прямое солнце","Холодные напитки натощак","Переутомление","Сильные стрессы"],
      color:"#DC143C",emoji:"☀️"
    },
    "Осень":{
      element:"Металл",organ:"Лёгкие / Толстый кишечник",emotion:"Грусть → Принятие",
      doList:["Белые продукты (груша, дайкон, лук)","Дыхательные практики","Уборка и порядок","Подводи итоги","Тёплая одежда"],
      avoidList:["Сырая и холодная пища","Подавление грусти","Переохлаждение","Резкие перемены"],
      color:"#A9A9A9",emoji:"🍂"
    },
    "Зима":{
      element:"Вода",organ:"Почки / Мочевой пузырь",emotion:"Страх → Мудрость",
      doList:["Тёплые супы, мясные бульоны","Ранний отбой","Глубокое дыхание","Планирование на год","Тепло на поясницу"],
      avoidList:["Переохлаждение","Поздние ночи","Избыток солёного","Интенсивный спорт на холоде"],
      color:"#1E3A5F",emoji:"❄️"
    },
  };
  const s = seasons[season];
  // Учитываем стихию пользователя
  const interaction = el ? (
    el.name===s.element ? "🔥 Твоя стихия совпадает с сезоном — двойная энергия. Будь внимателен к переизбытку."
    : el.yin ? "⚡ Твоя стихия Инь — в этом сезоне важно поддерживать тепло и восстановление."
    : "⚡ Твоя стихия Ян — в этом сезоне направь энергию в созидание."
  ) : "";
  // Возрастная коррекция
  const ageNote = age<30?"В твоём возрасте энергия Ци сильна — используй сезон для активного роста.":
    age<50?"В этом возрасте важно поддерживать баланс между активностью и восстановлением.":
    "В зрелом возрасте особенно важно следовать сезонным ритмам и беречь почечную Ци.";
  return {...s, season, interaction, ageNote, age};
}

// ── Сильные/слабые стороны ────────────────────────────────────
function getStrengthsWeaknesses(profile) {
  const zodiac = getZodiac(profile.dob).name;
  const eastern = getEastern(profile.dob);
  const py = getPersonalYear(profile.dob);

  const zodiacSW = {
    "Овен":{s:["Инициативность","Смелость","Энергия","Лидерство"],w:["Нетерпеливость","Импульсивность","Не доводит до конца"]},
    "Телец":{s:["Надёжность","Упорство","Практичность","Верность"],w:["Упрямство","Медленная адаптация","Материализм"]},
    "Близнецы":{s:["Гибкость ума","Коммуникабельность","Адаптивность"],w:["Непостоянство","Поверхностность","Тревожность"]},
    "Рак":{s:["Интуиция","Забота","Эмпатия","Память"],w:["Обидчивость","Зависимость от настроения","Закрытость"]},
    "Лев":{s:["Харизма","Щедрость","Творчество","Лидерство"],w:["Гордость","Зависимость от признания","Расточительность"]},
    "Дева":{s:["Аналитика","Трудолюбие","Точность","Надёжность"],w:["Перфекционизм","Самокритика","Тревожность"]},
    "Весы":{s:["Дипломатия","Справедливость","Чувство красоты"],w:["Нерешительность","Зависимость от мнения","Избегание конфликтов"]},
    "Скорпион":{s:["Глубина","Интуиция","Трансформация","Страсть"],w:["Ревность","Подозрительность","Мстительность"]},
    "Стрелец":{s:["Оптимизм","Широкий кругозор","Философский ум"],w:["Безответственность","Прямолинейность до грубости","Непоследовательность"]},
    "Козерог":{s:["Дисциплина","Амбиции","Ответственность","Терпение"],w:["Холодность","Пессимизм","Трудоголизм"]},
    "Водолей":{s:["Оригинальность","Гуманизм","Независимость"],w:["Отстранённость","Упрямство в идеях","Непрактичность"]},
    "Рыбы":{s:["Интуиция","Сострадание","Творчество","Духовность"],w:["Избегание реальности","Жертвенность","Неопределённость"]},
  };
  const easternSW = {
    "Крыса":{s:["Находчивость","Адаптивность","Острый ум"],w:["Тревожность","Жадность","Критичность"]},
    "Бык":{s:["Терпение","Честность","Выносливость"],w:["Упрямство","Медлительность","Консерватизм"]},
    "Тигр":{s:["Смелость","Харизма","Щедрость"],w:["Импульсивность","Самонадеянность","Конфликтность"]},
    "Кролик":{s:["Дипломатия","Творчество","Интуиция"],w:["Нерешительность","Избегание конфликтов","Пессимизм"]},
    "Дракон":{s:["Энергия","Удача","Магнетизм"],w:["Гордость","Нетерпимость","Перфекционизм"]},
    "Змея":{s:["Мудрость","Интуиция","Дальновидность"],w:["Подозрительность","Замкнутость","Ревность"]},
    "Лошадь":{s:["Энергия","Независимость","Харизма"],w:["Непостоянство","Эгоцентризм","Нетерпеливость"]},
    "Коза":{s:["Творчество","Мягкость","Сострадание"],w:["Нерешительность","Зависимость","Пессимизм"]},
    "Обезьяна":{s:["Интеллект","Гибкость","Находчивость"],w:["Непостоянство","Манипулятивность","Тщеславие"]},
    "Петух":{s:["Точность","Честность","Работоспособность"],w:["Педантизм","Критичность к другим","Хвастовство"]},
    "Собака":{s:["Верность","Честность","Справедливость"],w:["Тревожность","Упрямство","Цинизм"]},
    "Свинья":{s:["Щедрость","Искренность","Оптимизм"],w:["Доверчивость","Чрезмерная мягкость","Самопотакание"]},
  };

  const zSW = zodiacSW[zodiac]||{s:[],w:[]};
  const eSW = easternSW[eastern]||{s:[],w:[]};

  // Объединяем уникальные
  const strengths = [...new Set([...zSW.s, ...eSW.s])].slice(0,6);
  const weaknesses = [...new Set([...zSW.w, ...eSW.w])].slice(0,6);

  return {strengths, weaknesses, zodiac, eastern, personalYear:py};
}

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
@keyframes spin { to { transform:rotate(360deg); } }

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
  {id:"beauty",   emoji:"✨",  name:"Уход",       vis:true},
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
  // Миграция: переименовать "Красота" → "Уход" в сохранённых данных
  useEffect(()=>{
    setSections(p=>{
      if(!p) return p;
      const updated = p.map(s=>s.id==="beauty"&&s.name==="Красота"?{...s,name:"Уход"}:s);
      const changed = updated.some((s,i)=>s.name!==p[i]?.name);
      return changed?updated:p;
    });
  },[]);
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
            {active==="today"    && <TodaySection profile={profile} setProfile={setProfile} tasks={tasks} setTasks={setTasks} journal={journal} setJournal={setJournal} today={today} moon={moon} kb={kb} notify={notify} petLog={petLog} setPetLog={setPetLog}/>}
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

function AiBox({ kb, prompt, label="ИИ-СОВЕТНИК", btnText="Получить совет", placeholder="Нажми — получи персональный совет...", actionType=null, onShopAdd=null, onTaskAdd=null, noActions=false, maxTokens=1200, onCreateTool=null }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [boxOpen, setBoxOpen] = useState(true);     // весь блок свёрнут/развёрнут
  const [openItems, setOpenItems] = useState({});   // {listIndex_itemIndex: bool}
  const toggleItem = (key) => setOpenItems(p=>({...p,[key]:!p[key]}));
  // Кэш — сохраняем результат в localStorage по ключу из label
  const cacheKey = "ld_aibox_cache_"+label.replace(/\s+/g,"_");
  useEffect(()=>{
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey)||"null");
      if(cached && cached.text) setText(cached.text);
    } catch{}
  },[cacheKey]);
  const ask = async()=>{
    setLoading(true);
    const r = await askClaude(kb, prompt, maxTokens);
    setText(r);
    // Сохраняем в кэш
    try { localStorage.setItem(cacheKey, JSON.stringify({text:r, ts:Date.now()})); } catch{}
    setLoading(false);
  };
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
        {cat:"Уход", words:["крем","маска для","сыворотк","тоник","скраб","пилинг","масло для","бальзам","помад","тушь","пудр","ватн","косметик","дезодорант","зубн паст","зубн нить","шампунь","кондиционер для волос"]},
        {cat:"Для питомцев", words:["корм для","лоток","наполнитель","когтет","ошейник","поводок","для котов","для собак","для кошек","для попуг","для хомяк"]},
        {cat:"Аптека", words:["витамин","омега","магний","мелатонин","пробиотик","антиб","сироп","таблетк","капл","мазь","бинт","пластыр","термометр","леденц","спрей от"]},
        {cat:"Одежда", words:["футболк","рубашк","брюк","юбк","платье","носки","нижне бель","пижам","халат","куртк","пальто","туфл","ботинк","кроссовк"]},
      ];
      const detect = (n)=>{ const l=n.toLowerCase(); for(const r of catRules) for(const w of r.words) if(l.includes(w)) return r.cat; return "Продукты"; };
      // Дедупликация уже добавленных товаров
      const existingNames = new Set(list.map(i=>i.name.toLowerCase().trim()));
      const newItems = [];
      const validCats = ["Продукты","Бытовая химия","Уход","Для питомцев","Одежда","Аптека","Другое"];
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
    // Парсим время в пути из профиля
    const commuteStr = kb ? (kb.match(/Дорога:.*?(\d+)\s*мин/)||[])[1] : null;
    const commuteMin = commuteStr ? parseInt(commuteStr) : 0;
    setScheduling({item:txt, hour:now.getHours()+1, minute:0, duration:30, reminder:true, commuteMin, addCommute:false});
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
    const prompt_detail =
      "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке.\n\n"+
      "Раскрой подробно следующую рекомендацию:\n\""+txt+"\"\n\n"+
      "Структура ответа:\n"+
      "1. Что именно это такое — точное определение метода/подхода/инструмента\n"+
      "2. Почему это подходит под этот профиль — конкретная причина\n"+
      "3. Как применить пошагово — нумерованный список конкретных действий\n"+
      "4. Что понадобится — инструменты, ресурсы, время\n"+
      "5. Источник или автор метода (если применимо)\n\n"+
      "Никаких общих фраз. Только конкретика.";
    const r = await askClaude(kb, prompt_detail, 1000);
    setDetailText(r);
    setDetailLoading(false);
  };

  // Извлекаем заголовок пункта — первое предложение или заголовок
  const getItemTitle = (item) => {
    const isObj = typeof item === "object";
    const full = isObj ? ((item.title||"")+" "+(item.body||"")).trim() : (item||"");
    // Убираем маркеры типа [Подкаст], 1. и т.д.
    const clean = full.replace(/^\d+[\.\)]\s*/,"").replace(/^\[([^\]]+)\]\s*/,"$1: ").trim();
    // Берём первые ~60 символов до точки/тире
    const match = clean.match(/^(.{10,60}?)(?:[.!?]|(?:\s—\s)|\s[-–]\s|$)/);
    return match ? match[1].trim() : clean.slice(0,60)+(clean.length>60?"…":"");
  };

  return (
    <div className="ai-box">
      {/* Заголовок блока — кликабельный */}
      <div className="ai-hd" style={{cursor:"pointer"}} onClick={()=>setBoxOpen(o=>!o)}>
        <div className="ai-pulse"/>
        <div className="ai-lbl" style={{flex:1}}>{label}</div>
        {text&&<span style={{fontSize:11,color:"rgba(200,164,90,0.6)",marginRight:4}}>{boxOpen?"▲":"▼"}</span>}
      </div>
      {/* Пустое состояние — показываем всегда */}
      {!text&&!loading&&<div className="ai-dim">{placeholder}</div>}
      {/* Контент — только если boxOpen */}
      {text&&boxOpen&&<div className="ai-content">
        {blocks.map((b, i) => {
          if(b.type === "header") return (
            <div key={i} className="ai-header">
              <span className="ai-header-mark">◆</span>{b.content}
            </div>
          );
          if(b.type === "list") return (
            <div key={i} className="ai-list">
              {b.items.map((item, j) => {
                const isObj = typeof item === "object";
                const title = isObj ? item.title : "";
                const body = isObj ? item.body : item;
                const showActionBtns = actionType !== "shopping";
                const itemKey = i+"_"+j;
                const isItemOpen = openItems[itemKey] !== false; // по умолчанию открыт
                const shortTitle = getItemTitle(item);
                return (
                  <div key={j} className="ai-list-item" style={{flexDirection:"column",alignItems:"stretch",padding:0,marginBottom:4}}>
                    {/* Заголовок пункта — кликабельный */}
                    <div onClick={()=>toggleItem(itemKey)}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer",borderRadius:isItemOpen?"8px 8px 0 0":"8px",background:isItemOpen?"rgba(200,164,90,0.08)":"rgba(255,255,255,0.03)",border:"1px solid "+(isItemOpen?"rgba(200,164,90,0.2)":"rgba(255,255,255,0.06)"),transition:"all .15s"}}>
                      <span className="ai-list-num" style={{flexShrink:0,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}>{j+1}</span>
                      <span style={{flex:1,fontSize:13,color:T.text0,lineHeight:1.4}}>{shortTitle}</span>
                      <span style={{fontSize:10,color:T.text3,flexShrink:0}}>{isItemOpen?"▲":"▼"}</span>
                    </div>
                    {/* Детали пункта */}
                    {isItemOpen&&(
                      <div style={{padding:"10px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(200,164,90,0.15)",borderTop:"none",borderRadius:"0 0 8px 8px"}}>
                        <div className="ai-list-body" style={{margin:0}}>
                          {title&&<div className="ai-list-title" style={{marginBottom:4}}>{title}</div>}
                          {body&&<div className="ai-list-text">{body}</div>}
                          {showActionBtns&&!noActions&&(
                            <div className="ai-item-actions" style={{marginTop:8}}>
                              <button className="btn-mini" onClick={(e)=>{e.stopPropagation();startScheduling(item);}}>⏰ Запланировать</button>
                              <button className="btn-mini" onClick={(e)=>{e.stopPropagation();askForDetails(item);}}>📖 Подробнее</button>
                              {onCreateTool&&<button className="btn-mini" style={{color:"#B882E8"}} onClick={(e)=>{e.stopPropagation();const txt=typeof item==="string"?item:((item.title?item.title+": ":"")+item.body);onCreateTool(txt);}}>✦ Помощник</button>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
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
          <label style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",cursor:"pointer"}}>
            <input type="checkbox" checked={scheduling.reminder} onChange={e=>setScheduling(s=>({...s,reminder:e.target.checked}))} style={{width:18,height:18}}/>
            <span style={{fontSize:15,color:T.text1}}>🔔 Напомнить за 15 минут</span>
          </label>
          {scheduling.commuteMin>0&&<label style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",cursor:"pointer"}}>
            <input type="checkbox" checked={scheduling.addCommute||false} onChange={e=>setScheduling(s=>({...s,addCommute:e.target.checked}))} style={{width:18,height:18}}/>
            <span style={{fontSize:15,color:T.text1}}>🚗 Добавить блок «Дорога домой» (+{scheduling.commuteMin} мин после)</span>
          </label>}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button className="btn btn-primary" onClick={confirmSchedule}>Запланировать</button>
            <button className="btn btn-ghost" onClick={()=>setScheduling(null)}>Отмена</button>
          </div>
        </div>
      </div>}
      
      {/* Модалка подробного описания */}
      {detailItem && (
        <div className="overlay" onClick={()=>{setDetailItem(null);setDetailText("");}}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500,maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
            <span className="modal-x" onClick={()=>{setDetailItem(null);setDetailText("");}}>✕</span>
            <div className="modal-title">📖 Подробнее</div>
            {/* Исходная рекомендация */}
            <div style={{padding:"10px 14px",background:"rgba(200,164,90,0.08)",borderRadius:10,marginBottom:14,fontSize:14,color:T.gold,fontFamily:"'Crimson Pro',serif",fontStyle:"italic",flexShrink:0}}>
              {detailItem}
            </div>
            {/* Контент */}
            <div style={{flex:1,overflowY:"auto",paddingRight:4}}>
              {detailLoading&&(
                <div style={{textAlign:"center",padding:30,color:T.text3}}>
                  <div style={{fontSize:24,marginBottom:8}}>⏳</div>
                  <div style={{fontSize:13,fontStyle:"italic"}}>Загружаю подробное объяснение...</div>
                </div>
              )}
              {!detailLoading&&detailText&&(
                <div className="ai-content" style={{padding:"0 4px"}}>
                  {parseAiResponse(detailText).map((b,i)=>{
                    if(b.type==="header") return <div key={i} className="ai-header"><span className="ai-header-mark">◆</span>{b.content}</div>;
                    if(b.type==="list") return <div key={i} className="ai-list">
                      {b.items.map((it,j)=>{
                        const isObj=typeof it==="object";
                        return <div key={j} className="ai-list-item">
                          <span className="ai-list-num">{j+1}</span>
                          <div className="ai-list-body">
                            {isObj&&it.title&&<div className="ai-list-title">{it.title}</div>}
                            <div className="ai-list-text">{isObj?it.body:it}</div>
                          </div>
                        </div>;
                      })}
                    </div>;
                    return <div key={i} className="ai-paragraph">{b.content}</div>;
                  })}
                </div>
              )}
            </div>
            <div className="modal-foot" style={{flexShrink:0,gap:8,flexWrap:"wrap"}}>
              <button className="btn btn-ghost" onClick={()=>{setDetailItem(null);setDetailText("");}}>Закрыть</button>
              {detailText&&<button className="btn btn-ghost btn-sm" onClick={()=>{
                try{
                  const notes=JSON.parse(localStorage.getItem("ld_ai_notes")||"[]");
                  notes.unshift({date:new Date().toISOString(),label:"Подробно: "+detailItem.slice(0,50),text:detailText});
                  localStorage.setItem("ld_ai_notes",JSON.stringify(notes.slice(0,50)));
                  alert("Сохранено в заметки");
                }catch{}
              }}>💾 Сохранить</button>}
              {detailText&&onCreateTool&&<button className="btn btn-primary btn-sm" onClick={()=>{
                setDetailItem(null);setDetailText("");
                onCreateTool(detailItem);
              }}>✦ Создать помощник</button>}
            </div>
          </div>
        </div>
      )}
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
              {[["tasks","Общие"],["work","Работа"],["home","Дом"],["health","Здоровье"],["beauty","Уход"],["pets","Питомцы"],["shopping","Покупки"],["hobbies","Хобби"],["travel","Поездки"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
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

function TodaySection({profile,setProfile,tasks,setTasks,journal,setJournal,today,moon,kb,notify,petLog,setPetLog}) {
  // ── Все хуки на уровне компонента (React требует) ──────────
  const [addModal, setAddModal] = useState(false);
  const [modal, setModal] = useState(null);
  const [aiPlan, setAiPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [moodOpen, setMoodOpen] = useState(false);
  const [commuteOpen, setCommuteOpen] = useState(false);
  const [commuteLoading, setCommuteLoading] = useState(false);
  // Переопределённое время кормления питомцев (feedIdx → "HH:MM")
  const [feedTimesOverride, setFeedTimesOverride] = useStorage("ld_feed_times", {});
  // Раздельные рекомендации: на работу и домой — кэш на ДЕНЬ
  const commuteKey = "commute_rec_"+today;
  const [commuteRecs, setCommuteRecs] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(commuteKey)||"null") || {to:"",from:""}; } catch { return {to:"",from:""}; }
  });
  // Настройки времени в пути (if not in profile)
  const [commuteSettings, setCommuteSettings] = useStorage("ld_commute_settings", {
    toWorkMin: "", fromWorkMin: "", toWorkTime: "", fromWorkTime: ""
  });
  const [askOpen, setAskOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askHistory, setAskHistory] = useState([]);

  const askMe = async () => {
    if(!askQuestion.trim()) return;
    const q = askQuestion.trim();
    setAskLoading(true);
    setAskQuestion("");
    const answer = await askClaude(kb,
      `Пользователь задаёт вопрос: "${q}"\n\nОтветь как умный личный помощник — тепло, конкретно, по делу. Учитывай весь профиль пользователя при ответе. Если вопрос о здоровье, питании, режиме — используй ТКМ-профиль. Если о работе — учти профессию и расписание. Если личный — будь деликатен.`,
      800
    );
    setAskHistory(h => [{q, a: answer, time: new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}, ...h.slice(0,9)]);
    setAskAnswer(answer);
    setAskLoading(false);
  };
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

  // Рабочие дедлайны на сегодня — группируем в планировщик
  const todayDeadlines = tasks.filter(t=>t.isDeadline && t.deadline===today && t.doneDate!==today);
  const todayReports  = todayDeadlines.filter(t=>t.group!=="pay"&&!t.isPayment);
  const todayPayments = todayDeadlines.filter(t=>t.group==="pay"||t.isPayment);
  const doneCnt = tasks.filter(t=>t.doneDate===today).length;
  const petEmoji = t=>({Кошка:"🐱",Собака:"🐶",Попугай:"🦜",Кролик:"🐰",Хомяк:"🐹",Черепаха:"🐢",Рыбки:"🐠"}[t]||"🐾");

  // ── Вычисляем данные для рендера ───────────────────────────
  const now = new Date();
  const currentH = now.getHours();
  const currentMin = now.getMinutes();
  const nowMinutes = currentH*60 + currentMin;
  const dayInfo = getTCMDayInfo(now);
  const hourOrgan = getTCMHourOrgan(currentH);
  const recs = getTCMDayRecs(profile, dayInfo);
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

  const getCommuteRec = async(direction)=>{
    setCommuteLoading(true);
    const mins = direction==="to"
      ? (commuteSettings.toWorkMin || parseInt((profile.commuteTime||"30").match(/\d+/)||[30])[0])
      : (commuteSettings.fromWorkMin || parseInt((profile.commuteTime||"30").match(/\d+/)||[30])[0]);
    const way = profile.commuteWay||"транспорт";
    const profession = profile.profession||"работа";
    const stressors = (profile.stressors||[]).join(", ")||"—";
    const recovery = (profile.recovery||[]).join(", ")||"—";
    const interests = (profile.hobbies||[]).join(", ")||"—";
    const goals = profile.mainGoal||"—";
    const chronotype = profile.chronotype||"—";
    
    const baseInfo =
      "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Никаких других языков.\n\n"+
      "Профиль: имя="+( profile.name||"—")+", профессия="+profession+
      ", хронотип="+chronotype+", стрессоры="+stressors+
      ", восстановление="+recovery+", хобби="+interests+
      ", цель="+goals+", транспорт="+way+", в пути="+mins+"мин"+
      ", стихия дня="+dayInfo.element+", луна="+moon.n+".";

    const strictRules =
      "\n\nПРАВИЛА ОТВЕТА (ОБЯЗАТЕЛЬНО):\n"+
      "— Отвечай ТОЛЬКО на русском языке\n"+
      "— Каждый пункт: КОНКРЕТНОЕ название, а не общее описание\n"+
      "— Музыка: точный исполнитель + альбом или трек (например: Ludovico Einaudi — «Experience», Яндекс.Музыка)\n"+
      "— Подкаст: точное название + платформа (например: «Деньги не спят» — Яндекс.Подкасты / Apple Podcasts)\n"+
      "— Аудиокнига: точное название + автор (например: Михаил Гаспаров «Занимательная Греция» — Storytel)\n"+
      "— Практика: название техники + точные инструкции (например: Дыхание 4-7-8 — вдох 4с, задержка 7с, выдох 8с, 3 раза)\n"+
      "— Размышление: конкретный вопрос для этого профиля (используй профессию и цели пользователя)\n"+
      "— БЕЗ фраз: «например», «можно послушать», «что-нибудь», «в зависимости от настроения»\n"+
      "— Формат каждого пункта: [ТИП] Название/описание — где найти (если применимо). Эффект: одно предложение.";

    const prompt = direction==="to"
      ? baseInfo+strictRules+
        "\n\nДай 5 рекомендаций для дороги НА РАБОТУ ("+mins+" мин). Цель: настрой на продуктивный день бухгалтера-ИП. Учти хронотип "+chronotype+" — это утро. Стрессоры: "+stressors+"."+
        "\n\n1. [Подкаст] ...\n2. [Музыка] ...\n3. [Аудиокнига] ...\n4. [Практика] ...\n5. [Размышление] ..."
      : baseInfo+strictRules+
        "\n\nДай 5 рекомендаций для дороги ДОМОЙ ("+mins+" мин). Цель: переключиться с работы, восстановиться. Способы восстановления этого человека: "+recovery+". Хобби: "+interests+"."+
        "\n\n1. [Подкаст] ...\n2. [Музыка] ...\n3. [Аудиокнига] ...\n4. [Практика] ...\n5. [Размышление] ...";
    
    const r = await askClaude(kb, prompt, 800);
    const updated = {...commuteRecs, [direction]: r};
    setCommuteRecs(updated);
    try { localStorage.setItem(commuteKey, JSON.stringify(updated)); } catch{}
    setCommuteLoading(false);
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

  // Кормление питомцев — объединить в одну задачу на каждое время кормления
  if((profile.pets||[]).length > 0) {
    const allPets = profile.pets||[];
    const maxFeeds = Math.max(...allPets.map(p=>parseInt(p.feedTimes)||2));
    const feedLabels = maxFeeds<=2?["Утро","Вечер"]:maxFeeds===3?["Утро","День","Вечер"]:["1","2","3","4"];
    const autoTimes = maxFeeds===1?["08:00"]:maxFeeds===2?["08:00","19:00"]:maxFeeds===3?["08:00","14:00","19:00"]:["07:00","11:00","15:00","19:00"];
    for(let feedIdx=0; feedIdx<maxFeeds; feedIdx++) {
      const petsForFeed = allPets.filter(p=>feedIdx < (parseInt(p.feedTimes)||2));
      if(petsForFeed.length===0) continue;
      // Время берём: сначала из override (если пользователь изменил в планировщике), потом из профиля питомца, потом авто
      const t = feedTimesOverride[feedIdx] || (petsForFeed[0].feedSchedule||[])[feedIdx] || autoTimes[feedIdx] || "08:00";
      const [h,m] = t.split(":").map(Number);
      const allDone = petsForFeed.every(pet=>(petLog[today]?.[pet.id]||[]).includes(feedIdx));
      const petNames = petsForFeed.map(p=>p.name).join(", ");
      plannerEvents.push({
        id:"pet-feed-"+feedIdx, type:"pet", emoji:"🐾",
        title:"Покормить: "+petNames+" ("+feedLabels[feedIdx]+")",
        time:t, timeH:h, timeM:m||0, done:allDone,
        onDone:()=>{
          petsForFeed.forEach(pet=>{
            const cur=petLog[today]?.[pet.id]||[];
            const n=allDone?cur.filter(x=>x!==feedIdx):[...cur,feedIdx];
            setPetLog(p=>({...p,[today]:{...(p[today]||{}),[pet.id]:n}}));
          });
        }
      });
    }
  }

  // Дорога на работу — используем commuteSettings (из формы) или profile.commuteTime
  if(isWorkDay && (commuteSettings.toWorkMin || (profile.commuteTime && profile.commuteTime!=="Дома"))) {
    const minsTo = parseInt(commuteSettings.toWorkMin) || parseInt((profile.commuteTime||"30").match(/\d+/)||["30"])[0];
    let toH, toM;
    if(commuteSettings.toWorkTime) {
      // Точное время выезда задано пользователем
      [toH, toM] = commuteSettings.toWorkTime.split(":").map(Number);
    } else {
      // Иначе расчёт от начала рабочего дня
      const totalMin = workStartH*60 - minsTo;
      toH = Math.floor(totalMin/60); toM = totalMin%60;
    }
    plannerEvents.push({id:"commute-to", type:"commute", emoji:"🚌",
      title:"В дорогу → работа ("+minsTo+" мин)",
      time:(toH<10?"0":"")+toH+":"+(toM<10?"0":"")+toM, timeH:toH, timeM:toM, done:false, fixed:true});
    // Дорога домой
    const minsFrom = parseInt(commuteSettings.fromWorkMin) || parseInt((profile.commuteTime||"30").match(/\d+/)||["30"])[0];
    let fromH, fromM;
    if(commuteSettings.fromWorkTime) {
      [fromH, fromM] = commuteSettings.fromWorkTime.split(":").map(Number);
    } else {
      // По умолчанию — сразу после рабочего дня
      fromH = workEndH; fromM = 0;
    }
    plannerEvents.push({id:"commute-from", type:"commute", emoji:"🏠",
      title:"Дорога домой ("+minsFrom+" мин)",
      time:(fromH<10?"0":"")+fromH+":"+(fromM<10?"0":"")+fromM, timeH:fromH, timeM:fromM, done:false, fixed:true});
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

  // Дедлайны сегодня → в планировщик
  if(todayReports.length===1){
    const r=todayReports[0];
    const pref=r.preferredTime||"10:00";
    const[h,m]=pref.split(":").map(Number);
    plannerEvents.push({id:"dl-rep-"+r.id,type:"deadline",emoji:"📋",title:r.name,
      time:pref,timeH:h,timeM:m,done:r.status==="done",taskId:r.id,
      onDone:()=>setTasks(p=>p.map(t=>t.id===r.id?{...t,status:t.status==="done"?"pending":"done"}:t))});
  } else if(todayReports.length>1){
    const names=todayReports.map(r=>r.name.replace(/ФНО |— .*/g,"").trim()).join(", ");
    plannerEvents.push({id:"dl-rep-grp",type:"deadline",emoji:"📋",
      title:"Сдать отчёты: "+names,time:"10:00",timeH:10,timeM:0,done:false});
  }
  if(todayPayments.length===1){
    const r=todayPayments[0];
    const pref=r.preferredTime||"10:00";
    const[h,m]=pref.split(":").map(Number);
    plannerEvents.push({id:"dl-pay-"+r.id,type:"deadline",emoji:"💰",title:r.name,
      time:pref,timeH:h,timeM:m,done:r.status==="done",taskId:r.id,
      onDone:()=>setTasks(p=>p.map(t=>t.id===r.id?{...t,status:t.status==="done"?"pending":"done"}:t))});
  } else if(todayPayments.length>1){
    const names=todayPayments.map(r=>r.name.replace(/Уплата |Аванс по /g,"").trim()).join(", ");
    plannerEvents.push({id:"dl-pay-grp",type:"deadline",emoji:"💰",
      title:"Оплатить налоги: "+names,time:"10:00",timeH:10,timeM:0,done:false});
  }

  plannerEvents.sort((a,b)=>a.timeH*60+a.timeM-(b.timeH*60+b.timeM));

  // noTimeTasks убраны из планировщика — задачи без времени не показываем в Сегодня
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


      {/* Мини-статистика дневника в шапке */}
      {(()=>{
        const entries = Object.values(journal||{}).filter(e=>e.mood||e.win||e.insight);
        const thisWeek = entries.filter(e=>{
          const d=new Date(Object.keys(journal||{}).find(k=>journal[k]===e)||"");
          return (new Date()-d)<7*86400000;
        }).length;
        if(!entries.length) return null;
        return(
          <div style={{display:"flex",gap:8,padding:"4px 0",marginBottom:8}}>
            <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'"}}>
              📖 {entries.length} записей · {thisWeek} на этой неделе
            </div>
          </div>
        );
      })()}
      {/* ═══ 2. ЛИЧНО ДЛЯ ТЕБЯ ════════════════════════════════ */}
      {profile.dob&&(()=>{
        const bio = getBiorhythms(profile.dob);
        const seasonal = getSeasonalTCM(profile);
        const sw = getStrengthsWeaknesses(profile);
        const py = getPersonalYear(profile.dob);

        return(
          <div style={{marginBottom:12}}>
            {/* Биоритмы */}
            <div style={{padding:"10px 14px",background:"rgba(45,32,16,0.05)",borderRadius:12,marginBottom:8}}>
              <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>БИОРИТМЫ СЕГОДНЯ</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {Object.values(bio).map(b=>(
                  <div key={b.label} style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:14,flexShrink:0}}>{b.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{fontSize:11,color:T.text2}}>{b.label}</span>
                        <span style={{fontSize:11,color:b.color,fontFamily:"'JetBrains Mono'",fontWeight:600}}>{b.level}</span>
                      </div>
                      <div style={{height:4,borderRadius:2,background:"rgba(45,32,16,0.1)"}}>
                        <div style={{height:4,borderRadius:2,background:b.color,
                          width:Math.abs(b.v)+"%",marginLeft:b.v<0?"auto":0,transition:"width .3s"}}/>
                      </div>
                      <div style={{fontSize:10,color:T.text3,marginTop:2,fontStyle:"italic"}}>{b.tip}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Сезон по ТКМ */}
            <div style={{padding:"10px 14px",background:"rgba(45,32,16,0.05)",borderRadius:12,marginBottom:8,borderLeft:"3px solid "+seasonal.color}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:18}}>{seasonal.emoji}</span>
                <div>
                  <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5}}>СЕЗОН · ТКМ</div>
                  <div style={{fontSize:14,color:seasonal.color,fontWeight:500}}>{seasonal.season} — стихия {seasonal.element}</div>
                </div>
              </div>
              <div style={{fontSize:12,color:T.text2,marginBottom:4}}>🫀 Орган: <span style={{color:seasonal.color}}>{seasonal.organ}</span></div>
              <div style={{fontSize:12,color:T.text2,marginBottom:8}}>💭 Эмоция: <span style={{color:T.text1}}>{seasonal.emotion}</span></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                <div style={{background:"rgba(45,106,79,0.08)",borderRadius:8,padding:"6px 8px"}}>
                  <div style={{fontSize:9,color:T.success,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>ДЕЛАЙ</div>
                  {seasonal.doList.slice(0,3).map((d,i)=><div key={i} style={{fontSize:11,color:T.text1,marginBottom:2}}>✦ {d}</div>)}
                </div>
                <div style={{background:"rgba(139,32,32,0.05)",borderRadius:8,padding:"6px 8px"}}>
                  <div style={{fontSize:9,color:T.danger,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>ИЗБЕГАЙ</div>
                  {seasonal.avoidList.slice(0,3).map((d,i)=><div key={i} style={{fontSize:11,color:T.text2,marginBottom:2}}>✗ {d}</div>)}
                </div>
              </div>
              {seasonal.interaction&&<div style={{fontSize:11,color:T.gold,fontStyle:"italic",marginBottom:4}}>{seasonal.interaction}</div>}
              <div style={{fontSize:11,color:T.text3,fontStyle:"italic"}}>{seasonal.ageNote}</div>
            </div>

            {/* ТКМ синдромы если есть */}
            {tcm?.uniqueOrgans?.length>0&&(
              <div style={{padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:10,borderLeft:"3px solid "+T.warn}}>
                <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>ОРГАНЫ ПОД ВНИМАНИЕМ</div>
                <div style={{fontSize:13,color:T.warn}}>{tcm.uniqueOrgans.join(" · ")}</div>
                {tcm.digestionNote&&<div style={{fontSize:11,color:T.text3,marginTop:3,fontStyle:"italic"}}>{tcm.digestionNote}</div>}
              </div>
            )}
          </div>
        );
      })()}

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
            <button className="btn btn-ghost btn-sm" style={{fontSize:11,padding:"2px 8px",background:"rgba(200,164,90,0.1)"}}
              onClick={e=>{e.stopPropagation();setAddModal(true);}}>+ Добавить</button>
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
                  <div style={{display:"flex",gap:3,flexShrink:0}}>
                    {/* Редактирование времени — для ВСЕХ событий */}
                    <div className="ico-btn" style={{color:T.gold,opacity:.7,fontSize:12}}
                      title="Изменить время"
                      onClick={()=>{
                        const newTime = window.prompt("Новое время (ЧЧ:ММ):", ev.time);
                        if(!newTime || !/^\d{1,2}:\d{2}$/.test(newTime)) return;
                        const [nh, nm] = newTime.split(":").map(Number);
                        if(nh<0||nh>23||nm<0||nm>59) { notify("Неверное время"); return; }
                        const padded = (nh<10?"0":"")+nh+":"+(nm<10?"0":"")+nm;
                        // 1. Если у события есть taskId — обновляем preferredTime задачи
                        if(ev.taskId){
                          setTasks(p=>p.map(t=>t.id===ev.taskId?{...t, preferredTime: padded}:t));
                          notify("Время задачи обновлено");
                        }
                        // 2. Якорные события (подъём/отбой) — обновляем профиль
                        else if(ev.id==="wake"){
                          if(setProfile) setProfile(p=>({...p,wake:padded}));
                          else { try{const pr=JSON.parse(localStorage.getItem("ld_profile")||"{}");pr.wake=padded;localStorage.setItem("ld_profile",JSON.stringify(pr));}catch{} }
                          notify("Подъём изменён на "+padded+" ✦");
                        }
                        else if(ev.id==="sleep"){
                          if(setProfile) setProfile(p=>({...p,sleep:padded}));
                          else { try{const pr=JSON.parse(localStorage.getItem("ld_profile")||"{}");pr.sleep=padded;localStorage.setItem("ld_profile",JSON.stringify(pr));}catch{} }
                          notify("Отбой изменён на "+padded+" ✦");
                        }
                        // 3. Дорога — обновляем commuteSettings
                        else if(ev.id==="commute-to"){ setCommuteSettings(p=>({...p, toWorkTime: padded})); notify("Время выезда обновлено"); }
                        else if(ev.id==="commute-from"){ setCommuteSettings(p=>({...p, fromWorkTime: padded})); notify("Время выезда обновлено"); }
                        // 4. Кормёжка — обновляем override напрямую
                        else if(ev.id&&ev.id.startsWith("pet-feed-")){
                          const feedIdx = parseInt(ev.id.replace("pet-feed-",""));
                          setFeedTimesOverride(p=>({...p,[feedIdx]:padded}));
                          notify("Время кормления обновлено ✦");
                        }
                        // 5. Практики и спорт — обновляем preferredTime в профиле
                        else {
                          notify("Время обновлено ✦");
                        }
                      }}>🕐</div>
                    {!ev.fixed&&ev.taskId&&(
                      <>
                        <div className="ico-btn" style={{color:T.teal,opacity:.6,fontSize:12}}
                          title="Редактировать задачу"
                          onClick={()=>setModal(tasks.find(t=>t.id===ev.taskId)||{})}>✏️</div>
                        <div className="ico-btn danger" style={{fontSize:12}}
                          title="Перенести"
                          onClick={()=>{setTasks(p=>p.map(t=>t.id===ev.taskId?{...t,doneDate:today}:t));notify("Перенесено ✦");}}>↻</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
      {(profile.commuteTime&&profile.commuteTime!=="Дома"||commuteSettings.toWorkMin)&&isWorkDay&&(
        <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.teal}}>
          <div className="card-hd" style={{cursor:"pointer"}} onClick={()=>setCommuteOpen(o=>!o)}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>🚌</span>
              <span style={{fontSize:14,fontWeight:500}}>В дороге</span>
              {(profile.commuteTime&&profile.commuteTime!=="Дома")&&
                <span style={{fontSize:11,color:T.text3}}>{profile.commuteTime}</span>}
            </div>
            <span style={{color:T.text3,fontSize:14}}>{commuteOpen?"▲":"▼"}</span>
          </div>
          {commuteOpen&&(
            <div style={{marginTop:10}}>
              {/* Форма настройки времени в пути */}
              <div style={{padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderRadius:10,marginBottom:12}}>
                <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>НАСТРОЙКА ДОРОГИ</div>
                
                {/* На работу */}
                <div style={{padding:"8px 10px",background:"rgba(29,78,107,0.06)",borderRadius:8,marginBottom:8}}>
                  <div style={{fontSize:11,color:T.teal,fontFamily:"'JetBrains Mono'",marginBottom:6}}>🏢 НА РАБОТУ</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:90}}>
                      <div style={{fontSize:10,color:T.text3,marginBottom:3}}>Время выезда</div>
                      <input type="time"
                        value={commuteSettings.toWorkTime||""}
                        onChange={e=>setCommuteSettings(p=>({...p,toWorkTime:e.target.value}))}
                        style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.04)",color:T.text0,fontSize:13,outline:"none",fontFamily:"'JetBrains Mono'"}}/>
                    </div>
                    <div style={{flex:1,minWidth:90}}>
                      <div style={{fontSize:10,color:T.text3,marginBottom:3}}>В пути (мин)</div>
                      <input type="number" min="5" max="180"
                        value={commuteSettings.toWorkMin||""}
                        onChange={e=>setCommuteSettings(p=>({...p,toWorkMin:e.target.value}))}
                        placeholder="30"
                        style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.04)",color:T.text0,fontSize:13,outline:"none",fontFamily:"'JetBrains Mono'"}}/>
                    </div>
                  </div>
                </div>

                {/* Домой */}
                <div style={{padding:"8px 10px",background:"rgba(45,106,79,0.06)",borderRadius:8}}>
                  <div style={{fontSize:11,color:T.success,fontFamily:"'JetBrains Mono'",marginBottom:6}}>🏠 ДОМОЙ</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:90}}>
                      <div style={{fontSize:10,color:T.text3,marginBottom:3}}>Время выезда</div>
                      <input type="time"
                        value={commuteSettings.fromWorkTime||""}
                        onChange={e=>setCommuteSettings(p=>({...p,fromWorkTime:e.target.value}))}
                        style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.04)",color:T.text0,fontSize:13,outline:"none",fontFamily:"'JetBrains Mono'"}}/>
                    </div>
                    <div style={{flex:1,minWidth:90}}>
                      <div style={{fontSize:10,color:T.text3,marginBottom:3}}>В пути (мин)</div>
                      <input type="number" min="5" max="180"
                        value={commuteSettings.fromWorkMin||""}
                        onChange={e=>setCommuteSettings(p=>({...p,fromWorkMin:e.target.value}))}
                        placeholder="30"
                        style={{width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.04)",color:T.text0,fontSize:13,outline:"none",fontFamily:"'JetBrains Mono'"}}/>
                    </div>
                  </div>
                </div>

                <div style={{fontSize:10,color:T.text3,marginTop:8,fontStyle:"italic",textAlign:"center"}}>
                  Сохраняется автоматически. Дорога появится в Расписании дня.
                </div>
              </div>

              {/* Две кнопки: на работу и домой */}
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <button className="btn btn-ghost btn-sm" style={{flex:1,fontSize:12}} onClick={()=>getCommuteRec("to")} disabled={commuteLoading}>
                  {commuteLoading?"⏳...":"🏢 На работу"}
                </button>
                <button className="btn btn-ghost btn-sm" style={{flex:1,fontSize:12}} onClick={()=>getCommuteRec("from")} disabled={commuteLoading}>
                  {commuteLoading?"⏳...":"🏠 Домой"}
                </button>
              </div>

              {/* Рекомендации с парсером */}
              {(commuteRecs.to||commuteRecs.from)&&(()=>{
                const renderRec = (text, label, color, dirKey) => {
                  if(!text) return null;
                  const blocks = parseAiResponse(text);
                  return (
                    <div style={{marginBottom:10,padding:"10px 12px",background:color+"15",borderRadius:10,borderLeft:"2px solid "+color}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{fontSize:10,color,fontFamily:"\'JetBrains Mono\'",letterSpacing:1}}>{label}</span>
                        <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto",fontSize:10,padding:"2px 8px"}} onClick={()=>{setCommuteRecs(p=>({...p,[dirKey]:""}));getCommuteRec(dirKey);}}>↻</button>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {blocks.map((b,i)=>{
                          if(b.type==="header") return null;
                          if(b.type==="list") return b.items.map((item,j)=>{
                            const isObj = typeof item==="object";
                            const fullText = isObj ? (item.title?item.title+": ":"")+item.body : item;
                            // Извлечь тип в [скобках]
                            const typeMatch = fullText.match(/^\[([^\]]+)\]\s*(.*)/);
                            const itemType = typeMatch ? typeMatch[1] : "";
                            const itemBody = typeMatch ? typeMatch[2] : fullText;
                            const typeIcons = {
                              "Подкаст":"🎙️","Музыка":"🎵","Аудиокнига":"📚",
                              "Практика":"🧘","Размышление":"💭","Видео":"🎬"
                            };
                            const typeColors = {
                              "Подкаст":"#82AADD","Музыка":"#E8A8C8","Аудиокнига":"#E5C87A",
                              "Практика":"#7BCCA0","Размышление":"#B882E8","Видео":"#E8A85A"
                            };
                            return (
                              <div key={j} style={{display:"flex",gap:8,padding:"8px 10px",background:"rgba(255,255,255,0.02)",borderRadius:8}}>
                                <span style={{fontSize:18,flexShrink:0}}>{typeIcons[itemType]||"✦"}</span>
                                <div style={{flex:1,minWidth:0}}>
                                  {itemType&&<span style={{fontSize:9,color:typeColors[itemType]||T.text3,fontFamily:"\'JetBrains Mono\'",letterSpacing:1,padding:"1px 5px",background:(typeColors[itemType]||T.text3)+"22",borderRadius:4}}>{itemType.toUpperCase()}</span>}
                                  <div style={{fontSize:13,color:T.text1,lineHeight:1.5,marginTop:itemType?3:0}}>{itemBody}</div>
                                </div>
                              </div>
                            );
                          });
                          return <div key={i} style={{fontSize:13,color:T.text2,lineHeight:1.5}}>{b.content}</div>;
                        })}
                      </div>
                    </div>
                  );
                };
                return <>
                  {renderRec(commuteRecs.to, "🏢 НА РАБОТУ", T.teal, "to")}
                  {renderRec(commuteRecs.from, "🏠 ДОМОЙ", T.success, "from")}
                </>;
              })()}

              {!commuteRecs.to&&!commuteRecs.from&&!commuteLoading&&(
                <div style={{fontSize:13,color:T.text3,fontStyle:"italic",textAlign:"center",padding:"8px 0"}}>
                  Нажми кнопку для персональной рекомендации на дорогу
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ СПРОСИ МЕНЯ ══════════════════════════════════════════ */}
      <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.gold}}>
        <div className="card-hd" style={{cursor:"pointer"}} onClick={()=>setAskOpen(o=>!o)}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>💬</span>
            <div className="card-title">Спроси меня</div>
            {askHistory.length>0&&<span className="badge bm" style={{fontSize:10}}>{askHistory.length}</span>}
          </div>
          <span style={{color:T.text3,fontSize:14}}>{askOpen?"▲":"▼"}</span>
        </div>
        {askOpen&&(
          <div style={{marginTop:10}}>
            {/* Поле ввода */}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <textarea
                value={askQuestion}
                onChange={e=>setAskQuestion(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();askMe();}}}
                placeholder="Задай любой вопрос — о здоровье, питании, работе, жизни..."
                style={{flex:1,minHeight:52,resize:"none",fontSize:14,lineHeight:1.5,
                  padding:"10px 12px",borderRadius:10,border:"1px solid "+T.bdr,
                  background:"rgba(45,32,16,0.03)",color:T.text0,fontFamily:"'Crimson Pro',serif"}}
                disabled={askLoading}
              />
              <button className="btn btn-primary" onClick={askMe} disabled={askLoading||!askQuestion.trim()}
                style={{alignSelf:"flex-end",padding:"10px 16px",minWidth:56}}>
                {askLoading?"⏳":"✦"}
              </button>
            </div>

            {/* Быстрые вопросы */}
            {askHistory.length===0&&!askLoading&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8}}>БЫСТРЫЕ ВОПРОСЫ</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {[
                    "Что мне съесть сегодня по ТКМ?",
                    "Как лучше организовать сегодняшний день?",
                    "Какая практика подойдёт мне сейчас?",
                    "Что важно учесть при текущей фазе луны?",
                    "Как снизить стресс прямо сейчас?",
                    "Что приготовить на ужин?",
                  ].map(q=>(
                    <div key={q} onClick={()=>{setAskQuestion(q);}}
                      style={{fontSize:12,color:T.text2,padding:"5px 10px",borderRadius:16,
                        border:"1px solid "+T.bdr,cursor:"pointer",
                        background:"rgba(45,32,16,0.03)"}}>
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Загрузка */}
            {askLoading&&(
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",color:T.text3,fontSize:14,fontStyle:"italic"}}>
                <div style={{width:20,height:20,borderRadius:"50%",border:"2px solid "+T.gold,
                  borderTopColor:"transparent",animation:"spin 1s linear infinite"}}/>
                Думаю...
              </div>
            )}

            {/* История диалога */}
            {askHistory.length>0&&(
              <div>
                {askHistory.map((item,i)=>(
                  <div key={i} style={{marginBottom:14}}>
                    {/* Вопрос */}
                    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:6}}>
                      <div style={{maxWidth:"85%",padding:"8px 12px",borderRadius:"12px 12px 4px 12px",
                        background:"rgba(45,106,79,0.12)",border:"1px solid rgba(45,106,79,0.2)"}}>
                        <div style={{fontSize:14,color:T.text0,lineHeight:1.4}}>{item.q}</div>
                        <div style={{fontSize:10,color:T.text3,marginTop:3,textAlign:"right",fontFamily:"'JetBrains Mono'"}}>{item.time}</div>
                      </div>
                    </div>
                    {/* Ответ */}
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(45,106,79,0.15)",
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14}}>✦</div>
                      <div style={{flex:1,padding:"8px 12px",borderRadius:"4px 12px 12px 12px",
                        background:"rgba(45,32,16,0.04)",border:"1px solid "+T.bdrS}}>
                        <div style={{fontSize:14,color:T.text1,lineHeight:1.65,whiteSpace:"pre-wrap"}}>{item.a}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{textAlign:"center",marginTop:4}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setAskHistory([])}>Очистить историю</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
  const [search,setSearch]=useState("");

  const SEC_META = {
    work:    {emoji:"💼", color:"#82AADD", name:"Работа"},
    home:    {emoji:"🏠", color:"#7BCCA0", name:"Дом"},
    health:  {emoji:"💚", color:"#7BCCA0", name:"Здоровье"},
    beauty:  {emoji:"✨", color:"#E8A8C8", name:"Уход"},
    pets:    {emoji:"🐾", color:"#E8A85A", name:"Питомцы"},
    shopping:{emoji:"🛒", color:"#E5C87A", name:"Покупки"},
    hobbies: {emoji:"🎨", color:"#B882E8", name:"Хобби"},
    tasks:   {emoji:"📋", color:"#A8A49C", name:"Общее"},
  };

  // Только задачи на СЕГОДНЯ — ежедневные + те что наступили
  // Исключаем рабочие отчёты (isDeadline) и рабочие задачи (работают в своём разделе)
  const isTodayTask = (t) => {
    if(t.isDeadline) return false;          // отчёты — в разделе Работа
    if(t.section==="work") return false;    // рабочие задачи — в разделе Работа
    if(t.freq==="once") return !t.lastDone && !t.doneDate;
    if(t.freq==="daily" || t.freq==="workdays") return isDue(t,today);
    if(t.freq.startsWith("weekly:")||t.freq.startsWith("monthly:")) return isDue(t,today);
    if(t.freq.startsWith("every:")) {
      const n=parseInt(t.freq.split(":")[1]);
      if(n>7&&!t.lastDone) return false;  // долгие задачи не в "сегодня" если ни разу не делали
      return isDue(t,today);
    }
    return false;
  };

  // Только задачи с временем или ручные (без привязки к секции — section=tasks)
  const todayTasks = tasks.filter(t=>isTodayTask(t)&&(t.preferredTime||t.freq==="once"||t.section==="tasks"||!t.section));
  const doneTasks  = todayTasks.filter(t=>t.doneDate===today);
  const dueTasks   = todayTasks.filter(t=>t.doneDate!==today);

  const searchMatch = (t) => !search || t.title.toLowerCase().includes(search.toLowerCase());

  // Группировка по разделам
  const sections = Object.keys(SEC_META).filter(s=>s!=="work");
  const bySection = {};
  sections.forEach(s=>{bySection[s]=dueTasks.filter(t=>(t.section||"tasks")===s&&searchMatch(t));});
  const hasAny = sections.some(s=>bySection[s].length>0);

  const toggleDone=id=>{setTasks(p=>p.map(t=>t.id===id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t));};

  const TaskRow = ({task}) => {
    const sm = SEC_META[task.section||"tasks"]||SEC_META.tasks;
    const isDone = task.doneDate===today;
    return (
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
        <div style={{width:4,height:4,borderRadius:"50%",flexShrink:0,background:{h:"#E87878",m:"#E5C87A",l:"#7BCCA0"}[task.priority||"m"]||T.text3}}/>
        <div className={"chk"+(isDone?" done":"")} style={{width:20,height:20,flexShrink:0,fontSize:12}} onClick={()=>toggleDone(task.id)}>{isDone?"✓":""}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,color:isDone?T.text3:T.text0,textDecoration:isDone?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</div>
          {task.preferredTime&&<span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}>🕐{task.preferredTime}</span>}
        </div>
        <div className="ico-btn" style={{fontSize:12,padding:"2px 4px"}} onClick={()=>setModal(task)}>✏️</div>
        <div className="ico-btn danger" style={{fontSize:12,padding:"2px 4px"}} onClick={()=>{setTasks(p=>p.filter(t=>t.id!==task.id));notify("Удалено");}}>✕</div>
      </div>
    );
  };

  return(
    <div>
      {/* Поиск + добавить */}
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <input style={{flex:1,padding:"8px 12px",background:"rgba(255,255,255,.03)",border:"1px solid "+T.bdr,borderRadius:10,color:T.text0,fontFamily:"'Crimson Pro',serif",fontSize:15,outline:"none"}} placeholder="Поиск по задачам..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal({})}>+ Задача</button>
      </div>

      {/* Счётчики */}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <div style={{flex:1,padding:"6px 10px",borderRadius:10,background:"rgba(200,164,90,0.08)",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:700,color:T.gold,fontFamily:"'JetBrains Mono'"}}>{dueTasks.length}</div>
          <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>СЕГОДНЯ</div>
        </div>
        <div style={{flex:1,padding:"6px 10px",borderRadius:10,background:"rgba(123,204,160,0.08)",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#7BCCA0",fontFamily:"'JetBrains Mono'"}}>{doneTasks.length}</div>
          <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ГОТОВО</div>
        </div>
      </div>

      {/* Задачи по разделам */}
      {!hasAny&&!search&&<div className="empty"><span className="empty-ico">✦</span><p>Дел на сегодня нет. Добавь задачу вручную.</p></div>}
      {sections.map(sec=>{
        const list = bySection[sec];
        if(!list.length) return null;
        const sm = SEC_META[sec];
        return (
          <div key={sec} style={{marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontSize:14}}>{sm.emoji}</span>
              <span style={{fontSize:10,color:sm.color,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,fontWeight:700}}>{sm.name.toUpperCase()}</span>
              <span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{list.length}</span>
            </div>
            <div className="card" style={{padding:"2px 14px",borderLeft:"2px solid "+sm.color+"55"}}>
              {list.map(task=><TaskRow key={task.id} task={task}/>)}
            </div>
          </div>
        );
      })}

      {/* Выполнено */}
      {doneTasks.length>0&&(
        <details style={{marginTop:8}}>
          <summary style={{fontSize:10,color:T.success,fontFamily:"'JetBrains Mono'",letterSpacing:2,cursor:"pointer",padding:"4px 0"}}>
            ✅ ВЫПОЛНЕНО СЕГОДНЯ ({doneTasks.length})
          </summary>
          <div className="card" style={{padding:"2px 14px",marginTop:6,opacity:.6}}>
            {doneTasks.filter(searchMatch).map(task=><TaskRow key={task.id} task={task}/>)}
          </div>
        </details>
      )}

      {modal!==null&&<TaskModal task={modal.id?modal:null} defaultSection="tasks" onSave={t=>{setTasks(p=>modal.id?p.map(x=>x.id===t.id?t:x):[...p,t]);notify(modal.id?"Обновлено":"Добавлено");}} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCHEDULE
// ══════════════════════════════════════════════════════════════
function ScheduleSection({profile,tasks,setTasks,today,kb,notify}) {
  const [view, setView] = useState("week");
  const [offset, setOffset] = useState(0);
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const getAiSchedule = async()=>{
    setLoading(true);
    const r = await askClaude(kb,
      `Составь детальное расписание на неделю для ${profile.name||"меня"}. `+
      `Работа: ${profile.workStart||"9:00"}–${profile.workEnd||"18:00"} (${profile.workType||"офис"}), `+
      `дорога: ${profile.commuteTime||"нет"}. Подъём: ${profile.wake||"7:00"}, отбой: ${profile.sleep||"23:00"}. `+
      `Хронотип: ${profile.chronotype||"—"}. `+
      `Практики: ${(profile.practices||[]).join(",")||"—"}. Спорт: ${(profile.sport||[]).join(",")||"—"}. `+
      `ВАЖНО: практики и спорт ТОЛЬКО после ${profile.workEnd||"18:00"}. `+
      `Дай конкретный план по дням с точным временем.`, 1000);
    setAiText(r); setLoading(false);
  };

  // Строим неделю
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay()===0?6:now.getDay()-1;
  startOfWeek.setDate(now.getDate()-dayOfWeek + offset*7);
  startOfWeek.setHours(0,0,0,0);

  const weekDays = Array.from({length:7},(_,i)=>{
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate()+i);
    return d;
  });

  const DAY_RU = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const todayStr = now.toISOString().split("T")[0];
  const wakeH = parseInt((profile.wake||"07:00").split(":")[0]);
  const workStartH = parseInt((profile.workStart||"09:00").split(":")[0]);
  const workEndH = parseInt((profile.workEnd||"18:00").split(":")[0]);
  const sleepH = parseInt((profile.sleep||"23:00").split(":")[0]);

  // Якорные события дня
  const getAnchors = (d) => {
    const isWork = (profile.workDaysList||[1,2,3,4,5]).includes(d.getDay());
    const anchors = [];
    anchors.push({time:profile.wake||"07:00", label:"☀️ Подъём", type:"anchor"});
    if(isWork && profile.commuteTime && profile.commuteTime!=="Дома") {
      const mins=parseInt((profile.commuteTime.match(/\d+/)||["30"])[0]);
      const h=workStartH-Math.ceil(mins/60);
      anchors.push({time:h+":00", label:"🚌 Дорога", type:"commute"});
    }
    if(isWork) {
      anchors.push({time:profile.workStart||"09:00", label:"💼 Работа", type:"work"});
      anchors.push({time:profile.workEnd||"18:00", label:"✅ Конец работы", type:"work"});
    } else {
      anchors.push({time:(wakeH+2)+":00", label:"🌿 Свободное утро", type:"weekend"});
    }
    (profile.practices||[]).filter(p=>p&&p!=="Нет").forEach((pr,i)=>{
      anchors.push({time:(workEndH+i)+":30", label:"🧘 "+pr, type:"health"});
    });
    if((profile.sport||[]).length>0 && !profile.sport.includes("Не занимаюсь")) {
      anchors.push({time:(workEndH+1)+":00", label:"🏃 Спорт", type:"health"});
    }
    anchors.push({time:profile.sleep||"23:00", label:"🌙 Отбой", type:"anchor"});
    return anchors.sort((a,b)=>a.time.localeCompare(b.time));
  };

  // Задачи дня — включаем рабочие дедлайны (отчёты/платежи) на конкретную дату
  const getDayTasks = (d) => {
    const dStr = d.toISOString().split("T")[0];
    const regular = tasks.filter(t=>
      t.section!=="work" && !t.isDeadline &&
      (isDue(t,dStr) || t.doneDate===dStr)
    );
    // Рабочие дедлайны с дедлайном = этот день
    const deadlines = tasks.filter(t=>
      t.isDeadline && t.deadline===dStr && t.doneDate!==dStr
    );
    // Группируем дедлайны: отчёты и платежи
    const reports = deadlines.filter(t=>!t.isPayment);
    const payments = deadlines.filter(t=>t.isPayment);
    const grouped = [];
    if(reports.length===1) grouped.push({...reports[0], preferredTime:reports[0].preferredTime||"10:00"});
    else if(reports.length>1) grouped.push({
      id:"grp-rep-"+dStr, title:"Сдать отчёты: "+reports.map(t=>t.title.replace(/ФНО |— .*/g,"").trim()).join(", "),
      preferredTime:"10:00", section:"work", isDeadline:true, isGroup:true, groupIds:reports.map(t=>t.id),
      deadline:dStr, doneDate: reports.every(t=>t.doneDate===dStr)?dStr:null
    });
    if(payments.length===1) grouped.push({...payments[0], preferredTime:payments[0].preferredTime||"10:00"});
    else if(payments.length>1) grouped.push({
      id:"grp-pay-"+dStr, title:"Оплатить налоги: "+payments.map(t=>t.title.replace(/Уплата |Аванс по |— .*/g,"").trim()).join(", "),
      preferredTime:"10:00", section:"work", isDeadline:true, isGroup:true, groupIds:payments.map(t=>t.id),
      deadline:dStr, doneDate: payments.every(t=>t.doneDate===dStr)?dStr:null
    });
    return [...regular, ...grouped];
  };

  const typeColor = {anchor:T.text3, work:T.info, commute:T.teal, health:T.success, weekend:T.gold, task:T.text1};

  return(
    <div>
      {/* Вкладки */}
      <div className="tabs" style={{marginBottom:12}}>
        <div className={"tab"+(view==="week"?" on":"")} onClick={()=>setView("week")}>Неделя</div>
        <div className={"tab"+(view==="ai"?" on":"")} onClick={()=>setView("ai")}>ИИ-план недели</div>
      </div>

      {/* ═══ НЕДЕЛЯ — планировщик ═══ */}
      {view==="week"&&<>
        {/* Навигация */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setOffset(o=>o-1)}>←</button>
          <span style={{flex:1,textAlign:"center",fontSize:14,color:T.text2}}>
            {offset===0?"Эта неделя":offset===-1?"Прошлая неделя":offset===1?"Следующая неделя":
              weekDays[0].toLocaleDateString("ru-RU",{day:"numeric",month:"short"})+
              " – "+weekDays[6].toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={()=>setOffset(o=>o+1)}>→</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setOffset(0)}>Сегодня</button>
        </div>

        {/* Дни недели — 2 колонки */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {weekDays.map((d,i)=>{
            const dStr = d.toISOString().split("T")[0];
            const isToday = dStr===todayStr;
            const isSelected = selectedDay===dStr;
            const isWork = (profile.workDaysList||[1,2,3,4,5]).includes(d.getDay());
            const dayTasks = getDayTasks(d);
            const anchors = getAnchors(d);
            const doneTasks = dayTasks.filter(t=>t.doneDate===dStr);

            return(
              <div key={dStr} onClick={()=>setSelectedDay(isSelected?null:dStr)}
                style={{
                  borderRadius:12,padding:"10px 12px",cursor:"pointer",
                  border:"1px solid "+(isToday?T.gold:isSelected?T.teal:T.bdr),
                  background:isToday?"rgba(45,106,79,0.08)":isSelected?"rgba(78,201,190,0.06)":"rgba(45,32,16,0.03)",
                  transition:"all .15s"
                }}>
                {/* Заголовок дня */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <span style={{fontSize:11,color:isToday?T.gold:T.text3,fontFamily:"'JetBrains Mono'"}}>{DAY_RU[i]}</span>
                    <span style={{fontSize:22,fontWeight:isToday?700:400,color:isToday?T.gold:T.text0,marginLeft:6,fontFamily:"'Cormorant Infant',serif"}}>{d.getDate()}</span>
                  </div>
                  {dayTasks.length>0&&<span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{doneTasks.length}/{dayTasks.length}</span>}
                </div>

                {/* Якорные события */}
                {anchors.slice(0,isSelected?100:3).map((a,j)=>(
                  <div key={j} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                    <span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",minWidth:32,flexShrink:0}}>{a.time}</span>
                    <span style={{fontSize:12,color:typeColor[a.type]||T.text2,lineHeight:1.2}}>{a.label}</span>
                  </div>
                ))}

                {/* Задачи с временем */}
                {isSelected&&dayTasks.filter(t=>t.preferredTime).map(t=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:6,marginTop:4,padding:"4px 0",borderTop:"1px solid "+T.bdrS}}>
                    <span style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono'",minWidth:32}}>{t.preferredTime}</span>
                    <div onClick={e=>{e.stopPropagation();setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:x.doneDate===dStr?null:dStr}:x));}}
                      style={{width:14,height:14,borderRadius:3,border:"1.5px solid "+(t.doneDate===dStr?T.success:T.bdr),
                        background:t.doneDate===dStr?"rgba(45,106,79,0.2)":"transparent",cursor:"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:9,color:T.success}}>
                      {t.doneDate===dStr?"✓":""}
                    </div>
                    <span style={{fontSize:12,color:t.doneDate===dStr?T.text3:T.text1,textDecoration:t.doneDate===dStr?"line-through":"none",flex:1}}>{t.title}</span>
                  </div>
                ))}

                {/* Свернуто — показываем счётчик */}
                {!isSelected&&anchors.length>3&&(
                  <div style={{fontSize:10,color:T.text3,marginTop:3}}>+{anchors.length-3} событий</div>
                )}
                {!isSelected&&dayTasks.length>0&&(
                  <div style={{fontSize:10,color:T.teal,marginTop:2}}>📌 {dayTasks.length} задач</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Развёрнутый день — детальный планировщик */}
        {selectedDay&&(()=>{
          const d = new Date(selectedDay);
          const anchors = getAnchors(d);
          const dayTasks = getDayTasks(d);
          const noTimeTasks = dayTasks.filter(t=>!t.preferredTime);
          const nowMin = new Date().getHours()*60+new Date().getMinutes();

          return(
            <div className="card" style={{marginTop:12,borderLeft:"3px solid "+T.teal}}>
              <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20,color:T.text0,marginBottom:12}}>
                {DAY_RU[(d.getDay()===0?6:d.getDay()-1)]}, {d.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}
              </div>
              {/* Все события + задачи хронологически */}
              {[...anchors.map(a=>({...a,isAnchor:true})),
                ...dayTasks.filter(t=>t.preferredTime).map(t=>({time:t.preferredTime,label:t.title,type:"task",task:t}))
              ].sort((a,b)=>a.time.localeCompare(b.time)).map((ev,i)=>{
                const evMin=parseInt(ev.time.split(":")[0])*60+parseInt(ev.time.split(":")[1]||0);
                const isNow=selectedDay===todayStr&&evMin<=nowMin;
                const dStr=selectedDay;
                return(
                  <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid "+T.bdrS}}>
                    <span style={{fontSize:11,color:isNow?T.gold:T.text3,fontFamily:"'JetBrains Mono'",minWidth:44,flexShrink:0,fontWeight:isNow?700:400}}>{ev.time}</span>
                    <div style={{width:2,background:isNow?T.gold:T.bdrS,borderRadius:1,flexShrink:0}}/>
                    {ev.task&&(
                      <div onClick={()=>setTasks(p=>p.map(x=>x.id===ev.task.id?{...x,doneDate:x.doneDate===dStr?null:dStr}:x))}
                        style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(ev.task.doneDate===dStr?T.success:T.bdr),
                          background:ev.task.doneDate===dStr?"rgba(45,106,79,0.2)":"transparent",
                          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:T.success}}>
                        {ev.task.doneDate===dStr?"✓":""}
                      </div>
                    )}
                    {!ev.task&&<div style={{width:16,flexShrink:0}}/>}
                    <span style={{fontSize:13,color:ev.task?(ev.task.doneDate===dStr?T.text3:T.text1):typeColor[ev.type]||T.text2,
                      textDecoration:ev.task?.doneDate===dStr?"line-through":"none",flex:1}}>
                      {ev.label}
                    </span>
                    {/* Редактирование времени и названия */}
                    {ev.task&&!ev.task.isGroup&&(
                      <div style={{display:"flex",gap:3,flexShrink:0}}>
                        <div className="ico-btn" style={{fontSize:11,color:T.gold,padding:"1px 4px"}} title="Изменить время"
                          onClick={e=>{e.stopPropagation();
                            const t=window.prompt("Новое время (ЧЧ:ММ):",ev.task.preferredTime||ev.time);
                            if(t&&/^\d{1,2}:\d{2}$/.test(t)) setTasks(p=>p.map(x=>x.id===ev.task.id?{...x,preferredTime:t}:x));
                          }}>🕐</div>
                        <div className="ico-btn" style={{fontSize:11,color:T.teal,padding:"1px 4px"}} title="Изменить название"
                          onClick={e=>{e.stopPropagation();
                            const t=window.prompt("Новое название:",ev.task.title);
                            if(t&&t.trim()) setTasks(p=>p.map(x=>x.id===ev.task.id?{...x,title:t.trim()}:x));
                          }}>✏️</div>
                      </div>
                    )}
                  </div>
                );
              })}
              {noTimeTasks.length>0&&(
                <div style={{marginTop:8,fontSize:12,color:T.text3}}>
                  📌 Без времени: {noTimeTasks.map(t=>t.title).join(", ")}
                </div>
              )}
              {/* Добавить событие вручную */}
              <div style={{marginTop:10}}>
                <button className="btn btn-ghost btn-sm" style={{width:"100%",fontSize:11,border:"1px dashed rgba(200,164,90,0.3)"}}
                  onClick={e=>{e.stopPropagation();
                    const title=window.prompt("Название события:");
                    if(!title) return;
                    const time=window.prompt("Время (ЧЧ:ММ):","10:00");
                    if(!time||!/^\d{1,2}:\d{2}$/.test(time)) return;
                    setTasks(p=>[...p,{id:Date.now()+Math.random(),title,section:"tasks",freq:"once",
                      preferredTime:time,deadline:selectedDay,lastDone:"",doneDate:"",notes:""}]);
                    notify("Добавлено в расписание");
                  }}>+ Добавить событие</button>
              </div>
            </div>
          );
        })()}
      </>}

      {/* ═══ ИИ-ПЛАН ═══ */}
      {view==="ai"&&<>
        {!aiText&&!loading&&(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>🗓️</div>
            <div style={{fontSize:15,color:T.text2,marginBottom:16}}>AI составит оптимальное расписание на неделю с учётом работы, практик и хронотипа</div>
            <button className="btn btn-primary" onClick={getAiSchedule}>✦ Составить расписание</button>
          </div>
        )}
        {loading&&<div style={{textAlign:"center",padding:"20px",color:T.text3,fontStyle:"italic"}}>Составляю расписание...</div>}
        {aiText&&<>
          <div className="card"><div className="ai-text">{aiText}</div></div>
          <button className="btn btn-ghost" style={{marginTop:8}} onClick={()=>{setAiText("");getAiSchedule();}}>↻ Пересоставить</button>
        </>}
      </>}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  ПРОФЕССИОНАЛЬНЫЕ ДЕДЛАЙНЫ — КАЗАХСТАН 2026
// ══════════════════════════════════════════════════════════════
function getProfDeadlines(profile) {
  const prof = profile.profDeadlines||"";
  const year = 2026;
  const tasks = [];
  const mk = (title, month, day, note="", organ="") => ({
    id: Date.now()+Math.random(),
    title, section:"work", freq:"once", priority:"h",
    deadline: new Date(year, month-1, day).toISOString().split("T")[0],
    notes: note, organ,
    lastDone:"", doneDate:"", preferredTime:"09:00", isDeadline:true,
  });

  if(prof.includes("Бухгалтер") || prof.includes("ИП")) {
    // ── МАЙ 2026 ─────────────────────────────────────
    tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (1 кв. 2026)",          5, 15,
      "Декларация по ИПН, ОПВ, ВОСМС, ООСМС, СО за янв-март. Ст.209 НК РК","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 300.00 — СДАЧА (1 кв. 2026)",          5, 15,
      "Декларация по НДС за янв-март. Ст.424 НК РК","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА ИПН+ОПВ+ОСМС+СО (1 кв. 2026)",     5, 25,
      "Уплата налогов из ФНО 200.00 за янв-март","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА НДС (1 кв. 2026)",                   5, 25,
      "Уплата НДС по ФНО 300.00 за янв-март. Ст.424 НК РК","КГД"));
    tasks.push(mk("💰 КГД: Аванс налог на имущество/землю (2-й срок)", 5, 25,
      "1/4 от годовой суммы. Ст.512, 523 НК РК","КГД"));
    tasks.push(mk("💰 КГД: Аванс по КПН — май 2026",                   5, 25,
      "Ежемесячный аванс. Ст.305 НК РК","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 150.00 — Трансфертное ценообразование", 5, 31,
      "При наличии контролируемых сделок. Ст.295 НК РК","КГД"));
    // ── ИЮНЬ ──────────────────────────────────────────
    tasks.push(mk("💰 КГД: Аванс по КПН — июнь 2026",                  6, 25, "","КГД"));
    tasks.push(mk("📋 Годовое собрание ТОО / АО",                      6, 30,
      "Не позднее 6 мес. после конца фин. года. ЗРК «О ТОО» ст.45","МЮ"));
    // ── ИЮЛЬ ──────────────────────────────────────────
    tasks.push(mk("📊 БНС: Форма 1-Т (2 кв.) — Труд и зарплата",       7, 10, "","БНС"));
    tasks.push(mk("💰 КГД: Аванс по КПН — июль 2026",                  7, 27,
      "Перенос: 25.07 (сб) → 27.07 (пн)","КГД"));
    // ── АВГУСТ ────────────────────────────────────────
    tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (2 кв. 2026)",          8, 17,
      "Перенос: 15.08 (сб) → 17.08 (пн). Ст.209 НК РК","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 300.00 — СДАЧА (2 кв. 2026)",          8, 17,
      "Перенос: 15.08 (сб) → 17.08 (пн). Ст.424 НК РК","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 910.00 — СДАЧА (1 п/г 2026)",          8, 17,
      "Упрощённая декларация. Перенос → 17.08. Ст.688 НК РК","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА ИПН+ОПВ+ОСМС+СО (2 кв. 2026)",     8, 25, "","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА НДС (2 кв. 2026)",                   8, 25, "","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА по ФНО 910.00 (1 п/г 2026)",        8, 25, "","КГД"));
    tasks.push(mk("💰 КГД: Аванс налог на имущество/землю (3-й срок)", 8, 25, "","КГД"));
    tasks.push(mk("💰 КГД: Аванс по КПН — август 2026",                8, 25, "","КГД"));
    // ── СЕНТЯБРЬ ──────────────────────────────────────
    tasks.push(mk("💰 КГД: Аванс по КПН — сентябрь 2026",              9, 25, "","КГД"));
    // ── ОКТЯБРЬ ───────────────────────────────────────
    tasks.push(mk("📊 БНС: Форма 1-Т (3 кв.) — Труд и зарплата",      10, 10, "","БНС"));
    tasks.push(mk("💰 КГД: Аванс по КПН — октябрь 2026",               10, 27,
      "Перенос: 25.10 (День Республики) → 27.10 (вт)","КГД"));
    // ── НОЯБРЬ ────────────────────────────────────────
    tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (3 кв. 2026)",          11, 16,
      "Перенос: 15.11 (вс) → 16.11 (пн). Ст.209 НК РК","КГД"));
    tasks.push(mk("🏛 КГД: ФНО 300.00 — СДАЧА (3 кв. 2026)",          11, 16,
      "Перенос: 15.11 (вс) → 16.11 (пн). Ст.424 НК РК","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА ИПН+ОПВ+ОСМС+СО (3 кв. 2026)",     11, 25, "","КГД"));
    tasks.push(mk("💰 КГД: УПЛАТА НДС (3 кв. 2026)",                   11, 25, "","КГД"));
    tasks.push(mk("💰 КГД: Аванс налог на имущество/землю (4-й срок)", 11, 25, "","КГД"));
    tasks.push(mk("💰 КГД: Аванс по КПН — ноябрь 2026",               11, 25, "","КГД"));
    // ── ДЕКАБРЬ ───────────────────────────────────────
    tasks.push(mk("🏛 КГД: Проверка и продление лицензий",             12,  1, "","КГД"));
    tasks.push(mk("📋 График отпусков на 2027 год",                    12, 15,
      "ТК РК ст.93","HR"));
    tasks.push(mk("💰 КГД: Аванс по КПН — декабрь 2026",              12, 25, "","КГД"));
  }

  if(prof.includes("HR") || prof.includes("Кадры")) {
    if(!prof.includes("Бухгалтер")&&!prof.includes("ИП")) {
      tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (1 кв.)",  5, 15, "","КГД"));
      tasks.push(mk("💰 КГД: ФНО 200.00 — УПЛАТА (1 кв.)", 5, 25, "","КГД"));
      tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (2 кв.)",  8, 17, "","КГД"));
      tasks.push(mk("💰 КГД: ФНО 200.00 — УПЛАТА (2 кв.)", 8, 25, "","КГД"));
      tasks.push(mk("🏛 КГД: ФНО 200.00 — СДАЧА (3 кв.)", 11, 16, "","КГД"));
      tasks.push(mk("💰 КГД: ФНО 200.00 — УПЛАТА (3 кв.)",11, 25, "","КГД"));
    }
    tasks.push(mk("📊 БНС: Форма 1-Т (2 кв.)",  7, 10, "","БНС"));
    tasks.push(mk("📋 Воинский учёт — годовая сверка", 9, 1, "","HR"));
    tasks.push(mk("📊 БНС: Форма 1-Т (3 кв.)", 10, 10, "","БНС"));
    tasks.push(mk("📋 График отпусков на 2027 год", 12, 15, "ТК РК ст.93","HR"));
  }

  if(prof.includes("Юрист")) {
    tasks.push(mk("📋 Годовое собрание ТОО / АО", 6, 30, "ЗРК «О ТОО» ст.45","МЮ"));
    tasks.push(mk("🏛 КГД: Проверка лицензий", 12, 1, "","КГД"));
  }

  if(prof.includes("Врач")||prof.includes("Мед")) {
    tasks.push(mk("🏥 МЗ: Медстатистика (2 кв.)",  7, 10, "","МЗ"));
    tasks.push(mk("🏥 МЗ: Медстатистика (3 кв.)", 10, 10, "","МЗ"));
  }

  if(prof.includes("Педагог")) {
    tasks.push(mk("📚 МОН: Рабочие программы на учебный год", 9, 1, "","МОН"));
    tasks.push(mk("📚 МОН: Итоговый отчёт 1-я четверть",    11, 5, "","МОН"));
  }

  if(prof.includes("Госслужащий")) {
    tasks.push(mk("📊 МФ: Отчёт об исполнении бюджета (2 кв.)",  7, 15, "","МФ"));
    tasks.push(mk("📊 МФ: Отчёт об исполнении бюджета (3 кв.)", 10, 15, "","МФ"));
    tasks.push(mk("🔍 АПК: Антикоррупционное уведомление",       10, 31, "","АПК"));
  }

  // Дедупликация
  const seen = new Set();
  return tasks.filter(t => { if(seen.has(t.title)) return false; seen.add(t.title); return true; });
}

// Компактная строка дедлайна
function DlRow({t, today, setTasks, setEditDl, setAddDlModal}) {
  const dl = t.deadline ? new Date(t.deadline) : null;
  const daysLeft = dl ? Math.ceil((dl - new Date()) / 86400000) : null;
  const isOver = t.deadline && t.deadline < today;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:"1px solid "+T.bdrS}}>
      <div className={"chk"+(t.doneDate===today?" done":"")} style={{flexShrink:0,width:18,height:18,fontSize:11}}
        onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:x.doneDate===today?null:today,lastDone:x.doneDate===today?x.lastDone:today}:x))}>
        {t.doneDate===today?"✓":""}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,color:t.doneDate===today?T.text3:T.text0,textDecoration:t.doneDate===today?"line-through":"none",lineHeight:1.3}}>
          {t.title.replace(/^[📋🏛🏦📊🔍💰🔒]+\s*/,"")}
        </div>
        {t.notes&&<div style={{fontSize:11,color:T.text3,marginTop:1}}>{t.notes}</div>}
      </div>
      {dl&&<div style={{fontSize:11,color:isOver?T.danger:daysLeft<=3?T.warn:T.text3,fontFamily:"'JetBrains Mono'",flexShrink:0,fontWeight:isOver||daysLeft<=3?700:400}}>
        {isOver?"просроч":daysLeft===0?"сегодня":daysLeft===1?"завтра":dl.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
      </div>}
      <div className="ico-btn" style={{fontSize:11,color:T.teal,opacity:.6,flexShrink:0}}
        onClick={()=>{setEditDl(t);setAddDlModal(true);}}>✏️</div>
      <div className="ico-btn danger" style={{fontSize:11,flexShrink:0}}
        onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))}>✕</div>
    </div>
  );
}

function WorkSection({profile,tasks,setTasks,today,kb,notify}) {
  // Проверка: показывать блок отчётности (только бухгалтеры и ИП)
  const isAccountant = (()=>{
    const prof   = (profile.profession||"").toLowerCase();
    const sphere = (profile.jobSphere||"").toLowerCase();
    const wtype  = (profile.workType||"").toLowerCase();
    return prof.match(/бухгалтер|ип|индивидуальн|предприним/)||
           sphere.match(/бухгалтер|финансов|учёт|учет|налог/)||
           wtype.match(/ип|самозанят/)||
           profile.isIP===true;
  })();
  const gp = genderPrompt(profile);
  const [editSchedule,setEditSchedule]=useState(false);
  const [schedStart,setSchedStart]=useState(profile.workStart||"09:00");
  const [schedEnd,setSchedEnd]=useState(profile.workEnd||"18:00");
  // Синхронизация с профилем если изменился снаружи
  useEffect(()=>{
    if(!editSchedule){
      setSchedStart(profile.workStart||"09:00");
      setSchedEnd(profile.workEnd||"18:00");
    }
  },[profile.workStart,profile.workEnd,editSchedule]);

  // Хранилище разделов отчётности
  const [reportGroups, setReportGroups] = useStorage("ld_report_groups", [
    {id:"kgd",   name:"КГД",       icon:"🏛", color:"#82AADD"},
    {id:"pay",   name:"Платежи",   icon:"💰", color:"#7BCCA0"},
    {id:"bns",   name:"БНС",       icon:"📊", color:"#E8A85A"},
    {id:"pit",   name:"ПИТ",       icon:"📋", color:"#B882E8"},
    {id:"liz",   name:"Лизинг",    icon:"📄", color:"#E5C87A"},
    {id:"eaes",  name:"ЕАЭС",      icon:"🌐", color:"#7EDDD5"},
  ]);
  // Миграция: убрать "Выбросы" из сохранённых данных пользователя
  useEffect(()=>{
    setReportGroups(p=>p.filter(g=>g.id!=="vyb"&&g.name!=="Выбросы"));
    setReports(p=>p.filter(r=>r.group!=="vyb"&&r.cat!=="Выбросы"));
  },[]);

  // Хранилище всех отчётов пользователя
  const [reports, setReports] = useStorage("ld_reports_v2", []);

  const [activeGroup, setActiveGroup] = useState(null); // открытый раздел
  const [addReportModal, setAddReportModal] = useState(null); // {groupId} или null
  const [editReport, setEditReport] = useState(null); // редактируемый отчёт
  const [addGroupModal, setAddGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({name:"",icon:"📝",color:"#A8A49C"});
  // Состояние формы добавления нового отчёта (поднято на уровень компонента — нельзя useState в IIFE)
  const [newReport, setNewReport] = useState({name:"",deadline:"",period:"quarter",amount:"",notes:""});
  // Состояние проверки сроков
  const [checkingId, setCheckingId] = useState(null); // id отчёта который проверяем
  const [checkResults, setCheckResults] = useStorage("ld_deadline_checks", {}); // {reportId: {deadline, checkedAt, info}}
  const [dlView, setDlView] = useState("upcoming"); // upcoming | overdue | done | all
  const [weekOpen, setWeekOpen] = useState(true); // раздел "на этой неделе"
  const [upcomingOpen, setUpcomingOpen] = useState(true); // БЛИЖАЙШИЕ ОТЧЁТЫ
  const [groupsOpen, setGroupsOpen] = useState(true); // разделы отчётности
  const [tasksOpen, setTasksOpen] = useState(true); // задачи
  const [adviceOpen, setAdviceOpen] = useState(true); // советы по работе
  const [taskModal, setTaskModal] = useState(null);
  // Вкладки WorkSection
  const [workTab, setWorkTab] = useState("reports"); // reports | tools
  // Инструменты — сохраняются в localStorage
  const [workTools, setWorkTools] = useStorage("ld_work_tools", []);
  // Создание инструмента
  const [creatingTool, setCreatingTool] = useState(null); // {recommendation, type, structure}
  const [toolLoading, setToolLoading] = useState(false);
  const [activeTool, setActiveTool] = useState(null); // открытый инструмент

  // ── КГД: полный список форм для ТОО и ИП, Казахстан 2026 ──
  const KGD_FORMS = [
    // Упрощённая декларация
    {id:"910h1",  name:"ФНО 910.00 — 1 полугодие (упрощёнка)",      period:"semi",    deadline_month:"08", deadline_day:"17", note:"Малый бизнес, упр. режим"},
    {id:"910h2",  name:"ФНО 910.00 — 2 полугодие (упрощёнка)",      period:"semi",    deadline_month:"02", deadline_day:"17", next_year:true},
    {id:"912q1",  name:"ФНО 912.00 — 1 кв. (розничный налог)",      period:"quarter", deadline_month:"05", deadline_day:"15"},
    {id:"912q2",  name:"ФНО 912.00 — 2 кв. (розничный налог)",      period:"quarter", deadline_month:"08", deadline_day:"17"},
    {id:"912q3",  name:"ФНО 912.00 — 3 кв. (розничный налог)",      period:"quarter", deadline_month:"11", deadline_day:"16"},
    // ИПН у источника выплаты
    {id:"200q1",  name:"ФНО 200.00 — 1 квартал (ИПН/СН)",           period:"quarter", deadline_month:"05", deadline_day:"15", note:"ИПН, соц.налог, ОПВ, ОСМС"},
    {id:"200q2",  name:"ФНО 200.00 — 2 квартал (ИПН/СН)",           period:"quarter", deadline_month:"08", deadline_day:"17"},
    {id:"200q3",  name:"ФНО 200.00 — 3 квартал (ИПН/СН)",           period:"quarter", deadline_month:"11", deadline_day:"16"},
    {id:"200a",   name:"ФНО 200.00 — годовой (ИПН/СН)",             period:"annual",  deadline_month:"03", deadline_day:"31", next_year:true},
    // ИПН для ИП на ОУР
    {id:"220a",   name:"ФНО 220.00 — годовой (ИПН для ИП на ОУР)",  period:"annual",  deadline_month:"03", deadline_day:"31", next_year:true},
    {id:"240a",   name:"ФНО 240.00 — годовой (ИПН прочие доходы)",  period:"annual",  deadline_month:"03", deadline_day:"31", next_year:true},
    // НДС
    {id:"300q1",  name:"ФНО 300.00 — 1 кв. (НДС)",                  period:"quarter", deadline_month:"05", deadline_day:"15"},
    {id:"300q2",  name:"ФНО 300.00 — 2 кв. (НДС)",                  period:"quarter", deadline_month:"08", deadline_day:"17"},
    {id:"300q3",  name:"ФНО 300.00 — 3 кв. (НДС)",                  period:"quarter", deadline_month:"11", deadline_day:"16"},
    {id:"328m",   name:"ФНО 328.00 — ежемес. (НДС при импорте ЕАЭС)",period:"monthly", deadline_day:"20", note:"При ввозе из ЕАЭС"},
    {id:"400q",   name:"ФНО 400.00 — (зачёт НДС при экспорте)",     period:"quarter", deadline_month:"05", deadline_day:"15"},
    // КПН
    {id:"100a",   name:"ФНО 100.00 — годовой (КПН)",                 period:"annual",  deadline_month:"03", deadline_day:"31", next_year:true},
    {id:"101_01m",name:"ФНО 101.01 — ежемес. (авансы КПН)",          period:"monthly", deadline_day:"25"},
    {id:"101_02a",name:"ФНО 101.02 — (окончат. расчёт авансов КПН)", period:"annual",  deadline_month:"03", deadline_day:"31", next_year:true},
    {id:"101_04", name:"ФНО 101.04 — (КПН с нерезидентов)",          period:"quarter", deadline_month:"05", deadline_day:"15"},
    // Имущество, земля, транспорт
    {id:"700a",   name:"ФНО 700.00 — годовой (имущество+земля+транспорт)", period:"annual", deadline_month:"03", deadline_day:"31", next_year:true},
    {id:"701_01", name:"ФНО 701.01 — текущие платежи (земельный)",   period:"quarter", deadline_day:"25"},
    {id:"851_00", name:"ФНО 851.00 — текущие платежи (транспорт)",   period:"quarter", deadline_day:"25"},
    // Роялти и трансфертное ценообразование
    {id:"590a",   name:"ФНО 590.00 — (роялти и тех. услуги нерезид.)",period:"annual", deadline_month:"03", deadline_day:"31", next_year:true},
    {id:"870a",   name:"ФНО 870.00 — (трансфертное ценообразование)", period:"annual", deadline_month:"05", deadline_day:"31"},
    // Платежи (ОПВ, ОСМС, ИПН, НДС)
    {id:"opv_m",  name:"Уплата ОПВ + ИПН + ОСМС + СО — ежемес.",    period:"monthly", deadline_day:"25"},
    {id:"nds_q",  name:"Уплата НДС — ежеквартально",                  period:"quarter", deadline_day:"25"},
    {id:"imushestvo_q", name:"Аванс налог на имущество — ежекварт.",  period:"quarter", deadline_day:"25"},
  ];

  // ── БНС: полный список форм 2026 (официальный сайт stat.gov.kz) ──
  const BNS_FORMS = [
    // Ежедневные
    {id:"c101",     name:"Ц-101 — Тетрадь регистрации цен (потреб. товары)",   period:"daily",   deadline_day:"1"},
    // Месячные
    {id:"3svyaz",   name:"3-связь — Почтовая и курьерская деятельность",        period:"monthly", deadline_day:"15"},
    {id:"1invest",  name:"1-инвест — Инвестиции в основной капитал",            period:"monthly", deadline_day:"15", note:"Производство, строительство"},
    {id:"1is_m",    name:"1-ИС (мес.) — Ввод объектов индив. застройщиками",    period:"monthly", deadline_day:"10"},
    {id:"1ks_m",    name:"1-КС — Выполненные строительные работы (услуги)",     period:"monthly", deadline_day:"10", note:"Строительство"},
    {id:"1p_m",     name:"1-П (мес.) — Производство и отгрузка продукции",      period:"monthly", deadline_day:"15", note:"Производство"},
    {id:"1tar_gruz",name:"1-тариф (грузы) — Тарифы на перевозку грузов",        period:"monthly", deadline_day:"10"},
    {id:"1tar_post",name:"1-тариф (почта, курьер) — Тарифы почт. услуг",        period:"monthly", deadline_day:"10"},
    {id:"1tar_svz", name:"1-тариф (связь) — Тарифы на услуги связи",            period:"monthly", deadline_day:"10"},
    {id:"1transp",  name:"1-транспорт — Работа транспорта",                      period:"monthly", deadline_day:"15"},
    {id:"1ts",      name:"1-ТС — Взаимная торговля с ЕАЭС",                     period:"monthly", deadline_day:"20"},
    {id:"1c_exp",   name:"1-Ц (экспорт, импорт) — Цены экспорта/импорта",      period:"monthly", deadline_day:"15"},
    {id:"1c_opt",   name:"1-Ц(опт) — Цены оптовых продаж",                      period:"monthly", deadline_day:"15"},
    {id:"1cp",      name:"1-ЦП — Цены производителей пром. продукции",          period:"monthly", deadline_day:"15", note:"Производство"},
    {id:"1crzh",    name:"1-ЦРЖ — Тетрадь регистрации цен на жильё",           period:"monthly", deadline_day:"5"},
    {id:"1csm",     name:"1-ЦСМ — Цены на строит. материалы",                   period:"monthly", deadline_day:"15", note:"Строительство"},
    {id:"1csh",     name:"1-ЦСХ — Цены производителей с/х продукции",           period:"monthly", deadline_day:"10"},
    {id:"2ks_m",    name:"2-КС (мес.) — Ввод в эксплуатацию объектов",          period:"monthly", deadline_day:"10", note:"Строительство"},
    {id:"2torg",    name:"2-торговля — Реализация товаров и услуг",              period:"monthly", deadline_day:"15"},
    // Квартальные
    {id:"1pf_q",    name:"1-ПФ (кварт.) — Финансово-хозяйственная деятельность",period:"quarter", deadline_day:"25"},
    {id:"2mp_q",    name:"2-МП (кварт.) — Деятельность малого предприятия",     period:"quarter", deadline_day:"20"},
    {id:"1c_usl",   name:"1-Ц (услуги) — Цены производителей на услуги",        period:"quarter", deadline_day:"15"},
    {id:"2usl_q",   name:"2-услуги (кварт.) — Объём оказанных услуг",           period:"quarter", deadline_day:"20"},
    {id:"2turizm",  name:"2-туризм — Деятельность мест размещения",             period:"quarter", deadline_day:"20"},
    {id:"1usl_q",   name:"1-услуги — Услуги образования, здравоохр., соцзащиты",period:"quarter", deadline_day:"20"},
    {id:"1t_q",     name:"1-Т (кварт.) — Отчёт по труду",                       period:"quarter", deadline_day:"15"},
    {id:"1p_q",     name:"1-П (кварт.) — Производство продукции (товаров, услуг)",period:"quarter",deadline_day:"20", note:"Производство"},
    {id:"1ks_mal",  name:"1-КС (малые) — Строит. работы малых предприятий",     period:"quarter", deadline_day:"20", note:"Строительство"},
    {id:"1kfh",     name:"1-КФХ инвест — Инвестиции КФХ",                       period:"quarter", deadline_day:"20"},
    // Годовые
    {id:"01ip",     name:"01-ИП(пром) — Производство пром. продукции ИП",       period:"annual",  deadline_month:"03", deadline_day:"25"},
    {id:"f11",      name:"11 — Состояние основных фондов",                        period:"annual",  deadline_month:"02", deadline_day:"15"},
    {id:"2ks_y",    name:"2-КС (год) — Ввод в эксплуатацию объектов",           period:"annual",  deadline_month:"02", deadline_day:"15", note:"Строительство"},
    {id:"1is_y",    name:"1-ИС (год) — Ввод объектов индив. застройщиками",     period:"annual",  deadline_month:"02", deadline_day:"15"},
    {id:"7tpz",     name:"7-ТПЗ — Травматизм и профзаболевания",                period:"annual",  deadline_month:"01", deadline_day:"25"},
    {id:"ecom",     name:"Э-коммерция — Электронная коммерция",                  period:"annual",  deadline_month:"04", deadline_day:"15"},
    {id:"4os",      name:"4-ОС — Затраты на охрану окружающей среды",           period:"annual",  deadline_month:"02", deadline_day:"15"},
    {id:"3inform",  name:"3-информ — Использование ИКТ на предприятиях",         period:"annual",  deadline_month:"04", deadline_day:"15"},
    {id:"2usl_y",   name:"2-услуги (год) — Объём оказанных услуг",              period:"annual",  deadline_month:"03", deadline_day:"31"},
    {id:"2usl_it",  name:"2-услуги(IT) — IT-услуги",                            period:"annual",  deadline_month:"03", deadline_day:"31"},
    {id:"2transp",  name:"2-транспорт — Работа транспорта по видам",             period:"annual",  deadline_month:"02", deadline_day:"25"},
    {id:"2tp_voz",  name:"2-ТП(воздух) — Охрана атмосферного воздуха",          period:"annual",  deadline_month:"02", deadline_day:"01"},
    {id:"2svyaz",   name:"2-связь — Услуги связи",                               period:"annual",  deadline_month:"03", deadline_day:"25"},
    {id:"2othody",  name:"2-отходы — Переработка и захоронение отходов",         period:"annual",  deadline_month:"02", deadline_day:"15"},
    {id:"2mp_y",    name:"2-МП (год) — Деятельность малого предприятия",         period:"annual",  deadline_month:"04", deadline_day:"10"},
    {id:"1electr",  name:"1-ЭЛЕКТРОЭНЕРГИЯ — Выработка и продажа электроэнергии",period:"annual", deadline_month:"02", deadline_day:"10"},
    {id:"1ugol",    name:"1-УГОЛЬ — Деятельность угольных предприятий",          period:"annual",  deadline_month:"02", deadline_day:"10"},
    {id:"1t_usl",   name:"1-Т (Условия труда) — Работники во вредных условиях", period:"annual",  deadline_month:"01", deadline_day:"25"},
    {id:"1t_y",     name:"1-Т (год) — Отчёт по труду",                           period:"annual",  deadline_month:"02", deadline_day:"15"},
    {id:"1pf_y",    name:"1-ПФ (год) — Финансово-хозяйственная деятельность",   period:"annual",  deadline_month:"04", deadline_day:"15"},
    {id:"1svyaz",   name:"1-связь — Услуги почтовой деятельности",               period:"annual",  deadline_month:"03", deadline_day:"25"},
    {id:"1p_y",     name:"1-П (год) — Производство, отгрузка, баланс мощностей",period:"annual",  deadline_month:"04", deadline_day:"15", note:"Производство"},
    {id:"1othody",  name:"1-отходы — Сбор и вывоз коммунальных отходов",         period:"annual",  deadline_month:"02", deadline_day:"10"},
    {id:"1neft",    name:"1-НЕФТЬ — Нефтедобыча и нефтепереработка",             period:"annual",  deadline_month:"03", deadline_day:"25"},
    {id:"1nauka",   name:"1-наука — НИОКР (научные исследования)",               period:"annual",  deadline_month:"04", deadline_day:"15"},
    {id:"1lizing",  name:"1-лизинг — Лизинговая деятельность",                   period:"annual",  deadline_month:"03", deadline_day:"31"},
    {id:"12torg",   name:"12-торговля — Торговые рынки",                          period:"annual",  deadline_month:"02", deadline_day:"15"},
    {id:"6tp",      name:"6-ТП — Работа тепловых электростанций и котельных",    period:"annual",  deadline_month:"02", deadline_day:"10"},
    {id:"2tr_vd",   name:"2-ТР(ВД) — Услуги вспомог. транспортной деятельности",period:"annual",  deadline_month:"03", deadline_day:"25"},
    {id:"bm",       name:"БМ — Баланс производственных мощностей",               period:"annual",  deadline_month:"04", deadline_day:"10", note:"Производство"},
    {id:"1kpe",     name:"1-КПЭ — Ключевые показатели эффективности",            period:"annual",  deadline_month:"03", deadline_day:"30"},
    {id:"1sr",      name:"1-СР — Виды экономической деятельности",               period:"annual",  deadline_month:"04", deadline_day:"15"},
    {id:"1np",      name:"1-НП — Опрос новых предприятий",                        period:"once",    deadline_day:""},
    // Конъюнктурные обследования (квартальные)
    {id:"kp001",    name:"КП-001 — Анкета промышленных предприятий",             period:"quarter", deadline_day:"10", note:"Производство"},
    {id:"ks002",    name:"КС-002 — Анкета строительных организаций",             period:"quarter", deadline_day:"10", note:"Строительство"},
    {id:"kt001",    name:"КТ-001 — Анкета торговых предприятий",                 period:"quarter", deadline_day:"10"},
    {id:"ksvz1",    name:"КСВ-1 — Анкета предприятий связи",                     period:"quarter", deadline_day:"10"},
  ];

  const EAES_FORMS = [
    {id:"eaes1", name:"ФНО 328.00 — НДС при импорте из ЕАЭС",      period:"monthly", deadline_day:"20"},
    {id:"eaes2", name:"Заявление о ввозе товаров и уплате налогов", period:"monthly", deadline_day:"20"},
    {id:"eaes3", name:"1-ТС — Статистика взаимной торговли ЕАЭС",  period:"monthly", deadline_day:"20"},
  ];
  const [showFormPicker, setShowFormPicker] = useState(null); // groupId
  const [selectedForms, setSelectedForms] = useState({});
  
  // Встроенный календарь КГД+БНС — Казахстан 2026 (полный)
  const KGD_CALENDAR = [
    // ─── КГД: ФНО 910.00 (упрощёнка)
    {group:"kgd", name:"ФНО 910.00 — 1 полугодие",        period:"semi",    deadline:"2026-08-17", cat:"КГД"},
    {group:"kgd", name:"ФНО 910.00 — 2 полугодие",        period:"semi",    deadline:"2027-02-17", cat:"КГД"},
    // ФНО 200.00 (ИПН/СН)
    {group:"kgd", name:"ФНО 200.00 — 1 квартал",          period:"quarter", deadline:"2026-05-15", cat:"КГД"},
    {group:"kgd", name:"ФНО 200.00 — 2 квартал",          period:"quarter", deadline:"2026-08-17", cat:"КГД"},
    {group:"kgd", name:"ФНО 200.00 — 3 квартал",          period:"quarter", deadline:"2026-11-16", cat:"КГД"},
    {group:"kgd", name:"ФНО 200.00 — годовой",            period:"annual",  deadline:"2027-03-31", cat:"КГД"},
    // ФНО 300.00 (НДС)
    {group:"kgd", name:"ФНО 300.00 — 1 квартал (НДС)",    period:"quarter", deadline:"2026-05-15", cat:"КГД"},
    {group:"kgd", name:"ФНО 300.00 — 2 квартал (НДС)",    period:"quarter", deadline:"2026-08-17", cat:"КГД"},
    {group:"kgd", name:"ФНО 300.00 — 3 квартал (НДС)",    period:"quarter", deadline:"2026-11-16", cat:"КГД"},
    // ФНО 100.00 (КПН)
    {group:"kgd", name:"ФНО 100.00 — годовой (КПН)",      period:"annual",  deadline:"2027-03-31", cat:"КГД"},
    {group:"kgd", name:"ФНО 101.02 — окончат. расчёт КПН",period:"annual",  deadline:"2027-03-31", cat:"КГД"},
    // ФНО 220, 240
    {group:"kgd", name:"ФНО 220.00 — годовой (ИПН ИП)",   period:"annual",  deadline:"2027-03-31", cat:"КГД"},
    {group:"kgd", name:"ФНО 240.00 — годовой (ИПН проч.)",period:"annual",  deadline:"2027-03-31", cat:"КГД"},
    // ФНО 700.00 (имущество/земля/транспорт)
    {group:"kgd", name:"ФНО 700.00 — годовой (имущ+земля+тр.)",period:"annual",deadline:"2027-03-31",cat:"КГД"},
    // ФНО 328.00 (НДС при импорте ЕАЭС — ежемесячно)
    ...["05","06","07","08","09","10","11","12"].map(m=>({
      group:"eaes", name:"ФНО 328.00 — НДС при импорте ЕАЭС ("+m+".2026)", period:"monthly",
      deadline:"2026-"+m+"-20", cat:"ЕАЭС"
    })),
    // ─── Платежи ОПВ/ИПН/ОСМС/СО ежемесячно
    ...["05","06","07","08","09","10","11","12"].map(m=>({
      group:"pay", name:"Уплата ОПВ+ИПН+ОСМС+СО ("+m+".2026)", period:"monthly",
      deadline:"2026-"+m+"-25", cat:"Платежи"
    })),
    // НДС ежеквартально
    {group:"pay", name:"Уплата НДС — 1 кв.",               period:"quarter", deadline:"2026-05-25", cat:"Платежи"},
    {group:"pay", name:"Уплата НДС — 2 кв.",               period:"quarter", deadline:"2026-08-25", cat:"Платежи"},
    {group:"pay", name:"Уплата НДС — 3 кв.",               period:"quarter", deadline:"2026-11-25", cat:"Платежи"},
    // Авансы КПН ежемесячно
    ...["05","06","07","08","09","10","11","12"].map(m=>({
      group:"pay", name:"Аванс по КПН ("+m+".2026)", period:"monthly",
      deadline:"2026-"+m+"-25", cat:"Платежи"
    })),
    // ─── БНС: месячные
    {group:"bns", name:"1-инвест — Инвестиции в осн. капитал (мес.)", period:"monthly", deadline:"2026-06-15", cat:"БНС"},
    {group:"bns", name:"1-КС — Строит. работы (мес.)",     period:"monthly", deadline:"2026-06-10", cat:"БНС"},
    {group:"bns", name:"1-П — Производство и отгрузка (мес.)",period:"monthly",deadline:"2026-06-15",cat:"БНС"},
    {group:"bns", name:"1-ЦП — Цены произв. пром. продукции",period:"monthly",deadline:"2026-06-15", cat:"БНС"},
    {group:"bns", name:"1-ЦСМ — Цены на строит. материалы",  period:"monthly",deadline:"2026-06-15", cat:"БНС"},
    {group:"bns", name:"2-КС — Ввод объектов (мес.)",         period:"monthly",deadline:"2026-06-10", cat:"БНС"},
    {group:"bns", name:"2-торговля — Реализация товаров",      period:"monthly",deadline:"2026-06-15", cat:"БНС"},
    {group:"bns", name:"1-ТС — Торговля с ЕАЭС",              period:"monthly",deadline:"2026-06-20", cat:"БНС"},
    {group:"bns", name:"1-транспорт — Работа транспорта",      period:"monthly",deadline:"2026-06-15", cat:"БНС"},
    // БНС: квартальные
    {group:"bns", name:"1-Т — Отчёт по труду (1 кв.)",        period:"quarter", deadline:"2026-04-15", cat:"БНС"},
    {group:"bns", name:"1-Т — Отчёт по труду (2 кв.)",        period:"quarter", deadline:"2026-07-15", cat:"БНС"},
    {group:"bns", name:"1-Т — Отчёт по труду (3 кв.)",        period:"quarter", deadline:"2026-10-15", cat:"БНС"},
    {group:"bns", name:"1-ПФ — Фин.-хоз. деятельность (1 кв.)",period:"quarter",deadline:"2026-04-25",cat:"БНС"},
    {group:"bns", name:"1-ПФ — Фин.-хоз. деятельность (2 кв.)",period:"quarter",deadline:"2026-07-25",cat:"БНС"},
    {group:"bns", name:"1-ПФ — Фин.-хоз. деятельность (3 кв.)",period:"quarter",deadline:"2026-10-25",cat:"БНС"},
    {group:"bns", name:"2-МП — Малое предприятие (1 кв.)",    period:"quarter", deadline:"2026-04-20", cat:"БНС"},
    {group:"bns", name:"2-МП — Малое предприятие (2 кв.)",    period:"quarter", deadline:"2026-07-20", cat:"БНС"},
    {group:"bns", name:"2-МП — Малое предприятие (3 кв.)",    period:"quarter", deadline:"2026-10-20", cat:"БНС"},
    {group:"bns", name:"1-П — Производство (кварт., 1 кв.)",  period:"quarter", deadline:"2026-04-20", cat:"БНС"},
    {group:"bns", name:"1-П — Производство (кварт., 2 кв.)",  period:"quarter", deadline:"2026-07-20", cat:"БНС"},
    {group:"bns", name:"1-П — Производство (кварт., 3 кв.)",  period:"quarter", deadline:"2026-10-20", cat:"БНС"},
    {group:"bns", name:"1-КС (малые) — Строит. работы (1 кв.)",period:"quarter",deadline:"2026-04-20", cat:"БНС"},
    {group:"bns", name:"1-КС (малые) — Строит. работы (2 кв.)",period:"quarter",deadline:"2026-07-20", cat:"БНС"},
    {group:"bns", name:"1-КС (малые) — Строит. работы (3 кв.)",period:"quarter",deadline:"2026-10-20", cat:"БНС"},
    {group:"bns", name:"КП-001 — Анкета пром. предприятий (1 кв.)",period:"quarter",deadline:"2026-04-10",cat:"БНС"},
    {group:"bns", name:"КС-002 — Анкета строит. организаций (1 кв.)",period:"quarter",deadline:"2026-04-10",cat:"БНС"},
    // БНС: годовые
    {group:"bns", name:"1-Т — годовой (труд)",               period:"annual",  deadline:"2027-02-15", cat:"БНС"},
    {group:"bns", name:"1-ПФ — годовой (фин.-хоз.)",         period:"annual",  deadline:"2027-04-15", cat:"БНС"},
    {group:"bns", name:"2-МП — годовой (малое предпр.)",     period:"annual",  deadline:"2027-04-10", cat:"БНС"},
    {group:"bns", name:"1-П — годовой (производство)",        period:"annual",  deadline:"2027-04-15", cat:"БНС"},
    {group:"bns", name:"2-КС — годовой (строительство)",      period:"annual",  deadline:"2027-02-15", cat:"БНС"},
    {group:"bns", name:"11 — Состояние основных фондов",      period:"annual",  deadline:"2027-02-15", cat:"БНС"},
    {group:"bns", name:"7-ТПЗ — Травматизм",                  period:"annual",  deadline:"2027-01-25", cat:"БНС"},
    {group:"bns", name:"4-ОС — Охрана окружающей среды",      period:"annual",  deadline:"2027-02-15", cat:"БНС"},
    {group:"bns", name:"2-услуги — годовой",                  period:"annual",  deadline:"2027-03-31", cat:"БНС"},
    {group:"bns", name:"2-услуги(IT) — IT-услуги",            period:"annual",  deadline:"2027-03-31", cat:"БНС"},
    {group:"bns", name:"1-лизинг — Лизинговая деятельность",  period:"annual",  deadline:"2027-03-31", cat:"БНС"},
    {group:"bns", name:"3-информ — Использование ИКТ",        period:"annual",  deadline:"2027-04-15", cat:"БНС"},
    {group:"bns", name:"БМ — Баланс производств. мощностей",  period:"annual",  deadline:"2027-04-10", cat:"БНС"},
    {group:"bns", name:"1-КПЭ — Ключевые показатели эфф.",    period:"annual",  deadline:"2027-03-30", cat:"БНС"},
    {group:"bns", name:"1-наука — НИОКР",                     period:"annual",  deadline:"2027-04-15", cat:"БНС"},
    {group:"bns", name:"Э-коммерция — Электронная коммерция", period:"annual",  deadline:"2027-04-15", cat:"БНС"},
    // ЕАЭС
    {group:"eaes",name:"Заявление о ввозе товаров (ЕАЭС)",    period:"monthly", deadline:"2026-06-20", cat:"ЕАЭС"},
    {group:"eaes",name:"1-ТС — Взаимная торговля ЕАЭС",       period:"monthly", deadline:"2026-06-20", cat:"ЕАЭС"},
  ];

  // Merge system calendar with user reports on first load
  useEffect(()=>{
    if(reports.length===0) {
      const init = KGD_CALENDAR.map(r=>({
        ...r, id:"sys-"+Math.random().toString(36).slice(2),
        status:"pending", // pending | ready | done
        amount:"", notes:"", enabled:true,
        createdAt: new Date().toISOString()
      }));
      setReports(init);
    }
  },[]);

  // Рабочие задачи — только ручной ввод, без авто-мусора
  const AUTO_GARBAGE = ["смена резины","смена на летнюю","смена на зимнюю","мойка после зимы","антикор","замена масла"];
  const workTasks = tasks.filter(t=>
    t.section==="work" && !t.isDeadline &&
    !AUTO_GARBAGE.some(g=>t.title.toLowerCase().includes(g))
  );
  const isWorkDay = (profile.workDaysList||[1,2,3,4,5]).includes(new Date().getDay());

  // Upcoming: enabled reports with deadline within 7 days
  const now = new Date(); now.setHours(0,0,0,0);
  const in7 = new Date(now); in7.setDate(in7.getDate()+7);
  const in3 = new Date(now); in3.setDate(in3.getDate()+3);

  const enabledReports = reports.filter(r=>r.enabled!==false);
  const upcoming = enabledReports.filter(r=>{
    if(r.status==="done") return false;
    const d = new Date(r.deadline); d.setHours(0,0,0,0);
    return d >= now && d <= in7;
  }).sort((a,b)=>a.deadline.localeCompare(b.deadline));

  const overdue = enabledReports.filter(r=>{
    if(r.status==="done") return false;
    return r.deadline < today;
  }).sort((a,b)=>b.deadline.localeCompare(a.deadline));

  const done = enabledReports.filter(r=>r.status==="done")
    .sort((a,b)=>b.deadline.localeCompare(a.deadline));

  const toggleDone = (id) => setReports(p=>p.map(r=>r.id===id?{...r,status:r.status==="done"?"pending":"done"}:r));
  const toggleReady = (id) => setReports(p=>p.map(r=>r.id===id?{...r,status:r.status==="ready"?"pending":"ready"}:r));
  const deleteReport = (id) => setReports(p=>p.filter(r=>r.id!==id));

  const periodLabel = p=>({monthly:"Ежемесячно",quarter:"Ежеквартально",semi:"Раз в полгода",annual:"Ежегодно",once:"Разово"}[p]||p||"—");

  // ─── Создание интерактивного инструмента из рекомендации ───
  const createTool = async (recommendation) => {
    setToolLoading(true);
    try {
      const prompt =
        "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Отвечай ТОЛЬКО валидным JSON без markdown.\n\n"+
        "Пользователь хочет создать интерактивный инструмент на основе рекомендации:\n"+
        "\""+recommendation+"\"\n\n"+
        "Профиль пользователя: профессия="+( profile.profession||"—")+", сфера="+(profile.jobSphere||"—")+".\n\n"+
        "Определи тип инструмента и создай его структуру. Типы:\n"+
        "- checklist: пошаговый чеклист (шаги которые можно отмечать)\n"+
        "- tracker: трекер с прогрессом (метрики, цели, значения)\n"+
        "- board: доска задач (колонки: Надо сделать / В работе / Готово)\n"+
        "- timer: таймер с сессиями (например Pomodoro)\n"+
        "- planner: планировщик (временные блоки на день/неделю)\n\n"+
        "Ответь строго в формате JSON:\n"+
        "{\n"+
        "  \"type\": \"checklist\" | \"tracker\" | \"board\" | \"timer\" | \"planner\",\n"+
        "  \"title\": \"Название инструмента\",\n"+
        "  \"description\": \"Краткое описание — зачем этот инструмент\",\n"+
        "  \"data\": { /* структура зависит от типа */ }\n"+
        "}\n\n"+
        "Для checklist — data: { items: [{id,text,done:false}] }\n"+
        "Для tracker — data: { metrics: [{id,name,target,current:0,unit}] }\n"+
        "Для board — data: { columns: [{id,name,cards:[{id,text}]}] }\n"+
        "Для timer — data: { workMin:25, breakMin:5, sessions:0, goal:4 }\n"+
        "Для planner — data: { slots: [{time,activity,duration}] }\n\n"+
        "Наполни инструмент реальным содержимым под этот метод и профиль пользователя. Не пустой шаблон.";

      const raw = await askClaude(kb, prompt, 1500);
      const cleaned = raw.replace(/```json|```/g,"").trim();
      const toolData = JSON.parse(cleaned);

      const newTool = {
        id: "tool-"+Date.now(),
        recommendation,
        type: toolData.type,
        title: toolData.title,
        description: toolData.description,
        data: toolData.data,
        createdAt: new Date().toISOString(),
        state: {} // пользовательское состояние (отметки, прогресс)
      };

      setWorkTools(p=>[newTool, ...p]);
      setWorkTab("tools");
      setActiveTool(newTool.id);
      notify("Инструмент создан: "+newTool.title);
    } catch(e) {
      notify("Ошибка создания инструмента — попробуй ещё раз");
      console.error(e);
    }
    setToolLoading(false);
  };

  // ─── Проверка срока через официальные сайты ───
  const checkDeadline = async (r) => {
    setCheckingId(r.id);
    try {
      const resp = await fetch("/api/check-deadline", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          name: r.name,
          group: r.group,
          period: r.period,
          currentDeadline: r.deadline
        })
      });
      const data = await resp.json();

      if(data.deadline && /^\d{4}-\d{2}-\d{2}$/.test(data.deadline)) {
        // Автоматически обновляем deadline
        setReports(p=>p.map(rep=>rep.id===r.id?{...rep, deadline:data.deadline}:rep));
        // Сохраняем результат с источником
        setCheckResults(p=>({...p,[r.id]:{
          deadline: data.deadline,
          info: data.info||"",
          source: data.source||"",
          sourceUrl: data.sourceUrl||"",
          checkedAt: new Date().toISOString()
        }}));
        notify("Срок обновлён: "+new Date(data.deadline).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}));
      } else {
        notify(data.error||"Не удалось определить срок");
      }
    } catch(e) {
      notify("Ошибка проверки — попробуй ещё раз");
    }
    setCheckingId(null);
  };
  const daysLeft = dl => { const d=new Date(dl); d.setHours(0,0,0,0); return Math.ceil((d-now)/86400000); };

  // Строка отчёта
  const ReportRow = ({r, showGroup=false}) => {
    const days = daysLeft(r.deadline);
    const isOver = days < 0;
    const isSoon = days >= 0 && days <= 3;
    const g = reportGroups.find(g=>g.id===r.group)||{name:r.group,icon:"📋",color:T.text3};
    const isChecking = checkingId === r.id;
    const checked = checkResults[r.id];
    return (
      <div style={{padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
          {/* Статусы */}
          <div style={{display:"flex",flexDirection:"column",gap:3,flexShrink:0,paddingTop:2}}>
            <div title="Выполнено" className={"chk"+(r.status==="done"?" done":"")} style={{width:18,height:18,fontSize:10}} onClick={()=>toggleDone(r.id)}>{r.status==="done"?"✓":""}</div>
            {r.status!=="done"&&<div title="Подготовлен" style={{width:18,height:18,borderRadius:4,border:"1px solid "+(r.status==="ready"?"rgba(78,201,190,0.6)":T.bdr),background:r.status==="ready"?"rgba(78,201,190,0.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:r.status==="ready"?T.teal:T.text3}} onClick={()=>toggleReady(r.id)} title="Подготовлен">P</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              {showGroup&&<span style={{fontSize:10,color:g.color,fontFamily:"'JetBrains Mono'"}}>{g.icon}</span>}
              <span style={{fontSize:14,color:r.status==="done"?T.text3:T.text0,textDecoration:r.status==="done"?"line-through":"none",lineHeight:1.3}}>{r.name}</span>
            </div>
            <div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:10,color:isOver?T.danger:isSoon?T.warn:T.text3,fontFamily:"'JetBrains Mono'",fontWeight:isOver||isSoon?700:400}}>
                {isOver?"⚠ Просрочен":days===0?"📍 Сегодня":days===1?"📍 Завтра":"📅 "+new Date(r.deadline).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
              </span>
              {r.status==="ready"&&<span style={{fontSize:10,color:T.teal,fontFamily:"'JetBrains Mono'"}}>✓ Подготовлен</span>}
              {r.amount&&<span style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono'"}}>{r.amount}</span>}
              {r.period&&<span style={{fontSize:10,color:T.text3}}>{periodLabel(r.period)}</span>}
              {/* Кнопка проверки срока */}
              <button onClick={()=>checkDeadline(r)} disabled={isChecking}
                style={{fontSize:9,padding:"1px 6px",borderRadius:8,border:"1px solid rgba(130,170,221,0.4)",background:"rgba(130,170,221,0.08)",color:isChecking?"#888":"#82AADD",cursor:isChecking?"wait":"pointer",fontFamily:"'JetBrains Mono'",flexShrink:0}}>
                {isChecking?"⏳...":"🔍 Проверить срок"}
              </button>
            </div>
            {r.notes&&<div style={{fontSize:12,color:T.text3,marginTop:2,fontStyle:"italic"}}>{r.notes}</div>}
            {/* Результат проверки */}
            {checked&&(
              <div style={{marginTop:4,padding:"5px 8px",background:"rgba(130,170,221,0.06)",borderRadius:6,borderLeft:"2px solid rgba(130,170,221,0.4)"}}>
                <div style={{fontSize:11,color:"#82AADD",fontFamily:"'JetBrains Mono'"}}>
                  ✓ Проверено: {new Date(checked.deadline).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}
                </div>
                {checked.info&&<div style={{fontSize:10,color:T.text2,marginTop:2}}>{checked.info}</div>}
                {checked.sourceUrl
                  ? <a href={checked.sourceUrl} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:9,color:"#82AADD",marginTop:1,display:"block",textDecoration:"underline"}}>
                      {checked.source||checked.sourceUrl}
                    </a>
                  : checked.source&&<div style={{fontSize:9,color:T.text3,marginTop:1,fontStyle:"italic"}}>{checked.source}</div>
                }
                <div style={{fontSize:9,color:T.text3,marginTop:1}}>
                  Обновлено: {new Date(checked.checkedAt).toLocaleDateString("ru-RU",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:3,flexShrink:0}}>
            <div className="ico-btn" style={{fontSize:12,padding:"2px 4px"}} onClick={()=>setEditReport({...r})}>✏️</div>
            <div className="ico-btn danger" style={{fontSize:12,padding:"2px 4px"}} onClick={()=>deleteReport(r.id)}>✕</div>
          </div>
        </div>
      </div>
    );
  };

  return(
    <div>
      {/* Шапка */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:10,marginBottom:10,flexWrap:"wrap"}}>
        {profile.profession&&<span style={{fontSize:13,color:T.text1,fontWeight:500}}>💼 {profile.profession}</span>}
        {profile.workType&&<span style={{fontSize:12,color:T.text3}}>· {profile.workType}</span>}
        <span style={{fontSize:12,color:T.gold,marginLeft:"auto"}}>
          {editSchedule?(
            <span style={{display:"inline-flex",gap:4,alignItems:"center"}}>
              <input type="time" value={schedStart} onChange={e=>setSchedStart(e.target.value)} style={{width:75,fontSize:12,padding:"2px 4px",borderRadius:5,border:"1px solid "+T.bdr,background:"transparent",color:T.text0}}/>
              <span>–</span>
              <input type="time" value={schedEnd} onChange={e=>setSchedEnd(e.target.value)} style={{width:75,fontSize:12,padding:"2px 4px",borderRadius:5,border:"1px solid "+T.bdr,background:"transparent",color:T.text0}}/>
              <button className="btn btn-primary btn-sm" style={{padding:"2px 8px",fontSize:11}} onClick={()=>{if(setProfile){setProfile(p=>({...p,workStart:schedStart,workEnd:schedEnd}));}else{try{const pr=JSON.parse(localStorage.getItem("ld_profile")||"{}");pr.workStart=schedStart;pr.workEnd=schedEnd;localStorage.setItem("ld_profile",JSON.stringify(pr));}catch{}}setEditSchedule(false);notify("График сохранён ✦");}}>✓</button>
            </span>
          ):(
            <span style={{cursor:"pointer"}} onClick={()=>{setSchedStart(profile.workStart||"09:00");setSchedEnd(profile.workEnd||"18:00");setEditSchedule(true);}}>🕐 {profile.workStart||"09:00"}–{profile.workEnd||"18:00"} ✏️</span>
          )}
        </span>
      </div>

      {!isWorkDay&&<div style={{marginBottom:10,padding:"8px 14px",background:"rgba(200,164,90,.08)",borderRadius:9,fontSize:14,color:T.gold,fontStyle:"italic"}}>Сегодня нерабочий день ✦ Отдыхай</div>}

      {/* ── Вкладки ── */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[
          {id:"reports", label:"📋 Отчётность"},
          {id:"tools",   label:"🛠 Инструменты"+(workTools.length>0?" ("+workTools.length+")":"")},
        ].map(tab=>(
          <button key={tab.id} onClick={()=>setWorkTab(tab.id)}
            style={{flex:1,padding:"8px 10px",borderRadius:10,border:"1px solid "+(workTab===tab.id?T.gold+"88":"rgba(255,255,255,0.08)"),background:workTab===tab.id?"rgba(200,164,90,0.12)":"rgba(255,255,255,0.02)",color:workTab===tab.id?T.gold:T.text2,fontSize:13,cursor:"pointer",fontFamily:"'Crimson Pro',serif",transition:"all .15s"}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ВКЛАДКА: ИНСТРУМЕНТЫ ── */}
      {workTab==="tools"&&(
        <div>
          {toolLoading&&(
            <div style={{textAlign:"center",padding:30,color:T.text3}}>
              <div style={{fontSize:28,marginBottom:8}}>⚙️</div>
              <div style={{fontSize:13,fontStyle:"italic"}}>AI создаёт инструмент под твой профиль...</div>
            </div>
          )}
          {!toolLoading&&workTools.length===0&&(
            <div className="empty">
              <span className="empty-ico">🛠</span>
              <p>Инструментов пока нет.</p>
              <p style={{fontSize:13,color:T.text3}}>Получи советы по работе → нажми «Подробнее» → «✦ Создать помощник»</p>
            </div>
          )}
          {!toolLoading&&workTools.map(tool=>(
            <div key={tool.id} style={{marginBottom:10}}>
              <div onClick={()=>setActiveTool(activeTool===tool.id?null:tool.id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderRadius:12,cursor:"pointer",background:activeTool===tool.id?"rgba(200,164,90,0.1)":"rgba(255,255,255,0.02)",border:"1px solid "+(activeTool===tool.id?T.gold+"55":"rgba(255,255,255,0.06)"),transition:"all .15s"}}>
                <span style={{fontSize:22}}>{{checklist:"✅",tracker:"📈",board:"📌",timer:"⏱",planner:"🗓"}[tool.type]||"🛠"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,color:T.text0,fontWeight:500}}>{tool.title}</div>
                  <div style={{fontSize:11,color:T.text3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tool.description}</div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",background:"rgba(255,255,255,0.05)",padding:"1px 6px",borderRadius:6}}>{tool.type}</span>
                  <button className="ico-btn danger" style={{fontSize:11}} onClick={e=>{e.stopPropagation();if(window.confirm("Удалить «"+tool.title+"»?")){setWorkTools(p=>p.filter(t=>t.id!==tool.id));if(activeTool===tool.id)setActiveTool(null);}}}>✕</button>
                  <span style={{fontSize:12,color:T.text3}}>{activeTool===tool.id?"▲":"▼"}</span>
                </div>
              </div>
              {activeTool===tool.id&&(
                <div style={{padding:"14px 16px",background:"rgba(255,255,255,0.01)",borderRadius:"0 0 12px 12px",border:"1px solid rgba(255,255,255,0.05)",borderTop:"none"}}>
                  {/* Исходная рекомендация */}
                  <div style={{fontSize:11,color:T.text3,fontStyle:"italic",marginBottom:12,padding:"6px 10px",background:"rgba(200,164,90,0.06)",borderRadius:8,borderLeft:"2px solid "+T.gold+"55"}}>
                    💡 {tool.recommendation}
                  </div>
                  {/* Рендер по типу */}
                  {tool.type==="checklist"&&(
                    <div>
                      <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>ЧЕКЛИСТ</div>
                      {(tool.data?.items||[]).map((item,i)=>{
                        const isDone=(tool.state?.checked||{})[item.id||i];
                        return (
                          <div key={item.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                            <div className={"chk"+(isDone?" done":"")} style={{width:20,height:20,fontSize:12,flexShrink:0}}
                              onClick={()=>setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,checked:{...(t.state?.checked||{}),[item.id||i]:!isDone}}}:t))}>
                              {isDone?"✓":""}
                            </div>
                            <span style={{flex:1,fontSize:14,color:isDone?T.text3:T.text0,textDecoration:isDone?"line-through":"none"}}>{item.text}</span>
                            {/* Редактировать */}
                            <div className="ico-btn" style={{fontSize:11,color:T.teal,padding:"1px 4px",flexShrink:0}} onClick={()=>{
                              const v=window.prompt("Изменить шаг:",item.text);
                              if(v&&v.trim()) setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,data:{...t.data,items:t.data.items.map((it,j)=>j===i?{...it,text:v.trim()}:it)}}:t));
                            }}>✏️</div>
                            {/* Удалить */}
                            <div className="ico-btn danger" style={{fontSize:11,padding:"1px 4px",flexShrink:0}} onClick={()=>{
                              if(window.confirm("Удалить шаг?")) setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,data:{...t.data,items:t.data.items.filter((_,j)=>j!==i)}}:t));
                            }}>✕</div>
                          </div>
                        );
                      })}
                      {/* Добавить шаг */}
                      <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:8,fontSize:11,border:"1px dashed rgba(200,164,90,0.3)"}} onClick={()=>{
                        const v=window.prompt("Новый шаг:");
                        if(v&&v.trim()) setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,data:{...t.data,items:[...(t.data.items||[]),{id:"i-"+Date.now(),text:v.trim(),done:false}]}}:t));
                      }}>+ Добавить шаг</button>
                      {/* Прогресс */}
                      {(()=>{
                        const total=(tool.data?.items||[]).length;
                        const done=Object.values(tool.state?.checked||{}).filter(Boolean).length;
                        const pct=total?Math.round(done/total*100):0;
                        return <div style={{marginTop:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.text3,marginBottom:4}}>
                            <span>Прогресс</span><span style={{fontFamily:"'JetBrains Mono'"}}>{done}/{total}</span>
                          </div>
                          <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)"}}>
                            <div style={{height:"100%",width:pct+"%",borderRadius:2,background:pct===100?T.success:T.gold,transition:"width .3s"}}/>
                          </div>
                        </div>;
                      })()}
                    </div>
                  )}
                  {tool.type==="tracker"&&(
                    <div>
                      <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>ТРЕКЕР МЕТРИК</div>
                      {(tool.data?.metrics||[]).map((m,i)=>{
                        const current=(tool.state?.values||{})[m.id||i]??m.current??0;
                        const pct=m.target?Math.min(100,Math.round(current/m.target*100)):0;
                        return (
                          <div key={m.id||i} style={{marginBottom:14,padding:"10px 12px",background:"rgba(255,255,255,0.02)",borderRadius:10}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                              <span style={{fontSize:13,color:T.text1,fontWeight:500}}>{m.name}</span>
                              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                <span style={{fontSize:12,color:T.gold,fontFamily:"'JetBrains Mono'"}}>{current}/{m.target} {m.unit||""}</span>
                                {/* Редактировать метрику */}
                                <div className="ico-btn" style={{fontSize:11,color:T.teal,padding:"1px 4px"}} onClick={()=>{
                                  const name=window.prompt("Название метрики:",m.name);
                                  if(!name) return;
                                  const target=window.prompt("Цель:",m.target);
                                  const unit=window.prompt("Единица измерения:",m.unit||"");
                                  setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,data:{...t.data,metrics:t.data.metrics.map((x,j)=>j===i?{...x,name:name.trim(),target:parseFloat(target)||x.target,unit:unit||x.unit}:x)}}:t));
                                }}>✏️</div>
                                {/* Удалить метрику */}
                                <div className="ico-btn danger" style={{fontSize:11,padding:"1px 4px"}} onClick={()=>{
                                  if(window.confirm("Удалить метрику «"+m.name+"»?")) setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,data:{...t.data,metrics:t.data.metrics.filter((_,j)=>j!==i)}}:t));
                                }}>✕</div>
                              </div>
                            </div>
                            <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.06)",marginBottom:8}}>
                              <div style={{height:"100%",width:pct+"%",borderRadius:3,background:pct>=100?T.success:T.teal,transition:"width .3s"}}/>
                            </div>
                            <div style={{display:"flex",gap:8}}>
                              <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={()=>setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,values:{...(t.state?.values||{}),[m.id||i]:Math.max(0,current-1)}}}:t))}>−</button>
                              <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={()=>setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,values:{...(t.state?.values||{}),[m.id||i]:current+1}}}:t))}>+</button>
                              <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={()=>{const v=window.prompt("Введи значение:",current);if(v!==null&&!isNaN(v))setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,values:{...(t.state?.values||{}),[m.id||i]:parseFloat(v)}}}:t));}}>= Задать</button>
                            </div>
                          </div>
                        );
                      })}
                      {/* Добавить метрику */}
                      <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:4,fontSize:11,border:"1px dashed rgba(200,164,90,0.3)"}} onClick={()=>{
                        const name=window.prompt("Название метрики:");
                        if(!name) return;
                        const target=window.prompt("Цель (число):");
                        const unit=window.prompt("Единица измерения (шт, мин, ₸ и т.д.):");
                        if(name.trim()) setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,data:{...t.data,metrics:[...(t.data.metrics||[]),{id:"m-"+Date.now(),name:name.trim(),target:parseFloat(target)||10,current:0,unit:unit||""}]}}:t));
                      }}>+ Добавить метрику</button>
                    </div>
                  )}
                  {tool.type==="board"&&(
                    <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
                      {(tool.data?.columns||[]).map((col,ci)=>{
                        const colCards=(tool.state?.cards||{})[col.id||ci]||col.cards||[];
                        return (
                          <div key={col.id||ci} style={{minWidth:150,flex:1,background:"rgba(255,255,255,0.02)",borderRadius:10,padding:"10px 10px"}}>
                            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>{col.name}</div>
                            {colCards.map((card,cj)=>(
                              <div key={card.id||cj} style={{padding:"8px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8,marginBottom:6,fontSize:13,color:T.text1}}>
                                <div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                                  <span style={{flex:1}}>{card.text}</span>
                                  <div style={{display:"flex",gap:3,flexShrink:0}}>
                                    <div className="ico-btn" style={{fontSize:10,color:T.teal,padding:"1px 3px"}} onClick={()=>{
                                      const v=window.prompt("Изменить карточку:",card.text);
                                      if(v&&v.trim()) setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,cards:{...(t.state?.cards||{}),[col.id||ci]:colCards.map((c,k)=>k===cj?{...c,text:v.trim()}:c)}}}:t));
                                    }}>✏️</div>
                                    <div className="ico-btn danger" style={{fontSize:10,padding:"1px 3px"}} onClick={()=>{
                                      setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,cards:{...(t.state?.cards||{}),[col.id||ci]:colCards.filter((_,k)=>k!==cj)}}}:t));
                                    }}>✕</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" style={{width:"100%",fontSize:11,marginTop:4,border:"1px dashed rgba(200,164,90,0.3)"}} onClick={()=>{
                              const text=window.prompt("Текст карточки:");
                              if(text&&text.trim()) setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,cards:{...(t.state?.cards||{}),[col.id||ci]:[...colCards,{id:"c-"+Date.now(),text:text.trim()}]}}}:t));
                            }}>+ Добавить</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {tool.type==="timer"&&(()=>{
                    const d=tool.data||{workMin:25,breakMin:5,sessions:0,goal:4};
                    const sessions=(tool.state?.sessions||0);
                    const isRunning=(tool.state?.running||false);
                    const timeLeft=(tool.state?.timeLeft??d.workMin*60);
                    const isBreak=(tool.state?.isBreak||false);
                    const mm=String(Math.floor(timeLeft/60)).padStart(2,"0");
                    const ss=String(timeLeft%60).padStart(2,"0");
                    return (
                      <div style={{textAlign:"center",padding:"10px 0"}}>
                        <div style={{fontSize:10,color:isBreak?T.success:T.gold,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:8}}>
                          {isBreak?"☕ ПЕРЕРЫВ":"🎯 ФОКУС"}
                        </div>
                        <div style={{fontSize:56,fontFamily:"'JetBrains Mono'",color:T.text0,fontWeight:700,letterSpacing:4,marginBottom:12}}>
                          {mm}:{ss}
                        </div>
                        <div style={{fontSize:12,color:T.text3,marginBottom:16}}>
                          Сессий: {sessions}/{d.goal||4}
                        </div>
                        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                          <button className="btn btn-primary btn-sm" onClick={()=>{
                            if(isRunning){
                              setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,running:false}}:t));
                            } else {
                              setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,running:true}}:t));
                              const tick=setInterval(()=>{
                                setWorkTools(prev=>{
                                  const cur=prev.find(t=>t.id===tool.id);
                                  if(!cur||!cur.state?.running){clearInterval(tick);return prev;}
                                  const left=(cur.state.timeLeft??d.workMin*60)-1;
                                  if(left<=0){
                                    clearInterval(tick);
                                    const nowBreak=!cur.state.isBreak;
                                    const newSessions=cur.state.isBreak?cur.state.sessions:(cur.state.sessions||0)+1;
                                    if(Notification.permission==="granted") new Notification(nowBreak?"☕ Перерыв!":"🎯 Фокус!", {body:nowBreak?"Хорошая работа! Отдохни.":"Вперёд!"});
                                    return prev.map(t=>t.id===tool.id?{...t,state:{...t.state,running:false,isBreak:nowBreak,sessions:newSessions,timeLeft:nowBreak?d.breakMin*60:d.workMin*60}}:t);
                                  }
                                  return prev.map(t=>t.id===tool.id?{...t,state:{...t.state,timeLeft:left}}:t);
                                });
                              },1000);
                            }
                          }}>{isRunning?"⏸ Пауза":"▶ Старт"}</button>
                          <button className="btn btn-ghost btn-sm" onClick={()=>setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,running:false,timeLeft:d.workMin*60,isBreak:false}}:t))}>↺ Сброс</button>
                        </div>
                      </div>
                    );
                  })()}
                  {tool.type==="planner"&&(
                    <div>
                      <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>ПЛАН ДНЯ</div>
                      {(tool.data?.slots||[]).map((slot,i)=>{
                        const done=(tool.state?.slotDone||{})[i];
                        return (
                          <div key={i} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"center",opacity:done?0.5:1}}>
                            <div className={"chk"+(done?" done":"")} style={{width:18,height:18,fontSize:10,flexShrink:0}}
                              onClick={()=>setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,state:{...t.state,slotDone:{...(t.state?.slotDone||{}),[i]:!done}}}:t))}>
                              {done?"✓":""}
                            </div>
                            <span style={{fontSize:12,color:T.gold,fontFamily:"'JetBrains Mono'",flexShrink:0,minWidth:45}}>{slot.time}</span>
                            <span style={{flex:1,fontSize:13,color:T.text1,textDecoration:done?"line-through":"none"}}>{slot.activity}</span>
                            <span style={{fontSize:11,color:T.text3,flexShrink:0}}>{slot.duration}</span>
                            {/* Редактировать слот */}
                            <div className="ico-btn" style={{fontSize:11,color:T.teal,padding:"1px 4px",flexShrink:0}} onClick={()=>{
                              const time=window.prompt("Время (ЧЧ:ММ):",slot.time);
                              if(!time) return;
                              const activity=window.prompt("Активность:",slot.activity);
                              if(!activity) return;
                              const duration=window.prompt("Длительность:",slot.duration||"");
                              setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,data:{...t.data,slots:t.data.slots.map((s,j)=>j===i?{...s,time:time.trim(),activity:activity.trim(),duration:duration||s.duration}:s)}}:t));
                            }}>✏️</div>
                            {/* Удалить слот */}
                            <div className="ico-btn danger" style={{fontSize:11,padding:"1px 4px",flexShrink:0}} onClick={()=>{
                              setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,data:{...t.data,slots:t.data.slots.filter((_,j)=>j!==i)}}:t));
                            }}>✕</div>
                          </div>
                        );
                      })}
                      {/* Добавить слот */}
                      <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:8,fontSize:11,border:"1px dashed rgba(200,164,90,0.3)"}} onClick={()=>{
                        const time=window.prompt("Время (ЧЧ:ММ):");
                        if(!time) return;
                        const activity=window.prompt("Активность:");
                        if(!activity) return;
                        const duration=window.prompt("Длительность (например: 30 мин):");
                        setWorkTools(p=>p.map(t=>t.id===tool.id?{...t,data:{...t.data,slots:[...(t.data.slots||[]),{time:time.trim(),activity:activity.trim(),duration:duration||""}].sort((a,b)=>a.time.localeCompare(b.time))}}:t));
                      }}>+ Добавить блок</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ВКЛАДКА: ОТЧЁТНОСТЬ ── */}
      {workTab==="reports"&&<div>

      {isAccountant&&<div>

      {/* ── НА ЭТОЙ НЕДЕЛЕ ── */}
      {(()=>{
        const todayD = new Date(); todayD.setHours(0,0,0,0);
        const weekStart = new Date(todayD);
        const dow = todayD.getDay()===0?6:todayD.getDay()-1;
        weekStart.setDate(todayD.getDate()-dow);
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
        const weekStr = d=>d.toISOString().split("T")[0];

        const weekReports = enabledReports.filter(r=>{
          if(r.status==="done") return false;
          const d = new Date(r.deadline); d.setHours(0,0,0,0);
          return d>=weekStart && d<=weekEnd;
        }).sort((a,b)=>a.deadline.localeCompare(b.deadline));

        const reportItems = weekReports.filter(r=>r.group!=="pay");
        const payItems    = weekReports.filter(r=>r.group==="pay");

        return (
          <div style={{marginBottom:12}}>
            <div onClick={()=>setWeekOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,cursor:"pointer",background:weekReports.length>0?"rgba(232,120,120,0.08)":"rgba(255,255,255,0.02)",border:"1px solid "+(weekReports.length>0?"rgba(232,120,120,0.3)":"rgba(255,255,255,0.06)")}}>
              <span style={{fontSize:18}}>📅</span>
              <span style={{flex:1,fontSize:15,fontFamily:"'Crimson Pro',serif",color:weekReports.length>0?T.danger:T.text2}}>
                На этой неделе
              </span>
              {weekReports.length>0&&<span style={{fontSize:11,color:T.danger,fontFamily:"'JetBrains Mono'",background:"rgba(232,120,120,0.15)",padding:"1px 8px",borderRadius:8}}>{weekReports.length}</span>}
              <span style={{fontSize:12,color:T.text3}}>{weekOpen?"▲":"▼"}</span>
            </div>
            {weekOpen&&(
              <div style={{marginTop:6,padding:"8px 14px",background:"rgba(255,255,255,0.01)",borderRadius:"0 0 12px 12px",border:"1px solid rgba(255,255,255,0.05)",borderTop:"none"}}>
                {weekReports.length===0&&<div style={{fontSize:14,color:T.text3,fontStyle:"italic",padding:"8px 0"}}>На этой неделе дедлайнов нет ✦</div>}
                {weekReports.map(r=>{
                  const days=Math.ceil((new Date(r.deadline).setHours(0,0,0,0)-todayD)/86400000);
                  const g=reportGroups.find(x=>x.id===r.group)||{icon:"📋",color:T.text3};
                  return (
                    <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <span style={{fontSize:16}}>{g.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,color:r.status==="done"?T.text3:T.text0,textDecoration:r.status==="done"?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                        <div style={{display:"flex",gap:6,marginTop:2}}>
                          <span style={{fontSize:10,color:days===0?T.danger:days===1?"#E8A85A":T.text3,fontFamily:"'JetBrains Mono'"}}>
                            {days===0?"📍 Сегодня":days===1?"⚠ Завтра":"📅 "+new Date(r.deadline).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
                          </span>
                          {r.status==="ready"&&<span style={{fontSize:10,color:T.teal}}>✓ Подготовлен</span>}
                        </div>
                      </div>
                      <div className={"chk"+(r.status==="done"?" done":"")} style={{width:20,height:20,fontSize:11,flexShrink:0}} onClick={()=>toggleDone(r.id)}>{r.status==="done"?"✓":""}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── ОТЧЁТНОСТЬ: Ближайшие ── */}
      {(upcoming.length>0||overdue.length>0)&&(
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:6}}>БЛИЖАЙШИЕ ОТЧЁТЫ (7 ДНЕЙ)</div>
          <div className="card" style={{padding:"4px 14px"}}>
            {upcoming.map(r=><ReportRow key={r.id} r={r} showGroup={true}/>)}
            {upcoming.length===0&&<div style={{fontSize:14,color:T.text3,fontStyle:"italic",padding:"8px 0"}}>Нет отчётов в ближайшие 7 дней</div>}
          </div>
        </div>
      )}

      {/* Просроченные */}
      {overdue.length>0&&(
        <details style={{marginBottom:12}}>
          <summary style={{fontSize:10,color:T.danger,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,cursor:"pointer",padding:"6px 0"}}>⚠ ПРОСРОЧЕННЫЕ ({overdue.length})</summary>
          <div className="card" style={{padding:"4px 14px",marginTop:6,border:"1px solid rgba(232,85,109,0.25)"}}>
            {overdue.map(r=><ReportRow key={r.id} r={r} showGroup={true}/>)}
          </div>
        </details>
      )}

      {/* Выполненные */}
      {done.length>0&&(
        <details style={{marginBottom:12}}>
          <summary style={{fontSize:10,color:T.success,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,cursor:"pointer",padding:"6px 0"}}>✅ ВЫПОЛНЕННЫЕ ({done.length})</summary>
          <div className="card" style={{padding:"4px 14px",marginTop:6,opacity:.7}}>
            {done.slice(0,20).map(r=><ReportRow key={r.id} r={r} showGroup={true}/>)}
          </div>
        </details>
      )}

      {/* ── Разделы отчётности — вертикально ── */}
      <div onClick={()=>setGroupsOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:groupsOpen?8:4,marginTop:4}}>
        <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,flex:1}}>ВСЕ РАЗДЕЛЫ</div>
        <span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{reportGroups.length}</span>
        <span style={{fontSize:11,color:T.text3}}>{groupsOpen?"▲":"▼"}</span>
      </div>
      {groupsOpen&&reportGroups.map(g=>{
        const groupReports = reports.filter(r=>r.group===g.id&&r.enabled!==false);
        const pendingCount = groupReports.filter(r=>r.status!=="done").length;
        const isOpen = activeGroup===g.id;
        return (
          <div key={g.id} style={{marginBottom:8}}>
            <div onClick={()=>setActiveGroup(isOpen?null:g.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,cursor:"pointer",background:isOpen?"rgba(200,164,90,0.1)":"rgba(255,255,255,0.02)",border:"1px solid "+(isOpen?g.color+"55":"rgba(255,255,255,0.06)"),transition:"all .15s"}}>
              <span style={{fontSize:22}}>{g.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontFamily:"'Crimson Pro',serif",color:isOpen?g.color:T.text0}}>{g.name}</div>
                {pendingCount>0&&<div style={{fontSize:11,color:T.text3}}>Активных: {pendingCount}</div>}
              </div>
              <button className="btn-mini" style={{padding:"3px 8px",fontSize:11,zIndex:1}} onClick={e=>{e.stopPropagation();if(g.id==="kgd"||g.id==="bns"||g.id==="eaes"){setShowFormPicker(g.id);}else{setAddReportModal({groupId:g.id});}}} title="Добавить отчёт">+</button>
              <button className="btn-mini" style={{padding:"3px 7px",fontSize:11,zIndex:1,color:"#E87878",borderColor:"rgba(232,120,120,0.3)"}} onClick={e=>{e.stopPropagation();if(window.confirm('Удалить раздел "'+g.name+'" и все его отчёты?')){setReportGroups(p=>p.filter(x=>x.id!==g.id));setReports(p=>p.filter(r=>r.group!==g.id));setActiveGroup(null);}}} title="Удалить раздел">✕</button>
              <span style={{fontSize:12,color:T.text3}}>{isOpen?"▲":"▼"}</span>
            </div>
            {isOpen&&(
              <div style={{borderRadius:"0 0 12px 12px",border:"1px solid "+g.color+"33",borderTop:"none",background:"rgba(255,255,255,0.01)"}}>
                {/* Список отчётов группы */}
                <div style={{padding:"4px 14px 10px"}}>
                  {groupReports.length===0&&<div style={{fontSize:13,color:T.text3,fontStyle:"italic",padding:"10px 0"}}>Нет отчётов. Нажми «+» для добавления.</div>}
                  {(g.id==="kgd"||g.id==="bns"||g.id==="eaes")&&<button className="btn btn-ghost btn-sm" style={{marginBottom:8,width:"100%",fontSize:12,border:"1px dashed rgba(200,164,90,0.3)"}} onClick={()=>setShowFormPicker(g.id)}>📋 Выбрать формы из календаря</button>}
                  {groupReports.map(r=><ReportRow key={r.id} r={r}/>)}
                </div>
                {/* Быстрые шаблоны из системного календаря */}
                {(()=>{
                  const templates = KGD_CALENDAR.filter(t=>t.group===g.id&&!reports.find(r=>r.name===t.name&&r.group===g.id));
                  if(!templates.length) return null;
                  return (
                    <div style={{padding:"8px 14px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>ДОБАВИТЬ ИЗ КАЛЕНДАРЯ</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {templates.slice(0,8).map((t,i)=>(
                          <div key={i} onClick={()=>setReports(p=>[...p,{...t,id:"sys-"+Date.now()+i,status:"pending",amount:"",notes:"",enabled:true,createdAt:new Date().toISOString()}])} style={{padding:"4px 10px",borderRadius:16,background:g.color+"15",border:"1px solid "+g.color+"33",cursor:"pointer",fontSize:11,color:g.color}}>
                            + {t.name.replace(/\s*—.*$/,"").trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
      {/* Создать раздел (только если раскрыто) */}
      {groupsOpen&&<button className="btn btn-ghost btn-sm" style={{width:"100%",marginBottom:12,fontSize:12,border:"1px dashed rgba(200,164,90,0.3)"}} onClick={()=>setAddGroupModal(true)}>+ Создать раздел</button>}

      {/* ── Задачи по работе — сворачиваемые ── */}
      {(workTasks.length>0||true)&&(
        <div style={{marginBottom:12}}>
          {/* Заголовок */}
          <div onClick={()=>setTasksOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:tasksOpen?"12px 12px 0 0":"12px",cursor:"pointer",background:"rgba(78,201,190,0.06)",border:"1px solid rgba(78,201,190,0.15)",transition:"all .15s"}}>
            <span style={{fontSize:16}}>📋</span>
            <span style={{flex:1,fontSize:14,fontFamily:"'Crimson Pro',serif",color:T.teal,fontWeight:500}}>Задачи</span>
            {workTasks.length>0&&(
              <span style={{fontSize:10,color:T.teal,fontFamily:"'JetBrains Mono'",background:"rgba(78,201,190,0.1)",padding:"1px 7px",borderRadius:10}}>
                {workTasks.filter(t=>t.doneDate===today).length}/{workTasks.length}
              </span>
            )}
            <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
              {workTasks.some(t=>t.doneDate===today)&&(
                <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:"2px 6px",color:T.text3}}
                  onClick={()=>{if(window.confirm("Сбросить выполненные?"))setTasks(p=>p.map(t=>t.section==="work"&&!t.isDeadline&&t.doneDate===today?{...t,doneDate:null}:t));notify("Сброшено");}}>↩</button>
              )}
              <button className="btn btn-ghost btn-sm" style={{fontSize:12,padding:"2px 8px",color:T.teal}}
                onClick={()=>setTaskModal({})}>+</button>
            </div>
            <span style={{fontSize:11,color:T.text3,marginLeft:4}}>{tasksOpen?"▲":"▼"}</span>
          </div>
          {/* Список задач — компактный */}
          {tasksOpen&&(
            <div style={{background:"rgba(255,255,255,0.01)",border:"1px solid rgba(78,201,190,0.1)",borderTop:"none",borderRadius:"0 0 12px 12px",padding:"4px 0"}}>
              {workTasks.length===0&&(
                <div style={{padding:"12px 14px",fontSize:13,color:T.text3,fontStyle:"italic",textAlign:"center"}}>
                  Нет задач — нажми + чтобы добавить
                </div>
              )}
              {workTasks.map(task=>{
                const done = task.doneDate===today;
                const hasExtra = task.deadline||task.notes;
                return (
                  <div key={task.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                    <div className={"chk"+(done?" done":"")} style={{width:18,height:18,fontSize:11,flexShrink:0}}
                      onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,doneDate:done?null:today,lastDone:done?t.lastDone:today}:t))}>
                      {done?"✓":""}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,color:done?T.text3:T.text0,textDecoration:done?"line-through":"none",lineHeight:1.4}}>
                        {task.title}
                      </div>
                      {/* Мета — только если есть */}
                      {(task.preferredTime||hasExtra)&&(
                        <div style={{display:"flex",gap:6,marginTop:1,flexWrap:"wrap"}}>
                          {task.preferredTime&&<span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}>🕐{task.preferredTime}</span>}
                          {task.deadline&&<span style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono'"}}>📅{new Date(task.deadline).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</span>}
                          {task.notes&&<span style={{fontSize:10,color:T.text3,fontStyle:"italic"}}>{task.notes}</span>}
                        </div>
                      )}
                    </div>
                    <div className="ico-btn" style={{fontSize:11,padding:"2px 4px",flexShrink:0}} onClick={()=>setTaskModal(task)}>✏️</div>
                    <div className="ico-btn danger" style={{fontSize:11,padding:"2px 4px",flexShrink:0}} onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Советы по работе — сворачиваемые ── */}
      <div style={{marginBottom:12}}>
        <div onClick={()=>setAdviceOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:adviceOpen?"12px 12px 0 0":"12px",cursor:"pointer",background:"rgba(200,164,90,0.06)",border:"1px solid rgba(200,164,90,0.15)",transition:"all .15s"}}>
          <span style={{fontSize:16}}>💡</span>
          <span style={{flex:1,fontSize:14,fontFamily:"'Crimson Pro',serif",color:T.gold,fontWeight:500}}>Советы по работе</span>
          <span style={{fontSize:11,color:T.text3}}>{adviceOpen?"▲":"▼"}</span>
        </div>
        {adviceOpen&&(
          <div style={{border:"1px solid rgba(200,164,90,0.12)",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden"}}>
            <AiBox kb={kb} prompt={
              "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Никаких других языков.\n\n"+
              "Ты — профессиональный бизнес-консультант. Дай конкретные рекомендации на основе реального профиля пользователя.\n\n"+
              "ПРОФИЛЬ:\n"+
              "- Профессия: "+(profile.profession||"—")+"\n"+
              "- Должность/сфера: "+(profile.jobSphere||"—")+"\n"+
              "- Режим работы: "+(profile.workType||"—")+"\n"+
              "- График: "+(profile.workStart||"09:00")+"–"+(profile.workEnd||"18:00")+"\n"+
              "- Что вдохновляет в работе: "+(profile.workInspire||"—")+"\n"+
              "- Что истощает: "+((profile.workDrain||[]).join(", ")||"—")+"\n"+
              "- Стрессоры: "+((profile.stressors||[]).join(", ")||"—")+"\n"+
              "- Хронотип: "+(profile.chronotype||"—")+"\n"+
              "- Стиль планирования: "+(profile.planningStyle||"—")+"\n\n"+
              "ЗАДАЧА: дай 5 конкретных рекомендаций для повышения эффективности рабочего дня.\n\n"+
              "ПРАВИЛА:\n"+
              "— Каждый совет строго под этот профиль — профессию, режим, хронотип\n"+
              "— Если советуешь инструмент или метод — называй его точно (например: метод GTD, Pomodoro 25/5, матрица Эйзенхауэра)\n"+
              "— Если ссылаешься на исследование или источник — указывай его\n"+
              "— Никаких общих фраз типа «будь продуктивнее» или «расставляй приоритеты»\n"+
              "— Учитывай что истощает — не советуй то, что усугубит проблему\n\n"+
              "ФОРМАТ: нумерованный список 1-5. Каждый пункт: [Метод/инструмент] Конкретное действие. Почему подходит именно тебе: 1 предложение."
            } label="Советы по работе" btnText="Получить рекомендации" placeholder="Анализирую профиль и даю конкретные рекомендации..." onCreateTool={createTool}/>
          </div>
        )}
      </div>

      </div>}{/* конец isAccountant */}
      </div>}{/* конец workTab===reports */}

      {/* ── Модалки (вне вкладок) ── */}
      {/* ── Модалка добавления отчёта ── */}
      {addReportModal&&(()=>{
        const g = reportGroups.find(g=>g.id===addReportModal.groupId)||{name:"",color:T.gold,icon:"📋"};
        return (
          <div className="overlay" onClick={()=>{setAddReportModal(null);setNewReport({name:"",deadline:"",period:"quarter",amount:"",notes:""});}}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <span className="modal-x" onClick={()=>{setAddReportModal(null);setNewReport({name:"",deadline:"",period:"quarter",amount:"",notes:""});}}>✕</span>
              <div className="modal-title">{g.icon} {g.name} — добавить отчёт</div>
              <div className="fld"><label>Название отчёта</label><input value={newReport.name} onChange={e=>setNewReport(p=>({...p,name:e.target.value}))} placeholder="Например: ФНО 910.00"/></div>
              <div className="fld"><label>Срок сдачи</label><input type="date" value={newReport.deadline} onChange={e=>setNewReport(p=>({...p,deadline:e.target.value}))}/></div>
              <div className="fld"><label>Периодичность</label>
                <select value={newReport.period} onChange={e=>setNewReport(p=>({...p,period:e.target.value}))} style={{width:"100%",padding:"8px",borderRadius:8,border:"1px solid "+T.bdr,background:T.bg1,color:T.text0,fontSize:14}}>
                  <option value="monthly">Ежемесячно</option>
                  <option value="quarter">Ежеквартально</option>
                  <option value="semi">Раз в полгода</option>
                  <option value="annual">Ежегодно</option>
                  <option value="once">Разово</option>
                </select>
              </div>
              {addReportModal.groupId==="pay"&&<div className="fld"><label>Сумма платежа</label><input value={newReport.amount} onChange={e=>setNewReport(p=>({...p,amount:e.target.value}))} placeholder="0 ₸"/></div>}
              <div className="fld"><label>Заметки</label><input value={newReport.notes} onChange={e=>setNewReport(p=>({...p,notes:e.target.value}))} placeholder="Статья НК, особенности..."/></div>
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={()=>{setAddReportModal(null);setNewReport({name:"",deadline:"",period:"quarter",amount:"",notes:""});}}>Отмена</button>
                <button className="btn btn-primary" onClick={()=>{
                  if(!newReport.name){notify("Введи название");return;}
                  setReports(p=>[...p,{...newReport,id:"u-"+Date.now(),group:addReportModal.groupId,enabled:true,status:"pending",createdAt:new Date().toISOString()}]);
                  setAddReportModal(null);
                  setNewReport({name:"",deadline:"",period:"quarter",amount:"",notes:""});
                  notify("Добавлено ✦");
                }}>Добавить</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Модалка редактирования отчёта */}
      {editReport&&(()=>{
        const g = reportGroups.find(g=>g.id===editReport.group)||{name:"",color:T.gold,icon:"📋"};
        const save = () => {
          setReports(p=>p.map(r=>r.id===editReport.id?editReport:r));
          setEditReport(null);
          notify("Сохранено");
        };
        return (
          <div className="overlay" onClick={()=>setEditReport(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <span className="modal-x" onClick={()=>setEditReport(null)}>✕</span>
              <div className="modal-title">{g.icon} Редактировать отчёт</div>
              <div className="fld"><label>Название</label><input value={editReport.name} onChange={e=>setEditReport(p=>({...p,name:e.target.value}))}/></div>
              <div className="fld"><label>Срок сдачи</label><input type="date" value={editReport.deadline} onChange={e=>setEditReport(p=>({...p,deadline:e.target.value}))}/></div>
              <div className="fld"><label>Периодичность</label>
                <select value={editReport.period||"quarter"} onChange={e=>setEditReport(p=>({...p,period:e.target.value}))} style={{width:"100%",padding:"8px",borderRadius:8,border:"1px solid "+T.bdr,background:T.bg1,color:T.text0,fontSize:14}}>
                  <option value="monthly">Ежемесячно</option>
                  <option value="quarter">Ежеквартально</option>
                  <option value="semi">Раз в полгода</option>
                  <option value="annual">Ежегодно</option>
                  <option value="once">Разово</option>
                </select>
              </div>
              <div className="fld"><label>Сумма (для платежей)</label><input value={editReport.amount||""} onChange={e=>setEditReport(p=>({...p,amount:e.target.value}))} placeholder="0 ₸"/></div>
              <div className="fld"><label>Заметки</label><input value={editReport.notes||""} onChange={e=>setEditReport(p=>({...p,notes:e.target.value}))}/></div>
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={()=>setEditReport(null)}>Отмена</button>
                <button className="btn btn-primary" onClick={save}>Сохранить</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Модалка создания раздела */}
      {addGroupModal&&(
        <div className="overlay" onClick={()=>setAddGroupModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <span className="modal-x" onClick={()=>setAddGroupModal(false)}>✕</span>
            <div className="modal-title">Новый раздел отчётности</div>
            <div className="fld"><label>Название</label><input value={newGroup.name} onChange={e=>setNewGroup(p=>({...p,name:e.target.value}))} placeholder="Например: Лизинг"/></div>
            <div className="fld-row">
              <div className="fld"><label>Иконка</label><input value={newGroup.icon} onChange={e=>setNewGroup(p=>({...p,icon:e.target.value}))} maxLength={2} placeholder="📄"/></div>
              <div className="fld"><label>Цвет</label><input type="color" value={newGroup.color} onChange={e=>setNewGroup(p=>({...p,color:e.target.value}))}/></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setAddGroupModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={()=>{
                if(!newGroup.name) return notify("Введи название");
                setReportGroups(p=>[...p,{...newGroup,id:"g-"+Date.now()}]);
                setAddGroupModal(false);
                setNewGroup({name:"",icon:"📝",color:"#A8A49C"});
                notify("Раздел создан");
              }}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Модалка выбора форм из календаря ── */}
      {showFormPicker&&(()=>{
        const g = reportGroups.find(x=>x.id===showFormPicker)||{name:"",icon:"📋",color:T.gold};
        const forms = showFormPicker==="kgd"?KGD_FORMS:showFormPicker==="bns"?BNS_FORMS:showFormPicker==="eaes"?EAES_FORMS:[];
        const existingNames = new Set(reports.filter(r=>r.group===showFormPicker).map(r=>r.name));
        const year = new Date().getFullYear();
        const toggleForm = (fid) => setSelectedForms(p=>({...p,[fid]:!p[fid]}));
        const addSelected = () => {
          const toAdd = forms.filter(f=>selectedForms[f.id]&&!existingNames.has(f.name));
          if(!toAdd.length){notify("Выбери формы"); return;}
          const newReports = toAdd.map(f=>{
            // Вычислить deadline
            let dl = year+"-"+(f.deadline_month||"12")+"-"+(f.deadline_day||"25");
            if(f.next_year) dl = (year+1)+"-"+(f.deadline_month||"03")+"-"+(f.deadline_day||"31");
            return {
              id:"sys-"+f.id+"-"+Date.now()+Math.random().toString(36).slice(2),
              group:showFormPicker, name:f.name, period:f.period, deadline:dl,
              status:"pending", amount:"", notes:"", enabled:true,
              createdAt:new Date().toISOString()
            };
          });
          setReports(p=>[...p,...newReports]);
          setSelectedForms({});
          setShowFormPicker(null);
          notify("Добавлено "+newReports.length+" форм");
        };
        return (
          <div className="overlay" onClick={()=>setShowFormPicker(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()} style={{maxHeight:"85vh",overflowY:"auto"}}>
              <span className="modal-x" onClick={()=>setShowFormPicker(null)}>✕</span>
              <div className="modal-title">{g.icon} {g.name} — выбери формы</div>
              <div style={{fontSize:12,color:T.text3,marginBottom:12}}>Отметь формы которые сдаёт твоя организация. Сроки подставятся автоматически по календарю КЗ {year}.</div>
              {forms.map(f=>{
                const already = existingNames.has(f.name);
                return (
                  <div key={f.id} onClick={()=>!already&&toggleForm(f.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:already?"default":"pointer",opacity:already?0.5:1}}>
                    <div style={{width:20,height:20,borderRadius:4,border:"1px solid "+(selectedForms[f.id]?g.color:T.bdr),background:selectedForms[f.id]?g.color+"33":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:g.color,flexShrink:0}}>
                      {already?"✓":selectedForms[f.id]?"✓":""}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,color:already?T.text3:T.text0}}>{f.name}</div>
                      <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{({monthly:"Ежемесячно",quarter:"Ежеквартально",semi:"Раз в полгода",annual:"Ежегодно"}[f.period])||f.period} · до {f.deadline_day} числа</div>
                    </div>
                    {already&&<span style={{fontSize:10,color:T.success}}>уже добавлена</span>}
                  </div>
                );
              })}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button className="btn btn-ghost" onClick={()=>setShowFormPicker(null)}>Отмена</button>
                <button className="btn btn-primary" onClick={addSelected}>Добавить выбранные</button>
              </div>
            </div>
          </div>
        );
      })()}

            {taskModal!==null&&<TaskModal task={taskModal.id?taskModal:null} defaultSection="work" onSave={t=>{setTasks(p=>taskModal.id?p.map(x=>x.id===t.id?t:x):[...p,t]);notify(taskModal.id?"Обновлено":"Добавлено");}} onClose={()=>setTaskModal(null)}/>}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════════════════════════════
function HealthSection({profile,tasks,setTasks,setShopList,today,kb,notify}) {
  const gp = genderPrompt(profile);
  const [modal,setModal]=useState(null);
  const [healthTab,setHealthTab]=useState("today"); // today | menu | goal
  const [weekMenu,setWeekMenu]=useState(()=>{try{return JSON.parse(localStorage.getItem("ld_week_menu")||"null");}catch{return null;}});
  const [menuLoading,setMenuLoading]=useState(false);
  const moon=getMoon();
  const moonN=moon.n; const moonT=moon.t;
  const season=(()=>{const m=new Date().getMonth();return m<2||m>10?"зима":m<5?"весна":m<8?"лето":"осень";})();
  const healthTasks=tasks.filter(t=>t.section==="health");
  const due=healthTasks.filter(t=>isDue(t,today));

  // Есть ли цель связанная с весом/здоровьем?
  const hasWeightGoal = (profile.mainGoal||"").toLowerCase().match(/похуде|вес|фигур|набрать|сбросить|стройн/)||
    (profile.healthGoal||"").toLowerCase().match(/похуде|вес|фигур|набрать|сбросить/);
  const hasHealthGoal = (profile.goalAreas||[]).some(a=>["Здоровье","Внешность"].includes(a));

  // Генерация недельного меню
  const generateMenu = async () => {
    setMenuLoading(true);
    const tcm = getTCMFullProfile(profile);
    const familySize = parseInt(profile.familySize||"1");
    const weightGoalNote = hasWeightGoal
      ? "ПРИОРИТЕТ — цель по весу: "+profile.mainGoal+". Дефицит ~300-500 ккал. Высокий белок, много овощей, минимум простых углеводов. Указывай калорийность каждого блюда."
      : "";
    const prompt =
      "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Отвечай ТОЛЬКО валидным JSON без markdown.\n\n"+
      "Составь меню питания на 7 дней с учётом:\n"+
      "- Тип питания: "+(profile.nutrition||"обычное")+"\n"+
      "- Цель здоровья: "+(profile.healthGoal||"—")+"\n"+
      "- Главная цель: "+(profile.mainGoal||"—")+"\n"+
      (weightGoalNote?weightGoalNote+"\n":"")+
      "- Зоны здоровья: "+((profile.healthFocus||[]).join(", ")||"—")+"\n"+
      "- ТКМ стихия: "+(tcm?.el?.name||"—")+", органы: "+(tcm?.el?.organ||"—")+", вкус: "+(tcm?.el?.taste||"—")+"\n"+
      "- Продукты дома: "+((profile.staples||[]).join(", ")||"—")+"\n"+
      "- Сезон: "+season+", луна: "+moonN+"\n"+
      "- Порции на: "+familySize+" чел.\n\n"+
      "Формат ответа — строго JSON:\n"+
      '{\n'+
      '  "days": [\n'+
      '    {\n'+
      '      "day": "Понедельник",\n'+
      '      "meals": [\n'+
      '        {\n'+
      '          "type": "Завтрак",\n'+
      '          "name": "Название блюда",\n'+
      '          "ingredients": [{"name":"Продукт","amount":"100г"}],\n'+
      '          "why": "Почему полезно для этого профиля — 1-2 предложения",\n'+
      '          "calories": 350\n'+
      '        }\n'+
      '      ]\n'+
      '    }\n'+
      '  ]\n'+
      '}\n\n'+
      "7 дней (Пн-Вс), 3 приёма в день (Завтрак/Обед/Ужин). Блюда конкретные, простые в приготовлении.";

    try {
      const raw = await askClaude(kb, prompt, 4000);
      const cleaned = raw.replace(/```json|```/g,"").trim();
      const data = JSON.parse(cleaned);
      setWeekMenu(data);
      try{localStorage.setItem("ld_week_menu", JSON.stringify(data));}catch{}
      notify("Меню на неделю составлено ✦");
    } catch(e) {
      notify("Ошибка генерации меню — попробуй ещё раз");
    }
    setMenuLoading(false);
  };

  const addIngredientsToShop = (meal) => {
    if(!meal.ingredients?.length) return;
    setShopList(p=>{
      const existing = p.map(i=>i.name.toLowerCase());
      const newItems = meal.ingredients
        .filter(ing=>!existing.includes(ing.name.toLowerCase()))
        .map(ing=>({id:Date.now()+Math.random(),name:ing.name+" ("+ing.amount+")",done:false,cat:"Продукты"}));
      notify(newItems.length>0?"Добавлено "+newItems.length+" продуктов":"Все продукты уже в списке");
      return [...p,...newItems];
    });
  };

  const autoHealth=()=>{
    const items=[];
    if((profile.sport||[]).length>0)items.push({title:profile.sport[0],freq:"weekly:1,3,5",priority:"m"});
    if((profile.practices||[]).includes("Медитация"))items.push({title:"Медитация 10–15 мин",freq:"daily",priority:"m",preferredTime:profile.wake});
    if((profile.practices||[]).includes("Цигун"))items.push({title:"Практика цигун",freq:"daily",priority:"m"});
    items.push({title:"8 стаканов воды",freq:"daily",priority:"l"});
    if((profile.healthFocus||[]).includes("Суставы и спина"))items.push({title:"Зарядка для спины",freq:"daily",priority:"m"});
    return items.map(t=>({...t,id:Date.now()+Math.random(),section:"health",lastDone:"",doneDate:"",notes:""}));
  };

  const DAYS_RU = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
  const MEAL_ICONS = {"Завтрак":"🌅","Обед":"☀️","Ужин":"🌙"};
  const [openDay,setOpenDay]=useState(0);
  const [openMeal,setOpenMeal]=useState(null);

  return(
    <div>
      {/* Шапка */}
      <div className="card card-accent">
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8}}>
          {(profile.healthFocus||[]).map(h=><span key={h} className="badge bgr">{h}</span>)}
          {profile.chronic&&<span className="badge bw">⚠ {profile.chronic}</span>}
        </div>
        <div style={{fontSize:13,color:T.text3}}>Цель: {profile.healthGoal||"—"} · Питание: {profile.nutrition||"—"}</div>
        <div style={{marginTop:10,padding:"8px 13px",background:"rgba(78,201,190,.07)",borderRadius:9,fontSize:13,color:T.teal}}>🌙 {moon.n} — {moon.t}</div>
      </div>

      {/* Вкладки */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[
          {id:"today",label:"💚 Сегодня"},
          {id:"menu", label:"🍽 Меню на неделю"},
          ...(hasWeightGoal||hasHealthGoal?[{id:"goal",label:"🎯 Цель"}]:[]),
        ].map(tab=>(
          <button key={tab.id} onClick={()=>setHealthTab(tab.id)}
            style={{flex:1,padding:"7px 6px",borderRadius:10,border:"1px solid "+(healthTab===tab.id?T.success+"88":"rgba(255,255,255,0.08)"),
              background:healthTab===tab.id?"rgba(123,204,160,0.12)":"rgba(255,255,255,0.02)",
              color:healthTab===tab.id?T.success:T.text2,fontSize:12,cursor:"pointer",fontFamily:"'Crimson Pro',serif",transition:"all .15s"}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── ВКЛАДКА: СЕГОДНЯ ── */}
      {healthTab==="today"&&<div>
        {(()=>{
          const isMaleH = profile.gender==="Мужской";
          const malePrompt =
            "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Никаких общих фраз.\n\n"+
            "ПРОФИЛЬ МУЖЧИНЫ:\n"+
            "- Возраст: "+(profile.age||"—")+"\n"+
            "- Зоны здоровья: "+((profile.healthFocus||[]).join(", ")||"—")+"\n"+
            "- Хронические: "+(profile.chronic||"нет")+"\n"+
            "- Цель: "+(profile.healthGoal||"—")+"\n"+
            "- Питание: "+(profile.nutrition||"обычное")+"\n"+
            "- Спорт: "+((profile.sport||[]).join(", ")||"—")+"\n"+
            "- Свободное время: с "+(profile.workEnd||"18:00")+" до "+(profile.sleep||"23:00")+"\n"+
            "- Луна: "+moon.n+"("+moon.t+")\n\n"+
            "Дай 4 конкретные рекомендации для мужского здоровья:\n"+
            "1. [Питание] Конкретное блюдо или продукт для мужского здоровья — белок, тестостерон, энергия — название+состав+почему\n"+
            "2. [Тренировка] Конкретное упражнение или комплекс на сегодня (учти спорт из профиля) — название, подходы, время\n"+
            "3. [Восстановление] Конкретная техника восстановления под этот возраст и нагрузку — название + инструкция\n"+
            "4. [Профилактика] Одно действие под зоны здоровья и возраст — с названием и обоснованием\n\n"+
            "Для каждого пункта указывай источник если ссылаешься на исследование.";
          const femalePrompt =
            "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Никаких общих фраз.\n\n"+
            "ПРОФИЛЬ:\n"+
            "- Проблемные зоны здоровья: "+((profile.healthFocus||[]).join(", ")||"—")+"\n"+
            "- Хронические болезни: "+(profile.chronic||"нет")+"\n"+
            "- Цель по здоровью: "+(profile.healthGoal||"—")+"\n"+
            "- Питание: "+(profile.nutrition||"обычное")+"\n"+
            "- Практики: "+((profile.practices||[]).join(", ")||"—")+"\n"+
            "- Свободное время: с "+(profile.workEnd||"18:00")+" до "+(profile.sleep||"23:00")+"\n"+
            "- Луна: "+moon.n+"("+moon.t+")\n\n"+
            "Дай 3 конкретные рекомендации на сегодня:\n"+
            "1. [Питание] Конкретный рецепт или блюдо — название, состав, почему полезно для моих зон здоровья\n"+
            "2. [Практика] Конкретная техника 15-20 мин после "+(profile.workEnd||"18:00")+" — название, точные инструкции, длительность\n"+
            "3. [Профилактика] Одно конкретное действие под хронические/проблемные зоны — с названием метода и обоснованием\n\n"+
            "Для каждого пункта указывай источник если ссылаешься на исследование или методику.";
          return <AiBox kb={kb} prompt={isMaleH?malePrompt:femalePrompt}
            label={isMaleH?"Мужское здоровье":"Здоровье на сегодня"}
            btnText={isMaleH?"Советы для мужчин":"Советы по здоровью"}
            placeholder={isMaleH?"Анализирую профиль и даю рекомендации для мужского здоровья...":"Анализирую профиль и даю конкретные советы по здоровью..."}/>;
        })()}
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
              <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
            </div>
          ))}
        </div>
        {modal!==null&&<TaskModal task={modal.id?modal:null} defaultSection="health" onSave={t=>{setTasks(p=>modal.id?p.map(x=>x.id===t.id?t:x):[...p,t]);notify("Добавлено");}} onClose={()=>setModal(null)}/>}
      </div>}

      {/* ── ВКЛАДКА: МЕНЮ НА НЕДЕЛЮ ── */}
      {healthTab==="menu"&&<div>
        <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
          <div style={{flex:1,fontSize:13,color:T.text3,fontStyle:"italic"}}>
            {weekMenu?"Меню составлено с учётом ТКМ, профиля и "+(hasWeightGoal?"цели по весу":"питания"):"Нажми чтобы составить меню на 7 дней"}
          </div>
          <button className="btn btn-primary btn-sm" onClick={generateMenu} disabled={menuLoading}>
            {menuLoading?"⏳...":"✦ "+(weekMenu?"Обновить":"Составить меню")}
          </button>
        </div>
        {menuLoading&&<div style={{textAlign:"center",padding:30,color:T.text3}}>
          <div style={{fontSize:28,marginBottom:8}}>🍽</div>
          <div style={{fontSize:13,fontStyle:"italic"}}>Составляю персональное меню...</div>
        </div>}
        {weekMenu&&weekMenu.days&&(
          <div>
            {/* Дни недели — горизонтальные таблетки */}
            <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,marginBottom:12}}>
              {weekMenu.days.map((d,i)=>(
                <button key={i} onClick={()=>setOpenDay(i)}
                  style={{flexShrink:0,padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",
                    background:openDay===i?"rgba(200,164,90,0.2)":"rgba(255,255,255,0.04)",
                    border:"1px solid "+(openDay===i?T.gold+"88":"transparent"),
                    color:openDay===i?T.gold:T.text2,transition:"all .15s",fontFamily:"'JetBrains Mono'"}}>
                  {d.day.slice(0,2).toUpperCase()}
                </button>
              ))}
            </div>
            {/* Блюда выбранного дня */}
            {weekMenu.days[openDay]&&(
              <div>
                <div style={{fontSize:14,color:T.gold,fontFamily:"'Crimson Pro',serif",marginBottom:10,fontWeight:500}}>
                  {weekMenu.days[openDay].day}
                </div>
                {(weekMenu.days[openDay].meals||[]).map((meal,mi)=>{
                  const mKey = openDay+"-"+mi;
                  const isOpen = openMeal===mKey;
                  return (
                    <div key={mi} style={{marginBottom:8,borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
                      {/* Заголовок блюда */}
                      <div onClick={()=>setOpenMeal(isOpen?null:mKey)}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",
                          background:isOpen?"rgba(200,164,90,0.08)":"rgba(255,255,255,0.02)"}}>
                        <span style={{fontSize:20,flexShrink:0}}>{MEAL_ICONS[meal.type]||"🍴"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>{meal.type.toUpperCase()}</div>
                          <div style={{fontSize:15,color:T.text0,fontFamily:"'Crimson Pro',serif",fontWeight:500,marginTop:1}}>{meal.name}</div>
                        </div>
                        {meal.calories&&<span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",flexShrink:0}}>{meal.calories} ккал</span>}
                        <span style={{fontSize:12,color:T.text3}}>{isOpen?"▲":"▼"}</span>
                      </div>
                      {/* Детали блюда */}
                      {isOpen&&(
                        <div style={{padding:"12px 14px",background:"rgba(255,255,255,0.01)",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                          {/* Почему полезно */}
                          {meal.why&&(
                            <div style={{marginBottom:10,padding:"8px 10px",background:"rgba(123,204,160,0.08)",borderRadius:8,borderLeft:"2px solid "+T.success}}>
                              <div style={{fontSize:10,color:T.success,fontFamily:"'JetBrains Mono'",marginBottom:3}}>ПОЧЕМУ ПОЛЕЗНО</div>
                              <div style={{fontSize:13,color:T.text1,lineHeight:1.5}}>{meal.why}</div>
                            </div>
                          )}
                          {/* Состав */}
                          {(meal.ingredients||[]).length>0&&(
                            <div style={{marginBottom:10}}>
                              <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>СОСТАВ</div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                                {meal.ingredients.map((ing,ii)=>(
                                  <span key={ii} style={{fontSize:12,padding:"3px 8px",borderRadius:12,background:"rgba(255,255,255,0.05)",color:T.text2}}>
                                    {ing.name} <span style={{color:T.text3}}>{ing.amount}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Кнопка в список покупок */}
                          <button className="btn btn-ghost btn-sm" style={{width:"100%",fontSize:12,border:"1px solid rgba(200,164,90,0.3)"}}
                            onClick={()=>addIngredientsToShop(meal)}>
                            🛒 Добавить продукты в список покупок
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>}

      {/* ── ВКЛАДКА: ЦЕЛЬ ── */}
      {healthTab==="goal"&&(hasWeightGoal||hasHealthGoal)&&<div>
        <div style={{padding:"12px 14px",background:"rgba(232,120,120,0.08)",borderRadius:12,marginBottom:12,borderLeft:"3px solid #E87878"}}>
          <div style={{fontSize:10,color:"#E87878",fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>АКТИВНАЯ ЦЕЛЬ</div>
          <div style={{fontSize:15,color:T.text0,fontFamily:"'Crimson Pro',serif"}}>{profile.mainGoal||profile.healthGoal}</div>
        </div>
        {(()=>{
          const isMaleG = profile.gender==="Мужской";
          const goalPrompt =
            "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Никаких общих фраз.\n\n"+
            (isMaleG?"Мужчина работает":"Женщина работает")+" над целью: \""+( profile.mainGoal||profile.healthGoal)+"\"\n"+
            "Зоны: "+((profile.goalAreas||[]).join(", ")||"—")+"\n"+
            "Метрика: "+(profile.goalMetric||"—")+", дедлайн: "+(profile.goalDeadline||"—")+"\n"+
            "Питание: "+(profile.nutrition||"обычное")+"\n"+
            "Зоны здоровья: "+((profile.healthFocus||[]).join(", ")||"—")+"\n"+
            "Хронические: "+(profile.chronic||"нет")+"\n"+
            "График: "+(profile.workStart||"09:00")+"–"+(profile.workEnd||"18:00")+", сон до "+(profile.sleep||"23:00")+"\n"+
            (isMaleG?"Спорт: "+((profile.sport||[]).join(", ")||"—")+"\n":"Практики: "+((profile.practices||[]).join(", ")||"—")+"\n")+
            "\nДай 5 конкретных рекомендаций КАК достичь цели:\n"+
            "1. [Питание] Конкретное изменение в питании — что убрать/добавить с учётом "+(isMaleG?"мужского":"женского")+" организма\n"+
            "2. ["+(isMaleG?"Тренировка":"Движение")+"] Конкретный тип активности "+(isMaleG?"(силовые/кардио)":"(кардио/практики)")+" с расписанием\n"+
            "3. [Режим] Конкретное изменение в режиме дня под цель\n"+
            "4. [Трекинг] Как отслеживать прогресс — конкретный метод с цифрами\n"+
            "5. [Первый шаг] Одно конкретное действие сегодня\n\n"+
            "Учитывай пол и физиологические особенности при рекомендациях.";
          return <AiBox kb={kb} prompt={goalPrompt}
            label={isMaleG?"Как достичь цели (план для него)":"Как достичь цели"}
            btnText="Получить план"
            placeholder="Составляю персональный план достижения цели..."/>;
        })()}
      </div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  BEAUTY
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
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:10,marginBottom:10,flexWrap:"wrap"}}>
        {profile.homeType&&<span style={{fontSize:12,color:T.text2}}>🏠 {profile.homeType}{profile.homeArea?" "+profile.homeArea+"м²":""}</span>}
        {(profile.livesWith||[]).length>0&&<span style={{fontSize:12,color:T.text3}}>· {(profile.livesWith||[]).join(", ")}</span>}
        {(profile.cleanDays||[]).length>0&&<span style={{fontSize:12,color:T.gold,marginLeft:"auto"}}>🧹 {profile.cleanDays.join(", ")}</span>}
      </div>
      <AiBox kb={kb} prompt={
        "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Никаких общих фраз.\n\n"+
        "ПРОФИЛЬ:\n"+
        "- Тип жилья: "+(profile.homeType||"квартира")+", "+(profile.homeArea||"?")+"м²\n"+
        "- Живут: "+((profile.livesWith||[]).join(", ")||"я один(а)")+"\n"+
        "- Питомцы: "+((profile.pets||[]).map(p=>p.name).join(", ")||"нет")+"\n"+
        "- Дни уборки: "+((profile.cleanDays||[]).join(", ")||"—")+"\n"+
        "- Свободное время: с "+(profile.workEnd||"18:00")+" до "+(profile.sleep||"23:00")+"\n"+
        "- Стиль планирования: "+(profile.planningStyle||"—")+"\n\n"+
        "Дай 3 конкретные рекомендации по организации быта:\n"+
        "1. [Приоритет сегодня] Самое важное дело на сегодня с учётом расписания — конкретно что, когда, сколько времени\n"+
        "2. [Оптимизация] Конкретный метод или инструмент для этого жилья и состава семьи — название метода, как применить\n"+
        "3. [Система] Один конкретный шаг к поддержанию порядка — подходящий именно для "+(profile.planningStyle||"этого")+" стиля планирования\n\n"+
        "Учитывай что свободное время только после "+(profile.workEnd||"18:00")+"."
      } label="Быт и дом" btnText="Советы по быту" placeholder="Анализирую профиль и даю конкретные советы по организации быта..."/>
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


function ShoppingSection({profile,shopList,setShopList,kb,notify}) {
  const [newItem,setNewItem]=useState(""); const [newCat,setNewCat]=useState("Продукты");
  const cats=["Продукты","Бытовая химия","Уход","Для питомцев","Одежда","Аптека","Другое"];
  
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
      <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:10,marginBottom:10,alignItems:"center"}}>
        {profile.shopFreq&&<span style={{fontSize:12,color:T.text2}}>🛒 {profile.shopFreq}</span>}
        {profile.shopDay&&<span style={{fontSize:12,color:T.gold}}>· 📅 {profile.shopDay}</span>}
        {profile.familySize&&profile.familySize!=="1"&&<span style={{fontSize:12,color:T.text3,marginLeft:"auto"}}>👨‍👩‍👧 {profile.familySize} чел.</span>}
      </div>
      {/* Напоминание о дне закупки */}
      {(()=>{
        const days={"Пн":1,"Вт":2,"Ср":3,"Чт":4,"Пт":5,"Сб":6,"Вс":0};
        const todayDay=new Date().getDay();
        const shopDayNum=days[profile.shopDay];
        const isShopDay=shopDayNum!==undefined&&todayDay===shopDayNum;
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
          "Каждый товар начинай с метки [Продукты], [Бытовая химия], [Уход], [Для питомцев] или [Аптека]. "+
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
          const catEmoji = {"Продукты":"🥦","Бытовая химия":"🧼","Уход":"✨","Для питомцев":"🐾","Одежда":"👕","Аптека":"💊","Другое":"📦"}[cat] || "📦";
          const catColor = {"Продукты":"#7BCCA0","Бытовая химия":"#82AADD","Уход":"#E8A8C8","Для питомцев":"#E8A85A","Одежда":"#B882E8","Аптека":T.danger,"Другое":"#A8A49C"}[cat] || "#A8A49C";
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


function PetsSection({profile,setProfile,petLog,setPetLog,today,kb,notify}) {
  const pets=profile.pets||[];
  const petEmoji=t=>({Кошка:"🐱",Собака:"🐶",Попугай:"🦜",Кролик:"🐰",Хомяк:"🐹",Черепаха:"🐢",Рыбки:"🐠"}[t]||"🐾");
  const getAge=dob=>{if(!dob)return null;const d=Date.now()-new Date(dob);const y=Math.floor(d/(365.25*86400000));const m=Math.floor((d%(365.25*86400000))/(30.44*86400000));return y>0?`${y} лет`:`${m} мес.`;};
  const daysUntil=dateStr=>{if(!dateStr)return null;const t=new Date(dateStr);t.setFullYear(t.getFullYear()+1);return Math.round((t-new Date())/86400000);};
  const markFeed=(petId,idx)=>{const c=petLog[today]?.[petId]||[];const n=c.includes(idx)?c.filter(x=>x!==idx):[...c,idx];setPetLog(p=>({...p,[today]:{...(p[today]||{}),[petId]:n}}));};
  return(
    <div>
      <AiBox kb={kb} prompt={
        "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке.\n\n"+
        "ПИТОМЦЫ:\n"+
        pets.map(p=>"- "+p.name+": "+p.type+(p.breed?", порода "+p.breed:"")+
          (p.age?", возраст "+p.age+" лет":"")+
          (p.weight?", вес "+p.weight+" кг":"")+
          (p.notes?", особенности: "+p.notes:"")).join("\n")+
        "\n\nДай по каждому питомцу 2-3 конкретные рекомендации:\n"+
        "- По здоровью: конкретные признаки на которые обращать внимание для этого вида/породы/возраста\n"+
        "- По питанию: конкретный тип корма/рацион подходящий для возраста и веса\n"+
        "- По активности: конкретная норма активности для этого вида и возраста\n\n"+
        "Если ссылаешься на ветеринарные рекомендации — указывай источник (организация, стандарт)."
      } label="Уход за питомцами" btnText="Советы по уходу" placeholder="Анализирую профили питомцев и даю конкретные советы..."/>
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

function BeautySection({profile,tasks,setTasks,today,kb,notify}) {
  const [modal,setModal]=useState(null);
  const [selectedTopics, setSelectedTopics] = useStorage("ld_beauty_topics", []);
  const [schedule, setSchedule] = useStorage("ld_beauty_schedule", null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const moon = getMoon();
  const isMale = profile.gender === "Мужской";
  const beautyTasks = tasks.filter(t=>t.section==="beauty");
  const due = beautyTasks.filter(t=>isDue(t,today));

  // Темы ухода по категориям
  const TOPICS = isMale ? [
    {cat:"Лицо",    items:[
      {id:"face_morning", name:"Умывание утром",      freq:"daily",   time:"07:00", icon:"💧"},
      {id:"face_evening", name:"Умывание вечером",    freq:"daily",   time:"21:00", icon:"🌙"},
      {id:"face_scrub",   name:"Скраб для лица",      freq:"every:7", time:"19:00", icon:"🫧"},
      {id:"face_mask",    name:"Маска для лица",       freq:"every:7", time:"20:00", icon:"🎭"},
    ]},
    {cat:"Тело",    items:[
      {id:"body_cream",   name:"Крем для тела",        freq:"daily",   time:"20:00", icon:"🧴"},
      {id:"body_scrub",   name:"Скраб для тела",       freq:"every:7", time:"20:00", icon:"🫧"},
    ]},
    {cat:"Борода и волосы", items:[
      {id:"beard_care",   name:"Уход за бородой",      freq:"every:2", time:"08:00", icon:"🧔"},
      {id:"hair_wash",    name:"Мытьё волос",           freq:"every:2", time:"20:00", icon:"🚿"},
      {id:"haircut",      name:"Стрижка / барбер",      freq:"every:30",time:"",     icon:"✂️"},
    ]},
    {cat:"Руки и ногти", items:[
      {id:"hand_cream",   name:"Крем для рук",          freq:"daily",   time:"21:00", icon:"🤲"},
      {id:"nails_m",      name:"Стрижка ногтей",        freq:"every:10",time:"",     icon:"💅"},
    ]},
  ] : [
    {cat:"Уход за лицом", items:[
      {id:"face_morning", name:"Утренний уход",         freq:"daily",   time:"07:00", icon:"☀️", note:"Очищение → тоник → крем"},
      {id:"face_evening", name:"Вечерний уход",         freq:"daily",   time:"21:00", icon:"🌙", note:"Снятие макияжа → очищение → сыворотка → крем"},
      {id:"face_mask",    name:"Маска для лица",         freq:"every:3", time:"20:00", icon:"🎭", moon:true},
      {id:"face_scrub",   name:"Скраб / пилинг",         freq:"every:7", time:"20:00", icon:"🫧", moon:"убывающая"},
      {id:"eye_care",     name:"Крем для глаз",          freq:"daily",   time:"21:00", icon:"👁"},
    ]},
    {cat:"Уход за телом", items:[
      {id:"body_cream",   name:"Крем для тела",          freq:"daily",   time:"20:00", icon:"🧴"},
      {id:"body_scrub",   name:"Скраб для тела",         freq:"every:4", time:"20:00", icon:"🫧"},
      {id:"depo",         name:"Депиляция / эпиляция",   freq:"every:14",time:"",     icon:"✨", moon:"убывающая"},
      {id:"tan",          name:"Автозагар",              freq:"every:7", time:"",     icon:"🌅"},
    ]},
    {cat:"Уход за волосами", items:[
      {id:"hair_wash",    name:"Мытьё волос",            freq:"every:2", time:"20:00", icon:"🚿"},
      {id:"hair_mask",    name:"Маска для волос",         freq:"every:7", time:"20:00", icon:"💆", note:"До мытья: держать 30-60 мин", moon:true},
      {id:"hair_oil",     name:"Масло для волос",         freq:"every:7", time:"",     icon:"🫙"},
      {id:"haircut",      name:"Стрижка",                 freq:"every:30",time:"",     icon:"✂️", moon:"растущая"},
      {id:"coloring",     name:"Окрашивание",             freq:"every:42",time:"",     icon:"🎨"},
    ]},
    {cat:"Маникюр и ногти", items:[
      {id:"nails",        name:"Маникюр",                 freq:"every:21",time:"",     icon:"💅", moon:true},
      {id:"ped",          name:"Педикюр",                 freq:"every:30",time:"",     icon:"🦶"},
      {id:"nail_care",    name:"Уход за кутикулой",       freq:"every:3", time:"21:00", icon:"🤲"},
    ]},
    {cat:"Брови и ресницы", items:[
      {id:"brows",        name:"Коррекция бровей",        freq:"every:14",time:"",     icon:"🪞"},
      {id:"lash",         name:"Наращивание ресниц",      freq:"every:21",time:"",     icon:"✨"},
    ]},
    {cat:"Массаж и тело", items:[
      {id:"massage",      name:"Массаж лица",             freq:"every:3", time:"21:00", icon:"💆"},
      {id:"lymph",        name:"Лимфодренажный массаж",   freq:"every:7", time:"",     icon:"🫀"},
      {id:"bath",         name:"Ванна с солью / пеной",   freq:"every:7", time:"21:00", icon:"🛁", moon:true},
    ]},
  ];

  const toggleTopic = (id) => {
    setSelectedTopics(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
    setSchedule(null); // сбросить старый график
  };

  const buildSchedule = async () => {
    if(!selectedTopics.length){notify("Выбери хотя бы одну процедуру");return;}
    setLoadingSchedule(true);
    const allItems = TOPICS.flatMap(t=>t.items).filter(i=>selectedTopics.includes(i.id));
    const prompt = "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке.\n\n"+
      "Составь персональный график "+( isMale?"ухода за собой":"красоты")+" на неделю.\n"+
      "Выбранные процедуры: "+allItems.map(i=>i.name+" ("+freqLabel(i.freq)+")").join(", ")+".\n"+
      "Профиль: "+( isMale?"мужской":"женский")+", тип кожи: "+(profile.skinType||"—")+
      (isMale?", борода: "+(profile.beard||"—"):", волосы: "+(profile.hairType||"—"))+".\n"+
      "Рабочий график: "+(profile.workStart||"9:00")+"–"+(profile.workEnd||"18:00")+". "+
      "Свободное время: с "+(profile.workEnd||"18:00")+" до "+(profile.sleep||"23:00")+".\n"+
      "Луна: "+moon.n+" ("+moon.t+").\n"+
      (isMale?"":"Учти лунный цикл — убывающая луна для очищения и пилингов, растущая для питательных масок.\n")+
      "Распредели процедуры по дням недели с учётом работы. Формат: ## Понедельник → нумерованный список с временем. Итого 7 дней.";
    const r = await askClaude(profile.kb||"", prompt);
    setSchedule(r);
    setLoadingSchedule(false);
  };

  const addScheduleToTasks = () => {
    const allItems = TOPICS.flatMap(t=>t.items).filter(i=>selectedTopics.includes(i.id));
    const newTasks = allItems.map(item=>({
      id:Date.now()+Math.random(), title:item.name, section:"beauty",
      freq:item.freq, priority:"m", preferredTime:item.time||"20:00",
      lastDone:"", doneDate:"", notes:item.note||""
    }));
    const existing = new Set(beautyTasks.map(t=>t.title));
    const fresh = newTasks.filter(t=>!existing.has(t.title));
    setTasks(p=>[...p,...fresh]);
    notify("Добавлено "+fresh.length+" процедур");
  };

  return(
    <div>
      {/* Шапка профиля */}
      <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:10,marginBottom:12,alignItems:"center"}}>
        {profile.skinType&&<span style={{fontSize:12,color:T.text2}}>✨ {profile.skinType}</span>}
        {!isMale&&profile.hairType&&<span style={{fontSize:12,color:T.text3}}>· 💇 {profile.hairType}</span>}
        {isMale&&profile.beard&&<span style={{fontSize:12,color:T.text3}}>· 🧔 {profile.beard}</span>}
        <span style={{fontSize:11,color:T.gold,marginLeft:"auto",fontFamily:"'JetBrains Mono'"}}>{moon.e} {moon.n}</span>
      </div>

      {/* ── Выбор процедур по тематике ── */}
      <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>ВЫБЕРИ НУЖНЫЕ ПРОЦЕДУРЫ</div>
      {TOPICS.map(cat=>(
        <div key={cat.cat} style={{marginBottom:10}}>
          <div style={{fontSize:11,color:T.gold,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>{cat.cat.toUpperCase()}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {cat.items.map(item=>{
              const sel = selectedTopics.includes(item.id);
              return (
                <div key={item.id} onClick={()=>toggleTopic(item.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,cursor:"pointer",background:sel?"rgba(200,164,90,0.15)":"rgba(255,255,255,0.03)",border:"1px solid "+(sel?"rgba(200,164,90,0.5)":"rgba(255,255,255,0.08)"),transition:"all .15s"}}>
                  <span style={{fontSize:16}}>{item.icon}</span>
                  <div>
                    <div style={{fontSize:13,color:sel?T.gold:T.text0}}>{item.name}</div>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{freqLabel(item.freq)}{item.moon?" 🌙":""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Кнопка создать график */}
      {selectedTopics.length>0&&(
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <button className="btn btn-primary" style={{flex:1}} onClick={buildSchedule} disabled={loadingSchedule}>
              {loadingSchedule?"Составляю...":"✦ Составить мой график"}
            </button>
            <button className="btn btn-ghost" onClick={addScheduleToTasks}>📋 В задачи</button>
          </div>
          <div style={{fontSize:12,color:T.text3}}>Выбрано процедур: {selectedTopics.length} · Учитываю: тип кожи, луну, рабочий график</div>
        </div>
      )}

      {/* График */}
      {schedule&&(
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5}}>МОЙ ГРАФИК</div>
            <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto",fontSize:11}} onClick={()=>setSchedule(null)}>Сбросить</button>
          </div>
          <div className="ai-content">
            {parseAiResponse(schedule).map((b,i)=>{
              if(b.type==="header") return <div key={i} className="ai-header"><span className="ai-header-mark">◆</span>{b.content}</div>;
              if(b.type==="list") return <div key={i} className="ai-list">
                {b.items.map((item,j)=>{
                  const isObj=typeof item==="object";
                  const title=isObj?item.title:"";
                  const body=isObj?item.body:item;
                  return <div key={j} className="ai-list-item">
                    <span className="ai-list-num">{j+1}</span>
                    <div className="ai-list-body">
                      {title&&<div className="ai-list-title">{title}</div>}
                      {body&&<div className="ai-list-text">{body}</div>}
                      <div className="ai-item-actions">
                        <button className="btn-mini" onClick={()=>{
                          const txt=title?(title+": "+body):body;
                          const h=parseInt((profile.workEnd||"18:00").split(":")[0])+1;
                          const start=new Date();start.setHours(h,0,0,0);
                          const end=new Date(start.getTime()+3600000);
                          const f=d=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
                          window.open("https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(txt)+"&dates="+f(start)+"/"+f(end),"_blank");
                        }}>📅 Запланировать</button>
                      </div>
                    </div>
                  </div>;
                })}
              </div>;
              return <div key={i} className="ai-paragraph">{b.content}</div>;
            })}
          </div>
        </div>
      )}

      {/* Сегодняшние задачи по красоте */}
      {due.length>0&&(
        <div className="card" style={{marginBottom:10}}>
          <div className="card-hd">
            <div className="card-title">Сегодня</div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setModal({})}>+ Своя</button>
          </div>
          {due.map(task=>(
            <div key={task.id} className="task-row">
              <div className={"chk"+(task.doneDate===today?" done":"")} onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t))}>{task.doneDate===today?"✓":""}</div>
              <div className="task-body">
                <div className={"task-name"+(task.doneDate===today?" done":"")}>{task.title}</div>
                <div className="task-meta"><span className="badge bp">{freqLabel(task.freq)}</span>{task.preferredTime&&<span className="badge bg">🕐{task.preferredTime}</span>}</div>
                {task.notes&&<div className="task-notes">{task.notes}</div>}
              </div>
              <div className="ico-btn" onClick={()=>setModal(task)} style={{color:T.teal,opacity:.7}}>✏️</div>
              <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
            </div>
          ))}
        </div>
      )}

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
      <AiBox kb={kb} prompt={
        "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Никаких общих фраз.\n\n"+
        "ПРОФИЛЬ:\n"+
        "- Хобби: "+((profile.hobbies||[]).join(", ")||"—")+"\n"+
        "- Текущий проект: "+(profile.hobbyProject||"—")+"\n"+
        "- Свободное время: с "+(profile.workEnd||"18:00")+" до "+(profile.sleep||"23:00")+" — итого "+
          (()=>{const [wh,wm]=(profile.workEnd||"18:00").split(":").map(Number);
                const [sh,sm]=(profile.sleep||"23:00").split(":").map(Number);
                return Math.round((sh*60+sm-wh*60-wm)/60*10)/10})()+" часов в будни\n"+
        "- Стиль планирования: "+(profile.planningStyle||"—")+"\n"+
        "- Восстановление через: "+((profile.recovery||[]).join(", ")||"—")+"\n\n"+
        "Дай конкретный план:\n"+
        "1. [Расписание] Конкретные временные слоты для хобби в рамках "+(profile.workEnd||"18:00")+"–"+(profile.sleep||"23:00")+" — сколько раз в неделю, по сколько минут\n"+
        "2. [Следующий шаг] Конкретное действие по проекту «"+(profile.hobbyProject||"хобби")+"» — что именно сделать на ближайшей сессии\n"+
        "3. [Ресурсы] Конкретный инструмент, курс или материал для развития — название + где найти\n\n"+
        "Учитывай хронотип: "+(profile.chronotype||"—")+" — предлагай слоты когда энергия оптимальна."
      } label="Хобби и увлечения" btnText="Советы по хобби" placeholder="Анализирую профиль и составляю конкретный план для хобби..."/>
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
  const [addModal, setAddModal] = useState(null);
  // ── Помощники для целей ──
  const [goalsTools, setGoalsTools] = useStorage("ld_goals_tools", {
    weightLog: [],        // [{date, weight}]
    habits: [],           // [{id, name, log: {date: bool}}]
    calories: {goal: 0, log: []}, // {goal, log:[{date, kcal, note}]}
    workout: null,        // сгенерированный план тренировок
    workoutSetup: null,   // настройки тренировок
  });
  const [toolsTab, setToolsTab] = useState("weight");
  const [workoutForm, setWorkoutForm] = useState({days:[],time:"",equipment:[],show:false});
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const EQUIPMENT_LIST = ["Беговая дорожка","Степ-платформа","Вибро-тренажёр","Коврик для йоги","Фитнес-резинки","Гантели"];
  const DAYS_LIST = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const today_d = new Date().toISOString().split("T")[0];

  // Генерация плана тренировок
  const generateWorkout = async () => {
    setWorkoutLoading(true);
    const {days, time, equipment} = workoutForm;
    const weightGoal = (profile.mainGoal||"").toLowerCase().match(/похуде|вес|фигур|набрать/);
    const prompt =
      "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке. Отвечай ТОЛЬКО валидным JSON без markdown.\n\n"+
      "Составь персональный план тренировок.\n\n"+
      "ПРОФИЛЬ:\n"+
      "- Имя: "+(profile.name||"—")+"\n"+
      "- Цель: "+(profile.mainGoal||"—")+"\n"+
      "- Зоны здоровья: "+((profile.healthFocus||[]).join(", ")||"—")+"\n"+
      "- Хронические: "+(profile.chronic||"нет")+"\n"+
      "- Хронотип: "+(profile.chronotype||"—")+"\n\n"+
      "ПАРАМЕТРЫ ТРЕНИРОВОК:\n"+
      "- Дни: "+days.join(", ")+"\n"+
      "- Время тренировки: "+time+"\n"+
      "- Оборудование: "+(equipment.length>0?equipment.join(", "):"только собственный вес")+"\n"+
      (weightGoal?"- ПРИОРИТЕТ: похудение — кардио + силовые\n":"- ПРИОРИТЕТ: общий тонус и здоровье\n")+"\n"+
      "Создай план строго в формате JSON:\n"+
      "{\n"+
      "  \"title\": \"Название плана\",\n"+
      "  \"goal\": \"Цель плана\",\n"+
      "  \"days\": [\n"+
      "    {\n"+
      "      \"day\": \"Пн\",\n"+
      "      \"type\": \"Кардио/Силовая/Йога/Отдых\",\n"+
      "      \"duration\": \"45 мин\",\n"+
      "      \"exercises\": [\n"+
      "        {\"name\": \"Название упражнения\", \"sets\": \"3x15\", \"rest\": \"30с\", \"note\": \"Техника\"}\n"+
      "      ]\n"+
      "    }\n"+
      "  ],\n"+
      "  \"tips\": [\"Совет 1\", \"Совет 2\"]\n"+
      "}\n\n"+
      "Включи только указанные дни: "+days.join(", ")+". Используй только доступное оборудование.";

    try {
      const raw = await askClaude(kb, prompt, 3000);
      const cleaned = raw.replace(/```json|```/g,"").trim();
      const plan = JSON.parse(cleaned);
      setGoalsTools(p=>({...p,
        workout: plan,
        workoutSetup: {days, time, equipment, createdAt: new Date().toISOString()}
      }));
      setWorkoutForm(p=>({...p, show:false}));
      setToolsTab("workout");
      notify("План тренировок составлен ✦");
    } catch(e) {
      notify("Ошибка составления плана — попробуй ещё раз");
    }
    setWorkoutLoading(false);
  };

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
        {[["goal","🎯 Цель"],["wheel","🔄 Колесо"],["plan","📋 План"],["tools","🛠 Помощники"]].map(([v,l])=>(
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

      {/* ══ ВКЛАДКА: ПОМОЩНИКИ ══ */}
      {tab==="tools"&&<div>
        <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
          {[{id:"weight",label:"⚖️ Вес"},{id:"habits",label:"✅ Привычки"},{id:"calories",label:"🔥 Калории"},{id:"workout",label:"💪 Тренировки"}].map(t=>(
            <button key={t.id} onClick={()=>setToolsTab(t.id)}
              style={{flex:1,minWidth:60,padding:"6px 4px",borderRadius:10,border:"1px solid "+(toolsTab===t.id?T.gold+"88":"rgba(255,255,255,0.08)"),
                background:toolsTab===t.id?"rgba(200,164,90,0.12)":"rgba(255,255,255,0.02)",
                color:toolsTab===t.id?T.gold:T.text2,fontSize:11,cursor:"pointer",transition:"all .15s"}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Трекер веса ── */}
        {toolsTab==="weight"&&<div>
          <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
            <input type="number" step="0.1" placeholder="Вес (кг)" id="weight-input"
              style={{flex:1,padding:"8px 12px",borderRadius:10,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.03)",color:T.text0,fontSize:16,outline:"none"}}/>
            <button className="btn btn-primary btn-sm" onClick={()=>{
              const inp=document.getElementById("weight-input");
              const val=parseFloat(inp.value);
              if(!val||val<20||val>300){notify("Введи корректный вес");return;}
              setGoalsTools(p=>({...p,weightLog:[...(p.weightLog||[]),{date:today_d,weight:val}].slice(-90)}));
              inp.value=""; notify("Вес записан ✦");
            }}>Записать</button>
          </div>
          {(goalsTools.weightLog||[]).length>1&&(()=>{
            const log=goalsTools.weightLog.slice(-14);
            const weights=log.map(l=>l.weight);
            const min=Math.min(...weights)-0.5, max=Math.max(...weights)+0.5, range=max-min||1;
            const W=280,H=80;
            const pts=log.map((l,i)=>({x:i/(log.length-1)*W,y:H-(l.weight-min)/range*H}));
            const path=pts.map((p,i)=>(i===0?"M":"L")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
            const latest=log[log.length-1], first=log[0], diff=+(latest.weight-first.weight).toFixed(1);
            return (
              <div>
                <div style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{flex:1,padding:"8px 10px",background:"rgba(200,164,90,0.08)",borderRadius:10,textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:700,color:T.gold,fontFamily:"'JetBrains Mono'"}}>{latest.weight}</div>
                    <div style={{fontSize:10,color:T.text3}}>кг сейчас</div>
                  </div>
                  <div style={{flex:1,padding:"8px 10px",background:diff>0?"rgba(232,120,120,0.08)":"rgba(123,204,160,0.08)",borderRadius:10,textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:700,color:diff>0?"#E87878":T.success,fontFamily:"'JetBrains Mono'"}}>{diff>0?"+":""}{diff}</div>
                    <div style={{fontSize:10,color:T.text3}}>за период</div>
                  </div>
                </div>
                <svg width={W} height={H+20} style={{display:"block",margin:"0 auto",overflow:"visible"}}>
                  <path d={path} fill="none" stroke={T.gold} strokeWidth="2"/>
                  {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3" fill={T.gold}/>)}
                  <text x="0" y={H+14} fontSize="9" fill={T.text3}>{log[0].date.slice(5)}</text>
                  <text x={W} y={H+14} fontSize="9" fill={T.text3} textAnchor="end">{latest.date.slice(5)}</text>
                </svg>
                <details style={{marginTop:8}}>
                  <summary style={{fontSize:11,color:T.text3,cursor:"pointer"}}>История ({log.length} записей)</summary>
                  {[...log].reverse().map((l,i)=>(
                    <div key={i} style={{display:"flex",gap:10,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:13,alignItems:"center"}}>
                      <span style={{color:T.text3,fontFamily:"'JetBrains Mono'",fontSize:11,flex:1}}>{l.date}</span>
                      <span style={{color:T.text0,fontWeight:500}}>{l.weight} кг</span>
                      <div className="ico-btn danger" style={{fontSize:10,padding:"1px 4px"}} onClick={()=>setGoalsTools(p=>({...p,weightLog:p.weightLog.filter(x=>x!==l)}))}>✕</div>
                    </div>
                  ))}
                </details>
              </div>
            );
          })()}
          {(goalsTools.weightLog||[]).length===0&&<div className="empty"><span className="empty-ico">⚖️</span><p>Введи первое значение веса</p></div>}
        </div>}

        {/* ── Трекер привычек ── */}
        {toolsTab==="habits"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5}}>ПРИВЫЧКИ</div>
            <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={()=>{
              const name=window.prompt("Название привычки:");
              if(name&&name.trim()) setGoalsTools(p=>({...p,habits:[...(p.habits||[]),{id:"h-"+Date.now(),name:name.trim(),log:{}}]}));
            }}>+ Добавить</button>
          </div>
          {(goalsTools.habits||[]).length===0&&<div className="empty"><span className="empty-ico">✅</span><p>Добавь первую привычку</p></div>}
          {(goalsTools.habits||[]).map((habit,hi)=>{
            const done=!!(habit.log||{})[today_d];
            const streak=(()=>{let s=0,d=new Date();for(let i=0;i<365;i++){const k=d.toISOString().split("T")[0];if(!(habit.log||{})[k])break;s++;d.setDate(d.getDate()-1);}return s;})();
            return (
              <div key={habit.id} style={{marginBottom:8,padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div className={"chk"+(done?" done":"")} style={{width:24,height:24,fontSize:13,flexShrink:0}}
                    onClick={()=>setGoalsTools(p=>({...p,habits:p.habits.map((h,i)=>i===hi?{...h,log:{...(h.log||{}),[today_d]:!done}}:h)}))}>
                    {done?"✓":""}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,color:T.text0}}>{habit.name}</div>
                    {streak>0&&<div style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono'"}}>🔥 {streak} дн. подряд</div>}
                  </div>
                  <div className="ico-btn" style={{fontSize:11,color:T.teal,padding:"1px 4px"}} onClick={()=>{
                    const n=window.prompt("Переименовать:",habit.name);
                    if(n&&n.trim()) setGoalsTools(p=>({...p,habits:p.habits.map((h,i)=>i===hi?{...h,name:n.trim()}:h)}));
                  }}>✏️</div>
                  <div className="ico-btn danger" style={{fontSize:11,padding:"1px 4px"}} onClick={()=>{
                    if(window.confirm("Удалить привычку?")) setGoalsTools(p=>({...p,habits:p.habits.filter((_,i)=>i!==hi)}));
                  }}>✕</div>
                </div>
              </div>
            );
          })}
        </div>}

        {/* ── Калории ── */}
        {toolsTab==="calories"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5}}>КАЛОРИИ</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:11,color:T.text3}}>Цель:</span>
              <input type="number" value={goalsTools.calories?.goal||""} placeholder="ккал"
                onChange={e=>setGoalsTools(p=>({...p,calories:{...(p.calories||{}),goal:parseInt(e.target.value)||0}}))}
                style={{width:70,padding:"4px 8px",borderRadius:8,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.03)",color:T.text0,fontSize:13,outline:"none"}}/>
              <span style={{fontSize:11,color:T.text3}}>ккал</span>
            </div>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <input type="number" placeholder="ккал" id="cal-input"
              style={{width:70,padding:"7px 8px",borderRadius:10,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.03)",color:T.text0,fontSize:14,outline:"none"}}/>
            <input placeholder="Что съела" id="cal-note"
              style={{flex:1,padding:"7px 10px",borderRadius:10,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.03)",color:T.text0,fontSize:13,outline:"none"}}/>
            <button className="btn btn-primary btn-sm" onClick={()=>{
              const kcal=parseInt(document.getElementById("cal-input").value);
              const note=document.getElementById("cal-note").value;
              if(!kcal){notify("Введи калории");return;}
              setGoalsTools(p=>({...p,calories:{...(p.calories||{goal:0}),log:[...(p.calories?.log||[]),{date:today_d,kcal,note:note||"",time:new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}]}}));
              document.getElementById("cal-input").value="";
              document.getElementById("cal-note").value="";
            }}>+</button>
          </div>
          {(()=>{
            const todayLog=(goalsTools.calories?.log||[]).filter(l=>l.date===today_d);
            const total=todayLog.reduce((s,l)=>s+l.kcal,0);
            const goal=goalsTools.calories?.goal||0;
            const pct=goal?Math.min(100,Math.round(total/goal*100)):0;
            return (
              <div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <div style={{flex:1,padding:"8px 10px",background:"rgba(200,164,90,0.08)",borderRadius:10,textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:700,color:T.gold,fontFamily:"'JetBrains Mono'"}}>{total}</div>
                    <div style={{fontSize:10,color:T.text3}}>съедено</div>
                  </div>
                  {goal>0&&<div style={{flex:1,padding:"8px 10px",background:total>goal?"rgba(232,120,120,0.08)":"rgba(123,204,160,0.08)",borderRadius:10,textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:700,color:total>goal?"#E87878":T.success,fontFamily:"'JetBrains Mono'"}}>{goal-total}</div>
                    <div style={{fontSize:10,color:T.text3}}>осталось</div>
                  </div>}
                </div>
                {goal>0&&<div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.06)",marginBottom:10}}>
                  <div style={{height:"100%",width:pct+"%",borderRadius:3,background:pct>100?"#E87878":T.teal,transition:"width .3s"}}/>
                </div>}
                {todayLog.map((l,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",flexShrink:0}}>{l.time}</span>
                    <span style={{flex:1,fontSize:13,color:T.text1}}>{l.note||"—"}</span>
                    <span style={{fontSize:12,color:T.gold,fontFamily:"'JetBrains Mono'",flexShrink:0}}>{l.kcal}</span>
                    <div className="ico-btn danger" style={{fontSize:10,padding:"1px 4px"}} onClick={()=>setGoalsTools(p=>({...p,calories:{...p.calories,log:p.calories.log.filter(x=>x!==l)}}))}>✕</div>
                  </div>
                ))}
                {todayLog.length===0&&<div style={{fontSize:13,color:T.text3,fontStyle:"italic",textAlign:"center",padding:"10px 0"}}>Записей сегодня нет</div>}
              </div>
            );
          })()}
        </div>}

        {/* ── План тренировок ── */}
        {toolsTab==="workout"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5}}>ПЛАН ТРЕНИРОВОК</div>
            <button className="btn btn-ghost btn-sm" style={{fontSize:11}} onClick={()=>setWorkoutForm(p=>({...p,show:!p.show}))}>
              {goalsTools.workout?"✏️ Изменить":"✦ Создать план"}
            </button>
          </div>
          {workoutForm.show&&(
            <div style={{padding:"14px",background:"rgba(255,255,255,0.02)",borderRadius:12,marginBottom:12,border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:12,color:T.gold,marginBottom:10,fontWeight:500}}>Настройка плана тренировок</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:T.text3,marginBottom:6}}>Дни тренировок</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {DAYS_LIST.map(d=>(
                    <button key={d} onClick={()=>setWorkoutForm(p=>({...p,days:p.days.includes(d)?p.days.filter(x=>x!==d):[...p.days,d]}))}
                      style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",
                        border:"1px solid "+(workoutForm.days.includes(d)?T.gold+"88":"rgba(255,255,255,0.1)"),
                        background:workoutForm.days.includes(d)?"rgba(200,164,90,0.2)":"transparent",
                        color:workoutForm.days.includes(d)?T.gold:T.text2}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:T.text3,marginBottom:6}}>Удобное время для тренировок</div>
                <input type="time" value={workoutForm.time} onChange={e=>setWorkoutForm(p=>({...p,time:e.target.value}))}
                  style={{padding:"7px 10px",borderRadius:8,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.03)",color:T.text0,fontSize:14,outline:"none"}}/>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:T.text3,marginBottom:6}}>Доступное оборудование</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {EQUIPMENT_LIST.map(eq=>(
                    <button key={eq} onClick={()=>setWorkoutForm(p=>({...p,equipment:p.equipment.includes(eq)?p.equipment.filter(x=>x!==eq):[...p.equipment,eq]}))}
                      style={{padding:"5px 10px",borderRadius:20,fontSize:11,cursor:"pointer",
                        border:"1px solid "+(workoutForm.equipment.includes(eq)?T.teal+"88":"rgba(255,255,255,0.1)"),
                        background:workoutForm.equipment.includes(eq)?"rgba(78,201,190,0.15)":"transparent",
                        color:workoutForm.equipment.includes(eq)?T.teal:T.text2}}>
                      {eq}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:10,color:T.text3,marginTop:4,fontStyle:"italic"}}>Ничего = только собственный вес</div>
              </div>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={generateWorkout} disabled={workoutLoading||workoutForm.days.length===0}>
                {workoutLoading?"⏳ Составляю план...":"✦ Составить план тренировок"}
              </button>
            </div>
          )}
          {!workoutForm.show&&goalsTools.workout&&(()=>{
            const plan=goalsTools.workout;
            return (
              <div>
                <div style={{padding:"10px 14px",background:"rgba(200,164,90,0.08)",borderRadius:10,marginBottom:10}}>
                  <div style={{fontSize:15,color:T.gold,fontFamily:"'Crimson Pro',serif",fontWeight:500}}>{plan.title}</div>
                  <div style={{fontSize:12,color:T.text3,marginTop:2}}>{plan.goal}</div>
                  {goalsTools.workoutSetup&&<div style={{fontSize:10,color:T.text3,marginTop:4,fontFamily:"'JetBrains Mono'"}}>{goalsTools.workoutSetup.days.join(", ")} · {goalsTools.workoutSetup.time} · {goalsTools.workoutSetup.equipment.join(", ")||"собственный вес"}</div>}
                </div>
                {(plan.days||[]).map((d,di)=>(
                  <div key={di} style={{marginBottom:8,borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(255,255,255,0.02)"}}>
                      <span style={{fontSize:12,color:T.gold,fontFamily:"'JetBrains Mono'",fontWeight:700,minWidth:25}}>{d.day}</span>
                      <span style={{flex:1,fontSize:13,color:T.text1}}>{d.type}</span>
                      <span style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{d.duration}</span>
                    </div>
                    {(d.exercises||[]).length>0&&(
                      <div style={{padding:"8px 14px"}}>
                        {d.exercises.map((ex,ei)=>(
                          <div key={ei} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",alignItems:"flex-start"}}>
                            <span style={{fontSize:11,color:T.teal,fontFamily:"'JetBrains Mono'",flexShrink:0,minWidth:35}}>{ex.sets}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,color:T.text0}}>{ex.name}</div>
                              {ex.note&&<div style={{fontSize:11,color:T.text3,marginTop:1}}>{ex.note}</div>}
                            </div>
                            {ex.rest&&<span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{ex.rest}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {(!d.exercises||d.exercises.length===0)&&<div style={{padding:"8px 14px",fontSize:13,color:T.text3,fontStyle:"italic"}}>День отдыха</div>}
                  </div>
                ))}
                {(plan.tips||[]).length>0&&(
                  <div style={{padding:"10px 14px",background:"rgba(78,201,190,0.06)",borderRadius:10,marginTop:8}}>
                    <div style={{fontSize:10,color:T.teal,fontFamily:"'JetBrains Mono'",marginBottom:6}}>СОВЕТЫ</div>
                    {plan.tips.map((tip,ti)=><div key={ti} style={{fontSize:13,color:T.text1,marginBottom:4}}>• {tip}</div>)}
                  </div>
                )}
              </div>
            );
          })()}
          {!workoutForm.show&&!goalsTools.workout&&<div className="empty"><span className="empty-ico">💪</span><p>Нажми «✦ Создать план» для персонального плана тренировок</p></div>}
        </div>}
      </div>}

    </div>
  );
}

function MentalSection({profile,kb,notify}) {
  const [mood, setMood] = useState(()=>{ try{return JSON.parse(localStorage.getItem("mental_mood")||"3");}catch{return 3;} });
  const [stress, setStress] = useState(()=>{ try{return JSON.parse(localStorage.getItem("mental_stress")||"5");}catch{return 5;} });
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [openPractice, setOpenPractice] = useState(null); // id открытой карточки
  const [customPractices, setCustomPractices] = useState(()=>{ try{return JSON.parse(localStorage.getItem("custom_practices")||"[]");}catch{return[];} });
  const [addingCustom, setAddingCustom] = useState(null); // {type, name, desc, time, icon}
  const [recoveryPlan, setRecoveryPlan] = useState(()=>{ try{return localStorage.getItem("mental_recovery_plan")||"";}catch{return "";} });
  const [loadingPlan, setLoadingPlan] = useState(false);

  const moon = getMoon();
  const freeFrom = profile.workEnd||"18:00";
  const wakeTime = profile.wake||"07:00";
  const currentHour = new Date().getHours();
  const stressors = (profile.stressors||[]).join(",");
  const recovery = (profile.recovery||[]).join(",");
  const isSedentary = (profile.workType||"").includes("офис")||(profile.workType||"").includes("удалённо");

  const saveMoodLog = () => {
    try {
      const logs = JSON.parse(localStorage.getItem("mental_log")||"[]");
      logs.unshift({date:new Date().toISOString(),mood,stress,note});
      localStorage.setItem("mental_log", JSON.stringify(logs.slice(0,60)));
      localStorage.setItem("mental_mood", String(mood));
      localStorage.setItem("mental_stress", String(stress));
    } catch{}
    setSaved(true); notify("Записано"); setTimeout(()=>setSaved(false),2000);
  };

  const getRecoveryPlan = async () => {
    setLoadingPlan(true);
    const r = await askClaude(
      kb,
      "Дай персональный план восстановления на сегодня. Настроение: "+mood+"/5. Стресс: "+stress+"/10. "+
      "Стрессоры: "+stressors+". Восстановление: "+recovery+". Хронотип: "+(profile.chronotype||"—")+
      ". Свободен(а) после: "+freeFrom+". Луна: "+moon.n+"("+moon.t+"). "+
      "Дай: 1) экстренную технику прямо сейчас (2-3 мин), 2) вечерний ритуал после "+freeFrom+
      ", 3) что поможет со сном, 4) аффирмацию под ценность "+(profile.coreValue||"—")+
      ". Нумерованным списком."
    );
    setRecoveryPlan(r);
    try { localStorage.setItem("mental_recovery_plan", r); } catch{}
    setLoadingPlan(false);
  };

  const savePracticeToScheduler = (name, mins) => {
    const now = new Date();
    const h = currentHour >= parseInt(freeFrom.split(":")[0]) ? currentHour+1 : parseInt(freeFrom.split(":")[0]);
    const item = {item: name, hour: h, minute: 0, duration: mins||15, reminder: true, commuteMin: 0, addCommute: false};
    // Используем глобальный scheduling state — через notify дадим подсказку
    notify("Нажми ⏰ Запланировать под нужным пунктом плана восстановления");
  };

  const saveCustomPractice = () => {
    if(!addingCustom||!addingCustom.name) return;
    const updated = [...customPractices, {...addingCustom, id: Date.now()}];
    setCustomPractices(updated);
    try { localStorage.setItem("custom_practices", JSON.stringify(updated)); } catch{}
    setAddingCustom(null);
    notify("Практика добавлена");
  };

  const moodEmoji = ["😔","😟","😐","🙂","😊","🤩"][mood] || "😐";
  const moodLabel = ["Очень плохо","Плохо","Нейтрально","Хорошо","Отлично","Превосходно"][mood] || "";
  const stressColor = stress<=3?T.success:stress<=6?T.warn:T.danger;

  // Базовые практики по категориям
  const PRACTICES = {
    breath: {
      icon:"🌬️", name:"Дыхание",
      items: [
        {id:"47-8",   icon:"🌬️", name:"4-7-8 — тревога",         desc:"Вдох 4с → задержка 7с → выдох 8с. Повтори 4 раза. Активирует парасимпатику. Лучшее при тревоге и панике.", time:"3 мин",  color:"rgba(78,201,190,0.12)"},
        {id:"box",    icon:"⬜", name:"Бокс — паника",            desc:"Вдох 4с → задержка 4с → выдох 4с → задержка 4с. Квадрат. Метод спецслужб для стресса.", time:"4 мин",  color:"rgba(90,142,200,0.12)"},
        {id:"coh",    icon:"💫", name:"Когерентное — баланс",     desc:"Вдох 5с → выдох 5с без пауз. 6 циклов в минуту. Синхронизирует сердце и мозг. Для ежедневной практики.", time:"5 мин",  color:"rgba(200,164,90,0.1)"},
        {id:"46",     icon:"🌙", name:"4-6 — перед сном",         desc:"Вдох 4с → выдох 6с. Удлинённый выдох замедляет ЧСС. Делать в постели перед сном.", time:"5 мин",  color:"rgba(140,90,200,0.1)"},
        {id:"wim",    icon:"⚡", name:"Вим Хоф — энергия",        desc:"30 глубоких вдохов → выдох → задержка → вдох → задержка 15с. ТОЛЬКО утром, стоя или сидя на полу!", time:"10 мин", color:"rgba(200,140,58,0.1)"},
        {id:"nadi",   icon:"☯️", name:"Нади Шодхана — баланс",    desc:"Поочерёдное дыхание через ноздри: закрой правую, вдох левой → закрой левую, выдох правой. Балансирует полушария.", time:"5 мин",  color:"rgba(91,173,122,0.1)"},
        ...(customPractices.filter(p=>p.type==="breath"))
      ]
    },
    yoga: {
      icon:"🧘", name:"Йога и цигун",
      items: [
        {id:"surya",  icon:"☀️", name:"Сурья Намаскар — утро",    desc:"12 поз солнечного приветствия. 1 круг = 3-5 мин. Делать сразу после подъёма, 3-5 кругов. Активирует всё тело.", time:"15 мин", color:"rgba(200,140,58,0.1)"},
        {id:"yin",    icon:"🌙", name:"Инь-йога — вечер",         desc:"Медленные удержания поз 2-5 мин. Поза бабочки, голубь, гусеница. Расслабляет глубокие ткани. После 18:00.", time:"20 мин", color:"rgba(140,90,200,0.1)"},
        {id:"back",   icon:"💚", name:"Йога для спины",            desc:"Кошка-корова (10 раз), ребёнок (2 мин), супта матсиендрасана скрутка (3 мин каждую сторону), Шавасана (3 мин).", time:"15 мин", color:"rgba(78,201,190,0.1)"},
        {id:"qigong", icon:"🌿", name:"Утренний цигун",            desc:"Встряхивание тела 3 мин → вращение суставов снизу вверх → «деревянный столб» стояние 5 мин → 8 кусков парчи.", time:"15 мин", color:"rgba(91,173,122,0.1)"},
        {id:"qig-eve",icon:"🌌", name:"Вечерний цигун",            desc:"Медленные плавные движения руками («облака») 5 мин → опускание энергии (руки сверху вниз) 3 мин → стояние 5 мин.", time:"13 мин", color:"rgba(45,32,80,0.3)"},
        ...(customPractices.filter(p=>p.type==="yoga"))
      ]
    },
    meditation: {
      icon:"🕯️", name:"Медитация",
      items: [
        {id:"vip",   icon:"👁", name:"Випассана — осознанность",  desc:"Сядь, закрой глаза. Наблюдай дыхание. Когда мысль — замечай её и возвращайся. Без оценки. Начни с 5 мин.", time:"10 мин", color:"rgba(200,164,90,0.1)"},
        {id:"metta", icon:"💗", name:"Метта — доброта",           desc:"Представь близкого человека → почувствуй тепло → пошли ему: «Пусть ты будешь счастлив, здоров, в покое». Потом себе.", time:"10 мин", color:"rgba(232,120,120,0.1)"},
        {id:"body",  icon:"🫀", name:"Боди-скан — перед сном",   desc:"Лёжа. Внимание в ступни → голени → колени → бёдра... до головы. В каждой части 15-30 сек. Расслабляй.", time:"15 мин", color:"rgba(140,90,200,0.1)"},
        {id:"nsdr",  icon:"⚡", name:"NSDR — восстановление",     desc:"Лёжа на спине. Глубокое дыхание 2 мин. Затем тело неподвижно, ум расслаблен, но не спишь 20 мин. Заменяет сон.", time:"20 мин", color:"rgba(90,142,200,0.1)"},
        {id:"vis",   icon:"✨", name:"Визуализация цели",          desc:"Закрой глаза. Представь цель уже достигнутой. Детали: где ты, что чувствуешь, кто рядом. 5 мин образ, 5 мин чувство.", time:"10 мин", color:"rgba(200,164,90,0.1)"},
        ...(customPractices.filter(p=>p.type==="meditation"))
      ]
    },
    sound: {
      icon:"🎵", name:"Звукотерапия",
      items: [
        {id:"432",   icon:"🎵", name:"432 Гц — расслабление",     desc:"Настройте ютуб на '432 hz'. Лечь удобно, наушники, 20-30 мин. Снижает тревогу, гармонизирует нервную систему.", time:"20 мин", when:"Вечер, стресс"},
        {id:"528",   icon:"💚", name:"528 Гц — исцеление",        desc:"'528 hz healing'. При болезни или усталости. Лечь, закрыть глаза, дышать ровно, не думать о делах.", time:"20 мин", when:"Болезнь"},
        {id:"delta", icon:"🌑", name:"Дельта — глубокий сон",     desc:"'Delta binaural beats'. Только в наушниках перед сном. Мозг переходит в режим глубокого сна.", time:"30 мин", when:"Перед сном"},
        {id:"alpha", icon:"✨", name:"Альфа — фокус",             desc:"'Alpha waves'. Расслабленное внимание. Для работы, обучения, творчества. Можно без наушников.", time:"∞", when:"Работа"},
        {id:"om",    icon:"🕉️", name:"Мантра Ом — центр",        desc:"Произноси «Ааааа-Уууу-Мммм» на одном дыхании. Вибрация резонирует с телом. 10-15 повторений утром.", time:"5 мин", when:"Утро"},
        ...(customPractices.filter(p=>p.type==="sound"))
      ]
    },
    kpt: {
      icon:"🧠", name:"Психология",
      items: [
        {id:"54321",  icon:"🌱", name:"5-4-3-2-1 — заземление",   desc:"5 вещей что видишь → 4 что можешь потрогать → 3 что слышишь → 2 что чувствуешь на коже → 1 что нюхаешь. При тревоге.", time:"2 мин", color:"rgba(91,173,122,0.1)"},
        {id:"stop",   icon:"🛑", name:"Техника СТОП",             desc:"С — стоп. Т — три дыхания. О — осознай что чувствуешь. П — продолжай осознанно. Используй в любой стрессовой ситуации.", time:"1 мин", color:"rgba(232,120,120,0.1)"},
        {id:"diaryK", icon:"📓", name:"КПТ-дневник",              desc:"Запиши: ситуация → автоматическая мысль → эмоция (0-10) → факты ЗА мысль → факты ПРОТИВ → более взвешенная мысль.", time:"10 мин", color:"rgba(90,142,200,0.1)"},
        {id:"thanks", icon:"🙏", name:"Практика благодарности",   desc:"Запиши 3 вещи за которые благодарен сегодня. Подробно — что именно и почему. Лучше вечером перед сном.", time:"5 мин", color:"rgba(200,164,90,0.1)"},
        {id:"pages",  icon:"📝", name:"Утренние страницы",        desc:"Сразу после подъёма — 3 страницы от руки, без остановки, без редактуры. Всё что в голове. Очищает сознание.", time:"20 мин", color:"rgba(78,201,190,0.1)"},
        ...(customPractices.filter(p=>p.type==="kpt"))
      ]
    }
  };

  const renderPracticeList = (catKey) => {
    const cat = PRACTICES[catKey];
    if(!cat) return null;
    return (
      <div style={{marginBottom:8}}>
        {cat.items.map((item, idx) => {
          const isOpen = openPractice === "item:"+catKey+":"+idx;
          return (
            <div key={item.id||idx} style={{marginBottom:6,borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)",background:item.color||"rgba(255,255,255,0.02)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer"}} onClick={()=>setOpenPractice(isOpen?null:"item:"+catKey+":"+idx)}>
                <span style={{fontSize:20,flexShrink:0}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,color:T.text0,fontFamily:"'Crimson Pro',serif"}}>{item.name}</div>
                  {item.time&&<span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{item.time}</span>}
                  {item.when&&<span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}> · {item.when}</span>}
                </div>
                <span style={{fontSize:12,color:T.text3}}>{isOpen?"▲":"▼"}</span>
              </div>
              {isOpen&&(
                <div style={{padding:"0 14px 14px 44px"}}>
                  <div style={{fontSize:14,color:T.text2,lineHeight:1.7,marginBottom:10}}>{item.desc}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button className="btn-mini" onClick={()=>startSchedulingFromItem(item)}>⏰ В планировщик</button>
                    <button className="btn-mini" onClick={()=>{
                      try {
                        const tasks = JSON.parse(localStorage.getItem("ld_tasks_v3")||"[]");
                        tasks.push({id:Date.now()+Math.random(), title:item.name, section:"health", freq:"daily", priority:"m", preferredTime:freeFrom, lastDone:"", doneDate:"", notes:item.desc.slice(0,80)});
                        localStorage.setItem("ld_tasks_v3", JSON.stringify(tasks));
                        notify("Добавлено в задачи");
                      } catch{notify("Ошибка");}
                    }}>📋 В задачи</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {/* Кнопка добавить свою */}
        <div style={{marginTop:6}}>
          <button className="btn btn-ghost btn-sm" style={{width:"100%",fontSize:12,border:"1px dashed rgba(200,164,90,0.3)"}} onClick={()=>setAddingCustom({type:catKey,name:"",desc:"",time:"",icon:"⭐"})}>+ Добавить свою практику</button>
        </div>
      </div>
    );
  };

  // Временный placeholder для startScheduling из AiBox
  const startSchedulingFromItem = (item) => {
    const now = new Date();
    const h = currentHour >= parseInt(freeFrom.split(":")[0]) ? currentHour+1 : parseInt(freeFrom.split(":")[0]);
    notify("Открой раздел «Запланировать» в плане восстановления — это удобнее");
  };

  return(
    <div>
      {/* ── Состояние — компактно ── */}
      <div style={{padding:"12px 14px",background:"rgba(200,164,90,0.06)",borderRadius:12,border:"1px solid rgba(200,164,90,0.15)",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span style={{fontSize:28}}>{moodEmoji}</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>НАСТРОЕНИЕ</span>
              <span style={{fontSize:12,color:T.text2,fontStyle:"italic"}}>{moodLabel}</span>
            </div>
            <input type="range" min="0" max="5" step="1" value={mood} onChange={e=>setMood(parseInt(e.target.value))} style={{width:"100%",accentColor:T.gold,height:4}}/>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span style={{fontSize:16,width:28,textAlign:"center"}}>{stress<=3?"😌":stress<=6?"😤":"😰"}</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>СТРЕСС</span>
              <span style={{fontSize:12,fontWeight:700,color:stressColor,fontFamily:"'JetBrains Mono'"}}>{stress}/10</span>
            </div>
            <input type="range" min="1" max="10" step="1" value={stress} onChange={e=>setStress(parseInt(e.target.value))} style={{width:"100%",accentColor:stressColor,height:4}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input style={{flex:1,padding:"7px 10px",background:"rgba(255,255,255,0.03)",border:"1px solid "+T.bdr,borderRadius:8,color:T.text0,fontFamily:"'Crimson Pro',serif",fontSize:14,outline:"none"}} placeholder="Что на душе?..." value={note} onChange={e=>setNote(e.target.value)}/>
          <button className="btn btn-primary btn-sm" onClick={saveMoodLog}>{saved?"✓":"Записать"}</button>
        </div>
      </div>

      {/* ── План восстановления — сразу под шкалой ── */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5}}>ПЛАН ВОССТАНОВЛЕНИЯ</div>
          <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto",fontSize:11}} onClick={getRecoveryPlan} disabled={loadingPlan}>
            {loadingPlan?"Думаю...":recoveryPlan?"↻ Обновить":"✦ Получить план"}
          </button>
        </div>
        {loadingPlan&&<div style={{fontSize:14,color:T.text3,fontStyle:"italic",padding:"12px 0",textAlign:"center"}}>Составляю план под твоё состояние...</div>}
        {!loadingPlan&&recoveryPlan&&(
          <div className="ai-content">
            {parseAiResponse(recoveryPlan).map((b,i)=>{
              if(b.type==="header") return <div key={i} className="ai-header"><span className="ai-header-mark">◆</span>{b.content}</div>;
              if(b.type==="list") return <div key={i} className="ai-list">
                {b.items.map((item,j)=>{
                  const isObj=typeof item==="object";
                  const title=isObj?item.title:"";
                  const body=isObj?item.body:item;
                  return <div key={j} className="ai-list-item">
                    <span className="ai-list-num">{j+1}</span>
                    <div className="ai-list-body">
                      {title&&<div className="ai-list-title">{title}</div>}
                      {body&&<div className="ai-list-text">{body}</div>}
                    </div>
                  </div>;
                })}
              </div>;
              return <div key={i} className="ai-paragraph">{b.content}</div>;
            })}
          </div>
        )}
        {!loadingPlan&&!recoveryPlan&&<div style={{fontSize:14,color:T.text3,fontStyle:"italic",padding:"10px 0",textAlign:"center"}}>Нажми «Получить план» — составлю под твоё сегодняшнее состояние</div>}
      </div>

      <div style={{marginBottom:6,marginTop:4,fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5}}>ПРАКТИКИ</div>

      {/* Вертикальный аккордеон категорий */}
      {Object.entries(PRACTICES).map(([catKey, cat])=>(
          <div key={catKey} style={{marginBottom:8}}>
            <div onClick={()=>setOpenPractice(openPractice===catKey?null:catKey)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,cursor:"pointer",background:openPractice===catKey?"rgba(200,164,90,0.1)":"rgba(255,255,255,0.03)",border:"1px solid "+(openPractice===catKey?"rgba(200,164,90,0.3)":"rgba(255,255,255,0.06)"),transition:"all .15s"}}>
              <span style={{fontSize:24}}>{cat.icon}</span>
              <div style={{flex:1,fontFamily:"'Crimson Pro',serif",fontSize:17,color:openPractice===catKey?T.gold:T.text0}}>{cat.name}</div>
              <span style={{fontSize:12,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{cat.items.length}</span>
              <span style={{fontSize:12,color:T.text3}}>{openPractice===catKey?"▲":"▼"}</span>
            </div>
            {openPractice===catKey&&<div style={{marginTop:6,paddingLeft:4}}>{renderPracticeList(catKey)}</div>}
          </div>
        ))}


      {/* ── Модалка добавления своей практики ── */}
      {addingCustom&&(
        <div className="overlay" onClick={()=>setAddingCustom(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <span className="modal-x" onClick={()=>setAddingCustom(null)}>✕</span>
            <div className="modal-title">Добавить практику</div>
            <div className="fld"><label>Название</label><input value={addingCustom.name} onChange={e=>setAddingCustom(p=>({...p,name:e.target.value}))} placeholder="Мантра, растяжка, прогулка..."/></div>
            <div className="fld"><label>Описание — как выполнять</label><textarea value={addingCustom.desc} onChange={e=>setAddingCustom(p=>({...p,desc:e.target.value}))} placeholder="Шаги, время, особенности..." style={{minHeight:80,resize:"none",width:"100%",padding:"8px",borderRadius:8,border:"1px solid "+T.bdr,background:"rgba(255,255,255,0.03)",color:T.text0,fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
            <div className="fld-row">
              <div className="fld"><label>Время</label><input value={addingCustom.time} onChange={e=>setAddingCustom(p=>({...p,time:e.target.value}))} placeholder="5 мин"/></div>
              <div className="fld"><label>Иконка</label><input value={addingCustom.icon} onChange={e=>setAddingCustom(p=>({...p,icon:e.target.value}))} placeholder="⭐" maxLength={2}/></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={()=>setAddingCustom(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={saveCustomPractice}>Добавить</button>
            </div>
          </div>
        </div>
      )}
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
      <AiBox kb={kb} prompt={
        "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке.\n\n"+
        "ПОЕЗДКИ:\n"+
        (trips.length>0
          ? trips.map(t=>"- "+t.destination+": стадия "+t.stage+
              (t.budget?", бюджет "+t.budget+" ₸":"")+(t.saved?", отложено "+t.saved+" ₸":"")+
              (t.targetDate?", дата "+t.targetDate:"")).join("\n")
          : "Поездок пока нет")+
        "\n\nПРОФИЛЬ: доход/финансы — "+(profile.income||"—")+", работа до "+(profile.workEnd||"18:00")+
        ", отпуск "+(profile.vacationDays||"?")+" дней в год\n\n"+
        "Дай конкретный план:\n"+
        "1. [Накопления] Конкретная сумма в месяц для откладывания под каждую поездку — с расчётом\n"+
        "2. [Следующий шаг] Одно конкретное действие для продвижения по каждой поездке прямо сейчас\n"+
        "3. [Логистика] Конкретные рекомендации по оптимальному времени поездки и билетам из Казахстана\n\n"+
        "Никаких общих советов про «планируй заранее» — только цифры и конкретные шаги."
      } label="Путешествия" btnText="Советы по путешествиям" placeholder="Анализирую поездки и составляю конкретный план..."/>
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
function JournalSection({profile,journal,setJournal,today}) {
  const [view, setView] = useState("today");
  const entries = Object.entries(journal||{}).sort((a,b)=>b[0].localeCompare(a[0]));
  const todayE = journal[today]||{};
  const saveJ = u => setJournal(p=>({...p,[today]:{...(p[today]||{}),...u}}));
  const DAY_RU = ["вс","пн","вт","ср","чт","пт","сб"];
  const MON_RU = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

  return(
    <div>
      <div className="tabs" style={{marginBottom:12}}>
        <div className={"tab"+(view==="today"?" on":"")} onClick={()=>setView("today")}>Сегодня</div>
        <div className={"tab"+(view==="all"?" on":"")} onClick={()=>setView("all")}>Все записи</div>
        <div className={"tab"+(view==="ai"?" on":"")} onClick={()=>setView("ai")}>AI-ответы</div>
      </div>

      {view==="today"&&(
        <div className="card">
          <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:10}}>
            {new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase()}
          </div>
          {/* Настроение */}
          <div className="sec-lbl">Настроение</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {["😔","😕","😐","🙂","😊","🤩"].map(m=>(
              <span key={m} onClick={()=>saveJ({mood:m})}
                style={{fontSize:22,cursor:"pointer",opacity:todayE.mood===m?1:0.4,transform:todayE.mood===m?"scale(1.2)":"scale(1)",transition:"all .15s"}}>
                {m}
              </span>
            ))}
          </div>
          {/* Энергия */}
          <div className="sec-lbl">Энергия</div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {[1,2,3,4,5].map(n=>(
              <div key={n} onClick={()=>saveJ({energy:n})}
                style={{width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                  fontSize:13,fontWeight:600,
                  background:(todayE.energy||0)>=n?"rgba(45,106,79,0.2)":"rgba(45,32,16,0.05)",
                  border:"1px solid "+((todayE.energy||0)>=n?T.success:T.bdr),
                  color:(todayE.energy||0)>=n?T.success:T.text3}}>
                {n}
              </div>
            ))}
          </div>
          {/* Поля */}
          {[
            ["win","🏆 Победа дня","Что сегодня получилось?"],
            ["insight","💡 Открытие","Что понял(а) сегодня?"],
            ["gratitude","🙏 Благодарность","За что благодарен(а)?"],
            ["notes","📝 Заметки","Любые мысли..."],
          ].map(([key,label,ph])=>(
            <div key={key} style={{marginBottom:8}}>
              <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>{label}</div>
              <textarea value={todayE[key]||""} onChange={e=>saveJ({[key]:e.target.value})}
                placeholder={ph}
                style={{width:"100%",minHeight:44,padding:"8px 10px",borderRadius:9,border:"1px solid "+T.bdr,
                  background:"rgba(45,32,16,0.03)",color:T.text0,fontSize:14,fontFamily:"'Crimson Pro',serif",
                  resize:"none",outline:"none",boxSizing:"border-box",lineHeight:1.5}}/>
            </div>
          ))}
        </div>
      )}

      {view==="ai"&&(()=>{
        try {
          const aiJournal = JSON.parse(localStorage.getItem("ld_ai_journal")||"[]");
          if(!aiJournal.length) return <div className="empty"><span className="empty-ico">📖</span><p>Нет сохранённых AI-ответов</p></div>;
          const grouped = {};
          aiJournal.forEach(e=>{if(!grouped[e.label])grouped[e.label]=[];grouped[e.label].push(e);});
          return <>{Object.entries(grouped).map(([lbl,items])=>(
            <div key={lbl} className="card" style={{marginBottom:10}}>
              <div className="card-hd"><div className="card-title">{lbl}</div><span className="badge bm">{items.length}</span></div>
              {items.map((it,i)=>(
                <details key={i} style={{marginBottom:6,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                  <summary style={{cursor:"pointer",fontSize:12,color:T.gold,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>{new Date(it.date).toLocaleDateString("ru-RU",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</summary>
                  <div style={{marginTop:8,padding:"8px 12px",background:"rgba(255,255,255,.02)",borderRadius:8,fontSize:13,color:T.text2,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{it.text}</div>
                </details>
              ))}
            </div>
          ))}</>;
        } catch { return null; }
      })()}
      {view==="all"&&(
        <div>
          {entries.length===0&&(
            <div className="empty"><span className="empty-ico">📖</span><p>Записей пока нет. Начни сегодня!</p></div>
          )}
          {entries.map(([date, e])=>{
            const d = new Date(date);
            const hasContent = e.mood||e.win||e.insight||e.gratitude||e.notes;
            if(!hasContent) return null;
            return(
              <div key={date} style={{marginBottom:10,padding:"10px 14px",background:"rgba(45,32,16,0.03)",borderRadius:12,border:"1px solid "+T.bdrS}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{DAY_RU[d.getDay()]}, {d.getDate()} {MON_RU[d.getMonth()]} {d.getFullYear()}</span>
                  {e.mood&&<span style={{fontSize:16}}>{e.mood}</span>}
                  {e.energy&&<span style={{fontSize:11,color:T.gold,fontFamily:"'JetBrains Mono'"}}>{e.energy}/5</span>}
                  {date===today&&<span style={{fontSize:9,color:T.success,fontFamily:"'JetBrains Mono'",background:"rgba(45,106,79,0.15)",padding:"1px 6px",borderRadius:4,marginLeft:"auto"}}>СЕГОДНЯ</span>}
                </div>
                {e.win&&<div style={{fontSize:13,color:T.text1,marginBottom:4}}>🏆 {e.win}</div>}
                {e.insight&&<div style={{fontSize:13,color:T.text2,marginBottom:4}}>💡 {e.insight}</div>}
                {e.gratitude&&<div style={{fontSize:13,color:T.teal,marginBottom:4}}>🙏 {e.gratitude}</div>}
                {e.notes&&<div style={{fontSize:13,color:T.text3,fontStyle:"italic"}}>{e.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  CAR SECTION
// ══════════════════════════════════════════════════════════════
function CarSection({profile,setProfile,tasks,setTasks,today,kb,notify}) {
  const [editCar,setEditCar]=useState(false);
  const [car,setCar]=useState({
    model:profile.carModel||"",year:profile.carYear||"",
    mileage:profile.carMileage||"",lastTO:profile.carLastTO||"",
    tireType:profile.carTireType||"",tireDate:profile.carTireDate||"",
    insurance:profile.carInsurance||"",techCheck:profile.carTechCheck||"",
  });

  if(profile.hasCar!=="Да") return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:48,marginBottom:12}}>🚗</div>
      <div style={{fontSize:16,color:T.text2,marginBottom:8}}>Добавь данные автомобиля</div>
      <div style={{fontSize:13,color:T.text3,marginBottom:16}}>Получи напоминания о резине, страховке и ТО</div>
      <button className="btn btn-primary" onClick={()=>setProfile(p=>({...p,hasCar:"Да"}))}>🚗 Добавить автомобиль</button>
    </div>
  );

  const saveCar=()=>{
    setProfile(p=>({...p,carModel:car.model,carYear:car.year,carMileage:car.mileage,
      carLastTO:car.lastTO,carTireType:car.tireType,carTireDate:car.tireDate,
      carInsurance:car.insurance,carTechCheck:car.techCheck}));
    setEditCar(false); notify("Данные сохранены ✦");
  };

  const now=new Date(); const month=now.getMonth()+1;
  const warnings=[];
  if(profile.carLastTO){
    const days=Math.floor((now-new Date(profile.carLastTO))/86400000);
    if(days>300) warnings.push({emoji:"🔧",title:"Пора на ТО",desc:"Прошло "+Math.floor(days/30)+" мес.",color:T.danger,urgent:true});
    else if(days>240) warnings.push({emoji:"🔧",title:"Скоро ТО",desc:"До ТО ~"+Math.floor((365-days)/30)+" мес.",color:T.warn});
  }
  const isSpring=month>=3&&month<=5; const isAutumn=month>=9&&month<=11;
  if(profile.carTireType==="Зимняя"&&isSpring)
    warnings.push({emoji:"🔄",title:"Меняй на летнюю резину",desc:"Стабильно выше +7°C — пора",color:T.warn,urgent:true});
  if(profile.carTireType==="Летняя"&&isAutumn)
    warnings.push({emoji:"🔄",title:"Меняй на зимнюю резину",desc:"Не жди первого снега",color:T.warn,urgent:true});
  if(profile.carInsurance){
    const d=Math.ceil((new Date(profile.carInsurance)-now)/86400000);
    if(d<30&&d>=0) warnings.push({emoji:"📋",title:"Страховка истекает через "+d+" дн.",desc:"Обнови заранее",color:T.danger,urgent:true});
    else if(d<60&&d>=0) warnings.push({emoji:"📋",title:"Страховка через "+Math.floor(d/7)+" нед.",desc:"Подбери предложения",color:T.warn});
  }
  if(profile.carTechCheck){
    const d=Math.ceil((new Date(profile.carTechCheck)-now)/86400000);
    if(d<30&&d>=0) warnings.push({emoji:"🔍",title:"Техосмотр через "+d+" дн.",desc:"Запишись заранее",color:T.danger,urgent:true});
    else if(d<60&&d>=0) warnings.push({emoji:"🔍",title:"Техосмотр через "+Math.floor(d/7)+" нед.",color:T.warn});
  }

  const addCarTask=(title,notes="")=>{
    setTasks(p=>[...p,{id:Date.now()+Math.random(),title,section:"work",freq:"once",priority:"h",
      deadline:"",notes,preferredTime:"09:00",lastDone:"",doneDate:""}]);
    notify("Добавлено в задачи ✦");
  };

  const SEASONAL=[
    {s:"🌸 Весна",tasks:["Смена на летнюю резину","Мойка после зимы + антикор снизу","Проверка тормозов","Замена щёток","Уборка салона"]},
    {s:"☀️ Лето",tasks:["Проверка кондиционера","Давление в шинах (жара)","Полироль кузова","Охлаждающая жидкость"]},
    {s:"🍂 Осень",tasks:["Смена на зимнюю резину","Проверка аккумулятора","Антикор","Антифриз","Запас незамерзайки"]},
    {s:"❄️ Зима",tasks:["Давление шин (холод)","Скребок в багажник","Прогрев двигателя","Зимние жидкости"]},
  ];

  return(
    <div>
      {/* Карточка авто */}
      <div className="card card-accent" style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:4}}>МОЙ АВТОМОБИЛЬ</div>
            <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20,color:T.text0}}>{profile.carModel||"—"} {profile.carYear&&"("+profile.carYear+")"}</div>
            <div style={{fontSize:12,color:T.text3}}>Пробег: {profile.carMileage?profile.carMileage+" км":"не указан"}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setEditCar(e=>!e)}>✏️</button>
        </div>
        {!editCar&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:10}}>
            {[
              ["🔄 Резина",(profile.carTireType||"—")+(profile.carTireDate?" · "+profile.carTireDate:"")],
              ["🔧 Последнее ТО",profile.carLastTO?new Date(profile.carLastTO).toLocaleDateString("ru-RU",{month:"long",year:"numeric"}):"—"],
              ["📋 Страховка до",profile.carInsurance?new Date(profile.carInsurance).toLocaleDateString("ru-RU",{day:"numeric",month:"short",year:"numeric"}):"—"],
              ["🔍 Техосмотр до",profile.carTechCheck?new Date(profile.carTechCheck).toLocaleDateString("ru-RU",{day:"numeric",month:"short",year:"numeric"}):"—"],
            ].map(([l,v])=>(
              <div key={l} style={{padding:"7px 9px",background:"rgba(45,32,16,0.05)",borderRadius:8}}>
                <div style={{fontSize:10,color:T.text3,marginBottom:2}}>{l}</div>
                <div style={{fontSize:12,color:T.text0}}>{v}</div>
              </div>
            ))}
          </div>
        )}
        {editCar&&(
          <div style={{marginTop:10}}>
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
              <div className="fld"><label>Смена резины</label><input type="month" value={car.tireDate} onChange={e=>setCar(p=>({...p,tireDate:e.target.value}))}/></div>
              <div className="fld"><label>Страховка до</label><input type="date" value={car.insurance} onChange={e=>setCar(p=>({...p,insurance:e.target.value}))}/></div>
            </div>
            <div className="fld"><label>Техосмотр до</label><input type="date" value={car.techCheck} onChange={e=>setCar(p=>({...p,techCheck:e.target.value}))}/></div>
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <button className="btn btn-ghost" onClick={()=>setEditCar(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={saveCar}>Сохранить</button>
            </div>
          </div>
        )}
      </div>

      {/* Предупреждения */}
      {warnings.length>0&&(
        <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.danger}}>
          <div style={{fontSize:10,color:T.danger,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:8}}>⚠️ ТРЕБУЕТ ВНИМАНИЯ</div>
          {warnings.map((w,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid "+T.bdrS}}>
              <span style={{fontSize:20,flexShrink:0}}>{w.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,color:w.color,fontWeight:600}}>{w.title}</div>
                <div style={{fontSize:12,color:T.text3}}>{w.desc}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{fontSize:11,flexShrink:0}} onClick={()=>addCarTask(w.title,w.desc)}>+ задача</button>
            </div>
          ))}
        </div>
      )}

      {/* Плановое ТО */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:10}}>ПЛАНОВОЕ ОБСЛУЖИВАНИЕ</div>
        {[
          {e:"🔧",t:"Замена масла и фильтров",n:"Каждые 10 000 км или раз в год"},
          {e:"🔄",t:"Проверка тормозных колодок",n:"Каждые 20 000 км"},
          {e:"💧",t:"Проверка уровня жидкостей",n:"Масло, охлаждающая, тормозная"},
          {e:"🔋",t:"Проверка аккумулятора",n:"Перед зимой обязательно"},
          {e:"💨",t:"Давление в шинах",n:"Норма 2.2–2.5 бар"},
          {e:"🚿",t:"Мойка автомобиля",n:""},
          {e:"🧹",t:"Уборка салона",n:""},
        ].map((item,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+T.bdrS}}>
            <span style={{fontSize:16,flexShrink:0}}>{item.e}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:T.text0}}>{item.t}</div>
              {item.n&&<div style={{fontSize:11,color:T.text3}}>{item.n}</div>}
            </div>
            <button className="btn btn-ghost btn-sm" style={{fontSize:11,padding:"2px 8px",flexShrink:0}} onClick={()=>addCarTask(item.t,item.n)}>+</button>
          </div>
        ))}
      </div>

      {/* Сезонные задачи */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:10}}>СЕЗОННЫЕ ЗАДАЧИ</div>
        {SEASONAL.map(({s,tasks:st})=>(
          <div key={s} style={{marginBottom:10}}>
            <div style={{fontSize:12,color:T.gold,fontWeight:500,marginBottom:5}}>{s}</div>
            {st.map((t,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:12,color:T.text1,borderBottom:"1px solid "+T.bdrS}}>
                <span>✦ {t}</span>
                <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:"1px 6px"}} onClick={()=>addCarTask(s.split(" ")[1]+": "+t)}>+</button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <AiBox kb={kb}
        prompt={
          "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке.\n\n"+
          "АВТОМОБИЛЬ:\n"+
          "- Марка/модель: "+(profile.carModel||"—")+"\n"+
          "- Год выпуска: "+(profile.carYear||"—")+"\n"+
          "- Пробег: "+(profile.carMileage||"—")+" км\n"+
          "- Тип резины сейчас: "+(profile.carTireType||"—")+"\n"+
          "- Последнее ТО: "+(profile.carLastTO||"—")+"\n"+
          "- Дата смены резины: "+(profile.carTireDate||"—")+"\n"+
          "- Страна: Казахстан, "+new Date().toLocaleString("ru-RU",{month:"long"})+" "+new Date().getFullYear()+"\n\n"+
          "Дай конкретный план обслуживания:\n"+
          "1. [Сейчас] Что нужно сделать прямо сейчас — конкретно, с указанием регламента для этой марки и пробега\n"+
          "2. [Этот месяц] Что сделать в ближайший месяц — конкретные работы по регламенту\n"+
          "3. [Сезон] Сезонные работы для Казахстана в текущем месяце — с указанием норм/стандартов\n\n"+
          "Для каждого пункта указывай: рекомендуемый пробег/интервал по регламенту для этой модели."
        }
        label="AI советы по авто" btnText="Получить советы" placeholder="Дам советы по обслуживанию..."/>
    </div>
  );
}

function ProfileSection({profile,setProfile,sections,setSections,notify,kb}) {
  const [view,setView]=useState("me");
  const [tooltip,setTooltip]=useState(null);
  const z=getZodiac(profile.dob);
  const east=getEastern(profile.dob);
  const deg=calcDegree(profile.fullName||profile.name);
  const moon=getMoon();

  const ZODIAC_DESC={
    "Овен":"Лидер, первопроходец. Смелость, энергия, нетерпеливость. Стихия: Огонь · Планета: Марс",
    "Телец":"Надёжность, упорство, любовь к комфорту. Чувственность и практичность. Стихия: Земля · Планета: Венера",
    "Близнецы":"Коммуникабельность, гибкость ума, двойственность натуры. Стихия: Воздух · Планета: Меркурий",
    "Рак":"Интуиция, глубокая забота, эмоциональность, привязанность к дому. Стихия: Вода · Планета: Луна",
    "Лев":"Харизма, щедрость, лидерство, гордость. Творческое начало. Стихия: Огонь · Планета: Солнце",
    "Дева":"Аналитический ум, порядок, трудолюбие, перфекционизм. Стихия: Земля · Планета: Меркурий",
    "Весы":"Гармония, дипломатия, справедливость, красота. Стихия: Воздух · Планета: Венера",
    "Скорпион":"Глубина, трансформация, страстность и интенсивность. Стихия: Вода · Планета: Плутон",
    "Стрелец":"Свобода, оптимизм, философия, путешествия. Стихия: Огонь · Планета: Юпитер",
    "Козерог":"Амбиции, дисциплина, практичность, ответственность. Стихия: Земля · Планета: Сатурн",
    "Водолей":"Оригинальность, гуманизм, независимость. Нестандартное мышление. Стихия: Воздух · Планета: Уран",
    "Рыбы":"Интуиция, сострадание, мечтательность, духовность. Стихия: Вода · Планета: Нептун",
  };
  const EASTERN_DESC={
    "Крыса":"Ум, адаптивность, предприимчивость. Отлично чувствует возможности и привлекает удачу в деньгах.",
    "Бык":"Терпение, трудолюбие, надёжность. Символ силы и выносливости, верный и последовательный.",
    "Тигр":"Смелость, обаяние, харизма. Природный лидер, который вдохновляет окружающих.",
    "Кролик":"Мягкость, дипломатия, творчество. Символ удачи, умеет создавать гармонию.",
    "Дракон":"Магнетизм, мощь, удача. Самый сильный знак — вдохновляет и притягивает успех.",
    "Змея":"Мудрость, интуиция, загадочность. Глубокий аналитический ум и дальновидность.",
    "Лошадь":"Свобода, энергия, скорость. Неугомонный дух и жажда новых впечатлений.",
    "Коза":"Творчество, мягкость, артистизм. Ценит красоту и создаёт уют вокруг.",
    "Обезьяна":"Интеллект, изобретательность, юмор. Находчивость и способность решать сложные задачи.",
    "Петух":"Наблюдательность, пунктуальность, прямолинейность. Ценит порядок и честность.",
    "Собака":"Верность, честность, защита. Надёжный друг, всегда встаёт на защиту близких.",
    "Свинья":"Щедрость, искренность, трудолюбие. Добросердечие и умение наслаждаться жизнью.",
  };
  const DEG_DESC={
    1:"Лидерство, начало новых путей",2:"Дипломатия, партнёрство",3:"Творчество, самовыражение",
    4:"Стабильность, дисциплина",5:"Свобода, перемены",6:"Забота, гармония, ответственность",
    7:"Духовность, аналитика",8:"Власть, материальный успех",9:"Гуманизм, завершение цикла",
    10:"Карьера, достижение целей",11:"Интуиция, нестандартное мышление",12:"Жертвенность, духовность",
    13:"Трансформация",14:"Равновесие",15:"Мудрость",16:"Неожиданные повороты",
    17:"Победа через усилие",18:"Иллюзии vs реальность",19:"Успех и признание",20:"Суд и карма",
    21:"Завершение большого цикла",22:"Мастер-число: строитель",23:"Королевский градус — успех",
    24:"Любовь и творчество",25:"Духовный поиск",26:"Карма денег",27:"Высшая мудрость",
    28:"Независимость",29:"Критический градус — испытания и прорыв",30:"Полнота цикла",
  };

  // Жизненные циклы — по сферам, каждая своей линией
  const buildCycles = () => {
    if(!profile.dob) return null;
    const by = new Date(profile.dob).getFullYear();
    const cy = new Date().getFullYear();
    const age = cy-by;
    // Ключевые точки по сферам
    const spheres = [
      {name:"Карьера", color:"#82AADD", emoji:"💼", points:[
        {a:0,s:3,desc:"Старт жизни"},
        {a:12,s:5,desc:"Первые интересы и склонности"},
        {a:21,s:4,desc:"Поиск профессионального пути"},
        {a:29,s:3,desc:"Первый возврат Сатурна — испытание карьеры"},
        {a:36,s:6,desc:"Стабилизация, рост в должности"},
        {a:42,s:8,desc:"Пик карьеры — Юпитерианский расцвет"},
        {a:50,s:7,desc:"Зрелость, экспертность"},
        {a:58,s:8,desc:"Второй Сатурн — итоги и награда"},
        {a:70,s:6,desc:"Мудрость, менторство"},
      ]},
      {name:"Отношения", color:"#E8556D", emoji:"❤️", points:[
        {a:0,s:5,desc:"Семья — первые привязанности"},
        {a:18,s:6,desc:"Нодальный цикл — первые серьёзные отношения"},
        {a:25,s:7,desc:"Поиск партнёра и создание семьи"},
        {a:29,s:4,desc:"Кризис отношений — возврат Сатурна"},
        {a:35,s:7,desc:"Укрепление семьи"},
        {a:42,s:5,desc:"Пересмотр отношений — кризис среднего возраста"},
        {a:49,s:8,desc:"Хирон — исцеление и глубина"},
        {a:58,s:9,desc:"Зрелая любовь и мудрость"},
        {a:70,s:8,desc:"Опора и благодарность"},
      ]},
      {name:"Здоровье", color:"#7BCCA0", emoji:"💚", points:[
        {a:0,s:9,desc:"Детство — высокий жизненный тонус"},
        {a:18,s:8,desc:"Расцвет физической формы"},
        {a:29,s:6,desc:"Первые хронические паттерны"},
        {a:36,s:5,desc:"Кризис — важно заняться здоровьем"},
        {a:42,s:6,desc:"Осознанное здоровье"},
        {a:49,s:5,desc:"Хирон — возврат к телу"},
        {a:58,s:6,desc:"Поддерживающий режим"},
        {a:70,s:5,desc:"Мудрое отношение к телу"},
      ]},
      {name:"Финансы", color:"#E5C87A", emoji:"💰", points:[
        {a:0,s:3,desc:"Зависимость от родителей"},
        {a:18,s:4,desc:"Первые деньги"},
        {a:29,s:5,desc:"Первый Сатурн — финансовые уроки"},
        {a:36,s:7,desc:"Рост доходов"},
        {a:42,s:8,desc:"Финансовый пик"},
        {a:50,s:7,desc:"Стабильность и накопления"},
        {a:58,s:8,desc:"Плоды труда"},
        {a:70,s:7,desc:"Распределение наследия"},
      ]},
      {name:"Духовность", color:"#B882E8", emoji:"🌟", points:[
        {a:0,s:7,desc:"Чистое восприятие мира"},
        {a:12,s:5,desc:"Первые сомнения и вопросы"},
        {a:21,s:4,desc:"Поиск смысла"},
        {a:29,s:6,desc:"Сатурн — духовное испытание"},
        {a:36,s:7,desc:"Углубление практики"},
        {a:42,s:6,desc:"Переоценка ценностей"},
        {a:49,s:9,desc:"Хирон — духовное пробуждение"},
        {a:58,s:8,desc:"Мудрость и принятие"},
        {a:70,s:9,desc:"Духовный пик жизни"},
      ]},
    ];
    return {spheres, birthYear:by, currentYear:cy, currentAge:age};
  };

  const cycleData = buildCycles();

  return(
    <div>
      {/* Tabs: Мой профиль | Разделы */}
      <div className="tabs" style={{marginBottom:14}}>
        {[["me","Мой профиль"],["sections","⚙️ Разделы"]].map(([v,l])=>(
          <div key={v} className={`tab${(view||"me")===v?" on":""}`}
            onClick={()=>setView(v)}>{l}</div>
        ))}
      </div>

      {/* ══ МОЙ ПРОФИЛЬ ══ */}
      {(view==="me"||!view)&&(
        <div>
          {/* Шапка */}
          <div className="card card-accent" style={{marginBottom:12}}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,"+T.gold+"66,"+T.goldD+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{profile.gender==="Женский"?"👩":"👤"}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:24,color:T.gold,marginBottom:4}}>{profile.name||"—"}</div>
                {profile.fullName&&profile.fullName!==profile.name&&<div style={{fontSize:13,color:T.text3,marginBottom:4}}>{profile.fullName}</div>}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {profile.dob&&<span className="badge bg">🎂 {new Date(profile.dob).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</span>}
                  {profile.dob&&<span className="badge bm">{new Date().getFullYear()-new Date(profile.dob).getFullYear()} лет</span>}
                  {profile.gender&&<span className="badge bm">{profile.gender}</span>}
                  {profile.city&&<span className="badge bm">📍 {profile.city}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* ── Астро-портрет (авто) ── */}
          {profile.dob&&(
            <div style={{marginBottom:12}}>
              <div className="sec-lbl" style={{marginBottom:8}}>Астрологический портрет</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {/* Знак зодиака */}
                <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px",background:"rgba(45,32,16,0.05)",borderRadius:12}}>
                  <span style={{fontSize:32,flexShrink:0,lineHeight:1}}>{z.emoji}</span>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontFamily:"'Cormorant Infant',serif",fontSize:17,color:T.gold}}>{z.name}</span>
                      <span style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ЗОДИАК</span>
                    </div>
                    <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>{ZODIAC_DESC[z.name]||""}</div>
                  </div>
                </div>
                {/* Восточный знак */}
                <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px",background:"rgba(45,32,16,0.05)",borderRadius:12}}>
                  <span style={{fontSize:32,flexShrink:0,lineHeight:1}}>🐉</span>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontFamily:"'Cormorant Infant',serif",fontSize:17,color:T.gold}}>{east}</span>
                      <span style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ВОСТОК</span>
                    </div>
                    <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>{EASTERN_DESC[east]||""}</div>
                  </div>
                </div>
                {/* ТКМ Стихия */}
                {(()=>{
                  const el=getChineseElement(profile.dob);
                  if(!el) return null;
                  return(
                    <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px",background:"rgba(45,106,79,0.08)",borderRadius:12}}>
                      <span style={{fontSize:32,flexShrink:0,lineHeight:1}}>{el.emoji}</span>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{fontFamily:"'Cormorant Infant',serif",fontSize:17,color:T.gold}}>{el.name} {el.yin?"(Инь)":"(Ян)"}</span>
                          <span style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ТКМ-СТИХИЯ</span>
                        </div>
                        <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>Органы: {el.organ} · Сезон силы: {el.season} · Вкус-союзник: {el.taste}</div>
                      </div>
                    </div>
                  );
                })()}
                {/* Луна */}
                <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px",background:"rgba(45,32,16,0.05)",borderRadius:12}}>
                  <span style={{fontSize:32,flexShrink:0,lineHeight:1}}>{moon.e}</span>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontFamily:"'Cormorant Infant',serif",fontSize:17,color:T.gold}}>{moon.n}</span>
                      <span style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ЛУНА СЕГОДНЯ</span>
                    </div>
                    <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>{moon.t}</div>
                  </div>
                </div>
                {/* Градус судьбы */}
                {deg&&(
                  <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px",background:"rgba(200,164,90,0.08)",borderRadius:12,border:"1px solid rgba(200,164,90,0.15)"}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:26,color:T.gold,flexShrink:0,minWidth:44,textAlign:"center",lineHeight:1.2}}>{deg}°</span>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                        <span style={{fontFamily:"'Cormorant Infant',serif",fontSize:17,color:T.gold}}>Градус судьбы</span>
                        <span style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>НУМЕРОЛОГИЯ</span>
                      </div>
                      <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>{DEG_DESC[deg]||"Уникальный путь"}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Сильные и слабые стороны ── */}
          {profile.dob&&(()=>{
            const sw = getStrengthsWeaknesses(profile);
            const py = getPersonalYear(profile.dob);
            return(
              <div style={{marginBottom:12}}>
                <div className="sec-lbl" style={{marginBottom:8}}>Сильные и слабые стороны</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{padding:"10px 12px",background:"rgba(45,106,79,0.07)",borderRadius:12}}>
                    <div style={{fontSize:10,color:T.success,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8}}>✦ СИЛЬНЫЕ СТОРОНЫ</div>
                    {sw.strengths.map((s,i)=>(
                      <div key={i} style={{fontSize:12,color:T.text1,padding:"4px 0",borderBottom:"1px solid rgba(45,106,79,0.1)",lineHeight:1.3}}>{s}</div>
                    ))}
                  </div>
                  <div style={{padding:"10px 12px",background:"rgba(139,32,32,0.05)",borderRadius:12}}>
                    <div style={{fontSize:10,color:T.danger,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8}}>✗ ЗОНЫ РОСТА</div>
                    {sw.weaknesses.map((w,i)=>(
                      <div key={i} style={{fontSize:12,color:T.text2,padding:"4px 0",borderBottom:"1px solid rgba(139,32,32,0.08)",lineHeight:1.3}}>{w}</div>
                    ))}
                  </div>
                </div>
                {/* Личный год */}
                {py&&(
                  <div style={{padding:"10px 14px",background:"rgba(200,164,90,0.08)",borderRadius:12,border:"1px solid rgba(200,164,90,0.2)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                      <span style={{fontFamily:"'Cinzel',serif",fontSize:22,color:T.gold}}>{py.py}</span>
                      <div>
                        <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ЛИЧНЫЙ ГОД · НУМЕРОЛОГИЯ</div>
                        <div style={{fontSize:13,color:T.gold,fontWeight:500}}>Год {py.py} из 9-летнего цикла</div>
                      </div>
                    </div>
                    <div style={{fontSize:13,color:T.text1,lineHeight:1.6,marginBottom:6}}>{py.theme}</div>
                    {py.avoid&&<div style={{fontSize:12,color:T.text3,fontStyle:"italic"}}>Избегай: {py.avoid}</div>}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── График жизненных циклов ── */}
          {cycleData&&(()=>{
            const {spheres,birthYear,currentYear,currentAge} = cycleData;
            const W=340, H=160, PAD=28;
            const maxAge = Math.max(...spheres.flatMap(s=>s.points.map(p=>p.a)))+5;
            const minAge = 0;
            const getX = a => PAD + ((a-minAge)/(maxAge-minAge))*(W-PAD*2);
            const getY = s => H - PAD - ((s-1)/9)*(H-PAD*2);
            // Возраст-метки на оси X
            const ageLabels = [0,10,20,30,40,50,60,70];

            return(
              <div style={{marginBottom:12}}>
                <div className="sec-lbl" style={{marginBottom:8}}>📈 Жизненные циклы по сферам</div>
                <div style={{background:"rgba(45,32,16,0.03)",borderRadius:12,padding:"10px",overflowX:"auto"}}>
                  <svg width={W} height={H+24} style={{display:"block",minWidth:W}} onClick={e=>{
                    // Обработчик клика вынесен наружу
                  }}>
                    {/* Сетка Y */}
                    {[3,5,7,9].map(n=>(
                      <line key={n} x1={PAD} y1={getY(n)} x2={W-PAD} y2={getY(n)} stroke="rgba(45,32,16,0.06)" strokeWidth="1"/>
                    ))}
                    {/* Линия сейчас */}
                    <line x1={getX(currentAge)} y1={PAD/2} x2={getX(currentAge)} y2={H-PAD}
                      stroke={T.gold} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7"/>
                    <text x={getX(currentAge)} y={H+14} textAnchor="middle" fontSize="9" fill={T.gold} fontWeight="600">сейчас</text>

                    {/* Возраст и год по оси X */}
                    {ageLabels.filter(a=>a<=maxAge).map(a=>(
                      <g key={a}>
                        <text x={getX(a)} y={H+12} textAnchor="middle" fontSize="9" fill="rgba(45,32,16,0.5)" fontWeight="500">{a}</text>
                        <text x={getX(a)} y={H+22} textAnchor="middle" fontSize="7" fill="rgba(45,32,16,0.25)">{birthYear+a}</text>
                      </g>
                    ))}

                    {/* Линии по сферам */}
                    {spheres.map(sphere=>{
                      const pts = sphere.points;
                      const pathD = pts.map((p,i)=>`${i===0?"M":"L"} ${getX(p.a)} ${getY(p.s)}`).join(" ");
                      return(
                        <g key={sphere.name}>
                          <path d={pathD} fill="none" stroke={sphere.color} strokeWidth="1.8" strokeLinejoin="round" opacity="0.8"/>
                          {pts.map((p,i)=>(
                            <circle key={i}
                              cx={getX(p.a)} cy={getY(p.s)} r={p.a===currentAge?"5":"3.5"}
                              fill={p.a<=currentAge?sphere.color:"rgba(255,255,255,0.6)"}
                              stroke={sphere.color} strokeWidth="1.5"
                              style={{cursor:"pointer"}}
                              onClick={()=>setTooltip(tooltip&&tooltip.sphere===sphere.name&&tooltip.a===p.a?null:{
                                sphere:sphere.name, emoji:sphere.emoji, color:sphere.color,
                                a:p.a, year:birthYear+p.a, s:p.s, desc:p.desc,
                              })}
                            />
                          ))}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Легенда */}
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                    {spheres.map(s=>(
                      <div key={s.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.text2}}>
                        <div style={{width:16,height:2,background:s.color,borderRadius:1}}/>
                        <span>{s.emoji} {s.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Модалка снизу при нажатии */}
                  {tooltip&&(
                    <div style={{
                      position:"fixed",bottom:0,left:0,right:0,zIndex:200,
                      background:T.bg,borderRadius:"16px 16px 0 0",
                      boxShadow:"0 -4px 24px rgba(45,32,16,0.18)",
                      padding:"20px 20px 32px",
                      borderTop:"3px solid "+tooltip.color,
                      animation:"modalIn .2s ease"
                    }}>
                      <div style={{width:36,height:4,background:"rgba(45,32,16,0.2)",borderRadius:2,margin:"0 auto 16px"}}/>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <span style={{fontSize:18,color:tooltip.color,fontWeight:600}}>{tooltip.emoji} {tooltip.sphere}</span>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:13,color:T.text3}}>{tooltip.year} · {tooltip.a} лет</span>
                          <button onClick={()=>setTooltip(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:T.text3}}>✕</button>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:10}}>
                        {[1,2,3,4,5,6,7,8,9].map(n=>(
                          <div key={n} style={{height:6,flex:1,borderRadius:3,background:n<=tooltip.s?tooltip.color:"rgba(45,32,16,0.1)",transition:"background .2s"}}/>
                        ))}
                        <span style={{fontSize:12,color:tooltip.color,fontWeight:700,minWidth:24}}>{tooltip.s}/9</span>
                      </div>
                      <div style={{fontSize:15,color:T.text1,lineHeight:1.65}}>{tooltip.desc}</div>
                    </div>
                  )}
                  {tooltip&&<div style={{position:"fixed",inset:0,zIndex:199,background:"rgba(45,32,16,0.3)"}} onClick={()=>setTooltip(null)}/>}
                  <div style={{fontSize:9,color:T.text3,marginTop:6,textAlign:"center",fontFamily:"'JetBrains Mono'"}}>
                    Нажми на точку — описание периода
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── ТКМ блок ── */}
          {profile.dob&&(()=>{
            const tcm = getTCMFullProfile(profile);
            if(!tcm) return null;
            const {el, cn, syndromes, uniqueOrgans, digestionNote, foodRecs, birthOrgan} = tcm;
            const hasDiag = profile.tcmTemp||profile.tcmEmotion||profile.tcmTaste||profile.tcmSleep;
            return(<>
              <div className="sec-lbl">ТКМ-профиль</div>
              <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.gold}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <span style={{fontSize:28}}>{el.emoji}</span>
                  <div>
                    <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:18,color:T.gold}}>{el.name} {el.yin?"(Инь)":"(Ян)"}</div>
                    <div style={{fontSize:12,color:T.text2}}>{cn?.type}</div>
                  </div>
                </div>
                <div className="g2" style={{gap:6,marginBottom:8}}>
                  {[["Органы",el.organ],["Сезон",el.season],["Вкус",el.taste],["Добродетель",el.virtue]].map(([l,v])=>(
                    <div key={l} style={{padding:"6px 10px",background:"rgba(45,106,79,0.07)",borderRadius:9}}>
                      <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:2}}>{l.toUpperCase()}</div>
                      <div style={{fontSize:13,color:T.text1}}>{v}</div>
                    </div>
                  ))}
                </div>
                {hasDiag&&syndromes?.length>0&&(
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
                    {syndromes.map(s=><span key={s} className="badge bw" style={{fontSize:11}}>{s}</span>)}
                  </div>
                )}
                {foodRecs&&<div style={{fontSize:12,color:T.success,fontStyle:"italic",lineHeight:1.5}}>{foodRecs}</div>}
                {!hasDiag&&<div style={{fontSize:12,color:T.text3,fontStyle:"italic",marginTop:6}}>Пройди ТКМ-диагностику в профиле для персональных синдромов</div>}
              </div>
            </>);
          })()}

          {/* ── Психопортрет ── */}
          {(()=>{
            const intro = (profile.energySource||"").includes("Один") || (profile.energySource||"").includes("тишин");
            const analyst = (profile.decisionStyle||"").includes("логик") || (profile.decisionStyle||"").includes("анализ");
            const planner = (profile.planningStyle||"").includes("план") || (profile.planningStyle||"").includes("список");
            const traits = [
              intro ? "🔋 Интроверт — черпает энергию в уединении" : "⚡ Экстраверт — заряжается от общения",
              analyst ? "🧠 Аналитик — решения через логику и факты" : "💡 Интуит — решения через ощущения и интуицию",
              planner ? "📋 Планировщик — любит структуру и порядок" : "🌊 Адаптивный — действует по ситуации",
            ].filter(Boolean);
            if(!traits.length) return null;
            return(<>
              <div className="sec-lbl">Психопортрет</div>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
                {traits.map((t,i)=>(
                  <div key={i} style={{fontSize:13,color:T.text1,padding:"6px 12px",background:"rgba(45,32,16,0.04)",borderRadius:9}}>{t}</div>
                ))}
              </div>
            </>);
          })()}

          {/* ── Характер ── */}
          <div className="sec-lbl">Характер и личность</div>
          <div className="g2" style={{marginBottom:12}}>
            {[["Решения",profile.decisionStyle],["Энергия",profile.energySource],["Планы",profile.planningStyle],["Ценность",profile.coreValue]].map(([l,v])=>v?(
              <div key={l} style={{padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
                <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:2}}>{l.toUpperCase()}</div>
                <div style={{fontSize:13,color:T.text0}}>{v}</div>
              </div>
            ):null)}
          </div>
          {(profile.stressors||[]).length>0&&<div style={{marginBottom:8,padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
            <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>СТРЕССОРЫ</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{profile.stressors.map(s=><span key={s} className="badge bw">{s}</span>)}</div>
          </div>}
          {(profile.recovery||[]).length>0&&<div style={{marginBottom:12,padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
            <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>ВОССТАНОВЛЕНИЕ</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{profile.recovery.map(s=><span key={s} className="badge bgr">{s}</span>)}</div>
          </div>}

          {/* ── Работа и жизнь ── */}
          <div className="sec-lbl">Работа и жизнь</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
            <div style={{padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
              <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:2}}>РАБОТА</div>
              <div style={{fontSize:13,color:T.text0}}>{profile.profession||"—"}</div>
              {profile.workType&&<div style={{display:"inline-block",marginTop:3,padding:"1px 7px",borderRadius:8,background:"rgba(200,164,90,0.12)",border:"1px solid rgba(200,164,90,0.25)",fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono'"}}>{profile.workType}</div>}
              <div style={{fontSize:11,color:T.text3,marginTop:2}}>{profile.workStart||"?"}–{profile.workEnd||"?"}</div>
            </div>
            <div style={{padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
              <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:2}}>ХРОНОТИП</div>
              <div style={{fontSize:13,color:T.text0}}>{profile.chronotype?.split("—")[0]?.trim()||"—"}</div>
              <div style={{fontSize:11,color:T.text3}}>Сон: {profile.sleepQuality||"—"}</div>
            </div>
          </div>
          <div style={{padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10,marginBottom:12}}>
            <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>РЕЖИМ ДНЯ</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              {[["☀️ Подъём",profile.wake],["🌙 Отбой",profile.sleep],["💼 Работа",(profile.workStart&&profile.workEnd)?profile.workStart+"–"+profile.workEnd:null]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{l}</div><div style={{fontSize:14,color:T.text0,fontWeight:500}}>{v||"—"}</div></div>
              ))}
            </div>
          </div>
          {(profile.hobbies||[]).length>0&&<div style={{marginBottom:12,padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
            <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>ХОББИ</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{(profile.hobbies||[]).map(h=><span key={h} className="badge bm">{h}</span>)}</div>
          </div>}
          {(profile.pets||[]).length>0&&<div style={{marginBottom:12,padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
            <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>ПИТОМЦЫ</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{profile.pets.map(p=><span key={p.id} style={{fontSize:15}}>{{Кошка:"🐱",Собака:"🐶",Попугай:"🦜",Кролик:"🐰",Хомяк:"🐹"}[p.type]||"🐾"} {p.name}</span>)}</div>
          </div>}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button className="btn btn-ghost" style={{flex:1,fontSize:13}} onClick={()=>{if(window.confirm("Обновить профиль? Откроется опросник."))setProfile(null);}}>⟳ Обновить</button>
            <button className="btn btn-danger" style={{fontSize:13}} onClick={()=>{if(window.confirm("Сбросить весь профиль?"))setProfile(null);}}>⚠ Сбросить</button>
          </div>
        </div>
      )}

      {/* ══ РАЗДЕЛЫ ══ */}
      {view==="sections"&&(
        <div>
          <div style={{fontSize:14,color:T.text2,marginBottom:12,lineHeight:1.5}}>Управляй видимостью разделов в навигации</div>
          {sections.map(s=>(
            <div key={s.id} className="vis-row">
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{s.emoji}</span>
                <span style={{fontSize:15,color:T.text0}}>{s.name}</span>
              </div>
              <div className={`tog${s.vis?" on":""}`} onClick={()=>setSections(p=>p.map(x=>x.id===s.id?{...x,vis:!x.vis}:x))}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


