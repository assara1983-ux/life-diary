// src/sections/HobbiesSection.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

// ─── УТИЛИТЫ ───
function getStreak(sessions = []) {
  if (!sessions.length) return 0;
  const dates = [...new Set(sessions)].sort().reverse();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const d of dates) {
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = Math.round((cursor - day) / 86400000);
    if (diff === 0 || diff === 1) { streak++; cursor = day; }
    else break;
  }
  return streak;
}

function getWeekDots(sessions = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const str = d.toISOString().split('T')[0];
    return { date: str, active: sessions.includes(str), isToday: i === 6 };
  });
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ─── КОМПОНЕНТ: Недельный трекер ───
function WeekTracker({ sessions }) {
  const dots = getWeekDots(sessions);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
      {dots.map((d, i) => (
        <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: d.active
              ? `linear-gradient(135deg, ${T.gold}, #e8c56a)`
              : d.isToday
              ? 'rgba(200,164,90,0.15)'
              : 'rgba(255,255,255,0.04)',
            border: d.isToday
              ? `2px solid rgba(200,164,90,0.5)`
              : `1px solid rgba(255,255,255,0.08)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: d.active ? '0 2px 8px rgba(200,164,90,0.3)' : 'none',
          }}>
            {d.active && <span style={{ fontSize: 12 }}>✓</span>}
          </div>
          <span style={{ fontSize: 9, color: d.isToday ? T.gold : T.text3, fontFamily: "'JetBrains Mono',monospace" }}>
            {DAY_LABELS[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── КОМПОНЕНТ: Карточка хобби ───
function HobbyCard({ h, profile, onLog, onDelete }) {
  const [aiOpen, setAiOpen] = useState(false);
  const streak = getStreak(h.sessions || []);
  const wk = (h.sessions || []).filter(s => (new Date() - new Date(s)) / 86400000 <= 7).length;
  const total = (h.sessions || []).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const loggedToday = (h.sessions || []).includes(todayStr);

  return (
    <div className="hobby-card" style={{ marginBottom: 14 }}>
      <SectionHero sectionId="hobbies" />

      {/* Шапка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 20, color: T.text0 }}>
          🎨 {h.name}
        </div>
        <div className="ico-btn danger" onClick={onDelete}>✕</div>
      </div>

      {/* Цель */}
      {h.goal && (
        <div style={{ fontSize: 13, color: T.text3, marginBottom: 10, fontStyle: 'italic', borderLeft: `2px solid rgba(200,164,90,0.4)`, paddingLeft: 8 }}>
          ✦ {h.goal}
        </div>
      )}

      {/* Недельный трекер */}
      <WeekTracker sessions={h.sessions || []} />

      {/* Статистика */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="badge bp">📅 Неделя: {wk}</span>
        <span className="badge bm">📊 Всего: {total}</span>
        {streak > 0 && (
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: streak >= 7 ? 'rgba(200,164,90,0.2)' : 'rgba(255,140,0,0.12)',
            color: streak >= 7 ? T.gold : '#ff8c00',
            border: `1px solid ${streak >= 7 ? 'rgba(200,164,90,0.4)' : 'rgba(255,140,0,0.3)'}`,
          }}>
            🔥 Серия: {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}
          </span>
        )}
        {loggedToday && (
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, background: 'rgba(45,106,79,0.15)', color: '#2d6a4f', border: '1px solid rgba(45,106,79,0.3)' }}>
            ✅ Сегодня отмечено
          </span>
        )}
      </div>

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: aiOpen ? 12 : 0 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onLog}
          disabled={loggedToday}
          style={{ opacity: loggedToday ? 0.5 : 1 }}
        >
          {loggedToday ? '✓ Уже отмечено' : '✓ Занимался(ась) сегодня'}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setAiOpen(o => !o)}
          style={{ fontSize: 12 }}
        >
          {aiOpen ? '▲ Скрыть план' : '🤖 План развития'}
        </button>
      </div>

      {/* ИИ план развития конкретного хобби */}
      {aiOpen && (
        <div style={{ marginTop: 8, border: '1px solid rgba(200,164,90,0.2)', borderRadius: 10, overflow: 'hidden' }}>
          <AiBox
            kb={buildKB(profile)}
            prompt={`Хобби: "${h.name}". Цель: "${h.goal || 'не указана'}". Занятий за неделю: ${wk}, всего: ${total}, серия: ${streak} дней. Свободное время: с ${profile?.workEnd || '18:00'} до ${profile?.sleep || '23:00'}. Частота из профиля: ${profile?.hobbyFreq || 'не указана'}.\n\nСоставь конкретный план развития этого хобби:\n1. Оптимальное расписание занятий под свободное время\n2. Конкретные упражнения/шаги для роста\n3. Цель на ближайшие 30 дней\n4. Как поддерживать мотивацию`}
            label={`План: ${h.name}`}
            btnText={`Составить план для «${h.name}»`}
            placeholder={`Анализирую хобби «${h.name}» и составляю план...`}
          />
        </div>
      )}
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function HobbiesSection() {
  const { profile, hobbies, setHobbies, notify } = useApp();
  const [modal, setModal] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [nh, setNh] = useState({ name: '', goal: '', notes: '' });
  const mergedRef = useRef(false);

  // ─── СЛИЯНИЕ: хобби из онбординга → hobbies (один раз) ───
  useEffect(() => {
    if (mergedRef.current) return;
    if (!profile?.hobbies?.length) return;
    mergedRef.current = true;

    const existingNames = new Set(hobbies.map(h => h.name.toLowerCase().trim()));
    const newFromOnboarding = profile.hobbies
      .filter(name => !existingNames.has(name.toLowerCase().trim()))
      .map(name => ({
        id: Date.now() + Math.random(),
        name,
        goal: profile.hobbyProject || '',
        notes: '',
        sessions: [],
        fromOnboarding: true,
      }));

    if (newFromOnboarding.length > 0) {
      setHobbies(prev => [...prev, ...newFromOnboarding]);
      notify?.(`🎨 Добавлено ${newFromOnboarding.length} хобби из профиля`);
    }
  }, [profile]);

  const logSession = (id) => {
    const today = new Date().toISOString().split('T')[0];
    setHobbies(p => p.map(h =>
      h.id === id
        ? { ...h, sessions: [...new Set([...(h.sessions || []), today])] }
        : h
    ));
  };

  const totalSessions = hobbies.reduce((acc, h) => acc + (h.sessions || []).length, 0);
  const activeThisWeek = hobbies.filter(h =>
    (h.sessions || []).some(s => (new Date() - new Date(s)) / 86400000 <= 7)
  ).length;

  return (
    <div>
      {/* ─── СВОДКА ─── */}
      {hobbies.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 100, padding: '12px 14px', background: 'rgba(200,164,90,0.06)', border: '1px solid rgba(200,164,90,0.2)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, color: T.gold, fontWeight: 700 }}>{hobbies.length}</div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>хобби</div>
          </div>
          <div style={{ flex: 1, minWidth: 100, padding: '12px 14px', background: 'rgba(0,112,192,0.06)', border: '1px solid rgba(0,112,192,0.2)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, color: '#0070c0', fontWeight: 700 }}>{activeThisWeek}</div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>активных за неделю</div>
          </div>
          <div style={{ flex: 1, minWidth: 100, padding: '12px 14px', background: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.2)', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, color: '#2d6a4f', fontWeight: 700 }}>{totalSessions}</div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>всего занятий</div>
          </div>
        </div>
      )}

      {/* ─── СОВЕТЫ ПО ХОББИ (AiBox общий) ─── */}
      <div style={{ marginBottom: 12 }}>
        <div
          onClick={() => setAdviceOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: adviceOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span style={{ fontSize: 16 }}>🎨</span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>Советы по хобби</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{adviceOpen ? '▲' : '▼'}</span>
        </div>
        {adviceOpen && (
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <AiBox
              kb={buildKB(profile)}
              prompt={`Хобби пользователя: ${hobbies.map(h => h.name).join(', ') || '—'}. Проект: ${profile?.hobbyProject || '—'}. Частота: ${profile?.hobbyFreq || '—'}. Свободное время: с ${profile?.workEnd || '18:00'} до ${profile?.sleep || '23:00'}. Всего занятий: ${totalSessions}. Активных хобби за неделю: ${activeThisWeek} из ${hobbies.length}.\n\nДай общий план:\n1. Как распределить время между хобби\n2. Какое хобби развить приоритетно и почему\n3. Как встроить занятия в распорядок дня`}
              label="Хобби и увлечения"
              btnText="Советы по хобби"
              placeholder="Анализирую профиль и составляю конкретный план для хобби..."
            />
          </div>
        )}
      </div>

      {/* ─── СПИСОК ХОББИ ─── */}
      <div
        onClick={() => setListOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: listOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: listOpen ? 0 : 8 }}
      >
        <span style={{ fontSize: 16 }}>🎨</span>
        <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>Мои хобби</span>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); setModal(true); }}>+</button>
        <span style={{ fontSize: 11, color: T.text3 }}>{listOpen ? '▲' : '▼'}</span>
      </div>

      {listOpen && (
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 12 }}>
          {hobbies.length === 0 && (
            <div className="empty">
              <span className="empty-ico">🎨</span>
              <p>Добавь свои хобби</p>
            </div>
          )}

          {hobbies.map(h => (
            <HobbyCard
              key={h.id}
              h={h}
              profile={profile}
              onLog={() => logSession(h.id)}
              onDelete={() => setHobbies(p => p.filter(x => x.id !== h.id))}
            />
          ))}

          {hobbies.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setModal(true)}>
              + Добавить хобби
            </button>
          )}
        </div>
      )}

      {/* ─── МОДАЛКА ДОБАВЛЕНИЯ ─── */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setModal(false)}>✕</span>
            <div className="modal-title">Новое хобби</div>
            <div className="fld">
              <label>Название</label>
              <input
                placeholder="Фотография, чтение, вязание..."
                value={nh.name}
                onChange={e => setNh(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="fld">
              <label>Цель / проект</label>
              <input
                placeholder="Освоить ретушь, прочитать 12 книг..."
                value={nh.goal}
                onChange={e => setNh(p => ({ ...p, goal: e.target.value }))}
              />
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Отмена</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!nh.name.trim()) return;
                  setHobbies(p => [...p, { ...nh, id: Date.now(), sessions: [] }]);
                  setModal(false);
                  setNh({ name: '', goal: '', notes: '' });
                  notify?.(`🎨 Хобби «${nh.name}» добавлено`);
                }}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildKB(p) {
  return `Профиль: ${p?.name || '—'}, ${p?.gender || '—'}. Работа: ${p?.profession || '—'}. Свободное время: с ${p?.workEnd || '18:00'} до ${p?.sleep || '23:00'}. Хронотип: ${p?.chronotype || '—'}. Частота хобби: ${p?.hobbyFreq || '—'}.`;
}
