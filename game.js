// Relógio de Sol v2 — motor em canvas puro (sem módulos, sem dependências; abre até por file://).
// Arquitetura inspirada em "As Aventuras de Arthur": canvas 960×540, mundo com zoom 2×, tap-para-andar
// com A*, diálogo SNES com retrato, mosaico nas transições. Tempo real: nada de rodadas nem relógio de jogo.
// Conteúdo histórico vem de content.data.js (gerado de data/*.json). Aqui só motor, roteiro e regras.
'use strict';
(() => {
  const W = 960, H = 540;
  let Z = 1.25; // zoom do mapa (escolhido nos botões ＋/－ do HUD); o lampião libera o nível mais aberto
  const ZOOMS = [0.85, 1, 1.25, 1.6, 2];
  const BONECO = 1.5; // escala dos bonecos sobre os mapas pintados (as casas da arte nova são maiores que o rascunho)
  let DPR = 1; // pixels reais por pixel lógico: o jogo pensa em 960×540, mas o canvas tem a resolução da tela
  let BUFF = null, REDE = 0; // comida ativa { id, until, speed, stealth, radar }; quando a rede pode ser usada de novo
  const app = document.getElementById('app');
  const cv = document.getElementById('c');
  const g = cv.getContext('2d');
  const vid = document.getElementById('vid');
  const DEBUG = /[?&]debug=1/.test(location.search);
  const TEST = /[?&]test=1/.test(location.search); // testes automáticos: laço por timer (painel em segundo plano não pinta)

  // ================= línguas (i18n.js) =================
  // Todo texto passa por tr() na hora de desenhar (draw/wrap); trf('Modelo {0}', x) para texto montado no código.
  const I18 = window.I18N || { L: (s) => s, T: (s, ...a) => s.replace(/\{(\d)\}/g, (_, n) => a[n]), set() {}, chosen: () => true, LANGS: [], lang: 'pt' };
  const tr = I18.L, trf = I18.T;
  const nRel = (n) => trf(n === 1 ? '{0} relatório' : '{0} relatórios', n), nPerg = (n) => trf(n === 1 ? '{0} pergunta certa' : '{0} perguntas certas', n); // plural por língua
  if (/[?&]test=1/.test(location.search)) window.I18N_MISS = new Set(); // o que apareceu na tela sem tradução
  { const q = /[?&]lang=(pt|en|es)/.exec(location.search); if (q) I18.set(q[1]); }

  // ================= conteúdo =================
  const RAW = window.CONTENT_RAW;
  const CARD = Object.fromEntries(RAW.cards.map((c) => [c.id, c]));
  const CHARS = Object.fromEntries(RAW.chars.map((c) => [c.id, c]));
  // mundo aberto (world.js): NPCs de curiosidade, folclore, itens, comidas, pousos, missões paralelas, coleções, eventos
  const WD = window.WORLD || { items: {}, npcs: {}, attach: {}, side: {}, folk: [], sets: [], pousos: [], names: {}, pal: {}, rarity: {}, event: () => null, luaCheia: () => false };
  const ERAS = RAW.eras;
  const ERA = Object.fromEntries(ERAS.map((e) => [e.id, e]));
  // Personagens novos (só do v2): nome da plaquinha; retrato em img/p_<id>.png quando existir.
  const EXTRA = { paraguacu: 'Paraguaçu', nassau: 'Maurício de Nassau', fernao: 'Fernão Dias', vigia: 'O vigia', zumbi: 'Zumbi', yves: 'Yves Alves', louie: 'Louie', aprendiz: 'O aprendiz', caminha: 'Pero Vaz de Caminha', fundidor: 'O fundidor', turista: 'Turista', colombo: 'Colombo', cortesao: 'O cortesão', feitor: 'O feitor', frans: 'Frans Post', capitao: 'Capitão holandês', velho: 'Um velho morador', guia: 'Guia' };
  const nameOf = (id) => CHARS[id]?.name || EXTRA[id] || WD.names[id] || (id && id.includes(' ') ? id : ''); // testemunhas sem ficha: o nome é o próprio id
  // Atos do Dossiê: liberdade dentro do Ato; o seguinte abre com relatórios suficientes deste.
  const ACTS = [
    { id: 'I', name: 'A Régua', eras: ['mundo', 'paubrasil'], need: 4 },
    { id: 'II', name: 'Mãos e Cerco', eras: ['acucar', 'invasoes', 'palmares'], need: 8 },
    { id: 'III', name: 'O Brilho', eras: ['ouro', 'apogeu'], need: 10 },
    { id: 'IV', name: 'A Sombra', eras: ['inconfidencia', 'depois', 'renascimento'], need: 10 },
  ];
  const actOf = (era) => ACTS.findIndex((a) => a.eras.includes(era));
  // Cards que são prêmio de minigame: não ficam no chão.
  const REWARD = new Set(['C02', 'C06', 'C05', 'C12', 'C22', 'C27', 'C29', 'C43', 'C67', 'C77']);

  // ================= save =================
  const SAVE = 'relogio-v2';
  const NEW = () => ({ v: 2, era: 'hoje', pos: {}, gold: 0, dust: 0, cards: [], items: [], eras: { prologo: { visited: true } }, quests: {}, secrets: [], minis: {}, flags: {}, fog: {}, qok: [], played: 0,
    // mundo aberto: brilho (✦), comidas (quantidade), missões paralelas, coleções, títulos, chapéus, revisão espaçada, sequência de dias
    brilho: 0, inv: {}, side: {}, tupi: [], bestiario: ['mula'], pousos: [], provou: [], ouviu: [], sets: {}, titulos: [], titulo: '', chapeu: 'stetson', chapeus: ['stetson'], qerr: {}, doado: 0, dia: '', streak: 0 });
  let G;
  try { G = { ...NEW(), ...JSON.parse(localStorage[SAVE] || '{}') }; } catch { G = NEW(); }
  // Migração do v1: as pistas vistas no caderno antigo viram relatórios.
  if (!G.flags.migrated) {
    G.flags.migrated = 1;
    try { const v1 = JSON.parse(localStorage['relogio-de-sol'] || '{}'); const seen = (v1.seen || []).filter((id) => CARD[id]); if (seen.length) { G.cards = [...new Set([...G.cards, ...seen])]; G.flags.migratedN = seen.length; } } catch { /* sem v1 */ }
  }
  if (G.rap) { G.inv.rapadura = (G.inv.rapadura || 0) + G.rap; G.rap = 0; } // a rapadura agora mora no inventário de comidas
  const save = () => { try { localStorage[SAVE] = JSON.stringify(G); } catch { /* sem armazenamento: joga sem salvar */ } };
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDias = (key, n) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + n); return dateKey(d); };

  // ================= regras do Dossiê =================
  const eraCards = (era) => RAW.cards.filter((c) => c.era === era);
  const gotIn = (eras) => G.cards.filter((id) => eras.includes(CARD[id]?.era)).length;
  const actOpen = (i) => i <= 0 || gotIn(ACTS[i - 1].eras) >= ACTS[i - 1].need;
  const curAct = () => { let i = 0; while (i < ACTS.length - 1 && actOpen(i + 1)) i++; return i; };
  // As eras abrem em ordem cronológica: um portal só abre quando o anterior foi concluído.
  const SEQ = ['mundo', 'paubrasil', 'acucar', 'invasoes', 'palmares', 'ouro', 'apogeu', 'inconfidencia', 'depois', 'renascimento'];
  const eraDone = (era) => !!G.eras[era]?.done;
  const eraOpen = (era) => era === 'prologo' || SEQ.indexOf(era) <= 0 || eraDone(SEQ[SEQ.indexOf(era) - 1]);
  const nextEra = () => SEQ.find((e) => !eraDone(e));
  const eraTitle = (era) => `${YEAR[era]} - ${tr(ERA[era].name)}`;
  // Concluir uma era: todos os relatórios do chão -> todas as perguntas -> o minigame.
  const groundOf = (era) => eraCards(era).filter((c) => !REWARD.has(c.id)).map((c) => c.id);
  const quizOf = (era) => RAW.quizzes.filter((q) => CARD[q.cardId]?.era === era).map((q) => q.id);
  const needOf = (era) => { const gr = groundOf(era), qz = quizOf(era); return { cards: gr.length, got: gr.filter((id) => G.cards.includes(id)).length, quiz: qz.length, ok: qz.filter((id) => G.qok.includes(id)).length, mini: window.MAPS[era]?.needMini || null }; };
  const eraNeedMet = (era) => { const n = needOf(era); return n.got >= n.cards && n.ok >= n.quiz && (!n.mini || !!G.minis[n.mini]); };
  const finalOpen = () => SEQ.every(eraDone);

  // ================= tela: encaixe e rotação =================
  let ROT = false;
  function fit() {
    const vw = innerWidth, vh = innerHeight;
    ROT = vh > vw; // celular em pé: o jogo gira e continua paisagem
    const s = ROT ? Math.min(vh / W, vw / H) : Math.min(vw / W, vh / H);
    app.style.transform = `translate(-50%,-50%) ${ROT ? 'rotate(90deg) ' : ''}scale(${s})`;
    DPR = Math.max(1, Math.min(3, s * (devicePixelRatio || 1))); // tela HD: o canvas acompanha os pixels reais do aparelho
    const cw = Math.round(W * DPR), ch = Math.round(H * DPR);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  }
  addEventListener('resize', fit);
  fit();
  const toggleFS = () => {
    const el = document.documentElement;
    (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.())?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  };

  // ================= imagens =================
  const IMG = {};
  const img = (src) => {
    if (!IMG[src]) { IMG[src] = new Image(); IMG[src].src = src; }
    return IMG[src].complete && IMG[src].naturalWidth ? IMG[src] : null;
  };
  // arte nova (assets/ui, icons, sprites, props, maps): só pede o que existe (lista em assets.data.js, gerada por tools/build_assets.mjs)
  const ASSET = new Set(window.ASSETS || []);
  const ART = (p) => (p && ASSET.has(p) ? img(p) : null);
  for (const p of ASSET) if (p.startsWith('assets/maps/') || p.startsWith('assets/ui/')) img(p); // mapas, colisões e kit de UI carregam logo na abertura

  // ================= áudio (chiptune por WebAudio) =================
  let AC = null, MASTER = null, muted = !!G.flags.muted;
  let TOUCH = matchMedia('(pointer: coarse)').matches || /[?&]touch=1/.test(location.search); // celular/tablet: joystick e botão A na tela
  function audio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return AC; }
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); MASTER = AC.createGain(); MASTER.gain.value = muted ? 0 : 0.5; MASTER.connect(AC.destination); loadSamples(); bgm(0.18); } catch { AC = null; }
    return AC;
  }
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const freq = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return m ? 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12) : 0; };
  function tone(f, t, len, wave = 'square', vol = 0.15, f2 = 0) {
    if (!AC || !f) return;
    const o = AC.createOscillator(), v = AC.createGain();
    o.type = wave; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(v).connect(MASTER); o.start(t); o.stop(t + len + 0.02);
  }
  let NOISE = null;
  function noise(t, len, vol = 0.12) {
    if (!AC) return;
    if (!NOISE) { NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = AC.createBufferSource(), v = AC.createGain();
    s.buffer = NOISE; v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(v).connect(MASTER); s.start(t); s.stop(t + len + 0.02);
  }
  function sfx(n) {
    if (!audio()) return;
    if (BUF[n]) { const src = AC.createBufferSource(), v = AC.createGain(); v.gain.value = 0.8; src.buffer = BUF[n]; src.connect(v).connect(MASTER); src.start(); return; }
    const t = AC.currentTime + 0.01;
    ({
      bip: () => tone(880, t, 0.03, 'square', 0.05),
      tap: () => tone(660, t, 0.05, 'square', 0.08),
      coin: () => { tone(988, t, 0.08, 'square', 0.1); tone(1319, t + 0.08, 0.2, 'square', 0.1); },
      ok: () => { tone(660, t, 0.1); tone(880, t + 0.1, 0.1); tone(1320, t + 0.2, 0.2); },
      bad: () => { tone(220, t, 0.25, 'sawtooth', 0.12); tone(160, t + 0.2, 0.3, 'sawtooth', 0.12); },
      hit: () => noise(t, 0.15, 0.2),
      hop: () => tone(400, t, 0.1, 'square', 0.08, 800),
      honk: () => { tone(330, t, 0.15, 'square', 0.1); tone(330, t + 0.2, 0.15, 'square', 0.1); },
      fall: () => tone(800, t, 0.9, 'triangle', 0.2, 80),
      portal: () => { tone(80, t, 0.6, 'triangle', 0.2, 900); [523, 659, 784, 1047].forEach((f, i) => tone(f, t + 0.5 + i * 0.07, 0.2, 'square', 0.08)); },
      sino: () => { tone(220, t, 2, 'sine', 0.3); tone(440, t, 1.2, 'sine', 0.08); },
      sinoP: () => { tone(660, t, 0.9, 'sine', 0.22); tone(1320, t, 0.4, 'sine', 0.05); },
      lum: () => tone(880, t, 0.1, 'sine', 0.12),
      stone: () => noise(t, 0.04, 0.08),
      card: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.08, 0.25, 'triangle', 0.12)),
      win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.18, 'square', 0.1)),
      flash: () => { noise(t, 0.3, 0.25); tone(1600, t, 0.2, 'square', 0.06, 400); },
    })[n]?.();
  }
  // Trilha única de fundo (audio/musica.mp3, livre de direitos), volume baixo; abaixa sob as narrações.
  const BGM = new Audio('audio/musica.mp3'); BGM.loop = true; BGM.volume = 0.18;
  const bgm = (v) => { BGM.volume = v; BGM.muted = muted; if (BGM.paused) BGM.play().catch(() => {}); };
  function music() {} // as trilhas por era saíram: a música de fundo é uma só
  // Efeitos gravados (ElevenLabs) substituem o chiptune quando carregados; senão fica o som sintetizado.
  const BUF = {};
  const loadSamples = () => ['sino', 'sinoP', 'sinos', 'portal', 'fall', 'card', 'coin', 'garimpo', 'apito', 'ondas', 'flash', 'moenda', 'cascos']
    .forEach((n) => fetch(`audio/${n}.mp3`).then((r) => r.arrayBuffer()).then((b) => AC.decodeAudioData(b)).then((d) => { BUF[n] = d; }).catch(() => {}));
  const setMute = (m) => { muted = m; G.flags.muted = m; save(); if (MASTER) MASTER.gain.value = m ? 0 : 0.5; vid.muted = m; BGM.muted = m; };
  setMute(muted);

  // parte visível de uma imagem com fundo transparente (calculada uma vez por imagem)
  const TRIM = new WeakMap();
  function trimBox(im) {
    if (TRIM.has(im)) return TRIM.get(im);
    let box = [0, 0, im.width, im.height];
    try {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const cc = c.getContext('2d', { willReadFrequently: true }); cc.drawImage(im, 0, 0);
      const d = cc.getImageData(0, 0, im.width, im.height).data; let x0 = im.width, y0 = im.height, x1 = -1, y1 = -1;
      for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) if (d[(y * im.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 >= x0) box = [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
    } catch (e) {}
    TRIM.set(im, box); return box;
  }
  // ================= desenho básico: a "roupa" da interface =================
  // Fontes de celular: Lilita One nos títulos e botões (ttl, plain), Nunito grossa nos textos (txt).
  // Letra sem sombra em lugar nenhum. No celular tudo 15% maior, menos os diálogos (FS_OFF), que já estão no tamanho certo.
  // Os tamanhos continuam na escala antiga (da fonte pixel): FK converte para a fonte nova.
  let FS_OFF = false;
  const FONT_T = '"Lilita One", "Nunito", sans-serif', FONT_B = '"Nunito", sans-serif', FK = 1.4;
  const fsz = (size) => Math.round(size * FK * (TOUCH && !FS_OFF ? 1.15 : 1));
  const fnt = (size, title) => (title ? `${fsz(size)}px ${FONT_T}` : `800 ${fsz(size)}px ${FONT_B}`);
  function draw(s, x, y, size, col, align, title) { s = tr(s); g.font = fnt(size, title); g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillStyle = col; g.fillText(s, x, y + fsz(size) * 0.76); }
  const txt = (s, x, y, size = 16, col = '#fff', align = 'left') => draw(s, x, y, size, col, align, false);
  const ttl = (s, x, y, size = 16, col = '#fff', align = 'left') => draw(s, x, y, size, col, align, true);
  const plain = (s, x, y, size = 16, col = '#fff', align = 'left') => draw(s, x, y, size, col, align, true); // rótulo de botão
  function wrap(s, maxW, size, title) {
    s = tr(s); g.font = fnt(size, title);
    const out = [];
    for (const para of String(s).split('\n')) {
      let line = '';
      for (const w of para.split(' ')) {
        const tryL = line ? line + ' ' + w : w;
        if (g.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL;
      }
      out.push(line);
    }
    out.forEach(I18.keep || (() => {}));
    return out;
  }
  // formas: retângulo arredondado, tom de cor, botão em pílula e painel (imagem em 9 fatias quando o kit de UI existir)
  const rr = (x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else g.rect(x, y, w, h); };
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  function nine(im, x, y, w, h, c = 22) { // imagem de moldura em 9 fatias (cantos fixos, meio esticado)
    const s = Math.round(im.width / 4), d = Math.min(c, w / 3, h / 3), sw = im.width, sh = im.height;
    const xs = [[0, s, x, d], [s, sw - 2 * s, x + d, w - 2 * d], [sw - s, s, x + w - d, d]], ys = [[0, s, y, d], [s, sh - 2 * s, y + d, h - 2 * d], [sh - s, s, y + h - d, d]];
    for (const [sx0, sw0, dx, dw] of xs) for (const [sy0, sh0, dy, dh] of ys) g.drawImage(im, sx0, sy0, sw0, sh0, dx, dy, dw, dh);
  }
  function box(x, y, w, h, a = 0.94) {
    const ui = ART('assets/ui/panel.webp'); if (ui) { g.globalAlpha = Math.min(1, a + 0.06); nine(ui, x, y, w, h); g.globalAlpha = 1; return; }
    const r = Math.min(16, h / 3);
    g.fillStyle = `rgba(0,0,0,${0.28 * a})`; rr(x, y + 4, w, h, r); g.fill(); // sombra da caixa (não é sombra de letra)
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, `rgba(52,68,160,${a})`); gr.addColorStop(1, `rgba(22,28,86,${a})`);
    g.fillStyle = gr; rr(x, y, w, h, r); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.24)'; g.lineWidth = 2; rr(x + 1, y + 1, w - 2, h - 2, r); g.stroke();
    if (h > 30) { g.fillStyle = 'rgba(255,255,255,.07)'; rr(x + 4, y + 3, w - 8, Math.min(18, h / 4), r); g.fill(); }
  }
  function pill(r, col = '#ffd84a', label, fg = '#2a1a08', size = 13) { // botão com relevo
    const [x, y, w, h] = r, rad = Math.min(14, h / 2), im = ART(`assets/ui/btn_${col === '#ffd84a' ? 'ouro' : 'azul'}.webp`);
    if (im) { const sc = im.height / 2, dc = Math.min(h / 2, w / 2); g.drawImage(im, 0, 0, sc, im.height, x, y, dc, h); g.drawImage(im, sc, 0, im.width - 2 * sc, im.height, x + dc, y, w - 2 * dc, h); g.drawImage(im, im.width - sc, 0, sc, im.height, x + w - dc, y, dc, h); } // botão: ponta, meio esticado, ponta
    else {
      g.fillStyle = shade(col, 0.62); rr(x, y + 3, w, h, rad); g.fill();
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, shade(col, 1.12)); gr.addColorStop(1, shade(col, 0.88));
      g.fillStyle = gr; rr(x, y, w, h, rad); g.fill();
      g.fillStyle = 'rgba(255,255,255,.28)'; rr(x + 4, y + 3, w - 8, h * 0.36, rad); g.fill();
    }
    if (label != null) plain(label, x + w / 2, y + h / 2 - fsz(size) * 0.38, size, fg, 'center');
    return r;
  }
  // Caixa fina dos Luminares: escura, borda âmbar fina, sem retrato.
  function icon(id, emoji, cx, cy, size) { const im = ART(id && `assets/icons/${id}.webp`); if (im) { g.imageSmoothingEnabled = true; g.drawImage(im, cx - size / 2, cy - size / 2, size, size); return; } g.font = `${size}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(emoji || '•', cx, cy + 1); }
  function lumBox(x, y, w, h) { g.fillStyle = 'rgba(10,8,2,.88)'; rr(x, y, w, h, 12); g.fill(); g.strokeStyle = '#e8c04a'; g.lineWidth = 1.5; rr(x + 1, y + 1, w - 2, h - 2, 12); g.stroke(); }
  const pix = document.createElement('canvas');
  function pixelImage(im, k = 3, dark = 0) { // nome antigo; agora o fundo é desenhado liso, em "cover", sem pixelizar
    const sc = Math.max(W / im.width, H / im.height);
    g.imageSmoothingEnabled = true; g.drawImage(im, (W - im.width * sc) / 2, (H - im.height * sc) / 2, im.width * sc, im.height * sc);
    if (dark) { g.fillStyle = `rgba(0,0,0,${dark})`; g.fillRect(0, 0, W, H); }
  }
  const bg = (src, k = 3, dark = 0.2, col = '#111') => { const im = img(src); if (im) pixelImage(im, k, dark); else { g.fillStyle = col; g.fillRect(0, 0, W, H); } };
  // Forma dos Luminares: hexágono âmbar translúcido que pulsa (img/lum.png quando existir).
  function lum(x, y, r, t, a = 0.7) {
    const p = 0.85 + 0.15 * Math.sin(t * 3), im = img('img/lum.png');
    g.save(); g.globalAlpha = a * p; g.translate(x, y); g.rotate(t * 0.2);
    if (im) { g.imageSmoothingEnabled = false; g.drawImage(im, -r, -r, r * 2, r * 2); g.restore(); return; }
    g.fillStyle = 'rgba(243,226,160,.35)'; g.strokeStyle = '#e8c04a'; g.lineWidth = 2;
    g.beginPath(); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3 + (i % 2) * 0.12; g.lineTo(Math.cos(an) * r * (i % 2 ? 0.86 : 1), Math.sin(an) * r * (i % 2 ? 0.86 : 1)); } g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  // ================= bonecos (tudo em fillRect) =================
  const PAL = {
    buck: { skin: '#e2b48c', hair: '#6b4a2a', shirt: '#c0392b', plaid: '#7a1f14', vest: '#4a3222', pants: '#3a4a6a', boots: '#3a2212', hat: 'stetson', hatc: '#6b4a2a', bandana: '#2d6cdf', canteen: 1 },
    sineiro: { skin: '#5a3a28', hair: '#eeeeee', shirt: '#f2efe6', pants: '#3a4a7a', boots: null, beard: '#e0e0e0' },
    cobrador: { skin: '#e8d8c8', hair: '#f0f0f0', shirt: '#1d2a6b', buttons: '#e8c04a', pants: '#1a1a1a', boots: '#111', hat: 'tricorne', hatc: '#111', book: 1 },
    tiradentes: { skin: '#e2b48c', hair: '#3a2a1a', shirt: '#efe5cc', pants: '#3a3a3a', boots: '#2a1a0a', beard: '#3a2a1a', long: 1 },
    silverio: { skin: '#e8c8a8', hair: '#3a2a1a', shirt: '#2f4f2f', pants: '#1f2f1f', boots: '#111', hat: 'tricorne', hatc: '#1f2f1f', mustache: '#2a1a0a' },
    antonil: { skin: '#e8c8a8', hair: '#5a4a3a', shirt: '#111111', pants: '#111111', boots: '#111', robe: 1, hat: 'barrete', hatc: '#111', redbook: 1 },
    quitandeira: { skin: '#6a4430', hair: '#b23a2b', shirt: '#c9a86a', pants: '#c9a86a', boots: null, robe: 1, turban: '#b23a2b', tray: 1 },
    tropeiro: { skin: '#c89a74', hair: '#3a2a1a', shirt: '#a0522d', plaid: '#e0c080', pants: '#5a4a3a', boots: '#3a2212', hat: 'leather', hatc: '#7a5a3a' },
    paraguacu: { skin: '#a8724c', hair: '#111', shirt: null, paint: '#2a6a8a', pants: '#8a5a3a', boots: null, long: 1 },
    caramuru: { skin: '#b07a52', hair: '#1a1a1a', shirt: null, paint: '#b23a2b', pants: '#6a4a2a', boots: null, cocar: 1 },
    nassau: { skin: '#f0d8c0', hair: '#c8a878', shirt: '#e07a20', buttons: '#fff', pants: '#2a2a3a', boots: '#111', hat: 'tricorne', hatc: '#1a1a1a', long: 1 },
    fernao: { skin: '#d8b090', hair: '#dddddd', shirt: '#6a5030', pants: '#4a3a2a', boots: '#2a1a0a', beard: '#dddddd', hat: 'leather', hatc: '#5a4030' },
    vigia: { skin: '#4a2e1e', hair: '#1a1a1a', shirt: '#e8dcc0', pants: '#6a5a3a', boots: null },
    zumbi: { skin: '#3a2418', hair: '#111', shirt: '#7a2a1a', pants: '#3a2a1a', boots: null, beard: '#111' },
    yves: { skin: '#f0d0b8', hair: '#8a6a4a', shirt: '#e8e0c8', pants: '#5a6a4a', boots: '#3a2a1a', glasses: 1, camera: 1 },
    louie: { skin: '#e8c0a0', hair: '#2a2a2a', shirt: '#f2efe6', pants: '#c8b890', boots: '#5a3a2a', glasses: 1 },
    aprendiz: { skin: '#8a5a3a', hair: '#2a1a0a', shirt: '#8a7a6a', pants: '#5a4a3a', boots: null },
    fundidor: { skin: '#c89070', hair: '#2a1a0a', shirt: '#5a4a3a', pants: '#3a2a1a', boots: '#2a1a0a', apron: '#7a5a3a' },
    turista: { skin: '#f0c8a8', hair: '#d8b060', shirt: '#4ab0d8', pants: '#e8d8b0', boots: '#fff', camera: 1 },
    colombo: { skin: '#f0d0b0', hair: '#d8d0c0', shirt: '#6a1a2a', buttons: '#e8c04a', pants: '#2a2a2a', boots: '#111', long: 1 },
    cortesao: { skin: '#f0d0b0', hair: '#2a1a0a', shirt: '#2a3a8a', buttons: '#e8c04a', pants: '#1a1a2a', boots: '#111', mustache: '#2a1a0a' },
  };
  Object.assign(PAL, WD.pal);
  for (const k of Object.keys(PAL)) PAL[k].sprite ||= k; // nome da folha de sprite de cada um (assets/sprites/<id>.webp)
  for (const k of Object.keys(PAL)) if (!ASSET.has(`assets/sprites/${PAL[k].sprite}.webp`) && ASSET.has('assets/sprites/gen_cidadao.webp')) PAL[k].sprite = 'gen_cidadao'; // sem folha própria (ex.: parceiro sem autorização): figurante genérico
  WD.sprite = (id) => ART(`assets/sprites/${id}.webp`);
  const FOLK = new Set(WD.folk.map((f) => f.id));
  // testemunhas sem ficha ("Um marinheiro de Palos"…): um de 4 tipos genéricos, cada um com sprite e retrato próprios quando existirem
  const GENERICO = [[/marinh|maruj|barqueir/i, 'gen_marinheiro', { shirt: '#f2efe6', plaid: '#2a4a8a', pants: '#2a4a8a', boots: null }], [/soldad|drag[aã]o|carcereir|vigia/i, 'gen_soldado', { shirt: '#2a3a7a', buttons: '#e8c04a', pants: '#e8e0c8', boots: '#111', hat: 'tricorne', hatc: '#111' }],
    [/sert[aã]o|paulista|guia/i, 'gen_sertanejo', { shirt: '#9a6a3a', pants: '#6a5a3a', boots: '#3a2212', hat: 'leather', hatc: '#6a4a2a' }], [/./, 'gen_cidadao', { shirt: '#5a3a5a', buttons: '#ddd', pants: '#2a2a2a', boots: '#111' }]];
  const genOf = (id) => GENERICO.find(([re]) => re.test(id)) || GENERICO[3];
  const palOf = (id) => PAL[id] || (id && id.includes(' ') ? { ...PAL.turista, ...genOf(id)[2], sprite: genOf(id)[1] } : PAL.turista);
  const buckPal = () => { const h = ITEM(G.chapeu || 'stetson'), sprite = ASSET.has(`assets/sprites/buck_${G.chapeu}.webp`) ? `buck_${G.chapeu}` : 'buck'; return h.hat ? { ...PAL.buck, hat: h.hat, hatc: h.hatc, sprite } : PAL.buck; };
  function dude(x, y, P, ph, face, u = 2, moving = true, extra = {}) {
    const sp = !extra.flame && ART(P.sprite && `assets/sprites/${P.sprite}.webp`);
    if (sp) {
      const fw = sp.width / 3, fh = sp.height / 4, row = { 0: 0, '-1': 1, 2: 2, 1: 3 }[face] ?? 0, col = moving ? 1 + (Math.floor(ph / Math.PI) % 2) : 0;
      const h = 26 * u, w = h * fw / fh, bob = moving ? 0 : Math.sin(T * 2.5) * 0.4 * u; // respira parado
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 6 * u, 2 * u, 0, 0, 7); g.fill();
      g.imageSmoothingEnabled = true; g.drawImage(sp, col * fw, row * fh, fw, fh, x - w / 2, y - h + bob, w, h - bob);
      return;
    }
    const R = (dx, dy, w, h, c) => { if (c) { g.fillStyle = c; g.fillRect(Math.round(x + dx * u), Math.round(y + dy * u), Math.ceil(w * u), Math.ceil(h * u)); } };
    const sw = moving ? Math.sin(ph) : 0;
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, 6 * u, 2 * u, 0, 0, 7); g.fill();
    const side = face === -1 || face === 2;
    if (!P.robe) {
      const l1 = Math.round(sw * 1.5), l2 = -l1;
      R(-3, -7 + Math.max(0, l1), 2.5, 7 - Math.max(0, l1), P.pants); R(0.5, -7 + Math.max(0, l2), 2.5, 7 - Math.max(0, l2), P.pants);
      R(-3, -2, 2.5, 2, P.boots || P.skin); R(0.5, -2, 2.5, 2, P.boots || P.skin);
    } else { R(-4, -8, 8, 8, P.pants); R(-3, -1, 2, 1, P.boots || P.skin); R(1, -1, 2, 1, P.boots || P.skin); }
    const shirt = P.shirt || P.skin;
    R(-4, -14, 8, 7, shirt);
    if (P.plaid) { R(-2.5, -14, 1, 7, P.plaid); R(0.5, -14, 1, 7, P.plaid); R(-4, -11, 8, 1, P.plaid); }
    if (P.paint) { R(-3, -13, 6, 1, P.paint); R(-3, -10, 6, 1, P.paint); }
    if (P.apron && face !== 1) R(-3, -12, 6, 6, P.apron);
    if (P.vest && face !== 1) { R(-4, -14, 2, 7, P.vest); R(2, -14, 2, 7, P.vest); }
    if (P.buttons && face !== 1) { R(-0.5, -13, 1, 1, P.buttons); R(-0.5, -11, 1, 1, P.buttons); R(-0.5, -9, 1, 1, P.buttons); }
    if (P.canteen) R(face === 2 ? 3 : -5, -9, 2, 2.5, '#b0b0b0');
    if (extra.badge && face !== 1) R(1, -13, 2, 1, '#fff');
    const a = Math.round(sw * 1.5);
    if (!side) { R(-6, -14 + a * 0.3, 2, 6, shirt); R(4, -14 - a * 0.3, 2, 6, shirt); R(-6, -8 + a * 0.3, 2, 1.5, P.skin); R(4, -8 - a * 0.3, 2, 1.5, P.skin); }
    else R(face === 2 ? -1 + a * 0.5 : -1 - a * 0.5, -13, 2, 6, shirt);
    if (P.book && face !== 1) { R(-7, -9, 3, 3, '#5a3a1a'); R(-6, -11, 0.6, 2, '#999'); }
    if (P.redbook && face !== 1) R(4, -10, 2.5, 3, '#8a1a1a');
    if (P.camera && face !== 1) R(-1.5, -12, 3, 2, '#222');
    if (P.bandana) R(-3, -15, 6, 1.5, P.bandana);
    if (extra.flame) { // easter egg: Buck com a chama da Mula no lugar da cabeça
      const fl = Math.floor(extra.t * 8) % 3;
      R(-3, -21 - fl * 0.5, 6, 6 + fl * 0.5, '#4aa8ff'); R(-1.5, -23 - fl, 3, 3, '#bfe3ff');
      return;
    }
    R(-3, -20, 6, 6, P.skin);
    if (P.long) { R(-3.5, -21, 7, 2, P.hair); R(-3.5, -20, 1, 6, P.hair); R(2.5, -20, 1, 6, P.hair); } else R(-3, -21, 6, 1.5, P.hair);
    if (face === 1) R(-3, -20, 6, 5, P.hair);
    else {
      const ex = face === -1 ? [-2] : face === 2 ? [1] : [-2, 1];
      for (const e of ex) R(e, -18, 1, 1, '#1a1a1a');
      if (P.glasses) { R(-2.5, -18.5, 2, 1.6, '#222'); R(0.5, -18.5, 2, 1.6, '#222'); }
      if (P.beard) R(-3, -16, 6, 2.2, P.beard);
      if (P.mustache) R(-2, -16, 4, 0.8, P.mustache);
    }
    if (P.turban) { R(-3.5, -23, 7, 3, P.turban); if (P.tray) { R(-5, -24.5, 10, 1.5, '#e0c080'); R(-3, -25.5, 1, 1, '#d33'); R(0, -25.5, 1, 1, '#3a3'); R(2, -25.5, 1, 1, '#fc3'); } }
    if (P.hat === 'stetson' && !extra.noHat) { R(-5.5, -21.5, 11, 1.5, P.hatc); R(-3, -24, 6, 2.5, P.hatc); R(-3, -22.3, 6, 0.6, '#3a2212'); }
    if (P.hat === 'tricorne') { R(-5, -22, 10, 1.5, P.hatc); R(-3, -23.5, 6, 1.5, P.hatc); }
    if (P.hat === 'leather') { R(-5, -21.5, 10, 1.2, P.hatc); R(-2.5, -23.5, 5, 2, P.hatc); }
    if (P.hat === 'barrete') R(-3, -23, 6, 2, P.hatc);
    if (P.hat === 'palha') { R(-6, -21.5, 12, 1.5, P.hatc); R(-3, -23.5, 6, 2, P.hatc); R(-3, -22, 6, 0.6, '#c0392b'); }
    if (P.cocar) { R(-3, -23, 1, 2, '#e33'); R(-1, -24, 1, 3, '#fc3'); R(1, -23, 1, 2, '#3a3'); }
  }
  // Dona Mula: a antena. A chama azul cresce com o Ato e pulsa ao transmitir um relatório.
  function mula(x, y, ph, dir, u = 2, moving = true, t = 0, o = {}) {
    const f = dir < 0 ? -1 : 1;
    const sp = !o.stetson && ART('assets/sprites/mula.webp'); // 1 linha × 3 quadros (parada, passo A, passo B), olhando para a direita
    if (sp) {
      const fw = sp.width / 3, fh = sp.height, col = moving ? 1 + (Math.floor(ph / Math.PI) % 2) : 0, h = 26 * u, w = h * fw / fh;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 8 * u, 2 * u, 0, 0, 7); g.fill();
      g.save(); g.translate(x, y); g.scale(f, 1); g.imageSmoothingEnabled = true; g.drawImage(sp, col * fw, 0, fw, fh, -w / 2, -h, w, h); g.restore();
      return;
    }
    const R = (dx, dy, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + (f > 0 ? dx : -dx - w) * u), Math.round(y + dy * u), Math.ceil(w * u), Math.ceil(h * u)); };
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, 8 * u, 2 * u, 0, 0, 7); g.fill();
    const s = moving ? Math.sin(ph) * 1.2 : 0;
    R(-6, -6 + Math.max(0, s), 1.6, 6 - Math.max(0, s), '#6a5a4a'); R(-3, -6 + Math.max(0, -s), 1.6, 6 - Math.max(0, -s), '#7a6a5a');
    R(3, -6 + Math.max(0, -s), 1.6, 6 - Math.max(0, -s), '#6a5a4a'); R(5.5, -6 + Math.max(0, s), 1.6, 6 - Math.max(0, s), '#7a6a5a');
    R(-7, -12, 14, 6, '#8a7a6a'); R(-8, -11, 1.5, 4, '#6a5a4a');
    R(-5, -14, 5, 5, '#5a3a1a'); R(-5, -12, 5, 0.8, '#b08a3a');
    R(5, -16, 3, 5, '#8a7a6a');
    if (o.stetson) { R(3, -18, 7, 1.2, '#6b4a2a'); R(4.5, -20, 4, 2, '#6b4a2a'); return; }
    const k = (o.flame ?? 0.55) * (o.flicker ? 0.6 + 0.4 * Math.abs(Math.sin(t * 13)) : 1);
    const fl = Math.floor(t * 8) % 3, hgt = 3 + fl * 0.5 + k * 4;
    R(4.5, -16 - hgt, 4, hgt, '#4aa8ff'); R(5.5, -17 - hgt - fl * 0.5, 2, 2 + k * 2, '#bfe3ff');
    if (o.hat) { R(3, -16 - hgt - 1, 7, 1, '#d8c070'); R(4.5, -16 - hgt - 2.5, 4, 1.5, '#d8c070'); }
    R(9 + Math.sin(t * 3), -21 - k * 2 + Math.cos(t * 2), 1.2, 1.2, '#f0c040');
  }

  // ================= partículas e textos flutuantes =================
  let PARTS = [], FLOAT = [];
  function confetti(x = W / 2, y = H / 3, n = 80) {
    const cols = ['#ffd84a', '#ff5a5a', '#4ad8ff', '#7aff6a', '#ff9af0', '#fff'];
    for (let i = 0; i < n; i++) PARTS.push({ x, y, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 380 - 80, c: cols[i % cols.length], life: 2 + Math.random(), sz: 6 });
  }
  function firework(x, y) { for (let i = 0; i < 50; i++) { const a = Math.random() * 7, v = 80 + Math.random() * 160; PARTS.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: ['#ffd84a', '#fff', '#ff9a4a', '#9ad8ff'][i % 4], life: 1.2 + Math.random(), sz: 4, light: 1 }); } }
  function floatTxt(s, col = '#ffd84a') { FLOAT.push({ s, col, t: 2 }); }
  // moedas e brilhos que voam até o contador do HUD (só no mapa, onde o HUD existe)
  let FLY = [];
  function fly(kind, n) {
    if (!scene?.S) return;
    const to = kind === 'ouro' ? [31, H - 57] : [31, H - 39];
    for (let i = 0; i < Math.min(8, Math.max(1, Math.round(n / 5))); i++) FLY.push({ kind, x: W / 2 + (Math.random() - 0.5) * 80, y: H / 2 + (Math.random() - 0.5) * 50, to, t: -i * 0.07 });
  }
  function drawFly(dt) {
    FLY = FLY.filter((f) => (f.t += dt) < 0.75);
    for (const f of FLY) {
      if (f.t < 0) continue;
      const k = f.t / 0.75, e = k * k * (3 - 2 * k), x = f.x + (f.to[0] - f.x) * e, y = f.y + (f.to[1] - f.y) * e - Math.sin(k * Math.PI) * 60, sz = 22 - 8 * k;
      icon(f.kind === 'ouro' ? 'hud_ouro' : 'hud_brilho', f.kind === 'ouro' ? '🪙' : '✨', x, y, sz);
    }
  }
  function drawParts(dt) {
    PARTS = PARTS.filter((p) => (p.life -= dt) > 0);
    for (const p of PARTS) { p.vy += (p.light ? 120 : 600) * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = p.c; g.fillRect(p.x, p.y, p.sz, p.sz); }
    FLOAT = FLOAT.filter((f) => (f.t -= dt) > 0);
    FLOAT.forEach((f, i) => { const y = 140 - (2 - f.t) * 30 + i * 30; g.globalAlpha = Math.min(1, f.t); g.font = fnt(12, true); const w = g.measureText(tr(f.s)).width + 28; g.fillStyle = 'rgba(10,14,40,.72)'; rr(W / 2 - w / 2, y - 6, w, fsz(12) + 12, 14); g.fill(); ttl(f.s, W / 2, y, 12, f.col, 'center'); g.globalAlpha = 1; });
  }

  // ================= diálogo, escolha, faixa, transição, painéis =================
  let DLG = null, ASK = null, BANNER = null, TR = null, PANEL = null, SHAKE = 0, UPDATE = false;
  const PAGE = 4, CPS = 50;
  function say(lines, done) {
    const pages = [];
    for (const [who, text, pic] of lines) {
      const hasP = who && who !== 'narr' && who !== 'lum';
      FS_OFF = true; const ls = wrap(text, hasP ? W - 260 : W - 100, who === 'lum' ? 14 : 16); FS_OFF = false;
      for (let i = 0; i < ls.length; i += PAGE) pages.push({ who, lines: ls.slice(i, i + PAGE), pic });
    }
    if (!pages.length) { done?.(); return; }
    DLG = { pages, i: 0, shown: 0, done, bipAt: 0 };
    if (pages[0].who === 'lum') sfx('lum');
  }
  function dlgTap() {
    const p = DLG.pages[DLG.i], total = p.lines.join('').length;
    if (DLG.shown < total) { DLG.shown = total; return; }
    sfx('tap');
    if (++DLG.i >= DLG.pages.length) { const d = DLG.done; DLG = null; d?.(); } else { DLG.shown = 0; if (DLG.pages[DLG.i].who === 'lum') sfx('lum'); }
  }
  function drawDlg(dt, t) { FS_OFF = true; try { drawDlg0(dt, t); } finally { FS_OFF = false; } }
  function drawDlg0(dt, t) {
    const p = DLG.pages[DLG.i];
    const total = p.lines.join('').length;
    const isLum = p.who === 'lum';
    if (DLG.shown < total) { DLG.shown = Math.min(total, DLG.shown + CPS * dt); if (!isLum && DLG.shown - DLG.bipAt >= 2) { DLG.bipAt = DLG.shown; sfx('bip'); } } else DLG.bipAt = 0;
    const y0 = H - 196;
    if (p.pic) picHolder(p.pic, y0);
    let tx = 48;
    if (isLum) lumBox(60, y0 + 20, W - 120, 150); else box(16, y0, W - 32, 180);
    const nm = isLum ? '' : nameOf(p.who);
    if (nm) {
      const im = p.who?.includes(' ') ? ART(`assets/sprites/${genOf(p.who)[1]}_retrato.webp`) : img(`img/p_${p.who}.png`);
      g.save(); rr(30, y0 + 22, 136, 136, 16); g.clip(); g.fillStyle = '#0a1040'; g.fillRect(30, y0 + 22, 136, 136);
      if (im) { g.imageSmoothingEnabled = true; g.drawImage(im, 30, y0 + 22, 136, 136); } else if (FOLK.has(p.who)) { g.save(); g.translate(98, y0 + 140); g.scale(2.2, 2.2); WD.drawFolk(g, p.who, 0, 0, T); g.restore(); } else dude(98, y0 + 150, palOf(p.who), 0, 0, 5, false);
      g.restore(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; rr(30, y0 + 22, 136, 136, 16); g.stroke();
      tx = 190;
      const name = nm.length > 24 ? nm.split(' ').slice(0, 3).join(' ') : nm;
      g.font = fnt(12, true); const nw = g.measureText(tr(name)).width + 28;
      pill([tx - 6, y0 - 16, nw, 30], '#ffd84a', name, '#2a1a08', 12);
    }
    if (isLum) tx = 90;
    let left = Math.floor(DLG.shown);
    p.lines.forEach((l, k) => { const s = I18.keep(l.slice(0, Math.max(0, left))); left -= l.length; txt(s, tx, y0 + (isLum ? 44 : 30) + k * 30, isLum ? 14 : 16, isLum ? '#f3e2a0' : '#fff'); });
    // botão "passar": o único jeito de avançar a fala no toque (apagado enquanto o texto corre, pulsa quando terminou)
    {
      const end = DLG.shown >= total, pr = end ? 1 + 0.1 * Math.sin(t * 6) : 1, bx = W - (isLum ? 104 : 70), by = y0 + 144, r = TOUCH ? 24 : 17;
      DLG.btn = [bx, by, r + 18]; g.globalAlpha = end ? 1 : 0.5;
      { const gr = g.createLinearGradient(0, by - r, 0, by + r); gr.addColorStop(0, isLum ? '#f3d878' : '#ffe680'); gr.addColorStop(1, isLum ? '#c89a30' : '#f5a800'); g.fillStyle = gr; g.beginPath(); g.arc(bx, by, r * pr, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.stroke(); }
      g.fillStyle = '#1a1030'; g.beginPath(); g.moveTo(bx - r * 0.3, by - r * 0.45); g.lineTo(bx + r * 0.45, by); g.lineTo(bx - r * 0.3, by + r * 0.45); g.closePath(); g.fill();
      if (!TOUCH) txt('Espaço', bx - 26, by - 6, 9, '#fff', 'right');
      g.globalAlpha = 1;
    }
  }
  // Lugar da imagem de uma fala ('forma:legenda'): por enquanto, forma geométrica de place holder.
  function picHolder(pic, y0) {
    const [shape, label = ''] = pic.split(':'), w = 300, h = y0 - 60, x = W / 2 - w / 2, y = 34, cx = W / 2, cy = y + h / 2 - 10, r = Math.min(70, h / 3);
    g.fillStyle = 'rgba(10,16,64,.92)'; g.fillRect(x, y, w, h); g.strokeStyle = '#ffd84a'; g.lineWidth = 3; g.setLineDash([10, 6]); g.strokeRect(x, y, w, h); g.setLineDash([]);
    g.fillStyle = '#8a9ad8'; g.beginPath();
    if (shape === 'circle') g.arc(cx, cy, r, 0, 7);
    else if (shape === 'triangle') { g.moveTo(cx, cy - r); g.lineTo(cx + r, cy + r * 0.8); g.lineTo(cx - r, cy + r * 0.8); }
    else if (shape === 'diamond') { g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); }
    else g.rect(cx - r, cy - r * 0.75, r * 2, r * 1.5);
    g.fill();
    wrap(label, w - 30, 9).slice(0, 2).forEach((l, i) => txt(l, cx, y + h - 34 + i * 14, 9, '#fff', 'center'));
  }
  function ask(q, opts, cb) { ASK = { q, opts, cb, rects: [], sel: 0 }; }
  function drawAsk() {
    const qs = wrap(ASK.q, W - 100, 14, true);
    const two = ASK.opts.length >= 4;
    const rows = two ? Math.ceil(ASK.opts.length / 2) : ASK.opts.length;
    const h = 40 + qs.length * 24 + rows * 50 + 20;
    const y0 = Math.max(8, H - h - 16);
    box(16, y0, W - 32, h);
    qs.forEach((l, i) => ttl(l, 48, y0 + 26 + i * 24, 14, '#ffd84a'));
    ASK.rects = ASK.opts.map((o, i) => {
      const col = two ? i % 2 : 0, row = two ? Math.floor(i / 2) : i;
      const bw = two ? (W - 112) / 2 : W - 96;
      const r = [48 + col * (bw + 16), y0 + 30 + qs.length * 24 + row * 50, bw, 42];
      const on = i === ASK.sel; g.fillStyle = on ? 'rgba(255,216,74,.28)' : 'rgba(255,255,255,.10)'; rr(...r, 12); g.fill(); g.strokeStyle = on ? '#ffd84a' : 'rgba(170,190,255,.45)'; g.lineWidth = on ? 3 : 1.5; rr(...r, 12); g.stroke();
      const ls = wrap(`${'ABCDEFGH'[i]}) ${tr(o)}`, bw - 24, 11);
      ls.slice(0, 2).forEach((l, k) => txt(l, r[0] + 12, r[1] + (ls.length > 1 ? 8 : 15) + k * 15, 11, '#fff'));
      return r;
    });
  }
  function askPick(i) { if (!ASK || i < 0 || i >= ASK.opts.length) return; const cb = ASK.cb; ASK = null; sfx('tap'); cb(i); }
  function banner(title) { BANNER = { title, t: 3 }; }
  function drawBanner(dt) {
    BANNER.t -= dt;
    if (BANNER.t <= 0) { BANNER = null; return; }
    const a = Math.min(1, BANNER.t, 3 - BANNER.t + 0.3);
    g.globalAlpha = Math.max(0, a);
    g.font = fnt(18, true); const w = g.measureText(tr(BANNER.title)).width + 60;
    box(W / 2 - w / 2, 70, w, 56, 0.9); ttl(BANNER.title, W / 2, 86, 18, '#ffd84a', 'center');
    g.globalAlpha = 1;
  }
  const mos = document.createElement('canvas');
  function go(next, title) { if (!TR) TR = { t: 0, next, title, swapped: false }; }
  function drawTR(dt) {
    TR.t += dt;
    const k = TR.t < 0.4 ? TR.t / 0.4 : Math.max(0, 1 - (TR.t - 0.4) / 0.3);
    if (TR.t >= 0.4 && !TR.swapped) { if (UPDATE) { location.reload(); return; } TR.swapped = true; setScene(typeof TR.next === 'function' ? TR.next() : TR.next); if (TR.title) banner(TR.title); }
    if (k > 0) {
      const f = 1 + Math.floor(k * 24);
      mos.width = Math.ceil(W / f); mos.height = Math.ceil(H / f);
      mos.getContext('2d').drawImage(cv, 0, 0, mos.width, mos.height);
      g.imageSmoothingEnabled = false; g.drawImage(mos, 0, 0, mos.width, mos.height, 0, 0, W, H);
      g.fillStyle = `rgba(0,0,0,${k})`; g.fillRect(0, 0, W, H);
    }
    if (TR && TR.t >= 0.7) TR = null;
  }

  // ---- tela do card (o "relatório"): a única tela de leitura do jogo ----
  function cardScreen(id, done) { PANEL = { kind: 'card', id, done }; sfx('card'); }
  function drawCard() {
    const c = CARD[PANEL.id];
    const serio = c.tone === 'serio';
    box(30, 24, W - 60, H - 48, 0.97);
    const im = img('assets/img/' + c.image);
    g.fillStyle = '#000'; g.fillRect(52, 52, 420, 236);
    if (im) { g.imageSmoothingEnabled = true; const s = Math.max(420 / im.width, 236 / im.height); g.save(); g.beginPath(); g.rect(52, 52, 420, 236); g.clip(); if (serio) g.filter = 'grayscale(.7)'; g.drawImage(im, 52 + (420 - im.width * s) / 2, 52 + (236 - im.height * s) / 2, im.width * s, im.height * s); g.restore(); g.filter = 'none'; }
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; rr(52, 52, 420, 236, 14); g.stroke();
    txt(`${tr(c.yearLabel)} · ${tr(ERA[c.era]?.name || '')}`, 52, 300, 10, '#8a9ad8');
    wrap(c.title, 420, 14, true).slice(0, 3).forEach((l, i) => ttl(l, 52, 320 + i * 22, 14, '#ffd84a'));
    wrap(`“${tr(c.hook)}”`, 420, 10).slice(0, 6).forEach((l, i) => txt(l, 52, 392 + i * 16, 10, '#cfe0ff'));
    let y = 56;
    ttl('RELATÓRIO', 500, y, 12, '#ffd84a'); y += 26;
    for (const f of (c.facts || []).slice(0, 3)) { const ls = wrap('• ' + tr(f), W - 560, 10).slice(0, 5); ls.forEach((l, i) => txt(l, 500, y + i * 16, 10, '#fff')); y += ls.length * 16 + 10; }
    if (c.imagine) { const ls = wrap(c.imagine, W - 580, 9).slice(0, 6); const hgt = ls.length * 15 + 34; g.fillStyle = 'rgba(255,216,74,.12)'; g.fillRect(500, y, W - 560, hgt); g.strokeStyle = '#ffd84a'; g.lineWidth = 2; g.strokeRect(500, y, W - 560, hgt); txt('Imagine…', 510, y + 8, 9, '#ffd84a'); ls.forEach((l, i) => txt(l, 510, y + 24 + i * 15, 9, '#fff')); y += hgt + 10; }
    if (c.joke && !serio && y < H - 230) { const ls = wrap(c.joke, W - 580, 9).slice(0, 5); const hgt = ls.length * 15 + 34; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(500, y, W - 560, hgt); txt('Dona Mula:', 510, y + 8, 9, '#4aa8ff'); ls.forEach((l, i) => txt(l, 510, y + 24 + i * 15, 9, '#ddd')); }
  }

  // ---- Caderno do Buck: relatórios por era ----
  const ORDER = [...ERAS].filter((e) => e.id !== 'prologo').sort((a, b) => a.range[0] - b.range[0]).concat(ERAS.filter((e) => e.id === 'prologo'));
  const YEAR = { mundo: 1492, paubrasil: 1500, acucar: 1550, invasoes: 1630, palmares: 1650, ouro: 1700, apogeu: 1740, inconfidencia: 1789, depois: 1850, renascimento: 1972, prologo: 'HOJE' };
  // ---- inventário do Buck: abas Bolsa (úteis e comidas), Coleção (relíquias, antiguidades, chapéus) e Saber ----
  const TABS = ['Bolsa', 'Coleção', 'Saber'], PER = 6;
  const RAR = (r) => WD.rarity[r] || { name: '', col: '#fff' };
  function setProg(st) {
    if (st.id === 'tupi') return G.tupi.length;
    if (st.id === 'bestiario') return G.bestiario.length;
    if (st.id === 'pousos') return G.pousos.length;
    if (st.id === 'ouvinte') return G.ouviu.length;
    if (st.id === 'paladar') return st.list.filter((i) => G.provou.includes(i)).length;
    return st.list.filter((i) => G.items.includes(i)).length;
  }
  const setNeed = (st) => st.need || st.list.length;
  function invEntries(tab = PANEL?.tab || 0) {
    const L = [];
    if (tab === 0) {
      for (const id of G.items) { const it = ITEM(id); if (it.kind === 'util') L.push({ id, ...it, use: id === 'rede' ? 'rede' : null }); }
      for (const [id, n] of Object.entries(G.inv)) if (n > 0) { const it = ITEM(id); L.push({ id, ...it, name: `${tr(it.name)} ×${n}`, use: 'eat' }); }
      L.push({ icon: '📖', name: 'Caderno de relatórios', rarity: 'documento', desc: `${G.cards.length} de ${RAW.cards.length} relatórios.`, use: 'book' });
    } else if (tab === 1) {
      for (const id of G.items) { const it = ITEM(id); if (it.kind !== 'util') L.push({ id, ...it }); }
      for (const id of G.chapeus) { const it = ITEM(id); L.push({ id, ...it, name: G.chapeu === id ? trf('{0} (usando)', it.name) : it.name, use: 'hat' }); }
    } else {
      L.push({ icon: '✦', name: `Brilho: ${G.brilho}`, rarity: 'brilho', desc: 'Vem de olhar, aprender, ajudar e doar. Ouro não compra.' });
      if (G.titulos.length) L.push({ icon: '🏅', name: `Títulos: ${G.titulos.length}`, rarity: 'reliquia', desc: G.titulos.join(' · ') });
      L.push({ icon: '🗣️', name: `Palavras tupis ${G.tupi.length}/6`, rarity: 'achado', desc: G.tupi.map(tr).join(', ') || 'Paraguaçu ensina, em Porto Seguro.' });
      L.push({ icon: '👹', name: `Bestiário ${G.bestiario.length}/9`, rarity: 'documento', desc: G.bestiario.map((b) => tr(WD.names[b] || 'Dona Mula')).join(', ') });
      for (const st of WD.sets) if (st.id !== 'tupi' && st.id !== 'bestiario') L.push({ icon: G.sets[st.id] ? '🏆' : '▫', name: `${tr(st.name)} ${Math.min(setProg(st), setNeed(st))}/${setNeed(st)}`, rarity: G.sets[st.id] ? 'reliquia' : 'comum', desc: G.sets[st.id] ? 'Exposta no Museu Padre Toledo.' : 'Complete e leve ao Museu Padre Toledo, em Tiradentes.' });
    }
    return L;
  }
  function openInv() { PANEL = { kind: 'inv', sel: 0, rects: [], tab: 0, page: 0 }; sfx('tap'); }
  function invUse(i) {
    const P = PANEL, e = invEntries()[P.page * PER + i]; if (!e?.use) return;
    if (e.use === 'eat') { eat(e.id); PANEL = null; }
    else if (e.use === 'book') openBook(G.era);
    else if (e.use === 'hat') { G.chapeu = e.id; save(); sfx('tap'); }
    else if (e.use === 'rede') {
      if (T < REDE) { floatTxt(`A rede ainda balança: ${Math.ceil(REDE - T)} s`, '#ffb060'); return; }
      REDE = T + 300; BUFF = { id: 'rede', until: T + 150, speed: 0.25 }; PANEL = null; sfx('hop'); floatTxt('Descansou na rede: +25% por 150 s', '#ffb060');
    }
  }
  function drawInv() {
    const P = PANEL, L = invEntries(), pages = Math.max(1, Math.ceil(L.length / PER));
    P.page = Math.min(P.page, pages - 1);
    const view = L.slice(P.page * PER, P.page * PER + PER); P.sel = Math.max(0, Math.min(P.sel, view.length - 1));
    box(110, 24, W - 220, H - 48, 0.97);
    ttl(trf('INVENTÁRIO · Buck{0}', G.titulo ? `, ${tr(G.titulo)}` : ''), W / 2, 36, 13, '#ffd84a', 'center');
    P.tabs = TABS.map((t, i) => {
      const r = [140 + i * ((W - 280) / 3), 58, (W - 280) / 3 - 8, 30];
      if (i === P.tab) pill(r, '#ffd84a', t, '#2a1a08', 11); else { g.fillStyle = 'rgba(255,255,255,.1)'; rr(...r, 14); g.fill(); plain(t, r[0] + r[2] / 2, r[1] + 8, 11, '#dfe6ff', 'center'); }
      return r;
    });
    txt(`$ ${G.gold}`, 150, 100, 12, '#ffd84a'); txt(`✦ ${G.brilho}`, 300, 100, 12, '#ffb030'); if (G.dust) txt(`✨ pó ${G.dust}`, 430, 100, 10, '#fff');
    if (BUFF && T < BUFF.until) txt(`${ITEM(BUFF.id).icon || '🪢'} ${Math.ceil(BUFF.until - T)} s`, W - 150, 100, 10, '#ffb060', 'right');
    P.rects = view.map((e, i) => {
      const r = [140, 122 + i * 48, W - 280, 42], on = i === P.sel, rc = RAR(e.rarity).col;
      g.fillStyle = on ? 'rgba(255,216,74,.18)' : 'rgba(255,255,255,.06)'; rr(...r, 12); g.fill(); g.strokeStyle = on ? '#ffd84a' : rc; g.lineWidth = on ? 3 : 1.5; rr(...r, 12); g.stroke();
      g.fillStyle = rc; rr(r[0] + 6, r[1] + 6, 32, 30, 8); g.globalAlpha = 0.18; g.fill(); g.globalAlpha = 1; // fundo do ícone na cor da raridade
      icon(e.id, e.icon, r[0] + 22, r[1] + 21, 26); txt(e.name, r[0] + 50, r[1] + 7, 11, rc); const dl = wrap(e.desc || '', r[2] - 130, 8); txt((dl[0] || '') + (dl.length > 1 ? '…' : ''), r[0] + 50, r[1] + 26, 8, '#cfd6ff');
      if (e.use) txt({ eat: 'comer', hat: 'usar', rede: 'deitar', book: 'abrir' }[e.use], r[0] + r[2] - 10, r[1] + 15, 8, '#9be36a', 'right');
      return r;
    });
    P.prev = pages > 1 ? [140, H - 92, 64, 40] : null; P.next = pages > 1 ? [212, H - 92, 64, 40] : null;
    if (pages > 1) { for (const [r, a] of [[P.prev, '◀'], [P.next, '▶']]) pill(r, '#5a78e0', a, '#fff', 12); txt(`${P.page + 1}/${pages}`, 288, H - 78, 9, '#cfd6ff'); }
    txt(TOUCH ? 'toque num item para usar' : '◀ ▶ abas · ▲ ▼ escolhe · Espaço usa · Esc fecha', W / 2 - 40, H - 44, 8, '#8a9ad8', 'center');
  }
  function openBook(era) { const i = Math.max(0, ORDER.findIndex((e) => e.id === era)); PANEL = { kind: 'book', i, rects: [] }; sfx('tap'); }
  function drawBook() {
    box(30, 24, W - 60, H - 48, 0.97);
    const e = ORDER[PANEL.i], list = eraCards(e.id);
    ttl('CADERNO DO BUCK', W / 2, 40, 14, '#ffd84a', 'center');
    txt(`◀   ${YEAR[e.id]} · ${tr(e.name)}   ▶`, W / 2, 72, 11, '#fff', 'center');
    txt(`${gotIn([e.id])}/${list.length} relatórios`, W / 2, 94, 10, '#8a9ad8', 'center');
    PANEL.rects = [];
    list.forEach((c, k) => {
      const x = 62 + (k % 6) * 140, y = 116 + Math.floor(k / 6) * 112;
      const have = G.cards.includes(c.id), im = have && img('assets/img/' + c.image);
      g.fillStyle = '#0a1040'; g.fillRect(x, y, 128, 72);
      if (im) { g.imageSmoothingEnabled = true; g.drawImage(im, x, y, 128, 72); } else txt('?', x + 64, y + 26, 20, '#3a4a9a', 'center');
      g.strokeStyle = have ? '#ffd84a' : '#3a4a9a'; g.lineWidth = 2; rr(x, y, 128, 72, 10); g.stroke();
      txt(have ? c.title.slice(0, 15) : '???', x, y + 78, 8, have ? '#fff' : '#5a6aaa');
      if (have) PANEL.rects.push([x, y, 128, 90, c.id]);
    });
    PANEL.prev = [40, 56, 140, 50]; PANEL.next = [W - 180, 56, 140, 50];
    txt('◀ ▶ trocam a era', W / 2, H - 50, 9, '#8a9ad8', 'center');
  }

  // ---- Faixa e painel do Dossiê (relógio de sol com 4 Atos) ----
  function drawTimeline(curEra, tt) {
    const x0 = W / 2 - 260, y0 = H - 30, w = 520;
    box(x0 - 14, y0 - 22, w + 28, 40, 0.8);
    g.fillStyle = '#8a9ad8'; g.fillRect(x0, y0 - 1, w, 2);
    ORDER.forEach((e, i) => {
      const x = x0 + (i / (ORDER.length - 1)) * w, vis = G.eras[e.id]?.visited, cur = e.id === curEra, open = eraOpen(e.id);
      const r = cur ? 6 + Math.sin(tt * 5) * 2 : 5;
      if (!open) { g.fillStyle = '#3a3a4a'; g.fillRect(x - 5, y0 - 5, 10, 10); return; }
      g.fillStyle = vis ? e.color : '#0a1040'; g.strokeStyle = vis ? '#fff' : e.color; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y0, r, 0, 7); g.fill(); g.stroke();
      if (cur) txt(String(YEAR[e.id]), x, y0 - 19, 8, '#ffd84a', 'center');
    });
    return [x0 - 14, y0 - 22, w + 28, 40];
  }
  function openTimeline() { sfx('tap'); PANEL = { kind: 'timeline', sel: null, rects: [] }; }
  function drawTimelinePanel() {
    box(30, 24, W - 60, H - 48, 0.97);
    ttl('☀ RELÓGIO DE SOL · Dossiê', 60, 44, 13, '#ffd84a');
    txt(`★ ${G.secrets.length}/10`, W - 60, 48, 12, '#fff', 'right');
    const x0 = 80, w = W - 160, y = 170;
    const ca = curAct(), sx = x0 + ((ca + 0.5) / 4) * w;
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 10; g.beginPath(); g.moveTo(W / 2, 100); g.lineTo(sx, y - 28); g.stroke();
    g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(W / 2, 100, 10, 0, 7); g.fill();
    PANEL.rects = [];
    ORDER.forEach((e, i) => {
      const x = x0 + (i / (ORDER.length - 1)) * w, open = eraOpen(e.id), vis = G.eras[e.id]?.visited;
      txt(String(YEAR[e.id]), x, y - 22, 8, '#cfd6ff', 'center');
      if (!open) { g.fillStyle = '#4a4a5a'; g.fillRect(x - 9, y - 9, 18, 18); }
      else { g.fillStyle = vis ? e.color : '#0a1040'; g.strokeStyle = e.id === (window.MAPS[G.era]?.era) ? '#ffd84a' : vis ? '#fff' : e.color; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.stroke(); }
      if (G.eras[e.id]?.done) txt('✔', x, y + 12, 8, '#9be36a', 'center');
      PANEL.rects.push([x - 24, y - 30, 48, 60, e.id]);
    });
    ACTS.forEach((a, i) => {
      const xs = a.eras.map((id) => x0 + (ORDER.findIndex((e) => e.id === id) / (ORDER.length - 1)) * w);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, got = gotIn(a.eras), op = actOpen(i);
      txt(`ATO ${a.id}`, cx, y + 30, 10, op ? '#ffd84a' : '#7a7a8a', 'center');
      txt(op ? (got >= a.need ? '✔' : `${got}/${a.need}`) : '🔒', cx, y + 46, 9, '#fff', 'center');
      txt(a.name, cx, y + 62, 8, '#8a9ad8', 'center');
    });
    const e = PANEL.sel && ERA[PANEL.sel];
    if (e) {
      const im = img('assets/img/' + e.iconImg);
      if (im) g.drawImage(im, 70, 300, 96, 96);
      txt(`${YEAR[e.id]} · ${tr(e.name)}`, 186, 306, 13, '#ffd84a');
      wrap(`“${tr(e.intro)}”`, W - 280, 10).slice(0, 3).forEach((l, i) => txt(l, 186, 336 + i * 18, 10, '#cfe0ff'));
      txt(`relatórios ${gotIn([e.id])}/${eraCards(e.id).length}${eraOpen(e.id) ? '' : ' · portal fechado'}`, 186, 396, 10, '#fff');
      if (G.eras[e.id]?.visited && e.id !== 'prologo' && G.era === 'hoje') txt('toque de novo: viagem rápida até o buraco', 186, 418, 9, '#9be36a');
    } else txt('Toque numa era para ver o relatório.', W / 2, 330, 10, '#8a9ad8', 'center');
  }
  function drawPanel() {
    if (PANEL.kind === 'card') drawCard();
    else if (PANEL.kind === 'book') drawBook();
    else if (PANEL.kind === 'timeline') drawTimelinePanel();
    else if (PANEL.kind === 'inv') drawInv();
    const c = closeRect(); pill(c, '#ffd84a', 'FECHAR', '#2a1a08', 14);
  }
  // janelas (relatório, caderno, dossiê, inventário): só o botão FECHAR fecha; tocar fora não faz nada
  const closeRect = () => (PANEL?.kind === 'inv' ? [W - 290, H - 92, 150, 40] : [W - 210, H - 84, 150, 40]);
  function closePanel() { const P = PANEL; PANEL = null; sfx('tap'); P?.done?.(); }
  function panelTap(x, y) {
    const P = PANEL;
    if (inR(x, y, closeRect())) { closePanel(); return; }
    if (P.kind === 'card') return;
    if (P.kind === 'inv') {
      const ti = (P.tabs || []).findIndex((r) => inR(x, y, r)); if (ti >= 0) { P.tab = ti; P.sel = 0; P.page = 0; sfx('tap'); return; }
      if (inR(x, y, P.prev)) { P.page = Math.max(0, P.page - 1); sfx('tap'); return; }
      if (inR(x, y, P.next)) { P.page++; sfx('tap'); return; }
      const i = P.rects.findIndex((r) => inR(x, y, r)); if (i >= 0) { P.sel = i; invUse(i); } return;
    }
    if (P.kind === 'book') {
      if (inR(x, y, P.prev)) { P.i = (P.i + ORDER.length - 1) % ORDER.length; sfx('tap'); return; }
      if (inR(x, y, P.next)) { P.i = (P.i + 1) % ORDER.length; sfx('tap'); return; }
      const r = P.rects.find((q) => inR(x, y, q));
      if (r) { const back = { ...P }; cardScreen(r[4], () => { PANEL = back; }); }
      return;
    }
    if (P.kind === 'timeline') {
      const r = P.rects.find((q) => inR(x, y, q));
      if (!r) return;
      if (P.sel === r[4] && G.eras[r[4]]?.visited && r[4] !== 'prologo' && G.era === 'hoje' && scene.travel) { PANEL = null; scene.travel(r[4]); return; }
      P.sel = r[4]; sfx('tap');
    }
  }

  // ================= coletar relatório =================
  let FLAMEPULSE = 0;
  // economia: cada relatório novo, aberto e lido, paga OURO_RELATORIO; a bota (PRECO_BOTAS) sai por volta do 3º/4º portal
  const OURO_RELATORIO = 20, PRECO_BOTAS = 400;
  function giveCard(id, done) {
    if (!CARD[id] || G.cards.includes(id)) { done?.(); return; }
    const before = ACTS.map((_, i) => actOpen(i));
    G.cards.push(id); save();
    sfx('coin'); setTimeout(() => sfx('sinoP'), 200);
    FLAMEPULSE = 2;
    if (CARD[id].tone !== 'serio') confetti(W / 2, H / 3, 50);
    cardScreen(id, () => {
      giveGold(OURO_RELATORIO); floatTxt(`relatório lido +$${OURO_RELATORIO}`, '#ffd84a'); giveBrilho(1); // paga ao fechar: aberto e lido; ler dá brilho
      const opened = ACTS.findIndex((_, i) => !before[i] && actOpen(i));
      if (opened > 0) { sfx('win'); banner(`ATO ${ACTS[opened].id} · ${ACTS[opened].name}`); say([['mula', `Relatórios suficientes. Abriu o Ato ${ACTS[opened].id}: ${ACTS[opened].name}. As lajes daqueles buracos caíram.`], ...(opened === 2 ? [['mula', 'E agora o Cobrador também anda pela Estrada Real de hoje. Pois é.']] : []), ...(opened === 3 ? [['lum', 'Acelere.']] : [])], done); }
      else done?.();
    });
  }
  const giveGold = (n) => { G.gold = Math.max(0, G.gold + n); save(); if (n > 0) { sfx('coin'); fly('ouro', n); } };
  // ================= mundo aberto: brilho, itens, comidas, títulos =================
  // Duas moedas: ouro compra coisas; brilho (✦) vem de olhar, aprender, ajudar e doar, e ouro nenhum compra.
  const BRILHO_FINAL = 150; // brilho para o final verdadeiro
  function giveBrilho(n, why) { if (!n) return; if (WD.event(new Date())?.brilho2) n *= 2; G.brilho = (G.brilho || 0) + n; save(); FLAMEPULSE = 1.2; fly('brilho', n * 5); floatTxt(`✦ +${n}${why ? ` ${tr(why)}` : ''}`, '#ffb030'); }
  const RAWRAR = { santo: 'reliquia', turmalina: 'reliquia', 'livro-antonil': 'documento', 'carta-tj': 'documento' };
  const ITEM = (id) => WD.items[id] || (() => { const r = RAW.items.find((x) => x.id === id); return r ? { name: r.name, icon: r.icon, kind: 'colecao', rarity: RAWRAR[id] || 'documento', desc: r.desc } : { name: id, icon: '•', kind: 'colecao', rarity: 'comum', desc: '' }; })();
  const priceOf = (id) => (id === 'botas' ? PRECO_BOTAS : ITEM(id).price || 0);
  const has = (id) => G.items.includes(id) || G.chapeus.includes(id) || (G.inv[id] || 0) > 0;
  function addItem(id, n = 1) {
    const it = ITEM(id);
    if (it.kind === 'comida') G.inv[id] = (G.inv[id] || 0) + n;
    else if (it.kind === 'chapeu') { if (!G.chapeus.includes(id)) G.chapeus.push(id); }
    else if (!G.items.includes(id)) G.items.push(id);
    save();
  }
  const giveItem = (id) => addItem(id);
  const buffOn = (k) => BUFF && T < BUFF.until && BUFF[k];
  function eat(id) {
    const it = ITEM(id); if (!(G.inv[id] > 0) || !it.buff) return;
    G.inv[id]--; if (!G.provou.includes(id)) G.provou.push(id);
    BUFF = { id, until: T + it.buff.secs, ...it.buff }; save(); sfx('coin');
    floatTxt(`${it.icon} ${tr(it.desc).split('.')[0]}`, '#ffb060');
  }
  function addTitle(t) { if (G.titulos.includes(t)) return; G.titulos.push(t); G.titulo = t; save(); banner(`Título: Buck, ${t}`); }
  function secret(id, lines, done) {
    if (G.secrets.includes(id)) { if (lines) say(lines, done); else done?.(); return; }
    const after = () => { G.secrets.push(id); save(); sfx('win'); firework(W / 2, 160); floatTxt(`★ ${G.secrets.length}/10 segredo`, '#ffd84a'); done?.(); };
    if (lines) say(lines, after); else after();
  }

  // ================= mapa: rascunho em pixel art, grade, A* =================
  const MAPCACHE = {};
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  function nearPoly(pts, x, y) {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    return best;
  }
  // Pinta o rascunho do cenário (metade da resolução: cada texel vira 4 px na tela) e a máscara de caminhada.
  // Branco na máscara = bloqueado. Água, rio, serra, mata, muros e prédios bloqueiam; estrada desbloqueia.
  function paintDraft(M, S = 0.5) { // S: escala do rascunho (0,5 no jogo; maior para exportar o guia de pintura)
    const w = Math.ceil(M.w * S), h = Math.ceil(M.h * S), D = M.draft, rnd = rng(D.seed || hash(M.id)), grain = rng((D.seed || hash(M.id)) ^ 0x5bd1e995); // grain: só o ruído de textura, para casas e árvores ficarem no mesmo lugar em qualquer escala
    const art = document.createElement('canvas'); art.width = w; art.height = h;
    const mk = document.createElement('canvas'); mk.width = w; mk.height = h;
    const a = art.getContext('2d'), m = mk.getContext('2d', { willReadFrequently: true });
    const P = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S))); c.closePath(); };
    const L = (c, pts, lw, col, dash) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S))); c.lineWidth = lw * S; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
    const ground = D.ground || '#7aa24c', sea = D.sea || '#2a6fb0';
    if (D.land) {
      a.fillStyle = sea; a.fillRect(0, 0, w, h);
      for (let i = 0; i < w * h / 380; i++) { a.fillStyle = grain() < 0.5 ? '#3a82c4' : '#245f9a'; a.fillRect((grain() * w) | 0, (grain() * h) | 0, 3, 1); }
      a.fillStyle = D.beach || '#e8d8a0'; P(a, D.land); a.fill();
      a.save(); P(a, D.land); a.clip(); a.fillStyle = ground; a.fillRect(0, 0, w, h);
      for (const [x, y, r, c] of D.biomes || []) { a.fillStyle = c; a.globalAlpha = 0.55; a.beginPath(); a.arc(x * S, y * S, r * S, 0, 7); a.fill(); }
      a.globalAlpha = 1; a.restore();
      P(a, D.land); a.lineWidth = (D.beachW || 10) * S; a.strokeStyle = D.beach || '#e8d8a0'; a.stroke();
      m.fillStyle = '#fff'; m.fillRect(0, 0, w, h); P(m, D.land); m.fillStyle = '#000'; m.fill(); m.lineWidth = 12 * S; m.strokeStyle = '#fff'; P(m, D.land); m.stroke();
    } else {
      a.fillStyle = ground; a.fillRect(0, 0, w, h);
      for (const [x, y, r, c] of D.biomes || []) { a.fillStyle = c; a.globalAlpha = 0.55; a.beginPath(); a.arc(x * S, y * S, r * S, 0, 7); a.fill(); }
      a.globalAlpha = 1;
      m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
      m.strokeStyle = '#fff'; m.lineWidth = 6; m.strokeRect(0, 0, w, h);
    }
    for (const wp of D.water || []) { a.fillStyle = wp.col || sea; P(a, wp.pts); a.fill(); for (let i = 0; i < 60; i++) { /* reflexos */ } m.fillStyle = '#fff'; P(m, wp.pts); m.fill(); if (wp.shore !== false) { a.strokeStyle = D.beach || '#e8d8a0'; a.lineWidth = 6 * S; P(a, wp.pts); a.stroke(); } }
    const id = a.getImageData(0, 0, w, h), px = id.data;
    for (let i = 0; i < px.length; i += 4) if (grain() < 0.08) { const k = grain() < 0.5 ? 0.86 : 1.1; px[i] *= k; px[i + 1] *= k; px[i + 2] *= k; }
    a.putImageData(id, 0, 0);
    for (const [x, y, ww, hh, c] of D.fields || []) { for (let k = 0; k < hh; k += 10) { a.fillStyle = c || '#9ac040'; a.fillRect(x * S, (y + k) * S, ww * S, 4 * S); } }
    for (const [x, y, ww, hh, c] of D.plazas || []) { a.fillStyle = c || '#c8b890'; a.fillRect(x * S, y * S, ww * S, hh * S); }
    for (const r of D.rivers || []) { L(a, r.pts, r.w, r.col || '#2f78c0'); L(a, r.pts, r.w * 0.45, '#4a94d8'); L(m, r.pts, r.w, '#fff'); }
    for (const [x, y, r] of D.mountains || []) {
      m.fillStyle = '#fff'; m.beginPath(); m.arc(x * S, y * S, r * S * 0.85, 0, 7); m.fill();
      for (let k = 0; k < 6; k++) {
        const qx = (x + (rnd() - 0.5) * r * 1.2) * S, qy = (y + (rnd() - 0.5) * r) * S, s = (r * 0.5 + rnd() * r * 0.4) * S;
        a.fillStyle = D.rock || '#7a7268'; a.beginPath(); a.moveTo(qx - s, qy + s * 0.7); a.lineTo(qx, qy - s); a.lineTo(qx + s, qy + s * 0.7); a.fill();
        a.fillStyle = '#5a544c'; a.beginPath(); a.moveTo(qx, qy - s); a.lineTo(qx + s, qy + s * 0.7); a.lineTo(qx + s * 0.2, qy + s * 0.7); a.fill();
        if (!D.noSnow) { a.fillStyle = '#f0f0f0'; a.beginPath(); a.moveTo(qx - s * 0.25, qy - s * 0.5); a.lineTo(qx, qy - s); a.lineTo(qx + s * 0.25, qy - s * 0.5); a.fill(); }
      }
    }
    for (const [x, y, r, col] of D.forests || []) {
      m.fillStyle = '#fff'; m.beginPath(); m.arc(x * S, y * S, r * S * 0.85, 0, 7); m.fill();
      const n = Math.max(4, (r * r) / 120);
      for (let k = 0; k < n; k++) {
        const an = rnd() * 7, d = Math.sqrt(rnd()) * r, tx = (x + Math.cos(an) * d) * S, ty = (y + Math.sin(an) * d) * S, s = (5 + rnd() * 5);
        a.fillStyle = '#2a2a14'; a.fillRect(tx - 1, ty + s * 0.4, 2, 3);
        a.fillStyle = col || '#2f6a2a'; a.beginPath(); a.arc(tx, ty, s, 0, 7); a.fill();
        a.fillStyle = 'rgba(255,255,255,.18)'; a.beginPath(); a.arc(tx - s * 0.3, ty - s * 0.3, s * 0.45, 0, 7); a.fill();
      }
    }
    for (const wl of D.walls || []) {
      const col = wl.kind === 'palisade' ? '#7a5532' : '#9a948a';
      L(a, wl.pts, wl.w || 10, '#3a2a1a'); L(a, wl.pts, (wl.w || 10) - 3, col); L(m, wl.pts, wl.w || 10, '#fff');
      if (wl.kind === 'palisade') for (let i = 1; i < wl.pts.length; i++) { const [x0, y0] = wl.pts[i - 1], [x1, y1] = wl.pts[i], n = Math.hypot(x1 - x0, y1 - y0) / 6; for (let k = 0; k < n; k++) { a.fillStyle = '#5a3a1a'; a.fillRect((x0 + (x1 - x0) * k / n) * S - 1, (y0 + (y1 - y0) * k / n) * S - 4, 2, 6); } }
    }
    for (const r of D.roads || []) {
      const col = r.stone ? '#a8a49a' : r.dotted ? '#e2c88e' : r.col || '#d9bf8a';
      L(a, r.pts, r.w + 4, r.stone ? '#6a665e' : '#a8875a'); L(a, r.pts, r.w, col);
      if (r.dotted) L(a, r.pts, r.w * 0.25, '#9a7a4a', [6, 8]);
      if (r.stone) L(a, r.pts, r.w * 0.8, 'rgba(90,86,78,.5)', [2, 3]);
      L(m, r.pts, r.w, '#000');
      for (let i = 1; i < r.pts.length; i++) {
        const [x0, y0] = r.pts[i - 1], [x1, y1] = r.pts[i], n = Math.hypot(x1 - x0, y1 - y0) / 4;
        for (let k = 0; k <= n; k++) {
          const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
          if ((D.rivers || []).some((rv) => nearPoly(rv.pts, x, y) < rv.w / 2)) { a.fillStyle = '#7a5532'; a.fillRect((x - r.w / 2) * S, (y - 2) * S, r.w * S, 4 * S); a.fillStyle = '#5a3a1a'; a.fillRect((x - r.w / 2) * S, (y - 2) * S, r.w * S, 1); }
        }
      }
    }
    const onRoad = (x, y, pad) => (D.roads || []).some((r) => nearPoly(r.pts, x, y) < r.w / 2 + pad);
    for (const [tx, ty, n] of D.towns || []) {
      for (let k = 0; k < n; k++) {
        const hx = tx + (rnd() - 0.5) * 22 * Math.sqrt(n), hy = ty + (rnd() - 0.5) * 18 * Math.sqrt(n);
        if (m.getImageData(hx * S, hy * S, 1, 1).data[0] < 128 && !onRoad(hx, hy, 8)) bld(a, m, 'house', hx - 8, hy - 6, 16, 12, rnd, S);
      }
      if (!onRoad(tx + 20, ty - 24, 10)) bld(a, m, 'church', tx + 8, ty - 40, 24, 30, rnd, S);
    }
    for (const b of D.buildings || []) bld(a, m, b[0], b[1], b[2], b[3], b[4], rnd, S);
    for (const [x, y, dir] of D.ships || []) ship(a, x * S, y * S, dir || 1);
    return { art, mask: m.getImageData(0, 0, w, h), S };
  }
  function ship(a, x, y, d) {
    a.fillStyle = '#5a3a1a'; a.beginPath(); a.moveTo(x - 14 * d, y); a.lineTo(x + 14 * d, y); a.lineTo(x + 10 * d, y + 6); a.lineTo(x - 11 * d, y + 6); a.fill();
    a.fillStyle = '#3a2a1a'; a.fillRect(x - 1, y - 20, 2, 20); a.fillRect(x + 7 * d, y - 14, 1.5, 14);
    a.fillStyle = '#f2ece0'; a.fillRect(x - 8, y - 18, 16, 10); a.fillRect(Math.min(x + 4 * d, x + 11 * d), y - 13, 7, 8);
    a.fillStyle = '#c0392b'; a.fillRect(x - 3, y - 15, 6, 1.5); a.fillRect(x - 0.75, y - 17, 1.5, 6);
  }
  // Prédios em pixel art (coordenadas em px do mundo); bloqueiam a caminhada.
  function bld(a, m, kind, x, y, w, h, rnd, S = 0.5) {
    const X = x * S, Y = y * S, Wd = w * S, Hd = h * S, R = (dx, dy, ww, hh, c) => { a.fillStyle = c; a.fillRect(X + dx * Wd, Y + dy * Hd, ww * Wd, hh * Hd); };
    const block = (k = 1) => { m.fillStyle = '#fff'; m.fillRect(X + Wd * (1 - k) / 2, Y + Hd * (1 - k) / 2, Wd * k, Hd * k); };
    const roof = (c, from = 0) => { a.fillStyle = c; a.beginPath(); a.moveTo(X - 1, Y + Hd * (from + 0.4)); a.lineTo(X + Wd / 2, Y + Hd * from); a.lineTo(X + Wd + 1, Y + Hd * (from + 0.4)); a.fill(); };
    switch (kind) {
      case 'house': R(0, 0.35, 1, 0.65, '#f2ece0'); roof('#b8452e'); R(0.42, 0.62, 0.16, 0.38, '#5a3a2a'); R(0.12, 0.5, 0.15, 0.15, '#3a6ad0'); R(0.73, 0.5, 0.15, 0.15, '#3a6ad0'); block(0.9); break;
      case 'sobrado': R(0, 0.25, 1, 0.75, '#f6efe0'); roof('#a83a26'); R(0, 0.5, 1, 0.06, '#5a3a2a'); for (let k = 0; k < 3; k++) { R(0.1 + k * 0.3, 0.32, 0.16, 0.14, '#2a5aa0'); R(0.1 + k * 0.3, 0.62, 0.16, 0.2, '#2a5aa0'); } block(0.92); break;
      case 'church': case 'chapel': {
        R(0.15, 0.35, 0.7, 0.65, '#fafafa'); roof('#d8d0c0', 0.2);
        if (kind === 'church') { R(0, 0.1, 0.2, 0.9, '#f4f4f4'); R(0.8, 0.1, 0.2, 0.9, '#f4f4f4'); R(0, 0.04, 0.2, 0.08, '#d9a03a'); R(0.8, 0.04, 0.2, 0.08, '#d9a03a'); }
        else { R(0.4, 0, 0.2, 0.4, '#f4f4f4'); R(0.44, -0.08, 0.12, 0.1, '#d9a03a'); }
        R(0.42, 0.7, 0.16, 0.3, '#3a6ad0'); R(0.45, 0.45, 0.1, 0.12, '#d9a03a'); block(0.9); break;
      }
      case 'casagrande': R(0, 0.3, 1, 0.7, '#f6f0e4'); roof('#a8452e'); for (let k = 0; k < 6; k++) R(0.05 + k * 0.17, 0.6, 0.04, 0.4, '#e0d8c8'); R(0, 0.58, 1, 0.04, '#8a6a4a'); block(0.92); break;
      case 'senzala': R(0, 0.4, 1, 0.6, '#8a6a4a'); roof('#6a5a3a', 0.15); for (let k = 0; k < 8; k++) R(0.05 + k * 0.12, 0.7, 0.05, 0.3, '#3a2a1a'); block(0.92); break;
      case 'mill': { R(0, 0.3, 0.7, 0.7, '#d8c8a8'); roof('#7a5a3a'); a.fillStyle = '#5a3a1a'; a.beginPath(); a.arc(X + Wd * 0.85, Y + Hd * 0.65, Hd * 0.32, 0, 7); a.fill(); a.strokeStyle = '#8a6a3a'; a.lineWidth = 1; for (let k = 0; k < 4; k++) { const an = k * 0.8; a.beginPath(); a.moveTo(X + Wd * 0.85, Y + Hd * 0.65); a.lineTo(X + Wd * 0.85 + Math.cos(an) * Hd * 0.3, Y + Hd * 0.65 + Math.sin(an) * Hd * 0.3); a.stroke(); } block(0.92); break; }
      case 'smelter': R(0, 0.35, 1, 0.65, '#8a847a'); roof('#5a544c'); R(0.7, 0, 0.14, 0.4, '#6a645c'); R(0.4, 0.65, 0.2, 0.35, '#e07a20'); a.fillStyle = 'rgba(200,200,200,.6)'; for (let k = 0; k < 3; k++) { a.beginPath(); a.arc(X + Wd * (0.77 + k * 0.06), Y - k * 4, 2 + k, 0, 7); a.fill(); } block(0.92); break;
      case 'fort': { a.fillStyle = '#8a8478'; a.beginPath(); for (let k = 0; k < 10; k++) { const an = k * Math.PI / 5, r = k % 2 ? 0.32 : 0.5; a.lineTo(X + Wd / 2 + Math.cos(an) * Wd * r, Y + Hd / 2 + Math.sin(an) * Hd * r); } a.closePath(); a.fill(); a.fillStyle = '#6a8a4a'; a.beginPath(); a.arc(X + Wd / 2, Y + Hd / 2, Wd * 0.2, 0, 7); a.fill(); a.fillStyle = '#e07a20'; a.fillRect(X + Wd / 2, Y + Hd * 0.1, 6, 4); a.fillStyle = '#fff'; a.fillRect(X + Wd / 2, Y + Hd * 0.1 + 1.3, 6, 1.3); a.fillStyle = '#2a4aa0'; a.fillRect(X + Wd / 2, Y + Hd * 0.1 + 2.6, 6, 1.4); block(0.85); break; }
      case 'warehouse': R(0, 0.3, 1, 0.7, '#8a5a3a'); roof('#5a3a2a'); R(0.35, 0.6, 0.3, 0.4, '#3a2a1a'); block(0.92); break;
      case 'oca': { a.fillStyle = '#c8a050'; a.beginPath(); a.ellipse(X + Wd / 2, Y + Hd * 0.6, Wd / 2, Hd * 0.45, 0, Math.PI, 0); a.fill(); a.fillRect(X, Y + Hd * 0.6, Wd, Hd * 0.4); a.strokeStyle = '#8a6a2a'; a.lineWidth = 1; for (let k = 1; k < 5; k++) { a.beginPath(); a.moveTo(X + Wd * k / 5, Y + Hd * 0.2); a.lineTo(X + Wd * k / 5, Y + Hd); a.stroke(); } R(0.44, 0.7, 0.12, 0.3, '#3a2a1a'); block(0.9); break; }
      case 'hut': R(0.1, 0.45, 0.8, 0.55, '#a07a4a'); roof('#c8a050', 0.05); R(0.42, 0.7, 0.16, 0.3, '#3a2a1a'); block(0.9); break;
      case 'palace': R(0, 0.2, 1, 0.8, '#d8ccb0'); roof('#8a5a3a'); for (let k = 0; k < 5; k++) R(0.06 + k * 0.19, 0.45, 0.1, 0.2, '#3a5a90'); R(0.42, 0.7, 0.16, 0.3, '#5a3a2a'); R(0.1, 0, 0.04, 0.2, '#3a2a1a'); R(0.14, 0, 0.12, 0.08, '#c0392b'); R(0.82, 0, 0.04, 0.2, '#3a2a1a'); R(0.86, 0, 0.12, 0.08, '#e8c04a'); block(0.92); break;
      case 'stall': R(0, 0.4, 1, 0.6, '#c8a878'); for (let k = 0; k < 4; k++) R(k * 0.25, 0.2, 0.25, 0.22, k % 2 ? '#fff' : (rnd() < 0.5 ? '#c0392b' : '#2d6cdf')); block(0.85); break;
      case 'tower': R(0.2, 0, 0.6, 1, '#8a847a'); R(0.2, 0, 0.6, 0.1, '#5a544c'); R(0.4, 0.3, 0.2, 0.15, '#2a2a2a'); block(0.9); break;
      case 'gallows': R(0.1, 0, 0.12, 1, '#5a3a1a'); R(0.1, 0, 0.8, 0.12, '#5a3a1a'); R(0.7, 0.1, 0.03, 0.3, '#c8b890'); R(0, 0.85, 1, 0.15, '#7a5532'); block(0.5); break;
      case 'statue': R(0.25, 0.6, 0.5, 0.4, '#9a948a'); R(0.38, 0.1, 0.24, 0.5, '#b8b2a8'); R(0.4, 0, 0.2, 0.15, '#b8b2a8'); block(0.8); break;
      case 'pedestal': R(0.15, 0.4, 0.7, 0.6, '#a8a29a'); R(0.1, 0.35, 0.8, 0.1, '#c8c2ba'); block(0.8); break;
      case 'cross': R(0.42, 0, 0.16, 1, '#6a4a2a'); R(0.15, 0.22, 0.7, 0.14, '#6a4a2a'); R(0.25, 0.85, 0.5, 0.15, '#8a847a'); block(0.5); break;
      case 'mine': { a.fillStyle = '#7a5a3a'; a.beginPath(); a.ellipse(X + Wd / 2, Y + Hd * 0.7, Wd / 2, Hd * 0.7, 0, Math.PI, 0); a.fill(); R(0.3, 0.45, 0.4, 0.55, '#120a04'); R(0.25, 0.4, 0.06, 0.6, '#5a3a1a'); R(0.69, 0.4, 0.06, 0.6, '#5a3a1a'); R(0.25, 0.38, 0.5, 0.06, '#5a3a1a'); block(0.85); break; }
      case 'registro': R(0, 0.3, 0.45, 0.7, '#a07a4a'); roof('#6a4a2a'); R(0.45, 0.6, 0.55, 0.06, '#c0392b'); R(0.45, 0.6, 0.08, 0.4, '#5a3a1a'); block(0.6); break;
      case 'fountain': R(0.1, 0.4, 0.8, 0.6, '#a8a29a'); R(0.18, 0.48, 0.64, 0.4, '#4a94d8'); R(0.42, 0, 0.16, 0.5, '#b8b2a8'); block(0.85); break;
      case 'table': R(0, 0.3, 1, 0.5, '#7a5532'); R(0.1, 0.35, 0.8, 0.35, '#e8dcb0'); R(0.45, 0.1, 0.06, 0.25, '#f0e0a0'); block(0.9); break;
      case 'pyre': R(0.2, 0.6, 0.6, 0.4, '#5a3a1a'); R(0.3, 0.45, 0.4, 0.2, '#3a2a1a'); block(0.6); break;
      case 'car': R(0, 0.3, 1, 0.5, '#4a6a3a'); R(0.15, 0.1, 0.6, 0.3, '#3a5a2a'); R(0.1, 0.75, 0.2, 0.25, '#111'); R(0.7, 0.75, 0.2, 0.25, '#111'); block(0.85); break;
      case 'scaffold': { a.strokeStyle = '#8a6a3a'; a.lineWidth = 1; for (let k = 0; k <= 4; k++) { a.beginPath(); a.moveTo(X + Wd * k / 4, Y); a.lineTo(X + Wd * k / 4, Y + Hd); a.stroke(); a.beginPath(); a.moveTo(X, Y + Hd * k / 4); a.lineTo(X + Wd, Y + Hd * k / 4); a.stroke(); } block(0.8); break; }
      case 'well': { a.fillStyle = '#8a847a'; a.beginPath(); a.arc(X + Wd / 2, Y + Hd / 2, Wd / 2, 0, 7); a.fill(); a.fillStyle = '#1a2a4a'; a.beginPath(); a.arc(X + Wd / 2, Y + Hd / 2, Wd / 3, 0, 7); a.fill(); block(0.8); break; }
      case 'station': R(0, 0.3, 1, 0.7, '#c8b090'); roof('#6a3a2a'); R(0.1, 0.55, 0.8, 0.08, '#3a2a1a'); block(0.92); break;
      case 'rail': R(0, 0.35, 1, 0.08, '#6a6a6a'); R(0, 0.6, 1, 0.08, '#6a6a6a'); for (let k = 0; k < 12; k++) R(k / 12, 0.25, 0.03, 0.55, '#5a3a1a'); break;
      default: R(0, 0, 1, 1, kind && kind[0] === '#' ? kind : '#888'); block(0.9);
    }
  }

  function loadMap(id) {
    if (MAPCACHE[id]) return MAPCACHE[id];
    const M = window.MAPS[id];
    const gw = Math.ceil(M.w / M.cell), gh = Math.ceil(M.h / M.cell);
    let { art, mask, S } = paintDraft(M);
    // colisão pintada (branco = bloqueado), feita junto com o mapa pintado; sem ela, vale a do rascunho
    const CI = ART(M.maskImage);
    if (CI) { const c = document.createElement('canvas'); c.width = CI.width; c.height = CI.height; const cc = c.getContext('2d', { willReadFrequently: true }); cc.drawImage(CI, 0, 0); mask = cc.getImageData(0, 0, c.width, c.height); S = c.width / M.w; }
    const grid = new Uint8Array(gw * gh);
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
      const px = Math.min(mask.width - 1, Math.floor((cx + 0.5) * M.cell * S)), py = Math.min(mask.height - 1, Math.floor((cy + 0.5) * M.cell * S));
      grid[cy * gw + cx] = mask.data[(py * mask.width + px) * 4] > 128 ? 1 : 0;
    }
    const K = { M, art, S, gw, gh, grid, id };
    const st = nearestFree(K, ...M.pois[M.start]);
    const seen = new Uint8Array(gw * gh), q = [st[0] + st[1] * gw];
    seen[q[0]] = 1;
    while (q.length) { const c = q.pop(), x = c % gw, y = (c / gw) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = ny * gw + nx; if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && !seen[n] && !grid[n]) { seen[n] = 1; q.push(n); } } }
    for (let i = 0; i < grid.length; i++) if (!seen[i]) grid[i] = 1;
    K.pois = {};
    for (const [k, [x, y]] of Object.entries(M.pois)) { const [cx, cy] = nearestFree(K, x, y); K.pois[k] = [(cx + 0.5) * M.cell, (cy + 0.5) * M.cell]; }
    if (M.holes) for (const k of Object.keys(M.holes)) { const [cx, cy] = nearestFree(K, ...M.holes[k]); M.holes[k] = [(cx + 0.5) * M.cell, (cy + 0.5) * M.cell]; }
    // relatórios no chão: posição fixa do mapa ou espalhada (semente pelo id) em chão livre e alcançável
    K.cardPos = {};
    const ground = M.noCards ? [] : eraCards(M.era).filter((c) => !REWARD.has(c.id)).map((c) => c.id);
    const taken = [...Object.values(K.pois), ...Object.values(M.holes || {})];
    for (const cid of ground) {
      if (M.cards?.[cid]) { const [cx, cy] = nearestFree(K, ...M.cards[cid]); K.cardPos[cid] = [(cx + 0.5) * M.cell, (cy + 0.5) * M.cell]; continue; }
      const r = rng(hash(cid + M.id));
      for (let tries = 0; tries < 600; tries++) {
        const cx = (r() * gw) | 0, cy = (r() * gh) | 0;
        if (grid[cy * gw + cx]) continue;
        const p = [(cx + 0.5) * M.cell, (cy + 0.5) * M.cell];
        if (taken.some((t) => Math.hypot(t[0] - p[0], t[1] - p[1]) < (tries < 400 ? 70 : 30))) continue;
        K.cardPos[cid] = p; taken.push(p); break;
      }
    }
    const mw = 160, mh = Math.round(160 * M.h / M.w);
    K.mini = document.createElement('canvas'); K.mini.width = mw; K.mini.height = mh;
    K.mini.getContext('2d').drawImage(art, 0, 0, mw, mh);
    K.fog = document.createElement('canvas'); K.fog.width = mw; K.fog.height = mh;
    const fc = K.fog.getContext('2d'); fc.fillStyle = '#0a0a14'; fc.fillRect(0, 0, mw, mh);
    for (const [x, y] of G.fog[id] || []) clearFog(K, x, y);
    if (M.maskImage && ASSET.has(M.maskImage) && !ART(M.maskImage)) return K; // colisão pintada ainda carregando: não guarda, refaz na próxima vez
    return (MAPCACHE[id] = K);
  }
  function clearFog(K, x, y) {
    const c = K.fog.getContext('2d'), s = K.mini.width / K.M.w;
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(x * s, y * s, (G.items.includes('lampiao') ? 15 : 9) * (K.M.w < 1500 ? 1.7 : 1), 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
  }
  const blockedAt = (K, x, y) => { const cx = Math.floor(x / K.M.cell), cy = Math.floor(y / K.M.cell); return cx < 0 || cy < 0 || cx >= K.gw || cy >= K.gh || K.grid[cy * K.gw + cx] === 1; };
  function nearestFree(K, x, y) {
    let cx = Math.max(0, Math.min(K.gw - 1, Math.floor(x / K.M.cell))), cy = Math.max(0, Math.min(K.gh - 1, Math.floor(y / K.M.cell)));
    if (!K.grid[cy * K.gw + cx]) return [cx, cy];
    for (let r = 1; r < 80; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && ny >= 0 && nx < K.gw && ny < K.gh && !K.grid[ny * K.gw + nx]) return [nx, ny];
    }
    return [cx, cy];
  }
  function astar(K, sx, sy, tx, ty) {
    const { gw, gh, grid } = K, N = gw * gh;
    const s = sy * gw + sx, goal = ty * gw + tx;
    const gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = [], push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top[1]; };
    const h = (n) => { const dx = Math.abs(n % gw - tx), dy = Math.abs(((n / gw) | 0) - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    gs[s] = 0; push(s, h(s));
    while (heap.length) {
      const c = pop();
      if (c === goal) break;
      if (closed[c]) continue;
      closed[c] = 1;
      const x = c % gw, y = (c / gw) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const n = ny * gw + nx;
        if (grid[n] || closed[n]) continue;
        if (dx && dy && (grid[y * gw + nx] || grid[ny * gw + x])) continue;
        const ng = gs[c] + (dx && dy ? 1.414 : 1);
        if (ng < gs[n]) { gs[n] = ng; from[n] = c; push(n, ng + h(n)); }
      }
    }
    if (from[goal] < 0 && goal !== s) return null;
    const cells = [];
    for (let n = goal; n !== s && n >= 0; n = from[n]) cells.unshift(n);
    return smooth(K, [s, ...cells]).slice(1).map((n) => [(n % gw + 0.5) * K.M.cell, (((n / gw) | 0) + 0.5) * K.M.cell]);
  }
  function los(K, a, b) {
    let x0 = a % K.gw, y0 = (a / K.gw) | 0;
    const x1 = b % K.gw, y1 = (b / K.gw) | 0, dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx - dy;
    for (;;) {
      if (K.grid[y0 * K.gw + x0]) return false;
      if (x0 === x1 && y0 === y1) return true;
      const e2 = 2 * e;
      if (e2 > -dy) { e -= dy; x0 += sx; }
      if (e2 < dx) { e += dx; y0 += sy; }
      if (K.grid[y0 * K.gw + x0 - sx] && K.grid[(y0 - sy) * K.gw + x0]) return false;
    }
  }
  function smooth(K, p) {
    if (p.length < 3) return p;
    const out = [p[0]];
    let i = 0;
    while (i < p.length - 1) { let j = p.length - 1; while (j > i + 1 && !los(K, p[i], p[j])) j--; out.push(p[j]); i = j; }
    return out;
  }

  // ================= cenas =================
  let scene = null;
  function setScene(s) { scene = s; s.enter?.(); }

  // Primeira tela (provisória): escolher a língua pelas bandeiras. Brasil, Estados Unidos e Espanha, desenhadas aqui.
  function flag(id, x, y, w, h) {
    g.save(); rr(x, y, w, h, 10); g.clip();
    if (id === 'pt') {
      g.fillStyle = '#1a9a48'; g.fillRect(x, y, w, h);
      g.fillStyle = '#ffd400'; g.beginPath(); g.moveTo(x + w / 2, y + h * 0.1); g.lineTo(x + w * 0.92, y + h / 2); g.lineTo(x + w / 2, y + h * 0.9); g.lineTo(x + w * 0.08, y + h / 2); g.closePath(); g.fill();
      const r = h * 0.26; g.fillStyle = '#1d2f8c'; g.beginPath(); g.arc(x + w / 2, y + h / 2, r, 0, 7); g.fill();
      g.save(); g.beginPath(); g.arc(x + w / 2, y + h / 2, r, 0, 7); g.clip(); g.strokeStyle = '#fff'; g.lineWidth = h * 0.045; g.beginPath(); g.arc(x + w / 2 - r * 0.2, y + h / 2 + r * 1.9, r * 2.1, -Math.PI * 0.68, -Math.PI * 0.3); g.stroke(); g.restore();
      g.fillStyle = '#fff'; for (const [a, b] of [[-0.35, 0.35], [0.1, 0.5], [0.4, 0.25], [-0.1, 0.62], [0.25, 0.7]]) { g.beginPath(); g.arc(x + w / 2 + a * r, y + h / 2 + b * r, 1.6, 0, 7); g.fill(); }
    } else if (id === 'en') {
      for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#fff' : '#c8102e'; g.fillRect(x, y + (h * i) / 13, w, h / 13 + 1); }
      const cw = w * 0.42, ch = (h * 7) / 13; g.fillStyle = '#0a3161'; g.fillRect(x, y, cw, ch);
      g.fillStyle = '#fff'; for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) { g.beginPath(); g.arc(x + cw * ((c + (r % 2 ? 1 : 0.5)) / 6), y + ch * ((r + 0.7) / 9.4), Math.max(1.2, h * 0.012), 0, 7); g.fill(); }
    } else {
      g.fillStyle = '#c60b1e'; g.fillRect(x, y, w, h); g.fillStyle = '#ffc400'; g.fillRect(x, y + h / 4, w, h / 2);
    }
    g.restore(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; rr(x, y, w, h, 10); g.stroke();
  }
  const Lang = () => ({
    isTitle: true,
    t: 0, sel: Math.max(0, I18.LANGS.findIndex((l) => l.id === I18.lang)), rects: [],
    update(dt) { this.t += dt; },
    draw() {
      bg('assets/img/scenes/mirante.webp', 3, 0.15, '#1a1030');
      g.fillStyle = 'rgba(10,16,70,.6)'; g.fillRect(0, 0, W, H);
      ttl('Relógio de Sol', W / 2, 46, 34, '#ffd84a', 'center');
      I18.keep('Escolha a língua · Choose your language · Elige tu idioma');
      txt('Escolha a língua · Choose your language · Elige tu idioma', W / 2, 112, 11, '#fff', 'center');
      const fw = 220, fh = 146, gap = 40, x0 = W / 2 - (fw * 3 + gap * 2) / 2, y = 180;
      this.rects = I18.LANGS.map((l, i) => {
        const x = x0 + i * (fw + gap), on = i === this.sel, lift = on ? 4 * Math.sin(this.t * 4) : 0;
        if (on) { g.fillStyle = 'rgba(255,216,74,.25)'; rr(x - 12, y - 12 + lift, fw + 24, fh + 84, 20); g.fill(); g.strokeStyle = '#ffd84a'; g.lineWidth = 3; rr(x - 12, y - 12 + lift, fw + 24, fh + 84, 20); g.stroke(); }
        flag(l.id, x, y + lift, fw, fh);
        I18.keep(l.name); ttl(l.name, x + fw / 2, y + fh + 22 + lift, 16, on ? '#ffd84a' : '#fff', 'center');
        return [x - 12, y - 12, fw + 24, fh + 84];
      });
    },
    pick(i) { const l = I18.LANGS[i]; if (!l) return; audio(); sfx('ok'); I18.set(l.id); go(Title); },
    tap(x, y) { const i = this.rects.findIndex((r) => inR(x, y, r)); if (i >= 0) this.pick(i); },
    key(k) {
      if (k === 'ArrowLeft' || k === 'a') this.sel = (this.sel + 2) % 3;
      else if (k === 'ArrowRight' || k === 'd') this.sel = (this.sel + 1) % 3;
      else if (k === 'Enter' || k === ' ') this.pick(this.sel);
    },
  });

  // Capa animada (VISIT MINAS · BRAZIL'S GEM) em laço atrás do canvas: vertical com o celular em pé, horizontal no PC.
  // O #app gira 90° com o celular em pé; o vídeo vertical gira de volta para ficar de pé. Sem vídeo, vale a capa antiga.
  const CAPA = { v: 'video/capa_v.mp4', h: 'video/capa_h.mp4' };
  const capaOff = () => { vid.pause(); vid.loop = false; vid.style.cssText = 'display:none'; vid.removeAttribute('src'); vid.load(); };
  const Title = () => ({
    isTitle: true,
    t: 0, rot: null, ok: false,
    enter() { music('title'); },
    capa() {
      this.rot = ROT; this.ok = true;
      vid.onended = null; vid.onerror = () => { this.ok = false; capaOff(); };
      vid.loop = true; vid.muted = true; vid.src = ROT ? CAPA.v : CAPA.h;
      vid.style.cssText = ROT ? 'display:block;width:540px;height:960px;left:210px;top:-210px;transform:rotate(-90deg)' : 'display:block';
      vid.play().catch(() => {});
    },
    update(dt) { this.t += dt; if (this.rot !== ROT) this.capa(); },
    draw() {
      if (this.ok) {
        g.clearRect(0, 0, W, H);
        const a = 0.6 + 0.4 * Math.sin(this.t * 3), lb = G.flags.intro ? 'TOQUE PARA CONTINUAR' : 'TOQUE PARA COMEÇAR';
        g.save(); g.globalAlpha = a;
        if (ROT) { g.translate(W * 0.75, H / 2); g.rotate(-Math.PI / 2); pill([-150, -23, 300, 46], '#ffd84a', lb, '#2a1a08', 13); } // em pé: na base do livro, acima do logo
        else pill([W - 360, H - 80, 320, 52], '#ffd84a', lb, '#2a1a08', 14);
        g.restore(); return;
      }
      bg('assets/img/scenes/mirante.webp', 3, 0.15, '#1a1030');
      if (G.flags.lumStay) lum(W - 80, 80, 26, this.t, 0.8);
      g.fillStyle = 'rgba(10,16,70,.55)'; g.fillRect(0, 40, W, 170);
      if (G.secrets.length >= 10) { g.globalAlpha = 0.4 + 0.3 * Math.sin(this.t * 3); ttl('Relógio de Sol', W / 2 + 2, 62, 44, '#fff8c0', 'center'); g.globalAlpha = 1; }
      ttl('Relógio de Sol', W / 2, 60, 44, '#ffd84a', 'center');
      txt('um relatório sobre o brilho', W / 2, 150, 13, '#fff', 'center');
      { const a = 0.6 + 0.4 * Math.sin(this.t * 3); g.globalAlpha = a; pill([W / 2 - 170, H - 100, 340, 54], '#ffd84a', G.flags.intro ? 'TOQUE PARA CONTINUAR' : 'TOQUE PARA COMEÇAR', '#2a1a08', 14); g.globalAlpha = 1; }
    },
    tap() {
      audio(); sfx('ok'); capaOff();
      if (!G.flags.intro || /[?&]intro=1/.test(location.search)) { go(Intro); return; } // ?intro=1 revê a intro sem perder o progresso
      const m = window.MAPS[G.era] ? G.era : 'hoje';
      go(() => OW(m), m === 'hoje' ? 'Brasil · Hoje' : window.MAPS[m].title);
    },
    key(k) { if (k === 'Enter' || k === ' ') this.tap(); },
  });

  // Cutscene em vídeo com legendas desenhadas no canvas (o canvas fica por cima, transparente).
  // Toque pula. Se o vídeo falhar, segue direto.
  function Cutscene(clips, done) {
    let i = -1, over = false;
    const next = () => {
      i++;
      if (i >= clips.length) return end();
      vid.src = clips[i].src; vid.muted = muted; vid.volume = 1; vid.style.display = 'block';
      vid.play().catch(() => { vid.muted = true; vid.play().catch(() => next()); }); // celular sem permissão de som: segue mudo
    };
    const end = () => { if (over) return; over = true; bgm(0.18); vid.pause(); vid.style.display = 'none'; vid.removeAttribute('src'); vid.load(); done(); };
    vid.onended = () => next();
    vid.onerror = () => next();
    return {
      t: 0,
      enter() { bgm(0.05); next(); },
      update(dt) { this.t += dt; },
      draw() {
        g.clearRect(0, 0, W, H);
        const c = clips[i]; if (!c) return;
        const tt = vid.currentTime || 0, s = (c.subs || []).find(([a, b]) => tt >= a && tt < b);
        if (s) {
          const isL = s[3] === 'lum', ls = wrap(s[2], W - 200, 13), hh = ls.length * 22 + 24;
          if (isL) lumBox(100, H - hh - 36, W - 200, hh); else { g.fillStyle = 'rgba(0,0,0,.62)'; g.fillRect(100, H - hh - 36, W - 200, hh); }
          ls.forEach((l, k) => txt(l, W / 2, H - hh - 24 + k * 22, 13, isL ? '#f3e2a0' : '#fff', 'center'));
        }
        if (c.title) { const a = Math.min(1, Math.max(0, tt - c.title[0])); g.fillStyle = `rgba(0,0,0,${a * 0.75})`; g.fillRect(0, 0, W, H); g.globalAlpha = a; txt(c.title[2] || 'Relógio de Sol', W / 2, H / 2 - 40, 40, '#ffd84a', 'center'); txt(c.title[1], W / 2, H / 2 + 20, 12, '#fff', 'center'); g.globalAlpha = 1; }
        if (this.t > 1.5) txt('toque para pular ▶▶', W - 20, 16, 8, 'rgba(255,255,255,.7)', 'right');
      },
      tap() { if (this.t > 0.8) end(); },
    };
  }
  // Roteiro da intro (add-on 2.1): legendas por clipe. Os clipes existem quando window.INTRO_CLIPS for definido.
  // Plano B (sem vídeo): as três coisas — quem, o quê, por quê — em falas.
  const Intro = () => ({
    t: 0, stage: 0,
    enter() {
      const after = () => { G.flags.intro = 1; save(); sfx('sino'); go(() => OW('hoje'), 'Brasil · Hoje'); };
      if (window.INTRO_CLIPS) { setScene(Cutscene(window.INTRO_CLIPS, after)); return; }
      music('cosmos');
      say([
        ['narr', 'Antes de haver Brasil, já havia a terra. E já havia quem olhasse para ela.'],
        ['lum', 'Observação iniciada. Espécie: humana. Interesse: brilho. Eles fazem o ouro brilhar como nenhuma outra espécie.'],
        ['lum', 'Mas o brilho está acabando. Enviar um observador. Corpo selecionado: o humano que mais perseguiu brilho.'],
      ], () => { this.stage = 1; sfx('fall'); music(null); say([['buck', '...Nashville? This ain\'t Nashville.'], ['mula', 'Não. Mas o imposto é parecido.']], after); });
    },
    update(dt) { this.t += dt; },
    draw() {
      if (!this.stage) { g.fillStyle = '#05040a'; g.fillRect(0, 0, W, H); for (let i = 0; i < 70; i++) { const x = (i * 137 + this.t * 8 * (i % 3 + 1)) % W, y = (i * 71) % (H - 200); g.fillStyle = `rgba(243,226,160,${0.2 + 0.3 * Math.sin(this.t + i)})`; g.fillRect(x, y, 2, 2); } lum(W / 2, 150, 60, this.t, 0.9); }
      else bg('assets/img/scenes/chafariz.webp', 3, 0.1);
    },
  });

  // ================= overworld (Hoje e cada era) =================
  const KEYS = {};
  const KONAMI = [];
  const OW = (id, at) => {
    const K = loadMap(id), M = K.M, isHoje = id === 'hoje';
    const startPt = at || G.pos[id] || K.pois[M.start];
    const sf = nearestFree(K, startPt[0], startPt[1]);
    const P = { x: (sf[0] + 0.5) * M.cell, y: (sf[1] + 0.5) * M.cell, face: 0, ph: 0, moving: false, still: 0, steps: 0 };
    const mulaS = { x: P.x - 20, y: P.y + 4, dir: 1, ph: 0, moving: false };
    const trail = [];
    let camx = 0, camy = 0, tt = 0, saveT = 0, fogT = 0, chase = false, eggSwap = 0, radarT = 0;
    const near = {}, hud = {};
    const free = (xy) => { const c = nearestFree(K, xy[0], xy[1]); return [(c[0] + 0.5) * M.cell, (c[1] + 0.5) * M.cell]; };
    const mkNpc = (n) => { const home = K.pois[n.at] || free(n.xy); return { ...n, x: home[0], y: home[1], face: 0, away: 0, home, ph: Math.random() * 6 }; };
    const npcs = [...(M.npcs || []).filter((n) => !n.cond || G.minis[n.cond]).map((n) => ({ ...n, ...(WD.attach[`${id}:${n.id}`] || {}) })), ...(WD.npcs[id] || [])].map(mkNpc);
    // folclore deste mapa (algumas criaturas só de noite, na lua cheia, num mapa sorteado por dia ou com muito pó)
    const agora = new Date(), hora = agora.getHours(), EV = WD.event(agora);
    const folk = WD.folk.filter((f) => f.maps.includes(id) && (EV?.folkAll || (f.id === 'saci' && EV?.saciAll) ||
      (f.when === 'noite' ? hora >= 18 || hora < 6 : f.when === 'lua' ? WD.luaCheia(agora) : f.when === 'dia' ? f.maps[hash(dateKey(agora)) % f.maps.length] === id : true)))
      .map((f) => { const [x, y] = free(Array.isArray(f.xy) ? f.xy : f.xy[id]); return { ...f, x, y }; });
    const folkHere = () => folk.filter((f) => f.when !== 'pó' || G.dust >= 20);
    const pousoXY = {}; if (isHoje) for (const p of WD.pousos) pousoXY[p.id] = free(p.xy);
    if (isHoje && curAct() >= 2 && !G.flags.guia) npcs.push(mkNpc({ id: 'cobrador', at: 'estrada', wander: 60, lines: ['Estrada Real, forasteiro. Tudo que passa aqui paga o Quinto. Até no século XXI, se eu deixar.'] }));
    if (G.flags.guia) npcs.forEach((n) => { if (n.afterGuia) n.lines = n.afterGuia; });
    const COB = M.cobrador && { x: K.pois[M.cobrador.patrol[0]][0], y: K.pois[M.cobrador.patrol[0]][1], i: 0, face: 0, ph: 0, state: 'patrol', cool: 0, dir: [1, 0], path: null, repath: 0, nap: 0, napT: 40 + Math.random() * 30 };
    const dustAt = {};
    // câmera: zoom escolhido no HUD (o mais aberto só com lampião) e seguimento suave do Buck
    const zoomMin = () => (G.items.includes('lampiao') ? 0 : 1);
    const zoomI = () => Math.max(zoomMin(), Math.min(ZOOMS.length - 1, G.flags.zoomI ?? 2));
    const camT = () => { Z = Math.max(ZOOMS[zoomI()], Math.max(W / M.w, H / M.h)); return [Math.max(0, Math.min(M.w - W / Z, P.x - W / Z / 2)), Math.max(0, Math.min(M.h - H / Z, P.y - H / Z / 2))]; };
    const cam = () => { [camx, camy] = camT(); };
    const camSmooth = (dt) => { const [tx, ty] = camT(), k = Math.min(1, dt * 7); camx += (tx - camx) * k; camy += (ty - camy) * k; if (Math.abs(tx - camx) > W) cam(); };
    const zoomBy = (d) => { const i = Math.max(zoomMin(), Math.min(ZOOMS.length - 1, zoomI() + d)); if (i === zoomI()) return; G.flags.zoomI = i; save(); sfx('tap'); cam(); floatTxt(`zoom ${Math.round(ZOOMS[i] * 100)}%`, '#cfd6ff'); };
    cam();
    const busy = () => DLG || ASK || PANEL || TR;
    const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const S = { id, P, K, M, near, npcs };

    function goal() {
      if (isHoje && !G.flags.tut1 && K.cardPos.C00) return { text: 'Pegue o papel ali no chão', at: K.cardPos.C00 };
      if (!isHoje && M.era !== 'prologo') {
        const n = needOf(M.era);
        if (n.got < n.cards) { const c = Object.entries(K.cardPos).find(([cid]) => !G.cards.includes(cid)); return { text: `Ache os relatórios desta era (${n.got}/${n.cards})`, at: c?.[1] }; }
        if (n.ok < n.quiz) { const qn = npcs.find((x) => x.quiz); return { text: `Responda às perguntas (${n.ok}/${n.quiz})${qn ? `: fale com ${nameOf(qn.id)}` : ''}`, at: qn && [qn.x, qn.y] }; }
        if (n.mini && !G.minis[n.mini]) { const mi = (M.minis || []).find((x) => x.id === n.mini); return { text: `Vença: ${mi?.label || 'o desafio'}`, at: mi && (K.pois[mi.at] || (npcs.find((x) => x.mini === mi.id) && [npcs.find((x) => x.mini === mi.id).x, npcs.find((x) => x.mini === mi.id).y])) }; }
        return { text: 'Volte pelo portal', at: K.pois.portal };
      }
      if (!isHoje) return { text: M.goalText || 'Explore e volte pela saída', at: K.pois.portal };
      if (finalOpen()) return { text: 'Volte ao Mirante. O Sineiro quer o seu relatório final.', at: K.pois.mirante };
      if (G.flags.guia) return { text: 'Modo Guia: os buracos continuam abertos.', at: null };
      const era = nextEra();
      return { text: `Entre no portal ${eraTitle(era)}`, at: M.holes[era] };
    }

    const asLines = (n, ls) => (ls || []).map((l) => (Array.isArray(l) ? l : [n.id, l]));

    // ---- conversa com NPC: contexto → pergunta → consequência no mundo ----
    function talk(n) {
      if (n.egg) return n.egg(S, n, window.ENG);
      if (n.quest && !(G.quests[n.quest]?.done && sideFor(n))) return questTalk(n);
      if (n.shop) return vendor(n, true);
      const lk = `lsn_${id}_${n.id}`;
      if (n.lesson && !G.flags[lk]) { G.flags[lk] = 1; save(); return say(n.lesson, () => { if (sideFor(n)) sideTalk(n); }); }
      const lines = asLines(n, n.lines);
      const pool = () => RAW.quizzes.filter((q) => CARD[q.cardId]?.era === M.era && !G.qok.includes(q.id));
      if (!n.quiz || !pool().length || G.flags.guia) {
        if (sideFor(n)) return sideTalk(n);
        if (n.special === 'museum') return museum(n);
        if (n.special === 'antique') return antique(n);
        if (n.special === 'hats') return hats(n);
        if (n.talk || n.vendor) return worldTalk(n);
        if (n.mini) { const mi = (M.minis || []).find((x) => x.id === n.mini); if (mi) return miniTalk(mi, n); }
        if (n.lesson) return say(n.lesson);
        say(lines.length ? lines : [[n.id, CHARS[n.id]?.catchphrase || 'Bom dia, forasteiro.']]); return;
      }
      // Sabatina da era: todas as perguntas, em ordem cronológica, uma atrás da outra (sem "quer outra?").
      // Errou: −5 e o quiz volta para a primeira. Na volta, as que já acertou são respondidas de novo
      // (para firmar as datas), mas só as ainda não acertadas valem ouro: +5 certa, −5 errada.
      const all = RAW.quizzes.filter((q) => CARD[q.cardId]?.era === M.era).sort((a, b) => (CARD[a.cardId].year || 0) - (CARD[b.cardId].year || 0) || a.id.localeCompare(b.id));
      let erros = 0;
      const run = (i) => {
        if (i >= all.length) {
          const perf = !erros && !G.flags[`perf_${M.era}`];
          if (perf) { G.flags[`perf_${M.era}`] = 1; save(); }
          sfx('win'); confetti();
          say([[n.id, 'Sabatina completa. Agora essas datas são suas.']], () => {
            if (perf) { giveBrilho(5, 'sabatina sem erro'); addTitle('de cor e salteado'); }
            if (sideFor(n)) return sideTalk(n);
            if (n.mini) { const mi = (M.minis || []).find((x) => x.id === n.mini); if (mi) miniTalk(mi, n); }
          });
          return;
        }
        const q = all[i], novo = !G.qok.includes(q.id), tries = (G.flags.qtry ||= {})[M.era] || 0;
        const opts = q.type === 'multiple' ? q.options.map((t, j) => ({ t, ok: j === q.answer })) : [{ t: 'É fato', ok: q.answer === 'fato' }, { t: 'É lenda', ok: q.answer === 'lenda' }];
        const order = q.type === 'multiple' ? opts.map((o, j) => [hash(q.id + j + tries), o]).sort((a, b) => a[0] - b[0]).map((x) => x[1]) : opts; // a cada volta, as opções mudam de lugar
        ask(`Pergunta ${i + 1}/${all.length}${novo ? ' (vale $5)' : ' (já acertada: sem ouro)'} · ${q.prompt}`, order.map((o) => o.t), (k) => {
          if (order[k].ok) {
            sfx('ok');
            if (!novo) { run(i + 1); return; }
            G.qok.push(q.id); giveGold(5); save();
            const rew = q.cardId && !G.cards.includes(q.cardId) && CARD[q.cardId].era === M.era && !REWARD.has(q.cardId);
            say([[n.id, n.right || 'Isso mesmo.'], ['narr', `${q.explain} (+5 de ouro${rew ? ' e um relatório' : ''})`]], () => (rew ? giveCard(q.cardId, () => run(i + 1)) : run(i + 1)));
          } else {
            sfx('bad'); SHAKE = 0.3; if (novo) giveGold(-5); erros++;
            G.flags.qtry[M.era] = tries + 1; G.qerr[q.id] = { b: 0, due: addDias(dateKey(new Date()), 1) }; save(); // volta amanhã na Pergunta do Sineiro
            say([[n.id, n.wrong || 'Não foi bem assim...'], [CARD[q.cardId]?.tone === 'serio' ? 'narr' : 'mula', `Dica: ${q.explain}${novo ? ' (-5 de ouro)' : ''}`], ['mula', 'Errou, volta para a primeira. As que você já acertou não valem ouro de novo.']],
              () => ask('Recomeçar a sabatina?', ['Recomeçar agora', 'Volto depois'], (j) => { if (j === 0) run(0); }));
          }
        });
      };
      const one = () => run(0);
      say(lines, one);
    }
    function miniTalk(mi, n) {
      if (mi.act != null && !actOpen(mi.act)) { say([[n?.id || 'mula', mi.locked || 'Ainda não é hora disso. Volte num Ato mais adiante.']]); return; }
      if (!isHoje && M.needMini === mi.id) {
        const k = needOf(M.era);
        if (k.got < k.cards || k.ok < k.quiz) { say([[n?.id || 'mula', 'O desafio desta era só abre para quem já sabe a história.'], ['mula', trf('Falta: {0}. O desafio tem 3 tentativas.', [k.got < k.cards && nRel(k.cards - k.got), k.ok < k.quiz && nPerg(k.quiz - k.ok)].filter(Boolean).join(tr(' e ')))]]); return; }
      }
      const done = G.minis[mi.id];
      const intro = asLines(n || { id: 'mula' }, n?.lines || mi.lines);
      say(intro.length ? intro : [['mula', mi.label]], () => ask((done ? trf('{0} (já vencido)', mi.label) : mi.label), ['Bora!', 'Agora não'], (k) => { if (k === 0) { G.pos[id] = [Math.round(P.x), Math.round(P.y)]; save(); startMini(mi.id, id); } }));
    }
    // ---- vendedores, curiosidades, doação, museu, antiquário, chapeleiro (world.js) ----
    const vendorOpen = (n) => n.vendor && (!n.vendorAfter || G.side[n.vendorAfter]?.done);
    function markHeard(n) { const k = `${id}:${n.id}`; if (G.ouviu.includes(k)) return; G.ouviu.push(k); save(); giveBrilho(2, 'você ouviu'); }
    function buy(n, it) {
      if (it === 'rapadura') {
        G.flags.rapN = (G.flags.rapN || 0) + 1; save();
        if (G.flags.rapN === 5) { secret('nashville', [[n.id, 'Rapadura acabou. Mas tenho uísque de milho, coisa fina.'], ['buck', 'No sir. Last time I drank something from a stranger I woke up 150 years late.'], ['mula', 'Foi água de chafariz, cowboy. Mas tudo bem.']]); return; }
      }
      const p = priceOf(it);
      if (G.gold < p) { sfx('bad'); say([[n.id, 'Volta quando tiver ouro. Fiado, só pra quem tem mula com cabeça.']]); return; }
      giveGold(-p); addItem(it); sfx('coin'); floatTxt(`${ITEM(it).icon} ${ITEM(it).name}: na mochila`, '#9be36a');
    }
    function vendor(n, isShop) {
      const list = (n.vendor || []).filter((it) => ITEM(it).kind === 'comida' || !has(it));
      const story = !isShop && (n.talk || n.lesson);
      const greet = isShop ? (G.flags.guia ? 'Guia agora, é? Pra guia eu faço preço.' : 'Venda do Tropeiro. Tem de tudo que cabe numa mula.') : 'O que vai ser?';
      say([[n.id, greet]], () => ask(`Seu ouro: $${G.gold}`, [...list.map((it) => `${ITEM(it).icon} ${tr(ITEM(it).name)} · $${priceOf(it)}`), ...(story ? ['Ouvir a história de novo'] : []), 'Nada, obrigado'], (k) => {
        if (k < list.length) return buy(n, list[k]);
        if (story && k === list.length) say(n.talk || n.lesson);
      }));
    }
    function worldTalk(n) {
      const first = !G.ouviu.includes(`${id}:${n.id}`), more = n.donate || vendorOpen(n);
      const next = () => { if (n.donate) donate(n); else if (vendorOpen(n)) vendor(n); };
      if (!n.talk) return next();
      if (!first && more) return next();
      say(n.talk, () => { markHeard(n); next(); });
    }
    function donate(n) {
      const alvo = n.donate === 'matriz' ? 'o restauro da Matriz' : 'a Irmandade do Rosário', vals = [20, 50, 100].filter((v) => v <= G.gold);
      if (!vals.length) { say([[n.id, 'Quando sobrar ouro, lembre: aqui ele vira brilho.']]); return; }
      ask(`Doar para ${alvo}? Cada $10 vira ✦1. Seu ouro: $${G.gold}`, [...vals.map((v) => `Doar $${v}`), 'Ouvir a história', 'Agora não'], (k) => {
        if (k === vals.length) return say(n.talk);
        if (k > vals.length) return;
        const v = vals[k]; giveGold(-v); G.doado = (G.doado || 0) + v; save(); sfx('sino');
        say([[n.id, v >= 100 ? 'Que Deus lhe pague. E paga: em brilho.' : 'Obrigado. Cada telha conta.']], () => giveBrilho(v / 10, 'doação'));
      });
    }
    function museum(n) {
      const ready = WD.sets.filter((st) => !G.sets[st.id] && setProg(st) >= setNeed(st));
      say([...n.talk, [n.id, ready.length ? `Você tem ${ready.length} coleção completa para expor!` : 'Nenhuma coleção completa ainda. O progresso está na mochila, aba Saber.']], () => {
        markHeard(n);
        if (!ready.length) return;
        for (const st of ready) G.sets[st.id] = 1;
        save(); sfx('win'); confetti();
        say([[n.id, trf('Exposto, com o seu nome na plaquinha: {0}.', ready.map((st) => tr(st.name)).join(', '))]], () => { for (const st of ready) { giveBrilho(st.brilho, st.name); addTitle(st.title); } });
      });
    }
    const ANTIQ = Object.keys(WD.items).filter((k) => WD.items[k].kind === 'antiguidade');
    function antique(n) {
      say(n.talk, () => { markHeard(n); ask('Antiquário', ['Comprar', 'Vender', 'Nada'], (k) => {
        if (k === 0) {
          const list = ANTIQ.filter((i) => !G.items.includes(i));
          if (!list.length) return say([[n.id, 'Você já tem tudo o que eu tenho. Volte mês que vem.']]);
          ask(`Seu ouro: $${G.gold}`, [...list.map((i) => `${ITEM(i).icon} ${tr(ITEM(i).name)} · $${priceOf(i)}`), 'Nada'], (j) => { if (j < list.length && G.gold >= priceOf(list[j])) { buy(n, list[j]); say([[n.id, ITEM(list[j]).desc]]); } else if (j < list.length) buy(n, list[j]); });
        }
        if (k === 1) {
          const list = G.items.filter((i) => ITEM(i).kind === 'antiguidade');
          if (!list.length) return say([[n.id, 'Você não tem nada que eu queira. Ainda.']]);
          ask('Vender pela metade do preço:', [...list.map((i) => `${tr(ITEM(i).name)} · $${Math.floor(priceOf(i) / 2)}`), 'Nada'], (j) => {
            if (j >= list.length) return;
            const i = list[j]; G.items = G.items.filter((x) => x !== i); giveGold(Math.floor(priceOf(i) / 2)); G.flags.vendas = (G.flags.vendas || 0) + 1; save();
            if (G.flags.vendas >= 3 && !G.items.includes('pirita')) { addItem('pirita'); say([[n.id, 'Compra, vende, compra, vende... Toma, um presente da casa.'], ['narr', 'Você ganhou Pirita: o ouro de tolo. Brilha, mas não vale nada.'], ['lum', 'Observador. Brilho detectado: falso.']]); }
            else say([[n.id, 'Negócio fechado.']]);
          });
        }
      }); });
    }
    function hats(n) {
      const list = Object.keys(WD.items).filter((k) => WD.items[k].kind === 'chapeu');
      say(n.talk, () => { markHeard(n); ask(`Seu ouro: $${G.gold}`, [...list.map((h) => `${tr(ITEM(h).name)} · ${G.chapeus.includes(h) ? tr(G.chapeu === h ? 'usando' : 'usar') : `$${priceOf(h)}`}`), 'Nada'], (k) => {
        if (k >= list.length) return;
        const h = list[k];
        if (!G.chapeus.includes(h)) { if (G.gold < priceOf(h)) { sfx('bad'); return say([[n.id, 'Chapéu bom custa. Volta com ouro.']]); } giveGold(-priceOf(h)); addItem(h); }
        G.chapeu = h; save(); sfx('tap'); say([[n.id, 'Ficou ótimo. Parece até gente daqui.']]);
      }); });
    }
    // ---- missões paralelas (world.js): passos fetch / route / count / ask; no fim, volta ao NPC para a recompensa ----
    const SQ = (q) => WD.side[q];
    const sqReady = (q) => { const d = SQ(q); return !!d && (!d.after || G.side[d.after]?.done) && (!d.afterQuest || G.quests[d.afterQuest]?.done) && (!d.afterMini || G.minis[d.afterMini]) && (!d.afterQuiz || quizOf(M.era).every((qid) => G.qok.includes(qid))); };
    const sideFor = (n) => (n.side || []).find((q) => (G.side[q] && !G.side[q].done) || (!G.side[q] && sqReady(q)));
    const DL = {}; // prazos das rotas com tempo (valem só nesta visita ao mapa)
    const sqCount = (step) => (step.what === 'pousos' ? G.pousos.length : 0);
    function sideTalk(n) {
      const q = sideFor(n), d = SQ(q); let st = G.side[q];
      if (!st) { G.side[q] = st = { s: 0, got: [] }; save(); sfx('ok'); return say(d.start, () => { floatTxt(`Missão extra: ${d.title}`, '#9be36a'); beginStep(q, n); }); }
      const step = d.steps[st.s];
      if (!step) return finishSide(q, n);
      if (step.kind === 'count') { if (sqCount(step) >= step.need) { st.s++; save(); return finishSide(q, n); } return say([[n.id, `${tr(step.text)}: ${sqCount(step)}/${step.need}.`]]); }
      if (step.kind === 'ask') return beginStep(q, n);
      if (step.kind === 'route' && step.secs && !(DL[q] > T)) { st.got = []; save(); return say([[n.id, 'Vamos de novo? O tempo começa agora.']], () => beginStep(q, n)); }
      say([[n.id, `${tr(step.text)}${step.kind === 'fetch' ? ` (${st.got.length}/${step.pts.length})` : ''}.`]]);
    }
    function beginStep(q, n) {
      const d = SQ(q), st = G.side[q], step = d.steps[st.s];
      if (!step) return finishSide(q, n);
      if (step.kind === 'route' && step.secs) { DL[q] = T + step.secs; floatTxt(`${step.secs} segundos!`, '#ffd84a'); }
      if (step.kind === 'ask') ask(step.q, step.opts, (k) => { if (k === step.ok) { st.s++; save(); sfx('ok'); finishSide(q, n); } else { sfx('bad'); say([[n.id, 'Não foi bem assim. Pensa mais e volta aqui.']]); } });
    }
    function finishSide(q, n) {
      const d = SQ(q), r = d.reward || {};
      G.side[q].done = 1; save();
      if (d.serio) sfx('sino'); else { sfx('win'); confetti(); }
      say(d.done, () => {
        if (r.gold) giveGold(r.gold);
        for (const [it, k] of Object.entries(r.items || {})) addItem(it, k);
        if (r.brilho) giveBrilho(r.brilho, d.title);
        if (r.title) addTitle(r.title);
        const its = Object.entries(r.items || {}).map(([it, k]) => `${ITEM(it).icon} ${tr(ITEM(it).name)}${k > 1 ? ` ×${k}` : ''}`);
        say([['narr', `${trf('Missão cumprida: {0}.', d.title)} ${[r.gold && `+$${r.gold}`, ...its, r.brilho && `✦ ${r.brilho}`].filter(Boolean).join(' · ')}`]]);
      });
    }
    const PICKC = {};
    function sidePicks() { // pontos ativos das missões neste mapa
      const L = [];
      for (const [q, st] of Object.entries(G.side)) {
        const d = SQ(q); if (!d || st.done || d.map !== id) continue;
        const step = d.steps[st.s]; if (!step?.pts) continue;
        if (step.kind === 'fetch') step.pts.forEach((p, i) => { if (!st.got.includes(i)) L.push({ q, i, p, step }); });
        if (step.kind === 'route' && (!step.secs || DL[q] > T)) { const i = st.got.length; if (step.pts[i]) L.push({ q, i, p: step.pts[i], step }); }
      }
      return L.map((o) => { const k = `${o.q}:${o.i}`; const [x, y] = PICKC[k] ||= free(o.p); return { ...o, x, y }; });
    }
    function missaoIcon(o) { // nome do ícone do objeto de missão (assets/icons/missao_<nome>.webp)
      const nm = (o.p[2] || o.step.label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (o.step.words) return 'missao_palavra';
      if (o.step.kind === 'route') return nm === 'gelo' ? 'missao_gelo' : o.q === 'SQ-quitanda' ? 'missao_quitanda' : 'missao_destino';
      return `missao_${nm.split(' ')[0]}`;
    }
    function pick(o) {
      const d = SQ(o.q), st = G.side[o.q], step = o.step, total = step.pts.length;
      st.got.push(o.i); sfx('coin');
      if (step.words) { if (!G.tupi.includes(o.p[2])) G.tupi.push(o.p[2]); say([['paraguacu', o.p[3]]]); }
      if (st.got.length >= total) { st.s++; st.got = []; delete DL[o.q]; floatTxt(`Pronto! Volte a ${nameOf(d.giver) || 'quem pediu'}`, '#9be36a'); }
      else floatTxt(`${tr(o.p[2] || step.label || '')} ${st.got.length}/${total}`.trim(), '#9be36a');
      save();
    }
    function sideTrack() { // a missão extra deste mapa, para o quadro MISSÃO
      for (const [q, st] of Object.entries(G.side)) {
        const d = SQ(q); if (!d || st.done || d.map !== id) continue;
        const step = d.steps[st.s];
        if (!step) return `Volte a ${nameOf(d.giver)}`;
        if (step.kind === 'route' && step.secs) return DL[q] > T ? `${tr(step.text)} · ${Math.ceil(DL[q] - T)} s` : `Fale com ${nameOf(d.giver)} para tentar de novo`;
        return `${tr(step.text)}${step.kind === 'fetch' ? ` (${st.got.length}/${step.pts.length})` : step.kind === 'count' ? ` (${sqCount(step)}/${step.need})` : ''}`;
      }
      return '';
    }
    // ---- folclore, pousos e o cochilo do Cobrador ----
    function folkTalk(f) {
      const novo = !G.bestiario.includes(f.id);
      const after = () => { if (!novo) return; G.bestiario.push(f.id); save(); giveBrilho(3, 'bestiário'); floatTxt(`Bestiário ${G.bestiario.length}/9`, '#c070ff'); };
      if (f.offer) return say(f.lines, () => ask('A Mãe-do-Ouro espera.', ['Ofertar 10 de pó', 'Seguir a bola de fogo'], (k) => {
        if (k === 0) { G.dust -= 10; save(); sfx('sino'); say([['narr', 'A bola de fogo gira e some no chão. Quem larga um pouco do ouro, ganha outra coisa.']], () => { after(); giveBrilho(5, 'desapego'); }); }
        else say([['narr', 'Você corre atrás dela até o mato fechar. Quem segue o ouro, perde o rumo.']], after);
      }));
      say(novo ? f.lines : [[f.id, f.lines[0][1]], ['mula', 'De novo esse aí. Já está no bestiário.']], after);
    }
    function pousoTalk(p) {
      if (!G.pousos.includes(p.id)) { G.pousos.push(p.id); save(); sfx('cascos'); floatTxt(`Pouso de ${p.name} liberado (${G.pousos.length}/${WD.pousos.length})`, '#9be36a'); giveBrilho(1, 'pouso novo'); }
      const here = pousoXY[p.id], dest = WD.pousos.filter((o) => o.id !== p.id && G.pousos.includes(o.id));
      const cost = (o) => { const c = Math.max(10, Math.min(40, Math.round(d2(here, pousoXY[o.id]) / 40))); return G.items.includes('ferradura') ? Math.ceil(c / 2) : c; };
      ask(`Pouso de ${p.name}. Seu ouro: $${G.gold}`, [...dest.map((o) => `Ir para ${o.name} · $${cost(o)}`), `${ITEM('angu').icon} Comer angu · $${priceOf('angu')}`, 'Ficar'], (k) => {
        if (k < dest.length) {
          const o = dest[k];
          if (o.need && !G.items.includes(o.need)) { say([['tropeiro', `Para ${o.name}, só de canoa. Fale com o monçoeiro, no sertão.`]]); return; }
          if (G.gold < cost(o)) { sfx('bad'); say([['tropeiro', 'Sem ouro, sem tropa.']]); return; }
          const alvo = [Math.round(pousoXY[o.id][0]), Math.round(pousoXY[o.id][1] + 24)]; // guardado à parte: o salvamento automático regrava G.pos durante a transição
          giveGold(-cost(o)); G.pos.hoje = alvo; save(); sfx('cascos');
          go(() => OW('hoje', alvo), `Pouso de ${o.name}`); return;
        }
        if (k === dest.length) { if (G.gold < priceOf('angu')) { sfx('bad'); return; } giveGold(-priceOf('angu')); addItem('angu'); eat('angu'); }
      });
    }
    function napTalk() {
      COB.nap = 0; COB.cool = 6;
      const deve = G.flags.cobDeve || 0;
      if (deve > 0) { G.dust += deve; G.flags.cobDeve = 0; save(); sfx('coin'); say([['narr', `Você surrupia de volta ${deve} de pó do bolso do Cobrador.`], ['cobrador', 'Hm?! Quem... Ninguém. Eu só estava fechando os olhos para pensar na Coroa.'], ['mula', 'Imposto devolvido. Uma vez na história.']]); }
      else say([['cobrador', 'Hm?! Eu não estava dormindo. Estava fiscalizando por dentro.']]);
    }
    // ---- quests detetive: cliente abre, testemunhas espalhadas falam, volta e acusa ----
    function questTalk(n) {
      const q = RAW.quests.find((x) => x.id === n.quest);
      const st = G.quests[q.id];
      if (st?.done) { say([[n.id, q.twist || 'Caso encerrado. Obrigado, forasteiro.']]); return; }
      if (!st) { G.quests[q.id] = { heard: [] }; save(); say([...asLines(n, n.lines), [n.id, q.brief], ['mula', `Caso aberto: “${q.title}”. Fale com quem tem 💬 na cabeça${q.witnesses.some((w) => w.from === 'mula') ? ' (eu também sei de algo: toque em mim)' : ''} e volte aqui.`]]); return; }
      if (!st.heard.length) { say([[n.id, 'Ainda sem testemunhas? Procure quem tem um 💬 sobre a cabeça.']]); return; }
      const sus = q.suspects;
      say([[n.id, `Você ouviu ${st.heard.length} de ${q.witnesses.length} testemunhas. E então?`]], () => ask(q.title, sus.map((s) => s.name), (k) => {
        if (sus[k].id !== q.answer) { sfx('bad'); say([[n.id, sus[k].why || 'Não foi essa pessoa.'], [n.id, 'Procure mais uma testemunha e volte.']]); return; }
        ask('Quando?', q.dates, (j) => {
          if (q.dates[j] !== q.date) { sfx('bad'); say([[n.id, 'O nome está certo, mas a data não. Ouça mais alguém.']]); return; }
          sfx('win'); confetti(); st.done = 1; G.quests[q.id] = st; giveGold(q.reward?.gold || 30);
          if (q.reward?.item) giveItem(q.reward.item);
          save();
          const item = q.reward?.item && RAW.items.find((i) => i.id === q.reward.item);
          say([[n.id, `Caso encerrado! ${q.twist || ''}`], ['narr', `+${q.reward?.gold || 30} de ouro${item ? ` e um item: ${item.name}` : ''}.`]], () => { const c = (q.cards || []).find((cid) => !G.cards.includes(cid) && !REWARD.has(cid)); if (c) giveCard(c); });
        });
      }));
    }
    const witnesses = [];
    for (const n of npcs.filter((x) => x.quest)) {
      const q = RAW.quests.find((x) => x.id === n.quest);
      (q?.witnesses || []).forEach((wi, k) => {
        if (wi.from === 'mula') { witnesses.push({ id: 'mula', quest: q.id, wi: k, mule: true }); return; }
        const spots = Object.entries(K.pois).filter(([nm]) => nm !== 'portal' && nm !== M.start).map(([, p]) => p), p = spots[hash(q.id + k) % spots.length];
        const [cx, cy] = nearestFree(K, p[0] + 34, p[1] + 26);
        witnesses.push({ id: wi.from, quest: q.id, wi: k, x: (cx + 0.5) * M.cell, y: (cy + 0.5) * M.cell });
      });
    }
    function witnessTalk(w) {
      const q = RAW.quests.find((x) => x.id === w.quest), st = G.quests[q.id];
      say([[w.id, q.witnesses[w.wi].text]], () => { if (!st.heard.includes(w.wi)) { st.heard.push(w.wi); save(); floatTxt(`testemunha ${st.heard.length}/${q.witnesses.length}`, '#9be36a'); } });
    }
    function travel(era) { const h = M.holes?.[era]; if (!h) return; const [cx, cy] = nearestFree(K, h[0], h[1] + 30); P.x = (cx + 0.5) * M.cell; P.y = (cy + 0.5) * M.cell; mulaS.x = P.x - 16; mulaS.y = P.y; trail.length = 0; cam(); sfx('portal'); banner(ERA[era].name); }
    function fallInto(era) {
      sfx('fall'); SHAKE = 0.4;
      G.pos.hoje = [Math.round(P.x), Math.round(P.y + 30)];
      G.flags.lastHole = era; save();
      go(() => OW(era), `Entrando no portal… ${eraTitle(era)}`);
    }
    function caught() {
      COB.state = 'patrol'; COB.cool = 12; chase = false; music(M.music || M.era); COB.path = null;
      if (G.items.includes('santo')) { G.items = G.items.filter((i) => i !== 'santo'); save(); say([['cobrador', 'Vamos ver esse santo aí...'], ['narr', 'Ele revista o santo. Vazio.'], ['mula', 'Santo do pau oco: lenda que vira mecânica. Usou o seu.']]); return; }
      const took = Math.ceil(G.dust * (G.items.includes('guia') ? 0.1 : 0.2)); G.dust -= took; G.flags.cobDeve = (G.flags.cobDeve || 0) + took; save(); sfx('bad'); SHAKE = 0.3;
      const pool = RAW.quizzes.filter((q) => ['C43', 'C45', 'C46', 'C51', 'C53', 'C55'].includes(q.cardId));
      const k0 = hash(String(Math.round(G.played))), qa = [pool[k0 % pool.length], pool[(k0 + 1) % pool.length]];
      let back = 0;
      const one = (i) => {
        if (i >= qa.length) { if (back) { G.dust += back; G.flags.cobDeve = Math.max(0, (G.flags.cobDeve || 0) - back); save(); } say([['cobrador', back ? `Hmpf. Sabe das leis da Coroa. Devolvo ${back} de pó.` : `Levei ${took} de pó. O Quinto é da Coroa.`]]); return; }
        const q = qa[i], opts = q.type === 'multiple' ? q.options.map((t, j) => ({ t, ok: j === q.answer })) : [{ t: 'É fato', ok: q.answer === 'fato' }, { t: 'É lenda', ok: q.answer === 'lenda' }];
        ask(q.prompt, opts.map((o) => o.t), (k) => { if (opts[k].ok) { sfx('ok'); back += Math.ceil(took / 4); } else sfx('bad'); one(i + 1); });
      };
      say([['cobrador', `Pó sem selo! Levo o Quinto: ${took}. Responda direito e talvez eu devolva metade.`]], () => one(0));
    }

    // Tudo que se faz no mundo passa pelo botão A: o mais perto dentro do alcance vira o alvo.
    let TGT = null;
    function usePortal() {
      if (M.exit) { go(() => OW(M.exit.map, M.exit.at && window.MAPS[M.exit.map].pois[M.exit.at]), M.exit.title); return; }
      const hole = window.MAPS.hoje.holes[M.era];
      if (eraNeedMet(M.era)) { G.eras[M.era].done = true; save(); sfx('portal'); SHAKE = 0.3; go(() => OW('hoje', [hole[0], hole[1] + 30]), 'Brasil · Hoje'); return; }
      const k = needOf(M.era), falta = [k.got < k.cards && nRel(k.cards - k.got), k.ok < k.quiz && nPerg(k.quiz - k.ok), k.mini && !G.minis[k.mini] && tr('o desafio')].filter(Boolean).join(', ');
      say([['mula', `A era ainda não está completa. Falta: ${falta}.`]], () => ask('Sair mesmo assim? (o próximo portal continua fechado)', ['Ficar', 'Sair'], (j) => {
        if (j === 1) { sfx('portal'); go(() => OW('hoje', [hole[0], hole[1] + 30]), 'Brasil · Hoje'); }
      }));
    }
    function interactables() {
      const L = [], pt = [P.x, P.y];
      const add = (x, y, r, label, run, bias = 0) => { const d = d2(pt, [x, y]); if (d < r) L.push({ x, y, d: d - bias, label, run }); }; // bias: ganha o empate de quem está no mesmo ponto
      for (const [cid, p] of Object.entries(K.cardPos)) if (!G.cards.includes(cid)) add(p[0], p[1], 34, 'pegar', () => giveCard(cid, () => {
        if (isHoje && cid === 'C00' && !G.flags.tut1) { G.flags.tut1 = 1; save(); say([['mula', 'Isso. Cada papel desses é um relatório. Eu transmito. Pra quem? Depois.'], ['mula', 'E aquilo ali no chão, aquela cratera com luz azul... é o atalho.']]); }
      }));
      for (const n of npcs) if (!(n.away > tt)) add(n.x, n.y, 40, n.shop ? 'comprar' : n.lesson ? 'ouvir' : n.mini && !n.quiz ? 'desafio' : 'falar', () => talk(n));
      for (const o of sidePicks()) add(o.x, o.y, 30, o.p[2] || o.step.label || 'pegar', () => pick(o));
      for (const f of folkHere()) add(f.x, f.y, 44, 'olhar', () => folkTalk(f));
      if (isHoje) for (const p of WD.pousos) add(pousoXY[p.id][0], pousoXY[p.id][1], 36, `pouso ${p.name}`, () => pousoTalk(p));
      if (COB && COB.nap > 0) add(COB.x, COB.y, 40, G.flags.cobDeve > 0 ? 'recuperar o pó' : 'cutucar', napTalk);
      for (const w of witnesses) if (!w.mule && G.quests[w.quest] && !G.quests[w.quest].done) add(w.x, w.y, 36, 'ouvir', () => witnessTalk(w));
      const mw = witnesses.find((v) => v.mule && G.quests[v.quest] && !G.quests[v.quest].done && !G.quests[v.quest].heard.includes(v.wi));
      if (mw) add(mulaS.x, mulaS.y, 40, 'Mula', () => witnessTalk(mw));
      for (const mi of M.minis || []) if (mi.at) { const q = K.pois[mi.at]; add(q[0], q[1], 36, 'desafio', () => miniTalk(mi)); }
      if (!isHoje && K.pois.portal) add(K.pois.portal[0], K.pois.portal[1], 34, M.exit ? 'sair' : 'portal', usePortal);
      for (const [k, q] of Object.entries(K.pois)) {
        if (k.startsWith('bateia') && !(dustAt[k] > tt)) add(q[0], q[1], 30, 'bateia', () => { dustAt[k] = tt + 25; G.dust += 5; save(); sfx('garimpo'); floatTxt('+5 pó de ouro ✨'); FLAMEPULSE = 0.5; });
        if (k === 'fundicao') add(q[0], q[1], 36, 'fundição', () => {
          if (G.dust > 0) { const n = Math.round(G.dust * (G.items.includes('pedra') ? 1.25 : 1)); G.dust = 0; giveGold(n); if (chase && COB) { COB.state = 'patrol'; COB.path = null; chase = false; } say([['fundidor', `${n} de pó viraram barra com o selo do rei: +$${n}.`], ['mula', 'E o Cobrador perde o interesse. Pó sem selo é que dá cadeia.']]); }
          else say([['fundidor', 'Casa de Fundição. Traga pó de ouro que eu derreto e carimbo. O Quinto sai aqui mesmo.']]);
        }, G.dust > 0 ? 8 : 0); // com pó na mão, a Fundição vem antes do fundidor (estão no mesmo lugar em Minas)
        const dest = k.startsWith('door_') && M.doors?.[k];
        if (dest) add(q[0], q[1], 32, 'entrar', () => { G.pos[id] = [Math.round(P.x), Math.round(P.y + 24)]; save(); sfx('cascos'); go(() => OW(dest.map), dest.title); });
      }
      if (isHoje) {
        for (const [era, h] of Object.entries(M.holes)) add(h[0], h[1], 32, eraOpen(era) ? 'entrar' : 'fechado', () => {
          if (eraOpen(era)) fallInto(era); else say([['mula', `Portal fechado. A viagem no tempo é em ordem: o próximo é ${eraTitle(nextEra())}.`]]);
        });
        if (finalOpen() && !G.flags.ending) add(K.pois.mirante[0], K.pois.mirante[1], 40, 'final', () => startEnding());
      }
      if (M.tour) for (const st of RAW.tour.stops) {
        const q = K.pois[st.id]; if (!q) continue;
        add(q[0], q[1], 34, st.name, () => {
          const seen = (G.flags.tour ||= {}); const novo = !seen[st.id]; seen[st.id] = 1; save();
          const ls = [['sineiro', `${st.name}. Olhe: ${st.lookAt}.`], ...(st.extras || []).slice(0, 2).map((x) => ['buck', x.joke])];
          if (st.transition) ls.push(['buck', st.transition]);
          say(ls, () => { if (novo) { floatTxt(`parada ${Object.keys(seen).length}/${RAW.tour.stops.length}`, '#9be36a'); giveBrilho(1, 'você olhou'); } });
        });
      }
      return L.sort((a, b) => a.d - b.d);
    }
    function act() {
      const t = interactables()[0];
      if (t) { t.run(); return; }
      // segredos escondidos: A perto do chafariz, do cruzeiro etc. (o mesmo que tocar neles antes)
      const near1 = Object.values(K.pois).reduce((a, q) => (d2([P.x, P.y], q) < (a ? d2([P.x, P.y], a) : 60) ? q : a), null);
      if (near1) for (const sc of SECRETS) if ((sc.map === id || sc.map === '*') && sc.tap?.(S, near1[0], near1[1], tt)) return;
    }
    Object.assign(S, { cob: COB, picks: () => sidePicks(), folk: () => folkHere(), pousos: pousoXY, talk, travel, mulaS, setSwap: (s) => { eggSwap = s; }, targets: () => interactables() });

    return {
      travel, S,
      enter() {
        // som de chegada: sinos na cidade, mar nas eras da costa
        if (id === 'tiradentes') setTimeout(() => sfx('sinos'), 500);
        if (id === 'mundo' || id === 'paubrasil') setTimeout(() => sfx('ondas'), 500);
        G.era = id;
        const first = !G.eras[M.era]?.visited;
        G.eras[M.era] = { ...(G.eras[M.era] || {}), visited: true };
        save();
        if (isHoje && !G.flags.tut0) {
          G.flags.tut0 = 1; save();
          setTimeout(() => say([['mula', 'Levanta. Você tem um trabalho.'], ['buck', 'I have a WHAT?'], ['mula', 'Observar. Anotar. Mandar. Ande com o joystick à esquerda (ou as setas). Chegou perto de algo? Aperte o botão A (ou Espaço). Eu te sigo.']], () => {
            if (G.flags.migratedN) say([['mula', `Ah: você trouxe ${G.flags.migratedN} relatórios de um caderno antigo. Já mandei.`]]);
          }), 600);
        } else if (isHoje && G.flags.tut1) setTimeout(daily, 900);
        else if (!isHoje && first) setTimeout(() => { const k = needOf(M.era); say([...(M.arrive || [['mula', `${tr(ERA[M.era]?.name || M.title)}.`]]), ['mula', k.mini ? trf('Para o portal abrir: {0}, {1} e vencer o desafio da era.', nRel(k.cards), nPerg(k.quiz)) : trf('Para o portal abrir: {0} e {1}.', nRel(k.cards), nPerg(k.quiz))]]); }, 700);
      },
      update(dt) {
        tt += dt; G.played += dt;
        if (eggSwap > 0) eggSwap -= dt;
        const kx = (KEYS.ArrowRight || KEYS.d ? 1 : 0) - (KEYS.ArrowLeft || KEYS.a ? 1 : 0);
        const ky = (KEYS.ArrowDown || KEYS.s ? 1 : 0) - (KEYS.ArrowUp || KEYS.w ? 1 : 0);
        let vx = 0, vy = 0;
        const sp = 85 * (1 + (G.items.includes('botas') ? 0.4 : 0) + (buffOn('speed') || 0)); // bota +40%; comida soma (rapadura +80%)
        const jm = Math.hypot(JOY.x, JOY.y);
        if (!busy() && JOY.id != null && jm > 0.2) { const k = Math.min(1, jm) / jm; vx = JOY.x * k * sp; vy = JOY.y * k * sp; } // joystick analógico
        else if (!busy() && (kx || ky)) { const l = Math.hypot(kx, ky); vx = kx / l * sp; vy = ky / l * sp; }
        P.moving = !!(vx || vy);
        if (P.moving) {
          P.still = 0;
          if (!blockedAt(K, P.x + vx * dt, P.y)) P.x += vx * dt;
          if (!blockedAt(K, P.x, P.y + vy * dt)) P.y += vy * dt;
          P.face = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? -1 : 2) : (vy < 0 ? 1 : 0);
          const before = Math.floor(P.ph / Math.PI);
          P.ph += dt * 14;
          if (Math.floor(P.ph / Math.PI) !== before) { P.steps++; if (M.stoneAt && d2([P.x, P.y], K.pois[M.stoneAt]) < 80) sfx('stone'); }
          const last = trail[trail.length - 1];
          if (!last || Math.hypot(last[0] - P.x, last[1] - P.y) > 2) { trail.push([P.x, P.y]); if (trail.length > 40) trail.shift(); }
        } else { P.still += busy() ? 0 : dt; P.steps = 0; }
        const tgt = trail.length > 12 ? trail[trail.length - 12] : null;
        if (tgt) {
          const dx = tgt[0] - mulaS.x, dy = tgt[1] - mulaS.y, d = Math.hypot(dx, dy);
          mulaS.moving = d > 2;
          if (d > 2) { const s2 = Math.min(d, sp * 1.1 * dt); mulaS.x += dx / d * s2; mulaS.y += dy / d * s2; if (Math.abs(dx) > 0.5) mulaS.dir = dx; mulaS.ph += dt * 12; }
        }
        camSmooth(dt);
        if (FLAMEPULSE > 0) FLAMEPULSE -= dt;
        if ((fogT += dt) > 0.25) { fogT = 0; clearFog(K, P.x, P.y); const f = (G.fog[id] ||= []); const l2 = f[f.length - 1]; if (!l2 || Math.hypot(l2[0] - P.x, l2[1] - P.y) > 40) f.push([Math.round(P.x), Math.round(P.y)]); }
        if ((saveT += dt) > 2) { saveT = 0; G.pos[id] = [Math.round(P.x), Math.round(P.y)]; save(); }
        // radar sonoro do Sineiro (prêmio dos sinos): sino toca com relatório a 200 px
        if (G.minis.sinos && (radarT -= dt) <= 0) { radarT = 3; if (Object.entries(K.cardPos).some(([cid, p]) => !G.cards.includes(cid) && d2([P.x, P.y], p) < 200)) sfx('sinoP'); }
        for (const n of npcs) if (n.wander && !busy()) { n.ph += dt; const nx = n.home[0] + Math.sin(n.ph * 0.5) * n.wander; n.face = Math.cos(n.ph * 0.5) > 0 ? 2 : -1; if (!blockedAt(K, nx, n.y)) n.x = nx; }
        if (COB && !busy()) { if (COB.nap > 0) COB.nap -= dt; else if (COB.state !== 'chase' && (COB.napT -= dt) <= 0) { COB.nap = 15; COB.napT = 50 + Math.random() * 40; COB.path = null; } }
        if (COB && !busy() && !(COB.nap > 0)) {
          COB.cool -= dt;
          const pt = [P.x, P.y], cp = [COB.x, COB.y], dist = d2(pt, cp);
          if (COB.state !== 'chase' && G.dust > 0 && COB.cool <= 0 && dist < 120 && !buffOn('stealth')) {
            const ang = Math.atan2(P.y - COB.y, P.x - COB.x), fa = Math.atan2(COB.dir[1], COB.dir[0]);
            let da = Math.abs(ang - fa); if (da > Math.PI) da = 2 * Math.PI - da;
            if (da < 35 * Math.PI / 180 || dist < 40) { COB.state = 'chase'; COB.path = null; chase = true; sfx('apito'); floatTxt('O COBRADOR TE VIU!', '#ff6a5a'); }
          }
          let tx, ty, spd = 60;
          if (COB.state === 'chase') { tx = P.x; ty = P.y; spd = 95; if (G.dust <= 0 || dist > 260) { COB.state = 'patrol'; COB.path = null; chase = false; music(M.music || M.era); } }
          else { const pp = K.pois[M.cobrador.patrol[COB.i]]; tx = pp[0]; ty = pp[1]; if (Math.hypot(tx - COB.x, ty - COB.y) < 8) { COB.i = (COB.i + 1) % M.cobrador.patrol.length; COB.path = null; } }
          if (!COB.path || COB.repath <= 0) { const s0 = nearestFree(K, COB.x, COB.y), t0 = nearestFree(K, tx, ty); COB.path = astar(K, s0[0], s0[1], t0[0], t0[1]) || []; COB.repath = COB.state === 'chase' ? 0.5 : 4; }
          COB.repath -= dt;
          const nx = COB.path[0];
          if (nx) { const dx = nx[0] - COB.x, dy = nx[1] - COB.y, d = Math.hypot(dx, dy); if (d < 3) COB.path.shift(); else { COB.x += dx / d * spd * dt; COB.y += dy / d * spd * dt; COB.dir = [dx / d, dy / d]; COB.face = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? -1 : 2) : (dy < 0 ? 1 : 0); COB.ph += dt * 12; } }
          if (COB.state === 'chase' && dist < 16) caught();
        }
        for (const q of Object.keys(DL)) if (T > DL[q]) { delete DL[q]; const st = G.side[q]; if (st && !st.done) { st.got = []; save(); sfx('bad'); floatTxt(`O tempo acabou! Fale com ${nameOf(WD.side[q].giver)}`, '#ff6a5a'); } }
        if (busy()) return;
        TGT = interactables()[0] || null;
        const pt = [P.x, P.y];
        if (isHoje) { const dSj = d2(pt, [1505, 1360]); if (dSj < 70 && !near.sjdr) { near.sjdr = 1; sfx('sinos'); } else if (dSj > 140) near.sjdr = 0; } // sinos de São João ao passar perto
        for (const sc of SECRETS) if (sc.map === id || sc.map === '*') sc.check?.(S, dt, tt);
      },
      draw(dt) {
        g.imageSmoothingEnabled = false;
        const shk = SHAKE > 0 ? (SHAKE -= dt, (Math.random() - 0.5) * 8) : 0;
        g.save(); g.translate(shk, 0);
        g.fillStyle = M.draft.land ? M.draft.sea || '#2a6fb0' : M.draft.ground || '#7aa24c'; g.fillRect(-10, 0, W + 20, H);
        const MI = ART(M.image);
        if (MI && !K.miniPainted) { K.miniPainted = 1; const c = K.mini.getContext('2d'); c.imageSmoothingEnabled = true; c.drawImage(MI, 0, 0, K.mini.width, K.mini.height); }
        if (MI) g.drawImage(MI, camx * MI.width / M.w, camy * MI.height / M.h, (W / Z) * MI.width / M.w, (H / Z) * MI.height / M.h, 0, 0, W, H);
        else g.drawImage(K.art, camx * K.S, camy * K.S, (W / Z) * K.S, (H / Z) * K.S, 0, 0, W, H);
        const sx = (x) => (x - camx) * Z, sy = (y) => (y - camy) * Z, zk = Z / 2; // zk: escala do que mora no mundo (bonecos, portais, papéis)
        const zon = (x, y) => { g.save(); g.translate(x, y); g.scale(zk, zk); g.translate(-x, -y); }; // desenha em volta de (x,y) na escala do zoom
        const onS = (x, y, m = 40) => sx(x) > -m && sx(x) < W + m && sy(y) > -m && sy(y) < H + m;
        if (DEBUG) {
          g.fillStyle = 'rgba(255,0,0,.3)';
          const c0 = Math.floor(camx / M.cell), r0 = Math.floor(camy / M.cell);
          for (let cy = r0; cy < r0 + H / Z / M.cell + 1; cy++) for (let cx = c0; cx < c0 + W / Z / M.cell + 1; cx++) if (K.grid[cy * K.gw + cx]) g.fillRect(sx(cx * M.cell), sy(cy * M.cell), M.cell * Z, M.cell * Z);
          for (const [k, p] of Object.entries(K.pois)) txt(k, sx(p[0]), sy(p[1]), 8, '#ff0', 'center');
        }
        for (const [lx, ly, s] of M.labels || []) {
          if (!onS(lx, ly, 120)) continue;
          g.font = fnt(10); const w = g.measureText(tr(s)).width + 14;
          g.fillStyle = 'rgba(14,18,48,.72)'; rr(sx(lx) - w / 2, sy(ly) - 11, w, 22, 11); g.fill(); txt(s, sx(lx), sy(ly) - 7, 10, '#fff', 'center');
        }
        if (isHoje) for (const [era, [hx, hy]] of Object.entries(M.holes)) {
          if (!onS(hx, hy)) continue;
          const x = sx(hx), y = sy(hy), open = eraOpen(era), done = G.eras[era]?.done, p = 0.5 + 0.5 * Math.sin(tt * 3 + hx);
          const hp = ART(`assets/props/portal_${done ? 'concluido' : open ? 'aberto' : 'fechado'}.webp`);
          if (hp) { const h = 52 * zk, w = h * hp.width / hp.height; g.drawImage(hp, x - w / 2, y - h * 0.72, w, h); } else {
          zon(x, y);
          if (open) { g.fillStyle = done ? `rgba(255,210,80,${0.25 + p * 0.3})` : `rgba(80,170,255,${0.25 + p * 0.35})`; g.beginPath(); g.ellipse(x, y, 26 + p * 4, 13 + p * 2, 0, 0, 7); g.fill(); }
          g.fillStyle = '#4a3a2a'; g.beginPath(); g.ellipse(x, y, 22, 11, 0, 0, 7); g.fill();
          if (open) { g.fillStyle = '#0a0a18'; g.beginPath(); g.ellipse(x, y + 1, 17, 8, 0, 0, 7); g.fill(); }
          else { g.fillStyle = '#8a847a'; g.beginPath(); g.ellipse(x, y, 20, 10, 0, 0, 7); g.fill(); g.fillStyle = '#5a544c'; g.fillRect(x - 12, y - 1, 24, 2); }
          g.strokeStyle = '#2a1a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x - 28, y - 4); g.moveTo(x + 20, y + 4); g.lineTo(x + 27, y + 7); g.moveTo(x + 4, y - 11); g.lineTo(x + 7, y - 16); g.stroke();
          g.restore(); }
          const full = era === nextEra() || Math.hypot(P.x - hx, P.y - hy) < 90;
          txt(full ? eraTitle(era) : String(YEAR[era]), x, y + 16 * zk, 8, done ? '#ffd84a' : open ? '#bfe3ff' : '#aaa', 'center');
        }
        if (!isHoje && K.pois.portal) {
          const [px, py] = K.pois.portal, x = sx(px), y = sy(py), ok = M.exit || eraNeedMet(M.era), p = 0.5 + 0.5 * Math.sin(tt * 4);
          const pp = ART('assets/props/portal_era.webp');
          if (pp) { const h = 80 * zk, w = h * pp.width / pp.height; g.globalAlpha = ok ? 1 : 0.55; g.drawImage(pp, x - w / 2, y - h, w, h); g.globalAlpha = 1; } else {
          zon(x, y); g.fillStyle = ok ? `rgba(255,240,180,${0.5 + p * 0.4})` : 'rgba(180,200,255,.25)';
          g.beginPath(); g.ellipse(x, y - 16, ok ? 10 + p * 3 : 6, 22, 0, 0, 7); g.fill();
          g.fillStyle = ok ? '#fff' : 'rgba(255,255,255,.4)'; g.fillRect(x - 2, y - 36, 4, 40); g.restore(); }
          const by = y - 62 * zk - Math.abs(Math.sin(tt * 3)) * 6;
          g.font = fnt(10); const w = g.measureText(tr('PORTAL')).width + 14;
          g.fillStyle = ok ? 'rgba(120,60,10,.9)' : 'rgba(20,20,40,.8)'; g.fillRect(x - w / 2, by - 22, w, 18);
          txt('PORTAL', x, by - 18, 10, ok ? '#ffd84a' : '#bfe3ff', 'center');
          g.fillStyle = ok ? '#ffd84a' : '#bfe3ff'; g.beginPath(); g.moveTo(x - 7, by); g.lineTo(x + 7, by); g.lineTo(x, by + 8); g.fill();
        }
        for (const [k, p] of Object.entries(K.pois)) {
          if (!onS(p[0], p[1])) continue;
          if (k.startsWith('bateia') && !(dustAt[k] > tt)) { g.fillStyle = '#ffd84a'; for (let i = 0; i < 4; i++) g.fillRect(sx(p[0]) - 8 + i * 5, sy(p[1]) - 3 + Math.sin(tt * 6 + i) * 2, 3, 3); }
          if (k.startsWith('door_')) { g.fillStyle = `rgba(255,216,74,${0.4 + 0.3 * Math.sin(tt * 4)})`; g.fillRect(sx(p[0]) - 10, sy(p[1]) - 4, 20, 8); }
        }
        if (M.tour) for (const st of RAW.tour.stops) { const p = K.pois[st.id]; if (!p || !onS(p[0], p[1]) || (TGT?.label === st.name && !busy())) continue; const ok = G.flags.tour?.[st.id]; if (d2([P.x, P.y], p) > 330) continue; g.font = fnt(8); const w = g.measureText(tr(st.name)).width + 16; g.fillStyle = ok ? 'rgba(40,120,60,.9)' : 'rgba(40,58,150,.9)'; rr(sx(p[0]) - w / 2, sy(p[1]) - 40 * zk - 2, w, 20, 10); g.fill(); txt(st.name, sx(p[0]), sy(p[1]) - 40 * zk + 2, 8, '#fff', 'center'); } // só as placas perto do Buck, para o mapa respirar
        if (isHoje) for (const p of WD.pousos) {
          const [px, py] = pousoXY[p.id]; if (!onS(px, py)) continue;
          const x = sx(px), y = sy(py), ok = G.pousos.includes(p.id);
          const po = ART('assets/props/pouso.webp');
          if (po) { const h = 56 * zk, w = h * po.width / po.height; g.drawImage(po, x - w / 2, y - h, w, h); } else {
          zon(x, y); g.fillStyle = '#7a5532'; g.fillRect(x - 14, y - 14, 28, 14); g.fillStyle = ok ? '#c8a050' : '#8a7a5a'; g.beginPath(); g.moveTo(x - 18, y - 14); g.lineTo(x, y - 26); g.lineTo(x + 18, y - 14); g.fill();
          g.fillStyle = '#3a2a1a'; g.fillRect(x - 3, y - 8, 6, 8); g.restore(); }
          if (TGT?.label !== `pouso ${p.name}`) txt(ok ? 'POUSO' : 'POUSO ?', x, y - 40 * zk, 8, ok ? '#ffd84a' : '#cfd6ff', 'center');
        }
        for (const o of sidePicks()) {
          if (!onS(o.x, o.y)) continue;
          const x = sx(o.x), y = sy(o.y) - 6 + Math.sin(tt * 4 + o.i) * 3;
          g.fillStyle = 'rgba(155,227,106,.35)'; g.beginPath(); g.arc(x, y, 14 + Math.sin(tt * 3) * 2, 0, 7); g.fill();
          icon(missaoIcon(o), o.step.icon || (o.step.kind === 'route' ? '📍' : '✳'), x, y, 26);
        }
        for (const mi of M.minis || []) {
          if (!mi.at) continue;
          const p = K.pois[mi.at]; if (!p || !onS(p[0], p[1])) continue;
          const y = sy(p[1]) - 30 * zk - Math.abs(Math.sin(tt * 3)) * 5, locked = mi.act != null && !actOpen(mi.act);
          g.fillStyle = locked ? '#5a5a6a' : G.minis[mi.id] ? '#ffd84a' : '#ff5a5a'; g.beginPath(); g.arc(sx(p[0]), y, 11, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
          txt(G.minis[mi.id] ? '★' : '!', sx(p[0]), y - 5, 10, '#fff', 'center');
        }
        for (const [cid, [cx, cy]] of Object.entries(K.cardPos)) {
          if (G.cards.includes(cid) || !onS(cx, cy)) continue;
          const x = sx(cx), y = sy(cy) + Math.sin(tt * 4 + cx) * 3 * zk;
          const rp = ART('assets/props/relatorio.webp');
          if (rp) { g.fillStyle = 'rgba(255,230,120,.3)'; g.beginPath(); g.arc(x, y, (16 + Math.sin(tt * 3) * 2) * zk, 0, 7); g.fill(); const h = 34 * zk, w = h * rp.width / rp.height; g.drawImage(rp, x - w / 2, y - h / 2, w, h); } else {
          zon(x, y); g.fillStyle = 'rgba(255,230,120,.35)'; g.beginPath(); g.arc(x, y, 14 + Math.sin(tt * 3) * 2, 0, 7); g.fill();
          g.fillStyle = '#f2e6c0'; g.fillRect(x - 8, y - 10, 16, 20); g.fillStyle = '#c8b080'; g.fillRect(x - 10, y - 12, 20, 4); g.fillRect(x - 10, y + 8, 20, 4);
          g.fillStyle = '#8a6a3a'; g.fillRect(x - 5, y - 5, 10, 2); g.fillRect(x - 5, y, 10, 2); g.restore(); }
        }
        const UZ = Z * (ART(M.image) ? BONECO : 1); // no mapa pintado o boneco cresce, para combinar com as casas
        const ents = [
          { y: P.y, d: () => dude(sx(P.x), sy(P.y), buckPal(), P.ph, P.face, UZ, P.moving, { badge: G.flags.guia, flame: eggSwap > 0, t: tt }) },
          { y: mulaS.y, d: () => mula(sx(mulaS.x), sy(mulaS.y), mulaS.ph, mulaS.dir, UZ, mulaS.moving, tt, { flame: (0.4 + 0.15 * curAct()) + (FLAMEPULSE > 0 ? 0.7 : 0), flicker: curAct() >= 3 && !G.flags.guia, hat: G.flags.guia, stetson: eggSwap > 0 }) },
          ...npcs.filter((n) => n.away <= tt && onS(n.x, n.y)).map((n) => ({ y: n.y, d: () => {
            dude(sx(n.x), sy(n.y), PAL[n.pal || n.id] || PAL.turista, n.ph * 14, n.face, UZ, !!n.wander, { noHat: n.noHat });
            const sq = sideFor(n);
            const mk = (n.quest && !G.quests[n.quest]?.done) || (n.quiz && !G.flags.guia && quizOf(M.era).some((qid) => !G.qok.includes(qid))) ? '?' : sq ? (G.side[sq] ? '…' : '!') : n.lesson && !G.flags[`lsn_${id}_${n.id}`] ? 'i' : n.mini && !G.minis[n.mini] && !(((M.minis || []).find((x) => x.id === n.mini) || {}).act != null && !actOpen(((M.minis || []).find((x) => x.id === n.mini)).act)) ? '!' : n.talk && !G.ouviu.includes(`${id}:${n.id}`) ? 'i' : n.shop || vendorOpen(n) ? '$' : n.donate ? '✦' : '';
            if (mk) txt(mk, sx(n.x), sy(n.y) - 33 * UZ - 14 - Math.abs(Math.sin(tt * 3)) * 4, 12, '#ffd84a', 'center');
          } })),
          ...folkHere().filter((f) => onS(f.x, f.y)).map((f) => ({ y: f.y, d: () => { WD.drawFolk(g, f.id, sx(f.x), sy(f.y), tt, UZ); if (!G.bestiario.includes(f.id)) txt('?', sx(f.x), sy(f.y) - 35 * UZ - 14 - Math.abs(Math.sin(tt * 3)) * 4, 12, '#c070ff', 'center'); } })),
          ...witnesses.filter((w) => !w.mule && G.quests[w.quest] && !G.quests[w.quest].done && onS(w.x, w.y)).map((w) => ({ y: w.y, d: () => { dude(sx(w.x), sy(w.y), palOf(w.id), 0, 0, UZ, false); if (!G.quests[w.quest].heard.includes(w.wi)) txt('💬', sx(w.x), sy(w.y) - 35 * UZ - 16, 12, '#fff', 'center'); } })),
        ];
        if (COB) ents.push({ y: COB.y, d: () => {
          dude(sx(COB.x), sy(COB.y), PAL.cobrador, COB.ph, COB.face, UZ, true);
          if (COB.nap > 0) txt('Zz', sx(COB.x) + 10, sy(COB.y) - 33 * UZ - 14 - Math.sin(tt * 2) * 4, 12, '#cfd6ff', 'center');
          else if (G.dust > 0 && COB.state !== 'chase') { const fa = Math.atan2(COB.dir[1], COB.dir[0]); g.fillStyle = 'rgba(255,80,60,.14)'; g.beginPath(); g.moveTo(sx(COB.x), sy(COB.y) - 10 * Z); g.arc(sx(COB.x), sy(COB.y) - 10 * Z, 120 * Z, fa - 0.61, fa + 0.61); g.closePath(); g.fill(); }
          if (COB.state === 'chase') txt('!', sx(COB.x), sy(COB.y) - 32 * UZ - 14, 14, '#ff4a4a', 'center');
        } });
        ents.sort((a, b) => a.y - b.y).forEach((e) => e.d());
        const MT = ART(M.imageTop); // camada de cima do mapa pintado (telhados, copas): o Buck passa por baixo
        if (MT) g.drawImage(MT, camx * MT.width / M.w, camy * MT.height / M.h, (W / Z) * MT.width / M.w, (H / Z) * MT.height / M.h, 0, 0, W, H);
        for (const sc of SECRETS) if ((sc.map === id || sc.map === '*') && sc.draw) sc.draw(S, sx, sy, tt);
        if (TGT && !busy()) {
          const lb = TGT.label, bx = sx(TGT.x), by = sy(TGT.y) - 29 * Z * (ART(M.image) ? BONECO : 1) - 12;
          g.font = fnt(9); const w = g.measureText(tr(lb)).width + 40;
          g.fillStyle = 'rgba(14,20,64,.92)'; rr(bx - w / 2, by - 14, w, 28, 14); g.fill(); g.strokeStyle = '#ffd84a'; g.lineWidth = 2; rr(bx - w / 2, by - 14, w, 28, 14); g.stroke();
          g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(bx - w / 2 + 14, by, 9, 0, 7); g.fill(); plain(TOUCH ? 'A' : '␣', bx - w / 2 + 14, by - 6, 8, '#4a2a00', 'center');
          txt(lb, bx - w / 2 + 28, by - 7, 9, '#fff');
        }
        const gl = goal(), tg = gl.at;
        if (tg) {
          const x = sx(tg[0]), y = sy(tg[1]) - 25 * Z - 12 - Math.abs(Math.sin(tt * 4)) * 8;
          if (x > 20 && x < W - 20 && y > 80 && y < H - 70) {
            g.fillStyle = '#ffd84a'; g.strokeStyle = '#000'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(x - 12, y - 14); g.lineTo(x + 12, y - 14); g.lineTo(x, y + 4); g.closePath(); g.stroke(); g.fill();
          } else {
            const cx = W / 2, cy = H / 2, ang = Math.atan2(sy(tg[1]) - cy, sx(tg[0]) - cx);
            const ex = cx + Math.cos(ang) * (W / 2 - 70), ey = cy + Math.sin(ang) * (H / 2 - 90);
            g.save(); g.translate(ex, ey); g.rotate(ang); g.fillStyle = '#ffd84a'; g.strokeStyle = '#000'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(18, 0); g.lineTo(-10, -13); g.lineTo(-10, 13); g.closePath(); g.stroke(); g.fill(); g.restore();
            txt(`${Math.round(d2([P.x, P.y], tg))} ${isHoje ? 'km' : 'm'}`, ex, ey + 18, 10, '#fff', 'center');
          }
        }
        g.restore();
        if (isHoje && curAct() >= 3 && !G.flags.guia) { g.fillStyle = 'rgba(232,192,74,.08)'; g.fillRect(0, 0, W, H); lum(30, 140, 18, tt, 0.4); lum(W - 30, 300, 14, tt + 2, 0.35); }
        if (isHoje && G.flags.lumStay) lum(W - 210, 40, 16, tt, 0.6);
        const ls = wrap(gl.text, 360, 10), ex = sideTrack(), le = ex ? wrap(`Extra: ${ex}`, 360, 9) : [];
        box(10, 10, 400, 34 + ls.length * 16 + le.length * 14 + (le.length ? 4 : 0), 0.85); ttl('MISSÃO', 26, 19, 10, '#ffd84a'); ls.forEach((l, i) => txt(l, 26, 38 + i * 16, 10, '#fff'));
        le.forEach((l, i) => txt(l, 26, 42 + ls.length * 16 + i * 14, 9, '#9be36a'));
        const mw = K.mini.width, mh = K.mini.height, mx = W - mw - 14, my = 12;
        g.fillStyle = 'rgba(0,0,0,.35)'; rr(mx - 4, my, mw + 8, mh + 8, 12); g.fill();
        g.save(); rr(mx - 4, my - 4, mw + 8, mh + 8, 12); g.clip(); g.fillStyle = '#0a0a14'; g.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
        g.imageSmoothingEnabled = true; g.drawImage(K.mini, mx, my); g.drawImage(K.fog, mx, my); g.imageSmoothingEnabled = false; g.restore();
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2.5; rr(mx - 4, my - 4, mw + 8, mh + 8, 12); g.stroke();
        const ms = mw / M.w;
        if (tg && Math.floor(tt * 3) % 2) { g.fillStyle = '#ffd84a'; g.fillRect(mx + tg[0] * ms - 3, my + tg[1] * ms - 3, 6, 6); }
        if (G.items.includes('luneta')) {
          for (const n of npcs) if (sideFor(n) || (n.talk && !G.ouviu.includes(`${id}:${n.id}`))) { g.fillStyle = sideFor(n) ? '#ffd84a' : '#9ad8ff'; g.fillRect(mx + n.x * ms - 2, my + n.y * ms - 2, 4, 4); }
          for (const o of sidePicks()) { g.fillStyle = '#9be36a'; g.fillRect(mx + o.x * ms - 2, my + o.y * ms - 2, 4, 4); }
          for (const f of folkHere()) if (!G.bestiario.includes(f.id)) { g.fillStyle = '#c070ff'; g.fillRect(mx + f.x * ms - 2, my + f.y * ms - 2, 4, 4); }
        }
        if (buffOn('radar') && Math.floor(tt * 4) % 2) for (const [cid, p] of Object.entries(K.cardPos)) if (!G.cards.includes(cid)) { g.fillStyle = '#fff2a0'; g.fillRect(mx + p[0] * ms - 2, my + p[1] * ms - 2, 5, 5); }
        g.fillStyle = '#ff4a4a'; g.fillRect(mx + P.x * ms - 2, my + P.y * ms - 2, 5, 5);
        if (!isHoje) txt(M.title || '', mx + mw / 2, my + mh + 8, 8, '#fff', 'center');
        const items = G.items.filter((i) => ITEM(i).kind === 'util').map((i) => ITEM(i).icon).join('');
        box(10, H - 94, 150, 84, 0.85);
        for (const [k, glyph, val, y, col] of [['hud_relatorio', '★', `${G.cards.length}/${RAW.cards.length}`, H - 82, '#ffd84a'], ['hud_ouro', '$', `${G.gold}${G.dust ? `  ✨${G.dust}` : ''}`, H - 64, '#fff'], ['hud_brilho', '✦', `${G.brilho}`, H - 46, '#ffb030'], ['hud_segredo', '☆', `${G.secrets.length}/10`, H - 28, '#cfd6ff']]) {
          if (ASSET.has(`assets/icons/${k}.webp`)) { icon(k, '', 31, y + 7, 16); txt(val, 44, y, 10, col); } else txt(`${glyph} ${val}`, 24, y, 10, col);
        }
        if (BUFF && T < BUFF.until) txt(`${ITEM(BUFF.id).icon || '🪢'} ${Math.ceil(BUFF.until - T)} s`, 24, items ? H - 154 : H - 114, 10, '#ffb060');
        hud.book = [W - 76, 178, 62, 54]; box(...hud.book, 0.85); icon('hud_mochila', '🎒', hud.book[0] + 31, hud.book[1] + 27, 30);
        hud.zin = [W - 76, 240, 62, 40]; hud.zout = [W - 76, 286, 62, 40]; // zoom do mapa
        for (const [r, t, on] of [[hud.zin, '＋', zoomI() < ZOOMS.length - 1], [hud.zout, '－', zoomI() > zoomMin()]]) { box(...r, 0.85); txt(t, r[0] + 31, r[1] + 10, 16, on ? '#fff' : '#5a6aa0', 'center'); }
        if (items) { const us = G.items.filter((i) => ITEM(i).kind === 'util').slice(0, 6); box(10, H - 134, 150, 38, 0.85); us.forEach((i, k) => icon(i, ITEM(i).icon, 30 + k * 23, H - 115, 22)); }
        hud.timeline = drawTimeline(M.era, tt);
      },
      ctl: true,
      uiHit: (x, y) => inR(x, y, hud.timeline) || inR(x, y, hud.book) || inR(x, y, hud.zin) || inR(x, y, hud.zout),
      actLabel: () => TGT?.label || '',
      action() { act(); },
      tap(x, y) { // só os botões do HUD respondem a toque; andar e agir são joystick e botão A
        if (inR(x, y, hud.timeline)) { openTimeline(); return; }
        if (inR(x, y, hud.book)) { openInv(); return; }
        if (inR(x, y, hud.zin)) { zoomBy(1); return; }
        if (inR(x, y, hud.zout)) { zoomBy(-1); return; }
        if (DEBUG) console.log('mundo', Math.round(camx + x / Z), Math.round(camy + y / Z));
      },
      key(k) {
        if (k === 't' || k === 'T') openTimeline();
        if (k === 'c' || k === 'C') openBook(M.era);
        if (k === 'i' || k === 'I') openInv();
        if (k === '+' || k === '=') zoomBy(1);
        if (k === '-' || k === '_') zoomBy(-1);
        KONAMI.push(k); if (KONAMI.length > 8) KONAMI.shift();
        if (isHoje && KONAMI.join(',') === 'ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight') { KONAMI.length = 0; eggSwap = 30; secret('konami', [['mula', 'Nem fala nada.']]); }
      },
    };
  };

  // ================= minigames =================
  // Cada minigame é uma cena em minis.js: MINIS[id](api) → cena; api.win(prêmio) ou api.quit().
  function startMini(mid, fromMap) {
    const f = window.MINIS?.[mid];
    if (!f) { say([['mula', 'Esse desafio ainda está sendo construído.']]); return; }
    const back = () => go(() => OW(fromMap), null);
    const api = {
      W, H, g, txt, ttl, plain, pill, rr, box, wrap, tr, trf, say, ask, sfx, music, confetti, firework, img, bg, pixelImage, dude, mula, PAL, lum, lumBox, CARD, RAW, G, save, floatTxt, inR,
      won: !!G.minis[mid], keys: KEYS,
      shake: (s) => { SHAKE = s; },
      win(reward = {}) {
        const first = !G.minis[mid];
        G.minis[mid] = 1; save();
        if (first) giveGold(10); // todo minigame vencido paga +10 de ouro
        if (reward.dust) { G.dust += reward.dust; save(); }
        if (reward.item) giveItem(reward.item);
        if (!reward.serio) { sfx('win'); confetti(); } else sfx('sino');
        const finish = () => (reward.then ? reward.then(back) : back());
        if (reward.card && !G.cards.includes(reward.card)) setTimeout(() => giveCard(reward.card, finish), reward.serio ? 400 : 1000);
        else setTimeout(finish, reward.serio ? 900 : 1500);
      },
      quit: back,
      // Perdeu: 3 tentativas por partida. Esgotou (ou o minigame já conta vidas e mandou final), volta ao mapa e tenta quando quiser.
      tries: 1,
      lose(msg, final) {
        sfx('bad');
        if (!final && api.tries < 3) { api.tries++; say([['mula', `${msg} Tentativa ${api.tries} de 3.`]], () => go(() => Object.assign(f(api), { ctl: true, esc: back }), null)); return; }
        say([['narr', 'Você não conseguiu desta vez.'], ['narr', msg], ['mula', 'Volte ao desafio quando quiser e tente de novo.']], back);
      },
    };
    // arte do minigame (assets/minis/<mini>_<nome>.webp): spr desenha um objeto centrado; fundo troca o fundo. Sem arquivo, devolve false.
    const MA = (n) => ART(`assets/minis/${mid}_${n}.webp`);
    api.spr = (n, cx, cy, w, h, flip) => { // cabe na caixa sem deformar, ignorando a margem transparente da imagem
      const im = MA(n); if (!im) return false;
      const [bx, by, bw, bh] = trimBox(im), k = Math.min(w / bw, h / bh), dw = bw * k, dh = bh * k;
      g.save(); g.translate(cx, cy); if (flip) g.scale(-1, 1); g.imageSmoothingEnabled = true; g.drawImage(im, bx, by, bw, bh, -dw / 2, -dh / 2, dw, dh); g.restore(); return true;
    };
    api.has = (n) => !!MA(n);
    api.arte = (n) => MA(n); // a imagem crua (texturas: pergaminho, bagaço, serra…)
    api.fundo = (dark = 0) => { const im = MA('fundo'); if (!im) return false; pixelImage(im, 3, dark); return true; };
    api.bg = (src, k, dark, col) => { if (!api.fundo(dark)) bg(src, k, dark, col); };
    go(() => Object.assign(f(api), { ctl: true, esc: back }), null);
  }

  // ================= o dia: sequência, eventos do calendário e Pergunta do Sineiro (revisão espaçada) =================
  // Pergunta errada na sabatina volta no dia seguinte; acertou, volta em 3 e depois em 7 dias; três acertos e ela é sua.
  function daily(tries = 0) {
    if (DLG || ASK || PANEL || TR) { if (tries < 6) setTimeout(() => daily(tries + 1), 1500); return; }
    const hoje = dateKey(new Date()), L = [];
    if (G.dia !== hoje) {
      G.streak = G.dia === addDias(hoje, -1) ? (G.streak || 0) + 1 : 1; G.dia = hoje; save();
      const ev = WD.event(new Date()); if (ev) { banner(ev.name); L.push([ev.serio ? 'narr' : 'sineiro', ev.text]); }
      if (G.streak === 3) { addItem('rapadura', 2); L.push(['sineiro', 'Três dias seguidos por aqui! Toma duas rapaduras.']); }
      if (G.streak === 7 && !G.chapeus.includes('palha')) { addItem('palha'); L.push(['sineiro', 'Uma semana inteira! Ganhou um chapéu de palha: está na mochila.']); }
    }
    const due = Object.entries(G.qerr).filter(([, v]) => v.due <= hoje).map(([k]) => k);
    const q = G.flags.revDia !== hoje && due.length ? RAW.quizzes.find((x) => x.id === due[0]) : null;
    const next = () => { if (q) review(q, hoje); };
    if (L.length) say(L, next); else next();
  }
  function review(q, hoje) {
    G.flags.revDia = hoje; save();
    const opts = q.type === 'multiple' ? q.options.map((t, j) => ({ t, ok: j === q.answer })) : [{ t: 'É fato', ok: q.answer === 'fato' }, { t: 'É lenda', ok: q.answer === 'lenda' }];
    const order = q.type === 'multiple' ? opts.map((o, j) => [hash(q.id + j + hoje), o]).sort((a, b) => a[0] - b[0]).map((x) => x[1]) : opts;
    sfx('sino');
    say([['sineiro', 'Dlém! Pergunta do Sineiro: uma que você errou. Quem lembra no dia seguinte, lembra para sempre.']], () => ask(q.prompt, order.map((o) => o.t), (k) => {
      const r = G.qerr[q.id] || { b: 0 };
      if (order[k].ok) {
        r.b = (r.b || 0) + 1; if (r.b >= 3) delete G.qerr[q.id]; else { r.due = addDias(hoje, [1, 3, 7][r.b]); G.qerr[q.id] = r; } save(); sfx('ok');
        say([['sineiro', r.b >= 3 ? 'Isso! Essa agora é sua para sempre.' : 'Isso! Daqui a uns dias eu pergunto de novo.']], () => { giveGold(10); giveBrilho(3, 'memória'); });
      } else { r.b = 0; r.due = addDias(hoje, 1); G.qerr[q.id] = r; save(); sfx('bad'); say([['sineiro', `Ainda não. ${q.explain}`], ['sineiro', 'Amanhã eu pergunto de novo.']]); }
    }));
  }

  // ================= segredos (easter eggs) =================
  let FLASH = 0, SUNDIAL = null;
  const SECRETS = [
    { id: 'sete', map: 'hoje', tap(S, wx, wy) {
      const c = S.K.pois.chafariz; if (Math.hypot(wx - c[0], wy - c[1]) > 22 || Math.hypot(S.P.x - c[0], S.P.y - c[1]) > 50) return false;
      if (G.flags.ending && !G.secrets.includes('dez')) { epilogue(); return true; }
      G.flags.goles = (G.flags.goles || 0) + 1; sfx('hop'); floatTxt(`gole ${G.flags.goles}`, '#9ad8ff');
      if (G.flags.goles >= 7) { G.flags.goles = 0; SHAKE = 0.6; FLASH = 2.2; sfx('flash'); secret('sete', [['buck', '...did I just see myself in a glass box?'], ['mula', 'Bebe menos.']]); }
      return true;
    } },
    { id: 'sol', map: 'hoje', tap(S, wx, wy) {
      const c = S.K.pois.mirante; if (Math.hypot(wx - c[0], wy - (c[1] - 14)) > 22) return false;
      G.flags.solN = (G.flags.solN || 0) + 1; sfx('tap');
      if (G.flags.solN >= 7) {
        G.flags.solN = 0;
        const d = new Date(), h = d.getHours() + d.getMinutes() / 60, sun = h >= 6 && h <= 18, hm = d.toTimeString().slice(0, 5);
        SUNDIAL = { h, sun, hm, t: 6 };
        if (sun) secret('sol', [['sineiro', `Relógio de sol da Matriz, 1785. A sombra diz: ${hm}.`]]); else say([['mula', 'Sem sol, sem relógio. Volta amanhã.']]);
      }
      return true;
    } },
    { id: 'abril', map: 'hoje', check(S) {
      const d = new Date(), p = S.K.pois.estatua; if (!p || d.getDate() !== 21 || d.getMonth() !== 3) return;
      if (Math.hypot(S.P.x - p[0], S.P.y - p[1]) < 30 && !S.near.abril) { S.near.abril = 1; sfx('sino'); secret('abril', [['sineiro', 'Hoje é 21 de abril. Flores aos pés dele, e o sino toca. Feriado desde a República, que fez dele herói.']]); }
    }, draw(S, sx, sy) { const d = new Date(), p = S.K.pois.estatua; if (p && d.getDate() === 21 && d.getMonth() === 3) { g.fillStyle = '#ff6a9a'; for (let i = 0; i < 6; i++) g.fillRect(sx(p[0]) - 12 + i * 4, sy(p[1]) + 4, 3, 3); } } },
    { id: 'transmissao', map: '*', check(S) {
      if (S.id === 'hoje' || curAct() < 1 || G.secrets.includes('transmissao') || DLG) return;
      if (S.P.still > 60) { S.P.still = 0; FLAMEPULSE = 3; secret('transmissao', [['lum', 'Observador. Status?'], ['narr', 'Buck olha para a Mula.'], ['mula', 'Spam.']]); }
    } },
    { id: 'foto', map: 'renascimento', check(S) {
      const y = S.npcs.find((n) => n.id === 'yves'); if (!y || G.secrets.includes('foto') || DLG) return;
      if (Math.hypot(S.P.x - y.x, S.P.y - y.y) < 60 && S.P.still > 5) {
        S.P.still = 0; FLASH = 0.8; sfx('flash');
        setTimeout(() => { try { const a = document.createElement('a'); a.download = 'relogio-de-sol-1972.png'; a.href = cv.toDataURL('image/png'); a.click(); } catch { /* sem download */ } }, 60);
        secret('foto', [['yves', 'Smile, cowboy! For the archive.'], ['mula', 'Agora você é patrimônio.']]);
      }
    } },
    { id: 'moleque', map: 'tiradentes', check(S) {
      const p = S.K.pois.T5; if (!p || G.secrets.includes('moleque') || DLG) return;
      if (Math.hypot(S.P.x - p[0], S.P.y - p[1]) < 90 && S.P.steps >= 30) {
        S.P.steps = 0; SHAKE = 0.3; const e = RAW.expressions.find((x) => x.id === 'EXP-pe-moleque-calcada');
        secret('moleque', [['narr', `${tr(e?.phrase)}: ${tr(e?.legend)}`], ['narr', `Realidade: ${e?.reality}`], ['buck', 'Whoa— these rocks got opinions.']]);
      }
    } },
  ];
  function drawFlash(dt) {
    if (FLASH > 0) {
      FLASH -= dt;
      g.globalAlpha = Math.min(1, FLASH);
      if (FLASH > 0.9) { g.fillStyle = '#1a1206'; g.fillRect(0, 0, W, H); for (let k = 0; k < 5; k++) { g.strokeStyle = '#e8c04a'; g.strokeRect(120 + k * 150, 120, 110, 260); dude(175 + k * 150, 360, k === 2 ? PAL.buck : { skin: '#555', shirt: '#444', pants: '#333', hair: '#222' }, 0, k === 2 ? 1 : 0, 6, false); } g.fillStyle = 'rgba(232,192,74,.25)'; g.fillRect(0, 0, W, H); }
      else { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
      g.globalAlpha = 1;
    }
    if (SUNDIAL) {
      SUNDIAL.t -= dt; if (SUNDIAL.t <= 0) { SUNDIAL = null; return; }
      box(W / 2 - 120, 90, 240, 160, 0.92);
      g.fillStyle = '#e8dcb0'; g.beginPath(); g.arc(W / 2, 230, 90, Math.PI, 0); g.fill();
      for (let k = -6; k <= 6; k++) { const an = Math.PI * 1.5 + k * Math.PI / 12; g.fillStyle = '#5a4a2a'; g.fillRect(W / 2 + Math.cos(an) * 80 - 1, 230 + Math.sin(an) * 80 - 1, 3, 3); }
      if (SUNDIAL.sun) { const an = Math.PI * 1.5 + (SUNDIAL.h - 12) * Math.PI / 12; g.strokeStyle = '#2a2a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2, 230); g.lineTo(W / 2 + Math.cos(an) * 85, 230 + Math.sin(an) * 85); g.stroke(); }
      txt(SUNDIAL.hm, W / 2, 104, 12, '#ffd84a', 'center');
    }
  }

  // ================= final, créditos e epílogo =================
  function startEnding() {
    say([['sineiro', 'Chegou a hora do seu relatório final, forasteiro. Olha pra baixo.']], () => {
      sfx('sino');
      const fim = () => setScene(Credits());
      const after = () => {
        G.flags.ending = 1; G.flags.guia = 1; save();
        if ((G.brilho || 0) >= BRILHO_FINAL) say([['lum', 'Observador. Medição final.'], ['lum', `Ouro reunido: ${G.gold + (G.doado || 0)}. Brilho: ${G.brilho}.`], ['lum', 'O ouro é puro porque não se mistura com nada. Você brilhou porque se misturou com tudo.'], ['buck', 'That\'s the nicest thing a hexagon ever said to me.']], fim);
        else say([['lum', `Observador. Ouro reunido: ${G.gold + (G.doado || 0)}. Brilho: ${G.brilho}.`], ['lum', 'Medição incompleta.'], ['mula', 'Dá para continuar olhando, sabe. O Modo Guia fica aberto, e o brilho também.']], fim);
      };
      if (window.END_CLIPS) go(() => Cutscene(window.END_CLIPS, after), null);
      else go(() => EndingB(after), null);
    });
  }
  // Plano B do desfecho (sem vídeo): as mesmas falas sobre o mirante pintado.
  const EndingB = (after) => ({
    t: 0,
    enter() { music('cosmos'); say([['buck', 'Final report.'], ['buck', 'The gold\'s gone. Been gone two hundred years.'], ['buck', 'But they\'re still looking. Tourists, kids, couples on the bridge. And it still shines.'], ['lum', 'Relatório aceito. Fonte: ...desconhecida.'], ['buck', 'It\'s called a story.'], ['buck', 'Folks, like Columbus, I never ask for directions. Good thing I don\'t need \'em anymore.'], ['narr', 'Ele ficou.']], after); },
    update(dt) { this.t += dt; },
    draw() { bg('assets/img/scenes/mirante.webp', 3, 0.25); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,220,120,${0.3 + 0.3 * Math.sin(this.t * 2 + i)})`; g.fillRect((i * 97) % W, H - ((this.t * 30 + i * 37) % H), 3, 3); } for (let k = 0; k < Math.min(14, this.t * 1.5); k++) lum(80 + (k * 173) % (W - 160), 60 + (k * 59) % 140, 14 + (k % 3) * 6, this.t + k, 0.6); },
  });
  const Credits = () => ({
    t: 0,
    enter() { music('hoje'); firework(W / 3, 200); firework(2 * W / 3, 180); },
    update(dt) { this.t += dt; if (Math.random() < dt * 0.8) firework(Math.random() * W, 100 + Math.random() * 200); },
    draw() {
      bg('assets/img/scenes/mirante.webp', 3, 0.6);
      const lines = ['Relógio de Sol', 'fim do relatório', '', `Relatórios: ${G.cards.length}/${RAW.cards.length}`, `Segredos: ★ ${G.secrets.length}/10`, `Desafios vencidos: ${Object.keys(G.minis).length}`, `Eras visitadas: ${ERAS.filter((e) => G.eras[e.id]?.visited).length}/11`, `Tempo de jogo: ${Math.round(G.played / 60)} min`, '', 'Ideia e conteúdo: Luis, guia em Tiradentes', 'Motor, roteiro e arte: Claude + Google Flow', '', 'Modo Guia liberado.', 'toque para voltar ao Brasil'];
      lines.forEach((l, i) => txt(l, W / 2, H - this.t * 40 + i * 34, i === 0 ? 24 : 12, i === 0 ? '#ffd84a' : '#fff', 'center'));
    },
    tap() { if (this.t > 2) go(() => OW('hoje', window.MAPS.hoje.pois.mirante), 'Brasil · Hoje · Modo Guia'); },
  });
  function epilogue() {
    say([['lum', 'Observador. Você não voltou.'], ['buck', 'Nope.'], ['lum', 'Por quê?'], ['buck', 'Because someone has to keep looking. That\'s where the shine is.']], () => { G.flags.lumStay = 1; save(); secret('dez'); });
  }

  // ================= entrada =================
  const inR = (x, y, r) => r && x >= r[0] && y >= r[1] && x <= r[0] + r[2] && y <= r[1] + r[3];
  function toLogical(e) {
    const r = cv.getBoundingClientRect();
    if (!ROT) return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
    return [(e.clientY - r.top) / r.height * W, (r.right - e.clientX) / r.width * H];
  }
  // Celular: nada de tocar no mundo. Polegar esquerdo = joystick (arrasta), polegar direito = botão A (faz o que
  // estiver perto: falar, entrar, pegar, passar o diálogo). No teclado: setas/WASD e Espaço, Enter ou E.
  // Cenas com scene.ctl usam esse esquema; telas simples (título, créditos) seguem com toque.
  let DOWN = false;
  const JOY = { id: null, bx: 0, by: 0, x: 0, y: 0 }, JR = 60;
  const BTN = { x: W - 100, y: H - 104, r: 56, id: null, t: 0 };
  const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  let JDIR = '';
  function action() {
    audio();
    if (TR) return;
    if (PANEL?.kind === 'inv') { invUse(PANEL.sel); return; }
    if (PANEL) { if (PANEL.kind === 'card') closePanel(); return; } // teclado: Espaço fecha o relatório; nas outras janelas, Esc
    if (ASK) { askPick(ASK.sel); return; }
    if (DLG) { dlgTap(); return; }
    if (scene.action) scene.action(); else scene.tap?.(W / 2, H / 2);
  }
  // uma "tecla" de direção (do teclado ou do joystick ao virar): navega perguntas, o caderno, ou vai para a cena
  function dirKey(k) {
    if (ASK) { const n = ASK.opts.length, two = n >= 4; const step = { ArrowUp: two ? -2 : -1, ArrowDown: two ? 2 : 1, ArrowLeft: two ? -1 : 0, ArrowRight: two ? 1 : 0 }[k] || 0; ASK.sel = (ASK.sel + step + n) % n; sfx('bip'); return; }
    if (PANEL?.kind === 'inv') {
      const P = PANEL, n = P.rects.length || 1, pages = Math.ceil(invEntries().length / PER);
      if (k === 'ArrowLeft' || k === 'ArrowRight') { P.tab = (P.tab + (k === 'ArrowLeft' ? 2 : 1)) % 3; P.sel = 0; P.page = 0; }
      if (k === 'ArrowUp') { if (P.sel === 0 && P.page > 0) { P.page--; P.sel = PER - 1; } else P.sel = (P.sel + n - 1) % n; }
      if (k === 'ArrowDown') { if (P.sel === n - 1 && P.page < pages - 1) { P.page++; P.sel = 0; } else P.sel = (P.sel + 1) % n; }
      sfx('bip'); return;
    }
    if (PANEL) { if (PANEL.kind === 'book' && (k === 'ArrowLeft' || k === 'ArrowRight')) PANEL.i = (PANEL.i + (k === 'ArrowLeft' ? ORDER.length - 1 : 1)) % ORDER.length; return; }
    if (DLG) return;
    scene.key?.(k);
  }
  function joySet(x, y) {
    const dx = x - JOY.bx, dy = y - JOY.by, d = Math.hypot(dx, dy), k = d > JR ? JR / d : 1;
    JOY.x = dx * k / JR; JOY.y = dy * k / JR;
    const m = Math.hypot(JOY.x, JOY.y) >= 0.4;
    KEYS.ArrowLeft = m && JOY.x < -0.38; KEYS.ArrowRight = m && JOY.x > 0.38; KEYS.ArrowUp = m && JOY.y < -0.38; KEYS.ArrowDown = m && JOY.y > 0.38;
    const dir = !m ? '' : Math.abs(JOY.x) > Math.abs(JOY.y) ? (JOY.x > 0 ? 'ArrowRight' : 'ArrowLeft') : (JOY.y > 0 ? 'ArrowDown' : 'ArrowUp');
    if (dir && dir !== JDIR) dirKey(dir);
    JDIR = dir;
  }
  function joyEnd() { JOY.id = null; JOY.x = JOY.y = 0; JDIR = ''; for (const k of ARROWS) KEYS[k] = false; }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    audio();
    if (e.pointerType === 'touch') TOUCH = true;
    if (TR) return;
    const [x, y] = toLogical(e);
    const HB = hbRects();
    if (inR(x, y, HB.snd)) { setMute(!muted); return; }
    if (inR(x, y, HB.fs)) { toggleFS(); return; }
    const ctl = TOUCH && scene.ctl;
    if (ctl && !DLG && !ASK && !PANEL && Math.hypot(x - BTN.x, y - BTN.y) < BTN.r + 16) { BTN.id = e.pointerId; BTN.t = 0.18; action(); return; }
    if (PANEL) { panelTap(x, y); return; }
    if (ASK) { const i = ASK.rects.findIndex((r) => inR(x, y, r)); if (i >= 0) askPick(i); return; }
    if (DLG) { if (DLG.btn && Math.hypot(x - DLG.btn[0], y - DLG.btn[1]) < DLG.btn[2]) dlgTap(); return; }
    if (ctl && x < W * 0.55 && !scene.uiHit?.(x, y)) { JOY.id = e.pointerId; JOY.bx = x; JOY.by = y; joySet(x, y); return; }
    DOWN = true;
    scene.tap?.(x, y);
    scene.down?.(x, y);
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerId === JOY.id) { const [x, y] = toLogical(e); joySet(x, y); return; }
    if (!DOWN || !scene.drag) return; const [x, y] = toLogical(e); scene.drag(x, y);
  });
  const lift = (e) => {
    if (e.pointerId === JOY.id) { joyEnd(); return; }
    if (e.pointerId === BTN.id) { BTN.id = null; scene.actionUp?.(); return; }
    if (!DOWN) return; DOWN = false; const [x, y] = toLogical(e); scene.up?.(x, y);
  };
  addEventListener('pointerup', lift);
  addEventListener('pointercancel', lift);
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.repeat && !ARROWS.includes(e.key)) return;
    KEYS[e.key] = true;
    if (e.key === 'm' || e.key === 'M') { audio(); setMute(!muted); return; }
    if (e.key === 'Escape') { if (DLG || ASK) return; if (PANEL) closePanel(); else scene.esc?.(); return; }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') { action(); return; }
    const wasd = { w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight' }[e.key];
    if (ARROWS.includes(e.key) || wasd) { if (!e.repeat) dirKey(e.key.startsWith('Arrow') ? e.key : wasd); return; }
    if (ASK) { const n = '123456789'.indexOf(e.key), l = 'abcd'.indexOf(e.key.toLowerCase()); askPick(n >= 0 ? n : l); return; }
    if (DLG || PANEL) return;
    scene.key?.(e.key);
  });
  addEventListener('keyup', (e) => { KEYS[e.key] = false; if (e.key === ' ' || e.key === 'Enter' || e.key === 'e') scene.actionUp?.(); scene.keyup?.(e.key); });
  addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; joyEnd(); });
  // desenho dos controles de toque (por cima de tudo, menos da transição)
  // som e tela cheia: ao lado do minimapa no mundo, ao lado do SAIR nos minigames, no alto nas outras telas
  function hbRects() {
    const r = scene.S ? [W - 222, 12, 40, 40] : scene.ctl ? [W - 158, 72, 40, 30] : [W - 56, 12, 40, 40];
    return { fs: r, snd: [r[0] - 46, r[1], r[2], r[3]] };
  }
  function drawHB() {
    const R = hbRects();
    for (const [k, r] of Object.entries(R)) {
      box(...r, 0.85);
      const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
      g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 2;
      if (k === 'fs') { for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(cx + sx2 * 10, cy + sy2 * 4); g.lineTo(cx + sx2 * 10, cy + sy2 * 10); g.lineTo(cx + sx2 * 4, cy + sy2 * 10); g.stroke(); } }
      else { g.fillRect(cx - 9, cy - 4, 6, 8); g.beginPath(); g.moveTo(cx - 3, cy - 4); g.lineTo(cx + 4, cy - 10); g.lineTo(cx + 4, cy + 10); g.lineTo(cx - 3, cy + 4); g.closePath(); g.fill(); if (muted) { g.strokeStyle = '#ff5a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 12, cy - 12); g.lineTo(cx + 12, cy + 12); g.stroke(); } else { g.beginPath(); g.arc(cx + 5, cy, 7, -0.8, 0.8); g.stroke(); } }
    }
  }
  function drawCtl(dt) {
    if (!TOUCH || !scene.ctl || DLG || ASK || PANEL) return; // com diálogo ou janela na tela, só os botões dela (▶ ou FECHAR)
    const on = JOY.id != null, bx = on ? JOY.bx : 120, by = on ? JOY.by : H - 120;
    g.globalAlpha = on ? 0.55 : 0.28;
    g.fillStyle = 'rgba(14,20,60,.9)'; g.beginPath(); g.arc(bx, by, JR, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = '#fff'; for (const [ax, ay, r] of [[0, -1, 0], [0, 1, Math.PI], [-1, 0, -Math.PI / 2], [1, 0, Math.PI / 2]]) { g.save(); g.translate(bx + ax * 44, by + ay * 44); g.rotate(r); g.beginPath(); g.moveTo(0, -7); g.lineTo(7, 5); g.lineTo(-7, 5); g.closePath(); g.fill(); g.restore(); }
    { const kx = bx + JOY.x * JR, ky = by + JOY.y * JR, gr = g.createRadialGradient(kx - 6, ky - 8, 4, kx, ky, 26); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#9aa8e8'); g.beginPath(); g.arc(kx, ky, 24, 0, 7); g.fillStyle = gr; g.fill(); }
    g.globalAlpha = 1;
    if (BTN.t > 0) BTN.t -= dt;
    const live = scene.actLabel?.();
    const pr = BTN.t > 0 ? 0.9 : live ? 1 + 0.06 * Math.sin(performance.now() / 160) : 1;
    g.globalAlpha = live ? 0.95 : 0.45;
    { const R0 = BTN.r * pr; g.fillStyle = '#9a6a00'; g.beginPath(); g.arc(BTN.x, BTN.y + 5, R0, 0, 7); g.fill();
      const gr = g.createLinearGradient(0, BTN.y - R0, 0, BTN.y + R0); gr.addColorStop(0, '#ffe680'); gr.addColorStop(1, '#f5a800');
      g.fillStyle = gr; g.beginPath(); g.arc(BTN.x, BTN.y, R0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(BTN.x, BTN.y - R0 * 0.45, R0 * 0.62, R0 * 0.3, 0, 0, 7); g.fill(); }
    plain('A', BTN.x, BTN.y - 22, 24, '#4a2a00', 'center');
    const lb = scene.actLabel?.() || '';
    if (lb) { const lt = tr(lb); plain(lt.length > 16 ? lt.slice(0, 15) + '…' : lt, BTN.x, BTN.y + 12, 8, '#4a2a00', 'center'); }
    g.globalAlpha = 1;
  }

  // ================= laço =================
  let last = performance.now(), T = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; T += dt;
    if (!TEST) requestAnimationFrame(frame); // agenda antes: um erro num quadro não congela o jogo
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.imageSmoothingQuality = 'high';
    try {
      scene.update?.(dt);
      scene.draw(dt);
      drawParts(dt);
      drawFly(dt);
      drawFlash(dt);
      if (PANEL) drawPanel();
      if (ASK) drawAsk();
      if (DLG) drawDlg(dt, T);
      drawCtl(dt);
      drawHB();
      if (BANNER && !PANEL) drawBanner(dt);
      if (TR) drawTR(dt);
    } catch (err) { if (frame.errs !== String(err)) console.error(err); frame.errs = String(err); }
  }
  const guia = (id, S = 1) => { const M = window.MAPS[id], { art, mask } = paintDraft(M, S), c = document.createElement('canvas'); c.width = mask.width; c.height = mask.height; c.getContext('2d').putImageData(mask, 0, 0); const K = loadMap(id); return { art: art.toDataURL('image/png'), mask: c.toDataURL('image/png'), w: M.w, h: M.h, pois: K.pois, labels: M.labels || [], holes: M.holes || {} }; };
  window.ENG = { guia, scene: () => scene, dlg: () => DLG, askOpen: () => ASK, panel: () => PANEL, dlgTap: () => DLG && dlgTap(), askPick: (i) => askPick(i), panelClose: () => { const P = PANEL; PANEL = null; P?.done?.(); }, G, go, say, confetti, firework, loadMap, OW: (id, at) => OW(id, at), giveCard, giveGold, giveItem, startMini, secret, ACTS, actOpen, curAct, sfx, floatTxt, setScene };
  // Versão nova publicada: o service worker baixa por trás e, quando assume, o jogo recarrega sozinho na próxima
  // troca de tela (o progresso já está salvo), ou na hora, se estiver no título. Ao voltar do segundo plano, procura versão nova.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !TEST) {
    const hadSW = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadSW) return; UPDATE = true; if (scene.isTitle) location.reload(); });
    navigator.serviceWorker.register('sw.js').then((reg) => addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); })).catch(() => {});
  }
  (document.fonts ? Promise.all([document.fonts.load(`20px ${FONT_T}`), document.fonts.load(`800 20px ${FONT_B}`)]) : Promise.resolve()).catch(() => {}).finally(() => {
    const q = /[?&]era=(\w+)/.exec(location.search), mq = /[?&]mini=(\w+)/.exec(location.search);
    if (q || mq) { G.flags.intro = 1; G.flags.tut0 = 1; G.flags.tut1 = 1; }
    if (mq) { setScene(OW(q?.[1] || 'hoje')); setTimeout(() => startMini(mq[1], q?.[1] || 'hoje'), 200); }
    else setScene(q && window.MAPS[q[1]] ? OW(q[1]) : ((TEST || /[?&]lang=/.test(location.search)) && !/[?&]flags=1/.test(location.search)) ? Title() : Lang()); // as bandeiras abrem o jogo (?test=1 ou ?lang= da landing pulam, &flags=1 mostra)
    if (TEST) setInterval(() => frame(performance.now()), 16); else requestAnimationFrame(frame);
  });
})();
