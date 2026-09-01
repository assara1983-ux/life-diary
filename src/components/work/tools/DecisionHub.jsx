// src/components/work/tools/DecisionHub.jsx
import { useState } from 'react';
import { useApp } from '../../../store/AppContext';

const FRAMEWORKS = [
  {
    id: 'eisenhower',
    icon: '🎯',
    title: 'Матрица Эйзенхауэра',
    desc: 'Разделение задач по срочности и важности',
    color: 'rgba(0,112,192,0.4)',
    questions: [
      { q: 'Какие задачи важные и срочные?', placeholder: 'Сделать срочно самому...' },
      { q: 'Какие важные, но не срочные?', placeholder: 'Запланировать...' },
      { q: 'Какие срочные, но не важные?', placeholder: 'Делегировать...' },
      { q: 'От чего можно отказаться?', placeholder: 'Исключить...' },
    ],
  },
  {
    id: 'swot',
    icon: '⚡',
    title: 'SWOT-анализ',
    desc: 'Сильные и слабые стороны, возможности и угрозы',
    color: 'rgba(34,197,94,0.4)',
    questions: [
      { q: 'В чём наши сильные стороны?', placeholder: 'Strengths...' },
      { q: 'В чём слабые стороны?', placeholder: 'Weaknesses...' },
      { q: 'Какие возможности есть сейчас?', placeholder: 'Opportunities...' },
      { q: 'Какие угрозы могут возникнуть?', placeholder: 'Threats...' },
    ],
  },
  {
    id: '10-10-10',
    icon: '⏱',
    title: 'Правило 10-10-10',
    desc: 'Как я буду относиться к этому решению через 10 минут, 10 месяцев и 10 лет?',
    color: 'rgba(200,164,90,0.4)',
    questions: [
      { q: 'Как я почувствую себя через 10 минут?', placeholder: 'Краткосрочная реакция...' },
      { q: 'Как я почувствую себя через 10 месяцев?', placeholder: 'Среднесрочные последствия...' },
      { q: 'Как я почувствую себя через 10 лет?', placeholder: 'Долгосрочный взгляд...' },
    ],
  },
  {
    id: 'mental',
    icon: '🔮',
    title: 'Ментальные модели',
    desc: 'Применение проверенных принципов мышления',
    color: 'rgba(168,85,247,0.4)',
    questions: [
      { q: 'Какое второе мнение можно получить?', placeholder: 'Альтернативная точка зрения...' },
      { q: 'Какое самое простое объяснение (бритва Оккама)?', placeholder: 'Простейшее решение...' },
      { q: 'Что если сделать наоборот (инверсия)?', placeholder: 'Инвертированный подход...' },
    ],
  },
];

