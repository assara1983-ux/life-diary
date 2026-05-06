// public/sw.js
const CACHE_NAME = 'life-diary-v1';

// Установка SW и кэширование статики
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']);
    })
  );
});

// Активация и очистка старых кэшей
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Обработка входящих пуш-уведомлений
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
    icon: '/icon-192.png', // Убедись, что иконка есть в public/
    badge: '/icon-72.png',
    tag: payload.tag || 'report-reminder',
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ],
     payload.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Life Diary', options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') return;

  // Открываем приложение или фокусируем вкладку
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
