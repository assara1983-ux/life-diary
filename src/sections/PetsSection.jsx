// src/sections/PetsSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

const PET_TYPES = ["Кошка", "Собака", "Попугай", "Кролик", "Хомяк", "Черепаха", "Рыбки", "Другое"];

function newPet() {
  return {
    id: Date.now() + Math.random(),
    name: "", type: "Кошка", breed: "", dob: "",
    food: "", feedTimes: "2", weightKg: "3.5",
    notes: "", vacDate: "", parasiteDate: "",
  };
}

function PetEditForm({ pet, onSave, onCancel }) {
  const [f, setF] = useState(pet);
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={{ background: 'rgba(0,112,192,0.04)', border: '1px solid rgba(0,112,192,0.2)',
      borderRadius: 10, padding: 14, marginBottom: 14 }}>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:T.text3, display:'block', marginBottom:4 }}>Кличка</label>
          <input value={f.name} onChange={e=>u('name', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:7,
              border:`1px solid ${T.bdr}`, fontSize:14 }} />
        </div>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:T.text3, display:'block', marginBottom:4 }}>Вид</label>
          <select value={f.type} onChange={e=>u('type', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:7,
              border:`1px solid ${T.bdr}`, fontSize:14 }}>
            {PET_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:T.text3, display:'block', marginBottom:4 }}>Порода</label>
          <input value={f.breed||''} onChange={e=>u('breed', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:7,
              border:`1px solid ${T.bdr}`, fontSize:14 }} />
        </div>
        <div style={{ width:100 }}>
          <label style={{ fontSize:11, color:T.text3, display:'block', marginBottom:4 }}>Вес (кг)</label>
          <input type="number" step="0.1" value={f.weightKg||''} onChange={e=>u('weightKg', e.target.value)}
            style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:7,
              border:`1px solid ${T.bdr}`, fontSize:14 }} />
        </div>
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:11, color:T.text3, display:'block', marginBottom:4 }}>Корм</label>
        <input value={f.food||''} onChange={e=>u('food', e.target.value)}
          placeholder="Например: Royal Canin для стерилизованных кошек"
          style={{ width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:7,
            border:`1px solid ${T.bdr}`, fontSize:14 }} />
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:11, color:T.text3, display:'block', marginBottom:4 }}>Кормлений в день</label>
        <div style={{ display:'flex', gap:8 }}>
          {["1","2","3","4"].map(v => (
            <div key={v} onClick={()=>u('feedTimes', v)}
              style={{ padding:'7px 16px', borderRadius:8, cursor:'pointer',
                border:`1px solid ${f.feedTimes===v?T.teal:T.bdr}`,
                background: f.feedTimes===v ? 'rgba(78,201,190,0.15)' : 'transparent',
                color: f.feedTimes===v ? T.teal : T.text3, fontSize:14 }}>
              {v}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=>onSave(f)}
          style={{ flex:1, padding:'9px 0', borderRadius:8, border:'none', cursor:'pointer',
            background:T.teal, color:'#fff', fontWeight:600, fontSize:14 }}>
          ✓ Сохранить
        </button>
        <button onClick={onCancel}
          style={{ padding:'9px 16px', borderRadius:8, cursor:'pointer',
            border:`1px solid ${T.bdr}`, background:'transparent', color:T.text3, fontSize:14 }}>
          Отмена
        </button>
      </div>
    </div>
  );
}

export function PetsSection() {
  const { profile, setProfile, petLog, setPetLog, notify } = useApp();
  const [adviceOpen, setAdviceOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [addingNew, setAddingNew] = useState(false);

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

  const savePet = (updated) => {
    setProfile(p => ({ ...p, pets: (p.pets||[]).map(pt => pt.id===updated.id ? updated : pt) }));
    setEditingId(null);
    notify?.('✅ Данные питомца обновлены');
  };

  const deletePet = (id) => {
    if (!window.confirm('Удалить питомца из профиля?')) return;
    setProfile(p => ({ ...p, pets: (p.pets||[]).filter(pt => pt.id!==id) }));
    notify?.('🗑️ Питомец удалён');
  };

  const saveNewPet = (f) => {
    setProfile(p => ({ ...p, pets: [...(p.pets||[]), f] }));
    setAddingNew(false);
    notify?.('✅ Питомец добавлен');
  };

  return (
    <div>
      {/* Шапка питомцев */}
      <div style={{ display: 'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: T.text2 }}>Питомцы: {pets.length}</span>
        {!addingNew && (
          <button onClick={()=>setAddingNew(true)}
            style={{ padding:'6px 14px', borderRadius:8, cursor:'pointer',
              border:`1px solid ${T.teal}`, background:'transparent', color:T.teal,
              fontSize:13, fontWeight:600 }}>
            + Добавить питомца
          </button>
        )}
      </div>

      {addingNew && (
        <PetEditForm pet={newPet()} onSave={saveNewPet} onCancel={()=>setAddingNew(false)} />
      )}

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

      {pets.length === 0 && !addingNew ? (
        <div className="empty">
          <span className="empty-ico">🐾</span>
          <p>Питомцев нет. Добавь их кнопкой выше!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pets.map(pet => {            const feeds = parseInt(pet.feedTimes) || 2;
            const log = petLog[today]?.[pet.id] || [];
            const labels = feeds === 1 ? ["День"] : feeds === 2 ? ["Утро", "Вечер"] : ["1", "2", "3", "4"];

            if (editingId === pet.id) {
              return (
                <PetEditForm key={pet.id} pet={pet}
                  onSave={savePet} onCancel={()=>setEditingId(null)} />
              );
            }

            return (
              <div key={pet.id} className="card" style={{ borderLeft: `3px solid ${T.teal}` }}>
      <SectionHero sectionId="pets" />
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: `linear-gradient(135deg, ${T.teal}66, ${T.tealD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {petEmoji(pet.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 20, color: T.text0, marginBottom: 3 }}>{pet.name}</div>
                    <div style={{ fontSize: 13, color: T.text3 }}>{pet.type}{pet.breed ? ` · ${pet.breed}` : ""}{pet.weightKg ? ` · ${pet.weightKg} кг` : ""}</div>
                    {pet.food && <div style={{ fontSize: 13, color: T.text2, marginTop: 2 }}>🍽 {pet.food}</div>}
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={()=>setEditingId(pet.id)} title="Исправить данные"
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:17, opacity:0.6 }}>✏️</button>
                    <button onClick={()=>deletePet(pet.id)} title="Удалить питомца"
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:17, opacity:0.45 }}>🗑️</button>
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

