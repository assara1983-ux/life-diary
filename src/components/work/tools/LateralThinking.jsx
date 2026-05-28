// src/components/work/tools/LateralThinking.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../../../store/AppContext';

const PROMPTS = [
  'Что если посмотреть на эту проблему с точки зрения клиента или контрагента?',
  'Как бы решил эту задачу человек из совершенно другой сферы — физик, художник, фермер?',
  'Что если полностью отказаться от привычного подхода — что останется?',
  'Какое самое абсурдное решение можно придумать? А теперь как его сделать рабочим?',
  'Какая скрытая выгода может быть в этой проблеме?',
  'Что если увеличить масштаб задачи в 10 раз? Или уменьшить в 100?',
  'Как выглядело бы идеальное решение через 5 лет?',
  'Какие допущения мы принимаем как данность, хотя они могут быть ошибочны?',
  'Что если соединить эту задачу с несвязанной областью — природа, искусство, космос?',
  'Какое решение выбрал бы ваш будущий «я» через 10 лет?',
  'Что мешает решить это прямо сейчас? Можно ли устранить это препятствие?',
  'Если бы бюджет был неограничен — что бы вы сделали иначе?',
];

const SYSTEM = `Ты — творческий коуч и стратег для бухгалтера в РК.
Используй метод латерального мышления Эдварда де Боно.
Дай конкретный, практичный и вдохновляющий ответ на запрос.
Связывай идеи с реальной бухгалтерской практикой.
Отвечай на русском языке, кратко и по делу (150–250 слов).`;

