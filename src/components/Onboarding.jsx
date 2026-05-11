// src/components/Onboarding.jsx
import { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { getZodiac, getEastern, calcDegree } from "../utils/helpers"; // Убедись, что эти функции есть в helpers или импортированы напрямую
import { T } from "../utils/theme";

// Если хелперов нет в отдельном файле, продублируем их здесь:
function getZodiacInline(dob) {
  if (!dob) return { name: "—", emoji: "⭐" };
  const d = new Date(dob), m = d.getMonth() + 1, day = d.getDate();
  const z = [
    ["Козерог", "♑", 12, 22, 1, 19], ["Водолей", "♒", 1, 20, 2, 18], ["Рыбы", "♓", 2, 19, 3, 20],
    ["Овен", "♈", 3, 21, 4, 19], ["Телец", "♉", 4, 20, 5, 20], ["Близнецы", "♊", 5, 21, 6, 20],
    ["Рак", "♋", 6, 21, 7, 22], ["Лев", "♌", 7, 23, 8, 22], ["Дева", "♍", 8, 23, 9, 22],
    ["Весы", "⚖️", 9, 23, 10, 22], ["Скорпион", "♏", 10, 23, 11, 21], ["Стрелец", "♐", 11, 22, 12, 21]
  ];
  for (const [name, emoji, sm, sd, em, ed] of z) {
    if ((m === sm && day >= sd) || (m === em && day <= ed)) return { name, emoji };
  }
  return { name: "Козерог", emoji: "♑" };
}

function getEasternInline(dob) {
  if (!dob) return "—";
  return ["Крыса", "Бык", "Тигр", "Кролик", "Дракон", "Змея", "Лошадь", "Коза", "Обезьяна", "Петух", "Собака", "Свинья"][(new Date(dob).getFullYear() - 4) % 12];
}

function calcDegreeInline(name) {
  if (!name) return null;
  const ru = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
  let s = 0;
  for (const c of name.toLowerCase()) {
    const i = ru.indexOf(c);
    if (i >= 0) s += i + 1;
  }
  return s % 360 || 360;
}

const OB_STEPS = [
  { id: "welcome", title: "Добро пожаловать", sub: "Твой личный организатор жизни — знает тебя, думает за тебя, помогает всё успевать. Займёт 7–10 минут." },
  { id: "basic", title: "Кто ты?", sub: "Самое главное — имя, дата рождения и место. Из этого рассчитываются знак зодиака, восточный знак и градус судьбы." },
  { id: "persona", title: "Как ты устроен(а)?", sub: "Не тест — честные вопросы о твоей природе. Чем точнее ответишь, тем лучше работают советы." },
  { id: "persona2", title: "Энергия и восстановление", sub: "Как ты работаешь изнутри — откуда берутся силы и что их забирает." },
  { id: "schedule", title: "Твой ритм дня", sub: "Подъём, отбой, хронотип — выстроим всё расписание вокруг твоей природы." },
  { id: "work", title: "Работа и карьера", sub: "Чем занимаешься и что для тебя в этом важно." },
  { id: "work2", title: "Рабочий распорядок", sub: "Из чего состоит твой рабочий день — включим в общее расписание." },
  { id: "home", title: "Твой дом", sub: "Тип жилья, кто с тобой живёт, растения — для правильного графика быта." },
  { id: "pets", title: "Питомцы", sub: "Добавь всех — кормление, ветеринарные дела войдут в расписание автоматически." },
  { id: "health", title: "Здоровье", sub: "Чтобы расписание строилось с заботой о тебе, а не вопреки." },
  { id: "tcm", title: "ТКМ-диагностика", sub: "5 вопросов для точного профиля по традиционной китайской медицине. Это позволит составить меню и рекомендации, идеально подходящие именно твоему телу." },  { id: "beauty", title: "Уход за собой", sub: "Уход за кожей и внешним видом — поставим в расписание." },
  { id: "shopping", title: "Продукты и покупки", sub: "Когда и как закупаешься — напомним вовремя." },
  { id: "hobbies", title: "Хобби и увлечения", sub: "Твои увлечения заслуживают места в жизни — не только дела." },
  { id: "travel", title: "Путешествия", sub: "Куда хочешь поехать? Поможем спланировать мягко, шаг за шагом." },
  { id: "goals", title: "Цели", sub: "Чего хочешь достичь? Приложение будет напоминать и поддерживать." },
  { id: "done", title: "Профиль готов", sub: "Теперь ты можешь положиться на Life Diary — он держит всё в голове вместо тебя." },
];

export function Onboarding() {
  const { setProfile } = useApp();
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    pets: [], trips: [], hobbies: [],
    // ✅ ИСПРАВЛЕНО: дефолтные значения для полей которые не меняются пользователем
    wake: "07:00", sleep: "23:00",
    workStart: "09:00", workEnd: "18:00",
    workDaysList: [1, 2, 3, 4, 5],
  });

  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const tog = (k, v) => {
    const a = d[k] || [];
    set(k, a.includes(v) ? a.filter(x => x !== v) : [...a, v]);
  };

  const s = OB_STEPS[step];
  const pct = (step / (OB_STEPS.length - 1)) * 100;

  const addPet = () => set("pets", [...d.pets, { id: Date.now(), name: "", type: "Кошка", breed: "", dob: "", food: "", feedTimes: "2", weightKg: "", notes: "", vacDate: "", parasiteDate: "" }]);
  const updPet = (id, k, v) => set("pets", d.pets.map(p => p.id === id ? { ...p, [k]: v } : p));
  const delPet = id => set("pets", d.pets.filter(p => p.id !== id));

  const addTrip = () => set("trips", [...d.trips, { id: Date.now(), destination: "", targetDate: "", budget: "", saved: "", stage: "💭 Мечта", notes: "" }]);
  const updTrip = (id, k, v) => set("trips", d.trips.map(t => t.id === id ? { ...t, [k]: v } : t));
  const delTrip = id => set("trips", d.trips.filter(t => t.id !== id));

  const zodiac = d.dob ? getZodiacInline(d.dob) : null;
  const eastern = d.dob ? getEasternInline(d.dob) : null;
  const degree = d.fullName ? calcDegreeInline(d.fullName) : null;
  const age = d.dob ? new Date().getFullYear() - new Date(d.dob).getFullYear() : null;

  const handleDone = () => {
    // Формируем финальный объект профиля
    const finalProfile = {
      ...d,
      trips: d.trips || [],
      hobbies: d.hobbies || [],
      pets: d.pets || [],
      // ✅ ИСПРАВЛЕНО: гарантируем дефолты для полей времени
      wake: d.wake || "07:00",
      sleep: d.sleep || "23:00",
      workStart: d.workStart || "09:00",
      workEnd: d.workEnd || "18:00",
      workDaysList: d.workDaysList || [1, 2, 3, 4, 5],
      onboardingComplete: true,
    };
    setProfile(finalProfile);
  };

  return (    <div className="ob-wrap">
      <div className="ob-card">
        <div className="ob-step">Шаг {step + 1} из {OB_STEPS.length}</div>
        <div className="ob-bar"><div className="ob-fill" style={{ width: pct + "%" }} /></div>
        <div className="ob-title">{s.title}</div>
        <div className="ob-sub">{s.sub}</div>

        {s.id === "welcome" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📖</div>
            <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 16, color: T.text3, fontStyle: "italic", lineHeight: 1.7 }}>
              «Всё записано — ничего не потеряно»
            </div>
          </div>
        )}

        {s.id === "basic" && (
          <>
            <div className="fld">
              <label>Имя — как тебя называть</label>
              <input placeholder="Мария" value={d.name || ""} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="fld">
              <label>Полное ФИО — для расчёта градуса судьбы</label>
              <input placeholder="Иванова Мария Петровна" value={d.fullName || ""} onChange={e => set("fullName", e.target.value)} />
              <div className="fld-hint">Каждая буква имеет числовое значение — сумма определяет твой <span style={{ color: T.gold }}>градус судьбы</span> (1–360°)</div>
            </div>
            <div className="fld-row">
              <div className="fld">
                <label>Дата рождения</label>
                <input type="date" value={d.dob || ""} onChange={e => set("dob", e.target.value)} />
                <div className="fld-hint">Знак зодиака · Восточный знак · Слабые места здоровья</div>
              </div>
              <div className="fld">
                <label>Пол</label>
                <select value={d.gender || ""} onChange={e => set("gender", e.target.value)}>
                  <option value="">—</option>
                  <option>Женский</option>
                  <option>Мужской</option>
                </select>
                <div className="fld-hint">Советы по здоровью и красоте</div>
              </div>
            </div>

            {/* Live calculation preview */}
            {(d.dob || d.fullName) && (
              <div className="calc-preview">
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 8, color: T.text3, letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" }}>Рассчитано автоматически</div>
                <div className="calc-row">
                  {zodiac && <div className="calc-item"><div className="calc-l">Знак зодиака</div><div className="calc-v">{zodiac.emoji} {zodiac.name}</div></div>}                  {eastern && <div className="calc-item"><div className="calc-l">Восточный знак</div><div className="calc-v">🐾 {eastern}</div></div>}
                  {age && <div className="calc-item"><div className="calc-l">Возраст</div><div className="calc-v">{age} лет</div></div>}
                  {degree && <div className="calc-item"><div className="calc-l">Градус судьбы</div><div className="calc-v" style={{ color: T.gold, fontSize: 22 }}>{degree}°</div></div>}
                </div>
              </div>
            )}

            <div className="fld-row">
              <div className="fld">
                <label>Город</label>
                <input placeholder="Москва" value={d.city || ""} onChange={e => set("city", e.target.value)} />
              </div>
              <div className="fld">
                <label>Часовой пояс</label>
                <select value={d.tz || ""} onChange={e => set("tz", e.target.value)}>
                  <option value="">—</option>
                  {["UTC+5 Актобе, Атырау, Западный Казахстан", "UTC+6 Алматы, Нур-Султан, Шымкент, Восточный Казахстан"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {s.id === "persona" && (
          <>
            {[
              ["Как принимаешь решения?", "decisionStyle", ["Логика и анализ", "Интуиция и чувства", "Советуюсь с другими", "Смотрю на факты", "Долго взвешиваю"], false],
              ["Откуда берёшь энергию?", "energySource", ["Из общения", "Из одиночества", "Из движения", "Из творчества", "Из природы", "Из порядка"], false],
              ["Отношение к планированию", "planningStyle", ["Люблю чёткий план", "Предпочитаю гибкость", "Скелет + свобода", "Планы сковывают меня"], false],
              ["Отношение к порядку", "orderStyle", ["Порядок = спокойствие", "Творческий беспорядок норма", "Часть в порядке", "Хочу порядка, но не всегда"], false],
              ["Главная ценность", "coreValue", ["Свобода", "Безопасность", "Развитие", "Любовь", "Достижения", "Гармония", "Творчество", "Здоровье"], false],
            ].map(([label, key, opts]) => (
              <div className="fld" key={key}>
                <label>{label}</label>
                <div className="chips">{opts.map(v => <div key={v} className={`chip ${d[key] === v ? "on" : ""}`} onClick={() => set(key, v)}>{v}</div>)}</div>
              </div>
            ))}
            <div className="fld"><label>Что тебя мотивирует?</label><input placeholder="Видеть результат, похвала, интерес, деньги..." value={d.motivates || ""} onChange={e => set("motivates", e.target.value)} /></div>
          </>
        )}

        {s.id === "persona2" && (
          <>
            {[
              ["Что выбивает из колеи?", "stressors", ["Неопределённость", "Много задач сразу", "Конфликты", "Нехватка времени", "Усталость", "Критика", "Хаос", "Сложные решения", "Шум и суета"], true],
              ["Как восстанавливаешься?", "recovery", ["Сон и тишина", "Прогулка на природе", "Общение с близкими", "Любимое хобби", "Спорт и движение", "Уход за собой", "Вкусная еда", "Кино / книга", "Музыка", "Медитация", "Горячая ванна", "Время в одиночестве", "Творчество", "Путешествие"], true],
            ].map(([label, key, opts]) => (
              <div className="fld" key={key}>
                <label>{label}</label>
                <div className="chips">{opts.map(v => <div key={v} className={`chip ${(d[key] || []).includes(v) ? "on" : ""}`} onClick={() => tog(key, v)}>{v}</div>)}</div>              </div>
            ))}
            {[
              ["Уровень энергии сейчас", "stressLevel", d.gender === "Мужской" ? ["Полон сил", "В балансе", "Немного устал", "Нужна подзарядка"] : ["Полна сил", "В балансе", "Немного устала", "Нужна подзарядка"]],
              ["Отношение к своему телу", "bodyRelation", ["Люблю и забочусь", "Хочу больше внимания", "Стремлюсь к гармонии", "Учусь принимать себя"]],
              ["Отношение ко времени", "timeStyle", ["Планирую заранее", "Умею расставлять приоритеты", "Живу в моменте", "Учусь управлять временем"]],
            ].map(([label, key, opts]) => (
              <div className="fld" key={key}>
                <label>{label}</label>
                <div className="chips">{opts.map(v => <div key={v} className={`chip ${d[key] === v ? "on" : ""}`} onClick={() => set(key, v)}>{v}</div>)}</div>
              </div>
            ))}
          </>
        )}

        {s.id === "schedule" && (
          <>
            <div className="fld-row">
              <div className="fld"><label>Подъём</label><input type="time" value={d.wake || "07:00"} onChange={e => set("wake", e.target.value)} /></div>
              <div className="fld"><label>Отбой</label><input type="time" value={d.sleep || "23:00"} onChange={e => set("sleep", e.target.value)} /></div>
            </div>
            <div className="fld"><label>Хронотип</label>
              <div className="chips">{["🌅 Жаворонок — пик до полудня", "🕊️ Голубь — пик с 10 до 16", "🦉 Сова — пик после 16"].map(v => <div key={v} className={`chip ${d.chronotype === v ? "on" : ""}`} onClick={() => set("chronotype", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Минут в день на себя (уход, хобби, практики)</label>
              <div className="chips">{["15", "30", "45", "60", "90+"].map(v => <div key={v} className={`chip ${d.selfTime === v ? "on" : ""}`} onClick={() => set("selfTime", v)}>{v} мин</div>)}</div>
            </div>
            <div className="fld"><label>Качество сна</label>
              <div className="chips">{["Отличное", "Хорошее", "Среднее", "Плохое"].map(v => <div key={v} className={`chip ${d.sleepQuality === v ? "on" : ""}`} onClick={() => set("sleepQuality", v)}>{v}</div>)}</div>
            </div>
          </>
        )}

        {s.id === "work" && (
          <>
            <div className="fld-row">
              <div className="fld"><label>Профессия / должность</label><input placeholder="Менеджер, дизайнер, врач..." value={d.profession || ""} onChange={e => set("profession", e.target.value)} /></div>
              <div className="fld"><label>Сфера</label><input placeholder="IT, медицина, образование..." value={d.jobSphere || ""} onChange={e => set("jobSphere", e.target.value)} /></div>
            </div>
            <div className="fld"><label>Формат занятости</label>
              <div className="chips">{["Офис", "Удалёнка", "Гибрид", "Фриланс", "Своё дело", "Учусь", "Декрет / не работаю"].map(v => <div key={v} className={`chip ${d.workType === v ? "on" : ""}`} onClick={() => set("workType", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Что на работе забирает энергию?</label>
              <div className="chips">{["Много встреч", "Однообразие", "Дедлайны", "Конфликты", "Переработки", "Скучные задачи", "Неопределённость"].map(v => <div key={v} className={`chip ${(d.workDrain || []).includes(v) ? "on" : ""}`} onClick={() => tog("workDrain", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Что вдохновляет в работе?</label><input placeholder="Результат, команда, творчество, признание, деньги, свобода..." value={d.workInspire || ""} onChange={e => set("workInspire", e.target.value)} /></div>
            <div className="fld"><label>Рабочая цель</label>
              <div className="chips">{["Карьерный рост", "Повышение дохода", "Сменить профессию", "Своё дело", "Работать меньше", "Прокачать навыки", "Стабильность"].map(v => <div key={v} className={`chip ${d.careerGoal === v ? "on" : ""}`} onClick={() => set("careerGoal", v)}>{v}</div>)}</div>
            </div>
            <div className="fld">              <label>Профессиональные отчёты и дедлайны</label>
              <div className="fld-hint">Выбери свою специализацию — нужные дедлайны добавятся в рабочие задачи автоматически</div>
              <div className="chips">{["Бухгалтер / ИП", "HR / Кадры", "Юрист", "Врач / Мед. работник", "Педагог", "Госслужащий", "Нет отчётности"].map(v => <div key={v} className={`chip ${d.profDeadlines === v ? "on" : ""}`} onClick={() => set("profDeadlines", v)}>{v}</div>)}</div>
            </div>
          </>
        )}

        {s.id === "work2" && (
          <>
            <div className="fld-row">
              <div className="fld"><label>Начало работы</label><input type="time" value={d.workStart || "09:00"} onChange={e => set("workStart", e.target.value)} /></div>
              <div className="fld"><label>Конец работы</label><input type="time" value={d.workEnd || "18:00"} onChange={e => set("workEnd", e.target.value)} /></div>
            </div>
            <div className="fld"><label>Рабочие дни</label>
              <div className="chips">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((v, i) => <div key={v} className={`chip ${(d.workDaysList || [1, 2, 3, 4, 5]).includes(i + 1) ? "on" : ""}`} onClick={() => { const c = d.workDaysList || [1, 2, 3, 4, 5]; set("workDaysList", c.includes(i + 1) ? c.filter(x => x !== i + 1) : [...c, i + 1]); }}>{v}</div>)}</div>
            </div>
            <div className="fld-row">
              <div className="fld"><label>Обед</label><input type="time" value={d.lunchTime || "13:00"} onChange={e => set("lunchTime", e.target.value)} /></div>
              <div className="fld"><label>Длительность обеда</label><input type="number" placeholder="60 мин" value={d.lunchDur || ""} onChange={e => set("lunchDur", e.target.value)} /></div>
            </div>
            <div className="fld"><label>Дорога до работы</label>
              <div className="chips">{["Дома", "5–15 мин", "15–30 мин", "30–60 мин", "60+ мин"].map(v => <div key={v} className={`chip ${d.commuteTime === v ? "on" : ""}`} onClick={() => set("commuteTime", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Транспорт</label>
              <div className="chips">{["Пешком", "Метро", "Автобус", "Машина", "Велосипед", "Такси"].map(v => <div key={v} className={`chip ${d.commuteWay === v ? "on" : ""}`} onClick={() => set("commuteWay", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Регулярные рабочие задачи</label>
              <div className="chips">{["Отчёты", "Встречи", "Звонки", "Контент", "Почта", "Документы", "Обучение", "Аналитика"].map(v => <div key={v} className={`chip ${(d.workRoutines || []).includes(v) ? "on" : ""}`} onClick={() => tog("workRoutines", v)}>{v}</div>)}</div>
            </div>
          </>
        )}

        {s.id === "home" && (
          <>
            <div className="fld-row">
              <div className="fld"><label>Тип жилья</label>
                <div className="chips">{["Квартира", "Дом", "Комната", "Студия"].map(v => <div key={v} className={`chip ${d.homeType === v ? "on" : ""}`} onClick={() => set("homeType", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Площадь (м²)</label><input type="number" placeholder="45" value={d.homeArea || ""} onChange={e => set("homeArea", e.target.value)} /></div>
            </div>
            <div className="fld-row">
              <div className="fld"><label>Спален</label><input type="number" placeholder="1" min="0" max="10" value={d.bedrooms || ""} onChange={e => set("bedrooms", e.target.value)} /></div>
              <div className="fld"><label>Санузлов</label><input type="number" placeholder="1" min="0" max="5" value={d.bathrooms || ""} onChange={e => set("bathrooms", e.target.value)} /></div>
            </div>
            <div className="fld">
              <label>Помещения</label>
              <div className="chips">{["Кухня", "Гостиная", "Коридор", "Балкон", "Кабинет", "Детская", "Кладовка", "Гараж"].map(v => <div key={v} className={`chip ${(d.homeRooms || []).includes(v) ? "on" : ""}`} onClick={() => tog("homeRooms", v)}>{v}</div>)}</div>
            </div>
            <div className="fld-row">
              <div className="fld"><label>Комнат</label><input type="number" placeholder="2" value={d.rooms || ""} onChange={e => set("rooms", e.target.value)} /></div>              <div className="fld"><label>Живёшь с</label>
                <div className="chips">{["Один(а)", "Партнёр", "Дети", "Родители", "Соседи"].map(v => <div key={v} className={`chip ${(d.livesWith || []).includes(v) ? "on" : ""}`} onClick={() => tog("livesWith", v)}>{v}</div>)}</div>
              </div>
            </div>
            <div className="fld"><label>Растения</label>
              <div className="chips">{["Нет", "1–3", "4–10", "Много — полив каждый день"].map(v => <div key={v} className={`chip ${d.plants === v ? "on" : ""}`} onClick={() => set("plants", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Удобные дни для уборки</label>
              <div className="chips">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(v => <div key={v} className={`chip ${(d.cleanDays || []).includes(v) ? "on" : ""}`} onClick={() => tog("cleanDays", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Помощь по хозяйству</label>
              <div className="chips">{["Только я", "Помогает партнёр", "Делим поровну", "Приходит помощница"].map(v => <div key={v} className={`chip ${d.houseHelp === v ? "on" : ""}`} onClick={() => set("houseHelp", v)}>{v}</div>)}</div>
            </div>
            {/* Автомобиль */}
            <div className="fld">
              <label>Есть автомобиль?</label>
              <div className="chips">{["Нет", "Да"].map(v => <div key={v} className={`chip ${d.hasCar === v ? "on" : ""}`} onClick={() => set("hasCar", v)}>{v}</div>)}</div>
            </div>
            {d.hasCar === "Да" && <>
              <div className="fld-row">
                <div className="fld"><label>Марка и модель</label><input placeholder="Toyota Camry..." value={d.carModel || ""} onChange={e => set("carModel", e.target.value)} /></div>
                <div className="fld"><label>Год выпуска</label><input type="number" placeholder="2020" value={d.carYear || ""} onChange={e => set("carYear", e.target.value)} /></div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Пробег сейчас (км)</label><input type="number" placeholder="45000" value={d.carMileage || ""} onChange={e => set("carMileage", e.target.value)} /></div>
                <div className="fld"><label>Последнее ТО (дата)</label><input type="date" value={d.carLastTO || ""} onChange={e => set("carLastTO", e.target.value)} /></div>
              </div>
              <div className="fld"><label>Тип резины сейчас</label>
                <div className="chips">{["Летняя", "Зимняя", "Всесезонная"].map(v => <div key={v} className={`chip ${d.carTireType === v ? "on" : ""}`} onClick={() => set("carTireType", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Когда меняли резину</label>
                <input type="month" value={d.carTireDate || ""} onChange={e => set("carTireDate", e.target.value)} placeholder="2023-10" />
              </div>
              <div className="fld"><label>Страховка (срок окончания)</label>
                <input type="date" value={d.carInsurance || ""} onChange={e => set("carInsurance", e.target.value)} />
              </div>
              <div className="fld"><label>Техосмотр (срок окончания)</label>
                <input type="date" value={d.carTechCheck || ""} onChange={e => set("carTechCheck", e.target.value)} />
              </div>
            </>}
          </>
        )}

        {s.id === "pets" && (
          <>
            <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 15, color: T.text3, fontStyle: "italic", marginBottom: 16, lineHeight: 1.7 }}>
              Каждый питомец — это кормление, ветеринарные визиты, обработки. Добавь всех — всё попадёт в расписание автоматически.
            </div>
            {(d.pets || []).map((pet, i) => (
              <div key={pet.id} style={{ background: "rgba(78,201,190,0.06)", border: "1px solid rgba(78,201,190,0.18)", borderRadius: 14, padding: 18, marginBottom: 14 }}>                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: T.teal, letterSpacing: 3 }}>ПИТОМЕЦ {i + 1}</span>
                  <div className="ico-btn danger" onClick={() => delPet(pet.id)}>✕</div>
                </div>
                <div className="fld-row">
                  <div className="fld"><label>Кличка</label><input placeholder="Мурка" value={pet.name} onChange={e => updPet(pet.id, "name", e.target.value)} /></div>
                  <div className="fld"><label>Вид</label>
                    <select value={pet.type} onChange={e => updPet(pet.id, "type", e.target.value)}>
                      {["Кошка", "Собака", "Попугай", "Кролик", "Хомяк", "Черепаха", "Рыбки", "Другое"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="fld-row">
                  <div className="fld"><label>Порода</label><input value={pet.breed} onChange={e => updPet(pet.id, "breed", e.target.value)} /></div>
                  <div className="fld"><label>Дата рождения</label><input type="date" value={pet.dob} onChange={e => updPet(pet.id, "dob", e.target.value)} /></div>
                </div>
                <div className="fld-row">
                  <div className="fld"><label>Корм</label><input placeholder="Royal Canin..." value={pet.food} onChange={e => updPet(pet.id, "food", e.target.value)} /></div>
                  <div className="fld"><label>Вес питомца (кг)</label><input type="number" step="0.1" placeholder="4.5" value={pet.weightKg || ""} onChange={e => updPet(pet.id, "weightKg", e.target.value)} /></div>
                  <div className="fld"><label>Кормлений в день</label>
                    <div className="chips">{["1", "2", "3", "4"].map(v => <div key={v} className={`chip ${pet.feedTimes === v ? "on" : ""}`} onClick={() => updPet(pet.id, "feedTimes", v)}>{v}</div>)}</div>
                  </div>
                </div>
                <div className="fld-row">
                  <div className="fld"><label>Последняя вакцинация</label><input type="date" value={pet.vacDate} onChange={e => updPet(pet.id, "vacDate", e.target.value)} /></div>
                  <div className="fld"><label>Антипаразитарная</label><input type="date" value={pet.parasiteDate} onChange={e => updPet(pet.id, "parasiteDate", e.target.value)} /></div>
                </div>
                <div className="fld"><label>Особенности / болезни</label><input value={pet.notes} onChange={e => updPet(pet.id, "notes", e.target.value)} /></div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn btn-ghost btn-sm" onClick={addPet}>+ Добавить питомца</button>
              {(!d.pets || d.pets.length === 0) && <span style={{ fontSize: 14, color: T.text3, fontStyle: "italic" }}>Нет питомцев — просто продолжи</span>}
            </div>
          </>
        )}

        {s.id === "health" && (
          <>
            <div className="fld"><label>Зоны здоровья — на что обращаешь внимание</label>
              <div className="chips">{["Сердце", "ЖКТ", "Суставы и спина", "Нервная система", "Гормоны", "Кожа", "Зрение", "Иммунитет", "Вес", "Давление"].map(v => <div key={v} className={`chip ${(d.healthFocus || []).includes(v) ? "on" : ""}`} onClick={() => tog("healthFocus", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Хронические заболевания</label><input placeholder="Нет / гастрит / гипертония..." value={d.chronic || ""} onChange={e => set("chronic", e.target.value)} /></div>
            <div className="fld"><label>Главная цель по здоровью</label>
              <div className="chips">{["Похудеть", "Набрать мышцы", "Больше энергии", "Улучшить сон", "Снизить стресс", "Лечение", "Просто поддерживать"].map(v => <div key={v} className={`chip ${d.healthGoal === v ? "on" : ""}`} onClick={() => set("healthGoal", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Физическая активность</label>
              <div className="chips">{(d.gender === "Мужской"
                ? ["Не занимаюсь", "Тренажёр", "Бег", "Плавание", "Велосипед", "Единоборства", "Футбол", "Баскетбол", "Йога", "Цигун", "Прогулки", "Туризм", "Лыжи", "Теннис"]
                : ["Не занимаюсь", "Прогулки", "Йога", "Цигун", "Тренажёр", "Бег", "Плавание", "Танцы", "Велосипед", "Пилатес", "Стретчинг"]              ).map(v => <div key={v} className={`chip ${(d.sport || []).includes(v) ? "on" : ""}`} onClick={() => tog("sport", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Практики</label>
              <div className="chips">{["Нет", "Медитация", "Цигун", "Дыхательные", "Молитва", "Аффирмации", "Ведение дневника"].map(v => <div key={v} className={`chip ${(d.practices || []).includes(v) ? "on" : ""}`} onClick={() => tog("practices", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Питание</label>
              <div className="chips">{["Обычное", "Вегетарианское", "Веганское", "Без глютена", "Кето", "Интервальное", "ПП"].map(v => <div key={v} className={`chip ${d.nutrition === v ? "on" : ""}`} onClick={() => set("nutrition", v)}>{v}</div>)}</div>
            </div>
          </>
        )}

        {s.id === "tcm" && (
          <>
            <div style={{ padding: "12px 16px", background: "rgba(45,106,79,0.08)", borderRadius: 12, marginBottom: 20, fontSize: 14, color: T.text2, lineHeight: 1.6, borderLeft: "3px solid " + T.gold }}>
              {d.dob && (() => {
                const el = getZodiacInline(d.dob); // Здесь должна быть функция getChineseElement, но пока оставим заглушку или упростим
                return null; 
              })()}
              {!d.dob && <span>Ответь на вопросы — это позволит составить персональные рекомендации по питанию и здоровью на основе ТКМ.</span>}
            </div>

            {/* 1. Час рождения */}
            <div className="fld">
              <label>Примерный час рождения</label>
              <div className="fld-hint">Определяет главный меридиан и тип Ци</div>
              <div className="chips">{[
                "🌙 Ночь (23–01) — Желчный пузырь", "🌑 Глубокая ночь (01–03) — Печень", "🌒 Ранее утро (03–05) — Лёгкие",
                "🌅 Рассвет (05–07) — Толстый кишечник", "☀️ Утро (07–09) — Желудок", "🌤 Позднее утро (09–11) — Селезёнка",
                "💛 Полдень (11–13) — Сердце", "🌞 День (13–15) — Тонкий кишечник", "🌇 Послеполуденное (15–17) — Мочевой пузырь",
                "🌆 Ранний вечер (17–19) — Почки", "🌃 Вечер (19–21) — Перикард", "🌙 Поздний вечер (21–23) — Тройной обогреватель",
                "❓ Не знаю",
              ].map(v => <div key={v} className={`chip ${d.birthHour === v ? "on" : ""}`} onClick={() => set("birthHour", v)}>{v}</div>)}</div>
            </div>

            {/* 2. Ощущение температуры */}
            <div className="fld">
              <label>Как ты обычно себя чувствуешь по температуре тела?</label>
              <div className="fld-hint">Диагностика Инь/Ян дисбаланса</div>
              <div className="chips">{[
                "🥵 Часто жарко, потею", "🥶 Часто мёрзну, руки/ноги холодные", "🌡 Бывает и так, и так", "✅ Обычно комфортно",
              ].map(v => <div key={v} className={`chip ${d.tcmTemp === v ? "on" : ""}`} onClick={() => set("tcmTemp", v)}>{v}</div>)}</div>
            </div>

            {/* 3. Влажность/сухость */}
            <div className="fld">
              <label>Какие симптомы сухости или влажности замечаешь?</label>
              <div className="fld-hint">Определяет тип Сырость/Сухость по ТКМ</div>
              <div className="chips">{[
                "💧 Отёки, тяжесть, слизь — влажность", "🏜 Сухость кожи, губ, глаз — сухость", "😓 Избыточная потливость", "🌿 Нормально, ничего особенного", "🤔 Сложно сказать",
              ].map(v => <div key={v} className={`chip ${d.tcmMoisture === v ? "on" : ""}`} onClick={() => set("tcmMoisture", v)}>{v}</div>)}</div>            </div>

            {/* 4. Эмоциональный паттерн */}
            <div className="fld">
              <label>Какие эмоции преобладают в твоей жизни?</label>
              <div className="fld-hint">Каждая стихия связана с определёнными эмоциями</div>
              <div className="chips">{[
                "😤 Раздражение, гнев, нетерпение — Дерево", "😰 Тревога, суета, перевозбуждение — Огонь",
                "😟 Беспокойство, навязчивые мысли — Земля", "😢 Печаль, грусть, ностальгия — Металл",
                "😨 Страх, неуверенность, изоляция — Вода", "😊 В целом гармонично",
              ].map(v => <div key={v} className={`chip ${d.tcmEmotion === v ? "on" : ""}`} onClick={() => set("tcmEmotion", v)}>{v}</div>)}</div>
            </div>

            {/* 5. Пищевые предпочтения */}
            <div className="fld">
              <label>Что тянет есть чаще всего?</label>
              <div className="fld-hint">Тяга к определённому вкусу — сигнал органа</div>
              <div className="chips">{[
                "🍋 Кислое (лимон, уксус, квашеное) — Печень", "🌶 Горькое (кофе, шоколад тёмный) — Сердце",
                "🍬 Сладкое (хлеб, сахар, фрукты) — Селезёнка", "🧂 Острое и пряное (специи, имбирь) — Лёгкие",
                "🥓 Солёное (соленья, сыр, морепродукты) — Почки", "🤷 Всё одинаково",
              ].map(v => <div key={v} className={`chip ${d.tcmTaste === v ? "on" : ""}`} onClick={() => set("tcmTaste", v)}>{v}</div>)}</div>
            </div>

            {/* 6. Сон */}
            <div className="fld">
              <label>Особенности сна по ТКМ</label>
              <div className="fld-hint">Время пробуждения указывает на орган требующий внимания</div>
              <div className="chips">{[
                "⏰ Просыпаюсь в 1–3 ночи — Печень", "⏰ Просыпаюсь в 3–5 утра — Лёгкие",
                "⏰ Просыпаюсь в 5–7 утра — Толстый кишечник", "💤 Сплю крепко всю ночь",
                "😴 Засыпаю с трудом, долго", "🥱 Сонливость днём, усталость",
              ].map(v => <div key={v} className={`chip ${d.tcmSleep === v ? "on" : ""}`} onClick={() => set("tcmSleep", v)}>{v}</div>)}</div>
            </div>

            {/* 7. Пищеварение */}
            <div className="fld">
              <label>Как работает пищеварение?</label>
              <div className="fld-hint">Желудок и Селезёнка — центр Ци в ТКМ</div>
              <div className="chips">{[
                "✅ Всё хорошо", "🎈 Вздутие, газы после еды", "❄️ Тяжесть, еда долго переваривается",
                "🔥 Изжога, кислотность", "💨 Нестабильность (то запор, то нет)", "😩 Часто нет аппетита",
              ].map(v => <div key={v} className={`chip ${d.tcmDigestion === v ? "on" : ""}`} onClick={() => set("tcmDigestion", v)}>{v}</div>)}</div>
            </div>
          </>
        )}

        {s.id === "beauty" && (
          <>
            {/* Тип кожи — для всех */}            <div className="fld"><label>Тип кожи</label>
              <div className="chips">{["Нормальная", "Сухая", "Жирная", "Комбинированная", "Чувствительная"].map(v => <div key={v} className={`chip ${d.skinType === v ? "on" : ""}`} onClick={() => set("skinType", v)}>{v}</div>)}</div>
            </div>

            {d.gender === "Мужской" ? <>
              {/* Мужской блок */}
              <div className="fld"><label>Борода / усы</label>
                <div className="chips">{["Нет", "Щетина", "Короткая борода", "Длинная борода", "Усы"].map(v => <div key={v} className={`chip ${d.beard === v ? "on" : ""}`} onClick={() => set("beard", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Как часто бреешься / стрижёшь бороду</label>
                <div className="chips">{["Каждый день", "Раз в 2–3 дня", "Раз в неделю", "Реже"].map(v => <div key={v} className={`chip ${d.beardFreq === v ? "on" : ""}`} onClick={() => set("beardFreq", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Стрижка в барбершопе</label>
                <div className="chips">{["Раз в 2–3 нед.", "Раз в месяц", "Раз в 2 мес.", "Стригусь сам", "Редко"].map(v => <div key={v} className={`chip ${d.haircutFreq === v ? "on" : ""}`} onClick={() => set("haircutFreq", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Приоритет в уходе</label>
                <div className="chips">{["Кожа лица", "Борода", "Тело", "Всё одинаково"].map(v => <div key={v} className={`chip ${d.beautyPriority === v ? "on" : ""}`} onClick={() => set("beautyPriority", v)}>{v}</div>)}</div>
              </div>
            </> : <>
              {/* Женский блок */}
              <div className="fld"><label>Волосы</label>
                <div className="chips">{["Нормальные", "Сухие", "Жирные", "Окрашенные", "Вьющиеся", "Тонкие"].map(v => <div key={v} className={`chip ${d.hairType === v ? "on" : ""}`} onClick={() => set("hairType", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Ногти</label>
                <div className="chips">{["Не делаю", "Раз в 2–3 нед.", "Раз в месяц", "Нарощенные (коррекция 3 нед.)", "Сама дома"].map(v => <div key={v} className={`chip ${d.nailFreq === v ? "on" : ""}`} onClick={() => set("nailFreq", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Стрижка</label>
                <div className="chips">{["Раз в месяц", "Раз в 6 нед.", "Раз в 2 мес.", "Редко"].map(v => <div key={v} className={`chip ${d.haircutFreq === v ? "on" : ""}`} onClick={() => set("haircutFreq", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Главный приоритет в уходе</label>
                <div className="chips">{["Кожа лица", "Тело", "Волосы", "Ногти", "Всё одинаково"].map(v => <div key={v} className={`chip ${d.beautyPriority === v ? "on" : ""}`} onClick={() => set("beautyPriority", v)}>{v}</div>)}</div>
              </div>
            </>}
          </>
        )}

        {s.id === "shopping" && (
          <>
            {/* Состав семьи */}
            <div className="fld">
              <label>Кто живёт с тобой?</label>
              <div className="chips">{["Живу один(а)", "Партнёр/супруг(а)", "Дети", "Родители", "Другие родственники"].map(v => <div key={v} className={`chip ${(d.livesWith || []).includes(v) ? "on" : ""}`} onClick={() => tog("livesWith", v)}>{v}</div>)}</div>
            </div>
            {(d.livesWith || []).some(x => ["Партнёр/супруг(а)", "Дети", "Родители", "Другие родственники"].includes(x)) && <>
              <div className="fld">
                <label>Общее количество человек в семье (включая тебя)</label>
                <div className="chips">{["1", "2", "3", "4", "5", "6+"].map(v => <div key={v} className={`chip ${d.familySize === v ? "on" : ""}`} onClick={() => set("familySize", v)}>{v}</div>)}</div>
              </div>
              {(d.livesWith || []).includes("Дети") && (
                <div className="fld">                  <label>Дети — возраст</label>
                  <input placeholder="Например: 3 года, 7 лет, 12 лет" value={d.childrenAges || ""} onChange={e => set("childrenAges", e.target.value)} />
                </div>
              )}
              {(d.livesWith || []).includes("Родители") && (
                <div className="fld">
                  <label>Особые потребности у членов семьи</label>
                  <input placeholder="Диабет, аллергия на глютен, вегетарианец..." value={d.familyNeeds || ""} onChange={e => set("familyNeeds", e.target.value)} />
                </div>
              )}
            </>}
            <div className="fld"><label>Как часто закупаешься</label>
              <div className="chips">{["Каждый день", "2–3 раза в неделю", "Раз в неделю", "Раз в 2 недели", "Заказываю онлайн"].map(v => <div key={v} className={`chip ${d.shopFreq === v ? "on" : ""}`} onClick={() => set("shopFreq", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Удобный день для основной закупки</label>
              <div className="chips">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(v => <div key={v} className={`chip ${d.shopDay === v ? "on" : ""}`} onClick={() => set("shopDay", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Онлайн-заказы</label>
              <div className="chips">{["Нет", "Иногда", "Продукты онлайн", "Всё онлайн"].map(v => <div key={v} className={`chip ${d.onlineShopping === v ? "on" : ""}`} onClick={() => set("onlineShopping", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Что всегда должно быть дома</label>
              <div className="chips">{["Яйца", "Крупы", "Молочное", "Фрукты", "Овощи", "Мясо", "Рыба", "Хлеб", "Консервы", "Орехи", "Бобовые", "Зелень"].map(v => <div key={v} className={`chip ${(d.staples || []).includes(v) ? "on" : ""}`} onClick={() => tog("staples", v)}>{v}</div>)}</div>
            </div>
          </>
        )}

        {s.id === "hobbies" && (
          <>
            <div className="fld"><label>Хобби и увлечения</label>
              <div className="chips">{(d.gender === "Мужской"
                ? ["Чтение", "Фотография", "Музыка", "Готовка", "Садоводство", "Видеоигры", "Кино", "Путешествия", "Спорт", "Рисование", "Блогинг", "Языки", "Рыбалка", "Авто / мото", "Туризм / походы", "Единоборства", "Программирование", "Настольные игры"]
                : ["Чтение", "Рисование", "Вязание/шитьё", "Фотография", "Музыка", "Готовка", "Садоводство", "Видеоигры", "Кино", "Путешествия", "Танцы", "Рукоделие", "Блогинг", "Языки", "Спорт", "Йога", "Декор / дизайн"]
              ).map(v => <div key={v} className={`chip ${(d.hobbies || []).includes(v) ? "on" : ""}`} onClick={() => tog("hobbies", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Хобби-проект — что {d.gender === "Мужской" ? "хочешь" : "хочешь"} развивать</label>
              <input placeholder={d.gender === "Мужской" ? "Освоить гитару, прочитать 12 книг, научиться сёрфингу..." : "Научиться акварели, прочитать 12 книг, освоить гитару..."} value={d.hobbyProject || ""} onChange={e => set("hobbyProject", e.target.value)} />
            </div>
            <div className="fld"><label>Как часто удаётся заниматься хобби</label>
              <div className="chips">{["Почти никогда", "Раз в месяц", "Раз в неделю", "Несколько раз в неделю", "Каждый день"].map(v => <div key={v} className={`chip ${d.hobbyFreq === v ? "on" : ""}`} onClick={() => set("hobbyFreq", v)}>{v}</div>)}</div>
            </div>
          </>
        )}

        {s.id === "travel" && (
          <>
            <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 15, color: T.text3, fontStyle: "italic", marginBottom: 16, lineHeight: 1.7 }}>
              Добавь куда хочешь поехать — приложение будет мягко напоминать о подготовке. Без давления.
            </div>
            {(d.trips || []).map((trip, i) => (
              <div key={trip.id} style={{ background: "rgba(90,142,200,0.06)", border: "1px solid rgba(90,142,200,0.2)", borderRadius: 14, padding: 18, marginBottom: 14 }}>                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: T.info, letterSpacing: 3 }}>ПОЕЗДКА {i + 1}</span>
                  <div className="ico-btn danger" onClick={() => delTrip(trip.id)}>✕</div>
                </div>
                <div className="fld"><label>Куда?</label><input placeholder="Стамбул, Бали, Байкал..." value={trip.destination} onChange={e => updTrip(trip.id, "destination", e.target.value)} /></div>
                <div className="fld-row">
                  <div className="fld"><label>Планируемая дата</label><input type="month" value={trip.targetDate} onChange={e => updTrip(trip.id, "targetDate", e.target.value)} /></div>
                  <div className="fld"><label>Бюджет (₽)</label><input type="number" value={trip.budget} onChange={e => updTrip(trip.id, "budget", e.target.value)} /></div>
                </div>
                <div className="fld"><label>Стадия</label>
                  <div className="chips">{["💭 Мечта", "🗺️ Планирую", "💰 Коплю", "🎫 Билеты куплены", "✅ Всё готово"].map(v => <div key={v} className={`chip ${trip.stage === v ? "on" : ""}`} onClick={() => updTrip(trip.id, "stage", v)}>{v}</div>)}</div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn btn-ghost btn-sm" onClick={addTrip}>+ Добавить поездку</button>
              {(!d.trips || d.trips.length === 0) && <span style={{ fontSize: 14, color: T.text3, fontStyle: "italic" }}>Нет поездок — продолжи</span>}
            </div>
          </>
        )}

        {s.id === "goals" && (
          <>
            <div className="fld"><label>Главная цель на ближайшие 3 месяца</label><textarea placeholder="Наладить режим, похудеть на 5 кг, сменить работу..." value={d.mainGoal || ""} onChange={e => set("mainGoal", e.target.value)} /></div>
            <div className="fld"><label>Сферы где хочешь прогресса</label>
              <div className="chips">{["Здоровье", "Карьера", "Финансы", "Отношения", "Саморазвитие", "Творчество", "Путешествия", "Духовность", "Семья", "Внешность"].map(v => <div key={v} className={`chip ${(d.goalAreas || []).includes(v) ? "on" : ""}`} onClick={() => tog("goalAreas", v)}>{v}</div>)}</div>
            </div>
            <div className="fld"><label>Что сдерживает от достижения целей?</label>
              <div className="chips">{["Нехватка времени", "Нехватка энергии", "Откладываю", "Не знаю с чего начать", "Много отвлекаюсь", "Страх неудачи"].map(v => <div key={v} className={`chip ${(d.goalBlocks || []).includes(v) ? "on" : ""}`} onClick={() => tog("goalBlocks", v)}>{v}</div>)}</div>
            </div>
          </>
        )}

        {s.id === "done" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✨</div>
            {d.name && <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 22, color: T.gold, marginBottom: 8 }}>Привет, {d.name.split(" ")[0] || d.name}!</div>}
            <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 16, color: T.text2, lineHeight: 1.8, fontStyle: "italic" }}>
              {d.dob && `${getZodiacInline(d.dob).emoji} ${getZodiacInline(d.dob).name} · 🐾 ${getEasternInline(d.dob)}`}
              {d.fullName && ` · ✦ ${calcDegreeInline(d.fullName)}° судьбы`}
              <br />Life Diary знает тебя и готов держать всё в голове вместо тебя.
            </div>
          </div>
        )}

        <div className="ob-foot">
          {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Назад</button>}
          {step < OB_STEPS.length - 1
            ? <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Далее →</button>
            : <button className="btn btn-primary" onClick={handleDone}>Открыть Life Diary ✨</button>          }
        </div>
      </div>
    </div>
  );
               }
