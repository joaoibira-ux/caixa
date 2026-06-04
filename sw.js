const VERSION = "caixa-v61";
const ASSETS = [
  "./index.html",
  "./style.css?v=29",
  "./app.js?v=56",
  "./manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.mode === "navigate") {
    // HTML sempre vem da rede — garante versão mais nova
    e.respondWith(fetch(e.request).catch(() => caches.match("./index.html")));
    return;
  }
  // CSS/JS/imagens: cache primeiro, rede como fallback
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
