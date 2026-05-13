// src/sections/ProfileSection.jsx
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getMoonDay, getCurrentMeridian } from "../utils/knowledgeEngine";

// ─── КОМПОНЕНТ: РАЗВЕРНУТАЯ КАРТОЧКА С ПОЯСНЕНИЯМИ ───
function InsightCard({ title, icon, meaning, whatItMeans, howToUse, color = "blue" }) {
  const styles = {
    blue: { bg: "rgba(0,112,192,0.05)", border: "rgba(0,112,192,0.2)", text: "var(--blue)", accent: "#0070c0" },
    gold: { bg: "rgba(200,164,90,0.05)", border: "rgba(200,164,90,0.2)", text: "var(--gold-dark)", accent: "#c8a45a" },
    success: { bg: "rgba(45,106,79,0.05)", border: "rgba(45,106,79,0.2)", text: "var(--success)", accent: "#2d6a4f" }
  };
  const s = styles[color];

  return (
    <div style={{ 
      background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 8, 
      padding: 16, marginBottom: 16, position: "relative" 
    }}>
      {/* Декоративный уголок Blueprint */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: `2px solid ${s.text}`, borderLeft: `2px solid ${s.text}` }} />
      
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: s.text, margin: 0 }}>{title}</h3>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text1)", marginBottom: 12 }}>
        {meaning}
      </div>

      <div style={{ 
        padding: 12, background: "rgba(255,255,255,0.6)", borderRadius: 6, 
        borderLeft: `3px solid ${s.accent}`, marginBottom: 8 
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: s.text, letterSpacing: 1, marginBottom: 4 }}>
          ◈ ЧТО ЭТО ЗНАЧИТ ДЛЯ ТЕБЯ
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text2)" }}>
          {whatItMeans}
        </div>
      </div>

      {howToUse && (
        <div style={{ 
          padding: 10, background: "rgba(255,255,255,0.4)", borderRadius: 6,
          fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "flex-start", gap: 8 
        }}>
          <span style={{ fontSize: 16 }}>💡</span> 
          <div>            <strong style={{ display: "block", marginBottom: 4, color: s.text }}>Как использовать:</strong>
            {howToUse}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SVG: МЕРИДИАННЫЕ ЧАСЫ (Blueprint стиль) ───
function MeridianClockSVG({ currentHour }) {
  const meridians = [
    { time: "23-01", name: "3 обогревателя", angle: 0 },
    { time: "01-03", name: "Печени", angle: 30 },
    { time: "03-05", name: "Лёгких", angle: 60 },
    { time: "05-07", name: "Т. кишечника", angle: 90 },
    { time: "07-09", name: "Желудка", angle: 120 },
    { time: "09-11", name: "Селезёнки", angle: 150 },
    { time: "11-13", name: "Сердца", angle: 180 },
    { time: "13-15", name: "Т. кишечника", angle: 210 },
    { time: "15-17", name: "М. пузыря", angle: 240 },
    { time: "17-19", name: "Почек", angle: 270 },
    { time: "19-21", name: "Перикарда", angle: 300 },
    { time: "21-23", name: "3 обогревателя", angle: 330 }
  ];

  const currentIndex = Math.floor(((currentHour % 24) + 1) / 2) % 12;

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
      <svg viewBox="0 0 300 300" width="280" height="280" style={{ filter: "drop-shadow(0 2px 8px rgba(0,112,192,0.15))" }}>
        {/* Фоновая сетка */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,112,192,0.05)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <circle cx="150" cy="150" r="140" fill="url(#grid)" stroke="rgba(0,112,192,0.2)" strokeWidth="1.5" />
        
        {/* Концентрические круги */}
        <circle cx="150" cy="150" r="110" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="150" cy="150" r="70" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="1" strokeDasharray="4 4" />
        
        {/* Линии секторов */}
        {meridians.map((m, i) => {
          const rad = (m.angle - 90) * (Math.PI / 180);
          const x = 150 + 135 * Math.cos(rad);
          const y = 150 + 135 * Math.sin(rad);
          return <line key={i} x1="150" y1="150" x2={x} y2={y} stroke="rgba(0,112,192,0.15)" strokeWidth="1" />;
        })}
        {/* Подписи меридианов */}
        {meridians.map((m, i) => {
          const rad = (m.angle - 90) * (Math.PI / 180);
          const x = 150 + 120 * Math.cos(rad);
          const y = 150 + 120 * Math.sin(rad);
          const isActive = i === currentIndex;
          return (
            <g key={i}>
              <text 
                x={x} y={y} textAnchor="middle" dominantBaseline="middle" 
                fontSize={isActive ? "10" : "8"} 
                fill={isActive ? "var(--blue)" : "var(--text3)"} 
                fontFamily="var(--font-mono)"
                fontWeight={isActive ? "600" : "400"}
              >
                {m.name}
              </text>
              <text 
                x={x} y={y + 10} textAnchor="middle" dominantBaseline="middle" 
                fontSize="7" fill={isActive ? "var(--blue)" : "var(--text3)"} 
                fontFamily="var(--font-mono)"
              >
                {m.time}
              </text>
            </g>
          );
        })}

        {/* Указатель текущего времени */}
        <g transform={`rotate(${currentIndex * 30 - 90} 150 150)`}>
          <line x1="150" y1="150" x2="150" y2="30" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="150" cy="30" r="5" fill="var(--gold)" stroke="#fff" strokeWidth="2" />
        </g>
        
        {/* Центр */}
        <circle cx="150" cy="150" r="8" fill="var(--blue)" stroke="#fff" strokeWidth="2" />
        <text x="150" y="165" textAnchor="middle" fontSize="8" fill="var(--text2)" fontFamily="var(--font-mono)" fontWeight="600">
          СЕЙЧАС
        </text>
      </svg>
    </div>
  );
}

// ─── SVG: КОЛЕСО ЖИЗНЕННЫХ ЦИКЛОВ ───
function LifeCycleWheel({ age }) {
  const cycles = [
    { label: "Детство", start: 0, end: 12, color: "rgba(0,112,192,0.2)" },
    { label: "Юность", start: 12, end: 24, color: "rgba(200,164,90,0.2)" },    { label: "Молодость", start: 24, end: 36, color: "rgba(45,106,79,0.2)" },
    { label: "Зрелость", start: 36, end: 48, color: "rgba(139,32,32,0.2)" },
    { label: "Мудрость", start: 48, end: 60, color: "rgba(29,78,107,0.2)" },
    { label: "Долголетие", start: 60, end: 72, color: "rgba(139,32,32,0.15)" }
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
      <svg viewBox="0 0 300 200" width="280" height="200">
        {/* Полоса циклов */}
        {cycles.map((c, i) => {
          const width = ((c.end - c.start) / 72) * 280;
          const x = (c.start / 72) * 280;
          return (
            <rect 
              key={i} x={x} y="80" width={width} height="40" 
              fill={c.color} stroke="rgba(0,112,192,0.3)" strokeWidth="1"
            />
          );
        })}
        
        {/* Подписи */}
        {cycles.map((c, i) => {
          const x = (c.start / 72) * 280 + ((c.end - c.start) / 72) * 140;
          return (
            <text key={i} x={x} y="105" textAnchor="middle" fontSize="9" fill="var(--text2)" fontFamily="var(--font-mono)">
              {c.label}
            </text>
          );
        })}

        {/* Указатель текущего возраста */}
        <line x1={(age / 72) * 280} y1="70" x2={(age / 72) * 280} y2="130" stroke="var(--blue)" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx={(age / 72) * 280} cy="70" r="5" fill="var(--gold)" stroke="#fff" strokeWidth="2" />
        <text x={(age / 72) * 280} y="60" textAnchor="middle" fontSize="10" fill="var(--blue)" fontFamily="var(--font-mono)" fontWeight="600">
          {age} лет
        </text>
      </svg>
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("insights"); // insights | cycles | practices
  
  const insights = getProfileInsights(profile);
  const meridian = getCurrentMeridian();
  const moonDay = getMoonDay();  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const currentHour = new Date().getHours();

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>Загрузка...</div>;

  return (
    <div className="page" style={{ position: "relative" }}>
      
      {/* ФОНОВЫЕ ВОДЯНЫЕ ЗНАКИ */}
      <div style={{ 
        position: "fixed", top: 120, right: 40, width: 200, height: 200, zIndex: 0,
        backgroundImage: `url("image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='80' fill='none' stroke='%230070c0' stroke-width='1'/%3E%3Cpath d='M100 20 L100 180 M20 100 L180 100' stroke='%230070c0' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: "contain", backgroundRepeat: "no-repeat", opacity: 0.05, pointerEvents: "none"
      }} />

      {/* ─── ШАПКА ПРОФИЛЯ ─── */}
      <div className="card" style={{ borderLeft: "4px solid var(--blue)", marginBottom: 16, zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", marginBottom: 4 }}>
              {profile.name}
            </div>
            <div style={{ fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
              {profile.fullName}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <span className="badge bg">♊ {insights.zodiac}</span>
              <span className="badge bm">🐗 {insights.eastern}</span>
              {age && <span className="badge bgr">🎂 {age} лет</span>}
              <span className="badge bt">{profile.chronotype || "🕊️ Голубь"}</span>
            </div>
          </div>
          
          <div style={{ textAlign: "right", minWidth: 140 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text3)", letterSpacing: 1.5, marginBottom: 4 }}>
              ГРАДУС СУДЬБЫ
            </div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 26, color: "var(--gold)", fontWeight: 600 }}>
              {insights.destiny?.degree || 241}°
            </div>
            <div style={{ fontFamily: "var(--font-italic)", fontSize: 11, color: "var(--text3)", maxWidth: 180, marginTop: 4, lineHeight: 1.4 }}>
              {insights.destiny?.interpretation || "Завершение и мудрость"}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ТАБЫ ─── */}
      <div className="tabs" style={{ marginBottom: 16, zIndex: 1 }}>
        {[          { id: "insights", label: "Инсайты" },
          { id: "cycles", label: "Циклы" },
          { id: "practices", label: "Практики" }
        ].map(t => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "on" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── КОНТЕНТ ─── */}
      <div style={{ zIndex: 1 }}>
        
        {/* ВКЛАДКА 1: ИНСАЙТЫ С ПОЯСНЕНИЯМИ */}
        {activeTab === "insights" && (
          <>
            <InsightCard 
              title="Градус Судьбы"
              icon="🧭"
              meaning={`Твой градус ${insights.destiny?.degree || 241}° находится в зоне "${insights.destiny?.interpretation || "Интеграция опыта"}".`}
              whatItMeans="Ты прошла большой путь накопления опыта. Сейчас твоя суперсила — видеть суть вещей, которую другие не замечают. Твоя задача в этом цикле — не создавать новое с нуля, а систематизировать то, что уже есть, и передавать мудрость другим."
              howToUse="Каждое утро спрашивай себя: 'Какой урок я могу извлечь из сегодняшнего дня?' Веди дневник наблюдений — это усилит твою природную способность к анализу."
              color="gold"
            />

            <InsightCard 
              title="Астрологический портрет"
              icon="♈"
              meaning={`${insights.zodiac} (${insights.zodiacElement || "Воздух"}) под управлением ${insights.rulingPlanet || "Меркурия"}.`}
              whatItMeans="Твоя стихия Воздух наделяет тебя быстрой адаптивностью и интеллектом. Ты легко схватываешь информацию, но можешь распыляться. Твои слабые зоны — лёгкие и нервная система — первыми реагируют на стресс."
              howToUse="Планируй важные дела на утро (пик активности Воздуха). Избегай многозадачности — фокусируйся на одном проекте. Ежедневная дыхательная практика (5 мин) укрепит твои слабые зоны."
              color="blue"
            />

            <InsightCard 
              title="Восточный знак"
              icon="🐗"
              meaning={`${insights.eastern} (${insights.easternElement || "Вода"}).`}
              whatItMeans="Свинья наделяет тебя честностью, щедростью и терпимостью. Твоя кармическая задача — научиться говорить 'нет' без чувства вины. Ты склонна брать на себя слишком много, забывая о себе."
              howToUse="Перед тем как согласиться на что-то, сделай паузу на 10 минут. Спроси себя: 'Я действительно хочу это, или делаю из чувства долга?' Практикуй здоровые границы."
              color="success"
            />
          </>
        )}

        {/* ВКЛАДКА 2: ЦИКЛЫ С ВИЗУАЛИЗАЦИЕЙ */}
        {activeTab === "cycles" && (
          <>
            {/* Меридианные часы */}
            <div className="card" style={{ borderLeft: "3px solid var(--blue)" }}>              <div className="card-hd">
                <div className="card-title">⏰ МЕРИДИАННЫЕ ЧАСЫ</div>
                <div className="badge bg">Сейчас: {meridian.time}</div>
              </div>
              <MeridianClockSVG currentHour={currentHour} />
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", textAlign: "center" }}>
                <strong>Активен меридиан {meridian.name}</strong><br/>
                {meridian.advice}<br/><br/>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  В это время энергия Ци концентрируется в этом органе. 
                  {currentHour >= 11 && currentHour < 13 ? " Идеально для принятия важных решений и социальных контактов." : 
                   currentHour >= 15 && currentHour < 17 ? " Время для физической активности и выведения токсинов." : 
                   currentHour >= 21 && currentHour < 23 ? " Подготовка ко сну, отказ от экранов." : ""}
                </span>
              </div>
            </div>

            {/* Лунный цикл */}
            <div className="card" style={{ borderLeft: "3px solid var(--gold)" }}>
              <div className="card-hd">
                <div className="card-title">🌙 ЛУННЫЙ ЦИКЛ</div>
                <div className="badge bm">{moonDay}-й день</div>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Сейчас:</strong> {moonDay > 25 ? "Завершение лунного месяца" : moonDay > 15 ? "Убывающая Луна" : "Растущая Луна"}<br/>
                <strong>Запрет сегодня:</strong> {insights.moonRestriction?.forbidden || "Нет строгих запретов"}<br/>
                <strong>Рекомендация:</strong> {moonDay > 25 ? "Завершай начатое, не начинай нового. Идеально для подведения итогов." : moonDay > 15 ? "Время очищения — физического и ментального. Избавляйся от лишнего." : "Время роста и новых начинаний. Планируй и действуй."}
              </div>
            </div>

            {/* Жизненные циклы */}
            <div className="card" style={{ borderLeft: "3px solid var(--success)" }}>
              <div className="card-hd">
                <div className="card-title">🔄 ЖИЗНЕННЫЕ ЦИКЛЫ</div>
                <div className="badge bgr">{age} лет</div>
              </div>
              <LifeCycleWheel age={age} />
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Текущий этап:</strong> {age >= 36 && age < 48 ? "Зрелость" : age >= 24 && age < 36 ? "Молодость" : "Другой этап"}<br/>
                <strong>Характеристика:</strong> {age >= 36 && age < 48 ? "Пик продуктивности и передачи опыта. Время закрепления достижений и наставничества." : age >= 24 && age < 36 ? "Активное построение карьеры и отношений. Время экспериментов и самоопределения." : "Индивидуальный путь развития."}<br/>
                <strong>Ближайший рубеж:</strong> {age < 42 ? `Кризис середины пути (~42 года) — переоценка ценностей` : age < 48 ? "Переход к этапу мудрости (~48-50 лет)" : "Этап передачи мудрости"}
              </div>
            </div>
          </>
        )}

        {/* ВКЛАДКА 3: ПРАКТИКИ */}
        {activeTab === "practices" && (
          <div className="card">
            <div className="card-title">🧘 Персональные практики</div>            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {[
                { title: "Сам Чон До", time: "5 мин", desc: "Настроечное дыхание: вдох 3с → выдох 6с", color: "#0070c0" },
                { title: "6 целительных звуков", time: "10 мин", desc: "С-С-С, Ч-У-Э-Й, Ш-Ш-Ш...", color: "#2d6a4f" },
                { title: "Настрой Норбекова", time: "7 мин", desc: "Визуализация ОМЗ", color: "#c8a45a" }
              ].map((p, i) => (
                <div key={i} className="card" style={{ cursor: "pointer", borderLeft: `3px solid ${p.color}`, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2, fontStyle: "italic" }}>{p.desc}</div>
                    </div>
                    <span className="badge bg">{p.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* КНОПКИ */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, zIndex: 1 }}>
        <button className="btn btn-primary" style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>
          ✎ РЕДАКТИРОВАТЬ
        </button>
        <button className="btn btn-ghost" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>
          📊 АНАЛИЗ
        </button>
      </div>
    </div>
  );
}
