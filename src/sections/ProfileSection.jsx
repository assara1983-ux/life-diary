// src/sections/ProfileSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { getTCMFullProfile } from '../core/calculations/tcm';

// --- КОНСТАНТЫ ---
const ZODIAC_DESC = {
  "Овен": "Лидер, первопроходец. Смелость, энергия, нетерпеливость. Стихия: Огонь · Планета: Марс",
  "Телец": "Надёжность, упорство, любовь к комфорту. Чувственность и практичность. Стихия: Земля · Планета: Венера",
  "Близнецы": "Коммуникабельность, гибкость ума, двойственность натуры. Стихия: Воздух · Планета: Меркурий",
  "Рак": "Интуиция, глубокая забота, эмоциональность, привязанность к дому. Стихия: Вода · Планета: Луна",
  "Лев": "Харизма, щедрость, лидерство, гордость. Творческое начало. Стихия: Огонь · Планета: Солнце",
  "Дева": "Аналитический ум, порядок, трудолюбие, перфекционизм. Стихия: Земля · Планета: Меркурий",
  "Весы": "Гармония, дипломатия, справедливость, красота. Стихия: Воздух · Планета: Венера",
  "Скорпион": "Глубина, трансформация, страстность и интенсивность. Стихия: Вода · Планета: Плутон",
  "Стрелец": "Свобода, оптимизм, философия, путешествия. Стихия: Огонь · Планета: Юпитер",
  "Козерог": "Амбиции, дисциплина, практичность, ответственность. Стихия: Земля · Планета: Сатурн",
  "Водолей": "Оригинальность, гуманизм, независимость. Нестандартное мышление. Стихия: Воздух · Планета: Уран",
  "Рыбы": "Интуиция, сострадание, мечтательность, духовность. Стихия: Вода · Планета: Нептун",
};

const EASTERN_DESC = {
  "Крыса": "Ум, адаптивность, предприимчивость. Отлично чувствует возможности и привлекает удачу в деньгах.",
  "Бык": "Терпение, трудолюбие, надёжность. Символ силы и выносливости, верный и последовательный.",
  "Тигр": "Смелость, обаяние, харизма. Природный лидер, который вдохновляет окружающих.",
  "Кролик": "Мягкость, дипломатия, творчество. Символ удачи, умеет создавать гармонию.",
  "Дракон": "Магнетизм, мощь, удача. Самый сильный знак — вдохновляет и притягивает успех.",
  "Змея": "Мудрость, интуиция, загадочность. Глубокий аналитический ум и дальновидность.",
  "Лошадь": "Свобода, энергия, скорость. Неугомонный дух и жажда новых впечатлений.",
  "Коза": "Творчество, мягкость, артистизм. Ценит красоту и создаёт уют вокруг.",
  "Обезьяна": "Интеллект, изобретательность, юмор. Находчивость и способность решать сложные задачи.",
  "Петух": "Наблюдательность, пунктуальность, прямолинейность. Ценит порядок и честность.",
  "Собака": "Верность, честность, защита. Надёжный друг, всегда встаёт на защиту близких.",
  "Свинья": "Щедрость, искренность, трудолюбие. Добросердечие и умение наслаждаться жизнью.",
};

const DEG_DESC = {
  1: "Лидерство, начало новых путей", 2: "Дипломатия, партнёрство", 3: "Творчество, самовыражение",
  4: "Стабильность, дисциплина", 5: "Свобода, перемены", 6: "Забота, гармония, ответственность",
  7: "Духовность, аналитика", 8: "Власть, материальный успех", 9: "Гуманизм, завершение цикла",
  10: "Карьера, достижение целей", 11: "Интуиция, нестандартное мышление", 12: "Жертвенность, духовность",
  13: "Трансформация", 14: "Равновесие", 15: "Мудрость", 16: "Неожиданные повороты",
  17: "Победа через усилие", 18: "Иллюзии vs реальность", 19: "Успех и признание", 20: "Суд и карма",
  21: "Завершение большого цикла", 22: "Мастер-число: строитель", 23: "Королевский градус — успех",
  24: "Любовь и творчество", 25: "Духовный поиск", 26: "Карма денег", 27: "Высшая мудрость",
  28: "Независимость", 29: "Критический градус — испытания и прорыв", 30: "Полнота цикла",
};

