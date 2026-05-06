// src/sections/MentalSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { parseAiResponse } from '../components/AiBox'; // Импортируем парсер, если нужно
import { askClaude } from '../services/aiClient'; // Заглушка для вызова AI
import { T } from '../utils/theme';
import { getMoon } from '../utils/helpers';

// Простой парсер для отображения ответа (вместо импорта из AiBox, чтобы избежать цикличности)
function parseAiResponse(text) {
  if (!text) return [];
  const blocks = [];
  const lines = text.split('\n');
  let currentText = [];
  const flushText = () => {
    if (currentText.length > 0) {
      blocks.push({ type: 'paragraph', content: currentText.join(' ').trim() });
      currentText = [];
    }
  };
  
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) { flushText(); continue; }
    
    if (/^#{1,4}\s/.test(trimmed)) {
      flushText();
      blocks.push({ type: 'header', content: trimmed.replace(/^#{1,4}\s*/, '') });
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushText();
      blocks.push({ type: 'list', items: [{ title: '', body: trimmed }] });
    } else {
      currentText.push(trimmed);
    }
  }
  flushText();
  return blocks;
}

export function MentalSection() {
  const { 
    profile,
    mentalMood, setMentalMood,
    mentalStress, setMentalStress,
    mentalLog, setMentalLog,
    mentalRecoveryPlan, setRecoveryPlan,
    customPractices, setCustomPractices
  } = useApp();

  const [mood, setMood] = useState(mentalMood || 3);  const [stress, setStress] = useState(mentalStress || 5);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [openPractice, setOpenPractice] = useState(null);
  const [addingCustom, setAddingCustom] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const moon = getMoon();
  const freeFrom = profile.workEnd || '18:00';
  const currentHour = new Date().getHours();
  const stressors = (profile.stressors || []).join(', ');
  const recovery = (profile.recovery || []).join(', ');
  const isSedentary = (profile.workType || ' ').includes('офис') || (profile.workType || ' ').includes('удалённо');

  // Сохранение в контекст
  const saveMoodLog = () => {
    const logEntry = {
      date: new Date().toISOString(),
      mood: mood,
      stress: stress,
      note: note
    };
    // Обновляем лог (добавляем в начало)
    setMentalLog([logEntry, ...mentalLog]);
    
    // Обновляем текущие состояния
    setMentalMood(mood);
    setMentalStress(stress);
    
    setSaved(true); 
    // notify("Записано"); 
    setTimeout(() => setSaved(false), 2000);
  };

  // Получение плана восстановления
  const getRecoveryPlan = async () => {
    setLoadingPlan(true);
    try {
      // Здесь должен быть реальный вызов API. 
      // Пока используем заглушку askClaude или логику из старого кода.
      // В новом коде мы обычно используем AiBox, но здесь для плана восстановления сделаем прямой вызов, если нужно.
      // Для примера просто обновим стейт.
      
      const prompt = `Дай персональный план восстановления на сегодня. Настроение: ${mood}/5. Стресс: ${stress}/10. ` +
        `Стрессоры: ${stressors}. Восстановление: ${recovery}. Хронотип: ${profile.chronotype || '—'}. ` +
        `Свободен(а) после: ${freeFrom}. Луна: ${moon.n} (${moon.t}). ` +
        `Дай: 1) экстренную технику прямо сейчас (2-3 мин), 2) вечерний ритуал после ${freeFrom}, ` +
        `3) что поможет со сном, 4) аффирмацию под ценность ${profile.coreValue || '—'}. ` +
        `Нумерованным списком.`;
      // const r = await askClaude(profile, prompt); // Нужно подключить реальный вызов
      
      // Заглушка для демонстрации структуры
      const mockResponse = `1. **Экстренно**: Техника дыхания 4-7-8. Вдох 4с, задержка 7с, выдох 8с.\n` +
                           `2. **Вечер**: Прогулка 20 мин без телефона.\n` +
                           `3. **Сон**: Магний и темная комната.\n` +
                           `4. **Аффирмация**: "Я в безопасности и спокоен".`;

      // setRecoveryPlan(r); 
      setRecoveryPlan(mockResponse); 
    } catch (e) {
      console.error(e);
    }
    setLoadingPlan(false);
  };

  // Сохранение пользовательской практики
  const saveCustomPractice = () => {
    if (!addingCustom || !addingCustom.name) return;
    setCustomPractices([...customPractices, { ...addingCustom, id: Date.now() }]);
    setAddingCustom(null);
    // notify("Практика добавлена");
  };

  const moodEmoji = ['😔', '😟', '😐', '🙂', '😊', '🤩'][mood] || '😐';
  const moodLabel = ['Очень плохо', 'Плохо', 'Нейтрально', 'Хорошо', 'Отлично', 'Превосходно'][mood] || '';
  const stressColor = stress <= 3 ? T.success : stress <= 6 ? T.warn : T.danger;

  // Базовые практики по категориям
  const PRACTICES = {
    breath: {
      icon: '🌬️', name: 'Дыхание',
      items: [
        { id: '47-8', icon: '🌬️', name: '4-7-8 — тревога', desc: 'Вдох 4с → задержка 7с → выдох 8с. Повтори 4 раза. Активирует парасимпатику.', time: '3 мин', color: 'rgba(78,201,190,0.12)' },
        { id: 'box', icon: '⬜', name: 'Бокс — паника', desc: 'Вдох 4с → задержка 4с → выдох 4с → задержка 4с. Метод спецслужб.', time: '4 мин', color: 'rgba(90,142,200,0.12)' },
        ...(customPractices.filter(p => p.type === 'breath'))
      ]
    },
    yoga: {
      icon: '🧘', name: 'Йога и цигун',
      items: [
        { id: 'surya', icon: '☀️', name: 'Сурья Намаскар — утро', desc: '12 поз солнечного приветствия. Активирует всё тело.', time: '15 мин', color: 'rgba(200,140,58,0.1)' },
        ...(customPractices.filter(p => p.type === 'yoga'))
      ]
    },
    meditation: {
      icon: '🕯️', name: 'Медитация',
      items: [
        { id: 'vip', icon: '👁', name: 'Випассана — осознанность', desc: 'Наблюдай дыхание. Когда мысль — замечай её и возвращайся.', time: '10 мин', color: 'rgba(200,164,90,0.1)' },
        ...(customPractices.filter(p => p.type === 'meditation'))      ]
    },
    sound: {
      icon: '🎵', name: 'Звукотерапия',
      items: [
        { id: '432', icon: '🎵', name: '432 Гц — расслабление', desc: 'Снижает тревогу, гармонизирует нервную систему.', time: '20 мин', when: 'Вечер, стресс' },
        ...(customPractices.filter(p => p.type === 'sound'))
      ]
    },
    kpt: {
      icon: '🧠', name: 'Психология',
      items: [
        { id: '54321', icon: '🌱', name: '5-4-3-2-1 — заземление', desc: '5 вещей что видишь → 4 что потрогать → 3 что слышишь → 2 что чувствуешь → 1 что нюхаешь.', time: '2 мин', color: 'rgba(91,173,122,0.1)' },
        { id: 'thanks', icon: '🙏', name: 'Практика благодарности', desc: 'Запиши 3 вещи за которые благодарен сегодня.', time: '5 мин', color: 'rgba(200,164,90,0.1)' },
        ...(customPractices.filter(p => p.type === 'kpt'))
      ]
    }
  };

  const renderPracticeList = (catKey) => {
    const cat = PRACTICES[catKey];
    if (!cat) return null;
    return (
      <div style={{ marginBottom: 8 }}>
        {cat.items.map((item, idx) => {
          const isOpen = openPractice === `item:${catKey}:${idx}`;
          return (
            <div key={item.id || idx} style={{ marginBottom: 6, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: item.color || 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setOpenPractice(isOpen ? null : `item:${catKey}:${idx}`)}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: T.text0, fontFamily: "'Crimson Pro',serif" }}>{item.name}</div>
                  {item.time && <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>{item.time}</span>}
                </div>
                <span style={{ fontSize: 12, color: T.text3 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <div style={{ padding: '0 14px 14px 44px' }}>
                  <div style={{ fontSize: 14, color: T.text2, lineHeight: 1.7, marginBottom: 10 }}>{item.desc}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                        // Добавление в планировщик (нужен доступ к setTasks из контекста)
                        // setTasks(...)
                    }}>⏰ В планировщик</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}        <div style={{ marginTop: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 12, border: '1px dashed rgba(200,164,90,0.3)' }} onClick={() => setAddingCustom({ type: catKey, name: '', desc: '', time: '', icon: '⭐' })}>+ Добавить свою практику</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* - Состояние — компактно - */}
      <div style={{ padding: '12px 14px', background: 'rgba(200,164,90,0.06)', borderRadius: 12, border: '1px solid rgba(200,164,90,0.15)', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>{moodEmoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>НАСТРОЕНИЕ</span>
              <span style={{ fontSize: 12, color: T.text2, fontStyle: 'italic' }}>{moodLabel}</span>
            </div>
            <input type="range" min="0" max="5" step="1" value={mood} onChange={e => setMood(parseInt(e.target.value))} style={{ width: '100%', accentColor: T.gold, height: 4 }} />
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 16, width: 28, textAlign: 'center' }}>{stress <= 3 ? '😌' : stress <= 6 ? '😤' : '😰'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>СТРЕСС</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: stressColor, fontFamily: "'JetBrains Mono'" }}>{stress}/10</span>
            </div>
            <input type="range" min="1" max="10" step="1" value={stress} onChange={e => setStress(parseInt(e.target.value))} style={{ width: '100%', accentColor: stressColor, height: 4 }} />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid ' + T.bdr, borderRadius: 8, color: T.text0, fontFamily: "'Crimson Pro',serif", fontSize: 14, outline: 'none' }} placeholder="Что на душе?..." value={note} onChange={e => setNote(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={saveMoodLog}>{saved ? '✓' : 'Записать'}</button>
        </div>
      </div>

      {/* - План восстановления - */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5 }}>ПЛАН ВОССТАНОВЛЕНИЯ</div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={getRecoveryPlan} disabled={loadingPlan}>
            {loadingPlan ? 'Думаю...' : mentalRecoveryPlan ? '↻ Обновить' : '✦ Получить план'}
          </button>
        </div>
        
        {loadingPlan && <div style={{ fontSize: 14, color: T.text3, fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>Составляю план под твоё состояние...</div>}
                {!loadingPlan && mentalRecoveryPlan && (
          <div className="ai-content">
            {parseAiResponse(mentalRecoveryPlan).map((b, i) => {
              if (b.type === 'header') return <div key={i} className="ai-header"><span className="ai-header-mark">◆</span>{b.content}</div>;
              if (b.type === 'list') return <div key={i} className="ai-list">
                {b.items.map((item, j) => (
                  <div key={j} className="ai-list-item">
                    <span className="ai-list-num">{j + 1}</span>
                    <div className="ai-list-body"><div className="ai-list-text">{item.body || item}</div></div>
                  </div>
                ))}
              </div>;
              return <div key={i} className="ai-paragraph">{b.content}</div>;
            })}
          </div>
        )}
        
        {!loadingPlan && !mentalRecoveryPlan && <div style={{ fontSize: 14, color: T.text3, fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>Нажми «Получить план» — составлю под твоё сегодняшнее состояние</div>}
      </div>

      {/* ПРАКТИКИ */}
      <div style={{ marginBottom: 6, marginTop: 4, fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5 }}>ПРАКТИКИ</div>

      {Object.entries(PRACTICES).map(([catKey, cat]) => (
        <div key={catKey} style={{ marginBottom: 8 }}>
          <div onClick={() => setOpenPractice(openPractice === catKey ? null : catKey)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, cursor: 'pointer', background: openPractice === catKey ? 'rgba(200,164,90,0.1)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (openPractice === catKey ? 'rgba(200,164,90,0.3)' : 'rgba(255,255,255,0.06)'), transition: 'all .15s' }}>
            <span style={{ fontSize: 24 }}>{cat.icon}</span>
            <div style={{ flex: 1, fontFamily: "'Crimson Pro',serif", fontSize: 17, color: openPractice === catKey ? T.gold : T.text0 }}>{cat.name}</div>
            <span style={{ fontSize: 12, color: T.text3, fontFamily: "'JetBrains Mono'" }}>{cat.items.length}</span>
            <span style={{ fontSize: 12, color: T.text3 }}>{openPractice === catKey ? '▲' : '▼'}</span>
          </div>
          {openPractice === catKey && <div style={{ marginTop: 6, paddingLeft: 4 }}>{renderPracticeList(catKey)}</div>}
        </div>
      ))}

      {/* - Модалка добавления своей практики - */}
      {addingCustom && (
        <div className="overlay" onClick={() => setAddingCustom(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setAddingCustom(null)}>✕</span>
            <div className="modal-title">Добавить практику</div>
            <div className="fld"><label>Название</label><input value={addingCustom.name} onChange={e => setAddingCustom(p => ({ ...p, name: e.target.value }))} placeholder="Мантра, растяжка, прогулка..." /></div>
            <div className="fld"><label>Описание — как выполнять</label><textarea value={addingCustom.desc} onChange={e => setAddingCustom(p => ({ ...p, desc: e.target.value }))} placeholder="Шаги, время, особенности..." style={{ minHeight: 80, resize: 'none', width: '100%', padding: '8px', borderRadius: 8, border: '1px solid ' + T.bdr, background: 'rgba(255,255,255,0.03)', color: T.text0, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div>
            <div className="fld-row">
              <div className="fld"><label>Время</label><input value={addingCustom.time} onChange={e => setAddingCustom(p => ({ ...p, time: e.target.value }))} placeholder="5 мин" /></div>
              <div className="fld"><label>Иконка</label><input value={addingCustom.icon} onChange={e => setAddingCustom(p => ({ ...p, icon: e.target.value }))} placeholder="⭐" maxLength={2} /></div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setAddingCustom(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={saveCustomPractice}>Добавить</button>            </div>
          </div>
        </div>
      )}
    </div>
  );
        }
