import { useState, useEffect } from "react";
import { useApp } from "../store/AppContext";

// ─── ВСПОМОГАТЕЛЬНЫЕ ДАННЫЕ И ФУНКЦИИ (заглушки для демо) ───
// В реальном приложении замени на импорт из src/utils/knowledgeEngine.js
const getProfileInsights = (profile) => ({
  zodiac: profile?.dob ? "Близнецы" : "—",
  eastern: "Свинья",
  chronotype: profile?.chronotype || "🕊️ Голубь",
  tcmType: profile?.tcmType || "Вода",
  destiny: { degree: 241, interpretation: "«Результаты. Жатва и завершение.»" },
  health: { area: "Плечи, ключицы, лёгкие", organs: "Нервная система, руки", advice: "Дыши свежим воздухом. Береги плечи и руки." },
  moonRestriction: { forbidden: "Тонкий кишечник" }
});

const getMoonDay = () => Math.floor((new Date() - new Date(2024, 0, 11)) / 86400000 % 29.53) + 1;

const getCurrentMeridian = () => {
  const h = new Date().getHours();
  const meridians = [
    { time: "23-01", name: "3 обогревателя", sign: "Кабан" },
    { time: "01-03", name: "Печени", sign: "Вол" },
    { time: "03-05", name: "Лёгких", sign: "Тигр" },
    { time: "05-07", name: "Толстого кишечника", sign: "Заяц" },
    { time: "07-09", name: "Желудка", sign: "Дракон" },
    { time: "09-11", name: "Селезёнки", sign: "Змея" },
    { time: "11-13", name: "Сердца", sign: "Лошадь" },
    { time: "13-15", name: "Тонкого кишечника", sign: "Овца" },
    { time: "15-17", name: "Мочевого пузыря", sign: "Обезьяна" },
    { time: "17-19", name: "Почек", sign: "Петух" },
    { time: "19-21", name: "Перикарда", sign: "Собака" },
    { time: "21-23", name: "3 обогревателя", sign: "Кабан" }
  ];
  return meridians.find(m => {
    const [start] = m.time.split("-").map(Number);
    return h >= start && h < start + 2;
  }) || meridians[0];
};

