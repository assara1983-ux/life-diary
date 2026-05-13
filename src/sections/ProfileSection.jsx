// src/sections/ProfileSection.jsx
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getMoonDay, getCurrentMeridian } from "../utils/knowledgeEngine";

// ─── ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ: АККОРДЕОН ───
function Accordion({ title, icon, children, defaultOpen = false, accent = "blue" }) {
  const [open, setOpen] = useState(defaultOpen);
  
  const colors = {
    blue: { bg: "rgba(0,112,192,0.05)", border: "rgba(0,112,192,0.2)" },
    gold: { bg: "rgba(200,164,90,0.05)", border: "rgba(200,164,90,0.2)" },
    success: { bg: "rgba(45,106,79,0.05)", border: "rgba(45,106,79,0.2)" }
  };
  
  const c = colors[accent] || colors.blue;
  const textColor = accent === "gold" ? "var(--gold-dark)" : accent === "success" ? "var(--success)" : "var(--blue)";

  return (
    <div style={{ border: `1.5px solid ${c.border}`, borderRadius: 6, marginBottom: 12, overflow: "hidden", background: "#fff" }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ 
          padding: "14px 16px", background: c.bg, cursor: "pointer", 
          display: "flex", justifyContent: "space-between", alignItems: "center", 
          fontFamily: "var(--font-head)", fontSize: 12, letterSpacing: 1.5, 
          color: textColor, transition: "background 0.2s" 
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
        <div style={{ padding: "16px", borderTop: `1px solid ${c.border}` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile } = useApp();  const [tab, setTab] = useState("overview");

  // Динамические данные из Базы Знаний
  const insights = getProfileInsights(profile) || {};
  const moonDay = getMoonDay() || 1;
  const meridian = getCurrentMeridian() || { name: "Сердца", sign: "Лошадь", time: "11-13" };
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontFamily: "var(--font-italic)" }}>Загрузка профиля...</div>;

  return (
    <div className="page" style={{ position: "relative" }}>
      {/* Фоновый водяной знак (Blueprint) */}
      <div style={{ 
        position: "fixed", top: 100, right: 40, width: 220, height: 220, 
        opacity: 0.06, mixBlendMode: "multiply", pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='80' fill='none' stroke='%230070c0' stroke-width='1'/%3E%3Cpath d='M100 20 L100 180 M20 100 L180 100' stroke='%230070c0' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: "contain", backgroundRepeat: "no-repeat"
      }} />

      {/* ─── 1. ШАПКА: БАЗОВАЯ ИНФО ─── */}
      <div className="card" style={{ borderLeft: "3px solid var(--blue)", marginBottom: 16, zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", marginBottom: 4 }}>
              {profile.name || "Гость"}
            </div>
            <div style={{ fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
              {profile.fullName || "ФИО не указано"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <span className="badge bg">♊ {insights.zodiac || "Близнецы"}</span>
              <span className="badge bm">🐗 {insights.eastern || "Свинья"}</span>
              {age && <span className="badge bgr">🎂 {age} лет</span>}
              <span className="badge bt">{insights.chronotype || "🕊️ Голубь"}</span>
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
              {insights.destiny?.interpretation || "«Результаты. Жатва и завершение.»"}
            </div>
          </div>
        </div>      </div>

      {/* ─── 2. БЫСТРЫЕ МЕТРИКИ (DASHBOARD) ─── */}
      <div className="g2" style={{ marginBottom: 16, zIndex: 1 }}>
        <div className="card" style={{ borderLeft: "3px solid var(--gold)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text3)", letterSpacing: 1, marginBottom: 6 }}>
            ⚡ СЕЙЧАС АКТИВЕН
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500 }}>
            Меридиан {meridian.name} ({meridian.sign})
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", marginTop: 4 }}>
            Время: {meridian.time}
          </div>
        </div>
        
        <div className="card" style={{ borderLeft: "3px solid var(--success)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text3)", letterSpacing: 1, marginBottom: 6 }}>
            🌙 ЛУННЫЙ ДЕНЬ
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500 }}>
            День {moonDay}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", marginTop: 4 }}>
            Запрет: {insights.moonRestriction?.forbidden || "Тонкий кишечник"}
          </div>
        </div>
      </div>

      {/* ─── 3. НАВИГАЦИЯ ПО ТАБАМ ─── */}
      <div className="tabs" style={{ marginBottom: 16, zIndex: 1 }}>
        {[
          { id: "overview", label: "Обзор" },
          { id: "health", label: "Здоровье" },
          { id: "cycles", label: "Циклы & Карма" },
          { id: "practices", label: "Практики" }
        ].map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 4. КОНТЕНТ ПО ТАБАМ ─── */}
      <div style={{ zIndex: 1 }}>
        
        {/* === ВКЛАДКА: ОБЗОР === */}
        {tab === "overview" && (
          <>
            <Accordion title="АСТРОЛОГИЧЕСКИЙ ПОРТРЕТ" icon="♈" accent="blue" defaultOpen>              <div className="g2">
                <div>
                  <div className="sec-lbl" style={{ marginTop: 0 }}>ЗАПАДНЫЙ ЗОДИАК</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                    <strong>Стихия:</strong> {insights.zodiacElement || "Воздух"}<br/>
                    <strong>Планета-управитель:</strong> {insights.rulingPlanet || "Меркурий"}<br/>
                    <strong>Сильные стороны:</strong> {insights.zodiacStrengths || "Коммуникация, адаптивность"}<br/>
                    <strong>Слабые зоны:</strong> {insights.zodiacWeaknesses || "Лёгкие, нервная система"}
                  </div>
                </div>
                <div>
                  <div className="sec-lbl" style={{ marginTop: 0 }}>ВОСТОЧНЫЙ ЗНАК</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                    <strong>Стихия года:</strong> {insights.easternElement || "Вода"}<br/>
                    <strong>Характер:</strong> {insights.easternTraits || "Честность, щедрость"}<br/>
                    <strong>Кармическая задача:</strong> {insights.easternKarma || "Научиться говорить «нет» без чувства вины"}
                  </div>
                </div>
              </div>
            </Accordion>

            <Accordion title="ПСИХО-ПРОФИЛЬ & КОММУНИКАЦИЯ" icon="🧠" accent="gold">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Тип восприятия времени:</strong> {insights.timeType || "Точный (t=1.0)"}<br/>
                <strong>Временная компетентность:</strong> {insights.temporalLevel || "Созидательно-преобразующий"}<br/>
                <strong>Стиль общения:</strong> {insights.commStyle || "Визуал (65%)"}<br/>
                <strong>Рекомендация:</strong> Заложите +15% буфера на переключение контекста. Используйте слова-крючки: «Вижу перспективу», «Ясная картина».
              </div>
            </Accordion>

            <Accordion title="ЖИЗНЕННЫЕ СФЕРЫ (КОЛЕСО БАЛАНСА)" icon="🎡" accent="success">
              <div style={{ fontSize: 13, color: "var(--text2)" }}>
                Оценка 8 сфер: 
                <span className="badge bg" style={{ margin: "0 4px" }}>Здоровье 7/10</span>
                <span className="badge bm" style={{ margin: "0 4px" }}>Карьера 5/10</span>
                <span className="badge bw" style={{ margin: "0 4px" }}>Отдых 3/10 ⚠️</span>
                <p style={{ marginTop: 8, fontStyle: "italic" }}>
                  Рекомендация: Сфокусируйтесь на отстающих сферах. 1 микро-действие в неделю по каждой. Регулярность важнее интенсивности.
                </p>
              </div>
            </Accordion>
          </>
        )}

        {/* === ВКЛАДКА: ЗДОРОВЬЕ === */}
        {tab === "health" && (
          <>
            <Accordion title="BODY BLUEPRINT" icon="🫁" accent="success" defaultOpen>
              <div className="g2">
                <div style={{ padding: 12, background: "rgba(232,85,109,0.06)", borderRadius: 6, border: "1px solid rgba(232,85,109,0.15)" }}>                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(232,85,109,0.8)", letterSpacing: 1.5, marginBottom: 6 }}>⚠️ СЛАБЫЕ ЗОНЫ</div>
                  <div style={{ fontSize: 13, color: "var(--text1)" }}>{insights.health?.area || "Плечи, ключицы, лёгкие"}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{insights.health?.organs || "Нервная система, руки"}</div>
                </div>
                <div style={{ padding: 12, background: "rgba(45,106,79,0.06)", borderRadius: 6, border: "1px solid rgba(45,106,79,0.15)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(45,106,79,0.8)", letterSpacing: 1.5, marginBottom: 6 }}>💡 РЕКОМЕНДАЦИЯ</div>
                  <div style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.6 }}>{insights.health?.advice || "Дыши свежим воздухом. Береги плечи и руки. Избегай переохлаждения горла."}</div>
                </div>
              </div>
            </Accordion>

            <Accordion title="ТЕКУЩИЙ ЛУННЫЙ ЦИКЛ" icon="🌙" accent="blue">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Фаза:</strong> {insights.moonPhase || "Растущая"}<br/>
                <strong>Запрет на сегодня:</strong> {insights.moonRestriction?.forbidden || "Тонкий кишечник"}<br/>
                <strong>Благоприятно для:</strong> {insights.moonFavorable || "Планирование, начало курсов, работа с информацией"}<br/>
                <p style={{ marginTop: 6, fontStyle: "italic", color: "var(--text3)" }}>Источник: Давыдов М.А. «Восточный Зодиак»</p>
              </div>
            </Accordion>

            <Accordion title="СЕЗОННЫЕ РЕКОМЕНДАЦИИ ТКМ" icon="🍂" accent="gold">
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Текущий сезон:</strong> {insights.season || "Весна (Дерево)"}<br/>
                <strong>Активный меридиан:</strong> {insights.seasonMeridian || "Печень / Желчный пузырь"}<br/>
                <strong>Риск:</strong> {insights.seasonRisk || "Перепады настроения, спазмы, аллергии"}<br/>
                <strong>Совет:</strong> {insights.seasonAdvice || "Кислая пища умеренно, растяжка, ранний подъём, избегай гнева"}
              </div>
            </Accordion>
          </>
        )}

        {/* === ВКЛАДКА: ЦИКЛЫ & КАРМА === */}
        {tab === "cycles" && (
          <>
            <Accordion title="ВЕДИЧЕСКИЕ ПЕРИОДЫ (ДАША)" icon="📊" accent="blue" defaultOpen>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                <strong>Махадаша:</strong> {insights.mahadasha || "Венера (2020–2040)"}<br/>
                <strong>Антардаша:</strong> {insights.antardasha || "Меркурий (2024–2027)"}<br/>
                <strong>Характеристика:</strong> {insights.dashaTrait || "Отношения + Обучение + Коммуникация"}<br/>
                <div style={{ marginTop: 8, padding: 10, background: "rgba(0,112,192,0.05)", borderRadius: 6, border: "1px solid rgba(0,112,192,0.15)" }}>
                  <strong>Ключевые даты:</strong><br/>
                  • Возврат Сатурна: ~29 лет (пройдено)<br/>
                  • Кризис середины: 40–42 года (⚠️ сейчас)<br/>
                  • Следующий этап: 56 лет (мудрость, передача опыта)
                </div>
              </div>
            </Accordion>

            <Accordion title="КАРМИЧЕСКИЕ ЗАДАЧИ" icon="🔮" accent="gold">
              <div style={{ padding: 12, background: "rgba(200,164,90,0.04)", borderRadius: 6, fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>                <p style={{ marginBottom: 8 }}>
                  <strong style={{ color: "var(--gold)" }}>🌱 Задача жизни:</strong> {profile.goalAreas ? `Развитие в сферах: ${profile.goalAreas.join(", ")}` : "Определите цели в настройках."}
                </p>
                <p>
                  <strong style={{ color: "var(--gold)" }}>🚧 Блоки:</strong> {profile.goalBlocks ? profile.goalBlocks.join(", ") : "Нет данных."}
                </p>
                <p style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <strong>Лунные узлы:</strong> Северный в Рыбах → Развитие интуиции, служение. Южный в Деве → Отпускать контроль, доверять потоку.
                </p>
              </div>
            </Accordion>
          </>
        )}

        {/* === ВКЛАДКА: ПРАКТИКИ === */}
        {tab === "practices" && (
          <Accordion title="ПЕРСОНАЛИЗИРОВАННЫЕ ПРАКТИКИ" icon="🧘" accent="success" defaultOpen>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { title: "Сам Чон До (настроечное)", time: "5 мин", desc: "Вдох 3с → Выдох 6с. База для всех техник системы.", color: "#0070c0" },
                { title: "6 целительных звуков", time: "10 мин", desc: "С-С-С (лёгкие), Ч-У-Э-Й (почки), Ш-Ш-Ш (печень)...", color: "#2d6a4f" },
                ...(profile?.stressLevel > 7 ? [{ title: "Рыдающее дыхание (Вилунас)", time: "3 мин", desc: "Снятие острого стресса. Вдох ртом → выдох «с-с-с».", color: "#e8556d" }] : []),
                { title: "Настрой Норбекова + ОМЗ", time: "7 мин", desc: "Визуализация Образа Молодости и Здоровья. Включение внутренних резервов.", color: "#c8a45a" }
              ].map((p, i) => (
                <div key={i} className="card" style={{ cursor: "pointer", borderLeft: `3px solid ${p.color}`, padding: "12px 16px" }}>
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
                Перед практиками проветрите помещение. Дыхание по Норбекову НЕ направлять в область сердца и головного мозга. Последовательность звуков строгая: начинать всегда с лёгких.
              </div>
            </div>
          </Accordion>
        )}
      </div>

      {/* ─── 5. КНОПКИ ДЕЙСТВИЙ ─── */}
      <div style={{ display: "flex", gap: 10, marginTop: 20, zIndex: 1 }}>
        <button className="btn btn-primary" style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>
          ✎ РЕДАКТИРОВАТЬ        </button>
        <button className="btn btn-ghost" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1 }}>
          📊 АНАЛИЗ
        </button>
      </div>
    </div>
  );
}
