import { useState } from "react";

export function GoalsSection() {
  const [tab, setTab] = useState("wheel");
  const [sectors, setSectors] = useState([
    { name: "Здоровье", value: 6, color: "#2d6a4f" },
    { name: "Карьера", value: 5, color: "#0070c0" },
    { name: "Финансы", value: 4, color: "#c8a45a" },
    { name: "Отношения", value: 8, color: "#e8556d" },
    { name: "Рост", value: 7, color: "#1d4e6b" },
    { name: "Отдых", value: 3, color: "#7bcca0" },
    { name: "Духовность", value: 6, color: "#8c7a5a" },
    { name: "Творчество", value: 5, color: "#5c4a30" }
  ]);

  const renderWheel = () => {
    const cx = 150, cy = 150, r = 120;
    const step = (Math.PI * 2) / sectors.length;
    return (
      <div className="card">
        <div className="card-title">🎡 Колесо баланса</div>
        <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
          <svg viewBox="0 0 300 300" width="240" height="240">
            {[1,2,3,4,5].map(n => <circle key={n} cx={cx} cy={cy} r={n*24} fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="1" />)}
            {sectors.map((s, i) => {
              const a1 = i * step - Math.PI/2;
              const a2 = (i+1) * step - Math.PI/2;
              const rv = (s.value/10)*r;
              const x1 = cx + rv*Math.cos(a1), y1 = cy + rv*Math.sin(a1);
              const x2 = cx + rv*Math.cos(a2), y2 = cy + rv*Math.sin(a2);
              const lx = cx + (r+15)*Math.cos(a1+step/2);
              const ly = cy + (r+15)*Math.sin(a1+step/2);
              return (
                <g key={i}>
                  <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${rv} ${rv} 0 0 1 ${x2} ${y2} Z`} fill={s.color+"25"} stroke={s.color} strokeWidth="1.5" />
                  <text x={lx} y={ly} textAnchor="middle" fill="var(--text2)" fontFamily="var(--font-mono)" fontSize="9">{s.name}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="sec-lbl">◈ ЗОНЫ РОСТА</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {sectors.filter(s => s.value <= 4).map(s => (
            <span key={s.name} className="badge bm" style={{ borderColor: s.color, color: s.color }}>{s.name} ({s.value}/10)</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="tabs">
        <button className={`tab ${tab==="wheel"?"on":""}`} onClick={()=>setTab("wheel")}>Колесо</button>
        <button className={`tab ${tab==="goals"?"on":""}`} onClick={()=>setTab("goals")}>Цели</button>
      </div>
      {tab==="wheel" && renderWheel()}
      {tab==="goals" && (
        <div className="card">
          <div className="card-hd">
            <div className="card-title">🎯 Мои цели</div>
            <button className="btn btn-primary btn-sm">+ Добавить</button>
          </div>
          <div className="ai-box" style={{ marginTop: 12 }}>
            <div className="ai-label">◈ ПРАВИЛО 72 ЧАСОВ</div>
            <div className="ai-text">
              После постановки цели сделай первый шаг в течение 3 дней. Вероятность реализации стремится к нулю, если действие не начато в этот срок.
            </div>
          </div>
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text3)" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
            <p style={{ fontFamily: "var(--font-italic)" }}>Целей пока нет. Создай первую!</p>
          </div>
        </div>
      )}
    </div>
  );
}
