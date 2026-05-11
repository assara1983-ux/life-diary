// src/components/features/SettingsView.jsx
// ✅ ИСПРАВЛЕНО: useAppContext → useApp, убраны несуществующие settings/updateSettings/clearDiary
import { useCallback } from 'react';
import { useApp } from '../../store/AppContext';

export function SettingsView() {
  // ✅ Используем реальные данные из AppContext
  const { setProfile, setJournal, setTasks, notify } = useApp();

  const handleClearData = useCallback(() => {
    if (window.confirm('Удалить ВСЕ данные приложения? Это действие нельзя отменить.')) {
      setJournal({});
      setTasks([]);
      notify && notify('Данные очищены');
    }
  }, [setJournal, setTasks, notify]);

  const handleResetProfile = useCallback(() => {
    if (window.confirm('Сбросить профиль и пройти онбординг заново?')) {
      setProfile(null);
    }
  }, [setProfile]);

  return (
    <section style={{ padding: '0 16px' }}>
      <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 22 }}>⚙️ Настройки</h2>

      <div style={{ marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, opacity: 0.7 }}>Управление данными</h3>
        <button onClick={handleClearData}
          style={{ width: '100%', padding: 12, marginBottom: 10,
            background: 'rgba(217,4,41,0.12)', color: '#E87878',
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          🗑️ Очистить журнал и задачи
        </button>
        <button onClick={handleResetProfile}
          style={{ width: '100%', padding: 12,
            background: 'rgba(255,255,255,0.06)', color: 'inherit',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 15, cursor: 'pointer' }}>
          🔄 Сбросить профиль
        </button>
      </div>

      <div style={{ textAlign: 'center', padding: 20, opacity: 0.4, fontSize: 12 }}>
        Life Diary ✦ Powered by Google Gemini
      </div>
    </section>
  );
      }
