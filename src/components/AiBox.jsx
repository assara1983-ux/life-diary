// src/components/AiBox.jsx
import { useState } from 'react';
import { quickAsk } from '../services/aiClient';
import { T } from '../utils/theme';

/**
 * Парсер ответа AI в структурированные блоки
 * @param {string} text - Сырой текст от AI
 * @returns {Array<{type: string, content: string, items?: Array}>}
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
    
    // Заголовки: # Текст
    if (/^#{1,4}\s/.test(trimmed)) {
      flushText();
      blocks.push({ type: 'header', content: trimmed.replace(/^#{1,4}\s*/, '') });
    }
    // Нумерованные списки: 1. Текст
    else if (/^\d+[\.\)]\s/.test(trimmed)) {
      flushText();
      blocks.push({ type: 'list', items: [{ title: '', body: trimmed }] });
    }
    // Маркированные списки: - Текст или * Текст
    else if (/^[-*•]\s/.test(trimmed)) {
      flushText();
      blocks.push({ type: 'list', items: [{ title: '', body: trimmed.replace(/^[-*•]\s*/, '') }] });
    }
    // Обычный текст
    else {
      currentText.push(trimmed);
    }
  }
  flushText();
  return blocks;
}
/**
 * Компонент виджета AI-помощника
 */
export function AiBox({ profile, label, prompt, btnText = 'Спросить ИИ', className = '' }) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAsk = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    
    try {
      // Формируем системный промпт из профиля
      const systemPrompt = `Ты — персональный помощник в приложении Life Diary. 
        Пользователь: ${profile.name || 'Аноним'}. 
        Хронотип: ${profile.chronotype || 'не указан'}. 
        Работа: ${profile.workStart || '09:00'}–${profile.workEnd || '18:00'}. 
        Отвечай кратко, по делу, на русском языке. Используй нумерованные списки для шагов.`;

      const result = await quickAsk(prompt, systemPrompt);
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
      {/* Заголовок виджета */}
      {label && (
        <div style={{ 
          fontSize: 11, 
          color: T.text3, 
          fontFamily: "'JetBrains Mono'", 
          letterSpacing: 1.5, 
          marginBottom: 12,
          textTransform: 'uppercase'        }}>
          {label}
        </div>
      )}

      {/* Кнопка запроса */}
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

      {/* Ошибка */}
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

      {/* Ответ ИИ */}
      {response && !loading && (
        <div className="ai-content" style={{ marginTop: 16 }}>
          {parsed.map((block, i) => {
            if (block.type === 'header') {
              return (
                <div key={i} className="ai-header" style={{ 
                  fontFamily: "'Cormorant Infant', serif", 
                  fontSize: 18,                   color: T.text0, 
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
                <div key={i} className="ai-list" style={{ 
                  marginLeft: 8, 
                  paddingLeft: 12, 
                  borderLeft: `2px solid ${T.gold}`,
                  marginBottom: 12
                }}>
                  {block.items.map((item, j) => (
                    <div key={j} className="ai-list-item" style={{ 
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
            // paragraph или неизвестный тип
            return (
              <div key={i} className="ai-paragraph" style={{ 
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
