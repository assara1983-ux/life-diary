// src/components/BreathingTimer.jsx
import React, { useState, useEffect, useRef } from "react";

export function BreathingTimer({ technique, onFinish }) {
  const { title, inhale, exhale, hold = 0, cycles = 5 } = technique;
  const [isRunning, setIsRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState("ready");
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isRunning) return;
    if (cycle >= cycles) { onFinish?.(); return; }

    let currentPhase = phase === "ready" ? "inhale" : phase;
    let sec = timeLeft === 0 
      ? (currentPhase === "inhale" ? inhale : currentPhase === "hold" ? hold : exhale) 
      : timeLeft;

    timerRef.current = setInterval(() => {
      sec--;
      if (sec <= 0) {
        if (currentPhase === "inhale") { currentPhase = hold ? "hold" : "exhale"; }
        else if (currentPhase === "hold") { currentPhase = "exhale"; }
        else if (currentPhase === "exhale") {
          setCycle(c => c + 1);
          currentPhase = "inhale";
        }
        sec = currentPhase === "inhale" ? inhale : currentPhase === "hold" ? hold : exhale;
      }
      setTimeLeft(sec);
      setPhase(currentPhase);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isRunning, phase, cycle, inhale, exhale, hold, cycles, timeLeft]);

  const toggle = () => {
    if (!isRunning) { 
      setIsRunning(true); 
      setCycle(0); 
      setPhase("inhale"); 
      setTimeLeft(inhale); 
    } else { 
      setIsRunning(false); 
      setCycle(0); 
      setPhase("ready"); 
      setTimeLeft(0); 
    }
  };

  const scale = phase === "inhale" ? 1.8 : phase === "exhale" ? 0.8 : 1.2;
  const dur = phase === "inhale" ? inhale : phase === "exhale" ? exhale : hold;
  const phaseText = phase === "ready" ? "Готовы?" : phase === "inhale" ? "Вдох" : phase === "hold" ? "Пауза" : "Выдох";

  return (
    <div style={{ textAlign: 'center', padding: '15px 0', background: '#f9f9f9', borderRadius: 6 }}>
      <div style={{ 
        width: 100, height: 100, margin: '0 auto 12px', borderRadius: '50%', 
        background: 'rgba(0,112,192,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${scale})`, transition: `transform ${dur}s ease-in-out` 
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--blue)' }}>{phaseText}</span>
      </div>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
        {isRunning ? `Цикл ${cycle + 1}/${cycles} • ${timeLeft}с` : title}
      </div>
      <button onClick={toggle} style={{ padding: '6px 20px', background: isRunning ? '#d32f2f' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
        {isRunning ? "Стоп" : "Начать"}
      </button>
    </div>
  );
}
