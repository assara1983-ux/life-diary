// src/sections/PetsSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';

export function PetsSection() {
  const { profile, setProfile, petLog, setPetLog, notify } = useApp();
  const [adviceOpen, setAdviceOpen] = useState(true);
  
  const pets = profile.pets || [];
  const today = new Date().toISOString().split("T")[0];

  const petEmoji = (type) => ({
    "Кошка": "🐱", "Собака": "🐶", "Попугай": "🦜", "Кролик": "🐰", "Хомяк": "🐹", "Черепаха": "🐢"
  }[type] || "🐾");

  const markFeed = (petId, idx) => {
    const c = petLog[today]?.[petId] || [];
    const n = c.includes(idx) ? c.filter(x => x !== idx) : [...c, idx];
    setPetLog(p => ({ ...p, [today]: { ...(p[today] || {}), [petId]: n } }));
  };

  return (
    <div>
      {/* Шапка питомцев */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: T.text2 }}>Питомцы: {pets.length}</span>
      </div>

      {/* Советы по уходу */}
      {pets.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <AiBox 
            profile={profile}
            label="🐾 Уход за питомцами"
            prompt={`Дай советы по уходу за моими питомцами: ${pets.map(p => `${p.name} (${p.type})`).join(', ')}.`}
            btnText="Советы по уходу"
          />
        </div>
      )}

      {pets.length === 0 ? (
        <div className="empty">
          <span className="empty-ico">🐾</span>
          <p>Питомцев нет. Добавь их в профиле!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pets.map(pet => {            const feeds = parseInt(pet.feedTimes) || 2;
            const log = petLog[today]?.[pet.id] || [];
            const labels = feeds === 1 ? ["День"] : feeds === 2 ? ["Утро", "Вечер"] : ["1", "2", "3", "4"];

            return (
              <div key={pet.id} className="card" style={{ borderLeft: `3px solid ${T.teal}` }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: `linear-gradient(135deg, ${T.teal}66, ${T.tealD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {petEmoji(pet.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 20, color: T.text0, marginBottom: 3 }}>{pet.name}</div>
                    <div style={{ fontSize: 13, color: T.text3 }}>{pet.type}{pet.breed ? ` · ${pet.breed}` : ""}</div>
                    {pet.food && <div style={{ fontSize: 13, color: T.text2, marginTop: 2 }}>🍽 {pet.food}</div>}
                  </div>
                </div>

                {/* Кормление */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>
                    Кормление ({log.length}/{feeds})
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Array.from({ length: feeds }, (_, i) => (
                      <button 
                        key={i} 
                        className={`feed-btn ${log.includes(i) ? "done" : ""}`} 
                        onClick={() => markFeed(pet.id, i)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, fontSize: 13,
                          border: `1px solid ${T.bdr}`, 
                          background: log.includes(i) ? 'rgba(78,201,190,0.12)' : 'transparent',
                          color: log.includes(i) ? T.teal : T.text3,
                          cursor: 'pointer', transition: 'all .18s'
                        }}
                      >
                        {log.includes(i) ? "✓ " : " "}{labels[i]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Вакцинация и Антипаразит (заглушки, если есть данные в pet) */}
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                   {/* Здесь можно добавить логику дат, если она есть в pet.vacDate */}
                </div>
              </div>
            );
          })}
        </div>      )}
    </div>
  );
}
