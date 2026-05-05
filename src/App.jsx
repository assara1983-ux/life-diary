// src/App.jsx
import { useState } from 'react';
import { AppProvider } from './store/AppContext';
import { DiaryView } from './components/features/DiaryView';
import { ChatView } from './components/features/ChatView';
import { SettingsView } from './components/features/SettingsView';

function AppContent() {
  const [currentView, setCurrentView] = useState('diary');

  const navItems = [
    { id: 'diary', label: 'Дневник', icon: '📔' },
    { id: 'chat', label: 'Чат', icon: '💬' },
    { id: 'settings', label: 'Настройки', icon: '️' }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--tg-theme-bg-color, #ffffff)', 
      color: 'var(--tg-theme-text-color, #000000)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Шапка */}
      <header style={{ 
        padding: '16px 16px 0',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16 
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Life Diary</h1>
        <span style={{ 
          fontSize: 12, 
          opacity: 0.6, 
          background: 'var(--tg-theme-secondary-bg-color, #f0f0f0)', 
          padding: '4px 8px', 
          borderRadius: 12 
        }}>
          v2.0 Grok
        </span>
      </header>

      {/* Навигация */}
      <nav style={{ 
        display: 'flex', 
        gap: 8, 
        padding: '0 16px', 
        marginBottom: 24 
      }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 10,
              background: currentView === item.id ? 'var(--tg-theme-button-color, #3390ec)' : 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
              color: currentView === item.id ? 'var(--tg-theme-button-text-color, #ffffff)' : 'var(--tg-theme-text-color, #000000)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.2s',
              boxShadow: currentView === item.id ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      {/* Контент */}
      <main style={{ flex: 1, padding: '0 16px 30px' }}>
        {currentView === 'diary' && <DiaryView />}
        {currentView === 'chat' && <ChatView />}
        {currentView === 'settings' && <SettingsView />}
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
