// src/sections/TravelSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

// Хелпер для открытия Google Calendar
function openGCal(title, date, desc = '') {
  const s = new Date(date), e = new Date(s.getTime() + 3600000);
  const f = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  window.open(
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${f(s)}/${f(e)}` +
    `&details=${encodeURIComponent(desc)}`,
    '_blank'
  );
}

export function TravelSection() {
  const { profile, trips, setTrips, notify } = useApp();
  const [modal, setModal] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(true);
  const [tripsOpen, setTripsOpen] = useState(true);
  const [nt, setNt] = useState({ destination: '', targetDate: '', budget: '', saved: '', stage: '💭 Мечта', notes: '' });
  const [checkin, setCheckin] = useState({});
  const [checking, setChecking] = useState({});

  const stages = ['💭 Мечта', '🗺️ Планирую', '💰 Коплю', '🎫 Билеты куплены', '🏨 Забронировано', '🧳 Собираю вещи', '✅ Всё готово'];
  const pct = s => Math.round((stages.indexOf(s) + 1) / stages.length * 100);

  const upd = (id, k, v) => setTrips(p => p.map(t => t.id === id ? { ...t, [k]: v } : t));

  const getCheckin = async (trip) => {
    setChecking(p => ({ ...p, [trip.id]: true }));
    // Здесь должен быть вызов AI, пока заглушка
    const r = `Прогресс по поездке в ${trip.destination}. Стадия: ${trip.stage}. ${trip.budget ? `Бюджет: ${trip.budget}₸, отложено: ${trip.saved || 0}₸.` : ''} Следующие шаги: 1) Уточнить даты 2) Начать копить`;
    setCheckin(p => ({ ...p, [trip.id]: r }));
    setChecking(p => ({ ...p, [trip.id]: false }));
  };

  return (
    <div>
      {/* Советы по поездкам */}
      <div onClick={() => setAdviceOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: adviceOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 16 }}>✈️</span>
        <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.info, fontWeight: 500 }}>Советы по поездкам</span>
        <span style={{ fontSize: 11, color: T.text3 }}>{adviceOpen ? '▲' : '▼'}</span>
      </div>
      {adviceOpen && (        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
          <AiBox 
            kb={JSON.stringify(profile)} 
            prompt={`ПОЕЗДКИ:\n${trips.length > 0 ? trips.map(t => `- ${t.destination}: стадия ${t.stage}${t.budget ? `, бюджет ${t.budget} ₸` : ''}${t.saved ? `, отложено ${t.saved} ₸` : ''}${t.targetDate ? `, дата ${t.targetDate}` : ''}`).join('\n') : 'Поездок пока нет'}\n\nПРОФИЛЬ: доход/финансы — ${profile.income || '—'}, работа до ${profile.workEnd || '18:00'}, отпуск ${profile.vacationDays || '?'} дней в год\n\nДай конкретный план:\n1. [Накопления] Конкретная сумма в месяц для откладывания под каждую поездку\n2. [Следующий шаг] Одно конкретное действие для продвижения по каждой поездке\n3. [Логистика] Рекомендации по оптимальному времени поездки и билетам из Казахстана`}
            label="Путешествия" 
            btnText="Советы по путешествиям" 
            placeholder="Анализирую поездки и составляю конкретный план..." 
          />
        </div>
      )}

      {/* Мои поездки */}
      <div onClick={() => setTripsOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: tripsOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: tripsOpen ? 0 : 8 }}>
        <span style={{ fontSize: 16 }}>✈️</span>
        <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.info, fontWeight: 500 }}>Мои поездки</span>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); setModal(true); }}>+ Добавить</button>
        <span style={{ fontSize: 11, color: T.text3 }}>{tripsOpen ? '▲' : '▼'}</span>
      </div>

      {tripsOpen && (
        <div>
          {trips.length === 0 && (
            <div className="empty">
              <span className="empty-ico">✈️</span>
              <p>Поездок нет. Добавь мечту!</p>
            </div>
          )}
          {trips.map(trip => {
            const progress = pct(trip.stage || '💭 Мечта');
            const savedPct = trip.budget && trip.saved ? Math.min(100, Math.round(parseInt(trip.saved) / parseInt(trip.budget) * 100)) : 0;
            return (
              <div key={trip.id} className="trip-card">
      <SectionHero sectionId="travel" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 22, color: T.text0 }}>✈ {trip.destination}</div>
                  <div className="ico-btn danger" onClick={() => setTrips(p => p.filter(t => t.id !== trip.id))}>✕</div>
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className="badge bi">{trip.stage}</span>
                  {trip.targetDate && <span className="badge bm">📅 {trip.targetDate}</span>}
                  {trip.budget && <span className="badge bg">💰 {trip.budget}₽</span>}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>Подготовка {progress}%</div>
                  <div className="prog">
                    <div className="prog-fill" style={{ width: progress + '%', background: `linear-gradient(90deg,${T.info}, ${T.teal})` }} />
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
                    {stages.map((s, i) => (
                      <div key={s} title={s} style={{ flex: 1, height: 3, borderRadius: 2, background: stages.indexOf(trip.stage) >= i ? T.teal : T.bdr, cursor: 'pointer', transition: 'background .2s' }} onClick={() => upd(trip.id, 'stage', s)} />
                    ))}                  </div>
                </div>
                {trip.budget && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>
                      Накоплено {trip.saved || 0}₽ из {trip.budget}₽ ({savedPct}%)
                    </div>
                    <div className="prog">
                      <div className="prog-fill" style={{ width: savedPct + '%', background: `linear-gradient(90deg,${T.gold}, ${T.goldL})` }} />
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input 
                        style={{ width: 130, padding: '6px 11px', background: 'rgba(255,255,255,.03)', border: `1px solid ${T.bdr}`, borderRadius: 8, color: T.text0, fontFamily: "'Crimson Pro',serif", fontSize: 14, outline: 'none' }} 
                        placeholder="Отложено ₽" 
                        value={trip.saved || ''} 
                        onChange={e => upd(trip.id, 'saved', e.target.value)} 
                      />
                      {trip.budget && trip.saved && (
                        <span style={{ fontSize: 12, color: T.text3 }}>
                          осталось: {Math.max(0, parseInt(trip.budget) - parseInt(trip.saved))}₽
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {checkin[trip.id] && (
                  <div style={{ background: T.bdrS, borderRadius: 10, padding: '12px 14px', marginBottom: 10, fontSize: 15, lineHeight: 1.7, color: T.text1, fontStyle: 'italic' }}>
                    {checkin[trip.id]}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 7 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => getCheckin(trip)} disabled={checking[trip.id]}>
                    {checking[trip.id] ? 'Думаю...' : '🤖 Как дела с поездкой?'}
                  </button>
                  {trip.targetDate && (
                    <button className="btn btn-ghost btn-sm" onClick={() => openGCal(`✈ ${trip.destination}`, new Date(trip.targetDate).toISOString())}>
                      📅 Cal
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {trips.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => setModal(true)}>
              + Добавить поездку
            </button>
          )}
        </div>
      )}
      {/* Модалка добавления поездки */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setModal(false)}>✕</span>
            <div className="modal-title">Новая поездка</div>
            <div className="fld">
              <label>Куда?</label>
              <input placeholder="Стамбул, Бали, Байкал..." value={nt.destination} onChange={e => setNt(p => ({ ...p, destination: e.target.value }))} />
            </div>
            <div className="fld-row">
              <div className="fld">
                <label>Дата (мес/год)</label>
                <input type="month" value={nt.targetDate} onChange={e => setNt(p => ({ ...p, targetDate: e.target.value }))} />
              </div>
              <div className="fld">
                <label>Бюджет ₽</label>
                <input type="number" value={nt.budget} onChange={e => setNt(p => ({ ...p, budget: e.target.value }))} />
              </div>
            </div>
            <div className="fld">
              <label>Стадия</label>
              <div className="chips">
                {stages.map(s => (
                  <div key={s} className={`chip${nt.stage === s ? ' on' : ''}`} onClick={() => setNt(p => ({ ...p, stage: s }))}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => {
                if (!nt.destination.trim()) return;
                setTrips(p => [...p, { ...nt, id: Date.now() }]);
                setModal(false);
                notify('Поездка добавлена ✈');
              }}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
