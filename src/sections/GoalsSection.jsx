// src/sections/GoalsSection.jsx
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

export function GoalsSection() {
  const { profile, setProfile, tasks, setTasks, notify } = useApp();
  
  // Навигация
  const [tab, setTab] = useState('goal'); // goal | wheel | plan | tools
  const [toolsTab, setToolsTab] = useState('weight');
  
  // Редактор цели
  const [editGoal, setEditGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(profile.mainGoal || '');
  const [newAreas, setNewAreas] = useState(profile.goalAreas || []);
  const [newBlocks, setNewBlocks] = useState(profile.goalBlocks || []);
  const [newDeadline, setNewDeadline] = useState(profile.goalDeadline || '');
  const [newMetric, setNewMetric] = useState(profile.goalMetric || '');
  
  // Колесо жизни
  const [activeArea, setActiveArea] = useState(null);
  const [wheelScores, setWheelScores] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ld_wheel') || '{}'); }
    catch { return {}; }
  });

  // Помощники (трекеры)
  const [goalsTools, setGoalsTools] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ld_goals_tools') || '{"weightLog":[],"habits":[],"calories":{"goal":0,"log":[]},"workout":null,"workoutSetup":null}'); }
    catch { return { weightLog: [], habits: [], calories: { goal: 0, log: [] }, workout: null, workoutSetup: null }; }
  });
  
  const [workoutForm, setWorkoutForm] = useState({ days: [], time: '', equipment: [], show: false });
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [addModal, setAddModal] = useState(null);

  const today_d = new Date().toISOString().split('T')[0];
  const moon = (() => {
    const p = ((new Date() - new Date("2024-01-11")) / 86400000 % 29.53 + 29.53) % 29.53;
    if (p < 1.85) return { n: "Новолуние", t: "Начало" };
    if (p < 7.38) return { n: "Растущая", t: "Рост" };
    if (p < 14.76) return { n: "Полнолуние", t: "Пик" };
    return { n: "Убывающая", t: "Итоги" };
  })();

  // Сохранение данных
  useEffect(() => { try { localStorage.setItem('ld_wheel', JSON.stringify(wheelScores)); } catch {} }, [wheelScores]);
  useEffect(() => { try { localStorage.setItem('ld_goals_tools', JSON.stringify(goalsTools)); } catch {} }, [goalsTools]);
  // Шаблоны целей
  const GOAL_PRESETS = [
    { emoji: "⚡", title: "Карьера и доход", example: "Вырасти до руководителя / увеличить доход на 30%", areas: ["Карьера", "Финансы"], metric: "Должность / доход" },
    { emoji: "💪", title: "Здоровье и фигура", example: "Похудеть на 10 кг / пробежать 5 км", areas: ["Здоровье", "Внешность"], metric: "Вес / км" },
    { emoji: "✨", title: "Внешность и уход", example: "Выработать ритуал / улучшить кожу", areas: ["Внешность", "Здоровье"], metric: "Привычки в неделю" },
    { emoji: "❤️", title: "Отношения", example: "Найти партнёра / улучшить отношения", areas: ["Отношения", "Семья"], metric: "Качество времени" },
    { emoji: "📚", title: "Обучение", example: "Получить сертификат / выучить язык", areas: ["Саморазвитие"], metric: "Часы / уровень" },
    { emoji: "💰", title: "Финансы", example: "Подушка 3 млн тг", areas: ["Финансы"], metric: "Сумма накоплений" },
  ];

  const AREA_EMOJI = { "Здоровье": "💚", "Карьера": "💼", "Финансы": "💰", "Отношения": "❤️", "Саморазвитие": "📚", "Творчество": "🎨", "Путешествия": "✈️", "Духовность": "🌟", "Семья": "👨‍👩‍👧", "Внешность": "✨" };
  
  const updateScore = (name, val) => setWheelScores(p => ({ ...p, [name]: val }));
  
  const saveGoal = () => {
    setProfile(p => ({ ...p, mainGoal: newGoal, goalAreas: newAreas, goalBlocks: newBlocks, goalDeadline: newDeadline, goalMetric: newMetric }));
    setEditGoal(false);
    notify("Цель обновлена ✦");
  };

  // Добавление задачи в планировщик
  const addGoalTask = (title, time = '', section = 'tasks') => {
    setTasks(p => [...p, { id: Date.now() + Math.random(), title: title.slice(0, 100), section, freq: 'once', priority: 'm', preferredTime: time, deadline: '', notes: 'Из плана целей', lastDone: '', doneDate: '' }]);
    notify("Добавлено в планировщик ✦");
  };

  const WHEEL_AREAS = [
    { name: "Здоровье", emoji: "💚", color: "#7BCCA0" },
    { name: "Карьера", emoji: "💼", color: "#82AADD" },
    { name: "Финансы", emoji: "💰", color: "#E5C87A" },
    { name: "Отношения", emoji: "❤️", color: "#E8556D" },
    { name: "Семья", emoji: "👨‍👩‍👧", color: "#B882E8" },
    { name: "Саморазвитие", emoji: "📚", color: "#4EC9BE" },
    { name: "Творчество", emoji: "🎨", color: "#E8A85A" },
    { name: "Духовность", emoji: "🌟", color: "#A8A49C" },
  ];

  const cx = 150, cy = 150, maxR = 120;
  const sectorPath = (i, score) => {
    const r = (score / 10) * maxR;
    const a1 = (i / 8) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / 8) * 2 * Math.PI - Math.PI / 2;
    return `M ${cx} ${cy} L ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)} Z`;
  };

  const activeRecs = newAreas.flatMap(a => {
    const map = {
      "Здоровье": ["Трекай сон", "20 мин движения утром", "Убери сахар на 2 нед", "Пей 8 стаканов воды"],
      "Внешность": ["Утренний/вечерний уход", "Фото прогресса", "Запись к специалисту", "Водный баланс"],      "Карьера": ["1 час на главный проект", "Нетворкинг 1 чел/нед", "Изучи 1 навык в мес", "Дневник побед"],
      "Финансы": ["Фиксируй траты", "Откладывай 10%", "Изучи 1 инструмент", "Ревизия подписок"],
      "Отношения": ["Время без телефона", "Напиши близкому", "Разговор о чувствах", "Сюрприз без повода"],
      "Саморазвитие": ["30 мин чтения", "Подкаст в дороге", "1 курс в месяц", "Дневник инсайтов"],
      "Духовность": ["10 мин медитации", "Дневник благодарности", "Прогулка в тишине", "Осознанность"],
      "Творчество": ["15 мин на проект", "Не оценивай, создавай", "Найди сообщество", "Закончи малое"],
    };
    return map[a] || [];
  }).slice(0, 6);

  return (
    <div>
      {/* Модалка добавления задачи */}
      {addModal && (
        <div className="overlay" onClick={() => setAddModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setAddModal(null)}>✕</span>
            <div className="modal-title">Добавить в планировщик</div>
            <div className="fld"><label>Задача</label><input value={addModal.title} onChange={e => setAddModal(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="fld-row">
              <div className="fld"><label>Время</label><input type="time" value={addModal.time || ''} onChange={e => setAddModal(p => ({ ...p, time: e.target.value }))} /></div>
              <div className="fld"><label>Раздел</label>
                <select value={addModal.section || 'tasks'} onChange={e => setAddModal(p => ({ ...p, section: e.target.value }))}>
                  <option value="tasks">Общие</option><option value="health">Здоровье</option><option value="home">Дом</option><option value="hobbies">Хобби</option>
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setAddModal(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => { addGoalTask(addModal.title, addModal.time, addModal.section); setAddModal(null); }}>📅 Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* Вкладки */}
      <div className="tabs" style={{ marginBottom: 14 }}>
        {[['goal', '🎯 Цель'], ['wheel', '🔄 Колесо'], ['plan', '📋 План'], ['tools', '🛠 Помощники']].map(([v, l]) => (
          <div key={v} className={`tab ${tab === v ? 'on' : ''}`} onClick={() => setTab(v)}>{l}</div>
        ))}
      </div>

      {/* === ВКЛАДКА: МОЯ ЦЕЛЬ === */}
      {tab === 'goal' && (
        <>
          {!editGoal && (
            <div className="card card-accent" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 2 }}>ТЕКУЩАЯ ЦЕЛЬ</div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setNewGoal(profile.mainGoal || ''); setNewAreas(profile.goalAreas || []); setNewBlocks(profile.goalBlocks || []); setNewDeadline(profile.goalDeadline || ''); setNewMetric(profile.goalMetric || ''); setEditGoal(true); }}>✏️ Изменить</button>              </div>
              {profile.mainGoal ? (
                <>
                  <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 22, color: T.gold, lineHeight: 1.3, marginBottom: 8 }}>{profile.mainGoal}</div>
                  {profile.goalDeadline && <div style={{ fontSize: 12, color: T.text3, marginBottom: 4 }}>📅 Срок: {new Date(profile.goalDeadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
                  {profile.goalMetric && <div style={{ fontSize: 12, color: T.text3, marginBottom: 8 }}>📏 Как измеряю: {profile.goalMetric}</div>}
                  {profile.goalAreas?.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>{profile.goalAreas.map(a => <span key={a} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(45,106,79,0.12)', color: T.success }}>{AREA_EMOJI[a] || ' '} {a}</span>)}</div>}
                  <div style={{ fontSize: 13, color: T.text3, fontStyle: 'italic' }}>Луна {moon.n} — {moon.t}</div>
                </>
              ) : <div style={{ fontSize: 15, color: T.text3, fontStyle: 'italic' }}>Цель не установлена.</div>}
            </div>
          )}

          {editGoal && (
            <div className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${T.gold}` }}>
              <div style={{ fontSize: 11, color: T.gold, fontFamily: "'JetBrains Mono'", letterSpacing: 2, marginBottom: 12 }}>{profile.mainGoal ? 'ИЗМЕНИТЬ ЦЕЛЬ' : 'УСТАНОВИТЬ ЦЕЛЬ'}</div>
              <div style={{ fontSize: 12, color: T.text3, marginBottom: 8 }}>Быстрые шаблоны:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                {GOAL_PRESETS.map(p => (
                  <div key={p.title} onClick={() => { setNewGoal(p.example); setNewAreas(p.areas); setNewMetric(p.metric); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 13, border: `1px solid ${newAreas.join() === p.areas.join() ? T.gold : T.bdr}`, background: newAreas.join() === p.areas.join() ? 'rgba(45,106,79,0.12)' : 'transparent', color: newAreas.join() === p.areas.join() ? T.gold : T.text1 }}>
                    <span>{p.emoji}</span><span>{p.title}</span>
                  </div>
                ))}
              </div>
              <div className="fld"><label>Моя цель</label><textarea placeholder="Конкретно и измеримо..." value={newGoal} onChange={e => setNewGoal(e.target.value)} style={{ minHeight: 72 }} /></div>
              <div className="fld-row">
                <div className="fld"><label>Срок</label><input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} /></div>
                <div className="fld"><label>Метрика</label><input placeholder="кг / ₸ / уровень" value={newMetric} onChange={e => setNewMetric(e.target.value)} /></div>
              </div>
              <div className="fld"><label>Сферы жизни</label>
                <div className="chips">{Object.keys(AREA_EMOJI).map(v => (<div key={v} className={`chip ${newAreas.includes(v) ? 'on' : ''}`} onClick={() => setNewAreas(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])}>{AREA_EMOJI[v]} {v}</div>))}</div>
              </div>
              <div className="fld"><label>Что сдерживает?</label>
                <div className="chips">{["Нехватка времени", "Нехватка энергии", "Откладываю", "Не знаю с чего начать", "Много отвлекаюсь", "Страх неудачи"].map(v => (<div key={v} className={`chip ${newBlocks.includes(v) ? 'on' : ''}`} onClick={() => setNewBlocks(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])}>{v}</div>))}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-ghost" onClick={() => setEditGoal(false)}>Отмена</button>
                <button className="btn btn-primary" onClick={saveGoal}>Сохранить ✦</button>
              </div>
            </div>
          )}

          {activeRecs.length > 0 && !editGoal && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 2, marginBottom: 10 }}>ЧТО ПОМОГАЕТ ДОСТИЧЬ ЦЕЛИ</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {activeRecs.map((r, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: 'rgba(45,106,79,0.06)', borderRadius: 10, cursor: 'pointer' }} onClick={() => setAddModal({ title: r, time: '', section: 'tasks' })}>
                    <div style={{ fontSize: 13, color: T.text1, marginBottom: 4 }}>✦ {r}</div>
                    <div style={{ fontSize: 10, color: T.teal, fontFamily: "'JetBrains Mono'" }}>+ в планировщик</div>                  </div>
                ))}
              </div>
            </div>
          )}

          {!editGoal && profile.mainGoal && (
            <AiBox
              kb={JSON.stringify(profile)}
              prompt={`Составь персональный план достижения цели: ${profile.mainGoal}. Срок: ${profile.goalDeadline || 'не указан'}. Метрика: ${profile.goalMetric || '—'}. Сферы: ${newAreas.join(', ') || '—'}. Барьеры: ${newBlocks.join(', ') || '—'}. Мотивация: ${profile.motivates || '—'}. Ценность: ${profile.coreValue || '—'}. Свободное время: с ${profile.workEnd || '18:00'} до ${profile.sleep || '23:00'}. Дай: 1) 3 шага на неделю, 2) как преодолеть барьеры, 3) аффирмацию, 4) действие на сегодня за 15 мин.`}
              label="AI план достижения цели" btnText="Составить план" placeholder="Составлю персональный план..."
            />
          )}
        </>
      )}

      {/* === ВКЛАДКА: КОЛЕСО ЖИЗНИ === */}
      {tab === 'wheel' && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 2, marginBottom: 8, textAlign: 'center' }}>КОЛЕСО ЖИЗНИ — нажми на сектор</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <svg width="320" height="320" viewBox="-30 -30 360 360" style={{ maxWidth: '100%' }}>
                {[2, 4, 6, 8, 10].map(n => <circle key={n} cx={cx} cy={cy} r={(n / 10) * maxR} fill="none" stroke="rgba(45,32,16,0.1)" strokeWidth="1" />)}
                {WHEEL_AREAS.map((_, i) => { const a = (i / 8) * 2 * Math.PI - Math.PI / 2; return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="rgba(200,164,90,0.15)" strokeWidth="1" />; })}
                {WHEEL_AREAS.map((area, i) => (<path key={area.name} d={sectorPath(i, wheelScores[area.name] || 5)} fill={area.color} fillOpacity={activeArea === i ? 0.75 : 0.5} stroke={area.color} strokeWidth={activeArea === i ? 2.5 : 1.5} style={{ cursor: 'pointer', transition: 'all .2s' }} onClick={() => setActiveArea(activeArea === i ? null : i)} />))}
                {WHEEL_AREAS.map((area, i) => { const a = ((i + 0.5) / 8) * 2 * Math.PI - Math.PI / 2; return <text key={area.name} x={cx + (maxR + 20) * Math.cos(a)} y={cy + (maxR + 20) * Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={T.text2}>{area.emoji}</text>; })}
              </svg>
            </div>
            {activeArea !== null && (
              <div style={{ padding: '12px 14px', background: 'rgba(45,106,79,0.08)', borderRadius: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{WHEEL_AREAS[activeArea].emoji}</span>
                  <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 18, color: T.text0 }}>{WHEEL_AREAS[activeArea].name}</div>
                  <span style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 700, color: WHEEL_AREAS[activeArea].color }}>{wheelScores[WHEEL_AREAS[activeArea].name] || 5}/10</span>
                </div>
                <input type="range" min="1" max="10" value={wheelScores[WHEEL_AREAS[activeArea].name] || 5} onChange={e => updateScore(WHEEL_AREAS[activeArea].name, parseInt(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text3 }}><span>1 — критично</span><span>10 — отлично</span></div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
              {WHEEL_AREAS.map((area, i) => (
                <div key={area.name} onClick={() => setActiveArea(activeArea === i ? null : i)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', background: activeArea === i ? 'rgba(45,106,79,0.1)' : 'rgba(45,32,16,0.03)', border: `1px solid ${T.bdrS}` }}>
                  <span style={{ fontSize: 16 }}>{area.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: T.text1 }}>{area.name}</div>
                    <div style={{ height: 4, borderRadius: 2, background: T.bdrS, marginTop: 3 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: area.color, width: `${((wheelScores[area.name] || 5) / 10) * 100}%`, transition: 'width .3s' }} />
                    </div>
                  </div>                  <span style={{ fontSize: 13, fontWeight: 700, color: area.color }}>{wheelScores[area.name] || 5}</span>
                </div>
              ))}
            </div>
          </div>
          <AiBox
            kb={JSON.stringify(profile)}
            prompt={`Проанализируй колесо жизни. Оценки: ${WHEEL_AREAS.map(a => a.name + ': ' + (wheelScores[a.name] || 5)).join(', ')}. Приоритеты: ${(profile.goalAreas || []).join(', ') || '—'}. Главная цель: ${profile.mainGoal || '—'}. Дай с заголовками ##: Общий баланс; Слабые сферы — что делать; Сильные — как использовать; Действие на неделю.`}
            label="Анализ колеса жизни" btnText="Проанализировать" placeholder="Проанализирую твой баланс..."
          />
        </>
      )}

      {/* === ВКЛАДКА: ПЛАН === */}
      {tab === 'plan' && (
        profile.mainGoal ? (
          <>
            <div style={{ padding: '12px 14px', background: 'rgba(45,106,79,0.07)', borderRadius: 12, marginBottom: 12, borderLeft: `3px solid ${T.gold}` }}>
              <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5, marginBottom: 4 }}>ЦЕЛЬ</div>
              <div style={{ fontSize: 16, color: T.gold, fontFamily: "'Cormorant Infant',serif" }}>{profile.mainGoal}</div>
              {profile.goalDeadline && <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>До: {new Date(profile.goalDeadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · Осталось: {Math.max(0, Math.ceil((new Date(profile.goalDeadline) - new Date()) / 86400000))} дней</div>}
            </div>
            <AiBox
              kb={JSON.stringify(profile)}
              prompt={`Составь детальный еженедельный план достижения цели: ${profile.mainGoal}. Срок: ${profile.goalDeadline || '3 месяца'}. Метрика: ${profile.goalMetric || '—'}. Сферы: ${(profile.goalAreas || []).join(', ') || '—'}. Барьеры: ${(profile.goalBlocks || []).join(', ') || '—'}. Свободное время: ${profile.selfTime || '30'} мин/день после ${profile.workEnd || '18:00'}. Хронотип: ${profile.chronotype || '—'}. Дай: 1) план на 4 недели, 2) ежедневные микродействия, 3) как отслеживать прогресс, 4) что делать если сорвался.`}
              label="Подробный план на месяц" btnText="Составить план" placeholder="Составлю пошаговый план..."
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: T.text3 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>Цель не установлена</div>
            <button className="btn btn-primary" onClick={() => { setTab('goal'); setEditGoal(true); }}>Установить цель</button>
          </div>
        )
      )}

      {/* === ВКЛАДКА: ПОМОЩНИКИ === */}
      {tab === 'tools' && (
        <div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
            {[{ id: 'weight', label: '⚖️ Вес' }, { id: 'habits', label: '✅ Привычки' }, { id: 'calories', label: '🔥 Калории' }, { id: 'workout', label: '💪 Тренировки' }].map(t => (
              <button key={t.id} onClick={() => setToolsTab(t.id)} style={{ flex: 1, minWidth: 60, padding: '6px 4px', borderRadius: 10, border: `1px solid ${toolsTab === t.id ? T.gold + '88' : 'rgba(255,255,255,0.08)'}`, background: toolsTab === t.id ? 'rgba(200,164,90,0.12)' : 'rgba(255,255,255,0.02)', color: toolsTab === t.id ? T.gold : T.text2, fontSize: 11, cursor: 'pointer', transition: 'all .15s' }}>{t.label}</button>
            ))}
          </div>

          {/* Трекер веса */}
          {toolsTab === 'weight' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>                <input type="number" step="0.1" placeholder="Вес (кг)" id="weight-input" style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${T.bdr}`, background: 'rgba(255,255,255,0.03)', color: T.text0, fontSize: 16, outline: 'none' }} />
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const inp = document.getElementById('weight-input');
                  const val = parseFloat(inp.value);
                  if (!val || val < 20 || val > 300) { notify("Введи корректный вес"); return; }
                  setGoalsTools(p => ({ ...p, weightLog: [...(p.weightLog || []), { date: today_d, weight: val }].slice(-90) }));
                  inp.value = ''; notify("Вес записан ✦");
                }}>Записать</button>
              </div>
              {(goalsTools.weightLog || []).length > 1 && (() => {
                const log = goalsTools.weightLog.slice(-14);
                const weights = log.map(l => l.weight);
                const min = Math.min(...weights) - 0.5, max = Math.max(...weights) + 0.5, range = max - min || 1;
                const W = 280, H = 80;
                const pts = log.map((l, i) => ({ x: i / (log.length - 1) * W, y: H - (l.weight - min) / range * H }));
                const path = pts.map((p, i) => (i === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ', ' + p.y.toFixed(1)).join(' ');
                const latest = log[log.length - 1], first = log[0], diff = +(latest.weight - first.weight).toFixed(1);
                return (
                  <div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(200,164,90,0.08)', borderRadius: 10, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: T.gold, fontFamily: "'JetBrains Mono'" }}>{latest.weight}</div><div style={{ fontSize: 10, color: T.text3 }}>кг сейчас</div></div>
                      <div style={{ flex: 1, padding: '8px 10px', background: diff > 0 ? 'rgba(232,120,120,0.08)' : 'rgba(123,204,160,0.08)', borderRadius: 10, textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: diff > 0 ? '#E87878' : T.success, fontFamily: "'JetBrains Mono'" }}>{diff > 0 ? '+' : ''}{diff}</div><div style={{ fontSize: 10, color: T.text3 }}>за период</div></div>
                    </div>
                    <svg width={W} height={H + 20} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
                      <path d={path} fill="none" stroke={T.gold} strokeWidth="2" />
                      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={T.gold} />)}
                      <text x="0" y={H + 14} fontSize="9" fill={T.text3}>{log[0].date.slice(5)}</text>
                      <text x={W} y={H + 14} fontSize="9" fill={T.text3} textAnchor="end">{latest.date.slice(5)}</text>
                    </svg>
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ fontSize: 11, color: T.text3, cursor: 'pointer' }}>История ({log.length} записей)</summary>
                      {[...log].reverse().map((l, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, alignItems: 'center' }}>
                          <span style={{ color: T.text3, fontFamily: "'JetBrains Mono'", fontSize: 11, flex: 1 }}>{l.date}</span>
                          <span style={{ color: T.text0, fontWeight: 500 }}>{l.weight} кг</span>
                          <div className="ico-btn danger" style={{ fontSize: 10, padding: '1px 4px' }} onClick={() => setGoalsTools(p => ({ ...p, weightLog: p.weightLog.filter(x => x !== l) }))}>✕</div>
                        </div>
                      ))}
                    </details>
                  </div>
                );
              })()}
              {(goalsTools.weightLog || []).length === 0 && <div className="empty"><span className="empty-ico">⚖️</span><p>Введи первое значение веса</p></div>}
            </div>
          )}

          {/* Трекер привычек */}
          {toolsTab === 'habits' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>                <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5 }}>ПРИВЫЧКИ</div>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => {
                  const name = window.prompt("Название привычки: ");
                  if (name && name.trim()) setGoalsTools(p => ({ ...p, habits: [...(p.habits || []), { id: 'h-' + Date.now(), name: name.trim(), log: {} }] }));
                }}>+ Добавить</button>
              </div>
              {(goalsTools.habits || []).length === 0 && <div className="empty"><span className="empty-ico">✅</span><p>Добавь первую привычку</p></div>}
              {(goalsTools.habits || []).map((habit, hi) => {
                const done = !!(habit.log || {})[today_d];
                const streak = (() => { let s = 0, d = new Date(); for (let i = 0; i < 365; i++) { const k = d.toISOString().split('T')[0]; if (!(habit.log || {})[k]) break; s++; d.setDate(d.getDate() - 1); } return s; })();
                return (
                  <div key={habit.id} style={{ marginBottom: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`chk ${done ? 'done' : ''}`} style={{ width: 24, height: 24, fontSize: 13, flexShrink: 0 }} onClick={() => setGoalsTools(p => ({ ...p, habits: p.habits.map((h, i) => i === hi ? { ...h, log: { ...(h.log || {}), [today_d]: !done } } : h) }))}>
                        {done ? '✓' : ' '}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: T.text0 }}>{habit.name}</div>
                        {streak > 0 && <div style={{ fontSize: 10, color: T.gold, fontFamily: "'JetBrains Mono'" }}>🔥 {streak} дн. подряд</div>}
                      </div>
                      <div className="ico-btn" style={{ fontSize: 11, color: T.teal, padding: '1px 4px' }} onClick={() => {
                        const n = window.prompt("Переименовать: ", habit.name);
                        if (n && n.trim()) setGoalsTools(p => ({ ...p, habits: p.habits.map((h, i) => i === hi ? { ...h, name: n.trim() } : h) }));
                      }}>✏️</div>
                      <div className="ico-btn danger" style={{ fontSize: 11, padding: '1px 4px' }} onClick={() => {
                        if (window.confirm("Удалить привычку? ")) setGoalsTools(p => ({ ...p, habits: p.habits.filter((_, i) => i !== hi) }));
                      }}>✕</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Трекер калорий */}
          {toolsTab === 'calories' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5 }}>КАЛОРИИ</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.text3 }}>Цель:</span>
                  <input type="number" value={goalsTools.calories?.goal || ''} placeholder="ккал" onChange={e => setGoalsTools(p => ({ ...p, calories: { ...(p.calories || {}), goal: parseInt(e.target.value) || 0 } }))} style={{ width: 70, padding: '4px 8px', borderRadius: 8, border: `1px solid ${T.bdr}`, background: 'rgba(255,255,255,0.03)', color: T.text0, fontSize: 13, outline: 'none' }} />
                  <span style={{ fontSize: 11, color: T.text3 }}>ккал</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input type="number" placeholder="ккал" id="cal-input" style={{ width: 70, padding: '7px 8px', borderRadius: 10, border: `1px solid ${T.bdr}`, background: 'rgba(255,255,255,0.03)', color: T.text0, fontSize: 14, outline: 'none' }} />
                <input placeholder="Что съела" id="cal-note" style={{ flex: 1, padding: '7px 10px', borderRadius: 10, border: `1px solid ${T.bdr}`, background: 'rgba(255,255,255,0.03)', color: T.text0, fontSize: 13, outline: 'none' }} />
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const kcal = parseInt(document.getElementById('cal-input').value);                  const note = document.getElementById('cal-note').value;
                  if (!kcal) { notify("Введи калории"); return; }
                  setGoalsTools(p => ({ ...p, calories: { ...(p.calories || { goal: 0 }), log: [...(p.calories?.log || []), { date: today_d, kcal, note: note || '', time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }] } }));
                  document.getElementById('cal-input').value = '';
                  document.getElementById('cal-note').value = '';
                }}>+</button>
              </div>
              {(() => {
                const todayLog = (goalsTools.calories?.log || []).filter(l => l.date === today_d);
                const total = todayLog.reduce((s, l) => s + l.kcal, 0);
                const goal = goalsTools.calories?.goal || 0;
                const pct = goal ? Math.min(100, Math.round(total / goal * 100)) : 0;
                return (
                  <div>
      <SectionHero sectionId="goals" />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(200,164,90,0.08)', borderRadius: 10, textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, color: T.gold, fontFamily: "'JetBrains Mono'" }}>{total}</div><div style={{ fontSize: 10, color: T.text3 }}>съедено</div></div>
                      {goal > 0 && <div style={{ flex: 1, padding: '8px 10px', background: total > goal ? 'rgba(232,120,120,0.08)' : 'rgba(123,204,160,0.08)', borderRadius: 10, textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 700, color: total > goal ? '#E87878' : T.success, fontFamily: "'JetBrains Mono'" }}>{goal - total}</div><div style={{ fontSize: 10, color: T.text3 }}>осталось</div></div>}
                    </div>
                    {goal > 0 && <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }}><div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct > 100 ? '#E87878' : T.teal, transition: 'width .3s' }} /></div>}
                    {todayLog.map((l, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", flexShrink: 0 }}>{l.time}</span>
                        <span style={{ flex: 1, fontSize: 13, color: T.text1 }}>{l.note || '—'}</span>
                        <span style={{ fontSize: 12, color: T.gold, fontFamily: "'JetBrains Mono'", flexShrink: 0 }}>{l.kcal}</span>
                        <div className="ico-btn danger" style={{ fontSize: 10, padding: '1px 4px' }} onClick={() => setGoalsTools(p => ({ ...p, calories: { ...p.calories, log: p.calories.log.filter(x => x !== l) } }))}>✕</div>
                      </div>
                    ))}
                    {todayLog.length === 0 && <div style={{ fontSize: 13, color: T.text3, fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Записей сегодня нет</div>}
                  </div>
                );
              })()}
            </div>
          )}

          {/* План тренировок */}
          {toolsTab === 'workout' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5 }}>ПЛАН ТРЕНИРОВОК</div>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setWorkoutForm(p => ({ ...p, show: !p.show }))}>{goalsTools.workout ? '✏️ Изменить' : '✦ Создать план'}</button>
              </div>
              {workoutForm.show && (
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 12, color: T.gold, marginBottom: 10, fontWeight: 500 }}>Настройка плана тренировок</div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: T.text3, marginBottom: 6 }}>Дни тренировок</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => (
                        <button key={d} onClick={() => setWorkoutForm(p => ({ ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d] }))} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${workoutForm.days.includes(d) ? T.gold + '88' : 'rgba(255,255,255,0.1)'}`, background: workoutForm.days.includes(d) ? 'rgba(200,164,90,0.2)' : 'transparent', color: workoutForm.days.includes(d) ? T.gold : T.text2 }}>{d}</button>
                      ))}                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: T.text3, marginBottom: 6 }}>Удобное время</div>
                    <input type="time" value={workoutForm.time} onChange={e => setWorkoutForm(p => ({ ...p, time: e.target.value }))} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.bdr}`, background: 'rgba(255,255,255,0.03)', color: T.text0, fontSize: 14, outline: 'none' }} />
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { notify("Генерация плана через AI доступна в полной версии. Сейчас используйте шаблон."); }} disabled={workoutLoading || workoutForm.days.length === 0}>✦ Составить план (AI)</button>
                </div>
              )}
              {!workoutForm.show && !goalsTools.workout && <div className="empty"><span className="empty-ico">💪</span><p>Нажми «✦ Создать план» для персонального плана</p></div>}
              {!workoutForm.show && goalsTools.workout && (
                <div>
                  <div style={{ padding: '10px 14px', background: 'rgba(200,164,90,0.08)', borderRadius: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 15, color: T.gold, fontFamily: "'Crimson Pro',serif", fontWeight: 500 }}>{goalsTools.workout.title}</div>
                    <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>{goalsTools.workout.goal}</div>
                  </div>
                  {(goalsTools.workout.days || []).map((d, di) => (
                    <div key={di} style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: 12, color: T.gold, fontFamily: "'JetBrains Mono'", fontWeight: 700, minWidth: 25 }}>{d.day}</span>
                        <span style={{ flex: 1, fontSize: 13, color: T.text1 }}>{d.type}</span>
                        <span style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'" }}>{d.duration}</span>
                      </div>
                      {(d.exercises || []).length > 0 && (
                        <div style={{ padding: '8px 14px' }}>
                          {d.exercises.map((ex, ei) => (
                            <div key={ei} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: 11, color: T.teal, fontFamily: "'JetBrains Mono'", flexShrink: 0, minWidth: 35 }}>{ex.sets}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, color: T.text0 }}>{ex.name}</div>
                                {ex.note && <div style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>{ex.note}</div>}
                              </div>
                              {ex.rest && <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>{ex.rest}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
                                      }
