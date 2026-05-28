// src/hooks/useCloudSync.js
import { useState, useEffect, useCallback } from 'react';

function generateKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const part = () => Array.from({ length: 5 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `ld-${part()}-${part()}`;
}

const SYNC_KEYS = [
  'ld_pf_v3', 'ld_tasks_v3', 'ld_sec_v3',
  'ld_journal_v3', 'ld_shop_v3', 'ld_petlog_v3',
  'ld_trips_v3', 'ld_hobbies_v3',
  'ld_work_tools', 'ld_custom_report_groups',
  'ld_selected_reports', 'ld_ai_recommendations',
  'ld_beauty_procs', 'ld_beauty_topics',
  'ld_ai_notes', 'ld_ai_journal',
  'mental_mood', 'mental_stress', 'mental_log',
];

function collectLocalData() {
  const data = {};
  SYNC_KEYS.forEach(key => {
    try {
      const val = localStorage.getItem(key);
      if (val) data[key] = JSON.parse(val);
    } catch {}
  });
  return data;
}

function applyDataToLocal(data) {
  Object.entries(data).forEach(([key, value]) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  });
}

export function useCloudSync() {
  const [syncKey, setSyncKey] = useState(() =>
    localStorage.getItem('ld_sync_key') || ''
  );
  const [status,  setStatus]  = useState('idle');
  const [message, setMessage] = useState('');

  const saveKey = useCallback((key) => {
    localStorage.setItem('ld_sync_key', key);
    setSyncKey(key);
  }, []);

  const pushToCloud = useCallback(async (key) => {
    if (!key) return;
    setStatus('syncing');
    try {
      const data = collectLocalData();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data }),
      });
      const result = await res.json();
      if (result.ok) {
        setStatus('success');
        setMessage('Синхронизировано');
      } else {
        setStatus('error');
        setMessage('Ошибка синхронизации');
      }
    } catch {
      setStatus('error');
      setMessage('Нет соединения');
    }
  }, []);

  const createAndSync = useCallback(async () => {
    const key = generateKey();
    saveKey(key);
    setStatus('syncing');
    try {
      const data = collectLocalData();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data }),
      });
      const result = await res.json();
      if (result.ok) {
        setStatus('success');
        setMessage('Данные сохранены в облако');
      } else {
        setStatus('error');
        setMessage('Ошибка сохранения');
      }
    } catch {
      setStatus('error');
      setMessage('Нет соединения');
    }
  }, [saveKey]);

  const loadByKey = useCallback(async (key) => {
    if (!key || !key.startsWith('ld-')) {
      setStatus('error');
      setMessage('Неверный ключ. Формат: ld-xxxxx-xxxxx');
      return false;
    }
    setStatus('syncing');
    try {
      const res = await fetch(`/api/sync?key=${encodeURIComponent(key)}`);
      if (res.status === 404) {
        setStatus('error');
        setMessage('Ключ не найден. Проверьте правильность.');
        return false;
      }
      const result = await res.json();
      if (result.ok && result.data) {
        applyDataToLocal(result.data);
        saveKey(key);
        setStatus('success');
        setMessage('Данные загружены. Перезагрузите страницу.');
        return true;
      } else {
        setStatus('error');
        setMessage(result.error || 'Ошибка загрузки');
        return false;
      }
    } catch {
      setStatus('error');
      setMessage('Нет соединения');
      return false;
    }
  }, [saveKey]);

  // ✅ Автосинхронизация каждые 30 секунд
  useEffect(() => {
    if (!syncKey) return;
    const id = setInterval(() => {
      pushToCloud(syncKey);
    }, 30000);
    return () => clearInterval(id);
  }, [syncKey, pushToCloud]);

  return {
    syncKey,
    status,
    message,
    createAndSync,
    loadByKey,
    pushToCloud,
    setMessage,
    setStatus,
  };
}
