// src/components/Onboarding.jsx
import { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";

// ═══════════════════════════════════════════════════════════════
// 1. INLINE HELPERS (Self-contained)
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// 2. INLINE SVG ICONS (Blueprint Style)
// ═══════════════════════════════════════════════════════════════
const STEP_ICONS = {
  welcome: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="8" y="12" width="48" height="40" rx="2"/><circle cx="32" cy="32" r="12"/><path d="M26 26 L38 38 M38 26 L26 38" stroke="#c8a45a"/></svg>,
  basic: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="32" cy="24" r="8"/><path d="M16 52 Q16 36 32 36 Q48 36 48 52"/><circle cx="48" cy="12" r="3" fill="#c8a45a" stroke="none"/><circle cx="52" cy="16" r="2" fill="#c8a45a" stroke="none"/></svg>,
  persona: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M32 8 L36 16 L48 18 L40 26 L42 38 L32 32 L22 38 L24 26 L16 18 L28 16 Z"/><circle cx="32" cy="24" r="6"/></svg>,
  persona2: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="18" y="16" width="28" height="32" rx="2"/><path d="M32 48 L32 56 M28 52 L36 52" stroke="#c8a45a"/><path d="M32 8 L34 12 L32 16 L30 12 Z" fill="#c8a45a" stroke="none"/></svg>,
  schedule: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="32" cy="32" r="20"/><line x1="32" y1="32" x2="32" y2="20" strokeWidth="2"/><line x1="32" y1="32" x2="42" y2="36" strokeWidth="2"/></svg>,
  work: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="12" y="24" width="40" height="28" rx="2"/><path d="M12 32 L52 32"/><rect x="28" y="20" width="8" height="8" rx="1"/></svg>,
  work2: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="16" y="8" width="32" height="48" rx="2"/><path d="M24 16 L26 18 L30 14" stroke="#c8a45a" strokeWidth="2"/><path d="M24 24 L26 26 L30 22" stroke="#c8a45a" strokeWidth="2"/></svg>,
  home: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 28 L32 8 L56 28"/><rect x="14" y="30" width="36" height="26" rx="1"/><rect x="26" y="42" width="12" height="14"/></svg>,
  pets: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="32" cy="36" rx="14" ry="10"/><circle cx="24" cy="24" r="6"/><circle cx="40" cy="24" r="6"/><path d="M20 18 L18 12 L24 16"/><path d="M44 18 L46 12 L40 16"/></svg>,
  health: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M32 52 Q16 40 16 28 Q16 20 24 20 Q28 20 32 24 Q36 20 40 20 Q48 20 48 28 Q48 40 32 52 Z"/><line x1="32" y1="28" x2="32" y2="44" strokeWidth="2"/></svg>,  tcm: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="32" cy="32" r="20"/><path d="M32 12 Q42 12 42 32 Q42 52 32 52" fill="currentColor" opacity="0.3"/><circle cx="32" cy="22" r="4" fill="currentColor"/><circle cx="32" cy="42" r="4" fill="#fff"/></svg>,
  beauty: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="32,8 36,24 52,24 40,36 44,52 32,42 20,52 24,36 12,24 28,24 Z" fill="#c8a45a" fillOpacity="0.3"/><circle cx="32" cy="32" r="8"/></svg>,
  shopping: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20 L16 48 Q17 52 22 52 L42 52 Q47 52 48 48 L52 20"/><circle cx="24" cy="52" r="3"/><circle cx="40" cy="52" r="3"/></svg>,
  hobbies: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="12" y="12" width="40" height="40" rx="2" transform="rotate(15 32 32)"/><circle cx="24" cy="24" r="4" fill="#c8a45a" stroke="none"/></svg>,
  travel: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 44 L32 16 L52 44 L32 40 Z"/><path d="M20 36 Q32 52 44 36" opacity="0.6"/></svg>,
  goals: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="14" opacity="0.6"/><circle cx="32" cy="32" r="8" opacity="0.8"/><circle cx="32" cy="32" r="3" fill="currentColor"/></svg>,
  done: <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="32,6 36,26 56,26 40,38 46,58 32,46 18,58 24,38 8,26 28,26 Z" fill="#c8a45a" fillOpacity="0.4"/><path d="M24 32 L30 38 L42 26" strokeLinecap="round" strokeLinejoin="round" stroke="#fff" strokeWidth="3"/></svg>,
};

// ══════════════════════════════════════════════════════════════
// 3. STEP CONFIG (Phased Progress)
// ═══════════════════════════════════════════════════════════════
const PHASES = [
  { name: "Профиль", range: [0, 3] },
  { name: "Распорядок", range: [4, 7] },
  { name: "Здоровье & Быт", range: [8, 12] },
  { name: "Цели & Финал", range: [13, 16] }
];
const OB_STEPS = [
  { id: "welcome", title: "Добро пожаловать", sub: "Твой личный организатор жизни — знает тебя, думает за тебя. 7–10 минут." },
  { id: "basic", title: "Кто ты?", sub: "Имя, дата рождения и место. Расчёт знака, восточного цикла и градуса судьбы." },
  { id: "persona", title: "Как ты устроен(а)?", sub: "Честные вопросы о природе. Точность = качество советов." },
  { id: "persona2", title: "Энергия и восстановление", sub: "Откуда берутся силы и что их забирает." },
  { id: "schedule", title: "Твой ритм дня", sub: "Подъём, отбой, хронотип — расписание вокруг твоей природы." },
  { id: "work", title: "Работа и карьера", sub: "Чем занимаешься и что для тебя важно." },
  { id: "work2", title: "Рабочий распорядок", sub: "Из чего состоит день — интегрируем в общий график." },
  { id: "home", title: "Твой дом", sub: "Тип жилья, быт, растения, авто — для графика хозяйства." },
  { id: "pets", title: "Питомцы", sub: "Кормление, ветвизиты — войдут в расписание автоматически." },
  { id: "health", title: "Здоровье", sub: "Расписание строится с заботой о тебе, а не вопреки." },
  { id: "tcm", title: "ТКМ-диагностика", sub: "5 вопросов для профиля по традиционной китайской медицине." },
  { id: "beauty", title: "Уход за собой", sub: "Кожа, волосы, процедуры — поставим в график." },
  { id: "shopping", title: "Продукты и покупки", sub: "Когда и как закупаешься — напомним вовремя." },
  { id: "hobbies", title: "Хобби и увлечения", sub: "Увлечения заслуживают места в жизни." },
  { id: "travel", title: "Путешествия", sub: "Куда хочешь поехать? Спланируем мягко, шаг за шагом." },
  { id: "goals", title: "Цели", sub: "Чего хочешь достичь? Приложение будет напоминать и поддерживать." },
  { id: "done", title: "Профиль готов", sub: "Life Diary держит всё в голове вместо тебя." },
];

export function Onboarding() {
  const { setProfile } = useApp();
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    pets: [], trips: [], hobbies: [],
    wake: "07:00", sleep: "23:00",
    workStart: "09:00", workEnd: "18:00",
    workDaysList: [1, 2, 3, 4, 5],
  });

  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const tog = (k, v) => {    const a = d[k] || [];
    set(k, a.includes(v) ? a.filter(x => x !== v) : [...a, v]);
  };

  const s = OB_STEPS[step];
  const pct = (step / (OB_STEPS.length - 1)) * 100;
  const currentPhase = PHASES.find(p => step >= p.range[0] && step <= p.range[1])?.name || "";

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
    setProfile({
      ...d, trips: d.trips || [], hobbies: d.hobbies || [], pets: d.pets || [],
      wake: d.wake || "07:00", sleep: d.sleep || "23:00",
      workStart: d.workStart || "09:00", workEnd: d.workEnd || "18:00",
      workDaysList: d.workDaysList || [1, 2, 3, 4, 5], onboardingComplete: true,
    });
  };

  return (
    <div className="ob-root">
      <style>{`
        /* ─── RESET & BASE ─── */
        .ob-root { position: relative; min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; padding: clamp(16px, 4vw, 32px); background: #f5f0e1; overflow-y: auto; font-family: 'Crimson Pro', serif; }
        
        /* ─── BACKGROUND PNG ─── */
        .ob-bg { position: absolute; inset: 0; background: url('/assets/onboarding-blueprint.png') center/cover no-repeat; opacity: 0.12; mix-blend-mode: multiply; filter: blur(1px) grayscale(20%) sepia(15%); pointer-events: none; z-index: 0; }
        
        /* ─── CARD ─── */
        .ob-card { position: relative; z-index: 1; width: 100%; max-width: 720px; background: rgba(255,255,255,0.96); border: 1.5px solid rgba(0,112,192,0.25); border-radius: 16px; padding: clamp(32px, 6vw, 56px); box-shadow: 0 12px 40px rgba(0,112,192,0.12); display: flex; flex-direction: column; gap: clamp(20px, 4vw, 32px); }
        
        /* ─── PROGRESS ─── */
        .ob-progress { width: 100%; }
        .ob-phase-label { font-family: 'JetBrains Mono', monospace; font-size: clamp(11px, 1.8vw, 13px); color: #0070c0; letter-spacing: 1.5px; margin-bottom: 8px; text-transform: uppercase; }
        .ob-bar-track { width: 100%; height: 8px; background: rgba(0,112,192,0.08); border-radius: 6px; overflow: hidden; }
        .ob-bar-fill { height: 100%; background: linear-gradient(90deg, #0070c0, #c8a45a); transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 6px; }
        .ob-phase-markers { display: flex; justify-content: space-between; margin-top: 10px; padding: 0 4px; }
        .ob-marker { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #8c7a5a; opacity: 0.6; transition: all 0.3s; }
        .ob-marker.active { color: #0070c0; font-weight: 700; opacity: 1; transform: scale(1.15); }
        /* ─── HEADER ─── */
        .ob-header { text-align: center; display: flex; flex-direction: column; align-items: center; gap: clamp(16px, 3vw, 24px); }
        .ob-title { font-family: 'Cinzel', serif; font-size: clamp(2rem, 5.5vw, 2.6rem); color: #2c241b; margin: 0; line-height: 1.2; font-weight: 600; }
        .ob-sub { font-family: 'Cormorant Infant', serif; font-size: clamp(1.2rem, 3.5vw, 1.7rem); color: #5c4a30; margin: 0; max-width: 95%; line-height: 1.6; font-weight: 400; }

        /* ─── ICON WRAP (Для шагов кроме welcome) ─── */
        .ob-icon-wrap { width: clamp(56px, 9vw, 72px); height: clamp(56px, 9vw, 72px); background: rgba(0,112,192,0.06); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(0,112,192,0.2); overflow: hidden; flex-shrink: 0; }
        .ob-icon-wrap svg { width: 60%; height: 60%; color: #0070c0; }
        
        /* ─── WELCOME IMAGE (Без круга, натуральные пропорции) ─── */
        .ob-welcome-img {
          width: clamp(320px, 65vw, 520px);
          height: auto;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 6px 15px rgba(0,112,192,0.15));
        }

        /* ─── BODY & FORMS ─── */
        .ob-body { display: flex; flex-direction: column; gap: clamp(16px, 3vw, 24px); min-height: 180px; }
        .fld { display: flex; flex-direction: column; gap: 8px; }
        .fld label { font-family: 'Cinzel', serif; font-size: clamp(12px, 1.8vw, 14px); color: #0070c0; letter-spacing: 0.5px; }
        .fld input, .fld select, .fld textarea { padding: 12px 14px; border: 1.5px solid rgba(0,112,192,0.2); border-radius: 8px; background: #f9f7f2; font-family: 'Crimson Pro', serif; font-size: 16px; color: #2c241b; transition: border 0.2s, box-shadow 0.2s; }
        .fld input:focus, .fld select:focus, .fld textarea:focus { outline: none; border-color: #0070c0; box-shadow: 0 0 0 3px rgba(0,112,192,0.12); background: #fff; }
        .fld-hint { font-size: 13px; color: #8c7a5a; font-style: italic; }
        .fld-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { padding: 8px 14px; border: 1.5px solid rgba(0,112,192,0.2); border-radius: 20px; font-size: 14px; color: #5c4a30; cursor: pointer; transition: all 0.2s; background: transparent; user-select: none; }
        .chip:hover { background: rgba(0,112,192,0.05); }
        .chip.on { background: #0070c0; color: #fff; border-color: #0070c0; box-shadow: 0 3px 8px rgba(0,112,192,0.25); }

        .calc-preview { background: rgba(0,112,192,0.04); border: 1px dashed rgba(0,112,192,0.25); border-radius: 10px; padding: 14px; margin-top: 10px; }
        .calc-row { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
        .calc-item { text-align: center; }
        .calc-l { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #8c7a5a; letter-spacing: 1px; text-transform: uppercase; }
        .calc-v { font-family: 'Cinzel', serif; font-size: 16px; color: #2c241b; margin-top: 6px; }

        /* ─── FOOTER ─── */
        .ob-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1.5px solid rgba(0,112,192,0.1); }
        .btn { padding: 12px 24px; border-radius: 10px; font-family: 'Cinzel', serif; font-size: 15px; cursor: pointer; transition: all 0.2s; border: 1.5px solid rgba(0,112,192,0.25); background: transparent; color: #0070c0; }
        .btn-primary { background: #0070c0; color: #fff; border-color: #0070c0; }
        .btn-primary:hover { background: #005a99; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,112,192,0.3); }
        .btn-ghost:hover { background: rgba(0,112,192,0.06); }
        .btn-sm { padding: 8px 16px; font-size: 13px; }

        /* ─── MOBILE BREAKPOINT ─── */
        @media (max-width: 600px) {
          .ob-root { padding: 12px; align-items: stretch; }
          .ob-card { padding: 24px 20px; max-width: 100%; border-radius: 12px; }          .fld-row { grid-template-columns: 1fr; }
          .ob-marker:not(.active) { display: none; }
          .ob-sub { font-size: 1.15rem; }
          .ob-title { font-size: 24px; }
          .ob-welcome-img { width: 90%; max-width: 360px; }
        }
      `}</style>

      <div className="ob-bg" />
      <div className="ob-card">
        {/* Progress */}
        <div className="ob-progress">
          <div className="ob-phase-label">Фаза: {currentPhase}</div>
          <div className="ob-bar-track">
            <div className="ob-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="ob-phase-markers">
            {PHASES.map((p) => (
              <span key={p.name} className={`ob-marker ${step >= p.range[0] && step <= p.range[1] ? 'active' : ''}`}>
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="ob-header">
          {s.id === "welcome" ? (
            <img 
              src="/assets/onboarding-blueprint.png" 
              alt="Blueprint Book" 
              className="ob-welcome-img" 
            />
          ) : (
            <div className="ob-icon-wrap">{STEP_ICONS[s.id] || STEP_ICONS.welcome}</div>
          )}
          
          <h2 className="ob-title">{s.title}</h2>
          <p className="ob-sub">{s.sub}</p>
        </div>

        {/* Body */}
        <div className="ob-body">
          {s.id === "welcome" && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: "clamp(16px, 2.5vw, 20px)", color: "#5c4a30", fontStyle: "italic", lineHeight: 1.7 }}>
                «Всё записано — ничего не потеряно»
              </div>
            </div>
          )}
          {s.id === "basic" && (
            <>
              <div className="fld"><label>Имя</label><input placeholder="Мария" value={d.name || ""} onChange={e => set("name", e.target.value)} /></div>
              <div className="fld"><label>Полное ФИО</label><input placeholder="Иванова Мария Петровна" value={d.fullName || ""} onChange={e => set("fullName", e.target.value)} /><div className="fld-hint">Для расчёта градуса судьбы (1–360°)</div></div>
              <div className="fld-row">
                <div className="fld"><label>Дата рождения</label><input type="date" value={d.dob || ""} onChange={e => set("dob", e.target.value)} /><div className="fld-hint">Знак · Восточный цикл · Слабые зоны</div></div>
                <div className="fld"><label>Пол</label><select value={d.gender || ""} onChange={e => set("gender", e.target.value)}><option value="">—</option><option>Женский</option><option>Мужской</option></select></div>
              </div>
              {(d.dob || d.fullName) && (
                <div className="calc-preview">
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#8c7a5a", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>Рассчитано автоматически</div>
                  <div className="calc-row">
                    {zodiac && <div className="calc-item"><div className="calc-l">Знак</div><div className="calc-v">{zodiac.emoji} {zodiac.name}</div></div>}
                    {eastern && <div className="calc-item"><div className="calc-l">Восточный</div><div className="calc-v">🐾 {eastern}</div></div>}
                    {age && <div className="calc-item"><div className="calc-l">Возраст</div><div className="calc-v">{age} лет</div></div>}
                    {degree && <div className="calc-item"><div className="calc-l">Градус</div><div className="calc-v" style={{ color: "#c8a45a", fontSize: 20 }}>{degree}°</div></div>}
                  </div>
                </div>
              )}
              <div className="fld-row">
                <div className="fld"><label>Город</label><input placeholder="Москва" value={d.city || ""} onChange={e => set("city", e.target.value)} /></div>
                <div className="fld"><label>Часовой пояс</label><select value={d.tz || ""} onChange={e => set("tz", e.target.value)}><option value="">—</option><option>UTC+5 Западный Казахстан</option><option>UTC+6 Восточный Казахстан</option></select></div>
              </div>
            </>
          )}

          {s.id === "persona" && (
            <>
              {[
                ["Как принимаешь решения?", "decisionStyle", ["Логика и анализ", "Интуиция и чувства", "Советуюсь с другими", "Смотрю на факты", "Долго взвешиваю"]],
                ["Откуда берёшь энергию?", "energySource", ["Из общения", "Из одиночества", "Из движения", "Из творчества", "Из природы", "Из порядка"]],
                ["Отношение к планированию", "planningStyle", ["Люблю чёткий план", "Предпочитаю гибкость", "Скелет + свобода", "Планы сковывают меня"]],
                ["Отношение к порядку", "orderStyle", ["Порядок = спокойствие", "Творческий беспорядок норма", "Часть в порядке", "Хочу порядка, но не всегда"]],
                ["Главная ценность", "coreValue", ["Свобода", "Безопасность", "Развитие", "Любовь", "Достижения", "Гармония", "Творчество", "Здоровье"]],
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
                ["Как восстанавливаешься?", "recovery", ["Сон и тишина", "Прогулка на природе", "Общение с близкими", "Любимое хобби", "Спорт и движение", "Уход за собой", "Вкусная еда", "Кино / книга", "Музыка", "Медитация", "Горячая ванна", "Время в одиночестве", "Творчество", "Путешествие"], true],              ].map(([label, key, opts, multi]) => (
                <div className="fld" key={key}>
                  <label>{label}</label>
                  <div className="chips">{opts.map(v => <div key={v} className={`chip ${(d[key] || []).includes(v) ? "on" : ""}`} onClick={() => multi ? tog(key, v) : set(key, v)}>{v}</div>)}</div>
                </div>
              ))}
              {[
                ["Уровень энергии сейчас", "stressLevel", d.gender === "Мужской" ? ["Полон сил", "В балансе", "Немного устал", "Нужна подзарядка"] : ["Полна сил", "В балансе", "Немного устала", "Нужна подзарядка"]],
                ["Отношение к своему телу", "bodyRelation", ["Люблю и забочусь", "Хочу больше внимания", "Стремлюсь к гармонии", "Учусь принимать себя"]],
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
                <div className="fld"><label>Подъём</label><input type="time" value={d.wake} onChange={e => set("wake", e.target.value)} /></div>
                <div className="fld"><label>Отбой</label><input type="time" value={d.sleep} onChange={e => set("sleep", e.target.value)} /></div>
              </div>
              <div className="fld"><label>Хронотип</label>
                <div className="chips">{["🌅 Жаворонок", "🕊️ Голубь", "🦉 Сова"].map(v => <div key={v} className={`chip ${d.chronotype === v ? "on" : ""}`} onClick={() => set("chronotype", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Минут в день на себя</label>
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
                <div className="fld"><label>Профессия / должность</label><input placeholder="Менеджер, дизайнер..." value={d.profession || ""} onChange={e => set("profession", e.target.value)} /></div>
                <div className="fld"><label>Сфера</label><input placeholder="IT, медицина..." value={d.jobSphere || ""} onChange={e => set("jobSphere", e.target.value)} /></div>
              </div>
              <div className="fld"><label>Формат занятости</label>
                <div className="chips">{["Офис", "Удалёнка", "Гибрид", "Фриланс", "Своё дело", "Учусь", "Декрет / не работаю"].map(v => <div key={v} className={`chip ${d.workType === v ? "on" : ""}`} onClick={() => set("workType", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Что забирает энергию?</label>
                <div className="chips">{["Много встреч", "Однообразие", "Дедлайны", "Конфликты", "Переработки", "Скучные задачи", "Неопределённость"].map(v => <div key={v} className={`chip ${(d.workDrain || []).includes(v) ? "on" : ""}`} onClick={() => tog("workDrain", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Рабочая цель</label>
                <div className="chips">{["Карьерный рост", "Повышение дохода", "Сменить профессию", "Своё дело", "Работать меньше", "Прокачать навыки", "Стабильность"].map(v => <div key={v} className={`chip ${d.careerGoal === v ? "on" : ""}`} onClick={() => set("careerGoal", v)}>{v}</div>)}</div>              </div>
              <div className="fld"><label>Отчётность</label>
                <div className="chips">{["Бухгалтер / ИП", "HR / Кадры", "Юрист", "Врач", "Педагог", "Госслужащий", "Нет отчётности"].map(v => <div key={v} className={`chip ${d.profDeadlines === v ? "on" : ""}`} onClick={() => set("profDeadlines", v)}>{v}</div>)}</div>
              </div>
            </>
          )}

          {s.id === "work2" && (
            <>
              <div className="fld-row">
                <div className="fld"><label>Начало работы</label><input type="time" value={d.workStart} onChange={e => set("workStart", e.target.value)} /></div>
                <div className="fld"><label>Конец работы</label><input type="time" value={d.workEnd} onChange={e => set("workEnd", e.target.value)} /></div>
              </div>
              <div className="fld"><label>Рабочие дни</label>
                <div className="chips">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((v, i) => <div key={v} className={`chip ${(d.workDaysList || []).includes(i + 1) ? "on" : ""}`} onClick={() => { const c = d.workDaysList || [1,2,3,4,5]; set("workDaysList", c.includes(i+1) ? c.filter(x=>x!==i+1) : [...c, i+1]); }}>{v}</div>)}</div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Обед</label><input type="time" value={d.lunchTime || "13:00"} onChange={e => set("lunchTime", e.target.value)} /></div>
                <div className="fld"><label>Длительность (мин)</label><input type="number" placeholder="60" value={d.lunchDur || ""} onChange={e => set("lunchDur", e.target.value)} /></div>
              </div>
              <div className="fld"><label>Дорога до работы</label>
                <div className="chips">{["Дома", "5–15 мин", "15–30 мин", "30–60 мин", "60+ мин"].map(v => <div key={v} className={`chip ${d.commuteTime === v ? "on" : ""}`} onClick={() => set("commuteTime", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Регулярные задачи</label>
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
              <div className="fld"><label>Помещения</label>
                <div className="chips">{["Кухня", "Гостиная", "Коридор", "Балкон", "Кабинет", "Детская", "Кладовка", "Гараж"].map(v => <div key={v} className={`chip ${(d.homeRooms || []).includes(v) ? "on" : ""}`} onClick={() => tog("homeRooms", v)}>{v}</div>)}</div>
              </div>
              <div className="fld-row">
                <div className="fld"><label>Комнат</label><input type="number" placeholder="2" value={d.rooms || ""} onChange={e => set("rooms", e.target.value)} /></div>
                <div className="fld"><label>Живёшь с</label>
                  <div className="chips">{["Один(а)", "Партнёр", "Дети", "Родители", "Соседи"].map(v => <div key={v} className={`chip ${(d.livesWith || []).includes(v) ? "on" : ""}`} onClick={() => tog("livesWith", v)}>{v}</div>)}</div>
                </div>
              </div>
              <div className="fld"><label>Растения</label>
                <div className="chips">{["Нет", "1–3", "4–10", "Много"].map(v => <div key={v} className={`chip ${d.plants === v ? "on" : ""}`} onClick={() => set("plants", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Уборка</label>                <div className="chips">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(v => <div key={v} className={`chip ${(d.cleanDays || []).includes(v) ? "on" : ""}`} onClick={() => tog("cleanDays", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Есть автомобиль?</label>
                <div className="chips">{["Нет", "Да"].map(v => <div key={v} className={`chip ${d.hasCar === v ? "on" : ""}`} onClick={() => set("hasCar", v)}>{v}</div>)}</div>
              </div>
              {d.hasCar === "Да" && <>
                <div className="fld-row">
                  <div className="fld"><label>Марка/Модель</label><input placeholder="Toyota..." value={d.carModel || ""} onChange={e => set("carModel", e.target.value)} /></div>
                  <div className="fld"><label>Год</label><input type="number" placeholder="2020" value={d.carYear || ""} onChange={e => set("carYear", e.target.value)} /></div>
                </div>
                <div className="fld"><label>Страховка (до)</label><input type="date" value={d.carInsurance || ""} onChange={e => set("carInsurance", e.target.value)} /></div>
              </>}
            </>
          )}

          {s.id === "pets" && (
            <>
              <div className="fld-hint" style={{marginBottom: 10}}>Каждый питомец — это кормление и визиты. Всё попадёт в расписание.</div>
              {(d.pets || []).map((pet, i) => (
                <div key={pet.id} style={{ background: "rgba(0,112,192,0.04)", border: "1px solid rgba(0,112,192,0.2)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#0070c0" }}>ПИТОМЕЦ {i + 1}</span>
                    <button className="btn btn-sm" onClick={() => delPet(pet.id)} style={{padding:"4px 10px", fontSize:13}}>✕</button>
                  </div>
                  <div className="fld-row">
                    <div className="fld"><label>Кличка</label><input placeholder="Мурка" value={pet.name} onChange={e => updPet(pet.id, "name", e.target.value)} /></div>
                    <div className="fld"><label>Вид</label><select value={pet.type} onChange={e => updPet(pet.id, "type", e.target.value)}>{["Кошка", "Собака", "Попугай", "Кролик", "Хомяк", "Черепаха", "Рыбки", "Другое"].map(t => <option key={t}>{t}</option>)}</select></div>
                  </div>
                  <div className="fld-row">
                    <div className="fld"><label>Корм</label><input value={pet.food} onChange={e => updPet(pet.id, "food", e.target.value)} /></div>
                    <div className="fld"><label>Кормлений/день</label><div className="chips">{["1", "2", "3", "4"].map(v => <div key={v} className={`chip ${pet.feedTimes === v ? "on" : ""}`} onClick={() => updPet(pet.id, "feedTimes", v)}>{v}</div>)}</div></div>
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addPet}>+ Добавить питомца</button>
            </>
          )}

          {s.id === "health" && (
            <>
              <div className="fld"><label>Зоны внимания</label>
                <div className="chips">{["Сердце", "ЖКТ", "Суставы", "Нервы", "Гормоны", "Кожа", "Зрение", "Иммунитет", "Вес", "Давление"].map(v => <div key={v} className={`chip ${(d.healthFocus || []).includes(v) ? "on" : ""}`} onClick={() => tog("healthFocus", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Хронические заболевания</label><input placeholder="Нет / гастрит..." value={d.chronic || ""} onChange={e => set("chronic", e.target.value)} /></div>
              <div className="fld"><label>Физическая активность</label>
                <div className="chips">{["Не занимаюсь", "Прогулки", "Йога", "Тренажёр", "Бег", "Плавание", "Велосипед", "Цигун"].map(v => <div key={v} className={`chip ${(d.sport || []).includes(v) ? "on" : ""}`} onClick={() => tog("sport", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Питание</label>
                <div className="chips">{["Обычное", "Вегетарианское", "Веганское", "Без глютена", "Кето", "Интервальное", "ПП"].map(v => <div key={v} className={`chip ${d.nutrition === v ? "on" : ""}`} onClick={() => set("nutrition", v)}>{v}</div>)}</div>
              </div>            </>
          )}

          {s.id === "tcm" && (
            <>
              <div className="fld"><label>Час рождения</label>
                <div className="chips">{["🌙 Ночь (23–01)", "🌑 Глубокая ночь (01–03)", "🌒 Ранее утро (03–05)", "🌅 Рассвет (05–07)", "☀️ Утро (07–09)", "🌤 Позднее утро (09–11)", "💛 Полдень (11–13)", "🌞 День (13–15)", "🌇 Послеполуденное (15–17)", "🌆 Ранний вечер (17–19)", "🌃 Вечер (19–21)", "🌙 Поздний вечер (21–23)", "❓ Не знаю"].map(v => <div key={v} className={`chip ${d.birthHour === v ? "on" : ""}`} onClick={() => set("birthHour", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Температура тела</label>
                <div className="chips">{["🥵 Часто жарко", "🥶 Часто мёрзну", "🌡 Бывает и так, и так", "✅ Комфортно"].map(v => <div key={v} className={`chip ${d.tcmTemp === v ? "on" : ""}`} onClick={() => set("tcmTemp", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Влажность/Сухость</label>
                <div className="chips">{["💧 Отёки, слизь", "🏜 Сухость кожи/глаз", "😓 Избыточная потливость", "🌿 Нормально"].map(v => <div key={v} className={`chip ${d.tcmMoisture === v ? "on" : ""}`} onClick={() => set("tcmMoisture", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Преобладающие эмоции</label>
                <div className="chips">{["😤 Раздражение/Гнев", "😰 Тревога/Суета", "😟 Беспокойство/Мысли", "😢 Печаль/Грусть", "😨 Страх/Неуверенность", "😊 Гармонично"].map(v => <div key={v} className={`chip ${d.tcmEmotion === v ? "on" : ""}`} onClick={() => set("tcmEmotion", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Тяга к вкусу</label>
                <div className="chips">{["🍋 Кислое", "🌶 Горькое", "🍬 Сладкое", "🧂 Острое/Пряное", "🥓 Солёное", "🤷 Всё одинаково"].map(v => <div key={v} className={`chip ${d.tcmTaste === v ? "on" : ""}`} onClick={() => set("tcmTaste", v)}>{v}</div>)}</div>
              </div>
            </>
          )}

          {s.id === "beauty" && (
            <>
              <div className="fld"><label>Тип кожи</label>
                <div className="chips">{["Нормальная", "Сухая", "Жирная", "Комбинированная", "Чувствительная"].map(v => <div key={v} className={`chip ${d.skinType === v ? "on" : ""}`} onClick={() => set("skinType", v)}>{v}</div>)}</div>
              </div>
              {d.gender === "Мужской" ? <>
                <div className="fld"><label>Борода / усы</label>
                  <div className="chips">{["Нет", "Щетина", "Короткая", "Длинная", "Усы"].map(v => <div key={v} className={`chip ${d.beard === v ? "on" : ""}`} onClick={() => set("beard", v)}>{v}</div>)}</div>
                </div>
                <div className="fld"><label>Стрижка</label>
                  <div className="chips">{["Раз в 2–3 нед.", "Раз в месяц", "Раз в 2 мес.", "Стригусь сам"].map(v => <div key={v} className={`chip ${d.haircutFreq === v ? "on" : ""}`} onClick={() => set("haircutFreq", v)}>{v}</div>)}</div>
                </div>
              </> : <>
                <div className="fld"><label>Волосы</label>
                  <div className="chips">{["Нормальные", "Сухие", "Жирные", "Окрашенные", "Вьющиеся"].map(v => <div key={v} className={`chip ${d.hairType === v ? "on" : ""}`} onClick={() => set("hairType", v)}>{v}</div>)}</div>
                </div>
                <div className="fld"><label>Ногти</label>
                  <div className="chips">{["Не делаю", "Раз в 2–3 нед.", "Раз в месяц", "Сама дома"].map(v => <div key={v} className={`chip ${d.nailFreq === v ? "on" : ""}`} onClick={() => set("nailFreq", v)}>{v}</div>)}</div>
                </div>
              </>}
              <div className="fld"><label>Приоритет</label>
                <div className="chips">{["Кожа лица", "Тело", "Волосы", "Всё одинаково"].map(v => <div key={v} className={`chip ${d.beautyPriority === v ? "on" : ""}`} onClick={() => set("beautyPriority", v)}>{v}</div>)}</div>
              </div>
            </>
          )}

          {s.id === "shopping" && (            <>
              <div className="fld"><label>Как часто закупаешься?</label>
                <div className="chips">{["Каждый день", "2–3 раза в неделю", "Раз в неделю", "Раз в 2 недели", "Онлайн"].map(v => <div key={v} className={`chip ${d.shopFreq === v ? "on" : ""}`} onClick={() => set("shopFreq", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Удобный день</label>
                <div className="chips">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(v => <div key={v} className={`chip ${d.shopDay === v ? "on" : ""}`} onClick={() => set("shopDay", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Что всегда дома?</label>
                <div className="chips">{["Яйца", "Крупы", "Молочное", "Фрукты", "Овощи", "Мясо", "Рыба", "Хлеб", "Консервы", "Орехи", "Бобовые", "Зелень"].map(v => <div key={v} className={`chip ${(d.staples || []).includes(v) ? "on" : ""}`} onClick={() => tog("staples", v)}>{v}</div>)}</div>
              </div>
            </>
          )}

          {s.id === "hobbies" && (
            <>
              <div className="fld"><label>Хобби</label>
                <div className="chips">{["Чтение", "Фотография", "Музыка", "Готовка", "Садоводство", "Кино", "Путешествия", "Спорт", "Рисование", "Блогинг", "Языки", "Рукоделие", "Игры", "Туризм"].map(v => <div key={v} className={`chip ${(d.hobbies || []).includes(v) ? "on" : ""}`} onClick={() => tog("hobbies", v)}>{v}</div>)}</div>
              </div>
              <div className="fld"><label>Хобби-проект</label><input placeholder="Освоить гитару, прочитать 12 книг..." value={d.hobbyProject || ""} onChange={e => set("hobbyProject", e.target.value)} /></div>
              <div className="fld"><label>Частота занятий</label>
                <div className="chips">{["Почти никогда", "Раз в месяц", "Раз в неделю", "Несколько раз", "Каждый день"].map(v => <div key={v} className={`chip ${d.hobbyFreq === v ? "on" : ""}`} onClick={() => set("hobbyFreq", v)}>{v}</div>)}</div>
              </div>
            </>
          )}

          {s.id === "travel" && (
            <>
              <div className="fld-hint" style={{marginBottom: 10}}>Добавь куда хочешь поехать — приложение напомнит о подготовке.</div>
              {(d.trips || []).map((trip, i) => (
                <div key={trip.id} style={{ background: "rgba(200,164,90,0.06)", border: "1px solid rgba(200,164,90,0.25)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#c8a45a" }}>ПОЕЗДКА {i + 1}</span>
                    <button className="btn btn-sm" onClick={() => delTrip(trip.id)} style={{padding:"4px 10px", fontSize:13}}>✕</button>
                  </div>
                  <div className="fld"><label>Куда?</label><input placeholder="Стамбул, Бали..." value={trip.destination} onChange={e => updTrip(trip.id, "destination", e.target.value)} /></div>
                  <div className="fld-row">
                    <div className="fld"><label>Дата</label><input type="month" value={trip.targetDate} onChange={e => updTrip(trip.id, "targetDate", e.target.value)} /></div>
                    <div className="fld"><label>Бюджет (₽)</label><input type="number" value={trip.budget} onChange={e => updTrip(trip.id, "budget", e.target.value)} /></div>
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addTrip}>+ Добавить поездку</button>
            </>
          )}

          {s.id === "goals" && (
            <>
              <div className="fld"><label>Главная цель на 3 месяца</label><textarea placeholder="Наладить режим, похудеть на 5 кг..." value={d.mainGoal || ""} onChange={e => set("mainGoal", e.target.value)} style={{resize:"vertical", minHeight:70}} /></div>
              <div className="fld"><label>Сферы прогресса</label>
                <div className="chips">{["Здоровье", "Карьера", "Финансы", "Отношения", "Саморазвитие", "Творчество", "Путешествия", "Духовность", "Семья", "Внешность"].map(v => <div key={v} className={`chip ${(d.goalAreas || []).includes(v) ? "on" : ""}`} onClick={() => tog("goalAreas", v)}>{v}</div>)}</div>              </div>
              <div className="fld"><label>Что сдерживает?</label>
                <div className="chips">{["Нехватка времени", "Нехватка энергии", "Откладываю", "Не знаю с чего начать", "Много отвлекаюсь", "Страх неудачи"].map(v => <div key={v} className={`chip ${(d.goalBlocks || []).includes(v) ? "on" : ""}`} onClick={() => tog("goalBlocks", v)}>{v}</div>)}</div>
              </div>
            </>
          )}

          {s.id === "done" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
              {d.name && <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: "clamp(20px, 4vw, 26px)", color: "#c8a45a", marginBottom: 10 }}>Привет, {d.name.split(" ")[0] || d.name}!</div>}
              <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: "clamp(15px, 2.8vw, 18px)", color: "#5c4a30", lineHeight: 1.8, fontStyle: "italic" }}>
                {d.dob && `${getZodiacInline(d.dob).emoji} ${getZodiacInline(d.dob).name} · 🐾 ${getEasternInline(d.dob)}`}
                {d.fullName && ` · ✦ ${calcDegreeInline(d.fullName)}° судьбы`}
                <br />Life Diary знает тебя и готов держать всё в голове вместо тебя.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ob-foot">
          {step > 0 ? (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Назад</button>
          ) : <div />}
          {step < OB_STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Далее →</button>
          ) : (
            <button className="btn btn-primary" onClick={handleDone}>Открыть Life Diary ✨</button>
          )}
        </div>
      </div>
    </div>
  );
                    }
