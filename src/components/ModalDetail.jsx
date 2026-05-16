// src/components/ModalDetail.jsx
import React, { useEffect } from 'react';

export function ModalDetail({ isOpen, onClose, title, description, warning, rules, benefit }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{`
        .modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,15,30,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fade-in 0.2s ease-out; }
        .md-modal { background: #f5f0e1; border: 2px solid #0070c0; width: 100%; max-width: 600px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; border-radius: 4px; }
        .md-header { padding: 16px 20px; border-bottom: 1px solid rgba(0,112,192,0.2); display: flex; justify-content: space-between; align-items: center; background: rgba(0,112,192,0.05); }
        .md-title { font-family: var(--font-head, 'Cinzel', serif); font-size: 20px; color: #0070c0; margin: 0; font-weight: 600; }
        .md-close { background: transparent; border: none; font-size: 24px; color: #0070c0; cursor: pointer; opacity: 0.7; transition: 0.2s; }
        .md-close:hover { opacity: 1; transform: scale(1.1); }
        .md-body { padding: 20px; overflow-y: auto; font-family: var(--font-main, 'Crimson Pro', serif); color: #2c2c2c; line-height: 1.6; font-size: 16px; }
        .md-section { margin-bottom: 20px; padding: 12px; border-left: 3px solid #0070c0; background: rgba(255,255,255,0.5); }
        .md-section h4 { margin: 0 0 8px 0; font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
        .md-warning { border-left-color: #d32f2f; background: rgba(211,47,47,0.05); }
        .md-warning h4 { color: #d32f2f; }
        .md-benefit { border-left-color: #2d6a4f; background: rgba(45,106,79,0.05); }
        .md-benefit h4 { color: #2d6a4f; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <div className="md-modal" onClick={(e) => e.stopPropagation()}>
        <div className="md-header">
          <h2 className="md-title">{title || 'Информация'}</h2>
          <button className="md-close" onClick={onClose}>&times;</button>
        </div>
        <div className="md-body">
          {description && <div className="md-section"><h4>Описание</h4><p style={{margin:0}}>{description}</p></div>}
          {benefit && <div className="md-section md-benefit"><h4>Польза</h4><p style={{margin:0}}>{benefit}</p></div>}
          {rules && <div className="md-section"><h4>Протокол</h4><p style={{margin:0, fontFamily:'var(--font-mono)', fontSize:14, whiteSpace:'pre-wrap'}}>{rules}</p></div>}
          {warning && <div className="md-section md-warning"><h4>Предостережения</h4><p style={{margin:0, fontWeight:500}}>{warning}</p></div>}
        </div>
        <div style={{padding:'12px 20px', borderTop:'1px solid rgba(0,112,192,0.2)', textAlign:'right', background:'rgba(0,112,192,0.05)'}}>
          <button onClick={onClose} style={{padding:'8px 24px', background:'#0070c0', color:'#fff', border:'none', cursor:'pointer', fontFamily:'var(--font-mono)'}}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