// --- ХЕЛПЕРЫ ---

// ✅ ИСПРАВЛЕНО: правильный расчёт возраста с учётом дня рождения
function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  // Если день рождения в этом году ещё не наступил — вычитаем 1
  const hasBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasBirthdayPassed) age--;
  return age;
}

function getZodiac(dob) {
  if (!dob) return { name: "—", emoji: "⭐" };
  const d = new Date(dob), m = d.getMonth() + 1, day = d.getDate();
  const z = [
    ["Козерог","♑",12,22,1,19],["Водолей","♒",1,20,2,18],["Рыбы","♓",2,19,3,20],
    ["Овен","♈",3,21,4,19],["Телец","♉",4,20,5,20],["Близнецы","♊",5,21,6,20],
    ["Рак","♋",6,21,7,22],["Лев","♌",7,23,8,22],["Дева","♍",8,23,9,22],
    ["Весы","⚖️",9,23,10,22],["Скорпион","♏",10,23,11,21],["Стрелец","♐",11,22,12,21],
  ];
  for (const [name, emoji, sm, sd, em, ed] of z) {
    if ((m === sm && day >= sd) || (m === em && day <= ed)) return { name, emoji };
  }
  return { name: "Козерог", emoji: "♑" };
}

function getEastern(dob) {
  if (!dob) return "—";
  return ["Крыса","Бык","Тигр","Кролик","Дракон","Змея","Лошадь","Коза","Обезьяна","Петух","Собака","Свинья"][
    (new Date(dob).getFullYear() - 4) % 12
  ];
}

function calcDegree(name) {
  if (!name) return null;
  const ru = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
  let s = 0;
  for (const c of name.toLowerCase()) {
    const i = ru.indexOf(c);
    if (i >= 0) s += i + 1;
  }
  return s % 360 || 360;
}

function getPersonalYear(dob) {
  if (!dob) return null;
  const now = new Date();
  const bd = new Date(dob);
  const sum = d => {
    let s = d;
    while (s > 9 && s !== 11 && s !== 22 && s !== 33) {
      s = String(s).split("").reduce((a, b) => a + parseInt(b), 0);
    }
    return s;
  };
  const py = sum(sum(bd.getDate()) + sum(bd.getMonth() + 1) + sum(String(now.getFullYear()).split("").reduce((a, b) => a + parseInt(b), 0)));
  const themes = {
    1: "Год новых начал. Время запускать проекты, делать первые шаги.",
    2: "Год партнёрства. Время сотрудничества, терпения, дипломатии.",
    3: "Год творчества. Время самовыражения, общения, радости.",
    4: "Год труда. Время строить фундамент, работать системно.",
    5: "Год перемен. Время свободы, движения, новых возможностей.",
    6: "Год ответственности. Время семьи, заботы, гармонии дома.",
    7: "Год рефлексии. Время углублённого анализа, духовного поиска.",
    8: "Год достижений. Время карьеры, финансового роста, реализации амбиций.",
    9: "Год завершения. Время подводить итоги, отпускать старое.",
    11: "Год интуиции. Высокая чувствительность, духовные откровения, творческий подъём.",
    22: "Год мастера. Масштабные достижения, строительство чего-то значимого.",
    33: "Год учителя. Служение, вдохновение других, духовная мудрость.",
  };
  return { py, theme: themes[py] || "" };
}

function getMoon(dt = new Date()) {
  const p = ((dt - new Date("2024-01-11")) / 86400000 % 29.53 + 29.53) % 29.53;
  if (p < 1.85) return { n: "Новолуние", e: "🌑", t: "Начало" };
  if (p < 7.38) return { n: "Растущая", e: "🌒", t: "Рост" };
  if (p < 14.76) return { n: "Полнолуние", e: "🌕", t: "Пик" };
  return { n: "Убывающая", e: "🌖", t: "Итоги" };
}

