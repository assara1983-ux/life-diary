// src/components/work/tools/RecursiveSoulIndex.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../store/AppContext';

const QUESTIONS = [
  'Какое самое сильное эмоциональное состояние я испытываю сейчас при работе с документами?',
  'Какая задача в последнее время вызывает наибольшее сопротивление или усталость?',
  'Если бы моя работа была живым организмом, в каком состоянии она сейчас находится?',
  'Что я игнорирую или откладываю, хотя понимаю, что это важно?',
  'Какое одно маленькое изменение могло бы значительно улучшить качество моей работы?',
  'Какое качество во мне как в специалисте нуждается в развитии прямо сейчас?',
];

const OPTIONS = [
  'Это вызывает напряжение и усталость',
  'Я чувствую спокойствие и контроль',
  'Нужна помощь и переосмысление',
  'Я в потоке и удовлетворён процессом',
];

const SYSTEM = `Ты — мудрый психолог и профессиональный коуч для бухгалтера.
Проанализируй ответы человека на рефлексивные вопросы.
Дай глубокий, поддерживающий, но честный и практичный инсайт.
Включи: анализ состояния, ключевые темы, конкретные рекомендации на 14 дней.
Отвечай на русском языке (250–300 слов). Тон: тёплый, профессиональный.`;

export function RecursiveSoulIndex() {
  const { aiNotes, setAiNotes, notify } = useApp();

  const [qIndex,        setQIndex]        = useState(0);
  const [answers,       setAnswers]        = useState({});
  const [insight,       setInsight]        = useState('');
  const [transitioning, setTransitioning]  = useState(false);
  const [showInsight,   setShowInsight]    = useState(false);
  const [loadingInsight,setLoadingInsight] = useState(false);
  const [scrollY,       setScrollY]        = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollY(el.scrollTop * 0.3);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnswer = (answer) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      const newAnswers = { ...answers, [qIndex]: answer };
      setAnswers(newAnswers);
      if (qIndex < QUESTIONS.length - 1) {
        setQIndex(q => q + 1);
        setTransitioning(false);
      } else {
        generateInsight(newAnswers);
      }
    }, 280);
  };

  const generateInsight = async (finalAnswers) => {
    setShowInsight(true);
    setLoadingInsight(true);
    setInsight('');

    const answersText = QUESTIONS.map((q, i) =>
      finalAnswers[i] ? `Вопрос ${i + 1}: ${q}\nОтвет: ${finalAnswers[i]}` : null
    ).filter(Boolean).join('\n\n');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM,
          user: answersText,
          maxTokens: 768,
        }),
      });
      const data = await res.json();
      setInsight(data.text || 'Не удалось получить инсайт.');
      notify('✨ Рекурсивный инсайт сгенерирован');
    } catch {
      setInsight('Ошибка соединения. Попробуйте позже.');
    } finally {
      setLoadingInsight(false);
      setTransitioning(false);
    }
  };

  const saveInsight = () => {
    if (!insight) return;
    const note = {
      id: 'rsi-' + Date.now(),
      title: `Recursive Soul Index · ${new Date().toLocaleDateString('ru-RU')}`,
      content: insight,
      createdAt: new Date().toISOString(),
    };
    setAiNotes(p => [note, ...(p || [])]);
    notify('✅ Инсайт сохранён в заметках');
  };

  const reset = () => {
    setTransitioning(true);
    setTimeout(() => {
      setQIndex(0);
      setAnswers({});
      setInsight('');
      setShowInsight(false);
      setLoadingInsight(false);
      setTransitioning(false);
    }, 280);
  };

  const progress = Math.round((Object.keys(answers).length / QUESTIONS.length) * 100);

  return (
    <div ref={containerRef} style={{ color: 'var(--text0)', paddingBottom: 24, overflowY: 'auto', maxHeight: '80vh' }}>
      {/* Заголовок с параллаксом */}
      <div style={{ marginBottom: 24, transform: `translateY(${Math.min(scrollY * 0.1, 20)}px)` }}>
        <div style={{
          fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
        }}>RECURSIVE SOUL INDEX</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
          Рекурсивный Душевный Индекс
        </div>
      </div>

      {/* Прогресс бар */}
      {!showInsight && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
            color: 'rgba(200,164,90,0.6)', marginBottom: 6,
          }}>
            <span>ВОПРОС {qIndex + 1} / {QUESTIONS.length}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((qIndex) / QUESTIONS.length) * 100}%`,
              background: 'linear-gradient(90deg, rgba(200,164,90,0.8), rgba(200,164,90,0.4))',
              borderRadius: 2, transition: 'width 0.4s',
            }} />
          </div>
        </div>
      )}

      {/* Мистический параллакс фон */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `radial-gradient(circle at 50% ${40 + scrollY * 0.15}%, rgba(200,164,90,0.04) 0%, transparent 70%)`,
      }} />

      {/* Вопрос */}
      {!showInsight && (
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '28px 20px', marginBottom: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(200,164,90,0.2)',
          borderRadius: 16, textAlign: 'center',
          transition: 'opacity 0.28s, transform 0.28s',
          opacity: transitioning ? 0.2 : 1,
          transform: transitioning ? 'translateY(16px)' : 'translateY(0)',
        }}>
          <div style={{
            fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: 'rgba(200,164,90,0.5)', marginBottom: 16,
          }}>РЕФЛЕКСИЯ</div>
          <div style={{
            fontSize: 17, lineHeight: 1.6, color: 'var(--text1)',
            minHeight: 80,
          }}>
            {QUESTIONS[qIndex]}
          </div>
        </div>
      )}

      {/* Варианты ответов */}
      {!showInsight && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16,
          position: 'relative', zIndex: 1,
          transition: 'opacity 0.28s',
          opacity: transitioning ? 0.2 : 1,
        }}>
          {OPTIONS.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(option)}
              disabled={transitioning}
              style={{
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, color: 'var(--text2)',
                fontSize: 17, textAlign: 'left',
                cursor: transitioning ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', lineHeight: 1.4,
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Ответы выше */}
      {!showInsight && Object.keys(answers).length > 0 && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 16 }}>
          <div style={{
            fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: 'rgba(255,255,255,0.2)', marginBottom: 8,
          }}>ВАШИ ОТВЕТЫ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(answers).map(([idx, ans]) => (
              <div key={idx} style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(200,164,90,0.05)',
                border: '1px solid rgba(200,164,90,0.15)',
                fontSize: 14, color: 'var(--text3)', lineHeight: 1.4,
              }}>
                <span style={{ color: 'rgba(200,164,90,0.5)', marginRight: 6 }}>
                  {parseInt(idx) + 1}.
                </span>
                {ans}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Инсайт */}
      {showInsight && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            padding: '20px 18px', marginBottom: 14,
            background: 'linear-gradient(135deg, rgba(200,164,90,0.06), rgba(0,112,192,0.04))',
            border: '1px solid rgba(200,164,90,0.25)',
            borderRadius: 14, minHeight: 200,
          }}>
            <div style={{
              fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 2, color: 'rgba(200,164,90,0.6)', marginBottom: 12,
            }}>✨ РЕКУРСИВНЫЙ ИНСАЙТ</div>

            {loadingInsight ? (
              <div style={{
                fontSize: 16, color: 'rgba(200,164,90,0.6)',
                fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 1, textAlign: 'center', padding: '40px 0',
              }}>
                ✦ генерирую глубокий инсайт...
              </div>
            ) : (
              <div style={{
                fontSize: 16, lineHeight: 1.8,
                color: 'var(--text1)', whiteSpace: 'pre-wrap',
              }}>
                {insight}
              </div>
            )}
          </div>

          {!loadingInsight && insight && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={saveInsight} style={{
                flex: 1, padding: '11px 0', borderRadius: 12,
                background: 'rgba(200,164,90,0.1)',
                border: '1px solid rgba(200,164,90,0.4)',
                color: 'rgba(200,164,90,0.9)', fontSize: 16, cursor: 'pointer',
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                💾 Сохранить инсайт
              </button>
              <button onClick={reset} style={{
                flex: 1, padding: '11px 0', borderRadius: 12,
                background: 'transparent',
                border: `1px solid rgba(0,0,0,0.12)`,
                color: 'var(--text3)', fontSize: 16, cursor: 'pointer',
              }}>
                ↺ Новая рекурсия
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
