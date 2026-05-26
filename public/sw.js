// public/sw.js

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Входящие push-уведомления ───
self.addEventListener('push', (event) => {
  let data = { title: 'Life Diary', body: 'У вас есть задача.' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      try {
        const text = event.data.text();
        const parsed = JSON.parse(text);
        data = { ...data, ...parsed };
      } catch {
        data.body = event.data.text() || data.body;
      }
    }
  }

  const options = {
    body: data.body,
    icon: '/assets/avatars-icons/female-avatar.png',
    badge: '/assets/avatars-icons/female-avatar.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'reminder',
    data: { url: data.url || '/' },
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Клик по уведомлению ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
