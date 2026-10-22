// Offline: guarda tudo na primeira visita. Responde do cache e atualiza em segundo
// plano, então uma correção de conteúdo chega ao celular na abertura seguinte.
const CACHE = 'relogio-v2-7';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'game.js', 'cutscenes.js', 'minis.js', 'content.data.js', 'maps/hoje.js', 'maps/eras.js',
  'assets/fonts/pressstart2p-latin.woff2', 'assets/img/ui/icon-192.png', 'assets/img/ui/icon-512.png',
  'img/p_buck.png', 'img/p_mula.png', 'img/p_cobrador.png', 'img/p_sineiro.png', 'img/p_caramuru.png', 'img/p_quitandeira.png',
  'img/p_tropeiro.png', 'img/p_antonil.png', 'img/p_tiradentes.png', 'img/p_silverio.png',
  'assets/img/scenes/mirante.webp', 'assets/img/scenes/chafariz.webp', 'assets/img/scenes/porto_seguro.webp', 'assets/img/scenes/engenho.webp', 'assets/img/scenes/sinos.webp',
];
// Retratos e fundos novos que podem não existir ainda: entram se existirem, sem travar a instalação.
const OPTIONAL = ['img/p_nassau.png', 'img/p_fernao.png', 'img/p_vigia.png', 'img/p_zumbi.png', 'img/p_yves.png', 'img/p_louie.png', 'img/p_aprendiz.png', 'img/p_fundidor.png', 'img/p_caminha.png', 'img/p_colombo.png', 'img/p_cortesao.png',
  'img/lum.png', 'img/bg_tordesilhas.jpg', 'img/bg_moenda.jpg', 'img/bg_capibaribe.jpg', 'img/bg_congonhas.jpg', 'img/bg_torre.jpg',
  ...['musica', 'sino', 'sinoP', 'sinos', 'portal', 'fall', 'card', 'coin', 'garimpo', 'apito', 'ondas', 'flash', 'moenda', 'cascos'].map((n) => `audio/${n}.mp3`)];
const imagesFrom = async (file) => (await (await fetch(file, { cache: 'reload' })).json())
  .map((x) => x.image || x.iconImg).filter(Boolean).map((p) => 'assets/img/' + p);

// Imagens e vídeos não mudam de conteúdo: numa versão nova, reaproveita do cache
// antigo em vez de baixar 18 MB de novo. Código e dados vêm sempre frescos.
const MEDIA = /\.(webp|png|jpg|mp4|woff2)$/;
async function fill(c, list) {
  const old = (await caches.keys()).filter((k) => k !== CACHE);
  await Promise.all(list.map(async (f) => {
    if (MEDIA.test(f)) for (const k of old) { const hit = await (await caches.open(k)).match(f); if (hit) return c.put(f, hit); }
    const r = await fetch(new Request(f, { cache: 'reload' })); // ignora o cache HTTP
    if (!r.ok) throw new Error(f);
    return c.put(f, r);
  }));
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // O essencial precisa entrar inteiro; opcionais e vídeos (cutscenes) vêm quando der.
    await fill(c, FILES);
    await fill(c, [...new Set([...await imagesFrom('data/cards_fase1.json'), ...await imagesFrom('data/eras.json')])]);
    await Promise.allSettled(OPTIONAL.map((v) => fill(c, [v])));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Vídeo pedido em pedaços (Range, o iPhone exige): responde 206 a partir do arquivo inteiro no cache.
async function ranged(res, range) {
  const buf = await res.arrayBuffer();
  const [, a, b] = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = +a || 0;
  const end = b ? Math.min(+b, buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'video/mp4', 'Accept-Ranges': 'bytes',
    'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1) } });
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const range = e.request.headers.get('range');
    if (hit && range) return ranged(hit, range);
    const fresh = fetch(e.request).then((r) => { if (r.status === 200) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || fresh;
  }));
});
