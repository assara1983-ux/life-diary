// src/components/AnatomyViewer.jsx
import React, { useState } from 'react';

const BASE = '/assets/anatomy';

// ─── Данные чакр ─────────────────────────────────────────────────────────────
const CHAKRAS = [
  { id: 'sahasrara',    name: 'Сахасрара',    ru: 'Корона',              color: '#9333ea', cx: 170, cy: 84,  r: 12 },
  { id: 'ajna',         name: 'Аджна',         ru: 'Третий глаз',        color: '#4f46e5', cx: 170, cy: 127, r: 10 },
  { id: 'vishuddha',    name: 'Вишуддха',      ru: 'Горло',              color: '#0891b2', cx: 170, cy: 170, r: 10 },
  { id: 'anahata',      name: 'Анахата',       ru: 'Сердце',             color: '#16a34a', cx: 170, cy: 211, r: 12 },
  { id: 'manipura',     name: 'Манипура',      ru: 'Солн. сплетение',   color: '#ca8a04', cx: 170, cy: 256, r: 10 },
  { id: 'svadhisthana', name: 'Свадхистхана',  ru: 'Крестец',            color: '#ea580c', cx: 170, cy: 292, r: 10 },
  { id: 'muladhara',    name: 'Муладхара',     ru: 'Корень',             color: '#dc2626', cx: 170, cy: 310, r: 12 },
];

// ─── Данные органов ───────────────────────────────────────────────────────────
const ORGANS = [
  { id: 'brain',       name: 'Мозг',            color: '#f472b6', cx: 165, cy: 123, rx: 22, ry: 15 },
  { id: 'heart',       name: 'Сердце',           color: '#ef4444', cx: 190, cy: 199, rx: 13, ry: 11 },
  { id: 'lungs',       name: 'Лёгкие',           color: '#60a5fa', shapes: [{ cx: 191, cy: 217, rx: 16, ry: 21 }, { cx: 149, cy: 217, rx: 16, ry: 21 }] },
  { id: 'liver',       name: 'Печень',           color: '#a16207', cx: 153, cy: 242, rx: 20, ry: 13 },
  { id: 'stomach',     name: 'Желудок',          color: '#fbbf24', cx: 190, cy: 251, rx: 15, ry: 12 },
  { id: 'kidneys',     name: 'Почки',            color: '#a78bfa', shapes: [{ cx: 198, cy: 241, rx: 10, ry: 13 }, { cx: 154, cy: 248, rx: 10, ry: 13 }] },
  { id: 'intestines',  name: 'Кишечник',         color: '#34d399', cx: 180, cy: 274, rx: 32, ry: 20 },
  { id: 'bladder',     name: 'Мочевой пузырь',   color: '#7dd3fc', cx: 170, cy: 285, rx: 14, ry: 9  },
];

const W = 334, H = 599;

// ─── Хит-зона органа (прозрачный эллипс/ы поверх SVG-иконки) ─────────────────
function OrganHit({ o, active, onClick }) {
  const sw  = active ? 2.5 : 1.5;
  const fill = o.color + (active ? '55' : '22');
  const stroke = active ? o.color : 'transparent';

  if (o.shapes) {
    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        {o.shapes.map((s, i) => (
          <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
            fill={fill} stroke={stroke} strokeWidth={sw}
            style={{ filter: active ? `drop-shadow(0 0 6px ${o.color})` : 'none', transition: 'all 0.18s' }}/>
        ))}
      </g>
    );
  }
  return (
    <ellipse cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry}
      fill={fill} stroke={stroke} strokeWidth={sw}
      onClick={onClick} style={{ cursor: 'pointer',
        filter: active ? `drop-shadow(0 0 6px ${o.color})` : 'none',
        transition: 'all 0.18s' }}/>
  );
}

// ─── SVG-иконка органа позиционируется по центру эллипса ─────────────────────
function OrganIcon({ o, active }) {
  const PAD = 8;
  let x, y, w, h;
  if (o.shapes) {
    const xs = o.shapes.flatMap(s => [s.cx - s.rx, s.cx + s.rx]);
    const ys = o.shapes.flatMap(s => [s.cy - s.ry, s.cy + s.ry]);
    x = Math.min(...xs) - PAD;
    y = Math.min(...ys) - PAD;
    w = Math.max(...xs) + PAD - x;
    h = Math.max(...ys) + PAD - y;
  } else {
    x = o.cx - o.rx - PAD;
    y = o.cy - o.ry - PAD;
    w = (o.rx + PAD) * 2;
    h = (o.ry + PAD) * 2;
  }
  return (
    <image
      href={`${BASE}/organ-${o.id}.svg`}
      x={x} y={y} width={w} height={h}
      style={{ opacity: active ? 1 : 0.45, transition: 'opacity 0.18s',
               filter: active ? `drop-shadow(0 0 5px ${o.color})` : 'none',
               pointerEvents: 'none' }}
    />
  );
}

