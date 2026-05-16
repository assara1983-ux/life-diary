// src/components/AnatomyViewer.jsx
import React, { useState, useEffect, useRef } from 'react';

export function AnatomyViewer({ activeOrganId, onSelect }) {
  const [layers, setLayers] = useState({ organs: true, meridians: false, chakras: false });
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleClick = (e) => {
      const target = e.target.closest('[data-organ], [data-chakra]');
      if (target) {
        const type = target.dataset.organ ? 'organ' : 'chakra';
        const id = target.dataset.organ || target.dataset.chakra;
        onSelect({ type, id });
      }
    };
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [onSelect]);

  const toggleLayer = (name) => setLayers(p => ({ ...p, [name]: !p[name] }));

  return (
    <div className="anatomy-viewer-wrapper" ref={containerRef}>
      <style>{`
        .anatomy-viewer-wrapper { position: relative; width: 100%; max-width: 400px; margin: 0 auto; user-select: none; }
        .av-container { position: relative; width: 100%; height: 800px; border: 2px solid var(--blue); background: #fff; overflow: hidden; box-shadow: 0 0 10px rgba(0,112,192,0.1); }
        .av-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transition: opacity 0.3s ease; pointer-events: none; }
        .av-layer.hidden { opacity: 0; }
        .av-layer.interactive { pointer-events: auto; }
        .av-layer img, .av-layer svg { width: 100%; height: 100%; object-fit: contain; }
        .av-controls { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
        .av-btn { padding: 6px 12px; font-size: 11px; font-family: var(--font-mono); background: transparent; border: 1px solid var(--blue); color: var(--blue); cursor: pointer; text-transform: uppercase; border-radius: 2px; transition: 0.2s; }
        .av-btn.active { background: var(--blue); color: #fff; }
        @keyframes pulse-organ { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
      `}</style>

      <div className="av-container">
        <div className="av-layer base-layer"><img src="/assets/anatomy/meridian-body-base.png" alt="Base" /></div>
        <div className={`av-layer interactive ${!layers.organs ? 'hidden' : ''}`}>
          <img src="/assets/anatomy/organs.svg" alt="Organs" />
          {activeOrganId && layers.organs && (
            <style>{`.organ-path[data-organ="${activeOrganId}"] { fill: rgba(211,47,47,0.7) !important; stroke: #b71c1c !important; stroke-width: 2.5 !important; filter: drop-shadow(0 0 6px rgba(211,47,47,0.6)); animation: pulse-organ 2s infinite ease-in-out; }`}</style>
          )}
        </div>
        <div className={`av-layer ${!layers.meridians ? 'hidden' : ''}`}><img src="/assets/anatomy/meridians.svg" alt="Meridians" /></div>
        <div className={`av-layer interactive ${!layers.chakras ? 'hidden' : ''}`}><img src="/assets/anatomy/chakras.svg" alt="Chakras" /></div>
      </div>

      <div className="av-controls">
        <button className={`av-btn ${layers.organs ? 'active' : ''}`} onClick={() => toggleLayer('organs')}>Органы</button>
        <button className={`av-btn ${layers.meridians ? 'active' : ''}`} onClick={() => toggleLayer('meridians')}>Меридианы</button>
        <button className={`av-btn ${layers.chakras ? 'active' : ''}`} onClick={() => toggleLayer('chakras')}>Чакры</button>
      </div>
    </div>
  );
}