function getStrengthsWeaknesses(dob) {
  if (!dob) return null;
  const zodiac = getZodiac(dob).name;
  const eastern = getEastern(dob);
  const zodiacSW = {
    "Овен": { s: ["Инициативность","Смелость","Энергия","Лидерство"], w: ["Нетерпеливость","Импульсивность","Не доводит до конца"] },
    "Телец": { s: ["Надёжность","Упорство","Практичность","Верность"], w: ["Упрямство","Медленная адаптация","Материализм"] },
    "Близнецы": { s: ["Гибкость ума","Коммуникабельность","Адаптивность"], w: ["Непостоянство","Поверхностность","Тревожность"] },
    "Рак": { s: ["Интуиция","Забота","Эмпатия","Память"], w: ["Обидчивость","Зависимость от настроения","Закрытость"] },
    "Лев": { s: ["Харизма","Щедрость","Творчество","Лидерство"], w: ["Гордость","Зависимость от признания","Расточительность"] },
    "Дева": { s: ["Аналитика","Трудолюбие","Точность","Надёжность"], w: ["Перфекционизм","Самокритика","Тревожность"] },
    "Весы": { s: ["Дипломатия","Справедливость","Чувство красоты"], w: ["Нерешительность","Зависимость от мнения","Избегание конфликтов"] },
    "Скорпион": { s: ["Глубина","Интуиция","Трансформация","Страсть"], w: ["Ревность","Подозрительность","Мстительность"] },
    "Стрелец": { s: ["Оптимизм","Широкий кругозор","Философский ум"], w: ["Безответственность","Прямолинейность до грубости","Непоследовательность"] },
    "Козерог": { s: ["Дисциплина","Амбиции","Ответственность","Терпение"], w: ["Холодность","Пессимизм","Трудоголизм"] },
    "Водолей": { s: ["Оригинальность","Гуманизм","Независимость"], w: ["Отстранённость","Упрямство в идеях","Непрактичность"] },
    "Рыбы": { s: ["Интуиция","Сострадание","Творчество","Духовность"], w: ["Избегание реальности","Жертвенность","Неопределённость"] },
  };
  const easternSW = {
    "Крыса": { s: ["Находчивость","Адаптивность","Острый ум"], w: ["Тревожность","Жадность","Критичность"] },
    "Бык": { s: ["Терпение","Честность","Выносливость"], w: ["Упрямство","Медлительность","Консерватизм"] },
    "Тигр": { s: ["Смелость","Харизма","Щедрость"], w: ["Импульсивность","Самонадеянность","Конфликтность"] },
    "Кролик": { s: ["Дипломатия","Творчество","Интуиция"], w: ["Нерешительность","Избегание конфликтов","Пессимизм"] },
    "Дракон": { s: ["Энергия","Удача","Магнетизм"], w: ["Гордость","Нетерпимость","Перфекционизм"] },
    "Змея": { s: ["Мудрость","Интуиция","Дальновидность"], w: ["Подозрительность","Замкнутость","Ревность"] },
    "Лошадь": { s: ["Энергия","Независимость","Харизма"], w: ["Непостоянство","Эгоцентризм","Нетерпеливость"] },
    "Коза": { s: ["Творчество","Мягкость","Сострадание"], w: ["Нерешительность","Зависимость","Пессимизм"] },
    "Обезьяна": { s: ["Интеллект","Гибкость","Находчивость"], w: ["Непостоянство","Манипулятивность","Тщеславие"] },
    "Петух": { s: ["Точность","Честность","Работоспособность"], w: ["Педантизм","Критичность к другим","Хвастовство"] },
    "Собака": { s: ["Верность","Честность","Справедливость"], w: ["Тревожность","Упрямство","Цинизм"] },
    "Свинья": { s: ["Щедрость","Искренность","Оптимизм"], w: ["Доверчивость","Чрезмерная мягкость","Самопотакание"] },
  };
  const zSW = zodiacSW[zodiac] || { s: [], w: [] };
  const eSW = easternSW[eastern] || { s: [], w: [] };
  return {
    strengths: [...new Set([...zSW.s, ...eSW.s])].slice(0, 6),
    weaknesses: [...new Set([...zSW.w, ...eSW.w])].slice(0, 6),
  };
}

