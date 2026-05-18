// src/components/AnatomyViewer.jsx
import React, { useState, useEffect } from 'react';
import { ANATOMY_DATA } from '../data/anatomyKnowledge';

const BASE = '/assets/anatomy';

const CHAKRAS = [
  { id: 'sahasrara',    name: 'Сахасрара',    ru: 'Корона',             color: '#9333ea', cx: 170, cy: 84,  r: 12 },
  { id: 'ajna',         name: 'Аджна',         ru: 'Третий глаз',       color: '#4f46e5', cx: 170, cy: 127, r: 10 },
  { id: 'vishuddha',    name: 'Вишуддха',      ru: 'Горло',             color: '#0891b2', cx: 170, cy: 170, r: 10 },
  { id: 'anahata',      name: 'Анахата',       ru: 'Сердце',            color: '#16a34a', cx: 170, cy: 211, r: 12 },
  { id: 'manipura',     name: 'Манипура',      ru: 'Солн. сплетение',   color: '#ca8a04', cx: 170, cy: 256, r: 10 },
  { id: 'svadhisthana', name: 'Свадхистхана',  ru: 'Крестец',           color: '#ea580c', cx: 170, cy: 292, r: 10 },
  { id: 'muladhara',    name: 'Муладхара',     ru: 'Корень',            color: '#dc2626', cx: 170, cy: 310, r: 12 },
];

const ORGANS = [
  { id: 'brain',       name: 'Мозг',           color: '#f472b6', cx: 165, cy: 123, rx: 22, ry: 15 },
  { id: 'heart',       name: 'Сердце',          color: '#ef4444', cx: 190, cy: 199, rx: 13, ry: 11 },
  { id: 'lungs',       name: 'Лёгкие',          color: '#60a5fa', shapes: [{ cx: 191, cy: 217, rx: 16, ry: 21 }, { cx: 149, cy: 217, rx: 16, ry: 21 }] },
  { id: 'liver',       name: 'Печень',          color: '#a16207', cx: 153, cy: 242, rx: 20, ry: 13 },
  { id: 'stomach',     name: 'Желудок',         color: '#fbbf24', cx: 190, cy: 251, rx: 15, ry: 12 },
  { id: 'kidneys',     name: 'Почки',           color: '#a78bfa', shapes: [{ cx: 198, cy: 241, rx: 10, ry: 13 }, { cx: 154, cy: 248, rx: 10, ry: 13 }] },
  { id: 'intestines',  name: 'Кишечник',        color: '#34d399', cx: 180, cy: 274, rx: 32, ry: 20 },
  { id: 'bladder',     name: 'Мочевой пузырь',  color: '#7dd3fc', cx: 170, cy: 285, rx: 14, ry: 9  },
];

const W = 334, H = 599;

function OrganIcon({ o, active }) {
  const PAD = 8;
  let x, y, w, h;
  if (o.shapes) {
    const xs = o.shapes.flatMap(s => [s.cx - s.rx, s.cx + s.rx]);
    const ys = o.shapes.flatMap(s => [s.cy - s.ry, s.cy + s.ry]);
    x = Math.min(...xs) - PAD; y = Math.min(...ys) - PAD;
    w = Math.max(...xs) + PAD - x; h = Math.max(...ys) + PAD - y;
  } else {
    x = o.cx - o.rx - PAD; y = o.cy - o.ry - PAD;
    w = (o.rx + PAD) * 2;  h = (o.ry + PAD) * 2;
  }
  return (
    <image href={`${BASE}/organ-${o.id}.svg`} x={x} y={y} width={w} height={h}
      style={{
        opacity: active ? 1 : 0.18, transition: 'opacity 0.25s',
        filter: active ? `drop-shadow(0 0 7px ${o.color})` : 'none',
        pointerEvents: 'none',
      }} />
  );
}

function OrganHit({ o, active, onClick }) {
  const fill = active ? o.color + '44' : 'transparent';
  const stroke = active ? o.color : 'transparent';
  if (o.shapes) {
    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        {o.shapes.map((s, i) => (
          <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
            fill={fill} stroke={stroke} strokeWidth={active ? 2 : 0}
            style={{ transition: 'all 0.2s' }} />
        ))}
      </g>
    );
  }
  return (
    <ellipse cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry}
      fill={fill} stroke={stroke} strokeWidth={active ? 2 : 0}
      onClick={onClick} style={{ cursor: 'pointer', transition: 'all 0.2s' }} />
  );
}

