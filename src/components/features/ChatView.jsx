// src/components/features/ChatView.jsx
import { useState, useEffect, useRef } from 'react';
import { useAIChat } from '../../hooks/useAIChat';

export function ChatView() {
  const { messages, isLoading, error, sendMessage, clearChat } = useAIChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // Автоматическая прокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>💬 Чат с ИИ (Grok)</h2>
        <button 
          onClick={clearChat}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            background: 'transparent',
            color: 'var(--tg-theme-hint-color, #888)',
            border: '1px solid var(--tg-theme-hint-color, #ccc)',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Очистить
        </button>      </div>

      {/* Окно сообщений */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 10,
        background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
        borderRadius: 12,
        marginBottom: 10
      }}>
        {error && (
          <div style={{
            padding: 10,
            marginBottom: 10,
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 8,
            fontSize: 13
          }}>
            ⚠️ {error}
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', marginTop: 40, opacity: 0.5 }}>
            Напишите что-нибудь, чтобы начать диалог...
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: 12,
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: '12px',
              background: msg.role === 'user' 
                ? 'var(--tg-theme-button-color, #3390ec)' 
                : 'var(--tg-theme-bg-color, #fff)',
              color: msg.role === 'user' 
                ? 'var(--tg-theme-button-text-color, #fff)' 
                : 'var(--tg-theme-text-color, #000)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',              whiteSpace: 'pre-wrap',
              lineHeight: 1.4
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'var(--tg-theme-bg-color, #fff)',
              opacity: 0.6,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              <span style={{ marginRight: 4 }}>●</span>
              <span style={{ marginRight: 4 }}>●</span>
              <span>●</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ваш вопрос..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: '1px solid var(--tg-theme-hint-color, #ccc)',
            background: 'var(--tg-theme-bg-color, #fff)',
            color: 'var(--tg-theme-text-color, #000)',
            resize: 'none',
            minHeight: 44,
            maxHeight: 100,
            outline: 'none',
            fontSize: 15
          }}
        />
        <button          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: (isLoading || !inputValue.trim()) 
              ? 'var(--tg-theme-hint-color, #ccc)' 
              : 'var(--tg-theme-button-color, #3390ec)',
            color: 'var(--tg-theme-button-text-color, #fff)',
            cursor: (isLoading || !inputValue.trim()) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20
          }}
        >
          ➤
        </button>
      </div>
    </section>
  );
}
