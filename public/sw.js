// Life Diary — Service Worker v2.0
const CACHE = "life-diary-v2";
const ASSETS = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if(e.request.url.includes("/api/")) return;
  e.respondWith(
    fetch(e.request).then(res=>{
      if(res&&res.status===200&&res.type==="basic") caches.open(CACHE).then(c=>c.put(e.request,res.clone()));
      return res;
    }).catch(()=>caches.match(e.request).then(cached=>{
      if(cached) return cached;
      if(e.request.mode==="navigate") return caches.match("/index.html");
    }))
  );
});

// Клик по уведомлению
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
      const ex=cs.find(c=>c.url.includes(self.location.origin));
      if(ex){ex.focus();return;}
      return clients.openWindow("/");
    })
  );
});

// Сообщения от приложения — проверка дедлайнов
self.addEventListener("message", e=>{
  if(e.data?.type!=="CHECK_DEADLINES") return;
  const tasks=e.data.tasks||[];
  const today=new Date(); today.setHours(0,0,0,0);
  const shown=new Set();
  tasks.filter(t=>t.isDeadline&&t.deadline&&!t.doneDate).forEach(t=>{
    const dl=new Date(t.deadline); dl.setHours(0,0,0,0);
    const days=Math.round((dl-today)/86400000);
    const name=(t.title||"").replace(/^[📋🏛🏦📊🔍💰🔒]+\s*/,"");
    const tag="dl-"+days+"-"+t.id;
    if(shown.has(tag)||days>3||days<0) return;
    shown.add(tag);
    const msgs={
      3:["⚠️ Дедлайн через 3 дня",name+" · "+dl.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})],
      2:["⚠️ Дедлайн послезавтра",name],
      1:["🔴 Завтра дедлайн!",name],
      0:["🔴 Сегодня дедлайн!",name+" — нужно сдать!"],
    };
    if(!msgs[days]) return;
    self.registration.showNotification(msgs[days][0],{
      body:msgs[days][1], icon:"/icon-192.png", tag,
      requireInteraction:days<=1, data:{url:"/"}
    });
  });
});
