// src/store/AppContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  DIARY: 'life_diary_entries',
  SETTINGS: 'life_diary_settings'
};

const DEFAULT_SETTINGS = {
  theme: 'system',
  language: 'ru'
};

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function AppProvider({ children }) {
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Загрузка из localStorage при монтировании
  useEffect(() => {
    try {
      const rawEntries = localStorage.getItem(STORAGE_KEYS.DIARY);
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      setDiaryEntries(rawEntries ? JSON.parse(rawEntries) : []);
      setSettings(rawSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) } : DEFAULT_SETTINGS);
    } catch (e) {
      console.error('[AppContext] Ошибка чтения localStorage:', e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Сохранение записей
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.DIARY, JSON.stringify(diaryEntries));
    }
  }, [diaryEntries, isInitialized]);

  // Сохранение настроек
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
  }, [settings, isInitialized]);

  // Методы работы с дневником
  const addEntry = useCallback((data) => {
    setDiaryEntries(prev => [...prev, { ...data, id: generateId(), createdAt: new Date().toISOString() }]);
  }, []);

  const updateEntry = useCallback((id, updates) => {
    setDiaryEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e));
  }, []);

  const deleteEntry = useCallback((id) => {
    setDiaryEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearDiary = useCallback(() => {
    setDiaryEntries([]);
  }, []);

  // Методы работы с настройками
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const value = useMemo(() => ({
    diaryEntries,
    settings,
    isInitialized,
    addEntry,
    updateEntry,
    deleteEntry,
    clearDiary,
    updateSettings
  }), [diaryEntries, settings, isInitialized, addEntry, updateEntry, deleteEntry, clearDiary, updateSettings]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext должен вызываться внутри AppProvider');
  return ctx;
}
