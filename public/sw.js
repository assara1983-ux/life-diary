// Life Diary SW v3 — force update clears old cache
const CACHE = "life-diary-v3";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if(e.request.url.includes("/api/")) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow("/"));
});

self.addEventListener("message", e => {
  if(e.data?.type !== "CHECK_DEADLINES") return;
  const tasks = e.data.tasks || [];
  const today = new Date(); today.setHours(0,0,0,0);
  const shown = new Set();
  tasks.filter(t => t.isDeadline && t.deadline && !t.doneDate).forEach(t => {
    const dl = new Date(t.deadline); dl.setHours(0,0,0,0);
    const days = Math.round((dl - today) / 86400000);
    const name = (t.title||"").replace(/^[📋🏛🏦📊🔍💰🔒]+\s*/, "");
    const tag = "dl-"+days+"-"+t.id;
    if(shown.has(tag) || days > 3 || days < 0) return;
    shown.add(tag);
    const msgs = {
      3:["⚠️ Дедлайн через 3 дня", name],
      2:["⚠️ Послезавтра дедлайн", name],
      1:["🔴 Завтра дедлайн!", name],
      0:["🔴 Сегодня дедлайн!", name+" — сдать сегодня!"],
    };
    if(!msgs[days]) return;
    self.registration.showNotification(msgs[days][0], {
      body: msgs[days][1], icon: "/icon-192.png", tag,
      requireInteraction: days <= 1, data: {url: "/"}
    });
  });
});
