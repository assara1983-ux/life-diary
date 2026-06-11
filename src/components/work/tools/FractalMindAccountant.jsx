// src/components/work/tools/FractalMindAccountant.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../store/AppContext';

const METRICS = {
  balance:  { title: 'Общий баланс',       color: '#c8a45a', desc: 'Энергетический баланс всех финансовых потоков' },
  debtor:   { title: 'Дебиторская',        color: '#22c55e', desc: 'Поток входящих ресурсов и требований' },
  creditor: { title: 'Кредиторская',       color: '#ef4444', desc: 'Поток исходящих обязательств и платежей' },
};

const LABELS = {
  balance:  'Общий баланс',
  debtor:   'Дебиторская',
  creditor: 'Кредиторская',
};

const RECOMMENDATIONS = {
  debtor:   'Ускорить работу с дебиторской задолженностью. Направить претензии контрагентам с просрочкой свыше 30 дней.',
  creditor: 'Оптимизировать сроки оплаты кредиторам. Приоритизировать платежи с высокими штрафными санкциями.',
  balance:  'Поддерживать гармоничный баланс финансовых потоков. Соотношение дебиторки к кредиторке — норма 1.2–1.5.',
};

export function FractalMindAccountant() {
  const { aiNotes, setAiNotes, notify } = useApp();

  const [activeMetric, setActiveMetric] = useState('balance');
  const [inputs, setInputs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ld_fractal_inputs') || 'null') ||
        { debtor: 1850000, creditor: 920000, balance: 2450000 };
    } catch { return { debtor: 1850000, creditor: 920000, balance: 2450000 }; }
  });

  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const metric    = METRICS[activeMetric];

  // Сохраняем inputs
  useEffect(() => {
    try { localStorage.setItem('ld_fractal_inputs', JSON.stringify(inputs)); }
    catch {}
  }, [inputs]);

  // Canvas анимация
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Внешний круг
      ctx.beginPath();
      ctx.arc(cx, cy, 145, 0, Math.PI * 2);
      ctx.strokeStyle = metric.color;
      ctx.lineWidth = 14;
      ctx.shadowBlur = 40;
      ctx.shadowColor = metric.color;
      ctx.globalAlpha = 1;
      ctx.stroke();

      // Пульсирующие внутренние круги
      for (let i = 0; i < 4; i++) {
        const r = 90 + Math.sin(angle * 1.2 + i * 0.8) * 16;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = metric.color;
        ctx.lineWidth = 4 - i * 0.7;
        ctx.globalAlpha = 0.7 - i * 0.14;
        ctx.shadowBlur = 15;
        ctx.stroke();
      }

      // Сакральные линии
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = metric.color;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      for (let i = 0; i < 6; i++) {
        const a = (angle * 0.3) + i * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 145 * Math.cos(a), cy + 145 * Math.sin(a));
        ctx.stroke();
      }

      // Центральная точка
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fillStyle = metric.color;
      ctx.shadowBlur = 25;
      ctx.shadowColor = metric.color;
      ctx.fill();

      // Гексагон
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = metric.color;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = angle * 0.2 + i * Math.PI / 3;
        const x = cx + 120 * Math.cos(a);
        const y = cy + 120 * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      angle += 0.014;
      frameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [metric.color]);

  const currentValue = inputs[activeMetric];

  const saveInsight = () => {
    const note = {
      id: 'fi-' + Date.now(),
      title: `Фрактальный инсайт · ${LABELS[activeMetric]} · ${new Date().toLocaleDateString('ru-RU')}`,
      content: `Метрика: ${LABELS[activeMetric]}\nЗначение: ${currentValue.toLocaleString('ru-RU')} ₸\n\n${RECOMMENDATIONS[activeMetric]}`,
      createdAt: new Date().toISOString(),
    };
    setAiNotes(p => [note, ...(p || [])]);
    notify(`✅ Инсайт по «${LABELS[activeMetric]}» сохранён`);
  };

  const fmt = n => Number(n).toLocaleString('ru-RU');

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
        }}>ФРАКТАЛЬНЫЙ УМ</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
          Визуализация финансовых потоков
        </div>
      </div>

      {/* Переключатели метрик */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.keys(METRICS).map(key => (
          <button key={key} onClick={() => setActiveMetric(key)} style={{
            flex: 1, minWidth: 100, padding: '10px 8px', borderRadius: 16,
            background: activeMetric === key
              ? `${METRICS[key].color}22`
              : 'transparent',
            border: `1px solid ${activeMetric === key ? METRICS[key].color : 'rgba(255,255,255,0.1)'}`,
            color: activeMetric === key ? METRICS[key].color : 'var(--text3)',
            fontSize: 15, cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {LABELS[key]}
          </button>
        ))}
      </div>

      {/* Основной layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {/* Canvas */}
        <div style={{
          padding: '24px', borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(10,15,30,0.8), rgba(5,8,16,0.9))',
          border: `1px solid ${metric.color}44`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', minHeight: 340,
        }}>
          <canvas ref={canvasRef} width={320} height={320}
            style={{ width: '100%', maxWidth: 320, height: 'auto' }}
          />
          {/* Число поверх */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none', zIndex: 2,
          }}>
            <div style={{
              fontSize: 26, fontWeight: 700,
              color: metric.color, lineHeight: 1,
              textShadow: `0 0 20px ${metric.color}66`,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {fmt(currentValue)}
            </div>
            <div style={{ fontSize: 14, color: BT.text3, marginTop: 4 }}>₸</div>
          </div>
        </div>

        {/* Панель анализа */}
        <div style={{
          padding: '20px 16px',
          background: 'rgba(255,255,255,0.70)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div>
            <div style={{
              fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 2, color: metric.color, marginBottom: 4, opacity: 0.8,
            }}>{LABELS[activeMetric].toUpperCase()}</div>
            <div style={{ fontSize: 16, fontFamily: "'Cormorant Infant',serif", color: 'var(--text1)', lineHeight: 1.4 }}>
              {metric.desc}
            </div>
          </div>

          {/* Поле ввода значения */}
          <div>
            <label style={{
              display: 'block', fontSize: 12,
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 1, color: 'rgba(200,164,90,0.6)', marginBottom: 5,
            }}>ЗНАЧЕНИЕ (₸)</label>
            <input
              type="number"
              value={inputs[activeMetric]}
              onChange={e => setInputs(p => ({ ...p, [activeMetric]: Number(e.target.value) }))}
              step={10000}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${metric.color}44`,
                borderRadius: 8, color: 'var(--text0)',
                fontSize: 16, outline: 'none',
                fontFamily: "'JetBrains Mono',monospace",
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Все три значения */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.keys(METRICS).map(key => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '8px 10px',
                background: activeMetric === key ? `${METRICS[key].color}10` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${activeMetric === key ? METRICS[key].color + '44' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8,
              }}>
                <span style={{
                  fontSize: 14, color: METRICS[key].color,
                  fontFamily: "'JetBrains Mono',monospace",
                }}>{LABELS[key]}</span>
                <span style={{
                  fontSize: 16, fontWeight: 600,
                  color: activeMetric === key ? METRICS[key].color : 'var(--text2)',
                  fontFamily: "'JetBrains Mono',monospace",
                }}>{fmt(inputs[key])} ₸</span>
              </div>
            ))}
          </div>

          {/* Рекомендация */}
          <div style={{
            padding: '12px 14px',
            background: `${metric.color}0d`,
            border: `1px solid ${metric.color}33`,
            borderLeft: `4px solid ${metric.color}`,
            borderRadius: 8, fontSize: 15,
            color: 'var(--text2)', lineHeight: 1.6,
          }}>
            <div style={{
              fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 1, color: metric.color,
              marginBottom: 4, opacity: 0.8,
            }}>РЕКОМЕНДАЦИЯ</div>
            {RECOMMENDATIONS[activeMetric]}
          </div>

          <button onClick={saveInsight} style={{
            width: '100%', padding: '11px 0', borderRadius: 10,
            background: 'rgba(200,164,90,0.1)',
            border: '1px solid rgba(200,164,90,0.4)',
            color: 'rgba(200,164,90,0.9)', fontSize: 16, cursor: 'pointer',
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            💾 Сохранить инсайт
          </button>
        </div>
      </div>
    </div>
  );
          }
