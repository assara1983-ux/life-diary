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
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(200,164,90,0.08)", borderRadius: 12, border: "1px solid rgba(200,164,90,0.15)" }}>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 26, color: T.gold, minWidth: 44, textAlign: "center" }}>{deg}°</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 17, color: T.gold }}>Градус судьбы</span>
                        <span style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>НУМЕРОЛОГИЯ</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{DEG_DESC[deg % 30 || 30] || "Уникальный путь"}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Сильные и слабые стороны */}
          {sw && (
            <div style={{ marginBottom: 12 }}>
              <div className="sec-lbl" style={{ marginBottom: 8 }}>Сильные и слабые стороны</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ padding: "10px 12px", background: "rgba(45,106,79,0.07)", borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: T.success, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 8 }}>✦ СИЛЬНЫЕ</div>
                  {sw.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: T.text1, padding: "4px 0", borderBottom: "1px solid rgba(45,106,79,0.1)", lineHeight: 1.3 }}>{s}</div>
                  ))}
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(139,32,32,0.05)", borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: T.error, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 8 }}>✗ ЗОНЫ РОСТА</div>
                  {sw.weaknesses.map((w, i) => (
                    <div key={i} style={{ fontSize: 12, color: T.text2, padding: "4px 0", borderBottom: "1px solid rgba(139,32,32,0.08)", lineHeight: 1.3 }}>{w}</div>
                  ))}
                </div>
              </div>
              {/* Личный год */}
              {py && (
                <div style={{ padding: "10px 14px", background: "rgba(200,164,90,0.08)", borderRadius: 12, border: "1px solid rgba(200,164,90,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Cinzel',serif", fontSize: 22, color: T.gold }}>{py.py}</span>
                    <div>
                      <div style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>ЛИЧНЫЙ ГОД · НУМЕРОЛОГИЯ</div>
                      <div style={{ fontSize: 13, color: T.gold, fontWeight: 500 }}>Год {py.py} из 9-летнего цикла</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: T.text1, lineHeight: 1.6 }}>{py.theme}</div>
                </div>
              )}
            </div>
          )}

          {/* Психопортрет */}
          <div className="sec-lbl" style={{ marginBottom: 8 }}>Психопортрет</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
            {psychoTraits.map((t, i) => (
              <div key={i} style={{ fontSize: 13, color: T.text1, padding: "6px 12px", background: "rgba(45,32,16,0.04)", borderRadius: 9 }}>{t}</div>
            ))}
          </div>

          {/* ✅ ИСПРАВЛЕНО: блок Работа и жизнь — теперь показывает все заполненные поля */}
          <div className="sec-lbl" style={{ marginBottom: 8 }}>Работа и жизнь</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            <div style={{ padding: "8px 12px", background: "rgba(45,32,16,0.04)", borderRadius: 10 }}>
              <div style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 2 }}>РАБОТА</div>
              <div style={{ fontSize: 13, color: T.text0 }}>{profile.profession || "—"}</div>
              {profile.workType && (
                <div style={{ display: "inline-block", marginTop: 3, padding: "1px 7px", borderRadius: 8, background: "rgba(200,164,90,0.12)", border: "1px solid rgba(200,164,90,0.25)", fontSize: 10, color: T.gold, fontFamily: "'JetBrains Mono'" }}>{profile.workType}</div>
              )}
            </div>
            <div style={{ padding: "8px 12px", background: "rgba(45,32,16,0.04)", borderRadius: 10 }}>
              <div style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 2 }}>ХРОНОТИП</div>
              <div style={{ fontSize: 13, color: T.text0 }}>{profile.chronotype?.split("—")[0]?.trim() || "—"}</div>
              <div style={{ fontSize: 11, color: T.text3 }}>Сон: {profile.sleepQuality || "—"}</div>
            </div>
          </div>

          {/* ✅ ИСПРАВЛЕНО: Режим дня — показывает только заполненные поля */}
          {regime.length > 0 && (
            <div style={{ padding: "8px 12px", background: "rgba(45,32,16,0.04)", borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 8 }}>РЕЖИМ ДНЯ</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {regime.map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'" }}>{label}</div>
                    <div style={{ fontSize: 14, color: T.text0, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Питомцы */}
          {(profile.pets || []).length > 0 && (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(45,32,16,0.04)", borderRadius: 10 }}>
              <div style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 6 }}>ПИТОМЦЫ</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {profile.pets.map(p => (
                  <span key={p.id} style={{ fontSize: 15 }}>
                    {p.type === "Кошка" ? "🐱" : p.type === "Собака" ? "🐶" : p.type === "Попугай" ? "🦜" : p.type === "Кролик" ? "🐰" : p.type === "Хомяк" ? "🐹" : "🐾"} {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ТКМ-профиль */}
          {tcm && (
            <>
              <div className="sec-lbl" style={{ marginBottom: 8 }}>ТКМ-профиль</div>
              <div className="card" style={{ marginBottom: 12, borderLeft: "3px solid " + T.gold }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{tcm.el.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 18, color: T.gold }}>{tcm.el.name} {tcm.el.yin ? "(Инь)" : "(Ян)"}</div>
                    <div style={{ fontSize: 12, color: T.text2 }}>{tcm.cn?.type}</div>
                  </div>
                </div>
                <div className="g2" style={{ gap: 6, marginBottom: 8 }}>
                  {[["Органы", tcm.el.organ], ["Сезон", tcm.el.season], ["Вкус", tcm.el.taste], ["Добродетель", tcm.el.virtue]].map(([l, v]) => (
                    <div key={l} style={{ padding: "6px 10px", background: "rgba(45,106,79,0.07)", borderRadius: 9 }}>
                      <div style={{ fontSize: 9, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 2 }}>{l.toUpperCase()}</div>
                      <div style={{ fontSize: 13, color: T.text1 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {tcm.syndromes?.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                    {tcm.syndromes.map(s => <span key={s} className="badge bw" style={{ fontSize: 11 }}>{s}</span>)}
                  </div>
                )}
                {tcm.foodRecs && (
                  <div style={{ fontSize: 12, color: T.success, fontStyle: "italic", lineHeight: 1.5 }}>{tcm.foodRecs}</div>
                )}
              </div>
            </>
          )}

          {/* График жизненных циклов */}
          {cycleData && (
            <div style={{ marginBottom: 12 }}>
              <div className="sec-lbl" style={{ marginBottom: 8 }}>📈 Жизненные циклы</div>
              <div style={{ background: "rgba(45,32,16,0.03)", borderRadius: 12, padding: 10, overflowX: "auto" }}>
                <svg width={340} height={184} style={{ display: "block", minWidth: 340 }}>
                  {(() => {
                    const { spheres, birthYear, currentAge } = cycleData;
                    const W = 340, H = 160, PAD = 28;
                    const maxAge = 75;
                    const getX = a => PAD + (a / maxAge) * (W - PAD * 2);
                    const getY = s => H - PAD - ((s - 1) / 9) * (H - PAD * 2);
                    return (
                      <>
                        {[3, 5, 7, 9].map(n => (
                          <line key={n} x1={PAD} y1={getY(n)} x2={W - PAD} y2={getY(n)} stroke="rgba(45,32,16,0.06)" strokeWidth="1" />
                        ))}
                        <line x1={getX(currentAge)} y1={PAD / 2} x2={getX(currentAge)} y2={H - PAD} stroke={T.gold} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" />
                        <text x={getX(currentAge)} y={H + 14} textAnchor="middle" fontSize="9" fill={T.gold} fontWeight="600">сейчас</text>
                        {[0, 10, 20, 30, 40, 50, 60, 70].map(a => (
                          <g key={a}>
                            <text x={getX(a)} y={H + 12} textAnchor="middle" fontSize="9" fill="rgba(45,32,16,0.5)">{a}</text>
                            <text x={getX(a)} y={H + 22} textAnchor="middle" fontSize="7" fill="rgba(45,32,16,0.25)">{birthYear + a}</text>
                          </g>
                        ))}
                        {spheres.map(sphere => {
                          const pathD = sphere.points.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.a)} ${getY(p.s)}`).join(" ");
                          return (
                            <g key={sphere.name}>
                              <path d={pathD} fill="none" stroke={sphere.color} strokeWidth="1.8" strokeLinejoin="round" opacity="0.8" />
                              {sphere.points.map((p, i) => (
                                <circle key={i} cx={getX(p.a)} cy={getY(p.s)} r={Math.abs(p.a - currentAge) < 3 ? "5" : "3.5"}
                                  fill={p.a <= currentAge ? sphere.color : "rgba(255,255,255,0.6)"}
                                  stroke={sphere.color} strokeWidth="1.5" style={{ cursor: "pointer" }}
                                  onClick={() => setTooltip(tooltip?.sphere === sphere.name && tooltip?.a === p.a ? null : { sphere: sphere.name, emoji: sphere.emoji, color: sphere.color, a: p.a, year: birthYear + p.a, s: p.s })} />
                              ))}
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {cycleData.spheres.map(s => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.text2 }}>
                      <div style={{ width: 16, height: 2, background: s.color, borderRadius: 1 }} />
                      <span>{s.emoji} {s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Тултип графика */}
          {tooltip && (
            <>
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: T.bg0, borderRadius: "16px 16px 0 0", boxShadow: "0 -4px 24px rgba(45,32,16,0.18)", padding: "20px 20px 32px", borderTop: "3px solid " + tooltip.color }}>
                <div style={{ width: 36, height: 4, background: "rgba(45,32,16,0.2)", borderRadius: 2, margin: "0 auto 16px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 18, color: tooltip.color, fontWeight: 600 }}>{tooltip.emoji} {tooltip.sphere}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: T.text3 }}>{tooltip.year} · {tooltip.a} лет</span>
                    <button onClick={() => setTooltip(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: T.text3 }}>✕</button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <div key={n} style={{ height: 6, flex: 1, borderRadius: 3, background: n <= tooltip.s ? tooltip.color : "rgba(45,32,16,0.1)" }} />
                  ))}
                  <span style={{ fontSize: 12, color: tooltip.color, fontWeight: 700, minWidth: 24 }}>{tooltip.s}/9</span>
                </div>
              </div>
              <div style={{ position: "fixed", inset: 0, zIndex: 199, background: "rgba(45,32,16,0.3)" }} onClick={() => setTooltip(null)} />
            </>
          )}

          {/* ✅ НОВЫЙ БЛОК: ИИ-анализ личности из базы знаний */}
          <div style={{ marginBottom: 12 }}>
            <div className="sec-lbl" style={{ marginBottom: 8 }}>✦ ИИ-анализ личности</div>
            <AiBox
              profile={profile}
              domain="profile"
              prompt={aiPrompt}
              label="АСТРОЛОГИЯ + ТКМ + НУМЕРОЛОГИЯ"
              btnText="Получить персональный анализ"
            />
          </div>

          {/* Кнопки */}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }}
              onClick={() => { if (window.confirm("Обновить профиль? Откроется опросник.")) setProfile(null); }}>
              ⟳ Обновить
            </button>
            <button className="btn btn-danger" style={{ fontSize: 13 }}
              onClick={() => { if (window.confirm("Сбросить весь профиль?")) setProfile(null); }}>
              ⚠ Сбросить
            </button>
          </div>
        </div>
      )}

      {/* Управление разделами */}
      {view === "sections" && (
        <div>
          <div style={{ fontSize: 14, color: T.text2, marginBottom: 12, lineHeight: 1.5 }}>Управляй видимостью разделов в навигации</div>
          {sections.map(s => (
            <div key={s.id} className="vis-row">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <span style={{ fontSize: 15, color: T.text0 }}>{s.name}</span>
              </div>
              <div className={`tog${s.vis ? " on" : ""}`} onClick={() => setSections(p => p.map(x => x.id === s.id ? { ...x, vis: !x.vis } : x))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
