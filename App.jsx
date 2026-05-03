import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ── Новые импорты (рефакторинг) ────────────────────────────
import StorageService from './core/storage';
import { 
  useProfile, useTasks, useJournal, useShopList, 
  useSections, usePetLog, useTrips, useHobbies 
} from './hooks/useStorage';
import { 
  getChineseElement, getTCMConstitution, getTCMFullProfile, 
  getSeasonalTCM, getTCMHourOrgan, getTCMDayInfo, getTCMDayRecs 
} from './core/calculations/tcm';

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
    StorageService.set('push_subscribed', '1');
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
    const reports = StorageService.getReports();
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    const notified = StorageService.getPushNotified(todayStr);

    for(const r of reports) {
      if(r.status==='done' || !r.deadline) continue;
      const dl = new Date(r.deadline); dl.setHours(0,0,0,0);
      const days = Math.ceil((dl - today)/86400000);

      if([0,1,3].includes(days)) {
        const key = r.id + '_' + days;
        if(notified[key]) continue;

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
    StorageService.setPushNotified(todayStr, notified);
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
  const today = new Date().toISOString().split("T")[0];
  let hash = 0;
  const str = user + system;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  const cacheKey = "ai_cache_" + today + "_" + Math.abs(hash);
  
  try {
    const cached = StorageService.getAICache(cacheKey);
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
    if (d.text) { 
      try { StorageService.setAICache(cacheKey, text); } catch {} 
    }
    return text;
  } catch { return "Ошибка соединения с ИИ."; }
}

// ══════════════════════════════════════════════════════════════
//  STORAGE HOOK (legacy — оставлен для обратной совместимости)
// ══════════════════════════════════════════════════════════════
function useStorage(key, def) {
  // Используем StorageService внутри
  const [v, setV] = useState(() => {
    try { return StorageService.get(key, def); } catch { return def; }
  });
  const setVAndSave = (valOrFn) => {
    setV(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      try { StorageService.set(key, next); } catch {}
      return next;
    });
  };
  return [v, setVAndSave];
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
const toDay = (d = new Date()) => d.toISOString().split("T")[0];
const DAY_RU = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const MON_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

// ── Астрология ────────────────────────────────────────────────
// (эти функции остаются в App.jsx, так как используются в buildKB и других местах)
function getZodiac(dob) {
  if (!dob) return { name:"—", emoji:"⭐" };
  const d = new Date(dob), m = d.getMonth()+1, day = d.getDate();
  const z = [["Козерог","♑",12,22,1,19],["Водолей","♒",1,20,2,18],["Рыбы","♓",2,19,3,20],["Овен","♈",3,21,4,19],["Телец","♉",4,20,5,20],["Близнецы","♊",5,21,6,20],["Рак","♋",6,21,7,22],["Лев","♌",7,23,8,22],["Дева","♍",8,23,9,22],["Весы","⚖️",9,23,10,22],["Скорпион","♏",10,23,11,21],["Стрелец","♐",11,22,12,21]];
  for (const [name,emoji,sm,sd,em,ed] of z) { if ((m===sm&&day>=sd)||(m===em&&day<=ed)) return {name,emoji}; }
  return {name:"Козерог",emoji:"♑"};
}

function getEastern(dob) { 
  if(!dob) return "—"; 
  return ["Крыса","Бык","Тигр","Кролик","Дракон","Змея","Лошадь","Коза","Обезьяна","Петух","Собака","Свинья"][(new Date(dob).getFullYear()-4)%12]; 
}

// ── УДАЛЕНО: getChineseElement, getTCMConstitution, getTCMFullProfile ──
// Эти функции теперь импортируются из './core/calculations/tcm'

function calcDegree(name) { 
  if(!name) return null; 
  const ru="абвгдеёжзийклмнопрстуфхцчшщъыьэюя"; 
  let s=0; 
  for(const c of name.toLowerCase()){
    const i=ru.indexOf(c);
    if(i>=0) s+=i+1;
  } 
  return s%360||360; 
}

// ── Число личного года (нумерология) ────────────────────────
function getPersonalYear(dob) {
  if(!dob) return null;
  const now = new Date();
  const cy = now.getFullYear();
  const bd = new Date(dob);
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

  const strengths = [...new Set([...zSW.s, ...eSW.s])].slice(0,6);
  const weaknesses = [...new Set([...zSW.w, ...eSW.w])].slice(0,6);

  return {strengths, weaknesses, zodiac, eastern, personalYear:py};
}

function getMoon(dt=new Date()) { 
  const p=((dt-new Date("2024-01-11"))/86400000%29.53+29.53)%29.53; 
  if(p<1.85)return{n:"Новолуние",e:"🌑",t:"Начало — сей намерения"}; 
  if(p<7.38)return{n:"Растущая",e:"🌒",t:"Рост — начинай новое"}; 
  if(p<9.22)return{n:"Первая четверть",e:"🌓",t:"Действие — преодолевай"}; 
  if(p<14.76)return{n:"Прибывающая",e:"🌔",t:"Сила — активно действуй"}; 
  if(p<16.61)return{n:"Полнолуние",e:"🌕",t:"Пик — завершай"}; 
  if(p<22.15)return{n:"Убывающая",e:"🌖",t:"Отдача — анализируй"}; 
  if(p<23.99)return{n:"Последняя четверть",e:"🌗",t:"Итоги — очищай"}; 
  return{n:"Тёмная луна",e:"🌘",t:"Отдых — переосмысли"}; 
                    }
function openGCal(title,date,desc="") { 
  const s=new Date(date),e=new Date(s.getTime()+3600000),f=d=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; 
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(desc)}`,"_blank"); 
}

function isDue(task, today) {
  const last = task.lastDone, d = new Date(today); d.setHours(0,0,0,0);
  if (!task.freq) return false;
  if (task.doneDate===today) return false;

  // Beauty-задача с конкретной датой (freq every:14+, deadline задан)
  if (task.section==="beauty" && task.deadline && task.freq && task.freq.startsWith("every:")) {
    const n = parseInt(task.freq.split(":")[1]);
    if (n >= 14) {
      return task.deadline === today;
    }
    if (task.beautyStartDate) {
      const start = new Date(task.beautyStartDate); start.setHours(0,0,0,0);
      const diff = Math.floor((d - start) / 86400000);
      return diff >= 0 && diff % n === 0;
    }
  }

  if (task.freq==="daily") return last!==today;
  if (task.freq==="workdays") { const dn=d.getDay(); return dn>=1&&dn<=5&&last!==today; }
  if (task.freq.startsWith("weekly:")) { return task.freq.split(":")[1].split(",").map(Number).includes(d.getDay())&&last!==today; }
  if (task.freq.startsWith("every:")) {
    const n = parseInt(task.freq.split(":")[1]);
    if (!last) return true;
    return Math.floor((d-new Date(last))/86400000) >= n;
  }
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
  const age = p.dob ? (() => { const bd = new Date(p.dob); const now = new Date(); let age = now.getFullYear() - bd.getFullYear(); const m = now.getMonth() - bd.getMonth(); if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) { age--; } return age; })() : null;
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
    suffix: g ? "й" : "я",
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
  const age = d.dob ? (() => { const bd = new Date(d.dob); const now = new Date(); let age = now.getFullYear() - bd.getFullYear(); const m = now.getMonth() - bd.getMonth(); if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) { age--; } return age; })() : null;

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
  
  // Миграция: переименовать "Красота" → "Уход" + удалить "Все дела"
  useEffect(()=>{
    setSections(p=>{
      if(!p) return p;
      let updated = p
        .filter(s=>s.id!=="tasks")
        .map(s=>s.id==="beauty"&&s.name==="Красота"?{...s,name:"Уход"}:s);
      DEF_SECTIONS.forEach(def=>{
        if(!updated.find(s=>s.id===def.id)) updated.push(def);
      });
      return updated;
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
  const notify = useCallback((msg)=>{
    setNotif(msg);
    hapticNotify("success");
    setTimeout(()=>setNotif(null),3200);
  },[]);

  useEffect(()=>{
    if(profile&&trips.length===0&&(profile.trips||[]).length>0) setTrips(profile.trips);
    if(profile&&hobbies.length===0&&(profile.hobbies||[]).length>0) setHobbies((profile.hobbies||[]).map(h=>({id:Date.now()+Math.random(),name:h,sessions:[],goal:"",notes:""})));
  },[profile]);

  useEffect(()=>{
    if(profile && tasks.length > 0) {
      const deadlines = tasks.filter(t=>t.isDeadline);
      if(deadlines.length > 0 && Notification.permission === "granted") {
        scheduleDeadlineNotifications(deadlines);
      }
    }
  },[tasks, profile]);

  if(!profile) return <><style>{CSS}</style><Onboarding onDone={d=>{
    setProfile(d);
    if((d.trips||[]).length>0) setTrips(d.trips);
  }}/></>;

  const kb = buildKB(profile);
  const gp = genderPrompt(profile);
  const activeS = sections.find(s=>s.id===active)||sections[0];

  return (
    <>
      <style>{CSS}</style>
      <div className="ambient"/>
      <div className="app">
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
  );// ══════════════════════════════════════════════════════════════
//  AI BOX COMPONENT
// ══════════════════════════════════════════════════════════════
// Парсер AI-ответа — превращает текст в структурированные блоки
function parseAiResponse(text) {
  if(!text) return [];
  
  const stripBold = (s) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\*+|\*+$/g, "").trim();
  
  const blocks = [];
  const lines = text.split("\n");
  let currentList = null;
  let currentText = [];
  let pendingNumber = null;
  
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
    
    const mdHeader = trimmed.match(/^#{1,4}\s*(.+?)\s*$/);
    if(mdHeader) {
      flushList(); flushText();
      blocks.push({type:"header", content: stripBold(mdHeader[1])});
      pendingNumber = null;
      continue;
    }
    
    if(/^\*\*[^*]+\*\*:?\s*$/.test(trimmed)) {
      flushList(); flushText();
      blocks.push({type:"header", content: stripBold(trimmed).replace(/:$/, "")});
      pendingNumber = null;
      continue;
    }
    
    if(/^\d+\.?$/.test(trimmed)) {
      flushText();
      pendingNumber = parseInt(trimmed);
      continue;
    }
    
    if(pendingNumber !== null) {
      let itemRaw = trimmed;
      const titleMatch = itemRaw.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
      if(!currentList) currentList = {type:"list", items:[]};
      if(titleMatch) {
        const title = titleMatch[1].trim();
        let body = titleMatch[2].trim();
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
    
    const numItem = trimmed.match(/^(\d+)[.)\s]\s*(.+)$/);
    if(numItem) {
      flushText();
      let body = numItem[2];
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
  const [boxOpen, setBoxOpen] = useState(true);
  const [openItems, setOpenItems] = useState({});
  const toggleItem = (key) => setOpenItems(p=>({...p,[key]:!p[key]}));
  
  const cacheKey = "ld_aibox_cache_"+label.replace(/\s+/g,"_");
  useEffect(()=>{
    try {
      const cached = StorageService.get(cacheKey);
      if(cached && cached.text) setText(cached.text);
    } catch{}
  },[cacheKey]);
  
  const ask = async()=>{
    setLoading(true);
    const r = await askClaude(kb, prompt, maxTokens);
    setText(r);
    try { StorageService.set(cacheKey, {text:r, ts:Date.now()}); } catch{}
    setLoading(false);
  };
  
  const blocks = useMemo(()=>parseAiResponse(text), [text]);
  
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
    const tasks = StorageService.getTasks();
    const newTasks = allListItems.map(t => ({
      id: Date.now() + Math.random(),
      title: t.length > 100 ? t.slice(0, 97) + "..." : t,
      section: "tasks", freq: "once", priority: "m",
      deadline: "", notes: "", preferredTime: "", lastDone: "", doneDate: ""
    }));
    StorageService.setTasks([...tasks, ...newTasks]);
    if(onTaskAdd) onTaskAdd([...tasks, ...newTasks]);
    alert("Добавлено " + newTasks.length + " задач");
  };
  
  const addToShopping = () => {
    if(!allListItems.length) return;
    const list = StorageService.getShopList();
    const catRules = [
      {cat:"Бытовая химия", words:["мыло","порошок","гель","шампунь","чистящ","моющ","туалетн","губка","перчатк","пятновыв","отбелив","салфетки","пакет","фольга","плёнка"]},
      {cat:"Уход", words:["крем","маска","сыворотк","тоник","скраб","пилинг","масло","бальзам","помад","тушь","пудр","ватн","косметик","дезодорант","зубн"]},
      {cat:"Для питомцев", words:["корм для","лоток","наполнитель","когтет","ошейник","поводок","для котов","для собак","для кошек","для попуг","для хомяк"]},
      {cat:"Аптека", words:["витамин","омега","магний","мелатонин","пробиотик","антиб","сироп","таблетк","капл","мазь","бинт","пластыр","термометр","леденц","спрей"]},
      {cat:"Одежда", words:["футболк","рубашк","брюк","юбк","платье","носки","нижне бель","пижам","халат","куртк","пальто","туфл","ботинк","кроссовк"]},
    ];
    const detect = (n)=>{ const l=n.toLowerCase(); for(const r of catRules) for(const w of r.words) if(l.includes(w)) return r.cat; return "Продукты"; };
    const existingNames = new Set(list.map(i=>i.name.toLowerCase().trim()));
    const newItems = [];
    const validCats = ["Продукты","Бытовая химия","Уход","Для питомцев","Одежда","Аптека","Другое"];
    allListItems.forEach(t => {
      const m = t.match(/\[([^\]]+)\]/);
      let cat = "Продукты";
      if(m && validCats.includes(m[1])) cat = m[1];
      let name = t.replace(/\[[^\]]+\]/g, "").trim();
      name = name.replace(/^[:\s—-]+/, "").trim();
      if(!name || name.length < 2) return;
      if(!m) cat = detect(name);
      if(existingNames.has(name.toLowerCase())) return;
      existingNames.add(name.toLowerCase());
      newItems.push({id:Date.now()+Math.random(), name:name.length>80?name.slice(0,77)+"...":name, cat, done:false});
    });
    StorageService.setShopList([...list, ...newItems]);
    if(onShopAdd) onShopAdd([...list, ...newItems]);
    const byCat = {};
    newItems.forEach(i=>{byCat[i.cat]=(byCat[i.cat]||0)+1;});
    alert("Добавлено: " + Object.entries(byCat).map(([c,n])=>n+" в "+c).join(", "));
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
      const notes = StorageService.get('ld_ai_notes', []);
      notes.unshift({date:new Date().toISOString(), label, text});
      StorageService.set('ld_ai_notes', notes.slice(0, 50));
      alert("Сохранено в заметки");
    } catch(e) { alert("Ошибка сохранения"); }
  };
  
  const [scheduling, setScheduling] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [detailText, setDetailText] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  
  const startScheduling = (item) => {
    const txt = typeof item==="string" ? item : (item.title||item.body);
    const now = new Date();
    setScheduling({item:txt, hour:now.getHours()+1, minute:0, duration:30, reminder:true, commuteMin:0, addCommute:false});
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
    try {
      const tasks = StorageService.getTasks();
      tasks.push({
        id: Date.now()+Math.random(),
        title: item.length>100?item.slice(0,97)+"...":item,
        section: "tasks", freq: "once", priority: "m",
        deadline: "", notes: "Запланировано из AI: "+label,
        preferredTime: (hour<10?"0":"")+hour+":"+(minute<10?"0":"")+minute,
        lastDone: "", doneDate: ""
      });
      StorageService.setTasks(tasks);
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

  const getItemTitle = (item) => {
    const isObj = typeof item === "object";
    if(isObj && item.title && item.title.trim().length > 2) return item.title.trim().slice(0,70);
    const full = isObj ? ((item.title||"")+" "+(item.body||"")).trim() : (item||"");
    const namedNum = full.match(/([A-Z][a-zA-Z]{2,})/);
    if(namedNum && namedNum[1].length >= 3) return namedNum[1].trim();
    const quoted = full.match(/[\u00ab\u00bb\u201c\u201d"']{1}([^\u00ab\u00bb\u201c\u201d"']{3,40})[\u00ab\u00bb\u201c\u201d"']{1}/);
    if(quoted) return quoted[1].trim();
    const tagMatch = full.match(/^\[([^\]]+)\]\s*(.{5,50})(?:[.:,]|$)/);
    if(tagMatch) return "["+tagMatch[1]+"] "+tagMatch[2].trim();
    const methodMatch = full.match(/(метод|техника|практика|правило|принцип|подход|система|инструмент)\s+([А-ЯЁA-Z][^\s,.:]{2,30})/i);
    if(methodMatch) return methodMatch[0].trim().slice(0,60);
    const clean = full.replace(/^\d+[.)]\s*/,"").replace(/^\[[^\]]+\]\s*/,"").trim();
    const phrase = clean.match(/^(.{15,65})(?:[.:—–]|\s[-–]\s)/);
    if(phrase) return phrase[1].trim();
    return clean.slice(0,65)+(clean.length>65?"…":"");
  };

  return (
    <div className="ai-box">
      <div className="ai-hd" style={{cursor:"pointer"}} onClick={()=>setBoxOpen(o=>!o)}>
        <div className="ai-pulse"/>
        <div className="ai-lbl" style={{flex:1}}>{label}</div>
        {text&&<span style={{fontSize:11,color:"rgba(200,164,90,0.6)",marginRight:4}}>{boxOpen?"▲":"▼"}</span>}
      </div>
      {!text&&!loading&&<div className="ai-dim">{placeholder}</div>}
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
                const isItemOpen = openItems[itemKey] !== false;
                const shortTitle = getItemTitle(item);
                return (
                  <div key={j} className="ai-list-item" style={{flexDirection:"column",alignItems:"stretch",padding:0,marginBottom:4}}>
                    <div onClick={()=>toggleItem(itemKey)}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",borderRadius:isItemOpen?"8px 8px 0 0":"8px",background:isItemOpen?"rgba(200,164,90,0.08)":"rgba(255,255,255,0.03)",border:"1px solid "+(isItemOpen?"rgba(200,164,90,0.2)":"rgba(255,255,255,0.06)"),transition:"all .15s"}}>
                      <span style={{flexShrink:0,width:20,height:20,borderRadius:"50%",background:isItemOpen?"rgba(200,164,90,0.3)":"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:isItemOpen?T.gold:T.text3,fontFamily:"'JetBrains Mono'",fontWeight:700}}>{j+1}</span>
                      <span style={{flex:1,fontSize:13,color:isItemOpen?T.gold:T.text0,fontWeight:isItemOpen?600:400,lineHeight:1.4}}>{shortTitle}</span>
                      <span style={{fontSize:10,color:T.text3,flexShrink:0,marginLeft:4}}>{isItemOpen?"▲":"▼"}</span>
                    </div>
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
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button className="btn btn-primary" onClick={confirmSchedule}>Запланировать</button>
            <button className="btn btn-ghost" onClick={()=>setScheduling(null)}>Отмена</button>
          </div>
        </div>
      </div>}
      
      {detailItem && (
        <div className="overlay" onClick={()=>{setDetailItem(null);setDetailText("");}}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500,maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
            <span className="modal-x" onClick={()=>{setDetailItem(null);setDetailText("");}}>✕</span>
            <div className="modal-title">📖 Подробнее</div>
            <div style={{padding:"10px 14px",background:"rgba(200,164,90,0.08)",borderRadius:10,marginBottom:14,fontSize:14,color:T.gold,fontFamily:"'Crimson Pro',serif",fontStyle:"italic",flexShrink:0}}>
              {detailItem}
            </div>
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
                  const notes=StorageService.get('ld_ai_notes', []);
                  notes.unshift({date:new Date().toISOString(),label:"Подробно: "+detailItem.slice(0,50),text:detailText});
                  StorageService.set('ld_ai_notes', notes.slice(0,50));
                  alert("Сохранено в заметки");
                }catch{}
              }}>💾 Сохранить</button>}
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
  );// ══════════════════════════════════════════════════════════════
//  TODAY
// ══════════════════════════════════════════════════════════════
function TodaySection({profile,setProfile,tasks,setTasks,journal,setJournal,today,moon,kb,notify,petLog,setPetLog}) {
  const [addModal, setAddModal] = useState(false);
  const [modal, setModal] = useState(null);
  const [aiPlan, setAiPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [moodOpen, setMoodOpen] = useState(false);
  const [commuteOpen, setCommuteOpen] = useState(false);
  const [commuteLoading, setCommuteLoading] = useState(false);
  const [feedTimesOverride, setFeedTimesOverride] = useStorage("ld_feed_times", {});
  
  const commuteKey = "commute_rec_"+today;
  const [commuteRecs, setCommuteRecs] = useState(()=>{
    try { return StorageService.get(commuteKey, {to:"",from:""}); } catch { return {to:"",from:""}; }
  });
  
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
  const todayDeadlines = tasks.filter(t=>t.isDeadline && t.deadline===today && t.doneDate!==today);
  const todayReports  = todayDeadlines.filter(t=>t.group!=="pay"&&!t.isPayment);
  const todayPayments = todayDeadlines.filter(t=>t.group==="pay"||t.isPayment);
  const doneCnt = tasks.filter(t=>t.doneDate===today).length;
  const petEmoji = t=>({Кошка:"🐱",Собака:"🐶",Попугай:"🦜",Кролик:"🐰",Хомяк:"🐹",Черепаха:"🐢",Рыбки:"🐠"}[t]||"🐾");

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
      "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке.\n\n"+
      "Профиль: имя="+( profile.name||"—")+", профессия="+profession+
      ", хронотип="+chronotype+", стрессоры="+stressors+
      ", восстановление="+recovery+", хобби="+interests+
      ", цель="+goals+", транспорт="+way+", в пути="+mins+"мин"+
      ", стихия дня="+dayInfo.element+", луна="+moon.n+".";

    const strictRules =
      "\n\nПРАВИЛА ОТВЕТА:\n"+
      "— Каждый пункт: КОНКРЕТНОЕ название\n"+
      "— Музыка: точный исполнитель + трек\n"+
      "— Подкаст: точное название + платформа\n"+
      "— Аудиокнига: точное название + автор\n"+
      "— Практика: название техники + точные инструкции\n"+
      "— Размышление: конкретный вопрос для этого профиля\n"+
      "— БЕЗ фраз: «например», «можно послушать», «что-нибудь»\n"+
      "— Формат каждого пункта: [ТИП] Название/описание — где найти. Эффект: одно предложение.";

    const prompt = direction==="to"
      ? baseInfo+strictRules+"\n\nДай 5 рекомендаций для дороги НА РАБОТУ ("+mins+" мин). Цель: настрой на продуктивный день."
      : baseInfo+strictRules+"\n\nДай 5 рекомендаций для дороги ДОМОЙ ("+mins+" мин). Цель: переключиться с работы, восстановиться.";
    
    const r = await askClaude(kb, prompt, 800);
    const updated = {...commuteRecs, [direction]: r};
    setCommuteRecs(updated);
    try { StorageService.set(commuteKey, updated); } catch{}
    setCommuteLoading(false);
  };

  // Планировщик дня
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
  if((profile.pets||[]).length > 0) {
    const allPets = profile.pets||[];
    const maxFeeds = Math.max(...allPets.map(p=>parseInt(p.feedTimes)||2));
    const feedLabels = maxFeeds<=2?["Утро","Вечер"]:maxFeeds===3?["Утро","День","Вечер"]:["1","2","3","4"];
    const autoTimes = maxFeeds===1?["08:00"]:maxFeeds===2?["08:00","19:00"]:maxFeeds===3?["08:00","14:00","19:00"]:["07:00","11:00","15:00","19:00"];
    for(let feedIdx=0; feedIdx<maxFeeds; feedIdx++) {
      const petsForFeed = allPets.filter(p=>feedIdx < (parseInt(p.feedTimes)||2));
      if(petsForFeed.length===0) continue;
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

  // Дорога на работу
  if(isWorkDay && (commuteSettings.toWorkMin || (profile.commuteTime && profile.commuteTime!=="Дома"))) {
    const minsTo = parseInt(commuteSettings.toWorkMin) || parseInt((profile.commuteTime||"30").match(/\d+/)||["30"])[0];
    let toH, toM;
    if(commuteSettings.toWorkTime) {
      [toH, toM] = commuteSettings.toWorkTime.split(":").map(Number);
    } else {
      const totalMin = workStartH*60 - minsTo;
      toH = Math.floor(totalMin/60); toM = totalMin%60;
    }
    plannerEvents.push({id:"commute-to", type:"commute", emoji:"🚌",
      title:"В дорогу → работа ("+minsTo+" мин)",
      time:(toH<10?"0":"")+toH+":"+(toM<10?"0":"")+toM, timeH:toH, timeM:toM, done:false, fixed:true});
    
    const minsFrom = parseInt(commuteSettings.fromWorkMin) || parseInt((profile.commuteTime||"30").match(/\d+/)||["30"])[0];
    let fromH, fromM;
    if(commuteSettings.fromWorkTime) {
      [fromH, fromM] = commuteSettings.fromWorkTime.split(":").map(Number);
    } else {
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
    (profile.practices||[]).filter(pr=>pr&&pr!=="Нет").forEach((pr,i)=>{
      const h=wakeH+1; const m=i*20;
      plannerEvents.push({id:"practice-w-"+i,type:"health",emoji:"🧘",
        title:pr,time:h+":"+(m<10?"0"+m:m),timeH:h,timeM:m,done:false});
    });
    plannerEvents.push({id:"weekend-free",type:"anchor",emoji:"🌿",
      title:"Свободное время / отдых",time:"12:00",timeH:12,timeM:0,done:false,fixed:true});
  }

  // Задачи с временем
  const beautyDue = dueTasks.filter(t=>t.preferredTime&&t.section==="beauty");
  const otherDue  = dueTasks.filter(t=>t.preferredTime&&t.section!=="beauty");

  otherDue.forEach(t=>{
    const [h,m]=(t.preferredTime||"12:00").split(":").map(Number);
    plannerEvents.push({
      id:"task-"+t.id, type:"task",
      emoji:t.section==="home"?"🏠":t.section==="health"?"💚":t.section==="hobbies"?"🎨":"📌",
      title:t.title, time:t.preferredTime, timeH:h, timeM:m||0,
      done:t.doneDate===today, taskId:t.id,
      onDone:()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:x.doneDate===today?null:today,lastDone:x.doneDate===today?x.lastDone:today}:x))
    });
  });

  // Beauty группировка
  if(beautyDue.length>0){
    const sorted = [...beautyDue].sort((a,b)=>{
      const [ah,am]=a.preferredTime.split(":").map(Number);
      const [bh,bm]=b.preferredTime.split(":").map(Number);
      return ah*60+am-(bh*60+bm);
    });
    const groups = [];
    sorted.forEach(t=>{
      const [h,m]=t.preferredTime.split(":").map(Number);
      const tMin = h*60+m;
      const lastGroup = groups[groups.length-1];
      const lastMin = lastGroup ? (()=>{ const [lh,lm]=lastGroup[0].preferredTime.split(":").map(Number); return lh*60+lm; })() : -999;
      if(lastGroup && tMin-lastMin <= 30) lastGroup.push(t);
      else groups.push([t]);
    });

    groups.forEach((grp, gi)=>{
      const [h,m]=grp[0].preferredTime.split(":").map(Number);
      const isRareSingle = grp.length===1 && (() => {
        const freq = grp[0].freq||"";
        const n = parseInt((freq.match(/every:(\d+)/)||[0,0])[1]);
        return n>=14;
      })();
      const totalDur = grp.reduce((s,t)=>s+(t.beautyDuration||15),0);
      const allDone = grp.every(t=>t.doneDate===today);
      const title = isRareSingle
        ? grp[0].title
        : (grp.length===1 ? grp[0].title : "Уход ("+totalDur+" мин)");

      plannerEvents.push({
        id:"beauty-grp-"+gi,
        type:"beauty",
        emoji:"✨",
        title,
        beautyTooltip: grp.length>1 ? grp.map(t=>t.title).join(", ") : "",
        beautyGroup: grp.map(t=>t.id),
        time:grp[0].preferredTime,
        timeH:h, timeM:m||0,
        done:allDone,
        taskId: grp.length===1 ? grp[0].id : null,
      });
    });
  }

  // Отбой
  plannerEvents.push({id:"sleep",type:"anchor",emoji:"🌙",title:"Отбой",time:profile.sleep||"23:00",timeH:sleepH,timeM:0,done:false,fixed:true});

  // Дедлайны
  if(todayReports.length===1){
    const r=todayReports[0];
    const pref=r.preferredTime||"10:00";
    const[h,m]=pref.split(":").map(Number);
    plannerEvents.push({id:"dl-rep-"+r.id,type:"deadline",emoji:"📋",title:r.title||r.name,
      time:pref,timeH:h,timeM:m,done:r.status==="done",taskId:r.id,
      onDone:()=>setTasks(p=>p.map(t=>t.id===r.id?{...t,status:t.status==="done"?"pending":"done"}:t))});
  } else if(todayReports.length>1){
    const names=todayReports.map(r=>(r.title||r.name).replace(/ФНО |— .*/g,"").trim()).join(", ");
    plannerEvents.push({id:"dl-rep-grp",type:"deadline",emoji:"📋",
      title:"Сдать отчёты: "+names,time:"10:00",timeH:10,timeM:0,done:false});
  }
  if(todayPayments.length===1){
    const r=todayPayments[0];
    const pref=r.preferredTime||"10:00";
    const[h,m]=pref.split(":").map(Number);
    plannerEvents.push({id:"dl-pay-"+r.id,type:"deadline",emoji:"💰",title:r.title||r.name,
      time:pref,timeH:h,timeM:m,done:r.status==="done",taskId:r.id,
      onDone:()=>setTasks(p=>p.map(t=>t.id===r.id?{...t,status:t.status==="done"?"pending":"done"}:t))});
  } else if(todayPayments.length>1){
    const names=todayPayments.map(r=>(r.title||r.name).replace(/Уплата |Аванс по /g,"").trim()).join(", ");
    plannerEvents.push({id:"dl-pay-grp",type:"deadline",emoji:"💰",
      title:"Оплатить налоги: "+names,time:"10:00",timeH:10,timeM:0,done:false});
  }

  plannerEvents.sort((a,b)=>a.timeH*60+a.timeM-(b.timeH*60+b.timeM));

  return (
    <div>
      {/* ШАПКА */}
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

      {/* ТКМ дня */}
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

      {/* ПЛАНИРОВЩИК */}
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
                    {ev.type==="beauty"&&ev.beautyTooltip&&(
                      <div style={{fontSize:10,color:"#E8A8C8",fontFamily:"'JetBrains Mono'",marginTop:2,opacity:.8}}>{ev.beautyTooltip}</div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:3,flexShrink:0}}>
                    <div className="ico-btn" style={{color:T.gold,opacity:.7,fontSize:12}} title="Изменить время"
                      onClick={()=>{
                        const newTime = window.prompt("Новое время (ЧЧ:ММ):", ev.time);
                        if(!newTime||!/^\d{1,2}:\d{2}$/.test(newTime)) return;
                        if(ev.taskId) setTasks(p=>p.map(t=>t.id===ev.taskId?{...t,preferredTime:newTime}:t));
                        else if(ev.id==="wake"&&setProfile) setProfile(p=>({...p,wake:newTime}));
                        else if(ev.id==="sleep"&&setProfile) setProfile(p=>({...p,sleep:newTime}));
                        else if(ev.id&&ev.id.startsWith("pet-feed-")) setFeedTimesOverride(p=>({...p,[parseInt(ev.id.replace("pet-feed-",""))]:newTime}));
                        notify("Время обновлено ✦");
                      }}>🕐</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ЭМОЦИИ */}
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
          <div className="mood-pick" style={{marginBottom:14}}>
            {["😔","😕","😐","🙂","😊","🤩"].map(m=><span key={m} className={"mood-btn"+(todayE.mood===m?" on":"")} onClick={()=>saveJ({mood:m})}>{m}</span>)}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[1,2,3,4,5].map(n=><div key={n} className={"en-dot"+((todayE.energy||0)>=n?" on":"")} onClick={()=>saveJ({energy:n})}>{n}</div>)}
          </div>
          <div className="fld" style={{marginBottom:0}}>
            <label>Главная мысль дня</label>
            <textarea style={{minHeight:48}} placeholder="Что важно сегодня для тебя?" value={todayE.thought||""} onChange={e=>saveJ({thought:e.target.value})}/>
          </div>
        </>}
      </div>

      {/* СПРОСИ МЕНЯ */}
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
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <textarea
                value={askQuestion}
                onChange={e=>setAskQuestion(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();askMe();}}}
                placeholder="Задай любой вопрос..."
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
            {askHistory.map((item,i)=>(
              <div key={i} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:6}}>
                  <div style={{maxWidth:"85%",padding:"8px 12px",borderRadius:"12px 12px 4px 12px",
                    background:"rgba(45,106,79,0.12)",border:"1px solid rgba(45,106,79,0.2)"}}>
                    <div style={{fontSize:14,color:T.text0}}>{item.q}</div>
                    <div style={{fontSize:10,color:T.text3,marginTop:3,fontFamily:"'JetBrains Mono'"}}>{item.time}</div>
                  </div>
                </div>
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
          </div>
        )}
      </div>

      {addModal&&<TaskModal defaultSection="today" onSave={t=>{setTasks(p=>[...p,t]);notify("Задача добавлена");}} onClose={()=>setAddModal(false)}/>}
      {modal!==null&&<TaskModal task={modal?.id?modal:null} defaultSection={modal?.section||"tasks"} onSave={t=>{setTasks(p=>modal?.id?p.map(x=>x.id===t.id?t:x):[...p,t]);setModal(null);notify("Сохранено");}} onClose={()=>setModal(null)}/>}
    </div>
  );// ══════════════════════════════════════════════════════════════
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
      `Дай конкретный план по дням с точным временем.`, 1000);
    setAiText(r); setLoading(false);
  };

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

  const todayStr = now.toISOString().split("T")[0];
  const wakeH = parseInt((profile.wake||"07:00").split(":")[0]);
  const workStartH = parseInt((profile.workStart||"09:00").split(":")[0]);
  const workEndH = parseInt((profile.workEnd||"18:00").split(":")[0]);
  const sleepH = parseInt((profile.sleep||"23:00").split(":")[0]);

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

  const getDayTasks = (d) => {
    const dStr = d.toISOString().split("T")[0];
    const regular = tasks.filter(t=>
      t.section!=="work" && !t.isDeadline && t.section!=="beauty" &&
      (isDue(t,dStr) || t.doneDate===dStr)
    );
    const beautyDay = tasks.filter(t=>t.section==="beauty"&&!t.isDeadline&&isDue(t,dStr));
    if(beautyDay.length>0){
      const sorted = [...beautyDay].sort((a,b)=>{
        const [ah,am]=(a.preferredTime||"20:00").split(":").map(Number);
        const [bh,bm]=(b.preferredTime||"20:00").split(":").map(Number);
        return ah*60+am-(bh*60+bm);
      });
      const groups=[];
      sorted.forEach(t=>{
        const [h,m]=(t.preferredTime||"20:00").split(":").map(Number);
        const tMin=h*60+m;
        const last=groups[groups.length-1];
        const lastMin=last?(()=>{const [lh,lm]=(last[0].preferredTime||"20:00").split(":").map(Number);return lh*60+lm;})():-999;
        if(last&&tMin-lastMin<=30) last.push(t);
        else groups.push([t]);
      });
      groups.forEach((grp,gi)=>{
        const totalDur=grp.reduce((s,t)=>s+(t.beautyDuration||15),0);
        const title=grp.length===1?grp[0].title:"Уход ("+totalDur+" мин)";
        regular.push({
          id:"beauty-sch-grp-"+gi, title, section:"beauty",
          preferredTime:grp[0].preferredTime||"20:00",
          beautyTooltip:grp.length>1?grp.map(t=>t.title).join(", "):"",
          beautyGroup:grp.map(t=>t.id),
          doneDate: grp.every(t=>t.doneDate===dStr)?dStr:null,
          isBeautyGroup:true
        });
      });
    }
    const deadlines = tasks.filter(t=>t.isDeadline && t.deadline===dStr && t.doneDate!==dStr);
    const reports = deadlines.filter(t=>!t.isPayment);
    const payments = deadlines.filter(t=>t.isPayment);
    const grouped = [];
    if(reports.length===1) grouped.push({...reports[0], preferredTime:reports[0].preferredTime||"10:00"});
    else if(reports.length>1) grouped.push({
      id:"grp-rep-"+dStr, title:"Сдать отчёты: "+reports.map(t=>(t.title||t.name).replace(/ФНО |— .*/g,"").trim()).join(", "),
      preferredTime:"10:00", section:"work", isDeadline:true, isGroup:true, groupIds:reports.map(t=>t.id),
      deadline:dStr, doneDate: reports.every(t=>t.doneDate===dStr)?dStr:null
    });
    if(payments.length===1) grouped.push({...payments[0], preferredTime:payments[0].preferredTime||"10:00"});
    else if(payments.length>1) grouped.push({
      id:"grp-pay-"+dStr, title:"Оплатить налоги: "+payments.map(t=>(t.title||t.name).replace(/Уплата |Аванс по |— .*/g,"").trim()).join(", "),
      preferredTime:"10:00", section:"work", isDeadline:true, isGroup:true, groupIds:payments.map(t=>t.id),
      deadline:dStr, doneDate: payments.every(t=>t.doneDate===dStr)?dStr:null
    });
    return [...regular, ...grouped];
  };

  const typeColor = {anchor:T.text3, work:T.info, commute:T.teal, health:T.success, weekend:T.gold, task:T.text1, beauty:"#E8A8C8"};

  return(
    <div>
      <div className="tabs" style={{marginBottom:12}}>
        <div className={"tab"+(view==="week"?" on":"")} onClick={()=>setView("week")}>Неделя</div>
        <div className={"tab"+(view==="ai"?" on":"")} onClick={()=>setView("ai")}>ИИ-план недели</div>
      </div>

      {view==="week"&&<>
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
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <span style={{fontSize:11,color:isToday?T.gold:T.text3,fontFamily:"'JetBrains Mono'"}}>{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][i]}</span>
                    <span style={{fontSize:22,fontWeight:isToday?700:400,color:isToday?T.gold:T.text0,marginLeft:6,fontFamily:"'Cormorant Infant',serif"}}>{d.getDate()}</span>
                  </div>
                  {dayTasks.length>0&&<span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{doneTasks.length}/{dayTasks.length}</span>}
                </div>
                {anchors.slice(0,isSelected?100:3).map((a,j)=>(
                  <div key={j} style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                    <span style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",minWidth:32,flexShrink:0}}>{a.time}</span>
                    <span style={{fontSize:12,color:typeColor[a.type]||T.text2,lineHeight:1.2}}>{a.label}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {selectedDay&&(()=>{
          const d = new Date(selectedDay);
          const anchors = getAnchors(d);
          const dayTasks = getDayTasks(d);

          return(
            <div className="card" style={{marginTop:12,borderLeft:"3px solid "+T.teal}}>
              <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20,color:T.text0,marginBottom:12}}>
                {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][d.getDay()===0?6:d.getDay()-1]}, {d.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}
              </div>
              {[...anchors.map(a=>({...a,isAnchor:true})),
                ...dayTasks.filter(t=>t.preferredTime).map(t=>({time:t.preferredTime,label:t.title,type:"task",task:t}))
              ].sort((a,b)=>a.time.localeCompare(b.time)).map((ev,i)=>{
                return(
                  <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid "+T.bdrS}}>
                    <span style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",minWidth:44,flexShrink:0}}>{ev.time}</span>
                    <div style={{width:2,background:T.bdrS,borderRadius:1,flexShrink:0}}/>
                    <span style={{fontSize:13,color:typeColor[ev.type]||T.text2,flex:1}}>{ev.label}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </>}

      {view==="ai"&&<>
        {!aiText&&!loading&&(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>🗓️</div>
            <div style={{fontSize:15,color:T.text2,marginBottom:16}}>AI составит оптимальное расписание на неделю</div>
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
//  WORK
// ══════════════════════════════════════════════════════════════
function WorkSection({profile,tasks,setTasks,today,kb,notify}) {
  const [taskModal, setTaskModal] = useState(null);
  const isWorkDay = (profile.workDaysList||[1,2,3,4,5]).includes(new Date().getDay());
  
  const workTasks = tasks.filter(t=>t.section==="work" && !t.isDeadline);

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:10,marginBottom:10,flexWrap:"wrap"}}>
        {profile.profession&&<span style={{fontSize:13,color:T.text1,fontWeight:500}}>💼 {profile.profession}</span>}
        {profile.workType&&<span style={{fontSize:12,color:T.text3}}>· {profile.workType}</span>}
        <span style={{fontSize:12,color:T.gold,marginLeft:"auto"}}>🕐 {profile.workStart||"09:00"}–{profile.workEnd||"18:00"}</span>
      </div>

      {!isWorkDay&&<div style={{marginBottom:10,padding:"8px 14px",background:"rgba(200,164,90,.08)",borderRadius:9,fontSize:14,color:T.gold,fontStyle:"italic"}}>Сегодня нерабочий день ✦ Отдыхай</div>}

      <AiBox kb={kb} prompt={
        "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО на русском языке.\n\n"+
        "ПРОФИЛЬ:\n"+
        "- Профессия: "+(profile.profession||"—")+"\n"+
        "- Сфера: "+(profile.jobSphere||"—")+"\n"+
        "- Режим: "+(profile.workType||"—")+"\n"+
        "- График: "+(profile.workStart||"09:00")+"–"+(profile.workEnd||"18:00")+"\n"+
        "- Что вдохновляет: "+(profile.workInspire||"—")+"\n"+
        "- Что истощает: "+((profile.workDrain||[]).join(", ")||"—")+"\n"+
        "- Хронотип: "+(profile.chronotype||"—")+"\n\n"+
        "Дай 5 конкретных рекомендаций для повышения эффективности рабочего дня."
      } label="Советы по работе" btnText="Получить рекомендации" placeholder="Анализирую профиль..."/>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">Рабочие задачи</div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setTaskModal({})}>+ Добавить</button>
        </div>
        {workTasks.length===0&&<div className="empty"><span className="empty-ico">💼</span><p>Нет рабочих задач</p></div>}
        {workTasks.map(task=>{
          const done = task.doneDate===today;
          return (
            <div key={task.id} className="task-row">
              <div className={"chk"+(done?" done":"")} onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,doneDate:done?null:today,lastDone:done?t.lastDone:today}:t))}>{done?"✓":""}</div>
              <div className="task-body">
                <div className={"task-name"+(done?" done":"")}>{task.title}</div>
                <div className="task-meta">
                  {task.preferredTime&&<span className="badge bt">🕐{task.preferredTime}</span>}
                  {task.deadline&&<span className="badge bg">📅{new Date(task.deadline).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}</span>}
                </div>
              </div>
              <div className="ico-btn" onClick={()=>setTaskModal(task)}>✏️</div>
              <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
            </div>
          );
        })}
      </div>
      {taskModal!==null&&<TaskModal task={taskModal.id?taskModal:null} defaultSection="work" onSave={t=>{setTasks(p=>taskModal.id?p.map(x=>x.id===t.id?t:x):[...p,t]);notify(taskModal.id?"Обновлено":"Добавлено");}} onClose={()=>setTaskModal(null)}/>}
    </div>
  );
        }
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
    const hasKitchen  = rooms.includes("Кухня")   || true;
    const hasHall     = rooms.includes("Коридор")  || true;
    const hasLiving   = rooms.includes("Гостиная");
    const hasBalcony  = rooms.includes("Балкон");
    const hasStudy    = rooms.includes("Кабинет");
    const hasNursery  = rooms.includes("Детская");
    const hasPantry   = rooms.includes("Кладовка");

    items.push({title:"Вытереть пыль",         freq:"daily",    priority:"l"});
    items.push({title:"Помыть посуду",          freq:"daily",    priority:"m"});
    items.push({title:"Вынести мусор",          freq:"daily",    priority:"m"});
    if(hasKitchen) items.push({title:"Протереть плиту и варочную",freq:"daily",priority:"l"});
    if(hasKitchen) items.push({title:"Протереть кухонные поверхности",freq:"every:2",priority:"l"});

    for(let i=1;i<=beds;i++){
      const lbl = beds>1 ? ` (спальня ${i})` : "";
      items.push({title:`Проветрить спальню${lbl}`,  freq:"daily",    priority:"l"});
      items.push({title:`Смена постельного${lbl}`,   freq:"every:7",  priority:"m"});
      items.push({title:`Пылесос в спальне${lbl}`,   freq:"every:7",  priority:"m"});
    }

    for(let i=1;i<=baths;i++){
      const lbl = baths>1 ? ` (санузел ${i})` : "";
      items.push({title:`Сантехника${lbl}`,          freq:"weekly:3", priority:"m"});
      items.push({title:`Зеркала${lbl}`,             freq:"weekly:1", priority:"l"});
    }

    if(hasHall) items.push({title:"Подмести коридор", freq:"every:2",  priority:"l"});
    if(hasLiving) items.push({title:"Пылесос в гостиной", freq:"weekly:2", priority:"m"});
    if(profile.plants&&profile.plants!=="Нет") items.push({title:"Полить цветы", freq:"every:2", priority:"m"});

    // Сезонные задачи
    const month = new Date().getMonth()+1;
    if(month===3||month===4){
      items.push({title:"🌸 Убрать зимние вещи", freq:"once", priority:"h"});
      items.push({title:"🌸 Достать весеннюю одежду", freq:"once", priority:"h"});
    }
    if(month===10){
      items.push({title:"🍂 Достать зимние вещи", freq:"once", priority:"h"});
      items.push({title:"🍂 Убрать летнюю одежду", freq:"once", priority:"h"});
    }

    return items.map(t=>({...t,id:Date.now()+Math.random(),section:"home",lastDone:"",doneDate:"",notes:t.notes||""}));
  };
  
  const homeTasks=tasks.filter(t=>t.section==="home");
  const due=homeTasks.filter(t=>isDue(t,today));
  
  const classifyTask = (f) => {
    if(!f) return "other";
    if(f==="once") return "other";
    if(f==="daily" || f==="workdays") return "today";
    const ev = f.match(/^every:(\d+)$/);
    if(ev) {
      const n = parseInt(ev[1]);
      if(n <= 1) return "today";
      if(n <= 7) return "week";
      if(n <= 90) return "month";
      return "other";
    }
    if(f.startsWith("weekly:")) return "week";
    if(f.startsWith("monthly:")) return "month";
    return "other";
  };
  
  const todayTasks = homeTasks.filter(t=>classifyTask(t.freq)==="today" && isDue(t,today));
  const weekTasks = homeTasks.filter(t=>classifyTask(t.freq)==="week" && isDue(t,today) && t.lastDone);
  const monthTasks = homeTasks.filter(t=>classifyTask(t.freq)==="month" && isDue(t,today) && t.lastDone);
  const otherTasks = homeTasks.filter(t=>classifyTask(t.freq)==="other" && isDue(t,today) && t.lastDone);

  const renderGroup = (title, emoji, color, list) => list.length===0 ? null : (
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
            <div className="task-meta">{task.notes&&<span className="badge bm" style={{fontStyle:"italic"}}>{task.notes.slice(0,30)}</span>}</div>
          </div>
          <div className="ico-btn" style={{color:T.teal,opacity:.7}} onClick={()=>setModal(task)}>✏️</div>
          <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
        </div>
      ))}
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:10,marginBottom:10,flexWrap:"wrap"}}>
        {profile.homeType&&<span style={{fontSize:12,color:T.text2}}>🏠 {profile.homeType}{profile.homeArea?" "+profile.homeArea+"м²":""}</span>}
        {(profile.livesWith||[]).length>0&&<span style={{fontSize:12,color:T.text3}}>· {(profile.livesWith||[]).join(", ")}</span>}
      </div>
      
      {homeTasks.length===0&&(
        <div className="card" style={{textAlign:"center",padding:"28px 20px"}}>
          <div style={{fontSize:14,color:T.text3,marginBottom:16,fontStyle:"italic"}}>Добавь домашние дела или создай расписание уборки автоматически</div>
          <button className="btn btn-primary" onClick={()=>{const ts=autoHome();setTasks(p=>{const exist=new Set(p.filter(x=>x.section==="home").map(x=>x.title.toLowerCase()));const filtered=ts.filter(t=>!exist.has(t.title.toLowerCase()));notify("Добавлено "+filtered.length+" задач");return [...p,...filtered];});}}>✦ Создать расписание уборки</button>
        </div>
      )}
      
      {homeTasks.length>0&&(
        <>
          <div className="card-hd" style={{marginBottom:8}}>
            <div className="card-title">Дела по дому</div>
            <div className="btn-row">
              <button className="btn btn-ghost btn-sm" onClick={()=>{const ts=autoHome();setTasks(p=>{const exist=new Set(p.filter(x=>x.section==="home").map(x=>x.title.toLowerCase()));const filtered=ts.filter(t=>!exist.has(t.title.toLowerCase()));notify(filtered.length>0?"Добавлено "+filtered.length:"Все задачи уже есть");return [...p,...filtered];});}}>+ Авто</button>
              <button className="btn btn-primary btn-sm" onClick={()=>setModal({})}>+ Своё дело</button>
            </div>
          </div>
          {renderGroup("Сегодня", "☀️", T.success, todayTasks)}
          {renderGroup("На этой неделе", "📅", T.teal, weekTasks)}
          {renderGroup("В этом месяце", "🗓️", T.warn, monthTasks)}
          {otherTasks.length>0 && renderGroup("Прочее", "📋", T.text3, otherTasks)}
        </>
      )}

      {modal!==null&&(()=>{
        const isEdit = !!modal.id;
        const cur = isEdit ? modal : ht;
        const upd = isEdit ? (k,v) => setModal(p=>({...p,[k]:v})) : updHt;
        const freqOptions = [
          {v:"daily",l:"Каждый день"},{v:"every:2",l:"Каждые 2 дня"},{v:"every:3",l:"Каждые 3 дня"},
          {v:"weekly:1",l:"Раз в неделю (пн)"},{v:"weekly:3",l:"Раз в неделю (ср)"},{v:"weekly:6",l:"Раз в неделю (сб)"},
          {v:"every:7",l:"Раз в 7 дней"},{v:"every:14",l:"Раз в 2 недели"},{v:"every:30",l:"Раз в месяц"},
          {v:"every:90",l:"Раз в 3 месяца"},{v:"once",l:"Один раз"},
        ];
        return(
          <div className="overlay" onClick={()=>setModal(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <span className="modal-x" onClick={()=>setModal(null)}>✕</span>
              <div className="modal-title">{isEdit?"Редактировать дело":"Добавить домашнее дело"}</div>
              <div className="fld"><label>Название дела</label><input placeholder="Погладить бельё, помыть окна..." value={cur.title} onChange={e=>upd("title",e.target.value)} autoFocus/></div>
              <div className="fld"><label>Как часто?</label><select value={cur.freq||"daily"} onChange={e=>upd("freq",e.target.value)}>{freqOptions.map(f=><option key={f.v} value={f.v}>{f.l}</option>)}</select></div>
              <div className="fld-row">
                <div className="fld"><label>Удобное время</label><input type="time" value={cur.preferredTime||""} onChange={e=>upd("preferredTime",e.target.value)}/></div>
                <div className="fld"><label>Приоритет</label><select value={cur.priority||"m"} onChange={e=>upd("priority",e.target.value)}><option value="l">Низкий</option><option value="m">Средний</option><option value="h">Высокий</option></select></div>
              </div>
              <div className="fld"><label>Заметка</label><input placeholder="Тёмное бельё отдельно..." value={cur.notes||""} onChange={e=>upd("notes",e.target.value)}/></div>
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
  const cats=["Продукты","Бытовая химия","Уход","Для питомцев","Одежда","Аптека","Другое"];
  
  const add=()=>{if(!newItem.trim())return;setShopList(p=>[...p,{id:Date.now(),name:newItem,cat:newCat,done:false}]);setNewItem("");notify("Добавлено");};
  const byCat=cats.reduce((a,c)=>({...a,[c]:shopList.filter(x=>x.cat===c)}),{});
  const doneN=shopList.filter(x=>x.done).length;
  
  const catEmoji = {"Продукты":"🥦","Бытовая химия":"🧼","Уход":"✨","Для питомцев":"🐾","Одежда":"👕","Аптека":"💊","Другое":"📦"};
  const catColor = {"Продукты":"#7BCCA0","Бытовая химия":"#82AADD","Уход":"#E8A8C8","Для питомцев":"#E8A85A","Одежда":"#B882E8","Аптека":T.danger,"Другое":"#A8A49C"};

  return(
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:10,marginBottom:10,alignItems:"center"}}>
        {profile.shopFreq&&<span style={{fontSize:12,color:T.text2}}>🛒 {profile.shopFreq}</span>}
        {profile.shopDay&&<span style={{fontSize:12,color:T.gold}}>· 📅 {profile.shopDay}</span>}
      </div>

      <AiBox kb={kb} prompt={
        "Составь список покупок на неделю. Всегда есть дома: "+((profile.staples||[]).join(", ")||"—")+
        ". Тип питания: "+(profile.nutrition||"обычное")+". "+
        "Дай заголовки разделов через ## и нумерованный список."
      } label="Список покупок на неделю" btnText="Составить список" placeholder="Составлю список..." actionType="shopping" onShopAdd={setShopList}/>

      <div className="card">
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          <input style={{flex:"1 1 180px",padding:"10px 14px",background:"rgba(255,255,255,.03)",border:"1px solid "+T.bdr,borderRadius:10,color:T.text0,fontFamily:"'Crimson Pro',serif",fontSize:16,outline:"none"}} placeholder="Добавить товар..." value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
          <select style={{padding:"10px",background:T.bg2,border:"1px solid "+T.bdr,borderRadius:10,color:T.text1,fontSize:14,outline:"none"}} value={newCat} onChange={e=>setNewCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select>
          <button className="btn btn-primary btn-sm" onClick={add}>+</button>
        </div>
        {shopList.length===0&&<div className="empty"><span className="empty-ico">🛒</span><p>Список пуст</p></div>}
        {cats.filter(c=>byCat[c].length>0).map(cat=>{
          const itemsLeft = byCat[cat].filter(x=>!x.done).length;
          const itemsDone = byCat[cat].filter(x=>x.done).length;
          return (
            <div key={cat} style={{marginBottom:14,background:"rgba(255,255,255,0.02)",border:"1px solid "+catColor[cat]+"33",borderRadius:14,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"linear-gradient(135deg, "+catColor[cat]+"22, "+catColor[cat]+"08)",borderBottom:"1px solid "+catColor[cat]+"22"}}>
                <span style={{fontSize:22}}>{catEmoji[cat]||"📦"}</span>
                <span style={{flex:1,fontFamily:"'Cormorant Infant',serif",fontSize:18,color:catColor[cat],fontWeight:600}}>{cat}</span>
                <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:T.text2,letterSpacing:1}}>{itemsLeft}{itemsDone>0?` / ${itemsDone}✓`:""}</span>
              </div>
              <div style={{padding:"4px 12px"}}>
                {byCat[cat].map(item=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 4px",borderBottom:`1px solid rgba(255,255,255,.03)`}}>
                    <div className={`chk${item.done?" done":""}`} style={{borderColor:item.done?catColor[cat]:T.bdr,background:item.done?catColor[cat]:"transparent"}} onClick={()=>setShopList(p=>p.map(x=>x.id===item.id?{...x,done:!x.done}:x))}>{item.done?"✓":""}</div>
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
          </div>
        );
      })}
    </div>
  );
                                                               }
  }
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
    if(days>300) warnings.push({emoji:"🔧",title:"Пора на ТО",desc:"Прошло "+Math.floor(days/30)+" мес.",urgent:true});
    else if(days>240) warnings.push({emoji:"🔧",title:"Скоро ТО",desc:"До ТО ~"+Math.floor((365-days)/30)+" мес."});
  }
  const isSpring=month>=3&&month<=5; const isAutumn=month>=9&&month<=11;
  if(profile.carTireType==="Зимняя"&&isSpring) warnings.push({emoji:"🔄",title:"Меняй на летнюю резину",desc:"Стабильно выше +7°C — пора",urgent:true});
  if(profile.carTireType==="Летняя"&&isAutumn) warnings.push({emoji:"🔄",title:"Меняй на зимнюю резину",desc:"Не жди первого снега",urgent:true});

  const addCarTask=(title,notes="")=>{
    setTasks(p=>[...p,{id:Date.now()+Math.random(),title,section:"work",freq:"once",priority:"h",
      deadline:"",notes,preferredTime:"09:00",lastDone:"",doneDate:""}]);
    notify("Добавлено в задачи ✦");
  };

  return(
    <div>
      <div className="card card-accent" style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:4}}>МОЙ АВТОМОБИЛЬ</div>
            <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20,color:T.text0}}>{profile.carModel||"—"} {profile.carYear&&"("+profile.carYear+")"}</div>
            <div style={{fontSize:12,color:T.text3}}>Пробег: {profile.carMileage?profile.carMileage+" км":"не указан"}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setEditCar(e=>!e)}>✏️</button>
        </div>
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
              <div className="fld"><label>Страховка до</label><input type="date" value={car.insurance} onChange={e=>setCar(p=>({...p,insurance:e.target.value}))}/></div>
              <div className="fld"><label>Техосмотр до</label><input type="date" value={car.techCheck} onChange={e=>setCar(p=>({...p,techCheck:e.target.value}))}/></div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <button className="btn btn-ghost" onClick={()=>setEditCar(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={saveCar}>Сохранить</button>
            </div>
          </div>
        )}
      </div>

      {warnings.length>0&&(
        <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.danger}}>
          <div style={{fontSize:10,color:T.danger,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:8}}>⚠️ ТРЕБУЕТ ВНИМАНИЯ</div>
          {warnings.map((w,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid "+T.bdrS}}>
              <span style={{fontSize:20,flexShrink:0}}>{w.emoji}</span>
              <div style={{flex:1}}><div style={{fontSize:14,color:w.urgent?T.danger:T.warn,fontWeight:600}}>{w.title}</div><div style={{fontSize:12,color:T.text3}}>{w.desc}</div></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>addCarTask(w.title,w.desc)}>+ задача</button>
            </div>
          ))}
        </div>
      )}

      <AiBox kb={kb}
        prompt={"АВТОМОБИЛЬ: "+(profile.carModel||"—")+", год "+(profile.carYear||"—")+", пробег "+(profile.carMileage||"—")+" км. "+
          "Дай 3 конкретные рекомендации по обслуживанию прямо сейчас."}
        label="AI советы по авто" btnText="Получить советы" placeholder="Дам советы по обслуживанию..."/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════════════════════════════
function HealthSection({profile,tasks,setTasks,setShopList,today,kb,notify}) {
  const [modal,setModal]=useState(null);
  const [weekMenu,setWeekMenu]=useState(()=>{try{return JSON.parse(localStorage.getItem("ld_week_menu")||"null");}catch{return null;}});
  const [menuLoading,setMenuLoading]=useState(false);
  const moon=getMoon();
  const healthTasks=tasks.filter(t=>t.section==="health");
  const due=healthTasks.filter(t=>isDue(t,today));

  const generateMenu = async () => {
    setMenuLoading(true);
    const tcm = getTCMFullProfile(profile);
    const prompt =
      "СИСТЕМНОЕ ТРЕБОВАНИЕ: отвечай ТОЛЬКО валидным JSON без markdown.\n\n"+
      "Составь меню питания на 7 дней. Тип питания: "+(profile.nutrition||"обычное")+
      ". Цель: "+(profile.healthGoal||"—")+". ТКМ стихия: "+(tcm?.el?.name||"—")+
      ". Продукты дома: "+((profile.staples||[]).join(", ")||"—")+
      ". Формат: JSON с days[].meals[{type,name,ingredients,why,calories}]";
    try {
      const raw = await askClaude(kb, prompt, 4000);
      const data = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setWeekMenu(data);
      try{localStorage.setItem("ld_week_menu", JSON.stringify(data));}catch{}
      notify("Меню на неделю составлено ✦");
    } catch(e) { notify("Ошибка генерации меню"); }
    setMenuLoading(false);
  };

  const autoHealth=()=>{
    const items=[];
    if((profile.sport||[]).length>0)items.push({title:profile.sport[0],freq:"weekly:1,3,5",priority:"m"});
    if((profile.practices||[]).includes("Медитация"))items.push({title:"Медитация 10–15 мин",freq:"daily",priority:"m"});
    items.push({title:"8 стаканов воды",freq:"daily",priority:"l"});
    return items.map(t=>({...t,id:Date.now()+Math.random(),section:"health",lastDone:"",doneDate:"",notes:""}));
  };

  return(
    <div>
      <div className="card card-accent">
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8}}>
          {(profile.healthFocus||[]).map(h=><span key={h} className="badge bgr">{h}</span>)}
          {profile.chronic&&<span className="badge bw">⚠ {profile.chronic}</span>}
        </div>
        <div style={{fontSize:13,color:T.text3}}>Цель: {profile.healthGoal||"—"} · Питание: {profile.nutrition||"—"}</div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <button className="btn btn-primary btn-sm" onClick={generateMenu} disabled={menuLoading} style={{flex:1}}>
          {menuLoading?"⏳...":"🍽 Составить меню на неделю"}
        </button>
      </div>

      {weekMenu&&weekMenu.days&&(
        <div className="card" style={{marginBottom:12}}>
          <div className="card-title" style={{marginBottom:10}}>Меню на неделю</div>
          {weekMenu.days.map((d,di)=>(
            <details key={di} style={{marginBottom:8}}>
              <summary style={{cursor:"pointer",fontSize:14,color:T.gold,fontWeight:500}}>{d.day}</summary>
              <div style={{marginTop:8}}>
                {(d.meals||[]).map((meal,mi)=>(
                  <div key={mi} style={{padding:"8px 0",borderBottom:"1px solid "+T.bdrS}}>
                    <div style={{fontSize:13,color:T.text1,fontWeight:500}}>🍽 {meal.name} {meal.calories&&<span style={{color:T.text3,fontSize:11}}>({meal.calories} ккал)</span>}</div>
                    {(meal.ingredients||[]).length>0&&<div style={{fontSize:11,color:T.text3,marginTop:2}}>{(meal.ingredients||[]).map(i=>i.name+" "+i.amount).join(", ")}</div>}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-hd">
          <div className="card-title">Здоровые привычки</div>
          <button className="btn btn-ghost btn-sm" onClick={()=>{const ts=autoHealth();setTasks(p=>[...p,...ts]);notify("Добавлено");}}>✦ Авто</button>
        </div>
        {due.length===0&&<div className="empty"><span className="empty-ico">🌿</span><p>Задач на сегодня нет</p></div>}
        {due.map(task=>(
          <div key={task.id} className="task-row">
            <div className={"chk"+(task.doneDate===today?" done":"")} onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t))}>{task.doneDate===today?"✓":""}</div>
            <div className="task-body"><div className={"task-name"+(task.doneDate===today?" done":"")}>{task.title}</div><div className="task-meta"><span className="badge bt">{freqLabel(task.freq)}</span></div></div>
            <div className="ico-btn" onClick={()=>setModal(task)} style={{color:T.teal,opacity:.7}}>✏️</div>
            <div className="ico-btn danger" onClick={()=>setTasks(p=>p.filter(t=>t.id!==task.id))}>✕</div>
          </div>
        ))}
      </div>
      {modal!==null&&<TaskModal task={modal.id?modal:null} defaultSection="health" onSave={t=>{setTasks(p=>modal.id?p.map(x=>x.id===t.id?t:x):[...p,t]);notify("Добавлено");}} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  BEAUTY
// ══════════════════════════════════════════════════════════════
function BeautySection({profile,tasks,setTasks,today,kb,notify}) {
  const [modal,setModal]=useState(null);
  const isMale = profile.gender === "Мужской";
  const moon = getMoon();
  const beautyTasks = tasks.filter(t=>t.section==="beauty");
  const due = beautyTasks.filter(t=>isDue(t,today));

  const TOPICS = isMale ? [
    {cat:"Лицо", items:[
      {id:"face_morning", name:"Умывание утром", freq:"daily", time:"07:00", icon:"💧", dur:10},
      {id:"face_evening", name:"Умывание вечером", freq:"daily", time:"21:00", icon:"🌙", dur:10},
    ]},
    {cat:"Борода и волосы", items:[
      {id:"beard_care", name:"Уход за бородой", freq:"every:2", time:"08:00", icon:"🧔", dur:10},
      {id:"hair_wash", name:"Мытьё волос", freq:"every:2", time:"20:00", icon:"🚿", dur:20},
      {id:"haircut", name:"Стрижка / барбер", freq:"every:30", time:"", icon:"✂️", dur:60},
    ]},
  ] : [
    {cat:"Уход за лицом", items:[
      {id:"face_morning", name:"Утренний уход", freq:"daily", time:"07:00", icon:"☀️", dur:10},
      {id:"face_evening", name:"Вечерний уход", freq:"daily", time:"21:00", icon:"🌙", dur:15},
      {id:"face_mask", name:"Маска для лица", freq:"every:3", time:"20:00", icon:"🎭", dur:20},
    ]},
    {cat:"Уход за телом", items:[
      {id:"body_cream", name:"Крем для тела", freq:"daily", time:"20:00", icon:"🧴", dur:5},
      {id:"body_scrub", name:"Скраб для тела", freq:"every:4", time:"20:00", icon:"🫧", dur:15},
    ]},
    {cat:"Уход за волосами", items:[
      {id:"hair_wash", name:"Мытьё волос", freq:"every:2", time:"20:00", icon:"🚿", dur:20},
      {id:"hair_mask", name:"Маска для волос", freq:"every:7", time:"20:00", icon:"💆", dur:40},
    ]},
  ];

  const allItems = TOPICS.flatMap(t=>t.items);

  const addBeautyProc = (item) => {
    const task = {
      id: Date.now()+Math.random(),
      beautyId: item.id,
      title: item.name,
      section: "beauty",
      freq: item.freq,
      priority: "m",
      preferredTime: item.time||"20:00",
      beautyDuration: item.dur||15,
      deadline: "",
      notes: "",
      lastDone: "", doneDate: ""
    };
    setTasks(p=>[...p.filter(t=>!(t.section==="beauty"&&t.beautyId===item.id)), task]);
    notify(item.name+" добавлено ✦");
  };

  return(
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 12px",background:"rgba(45,32,16,0.05)",borderRadius:10,marginBottom:12,alignItems:"center"}}>
        {profile.skinType&&<span style={{fontSize:12,color:T.text2}}>✨ {profile.skinType}</span>}
        {!isMale&&profile.hairType&&<span style={{fontSize:12,color:T.text3}}>· 💇 {profile.hairType}</span>}
        {isMale&&profile.beard&&<span style={{fontSize:12,color:T.text3}}>· 🧔 {profile.beard}</span>}
        <span style={{fontSize:11,color:T.gold,marginLeft:"auto",fontFamily:"'JetBrains Mono'"}}>{moon.e} {moon.n}</span>
      </div>

      {TOPICS.map(cat=>(
        <div key={cat.cat} style={{marginBottom:12}}>
          <div style={{fontSize:11,color:T.gold,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8}}>{cat.cat.toUpperCase()}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {cat.items.map(item=>{
              const alreadyAdded = beautyTasks.some(t=>t.beautyId===item.id);
              return (
                <div key={item.id} onClick={()=>{if(!alreadyAdded) addBeautyProc(item);}}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:20,cursor:alreadyAdded?"default":"pointer",
                    background:alreadyAdded?"rgba(123,204,160,0.15)":"rgba(255,255,255,0.03)",
                    border:"1px solid "+(alreadyAdded?T.success+"88":"rgba(255,255,255,0.08)"),
                    opacity:alreadyAdded?0.7:1,transition:"all .15s"}}>
                  <span style={{fontSize:16}}>{item.icon}</span>
                  <div>
                    <div style={{fontSize:13,color:alreadyAdded?T.success:T.text0}}>{item.name}</div>
                    <div style={{fontSize:10,color:T.text3}}>{freqLabel(item.freq)} · {item.dur} мин</div>
                  </div>
                  {alreadyAdded&&<span style={{fontSize:12,color:T.success}}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {due.length>0&&(
        <div className="card" style={{marginBottom:10}}>
          <div className="card-title" style={{marginBottom:10}}>Сегодня</div>
          {due.map(task=>(
            <div key={task.id} className="task-row">
              <div className={"chk"+(task.doneDate===today?" done":"")} onClick={()=>setTasks(p=>p.map(t=>t.id===task.id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t))}>{task.doneDate===today?"✓":""}</div>
              <div className="task-body">
                <div className={"task-name"+(task.doneDate===today?" done":"")}>{task.title}</div>
                <div className="task-meta"><span className="badge bp">{freqLabel(task.freq)}</span>{task.preferredTime&&<span className="badge bg">🕐{task.preferredTime}</span>}</div>
              </div>
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
        "ХОББИ: "+((profile.hobbies||[]).join(", ")||"—")+
        ". Проект: "+(profile.hobbyProject||"—")+
        ". Свободное время: с "+(profile.workEnd||"18:00")+" до "+(profile.sleep||"23:00")+
        ". Дай конкретный план для хобби."
      } label="Хобби и увлечения" btnText="Советы по хобби" placeholder="Составляю план для хобби..."/>
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
            <div className="fld"><label>Название</label><input placeholder="Фотография, чтение..." value={nh.name} onChange={e=>setNh(p=>({...p,name:e.target.value}))}/></div>
            <div className="fld"><label>Цель / проект</label><input placeholder="Освоить ретушь..." value={nh.goal} onChange={e=>setNh(p=>({...p,goal:e.target.value}))}/></div>
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
  const [tab, setTab] = useState("goal");

  const AREA_EMOJI = {"Здоровье":"💚","Карьера":"💼","Финансы":"💰","Отношения":"❤️","Саморазвитие":"📚","Творчество":"🎨","Путешествия":"✈️","Духовность":"🌟","Семья":"👨‍👩‍👧","Внешность":"✨"};

  const saveGoal = () => {
    setProfile(p=>({...p, mainGoal: newGoal, goalAreas: newAreas, goalBlocks: newBlocks, goalDeadline: newDeadline}));
    setEditGoal(false);
    notify("Цель обновлена ✦");
  };

  const [wheelScores, setWheelScores] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("ld_wheel")||"null")||{}; }
    catch { return {}; }
  });

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

  const updateScore=(name,val)=>{
    const next={...wheelScores,[name]:val};
    setWheelScores(next);
    try{localStorage.setItem("ld_wheel",JSON.stringify(next));}catch{}
  };

  const mainGoal = profile.mainGoal||"";
  const goalAreas = profile.goalAreas||[];

  return(
    <div>
      <div className="tabs" style={{marginBottom:14}}>
        {[["goal","🎯 Цель"],["wheel","🔄 Колесо"],["plan","📋 План"]].map(([v,l])=>(
          <div key={v} className={"tab"+(tab===v?" on":"")} onClick={()=>setTab(v)}>{l}</div>
        ))}
      </div>

      {tab==="goal"&&<>
        {!editGoal&&(
          <div className="card card-accent" style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2}}>ТЕКУЩАЯ ЦЕЛЬ</div>
              <button className="btn btn-ghost btn-sm" onClick={()=>{setNewGoal(mainGoal);setNewAreas(goalAreas);setEditGoal(true);}}>✏️ Изменить</button>
            </div>
            {mainGoal
              ? <>
                  <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,color:T.gold,lineHeight:1.3,marginBottom:8}}>{mainGoal}</div>
                  {goalAreas.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{goalAreas.map(a=><span key={a} style={{fontSize:12,padding:"4px 10px",borderRadius:20,background:"rgba(45,106,79,0.12)",color:T.success}}>{AREA_EMOJI[a]||""} {a}</span>)}</div>}
                </>
              : <div style={{fontSize:15,color:T.text3,fontStyle:"italic"}}>Цель не установлена</div>
            }
          </div>
        )}

        {editGoal&&(
          <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.gold}}>
            <div className="fld"><label>Моя цель</label><textarea placeholder="Конкретно и измеримо..." value={newGoal} onChange={e=>setNewGoal(e.target.value)} style={{minHeight:72}}/></div>
            <div className="fld"><label>Срок достижения</label><input type="date" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)}/></div>
            <div className="fld"><label>Сферы жизни</label>
              <div className="chips">{["Здоровье","Карьера","Финансы","Отношения","Саморазвитие","Творчество","Духовность","Семья","Внешность"].map(v=>(
                <div key={v} className={"chip "+(newAreas.includes(v)?"on":"")} onClick={()=>setNewAreas(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])}>{AREA_EMOJI[v]||""} {v}</div>
              ))}</div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button className="btn btn-ghost" onClick={()=>setEditGoal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={saveGoal}>Сохранить цель ✦</button>
            </div>
          </div>
        )}

        {!editGoal&&mainGoal&&(
          <AiBox kb={kb} prompt={"Составь план достижения цели: "+mainGoal+". Срок: "+(profile.goalDeadline||"3 мес.")+". Дай 3 конкретных шага на эту неделю."}
            label="План достижения цели" btnText="Составить план" placeholder="Составляю план..."/>
        )}
      </>}

      {tab==="wheel"&&<>
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:2,marginBottom:8,textAlign:"center"}}>КОЛЕСО ЖИЗНИ — нажми на сектор</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {WHEEL_AREAS.map((area,i)=>(
              <div key={area.name} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,cursor:"pointer",
                background:"rgba(45,32,16,0.03)",border:"1px solid "+T.bdrS}}>
                <span style={{fontSize:18}}>{area.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:T.text1}}>{area.name}</div>
                  <input type="range" min="1" max="10" value={wheelScores[area.name]||5} onChange={e=>updateScore(area.name,parseInt(e.target.value))} style={{width:"100%"}}/>
                </div>
                <span style={{fontSize:14,fontWeight:700,color:area.color}}>{wheelScores[area.name]||5}</span>
              </div>
            ))}
          </div>
        </div>
      </>}

      {tab==="plan"&&<>
        {mainGoal?(
          <AiBox kb={kb} prompt={"Детальный еженедельный план: "+mainGoal+". Срок: "+(profile.goalDeadline||"3 мес.")+". Сферы: "+(goalAreas.join(",")||"—")+"."}
            label="Подробный план на месяц" btnText="Составить план" placeholder="Составляю пошаговый план..."/>
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

// ══════════════════════════════════════════════════════════════
//  MENTAL
// ══════════════════════════════════════════════════════════════
function MentalSection({profile,kb,notify}) {
  const [mood, setMood] = useState(()=>{ try{return JSON.parse(localStorage.getItem("mental_mood")||"3");}catch{return 3;} });
  const [stress, setStress] = useState(()=>{ try{return JSON.parse(localStorage.getItem("mental_stress")||"5");}catch{return 5;} });
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const moon = getMoon();
  const freeFrom = profile.workEnd||"18:00";

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

  const moodEmoji = ["😔","😟","😐","🙂","😊","🤩"][mood] || "😐";
  const stressColor = stress<=3?T.success:stress<=6?T.warn:T.danger;

  return(
    <div>
      <div style={{padding:"12px 14px",background:"rgba(200,164,90,0.06)",borderRadius:12,border:"1px solid rgba(200,164,90,0.15)",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span style={{fontSize:28}}>{moodEmoji}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>НАСТРОЕНИЕ</div>
            <input type="range" min="0" max="5" step="1" value={mood} onChange={e=>setMood(parseInt(e.target.value))} style={{width:"100%",accentColor:T.gold}}/>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span style={{fontSize:16,width:28,textAlign:"center"}}>{stress<=3?"😌":stress<=6?"😤":"😰"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:4}}>СТРЕСС</div>
            <input type="range" min="1" max="10" step="1" value={stress} onChange={e=>setStress(parseInt(e.target.value))} style={{width:"100%",accentColor:stressColor}}/>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:stressColor,fontFamily:"'JetBrains Mono'"}}>{stress}/10</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input style={{flex:1,padding:"7px 10px",background:"rgba(255,255,255,0.03)",border:"1px solid "+T.bdr,borderRadius:8,color:T.text0,fontSize:14,outline:"none"}} placeholder="Что на душе?..." value={note} onChange={e=>setNote(e.target.value)}/>
          <button className="btn btn-primary btn-sm" onClick={saveMoodLog}>{saved?"✓":"Записать"}</button>
        </div>
      </div>

      <AiBox kb={kb} prompt={
        "Дай персональный план восстановления. Настроение: "+mood+"/5. Стресс: "+stress+"/10. "+
        "Стрессоры: "+((profile.stressors||[]).join(",")||"—")+". Восстановление: "+((profile.recovery||[]).join(",")||"—")+
        ". Хронотип: "+(profile.chronotype||"—")+". Свободен(а) после: "+freeFrom+". Луна: "+moon.n+
        ". Дай: 1) экстренную технику сейчас, 2) вечерний ритуал, 3) аффирмацию под ценность "+(profile.coreValue||"—")+"."
      } label="План восстановления" btnText="Получить план" placeholder="Составляю персональный план..."/>

      <div className="card" style={{marginTop:12}}>
        <div className="card-title" style={{marginBottom:10}}>Практики</div>

        <AiBox kb={kb} prompt={
          "Дай 4 конкретные практики: 1) Дыхание (техника + инструкция), 2) Медитация, 3) Йога/цигун, 4) Психология. "+
          "Свободное время: после "+freeFrom+". Луна: "+moon.n+"."
        } label="Практики на сегодня" btnText="Получить практики" placeholder="Подбираю практики..."/>
      </div>
    </div>
  );
                    }
// ══════════════════════════════════════════════════════════════
//  TRAVEL
// ══════════════════════════════════════════════════════════════
function TravelSection({profile,trips,setTrips,kb,notify}) {
  const [modal,setModal]=useState(false);
  const [nt,setNt]=useState({destination:"",targetDate:"",budget:"",saved:"",stage:"💭 Мечта",notes:""});
  const stages=["💭 Мечта","🗺️ Планирую","💰 Коплю","🎫 Билеты куплены","🏨 Забронировано","✅ Всё готово"];
  const upd=(id,k,v)=>setTrips(p=>p.map(t=>t.id===id?{...t,[k]:v}:t));
  const pct=s=>Math.round((stages.indexOf(s)+1)/stages.length*100);

  return(
    <div>
      <AiBox kb={kb} prompt={
        "ПОЕЗДКИ:\n"+
        (trips.length>0 ? trips.map(t=>"- "+t.destination+": стадия "+t.stage+(t.budget?", бюджет "+t.budget+" ₸":"")).join("\n") : "Поездок пока нет")+
        "\n\nДай: 1) как копить, 2) следующий шаг по каждой поездке, 3) лучшее время для поездки из Казахстана."
      } label="Путешествия" btnText="Советы по путешествиям" placeholder="Анализирую поездки..."/>
      
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
              <div className="prog"><div className="prog-fill" style={{width:progress+"%",background:"linear-gradient(90deg,"+T.info+","+T.teal+")"}}/></div>
            </div>
            {trip.budget&&<div style={{marginBottom:10}}>
              <div style={{fontFamily:"'JetBrains Mono'",fontSize:9,color:T.text3,letterSpacing:2,marginBottom:6,textTransform:"uppercase"}}>Накоплено {trip.saved||0}₽ из {trip.budget}₽ ({savedPct}%)</div>
              <div className="prog"><div className="prog-fill" style={{width:savedPct+"%",background:"linear-gradient(90deg,"+T.gold+","+T.goldL+")"}}/></div>
              <div style={{marginTop:8,display:"flex",gap:8,alignItems:"center"}}>
                <input style={{width:130,padding:"6px 11px",background:"rgba(255,255,255,.03)",border:"1px solid "+T.bdr,borderRadius:8,color:T.text0,fontSize:14,outline:"none"}} placeholder="Отложено ₽" value={trip.saved||""} onChange={e=>upd(trip.id,"saved",e.target.value)}/>
                {trip.budget&&trip.saved&&<span style={{fontSize:12,color:T.text3}}>осталось: {Math.max(0,parseInt(trip.budget)-parseInt(trip.saved))}₽</span>}
              </div>
            </div>}
            {trip.targetDate&&<button className="btn btn-ghost btn-sm" onClick={()=>openGCal(`✈ ${trip.destination}`,new Date(trip.targetDate).toISOString())}>📅 В календарь</button>}
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
      </div>

      {view==="today"&&(
        <div className="card">
          <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:10}}>
            {new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase()}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {["😔","😕","😐","🙂","😊","🤩"].map(m=>(
              <span key={m} onClick={()=>saveJ({mood:m})}
                style={{fontSize:22,cursor:"pointer",opacity:todayE.mood===m?1:0.4,transform:todayE.mood===m?"scale(1.2)":"scale(1)",transition:"all .15s"}}>
                {m}
              </span>
            ))}
          </div>
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

      {view==="all"&&(
        <div>
          {entries.length===0&&(<div className="empty"><span className="empty-ico">📖</span><p>Записей пока нет</p></div>)}
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
//  PROFILE
// ══════════════════════════════════════════════════════════════
function ProfileSection({profile,setProfile,sections,setSections,notify,kb}) {
  const [view,setView]=useState("me");
  const z=getZodiac(profile.dob);
  const east=getEastern(profile.dob);
  const deg=calcDegree(profile.fullName||profile.name);
  const moon=getMoon();

  return(
    <div>
      <div className="tabs" style={{marginBottom:14}}>
        {[["me","Мой профиль"],["sections","⚙️ Разделы"]].map(([v,l])=>(
          <div key={v} className={`tab${(view||"me")===v?" on":""}`} onClick={()=>setView(v)}>{l}</div>
        ))}
      </div>

      {(view==="me"||!view)&&(
        <div>
          <div className="card card-accent" style={{marginBottom:12}}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,"+T.gold+"66,"+T.goldD+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{profile.gender==="Женский"?"👩":"👤"}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:24,color:T.gold,marginBottom:4}}>{profile.name||"—"}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {profile.dob&&<span className="badge bg">🎂 {new Date(profile.dob).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</span>}
                  {profile.city&&<span className="badge bm">📍 {profile.city}</span>}
                </div>
              </div>
            </div>
          </div>

          {profile.dob&&(
            <div className="card" style={{marginBottom:12}}>
              <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>АСТРО-ПОРТРЕТ</div>
              <div style={{display:"flex",gap:10,padding:"8px 0",alignItems:"center"}}><span style={{fontSize:28}}>{z.emoji}</span><div><div style={{fontSize:16,color:T.gold,fontWeight:500}}>{z.name}</div><div style={{fontSize:12,color:T.text3}}>Знак зодиака</div></div></div>
              <div style={{display:"flex",gap:10,padding:"8px 0",alignItems:"center"}}><span style={{fontSize:28}}>🐉</span><div><div style={{fontSize:16,color:T.gold,fontWeight:500}}>{east}</div><div style={{fontSize:12,color:T.text3}}>Восточный знак</div></div></div>
              {deg&&<div style={{display:"flex",gap:10,padding:"8px 0",alignItems:"center"}}><span style={{fontFamily:"'Cinzel',serif",fontSize:28,color:T.gold,fontWeight:700,minWidth:36,textAlign:"center"}}>{deg}°</span><div><div style={{fontSize:16,color:T.gold,fontWeight:500}}>Градус судьбы</div><div style={{fontSize:12,color:T.text3}}>Нумерология имени</div></div></div>}
              <div style={{display:"flex",gap:10,padding:"8px 0",alignItems:"center"}}><span style={{fontSize:28}}>{moon.e}</span><div><div style={{fontSize:16,color:T.gold,fontWeight:500}}>{moon.n}</div><div style={{fontSize:12,color:T.text3}}>Луна сегодня</div></div></div>
            </div>
          )}

          {profile.dob&&(()=>{
            const tcm = getTCMFullProfile(profile);
            if(!tcm?.el) return null;
            const {el} = tcm;
            return(
              <div className="card" style={{marginBottom:12,borderLeft:"3px solid "+T.gold}}>
                <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>ТКМ-СТИХИЯ</div>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <span style={{fontSize:28}}>{el.emoji}</span>
                  <div>
                    <div style={{fontSize:16,color:T.gold,fontWeight:500}}>{el.name} {el.yin?"(Инь)":"(Ян)"}</div>
                    <div style={{fontSize:12,color:T.text2}}>Органы: {el.organ} · Сезон: {el.season} · Вкус: {el.taste}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="card" style={{marginBottom:12}}>
            <div style={{fontSize:11,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1.5,marginBottom:8}}>ХАРАКТЕР И ЛИЧНОСТЬ</div>
            <div className="g2" style={{gap:6}}>
              {[["Решения",profile.decisionStyle],["Энергия",profile.energySource],["Планы",profile.planningStyle],["Ценность",profile.coreValue]].map(([l,v])=>v?(
                <div key={l} style={{padding:"6px 10px",background:"rgba(45,32,16,0.04)",borderRadius:8}}>
                  <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:2}}>{l.toUpperCase()}</div>
                  <div style={{fontSize:13,color:T.text0}}>{v}</div>
                </div>
              ):null)}
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button className="btn btn-ghost" style={{flex:1,fontSize:13}} onClick={()=>{if(window.confirm("Обновить профиль?"))setProfile(null);}}>⟳ Обновить</button>
            <button className="btn btn-danger" style={{fontSize:13}} onClick={()=>{if(window.confirm("Сбросить весь профиль?"))setProfile(null);}}>⚠ Сбросить</button>
          </div>
        </div>
      )}

      {view==="sections"&&(
        <div>
          <div style={{fontSize:14,color:T.text2,marginBottom:12,lineHeight:1.5}}>Управляй видимостью разделов</div>
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
