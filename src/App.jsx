// src/App.jsx
import { useState } from 'react';
import { AppProvider, useAppContext } from './store/AppContext';
import { useAIChat } from './hooks/useAIChat';

function AppContent() {
  const { isInitialized, diaryEntries, settings } = useAppContext();
  const { messages, isLoading, error, sendMessage } = useAIChat();
  const [currentView, setCurrentView] = useState('diary');
  const [newEntryText, setNewEntryText] = useState('');

  if (!isInitialized) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--tg-theme-text-color, #000)' }}>
        Загрузка приложения...
      </div>
    );
  }

  const handleAddEntry = () => {
    if (!newEntryText.trim()) return;
    // Временная реализация через localStorage-обёртку, позже вынесем в компонент
    setNewEntryText('');
  };

  return (
    <div style={{ 
      padding: 16, 
      minHeight: '100vh', 
      background: 'var(--tg-theme-bg-color, #ffffff)', 
      color: 'var(--tg-theme-text-color, #000000)' 
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Life Diary</h1>
        <span style={{ fontSize: 12, opacity: 0.6 }}>v2.0 (Grok)</span>
      </header>

      <nav style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['diary', 'chat', 'settings'].map(view => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 8,
              background: currentView === view ? 'var(--tg-theme-button-color, #3390ec)' : 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
              color: currentView === view ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)',
              cursor: 'pointer',
              transition: 'opacity 0.2s'            }}
          >
            {view === 'diary' ? 'Дневник' : view === 'chat' ? 'Чат с ИИ' : 'Настройки'}
          </button>
        ))}
      </nav>

      <main>
        {currentView === 'diary' && (
          <section>
            <h2>Записи дневника</h2>
            <textarea
              value={newEntryText}
              onChange={(e) => setNewEntryText(e.target.value)}
              placeholder="Новая запись..."
              style={{ width: '100%', minHeight: 80, padding: 8, marginBottom: 10, borderRadius: 8, border: '1px solid #ccc' }}
            />
            <button 
              onClick={handleAddEntry}
              style={{ padding: '8px 16px', background: 'var(--tg-theme-button-color, #3390ec)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              Сохранить ({diaryEntries.length} записей)
            </button>
          </section>
        )}

        {currentView === 'chat' && (
          <section>
            <h2>Чат с ИИ (Grok)</h2>
            {error && <p style={{ color: '#e53e3e', marginBottom: 10 }}>{error}</p>}
            
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12, padding: 8, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', borderRadius: 8 }}>
              {messages.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.5 }}>Начните диалог с ИИ-ассистентом</p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} style={{ 
                    marginBottom: 8, 
                    padding: 8, 
                    background: m.role === 'user' ? '#e3f2fd' : '#f0f4f8', 
                    borderRadius: 6 
                  }}>
                    <strong>{m.role === 'user' ? 'Вы' : 'Grok'}:</strong> {m.content}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => sendMessage('Расскажи, как прошёл мой день, если бы ты был личным дневником.')}              disabled={isLoading}
              style={{ 
                padding: '10px 16px', 
                background: isLoading ? '#aaa' : 'var(--tg-theme-button-color, #3390ec)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 6, 
                cursor: isLoading ? 'not-allowed' : 'pointer' 
              }}
            >
              {isLoading ? 'ИИ думает...' : 'Тестовый запрос к Grok'}
            </button>
          </section>
        )}

        {currentView === 'settings' && (
          <section>
            <h2>Настройки</h2>
            <p>Текущая тема: <strong>{settings.theme}</strong></p>
            <p>Язык интерфейса: <strong>{settings.language}</strong></p>
            <p style={{ opacity: 0.6, marginTop: 10 }}>Здесь будут переключатели темы, экспорт/импорт данных и управление API-ключом.</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