function ChakraIcon({ ch, active, onClick }) {
  const size = (ch.r + 9) * 2 + 4;
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <image href={`${BASE}/chakra-${ch.id}.svg`}
        x={ch.cx - size / 2} y={ch.cy - size / 2} width={size} height={size}
        style={{
          opacity: active ? 1 : 0.22, transition: 'opacity 0.25s',
          filter: active ? `drop-shadow(0 0 9px ${ch.color})` : 'none',
        }} />
      <circle cx={ch.cx} cy={ch.cy} r={ch.r + 9} fill="transparent" />
    </g>
  );
}

function ActiveLabel({ item, isChakra }) {
  const lx = item.cx;
  const ly = isChakra
    ? item.cy - item.r - 12
    : (item.shapes
        ? Math.min(...item.shapes.map(s => s.cy - s.ry)) - 6
        : item.cy - item.ry - 6);
  return (
    <text x={lx} y={ly} textAnchor="middle" fontSize="7"
      fill={item.color} fontStyle="italic"
      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 3px ${item.color}99)` }}>
      {item.name}
    </text>
  );
}

function InfoModal({ data, color, onClose }) {
  if (!data) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: 0,
    }} onClick={onClose}>
      <div style={{
        background: '#fff',
        border: `2px solid ${color}66`,
        borderRadius: '12px 12px 0 0',
        padding: '20px 16px 32px',
        maxWidth: 480,
        width: '100%',
        maxHeight: '82vh',
        overflowY: 'auto',
        boxShadow: `0 -4px 40px ${color}33`,
        position: 'relative',
        color: '#333',
        WebkitOverflowScrolling: 'touch',
      }} onClick={e => e.stopPropagation()}>

        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 14,
          background: 'transparent', border: 'none',
          color: '#aaa', fontSize: 20, cursor: 'pointer', lineHeight: 1,
        }}>✕</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 30 }}>{data.emoji || '●'}</span>
          <div>
            <div style={{ fontSize: 18, color, fontWeight: 700 }}>{data.title}</div>
            {data.time && data.time !== '—' && (
              <div style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>
                ⏱ {data.time} · {data.element}
              </div>
            )}
            {data.element && (!data.time || data.time === '—') && (
              <div style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>
                ✦ {data.element}
              </div>
            )}
          </div>
        </div>

        {data.desc && (
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>
            {data.desc}
          </p>
        )}

        {data.diseases && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase',
              letterSpacing: '0.3em', marginBottom: 4 }}>Уязвимости</div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{data.diseases}</div>
          </div>
        )}

        {data.recommendation && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase',
              letterSpacing: '0.3em', marginBottom: 4 }}>Рекомендации</div>
            <div style={{ fontSize: 12, color: '#4a7a40', lineHeight: 1.5 }}>{data.recommendation}</div>
          </div>
        )}

        {data.breathing && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase',
              letterSpacing: '0.3em', marginBottom: 4 }}>Дыхание</div>
            <div style={{ fontSize: 12, color: '#4a6a8a', lineHeight: 1.5 }}>{data.breathing}</div>
          </div>
        )}

        {data.warning && (
          <div style={{
            background: '#fff0f0', border: '1px solid #f4444466',
            borderRadius: 4, padding: '8px 12px',
            fontSize: 12, color: '#d32f2f', lineHeight: 1.5, marginTop: 4,
          }}>
            {data.warning}
          </div>
        )}
      </div>
    </div>
  );
}

export function AnatomyViewer({ activeOrganId, onSelect }) {
  const [layer, setLayer] = useState('organs');
  const [sel,   setSel]   = useState(null);
  const [modal, setModal] = useState(null);

  useEffect(() => { setSel(null); }, [activeOrganId]);

  const handlePick = (item) => {
    const isDeselect = sel?.id === item.id;
    setSel(isDeselect ? null : item);
    if (!isDeselect) {
      const data = ANATOMY_DATA[item.id];
      if (data) {
        if (onSelect) onSelect({ ...data, id: item.id });
        setModal({ data, color: item.color });
      }
    }
  };

  const getActiveId = (item) => {
    if (sel) return sel.id === item.id;
    if (layer === 'organs' && activeOrganId) return activeOrganId === item.id;
    return false;
  };

  const list = layer === 'organs' ? ORGANS : CHAKRAS;

  return (
    <div style={{ fontFamily: 'var(--font-mono, monospace)', userSelect: 'none' }}>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[{ id: 'organs', label: '✦ Органы' }, { id: 'chakras', label: '◎ Чакры' }].map(t => (
          <button key={t.id} onClick={() => { setLayer(t.id); setSel(null); }}
            style={{
              padding: '5px 16px', borderRadius: 3, fontSize: 12,
              background: layer === t.id ? 'var(--blue,#0070c0)' : 'transparent',
              border: '1px solid var(--blue,#0070c0)',
              color: layer === t.id ? '#fff' : 'var(--blue,#0070c0)',
              cursor: 'pointer', fontFamily: 'var(--font-mono,monospace)',
              textTransform: 'uppercase',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Подсказка У-Син */}
      {layer === 'organs' && activeOrganId && !sel && (
        <div style={{
          background: 'rgba(0,112,192,0.06)', borderLeft: '3px solid var(--blue,#0070c0)',
          padding: '7px 12px', fontSize: 11, color: 'var(--blue,#0070c0)',
          fontFamily: 'monospace', marginBottom: 12,
        }}>
          ✦ Сейчас активен по У-Син — кликни на подсвеченный орган для справки.
        </div>
      )}

      {/* Layout: тело + список */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Тело */}
        <div style={{
          position: 'relative', width: W, height: H, flexShrink: 0,
          border: '1.5px solid #7a5520', borderRadius: 4,
          boxShadow: '0 0 0 1px #3a200a, 0 6px 28px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${BASE}/meridian-body-base.png)`,
            backgroundSize: '100% 100%',
          }} />
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
            style={{ position: 'absolute', inset: 0 }}>
            {layer === 'organs' && ORGANS.map(o => {
              const active = getActiveId(o);
              return (
                <g key={o.id}>
                  <OrganIcon o={o} active={active} />
                  <OrganHit  o={o} active={active} onClick={() => handlePick(o)} />
                  {active && <ActiveLabel item={o} isChakra={false} />}
                </g>
              );
            })}
            {layer === 'chakras' && CHAKRAS.map(ch => {
              const active = getActiveId(ch);
              return (
                <g key={ch.id}>
                  <ChakraIcon ch={ch} active={active} onClick={() => handlePick(ch)} />
                  {active && <ActiveLabel item={ch} isChakra={true} />}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Список справа */}
        <div style={{
          flex: 1, minWidth: 160,
          border: '1px solid rgba(0,112,192,0.15)',
          borderRadius: 3, padding: 10,
          background: 'rgba(0,0,0,0.02)',
        }}>
          <div style={{
            fontSize: 10, color: '#aaa', textTransform: 'uppercase',
            letterSpacing: '0.3em', marginBottom: 10,
          }}>
            {layer === 'organs' ? 'Органы' : 'Чакры'}
          </div>
          {list.map(item => {
            const active = getActiveId(item);
            const isUsin = layer === 'organs' && item.id === activeOrganId && !sel;
            return (
              <div key={item.id} onClick={() => handlePick(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 6px', borderRadius: 3, cursor: 'pointer',
                  background: active ? `${item.color}14` : 'transparent',
                  marginBottom: 2, transition: 'background 0.15s',
                }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: item.color, flexShrink: 0,
                  boxShadow: isUsin ? `0 0 6px ${item.color}` : 'none',
                }} />
                <span style={{
                  fontSize: 12,
                  color: active ? item.color : '#555',
                  fontWeight: isUsin ? 700 : 400,
                }}>
                  {ANATOMY_DATA[item.id]?.emoji || ''} {item.name}
                </span>
                {isUsin && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 9,
                    background: item.color, color: '#fff',
                    padding: '1px 5px', borderRadius: 2,
                    fontFamily: 'monospace',
                  }}>СЕЙЧАС</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes av-pulse {
          0%,100% { opacity:1; } 50% { opacity:0.5; }
        }
      `}</style>

      {modal && (
        <InfoModal data={modal.data} color={modal.color} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
