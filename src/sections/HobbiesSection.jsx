// src/sections/HobbiesSection.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';

// ─── SVG ИЛЛЮСТРАЦИЯ (одна на весь раздел) ───
function HobbiesIllustration({ hobbies = [] }) {
  const icons = {
    'Чтение': '📚', 'Фотография': '📷', 'Музыка': '🎵',
    'Готовка': '🍳', 'Садоводство': '🌱', 'Кино': '🎬',
    'Путешествия': '✈️', 'Спорт': '⚡', 'Рисование': '🎨',
    'Блогинг': '✍️', 'Языки': '🌍', 'Рукоделие': '🧶',
    'Игры': '🎮', 'Туризм': '⛺',
  };

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: 24 }}>
      <svg viewBox="0 0 360 180" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <radialGradient id="hbg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(200,164,90,0.12)" />
            <stop offset="100%" stopColor="rgba(200,164,90,0)" />
          </radialGradient>
          <filter id="hglow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Фоновый круг */}
        <ellipse cx="180" cy="90" rx="140" ry="75" fill="url(#hbg)" />

        {/* Орбиты */}
        <ellipse cx="180" cy="90" rx="110" ry="55" fill="none" stroke="rgba(200,164,90,0.15)" strokeWidth="1" strokeDasharray="4,6">
          <animateTransform attributeName="transform" type="rotate" from="0 180 90" to="360 180 90" dur="40s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="180" cy="90" rx="70" ry="35" fill="none" stroke="rgba(200,164,90,0.1)" strokeWidth="1" strokeDasharray="3,5">
          <animateTransform attributeName="transform" type="rotate" from="360 180 90" to="0 180 90" dur="25s" repeatCount="indefinite" />
        </ellipse>

        {/* Центральный элемент */}
        <circle cx="180" cy="90" r="28" fill="rgba(200,164,90,0.1)" stroke="rgba(200,164,90,0.4)" strokeWidth="1.5">
          <animate attributeName="r" values="26;30;26" dur="4s" repeatCount="indefinite" />
        </circle>
        <text x="180" y="86" textAnchor="middle" fontSize="18">🎨</text>
        <text x="180" y="102" textAnchor="middle" fontSize="8" fill="rgba(200,164,90,0.8)" fontFamily="'JetBrains Mono',monospace" letterSpacing="1">ХОББИ</text>

        {/* Иконки хобби по орбите */}
        {hobbies.slice(0, 6).map((name, i) => {
          const angle = (i / Math.max(hobbies.slice(0, 6).length, 1)) * 2 * Math.PI - Math.PI / 2;
          const rx = 110, ry = 55;
          const x = 180 + rx * Math.cos(angle);
          const y = 90 + ry * Math.sin(angle);
          return (
            <g key={name} filter="url(#hglow)">
              <circle cx={x} cy={y} r="16" fill="rgba(200,164,90,0.08)" stroke="rgba(200,164,90,0.35)" strokeWidth="1">
                <animate attributeName="opacity" values="0.7;1;0.7" dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />
              </circle>
              <text x={x} y={y + 5} textAnchor="middle" fontSize="13">{icons[name] || '✦'}</text>
            </g>
          );
        })}

        {/* Искры */}
        {[...Array(6)].map((_, i) => {
          const a = (i / 6) * 2 * Math.PI;
          return (
            <circle key={i} cx={180 + 130 * Math.cos(a)} cy={90 + 65 * Math.sin(a)} r="2"
              fill="rgba(200,164,90,0.5)">
              <animate attributeName="opacity" values="0;1;0" dur={`${1.5 + i * 0.3}s`} begin={`${i * 0.25}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

// ─── БЛОК: Текущие хобби ───
function CurrentHobbiesBlock({ profile, hobbies }) {
  const list = hobbies.length > 0
    ? hobbies.map(h => typeof h === 'string' ? h : h.name)
    : (profile?.hobbies || []);

  if (!list.length) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Заголовок */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 3, height: 20, background: T.gold, borderRadius: 2 }} />
        <span style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 18, color: T.text0 }}>
          Мои увлечения
        </span>
      </div>

      {/* Теги хобби */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {list.map((name, i) => (
          <div key={i} style={{
            padding: '6px 14px', borderRadius: 20,
            background: 'rgba(200,164,90,0.08)',
            border: '1px solid rgba(200,164,90,0.3)',
            fontSize: 13, color: T.text1,
            fontFamily: "'Crimson Pro',serif",
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 15 }}>
              {({'Чтение':'📚','Фотография':'📷','Музыка':'🎵','Готовка':'🍳','Садоводство':'🌱','Кино':'🎬','Путешествия':'✈️','Спорт':'⚡','Рисование':'🎨','Блогинг':'✍️','Языки':'🌍','Рукоделие':'🧶','Игры':'🎮','Туризм':'⛺'})[name] || '✦'}
            </span>
            {name}
          </div>
        ))}
      </div>

      {/* Контекст из профиля */}
      <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14, fontSize: 12, color: T.text3, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {profile?.hobbyFreq && <span>⏱ Частота: <strong style={{ color: T.text2 }}>{profile.hobbyFreq}</strong></span>}
        {profile?.workEnd && profile?.sleep && <span>🕐 Свободное время: <strong style={{ color: T.text2 }}>{profile.workEnd}–{profile.sleep}</strong></span>}
        {profile?.chronotype && <span>🌙 Хронотип: <strong style={{ color: T.text2 }}>{profile.chronotype}</strong></span>}
      </div>

      {/* ИИ рекомендации */}
      <AiBox
        kb={buildKB(profile)}
        prompt={`Мои хобби: ${list.join(', ')}. Частота занятий: ${profile?.hobbyFreq || 'не указана'}. Свободное время: с ${profile?.workEnd || '18:00'} до ${profile?.sleep || '23:00'}. Хронотип: ${profile?.chronotype || 'не указан'}. Профессия: ${profile?.profession || 'не указана'}. Ценности: ${profile?.coreValue || 'не указаны'}.\n\nДай персональные рекомендации по каждому хобби:\n1. Для каждого хобби — одна конкретная практика под мой ритм жизни\n2. Какие хобби хорошо сочетаются между собой и почему\n3. Неочевидный лайфхак для одного из моих хобби\n4. В какое время дня лучше заниматься с учётом хронотипа`}
        label="Персональные рекомендации"
        btnText="✦ Получить рекомендации"
        placeholder="Анализирую твои увлечения и составляю персональный план..."
      />
    </div>
  );
}

// ─── БЛОК: Хобби-проект (чему хочу научиться) ───
function HobbyProjectBlock({ profile }) {
  const project = profile?.hobbyProject;
  const [steps, setSteps] = useState(() => {
    try {
      const saved = localStorage.getItem(`hobby_project_steps_${project}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newStep, setNewStep] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(true);

  if (!project) return null;

  const toggleStep = (i) => {
    const updated = steps.map((s, idx) => idx === i ? { ...s, done: !s.done } : s);
    setSteps(updated);
    try { localStorage.setItem(`hobby_project_steps_${project}`, JSON.stringify(updated)); } catch {}
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    const updated = [...steps, { text: newStep.trim(), done: false }];
    setSteps(updated);
    setNewStep('');
    try { localStorage.setItem(`hobby_project_steps_${project}`, JSON.stringify(updated)); } catch {}
  };

  const removeStep = (i) => {
    const updated = steps.filter((_, idx) => idx !== i);
    setSteps(updated);
    try { localStorage.setItem(`hobby_project_steps_${project}`, JSON.stringify(updated)); } catch {}
  };

  const doneCount = steps.filter(s => s.done).length;
  const pct = steps.length > 0 ? Math.round(doneCount / steps.length * 100) : 0;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Заголовок */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 3, height: 20, background: '#b882e8', borderRadius: 2 }} />
        <span style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 18, color: T.text0 }}>
          Хочу освоить
        </span>
      </div>

      {/* Карточка проекта */}
      <div style={{ padding: 18, background: 'rgba(184,130,232,0.06)', border: '1px solid rgba(184,130,232,0.25)', borderRadius: 14, marginBottom: 14 }}>
        {/* Название */}
        <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 22, color: T.text0, marginBottom: 6 }}>
          🌟 {project}
        </div>
        <div style={{ fontSize: 12, color: T.text3, marginBottom: 14 }}>
          Твой следующий уровень · начни с первого шага
        </div>

        {/* Прогресс */}
        {steps.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>
              <span>ПРОГРЕСС</span>
              <span style={{ color: pct === 100 ? '#2d6a4f' : '#b882e8' }}>{doneCount}/{steps.length} · {pct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(184,130,232,0.15)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'linear-gradient(90deg,#2d6a4f,#4caf50)' : 'linear-gradient(90deg,#b882e8,#d4a0ff)', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
            {pct === 100 && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#2d6a4f', fontWeight: 600 }}>
                🎉 Цель достигнута! Пора поставить новую.
              </div>
            )}
          </div>
        )}

        {/* Дорожная карта — шаги */}
        <div
          onClick={() => setRoadmapOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: roadmapOpen ? 10 : 0, cursor: 'pointer' }}
        >
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#b882e8', letterSpacing: 1 }}>📋 МОИ ШАГИ</span>
          <span style={{ fontSize: 10, color: T.text3 }}>{roadmapOpen ? '▲' : '▼'}</span>
        </div>

        {roadmapOpen && (
          <>
            {steps.length === 0 && (
              <div style={{ fontSize: 13, color: T.text3, fontStyle: 'italic', marginBottom: 10, paddingLeft: 8 }}>
                Добавь первые шаги или попроси ИИ составить план
              </div>
            )}

            {steps.map((step, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                {/* Чекбокс */}
                <div
                  onClick={() => toggleStep(i)}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer', marginTop: 1,
                    border: `1.5px solid ${step.done ? '#b882e8' : 'rgba(255,255,255,0.2)'}`,
                    background: step.done ? 'rgba(184,130,232,0.2)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  {step.done && <span style={{ fontSize: 11, color: '#b882e8' }}>✓</span>}
                </div>

                {/* Номер + текст */}
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#b882e8', marginRight: 6 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontSize: 13, color: step.done ? T.text3 : T.text1,
                    textDecoration: step.done ? 'line-through' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {step.text}
                  </span>
                </div>

                {/* Удалить */}
                <span
                  onClick={() => removeStep(i)}
                  style={{ fontSize: 12, color: T.text3, cursor: 'pointer', padding: '0 4px', opacity: 0.5 }}
                >✕</span>
              </div>
            ))}

            {/* Добавить шаг */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                value={newStep}
                onChange={e => setNewStep(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStep()}
                placeholder="Добавить шаг..."
                style={{
                  flex: 1, padding: '8px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(184,130,232,0.3)',
                  borderRadius: 8, color: T.text0,
                  fontFamily: "'Crimson Pro',serif", fontSize: 14, outline: 'none',
                }}
              />
              <button
                onClick={addStep}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: 'rgba(184,130,232,0.2)', color: '#b882e8',
                  cursor: 'pointer', fontSize: 16, fontWeight: 600,
                }}
              >+</button>
            </div>
          </>
        )}
      </div>

      {/* ИИ-план освоения */}
      <div
        onClick={() => setAiOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: aiOpen ? '10px 10px 0 0' : 10, cursor: 'pointer', background: 'rgba(184,130,232,0.06)', border: '1px solid rgba(184,130,232,0.2)' }}
      >
        <span>🤖</span>
        <span style={{ flex: 1, fontSize: 13, color: '#b882e8', fontFamily: "'Crimson Pro',serif", fontWeight: 500 }}>
          ИИ-план освоения «{project}»
        </span>
        <span style={{ fontSize: 10, color: T.text3 }}>{aiOpen ? '▲' : '▼'}</span>
      </div>
      {aiOpen && (
        <div style={{ border: '1px solid rgba(184,130,232,0.15)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
          <AiBox
            kb={buildKB(profile)}
            prompt={`Хочу освоить: "${project}". Мои текущие хобби: ${(profile?.hobbies || []).join(', ') || 'не указаны'}. Свободное время: с ${profile?.workEnd || '18:00'} до ${profile?.sleep || '23:00'}. Частота занятий сейчас: ${profile?.hobbyFreq || 'не указана'}. Хронотип: ${profile?.chronotype || 'не указан'}. Уровень стресса: ${profile?.stressLevel || '—'}.\n\nСоставь подробный план освоения:\n1. С чего начать (первые 3 конкретных шага)\n2. Реалистичное расписание занятий под моё свободное время\n3. Ресурсы для старта (что почитать/посмотреть/попробовать)\n4. Как понять что есть прогресс — конкретные маркеры\n5. Типичные ошибки новичков в этом направлении`}
            label={`Как освоить: ${project}`}
            btnText={`✦ Составить план освоения`}
            placeholder={`Составляю персональный план для «${project}»...`}
          />
        </div>
      )}
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function HobbiesSection() {
  const { profile, hobbies, setHobbies, notify } = useApp();
  const mergedRef = useRef(false);

  // ─── СЛИЯНИЕ: хобби из онбординга → hobbies (один раз) ───
  useEffect(() => {
    if (mergedRef.current) return;
    if (!profile?.hobbies?.length) return;
    mergedRef.current = true;

    const existingNames = new Set(hobbies.map(h =>
      (typeof h === 'string' ? h : h.name).toLowerCase().trim()
    ));
    const newFromOnboarding = profile.hobbies
      .filter(name => !existingNames.has(name.toLowerCase().trim()))
      .map(name => ({
        id: Date.now() + Math.random(),
        name,
        goal: '',
        sessions: [],
        fromOnboarding: true,
      }));

    if (newFromOnboarding.length > 0) {
      setHobbies(prev => [...prev, ...newFromOnboarding]);
    }
  }, [profile]);

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Иллюстрация */}
      <HobbiesIllustration hobbies={profile?.hobbies || hobbies.map(h => h.name)} />

      {/* Текущие хобби + рекомендации */}
      <CurrentHobbiesBlock profile={profile} hobbies={hobbies} />

      {/* Хобби-проект */}
      <HobbyProjectBlock profile={profile} />
    </div>
  );
}

function buildKB(p) {
  return `Профиль: ${p?.name || '—'}, ${p?.gender || '—'}, ${p?.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() + ' лет' : ''}. Профессия: ${p?.profession || '—'}. Хронотип: ${p?.chronotype || '—'}. Ценности: ${p?.coreValue || '—'}. Восстановление: ${(p?.recovery || []).join(', ') || '—'}. Уровень стресса: ${p?.stressLevel || '—'}.`;
}
