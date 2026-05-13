// src/sections/HealthSection.jsx
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getMoonDay, getCurrentMeridian, getCurrentSeason } from "../utils/knowledgeEngine";

// ─── ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ: АККОРДЕОН ───
function Accordion({ title, icon, children, defaultOpen = false, accent = "blue" }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    blue: { bg: "rgba(0,112,192,0.05)", border: "rgba(0,112,192,0.2)", text: "var(--blue)" },
    gold: { bg: "rgba(200,164,90,0.05)", border: "rgba(200,164,90,0.2)", text: "var(--gold-dark)" },
    success: { bg: "rgba(45,106,79,0.05)", border: "rgba(45,106,79,0.2)", text: "var(--success)" }
  };
  const c = colors[accent] || colors.blue;

  return (
    <div style={{ border: `1.5px solid ${c.border}`, borderRadius: 6, marginBottom: 12, overflow: "hidden", background: "#fff" }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          padding: "14px 16px", background: c.bg, cursor: "pointer", 
          display: "flex", justifyContent: "space-between", alignItems: "center", 
          fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: 1.5, 
          color: c.text, transition: "background 0.2s" 
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = accent === "gold" ? "rgba(200,164,90,0.08)" : accent === "success" ? "rgba(45,106,79,0.08)" : "rgba(0,112,192,0.08)"}
        onMouseLeave={(e) => e.currentTarget.style.background = c.bg}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span>{title}</span>
        </div>
        <div style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0)", color: "var(--gold)" }}>▼</div>
      </div>
      <div style={{ maxHeight: open ? "1000px" : "0", overflow: "hidden", transition: "max-height 0.4s ease" }}>
        <div style={{ padding: "16px", borderTop: `1px solid ${c.border}` }}>{children}</div>
      </div>
    </div>
  );
}

