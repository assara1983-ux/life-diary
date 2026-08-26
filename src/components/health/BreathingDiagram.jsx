// src/components/health/BreathingDiagram.jsx
// Наглядная волновая диаграмма ритма: вдох растёт, задержка ровная, выдох падает.
// Строится по цифрам самой техники — не статичная картинка, а реальная визуализация паттерна.

export function BreathingDiagram({ technique }) {
  const { inhale = 0, hold = 0, exhale = 0 } = technique || {};
  const total = inhale + hold + exhale || 1;
  const W = 280, H = 90, PAD = 10;
  const usableW = W - PAD * 2;

  const inhaleW = (inhale / total) * usableW;
  const holdW   = (hold   / total) * usableW;
  const exhaleW = (exhale / total) * usableW;

  const baseY = H - 18;
  const peakY = 22;

  let path = `M ${PAD} ${baseY}`;
  let x = PAD;
  if (inhale > 0) { x += inhaleW; path += ` Q ${PAD + inhaleW * 0.5} ${peakY} ${x} ${peakY}`; }
  if (hold > 0)   { const nx = x + holdW; path += ` L ${nx} ${peakY}`; x = nx; }
  if (exhale > 0) { const nx = x + exhaleW; path += ` Q ${x + exhaleW * 0.5} ${baseY} ${nx} ${baseY}`; x = nx; }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY} stroke="#ddd" strokeWidth="1" />
      <path d={path} fill="none" stroke="#0070c0" strokeWidth="2.5" strokeLinecap="round" />
      {inhale > 0 && (
        <text x={PAD + inhaleW / 2} y={baseY + 14} fontSize="9" fill="#0070c0" textAnchor="middle" fontFamily="'JetBrains Mono',monospace">
          вдох {inhale}с
        </text>
      )}
      {hold > 0 && (
        <text x={PAD + inhaleW + holdW / 2} y={peakY - 8} fontSize="9" fill="#c8a45a" textAnchor="middle" fontFamily="'JetBrains Mono',monospace">
          пауза {hold}с
        </text>
      )}
      {exhale > 0 && (
        <text x={PAD + inhaleW + holdW + exhaleW / 2} y={baseY + 14} fontSize="9" fill="#2d6a4f" textAnchor="middle" fontFamily="'JetBrains Mono',monospace">
          выдох {exhale}с
        </text>
      )}
    </svg>
  );
}
