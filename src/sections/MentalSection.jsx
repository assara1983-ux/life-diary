import { useState, useEffect } from "react";
import { useApp } from "../store/AppContext";

export function MentalSection() {
  const { profile } = useApp();
  const [active, setActive] = useState(null);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let interval;
    if (running) interval = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  const practices = [
    { id: 1, title: "Сам Чон До", duration: 5, color: "#0070c0", desc: "Настроечное дыхание: вдох 3с → выдох 6с" },
    { id: 2, title: "6 целительных звуков", duration: 10, color: "#2d6a4f", desc: "С-С-С, Ч-У-Э-Й, Ш-Ш-Ш..." },
    ...(profile?.stressLevel > 7 ? [{ id: 3, title: "Рыдающее дыхание", duration: 3, color: "#e8556d", desc: "Снятие острого стресса" }] : []),
    { id: 4, title: "Настрой Норбекова", duration: 7, color: "#c8a45a", desc: "Визуализация ОМЗ" }
  ];

  return (
    <div className="page">
      <div className="sec-lbl">◈ ПРАКТИКИ ДЛЯ ТЕБЯ</div>
      {profile?.stressLevel > 7 && (
        <div className="card" style={{ borderLeft: "3px solid var(--error)" }}>
          <div className="card-title" style={{ color: "var(--error)", fontSize: 14 }}>⚠️ Высокий уровень стресса</div>
          <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>Рекомендуем начать с «Рыдающего дыхания» (3 мин).</p>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {practices.map(p => (
          <div key={p.id} className="card" style={{ cursor: "pointer", borderLeft: `3px solid ${p.color}` }} onClick={() => { setActive(p); setTime(0); setRunning(true); }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="card-title" style={{ fontSize: 15 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-italic)" }}>{p.desc}</div>
              </div>
              <span className="badge bg">{p.duration} мин</span>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="overlay" onClick={() => { setActive(null); setRunning(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-x" onClick={() => { setActive(null); setRunning(false); }}>✕</div>
            <div className="modal-title">{active.title}</div>
            <div style={{ textAlign: "center", fontSize: 48, fontFamily: "var(--font-mono)", color: "var(--blue)", margin: "20px 0", padding: "20px", background: "rgba(0,112,192,0.05)", borderRadius: 8 }}>
              {fmt(time)}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => setRunning(!running)}>{running ? "Пауза" : "Старт"}</button>
              <button className="btn btn-ghost" onClick={() => setTime(0)}>Сброс</button>
            </div>
            <div style={{ padding: 12, background: "rgba(0,112,192,0.03)", borderRadius: 6 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", marginBottom: 6 }}>◈ ИНСТРУКЦИЯ</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>{active.desc}</div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => { setActive(null); setRunning(false); }}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
