// src/components/HealthTracker.jsx
import React, { useState, useEffect, useMemo } from "react";

export function HealthTracker() {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ energy: 5, mood: 5, body: 5, note: "" });
  const [saved, setSaved] = useState(null);
  const [logs, setLogs] = useState({});

  useEffect(() => {
    const raw = localStorage.getItem(`health_log_${today}`);
    if (raw) { setSaved(JSON.parse(raw)); return; }
    setSaved(null);
  }, [today]);

  useEffect(() => {
    const allLogs = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().split('T')[0];
      const val = localStorage.getItem(`health_log_${k}`);
      if (val) allLogs[k] = JSON.parse(val);
    }
    setLogs(allLogs);
  }, []);

  const handleSave = () => {
    localStorage.setItem(`health_log_${today}`, JSON.stringify(form));
    setSaved(form);
  };

  const chartPoints = useMemo(() => {
    const pts = [];
    Object.keys(logs).reverse().forEach((k, i) => {
      const d = new Date(k);
      const x = 20 + (i * 50);
      const y = 120 - (logs[k].energy * 10);
      pts.push(`${x},${y}`);
    });
    return pts.join(' ');
  }, [logs]);

  const lowStreak = useMemo(() => {
    const keys = Object.keys(logs).sort().reverse();
    return keys.length >= 2 && logs[keys[0]].energy < 4 && logs[keys[1]].energy < 4;
  }, [logs]);

  return (
    <div style={{ padding: '10px' }}>
      <h3 style={{ fontSize: 15, marginBottom: 10, color: '#0070c0' }}>📊 Трекер состояния</h3>
      {!saved ? (
        <div style={{ background: '#fff', padding: 12, borderRadius: 6, border: '1px solid var(--blue)' }}>
          {['energy', 'mood', 'body'].map(k => (
            <div key={k} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{k === 'energy' ? 'Энергия' : k === 'mood' ? 'Настроение' : 'Физика'} ({form[k]})</label>
              <input type="range" min="1" max="10" value={form[k]} onChange={e => setForm(f => ({...f, [k]: +e.target.value}))} style={{ width: '100%', accentColor: k === 'energy' ? 'var(--gold)' : 'var(--blue)' }} />
            </div>
          ))}
          <input value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} placeholder="Заметка..." style={{ width: '100%', padding: 6, border: '1px solid #ddd', borderRadius: 4, fontSize: 12, marginBottom: 8 }} />
          <button onClick={handleSave} style={{ width: '100%', padding: 8, background: '#0070c0', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Сохранить</button>
        </div>
      ) : (
        <div style={{ background: 'rgba(0,112,192,0.05)', padding: 10, borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
          ✅ Сегодня записано: Э: {saved.energy} | Н: {saved.mood} | Ф: {saved.body}
          {saved.note && <div style={{ marginTop: 4, color: '#555' }}>📝 {saved.note}</div>}
        </div>
      )}

      {lowStreak && (
        <div style={{ background: '#ffebee', borderLeft: '3px solid #d32f2f', padding: 8, fontSize: 12, marginBottom: 10 }}>
          ⚠️ Энергия падает 2 дня подряд. Рекомендуем протокол «Рыдающее дыхание» из вкладки <b>Дыхание</b>.
        </div>
      )}

      <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #eee' }}>
        <svg viewBox="0 0 360 140" style={{ width: '100%', height: 120 }}>
          <polyline fill="none" stroke="#0070c0" strokeWidth="2" points={chartPoints} />
          {Object.keys(logs).reverse().map((k, i) => (
            <circle key={k} cx={20 + (i * 50)} cy={120 - (logs[k].energy * 10)} r="3" fill="#0070c0" />
          ))}
        </svg>
        <div style={{ fontSize: 10, textAlign: 'center', color: '#888', marginTop: 4 }}>Энергия за 7 дней</div>
      </div>
    </div>
  );
}
