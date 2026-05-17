// src/components/AnatomyViewer.jsx
import React, { useState } from 'react';
import { MeridianModal } from './MeridianModal';
import { ANATOMY_DATA } from '../data/anatomyKnowledge';

// SVG-пути органов (координаты под viewBox="0 0 334 599")
const ORGANS = [
  { id: 'brain',      label: 'Мозг',             cx: 165, cy: 123, rx: 22, ry: 15, color: '#f472b6' },
  { id: 'heart',      label: 'Сердце',            cx: 190, cy: 199, rx: 13, ry: 11, color: '#ef4444' },
  { id: 'lungs',      label: 'Лёгкие',            cx: 170, cy: 217, rx: 35, ry: 21, color: '#60a5fa' },
  { id: 'liver',      label: 'Печень',            cx: 153, cy: 242, rx: 20, ry: 13, color: '#a16207' },
  { id: 'stomach',    label: 'Желудок',           cx: 190, cy: 251, rx: 15, ry: 12, color: '#fbbf24' },
  { id: 'kidneys',    label: 'Почки',             cx: 176, cy: 244, rx: 22, ry: 13, color: '#a78bfa' },
  { id: 'intestines', label: 'Кишечник',          cx: 180, cy: 274, rx: 32, ry: 20, color: '#34d399' },
  { id: 'bladder',    label: 'Мочевой пузырь',    cx: 170, cy: 285, rx: 14, ry:  9, color: '#7dd3fc' },
];

const CHAKRAS = [
  { id: 'sahasrara',    label: 'Сахасрара',   cx: 170, cy:  84, r: 10, color: '#e9d5ff' },
  { id: 'ajna',         label: 'Аджна',       cx: 170, cy: 105, r:  9, color: '#818cf8' },
  { id: 'vishuddha',    label: 'Вишуддха',    cx: 170, cy: 142, r:  9, color: '#38bdf8' },
  { id: 'anahata',      label: 'Анахата',     cx: 170, cy: 176, r: 10, color: '#4ade80' },
  { id: 'manipura',     label: 'Манипура',    cx: 170, cy: 220, r: 10, color: '#fde047' },
  { id: 'svadhisthana', label: 'Свадхистхана',cx: 170, cy: 256, r:  9, color: '#fb923c' },
  { id: 'muladhara',    label: 'Муладхара',   cx: 170, cy: 280, r:  9, color: '#f87171' },
];

export function AnatomyViewer({ activeOrganId }) {
  const [tab, setTab] = useState('organs'); // 'organs' | 'chakras'
  const [modalData, setModalData] = useState(null);

  const handleClick = (id) => {
    const data = ANATOMY_DATA[id];
    if (data) setModalData({ ...data, id });
  };

  return (
    <div style={{ width: '100%', maxWidth: 400, margin: '0 auto', userSelect: 'none' }}>
      <style>{`
        .av-wrap { position: relative; width: 100%; border: 2px solid var(--blue, #0070c0); overflow: hidden; box-shadow: 0 0 10px rgba(0,112,192,0.1); }
        .av-img { width: 100%; height: auto; display: block; }
        .av-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        .av-shape { cursor: pointer; transition: opacity 0.3s, filter 0.3s; }
        .av-shape.active { filter: drop-shadow(0 0 8px currentColor); animation: av-pulse 2s infinite ease-in-out; }
        .av-shape.inactive { opacity: 0.08; }
        .av-shape.manual { opacity: 0.55; }
        @keyframes av-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        .av-tabs { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
        .av-tab { padding: 6px 18px; font-size: 11px; font-family: var(--font-mono, monospace); background: transparent; border: 1px solid var(--blue, #0070c0); color: var(--blue, #0070c0); cursor: pointer; text-transform: uppercase; border-radius: 2px; transition: 0.2s; }
        .av-tab.active { background: var(--blue, #0070c0); color: #fff; }
        .av-selector { margin-top: 16px; }
        .av-selector-title { font-family: var(--font-mono, monospace); font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .av-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .av-btn { padding: 5px 10px; font-size: 11px; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; background: #fff; transition: 0.15s; display: flex; align-items: center; gap: 4px; }
        .av-btn:hover { border-color: var(--blue, #0070c0); color: var(--blue, #0070c0); }
        .av-btn.selected { background: var(--blue, #0070c0); color: #fff; border-color: var(--blue, #0070c0); }
      `}</style>

      {/* Изображение + SVG оверлей */}
      <div className="av-wrap">
        <img
          className="av-img"
          src="/assets/anatomy/meridian-body-base.png"
          alt="Тело"
        />
        <svg className="av-svg" viewBox="0 0 334 599" preserveAspectRatio="xMidYMid meet">
          {tab === 'organs' && ORGANS.map(o => {
            const isActive = o.id === activeOrganId;
            const hasActive = !!activeOrganId;
            const cls = hasActive
              ? isActive ? 'av-shape active' : 'av-shape inactive'
              : 'av-shape manual';
            return (
              <ellipse
                key={o.id}
                className={cls}
                cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry}
                fill={o.color + '88'}
                stroke={o.color}
                strokeWidth="1.5"
                style={{ color: o.color, transformOrigin: `${o.cx}px ${o.cy}px` }}
                onClick={() => handleClick(o.id)}
              />
            );
          })}
          {tab === 'chakras' && CHAKRAS.map(c => (
            <circle
              key={c.id}
              className="av-shape manual"
              cx={c.cx} cy={c.cy} r={c.r}
              fill={c.color + 'aa'}
              stroke={c.color}
              strokeWidth="1.5"
              style={{ color: c.color, transformOrigin: `${c.cx}px ${c.cy}px` }}
              onClick={() => handleClick(c.id)}
            />
          ))}
        </svg>
      </div>

      {/* Переключатель вкладок */}
      <div className="av-tabs">
        <button className={`av-tab ${tab === 'organs' ? 'active' : ''}`} onClick={() => setTab('organs')}>Органы</button>
        <button className={`av-tab ${tab === 'chakras' ? 'active' : ''}`} onClick={() => setTab('chakras')}>Чакры</button>
      </div>

      {/* Форма ручного выбора */}
      <div className="av-selector">
        <div className="av-selector-title">
          {tab === 'organs' ? 'Выберите орган' : 'Выберите чакру'}
        </div>
        <div className="av-grid">
          {tab === 'organs' && ORGANS.map(o => (
            <button
              key={o.id}
              className="av-btn"
              onClick={() => handleClick(o.id)}
            >
              <span>{ANATOMY_DATA[o.id]?.emoji || '●'}</span>
              {o.label}
            </button>
          ))}
          {tab === 'chakras' && CHAKRAS.map(c => (
            <button
              key={c.id}
              className="av-btn"
              onClick={() => handleClick(c.id)}
            >
              <span>{ANATOMY_DATA[c.id]?.emoji || '●'}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Модальное окно */}
      {modalData && (
        <MeridianModal
          data={modalData}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  );
              }