export function LateralThinking() {
  const { tasks, notify } = useApp();

  const [currentPrompt,  setCurrentPrompt]  = useState('');
  const [situation,      setSituation]      = useState('');
  const [history,        setHistory]        = useState(() => {
    try { return JSON.parse(localStorage.getItem('ld_lateral_history') || '[]'); }
    catch { return []; }
  });
  const [selectedTask,   setSelectedTask]   = useState(null);
  const [aiResponse,     setAiResponse]     = useState('');
  const [loading,        setLoading]        = useState(false);
  const [showAI,         setShowAI]         = useState(false);

  const workTasks = tasks.filter(t => t.section === 'work' && !t.doneDate);

  useEffect(() => {
    try { localStorage.setItem('ld_lateral_history', JSON.stringify(history.slice(0, 10))); }
    catch {}
  }, [history]);

  const generatePrompt = () => {
    const idx = Math.floor(Math.random() * PROMPTS.length);
    const p   = PROMPTS[idx];
    setCurrentPrompt(p);
    setAiResponse('');
    setShowAI(false);
    setHistory(prev => [p, ...prev.filter(x => x !== p)].slice(0, 10));
    notify('✨ Новый угол зрения');
  };

  const applyToAI = async (prompt) => {
    if (!prompt) { notify('Сначала сгенерируйте промпт'); return; }
    setLoading(true);
    setShowAI(true);
    setAiResponse('');

    const taskContext = selectedTask
      ? `Задача: "${selectedTask.title}". `
      : '';
    const situationContext = situation.trim()
      ? `Описание ситуации: "${situation.trim()}". `
      : 'Контекст: работа бухгалтера в РК. ';

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM,
          user: taskContext + situationContext + prompt,
          maxTokens: 512,
        }),
      });
      const data = await res.json();
      setAiResponse(data.text || 'Не удалось получить ответ.');
    } catch {
      setAiResponse('Ошибка соединения с ИИ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'var(--text3)', marginBottom: 4,
        }}>НЕСТАНДАРТНОЕ МЫШЛЕНИЕ</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif", color: 'var(--text0)' }}>
          Инструмент для поиска неожиданных решений
        </div>
      </div>

      {/* Описание ситуации — новое поле */}
      <div style={{
        marginBottom: 16, padding: '14px 16px',
        background: 'rgba(0,112,192,0.04)',
        border: '1px solid rgba(0,112,192,0.15)',
        borderRadius: 12,
      }}>
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 2, color: '#0070c0', marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: '#0070c0',
          }} />
          ОПИШИТЕ ВАШУ СИТУАЦИЮ
        </div>
        <textarea
          value={situation}
          onChange={e => setSituation(e.target.value)}
          placeholder="Расскажите подробнее о проблеме или задаче, которую нужно решить нестандартно. Чем больше деталей — тем точнее будет ответ ИИ..."
          rows={3}
          style={{
            width: '100%', padding: '10px 12px',
            background: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(0,112,192,0.15)',
            borderRadius: 8, color: 'var(--text0)',
            fontSize: 13, lineHeight: 1.5,
            resize: 'vertical', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {situation.trim() && (
          <div style={{
            marginTop: 6, fontSize: 11, color: '#0070c0',
            fontFamily: "'JetBrains Mono',monospace",
          }}>✓ Контекст добавлен — ИИ учтёт его в ответе</div>
        )}
      </div>

      {/* Привязка к задаче */}
      {workTasks.length > 0 && (
        <div style={{
          marginBottom: 16, padding: '12px 14px',
          background: 'rgba(0,0,0,0.02)',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 10,
        }}>
          <div style={{
            fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 1, color: 'var(--text3)', marginBottom: 8,
          }}>ПРИВЯЗАТЬ К ЗАДАЧЕ (необязательно)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {workTasks.slice(0, 5).map(t => (
              <div key={t.id}
                onClick={() => setSelectedTask(selectedTask?.id === t.id ? null : t)}
                style={{
                  padding: '5px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 11,
                  border: `1px solid ${selectedTask?.id === t.id ? 'rgba(0,112,192,0.4)' : 'rgba(0,0,0,0.1)'}`,
                  background: selectedTask?.id === t.id ? 'rgba(0,112,192,0.08)' : 'transparent',
                  color: selectedTask?.id === t.id ? '#0070c0' : 'var(--text3)',
                  transition: 'all 0.15s',
                }}
              >{t.title.slice(0, 30)}{t.title.length > 30 ? '…' : ''}</div>
            ))}
          </div>
        </div>
      )}

      {/* Текущий промпт */}
      <div style={{
        minHeight: 110, padding: '20px', marginBottom: 16,
        background: currentPrompt
          ? 'rgba(0,112,192,0.04)'
          : 'rgba(0,0,0,0.02)',
        border: `1px solid ${currentPrompt ? 'rgba(0,112,192,0.2)' : 'rgba(0,0,0,0.06)'}`,
        borderLeft: currentPrompt ? '3px solid #0070c0' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12, display: 'flex', alignItems: 'center',
        transition: 'all 0.3s',
      }}>
        {currentPrompt ? (
          <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text1)' }}>
            {currentPrompt}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: "'Cormorant Infant',serif" }}>
            Нажмите кнопку, чтобы получить новый угол зрения
          </div>
        )}
      </div>

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={generatePrompt} className="btn btn-primary" style={{ flex: 1, padding: '11px 0', borderRadius: 20 }}>
          ✨ Новый промпт
        </button>
        {currentPrompt && (
          <button onClick={() => applyToAI(currentPrompt)} disabled={loading}
            className="btn btn-ghost"
            style={{ flex: 1, padding: '11px 0', borderRadius: 20, opacity: loading ? 0.7 : 1 }}>
            {loading ? '✦ Думаю...' : '🤖 Применить ИИ'}
          </button>
        )}
      </div>

      {/* ИИ-ответ */}
      {showAI && (
        <div style={{
          marginBottom: 20, padding: '16px 18px',
          background: 'rgba(0,112,192,0.04)',
          border: '1px solid rgba(0,112,192,0.15)',
          borderLeft: '3px solid #0070c0',
          borderRadius: 12, fontSize: 13, lineHeight: 1.7,
          color: 'var(--text1)',
        }}>
          <div style={{
            fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: '#0070c0', marginBottom: 8,
          }}>ИИ АНАЛИЗ</div>
          {loading ? (
            <div style={{ color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace" }}>
              ✦ анализирую...
            </div>
          ) : aiResponse}
        </div>
      )}

      {/* История */}
      {history.length > 0 && (
        <div>
          <div style={{
            fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: 'var(--text3)', marginBottom: 10,
          }}>ИСТОРИЯ ПРОМПТОВ · {history.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map((p, i) => (
              <div key={i}
                onClick={() => { setCurrentPrompt(p); setAiResponse(''); setShowAI(false); }}
                style={{
                  padding: '10px 14px',
                  background: currentPrompt === p ? 'rgba(0,112,192,0.05)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${currentPrompt === p ? 'rgba(0,112,192,0.2)' : 'rgba(0,0,0,0.06)'}`,
                  borderLeft: currentPrompt === p ? '2px solid #0070c0' : '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 8, cursor: 'pointer', fontSize: 12,
                  color: 'var(--text2)', lineHeight: 1.5, transition: 'all 0.15s',
                }}
              >{p}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
