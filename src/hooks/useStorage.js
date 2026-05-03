import { useState, useEffect, useCallback } from 'react';
import StorageService from '../core/storage';

/**
 * Хук для работы с localStorage через StorageService
 * Заменяет все прямые обращения к localStorage в компонентах
 * 
 * Пример использования:
 * const [profile, setProfile] = useStorage('ld_pf_v3', null)
 */
export function useStorage(key, defaultValue = null) {
  // Инициализация из StorageService
  const [value, setValue] = useState(() => {
    return StorageService.get(key, defaultValue);
  });

  // Синхронизация при изменении ключа
  useEffect(() => {
    const current = StorageService.get(key, defaultValue);
    setValue(current);
  }, [key]);

  // Обновление значения (автоматически сохраняет в localStorage)
  const updateValue = useCallback((newValue) => {
    setValue(prev => {
      const next = typeof newValue === 'function' 
        ? newValue(prev) 
        : newValue;
      
      StorageService.set(key, next);
      return next;
    });
  }, [key]);

  // Удаление значения
  const removeValue = useCallback(() => {
    StorageService.remove(key);
    setValue(defaultValue);
  }, [key, defaultValue]);

  return [value, updateValue, removeValue];
}

/**
 * Готовые хуки для основных сущностей приложения
 * Используй их вместо useStorage с ключами напрямую
 */

export function useTasks() {
  const [tasks, setTasks] = useStorage('ld_tasks_v3', []);
  
  const addTask = useCallback((task) => {
    setTasks(prev => [...prev, task]);
  }, [setTasks]);
  
  const updateTask = useCallback((taskId, updates) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ));
  }, [setTasks]);
  
  const removeTask = useCallback((taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, [setTasks]);
  
  const toggleTaskDone = useCallback((taskId, today) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const isDone = t.doneDate === today;
      return {
        ...t,
        doneDate: isDone ? null : today,
        lastDone: isDone ? t.lastDone : today
      };
    }));
  }, [setTasks]);
  
  return { tasks, setTasks, addTask, updateTask, removeTask, toggleTaskDone };
}

export function useProfile() {
  const [profile, setProfile] = useStorage('ld_pf_v3', null);
  
  const updateProfile = useCallback((updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, [setProfile]);
  
  const clearProfile = useCallback(() => {
    setProfile(null);
  }, [setProfile]);
  
  return { profile, setProfile, updateProfile, clearProfile };
}

export function useJournal() {
  const [journal, setJournal] = useStorage('ld_journal_v3', {});
  
  const saveJournalEntry = useCallback((date, entry) => {
    setJournal(prev => ({
      ...prev,
      [date]: { ...(prev[date] || {}), ...entry }
    }));
  }, [setJournal]);
  
  return { journal, setJournal, saveJournalEntry };
}

export function useShopList() {
  const [shopList, setShopList] = useStorage('ld_shop_v3', []);
  
  const addShopItem = useCallback((item) => {
    setShopList(prev => [...prev, item]);
  }, [setShopList]);
  
  const toggleShopItem = useCallback((itemId) => {
    setShopList(prev => prev.map(item => 
      item.id === itemId ? { ...item, done: !item.done } : item
    ));
  }, [setShopList]);
  
  const removeShopItem = useCallback((itemId) => {
    setShopList(prev => prev.filter(item => item.id !== itemId));
  }, [setShopList]);
  
  const clearBoughtItems = useCallback(() => {
    setShopList(prev => prev.filter(item => !item.done));
  }, [setShopList]);
  
  return { shopList, setShopList, addShopItem, toggleShopItem, removeShopItem, clearBoughtItems };
}

export function useSections() {
  const [sections, setSections] = useStorage('ld_sec_v3');
  
  const toggleSection = useCallback((sectionId) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, vis: !s.vis } : s
    ));
  }, [setSections]);
  
  return { sections, setSections, toggleSection };
}

export function usePetLog() {
  const [petLog, setPetLog] = useStorage('ld_petlog_v3', {});
  
  const markFeed = useCallback((date, petId, feedIndex) => {
    setPetLog(prev => {
      const existing = prev[date]?.[petId] || [];
      const updated = existing.includes(feedIndex)
        ? existing.filter(f => f !== feedIndex)
        : [...existing, feedIndex];
      
      return {
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [petId]: updated
        }
      };
    });
  }, [setPetLog]);
  
  return { petLog, setPetLog, markFeed };
}

export function useTrips() {
  const [trips, setTrips] = useStorage('ld_trips_v3', []);
  
  const addTrip = useCallback((trip) => {
    setTrips(prev => [...prev, trip]);
  }, [setTrips]);
  
  const updateTrip = useCallback((tripId, updates) => {
    setTrips(prev => prev.map(t => 
      t.id === tripId ? { ...t, ...updates } : t
    ));
  }, [setTrips]);
  
  const removeTrip = useCallback((tripId) => {
    setTrips(prev => prev.filter(t => t.id !== tripId));
  }, [setTrips]);
  
  return { trips, setTrips, addTrip, updateTrip, removeTrip };
}

export function useHobbies() {
  const [hobbies, setHobbies] = useStorage('ld_hobbies_v3', []);
  
  const addHobby = useCallback((hobby) => {
    setHobbies(prev => [...prev, hobby]);
  }, [setHobbies]);
  
  const logHobbySession = useCallback((hobbyId, date) => {
    setHobbies(prev => prev.map(h => 
      h.id === hobbyId 
        ? { ...h, sessions: [...(h.sessions || []), date] }
        : h
    ));
  }, [setHobbies]);
  
  const removeHobby = useCallback((hobbyId) => {
    setHobbies(prev => prev.filter(h => h.id !== hobbyId));
  }, [setHobbies]);
  
  return { hobbies, setHobbies, addHobby, logHobbySession, removeHobby };
}
