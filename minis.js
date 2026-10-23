// Minigames do Relógio de Sol v2. Cada um é uma cena: MINIS[id](api) → { enter, update, draw, action, key, tap }.
// Diretriz: releitura de um clássico de fliperama/Atari, jogada só com joystick (A.keys / key(seta)) e o botão A
// (action). Toque na tela só no botão SAIR. A mecânica ensina (não o texto); vitória paga +10 de ouro.
// Perder (A.lose) gasta uma de 3 tentativas; esgotou, volta ao mapa e tenta quando quiser. Minigame com vidas próprias manda lose(motivo, true).
// api: g, W, H, txt, box, wrap, say, sfx, music, bg, dude, mula, PAL, CARD, G, win(prêmio), lose(motivo), quit().
'use strict';
window.MINIS = (() => {
  const inR = (x, y, r) => r && x >= r[0] && y >= r[1] && x <= r[0] + r[2] && y <= r[1] + r[3];
  // botão simples desenhado no canvas; devolve o retângulo para teste de toque
  function btn(A, r, label, col = '#ffd84a', fg = '#1a1030', size = 12) {
    if (A.pill) return A.pill(r, col, label, fg, size); // botão em pílula da interface nova
    const { g, plain } = A;
    g.fillStyle = col; g.fillRect(...r); g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeRect(...r);
    plain(label, r[0] + r[2] / 2, r[1] + r[3] / 2 - size / 2, size, fg, 'center');
    return r;
  }
  function head(A, title, sub, timeLeft, total) {
    const { g, W, txt, box } = A;
    box(10, 8, W - 20, 54, 0.88);
    (A.ttl || txt)(title, 28, 18, 13, '#ffd84a');
    if (sub) txt(sub, 28, 42, 9, '#fff');
    if (timeLeft != null) { const w = 220, rr = A.rr || ((x, y, ww, hh) => { g.beginPath(); g.rect(x, y, ww, hh); }); g.fillStyle = '#0a1040'; rr(W - w - 30, 26, w, 14, 7); g.fill(); g.fillStyle = timeLeft / total > 0.25 ? '#9be36a' : '#ff5a5a'; rr(W - w - 30, 26, Math.max(14, w * Math.max(0, timeLeft / total)), 14, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; rr(W - w - 30, 26, w, 14, 7); g.stroke(); txt(`${Math.ceil(timeLeft)}s`, W - w - 40, 26, 10, '#fff', 'right'); }
  }
  const QUIT = (A) => [A.W - 110, 72, 96, 30];
  const quitBtn = (A) => btn(A, QUIT(A), 'SAIR', '#8a9ad8', '#0a1040', 10);
  // tela de início: explica em uma linha e espera um toque
  function intro(A, title, lines) {
    const { g, W, H, txt, box, wrap } = A;
    const ls = lines.map((l) => wrap(l, W - 320, 11)), end = 186 + ls.reduce((a, l) => a + l.length * 20 + 8, 0); // a caixa cresce com o texto
    const bot = Math.max(372, end + 6), top = Math.max(70, Math.min(110, H - 40 - (bot - 110 + 38)));
    const dy = top - 110;
    box(120, top, W - 240, bot - 110 + 38, 0.95);
    (A.ttl || txt)(title, W / 2, 136 + dy, 16, '#ffd84a', 'center');
    let y = 186 + dy;
    for (const l of ls) { for (const s of l) { txt(s, W / 2, y, 11, '#fff', 'center'); y += 20; } y += 8; }
    txt('botão A (ou Espaço) para começar', W / 2, bot + dy, 11, '#9be36a', 'center');
  }

  // ===================== 1. A Régua dos Reis (Tordesilhas, 1494) =====================
  function regua(A) {
    const { g, W, H, txt } = A;
    // mapa em graus: x = 480 + (27 - longitude oeste) * 4,5 ; y = 92 + (44 - latitude norte) * 4,5
    const X0 = 140, X1 = 820, px = (lo) => 480 + (27 - lo) * 4.5, py = (la) => 92 + (44 - la) * 4.5;
    const REAL = px(46.6), OK = 25; // meridiano de Tordesilhas: 370 léguas a oeste de Cabo Verde (~46°37' O)
    const BR = [[51, 4], [50, 0], [44, -2.5], [38.5, -3.7], [35.2, -5.8], [34.8, -7.1], [35, -9], [37, -11], [38.5, -13], [39, -17], [40.3, -20.3], [42, -23], [45, -23.8], [48.5, -26.5], [48.8, -28.5], [51, -31], [53.4, -33.7], [57.6, -30.2], [54.6, -25.6], [55, -24], [57.9, -19], [60, -13.5], [65, -10], [70, -9.5], [73.9, -7.4], [69.9, -4.2], [69.5, 1], [67, 2], [63, 4], [60.7, 5.2], [59.5, 1.5], [56, 2], [54, 2.2], [51.5, 4.2]];
    const AF = [[17.5, 14.7], [16.8, 21], [13, 27.5], [9.8, 30.5], [5.9, 35.8], [-10, 37.3], [-20, 32], [-32, 31.3], [-34, 28], [-43, 12], [-51, 11.8], [-40, -15], [-35, -25], [-20, -34.8], [-18, -31], [-12, -17], [-13, -6], [-9, -1], [-9.5, 4], [-4, 5], [4, 5], [8, 4.5], [13, 9], [16.5, 12.3]];
    const IB = [[9.3, 43], [8, 43.7], [1.8, 43.4], [-3.2, 42.3], [-0.3, 39.5], [0.6, 38.7], [2, 36.7], [5.6, 36], [6.4, 36.8], [8.9, 37], [9.5, 38.8], [8.8, 41]];
    const PT = [[8.9, 42.1], [6.2, 41.9], [6.9, 40.2], [7.4, 38.5], [7.4, 37.2], [8.9, 37], [9.5, 38.8], [8.8, 41]];
    let x = 700, stage = 'intro', t = 0, reveal = 0;
    const poly = (pts, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); pts.forEach(([lo, la], k) => (k ? g.lineTo(px(lo), py(la)) : g.moveTo(px(lo), py(la)))); g.closePath(); g.fill(); g.globalAlpha = 1; };
    function world() {
      const perg = A.arte?.('pergaminho'); // textura de pergaminho (arte nova); os continentes continuam desenhados por cima, nas coordenadas certas
      if (perg) g.drawImage(perg, X0, 90, X1 - X0, 360); else { g.fillStyle = '#e8d8a8'; g.fillRect(X0, 90, X1 - X0, 360); }
      g.save(); g.beginPath(); g.rect(X0, 90, X1 - X0, 360); g.clip();
      poly(AF, '#c8a868', perg ? 0.75 : 1); poly(IB, '#c8a868', perg ? 0.75 : 1); poly(PT, '#b08a4a', perg ? 0.8 : 1);
      poly(BR, '#4a7a2a', 0.22 + reveal * 0.6); // sombra suave do Brasil (didática: em 1494 ninguém sabia que ele estava ali)
      g.restore();
      g.strokeStyle = '#7a5a2a'; g.lineWidth = 4; g.strokeRect(X0, 90, X1 - X0, 360);
      txt('Portugal', px(8.6) - 6, py(39.5) - 4, 7, '#3a2a10', 'right'); txt('Espanha', px(-1) + 4, py(41), 7, '#3a2a10');
      txt('ÁFRICA', px(-12), py(10), 9, '#7a5a2a', 'center');
      g.fillStyle = '#7a1a1a'; g.fillRect(px(24) - 3, py(15) - 3, 6, 6); txt('Cabo Verde', px(24), py(15) + 6, 7, '#5a3a1a', 'center');
      txt('Mar Oceano', px(32), py(30), 8, '#8a7a5a', 'center');
    }
    return {
      enter() { A.music('mundo'); },
      update(dt) { t += dt; if (stage === 'signed') reveal = Math.min(1, reveal + dt * 0.6); if (stage === 'play') x = Math.max(X0 + 10, Math.min(X1 - 10, x + ((A.keys.ArrowRight ? 1 : 0) - (A.keys.ArrowLeft ? 1 : 0)) * 200 * dt)); },
      draw() {
        g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, W, H);
        A.bg('img/bg_tordesilhas.jpg', 3, 0.35, '#3a2a1a');
        world();
        g.strokeStyle = '#a01a1a'; g.lineWidth = 4; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(x, 92); g.lineTo(x, 448); g.stroke(); g.setLineDash([]);
        if (stage === 'signed' && reveal > 0.6) { g.strokeStyle = '#1a3aa0'; g.lineWidth = 3; g.beginPath(); g.moveTo(REAL, 92); g.lineTo(REAL, 448); g.stroke(); txt('linha real', REAL + 6, 96, 8, '#1a3aa0'); }
        // cortesãos: Castela (esquerda) quer a linha mais a leste; Portugal (direita), mais a oeste
        const k = (x - X0) / (X1 - X0);
        A.dude(70, 430, A.PAL.cortesao, 0, 2, 4, false); A.dude(890, 430, { ...A.PAL.cortesao, shirt: '#2a6a2a' }, 0, -1, 4, false);
        txt('Castela', 70, 450, 8, '#fff', 'center'); txt('Portugal', 890, 450, 8, '#fff', 'center');
        txt(k > 0.5 ? ':)' : ':(', 70, 300, 16, k > 0.5 ? '#9be36a' : '#ff5a5a', 'center'); txt(k < 0.5 ? ':)' : ':(', 890, 300, 16, k < 0.5 ? '#9be36a' : '#ff5a5a', 'center');
        head(A, 'A Régua dos Reis · 1494', stage === 'signed' ? 'Em 1494 ninguém sabia o que havia do outro lado da linha.' : 'Leve a linha até 370 léguas a oeste de Cabo Verde. Depois, assine.');
        if (stage === 'play') txt('joystick move a linha · botão A assina', W / 2, H - 50, 10, '#ffd84a', 'center');
        if (stage === 'intro') intro(A, 'A Régua dos Reis', ['1494. Espanha e Portugal dividem o mundo com uma linha: 370 léguas a oeste de Cabo Verde.', 'A sombra verde é o Brasil. Em 1494 ninguém sabia que ele existia, mas aqui você aprende onde a linha caiu.', 'Mova a linha vermelha com o joystick e aperte A para assinar. Você tem 3 tentativas.']);
        quitBtn(A);
      },
      action() {
        if (stage === 'intro') { stage = 'play'; A.sfx('tap'); return; }
        if (stage !== 'play') return;
        stage = 'signed'; A.sfx('sino');
        const diff = Math.abs(x - REAL);
        setTimeout(() => {
          if (diff <= OK) A.say([['narr', 'A névoa se abre: atrás da linha havia um continente inteiro.'], ['mula', 'Quase em cima da linha de verdade: 370 léguas a oeste de Cabo Verde. Só a ponta leste do Brasil ficava com Portugal.'], ['mula', 'E ninguém perguntou nada para quem morava aqui.']], () => A.win({ card: 'C02', item: 'regua' }));
          else A.lose(`A linha ficou ${x > REAL ? 'a leste' : 'a oeste'} demais. A de verdade passava a 370 léguas de Cabo Verde, cortando o Brasil de Belém até Laguna.`);
        }, 1600);
      },
      tap(px0, py0) { if (inR(px0, py0, QUIT(A))) A.quit(); },
    };
  }

  // ===================== 2. Escambo (feitoria, 1502) — à moda do Frogger =====================
  // Buck pula de faixa em faixa: trilha com bichos, praia, e o mar com canoas, toras e jangadas
  // (cair na água ou ser pego custa uma vida). Leva 4 toras até a feitoria, troca e volta para buscar mais.
  function escambo(A) {
    const { g, W, H, txt } = A;
    const OFFERS = [['Machado', 100], ['Faca', 85], ['Miçangas', 25], ['Espelho', 10]];
    const TEMPO = 100, VIDAS = 3, CARGA = 4, META = 12, DIF = 1; // ajuste fino: segundos, vidas, toras por viagem, meta, velocidade das faixas
    const CELL = 46, TOP = 74, ROWS = 9, ry = (r) => TOP + (ROWS - 1 - r) * CELL; // linha 0 = mata (embaixo), 8 = feitoria (em cima)
    // faixas: kind land = bicho que atropela; water = plataforma que carrega (fora dela, água)
    const LANES = {
      1: { kind: 'land', obj: 'queixada', v: 70, w: 64, gap: 190 },
      2: { kind: 'land', obj: 'onca', v: -150, w: 56, gap: 330 },
      3: { kind: 'land', obj: 'queixada', v: 100, w: 104, gap: 230 },
      5: { kind: 'water', obj: 'canoa', v: -65, w: 140, gap: 120 },
      6: { kind: 'water', obj: 'tora', v: 95, w: 104, gap: 150 },
      7: { kind: 'water', obj: 'jangada', v: -75, w: 150, gap: 150 },
    };
    for (const L of Object.values(LANES)) { L.v *= DIF; L.span = L.w + L.gap; L.n = Math.ceil((W + L.span) / L.span) + 1; L.off = Math.random() * L.span; }
    const xs = (L) => Array.from({ length: L.n }, (_, i) => ((i * L.span + L.off) % (L.n * L.span)) - L.span);
    let stage = 'intro', sel = 0, P = { x: W / 2, r: 0, hop: 0, face: 2 }, carry = 0, logs = 0, util = [], lives = VIDAS, left = TEMPO, rects = [], msg = '', msgT = 0, t = 0, dead = 0;
    const avg = () => (util.length ? Math.round(util.reduce((a, b) => a + b, 0) / util.length) : 0);
    const say = (m) => { msg = m; msgT = 2.5; };
    function die(why) {
      lives--; A.sfx('hit'); A.shake(0.25); dead = 0.8;
      if (carry) why += ` ${carry} toras perdidas.`;
      carry = 0;
      if (lives <= 0) { stage = 'gone'; A.lose(`${why} Acabaram as 3 vidas.`, true); return; }
      say(lives > 1 ? A.trf('{0} Restam {1} vidas.', why, lives) : A.trf('{0} Resta 1 vida.', why));
      P.r = 0; P.x = W / 2; carry = CARGA; // recomeça na mata, com toras novas
    }
    function hop(dx, dy) {
      if (stage !== 'walk' || dead > 0) return;
      P.r = Math.max(0, Math.min(ROWS - 1, P.r + dy)); P.x = Math.max(24, Math.min(W - 24, P.x + dx * CELL)); P.hop = 0.15; A.sfx('hop');
      if (dx) P.face = dx > 0 ? 2 : -1;
      if (P.r === 0 && carry === 0) { carry = CARGA; say(`${CARGA} toras nas costas. Atravesse até a feitoria.`); }
      if (P.r === ROWS - 1 && carry > 0) { stage = 'offer'; A.sfx('coin'); }
    }
    function drawObj(o, x, y, w, v) {
      if (A.has?.(o)) { const unit = o === 'queixada' ? 52 : w, n = Math.max(1, Math.round(w / unit)); for (let k = 0; k < n; k++) A.spr(o, x + (k + 0.5) * (w / n), y, w / n, CELL * 0.92, v < 0); return; } // arte nova: bicho/objeto (repetido no bando)
      if (v < 0 && (o === 'onca' || o === 'queixada')) { g.save(); g.translate(2 * x + w, 0); g.scale(-1, 1); drawObj(o, x, y, w, 1); g.restore(); return; } // bicho olha para onde corre
      if (o === 'queixada') { for (let k = 0; k + 50 <= w + 4; k += 52) { g.fillStyle = '#3a2a22'; g.fillRect(x + k + 4, y - 12, 44, 22); g.fillRect(x + k + 40, y - 8, 12, 14); g.fillStyle = '#f2efe6'; g.fillRect(x + k + 48, y + 2, 4, 3); g.fillStyle = '#1a1210'; g.fillRect(x + k + 8, y + 10, 6, 6); g.fillRect(x + k + 34, y + 10, 6, 6); } }
      else if (o === 'onca') { g.fillStyle = '#e0a830'; g.fillRect(x, y - 10, w, 20); g.fillRect(x + w - 12, y - 16, 14, 14); g.fillStyle = '#3a2a10'; for (let k = 6; k < w - 8; k += 11) g.fillRect(x + k, y - 6 + (k % 2) * 6, 5, 5); g.fillRect(x - 10, y - 4, 12, 4); }
      else if (o === 'canoa') { g.fillStyle = '#6a3a1a'; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + w, y - 8); g.lineTo(x + w - 16, y + 12); g.lineTo(x + 16, y + 12); g.closePath(); g.fill(); g.fillStyle = '#8a5a32'; g.fillRect(x + 10, y - 8, w - 20, 5); g.fillStyle = '#b07a52'; g.fillRect(x + w / 2 - 4, y - 22, 8, 14); }
      else if (o === 'tora') { g.fillStyle = '#9a3a22'; g.fillRect(x, y - 12, w, 24); g.fillStyle = '#c86a4a'; g.fillRect(x, y - 12, 10, 24); g.fillStyle = '#7a2a18'; for (let k = 18; k < w; k += 22) g.fillRect(x + k, y - 12, 3, 24); }
      else if (o === 'jangada') { g.fillStyle = '#d8b878'; for (let k = 0; k < w; k += 16) g.fillRect(x + k, y - 14, 14, 28); g.fillStyle = '#8a6a3a'; g.fillRect(x, y - 2, w, 4); g.fillStyle = '#f2efe6'; g.fillRect(x + w / 2, y - 34, 3, 24); g.beginPath(); g.moveTo(x + w / 2 + 3, y - 34); g.lineTo(x + w / 2 + 26, y - 14); g.lineTo(x + w / 2 + 3, y - 14); g.fill(); }
    }
    return {
      enter() { A.music('paubrasil'); },
      update(dt) {
        t += dt; if (msgT > 0) msgT -= dt; if (P.hop > 0) P.hop -= dt; if (dead > 0) dead -= dt;
        for (const L of Object.values(LANES)) L.off = (L.off + L.v * dt + L.n * L.span) % (L.n * L.span);
        if (stage !== 'walk' || dead > 0) return;
        if ((left -= dt) <= 0) { stage = 'gone'; A.lose(`O tempo acabou com ${logs} de ${META} toras trocadas.`, true); return; }
        const L = LANES[P.r]; if (!L) return;
        const on = xs(L).find((x) => P.x > x + 6 && P.x < x + L.w - 6);
        if (L.kind === 'land') { if (on != null) die(L.obj === 'onca' ? 'A onça cruzou a trilha.' : 'O bando de queixadas passou por cima.'); }
        else if (on == null) die('Caiu na água.');
        else { P.x += L.v * dt; if (P.x < 8 || P.x > W - 8) die('A correnteza levou você para longe.'); }
      },
      draw() {
        // faixas (com fundo pintado, ficam translúcidas por cima dele)
        const pint = A.fundo?.(0);
        for (let r = 0; r < ROWS; r++) {
          const y = ry(r), L = LANES[r];
          g.globalAlpha = pint ? 0.35 : 1; g.fillStyle = r === 0 ? '#2f6a2a' : r === ROWS - 1 ? '#8a5a3a' : r === 4 ? '#e8d8a0' : L.kind === 'water' ? (r % 2 ? '#2a6fb0' : '#2a64a0') : (r % 2 ? '#6a8a3a' : '#5e7e34');
          g.fillRect(0, y, W, CELL);
          if (L?.kind === 'water') { g.fillStyle = 'rgba(255,255,255,.15)'; for (let k = 0; k < 14; k++) g.fillRect(((k * 97 + t * 30 * Math.sign(L.v)) % W + W) % W, y + 10 + (k % 3) * 12, 26, 2); }
          if (L?.kind === 'land') { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y + CELL / 2 - 1, W, 2); }
          g.globalAlpha = 1;
        }
        if (!A.has?.('fundo')) { g.fillStyle = '#2a5a24'; for (let k = 0; k < 16; k++) { g.beginPath(); g.arc(20 + k * 62, ry(0) + 10, 16, 0, 7); g.fill(); } } // copas antigas: o fundo pintado já tem a mata
        if (!A.spr?.('tora', W / 2, ry(0) + CELL / 2, 110, CELL - 4)) { g.fillStyle = '#9a3a22'; for (let k = 0; k < 3; k++) g.fillRect(W / 2 - 60 + k * 6, ry(0) + 28 - k * 6, 120 - k * 12, 6); }
        txt('MATA · PAU-BRASIL', 24, ry(0) + 30, 8, '#fff');
        if (!A.spr?.('feitoria', W / 2, ry(ROWS - 1) + CELL / 2, 160, CELL)) g.fillStyle = '#6a3a1a', g.fillRect(W / 2 - 70, ry(ROWS - 1) + 4, 140, 38); txt('FEITORIA', W / 2, ry(ROWS - 1) + 16, 11, '#ffd84a', 'center');
        txt('PRAIA', 24, ry(4) + 18, 8, '#7a6a3a');
        // bichos e plataformas
        for (const [r, L] of Object.entries(LANES)) for (const x of xs(L)) drawObj(L.obj, x, ry(+r) + CELL / 2, L.w, L.v);
        // Buck
        const by = ry(P.r) + CELL - 4 - (P.hop > 0 ? 8 : 0);
        if (!(dead > 0 && Math.floor(t * 12) % 2)) {
          A.dude(P.x, by, A.PAL.buck, t * 10, P.face, 2.4, P.hop > 0);
          for (let i = 0; i < carry; i++) { if (A.spr?.('tora', P.x, by - 48 - i * 7, 38, 9)) continue; g.fillStyle = '#9a3a22'; g.fillRect(P.x - 16, by - 50 - i * 6, 32, 5); }
        }
        head(A, 'Escambo · 1502', `Vidas: ${lives} · Toras: ${logs}/${META} · Utilidade: ${avg()}% (meta 70%)`, stage === 'intro' ? null : left, TEMPO);
        if (msgT > 0) { A.box(20, 68, W - 260, 28, 0.85); txt(msg, 20 + (W - 260) / 2, 76, 9, '#fff', 'center'); } // à esquerda dos botões do canto
        if (stage === 'offer') {
          A.box(220, 150, 520, 260, 0.96); txt(`O português oferece, por ${carry} toras (o relógio parou):`, W / 2, 175, 10, '#ffd84a', 'center');
          rects = OFFERS.map(([l], i) => btn(A, [250 + (i % 2) * 240, 210 + Math.floor(i / 2) * 80, 220, 60], l, i === sel ? '#ffd84a' : '#e8dcb0', '#1a1030', 12)); txt('joystick escolhe · A confirma', W / 2, 380, 9, '#fff', 'center');
        }
        if (stage === 'intro') intro(A, 'Escambo', ['Atravesse a trilha (cuidado com onças e queixadas) e o mar pulando nas canoas, toras e jangadas. Na água, fora delas, você cai.', `Leve ${CARGA} toras até a feitoria, escolha a troca e volte para buscar mais. Meta: ${META} toras com utilidade de 70%. Você tem ${VIDAS} vidas.`, 'Joystick (ou setas) para pular de casa em casa.']);
        quitBtn(A);
      },
      action() {
        if (stage === 'intro') { stage = 'walk'; carry = CARGA; return; }
        if (stage !== 'offer') return;
        const i = sel;
        logs += carry; for (let k = 0; k < carry; k++) util.push(OFFERS[i][1]); carry = 0; A.sfx(OFFERS[i][1] > 50 ? 'ok' : 'tap');
        say(OFFERS[i][1] > 50 ? `${OFFERS[i][0]}: isso muda a vida de quem corta árvore. Volte à mata.` : `${OFFERS[i][0]}: bonito, mas não corta nada. Volte à mata.`);
        if (logs >= META && avg() >= 70) { stage = 'done'; A.say([['caramuru', 'Agora você entendeu. O valor de uma coisa depende de quem precisa dela.'], ['mula', 'Machado de ferro para quem só tinha pedra: isso valia uma floresta. Literalmente.']], () => A.win({ card: 'C06', item: 'machado' })); return; }
        if (logs >= META) say('Muitas toras, pouca utilidade. Traga mais e troque melhor.');
        stage = 'walk';
      },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
      key(k) {
        if (stage === 'offer') { const st = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }[k]; if (st) { sel = (sel + st + 4) % 4; A.sfx('bip'); } return; }
        const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
        if (d) hop(...d);
      },
    };
  }

  // ===================== 3. A Carta em Pedaços (Porto Seguro, 1500) — à moda do Snake =====================
  // A cobra de papel junta os pedaços da carta de Caminha na ordem em que tudo aconteceu.
  // Parede, o próprio rabo ou o pedaço errado gastam uma tentativa.
  function carta(A) {
    const { g, W, H, txt } = A;
    const SEQ = [['Monte', 'Avistamos um monte alto e redondo.'], ['Âncora', 'Ancoramos diante da terra.'], ['Praia', 'Vimos homens na praia, pardos, nus.'], ['Trocas', 'Trocamos barretes e contas por arcos e cocares.'], ['Missa', 'Rezou-se a primeira missa na terra.'], ['Plantar', 'Nela, em se plantando, tudo dá.']];
    const TEMPO = 75, PASSO = 0.13, C = 24, X0 = 36, Y0 = 84, COLS = 37, ROWS = 18;
    let stage = 'intro', snake = [[8, 9], [7, 9], [6, 9]], dir = [1, 0], want = [1, 0], acc = 0, left = TEMPO, next = 0, grow = 0, t = 0, bits = [];
    const free = () => { for (;;) { const c = [2 + Math.floor(Math.random() * (COLS - 4)), 2 + Math.floor(Math.random() * (ROWS - 4))]; if (!snake.some((s) => s[0] === c[0] && s[1] === c[1]) && !bits.some((b) => Math.abs(b.c - c[0]) < 4 && Math.abs(b.r - c[1]) < 2)) return c; } };
    SEQ.forEach((s, i) => { const [c, r] = free(); bits.push({ i, c, r }); });
    function step() {
      if (want[0] !== -dir[0] || want[1] !== -dir[1]) dir = want;
      const h = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= COLS || h[1] >= ROWS) return fail('A cobra de papel bateu na beira da praia.');
      if (snake.some((s) => s[0] === h[0] && s[1] === h[1])) return fail('Enroscou no próprio rabo.');
      snake.unshift(h);
      const b = bits.find((x) => h[0] >= x.c && h[0] < x.c + 3 && h[1] === x.r);
      if (b) {
        if (b.i !== next) return fail(`Fora de ordem: "${SEQ[b.i][0]}" vem depois. O próximo era "${SEQ[next][0]}".`);
        bits = bits.filter((x) => x !== b); next++; grow += 3; A.sfx('coin');
        if (next >= SEQ.length) { stage = 'done'; A.say([['caminha', 'Senhor, posto que o capitão-mor e os outros capitães escrevam... eu também escrevo. E nesta ordem.'], ['mula', 'A primeira notícia do Brasil foi uma carta. E já tinha propaganda imobiliária no final.']], () => A.win({ card: 'C05' })); }
      }
      if (grow > 0) grow--; else snake.pop();
    }
    function fail(m) { stage = 'gone'; A.lose(m); }
    return {
      enter() { A.music('paubrasil'); },
      update(dt) {
        t += dt; if (stage !== 'play') return;
        if ((left -= dt) <= 0) return fail('O vento levou a carta antes de ela ficar inteira.');
        acc += dt; while (acc >= PASSO && stage === 'play') { acc -= PASSO; step(); }
      },
      draw() {
        A.bg('assets/img/scenes/porto_seguro.webp', 3, 0.15, '#5a8a3a');
        const tab = A.arte?.('tabuleiro'); if (tab) { g.globalAlpha = 0.95; g.drawImage(tab, X0, Y0, COLS * C, ROWS * C); g.globalAlpha = 1; } else { g.fillStyle = 'rgba(232,216,160,.88)'; g.fillRect(X0, Y0, COLS * C, ROWS * C); } g.strokeStyle = '#7a5a2a'; g.lineWidth = 3; g.strokeRect(X0, Y0, COLS * C, ROWS * C);
        for (const b of bits) { const x = X0 + b.c * C, y = Y0 + b.r * C; if (A.spr?.('pedaco', x + C * 1.5, y + C / 2, C * 3, C)) { txt(SEQ[b.i][0], x + C * 1.5, y + 7, 8, '#3a2a10', 'center'); continue; } g.fillStyle = '#f8f0d0'; g.fillRect(x, y + 2, C * 3, C - 4); g.strokeStyle = '#8a6a3a'; g.lineWidth = 2; g.strokeRect(x, y + 2, C * 3, C - 4); txt(SEQ[b.i][0], x + C * 1.5, y + 7, 8, '#3a2a10', 'center'); }
        snake.forEach(([c, r], k) => { if (A.spr?.(k ? 'cobra_corpo' : 'cobra_cabeca', X0 + c * C + C / 2, Y0 + r * C + C / 2, C, C)) return; g.fillStyle = k ? (k % 2 ? '#e8dcb0' : '#d8c890') : '#ffd84a'; g.fillRect(X0 + c * C + 2, Y0 + r * C + 2, C - 4, C - 4); g.strokeStyle = '#6a4a2a'; g.lineWidth = 1; g.strokeRect(X0 + c * C + 2, Y0 + r * C + 2, C - 4, C - 4); });
        head(A, 'A Carta em Pedaços · 1500', stage === 'play' && next < SEQ.length ? `Próximo: "${SEQ[next][1]}"  (${next}/6)` : `Tentativa ${A.tries}/3`, stage === 'play' ? left : null, TEMPO);
        if (stage === 'intro') intro(A, 'A Carta em Pedaços', ['O vento espalhou a carta de Pero Vaz de Caminha pela praia. Guie a cobra de papel com o joystick e junte os pedaços na ordem em que tudo aconteceu.', 'Monte → Âncora → Praia → Trocas → Missa → Plantar.', 'Não bata na beira nem no próprio rabo. 3 tentativas.']);
        quitBtn(A);
      },
      action() { if (stage === 'intro') stage = 'play'; },
      key(k) { const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k]; if (d) want = d; },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
    };
  }

  // ===================== 4. A Moenda (engenho, 1570) — à moda do Space Invaders =====================
  // Safra: feixes de cana e pães de açúcar descem em formação, de lado a lado, cada vez mais rápido.
  // A moenda corre no trilho (joystick) e puxa a cana com o gancho (A, um por vez). Fagulhas da fornalha caem:
  // as pilhas de bagaço protegem, mas se desfazem. Carro de boi lá no alto vale tempo extra.
  // Perde a tentativa: fôlego acaba, a formação chega à moenda ou o tempo acaba (cana cortada azeda).
  function moenda(A) {
    const { g, W, H, txt } = A;
    const TEMPO = 120, ONDAS = 2, COLS = 7, ROWS = 3, FOLEGO = 3, PASSO = 10, DESCE = 16;
    const ONDA = [{ passo: 0.6, fag: 1.25, vfag: 190, max: 2 }, { passo: 0.42, fag: 0.85, vfag: 235, max: 3 }]; // ritmo, intervalo e velocidade das fagulhas
    const Y0 = 128, DX = 64, DY = 44, LINHA = H - 104, PY = H - 64;
    let stage = 'intro', t = 0, left = TEMPO, onda = 0, ens = [], ox = 0, oy = 0, dir = 1, stepT = 0, frame = 0;
    let P = { x: W / 2 }, shot = null, cd = 0, sparks = [], fagT = 1.5, folego = FOLEGO, hurt = 0, moidos = 0, carro = null, carroT = 14, rot = 0, msg = '', msgT = 0;
    let bunkers = [];
    const say = (m, c = '#fff') => { msg = m; msgT = 2; A.floatTxt(m, c); };
    function wave() {
      ens = []; ox = (W - (COLS - 1) * DX) / 2; oy = Y0 + onda * 16; dir = 1; stepT = 0; sparks = []; shot = null; fagT = 1.5;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) ens.push({ r, c, acucar: r === 0, alive: true });
      bunkers = [0, 1, 2].map((i) => { const bx = W / 2 - 250 + i * 250 - 35, by = H - 172, cells = []; for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 7; xx++) if (!(yy === 3 && xx >= 2 && xx <= 4) && !(yy === 0 && (xx === 0 || xx === 6))) cells.push([bx + xx * 10, by + yy * 10]); return cells; });
    }
    wave();
    const pos = (e) => [ox + e.c * DX, oy + e.r * DY];
    const live = () => ens.filter((e) => e.alive);
    function hitBunker(x, y) { for (const b of bunkers) { const i = b.findIndex(([cx, cy]) => x >= cx - 2 && x <= cx + 12 && y >= cy - 2 && y <= cy + 12); if (i >= 0) { b.splice(i, 1); return true; } } return false; }
    function cana(x, y, k) { // feixe de cana amarrado, balança entre dois quadros
      if (A.spr?.('cana', x, y, 40, 48, k)) return;
      const sw = k ? 2 : -2;
      for (let i = -2; i <= 2; i++) { g.fillStyle = i % 2 ? '#a8c050' : '#c8d070'; g.fillRect(x + i * 5 - 2 + (i === 0 ? 0 : sw * Math.sign(i) * 0.5), y - 16, 4, 32); g.fillStyle = '#6a8a30'; g.fillRect(x + i * 5 - 2, y - 6, 4, 2); g.fillRect(x + i * 5 - 2, y + 6, 4, 2); }
      g.fillStyle = '#4a7a2a'; g.beginPath(); g.moveTo(x - 4, y - 16); g.lineTo(x - 12 + sw, y - 24); g.lineTo(x, y - 18); g.lineTo(x + 12 + sw, y - 24); g.lineTo(x + 4, y - 16); g.fill();
      g.fillStyle = '#8a5a2a'; g.fillRect(x - 14, y - 1, 28, 3);
    }
    function pao(x, y, k) { // pão de açúcar: cone branco na forma de barro
      if (A.spr?.('pao', x, y, 40, 46, k)) return;
      g.fillStyle = '#9a5a3a'; g.beginPath(); g.moveTo(x - 15, y + 14); g.lineTo(x + 15, y + 14); g.lineTo(x + 11, y + 20); g.lineTo(x - 11, y + 20); g.fill();
      g.fillStyle = k ? '#fffaf0' : '#f2ead8'; g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 14, y + 14); g.lineTo(x - 14, y + 14); g.closePath(); g.fill();
      g.fillStyle = '#d8c8a0'; g.fillRect(x - 2, y - 8, 4, 18);
    }
    function moendaSprite(x, y) {
      if (A.spr?.('moenda', x, y - 10, 92, 64)) return;
      g.fillStyle = '#5a3a1a'; g.fillRect(x - 36, y - 8, 72, 26); g.fillStyle = '#3a2410'; g.fillRect(x - 40, y + 16, 80, 6);
      for (let i = -1; i <= 1; i++) { const cx = x + i * 22, cy = y - 14; g.fillStyle = '#8a6a3a'; g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.fill(); g.strokeStyle = '#2a1a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.cos(rot + i) * 10, cy + Math.sin(rot + i) * 10); g.lineTo(cx - Math.cos(rot + i) * 10, cy - Math.sin(rot + i) * 10); g.stroke(); }
      g.fillStyle = '#c8d070'; g.fillRect(x - 2, y - 34, 4, 10); // gancho pronto
    }
    function fail(m) { stage = 'gone'; A.music(null); A.lose(m); }
    return {
      enter() { A.music('tambor'); A.sfx('moenda'); },
      dbg: () => ({ moidos, stage, P: P.x, shot: !!shot, ens: live().map((e) => pos(e)), sparks: sparks.map((f) => [f.x, f.y]), left, onda, folego, carro: carro && carro.x }),
      update(dt) {
        t += dt; if (msgT > 0) msgT -= dt; if (hurt > 0) hurt -= dt; if (cd > 0) cd -= dt;
        if (stage !== 'play') return;
        if ((left -= dt) <= 0) return fail('A cana cortada azedou antes de ser moída.');
        const mv = (A.keys.ArrowRight ? 1 : 0) - (A.keys.ArrowLeft ? 1 : 0); P.x = Math.max(48, Math.min(W - 48, P.x + mv * 300 * dt)); if (mv) rot += dt * 8 * mv;
        const L = live(), cfg = ONDA[onda];
        // passo da formação: quanto menos cana, mais rápido (como no clássico)
        if ((stepT -= dt) <= 0) {
          stepT = 0.06 + cfg.passo * (L.length / ens.length); frame ^= 1;
          const xs = L.map((e) => pos(e)[0]);
          if ((dir > 0 && Math.max(...xs) + PASSO > W - 40) || (dir < 0 && Math.min(...xs) - PASSO < 40)) { dir *= -1; oy += DESCE; } else ox += dir * PASSO;
          for (const e of L) { const [x, y] = pos(e); for (const b of bunkers) for (let i = b.length - 1; i >= 0; i--) if (Math.abs(b[i][0] + 5 - x) < 20 && Math.abs(b[i][1] + 5 - y) < 22) b.splice(i, 1); }
          if (L.some((e) => pos(e)[1] + 18 >= LINHA)) return fail('A formação chegou à moenda e ela engasgou.');
        }
        // gancho (um por vez)
        if (shot) {
          shot.y -= 700 * dt;
          if (shot.y < 70 || hitBunker(shot.x, shot.y)) shot = null;
          else if (carro && Math.abs(shot.x - carro.x) < 30 && Math.abs(shot.y - 98) < 16) { shot = null; carro = null; left = Math.min(TEMPO, left + 8); A.sfx('coin'); say('Carro de boi: +8 s'); }
          else for (const e of L) { const [x, y] = pos(e); if (Math.abs(shot.x - x) < 18 && Math.abs(shot.y - y) < 20) { e.alive = false; shot = null; moidos++; A.sfx('stone'); break; } }
        }
        // fagulhas da fornalha: caem da cana mais baixa de uma coluna
        if ((fagT -= dt) <= 0 && sparks.length < cfg.max && L.length) {
          fagT = cfg.fag * (0.7 + Math.random() * 0.6);
          const cols = [...new Set(L.map((e) => e.c))], c = cols[Math.floor(Math.random() * cols.length)];
          const low = L.filter((e) => e.c === c).sort((a, b) => b.r - a.r)[0], [x, y] = pos(low);
          sparks.push({ x, y: y + 20, ph: Math.random() * 6 });
        }
        sparks = sparks.filter((f) => {
          f.y += cfg.vfag * dt; f.ph += dt * 12;
          if (hitBunker(f.x, f.y)) return false;
          if (hurt <= 0 && Math.abs(f.x - P.x) < 26 && f.y > PY - 26 && f.y < PY + 18) {
            folego--; hurt = 1.2; A.sfx('hit'); A.shake(0.25);
            if (folego <= 0) { fail('Sem fôlego: as fagulhas pegaram três vezes.'); return false; }
            say(`Fagulha! Fôlego ${folego}/${FOLEGO}`, '#ff8a5a'); return false;
          }
          return f.y < H;
        });
        // carro de boi atravessa lá em cima de vez em quando
        if (carro) { carro.x += carro.v * dt; if (carro.x < -60 || carro.x > W + 60) carro = null; }
        else if ((carroT -= dt) <= 0) { carroT = 16 + Math.random() * 8; const v = Math.random() < 0.5 ? 1 : -1; carro = { x: v > 0 ? -50 : W + 50, v: v * 120 }; }
        if (!live().length) {
          if (++onda >= ONDAS) {
            stage = 'done'; A.music(null);
            A.say([['narr', 'Na safra, a moenda quase não parava: girava dia e noite, por meses.'], ['narr', 'Quem cortava, carregava e alimentava a moenda eram pessoas escravizadas. O açúcar que ia para a Europa saía desse trabalho.']], () => A.win({ card: 'C12', serio: true }));
            return;
          }
          A.sfx('sino'); say('Segunda leva da safra: mais rápida.', '#ffd84a'); wave();
        }
      },
      draw() {
        A.bg('img/bg_moenda.jpg', 3, 0.62, '#3a2a1a');
        if (!A.img('img/bg_moenda.jpg')) A.bg('assets/img/scenes/engenho.webp', 3, 0.62, '#3a2a1a');
        g.fillStyle = 'rgba(255,120,40,.18)'; g.fillRect(0, 62, W, 10); // brilho da fornalha
        g.fillStyle = 'rgba(255,216,74,.35)'; g.fillRect(0, LINHA, W, 2); // linha da moenda
        if (carro && A.spr?.('carro', carro.x, 96, 84, 40, carro.v < 0)) { /* arte nova */ } else if (carro) { const x = carro.x, y = 98; g.fillStyle = '#7a5a3a'; g.fillRect(x - 26, y - 8, 40, 12); g.fillStyle = '#c8d070'; g.fillRect(x - 24, y - 16, 36, 8); g.fillStyle = '#3a2410'; g.beginPath(); g.arc(x - 16, y + 6, 6, 0, 7); g.arc(x + 6, y + 6, 6, 0, 7); g.fill(); g.fillStyle = '#8a6a4a'; g.fillRect(x + (carro.v > 0 ? 16 : -46), y - 10, 26, 14); }
        const bag = A.arte?.('bagaco'); for (const b of bunkers) { if (bag) { for (const [x, y] of b) g.drawImage(bag, (x * 3) % Math.max(1, bag.width - 30), (y * 3) % Math.max(1, bag.height - 30), 30, 30, x, y, 10.5, 10.5); continue; } g.fillStyle = '#c8b070'; for (const [x, y] of b) g.fillRect(x, y, 10, 10); g.fillStyle = 'rgba(120,90,40,.5)'; for (const [x, y] of b) g.fillRect(x, y + 7, 10, 3); } // cada pedacinho mostra um trecho da textura
        for (const e of live()) { const [x, y] = pos(e); if (e.acucar) pao(x, y, frame); else cana(x, y, frame); }
        for (const f of sparks) { const wob = Math.sin(f.ph) * 4; if (A.spr?.('fagulha', f.x + wob, f.y - 2, 16, 20)) continue; g.fillStyle = '#ffb040'; g.fillRect(f.x - 3 + wob, f.y - 6, 6, 6); g.fillStyle = '#ff5a20'; g.fillRect(f.x - 2 - wob, f.y, 4, 4); }
        if (shot) { g.fillStyle = '#e8d8a0'; g.fillRect(shot.x - 2, shot.y, 4, 16); g.fillRect(shot.x - 2, shot.y, 8, 4); }
        if (!(hurt > 0 && Math.floor(t * 10) % 2)) moendaSprite(P.x, PY);
        head(A, `A Moenda · 1570 · ${onda + 1}ª leva de ${ONDAS}`, `Moídos: ${moidos} · Fôlego: ${Math.max(0, folego)}/${FOLEGO} · Tentativa ${A.tries}/3`, stage === 'play' ? left : null, TEMPO);
        if (msgT > 0) { A.box(W / 2 - 220, LINHA + 8, 440, 26, 0.85); txt(msg, W / 2, LINHA + 15, 9, '#ffd84a', 'center'); }
        if (stage === 'intro') intro(A, 'A Moenda', ['Safra no engenho: a cana desce em fileiras. Joystick move a moenda, botão A puxa a cana (um gancho por vez).', 'Desvie das fagulhas da fornalha; o bagaço protege. Três fagulhas, ou a cana na moenda, gastam uma tentativa.', `Moa ${ONDAS} levas em ${TEMPO} s. Carro de boi lá no alto: +8 s.`]);
        quitBtn(A);
      },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
      action() {
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage === 'play' && !shot && cd <= 0) { shot = { x: P.x, y: PY - 36 }; cd = 0.12; A.sfx('tap'); }
      },
    };
  }

  // ===================== 5. A Ponte de Nassau (Recife, 1643) — à moda do Tetris =====================
  // Pranchas caem do céu; guie para o vão do tamanho certo (C curta, L longa). Prancha podre vai para o rio
  // (as beiradas azuis). Errar tira tempo; a maré não espera.
  function ponte(A) {
    const { g, W, H, txt } = A;
    const NEED = Array.from({ length: 12 }, (_, i) => ((i * 5 + 2) % 3 === 0 ? 'longa' : 'curta'));
    const TEMPO = 80, COLW = 60, X0 = (A.W - 14 * COLW) / 2, BASE = 330; // 14 colunas: rio | 12 vãos | rio
    let stage = 'intro', t = TEMPO, slots = NEED.map(() => false), cur = null, col = 7, y = 90, vy = 70, msg = '', msgT = 0, facts = [], drop = false;
    const deal = () => { const r = Math.random(); cur = r < 0.2 ? 'quebrada' : r < 0.56 ? 'longa' : 'curta'; col = 7; y = 90; drop = false; vy = 70 + slots.filter(Boolean).length * 6; };
    const say = (m) => { msg = m; msgT = 2; };
    function land() {
      const i = col - 1, water = col === 0 || col === 13;
      if (water) { if (cur === 'quebrada') { say('Prancha podre no rio. Boa.'); A.sfx('hop'); } else { say('Jogou uma prancha boa no rio! -3 s'); t -= 3; A.sfx('bad'); } return deal(); }
      if (slots[i]) { say('Esse vão já está pronto. -2 s'); t -= 2; A.sfx('bad'); return deal(); }
      if (cur === 'quebrada') { say('Prancha podre não segura ninguém. -3 s'); t -= 3; A.sfx('bad'); A.shake(0.2); return deal(); }
      if (NEED[i] !== cur) { say(`Não cabe: o vão pede prancha ${NEED[i]}. -2 s`); t -= 2; A.sfx('bad'); return deal(); }
      slots[i] = true; A.sfx('stone');
      const n = slots.filter(Boolean).length;
      if (n === 4) facts.push('Primeira ponte do Brasil'); if (n === 8) facts.push('Observatório no Recife'); if (n === 11) facts.push('Frans Post pintava a paisagem');
      if (n === 12) { stage = 'done'; A.say([['nassau', 'Uma ponte! Invasores também constroem, forasteiro. Recife ganhou ponte, observatório e pintores.'], ['mula', 'Ninguém conta essa parte na escola. Agora o relatório conta.']], () => A.win({ card: 'C22' })); return; }
      deal();
    }
    return {
      enter() { A.music('invasoes'); deal(); },
      update(dt) {
        if (msgT > 0) msgT -= dt;
        if (stage !== 'play') return;
        if ((t -= dt) <= 0) { stage = 'gone'; A.lose('A maré subiu antes de a ponte ficar pronta.'); return; }
        y += (drop ? 900 : A.keys.ArrowDown ? 320 : vy) * dt;
        if (y >= BASE - 24) land();
      },
      draw() {
        A.bg('img/bg_capibaribe.jpg', 3, 0.3, '#2a6fb0');
        if (!A.img('img/bg_capibaribe.jpg')) { g.fillStyle = '#2a6fb0'; g.fillRect(0, 0, W, H); }
        const tide = (TEMPO - Math.max(0, t)) / TEMPO; g.fillStyle = `rgba(30,80,160,${0.25 + tide * 0.45})`; g.fillRect(0, BASE + 30 - tide * 50, W, H);
        g.fillStyle = 'rgba(42,111,176,.6)'; g.fillRect(X0, 80, COLW, BASE - 50); g.fillRect(X0 + 13 * COLW, 80, COLW, BASE - 50); txt('RIO', X0 + COLW / 2, BASE - 20, 8, '#fff', 'center'); txt('RIO', X0 + 13.5 * COLW, BASE - 20, 8, '#fff', 'center');
        g.strokeStyle = 'rgba(255,255,255,.15)'; for (let c = 1; c < 14; c++) { g.beginPath(); g.moveTo(X0 + c * COLW, 80); g.lineTo(X0 + c * COLW, BASE); g.stroke(); }
        NEED.forEach((n, i) => { const x = X0 + (i + 1) * COLW, w = n === 'longa' ? 54 : 32; g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x + (COLW - w) / 2, BASE, w, 24); if (slots[i]) { g.fillStyle = '#8a5a32'; g.fillRect(x + (COLW - w) / 2, BASE, w, 24); g.fillStyle = '#5a3a1a'; g.fillRect(x + (COLW - w) / 2, BASE + 10, w, 3); } else txt(n === 'longa' ? 'L' : 'C', x + COLW / 2, BASE + 7, 9, '#fff', 'center'); });
        g.fillStyle = '#7a9a50'; g.fillRect(0, BASE - 4, X0, 40); g.fillRect(X0 + 14 * COLW, BASE - 4, W, 40);
        if (stage === 'play' && cur) {
          const pw = cur === 'longa' ? 54 : cur === 'curta' ? 32 : 44, x = X0 + col * COLW + (COLW - pw) / 2;
          g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(X0 + col * COLW, y, COLW, BASE - y);
          if (A.spr?.(`prancha_${cur}`, x + pw / 2, y + 10, pw, 22)) { /* arte nova */ } else { g.fillStyle = cur === 'quebrada' ? '#6a5a4a' : '#a8784a'; g.fillRect(x, y, pw, 20); g.fillStyle = '#5a3a1a'; g.fillRect(x, y + 8, pw, 3); }
          if (cur === 'quebrada' && !A.has?.('prancha_quebrada')) { g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + pw / 2 - 6, y); g.lineTo(x + pw / 2 + 4, y + 20); g.stroke(); }
          txt(cur, x + pw / 2, y - 14, 8, '#fff', 'center');
        }
        facts.forEach((f, i) => txt('★ ' + A.tr(f), 30, 90 + i * 16, 8, '#ffd84a'));
        head(A, 'A Ponte de Nassau · 1643', `Pranchas: ${slots.filter(Boolean).length}/12 · joystick move · A derruba · Tentativa ${A.tries}/3`, stage === 'play' ? t : null, TEMPO);
        if (msgT > 0) { A.box(W / 2 - 230, 400, 460, 28, 0.85); txt(msg, W / 2, 408, 9, '#fff', 'center'); }
        if (stage === 'intro') intro(A, 'A Ponte de Nassau', ['Construa a primeira ponte do Recife: 12 pranchas antes da maré subir.', 'Mova a prancha que cai com o joystick e solte no vão do tamanho certo (C curta, L longa). O botão A derruba de vez.', 'Prancha podre (rachada) vai para o RIO, nas beiradas. 3 tentativas.']);
        quitBtn(A);
      },
      action() { if (stage === 'intro') { stage = 'play'; return; } if (stage === 'play') drop = true; },
      key(k) { if (stage !== 'play' || drop) return; if (k === 'ArrowLeft') col = Math.max(0, col - 1); if (k === 'ArrowRight') col = Math.min(13, col + 1); },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
    };
  }

  // ===================== 6. Fogueiras de Palmares (1694) — à moda do Doodle Jump, tom sério =====================
  // O vigia sobe a Serra da Barriga pulando de pedra em pedra e acende as 4 fogueiras de aviso antes
  // que a bandeira chegue. Cair (sair por baixo da tela) ou o tempo acabar gasta uma das 3 tentativas.
  function fogueiras(A) {
    const { g, W, H, txt } = A;
    const TEMPO = 70, FOGOS = [700, 1500, 2400, 3400], GRAV = 1500, PULO = 760, VEL = 300; // ajuste fino
    const TOPO = FOGOS[FOGOS.length - 1] + 200;
    let stage = 'intro', P, plats, cam, left, lit, t = 0, dir = 0, hold = 0, best = 0;
    function reset() {
      P = { x: W / 2, y: 40, vy: 0, face: 2 }; cam = 0; left = TEMPO; lit = 0; best = 0; plats = [{ x: W / 2 - 60, y: 20, w: 120, kind: 'chao' }];
      // altura cresce para cima (y em px de serra); vãos aumentam com a altura
      let y = 20;
      while (y < TOPO) {
        y += 70 + Math.min(70, y / 60) + Math.random() * 30;
        const r = Math.random(), hard = y / TOPO;
        const kind = r < 0.18 + hard * 0.2 ? 'galho' : r < 0.3 + hard * 0.25 ? 'podre' : 'pedra';
        plats.push({ x: 40 + Math.random() * (W - 200), y, w: kind === 'pedra' ? 96 : 84, kind, v: kind === 'galho' ? (Math.random() < 0.5 ? -1 : 1) * (60 + hard * 80) : 0, broken: false });
      }
      // cada fogueira fica numa pedra firme na altura marcada
      for (const fy of FOGOS) { const p = plats.reduce((a, b) => (Math.abs(b.y - fy) < Math.abs(a.y - fy) ? b : a)); p.kind = 'pedra'; p.v = 0; p.fire = true; p.w = 110; }
    }
    reset();
    const sy = (y) => H - 40 - (y - cam); // tela: y da serra vira y de tela
    return {
      enter() { A.music('palmares'); },
      update(dt) {
        t += dt;
        if (stage !== 'play') return;
        if ((left -= dt) <= 0) return this.fail('A bandeira chegou antes do aviso.');
        const kx = (A.keys.ArrowRight || A.keys.d ? 1 : 0) - (A.keys.ArrowLeft || A.keys.a ? 1 : 0) || dir;
        P.x += kx * VEL * dt; if (kx) P.face = kx > 0 ? 2 : -1;
        if (P.x < -10) P.x = W + 10; if (P.x > W + 10) P.x = -10; // sai de um lado, entra do outro
        const vy0 = P.vy; P.vy -= GRAV * dt; const y0 = P.y; P.y += P.vy * dt;
        for (const p of plats) {
          if (p.v) { p.x += p.v * dt; if (p.x < 10 || p.x + p.w > W - 10) p.v *= -1; }
          if (vy0 <= 0 && !p.broken && y0 >= p.y && P.y <= p.y && P.x > p.x - 8 && P.x < p.x + p.w + 8) {
            P.y = p.y; P.vy = PULO; A.sfx('hop');
            if (p.kind === 'podre') { p.broken = true; A.sfx('hit'); }
            if (p.fire && !p.lit) { p.lit = true; lit++; A.sfx('ok'); if (lit >= FOGOS.length) { stage = 'won'; A.sfx('sino'); } }
          }
        }
        best = Math.max(best, P.y);
        cam = Math.max(cam, P.y - (H - 80) * 0.45); // a câmera só sobe
        if (sy(P.y) > H + 40) this.fail('Você caiu da serra.');
      },
      fail(msg) { stage = 'gone'; A.lose(msg); },
      draw() {
        // céu do fim de tarde e a serra ao fundo (sobe devagar com a câmera)
        if (!A.fundo?.(0.15)) { const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1a2a4a'); sky.addColorStop(1, '#6a5a4a'); g.fillStyle = sky; g.fillRect(0, 0, W, H); }
        const serra = A.arte?.('serra');
        if (serra) g.drawImage(serra, 0, H - 280 + (cam * 0.05) % 60, W, 280);
        else { g.fillStyle = '#2a3a2a'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 60) g.lineTo(x, H - 160 - Math.sin(x / 90 + cam / 400) * 40 + cam * 0.05 % 60); g.lineTo(W, H); g.fill(); }
        for (const p of plats) {
          const y = sy(p.y); if (y < -40 || y > H + 40) continue;
          if (p.kind === 'chao') { g.fillStyle = '#3a5a2a'; g.fillRect(0, y, W, 40); continue; }
          const art = p.kind === 'pedra' ? 'pedra' : p.kind === 'galho' ? 'galho' : 'tabua';
          if ((p.kind !== 'tabua' || !p.broken) && p.kind !== 'chao' && A.spr?.(art, p.x + p.w / 2, y + p.w * 0.2, p.w * 1.1, p.w * 0.62)) { /* arte nova */ }
          else if (p.kind === 'pedra') { g.fillStyle = '#7a7a6a'; g.fillRect(p.x, y, p.w, 14); g.fillStyle = '#9a9a88'; g.fillRect(p.x + 4, y, p.w - 8, 4); }
          else if (p.kind === 'galho') { g.fillStyle = '#6a4a2a'; g.fillRect(p.x, y, p.w, 10); g.fillStyle = '#3a6a2a'; g.fillRect(p.x + 6, y - 6, 16, 6); g.fillRect(p.x + p.w - 24, y - 6, 16, 6); }
          else if (!p.broken) { g.fillStyle = '#8a6a4a'; g.fillRect(p.x, y, p.w, 10); g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x + p.w / 2, y); g.lineTo(p.x + p.w / 2 - 6, y + 10); g.stroke(); }
          if (p.fire && A.spr?.(p.lit ? 'fogueira_acesa' : 'fogueira_apagada', p.x + p.w / 2, y - 18, 44, 40)) { /* arte nova */ }
          else if (p.fire) {
            g.fillStyle = '#5a3a1a'; g.fillRect(p.x + p.w / 2 - 14, y - 8, 28, 8);
            if (p.lit) for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#ffd84a' : '#ff7a2a'; g.fillRect(p.x + p.w / 2 - 12 + (k * 7) % 24, y - 22 - ((k * 5 + t * 40) % 18), 7, 12); }
            else { g.strokeStyle = '#ffd84a'; g.lineWidth = 2; g.strokeRect(p.x + p.w / 2 - 18, y - 30, 36, 30); }
          }
        }
        A.dude(P.x, sy(P.y), A.PAL.vigia, t * 10, P.face, 2.4, true);
        head(A, 'Fogueiras de Palmares · 1694', `Tentativa ${A.tries}/3 · Fogueiras acesas: ${lit}/${FOGOS.length}`, stage === 'play' ? left : null, TEMPO);
        // régua lateral: altura e onde estão as fogueiras
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W - 24, 80, 12, H - 140); for (const fy of FOGOS) { g.fillStyle = '#ffd84a'; g.fillRect(W - 28, 80 + (H - 140) * (1 - fy / TOPO) - 1, 20, 3); }
        g.fillStyle = '#9be36a'; g.fillRect(W - 24, 80 + (H - 140) * (1 - Math.min(1, P.y / TOPO)) - 3, 12, 6);
        if (stage === 'intro') intro(A, 'Fogueiras de Palmares', ['Uma bandeira sobe a serra. O vigia precisa acender as 4 fogueiras de aviso, cada uma mais alta que a outra.', 'Ele pula sozinho: você só guia para os lados com o joystick (ou setas). Galho balança; madeira rachada quebra depois de um pulo.', 'Não caia e chegue antes do tempo acabar. São 3 tentativas.']);
        if (stage === 'won') { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H); txt('As quatro fogueiras estão acesas.', W / 2, 220, 14, '#ffd84a', 'center'); txt('botão A para continuar', W / 2, 300, 10, '#ddd', 'center'); }
        quitBtn(A);
      },
      action() {
        if (stage === 'intro') { stage = 'play'; P.vy = PULO; return; }
        if (stage === 'won') { stage = 'done'; A.say([['vigia', 'O mocambo foi avisado. Organização é o que mantém Palmares de pé há tanto tempo.']], () => A.win({ card: 'C27', serio: true })); }
      },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
    };
  }

  // ===================== 7. Esmeralda ou Turmalina? (sertão, 1681) — à moda do Space Invaders =====================
  // Fernão Dias atira nas pedras falsas (turmalinas: prisma de 3 lados, fosco, com estrias). Esmeralda (seis faces,
  // brilho vivo) não se quebra! Três erros ou turmalina chegando ao chão gastam uma tentativa.
  function turmalina(A) {
    const { g, W, H, txt } = A;
    const ROWS = 3, COLS = 8, VEL = 40, DESCE = 22, ERROS = 3;
    let stage = 'intro', P = { x: W / 2 }, shots = [], stones = [], dir = 1, ox = 0, oy = 0, erros = 0, t = 0, cd = 0, flash = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) stones.push({ r, c, tur: ((r * 7 + c * 3 + 1) % 5) < 3, alive: true });
    const pos = (s) => [140 + s.c * 80 + ox, 110 + s.r * 62 + oy];
    function stone(s, x, y) {
      if (A.spr?.(s.tur ? 'turmalina' : 'esmeralda', x, y, 44, 52)) return;
      g.save(); g.translate(x, y);
      if (s.tur) { g.fillStyle = '#4a8a4a'; g.beginPath(); g.moveTo(-12, 22); g.lineTo(0, -24); g.lineTo(12, 22); g.closePath(); g.fill(); g.strokeStyle = '#2a5a2a'; g.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 4, 20); g.lineTo(i * 2, -20); g.stroke(); } }
      else { g.fillStyle = '#2ad86a'; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.cos(a) * 18, Math.sin(a) * 22); } g.closePath(); g.fill(); g.fillStyle = '#d8ffe8'; g.fillRect(-5, -12, 4, 4); g.fillRect(5, 3, 3, 3); }
      g.restore();
    }
    function miss(m) { erros++; A.sfx('bad'); A.shake(0.2); flash = 0.4; A.floatTxt(m, '#ff6a5a'); if (erros >= ERROS) { stage = 'gone'; A.lose('Três erros. Olhe as estrias: turmalina é prisma de três lados, fosca.'); } }
    return {
      enter() { A.music('ouro'); },
      update(dt) {
        t += dt; if (flash > 0) flash -= dt; if (cd > 0) cd -= dt;
        if (stage !== 'play') return;
        P.x = Math.max(40, Math.min(W - 40, P.x + ((A.keys.ArrowRight ? 1 : 0) - (A.keys.ArrowLeft ? 1 : 0)) * 320 * dt));
        const live = stones.filter((s) => s.alive), xs = live.map((s) => pos(s)[0]);
        ox += dir * (VEL + (24 - live.length) * 3) * dt;
        if (Math.max(...xs) > W - 40 || Math.min(...xs) < 40) { dir *= -1; oy += DESCE; ox += dir * 4; }
        shots = shots.filter((sh) => { sh.y -= 520 * dt; for (const s of live) { const [x, y] = pos(s); if (s.alive && Math.abs(sh.x - x) < 20 && Math.abs(sh.y - y) < 24) { s.alive = false; if (s.tur) { A.sfx('stone'); } else { s.alive = true; miss('Era esmeralda!'); } return false; } } return sh.y > 70; });
        const rest = stones.filter((s) => s.alive && s.tur);
        if (!rest.length) { stage = 'done'; A.say([['fernao', 'Então eram... turmalinas? Sete anos no mato por pedra verde comum?'], ['mula', 'Fernão Dias morreu achando que tinha esmeraldas. A corrida do ouro nasceu de uma busca errada.']], () => A.win({ card: 'C29', item: 'turmalina' })); return; }
        if (rest.some((s) => pos(s)[1] > H - 120)) { stage = 'gone'; A.lose('As turmalinas chegaram ao chão do acampamento.'); }
      },
      draw() {
        if (!A.fundo?.(0.2)) { g.fillStyle = '#4a3420'; g.fillRect(0, 0, W, H); g.fillStyle = '#6a4a2a'; g.fillRect(0, H - 96, W, 96); }
        if (flash > 0) { g.fillStyle = `rgba(255,60,60,${flash})`; g.fillRect(0, 0, W, H); }
        for (const s of stones) if (s.alive) stone(s, ...pos(s));
        g.fillStyle = '#ffd84a'; for (const sh of shots) g.fillRect(sh.x - 2, sh.y - 10, 4, 12);
        A.dude(P.x, H - 64, A.PAL.fernao, t * 8, 1, 3, false);
        head(A, 'Esmeralda ou Turmalina? · 1681', `Turmalinas restantes: ${stones.filter((s) => s.alive && s.tur).length} · Erros: ${erros}/${ERROS} · Tentativa ${A.tries}/3`);
        if (stage === 'intro') intro(A, 'Esmeralda ou Turmalina?', ['Fernão Dias passou 7 anos caçando esmeraldas. Quebre só as falsas: turmalina é prisma de três lados, fosca, com estrias compridas.', 'Joystick move, botão A atira. Esmeralda de verdade (seis faces, brilho vivo) não se quebra: acertar nela é erro.', 'Três erros, ou turmalina no chão, gastam uma tentativa. São 3.']);
        quitBtn(A);
      },
      action() { if (stage === 'intro') { stage = 'play'; return; } if (stage === 'play' && cd <= 0) { shots.push({ x: P.x, y: H - 110 }); cd = 0.35; A.sfx('tap'); } },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
    };
  }

  // ===================== 8. Garimpo no rio (Minas, 1700) — à moda do Pac-Man =====================
  // O garimpeiro anda pelos canais do rio pegando pepitas; dois Cobradores do Quinto rondam. O "santo do pau oco"
  // esconde o ouro por alguns segundos e os Cobradores fogem. Pego = uma tentativa.
  function garimpo(A) {
    const { g, W, H, txt } = A;
    const MAZE = [
      '#########################',
      '#o..........#..........o#',
      '#.###.#####.#.#####.###.#',
      '#.......................#',
      '#.###.#.#########.#.###.#',
      '#.....#.....#.....#.....#',
      '#####.#####.#.#####.#####',
      '#.........#...#.........#',
      '#.###.###.#.#.#.###.###.#',
      '#...#...............#...#',
      '###.#.#.#########.#.#.###',
      '#.....#.....#.....#.....#',
      '#.#########.#.#########.#',
      '#o.....................o#',
      '#########################'];
    const T = 28, CW = MAZE[0].length, X0 = (A.W - CW * T) / 2, Y0 = 88, TEMPO = 90, SANTO = 6, META = 110; // ajuste fino
    const wall = (c, r) => (MAZE[r]?.[c] ?? '#') === '#';
    let stage = 'intro', t = 0, left = TEMPO, dots = new Set(), pills = new Set(), got = 0, total = 0, scared = 0;
    MAZE.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '.') dots.add(r * 100 + c); if (ch === 'o') pills.add(r * 100 + c); }));
    total = dots.size;
    const mk = (c, r, sp) => ({ x: c, y: r, d: [0, 0], want: [0, 0], sp, home: [c, r] });
    const P = mk(12, 13, 4.6), COBS = [mk(11, 7, 3.6), mk(13, 7, 3.3)];
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function move(e, dt, choose) {
      let dist = e.sp * dt;
      while (dist > 0) {
        const cx = Math.round(e.x), cy = Math.round(e.y), atC = Math.abs(e.x - cx) < 1e-3 && Math.abs(e.y - cy) < 1e-3;
        if (atC) { e.x = cx; e.y = cy; choose(e, cx, cy); if (!e.d[0] && !e.d[1]) return; if (wall(cx + e.d[0], cy + e.d[1])) { e.d = [0, 0]; return; } }
        const nx = e.d[0] ? (e.d[0] > 0 ? Math.floor(e.x + 1e-6) + 1 : Math.ceil(e.x - 1e-6) - 1) : e.x, ny = e.d[1] ? (e.d[1] > 0 ? Math.floor(e.y + 1e-6) + 1 : Math.ceil(e.y - 1e-6) - 1) : e.y;
        const rem = Math.abs(nx - e.x) + Math.abs(ny - e.y), s = Math.min(dist, rem);
        e.x += e.d[0] * s; e.y += e.d[1] * s; dist -= s;
      }
    }
    const playerChoose = (e, c, r) => { if (!wall(c + e.want[0], r + e.want[1]) && (e.want[0] || e.want[1])) e.d = e.want; };
    const cobChoose = (e, c, r) => {
      const opts = DIRS.filter(([dx, dy]) => !wall(c + dx, r + dy) && !(dx === -e.d[0] && dy === -e.d[1] && (e.d[0] || e.d[1])));
      const ok = opts.length ? opts : DIRS.filter(([dx, dy]) => !wall(c + dx, r + dy));
      const score = ([dx, dy]) => Math.hypot(c + dx - P.x, r + dy - P.y) * (scared > 0 ? -1 : 1) + Math.random() * 1.5;
      e.d = ok.sort((a, b) => score(a) - score(b))[0];
    };
    return {
      enter() { A.music('ouro'); A.sfx('garimpo'); },
      update(dt) {
        t += dt; if (stage !== 'play') return;
        if ((left -= dt) <= 0) { stage = 'gone'; A.lose(`O tempo acabou com ${got} de ${META} pepitas.`); return; }
        if (scared > 0) scared -= dt;
        move(P, dt, playerChoose);
        const k = Math.round(P.y) * 100 + Math.round(P.x);
        if (dots.delete(k)) { got++; if (got % 3 === 0) A.sfx('coin'); }
        if (pills.delete(k)) { scared = SANTO; A.sfx('ok'); A.floatTxt('Santo do pau oco! O ouro sumiu da vista.', '#ffd84a'); }
        for (const c of COBS) {
          c.sp = scared > 0 ? 2.4 : c === COBS[0] ? 3.6 : 3.3; move(c, dt, cobChoose);
          if (Math.hypot(c.x - P.x, c.y - P.y) < 0.6) {
            if (scared > 0) { c.x = c.home[0]; c.y = c.home[1]; c.d = [0, 0]; A.sfx('hop'); A.floatTxt('O Cobrador revistou o santo. Vazio!', '#9be36a'); }
            else { stage = 'gone'; A.lose('O Cobrador te pegou com ouro sem selo.'); return; }
          }
        }
        if (got >= META || !dots.size) { stage = 'done'; A.say([['mula', `${got} pepitas na mochila. Agora corre para a Casa de Fundição antes que o Cobrador de verdade te veja.`]], () => A.win({ dust: Math.round(got / 3) })); }
      },
      draw() {
        if (!A.fundo?.(0.3)) { g.fillStyle = '#5a4026'; g.fillRect(0, 0, W, H); }
        MAZE.forEach((row, r) => [...row].forEach((ch, c) => {
          const x = X0 + c * T, y = Y0 + r * T;
          if (A.spr?.(ch === '#' ? 'parede' : 'agua', x + T / 2, y + T / 2, T + 0.5, T + 0.5)) return;
          if (ch === '#') { g.fillStyle = '#7a6a4a'; g.fillRect(x, y, T, T); g.fillStyle = '#8a7a5a'; g.fillRect(x + 2, y + 2, T - 4, 4); }
          else { g.fillStyle = '#2a6fb0'; g.fillRect(x, y, T, T); }
        }));
        for (const k of dots) { const r = Math.floor(k / 100), c = k % 100; if (A.spr?.('pepita', X0 + c * T + T / 2, Y0 + r * T + T / 2, T * 0.6, T * 0.6)) continue; g.fillStyle = '#ffd84a'; g.fillRect(X0 + c * T + T / 2 - 3, Y0 + r * T + T / 2 - 3, 6, 6); }
        for (const k of pills) { const r = Math.floor(k / 100), c = k % 100, x = X0 + c * T + T / 2, y = Y0 + r * T + T / 2; if (A.spr?.('santo', x, y - 2, T, T * 1.3)) continue; g.fillStyle = '#c89a52'; g.fillRect(x - 5, y - 10, 10, 20); g.fillStyle = '#e8c86a'; g.fillRect(x - 3, y - 14, 6, 6); }
        A.dude(X0 + P.x * T + T / 2, Y0 + P.y * T + T - 2, A.PAL.buck, t * 12, P.d[0] < 0 ? -1 : P.d[0] > 0 ? 2 : P.d[1] < 0 ? 1 : 0, 1.6, !!(P.d[0] || P.d[1]));
        for (const c of COBS) { if (scared > 0 && Math.floor(t * 8) % 2) continue; A.dude(X0 + c.x * T + T / 2, Y0 + c.y * T + T - 2, scared > 0 ? { ...A.PAL.cobrador, shirt: '#8a9ad8' } : A.PAL.cobrador, t * 12, c.d[0] < 0 ? -1 : 2, 1.6, true); }
        head(A, 'Garimpo no rio · 1700', `Pepitas: ${got}/${META} · Santo do pau oco: ${scared > 0 ? Math.ceil(scared) + 's' : '—'} · Tentativa ${A.tries}/3`, stage === 'play' ? left : null, TEMPO);
        if (stage === 'intro') intro(A, 'Garimpo no rio', ['Ande pelos canais do rio com o joystick e junte 110 pepitas antes do tempo acabar.', 'Dois Cobradores do Quinto rondam: se te pegam com ouro sem selo, gasta uma tentativa.', 'O santo do pau oco (nos cantos) esconde o ouro por alguns segundos: aí são os Cobradores que fogem.']);
        quitBtn(A);
      },
      action() { if (stage === 'intro') stage = 'play'; },
      key(k) { const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k]; if (d) { P.want = d; if (P.d[0] === -d[0] && P.d[1] === -d[1]) P.d = d; } },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
    };
  }

  // ===================== 9. A Balança do Quinto (Casa de Fundição, 1725) — à moda do Kaboom! =====================
  // Pesos caem do teto da Casa de Fundição. Apare com o prato só os que somam exatamente o Quinto (20%) do pó
  // e aperte A para pesar. Passou do Quinto ou pesou errado: erro. Três barras certas vencem; três erros, tentativa.
  function balanca(A) {
    const { g, W, H, txt } = A;
    const ERROS = 3, PESOS = [1, 2, 5, 10];
    let stage = 'intro', dust = 0, sum = 0, put = [], ok = 0, erros = 0, P = { x: W / 2 }, fall = [], spawn = 0, t = 0, msg = '', msgT = 0;
    const deal = () => { dust = 5 * (6 + Math.floor(Math.random() * 15)); sum = 0; put = []; fall = []; };
    const target = () => dust / 5;
    const say = (m) => { msg = m; msgT = 2.4; };
    function err(m) { erros++; A.sfx('bad'); A.shake(0.2); say(`${m} (erro ${erros} de ${ERROS})`); if (erros >= ERROS) { stage = 'gone'; A.lose(`Três erros. O Quinto de ${dust} era ${target()}.`); return; } deal(); }
    return {
      enter() { A.music('apogeu'); deal(); },
      update(dt) {
        t += dt; if (msgT > 0) msgT -= dt; if (stage !== 'play') return;
        P.x = Math.max(70, Math.min(W - 70, P.x + ((A.keys.ArrowRight ? 1 : 0) - (A.keys.ArrowLeft ? 1 : 0)) * 380 * dt));
        if ((spawn -= dt) <= 0) { spawn = 0.75; fall.push({ x: 80 + Math.random() * (W - 160), y: 70, v: PESOS[Math.floor(Math.random() * 4)], s: 150 + ok * 40 + Math.random() * 60 }); }
        fall = fall.filter((f) => {
          f.y += f.s * dt;
          if (f.y > H - 120 && f.y < H - 90 && Math.abs(f.x - P.x) < 56) { sum += f.v; put.push(f.v); A.sfx('coin'); if (sum > target()) err(`Passou do Quinto: ${sum} de ${target()}.`); return false; }
          return f.y < H;
        });
      },
      draw() {
        A.bg('assets/img/cards/c43.webp', 3, 0.55, '#3a2a1a');
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 70, W, H - 70);
        for (const f of fall) { if (A.spr?.('peso', f.x, f.y - 4, 40, 40)) { txt(String(f.v), f.x, f.y - 6, 10, '#fff', 'center'); continue; } g.fillStyle = '#6a6a6a'; g.fillRect(f.x - 16, f.y - 14, 32, 28); g.fillStyle = '#9a9a9a'; g.fillRect(f.x - 10, f.y - 20, 20, 6); txt(String(f.v), f.x, f.y - 6, 10, '#fff', 'center'); }
        // o prato
        if (!A.spr?.('prato', P.x, H - 80, 128, 64)) { g.fillStyle = '#c8a050'; g.fillRect(P.x - 4, H - 90, 8, 40); g.fillStyle = '#e8c86a'; g.fillRect(P.x - 56, H - 100, 112, 12); }
        put.slice(-8).forEach((v, i) => { g.fillStyle = '#6a6a6a'; g.fillRect(P.x - 50 + i * 13, H - 112, 12, 12); });
        txt(`Pó: ${dust} · Quinto: ${target()} · No prato: ${sum}`, W / 2, H - 40, 12, sum === target() ? '#9be36a' : '#ffd84a', 'center');
        head(A, 'A Balança do Quinto · 1725', `Barras certas: ${ok}/3 · Erros: ${erros}/${ERROS} · Tentativa ${A.tries}/3`);
        if (msgT > 0) { A.box(W / 2 - 250, 78, 500, 28, 0.85); txt(msg, W / 2, 86, 9, '#fff', 'center'); }
        if (stage === 'intro') intro(A, 'A Balança do Quinto', ['Só ouro em barra, com o selo do rei, podia circular. Antes, a Coroa tirava o Quinto: 20% de todo o pó.', 'Pesos caem do teto. Apare com o prato (joystick) só o que soma exatamente o Quinto e aperte A para pesar.', 'Passou do Quinto ou pesou errado: erro. Três barras certas vencem.']);
        quitBtn(A);
      },
      action() {
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage !== 'play') return;
        if (sum === target()) { ok++; A.sfx('ok'); say(`Barra com o selo real! ${dust} de pó, ${target()} para a Coroa.`);
          if (ok >= 3) { stage = 'done'; const n = A.G.dust; A.G.dust = 0; A.G.gold += n; A.save(); A.say([['fundidor', 'Três barras certinhas. A Coroa não tem do que reclamar.'], ['cobrador', 'Hmpf. Por hoje.'], ['mula', n ? `E todo o seu pó (${n}) virou ouro selado.` : 'Viu? 20% de qualquer coisa: a Coroa sempre sabia fazer essa conta.']], () => A.win({ card: 'C43' })); return; }
          deal(); }
        else err(`Sonegação! Faltou: ${sum} de ${target()}.`);
      },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
    };
  }

  // ===================== 10. Os Doze Profetas (Congonhas, 1800) — andar até o pedestal certo =====================
  // O aprendiz dá a pista; ande pelo adro com o joystick e aperte A no pedestal do profeta. O vento troca os nomes.
  function profetas(A) {
    const { g, W, H, txt } = A;
    const P12 = [['Jonas', 'Passou três dias na barriga de um peixe.'], ['Daniel', 'Saiu inteiro da cova dos leões.'], ['Isaías', 'Tem o pergaminho e a pena: o mais citado de todos.'], ['Jeremias', 'Chorou pela queda de Jerusalém.'], ['Baruc', 'Era o escriba de Jeremias.'], ['Ezequiel', 'Teve a visão das rodas de fogo.'], ['Oseias', 'Falou de um amor que perdoa.'], ['Joel', 'Anunciou a praga dos gafanhotos.'], ['Amós', 'Era pastor antes de ser profeta.'], ['Abdias', 'Tem o livro mais curto de todos.'], ['Habacuc', 'Ficou de vigia na torre, esperando resposta.'], ['Naum', 'Anunciou a queda de Nínive.']];
    const TEMPO = 120, VENTO = 9;
    let stage = 'intro', t = TEMPO, tt = 0, order = [], cur = 0, placed = new Set(), pos = P12.map((_, i) => i), wind = VENTO, msg = '', msgT = 0, B = { x: W / 2, y: H - 70, face: 1, ph: 0, mv: false };
    const ped = (k) => [140 + (k % 6) * 136, k < 6 ? 170 : 330]; // centro de cada pedestal
    const shuffle = () => { for (let i = pos.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pos[i], pos[j]] = [pos[j], pos[i]]; } };
    const nearK = () => { let best = -1, bd = 56; pos.forEach((_, k) => { const [x, y] = ped(k), d = Math.hypot(B.x - x, B.y - (y + 40)); if (d < bd) { bd = d; best = k; } }); return best; };
    return {
      enter() { A.music('depois'); order = P12.map((_, i) => i).sort(() => Math.random() - 0.5); shuffle(); },
      update(dt) {
        tt += dt; if (msgT > 0) msgT -= dt; if (stage !== 'play') return;
        if ((t -= dt) <= 0) { stage = 'gone'; A.lose('O tempo acabou antes dos doze profetas.'); return; }
        if ((wind -= dt) <= 0) { wind = VENTO; shuffle(); A.sfx('hop'); msg = 'O vento trocou as plaquinhas de lugar!'; msgT = 2; }
        const kx = (A.keys.ArrowRight ? 1 : 0) - (A.keys.ArrowLeft ? 1 : 0), ky = (A.keys.ArrowDown ? 1 : 0) - (A.keys.ArrowUp ? 1 : 0);
        B.mv = !!(kx || ky); if (B.mv) { const l = Math.hypot(kx, ky); B.x = Math.max(40, Math.min(W - 40, B.x + kx / l * 210 * dt)); B.y = Math.max(140, Math.min(H - 30, B.y + ky / l * 210 * dt)); B.face = Math.abs(kx) > Math.abs(ky) ? (kx < 0 ? -1 : 2) : (ky < 0 ? 1 : 0); B.ph += dt * 12; }
      },
      draw() {
        A.bg('img/bg_congonhas.jpg', 3, 0.4, '#8a8a6a');
        if (!A.img('img/bg_congonhas.jpg')) { g.fillStyle = '#a8a888'; g.fillRect(0, 70, W, H); }
        const nk = stage === 'play' ? nearK() : -1;
        pos.forEach((pi, k) => {
          const [x, y] = ped(k), done = placed.has(pi);
          if (!A.spr?.('pedestal', x, y + 30, 86, 56)) { g.fillStyle = '#b8b2a8'; g.fillRect(x - 35, y + 10, 70, 46); g.fillStyle = '#d8d2c8'; g.fillRect(x - 41, y + 4, 82, 10); }
          if (done && !A.spr?.('profeta', x, y - 22, 46, 76)) { g.fillStyle = '#c8c2b0'; g.fillRect(x - 15, y - 44, 30, 50); g.fillRect(x - 11, y - 56, 22, 16); }
          if (k === nk) { g.strokeStyle = '#ffd84a'; g.lineWidth = 3; g.strokeRect(x - 46, y - 2, 92, 62); }
          txt(P12[pi][0], x, y + 62, 8, done ? '#9be36a' : '#fff', 'center');
        });
        A.dude(B.x, B.y, A.PAL.buck, B.ph, B.face, 2.4, B.mv);
        const p = order[cur];
        if (stage === 'play' && p != null) { A.box(20, 70, W - 260, 52, 0.95); txt(`O aprendiz: "${P12[p][1]}"`, 20 + (W - 260) / 2, 80, 10, '#fff', 'center'); txt('Vá até o pedestal dele e aperte A.', 20 + (W - 260) / 2, 100, 9, '#ffd84a', 'center'); }
        head(A, 'Os Doze Profetas · Congonhas', `${placed.size}/12 · Tentativa ${A.tries}/3`, stage === 'play' ? t : null, TEMPO);
        if (msgT > 0) { A.box(W / 2 - 220, H - 40, 440, 26, 0.85); txt(msg, W / 2, H - 33, 9, '#ffd84a', 'center'); }
        if (stage === 'intro') intro(A, 'Os Doze Profetas', ['O mestre Aleijadinho esculpiu doze profetas em pedra-sabão, já depois do auge do ouro.', 'O aprendiz dá uma pista. Ande pelo adro com o joystick e aperte A no pedestal certo.', 'O vento troca as plaquinhas de lugar de vez em quando. Erro tira 3 segundos.']);
        quitBtn(A);
      },
      action() {
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage !== 'play') return;
        const k = nearK(); if (k < 0) return;
        if (pos[k] === order[cur]) { placed.add(order[cur]); cur++; A.sfx('ok'); msg = ''; if (cur >= 12) { stage = 'done'; A.say([['aprendiz', 'Os doze estão no lugar. O mestre fez isso quando o ouro já tinha ido embora.'], ['mula', 'O ouro acabou. O barroco ficou. Anota isso: é a pista do relatório final.']], () => A.win({ card: 'C67' })); } }
        else if (!placed.has(pos[k])) { A.sfx('bad'); t -= 3; msg = 'Esse não. -3 s'; msgT = 1.6; }
      },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
    };
  }

  // ===================== 11. A Língua dos Sinos (São João del-Rei, hoje) — à moda do Simon =====================
  // Escolha o toque certo para o que acontece na cidade (joystick + A) e repita as badaladas do Sineiro:
  // joystick para a esquerda = sino GRANDE, para a direita = sino pequeno.
  function sinos(A) {
    const { g, W, H, txt } = A;
    const TOQUES = [
      { id: 'festa', nome: 'Toque de festa', cena: 'Dia de festa na igreja', seq: 'PPGPPG' },
      { id: 'fogo', nome: 'Toque de fogo', cena: 'Fumaça subindo de um telhado', seq: 'GGGGGG' },
      { id: 'procissao', nome: 'Toque de procissão', cena: 'A procissão sai da matriz', seq: 'GPGPGP' },
      { id: 'homem', nome: 'Defunto: homem', cena: 'Morreu um senhor da cidade', seq: 'GGG' },
      { id: 'mulher', nome: 'Defunto: mulher', cena: 'Morreu uma senhora da cidade', seq: 'GG' },
      { id: 'crianca', nome: 'Defunto: criança', cena: 'Morreu uma criança', seq: 'P' },
    ];
    let stage = 'intro', wins = 0, cur = null, phase = 'choose', sel = 0, play = [], pi = 0, pt = 0, input = '', swing = { G: 0, P: 0 }, erros = 0;
    const pick = () => { cur = TOQUES[Math.floor(Math.random() * TOQUES.length)]; phase = 'choose'; input = ''; };
    const ring = (b) => { swing[b] = 1; A.sfx(b === 'G' ? 'sino' : 'sinoP'); };
    const listen = () => { play = cur.seq.split(''); pi = 0; pt = 0.7; phase = 'listen'; input = ''; };
    function err(m) { erros++; A.sfx('bad'); if (erros >= 3) { stage = 'gone'; A.lose('Três erros. A cidade inteira ouviu.'); return true; } A.say([['sineiro', `${m} (erro ${erros} de 3)`]]); return false; }
    return {
      enter() { pick(); },
      update(dt) {
        swing.G = Math.max(0, swing.G - dt * 2); swing.P = Math.max(0, swing.P - dt * 2);
        if (phase === 'listen') { pt -= dt; if (pt <= 0) { if (pi < play.length) { ring(play[pi]); pi++; pt = 0.7; } else phase = 'repeat'; } }
      },
      draw() {
        A.bg('img/bg_torre.jpg', 3, 0.35, '#3a3048');
        for (const [b, x, y, r] of [['G', 240, 300, 70], ['P', 800, 250, 44]]) { if (!A.img('img/bg_torre.jpg')) { g.fillStyle = '#c8a050'; g.beginPath(); g.arc(x, y, r * 0.8, Math.PI, 0); g.fill(); g.fillRect(x - r * 0.8, y, r * 1.6, r * 0.6); } if (swing[b] > 0) { g.strokeStyle = `rgba(255,216,74,${swing[b]})`; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r + (1 - swing[b]) * 30, 0, 7); g.stroke(); } }
        txt('◀ GRANDE', 240, 390, 10, '#fff', 'center'); txt('pequeno ▶', 800, 320, 10, '#fff', 'center');
        head(A, 'A Língua dos Sinos · São João del-Rei', `Toques certos: ${wins}/5 · Erros: ${erros}/3 · toques simplificados para o jogo`);
        if (stage === 'play' && cur) {
          A.box(190, 336, W - 380, 170, 0.95); // entre o joystick e o botão A, abaixo dos rótulos dos sinos
          if (phase === 'choose') {
            txt(`Na cidade: ${cur.cena}. Qual toque?`, W / 2, 350, 9, '#ffd84a', 'center'); txt('joystick escolhe · A confirma', W / 2, 480, 8, '#fff', 'center');
            TOQUES.forEach((tq, i) => btn(A, [204 + (i % 3) * 186, 374 + Math.floor(i / 3) * 52, 176, 44], tq.nome, i === sel ? '#ffd84a' : '#e8dcb0', '#1a1030', 8));
          } else txt(phase === 'listen' ? 'Escute o Sineiro...' : `Repita: joystick ◀ grande · ▶ pequeno   ${input.split('').join(' ')}`, W / 2, 400, 9, '#ffd84a', 'center');
        }
        if (stage === 'intro') intro(A, 'A Língua dos Sinos', ['Em São João del-Rei os sinos falam, e a cidade entende.', 'Veja o que acontece na cidade e escolha o toque certo. Depois repita as badaladas do Sineiro: joystick para a esquerda toca o sino grande, para a direita o pequeno.', 'Cinco toques certos. Três erros gastam uma tentativa.']);
        quitBtn(A);
      },
      action() {
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage !== 'play' || phase !== 'choose') return;
        if (TOQUES[sel].id !== cur.id && err(`Não. ${cur.cena}: isso pede o ${cur.nome.toLowerCase()}.`)) return;
        listen();
      },
      key(k) {
        if (stage !== 'play') return;
        if (phase === 'choose') { const st = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[k]; if (st) { sel = (sel + st + 6) % 6; A.sfx('bip'); } return; }
        if (phase !== 'repeat') return;
        const b = k === 'ArrowLeft' ? 'G' : k === 'ArrowRight' ? 'P' : null; if (!b) return;
        ring(b); input += b;
        if (!cur.seq.startsWith(input)) { if (!err('Errou a badalada. De novo.')) listen(); return; }
        if (input === cur.seq) {
          wins++; A.sfx('ok');
          if (wins >= 5) { stage = 'done'; A.say([['sineiro', 'Agora você fala a língua dos sinos. E eu vou te ajudar: quando houver um relatório perto, eu toco.'], ['mula', 'Radar de igreja. O melhor prêmio do jogo, confia.']], () => A.win({ card: 'C77' })); return; }
          pick();
        }
      },
      tap(px, py) { if (inR(px, py, QUIT(A))) A.quit(); },
    };
  }

  return { regua, escambo, carta, moenda, ponte, fogueiras, turmalina, garimpo, balanca, profetas, sinos };
})();
