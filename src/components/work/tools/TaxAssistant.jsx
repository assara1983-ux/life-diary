// src/components/work/tools/TaxAssistant.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../store/AppContext';

const QUICK_PROMPTS = [
  'Дедлайны по налогам для ИП в 2026 году',
  'Как заполнить форму 200.00?',
  'МРП и МЗП на 2026 год',
  'Изменения в Налоговом кодексе РК 2026',
  'Как рассчитать ОПВ и СО?',
  'Штрафы за несвоевременную сдачу отчётности',
];

const SYSTEM = `Ты — опытный налоговый консультант Казахстана. 
Отвечай точно и по делу, ссылаясь на Налоговый кодекс РК 2026.
Используй структурированные ответы с примерами и числами где возможно.
Отвечай на русском языке.`;

export function TaxAssistant() {
  const { notify } = useApp();

  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ld_tax_chat') || '[]'); }
    catch { return []; }
  });
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('ld_tax_chat', JSON.stringify(messages.slice(-50))); }
    catch {}
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: SYSTEM, user: msg, maxTokens: 1024 }),
      });
      const data = await res.json();
      setMessages(p => [...p, {
        role: 'assistant',
        content: data.text || 'Не удалось получить ответ. Попробуйте позже.',
      }]);
    } catch {
      setMessages(p => [...p, {
        role: 'assistant',
        content: 'Ошибка соединения с ИИ. Проверьте подключение.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('ld_tax_chat');
    notify('История чата очищена');
  };

  return (
    <div style={{ color: 'var(--text0)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', minHeight: 500 }}>
      {/* Заголовок */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 16, flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{
            fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
          }}>НАЛОГОВЫЙ АССИСТЕНТ</div>
          <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
            Консультант по налогам РК 2026
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} style={{
            padding: '6px 14px', borderRadius: 14,
            background: 'transparent', border: `1px solid rgba(0,0,0,0.12)`,
            color: 'var(--text3)', fontSize: 14, cursor: 'pointer',
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            Очистить
          </button>
        )}
      </div>

      {/* Быстрые подсказки */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        paddingBottom: 10, marginBottom: 12, flexShrink: 0,
      }}>
        {QUICK_PROMPTS.map((p, i) => (
          <button key={i} onClick={() => sendMessage(p)} style={{
            flexShrink: 0,
            padding: '6px 14px', borderRadius: 16,
            background: 'rgba(200,164,90,0.08)',
            border: '1px solid rgba(200,164,90,0.3)',
            color: 'rgba(200,164,90,0.85)', fontSize: 14,
            cursor: 'pointer', whiteSpace: 'nowrap',
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {p}
          </button>
        ))}
      </div>

      {/* История сообщений */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex',
        flexDirection: 'column', gap: 12, paddingRight: 4,
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text3)', textAlign: 'center', fontSize: 16,
            fontFamily: "'Cormorant Infant',serif", lineHeight: 1.8,
          }}>
            Задайте вопрос по налогам РК 2026<br/>или выберите быструю подсказку выше
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 1, color: 'rgba(200,164,90,0.5)',
                marginBottom: 4,
              }}>ИИ КОНСУЛЬТАНТ</div>
            )}
            <div style={{
              padding: '12px 16px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, rgba(200,164,90,0.2), rgba(200,164,90,0.08))'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(200,164,90,0.35)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              fontSize: 16, lineHeight: 1.6, color: 'var(--text1)',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.75)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '4px 16px 16px 16px',
              fontSize: 16, color: 'rgba(200,164,90,0.6)',
              fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1,
            }}>
              ✦ анализирую...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Поле ввода */}
      <div style={{
        display: 'flex', gap: 10, marginTop: 12, flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Задайте вопрос по налогам..."
          disabled={loading}
          style={{
            flex: 1, padding: '12px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(200,164,90,0.2)',
            borderRadius: 20, color: 'var(--text0)', fontSize: 16,
            outline: 'none',
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            padding: '0 20px', borderRadius: 20,
            background: loading || !input.trim()
              ? 'rgba(200,164,90,0.1)'
              : 'linear-gradient(135deg, rgba(200,164,90,0.3), rgba(200,164,90,0.1))',
            border: '1px solid rgba(200,164,90,0.4)',
            color: 'rgba(200,164,90,0.9)',
            fontSize: 16, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}
