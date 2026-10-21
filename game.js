// Relógio de Sol v2 — motor em canvas puro (sem módulos, sem dependências; abre até por file://).
// Arquitetura inspirada em "As Aventuras de Arthur": canvas 960×540, mundo com zoom 2×, tap-para-andar
// com A*, diálogo SNES com retrato, mosaico nas transições. Tempo real: sem turnos, sem dias.
// Conteúdo histórico vem de content.data.js (gerado de data/*.json) — nada de fato histórico aqui.
'use strict';
(() => {
  const W = 960, H = 540, Z = 2;
  const FONT = '"Press Start 2P", monospace';
  const app = document.getElementById('app');
  const cv = document.getElementById('c');
  const g = cv.getContext('2d');
  const DEBUG = /[?&]debug=1/.test(location.search);
  const RAW = window.CONTENT_RAW;
  const CHARS = Object.fromEntries(RAW.chars.map((c) => [c.id, c]));
  const ERAS = RAW.eras;
  const ERA = Object.fromEntries(ERAS.map((e) => [e.id, e]));

  // ================= save =================
  const SAVE = 'relogio-v2';
  const NEW = () => ({ v: 2, era: 'hoje', pos: {}, gold: 0, cards: [], items: [], eras: { prologo: { visited: true } }, quests: {}, secrets: [], main: 0, flags: {}, fog: {} });
  let G;
  try { G = { ...NEW(), ...JSON.parse(localStorage[SAVE] || '{}') }; } catch { G = NEW(); }
  const save = () => { try { localStorage[SAVE] = JSON.stringify(G); } catch { /* sem armazenamento: joga sem salvar */ } };

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
    if (AC) return AC;
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); MASTER = AC.createGain(); MASTER.gain.value = muted ? 0 : 0.5; MASTER.connect(AC.destination); } catch { AC = null; }
    return AC;
  }
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const freq = (n) => { const m = /^([A-G]#?)(\d)$/.exec(n); return m ? 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12) : 0; };
  function tone(f, t, len, wave = 'square', vol = 0.15, f2 = 0) {
    if (!AC) return;
    const o = AC.createOscillator(), v = AC.createGain();
    o.type = wave; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(v).connect(MASTER); o.start(t); o.stop(t + len + 0.02);
  }
  function noise(t, len, vol = 0.12) {
    if (!AC) return;
    const b = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = AC.createBufferSource(), v = AC.createGain();
    s.buffer = b; v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(v).connect(MASTER); s.start(t);
  }
  function sfx(n) {
    if (!audio()) return;
    const t = AC.currentTime + 0.01;
    ({
      bip: () => tone(880, t, 0.03, 'square', 0.05),
      tap: () => tone(660, t, 0.05, 'square', 0.08),
      coin: () => { tone(988, t, 0.08, 'square', 0.1); tone(1319, t + 0.08, 0.2, 'square', 0.1); },
      ok: () => { tone(660, t, 0.1); tone(880, t + 0.1, 0.1); tone(1320, t + 0.2, 0.2); },
      bad: () => { tone(220, t, 0.25, 'sawtooth', 0.12); tone(160, t + 0.2, 0.3, 'sawtooth', 0.12); },
      hit: () => noise(t, 0.15, 0.2),
      fall: () => tone(800, t, 0.9, 'triangle', 0.2, 80),
      portal: () => { tone(80, t, 0.6, 'triangle', 0.2, 900); [523, 659, 784, 1047].forEach((f, i) => tone(f, t + 0.5 + i * 0.07, 0.2, 'square', 0.08)); },
      sino: () => { tone(220, t, 2, 'sine', 0.3); tone(440, t, 1.2, 'sine', 0.08); },
      win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.18, 'square', 0.1)),
    })[n]?.();
  }
  // Músicas: trilhas como strings de notas, uma por passo de colcheia; '.' = pausa; 'x' = ruído.
  const SONGS = {
    title: { bpm: 120, tracks: [
      ['square', 0.07, 'C5 . G5 . C6 . . . G5 . E5 . G5 . . . F5 . A5 . C6 . . . G5 . B5 . D6 . . .'],
      ['triangle', 0.16, 'C3 . C3 . C3 . C3 . E3 . E3 . E3 . E3 . F3 . F3 . F3 . F3 . G3 . G3 . G3 . G3 .'],
      ['noise', 0.05, 'x . . . x . x . x . . . x . x . x . . . x . x . x . . . x x x x'],
    ] },
    hoje: { bpm: 96, tracks: [
      ['triangle', 0.12, 'E5 . G5 . C6 . G5 . F5 . A5 . C6 . A5 . E5 . G5 . C6 . G5 . D5 . F5 . B5 . G5 .'],
      ['square', 0.04, 'C3 . . C3 . . G2 . A2 . . A2 . . E2 . F2 . . F2 . . C3 . G2 . . G2 . . D3 .'],
      ['noise', 0.025, '. . x . . . x . . . x . . . x . . . x . . . x . . . x . . . x .'],
    ] },
  };
  let song = null, songStep = 0, songNext = 0;
  function music(name) {
    if (song?.name === name) return;
    song = SONGS[name] ? { name, ...SONGS[name], parsed: SONGS[name].tracks.map(([w, v, s]) => [w, v, s.split(/\s+/)]) } : null;
    songStep = 0; songNext = AC ? AC.currentTime + 0.05 : 0;
  }
  setInterval(() => {
    if (!song || !AC) return;
    const dt = 60 / song.bpm / 2;
    while (songNext < AC.currentTime + 0.12) {
      for (const [w, v, notes] of song.parsed) {
        const n = notes[songStep % notes.length];
        if (n === 'x') noise(songNext, 0.05, v);
        else if (n !== '.') tone(freq(n), songNext, dt * 0.95, w, v);
      }
      songStep++; songNext += dt;
    }
  }, 25);
  const sndBtn = document.getElementById('snd');
  const setMute = (m) => { muted = m; G.flags.muted = m; save(); if (MASTER) MASTER.gain.value = m ? 0 : 0.5; sndBtn.textContent = m ? '×' : '♪'; };
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
  // Imagem "pixelizada": desenha pequena e amplia sem suavização.
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

  // ================= bonecos (tudo em fillRect) =================
  // Paletas dos personagens: traços conforme a ficha de cada um.
  const PAL = {
    buck: { skin: '#e2b48c', hair: '#6b4a2a', shirt: '#c0392b', plaid: '#7a1f14', vest: '#4a3222', pants: '#3a4a6a', boots: '#3a2212', hat: 'stetson', hatc: '#6b4a2a', bandana: '#2d6cdf', canteen: 1 },
    sineiro: { skin: '#5a3a28', hair: '#eeeeee', shirt: '#f2efe6', pants: '#3a4a7a', boots: null, beard: '#e0e0e0' },
    cobrador: { skin: '#e8d8c8', hair: '#f0f0f0', shirt: '#1d2a6b', buttons: '#e8c04a', pants: '#1a1a1a', boots: '#111', hat: 'tricorne', hatc: '#111' },
    tiradentes: { skin: '#e2b48c', hair: '#3a2a1a', shirt: '#efe5cc', pants: '#3a3a3a', boots: '#2a1a0a', beard: '#3a2a1a', long: 1 },
    silverio: { skin: '#e8c8a8', hair: '#3a2a1a', shirt: '#2f4f2f', pants: '#1f2f1f', boots: '#111', hat: 'tricorne', hatc: '#1f2f1f', mustache: '#2a1a0a' },
    antonil: { skin: '#e8c8a8', hair: '#5a4a3a', shirt: '#111111', pants: '#111111', boots: '#111', robe: 1, hat: 'barrete', hatc: '#111' },
    quitandeira: { skin: '#6a4430', hair: '#b23a2b', shirt: '#c9a86a', pants: '#c9a86a', boots: null, robe: 1, turban: '#b23a2b', tray: 1 },
    tropeiro: { skin: '#c89a74', hair: '#3a2a1a', shirt: '#a0522d', plaid: '#e0c080', pants: '#5a4a3a', boots: '#3a2212', hat: 'leather', hatc: '#7a5a3a' },
    caramuru: { skin: '#b07a52', hair: '#1a1a1a', shirt: null, paint: '#b23a2b', pants: '#6a4a2a', boots: null, cocar: 1 },
  };
  function dude(x, y, P, ph, face, u = 2, moving = true) {
    const R = (dx, dy, w, h, c) => { if (c) { g.fillStyle = c; g.fillRect(Math.round(x + dx * u), Math.round(y + dy * u), Math.ceil(w * u), Math.ceil(h * u)); } };
    const sw = moving ? Math.sin(ph) : 0;
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, 6 * u, 2 * u, 0, 0, 7); g.fill();
    const side = face === -1 || face === 2;
    // pernas e pés
    if (!P.robe) {
      const l1 = Math.round(sw * 1.5), l2 = -l1;
      R(-3, -7 + Math.max(0, l1), 2.5, 7 - Math.max(0, l1), P.pants); R(0.5, -7 + Math.max(0, l2), 2.5, 7 - Math.max(0, l2), P.pants);
      R(-3, -2, 2.5, 2, P.boots || P.skin); R(0.5, -2, 2.5, 2, P.boots || P.skin);
    } else { R(-4, -8, 8, 8, P.pants); R(-3, -1, 2, 1, P.boots || P.skin); R(1, -1, 2, 1, P.boots || P.skin); }
    // tronco
    const shirt = P.shirt || P.skin;
    R(-4, -14, 8, 7, shirt);
    if (P.plaid) { R(-2.5, -14, 1, 7, P.plaid); R(0.5, -14, 1, 7, P.plaid); R(-4, -11, 8, 1, P.plaid); }
    if (P.paint) { R(-3, -13, 6, 1, P.paint); R(-3, -10, 6, 1, P.paint); }
    if (P.vest && face !== 1) { R(-4, -14, 2, 7, P.vest); R(2, -14, 2, 7, P.vest); }
    if (P.buttons && face !== 1) { R(-0.5, -13, 1, 1, P.buttons); R(-0.5, -11, 1, 1, P.buttons); R(-0.5, -9, 1, 1, P.buttons); }
    if (P.canteen) R(face === 2 ? 3 : -5, -9, 2, 2.5, '#b0b0b0');
    // braços
    const a = Math.round(sw * 1.5);
    if (!side) { R(-6, -14 + a * 0.3, 2, 6, shirt); R(4, -14 - a * 0.3, 2, 6, shirt); R(-6, -8 + a * 0.3, 2, 1.5, P.skin); R(4, -8 - a * 0.3, 2, 1.5, P.skin); }
    else { R(face === 2 ? -1 + a * 0.5 : -1 - a * 0.5, -13, 2, 6, shirt); }
    if (P.bandana) R(-3, -15, 6, 1.5, P.bandana);
    // cabeça
    R(-3, -20, 6, 6, P.skin);
    if (P.long) { R(-3.5, -21, 7, 2, P.hair); R(-3.5, -20, 1, 6, P.hair); R(2.5, -20, 1, 6, P.hair); }
    else R(-3, -21, 6, 1.5, P.hair);
    if (face === 1) R(-3, -20, 6, 5, P.hair); // de costas
    else {
      const ex = face === -1 ? [-2] : face === 2 ? [1] : [-2, 1];
      for (const e of ex) R(e, -18, 1, 1, '#1a1a1a');
      if (P.beard) R(-3, -16, 6, 2.2, P.beard);
      if (P.mustache) R(-2, -16, 4, 0.8, P.mustache);
    }
    if (P.turban) { R(-3.5, -23, 7, 3, P.turban); if (P.tray) { R(-5, -24.5, 10, 1.5, '#e0c080'); R(-3, -25.5, 1, 1, '#d33'); R(0, -25.5, 1, 1, '#3a3'); R(2, -25.5, 1, 1, '#fc3'); } }
    if (P.hat === 'stetson') { R(-5.5, -21.5, 11, 1.5, P.hatc); R(-3, -24, 6, 2.5, P.hatc); R(-3, -22.3, 6, 0.6, '#3a2212'); }
    if (P.hat === 'tricorne') { R(-5, -22, 10, 1.5, P.hatc); R(-3, -23.5, 6, 1.5, P.hatc); }
    if (P.hat === 'leather') { R(-5, -21.5, 10, 1.2, P.hatc); R(-2.5, -23.5, 5, 2, P.hatc); }
    if (P.hat === 'barrete') R(-3, -23, 6, 2, P.hatc);
    if (P.cocar) { R(-3, -23, 1, 2, '#e33'); R(-1, -24, 1, 3, '#fc3'); R(1, -23, 1, 2, '#3a3'); }
  }
  // Dona Mula: quatro patas, baús, sem cabeça, chama azul e brinco flutuando.
  function mula(x, y, ph, dir, u = 2, moving = true, t = 0) {
    const f = dir < 0 ? -1 : 1;
    const R = (dx, dy, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + (f > 0 ? dx : -dx - w) * u), Math.round(y + dy * u), Math.ceil(w * u), Math.ceil(h * u)); };
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, 8 * u, 2 * u, 0, 0, 7); g.fill();
    const s = moving ? Math.sin(ph) * 1.2 : 0;
    R(-6, -6 + Math.max(0, s), 1.6, 6 - Math.max(0, s), '#6a5a4a'); R(-3, -6 + Math.max(0, -s), 1.6, 6 - Math.max(0, -s), '#7a6a5a');
    R(3, -6 + Math.max(0, -s), 1.6, 6 - Math.max(0, -s), '#6a5a4a'); R(5.5, -6 + Math.max(0, s), 1.6, 6 - Math.max(0, s), '#7a6a5a');
    R(-7, -12, 14, 6, '#8a7a6a'); R(-8, -11, 1.5, 4, '#6a5a4a');           // corpo e rabo
    R(-5, -14, 5, 5, '#5a3a1a'); R(-5, -12, 5, 0.8, '#b08a3a');            // baú
    R(5, -16, 3, 5, '#8a7a6a');                                           // pescoço (sem cabeça)
    const fl = Math.floor(t * 8) % 3;
    R(4.5, -19 - fl * 0.5, 4, 3 + fl * 0.5, '#4aa8ff'); R(5.5, -21 - fl, 2, 2.5, '#bfe3ff');
    R(9 + Math.sin(t * 3), -21 + Math.cos(t * 2), 1.2, 1.2, '#f0c040');    // brinco
  }

  // ================= partículas =================
  let PARTS = [];
  function confetti(x = W / 2, y = H / 3, n = 80) {
    const cols = ['#ffd84a', '#ff5a5a', '#4ad8ff', '#7aff6a', '#ff9af0', '#fff'];
    for (let i = 0; i < n; i++) PARTS.push({ x, y, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 380 - 80, c: cols[i % cols.length], life: 2 + Math.random() });
  }
  function drawParts(dt) {
    PARTS = PARTS.filter((p) => (p.life -= dt) > 0);
    for (const p of PARTS) { p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = p.c; g.fillRect(p.x, p.y, 6, 6); }
  }

  // ================= diálogo, escolha, faixa, transição =================
  let DLG = null, ASK = null, BANNER = null, TR = null, PANEL = null;
  const PAGE = 4, CPS = 50;
  function say(lines, done) {
    const pages = [];
    for (const [who, text] of lines) {
      const hasP = who && who !== 'narr';
      const ls = wrap(text, hasP ? W - 260 : W - 100, 16);
      for (let i = 0; i < ls.length; i += PAGE) pages.push({ who, lines: ls.slice(i, i + PAGE) });
    }
    DLG = { pages, i: 0, shown: 0, done, bipAt: 0 };
  }
  function dlgTap() {
    const p = DLG.pages[DLG.i], total = p.lines.join('').length;
    if (DLG.shown < total) { DLG.shown = total; return; }
    sfx('tap');
    if (++DLG.i >= DLG.pages.length) { const d = DLG.done; DLG = null; d?.(); } else DLG.shown = 0;
  }
  function drawDlg(dt, t) {
    const p = DLG.pages[DLG.i];
    const total = p.lines.join('').length;
    if (DLG.shown < total) { DLG.shown = Math.min(total, DLG.shown + CPS * dt); if (DLG.shown - DLG.bipAt >= 2) { DLG.bipAt = DLG.shown; sfx('bip'); } } else DLG.bipAt = 0;
    const y0 = H - 196;
    box(16, y0, W - 32, 180);
    const c = CHARS[p.who];
    let tx = 48;
    if (c) {
      const im = img(`img/p_${p.who}.png`);
      g.fillStyle = '#0a1040'; g.fillRect(30, y0 + 22, 136, 136);
      if (im) { g.imageSmoothingEnabled = false; g.drawImage(im, 30, y0 + 22, 136, 136); }
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(30, y0 + 22, 136, 136);
      tx = 190;
      const name = c.name.length > 24 ? c.name.split(' ').slice(0, 3).join(' ') : c.name;
      g.font = `12px ${FONT}`; const nw = g.measureText(name).width + 24;
      g.fillStyle = '#ffd84a'; g.fillRect(tx - 6, y0 - 14, nw, 26); g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(tx - 6, y0 - 14, nw, 26);
      g.fillStyle = '#1a1030'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(name, tx + 6, y0 - 7);
    }
    let left = Math.floor(DLG.shown);
    p.lines.forEach((l, k) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; txt(s, tx, y0 + 30 + k * 30, 16, '#fff'); });
    if (DLG.shown >= total && Math.floor(t * 3) % 2) txt('▼', W - 60, y0 + 146, 14, '#ffd84a');
  }
  function ask(q, opts, cb) { ASK = { q, opts, cb, rects: [] }; }
  function drawAsk() {
    const qs = wrap(ASK.q, W - 100, 14);
    const two = ASK.opts.length === 4;
    const rows = two ? 2 : ASK.opts.length;
    const h = 40 + qs.length * 24 + rows * 50 + 20;
    const y0 = H - h - 16;
    box(16, y0, W - 32, h);
    qs.forEach((l, i) => txt(l, 48, y0 + 26 + i * 24, 14, '#ffd84a'));
    ASK.rects = ASK.opts.map((o, i) => {
      const col = two ? i % 2 : 0, row = two ? Math.floor(i / 2) : i;
      const bw = two ? (W - 112) / 2 : W - 96;
      const r = [48 + col * (bw + 16), y0 + 30 + qs.length * 24 + row * 50, bw, 42];
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(...r); g.strokeStyle = '#8a9ad8'; g.lineWidth = 2; g.strokeRect(...r);
      txt(`${'ABCD'[i]}) ${o}`.slice(0, two ? 34 : 62), r[0] + 12, r[1] + 14, 12, '#fff');
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
  // Transição: mosaico + escurecer (0,4 s), troca a cena, clareia, mostra o título do lugar.
  const mos = document.createElement('canvas');
  function go(next, title) { if (!TR) TR = { t: 0, next, title, swapped: false }; }
  function drawTR(dt) {
    TR.t += dt;
    const k = TR.t < 0.4 ? TR.t / 0.4 : Math.max(0, 1 - (TR.t - 0.4) / 0.3);
    if (TR.t >= 0.4 && !TR.swapped) { TR.swapped = true; setScene(TR.next); if (TR.title) banner(TR.title); }
    if (k > 0) {
      const f = 1 + Math.floor(k * 24);
      mos.width = Math.ceil(W / f); mos.height = Math.ceil(H / f);
      mos.getContext('2d').drawImage(cv, 0, 0, mos.width, mos.height);
      g.imageSmoothingEnabled = false; g.drawImage(mos, 0, 0, mos.width, mos.height, 0, 0, W, H);
      g.fillStyle = `rgba(0,0,0,${k})`; g.fillRect(0, 0, W, H);
    }
    if (TR.t >= 0.7) TR = null;
  }

  // ================= mapa: rascunho em pixel art, grade, A* =================
  const MAPCACHE = {};
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // Pinta o rascunho (metade da resolução: cada texel vira 4 px na tela) e a máscara de caminhada.
  function paintDraft(M) {
    const S = 0.5, w = M.w * S, h = M.h * S, D = M.draft, rnd = rng(7);
    const art = document.createElement('canvas'); art.width = w; art.height = h;
    const mk = document.createElement('canvas'); mk.width = w; mk.height = h;
    const a = art.getContext('2d'), m = mk.getContext('2d');
    const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S))); c.closePath(); };
    const line = (c, pts, lw, col, dash) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * S, y * S) : c.moveTo(x * S, y * S))); c.lineWidth = lw * S; c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
    // mar
    a.fillStyle = '#2a6fb0'; a.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { a.fillStyle = rnd() < 0.5 ? '#3a82c4' : '#245f9a'; a.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 3, 1); }
    // terra, praia, biomas
    a.save(); poly(a, D.land); a.fillStyle = '#e8d8a0'; a.fill(); a.clip();
    a.fillStyle = '#7aa24c'; poly(a, D.land); a.lineWidth = 14 * S; a.strokeStyle = '#e8d8a0'; a.fill();
    for (const [x, y, r, c] of D.biomes) { a.fillStyle = c; a.globalAlpha = 0.55; a.beginPath(); a.arc(x * S, y * S, r * S, 0, 7); a.fill(); }
    a.globalAlpha = 1; a.restore();
    poly(a, D.land); a.lineWidth = 10 * S; a.strokeStyle = '#e8d8a0'; a.stroke();
    // máscara: branco = bloqueado
    m.fillStyle = '#fff'; m.fillRect(0, 0, w, h); poly(m, D.land); m.fillStyle = '#000'; m.fill();
    m.lineWidth = 12 * S; m.strokeStyle = '#fff'; poly(m, D.land); m.stroke();
    // textura de grama
    const id = a.getImageData(0, 0, w, h), px = id.data;
    for (let i = 0; i < px.length; i += 4) if (px[i + 2] < 120 && rnd() < 0.08) { const k = rnd() < 0.5 ? 0.82 : 1.12; px[i] *= k; px[i + 1] *= k; px[i + 2] *= k; }
    a.putImageData(id, 0, 0);
    // rios
    for (const r of D.rivers) { line(a, r.pts, r.w, '#2f78c0'); line(a, r.pts, r.w * 0.45, '#4a94d8'); line(m, r.pts, r.w, '#fff'); }
    // serras
    for (const [x, y, r] of D.mountains) {
      m.fillStyle = '#fff'; m.beginPath(); m.arc(x * S, y * S, r * S * 0.85, 0, 7); m.fill();
      for (let k = 0; k < 6; k++) {
        const px2 = (x + (rnd() - 0.5) * r * 1.2) * S, py = (y + (rnd() - 0.5) * r) * S, s = (r * 0.5 + rnd() * r * 0.4) * S;
        a.fillStyle = '#7a7268'; a.beginPath(); a.moveTo(px2 - s, py + s * 0.7); a.lineTo(px2, py - s); a.lineTo(px2 + s, py + s * 0.7); a.fill();
        a.fillStyle = '#5a544c'; a.beginPath(); a.moveTo(px2, py - s); a.lineTo(px2 + s, py + s * 0.7); a.lineTo(px2 + s * 0.2, py + s * 0.7); a.fill();
        a.fillStyle = '#f0f0f0'; a.beginPath(); a.moveTo(px2 - s * 0.25, py - s * 0.5); a.lineTo(px2, py - s); a.lineTo(px2 + s * 0.25, py - s * 0.5); a.fill();
      }
    }
    // estradas (desbloqueiam; sobre rio viram ponte)
    for (const r of D.roads) {
      line(a, r.pts, r.w + 4, '#a8875a', r.dotted ? null : null);
      line(a, r.pts, r.w, r.dotted ? '#e2c88e' : '#d9bf8a');
      if (r.dotted) line(a, r.pts, r.w * 0.25, '#9a7a4a', [6, 8]);
      line(m, r.pts, r.w, '#000');
      // pontes: onde o traçado passa por rio
      for (let i = 1; i < r.pts.length; i++) {
        const [x0, y0] = r.pts[i - 1], [x1, y1] = r.pts[i], n = Math.hypot(x1 - x0, y1 - y0) / 4;
        for (let k = 0; k <= n; k++) {
          const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
          if (D.rivers.some((rv) => nearPoly(rv.pts, x, y) < rv.w / 2)) { a.fillStyle = '#7a5532'; a.fillRect((x - r.w / 2) * S, (y - 2) * S, r.w * S, 4 * S); a.fillStyle = '#5a3a1a'; a.fillRect((x - r.w / 2) * S, (y - 2) * S, r.w * S, 1); }
        }
      }
    }
    // vilas: casinhas brancas de telhado vermelho e uma igreja (bloqueiam)
    for (const [tx, ty, n] of D.towns) {
      for (let k = 0; k < n; k++) {
        const hx = (tx + (rnd() - 0.5) * 22 * Math.sqrt(n)) * S, hy = (ty + (rnd() - 0.5) * 18 * Math.sqrt(n)) * S;
        if (m.getImageData(hx, hy, 1, 1).data[0] < 128 && !onRoad(D, hx / S, hy / S, 8)) {
          a.fillStyle = '#f2ece0'; a.fillRect(hx - 4, hy - 2, 8, 5); a.fillStyle = '#b8452e'; a.fillRect(hx - 5, hy - 5, 10, 3); a.fillStyle = '#5a3a2a'; a.fillRect(hx - 1, hy + 1, 2, 2);
          m.fillStyle = '#fff'; m.fillRect(hx - 4, hy - 4, 8, 7);
        }
      }
      const cx2 = tx * S + 10, cy2 = ty * S - 12;
      if (!onRoad(D, cx2 / S, cy2 / S, 10)) {
        a.fillStyle = '#fafafa'; a.fillRect(cx2 - 5, cy2 - 4, 10, 9); a.fillRect(cx2 - 6, cy2 - 9, 3, 6); a.fillRect(cx2 + 3, cy2 - 9, 3, 6);
        a.fillStyle = '#3a6ad0'; a.fillRect(cx2 - 1, cy2 + 1, 2, 4); a.fillStyle = '#d9a03a'; a.fillRect(cx2 - 6, cy2 - 10, 3, 1); a.fillRect(cx2 + 3, cy2 - 10, 3, 1);
        m.fillStyle = '#fff'; m.fillRect(cx2 - 6, cy2 - 10, 12, 15);
      }
    }
    return { art, mask: m.getImageData(0, 0, w, h), S };
  }
  function nearPoly(pts, x, y) {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    return best;
  }
  const onRoad = (D, x, y, pad) => D.roads.some((r) => nearPoly(r.pts, x, y) < r.w / 2 + pad);

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
    const K = { M, art, S, gw, gh, grid };
    // sela o que não se liga ao ponto inicial (ilhas viram parede, como no Arthur)
    const st = nearestFree(K, ...M.pois[M.start]);
    const seen = new Uint8Array(gw * gh), q = [st[0] + st[1] * gw];
    seen[q[0]] = 1;
    while (q.length) { const c = q.pop(), x = c % gw, y = (c / gw) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = ny * gw + nx; if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && !seen[n] && !grid[n]) { seen[n] = 1; q.push(n); } } }
    for (let i = 0; i < grid.length; i++) if (!seen[i]) grid[i] = 1;
    // minimapa (160 px de largura) e névoa
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
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(x * s, y * s, 9, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
  }
  const blockedAt = (K, x, y) => { const cx = Math.floor(x / K.M.cell), cy = Math.floor(y / K.M.cell); return cx < 0 || cy < 0 || cx >= K.gw || cy >= K.gh || K.grid[cy * K.gw + cx] === 1; };
  function nearestFree(K, x, y) {
    let cx = Math.max(0, Math.min(K.gw - 1, Math.floor(x / K.M.cell))), cy = Math.max(0, Math.min(K.gh - 1, Math.floor(y / K.M.cell)));
    if (!K.grid[cy * K.gw + cx]) return [cx, cy];
    for (let r = 1; r < 60; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && ny >= 0 && nx < K.gw && ny < K.gh && !K.grid[ny * K.gw + nx]) return [nx, ny];
    }
    return [cx, cy];
  }
  // A* 8 direções com heap binário; não corta quina; depois alisa por linha de visão.
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

  // ================= missão principal =================
  // Cada passo: texto, mapa e alvo (POI, buraco 'hole:<era>' ou NPC).
  const MAIN = [
    { text: 'Ache o Sineiro em São João del-Rei', map: 'hoje', at: 'sineiro' },
    { text: 'Caia no buraco de Minas (1700)', map: 'hoje', at: 'hole:ouro' },
  ];

  // ================= cenas =================
  let scene = null;
  function setScene(s) { scene = s; s.enter?.(); }

  const Title = () => ({
    t: 0,
    enter() { music('title'); },
    update(dt) { this.t += dt; },
    draw() {
      const im = img('assets/img/scenes/mirante.webp');
      if (im) pixelImage(im, 3, 0.15); else { g.fillStyle = '#1a1030'; g.fillRect(0, 0, W, H); }
      g.fillStyle = 'rgba(10,16,70,.55)'; g.fillRect(0, 40, W, 170);
      txt('Relógio de Sol', W / 2, 70, 44, '#ffd84a', 'center'); // a fonte pixel não tem Ó maiúsculo
      txt('Buck Calhoun, perdido no tempo', W / 2, 150, 16, '#fff', 'center');
      if (Math.floor(this.t * 2) % 2) txt(G.main > 0 || G.cards.length ? 'TOQUE PARA CONTINUAR' : 'TOQUE PARA COMEÇAR', W / 2, H - 90, 16, '#fff', 'center');
    },
    tap() { audio(); sfx('ok'); go(G.flags.intro ? OW('hoje') : Intro(), G.flags.intro ? 'Brasil · Hoje' : null); },
    key(k) { if (k === 'Enter' || k === ' ') this.tap(); },
  });

  const Intro = () => ({
    enter() {
      music(null);
      say([
        ['buck', 'Que sede, partner... Esse chafariz parece limpinho.'],
        ['mula', 'Eu não beberia, cowboy. Esse chafariz é bebedouro, cocho de cavalo e lavanderia.'],
        ['narr', 'Buck bebeu. O céu girou. Quando parou, o Brasil inteiro estava cheio de buracos no tempo.'],
      ], () => { G.flags.intro = 1; save(); sfx('fall'); go(OW('hoje'), 'Brasil · Hoje'); });
    },
    update() {},
    draw() { const im = img('assets/img/scenes/chafariz.webp'); if (im) pixelImage(im, 3, 0.1); else { g.fillStyle = '#222'; g.fillRect(0, 0, W, H); } },
  });

  // Overworld parametrizado pelo mapa (Hoje e, a partir da Fase 1, cada era).
  const OW = (id) => {
    const K = loadMap(id), M = K.M;
    const startPt = G.pos[id] || M.pois[M.start];
    const P = { x: startPt[0], y: startPt[1], path: [], face: 0, ph: 0, moving: false };
    const mulaS = { x: P.x - 20, y: P.y, dir: 1, ph: 0, moving: false };
    const trail = [];
    const npcs = [{ id: 'sineiro', x: M.pois.sineiro[0], y: M.pois.sineiro[1], face: 0 }];
    let camx = 0, camy = 0, tt = 0, saveT = 0, fogT = 0, holeMsg = {};
    let hudRects = {};
    const cam = () => { camx = Math.max(0, Math.min(M.w - W / Z, P.x - W / Z / 2)); camy = Math.max(0, Math.min(M.h - H / Z, P.y - H / Z / 2)); };
    cam();
    const target = () => {
      const m = MAIN[G.main];
      if (!m || m.map !== id) return null;
      if (m.at.startsWith('hole:')) return M.holes[m.at.slice(5)];
      return M.pois[m.at];
    };
    function walkTo(wx, wy) {
      const s = nearestFree(K, P.x, P.y), t = nearestFree(K, wx, wy);
      const p = astar(K, s[0], s[1], t[0], t[1]);
      if (p) { P.path = p; sfx('tap'); }
    }
    function talk(n) {
      if (n.id === 'sineiro' && G.main === 0) {
        say([
          ['sineiro', 'Você bebeu do chafariz, não foi? Todo ano aparece um.'],
          ['sineiro', 'Os sinos daqui falam. E estão avisando: o tempo rachou. Tem buraco do Amazonas a Porto Seguro.'],
          ['mula', 'Ele quer dizer que a gente vai cair em buraco. Literalmente.'],
          ['sineiro', 'Comece por Minas, 1700. Cada época tem pistas. Junte as pistas e o portal te traz de volta.'],
        ], () => { G.main = 1; save(); sfx('sino'); confetti(W / 2, H / 3, 40); });
      } else if (n.id === 'sineiro') say([['sineiro', 'Os sinos estão quietos. Siga a seta amarela, cowboy.']]);
    }
    return {
      enter() { music(M.music); G.era = id; G.eras[M.era] = { ...(G.eras[M.era] || {}), visited: true }; save(); },
      update(dt) {
        tt += dt;
        const busy = DLG || ASK || PANEL;
        // teclado: setas/WASD andam direto e cancelam o caminho
        let kx = (KEYS.ArrowRight || KEYS.d ? 1 : 0) - (KEYS.ArrowLeft || KEYS.a ? 1 : 0);
        let ky = (KEYS.ArrowDown || KEYS.s ? 1 : 0) - (KEYS.ArrowUp || KEYS.w ? 1 : 0);
        let vx = 0, vy = 0;
        const sp = 85;
        if (!busy && (kx || ky)) { P.path = []; const l = Math.hypot(kx, ky); vx = kx / l * sp; vy = ky / l * sp; }
        else if (!busy && P.path.length) {
          const [tx, ty] = P.path[0], dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy);
          if (d < 3) P.path.shift(); else { vx = dx / d * sp; vy = dy / d * sp; }
        }
        P.moving = !!(vx || vy);
        if (P.moving) {
          // colisão por eixo: desliza na parede
          if (!blockedAt(K, P.x + vx * dt, P.y)) P.x += vx * dt; else P.path = [];
          if (!blockedAt(K, P.x, P.y + vy * dt)) P.y += vy * dt; else P.path = [];
          P.face = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? -1 : 2) : (vy < 0 ? 1 : 0);
          P.ph += dt * 14;
          const last = trail[trail.length - 1];
          if (!last || Math.hypot(last[0] - P.x, last[1] - P.y) > 2) { trail.push([P.x, P.y]); if (trail.length > 40) trail.shift(); }
        }
        // Dona Mula segue ~24 px atrás pelo mesmo caminho
        const tgt = trail.length > 12 ? trail[trail.length - 12] : null;
        if (tgt) {
          const dx = tgt[0] - mulaS.x, dy = tgt[1] - mulaS.y, d = Math.hypot(dx, dy);
          mulaS.moving = d > 2;
          if (d > 2) { const s2 = Math.min(d, 95 * dt); mulaS.x += dx / d * s2; mulaS.y += dy / d * s2; if (Math.abs(dx) > 0.5) mulaS.dir = dx; mulaS.ph += dt * 12; }
        }
        cam();
        // névoa do minimapa
        if ((fogT += dt) > 0.25) { fogT = 0; clearFog(K, P.x, P.y); const f = (G.fog[id] ||= []); const l2 = f[f.length - 1]; if (!l2 || Math.hypot(l2[0] - P.x, l2[1] - P.y) > 40) f.push([Math.round(P.x), Math.round(P.y)]); }
        if ((saveT += dt) > 2) { saveT = 0; G.pos[id] = [Math.round(P.x), Math.round(P.y)]; save(); }
        if (busy) return;
        // NPCs: chegar perto = conversa
        for (const n of npcs) {
          const d = Math.hypot(n.x - P.x, n.y - P.y);
          if (d < 26 && !n.near) { n.near = true; P.path = []; talk(n); }
          if (d > 40) n.near = false;
        }
        // buracos (Fase 0: ainda fechados)
        for (const [era, [hx, hy]] of Object.entries(M.holes)) {
          const d = Math.hypot(hx - P.x, hy - P.y);
          if (d < 16 && !holeMsg[era]) { holeMsg[era] = 1; sfx('bad'); P.path = []; say([['narr', `Um buraco no tempo para ${ERA[era]?.range?.[0] ?? '?'}. Ele ainda está fechado: abre na próxima fase do jogo.`]]); }
          if (d > 40) holeMsg[era] = 0;
        }
      },
      draw(dt) {
        g.imageSmoothingEnabled = false;
        g.fillStyle = '#2a6fb0'; g.fillRect(0, 0, W, H);
        g.drawImage(K.art, camx * K.S, camy * K.S, (W / Z) * K.S, (H / Z) * K.S, 0, 0, W, H);
        const sx = (x) => (x - camx) * Z, sy = (y) => (y - camy) * Z;
        if (DEBUG) {
          g.fillStyle = 'rgba(255,0,0,.3)';
          const c0 = Math.floor(camx / M.cell), r0 = Math.floor(camy / M.cell);
          for (let cy = r0; cy < r0 + H / Z / M.cell + 1; cy++) for (let cx = c0; cx < c0 + W / Z / M.cell + 1; cx++) if (K.grid[cy * K.gw + cx]) g.fillRect(sx(cx * M.cell), sy(cy * M.cell), M.cell * Z, M.cell * Z);
        }
        // placas com nomes
        for (const [lx, ly, s] of M.labels || []) {
          if (lx < camx - 100 || lx > camx + W / Z + 100 || ly < camy - 20 || ly > camy + H / Z + 20) continue;
          g.font = `10px ${FONT}`; const w = g.measureText(s).width + 14;
          g.fillStyle = 'rgba(20,20,40,.8)'; g.fillRect(sx(lx) - w / 2, sy(ly) - 10, w, 20); txt(s, sx(lx), sy(ly) - 5, 10, '#fff', 'center');
        }
        // buracos no tempo: cratera escura, borda rachada, luz azul pulsando (dourada se concluído)
        for (const [era, [hx, hy]] of Object.entries(M.holes)) {
          const x = sx(hx), y = sy(hy);
          if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
          const done = G.eras[era]?.done, p = 0.5 + 0.5 * Math.sin(tt * 3 + hx);
          g.fillStyle = done ? `rgba(255,210,80,${0.25 + p * 0.3})` : `rgba(80,170,255,${0.25 + p * 0.35})`;
          g.beginPath(); g.ellipse(x, y, 26 + p * 4, 13 + p * 2, 0, 0, 7); g.fill();
          g.fillStyle = '#4a3a2a'; g.beginPath(); g.ellipse(x, y, 22, 11, 0, 0, 7); g.fill();
          g.fillStyle = '#0a0a18'; g.beginPath(); g.ellipse(x, y + 1, 17, 8, 0, 0, 7); g.fill();
          g.strokeStyle = '#2a1a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 22, y); g.lineTo(x - 28, y - 4); g.moveTo(x + 20, y + 4); g.lineTo(x + 27, y + 7); g.moveTo(x + 4, y - 11); g.lineTo(x + 7, y - 16); g.stroke();
          txt(String(ERA[era]?.range?.[0] ?? ''), x, y + 16, 8, done ? '#ffd84a' : '#bfe3ff', 'center');
        }
        // entidades ordenadas por y
        const ents = [
          { y: P.y, d: () => dude(sx(P.x), sy(P.y), PAL.buck, P.ph, P.face, 2, P.moving) },
          { y: mulaS.y, d: () => mula(sx(mulaS.x), sy(mulaS.y), mulaS.ph, mulaS.dir, 2, mulaS.moving, tt) },
          ...npcs.map((n) => ({ y: n.y, d: () => dude(sx(n.x), sy(n.y), PAL[n.id], 0, n.face, 2, false) })),
        ].sort((a, b) => a.y - b.y);
        ents.forEach((e) => e.d());
        // marcador da missão: triângulo pulsando; fora da tela, seta na borda com distância
        const tg = target();
        if (tg) {
          const x = sx(tg[0]), y = sy(tg[1]) - 64 - Math.abs(Math.sin(tt * 4)) * 8;
          if (x > 20 && x < W - 20 && y > 20 && y < H - 20) {
            g.fillStyle = '#ffd84a'; g.strokeStyle = '#000'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(x - 12, y - 14); g.lineTo(x + 12, y - 14); g.lineTo(x, y + 4); g.closePath(); g.stroke(); g.fill();
          } else {
            const cx = W / 2, cy = H / 2, ang = Math.atan2(sy(tg[1]) - cy, sx(tg[0]) - cx);
            const ex = cx + Math.cos(ang) * (W / 2 - 60), ey = cy + Math.sin(ang) * (H / 2 - 70);
            g.save(); g.translate(ex, ey); g.rotate(ang); g.fillStyle = '#ffd84a'; g.strokeStyle = '#000'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(18, 0); g.lineTo(-10, -13); g.lineTo(-10, 13); g.closePath(); g.stroke(); g.fill(); g.restore();
            txt(`${Math.round(Math.hypot(tg[0] - P.x, tg[1] - P.y))} km`, ex, ey + 18, 10, '#fff', 'center');
          }
        }
        // HUD: missão (topo-esq), minimapa (topo-dir), ouro/cards/itens (base-esq), faixa do tempo (base)
        const m = MAIN[G.main];
        if (m) { const ls = wrap(m.text, 360, 10); box(10, 10, 400, 34 + ls.length * 16, 0.85); txt('MISSÃO', 26, 22, 10, '#ffd84a'); ls.forEach((l, i) => txt(l, 26, 38 + i * 16, 10, '#fff')); }
        const mw = K.mini.width, mh = K.mini.height, mx = W - mw - 14, my = 12;
        g.fillStyle = '#000'; g.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
        g.imageSmoothingEnabled = true; g.drawImage(K.mini, mx, my); g.drawImage(K.fog, mx, my); g.imageSmoothingEnabled = false;
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(mx - 3, my - 3, mw + 6, mh + 6);
        const ms = mw / M.w;
        if (tg && Math.floor(tt * 3) % 2) { g.fillStyle = '#ffd84a'; g.fillRect(mx + tg[0] * ms - 3, my + tg[1] * ms - 3, 6, 6); }
        g.fillStyle = '#ff4a4a'; g.fillRect(mx + P.x * ms - 2, my + P.y * ms - 2, 5, 5);
        const items = G.items.map((i) => RAW.items.find((x) => x.id === i)?.icon || '').join('');
        box(10, H - 60, 150, 50, 0.85);
        txt(`★ ${G.cards.length}/${RAW.cards.length}`, 24, H - 48, 10, '#ffd84a'); txt(`$ ${G.gold}`, 24, H - 30, 10, '#fff');
        if (items) { box(10, H - 104, 150, 40, 0.85); txt(items, 24, H - 92, 14, '#fff'); }
        hudRects.timeline = drawTimeline(id, tt);
      },
      tap(x, y) {
        if (inR(x, y, hudRects.timeline)) { openTimeline(); return; }
        const wx = camx + x / Z, wy = camy + y / Z;
        if (DEBUG) console.log('mundo', Math.round(wx), Math.round(wy));
        walkTo(wx, wy);
      },
      key(k) { if (k === 't' || k === 'T') openTimeline(); },
    };
  };

  // ================= timeline mínima =================
  const ORDER = [...ERAS].filter((e) => e.id !== 'prologo').sort((a, b) => a.range[0] - b.range[0]).concat(ERAS.filter((e) => e.id === 'prologo'));
  function drawTimeline(current, tt) {
    const x0 = W / 2 - 300, y0 = H - 30, w = 600;
    box(x0 - 14, y0 - 22, w + 28, 40, 0.8);
    g.fillStyle = '#8a9ad8'; g.fillRect(x0, y0 - 1, w, 2);
    const curEra = window.MAPS[current]?.era;
    ORDER.forEach((e, i) => {
      const x = x0 + (i / (ORDER.length - 1)) * w, vis = G.eras[e.id]?.visited, cur = e.id === curEra;
      const r = cur ? 6 + Math.sin(tt * 5) * 2 : 5;
      g.fillStyle = vis ? e.color : '#0a1040'; g.strokeStyle = vis ? '#fff' : e.color; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y0, r, 0, 7); g.fill(); g.stroke();
      if (cur || i === 0 || i === ORDER.length - 1) txt(e.id === 'prologo' ? 'HOJE' : String(e.range[0]), x, y0 - 18, 8, cur ? '#ffd84a' : '#cfd6ff', 'center');
    });
    return [x0 - 14, y0 - 22, w + 28, 40];
  }
  function openTimeline() {
    sfx('tap');
    PANEL = { kind: 'timeline' };
  }
  function drawPanel() {
    box(40, 30, W - 80, H - 60, 0.96);
    txt('LINHA DO TEMPO', W / 2, 52, 16, '#ffd84a', 'center');
    const cols = 4, cw = (W - 120) / cols;
    ORDER.forEach((e, i) => {
      const x = 60 + (i % cols) * cw, y = 90 + Math.floor(i / cols) * 130;
      const vis = G.eras[e.id]?.visited;
      const im = img('assets/img/' + e.iconImg);
      g.globalAlpha = vis ? 1 : 0.35;
      if (im) g.drawImage(im, x, y, 64, 64);
      g.globalAlpha = 1;
      const total = RAW.cards.filter((c) => c.era === e.id).length, got = G.cards.filter((id) => RAW.cards.find((c) => c.id === id)?.era === e.id).length;
      txt(e.id === 'prologo' ? 'HOJE' : `${e.range[0]}`, x + 72, y + 4, 12, vis ? e.color : '#8a9ad8');
      wrap(e.name, cw - 80, 8).slice(0, 3).forEach((l, k) => txt(l, x + 72, y + 24 + k * 12, 8, '#fff'));
      txt(`★ ${got}/${total}`, x + 72, y + 64, 8, '#ffd84a');
    });
    txt('toque para fechar', W / 2, H - 56, 10, '#cfd6ff', 'center');
  }

  // ================= entrada =================
  const KEYS = {};
  const inR = (x, y, r) => r && x >= r[0] && y >= r[1] && x <= r[0] + r[2] && y <= r[1] + r[3];
  function toLogical(e) {
    const r = cv.getBoundingClientRect();
    if (!ROT) return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
    return [(e.clientY - r.top) / r.height * W, (r.right - e.clientX) / r.width * H];
  }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    audio();
    if (TR) return;
    const [x, y] = toLogical(e);
    if (PANEL) { PANEL = null; sfx('tap'); return; }
    if (ASK) { const i = ASK.rects.findIndex((r) => inR(x, y, r)); if (i >= 0) askPick(i); return; }
    if (DLG) { dlgTap(); return; }
    scene.tap?.(x, y);
  });
  addEventListener('keydown', (e) => {
    KEYS[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.key === 'm' || e.key === 'M') { audio(); setMute(!muted); return; }
    if (PANEL) { PANEL = null; return; }
    if (ASK) { const n = '123456789'.indexOf(e.key), l = 'abcd'.indexOf(e.key.toLowerCase()); askPick(n >= 0 ? n : l); return; }
    if (DLG) { if (e.key === 'Enter' || e.key === ' ') dlgTap(); return; }
    scene.key?.(e.key);
  });
  addEventListener('keyup', (e) => { KEYS[e.key] = false; });
  addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; });

  // ================= laço =================
  let last = performance.now(), T = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; T += dt;
    requestAnimationFrame(frame); // agenda antes: um erro num quadro não congela o jogo
    try {
      scene.update?.(dt);
      scene.draw(dt);
      drawParts(dt);
      if (PANEL) drawPanel();
      if (ASK) drawAsk();
      if (DLG) drawDlg(dt, T);
      if (BANNER) drawBanner(dt);
      if (TR) drawTR(dt);
    } catch (err) { if (!frame.err) console.error(err); frame.err = err; }
  }
  // Espera a fonte pixel para não desenhar o título com a fonte errada.
  (document.fonts?.load(`16px ${FONT}`) || Promise.resolve()).catch(() => {}).finally(() => {
    const q = /[?&]era=(\w+)/.exec(location.search);
    setScene(q && window.MAPS[q[1]] ? OW(q[1]) : Title());
    requestAnimationFrame(frame);
  });
  window.__game = { G, go, say, ask, confetti, loadMap, OW }; // depuração no console
})();
