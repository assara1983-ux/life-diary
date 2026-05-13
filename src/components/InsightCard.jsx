// src/components/InsightCard.jsx
import React from 'react';

export function InsightCard({ title, icon, meaning, impact, action, color = "blue" }) {
  const styles = {
    blue: { bg: "rgba(0,112,192,0.05)", border: "rgba(0,112,192,0.2)", text: "var(--blue)" },
    gold: { bg: "rgba(200,164,90,0.05)", border: "rgba(200,164,90,0.2)", text: "var(--gold-dark)" },
    success: { bg: "rgba(45,106,79,0.05)", border: "rgba(45,106,79,0.2)", text: "var(--success)" }
  };
  const s = styles[color];

  return (
    <div style={{ 
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, 
      padding: 16, marginBottom: 16, position: "relative", overflow: "hidden" 
    }}>
      {/* Декоративный уголок Blueprint */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: `2px solid ${s.text}`, borderLeft: `2px solid ${s.text}` }} />
      
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: s.text, margin: 0 }}>{title}</h3>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--text1)", marginBottom: 8 }}>
        <strong style={{ color: s.text }}>Суть:</strong> {meaning}
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.4, color: "var(--text2)", marginBottom: 12, fontStyle: "italic" }}>
        <strong style={{ color: s.text }}>Влияние на тебя:</strong> {impact}
      </div>

      {action && (
        <div style={{ 
          padding: 10, background: "rgba(255,255,255,0.8)", borderRadius: 6, 
          fontSize: 12, color: s.text, display: "flex", alignItems: "center", gap: 8,
          border: `1px dashed ${s.text}`
        }}>
          <span style={{ fontSize: 16 }}>💡</span> 
          <div>
            <strong style={{ display: "block", marginBottom: 2 }}>Совет дня:</strong>
            {action}
          </div>
        </div>
      )}
    </div>
  );
}
