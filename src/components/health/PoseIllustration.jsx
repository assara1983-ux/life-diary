// src/components/health/PoseIllustration.jsx
// Простые line-art иллюстрации поз — стилизованные, не фотографии людей.
// Единая палитра, чтобы вписываться в оформление приложения.

const STROKE = '#880e4f';
const STROKE_SOFT = '#c2185b';

function Figure({ children }) {
  return (
    <svg viewBox="0 0 160 120" width="100%" height="110" style={{ display: 'block' }}>
      <rect x="0" y="0" width="160" height="120" rx="10" fill="#fce4ec" />
      <g stroke={STROKE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {children}
      </g>
    </svg>
  );
}

const POSES = {
  baddhaKonasana: () => ( // сидя, стопы вместе, колени в стороны ("бабочка")
    <Figure>
      <circle cx="80" cy="30" r="10" fill={STROKE} stroke="none" />
      <line x1="80" y1="40" x2="80" y2="70" />
      <path d="M80 70 Q60 78 55 90" />
      <path d="M80 70 Q100 78 105 90" />
      <circle cx="55" cy="90" r="4" fill={STROKE} stroke="none" />
      <circle cx="105" cy="90" r="4" fill={STROKE} stroke="none" />
      <path d="M55 90 Q80 96 105 90" strokeDasharray="3,4" stroke={STROKE_SOFT} />
      <line x1="80" y1="45" x2="60" y2="60" />
      <line x1="80" y1="45" x2="100" y2="60" />
      <line x1="60" y1="60" x2="55" y2="90" />
      <line x1="100" y1="60" x2="105" y2="90" />
    </Figure>
  ),
  virasana: () => ( // сидя на пятках, спина прямая
    <Figure>
      <circle cx="85" cy="28" r="10" fill={STROKE} stroke="none" />
      <line x1="85" y1="38" x2="82" y2="75" />
      <path d="M82 75 L60 92 L60 100" />
      <path d="M82 75 L100 88 L100 100" />
      <line x1="60" y1="100" x2="100" y2="100" strokeDasharray="3,4" stroke={STROKE_SOFT} />
      <line x1="85" y1="45" x2="68" y2="58" />
      <line x1="85" y1="45" x2="102" y2="58" />
      <line x1="68" y1="58" x2="62" y2="72" />
      <line x1="102" y1="58" x2="108" y2="72" />
    </Figure>
  ),
  suptaBaddhaKonasana: () => ( // лёжа на спине, стопы вместе, колени раскрыты
    <Figure>
      <circle cx="25" cy="60" r="9" fill={STROKE} stroke="none" />
      <line x1="34" y1="60" x2="85" y2="60" />
      <path d="M85 60 Q100 45 115 48" />
      <path d="M85 60 Q100 75 115 72" />
      <circle cx="115" cy="48" r="4" fill={STROKE} stroke="none" />
      <circle cx="115" cy="72" r="4" fill={STROKE} stroke="none" />
      <path d="M115 48 Q125 60 115 72" strokeDasharray="3,4" stroke={STROKE_SOFT} />
      <line x1="45" y1="60" x2="40" y2="45" />
      <line x1="60" y1="60" x2="55" y2="80" />
    </Figure>
  ),
  sarvangasana: () => ( // берёзка, ноги вверх, опора на плечи
    <Figure>
      <circle cx="70" cy="95" r="9" fill={STROKE} stroke="none" />
      <line x1="70" y1="86" x2="75" y2="55" />
      <line x1="75" y1="55" x2="75" y2="20" />
      <line x1="75" y1="20" x2="72" y2="10" />
      <path d="M60 90 Q75 82 90 90" />
      <line x1="55" y1="97" x2="70" y2="95" />
      <line x1="55" y1="97" x2="45" y2="90" />
    </Figure>
  ),
  paschimottanasana: () => ( // сидя, наклон вперёд к прямым ногам
    <Figure>
      <circle cx="45" cy="70" r="9" fill={STROKE} stroke="none" />
      <path d="M45 79 Q55 90 75 92" />
      <line x1="75" y1="92" x2="130" y2="92" />
      <path d="M75 92 Q60 78 55 78" />
      <line x1="130" y1="92" x2="126" y2="98" />
      <line x1="20" y1="98" x2="130" y2="98" strokeDasharray="3,4" stroke={STROKE_SOFT} />
    </Figure>
  ),
  savasana: () => ( // лёжа на спине, расслабление
    <Figure>
      <circle cx="20" cy="60" r="9" fill={STROKE} stroke="none" />
      <line x1="29" y1="60" x2="120" y2="60" />
      <line x1="55" y1="60" x2="48" y2="72" />
      <line x1="55" y1="60" x2="48" y2="48" />
      <line x1="120" y1="60" x2="132" y2="52" />
      <line x1="120" y1="60" x2="132" y2="68" />
      <line x1="10" y1="80" x2="140" y2="80" strokeDasharray="3,4" stroke={STROKE_SOFT} />
    </Figure>
  ),
};

export function PoseIllustration({ pose }) {
  const Render = POSES[pose];
  if (!Render) return null;
  return <Render />;
}