// ─── КОМПОНЕНТ АККОРДЕОНА ───
function Accordion({ title, icon, children, defaultOpen = false, accent = "blue" }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = {
    blue: { bg: "rgba(0,112,192,0.05)", border: "rgba(0,112,192,0.2)" },
    gold: { bg: "rgba(200,164,90,0.05)", border: "rgba(200,164,90,0.2)" },
    success: { bg: "rgba(45,106,79,0.05)", border: "rgba(45,106,79,0.2)" }
  };
  const c = colors[accent];

  return (    <div style={{ border: `1.5px solid ${c.border}`, borderRadius: 6, marginBottom: 12, overflow: "hidden", background: "#fff" }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{
          padding: "14px 16px", background: c.bg, cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: 1.5,
          color: accent === "gold" ? "var(--gold-dark)" : accent === "success" ? "var(--success)" : "var(--blue)",
          transition: "background 0.2s"
        }}
        onMouseEnter={(e) => e.target.style.background = accent === "gold" ? "rgba(200,164,90,0.08)" : accent === "success" ? "rgba(45,106,79,0.08)" : "rgba(0,112,192,0.08)"}
        onMouseLeave={(e) => e.target.style.background = c.bg}
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

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile } = useApp();
  const [tab, setTab] = useState("overview");
  const insights = getProfileInsights(profile);
  const meridian = getCurrentMeridian();
  const moonDay = getMoonDay();
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  return (
    <div className="page" style={{ position: "relative" }}>
      {/* Фоновый водяной знак */}
      <div style={{
        position: "fixed", top: 80, right: 40, width: 220, height: 220,
        backgroundImage: `url("/assets/profile-blueprint.png")`, // Подставь свою картинку
        backgroundSize: "contain", backgroundRepeat: "no-repeat",
        opacity: 0.06, mixBlendMode: "multiply", pointerEvents: "none", zIndex: 0
      }} />

      {/* ─── УРОВЕНЬ 1: БАЗОВАЯ ИНФО ─── */}
      <div className="card" style={{ borderLeft: "3px solid var(--blue)", marginBottom: 16, zIndex: 1, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", marginBottom: 4 }}>              {profile?.name || "Гость"}
            </div>
            <div style={{ fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
              {profile?.fullName || "ФИО не указано"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <span className="badge bg">♊ {insights.zodiac}</span>
              <span className="badge bm">🐗 {insights.eastern}</span>
              {age && <span className="badge bgr">🎂 {age} лет</span>}
              <span className="badge bt">{insights.chronotype}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text3)", letterSpacing: 1.5 }}>ГРАДУС СУДЬБЫ</div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 26, color: "var(--gold)", fontWeight: 600 }}>{insights.destiny.degree}°</div>
            <div style={{ fontFamily: "var(--font-italic)", fontSize: 11, color: "var(--text3)", maxWidth: 160, marginTop: 4 }}>
              {insights.destiny.interpretation}
            </div>
          </div>
        </div>
      </div>

      {/* ─── УРОВЕНЬ 2: БЫСТРЫЕ МЕТРИКИ ─── */}
      <div className="g2" style={{ marginBottom: 16, zIndex: 1, position: "relative" }}>
        <div className="card" style={{ borderLeft: "3px solid var(--gold)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text3)", letterSpacing: 1, marginBottom: 6 }}>⚡ СЕЙЧАС АКТИВЕН</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500 }}>
            Меридиан {meridian.name} ({meridian.sign})
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", marginTop: 4 }}>
            Время: {meridian.time}
          </div>
        </div>
        <div className="card" style={{ borderLeft: "3px solid var(--success)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text3)", letterSpacing: 1, marginBottom: 6 }}>🧠 ОКНО ЭНЕРГИИ</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500 }}>
            Пик продуктивности
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", marginTop: 4 }}>
            14:00–17:00 (по {insights.chronotype.split(" ")[0]})
          </div>
        </div>
      </div>

      {/* ─── УРОВЕНЬ 3: ТАБЫ ─── */}
      <div className="tabs" style={{ marginBottom: 16, zIndex: 1, position: "relative" }}>
        {[
          { id: "overview", label: "Обзор" },
          { id: "health", label: "Здоровье" },
          { id: "karma", label: "Карма" },          { id: "cycles", label: "Циклы" }
        ].map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── УРОВЕНЬ 4: КОНТЕНТ ПО ТАБАМ ─── */}
      <div style={{ zIndex: 1, position: "relative" }}>
        
        {tab === "overview" && (
          <>
            <Accordion title="АСТРОЛОГИЧЕСКИЙ ПОРТРЕТ" icon="♈" accent="blue" defaultOpen>
              <div className="g2">
                <div>
                  <div className="sec-lbl" style={{ marginTop: 0 }}>ЗАПАДНЫЙ ЗОДИАК</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                    <strong>Стихия:</strong> Воздух<br/>
                    <strong>Планета:</strong> Меркурий<br/>
                    <strong>Сильные:</strong> Коммуникация, адаптивность<br/>
                    <strong>Слабые:</strong> Лёгкие, нервная система
                  </div>
                </div>
                <div>
                  <div className="sec-lbl" style={{ marginTop: 0 }}>ВОСТОЧНЫЙ ЗНАК</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                    <strong>Стихия года:</strong> Вода<br/>
                    <strong>Характер:</strong> Честность, щедрость<br/>
                    <strong>Кармическая задача:</strong> Научиться говорить «нет»
                  </div>
                </div>
              </div>
            </Accordion>

            <Accordion title="ПСИХО-ПРОФИЛЬ" icon="🧠" accent="gold">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Тип восприятия времени:</strong> Точный (t=1.0)<br/>
                <strong>Временная компетентность:</strong> Созидательно-преобразующий<br/>
                <strong>Рекомендация:</strong> Заложите +15% буфера на переключение контекста
              </div>
            </Accordion>

            <Accordion title="СТИЛЬ КОММУНИКАЦИИ" icon="💬" accent="success">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Тип:</strong> Визуал (65%)<br/>
                <strong>Ухо для переговоров:</strong> Правое (логика)<br/>
                <strong>Слова-крючки:</strong> «Вижу перспективу», «Ясная картина», «С моей точки зрения»
              </div>
            </Accordion>          </>
        )}

        {tab === "health" && (
          <>
            <Accordion title="BODY BLUEPRINT" icon="🫁" accent="success" defaultOpen>
              <div className="g2">
                <div style={{ padding: 12, background: "rgba(232,85,109,0.06)", borderRadius: 6, border: "1px solid rgba(232,85,109,0.15)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(232,85,109,0.8)", letterSpacing: 1.5, marginBottom: 6 }}>⚠️ СЛАБЫЕ ЗОНЫ</div>
                  <div style={{ fontSize: 13, color: "var(--text1)" }}>{insights.health.area}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{insights.health.organs}</div>
                </div>
                <div style={{ padding: 12, background: "rgba(45,106,79,0.06)", borderRadius: 6, border: "1px solid rgba(45,106,79,0.15)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(45,106,79,0.8)", letterSpacing: 1.5, marginBottom: 6 }}>💡 РЕКОМЕНДАЦИЯ</div>
                  <div style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.6 }}>{insights.health.advice}</div>
                </div>
              </div>
            </Accordion>

            <Accordion title="BEAUTY & CYCLES" icon="🌙" accent="gold">
              <div style={{ padding: 12, background: "rgba(200,164,90,0.06)", borderRadius: 6, border: "1px solid rgba(200,164,90,0.15)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--gold-dark)", letterSpacing: 1.5, marginBottom: 6 }}>🌙 ЛУННЫЙ ДЕНЬ {moonDay}</div>
                <div style={{ fontSize: 13, color: "var(--text1)", marginBottom: 6 }}>Сегодня не рекомендуется локально воздействовать на:</div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--error)" }}>{insights.moonRestriction.forbidden}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text3)", marginTop: 8, fontStyle: "italic" }}>
                  Источник: Давыдов М.А. «Восточный Зодиак»
                </div>
              </div>
            </Accordion>

            <Accordion title="TCM & ENERGY" icon="⚡" accent="blue">
              <div className="g2">
                <div>
                  <div className="sec-lbl" style={{ marginTop: 0 }}>ХРОНОТИП</div>
                  <div style={{ fontSize: 14, color: "var(--text1)" }}>{insights.chronotype}</div>
                </div>
                <div>
                  <div className="sec-lbl" style={{ marginTop: 0 }}>КОНСТИТУЦИЯ</div>
                  <div style={{ fontSize: 14, color: "var(--text1)" }}>{insights.tcmType}</div>
                </div>
              </div>
            </Accordion>
          </>
        )}

        {tab === "karma" && (
          <Accordion title="KARMIC TASKS" icon="🔮" accent="gold" defaultOpen>
            <div style={{ padding: 12, background: "rgba(200,164,90,0.04)", borderRadius: 6, fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
              <p style={{ marginBottom: 8 }}>
                <strong style={{ color: "var(--gold)" }}>🌱 Задача жизни:</strong>{" "}                {profile?.goalAreas ? `Развитие в сферах: ${profile.goalAreas.join(", ")}` : "Определите цели в настройках."}
              </p>
              <p>
                <strong style={{ color: "var(--gold)" }}>🚧 Блок:</strong>{" "}
                {profile?.goalBlocks ? profile.goalBlocks.join(", ") : "Нет данных."}
              </p>
              <p style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <strong>Кармические узлы:</strong> Северный узел в Рыбах → Развитие интуиции, служение другим. Южный узел в Деве → Отпускать контроль, доверять потоку.
              </p>
            </div>
          </Accordion>
        )}

        {tab === "cycles" && (
          <>
            <Accordion title="LIFE CYCLES (ДАША)" icon="📊" accent="blue" defaultOpen>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Текущая Махадаша:</strong> Венера (2020–2040)<br/>
                <strong>Антардаша:</strong> Меркурий (2024–2027)<br/>
                <strong>Характеристика:</strong> Отношения + Обучение + Коммуникация<br/><br/>
                <div style={{ padding: 12, background: "rgba(0,112,192,0.05)", borderRadius: 6, border: "1px solid rgba(0,112,192,0.15)" }}>
                  <strong>Ключевые даты:</strong><br/>
                  • Возвращение Сатурна: ~29 лет (пройдено)<br/>
                  • Кризис середины: 40–42 года (⚠️ сейчас)<br/>
                  • Следующий этап: 56 лет (мудрость)
                </div>
              </div>
            </Accordion>

            <Accordion title="СЕЗОННЫЕ РЕКОМЕНДАЦИИ" icon="🍂" accent="success">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Текущий сезон:</strong> Весна (Дерево)<br/>
                <strong>Активный меридиан:</strong> Печень / Желчный пузырь<br/>
                <strong>Риск:</strong> Перепады настроения, спазмы, аллергии<br/>
                <strong>Рекомендация:</strong> Кислая пища умеренно, растяжка, ранний подъём
              </div>
            </Accordion>
          </>
        )}
      </div>

      {/* CTA КНОПКИ */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, zIndex: 1, position: "relative" }}>
        <button className="btn btn-primary" style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>
          ✎ РЕДАКТИРОВАТЬ
        </button>
        <button className="btn btn-ghost" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>
          📊 АНАЛИЗ
        </button>
      </div>    </div>
  );
}
