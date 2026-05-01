// ── Life Diary Service Worker ──────────────────────────────────
const CACHE = 'life-diary-v1';

// Установка SW
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// ── Push-уведомления ──────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Life Diary', body: e.data.text() }; }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'life-diary-' + Date.now(),
    requireInteraction: data.requireInteraction || false,
    data: { url: data.url || '/', deadline: data.deadline },
    actions: [
      { action: 'open', title: '📋 Открыть' },
      { action: 'dismiss', title: 'Позже' }
    ]
  };

  e.waitUntil(self.registration.showNotification(data.title || 'Life Diary', options));
});

// Клик по уведомлению
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const url = (e.notification.data && e.notification.data.url) || '/';
      for (const c of cs) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
