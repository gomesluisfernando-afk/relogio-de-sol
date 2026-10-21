// Offline: guarda tudo na primeira visita. Responde do cache e atualiza em segundo
// plano, então uma correção de conteúdo chega ao celular na abertura seguinte.
const CACHE = 'relogio-v1';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'src/main.js', 'src/state.js', 'src/content.js', 'src/modes/tour.js',
  'i18n/pt.json',
  'data/index.json', 'data/eras.json', 'data/cards_fase1.json', 'data/tours/tiradentes.json',
  'data/characters.json', 'data/expressions.json',
  'assets/img/ui/icon-192.png', 'assets/img/ui/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || fresh;
  }));
});
