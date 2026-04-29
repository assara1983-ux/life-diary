// Life Diary — Service Worker v1.0
const CACHE = "life-diary-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/src/App.jsx",
  "/src/main.jsx",
];

// Установка — кэшируем основные файлы
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return c.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Активация — удаляем старые кэши
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — сначала сеть, при ошибке — кэш
self.addEventListener("fetch", e => {
  // API запросы не кэшируем
  if(e.request.url.includes("/api/")) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Кэшируем успешные ответы
        if(response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Офлайн — отдаём из кэша
        return caches.match(e.request).then(cached => {
          if(cached) return cached;
          // Для navigation запросов — отдаём index.html
          if(e.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
  );
});