// --- КОМПОНЕНТ ---
export function ProfileSection() {
  const { profile, setProfile, sections, setSections } = useApp();
  const [view, setView] = useState("me");
  const [tooltip, setTooltip] = useState(null);

  if (!profile) return null;

  const z = getZodiac(profile.dob);
  const east = getEastern(profile.dob);
  const deg = calcDegree(profile.fullName || profile.name);
  const moon = getMoon();
  // ✅ ИСПРАВЛЕНО: правильный возраст
  const age = calcAge(profile.dob);
  const tcm = getTCMFullProfile(profile);
  const sw = getStrengthsWeaknesses(profile.dob);
  const py = getPersonalYear(profile.dob);

  // Психопортрет — расшифрованные черты (оставляем, убираем сырые теги)
  const intro = (profile.energySource || "").includes("один") || (profile.energySource || "").toLowerCase().includes("тишин");
  const analyst = (profile.decisionStyle || "").toLowerCase().includes("логик") || (profile.decisionStyle || "").toLowerCase().includes("анализ") || (profile.decisionStyle || "").toLowerCase().includes("факт");
  const planner = (profile.planningStyle || "").toLowerCase().includes("план") || (profile.planningStyle || "").toLowerCase().includes("список");
  const psychoTraits = [
    intro ? "🔋 Интроверт — черпает энергию в уединении" : "⚡ Экстраверт — заряжается от общения",
    analyst ? "🧠 Аналитик — решения через логику и факты" : "💡 Интуит — решения через ощущения",
    planner ? "📋 Планировщик — любит структуру и порядок" : "🌊 Адаптивный — действует по ситуации",
  ];

  // ✅ ИСПРАВЛЕНО: блок «Режим дня» — добавлены проверки на пустые значения
  const regime = [
    { label: "☀️ Подъём", value: profile.wake },
    { label: "🌙 Отбой", value: profile.sleep },
    { label: "💼 Работа", value: (profile.workStart && profile.workEnd) ? `${profile.workStart}–${profile.workEnd}` : null },
    { label: "🛣️ Дорога", value: profile.commuteTime !== "Дома" ? profile.commuteTime : null },
  ].filter(r => r.value);

  // ИИ промпт для анализа личности
  const aiPrompt = `Имя: ${profile.name || '—'}. Дата рождения: ${profile.dob || '—'}.
Знак зодиака: ${z.name}. Восточный знак: ${east}.
ТКМ-стихия: ${tcm?.el?.name || '—'} (${tcm?.el?.yin ? 'Инь' : 'Ян'}).
Слабые органы: ${tcm?.uniqueOrgans?.join(', ') || '—'}.
Личный год: ${py?.py || '—'}.
Хронотип: ${profile.chronotype?.split('—')[0]?.trim() || '—'}.
На основе базы знаний (ТКМ Давыдова, нумерология Амриты, Рао) дай краткий анализ:
1) Ключевые сильные стороны по ТКМ и астрологии
2) На что обратить внимание в ${new Date().getFullYear()} году (личный год ${py?.py})
3) Главные рекомендации по здоровью исходя из стихии и органов`;

  // Данные для графика жизненных циклов
  const buildCycles = () => {
    if (!profile.dob) return null;
    const by = new Date(profile.dob).getFullYear();
    const currentAge = age || 0;
    const spheres = [
      { name: "Карьера", color: "#82AADD", emoji: "💼", points: [{a:0,s:3},{a:21,s:4},{a:29,s:3},{a:42,s:8},{a:58,s:8},{a:70,s:6}] },
      { name: "Отношения", color: "#E8556D", emoji: "❤️", points: [{a:0,s:5},{a:18,s:6},{a:29,s:4},{a:42,s:5},{a:58,s:9}] },
      { name: "Здоровье", color: "#7BCCA0", emoji: "💚", points: [{a:0,s:9},{a:18,s:8},{a:36,s:5},{a:49,s:5},{a:70,s:5}] },
      { name: "Финансы", color: "#E5C87A", emoji: "💰", points: [{a:0,s:3},{a:29,s:5},{a:42,s:8},{a:70,s:7}] },
      { name: "Духовность", color: "#B882E8", emoji: "🌟", points: [{a:0,s:7},{a:29,s:6},{a:49,s:9},{a:70,s:9}] },
    ];
    return { spheres, birthYear: by, currentAge };
  };
  const cycleData = buildCycles();

  return (
    <div>
      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 14 }}>
        {["me", "sections"].map(v => (
          <div key={v} className={`tab${view === v ? " on" : ""}`} onClick={() => setView(v)}>
            {v === "me" ? "Мой профиль" : "⚙️ Разделы"}
          </div>
        ))}
      </div>

      {view === "me" && (
        <div>
          {/* Шапка */}
          <div className="card card-accent" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}66, ${T.goldD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {profile.gender === "Женский" ? "👩" : "👤"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 24, color: T.gold, marginBottom: 4 }}>{profile.name || "—"}</div>
                {profile.fullName && profile.fullName !== profile.name && (
                  <div style={{ fontSize: 13, color: T.text3, marginBottom: 4 }}>{profile.fullName}</div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {profile.dob && (
                    <span className="badge bg">🎂 {new Date(profile.dob).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
                  )}
                  {/* ✅ ИСПРАВЛЕНО: правильный возраст */}
                  {age !== null && <span className="badge bm">{age} {age % 10 === 1 && age % 100 !== 11 ? "год" : age % 10 >= 2 && age % 10 <= 4 && (age % 100 < 10 || age % 100 >= 20) ? "года" : "лет"}</span>}
                  {profile.gender && <span className="badge bm">{profile.gender}</span>}
                  {profile.city && <span className="badge bm">📍 {profile.city}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Астро-портрет */}
          {profile.dob && (
            <div style={{ marginBottom: 12 }}>
              <div className="sec-lbl" style={{ marginBottom: 8 }}>Астрологический портрет</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {/* Знак зодиака */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(45,32,16,0.05)", borderRadius: 12 }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>{z.emoji}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 17, color: T.gold }}>{z.name}</span>
                      <span style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>ЗОДИАК</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{ZODIAC_DESC[z.name] || ""}</div>
                  </div>
                </div>
                {/* Восточный знак */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(45,32,16,0.05)", borderRadius: 12 }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>🐉</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 17, color: T.gold }}>{east}</span>
                      <span style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>ВОСТОЧНЫЙ ЗНАК</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{EASTERN_DESC[east] || ""}</div>
                  </div>
                </div>
                {/* ТКМ Стихия */}
                {tcm?.el && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(45,106,79,0.08)", borderRadius: 12 }}>
                    <span style={{ fontSize: 32, flexShrink: 0 }}>{tcm.el.emoji}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 17, color: T.gold }}>{tcm.el.name} {tcm.el.yin ? "(Инь)" : "(Ян)"}</span>
                        <span style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>ТКМ-СТИХИЯ</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>Органы: {tcm.el.organ} · Сезон: {tcm.el.season} · Вкус: {tcm.el.taste}</div>
                    </div>
                  </div>
                )}
                {/* Луна */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(45,32,16,0.05)", borderRadius: 12 }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>{moon.e}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 17, color: T.gold }}>{moon.n}</span>
                      <span style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>ЛУНА СЕГОДНЯ</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.text2 }}>{moon.t}</div>
                  </div>
                </div>
                {/* Градус судьбы */}
                {deg && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(200,164,90,0.08)", borderRadius: 12, border: "1px solid rgba(200,164,90,0.1
