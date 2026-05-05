// src/components/features/SettingsView.jsx
import { useCallback } from 'react';
import { useAppContext } from '../../store/AppContext';

export function SettingsView() {
  const { settings, updateSettings, clearDiary } = useAppContext();

  const handleThemeChange = useCallback((theme) => {
    updateSettings({ theme });
  }, [updateSettings]);

  const handleClearData = useCallback(() => {
    if (window.confirm('Вы уверены, что хотите удалить ВСЕ записи дневника? Это действие нельзя отменить.')) {
      clearDiary();
      alert('Все данные успешно удалены.');
    }
  }, [clearDiary]);

  return (
    <section style={{ padding: '0 16px' }}>
      <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 22 }}>⚙️ Настройки</h2>

      <div style={{ 
        marginBottom: 24, 
        background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', 
        borderRadius: 12, 
        padding: 16 
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, opacity: 0.7 }}>Внешний вид</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {['system', 'light', 'dark'].map(theme => (
            <button
              key={theme}
              onClick={() => handleThemeChange(theme)}
              style={{
                flex: 1,
                padding: '8px 0',
                border: settings.theme === theme ? '2px solid var(--tg-theme-button-color, #3390ec)' : '1px solid transparent',
                borderRadius: 8,
                background: settings.theme === theme ? 'var(--tg-theme-bg-color, #fff)' : 'transparent',
                color: 'var(--tg-theme-text-color, #000)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {theme === 'system' ? 'Система' : theme === 'light' ? 'Светлая' : 'Тёмная'}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #888)', marginTop: 8 }}>
          Текущая: <strong>{settings.theme === 'system' ? 'Как в Telegram' : settings.theme}</strong>
        </p>
      </div>

      <div style={{ 
        marginBottom: 24, 
        background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', 
        borderRadius: 12, 
        padding: 16 
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, opacity: 0.7 }}>Управление данными</h3>
        <button
          onClick={handleClearData}
          style={{
            width: '100%',
            padding: 12,
            background: '#ffebee',
            color: '#c62828',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          🗑️ Очистить весь дневник
        </button>
      </div>

      <div style={{ 
        textAlign: 'center', 
        padding: 20, 
        opacity: 0.5, 
        fontSize: 12 
      }}>
        Life Diary App v2.0<br/>
        Powered by Google Gemini
      </div>
    </section>
  );
}
