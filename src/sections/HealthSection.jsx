import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";

function Accordion({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion">
      <div className="accordion-header" onClick={() => setOpen(!open)}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span> {title}
        </span>
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: ".2s" }}>▼</span>
      </div>
      <div className={`accordion-content ${open ? "open" : ""}`}>{children}</div>
    </div>
  );
}

export function HealthSection() {
  const { profile } = useApp();
  const insights = getProfileInsights(profile);
  const [tab, setTab] = useState("profile");

  return (
    <div className="page">
      <div className="tabs">
        <button className={`tab ${tab === "profile" ? "on" : ""}`} onClick={() => setTab("profile")}>Профиль</button>
        <button className={`tab ${tab === "meridians" ? "on" : ""}`} onClick={() => setTab("meridians")}>Меридианы</button>
        <button className={`tab ${tab === "practices" ? "on" : ""}`} onClick={() => setTab("practices")}>Практики</button>
      </div>

      {tab === "profile" && (
        <>
          <div className="sec-lbl">◈ BODY BLUEPRINT</div>
          <div className="card" style={{ borderLeft: "3px solid var(--error)" }}>
            <div className="card-title">⚠️ Зоны внимания</div>
            <div style={{ fontSize: 14, color: "var(--text1)", marginTop: 6 }}>{insights.health.area}</div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>{insights.health.organs}</div>
            <div className="ai-box" style={{ marginTop: 12 }}>
              <div className="ai-label">💡 РЕКОМЕНДАЦИЯ</div>
              <div className="ai-text">{insights.health.advice}</div>
            </div>
          </div>

          <Accordion title="🌙 Лунные запреты на сегодня" icon="🌑">
            <div style={{ padding: "8px 0" }}>
              <div style={{ fontSize: 13, color: "var(--text1)" }}>
                Лунный день <strong>{insights.moonDay}</strong> — не рекомендуется локально воздействовать на:
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--error)", marginTop: 6 }}>
                {insights.moonRestriction.forbidden}
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8, fontStyle: "italic" }}>
                Источник: Давыдов М.А. «Восточный Зодиак»
              </div>
            </div>
          </Accordion>
        </>
      )}

      {tab === "meridians" && (
        <div className="card">
          <div className="card-title">🕰 Суточный цикл меридианов</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>
            Сейчас активен меридиан: <strong>{insights.tcmType}</strong>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {["07:00–09:00 🌅 Желудок", "09:00–11:00 🌤 Селезёнка", "11:00–13:00 ☀️ Сердце", "13:00–15:00 🌇 Тонкий кишечник"].map((m, i) => (
              <div key={i} className="badge bg" style={{ justifyContent: "center" }}>{m}</div>
            ))}
          </div>
        </div>
      )}

      {tab === "practices" && (
        <div className="card">
          <div className="card-title">🌬️ Дыхательные практики</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {["Сам Чон До (настроечное)", "6 целительных звуков", "Рыдающее дыхание (при стрессе)", "Настрой Норбекова"].map((p, i) => (
              <div key={i} className="rec-card practice">
                <div className="rec-title">{p}</div>
                <div className="rec-text">5–10 мин • Интегрировано в расписание</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
