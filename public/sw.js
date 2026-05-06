// public/sw.js (упрощённая версия без кэширования)
const CACHE_NAME = 'life-diary-v1';

// Установка SW — БЕЗ кэширования
self.addEventListener('install', (event) => {
  // Пропускаем кэширование
  self.skipWaiting();
});

// Активация
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Обработка пуш-уведомлений
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'Life Diary', body: event.data.text() };
  }

  const options = {
    body: payload.body || 'Напоминание о задаче',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: payload.tag || 'report-reminder',
    requireInteraction: true,
    data: payload.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Life Diary', options)
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
