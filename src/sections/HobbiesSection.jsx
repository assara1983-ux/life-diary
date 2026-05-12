// src/sections/HobbiesSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

export function HobbiesSection() {
  const { profile, hobbies, setHobbies } = useApp();
  const [modal, setModal] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [nh, setNh] = useState({ name: '', goal: '', notes: '' });

  const logSession = (id) => {
    setHobbies(p => p.map(h => h.id === id ? { ...h, sessions: [...(h.sessions || []), new Date().toISOString().split('T')[0]] } : h));
  };

  return (
    <div>
      {/* Советы по хобби */}
      <div style={{ marginBottom: 12 }}>
        <div onClick={() => setAdviceOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: adviceOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: 16 }}>🎨</span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>Советы по хобби</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{adviceOpen ? '▲' : '▼'}</span>
        </div>
        {adviceOpen && (
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <AiBox 
              kb={buildKB(profile)} 
              prompt={`Хобби: ${(profile.hobbies || []).join(', ') || '—'}. Проект: ${profile.hobbyProject || '—'}. Свободное время: с ${profile.workEnd || '18:00'} до ${profile.sleep || '23:00'}. Дай конкретный план развития хобби.`}
              label="Хобби и увлечения" 
              btnText="Советы по хобби" 
              placeholder="Анализирую профиль и составляю конкретный план для хобби..." 
            />
          </div>
        )}
      </div>

      {/* Список хобби */}
      <div onClick={() => setListOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: listOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: listOpen ? 0 : 8 }}>
        <span style={{ fontSize: 16 }}>🎨</span>
        <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>Мои хобби</span>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); setModal(true); }}>+</button>
        <span style={{ fontSize: 11, color: T.text3 }}>{listOpen ? '▲' : '▼'}</span>
      </div>

      {listOpen && (
        <div>
          {hobbies.length === 0 && (            <div className="empty">
              <span className="empty-ico">🎨</span>
              <p>Добавь свои хобби</p>
            </div>
          )}
          {hobbies.map(h => {
            const wk = (h.sessions || []).filter(s => (new Date() - new Date(s)) / 86400000 <= 7).length;
            return (
              <div key={h.id} className="hobby-card">
      <SectionHero sectionId="hobbies" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 20, color: T.text0 }}>{h.name}</div>
                  <div className="ico-btn danger" onClick={() => setHobbies(p => p.filter(x => x.id !== h.id))}>✕</div>
                </div>
                {h.goal && <div style={{ fontSize: 13, color: T.text3, marginBottom: 8, fontStyle: 'italic' }}>✦ {h.goal}</div>}
                <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
                  <span className="badge bp">За неделю: {wk} сессий</span>
                  <span className="badge bm">Всего: {(h.sessions || []).length}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => logSession(h.id)}>✓ Занимался(ась) сегодня</button>
              </div>
            );
          })}
          {hobbies.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setModal(true)}>+ Добавить хобби</button>
          )}
        </div>
      )}

      {/* Модалка добавления хобби */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setModal(false)}>✕</span>
            <div className="modal-title">Новое хобби</div>
            <div className="fld">
              <label>Название</label>
              <input placeholder="Фотография, чтение, вязание..." value={nh.name} onChange={e => setNh(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="fld">
              <label>Цель / проект</label>
              <input placeholder="Освоить ретушь, прочитать 12 книг..." value={nh.goal} onChange={e => setNh(p => ({ ...p, goal: e.target.value }))} />
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => { if (!nh.name.trim()) return; setHobbies(p => [...p, { ...nh, id: Date.now(), sessions: [] }]); setModal(false); }}>Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>  );
}

function buildKB(p) {
  return `Профиль: ${p.name || '—'}, ${p.gender || '—'}. Работа: ${p.profession || '—'}. Свободное время: с ${p.workEnd || '18:00'} до ${p.sleep || '23:00'}.`;
}
