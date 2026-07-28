/* Hábitos — Service Worker
   IMPORTANTE: subí SOLO este número de versión cada vez que cambies
   index.html / app.js u otros assets. Con eso, las apps ya instaladas
   se actualizan solas (bajan los archivos frescos y recargan). */
const CACHE = 'habitos-v13';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png',
  './mark.png'
];

// Al instalar, bajamos cada asset FRESCO de la red (cache:'reload' saltea el caché HTTP),
// así el service worker nuevo nunca guarda una copia vieja.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res && res.ok) await c.put(url, res.clone());
      } catch (_) { /* si algo falla, seguimos */ }
    }));
  })());
  self.skipWaiting(); // el SW nuevo toma control sin esperar
});

// Al activarse, borramos los cachés de versiones anteriores y tomamos control de las pestañas abiertas.
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Estrategia: cache-first para los assets propios (app 100% offline);
// si no está en caché, va a la red y guarda una copia.
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
