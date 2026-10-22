// Relógio de Sol v2 — motor em canvas puro (sem módulos, sem dependências; abre até por file://).
// Arquitetura inspirada em "As Aventuras de Arthur": canvas 960×540, mundo com zoom 2×, tap-para-andar
// com A*, diálogo SNES com retrato, mosaico nas transições. Tempo real: nada de rodadas nem relógio de jogo.
// Conteúdo histórico vem de content.data.js (gerado de data/*.json). Aqui só motor, roteiro e regras.
'use strict';
(() => {
  const W = 960, H = 540, Z = 2;
  const FONT = '"Press Start 2P", monospace';
  const app = document.getElementById('app');
  const cv = document.getElementById('c');
  const g = cv.getContext('2d');
  const vid = document.getElementById('vid');
  const DEBUG = /[?&]debug=1/.test(location.search);
  const TEST = /[?&]test=1/.test(location.search); // testes automáticos: laço por timer (painel em segundo plano não pinta)

  // ================= conteúdo =================
  const RAW = window.CONTENT_RAW;
  const CARD = Object.fromEntries(RAW.cards.map((c) => [c.id, c]));
  const CHARS = Object.fromEntries(RAW.chars.map((c) => [c.id, c]));
  const ERAS = RAW.eras;
  const ERA = Object.fromEntries(ERAS.map((e) => [e.id, e]));
  // Personagens novos (só do v2): nome da plaquinha; retrato em img/p_<id>.png quando existir.
  const EXTRA = { paraguacu: 'Paraguaçu', nassau: 'Maurício de Nassau', fernao: 'Fernão Dias', vigia: 'O vigia', zumbi: 'Zumbi', yves: 'Yves Alves', louie: 'Louie', aprendiz: 'O aprendiz', caminha: 'Pero Vaz de Caminha', fundidor: 'O fundidor', turista: 'Turista', colombo: 'Colombo', cortesao: 'O cortesão', feitor: 'O feitor', frans: 'Frans Post', capitao: 'Capitão holandês', velho: 'Um velho morador', guia: 'Guia' };
  const nameOf = (id) => CHARS[id]?.name || EXTRA[id] || (id && id.includes(' ') ? id : ''); // testemunhas sem ficha: o nome é o próprio id
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
  const NEW = () => ({ v: 2, era: 'hoje', pos: {}, gold: 0, dust: 0, cards: [], items: [], eras: { prologo: { visited: true } }, quests: {}, secrets: [], minis: {}, flags: {}, fog: {}, qok: [], played: 0 });
  let G;
  try { G = { ...NEW(), ...JSON.parse(localStorage[SAVE] || '{}') }; } catch { G = NEW(); }
  // Migração do v1: as pistas vistas no caderno antigo viram relatórios.
  if (!G.flags.migrated) {
    G.flags.migrated = 1;
    try { const v1 = JSON.parse(localStorage['relogio-de-sol'] || '{}'); const seen = (v1.seen || []).filter((id) => CARD[id]); if (seen.length) { G.cards = [...new Set([...G.cards, ...seen])]; G.flags.migratedN = seen.length; } } catch { /* sem v1 */ }
  }
  const save = () => { try { localStorage[SAVE] = JSON.stringify(G); } catch { /* sem armazenamento: joga sem salvar */ } };

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
  const eraTitle = (era) => `${YEAR[era]} - ${ERA[era].name}`;
  // Concluir uma era: todos os relatórios do chão -> todas as perguntas -> o minigame.
  const groundOf = (era) => eraCards(era).filter((c) => !REWARD.has(c.id)).map((c) => c.id);
  const quizOf = (era) => RAW.quizzes.filter((q) => CARD[q.cardId]?.era === era).map((q) => q.id);
  const needOf = (era) => { const gr = groundOf(era), qz = quizOf(era); return { cards: gr.length, got: gr.filter((id) => G.cards.includes(id)).length, quiz: qz.length, ok: qz.filter((id) => G.qok.includes(id)).length, mini: window.MAPS[era]?.needMini || null }; };
  const eraNeedMet = (era) => { const n = needOf(era); return n.got >= n.cards && n.ok >= n.quiz && (!n.mini || !!G.minis[n.mini]); };
  const finalOpen = () => SEQ.every(eraDone);
  // Perdeu o minigame da era: a fase inteira volta do começo.
  function resetEra(era) {
    const qz = quizOf(era);
    G.cards = G.cards.filter((id) => CARD[id]?.era !== era);
    G.qok = G.qok.filter((id) => !qz.includes(id));
    for (const mi of window.MAPS[era]?.minis || []) delete G.minis[mi.id];
    G.eras[era] = { ...(G.eras[era] || {}), done: false };
    delete G.pos[era]; save();
  }

  // ================= tela: encaixe e rotação =================
  let ROT = false;
  function fit() {
    const vw = innerWidth, vh = innerHeight;
    ROT = vh > vw; // celular em pé: o jogo gira e continua paisagem
    const s = ROT ? Math.min(vh / W, vw / H) : Math.min(vw / W, vh / H);
    app.style.transform = `translate(-50%,-50%) ${ROT ? 'rotate(90deg) ' : ''}scale(${s})`;
  }
  addEventListener('resize', fit);
  fit();
  document.getElementById('fs').onclick = () => {
    const el = document.documentElement;
    (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.())?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  };

  // ================= imagens =================
  const IMG = {};
  const img = (src) => {
    if (!IMG[src]) { IMG[src] = new Image(); IMG[src].src = src; }
    return IMG[src].complete && IMG[src].naturalWidth ? IMG[src] : null;
  };

  // ================= áudio (chiptune por WebAudio) =================
  let AC = null, MASTER = null, muted = !!G.flags.muted;
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
  const sndBtn = document.getElementById('snd');
  const setMute = (m) => { muted = m; G.flags.muted = m; save(); if (MASTER) MASTER.gain.value = m ? 0 : 0.5; sndBtn.textContent = m ? '×' : '♪'; vid.muted = m; BGM.muted = m; };
  sndBtn.onclick = () => { audio(); setMute(!muted); };
  setMute(muted);

  // ================= desenho básico =================
  function txt(s, x, y, size = 16, col = '#fff', align = 'left') {
    g.font = `${size}px ${FONT}`; g.textAlign = align; g.textBaseline = 'top';
    g.fillStyle = '#000'; g.fillText(s, x + 2, y + 2);
    g.fillStyle = col; g.fillText(s, x, y);
  }
  function wrap(s, maxW, size) {
    g.font = `${size}px ${FONT}`;
    const out = [];
    for (const para of String(s).split('\n')) {
      let line = '';
      for (const w of para.split(' ')) {
        const tryL = line ? line + ' ' + w : w;
        if (g.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL;
      }
      out.push(line);
    }
    return out;
  }
  function box(x, y, w, h, a = 0.94) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, `rgba(40,60,170,${a})`); gr.addColorStop(1, `rgba(10,16,70,${a})`);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, w - 4, h - 4);
    g.strokeStyle = '#8a9ad8'; g.lineWidth = 2; g.strokeRect(x + 7, y + 7, w - 14, h - 14);
  }
  // Caixa fina dos Luminares: sem gradiente, borda âmbar de 1 px, sem retrato.
  function lumBox(x, y, w, h) { g.fillStyle = 'rgba(10,8,2,.88)'; g.fillRect(x, y, w, h); g.strokeStyle = '#e8c04a'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
  const pix = document.createElement('canvas');
  function pixelImage(im, k = 3, dark = 0) {
    pix.width = W / k; pix.height = H / k;
    const p = pix.getContext('2d');
    const s = Math.max(pix.width / im.width, pix.height / im.height);
    p.imageSmoothingEnabled = true;
    p.drawImage(im, (pix.width - im.width * s) / 2, (pix.height - im.height * s) / 2, im.width * s, im.height * s);
    g.imageSmoothingEnabled = false; g.drawImage(pix, 0, 0, W, H);
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
  function dude(x, y, P, ph, face, u = 2, moving = true, extra = {}) {
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
    if (P.cocar) { R(-3, -23, 1, 2, '#e33'); R(-1, -24, 1, 3, '#fc3'); R(1, -23, 1, 2, '#3a3'); }
  }
  // Dona Mula: a antena. A chama azul cresce com o Ato e pulsa ao transmitir um relatório.
  function mula(x, y, ph, dir, u = 2, moving = true, t = 0, o = {}) {
    const f = dir < 0 ? -1 : 1;
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
  function drawParts(dt) {
    PARTS = PARTS.filter((p) => (p.life -= dt) > 0);
    for (const p of PARTS) { p.vy += (p.light ? 120 : 600) * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = p.c; g.fillRect(p.x, p.y, p.sz, p.sz); }
    FLOAT = FLOAT.filter((f) => (f.t -= dt) > 0);
    FLOAT.forEach((f, i) => { g.globalAlpha = Math.min(1, f.t); txt(f.s, W / 2, 140 - (2 - f.t) * 30 + i * 22, 12, f.col, 'center'); g.globalAlpha = 1; });
  }

  // ================= diálogo, escolha, faixa, transição, painéis =================
  let DLG = null, ASK = null, BANNER = null, TR = null, PANEL = null, SHAKE = 0;
  const PAGE = 4, CPS = 50;
  function say(lines, done) {
    const pages = [];
    for (const [who, text, pic] of lines) {
      const hasP = who && who !== 'narr' && who !== 'lum';
      const ls = wrap(text, hasP ? W - 260 : W - 100, who === 'lum' ? 14 : 16);
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
  function drawDlg(dt, t) {
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
      const im = img(`img/p_${p.who}.png`);
      g.fillStyle = '#0a1040'; g.fillRect(30, y0 + 22, 136, 136);
      if (im) { g.imageSmoothingEnabled = false; g.drawImage(im, 30, y0 + 22, 136, 136); } else dude(98, y0 + 150, PAL[p.who] || PAL.turista, 0, 0, 5, false);
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(30, y0 + 22, 136, 136);
      tx = 190;
      const name = nm.length > 24 ? nm.split(' ').slice(0, 3).join(' ') : nm;
      g.font = `12px ${FONT}`; const nw = g.measureText(name).width + 24;
      g.fillStyle = '#ffd84a'; g.fillRect(tx - 6, y0 - 14, nw, 26); g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(tx - 6, y0 - 14, nw, 26);
      g.fillStyle = '#1a1030'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(name, tx + 6, y0 - 7);
    }
    if (isLum) tx = 90;
    let left = Math.floor(DLG.shown);
    p.lines.forEach((l, k) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; txt(s, tx, y0 + (isLum ? 44 : 30) + k * 30, isLum ? 14 : 16, isLum ? '#f3e2a0' : '#fff'); });
    if (DLG.shown >= total && Math.floor(t * 3) % 2) txt('▼', W - (isLum ? 90 : 60), y0 + 146, 14, isLum ? '#e8c04a' : '#ffd84a');
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
  function ask(q, opts, cb) { ASK = { q, opts, cb, rects: [] }; }
  function drawAsk() {
    const qs = wrap(ASK.q, W - 100, 14);
    const two = ASK.opts.length === 4;
    const rows = two ? 2 : ASK.opts.length;
    const h = 40 + qs.length * 24 + rows * 50 + 20;
    const y0 = Math.max(8, H - h - 16);
    box(16, y0, W - 32, h);
    qs.forEach((l, i) => txt(l, 48, y0 + 26 + i * 24, 14, '#ffd84a'));
    ASK.rects = ASK.opts.map((o, i) => {
      const col = two ? i % 2 : 0, row = two ? Math.floor(i / 2) : i;
      const bw = two ? (W - 112) / 2 : W - 96;
      const r = [48 + col * (bw + 16), y0 + 30 + qs.length * 24 + row * 50, bw, 42];
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(...r); g.strokeStyle = '#8a9ad8'; g.lineWidth = 2; g.strokeRect(...r);
      const ls = wrap(`${'ABCDEFGH'[i]}) ${o}`, bw - 24, 11);
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
    g.font = `18px ${FONT}`; const w = g.measureText(BANNER.title).width + 60;
    box(W / 2 - w / 2, 70, w, 56, 0.9); txt(BANNER.title, W / 2, 90, 18, '#ffd84a', 'center');
    g.globalAlpha = 1;
  }
  const mos = document.createElement('canvas');
  function go(next, title) { if (!TR) TR = { t: 0, next, title, swapped: false }; }
  function drawTR(dt) {
    TR.t += dt;
    const k = TR.t < 0.4 ? TR.t / 0.4 : Math.max(0, 1 - (TR.t - 0.4) / 0.3);
    if (TR.t >= 0.4 && !TR.swapped) { TR.swapped = true; setScene(typeof TR.next === 'function' ? TR.next() : TR.next); if (TR.title) banner(TR.title); }
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
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(52, 52, 420, 236);
    txt(`${c.yearLabel} · ${ERA[c.era]?.name || ''}`, 52, 300, 10, '#8a9ad8');
    wrap(c.title, 420, 14).slice(0, 3).forEach((l, i) => txt(l, 52, 320 + i * 22, 14, '#ffd84a'));
    wrap(`“${c.hook}”`, 420, 10).slice(0, 6).forEach((l, i) => txt(l, 52, 392 + i * 16, 10, '#cfe0ff'));
    let y = 56;
    txt('RELATÓRIO', 500, y, 12, '#ffd84a'); y += 26;
    for (const f of (c.facts || []).slice(0, 3)) { const ls = wrap('• ' + f, W - 560, 10).slice(0, 5); ls.forEach((l, i) => txt(l, 500, y + i * 16, 10, '#fff')); y += ls.length * 16 + 10; }
    if (c.imagine) { const ls = wrap(c.imagine, W - 580, 9).slice(0, 6); const hgt = ls.length * 15 + 34; g.fillStyle = 'rgba(255,216,74,.12)'; g.fillRect(500, y, W - 560, hgt); g.strokeStyle = '#ffd84a'; g.lineWidth = 2; g.strokeRect(500, y, W - 560, hgt); txt('Imagine…', 510, y + 8, 9, '#ffd84a'); ls.forEach((l, i) => txt(l, 510, y + 24 + i * 15, 9, '#fff')); y += hgt + 10; }
    if (c.joke && !serio && y < H - 230) { const ls = wrap(c.joke, W - 580, 9).slice(0, 5); const hgt = ls.length * 15 + 34; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(500, y, W - 560, hgt); txt('Dona Mula:', 510, y + 8, 9, '#4aa8ff'); ls.forEach((l, i) => txt(l, 510, y + 24 + i * 15, 9, '#ddd')); }
    g.fillStyle = '#ffd84a'; g.fillRect(W - 210, H - 84, 150, 40); txt('FECHAR', W - 135, H - 72, 14, '#1a1030', 'center');
  }

  // ---- Caderno do Buck: relatórios por era ----
  const ORDER = [...ERAS].filter((e) => e.id !== 'prologo').sort((a, b) => a.range[0] - b.range[0]).concat(ERAS.filter((e) => e.id === 'prologo'));
  const YEAR = { mundo: 1492, paubrasil: 1500, acucar: 1550, invasoes: 1630, palmares: 1650, ouro: 1700, apogeu: 1740, inconfidencia: 1789, depois: 1850, renascimento: 1972, prologo: 'HOJE' };
  function openBook(era) { const i = Math.max(0, ORDER.findIndex((e) => e.id === era)); PANEL = { kind: 'book', i, rects: [] }; sfx('tap'); }
  function drawBook() {
    box(30, 24, W - 60, H - 48, 0.97);
    const e = ORDER[PANEL.i], list = eraCards(e.id);
    txt('CADERNO DO BUCK', W / 2, 44, 14, '#ffd84a', 'center');
    txt(`◀   ${YEAR[e.id]} · ${e.name}   ▶`, W / 2, 72, 11, '#fff', 'center');
    txt(`${gotIn([e.id])}/${list.length} relatórios`, W / 2, 94, 10, '#8a9ad8', 'center');
    PANEL.rects = [];
    list.forEach((c, k) => {
      const x = 62 + (k % 6) * 140, y = 116 + Math.floor(k / 6) * 112;
      const have = G.cards.includes(c.id), im = have && img('assets/img/' + c.image);
      g.fillStyle = '#0a1040'; g.fillRect(x, y, 128, 72);
      if (im) { g.imageSmoothingEnabled = true; g.drawImage(im, x, y, 128, 72); } else txt('?', x + 64, y + 26, 20, '#3a4a9a', 'center');
      g.strokeStyle = have ? '#ffd84a' : '#3a4a9a'; g.lineWidth = 2; g.strokeRect(x, y, 128, 72);
      txt(have ? c.title.slice(0, 15) : '???', x, y + 78, 8, have ? '#fff' : '#5a6aaa');
      if (have) PANEL.rects.push([x, y, 128, 90, c.id]);
    });
    PANEL.prev = [40, 56, 140, 50]; PANEL.next = [W - 180, 56, 140, 50];
    txt('toque fora para fechar · ◀ ▶ trocam a era', W / 2, H - 50, 9, '#8a9ad8', 'center');
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
    txt('☀ RELÓGIO DE SOL · Dossiê', 60, 48, 13, '#ffd84a');
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
      txt(`${YEAR[e.id]} · ${e.name}`, 186, 306, 13, '#ffd84a');
      wrap(`“${e.intro}”`, W - 280, 10).slice(0, 3).forEach((l, i) => txt(l, 186, 336 + i * 18, 10, '#cfe0ff'));
      txt(`relatórios ${gotIn([e.id])}/${eraCards(e.id).length}${eraOpen(e.id) ? '' : ' · portal fechado'}`, 186, 396, 10, '#fff');
      if (G.eras[e.id]?.visited && e.id !== 'prologo' && G.era === 'hoje') txt('toque de novo: viagem rápida até o buraco', 186, 418, 9, '#9be36a');
    } else txt('Toque numa era para ver o relatório.', W / 2, 330, 10, '#8a9ad8', 'center');
    txt('toque fora para fechar', W / 2, H - 50, 9, '#8a9ad8', 'center');
  }
  function drawPanel() {
    if (PANEL.kind === 'card') drawCard();
    else if (PANEL.kind === 'book') drawBook();
    else if (PANEL.kind === 'timeline') drawTimelinePanel();
  }
  function panelTap(x, y) {
    const P = PANEL;
    if (P.kind === 'card') { PANEL = null; sfx('tap'); P.done?.(); return; }
    if (P.kind === 'book') {
      if (inR(x, y, P.prev)) { P.i = (P.i + ORDER.length - 1) % ORDER.length; sfx('tap'); return; }
      if (inR(x, y, P.next)) { P.i = (P.i + 1) % ORDER.length; sfx('tap'); return; }
      const r = P.rects.find((q) => inR(x, y, q));
      if (r) { const back = { ...P }; cardScreen(r[4], () => { PANEL = back; }); return; }
      PANEL = null; sfx('tap'); return;
    }
    if (P.kind === 'timeline') {
      const r = P.rects.find((q) => inR(x, y, q));
      if (!r) { PANEL = null; sfx('tap'); return; }
      if (P.sel === r[4] && G.eras[r[4]]?.visited && r[4] !== 'prologo' && G.era === 'hoje' && scene.travel) { PANEL = null; scene.travel(r[4]); return; }
      P.sel = r[4]; sfx('tap');
    }
  }

  // ================= coletar relatório =================
  let FLAMEPULSE = 0;
  function giveCard(id, done) {
    if (!CARD[id] || G.cards.includes(id)) { done?.(); return; }
    const before = ACTS.map((_, i) => actOpen(i));
    G.cards.push(id); save();
    sfx('coin'); setTimeout(() => sfx('sinoP'), 200);
    FLAMEPULSE = 2;
    if (CARD[id].tone !== 'serio') confetti(W / 2, H / 3, 50);
    if (curAct() >= 2) floatTxt('brilho +1', '#f3e2a0');
    cardScreen(id, () => {
      const opened = ACTS.findIndex((_, i) => !before[i] && actOpen(i));
      if (opened > 0) { sfx('win'); banner(`ATO ${ACTS[opened].id} · ${ACTS[opened].name}`); say([['mula', `Relatórios suficientes. Abriu o Ato ${ACTS[opened].id}: ${ACTS[opened].name}. As lajes daqueles buracos caíram.`], ...(opened === 2 ? [['mula', 'E agora o Cobrador também anda pela Estrada Real de hoje. Pois é.']] : []), ...(opened === 3 ? [['lum', 'Acelere.']] : [])], done); }
      else done?.();
    });
  }
  const giveGold = (n) => { G.gold = Math.max(0, G.gold + n); save(); if (n > 0) sfx('coin'); };
  const giveItem = (id) => { if (!G.items.includes(id)) { G.items.push(id); save(); } };
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
  function paintDraft(M) {
    const S = 0.5, w = Math.ceil(M.w * S), h = Math.ceil(M.h * S), D = M.draft, rnd = rng(D.seed || hash(M.id));
    const art = document.createElement('canvas'); art.width = w; art.height = h;
    const mk = document.createElement('canvas'); mk.width = w; mk.height = h;
    const a = art.getContext('2d'), m = mk.getContext('2d', { willReadFrequently: true });
    const P = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S))); c.closePath(); };
    const L = (c, pts, lw, col, dash) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S))); c.lineWidth = lw * S; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
    const ground = D.ground || '#7aa24c', sea = D.sea || '#2a6fb0';
    if (D.land) {
      a.fillStyle = sea; a.fillRect(0, 0, w, h);
      for (let i = 0; i < w * h / 380; i++) { a.fillStyle = rnd() < 0.5 ? '#3a82c4' : '#245f9a'; a.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 3, 1); }
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
    for (let i = 0; i < px.length; i += 4) if (rnd() < 0.08) { const k = rnd() < 0.5 ? 0.86 : 1.1; px[i] *= k; px[i + 1] *= k; px[i + 2] *= k; }
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
        if (m.getImageData(hx * S, hy * S, 1, 1).data[0] < 128 && !onRoad(hx, hy, 8)) bld(a, m, 'house', hx - 8, hy - 6, 16, 12, rnd);
      }
      if (!onRoad(tx + 20, ty - 24, 10)) bld(a, m, 'church', tx + 8, ty - 40, 24, 30, rnd);
    }
    for (const b of D.buildings || []) bld(a, m, b[0], b[1], b[2], b[3], b[4], rnd);
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
  function bld(a, m, kind, x, y, w, h, rnd) {
    const S = 0.5, X = x * S, Y = y * S, Wd = w * S, Hd = h * S, R = (dx, dy, ww, hh, c) => { a.fillStyle = c; a.fillRect(X + dx * Wd, Y + dy * Hd, ww * Wd, hh * Hd); };
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
    const { art, mask, S } = paintDraft(M);
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

  const Title = () => ({
    t: 0,
    enter() { music('title'); },
    update(dt) { this.t += dt; },
    draw() {
      bg('assets/img/scenes/mirante.webp', 3, 0.15, '#1a1030');
      if (G.flags.lumStay) lum(W - 80, 80, 26, this.t, 0.8);
      g.fillStyle = 'rgba(10,16,70,.55)'; g.fillRect(0, 40, W, 170);
      if (G.secrets.length >= 10) { g.globalAlpha = 0.4 + 0.3 * Math.sin(this.t * 3); txt('Relógio de Sol', W / 2 + 2, 72, 44, '#fff8c0', 'center'); g.globalAlpha = 1; }
      txt('Relógio de Sol', W / 2, 70, 44, '#ffd84a', 'center'); // a fonte pixel não tem Ó maiúsculo
      txt('um relatório sobre o brilho', W / 2, 150, 14, '#fff', 'center');
      if (Math.floor(this.t * 2) % 2) txt(G.flags.intro ? 'TOQUE PARA CONTINUAR' : 'TOQUE PARA COMEÇAR', W / 2, H - 90, 16, '#fff', 'center');
    },
    tap() {
      audio(); sfx('ok');
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
    const P = { x: (sf[0] + 0.5) * M.cell, y: (sf[1] + 0.5) * M.cell, path: [], face: 0, ph: 0, moving: false, still: 0, steps: 0 };
    const mulaS = { x: P.x - 20, y: P.y + 4, dir: 1, ph: 0, moving: false };
    const trail = [];
    let camx = 0, camy = 0, tt = 0, saveT = 0, fogT = 0, chase = false, eggSwap = 0, radarT = 0;
    const near = {}, hud = {};
    // Quem nasce em cima de portal, buraco ou porta não dispara de novo: só depois de sair e voltar (evita o laço era ↔ Hoje).
    const spawnIn = (p, r = 40) => p && Math.hypot(P.x - p[0], P.y - p[1]) < r;
    if (spawnIn(K.pois.portal)) near.portal = 1;
    for (const [era, h] of Object.entries(M.holes || {})) if (spawnIn(h)) near['h' + era] = 1;
    for (const k of Object.keys(M.doors || {})) if (spawnIn(K.pois[k])) near[k] = 1;
    const mkNpc = (n) => { const home = K.pois[n.at] || n.xy; return { ...n, x: home[0], y: home[1], face: 0, away: 0, home, ph: Math.random() * 6 }; };
    const npcs = (M.npcs || []).filter((n) => !n.cond || G.minis[n.cond]).map(mkNpc);
    if (isHoje && curAct() >= 2 && !G.flags.guia) npcs.push(mkNpc({ id: 'cobrador', at: 'estrada', wander: 60, lines: ['Estrada Real, forasteiro. Tudo que passa aqui paga o Quinto. Até no século XXI, se eu deixar.'] }));
    if (G.flags.guia) npcs.forEach((n) => { if (n.afterGuia) n.lines = n.afterGuia; });
    const COB = M.cobrador && { x: K.pois[M.cobrador.patrol[0]][0], y: K.pois[M.cobrador.patrol[0]][1], i: 0, face: 0, ph: 0, state: 'patrol', cool: 0, dir: [1, 0], path: null, repath: 0 };
    const dustAt = {};
    const cam = () => { camx = Math.max(0, Math.min(M.w - W / Z, P.x - W / Z / 2)); camy = Math.max(0, Math.min(M.h - H / Z, P.y - H / Z / 2)); };
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

    function walkTo(wx, wy) {
      const s = nearestFree(K, P.x, P.y), t = nearestFree(K, wx, wy);
      const p = astar(K, s[0], s[1], t[0], t[1]);
      if (p) { P.path = p; sfx('tap'); }
    }
    const asLines = (n, ls) => (ls || []).map((l) => (Array.isArray(l) ? l : [n.id, l]));

    // ---- conversa com NPC: contexto → pergunta → consequência no mundo ----
    function talk(n) {
      if (n.egg) return n.egg(S, n, window.ENG);
      if (n.quest) return questTalk(n);
      if (n.shop) return shop(n);
      if (n.lesson) return say(n.lesson);
      const lines = asLines(n, n.lines);
      const pool = () => RAW.quizzes.filter((q) => CARD[q.cardId]?.era === M.era && !G.qok.includes(q.id));
      if (!n.quiz || !pool().length || G.flags.guia) {
        if (n.mini) { const mi = (M.minis || []).find((x) => x.id === n.mini); if (mi) return miniTalk(mi, n); }
        say(lines.length ? lines : [[n.id, CHARS[n.id]?.catchphrase || 'Bom dia, forasteiro.']]); return;
      }
      // uma pergunta atrás da outra, sem ir e voltar: acertou +5 de ouro, errou -5
      const one = () => {
        const left = pool(); if (!left.length) { say([[n.id, 'Você respondeu tudo o que eu sabia perguntar.']], () => { if (n.mini) { const mi = (M.minis || []).find((x) => x.id === n.mini); if (mi) miniTalk(mi, n); } }); return; }
        const q = left[hash(n.id + G.qok.length + Math.floor(G.played)) % left.length];
        const opts = q.type === 'multiple' ? q.options.map((t, i) => ({ t, ok: i === q.answer })) : [{ t: 'É fato', ok: q.answer === 'fato' }, { t: 'É lenda', ok: q.answer === 'lenda' }];
        const order = opts.map((o, i) => [hash(q.id + i), o]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
        const again = () => { const k = needOf(M.era); ask(`Perguntas desta era: ${k.ok}/${k.quiz}. Quer outra pergunta? (acertou +5, errou -5)`, ['Quero', 'Agora não'], (j) => { if (j === 0) one(); }); };
        ask(q.prompt, order.map((o) => o.t), (k) => {
          if (order[k].ok) {
            sfx('ok'); G.qok.push(q.id); giveGold(5); save();
            const rew = q.cardId && !G.cards.includes(q.cardId) && CARD[q.cardId].era === M.era && !REWARD.has(q.cardId);
            say([[n.id, n.right || 'Isso mesmo.'], ['narr', `${q.explain} (+5 de ouro${rew ? ' e um relatório' : ''})`]], () => (rew ? giveCard(q.cardId, again) : again()));
          } else {
            sfx('bad'); SHAKE = 0.3; giveGold(-5);
            say([[n.id, n.wrong || 'Não foi bem assim...'], [CARD[q.cardId]?.tone === 'serio' ? 'narr' : 'mula', `Dica: ${q.explain} (-5 de ouro)`]], again);
          }
        });
      };
      say(lines, one);
    }
    function miniTalk(mi, n) {
      if (mi.act != null && !actOpen(mi.act)) { say([[n?.id || 'mula', mi.locked || 'Ainda não é hora disso. Volte num Ato mais adiante.']]); return; }
      if (!isHoje && M.needMini === mi.id) {
        const k = needOf(M.era);
        if (k.got < k.cards || k.ok < k.quiz) { say([[n?.id || 'mula', 'O desafio desta era só abre para quem já sabe a história.'], ['mula', `Falta: ${k.got < k.cards ? `${k.cards - k.got} relatório${k.cards - k.got > 1 ? 's' : ''}` : ''}${k.got < k.cards && k.ok < k.quiz ? ' e ' : ''}${k.ok < k.quiz ? `${k.quiz - k.ok} pergunta${k.quiz - k.ok > 1 ? 's' : ''} certa${k.quiz - k.ok > 1 ? 's' : ''}` : ''}. Se perder o desafio, o portal te joga para fora e a era recomeça.`]]); return; }
      }
      const done = G.minis[mi.id];
      const intro = asLines(n || { id: 'mula' }, n?.lines || mi.lines);
      say(intro.length ? intro : [['mula', mi.label]], () => ask(`${mi.label}${done ? ' (já vencido)' : ''}`, ['Bora!', 'Agora não'], (k) => { if (k === 0) { G.pos[id] = [Math.round(P.x), Math.round(P.y)]; save(); startMini(mi.id, id); } }));
    }
    function shop(n) {
      const items = [['botas', 'Botas de tropeiro (+40% velocidade)', 200], ['lampiao', 'Lampião (revela mais névoa)', 150], ['rapadura', 'Rapadura (corre mais por 40 s)', 20]];
      say([[n.id, G.flags.guia ? 'Guia agora, é? Pra guia eu faço preço.' : 'Venda do Tropeiro. Tem de tudo que cabe numa mula.']], () => ask(`Seu ouro: $${G.gold}`, [...items.map(([, l, p]) => `${l} · $${p}`), 'Nada, obrigado'], (k) => {
        if (k >= items.length) return;
        const [it, , p] = items[k];
        if (it === 'rapadura') {
          G.flags.rapN = (G.flags.rapN || 0) + 1; save();
          if (G.flags.rapN === 5) { secret('nashville', [[n.id, 'Rapadura acabou. Mas tenho uísque de milho, coisa fina.'], ['buck', 'No sir. Last time I drank something from a stranger I woke up 150 years late.'], ['mula', 'Foi água de chafariz, cowboy. Mas tudo bem.']]); return; }
        }
        if (G.gold < p) { sfx('bad'); say([[n.id, 'Volta quando tiver ouro. Fiado, só pra quem tem mula com cabeça.']]); return; }
        if (it !== 'rapadura' && G.items.includes(it)) { say([[n.id, 'Você já tem isso.']]); return; }
        giveGold(-p);
        if (it === 'rapadura') { S.buff = tt + 40; floatTxt('rapadura: +velocidade', '#ffb060'); } else { giveItem(it); floatTxt('comprado!', '#9be36a'); }
        sfx('coin');
      }));
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
    function travel(era) { const h = M.holes?.[era]; if (!h) return; const [cx, cy] = nearestFree(K, h[0], h[1] + 30); P.x = (cx + 0.5) * M.cell; P.y = (cy + 0.5) * M.cell; P.path = []; mulaS.x = P.x - 16; mulaS.y = P.y; trail.length = 0; cam(); sfx('portal'); banner(ERA[era].name); }
    function fallInto(era) {
      sfx('fall'); SHAKE = 0.4;
      G.pos.hoje = [Math.round(P.x), Math.round(P.y + 30)];
      G.flags.lastHole = era; save();
      go(() => OW(era), `Entrando no portal… ${eraTitle(era)}`);
    }
    function caught() {
      COB.state = 'patrol'; COB.cool = 12; chase = false; music(M.music || M.era); COB.path = null;
      if (G.items.includes('santo')) { G.items = G.items.filter((i) => i !== 'santo'); save(); say([['cobrador', 'Vamos ver esse santo aí...'], ['narr', 'Ele revista o santo. Vazio.'], ['mula', 'Santo do pau oco: lenda que vira mecânica. Usou o seu.']]); return; }
      const took = Math.ceil(G.dust * 0.2); G.dust -= took; save(); sfx('bad'); SHAKE = 0.3;
      const pool = RAW.quizzes.filter((q) => ['C43', 'C45', 'C46', 'C51', 'C53', 'C55'].includes(q.cardId));
      const k0 = hash(String(Math.round(G.played))), qa = [pool[k0 % pool.length], pool[(k0 + 1) % pool.length]];
      let back = 0;
      const one = (i) => {
        if (i >= qa.length) { if (back) { G.dust += back; save(); } say([['cobrador', back ? `Hmpf. Sabe das leis da Coroa. Devolvo ${back} de pó.` : `Levei ${took} de pó. O Quinto é da Coroa.`]]); return; }
        const q = qa[i], opts = q.type === 'multiple' ? q.options.map((t, j) => ({ t, ok: j === q.answer })) : [{ t: 'É fato', ok: q.answer === 'fato' }, { t: 'É lenda', ok: q.answer === 'lenda' }];
        ask(q.prompt, opts.map((o) => o.t), (k) => { if (opts[k].ok) { sfx('ok'); back += Math.ceil(took / 4); } else sfx('bad'); one(i + 1); });
      };
      say([['cobrador', `Pó sem selo! Levo o Quinto: ${took}. Responda direito e talvez eu devolva metade.`]], () => one(0));
    }

    Object.assign(S, { walkTo, talk, travel, mulaS, setSwap: (s) => { eggSwap = s; } });

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
          setTimeout(() => say([['mula', 'Levanta. Você tem um trabalho.'], ['buck', 'I have a WHAT?'], ['mula', 'Observar. Anotar. Mandar. Toca em qualquer lugar e anda. Eu te sigo.']], () => {
            if (G.flags.migratedN) say([['mula', `Ah: você trouxe ${G.flags.migratedN} relatórios de um caderno antigo. Já mandei.`]]);
          }), 600);
        } else if (!isHoje && first) setTimeout(() => { const k = needOf(M.era); say([...(M.arrive || [['mula', `${ERA[M.era]?.name || M.title}.`]]), ['mula', `Para o portal abrir: ${k.cards} relatórios, ${k.quiz} pergunta${k.quiz === 1 ? '' : 's'} certa${k.quiz === 1 ? '' : 's'}${k.mini ? ' e vencer o desafio da era' : ''}.`]]); }, 700);
      },
      update(dt) {
        tt += dt; G.played += dt;
        if (eggSwap > 0) eggSwap -= dt;
        const kx = (KEYS.ArrowRight || KEYS.d ? 1 : 0) - (KEYS.ArrowLeft || KEYS.a ? 1 : 0);
        const ky = (KEYS.ArrowDown || KEYS.s ? 1 : 0) - (KEYS.ArrowUp || KEYS.w ? 1 : 0);
        let vx = 0, vy = 0;
        const sp = 85 * (G.items.includes('botas') ? 1.4 : 1) * (S.buff > tt ? 1.35 : 1);
        if (!busy() && (kx || ky)) { P.path = []; const l = Math.hypot(kx, ky); vx = kx / l * sp; vy = ky / l * sp; }
        else if (!busy() && P.path.length) {
          const [tx, ty] = P.path[0], dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy);
          if (d < 3) P.path.shift(); else { vx = dx / d * sp; vy = dy / d * sp; }
        }
        P.moving = !!(vx || vy);
        if (P.moving) {
          P.still = 0;
          if (!blockedAt(K, P.x + vx * dt, P.y)) P.x += vx * dt; else P.path = [];
          if (!blockedAt(K, P.x, P.y + vy * dt)) P.y += vy * dt; else P.path = [];
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
        cam();
        if (FLAMEPULSE > 0) FLAMEPULSE -= dt;
        if ((fogT += dt) > 0.25) { fogT = 0; clearFog(K, P.x, P.y); const f = (G.fog[id] ||= []); const l2 = f[f.length - 1]; if (!l2 || Math.hypot(l2[0] - P.x, l2[1] - P.y) > 40) f.push([Math.round(P.x), Math.round(P.y)]); }
        if ((saveT += dt) > 2) { saveT = 0; G.pos[id] = [Math.round(P.x), Math.round(P.y)]; save(); }
        // radar sonoro do Sineiro (prêmio dos sinos): sino toca com relatório a 200 px
        if (G.minis.sinos && (radarT -= dt) <= 0) { radarT = 3; if (Object.entries(K.cardPos).some(([cid, p]) => !G.cards.includes(cid) && d2([P.x, P.y], p) < 200)) sfx('sinoP'); }
        for (const n of npcs) if (n.wander && !busy()) { n.ph += dt; const nx = n.home[0] + Math.sin(n.ph * 0.5) * n.wander; n.face = Math.cos(n.ph * 0.5) > 0 ? 2 : -1; if (!blockedAt(K, nx, n.y)) n.x = nx; }
        if (COB && !busy()) {
          COB.cool -= dt;
          const pt = [P.x, P.y], cp = [COB.x, COB.y], dist = d2(pt, cp);
          if (COB.state !== 'chase' && G.dust > 0 && COB.cool <= 0 && dist < 120) {
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
        if (busy()) return;
        const pt = [P.x, P.y];
        for (const [cid, p] of Object.entries(K.cardPos)) {
          if (G.cards.includes(cid) || d2(pt, p) > 22) continue;
          P.path = [];
          giveCard(cid, () => {
            if (isHoje && cid === 'C00' && !G.flags.tut1) { G.flags.tut1 = 1; save(); say([['mula', 'Isso. Cada papel desses é um relatório. Eu transmito. Pra quem? Depois.'], ['mula', 'E aquilo ali no chão, aquela cratera com luz azul... é o atalho.']]); }
          });
          return;
        }
        for (const n of npcs) {
          if (n.away > tt) continue;
          const d = d2(pt, [n.x, n.y]);
          if (d < 26 && !near[n.id]) { near[n.id] = 1; P.path = []; talk(n); return; }
          if (d > 44) near[n.id] = 0;
        }
        for (const w of witnesses) {
          if (w.mule || !G.quests[w.quest] || G.quests[w.quest].done) continue;
          const k = 'w' + w.quest + w.wi, d = d2(pt, [w.x, w.y]);
          if (d < 24 && !near[k]) { near[k] = 1; P.path = []; witnessTalk(w); return; }
          if (d > 44) near[k] = 0;
        }
        for (const mi of M.minis || []) {
          if (!mi.at) continue;
          const p = K.pois[mi.at], k = 'm' + mi.id, d = d2(pt, p);
          if (d < 24 && !near[k]) { near[k] = 1; P.path = []; miniTalk(mi); return; }
          if (d > 44) near[k] = 0;
        }
        if (!isHoje && K.pois.portal) {
          const d = d2(pt, K.pois.portal);
          if (d < 20 && !near.portal) {
            near.portal = 1; P.path = [];
            if (M.exit) { go(() => OW(M.exit.map, M.exit.at && window.MAPS[M.exit.map].pois[M.exit.at]), M.exit.title); return; }
            if (eraNeedMet(M.era)) {
              G.eras[M.era].done = true; save(); sfx('portal'); SHAKE = 0.3;
              const hole = window.MAPS.hoje.holes[M.era];
              go(() => OW('hoje', [hole[0], hole[1] + 30]), 'Brasil · Hoje');
              return;
            }
            const k = needOf(M.era), falta = [k.got < k.cards && `${k.cards - k.got} relatório(s)`, k.ok < k.quiz && `${k.quiz - k.ok} pergunta(s)`, k.mini && !G.minis[k.mini] && 'o desafio'].filter(Boolean).join(', ');
            say([['mula', `A era ainda não está completa. Falta: ${falta}.`]], () => ask('Sair mesmo assim? (o próximo portal continua fechado)', ['Ficar', 'Sair'], (j) => {
              if (j !== 1) return;
              const hole = window.MAPS.hoje.holes[M.era]; sfx('portal');
              go(() => OW('hoje', [hole[0], hole[1] + 30]), 'Brasil · Hoje');
            }));
          }
          if (d > 40) near.portal = 0;
        }
        for (const [k, p] of Object.entries(K.pois)) {
          if (k.startsWith('bateia') && d2(pt, p) < 18 && !(dustAt[k] > tt)) { dustAt[k] = tt + 25; G.dust += 5; save(); sfx('garimpo'); floatTxt('+5 pó de ouro ✨'); FLAMEPULSE = 0.5; }
          if (k === 'fundicao') {
            if (d2(pt, p) < 24 && !near.fund) {
              near.fund = 1; P.path = [];
              if (G.dust > 0) { const n = G.dust; G.dust = 0; giveGold(n); if (chase && COB) { COB.state = 'patrol'; COB.path = null; chase = false; music(M.music || M.era); } say([['fundidor', `${n} de pó viraram barra com o selo do rei: +$${n}.`], ['mula', 'E o Cobrador perde o interesse. Pó sem selo é que dá cadeia.']]); }
              else say([['fundidor', 'Casa de Fundição. Traga pó de ouro que eu derreto e carimbo. O Quinto sai aqui mesmo.']]);
            }
            if (d2(pt, p) > 44) near.fund = 0;
          }
          if (k.startsWith('door_')) {
            const dest = M.doors?.[k];
            if (dest && d2(pt, p) < 18 && !near[k]) { near[k] = 1; P.path = []; G.pos[id] = [Math.round(P.x), Math.round(P.y + 24)]; save(); sfx('cascos'); go(() => OW(dest.map), dest.title); return; }
            if (d2(pt, p) > 40) near[k] = 0;
          }
        }
        if (isHoje) {
          for (const [era, h] of Object.entries(M.holes)) {
            const d = d2(pt, h), open = eraOpen(era);
            if (d < 16 && !near['h' + era]) {
              near['h' + era] = 1; P.path = [];
              if (open) { fallInto(era); return; }
              say([['mula', `Portal fechado. A viagem no tempo é em ordem: o próximo é ${eraTitle(nextEra())}.`]]);
            }
            if (d > 40) near['h' + era] = 0;
          }
          const dSj = d2(pt, [1505, 1360]); if (dSj < 70 && !near.sjdr) { near.sjdr = 1; sfx('sinos'); } else if (dSj > 140) near.sjdr = 0;
          if (finalOpen() && !G.flags.ending && d2(pt, K.pois.mirante) < 30 && !near.final) { near.final = 1; P.path = []; startEnding(); return; }
        }
        if (M.tour) for (const st of RAW.tour.stops) {
          const p = K.pois[st.id]; if (!p) continue;
          const d = d2(pt, p);
          if (d < 22 && !near[st.id]) {
            near[st.id] = 1; P.path = [];
            const seen = (G.flags.tour ||= {}); const novo = !seen[st.id]; seen[st.id] = 1; save();
            const ls = [['sineiro', `${st.id} · ${st.name}. Olhe: ${st.lookAt}.`], ...(st.extras || []).slice(0, 2).map((x) => ['buck', x.joke])];
            if (st.transition) ls.push(['buck', st.transition]);
            say(ls, () => { if (novo) floatTxt(`parada ${Object.keys(seen).length}/${RAW.tour.stops.length}`, '#9be36a'); });
            return;
          }
          if (d > 44) near[st.id] = 0;
        }
        for (const sc of SECRETS) if (sc.map === id || sc.map === '*') sc.check?.(S, dt, tt);
      },
      draw(dt) {
        g.imageSmoothingEnabled = false;
        const shk = SHAKE > 0 ? (SHAKE -= dt, (Math.random() - 0.5) * 8) : 0;
        g.save(); g.translate(shk, 0);
        g.fillStyle = M.draft.land ? M.draft.sea || '#2a6fb0' : M.draft.ground || '#7aa24c'; g.fillRect(-10, 0, W + 20, H);
        const MI = M.image && img(M.image);
        if (MI) g.drawImage(MI, camx * MI.width / M.w, camy * MI.height / M.h, (W / Z) * MI.width / M.w, (H / Z) * MI.height / M.h, 0, 0, W, H);
        else g.drawImage(K.art, camx * K.S, camy * K.S, (W / Z) * K.S, (H / Z) * K.S, 0, 0, W, H);
        const sx = (x) => (x - camx) * Z, sy = (y) => (y - camy) * Z;
        const onS = (x, y, m = 40) => sx(x) > -m && sx(x) < W + m && sy(y) > -m && sy(y) < H + m;
        if (DEBUG) {
          g.fillStyle = 'rgba(255,0,0,.3)';
          const c0 = Math.floor(camx / M.cell), r0 = Math.floor(camy / M.cell);
          for (let cy = r0; cy < r0 + H / Z / M.cell + 1; cy++) for (let cx = c0; cx < c0 + W / Z / M.cell + 1; cx++) if (K.grid[cy * K.gw + cx]) g.fillRect(sx(cx * M.cell), sy(cy * M.cell), M.cell * Z, M.cell * Z);
          for (const [k, p] of Object.entries(K.pois)) txt(k, sx(p[0]), sy(p[1]), 8, '#ff0', 'center');
        }
        for (const [lx, ly, s] of M.labels || []) {
          if (!onS(lx, ly, 120)) continue;
          g.font = `10px ${FONT}`; const w = g.measureText(s).width + 14;
          g.fillStyle = 'rgba(20,20,40,.8)'; g.fillRect(sx(lx) - w / 2, sy(ly) - 10, w, 20); txt(s, sx(lx), sy(ly) - 5, 10, '#fff', 'center');
        }
        if (isHoje) for (const [era, [hx, hy]] of Object.entries(M.holes)) {
          if (!onS(hx, hy)) continue;
          const x = sx(hx), y = sy(hy), open = eraOpen(era), done = G.eras[era]?.done, p = 0.5 + 0.5 * Math.sin(tt * 3 + hx);
          if (open) { g.fillStyle = done ? `rgba(255,210,80,${0.25 + p * 0.3})` : `rgba(80,170,255,${0.25 + p * 0.35})`; g.beginPath(); g.ellipse(x, y, 26 + p * 4, 13 + p * 2, 0, 0, 7); g.fill(); }
          g.fillStyle = '#4a3a2a'; g.beginPath(); g.ellipse(x, y, 22, 11, 0, 0, 7); g.fill();
          if (open) { g.fillStyle = '#0a0a18'; g.beginPath(); g.ellipse(x, y + 1, 17, 8, 0, 0, 7); g.fill(); }
          else { g.fillStyle = '#8a847a'; g.beginPath(); g.ellipse(x, y, 20, 10, 0, 0, 7); g.fill(); g.fillStyle = '#5a544c'; g.fillRect(x - 12, y - 1, 24, 2); }
          g.strokeStyle = '#2a1a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x - 28, y - 4); g.moveTo(x + 20, y + 4); g.lineTo(x + 27, y + 7); g.moveTo(x + 4, y - 11); g.lineTo(x + 7, y - 16); g.stroke();
          const full = era === nextEra() || Math.hypot(P.x - hx, P.y - hy) < 90;
          txt(full ? eraTitle(era) : String(YEAR[era]), x, y + 16, 8, done ? '#ffd84a' : open ? '#bfe3ff' : '#aaa', 'center');
        }
        if (!isHoje && K.pois.portal) {
          const [px, py] = K.pois.portal, x = sx(px), y = sy(py), ok = M.exit || eraNeedMet(M.era), p = 0.5 + 0.5 * Math.sin(tt * 4);
          g.fillStyle = ok ? `rgba(255,240,180,${0.5 + p * 0.4})` : 'rgba(180,200,255,.25)';
          g.beginPath(); g.ellipse(x, y - 16, ok ? 10 + p * 3 : 6, 22, 0, 0, 7); g.fill();
          g.fillStyle = ok ? '#fff' : 'rgba(255,255,255,.4)'; g.fillRect(x - 2, y - 36, 4, 40);
          const by = y - 62 - Math.abs(Math.sin(tt * 3)) * 6;
          g.font = `10px ${FONT}`; const w = g.measureText('PORTAL').width + 14;
          g.fillStyle = ok ? 'rgba(120,60,10,.9)' : 'rgba(20,20,40,.8)'; g.fillRect(x - w / 2, by - 22, w, 18);
          txt('PORTAL', x, by - 18, 10, ok ? '#ffd84a' : '#bfe3ff', 'center');
          g.fillStyle = ok ? '#ffd84a' : '#bfe3ff'; g.beginPath(); g.moveTo(x - 7, by); g.lineTo(x + 7, by); g.lineTo(x, by + 8); g.fill();
        }
        for (const [k, p] of Object.entries(K.pois)) {
          if (!onS(p[0], p[1])) continue;
          if (k.startsWith('bateia') && !(dustAt[k] > tt)) { g.fillStyle = '#ffd84a'; for (let i = 0; i < 4; i++) g.fillRect(sx(p[0]) - 8 + i * 5, sy(p[1]) - 3 + Math.sin(tt * 6 + i) * 2, 3, 3); }
          if (k.startsWith('door_')) { g.fillStyle = `rgba(255,216,74,${0.4 + 0.3 * Math.sin(tt * 4)})`; g.fillRect(sx(p[0]) - 10, sy(p[1]) - 4, 20, 8); }
        }
        if (M.tour) for (const st of RAW.tour.stops) { const p = K.pois[st.id]; if (!p || !onS(p[0], p[1])) continue; const ok = G.flags.tour?.[st.id]; g.fillStyle = ok ? '#3a7a3a' : '#2a3a8a'; g.fillRect(sx(p[0]) - 14, sy(p[1]) - 40, 28, 16); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(sx(p[0]) - 14, sy(p[1]) - 40, 28, 16); txt(st.id, sx(p[0]), sy(p[1]) - 36, 8, '#fff', 'center'); }
        for (const mi of M.minis || []) {
          if (!mi.at) continue;
          const p = K.pois[mi.at]; if (!p || !onS(p[0], p[1])) continue;
          const y = sy(p[1]) - 30 - Math.abs(Math.sin(tt * 3)) * 5, locked = mi.act != null && !actOpen(mi.act);
          g.fillStyle = locked ? '#5a5a6a' : G.minis[mi.id] ? '#ffd84a' : '#ff5a5a'; g.fillRect(sx(p[0]) - 9, y - 9, 18, 18); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(sx(p[0]) - 9, y - 9, 18, 18);
          txt(G.minis[mi.id] ? '★' : '!', sx(p[0]), y - 5, 10, '#fff', 'center');
        }
        for (const [cid, [cx, cy]] of Object.entries(K.cardPos)) {
          if (G.cards.includes(cid) || !onS(cx, cy)) continue;
          const x = sx(cx), y = sy(cy) + Math.sin(tt * 4 + cx) * 3;
          g.fillStyle = 'rgba(255,230,120,.35)'; g.beginPath(); g.arc(x, y, 14 + Math.sin(tt * 3) * 2, 0, 7); g.fill();
          g.fillStyle = '#f2e6c0'; g.fillRect(x - 8, y - 10, 16, 20); g.fillStyle = '#c8b080'; g.fillRect(x - 10, y - 12, 20, 4); g.fillRect(x - 10, y + 8, 20, 4);
          g.fillStyle = '#8a6a3a'; g.fillRect(x - 5, y - 5, 10, 2); g.fillRect(x - 5, y, 10, 2);
        }
        const ents = [
          { y: P.y, d: () => dude(sx(P.x), sy(P.y), PAL.buck, P.ph, P.face, 2, P.moving, { badge: G.flags.guia, flame: eggSwap > 0, t: tt }) },
          { y: mulaS.y, d: () => mula(sx(mulaS.x), sy(mulaS.y), mulaS.ph, mulaS.dir, 2, mulaS.moving, tt, { flame: (0.4 + 0.15 * curAct()) + (FLAMEPULSE > 0 ? 0.7 : 0), flicker: curAct() >= 3 && !G.flags.guia, hat: G.flags.guia, stetson: eggSwap > 0 }) },
          ...npcs.filter((n) => n.away <= tt && onS(n.x, n.y)).map((n) => ({ y: n.y, d: () => {
            dude(sx(n.x), sy(n.y), PAL[n.pal || n.id] || PAL.turista, n.ph * 14, n.face, 2, !!n.wander, { noHat: n.noHat });
            const mk = (n.quest && !G.quests[n.quest]?.done) || (n.quiz && !G.flags.guia && quizOf(M.era).some((qid) => !G.qok.includes(qid))) ? '?' : n.lesson ? 'i' : n.mini && !G.minis[n.mini] && !(((M.minis || []).find((x) => x.id === n.mini) || {}).act != null && !actOpen(((M.minis || []).find((x) => x.id === n.mini)).act)) ? '!' : n.shop ? '$' : '';
            if (mk) txt(mk, sx(n.x), sy(n.y) - 66 - Math.abs(Math.sin(tt * 3)) * 4, 12, '#ffd84a', 'center');
          } })),
          ...witnesses.filter((w) => !w.mule && G.quests[w.quest] && !G.quests[w.quest].done && onS(w.x, w.y)).map((w) => ({ y: w.y, d: () => { dude(sx(w.x), sy(w.y), PAL[w.id] || PAL.turista, 0, 0, 2, false); if (!G.quests[w.quest].heard.includes(w.wi)) txt('💬', sx(w.x), sy(w.y) - 70, 12, '#fff', 'center'); } })),
        ];
        if (COB) ents.push({ y: COB.y, d: () => {
          dude(sx(COB.x), sy(COB.y), PAL.cobrador, COB.ph, COB.face, 2, true);
          if (G.dust > 0 && COB.state !== 'chase') { const fa = Math.atan2(COB.dir[1], COB.dir[0]); g.fillStyle = 'rgba(255,80,60,.14)'; g.beginPath(); g.moveTo(sx(COB.x), sy(COB.y) - 20); g.arc(sx(COB.x), sy(COB.y) - 20, 240, fa - 0.61, fa + 0.61); g.closePath(); g.fill(); }
          if (COB.state === 'chase') txt('!', sx(COB.x), sy(COB.y) - 64, 14, '#ff4a4a', 'center');
        } });
        ents.sort((a, b) => a.y - b.y).forEach((e) => e.d());
        for (const sc of SECRETS) if ((sc.map === id || sc.map === '*') && sc.draw) sc.draw(S, sx, sy, tt);
        const gl = goal(), tg = gl.at;
        if (tg) {
          const x = sx(tg[0]), y = sy(tg[1]) - 50 - Math.abs(Math.sin(tt * 4)) * 8;
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
        const ls = wrap(gl.text, 360, 10);
        box(10, 10, 400, 34 + ls.length * 16, 0.85); txt('MISSÃO', 26, 22, 10, '#ffd84a'); ls.forEach((l, i) => txt(l, 26, 38 + i * 16, 10, '#fff'));
        const mw = K.mini.width, mh = K.mini.height, mx = W - mw - 14, my = 12;
        g.fillStyle = '#000'; g.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
        g.imageSmoothingEnabled = true; g.drawImage(K.mini, mx, my); g.drawImage(K.fog, mx, my); g.imageSmoothingEnabled = false;
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(mx - 3, my - 3, mw + 6, mh + 6);
        const ms = mw / M.w;
        if (tg && Math.floor(tt * 3) % 2) { g.fillStyle = '#ffd84a'; g.fillRect(mx + tg[0] * ms - 3, my + tg[1] * ms - 3, 6, 6); }
        g.fillStyle = '#ff4a4a'; g.fillRect(mx + P.x * ms - 2, my + P.y * ms - 2, 5, 5);
        if (!isHoje) txt(M.title || '', mx + mw / 2, my + mh + 8, 8, '#fff', 'center');
        const items = G.items.map((i) => ({ botas: '👢', lampiao: '🏮', regua: '📏', machado: '🪓' })[i] || RAW.items.find((x) => x.id === i)?.icon || '').join('');
        box(10, H - 76, 150, 66, 0.85);
        txt(`★ ${G.cards.length}/${RAW.cards.length}`, 24, H - 64, 10, '#ffd84a');
        txt(`$ ${G.gold}${G.dust ? `  ✨${G.dust}` : ''}`, 24, H - 46, 10, '#fff');
        txt(`☆ ${G.secrets.length}/10`, 24, H - 28, 9, '#cfd6ff');
        hud.book = [W - 76, H - 64, 62, 54]; box(...hud.book, 0.85); txt('📖', hud.book[0] + 31, hud.book[1] + 16, 16, '#fff', 'center');
        if (items) { box(10, H - 116, 150, 38, 0.85); txt(items, 24, H - 104, 14, '#fff'); }
        hud.timeline = drawTimeline(M.era, tt);
      },
      tap(x, y) {
        if (inR(x, y, hud.timeline)) { openTimeline(); return; }
        if (inR(x, y, hud.book)) { openBook(M.era); return; }
        const wx = camx + x / Z, wy = camy + y / Z;
        if (DEBUG) console.log('mundo', Math.round(wx), Math.round(wy));
        for (const sc of SECRETS) if ((sc.map === id || sc.map === '*') && sc.tap?.(S, wx, wy, tt)) return;
        if (Math.hypot(wx - mulaS.x, wy - (mulaS.y - 10)) < 18) {
          const w = witnesses.find((v) => v.mule && G.quests[v.quest] && !G.quests[v.quest].done && !G.quests[v.quest].heard.includes(v.wi));
          if (w) { witnessTalk(w); return; }
        }
        walkTo(wx, wy);
      },
      key(k) {
        if (k === 't' || k === 'T') openTimeline();
        if (k === 'c' || k === 'C') openBook(M.era);
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
      W, H, g, txt, box, wrap, say, ask, sfx, music, confetti, firework, img, bg, pixelImage, dude, mula, PAL, lum, lumBox, CARD, RAW, G, save, floatTxt, inR,
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
      // Perdeu: no desafio que fecha a era, o portal joga para fora e a era recomeça do zero.
      // Nos desafios extras (ou já vencidos), só recomeça o minigame.
      lose(msg) {
        sfx('bad');
        const M = window.MAPS[fromMap], hard = M?.needMini === mid && !G.minis[mid];
        if (!hard) { say([['mula', `${msg} Tenta de novo.`]], () => go(() => f(api), null)); return; }
        say([['narr', 'Você não conseguiu.'], ['narr', msg], ['mula', 'O portal te jogou para fora. A era recomeça do zero: relatórios, perguntas e o desafio.']], () => {
          resetEra(M.era); const h = window.MAPS.hoje.holes[M.era];
          go(() => OW('hoje', [h[0], h[1] + 30]), 'Brasil · Hoje');
        });
      },
    };
    go(() => f(api), null);
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
        secret('moleque', [['narr', `${e?.phrase}: ${e?.legend}`], ['narr', `Realidade: ${e?.reality}`], ['buck', 'Whoa— these rocks got opinions.']]);
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
      const after = () => { G.flags.ending = 1; G.flags.guia = 1; save(); setScene(Credits()); };
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
  let DOWN = false;
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    audio();
    if (TR) return;
    const [x, y] = toLogical(e);
    if (PANEL) { panelTap(x, y); return; }
    if (ASK) { const i = ASK.rects.findIndex((r) => inR(x, y, r)); if (i >= 0) askPick(i); return; }
    if (DLG) { dlgTap(); return; }
    DOWN = true;
    scene.tap?.(x, y);
    scene.down?.(x, y);
  });
  cv.addEventListener('pointermove', (e) => { if (!DOWN || !scene.drag) return; const [x, y] = toLogical(e); scene.drag(x, y); });
  addEventListener('pointerup', (e) => { if (!DOWN) return; DOWN = false; const [x, y] = toLogical(e); scene.up?.(x, y); });
  addEventListener('keydown', (e) => {
    KEYS[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.key === 'm' || e.key === 'M') { audio(); setMute(!muted); return; }
    if (PANEL) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { const P = PANEL; PANEL = null; P.done?.(); } else if (PANEL.kind === 'book' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) PANEL.i = (PANEL.i + (e.key === 'ArrowLeft' ? ORDER.length - 1 : 1)) % ORDER.length; return; }
    if (ASK) { const n = '123456789'.indexOf(e.key), l = 'abcd'.indexOf(e.key.toLowerCase()); askPick(n >= 0 ? n : l); return; }
    if (DLG) { if (e.key === 'Enter' || e.key === ' ') dlgTap(); return; }
    scene.key?.(e.key);
  });
  addEventListener('keyup', (e) => { KEYS[e.key] = false; scene.keyup?.(e.key); });
  addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; });

  // ================= laço =================
  let last = performance.now(), T = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; T += dt;
    if (!TEST) requestAnimationFrame(frame); // agenda antes: um erro num quadro não congela o jogo
    try {
      scene.update?.(dt);
      scene.draw(dt);
      drawParts(dt);
      drawFlash(dt);
      if (PANEL) drawPanel();
      if (ASK) drawAsk();
      if (DLG) drawDlg(dt, T);
      if (BANNER) drawBanner(dt);
      if (TR) drawTR(dt);
    } catch (err) { if (frame.errs !== String(err)) console.error(err); frame.errs = String(err); }
  }
  window.ENG = { scene: () => scene, dlg: () => DLG, askOpen: () => ASK, panel: () => PANEL, dlgTap: () => DLG && dlgTap(), askPick: (i) => askPick(i), panelClose: () => { const P = PANEL; PANEL = null; P?.done?.(); }, G, go, say, confetti, firework, loadMap, OW: (id, at) => OW(id, at), giveCard, giveGold, giveItem, startMini, secret, ACTS, actOpen, curAct, sfx, floatTxt, setScene };
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !TEST) navigator.serviceWorker.register('sw.js').catch(() => {});
  (document.fonts?.load(`16px ${FONT}`) || Promise.resolve()).catch(() => {}).finally(() => {
    const q = /[?&]era=(\w+)/.exec(location.search), mq = /[?&]mini=(\w+)/.exec(location.search);
    if (q || mq) { G.flags.intro = 1; G.flags.tut0 = 1; G.flags.tut1 = 1; }
    if (mq) { setScene(OW(q?.[1] || 'hoje')); setTimeout(() => startMini(mq[1], q?.[1] || 'hoje'), 200); }
    else setScene(q && window.MAPS[q[1]] ? OW(q[1]) : Title());
    if (TEST) setInterval(() => frame(performance.now()), 16); else requestAnimationFrame(frame);
  });
})();