// ─── SVG-иконка чакры ─────────────────────────────────────────────────────────
function ChakraIcon({ ch, active, onClick }) {
  const size = (ch.r + 9) * 2 + 4;
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <image
        href={`${BASE}/chakra-${ch.id}.svg`}
        x={ch.cx - size / 2} y={ch.cy - size / 2}
        width={size} height={size}
        style={{ opacity: active ? 1 : 0.35, transition: 'opacity 0.18s',
                 filter: active ? `drop-shadow(0 0 8px ${ch.color})` : 'none' }}
      />
      {/* прозрачная хит-зона */}
      <circle cx={ch.cx} cy={ch.cy} r={ch.r + 9}
        fill="transparent" stroke="none"/>
    </g>
  );
}

// ─── Подпись органа ───────────────────────────────────────────────────────────
function OrganLabel({ o, active }) {
  if (!active) return null;
  let lx, ly;
  if (o.shapes) {
    lx = Math.round((o.shapes[0].cx + o.shapes[1].cx) / 2);
    ly = Math.min(o.shapes[0].cy, o.shapes[1].cy) - o.shapes[0].ry - 4;
  } else {
    lx = o.cx; ly = o.cy - o.ry - 4;
  }
  return (
    <text x={lx} y={ly} textAnchor="middle" fontSize="7"
      fill="#f5e19b" fontStyle="italic"
      style={{ pointerEvents: 'none',
               filter: 'drop-shadow(0 0 2px rgba(245,225,155,0.95))' }}>
      {o.name}
    </text>
  );
}

