// src/components/AiBox.jsx
import { useState } from 'react';
import { askViaServer } from '../services/aiClient';
import { T } from '../utils/theme';

/**
 * Парсер ответа AI в структурированные блоки
 */
export function parseAiResponse(text) {
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
    } else if (/^\d+[\.)\s]/.test(trimmed)) {
      flushText();
      blocks.push({ type: 'list', items: [{ title: '', body: trimmed }] });
    } else if (/^[-*•]\s/.test(trimmed)) {
      flushText();
      blocks.push({ type: 'list', items: [{ title: '', body: trimmed.replace(/^[-*•]\s*/, '') }] });
    } else {
      currentText.push(trimmed);
    }
  }
  flushText();
  return blocks;
}

/**
 * Строит системный промпт с приоритетом базы знаний
 * ✅ Температура 0.1, никаких домыслов, только база знаний
 */
function buildSystemPrompt(profile, domain = 'general') {
  const knowledgeSources = {
    health: `Используй ТОЛЬКО следующие источники из базы знаний:
- ТКМ: Давыдов «Восточный Зодиак» (У-Син, 12 меридианов, сезонные рекомендации, лунный календарь)
- Дыхательные практики: Дорошенко (пранаямы, Бутейко, цигун, Стрельникова, Вилунас)
- Источник Энергии (МИФ): управление энергией, цикл стресса`,
    mental: `Используй ТОЛЬКО следующие источники из базы знаний:
- Принцип Легкости: Азнауров (Информационная Воронка, отказ от борьбы, Принцип Полезности)
- Источник Энергии (МИФ): энергетический цикл, структуры, видение
- Дыхательные практики: Дорошенко (техники для успокоения)`,
    goals: `Используй ТОЛЬКО следующие источники из базы знаний:
- Принцип Легкости: Азнауров (цели, Три Н, закрепление изменений)
- Источник Энергии (МИФ): видение, структуры для достижения целей
- Экстремальный тайм-менеджмент: Колесо Жизни, планирование`,
    profile: `Используй ТОЛЬКО следующие источники из базы знаний:
- Давыдов «Восточный Зодиак»: ТКМ-астрология, знаки, меридианы, здоровье
- Рао «Астрология, Судьба и Колесо Времени»: Лагна, дома, периоды
- Амрита «Круг Жизни»: градусная нумерология, имя как программа`,
    today: `Используй ТОЛЬКО следующие источники из базы знаний:
- Давыдов «Восточный Зодиак»: лунный календарь, 24 сезона, суточный цикл меридианов
- ТКМ: рекомендации по дням недели и часам суток`,
    work: `Используй ТОЛЬКО следующие источники из базы знаний:
- Экстремальный тайм-менеджмент: планирование, приоритеты
- Болотова «Психология времени»: управление временем
- Источник Энергии (МИФ): продуктивность, структуры`,
    general: `Используй данные из базы знаний приложения Life Diary.`
  };

  return `Ты персональный советник в приложении Life Diary.

СТРОГИЕ ПРАВИЛА:
1. Отвечай ТОЛЬКО на основе базы знаний. Никаких домыслов.
2. Если данных в базе нет — так и скажи: "По этой теме данных в базе нет."
3. Температура мышления = 0.1 (максимальная точность, минимальная фантазия).
4. Отвечай на русском языке. Кратко и конкретно.
5. Всегда указывай из какого источника рекомендация.

ПОЛЬЗОВАТЕЛЬ:
- Имя: ${profile?.name || 'не указано'}
- Дата рождения: ${profile?.dob || 'не указана'}
- Хронотип: ${profile?.chronotype || 'не указан'}
- Работа: ${profile?.workStart || '9:00'}–${profile?.workEnd || '18:00'}
- Профессия: ${profile?.profession || 'не указана'}

БАЗА ЗНАНИЙ:
${knowledgeSources[domain] || knowledgeSources.general}`;
}

/**
 * Компонент виджета AI-помощника
 * domain: 'health' | 'mental' | 'goals' | 'profile' | 'today' | 'work' | 'general'
 */
export function AiBox({ profile, label, prompt, btnText = 'Спросить ИИ', className = '', domain = 'general' }) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAsk = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    
    try {
      // ✅ ИСПРАВЛЕНО: через сервер (не напрямую), с промптом базы знаний, температура 0.1
      const systemPrompt = buildSystemPrompt(profile, domain);
      const result = await askViaServer(systemPrompt, prompt, 1024);
      setResponse(result);
    } catch (e) {
      console.error('AiBox error:', e);
      setError(e.message || 'Ошибка соединения с ИИ');
    }
    setLoading(false);
  };

  const parsed = parseAiResponse(response);

  return (
    <div className={`ai-box ${className}`} style={{ 
      borderRadius: 16, 
      border: `1px solid ${T.bdr}`, 
      background: 'rgba(200,164,90,0.04)',
      padding: 16,
      marginBottom: 12
    }}>
      {label && (
        <div style={{ 
          fontSize: 11, 
          color: T.text3, 
          fontFamily: "'JetBrains Mono'", 
          letterSpacing: 1.5, 
          marginBottom: 12,
          textTransform: 'uppercase'
        }}>
          {label}
        </div>
      )}

      <button 
        className="btn btn-primary"
        onClick={handleAsk}
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '10px 16px', 
          borderRadius: 12,
          background: loading ? 'rgba(200,164,90,0.3)' : T.gold,
          color: '#1a1a1a',
          fontWeight: 600,
          fontSize: 14,
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.18s ease'
        }}
      >
        {loading ? '✦ Думаю...' : (btnText || 'Спросить ИИ')}
      </button>

      {error && (
        <div style={{ 
          marginTop: 12, 
          padding: '10px 14px', 
          background: 'rgba(217,4,41,0.08)', 
          border: `1px solid ${T.error}`, 
          borderRadius: 10, 
          fontSize: 13, 
          color: T.error 
        }}>
          ⚠️ {error}
        </div>
      )}

      {response && !loading && (
        <div className="ai-content" style={{ marginTop: 16 }}>
          {parsed.map((block, i) => {
            if (block.type === 'header') {
              return (
                <div key={i} style={{ 
                  fontFamily: "'Cormorant Infant', serif", 
                  fontSize: 18,
                  color: T.text0, 
                  fontWeight: 600, 
                  marginTop: 16, 
                  marginBottom: 8 
                }}>
                  <span style={{ color: T.gold, marginRight: 6 }}>◆</span>
                  {block.content}
                </div>
              );
            }
            if (block.type === 'list') {
              return (
                <div key={i} style={{ 
                  marginLeft: 8, 
                  paddingLeft: 12, 
                  borderLeft: `2px solid ${T.gold}`,
                  marginBottom: 12
                }}>
                  {block.items.map((item, j) => (
                    <div key={j} style={{ 
                      fontSize: 14, 
                      color: T.text2, 
                      lineHeight: 1.6,
                      marginBottom: 6
                    }}>
                      <span style={{ color: T.gold, fontWeight: 600, marginRight: 6 }}>{j + 1}.</span>
                      {item.body || item}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={i} style={{ 
                fontSize: 14, 
                color: T.text2, 
                lineHeight: 1.7, 
                marginBottom: 12 
              }}>
                {block.content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AiBox;
