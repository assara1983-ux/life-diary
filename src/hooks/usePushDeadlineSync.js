// src/hooks/usePushDeadlineSync.js
// Собирает актуальные дедлайны из задач (freq/dueDate/deadline любого раздела)
// и, если пользователь разрешил push-уведомления, отправляет их снимок на сервер.
// Сервер (api/notify.js) раз в день сам проверяет этот снимок и присылает
// push с конкретным названием задачи — даже если приложение закрыто.

import { useEffect, useRef } from 'react';

function getClientId() {
  let id = localStorage.getItem('ld_push_client_id');
  if (!id) {
    id = 'pc-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('ld_push_client_id', id);
  }
  return id;
}

function extractDeadline(task) {
  // Разные разделы используют разные поля даты
  if (task.deadline) return task.deadline.split('T')[0];
  if (task.dueDate) return task.dueDate;
  return null;
}

export function usePushDeadlineSync(tasks) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Дебаунс — не слать запрос на каждое изменение задач подряд
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        if (!('serviceWorker' in navigator)) return;
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (!registration) return;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        const today = new Date();
        const horizon = new Date(today.getTime() + 14 * 86400000);

        const deadlines = (tasks || [])
          .filter(t => !t.doneDate && (t.deadline || t.dueDate))
          .map(t => ({ id: String(t.id), title: t.title, date: extractDeadline(t), url: '/' }))
          .filter(d => d.date && new Date(d.date + 'T00:00:00') <= horizon);

        await fetch('/api/save-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            clientId: getClientId(),
            deadlines,
          }),
        });
      } catch (e) {
        console.warn('Push deadline sync failed:', e);
      }
    }, 3000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [tasks]);
}