// ─── Подпись чакры ────────────────────────────────────────────────────────────
function ChakraLabel({ ch, active }) {
  if (!active) return null;
  return (
    <text x={ch.cx + ch.r + 11} y={ch.cy + 4}
      fontSize="6.5" fill={ch.color} fontStyle="italic"
      style={{ pointerEvents: 'none',
               filter: 'drop-shadow(0 0 2px rgba(245,225,155,0.95))' }}>
      {ch.ru}
    </text>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────
export function AnatomyViewer({ activeOrganId }) {
  const [layer, setLayer] = useState('none'); // 'none' | 'organs' | 'chakras'
  const [sel,   setSel]   = useState(null);

  const pick = (item) => setSel(s => s?.id === item.id ? null : item);

  const TABS = [
    { id: 'none',    label: 'Тело',   sym: '◌' },
    { id: 'organs',  label: 'Органы', sym: '✦' },
    { id: 'chakras', label: 'Чакры',  sym: '◎' },
  ];

  const list = layer === 'organs' ? ORGANS : layer === 'chakras' ? CHAKRAS : [];

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', userSelect: 'none',
                  display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                  color: '#e8dcc8', fontFamily: 'var(--font-mono, monospace)' }}>

      {/* Шапка */}
      <div style={{ width: '100%', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '0.58rem', letterSpacing: '0.4em', color: '#7a6040',
                      textTransform: 'uppercase' }}>Анатомический просмотр</div>
        <div style={{ fontSize: '0.8rem', letterSpacing: '0.14em', color: '#d4b896', margin: 0 }}>
          {layer === 'none' ? 'Выберите слой' : layer === 'organs' ? 'Органы тела' : 'Чакры'}
        </div>
      </div>

      {/* Вкладки */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center',
                    gap: 6, marginBottom: 10 }}>
        {TABS.map(t => {
          const active = layer === t.id;
          return (
            <button key={t.id} onClick={() => { setLayer(t.id); setSel(null); }}
              style={{ padding: '5px 14px', borderRadius: 3, fontSize: '0.76rem',
                       background: active ? '#1a0e04' : 'transparent',
                       border: active ? '1px solid #c8a060' : '1px solid #3a2510',
                       color: active ? '#e0b060' : '#6a5030',
                       cursor: 'pointer', letterSpacing: '0.05em' }}>
              {t.sym} {t.label}
            </button>
          );
        })}
      </div>

      {/* Изображение + SVG оверлей */}
      <div style={{ border: '1.5px solid #7a5520', borderRadius: 4,
                    boxShadow: '0 0 0 1px #3a200a, 0 6px 28px rgba(0,0,0,0.7)',
                    overflow: 'hidden', position: 'relative', width: W, height: H }}>

        {/* Фоновое изображение через CSS */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H,
                      backgroundImage: `url(${BASE}/meridian-body-base.png)`,
                      backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}/>

        {/* SVG оверлей */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
             style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}>

          {/* Органы */}
          {layer === 'organs' && ORGANS.map(o => {
            const active = sel?.id === o.id ||
                           (activeOrganId === o.id && !sel);
            return (
              <g key={o.id}>
                <OrganIcon   o={o} active={active}/>
                <OrganHit    o={o} active={active} onClick={() => pick(o)}/>
                <OrganLabel  o={o} active={active}/>
              </g>
            );
          })}

          {/* Чакры */}
          {layer === 'chakras' && CHAKRAS.map(ch => {
            const active = sel?.id === ch.id;
            return (
              <g key={ch.id}>
                <ChakraIcon  ch={ch} active={active} onClick={() => pick(ch)}/>
                <ChakraLabel ch={ch} active={active}/>
              </g>
            );
          })}

        </svg>
      </div>

      {/* Правая панель: описание + список */}
      <div style={{ width: 196, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Карточка выбранного */}
        <div style={{
          background: sel
            ? `linear-gradient(135deg,${sel.color}18,rgba(0,0,0,0.3))`
            : 'rgba(0,0,0,0.25)',
          border: `1px solid ${sel?.color || '#3a2510'}44`,
          borderRadius: 3, padding: 13, minHeight: 108,
          transition: 'all 0.3s',
          boxShadow: sel ? `0 0 16px ${sel.color}22` : 'none',
        }}>
          {sel ? (
            <>
              <div style={{ fontSize: '0.52rem', color: '#7a5030',
                            textTransform: 'uppercase', marginBottom: 5 }}>
                {layer === 'organs' ? 'Орган' : 'Чакра'}
              </div>
              <div style={{ fontSize: '1rem', color: sel.color,
                            marginBottom: 6, fontWeight: 'bold' }}>
                {sel.name}
              </div>
              {'ru' in sel && (
                <div style={{ fontSize: '0.74rem', color: '#c8a070', marginBottom: 7 }}>
                  {sel.ru}
                </div>
              )}
              <div style={{ fontSize: '0.7rem', color: '#9a7858', lineHeight: '1.65' }}>
                {/* desc подтянется из anatomyKnowledge через onSelect */}
                Нажмите ещё раз — снять выделение
              </div>
            </>
          ) : (
            <div style={{ color: '#4a3420', fontSize: '0.74rem',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', height: '100%',
                          fontStyle: 'italic', opacity: 0.6 }}>
              {layer === 'none'
                ? 'Выберите слой выше'
                : `Выберите ${layer === 'organs' ? 'орган' : 'чакру'} на рисунке`}
            </div>
          )}
        </div>

        {/* Список элементов */}
        {list.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.35)',
                        border: '1px solid #2a1808', borderRadius: 3, padding: 11 }}>
            <div style={{ fontSize: '0.56rem', color: '#5a3c18',
                          textTransform: 'uppercase', letterSpacing: '0.3em',
                          marginBottom: 8 }}>
              {layer === 'organs' ? 'Органы' : 'Чакры'}
            </div>
            {list.map(item => (
              <div key={item.id} onClick={() => pick(item)}
                style={{ display: 'flex', alignItems: 'center', gap: 6,
                         padding: '3px 5px', borderRadius: 2, cursor: 'pointer',
                         background: sel?.id === item.id
                           ? `${item.color}18` : 'transparent',
                         marginBottom: 2, transition: 'background 0.15s' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%',
                               background: item.color, flexShrink: 0,
                               boxShadow: `0 0 4px ${item.color}99` }}/>
                <span style={{ fontSize: '0.72rem',
                               color: sel?.id === item.id ? item.color : '#8a6840' }}>
                  {item.name}
                  {'ru' in item && (
                    <span style={{ color: '#4a3018', marginLeft: 3,
                                   fontSize: '0.62rem' }}>
                      · {item.ru}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
