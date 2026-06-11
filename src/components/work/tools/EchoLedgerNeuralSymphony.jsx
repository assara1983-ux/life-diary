// src/components/work/tools/EchoLedgerNeuralSymphony.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../store/AppContext';

const MODES = {
  alpha: { name: 'Alpha',  freq: 10, label: 'Спокойный Фокус',       color: '#c8a45a', desc: 'Идеально для анализа документов и рутинной работы. 8–12 Гц.' },
  beta:  { name: 'Beta',   freq: 18, label: 'Активная Концентрация',  color: '#22c55e', desc: 'Для сложных расчётов и налоговых вопросов. 14–30 Гц.' },
  theta: { name: 'Theta',  freq: 6,  label: 'Креативное Мышление',    color: '#a855f7', desc: 'Для поиска нестандартных решений. 4–8 Гц.' },
  gamma: { name: 'Gamma',  freq: 40, label: 'Пиковое Состояние',      color: '#f97316', desc: 'Для глубокого анализа и интеграции данных. 30–100 Гц.' },
};

export function EchoLedgerNeuralSymphony() {
  const { notify } = useApp();

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentMode,  setCurrentMode]  = useState('alpha');
  const [volume,       setVolume]       = useState(0.65);

  const audioCtxRef   = useRef(null);
  const oscLeftRef    = useRef(null);
  const oscRightRef   = useRef(null);
  const gainRef       = useRef(null);
  const canvasRef     = useRef(null);
  const animRef       = useRef(null);
  const isPlayingRef  = useRef(false);

  const mode = MODES[currentMode];

  // Синхронизируем ref с state для использования в колбэках
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      stopAudio();
      cancelAnimationFrame(animRef.current);
    };
  }, []); // eslint-disable-line

  // Canvas волна — перезапускаем при смене цвета
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const cy = h / 2;

      // Фоновая линия
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.stroke();

      // Основная волна
      ctx.strokeStyle = mode.color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = isPlayingRef.current ? 18 : 4;
      ctx.shadowColor = mode.color;
      ctx.globalAlpha = isPlayingRef.current ? 1 : 0.5;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const amp = isPlayingRef.current ? 35 : 15;
        const freq = 0.018 + (MODES[currentMode]?.freq || 10) * 0.0004;
        const y = cy + Math.sin(x * freq + phase) * amp
                     + Math.sin(x * freq * 2.3 + phase * 1.5) * (amp * 0.3);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Вторая волна (тонкая)
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const amp = isPlayingRef.current ? 20 : 8;
        const freq = 0.012 + (MODES[currentMode]?.freq || 10) * 0.0003;
        const y = cy + Math.sin(x * freq + phase * 0.7 + Math.PI * 0.5) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.globalAlpha = 1;
      phase += isPlayingRef.current ? 0.07 : 0.025;
      animRef.current = requestAnimationFrame(draw);
    };

    cancelAnimationFrame(animRef.current);
    draw();

    return () => cancelAnimationFrame(animRef.current);
  }, [mode.color, currentMode]);

  // Громкость без перезапуска
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  const stopAudio = () => {
    try {
      oscLeftRef.current?.stop();
      oscRightRef.current?.stop();
    } catch {}
    oscLeftRef.current  = null;
    oscRightRef.current = null;
  };

  const startAudio = (modeKey) => {
    const m = MODES[modeKey];
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;

      // Gain
      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = volume;

      // Панорамирование
      const leftPan  = ctx.createStereoPanner();
      const rightPan = ctx.createStereoPanner();
      leftPan.pan.value  = -0.85;
      rightPan.pan.value = 0.85;

      // Осцилляторы
      oscLeftRef.current  = ctx.createOscillator();
      oscRightRef.current = ctx.createOscillator();
      oscLeftRef.current.frequency.value  = 200;
      oscRightRef.current.frequency.value = 200 + m.freq;
      oscLeftRef.current.type  = 'sine';
      oscRightRef.current.type = 'sine';

      oscLeftRef.current.connect(leftPan);
      oscRightRef.current.connect(rightPan);
      leftPan.connect(gainRef.current);
      rightPan.connect(gainRef.current);
      gainRef.current.connect(ctx.destination);

      oscLeftRef.current.start();
      oscRightRef.current.start();
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  const handleToggle = () => {
    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
      notify('Neural Symphony остановлена');
    } else {
      startAudio(currentMode);
      setIsPlaying(true);
      notify(`▶ ${mode.name} — ${mode.label}`);
    }
  };

  const handleModeChange = (key) => {
    const wasPlaying = isPlayingRef.current;
    if (wasPlaying) stopAudio();
    setCurrentMode(key);
    setIsPlaying(false);
    if (wasPlaying) {
      // Запускаем с новым режимом после обновления стейта
      setTimeout(() => {
        startAudio(key);
        setIsPlaying(true);
        notify(`▶ ${MODES[key].name} — ${MODES[key].label}`);
      }, 80);
    }
  };

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
        }}>ECHO LEDGER</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
          Neural Symphony · Синхронизация разума
        </div>
      </div>

      {/* Режимы */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
        {Object.entries(MODES).map(([key, m]) => (
          <button key={key} onClick={() => handleModeChange(key)} style={{
            padding: '12px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            background: currentMode === key ? `${m.color}18` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${currentMode === key ? m.color + '80' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.2s',
          }}>
            <div style={{
              fontSize: 15, fontWeight: 600, color: currentMode === key ? m.color : 'var(--text2)',
              marginBottom: 2, fontFamily: "'JetBrains Mono',monospace",
            }}>
              {m.name} · {m.freq} Гц
            </div>
            <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.3 }}>
              {m.label}
            </div>
          </button>
        ))}
      </div>

      {/* Описание текущего режима */}
      <div style={{
        padding: '12px 14px', marginBottom: 20,
        background: `${mode.color}0d`,
        border: `1px solid ${mode.color}33`,
        borderRadius: 10, fontSize: 15, color: 'var(--text2)', lineHeight: 1.6,
      }}>
        <span style={{ color: mode.color, fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
          {mode.name.toUpperCase()} · {mode.freq} Гц ·
        </span>{' '}
        {mode.desc}
      </div>

      {/* Canvas волна */}
      <div style={{
        padding: '16px', marginBottom: 20,
        background: 'linear-gradient(135deg, rgba(10,15,30,0.8), rgba(5,8,16,0.9))',
        border: `1px solid ${mode.color}33`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        <canvas ref={canvasRef} width={800} height={120}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        {/* Частота по центру */}
        <div style={{
          textAlign: 'center', marginTop: 8,
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 14, letterSpacing: 2,
          color: isPlaying ? mode.color : 'rgba(255,255,255,0.2)',
        }}>
          {isPlaying ? `▶ ${mode.name} · ${mode.freq} Гц · В ПОТОКЕ` : `${mode.name} · ${mode.freq} Гц · ПАУЗА`}
        </div>
      </div>

      {/* Кнопка запуска */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <button onClick={handleToggle} style={{
          padding: '14px 48px', borderRadius: 24,
          background: isPlaying
            ? 'rgba(153,27,27,0.3)'
            : `linear-gradient(135deg, ${mode.color}33, ${mode.color}11)`,
          border: `1px solid ${isPlaying ? 'rgba(239,68,68,0.5)' : mode.color + '80'}`,
          color: isPlaying ? 'rgba(239,68,68,0.9)' : mode.color,
          fontSize: 15, cursor: 'pointer', transition: 'all 0.2s',
          fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1,
          boxShadow: isPlaying ? 'none' : `0 0 20px ${mode.color}22`,
        }}>
          {isPlaying ? '⏹ ОСТАНОВИТЬ' : '▶ ЗАПУСТИТЬ СИМФОНИЮ'}
        </button>
      </div>

      {/* Громкость */}
      <div style={{
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.60)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
      }}>
        <div style={{
          fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 2, color: BT.text3, marginBottom: 10,
        }}>ГРОМКОСТЬ · {Math.round(volume * 100)}%</div>
        <input type="range" min="0" max="1" step="0.01" value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: mode.color }}
        />
      </div>

      {/* Подсказка */}
      <div style={{
        marginTop: 14, textAlign: 'center',
        fontSize: 14, color: 'rgba(255,255,255,0.2)',
        fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1,
      }}>
        Используйте стереонаушники для максимального эффекта
      </div>
    </div>
  );
}