export function DecisionHub() {
  const { aiNotes, setAiNotes, notify } = useApp();

  const [selected, setSelected]   = useState(null);
  const [answers, setAnswers]     = useState({});
  const [aiResult, setAiResult]   = useState('');
  const [loading, setLoading]     = useState(false);

  const fw = FRAMEWORKS.find(f => f.id === selected);

  const openFw = (id) => {
    setSelected(id);
    setAnswers({});
    setAiResult('');
  };

  const setAnswer = (i, val) => setAnswers(p => ({ ...p, [i]: val }));

  const analyzeWithAI = async () => {
    if (!fw) return;
    setLoading(true);
    setAiResult('');
    const filled = fw.questions
      .map((q, i) => answers[i] ? `${q.q}\nОтвет: ${answers[i]}` : null)
      .filter(Boolean).join('\n\n');

    if (!filled) { notify('Заполните хотя бы один ответ'); setLoading(false); return; }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `Ты — опытный бизнес-стратег и коуч. Проанализируй ответы пользователя по фреймворку "${fw.title}" и дай конкретные, практичные рекомендации для бухгалтера/ИП в РК. Будь краток (200–300 слов).`,
          user: `Фреймворк: ${fw.title}\n\n${filled}`,
          maxTokens: 512,
        }),
      });
      const data = await res.json();
      setAiResult(data.text || 'Не удалось получить анализ.');
    } catch {
      setAiResult('Ошибка соединения с ИИ.');
    } finally {
      setLoading(false);
    }
  };

  const saveInsight = () => {
    if (!aiResult && !Object.keys(answers).length) { notify('Нечего сохранять'); return; }
    const note = {
      id: 'dn-' + Date.now(),
      title: `${fw?.title} · ${new Date().toLocaleDateString('ru-RU')}`,
      content: aiResult || Object.entries(answers).map(([i, a]) =>
        `${fw.questions[i]?.q}\n→ ${a}`
      ).join('\n\n'),
      createdAt: new Date().toISOString(),
    };
    setAiNotes(p => [note, ...p]);
    notify('✅ Решение сохранено в заметках');
  };

  // ─── Сетка фреймворков ───
  if (!selected) {
    return (
      <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
          }}>ХАБ РЕШЕНИЙ</div>
          <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
            Структурированные методики принятия решений
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {FRAMEWORKS.map(f => (
            <div key={f.id} onClick={() => openFw(f.id)}
              style={{
                padding: '20px 16px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${f.color}`,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{
                fontSize: 17, fontWeight: 600, color: 'var(--text1)',
                marginBottom: 6, fontFamily: "'Cormorant Infant',serif",
              }}>{f.title}</div>
              <div style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.5 }}>
                {f.desc}
              </div>
              <div style={{
                marginTop: 14, padding: '6px 0', textAlign: 'center',
                borderTop: `1px solid ${f.color}`,
                fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 1, color: 'rgba(200,164,90,0.6)',
              }}>
                ОТКРЫТЬ →
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Открытый фреймворк ───
  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Навигация */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div onClick={() => setSelected(null)}
          style={{
            padding: '6px 14px', borderRadius: 14, cursor: 'pointer', fontSize: 14,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(0,0,0,0.12)`,
            color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace",
          }}
        >← Назад</div>
        <div style={{ fontSize: 14, color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace" }}>
          /
        </div>
        <div style={{ fontSize: 17, fontFamily: "'Cormorant Infant',serif", color: 'var(--text1)' }}>
          {fw.icon} {fw.title}
        </div>
      </div>

      {/* Вопросы с полями ввода */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {fw.questions.map((q, i) => (
          <div key={i} style={{
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.70)',
            border: `1px solid ${answers[i] ? fw.color : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 10, transition: 'border 0.2s',
          }}>
            <div style={{
              fontSize: 16, color: 'rgba(200,164,90,0.85)',
              marginBottom: 8, lineHeight: 1.4,
              borderLeft: `3px solid ${fw.color}`,
              paddingLeft: 10,
            }}>
              {q.q}
            </div>
            <textarea
              value={answers[i] || ''}
              onChange={e => setAnswer(i, e.target.value)}
              placeholder={q.placeholder}
              rows={2}
              style={{
                width: '100%', padding: '8px 10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, color: 'var(--text1)',
                fontSize: 15, lineHeight: 1.5, resize: 'vertical',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={analyzeWithAI} disabled={loading} style={{
          flex: 1, padding: '12px 0', borderRadius: 20,
          background: 'rgba(0,112,192,0.1)', border: '1px solid rgba(0,112,192,0.3)',
          color: 'rgba(100,180,255,0.9)', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, fontFamily: "'JetBrains Mono',monospace",
        }}>
          {loading ? '✦ Анализирую...' : '🤖 Анализ ИИ'}
        </button>
        <button onClick={saveInsight} style={{
          flex: 1, padding: '12px 0', borderRadius: 20,
          background: 'rgba(200,164,90,0.1)', border: '1px solid rgba(200,164,90,0.4)',
          color: 'rgba(200,164,90,0.9)', fontSize: 16, cursor: 'pointer',
          fontFamily: "'JetBrains Mono',monospace",
        }}>
          💾 Сохранить решение
        </button>
      </div>

      {/* ИИ результат */}
      {aiResult && (
        <div style={{
          padding: '16px 18px',
          background: 'rgba(0,112,192,0.05)',
          border: '1px solid rgba(0,112,192,0.2)',
          borderRadius: 12, fontSize: 16, lineHeight: 1.7,
          color: 'var(--text1)', whiteSpace: 'pre-wrap',
        }}>
          <div style={{
            fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: 'rgba(0,160,255,0.5)', marginBottom: 8,
          }}>ИИ АНАЛИЗ</div>
          {aiResult}
        </div>
      )}
    </div>
  );
      }
