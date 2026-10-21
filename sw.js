// Offline: guarda tudo na primeira visita. Responde do cache e atualiza em segundo
// plano, então uma correção de conteúdo chega ao celular na abertura seguinte.
const CACHE = 'relogio-v22';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'src/main.js', 'src/state.js', 'src/content.js', 'src/modes/tour.js', 'src/modes/timeline.js', 'src/modes/codex.js', 'src/ui.js', 'src/modes/train.js', 'src/leitner.js', 'src/audio.js', 'src/modes/story.js', 'src/modes/quest.js', 'src/economy.js', 'src/colony-logic.js', 'src/modes/colony.js', 'src/map-logic.js', 'src/modes/map.js', 'data/maps/ouro.json',
  'assets/img/chars/ficha_buck.webp', 'assets/img/chars/ficha_mula.webp', 'assets/img/chars/ficha_cobrador.webp', 'assets/img/chars/ficha_sineiro.webp',
  'assets/img/chars/ficha_caramuru.webp', 'assets/img/chars/ficha_quitandeira.webp', 'assets/img/chars/ficha_tropeiro.webp', 'assets/img/chars/ficha_antonil.webp', 'assets/img/chars/ficha_tiradentes.webp', 'assets/img/chars/ficha_silverio.webp',
  'i18n/pt.json', 'i18n/en.json', 'data/en.json',
  'data/index.json', 'data/eras.json', 'data/cards_fase1.json', 'data/tours/tiradentes.json',
  'data/characters.json', 'data/expressions.json', 'data/quizzes.json', 'data/story.json', 'data/story/cap1.json', 'data/story/cap2.json', 'data/story/cap3.json', 'data/story/cap4.json', 'data/story/cap5.json', 'data/story/cap6.json', 'data/achievements.json', 'data/items.json', 'data/quests.json', 'data/colony.json',
  'assets/img/scenes/aldeia.webp', 'assets/img/scenes/chafariz.webp', 'assets/img/scenes/feitoria.webp', 'assets/img/scenes/frota.webp', 'assets/img/scenes/mirante.webp', 'assets/img/scenes/pau_brasil.webp', 'assets/img/scenes/porto_seguro.webp',
  'assets/img/scenes/conspiracao.webp', 'assets/img/scenes/salvador.webp', 'assets/img/scenes/estatua.webp', 'assets/img/scenes/mapa_tiradentes.webp', 'assets/img/scenes/estrada_real.webp', 'assets/img/scenes/arraial.webp', 'assets/img/scenes/sinos.webp', 'assets/img/scenes/engenho.webp',
  'assets/img/cards/roca.webp', 'assets/video/abertura_portal.mp4', 'assets/video/time_gate.mp4',
  'assets/video/porto_seguro.mp4', 'assets/video/methuen.mp4', 'assets/video/queimada.mp4', 'assets/video/forca_praca.mp4', 'assets/video/final_mirante.mp4',
  'assets/video/ageup_paubrasil.mp4', 'assets/video/ageup_acucar.mp4', 'assets/video/ageup_invasoes.mp4', 'assets/video/ageup_palmares.mp4', 'assets/video/ageup_ouro.mp4', 'assets/video/ageup_apogeu.mp4', 'assets/video/ageup_inconfidencia.mp4',
  'assets/img/ui/icon-192.png', 'assets/img/ui/icon-512.png',
];

// As imagens dos cards e os ícones de era vêm dos próprios JSON: card novo com imagem
// entra no offline sem mexer aqui.
const imagesFrom = async (file) => (await (await fetch(file, { cache: 'reload' })).json())
  .flatMap((x) => [x.image, x.iconImg]).filter(Boolean).map((p) => 'assets/img/' + p);

// Imagens e vídeos não mudam de conteúdo: numa versão nova, reaproveita do cache
// antigo em vez de baixar 18 MB de novo. Código e dados vêm sempre frescos.
const MEDIA = /\.(webp|png|mp4)$/;
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
    const videos = FILES.filter((f) => f.endsWith('.mp4'));
    // O essencial (Modo Tour incluído) precisa entrar inteiro; os vídeos, se falharem no 4G, vêm depois.
    await fill(c, FILES.filter((f) => !f.endsWith('.mp4')));
    await fill(c, [...new Set([...await imagesFrom('data/cards_fase1.json'), ...await imagesFrom('data/eras.json')])]);
    await Promise.allSettled(videos.map((v) => fill(c, [v])));
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
