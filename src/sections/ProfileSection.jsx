// src/sections/ProfileSection.jsx
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../store/AppContext";

// ─── ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ──────────────────────────────────────────────
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

function MetricCard({ label, value, icon, color = "var(--blue)" }) {
  return (
    <div style={{ 
      padding: 12, background: "rgba(255,255,255,0.7)", borderRadius: 6, 
      border: `1px solid ${color}20`, textAlign: "center"
    }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color }}>{value || "—"}</div>
    </div>  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ─────────────────────────────────────────────────────
export function ProfileSection() {
  const { profile, setProfile } = useApp();
  const [tab, setTab] = useState("overview");
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  // Загрузка движка знаний динамически, чтобы избежать краша при отсутствии файла
  useEffect(() => {
    (async () => {
      try {
        const engine = await import("../utils/knowledgeEngine.js");
        if (profile && engine.getProfileInsights) {
          const data = engine.getProfileInsights(profile);
          setInsights(data || {});
        }
      } catch (e) {
        console.warn("⚠️ knowledgeEngine.js не загружен или содержит ошибки:", e);
        setInsights({}); // Пустой объект, чтобы интерфейс не падал
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  // Дебаг-лог в консоль (удалить в продакшене)
  useEffect(() => {
    console.log("🔍 Profile Debug:", { profile, insights });
  }, [profile, insights]);

  // Состояние загрузки
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text3)", fontFamily: "var(--font-italic)" }}>
        Загрузка профиля...
      </div>
    );
  }

  // Состояние пустого профиля
  if (!profile) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
        <div style={{ fontFamily: "var(--font-head)", fontSize: 18, color: "var(--blue)", marginBottom: 8 }}>
          Профиль не заполнен
        </div>        <div style={{ fontFamily: "var(--font-italic)", fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>
          Пройдите онбординг, чтобы увидеть персональные расчёты
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setProfile(null)} // Сбросит профиль, чтобы открыть онбординг
        >
          Пройти настройку
        </button>
      </div>
    );
  }

  // Безопасное извлечение данных с fallback
  const safe = (v, fallback = "—") => v ?? fallback;
  const zodiac = safe(insights?.zodiac, "Близнецы");
  const eastern = safe(insights?.eastern, "Свинья");
  const degree = safe(insights?.destiny?.degree, 241);
  const destinyText = safe(insights?.destiny?.interpretation, "«Результаты. Жатва и завершение.»");
  const chronotype = safe(profile?.chronotype, "🕊️ Голубь");
  const healthArea = safe(insights?.health?.area, "Плечи, ключицы");
  const healthAdvice = safe(insights?.health?.advice, "Берегите плечи и руки.");
  const moonDay = safe(insights?.moonDay, new Date().getDate());
  const moonRestriction = safe(insights?.moonRestriction?.forbidden, "Тонкий кишечник");
  const meridianName = safe(insights?.meridian?.name, "Сердца");
  const meridianTime = safe(insights?.meridian?.time, "11-13");
  const meridianAdvice = safe(insights?.meridian?.advice, "Социальные контакты, важные решения");
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto", position: "relative" }}>
      
      {/* ─── ШАПКА ─── */}
      <div style={{ 
        background: "linear-gradient(135deg, #fff 0%, #f0f5ff 100%)", 
        borderLeft: "4px solid var(--blue)", 
        borderRadius: 8, padding: 20, marginBottom: 16, position: "relative" 
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", marginBottom: 4 }}>
              {safe(profile.name, "Гость")}
            </div>
            <div style={{ fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
              {safe(profile.fullName, "ФИО не указано")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <span className="badge bg">♊ {zodiac}</span>
              <span className="badge bm">🐗 {eastern}</span>
              {age && <span className="badge bgr">🎂 {age} лет</span>}              <span className="badge bt">{chronotype}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 140 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text3)", letterSpacing: 1.5, marginBottom: 4 }}>
              ГРАДУС СУДЬБЫ
            </div>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 26, color: "var(--gold)", fontWeight: 600 }}>
              {degree}°
            </div>
            <div style={{ fontFamily: "var(--font-italic)", fontSize: 11, color: "var(--text3)", maxWidth: 180, marginTop: 4, lineHeight: 1.4 }}>
              {destinyText}
            </div>
          </div>
        </div>
      </div>

      {/* ─── МЕТРИКИ ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <MetricCard label="СЕЙЧАС АКТИВЕН" value={`${meridianName} (${meridianTime})`} icon="⚡" color="var(--gold)" />
        <MetricCard label="ЛУННЫЙ ДЕНЬ" value={`${moonDay}-й`} icon="🌙" color="var(--success)" />
      </div>

      {/* ─── ТАБЫ ─── */}
      <div className="tabs" style={{ marginBottom: 16 }}>
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

      {/* ─── КОНТЕНТ ─── */}
      {tab === "overview" && (
        <>
          <Accordion title="АСТРОЛОГИЧЕСКИЙ ПОРТРЕТ" icon="♈" accent="blue" defaultOpen>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
              <strong>Стихия:</strong> {safe(insights?.zodiacElement, "Воздух")}<br/>
              <strong>Планета-управитель:</strong> {safe(insights?.rulingPlanet, "Меркурий")}<br/>
              <strong>Сильные стороны:</strong> {safe(insights?.zodiacStrengths, "Коммуникация, адаптивность")}<br/>
              <strong>Слабые зоны:</strong> {safe(insights?.zodiacWeaknesses, "Лёгкие, нервная система")}
            </div>
          </Accordion>
          <Accordion title="ПСИХО-ПРОФИЛЬ & КОММУНИКАЦИЯ" icon="🧠" accent="gold">
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>              <strong>Хронотип:</strong> {chronotype}<br/>
              <strong>Стиль общения:</strong> {safe(insights?.commStyle, "Универсальный")}<br/>
              <strong>Рекомендация:</strong> Заложите +15% буфера на переключение контекста.
            </div>
          </Accordion>
        </>
      )}

      {tab === "health" && (
        <>
          <Accordion title="BODY BLUEPRINT" icon="🫁" accent="success" defaultOpen>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ padding: 12, background: "rgba(232,85,109,0.06)", borderRadius: 6, border: "1px solid rgba(232,85,109,0.15)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(232,85,109,0.8)", letterSpacing: 1.5, marginBottom: 6 }}>⚠️ СЛАБЫЕ ЗОНЫ</div>
                <div style={{ fontSize: 13, color: "var(--text1)" }}>{healthArea}</div>
              </div>
              <div style={{ padding: 12, background: "rgba(45,106,79,0.06)", borderRadius: 6, border: "1px solid rgba(45,106,79,0.15)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(45,106,79,0.8)", letterSpacing: 1.5, marginBottom: 6 }}>💡 РЕКОМЕНДАЦИЯ</div>
                <div style={{ fontSize: 13, color: "var(--text1)", lineHeight: 1.5 }}>{healthAdvice}</div>
              </div>
            </div>
          </Accordion>
          <Accordion title="СЕЗОННЫЕ РЕКОМЕНДАЦИИ" icon="🍂" accent="gold">
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
              <strong>Сезон:</strong> {safe(insights?.season, "Весна")}<br/>
              <strong>Риск:</strong> {safe(insights?.seasonRisk, "Перепады настроения")}<br/>
              <strong>Совет:</strong> {safe(insights?.seasonAdvice, "Растяжка, кислая пища умеренно")}
            </div>
          </Accordion>
        </>
      )}

      {tab === "cycles" && (
        <>
          <Accordion title="ВЕДИЧЕСКИЕ ПЕРИОДЫ (ДАША)" icon="📊" accent="blue" defaultOpen>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
              <strong>Махадаша:</strong> {safe(insights?.mahadasha, "Венера (2020–2040)")}<br/>
              <strong>Антардаша:</strong> {safe(insights?.antardasha, "Меркурий (2024–2027)")}<br/>
              <strong>Характеристика:</strong> {safe(insights?.dashaTrait, "Отношения + Обучение")}
            </div>
          </Accordion>
          <Accordion title="КАРМИЧЕСКИЕ ЗАДАЧИ" icon="🔮" accent="gold">
            <div style={{ padding: 12, background: "rgba(200,164,90,0.04)", borderRadius: 6, fontFamily: "var(--font-italic)", fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
              <p><strong style={{ color: "var(--gold)" }}>🌱 Задача:</strong> {profile.goalAreas ? `Развитие: ${profile.goalAreas.join(", ")}` : "Определите цели в настройках."}</p>
              <p><strong style={{ color: "var(--gold)" }}>🚧 Блоки:</strong> {profile.goalBlocks ? profile.goalBlocks.join(", ") : "Нет данных."}</p>
            </div>
          </Accordion>
        </>
      )}
      {tab === "practices" && (
        <Accordion title="ПЕРСОНАЛЬНЫЕ ПРАКТИКИ" icon="🧘" accent="success" defaultOpen>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { title: "Сам Чон До", time: "5 мин", desc: "Вдох 3с → Выдох 6с", color: "#0070c0" },
              { title: "6 целительных звуков", time: "10 мин", desc: "С-С-С, Ч-У-Э-Й, Ш-Ш-Ш...", color: "#2d6a4f" },
              ...(profile?.stressLevel > 7 ? [{ title: "Рыдающее дыхание", time: "3 мин", desc: "Снятие стресса", color: "#e8556d" }] : []),
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
        </Accordion>
      )}

      {/* ─── КНОПКИ ─── */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
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