// ─── ВИЗУАЛИЗАЦИЯ: МЕРИДИАННЫЕ ЧАСЫ (Blueprint SVG) ───
function MeridianClockSVG({ currentMeridian }) {
  const hours = new Date().getHours();
  const angle = (hours * 30) - 90; // 0° = 12 o'clock, shifted to start from 23-01
  
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
      <svg viewBox="0 0 200 200" width="180" height="180" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.05))" }}>
        {/* Сетка */}        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="1" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="1" strokeDasharray="4 4" />
        
        {/* Метки часов */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30) - 90;
          const rad = a * (Math.PI / 180);
          const x1 = 100 + 85 * Math.cos(rad);
          const y1 = 100 + 85 * Math.sin(rad);
          const x2 = 100 + 75 * Math.cos(rad);
          const y2 = 100 + 75 * Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,112,192,0.3)" strokeWidth="1.5" />;
        })}

        {/* Подписи меридианов (упрощённо) */}
        {["Желч.","Печень","Лёгкие","Т.К.","Желудок","Селёз","Сердце","Т.Кш","М.П.","Почки","Перик","3Обг"].map((label, i) => {
          const a = (i * 30) - 90 + 15;
          const rad = a * (Math.PI / 180);
          const x = 100 + 55 * Math.cos(rad);
          const y = 100 + 55 * Math.sin(rad);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="var(--text3)" fontFamily="var(--font-mono)">
              {label}
            </text>
          );
        })}

        {/* Указатель текущего времени */}
        <g transform={`rotate(${angle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="25" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="100" cy="25" r="4" fill="var(--gold)" stroke="#fff" strokeWidth="2" />
        </g>
        
        {/* Центр */}
        <circle cx="100" cy="100" r="6" fill="var(--blue)" />
        <text x="100" y="118" textAnchor="middle" fontSize="8" fill="var(--text2)" fontFamily="var(--font-mono)" fontWeight="600">
          {currentMeridian?.name || "Сердца"}
        </text>
      </svg>
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function HealthSection() {
  const { profile } = useApp();
  const [tab, setTab] = useState("profile");

  // Подключение к новому движку
  const insights = getProfileInsights(profile) || {};  const moonDay = getMoonDay() || 1;
  const meridian = getCurrentMeridian() || { name: "Сердца", sign: "Лошадь", time: "11-13", advice: "Социальные контакты, важные решения, обед" };
  const season = getCurrentSeason() || "Весна (Дерево)";

  // Данные для вкладок
  const practices = [
    { id: 1, title: "Сам Чон До (настроечное)", time: "5 мин", desc: "Вдох 3с → Выдох 6с. База для всех техник системы.", type: "breathing" },
    { id: 2, title: "6 целительных звуков", time: "10 мин", desc: "С-С-С (лёгкие), Ч-У-Э-Й (почки), Ш-Ш-Ш (печень)...", type: "sound" },
    ...(profile?.stressLevel > 7 ? [{ id: 3, title: "Рыдающее дыхание (Вилунас)", time: "3 мин", desc: "Снятие острого стресса. Вдох ртом → выдох «с-с-с».", type: "stress" }] : []),
    { id: 4, title: "Настрой Норбекова + ОМЗ", time: "7 мин", desc: "Визуализация Образа Молодости и Здоровья.", type: "visualization" }
  ];

  const moonRestrictions = {
    1: "Мизинец руки, большой палец ноги, кончик носа",
    4: "Поясница, врата желудка",
    11: "Грудной отдел позвоночника",
    15: "Поджелудочная, диафрагма",
    21: "Печень, желчный пузырь",
    25: "Уши, висок",
    28: "Глаза, голова, мозг, стопы"
  };
  const restriction = moonRestrictions[moonDay] || moonRestrictions[moonDay % 10] || "Локальные зоны тела";

  return (
    <div className="page" style={{ position: "relative" }}>
      {/* Фоновый водяной знак */}
      <div style={{ 
        position: "fixed", top: 120, right: 30, width: 200, height: 200, 
        opacity: 0.06, mixBlendMode: "multiply", pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='80' fill='none' stroke='%230070c0' stroke-width='1'/%3E%3Cpath d='M100 20 L100 180 M20 100 L180 100' stroke='%230070c0' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: "contain", backgroundRepeat: "no-repeat"
      }} />

      {/* ─── НАВИГАЦИЯ ПО ТАБАМ ─── */}
      <div className="tabs" style={{ marginBottom: 16, zIndex: 1 }}>
        {[
          { id: "profile", label: "Профиль" },
          { id: "timing", label: "Ритмы" },
          { id: "practices", label: "Практики" },
          { id: "tcm", label: "ТКМ & Сон" }
        ].map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── КОНТЕНТ ПО ТАБАМ ─── */}
      <div style={{ zIndex: 1 }}>
                {/* === ВКЛАДКА: ПРОФИЛЬ ЗДОРОВЬЯ === */}
        {tab === "profile" && (
          <>
            <Accordion title="BODY BLUEPRINT" icon="🫁" accent="success" defaultOpen>
              <div className="g2">
                <div style={{ padding: 12, background: "rgba(232,85,109,0.06)", borderRadius: 6, border: "1px solid rgba(232,85,109,0.15)" }}>
                  <div className="sec-lbl" style={{ marginTop: 0, fontSize: 8 }}>⚠️ СЛАБЫЕ ЗОНЫ</div>
                  <div style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.5 }}>{insights.health?.area || "Плечи, ключицы, лёгкие"}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4, fontStyle: "italic" }}>{insights.health?.organs || "Нервная система, руки"}</div>
                </div>
                <div style={{ padding: 12, background: "rgba(45,106,79,0.06)", borderRadius: 6, border: "1px solid rgba(45,106,79,0.15)" }}>
                  <div className="sec-lbl" style={{ marginTop: 0, fontSize: 8 }}>💡 РЕКОМЕНДАЦИЯ</div>
                  <div style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.5 }}>{insights.health?.advice || "Дыши свежим воздухом. Береги плечи и руки."}</div>
                </div>
              </div>
            </Accordion>

            <Accordion title="СЕЗОННЫЕ РИСКИ" icon="🍂" accent="gold">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Текущий сезон:</strong> {season}<br/>
                <strong>Влияние:</strong> {season.includes("Весна") ? "Активизация печени, перепады настроения, аллергии." : season.includes("Лето") ? "Нагрузка на сердце, обезвоживание, бессонница." : season.includes("Осень") ? "Ослабление лёгких, сухость кожи, меланхолия." : "Нагрузка на почки, застой лимфы, утомляемость."}<br/>
                <strong>Совет:</strong> {season.includes("Весна") ? "Растяжка, кислая пища умеренно, ранний подъём." : season.includes("Лето") ? "Лёгкая пища, прохлада, отдых в полдень." : season.includes("Осень") ? "Дыхательные практики, увлажнение, тёплые напитки." : "Тёплая еда, ножные ванночки, ранний отбой."}
              </div>
            </Accordion>

            <Accordion title="СТИЛЬ ЖИЗНИ & КОММУНИКАЦИЯ" icon="🧠" accent="blue">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Тип общения:</strong> {insights.commStyle || "Универсальный"}<br/>
                <strong>Энергетика:</strong> {profile?.stressLevel > 7 ? "Высокий стресс. Требуется сброс напряжения перед общением." : "Стабильный фон. Открытость к контактам."}<br/>
                <strong>Ритуал:</strong> 5 мин тишины перед важными встречами восстанавливает ясность.
              </div>
            </Accordion>
          </>
        )}

        {/* === ВКЛАДКА: РИТМЫ & ЗАПРЕТЫ === */}
        {tab === "timing" && (
          <>
            <div className="card" style={{ borderLeft: "3px solid var(--gold)", marginBottom: 16 }}>
              <div className="card-hd">
                <div className="card-title">🌙 ЛУННЫЙ ДЕНЬ {moonDay}</div>
                <div className="badge bm">Запрет локального воздействия</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>
                Сегодня не рекомендуется проводить процедуры на: <br/>
                <strong style={{ color: "var(--error)", fontSize: 14 }}>{restriction}</strong>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}>
                Источник: Давыдов М.А. «Лунный календарь»
              </div>            </div>

            <Accordion title="МЕРИДИАННЫЕ ЧАСЫ" icon="⏰" accent="blue" defaultOpen>
              <MeridianClockSVG currentMeridian={meridian} />
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--text2)" }}>
                <strong>Активен:</strong> Меридиан {meridian.name} ({meridian.sign})<br/>
                <strong>Время:</strong> {meridian.time}<br/>
                <strong>Совет:</strong> {meridian.advice}
              </div>
            </Accordion>

            <Accordion title="САНЬ ША & КОНФЛИКТЫ" icon="⚠️" accent="success">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Азимут риска:</strong> Зависит от текущего месяца. Избегайте начала важных дел в направлении конфликта.<br/>
                <strong>Дни-разделители:</strong> В дни равноденствий и солнцестояний энергия Ци слаба. Отложите сложные процедуры.<br/>
                <strong>Правило:</strong> Если нет альтернативы, выберите час с благоприятной звездой (Зелёный Дракон, Золотой Замок).
              </div>
            </Accordion>
          </>
        )}

        {/* === ВКЛАДКА: ПРАКТИКИ === */}
        {tab === "practices" && (
          <Accordion title="ПЕРСОНАЛЬНЫЕ ПРАКТИКИ" icon="🧘" accent="success" defaultOpen>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {practices.map(p => (
                <div key={p.id} className="card" style={{ cursor: "pointer", borderLeft: `3px solid ${p.type === "stress" ? "var(--error)" : p.type === "sound" ? "var(--success)" : "var(--blue)"}`, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500, color: "var(--text1)" }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2, fontStyle: "italic" }}>{p.desc}</div>
                    </div>
                    <span className="badge bg">{p.time}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="ai-box" style={{ marginTop: 12 }}>
              <div className="ai-label">◈ ВАЖНО</div>
              <div className="ai-text">
                Перед практиками проветрите помещение. Последовательность звуков строгая: начинать всегда с лёгких. Дыхание по Норбекову НЕ направлять в область сердца и головного мозга.
              </div>
            </div>
          </Accordion>
        )}

        {/* === ВКЛАДКА: ТКМ & СОН === */}
        {tab === "tcm" && (
          <>            <Accordion title="ЭНЕРГЕТИЧЕСКОЕ УРАВНЕНИЕ" icon="⚡" accent="blue" defaultOpen>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Формула:</strong> E = П − С (Энергия = Пик − Сопротивление)<br/>
                <strong>Ваш уровень:</strong> {profile?.stressLevel > 6 ? "Снижен (высокое сопротивление/стресс)" : profile?.stressLevel > 3 ? "Средний" : "Высокий (поток)"}<br/>
                <strong>Коррекция:</strong> Увеличьте пиковую энергию (сон, питание, движение) ИЛИ снизьте сопротивление (дыхание, медитация, отказ от лишних обязательств).
              </div>
            </Accordion>

            <Accordion title="ГИГИЕНА СНА & ПИТАНИЯ" icon="🌙" accent="gold">
              <div className="g2">
                <div style={{ padding: 12, background: "rgba(0,112,192,0.04)", borderRadius: 6 }}>
                  <div className="sec-lbl" style={{ marginTop: 0, fontSize: 8 }}>🛏 СОН</div>
                  <div style={{ fontSize: 13, color: "var(--text1)" }}>
                    {profile?.chronotype?.includes("Сова") ? "Ложитесь до 01:00. Пик восстановления: 09:00–11:00." : 
                     profile?.chronotype?.includes("Жаворонок") ? "Ложитесь до 23:00. Пик восстановления: 05:00–07:00." : 
                     "Оптимальный отбой: 23:30. Фаза глубокого сна критична для детокса печени (01:00–03:00)."}
                  </div>
                </div>
                <div style={{ padding: 12, background: "rgba(200,164,90,0.04)", borderRadius: 6 }}>
                  <div className="sec-lbl" style={{ marginTop: 0, fontSize: 8 }}>🥗 ПИТАНИЕ</div>
                  <div style={{ fontSize: 13, color: "var(--text1)" }}>
                    {season.includes("Весна") ? "Зелёные овощи, кислый вкус умеренно. Избегайте тяжёлого мяса." : 
                     season.includes("Лето") ? "Лёгкие супы, горький вкус (руккола, цикорий). Больше воды." : 
                     season.includes("Осень") ? "Корнеплоды, острый вкус (имбирь, чеснок). Тёплая пища." : 
                     "Чёрные бобы, солёный вкус умеренно. Костные бульоны, тёплое питьё."}
                  </div>
                </div>
              </div>
            </Accordion>
          </>
        )}
      </div>
    </div>
  );
}
