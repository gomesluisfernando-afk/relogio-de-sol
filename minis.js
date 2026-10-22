// Minigames do Relógio de Sol v2. Cada um é uma cena: MINIS[id](api) → { enter, update, draw, tap, down, drag, up, key }.
// Regra comum: toque ou setas, a mecânica ensina (não o texto), vitória paga +10 de ouro.
// Perder (A.lose) gasta uma de 3 tentativas; esgotou, volta ao mapa e tenta quando quiser. Minigame com vidas próprias manda lose(motivo, true).
// api: g, W, H, txt, box, wrap, say, sfx, music, bg, dude, mula, PAL, CARD, G, win(prêmio), lose(motivo), quit().
'use strict';
window.MINIS = (() => {
  const inR = (x, y, r) => r && x >= r[0] && y >= r[1] && x <= r[0] + r[2] && y <= r[1] + r[3];
  // botão simples desenhado no canvas; devolve o retângulo para teste de toque
  function btn(A, r, label, col = '#ffd84a', fg = '#1a1030', size = 12) {
    const { g, txt } = A;
    g.fillStyle = col; g.fillRect(...r); g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeRect(...r);
    txt(label, r[0] + r[2] / 2, r[1] + r[3] / 2 - size / 2, size, fg, 'center');
    return r;
  }
  function head(A, title, sub, timeLeft, total) {
    const { g, W, txt, box } = A;
    box(10, 8, W - 20, 54, 0.88);
    txt(title, 28, 22, 13, '#ffd84a');
    if (sub) txt(sub, 28, 42, 9, '#fff');
    if (timeLeft != null) { const w = 220; g.fillStyle = '#0a1040'; g.fillRect(W - w - 30, 26, w, 14); g.fillStyle = timeLeft / total > 0.25 ? '#9be36a' : '#ff5a5a'; g.fillRect(W - w - 30, 26, w * Math.max(0, timeLeft / total), 14); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(W - w - 30, 26, w, 14); txt(`${Math.ceil(timeLeft)}s`, W - w - 40, 26, 10, '#fff', 'right'); }
  }
  const quitBtn = (A) => btn(A, [A.W - 110, A.H - 46, 96, 34], 'SAIR', '#8a9ad8', '#0a1040', 10);
  // tela de início: explica em uma linha e espera um toque
  function intro(A, title, lines) {
    const { g, W, H, txt, box, wrap } = A;
    box(120, 110, W - 240, 300, 0.95);
    txt(title, W / 2, 140, 16, '#ffd84a', 'center');
    let y = 186;
    for (const l of lines) { for (const s of wrap(l, W - 320, 11)) { txt(s, W / 2, y, 11, '#fff', 'center'); y += 20; } y += 8; }
    txt('toque para começar', W / 2, 372, 11, '#9be36a', 'center');
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
    let x = 700, stage = 'intro', t = 0, reveal = 0, q = null;
    const poly = (pts, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); pts.forEach(([lo, la], k) => (k ? g.lineTo(px(lo), py(la)) : g.moveTo(px(lo), py(la)))); g.closePath(); g.fill(); g.globalAlpha = 1; };
    function world() {
      g.fillStyle = '#e8d8a8'; g.fillRect(X0, 90, X1 - X0, 360);
      g.save(); g.beginPath(); g.rect(X0, 90, X1 - X0, 360); g.clip();
      poly(AF, '#c8a868'); poly(IB, '#c8a868'); poly(PT, '#b08a4a');
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
      update(dt) { t += dt; if (stage === 'signed') reveal = Math.min(1, reveal + dt * 0.6); },
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
        head(A, 'A Régua dos Reis · 1494', stage === 'signed' ? 'Em 1494 ninguém sabia o que havia do outro lado da linha.' : 'Arraste a linha até 370 léguas a oeste de Cabo Verde. Depois, assine.');
        if (stage === 'play') q = btn(A, [W / 2 - 80, H - 66, 160, 44], 'ASSINAR');
        if (stage === 'intro') intro(A, 'A Régua dos Reis', ['1494. Espanha e Portugal dividem o mundo com uma linha: 370 léguas a oeste de Cabo Verde.', 'A sombra verde é o Brasil. Em 1494 ninguém sabia que ele existia, mas aqui você aprende onde a linha caiu.', 'Arraste a linha vermelha até o lugar certo e assine. Você tem 3 tentativas.']);
        quitBtn(A);
      },
      tap(px0, py0) {
        if (inR(px0, py0, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; A.sfx('tap'); return; }
        if (stage === 'play' && inR(px0, py0, q)) {
          stage = 'signed'; A.sfx('sino');
          const diff = Math.abs(x - REAL);
          setTimeout(() => {
            if (diff <= OK) A.say([['narr', 'A névoa se abre: atrás da linha havia um continente inteiro.'], ['mula', 'Quase em cima da linha de verdade: 370 léguas a oeste de Cabo Verde. Só a ponta leste do Brasil ficava com Portugal.'], ['mula', 'E ninguém perguntou nada para quem morava aqui.']], () => A.win({ card: 'C02', item: 'regua' }));
            else A.lose(`A linha ficou ${x > REAL ? 'a leste' : 'a oeste'} demais. A de verdade passava a 370 léguas de Cabo Verde, cortando o Brasil de Belém até Laguna.`);
          }, 1600);
        }
      },
      down(px0, py0) { if (stage === 'play' && py0 > 90 && py0 < 450) x = Math.max(X0 + 10, Math.min(X1 - 10, px0)); },
      drag(px0) { if (stage === 'play') { x = Math.max(X0 + 10, Math.min(X1 - 10, px0)); } },
      key(k) { if (stage === 'play') { if (k === 'ArrowLeft') x = Math.max(X0 + 10, x - 10); if (k === 'ArrowRight') x = Math.min(X1 - 10, x + 10); if (k === 'Enter') this.tap(W / 2, H - 44); } else if (stage === 'intro') this.tap(0, 0); },
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
    let stage = 'intro', P = { x: W / 2, r: 0, hop: 0, face: 2 }, carry = 0, logs = 0, util = [], lives = VIDAS, left = TEMPO, rects = [], msg = '', msgT = 0, t = 0, dead = 0;
    const avg = () => (util.length ? Math.round(util.reduce((a, b) => a + b, 0) / util.length) : 0);
    const say = (m) => { msg = m; msgT = 2.5; };
    function die(why) {
      lives--; A.sfx('hit'); A.shake(0.25); dead = 0.8;
      if (carry) why += ` ${carry} toras perdidas.`;
      carry = 0;
      if (lives <= 0) { stage = 'gone'; A.lose(`${why} Acabaram as 3 vidas.`, true); return; }
      say(`${why} Restam ${lives} vida${lives > 1 ? 's' : ''}.`);
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
        // faixas
        for (let r = 0; r < ROWS; r++) {
          const y = ry(r), L = LANES[r];
          g.fillStyle = r === 0 ? '#2f6a2a' : r === ROWS - 1 ? '#8a5a3a' : r === 4 ? '#e8d8a0' : L.kind === 'water' ? (r % 2 ? '#2a6fb0' : '#2a64a0') : (r % 2 ? '#6a8a3a' : '#5e7e34');
          g.fillRect(0, y, W, CELL);
          if (L?.kind === 'water') { g.fillStyle = 'rgba(255,255,255,.15)'; for (let k = 0; k < 14; k++) g.fillRect(((k * 97 + t * 30 * Math.sign(L.v)) % W + W) % W, y + 10 + (k % 3) * 12, 26, 2); }
          if (L?.kind === 'land') { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y + CELL / 2 - 1, W, 2); }
        }
        g.fillStyle = '#2a5a24'; for (let k = 0; k < 16; k++) { g.beginPath(); g.arc(20 + k * 62, ry(0) + 10, 16, 0, 7); g.fill(); }
        g.fillStyle = '#9a3a22'; for (let k = 0; k < 3; k++) g.fillRect(W / 2 - 60 + k * 6, ry(0) + 28 - k * 6, 120 - k * 12, 6);
        txt('MATA · PAU-BRASIL', 24, ry(0) + 30, 8, '#fff');
        g.fillStyle = '#6a3a1a'; g.fillRect(W / 2 - 70, ry(ROWS - 1) + 4, 140, 38); txt('FEITORIA', W / 2, ry(ROWS - 1) + 16, 11, '#ffd84a', 'center');
        txt('PRAIA', 24, ry(4) + 18, 8, '#7a6a3a');
        // bichos e plataformas
        for (const [r, L] of Object.entries(LANES)) for (const x of xs(L)) drawObj(L.obj, x, ry(+r) + CELL / 2, L.w, L.v);
        // Buck
        const by = ry(P.r) + CELL - 4 - (P.hop > 0 ? 8 : 0);
        if (!(dead > 0 && Math.floor(t * 12) % 2)) {
          A.dude(P.x, by, A.PAL.buck, t * 10, P.face, 2.4, P.hop > 0);
          for (let i = 0; i < carry; i++) { g.fillStyle = '#9a3a22'; g.fillRect(P.x - 16, by - 50 - i * 6, 32, 5); }
        }
        head(A, 'Escambo · 1502', `Vidas: ${lives} · Toras: ${logs}/${META} · Utilidade: ${avg()}% (meta 70%)`, stage === 'intro' ? null : left, TEMPO);
        if (msgT > 0) { A.box(W / 2 - 260, 68, 520, 28, 0.85); txt(msg, W / 2, 76, 9, '#fff', 'center'); }
        if (stage === 'offer') {
          A.box(220, 150, 520, 260, 0.96); txt(`O português oferece, por ${carry} toras (o relógio parou):`, W / 2, 175, 10, '#ffd84a', 'center');
          rects = OFFERS.map(([l], i) => btn(A, [250 + (i % 2) * 240, 210 + Math.floor(i / 2) * 80, 220, 60], l, '#e8dcb0', '#1a1030', 12));
        }
        if (stage === 'intro') intro(A, 'Escambo', ['Atravesse a trilha (cuidado com onças e queixadas) e o mar pulando nas canoas, toras e jangadas. Na água, fora delas, você cai.', `Leve ${CARGA} toras até a feitoria, escolha a troca e volte para buscar mais. Meta: ${META} toras com utilidade de 70%. Você tem ${VIDAS} vidas.`, 'Setas ou toque acima, abaixo ou do lado do Buck para pular.']);
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'walk'; carry = CARGA; return; }
        if (stage === 'walk') { const dx = px - P.x, dy = py - (ry(P.r) + CELL / 2); if (Math.abs(dy) > Math.abs(dx)) hop(0, dy < 0 ? 1 : -1); else hop(dx > 0 ? 1 : -1, 0); return; }
        if (stage === 'offer') {
          const i = rects.findIndex((r) => inR(px, py, r)); if (i < 0) return;
          logs += carry; for (let k = 0; k < carry; k++) util.push(OFFERS[i][1]); carry = 0; A.sfx(OFFERS[i][1] > 50 ? 'ok' : 'tap');
          say(OFFERS[i][1] > 50 ? `${OFFERS[i][0]}: isso muda a vida de quem corta árvore. Volte à mata.` : `${OFFERS[i][0]}: bonito, mas não corta nada. Volte à mata.`);
          if (logs >= META && avg() >= 70) { stage = 'done'; A.say([['caramuru', 'Agora você entendeu. O valor de uma coisa depende de quem precisa dela.'], ['mula', 'Machado de ferro para quem só tinha pedra: isso valia uma floresta. Literalmente.']], () => A.win({ card: 'C06', item: 'machado' })); return; }
          if (logs >= META) say('Muitas toras, pouca utilidade. Traga mais e troque melhor.');
          stage = 'walk';
        }
      },
      key(k) {
        if (stage === 'intro') return this.tap(0, 0);
        if (stage === 'offer' && '1234'.includes(k)) return this.tap(...rects[+k - 1].slice(0, 2).map((v) => v + 5));
        const d = { ArrowUp: [0, 1], w: [0, 1], ArrowDown: [0, -1], s: [0, -1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[k];
        if (d) hop(...d);
      },
    };
  }

  // ===================== 3. A Carta em Pedaços (Porto Seguro, 1500) =====================
  function carta(A) {
    const { g, W, H, txt } = A;
    // sequência do primeiro contato segundo a carta de Caminha (paráfrases curtas)
    const SEQ = ['Avistamos um monte alto e redondo.', 'Ancoramos diante da terra.', 'Vimos homens na praia, pardos, nus.', 'Trocamos barretes e contas por arcos e cocares.', 'Rezou-se a primeira missa na terra.', 'Nela, em se plantando, tudo dá.'];
    let stage = 'intro', bits = SEQ.map((s, i) => ({ i, x: 140 + ((i * 263) % 680), y: 140 + ((i * 157) % 260), got: false, ph: i })), order = [], t = 0, rects = [];
    const shuffled = SEQ.map((s, i) => i).sort((a, b) => ((a * 7 + 3) % 6) - ((b * 7 + 3) % 6));
    return {
      enter() { A.music('paubrasil'); },
      update(dt) { t += dt; },
      draw() {
        A.bg('assets/img/scenes/porto_seguro.webp', 3, 0.15, '#5a8a3a');
        if (stage === 'collect') for (const b of bits) if (!b.got) { const y = b.y + Math.sin(t * 2 + b.ph) * 8, x = b.x + Math.sin(t + b.ph) * 10; g.fillStyle = '#f2e6c0'; g.save(); g.translate(x, y); g.rotate(Math.sin(t * 3 + b.ph) * 0.3); g.fillRect(-22, -14, 44, 28); g.fillStyle = '#8a6a3a'; g.fillRect(-16, -6, 32, 2); g.fillRect(-16, 0, 26, 2); g.restore(); }
        head(A, 'A Carta em Pedaços · 1500', stage === 'collect' ? `Pedaços: ${bits.filter((b) => b.got).length}/6` : stage === 'order' ? 'Toque os pedaços na ordem em que tudo aconteceu.' : '');
        if (stage === 'order') {
          A.box(80, 80, W - 160, 380, 0.96);
          rects = shuffled.map((i, k) => { const used = order.includes(i); const r = [110, 104 + k * 56, W - 220, 46]; btn(A, r, used ? `${order.indexOf(i) + 1}. ${SEQ[i]}` : SEQ[i], used ? '#9be36a' : '#e8dcb0', '#1a1030', 10); return [r, i]; });
        }
        if (stage === 'intro') intro(A, 'A Carta em Pedaços', ['O vento espalhou a carta de Pero Vaz de Caminha pela praia.', 'Toque nos 6 pedaços para juntar. Depois, coloque na ordem em que tudo aconteceu.']);
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'collect'; return; }
        if (stage === 'collect') {
          for (const b of bits) if (!b.got && Math.hypot(px - b.x, py - b.y) < 46) { b.got = true; A.sfx('coin'); }
          if (bits.every((b) => b.got)) { stage = 'order'; A.sfx('ok'); }
          return;
        }
        if (stage === 'order') {
          const hit = rects.find(([r, i]) => inR(px, py, r) && !order.includes(i)); if (!hit) return;
          order.push(hit[1]); A.sfx('tap');
          if (order.length === SEQ.length) {
            const ok = order.every((v, k) => v === k);
            if (ok) { stage = 'done'; A.say([['caminha', 'Senhor, posto que o capitão-mor e os outros capitães escrevam... eu também escrevo. E nesta ordem.'], ['mula', 'A primeira notícia do Brasil foi uma carta. E já tinha propaganda imobiliária no final.']], () => A.win({ card: 'C05' })); }
            else { A.sfx('bad'); const wrong = order.map((i) => SEQ[i]).slice(0, 3).join(' Depois: '); order = []; A.say([['caminha', `Majestade... "${wrong}"...`], ['mula', 'Ficou parecendo que rezaram a missa antes de chegar. Tenta de novo.']]); }
          }
        }
      },
      key() { if (stage === 'intro') this.tap(0, 0); },
    };
  }

  // ===================== 4. A Moenda (engenho, 1570) — tom sério =====================
  function moenda(A) {
    const { g, W, H, txt } = A;
    const BEAT = 60 / 108 * 2, WIN = 0.18, TOTAL = 90;
    let stage = 'intro', t = 0, next = BEAT, jams = 0, streak = 0, flash = 0, ok = 0, rot = 0, hit = false;
    return {
      enter() { A.music('tambor'); A.sfx('moenda'); },
      update(dt) {
        if (stage !== 'play') return;
        t += dt; rot += dt * 3;
        if (t > next + WIN) { if (!hit) { jams++; streak++; flash = 0.4; A.sfx('hit'); A.shake(0.15); } hit = false; next += BEAT; }
        if (streak >= 3) { stage = 'gone'; A.lose('Três entaladas seguidas. A moenda parou.'); return; }
        if (flash > 0) flash -= dt;
        if (t >= TOTAL) { stage = 'end'; A.music(null); A.sfx('sino'); }
      },
      draw() {
        A.bg('img/bg_moenda.jpg', 3, 0.55, '#3a2a1a');
        if (!A.img('img/bg_moenda.jpg')) A.bg('assets/img/scenes/engenho.webp', 3, 0.55, '#3a2a1a');
        for (let i = 0; i < 3; i++) { const x = W / 2 - 110 + i * 110, y = 270; g.fillStyle = '#5a4a3a'; g.beginPath(); g.arc(x, y, 50, 0, 7); g.fill(); g.strokeStyle = '#2a1a0a'; g.lineWidth = 4; for (let k = 0; k < 4; k++) { const an = rot * (i % 2 ? -1 : 1) + k * Math.PI / 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * 48, y + Math.sin(an) * 48); g.stroke(); } }
        // cana chegando no tempo da batida
        const ph = 1 - Math.max(0, (next - t)) / BEAT;
        g.fillStyle = flash > 0 ? '#ff5a5a' : '#c8d070'; g.fillRect(80 + ph * (W / 2 - 220), 262, 120, 16);
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(W / 2 - 170, 250, 40, 40);
        // mãos: um par a cada 30 s
        const hands = Math.min(6, 1 + Math.floor(t / 30) * 2 - (t < 30 ? 0 : 0));
        for (let i = 0; i < hands; i++) { g.fillStyle = '#5a3a28'; g.fillRect(140 + i * 110, 400, 34, 22); g.fillRect(150 + i * 110, 390, 14, 12); }
        head(A, 'A Moenda · 1570', 'Toque quando a cana chega no quadrado. O engenho não para.', stage === 'play' ? TOTAL - t : null, TOTAL);
        txt(`mãos: ${hands}`, 30, H - 40, 10, '#ddd');
        if (stage === 'intro') intro(A, 'A Moenda', ['Toque no ritmo para empurrar a cana entre os cilindros.', 'Três entaladas seguidas e você perde.', 'Aguente 90 segundos.']);
        if (stage === 'end') { g.fillStyle = 'rgba(0,0,0,.75)'; g.fillRect(0, 0, W, H); const c = A.CARD.C12; A.wrap(c.title, W - 200, 16).forEach((l, i) => txt(l, W / 2, 200 + i * 28, 16, '#fff', 'center')); txt('toque para continuar', W / 2, 400, 10, '#aaa', 'center'); }
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; t = 0; next = BEAT; return; }
        if (stage === 'end') { stage = 'done'; A.win({ card: 'C12', serio: true }); return; }
        if (stage !== 'play') return;
        if (Math.abs(t - next) <= WIN && !hit) { hit = true; streak = 0; ok++; A.sfx('stone'); } else { jams++; streak++; flash = 0.4; A.sfx('hit'); }
      },
      key(k) { if (k === ' ' || k === 'Enter') this.tap(0, 0); },
    };
  }

  // ===================== 5. A Ponte de Nassau (Recife, 1643) =====================
  function ponte(A) {
    const { g, W, H, txt } = A;
    const NEED = Array.from({ length: 12 }, (_, i) => ((i * 5 + 2) % 3 === 0 ? 'longa' : 'curta'));
    let stage = 'intro', t = 75, slots = NEED.map(() => false), cur = null, lastTap = 0, msg = '', facts = [];
    const deal = () => { const r = Math.random(); cur = r < 0.18 ? 'quebrada' : r < 0.55 ? 'longa' : 'curta'; };
    const sx = (i) => 120 + i * 60;
    return {
      enter() { A.music('invasoes'); deal(); },
      update(dt) { if (stage === 'play') { t -= dt; if (t <= 0) { stage = 'gone'; A.lose('A maré subiu antes de a ponte ficar pronta.'); } } },
      draw() {
        A.bg('img/bg_capibaribe.jpg', 3, 0.3, '#2a6fb0');
        if (!A.img('img/bg_capibaribe.jpg')) { g.fillStyle = '#2a6fb0'; g.fillRect(0, 0, W, H); g.fillStyle = '#7a9a50'; g.fillRect(0, 70, 100, H); g.fillRect(W - 100, 70, 100, H); }
        const tide = (75 - Math.max(0, t)) / 75; g.fillStyle = `rgba(30,80,160,${0.2 + tide * 0.5})`; g.fillRect(100, 300 - tide * 60, W - 200, H);
        NEED.forEach((n, i) => { const x = sx(i), w = n === 'longa' ? 54 : 34; g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x + (54 - w) / 2, 250, w, 30); if (slots[i]) { g.fillStyle = '#8a5a32'; g.fillRect(x + (54 - w) / 2, 250, w, 30); g.fillStyle = '#5a3a1a'; g.fillRect(x + (54 - w) / 2, 262, w, 3); } else txt(n === 'longa' ? 'L' : 'C', x + 27, 258, 9, '#fff', 'center'); });
        facts.forEach((f, i) => txt(f, 120 + i * 260, 300, 9, '#ffd84a'));
        // barco com a prancha atual
        g.fillStyle = '#5a3a1a'; g.fillRect(W / 2 - 70, 380, 140, 30); g.fillStyle = cur === 'quebrada' ? '#6a5a4a' : '#a8784a'; const pw = cur === 'longa' ? 110 : 70; g.fillRect(W / 2 - pw / 2, 360, pw, 18); if (cur === 'quebrada') { g.strokeStyle = '#000'; g.beginPath(); g.moveTo(W / 2 - 10, 360); g.lineTo(W / 2 + 6, 378); g.stroke(); }
        txt(`prancha ${cur}`, W / 2, 420, 10, '#fff', 'center');
        head(A, 'A Ponte de Nassau · 1643', 'Toque no vão do tamanho certo (C curta, L longa). Quebrada: toque duas vezes no barco.', stage === 'play' ? t : null, 75);
        if (msg) txt(msg, W / 2, 470, 10, '#fff', 'center');
        if (stage === 'intro') intro(A, 'A Ponte de Nassau', ['Construa a primeira ponte do Recife: 12 pranchas antes da maré subir.', 'Toque no vão do tamanho da prancha. Prancha quebrada: toque duas vezes no barco para jogar fora.']);
        if (stage === 'lost') { A.box(220, 180, 520, 160, 0.95); txt('A maré subiu.', W / 2, 220, 14, '#ffd84a', 'center'); txt('toque para tentar de novo', W / 2, 280, 10, '#fff', 'center'); }
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage === 'lost') { stage = 'play'; t = 75; slots = NEED.map(() => false); facts = []; deal(); return; }
        if (stage !== 'play') return;
        const now = performance.now();
        if (inR(px, py, [W / 2 - 80, 350, 160, 70])) { if (now - lastTap < 400) { if (cur === 'quebrada') { msg = 'Prancha podre no rio. Boa.'; A.sfx('hop'); } else { msg = 'Essa estava boa! -3 s'; t -= 3; A.sfx('bad'); } deal(); } lastTap = now; return; }
        const i = NEED.findIndex((_, k) => inR(px, py, [sx(k), 240, 54, 50]));
        if (i < 0 || slots[i]) return;
        if (cur === 'quebrada') { msg = 'Prancha quebrada não segura ninguém. -2 s'; t -= 2; A.sfx('bad'); deal(); return; }
        if (NEED[i] !== cur) { msg = 'Não cabe aí. -2 s'; t -= 2; A.sfx('bad'); return; }
        slots[i] = true; A.sfx('stone'); msg = '';
        const n = slots.filter(Boolean).length;
        if (n === 4) facts.push('Primeira ponte do Brasil'); if (n === 8) facts.push('Observatório no Recife'); if (n === 11) facts.push('Frans Post pintava a paisagem');
        if (n === 12) { stage = 'done'; A.say([['nassau', 'Uma ponte! Invasores também constroem, forasteiro. Recife ganhou ponte, observatório e pintores.'], ['mula', 'Ninguém conta essa parte na escola. Agora o relatório conta.']], () => A.win({ card: 'C22' })); return; }
        deal();
      },
      key() { if (stage === 'intro') this.tap(0, 0); },
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
        const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1a2a4a'); sky.addColorStop(1, '#6a5a4a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
        g.fillStyle = '#2a3a2a'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 60) g.lineTo(x, H - 160 - Math.sin(x / 90 + cam / 400) * 40 + cam * 0.05 % 60); g.lineTo(W, H); g.fill();
        for (const p of plats) {
          const y = sy(p.y); if (y < -40 || y > H + 40) continue;
          if (p.kind === 'chao') { g.fillStyle = '#3a5a2a'; g.fillRect(0, y, W, 40); continue; }
          if (p.kind === 'pedra') { g.fillStyle = '#7a7a6a'; g.fillRect(p.x, y, p.w, 14); g.fillStyle = '#9a9a88'; g.fillRect(p.x + 4, y, p.w - 8, 4); }
          else if (p.kind === 'galho') { g.fillStyle = '#6a4a2a'; g.fillRect(p.x, y, p.w, 10); g.fillStyle = '#3a6a2a'; g.fillRect(p.x + 6, y - 6, 16, 6); g.fillRect(p.x + p.w - 24, y - 6, 16, 6); }
          else if (!p.broken) { g.fillStyle = '#8a6a4a'; g.fillRect(p.x, y, p.w, 10); g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x + p.w / 2, y); g.lineTo(p.x + p.w / 2 - 6, y + 10); g.stroke(); }
          if (p.fire) {
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
        if (stage === 'intro') intro(A, 'Fogueiras de Palmares', ['Uma bandeira sobe a serra. O vigia precisa acender as 4 fogueiras de aviso, cada uma mais alta que a outra.', 'Ele pula sozinho: você só guia para os lados (setas, ou segure o dedo à esquerda ou à direita). Galho balança; madeira rachada quebra depois de um pulo.', 'Não caia e chegue antes do tempo acabar. São 3 tentativas.']);
        if (stage === 'won') { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H); txt('As quatro fogueiras estão acesas.', W / 2, 220, 14, '#ffd84a', 'center'); txt('toque para continuar', W / 2, 300, 10, '#ddd', 'center'); }
        quitBtn(A);
      },
      down(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; P.vy = PULO; return; }
        if (stage === 'won') { stage = 'done'; A.say([['vigia', 'O mocambo foi avisado. Organização é o que mantém Palmares de pé há tanto tempo.']], () => A.win({ card: 'C27', serio: true })); return; }
        if (stage === 'play') dir = px < W / 2 ? -1 : 1;
      },
      up() { dir = 0; },
      key(k) { if (stage === 'intro' || stage === 'won') this.down(0, 0); },
    };
  }

  // ===================== 7. Esmeralda ou Turmalina? (sertão, 1681) =====================
  function turmalina(A) {
    const { g, W, H, txt } = A;
    let stage = 'intro', t = 60, stones = [], marks = new Set(), lupa = 2, lupaOn = false, zoom = null, rects = {};
    const deal = () => { stones = Array.from({ length: 10 }, (_, i) => ({ tur: ((i * 7 + 3) % 10) < 6, x: 150 + (i % 5) * 160, y: 180 + Math.floor(i / 5) * 150, r: (i * 37) % 6 })); marks = new Set(); };
    function stone(s, x, y, k = 1) {
      g.save(); g.translate(x, y); g.scale(k, k);
      if (s.tur) { g.fillStyle = '#4a8a4a'; g.beginPath(); g.moveTo(-14, 26); g.lineTo(0, -30); g.lineTo(14, 26); g.closePath(); g.fill(); g.strokeStyle = '#2a5a2a'; g.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 5, 24); g.lineTo(i * 2, -24); g.stroke(); } }
      else { g.fillStyle = '#2ad86a'; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.cos(a) * 22, Math.sin(a) * 28); } g.closePath(); g.fill(); g.fillStyle = '#d8ffe8'; g.fillRect(-6, -14, 5, 5); g.fillRect(6, 4, 3, 3); }
      g.restore();
    }
    return {
      enter() { A.music('ouro'); deal(); },
      update(dt) { if (stage === 'play') { t -= dt; if (t <= 0) this.check(); } if (zoom) { zoom.t -= dt; if (zoom.t <= 0) zoom = null; } },
      check() {
        const right = stones.filter((s, i) => s.tur === marks.has(i)).length;
        if (right >= 8) { stage = 'done'; A.say([['fernao', `...${right} de 10. Então eram... turmalinas? Sete anos no mato por pedra verde comum?`], ['mula', 'Fernão Dias morreu achando que tinha esmeraldas. A corrida do ouro nasceu de uma busca errada.']], () => A.win({ card: 'C29', item: 'turmalina' })); }
        else { A.sfx('bad'); A.say([['fernao', `Só ${right} certas! Olhe de novo: turmalina é prisma de três lados, fosca, com estrias compridas.`]], () => { deal(); t = 60; lupa = 2; }); }
      },
      draw() {
        g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, W, H); g.fillStyle = '#8a6a3a'; g.fillRect(90, 110, W - 180, 330);
        stones.forEach((s, i) => { stone(s, s.x, s.y); if (marks.has(i)) { g.strokeStyle = '#ff5a5a'; g.lineWidth = 4; g.beginPath(); g.moveTo(s.x - 30, s.y - 34); g.lineTo(s.x + 30, s.y + 34); g.moveTo(s.x + 30, s.y - 34); g.lineTo(s.x - 30, s.y + 34); g.stroke(); } });
        head(A, 'Esmeralda ou Turmalina? · 1681', `Marque as que NÃO são esmeraldas. Lupa: ${lupa}`, stage === 'play' ? t : null, 60);
        rects.lupa = btn(A, [30, H - 56, 150, 40], lupaOn ? 'LUPA: toque' : `LUPA (${lupa})`, lupaOn ? '#9be36a' : '#e8dcb0');
        rects.ok = btn(A, [W / 2 - 70, H - 56, 140, 40], 'PRONTO');
        if (zoom) { A.box(W / 2 - 160, 90, 320, 320, 0.97); stone(zoom.s, W / 2, 250, 4); txt(zoom.s.tur ? 'estrias compridas, prisma' : 'brilho vivo, seis faces', W / 2, 380, 9, '#fff', 'center'); }
        if (stage === 'intro') intro(A, 'Esmeralda ou Turmalina?', ['Fernão Dias passou 7 anos caçando esmeraldas.', 'Marque as pedras que NÃO são esmeraldas: turmalina é um prisma de três lados, mais fosco, com estrias compridas.', 'A lupa mostra uma pedra de perto (2 usos). Acerte 8 de 10.']);
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage !== 'play') return;
        if (inR(px, py, rects.lupa)) { if (lupa > 0) lupaOn = !lupaOn; return; }
        if (inR(px, py, rects.ok)) return this.check();
        const i = stones.findIndex((s) => Math.hypot(px - s.x, py - s.y) < 40); if (i < 0) return;
        if (lupaOn) { lupaOn = false; lupa--; zoom = { s: stones[i], t: 1.8 }; A.sfx('tap'); return; }
        marks.has(i) ? marks.delete(i) : marks.add(i); A.sfx('tap');
      },
      key() { if (stage === 'intro') this.tap(0, 0); },
    };
  }

  // ===================== 8. Garimpo no rio (Minas, 1700) =====================
  function garimpo(A) {
    const { g, W, H, txt } = A;
    let stage = 'intro', t = 60, P = { x: 200, y: 300, tx: 200, ty: 300, ph: 0 }, C = { x: 800, y: 130, i: 0 }, nug = [], got = 0, spawn = 0, hitCd = 0;
    const route = [[800, 130], [160, 130], [160, 470], [800, 470]];
    return {
      enter() { A.music('ouro'); A.sfx('garimpo'); },
      update(dt) {
        if (stage !== 'play') return;
        t -= dt; if (t <= 0) { stage = 'end'; A.sfx(got >= 15 ? 'win' : 'bad'); return; }
        const kx = (A.keys.ArrowRight || A.keys.d ? 1 : 0) - (A.keys.ArrowLeft || A.keys.a ? 1 : 0), ky = (A.keys.ArrowDown || A.keys.s ? 1 : 0) - (A.keys.ArrowUp || A.keys.w ? 1 : 0);
        if (kx || ky) { P.tx = P.x + kx * 30; P.ty = P.y + ky * 30; }
        const dx = P.tx - P.x, dy = P.ty - P.y, d = Math.hypot(dx, dy);
        if (d > 2) { const s = Math.min(d, 170 * dt); P.x += dx / d * s; P.y += dy / d * s; P.ph += dt * 14; }
        P.x = Math.max(120, Math.min(840, P.x)); P.y = Math.max(160, Math.min(440, P.y));
        if ((spawn -= dt) <= 0) { spawn = 0.8; nug.push({ x: 140 + Math.random() * 680, y: 180 + Math.random() * 250, life: 5 }); }
        nug = nug.filter((n) => { n.life -= dt; if (Math.hypot(n.x - P.x, n.y - P.y) < 22) { got++; A.sfx('coin'); return false; } return n.life > 0; });
        const [rx, ry] = route[C.i], cdx = rx - C.x, cdy = ry - C.y, cd = Math.hypot(cdx, cdy);
        if (cd < 4) C.i = (C.i + 1) % route.length; else { C.x += cdx / cd * 110 * dt; C.y += cdy / cd * 110 * dt; }
        // o Cobrador também desvia para cortar caminho até você
        const pdx = P.x - C.x, pdy = P.y - C.y, pd = Math.hypot(pdx, pdy);
        if (pd < 160) { C.x += pdx / pd * 50 * dt; C.y += pdy / pd * 50 * dt; }
        hitCd -= dt;
        if (pd < 26 && hitCd <= 0) { hitCd = 2; const lost = Math.ceil(got * 0.3); got -= lost; A.sfx('bad'); A.shake(0.2); A.floatTxt(`O Cobrador levou ${lost}!`, '#ff6a5a'); }
      },
      draw() {
        g.fillStyle = '#8a6a3a'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a7ab0'; g.fillRect(110, 150, 740, 300); g.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 20; i++) g.fillRect(120 + (i * 97) % 720, 160 + (i * 53) % 280, 30, 3);
        for (const n of nug) { g.fillStyle = n.life < 1 ? 'rgba(255,216,74,.5)' : '#ffd84a'; g.fillRect(n.x - 5, n.y - 4, 10, 8); g.fillStyle = '#fff6b0'; g.fillRect(n.x - 3, n.y - 3, 3, 3); }
        A.dude(P.x, P.y, A.PAL.buck, P.ph, P.tx < P.x ? -1 : 2, 3, true);
        A.dude(C.x, C.y, A.PAL.cobrador, P.ph, 0, 3, true);
        head(A, 'Garimpo no rio · 1700', `Pepitas: ${got}/15 · Fuja do Cobrador`, stage === 'play' ? t : null, 60);
        if (stage === 'intro') intro(A, 'Garimpo no rio', ['Ande pelo rio pegando pepitas (toque para onde ir, ou setas).', 'O Cobrador patrulha: se ele te alcança, leva 30% do que você juntou.', 'Junte 15 pepitas em 60 segundos.']);
        if (stage === 'end') { A.box(220, 170, 520, 180, 0.95); txt(got >= 15 ? `${got} pepitas! Vira pó de ouro na mochila.` : `Só ${got}. O rio tem mais.`, W / 2, 210, 12, '#ffd84a', 'center'); txt('toque para continuar', W / 2, 290, 10, '#fff', 'center'); }
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage === 'end') { if (got >= 15) { stage = 'done'; A.say([['mula', `${got} de pó na mochila. Agora corre para a Casa de Fundição antes que o Cobrador de verdade te veja.`]], () => A.win({ dust: got })); } else { stage = 'gone'; A.lose(`Só ${got} pepitas de 15.`); } return; }
        if (stage === 'play') { P.tx = px; P.ty = py; }
      },
      key() { if (stage === 'intro' || stage === 'end') this.tap(0, 0); },
    };
  }

  // ===================== 9. A Balança do Quinto (Casa de Fundição, 1725) =====================
  function balanca(A) {
    const { g, W, H, txt } = A;
    let stage = 'intro', dust = 0, put = [], streak = 0, erros = 0, rects = {}, msg = '';
    const deal = () => { dust = 5 * (4 + Math.floor(Math.random() * 17)); put = []; };
    const sum = () => put.reduce((a, b) => a + b, 0);
    return {
      enter() { A.music('apogeu'); deal(); },
      update() {},
      draw() {
        A.bg('assets/img/cards/c43.webp', 3, 0.55, '#3a2a1a');
        const target = dust * 0.2, s = sum(), tilt = Math.max(-0.35, Math.min(0.35, (target - s) / Math.max(4, target) * 0.35));
        g.save(); g.translate(W / 2, 220); g.fillStyle = '#c8a050'; g.fillRect(-6, 0, 12, 180); g.rotate(tilt);
        g.fillRect(-220, -6, 440, 12);
        g.strokeStyle = '#c8a050'; g.lineWidth = 3; g.beginPath(); g.moveTo(-200, 0); g.lineTo(-200, 60); g.moveTo(200, 0); g.lineTo(200, 60); g.stroke();
        g.fillStyle = '#e8c86a'; g.fillRect(-250, 60, 100, 10); g.fillRect(150, 60, 100, 10);
        g.fillStyle = '#ffd84a'; for (let i = 0; i < Math.min(30, dust / 4); i++) g.fillRect(-245 + (i * 13) % 90, 52 - Math.floor(i / 7) * 6, 6, 6);
        put.forEach((p, i) => { g.fillStyle = '#6a6a6a'; g.fillRect(155 + (i * 22) % 88, 44 - Math.floor(i / 4) * 16, 18, 16); txt(String(p), 164 + (i * 22) % 88, 48 - Math.floor(i / 4) * 16, 7, '#fff', 'center'); });
        g.restore();
        txt(`Pó na balança: ${dust}`, W / 2 - 200, 320, 11, '#ffd84a', 'center'); txt(`Pesos: ${sum()}`, W / 2 + 200, 320, 11, '#fff', 'center');
        head(A, 'A Balança do Quinto · 1725', `Separe exatamente o Quinto (20%). Seguidas certas: ${streak}/3`);
        rects.w = [1, 2, 5, 10].map((v, i) => btn(A, [170 + i * 110, 380, 96, 44], `+${v}`, '#e8dcb0'));
        rects.undo = btn(A, [610, 380, 110, 44], 'TIRAR', '#8a9ad8');
        rects.ok = btn(A, [W / 2 - 80, 440, 160, 44], 'PESAR');
        if (msg) txt(msg, W / 2, 352, 10, '#fff', 'center');
        if (stage === 'intro') intro(A, 'A Balança do Quinto', ['Só barra com o selo do rei podia circular. Pó de ouro era crime.', 'Ponha pesos no outro prato até dar exatamente 20% do pó: o Quinto da Coroa.', 'Três fundições certas seguidas. Três erros e você perde.']);
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage !== 'play') return;
        const i = rects.w.findIndex((r) => inR(px, py, r)); if (i >= 0) { put.push([1, 2, 5, 10][i]); A.sfx('tap'); return; }
        if (inR(px, py, rects.undo)) { put.pop(); A.sfx('tap'); return; }
        if (inR(px, py, rects.ok)) {
          const target = dust * 0.2, s = sum();
          if (s === target) { streak++; A.sfx('coin'); msg = `Barra com o selo real! ${dust} de pó, ${target} para a Coroa.`; if (streak >= 3) { stage = 'done'; const n = A.G.dust; A.G.dust = 0; A.G.gold += n; A.save(); A.say([['fundidor', 'Três barras certinhas. A Coroa não tem do que reclamar.'], ['cobrador', 'Hmpf. Por hoje.'], ['mula', n ? `E todo o seu pó (${n}) virou ouro selado.` : 'Viu? 20% de qualquer coisa: a Coroa sempre sabia fazer essa conta.']], () => A.win({ card: 'C43' })); return; } }
          else if (++erros >= 3) { stage = 'gone'; A.lose(`Três pesagens erradas. O Quinto de ${dust} era ${target}.`); return; }
          else if (s < target) { streak = 0; A.sfx('bad'); msg = ''; A.say([['cobrador', `Sonegação! O Quinto de ${dust} é ${target}. Você separou ${s}. (erro ${erros} de 3)`]]); }
          else { streak = 0; A.sfx('bad'); msg = ''; A.say([['cobrador', `A Coroa agradece os ${s - target} a mais. Era ${target}. (erro ${erros} de 3)`]]); }
          deal();
        }
      },
      key(k) { if (stage === 'intro') this.tap(0, 0); },
    };
  }

  // ===================== 10. Os Doze Profetas (Congonhas, 1800) =====================
  function profetas(A) {
    const { g, W, H, txt } = A;
    // atributos e pistas dos profetas de pedra-sabão do adro (narrativa bíblica, simplificada para o jogo)
    const P = [['Jonas', 'Passou três dias na barriga de um peixe.'], ['Daniel', 'Saiu inteiro da cova dos leões.'], ['Isaías', 'Tem o pergaminho e a pena: o mais citado de todos.'], ['Jeremias', 'Chorou pela queda de Jerusalém.'], ['Baruc', 'Era o escriba de Jeremias.'], ['Ezequiel', 'Teve a visão das rodas de fogo.'], ['Oseias', 'Falou de um amor que perdoa.'], ['Joel', 'Anunciou a praga dos gafanhotos.'], ['Amós', 'Era pastor antes de ser profeta.'], ['Abdias', 'Tem o livro mais curto de todos.'], ['Habacuc', 'Ficou de vigia na torre, esperando resposta.'], ['Naum', 'Anunciou a queda de Nínive.']];
    let stage = 'intro', t = 120, order = [], cur = 0, placed = new Set(), pos = P.map((_, i) => i), wind = 8, msg = '';
    const slot = (k) => [110 + (k % 6) * 130, 170 + Math.floor(k / 6) * 150, 110, 120];
    const shuffle = () => { for (let i = pos.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pos[i], pos[j]] = [pos[j], pos[i]]; } };
    return {
      enter() { A.music('depois'); order = P.map((_, i) => i).sort(() => Math.random() - 0.5); shuffle(); },
      update(dt) { if (stage !== 'play') return; t -= dt; if ((wind -= dt) <= 0) { wind = 8; shuffle(); A.sfx('hop'); msg = 'O vento trocou os pedestais de lugar!'; } if (t <= 0) { stage = 'gone'; A.lose('O tempo acabou antes dos doze profetas.'); } },
      draw() {
        A.bg('img/bg_congonhas.jpg', 3, 0.4, '#8a8a6a');
        if (!A.img('img/bg_congonhas.jpg')) { g.fillStyle = '#a8a888'; g.fillRect(0, 70, W, H); }
        pos.forEach((pi, k) => { const r = slot(k), done = placed.has(pi); g.fillStyle = '#b8b2a8'; g.fillRect(r[0] + 20, r[1] + 60, 70, 50); g.fillStyle = '#d8d2c8'; g.fillRect(r[0] + 14, r[1] + 54, 82, 10); if (done) { g.fillStyle = '#c8c2b0'; g.fillRect(r[0] + 40, r[1] + 6, 30, 50); g.fillRect(r[0] + 44, r[1] - 6, 22, 16); } txt(P[pi][0], r[0] + 55, r[1] + 114, 8, done ? '#9be36a' : '#fff', 'center'); });
        const p = order[cur];
        if (stage === 'play' && p != null) { A.box(140, 470 - 84, W - 280, 70, 0.95); txt(`O aprendiz: "${P[p][1]}"`, W / 2, 470 - 70, 10, '#fff', 'center'); txt('Qual pedestal é o dele?', W / 2, 470 - 46, 9, '#ffd84a', 'center'); }
        head(A, 'Os Doze Profetas · Congonhas', `${placed.size}/12 · o vento troca os pedestais a cada 8 s`, stage === 'play' ? t : null, 120);
        if (msg) txt(msg, W / 2, 76, 9, '#ffd84a', 'center');
        if (stage === 'intro') intro(A, 'Os Doze Profetas', ['O mestre Aleijadinho esculpiu doze profetas em pedra-sabão, já depois do auge do ouro.', 'O aprendiz dá uma pista. Toque no pedestal certo antes que o vento troque tudo de lugar.']);
        if (stage === 'lost') { A.box(220, 180, 520, 140, 0.95); txt('O tempo acabou.', W / 2, 210, 13, '#ffd84a', 'center'); txt('toque para recomeçar', W / 2, 270, 10, '#fff', 'center'); }
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage === 'lost') { stage = 'play'; t = 120; cur = 0; placed = new Set(); return; }
        if (stage !== 'play') return;
        const k = pos.findIndex((_, i) => inR(px, py, slot(i))); if (k < 0) return;
        if (pos[k] === order[cur]) { placed.add(order[cur]); cur++; A.sfx('ok'); msg = ''; if (cur >= 12) { stage = 'done'; A.say([['aprendiz', 'Os doze estão no lugar. O mestre fez isso quando o ouro já tinha ido embora.'], ['mula', 'O ouro acabou. O barroco ficou. Anota isso: é a pista do relatório final.']], () => A.win({ card: 'C67' })); } }
        else { A.sfx('bad'); t -= 3; msg = 'Esse não. -3 s'; }
      },
      key() { if (stage === 'intro') this.tap(0, 0); },
    };
  }

  // ===================== 11. A Língua dos Sinos (São João del-Rei, hoje) =====================
  function sinos(A) {
    const { g, W, H, txt } = A;
    // toques simplificados para o jogo (G = sino grande, P = sino pequeno)
    const TOQUES = [
      { id: 'festa', nome: 'Toque de festa', cena: 'Dia de festa na igreja', seq: 'PPGPPG' },
      { id: 'fogo', nome: 'Toque de fogo', cena: 'Fumaça subindo de um telhado', seq: 'GGGGGG' },
      { id: 'procissao', nome: 'Toque de procissão', cena: 'A procissão sai da matriz', seq: 'GPGPGP' },
      { id: 'homem', nome: 'Defunto: homem', cena: 'Morreu um senhor da cidade', seq: 'GGG' },
      { id: 'mulher', nome: 'Defunto: mulher', cena: 'Morreu uma senhora da cidade', seq: 'GG' },
      { id: 'crianca', nome: 'Defunto: criança', cena: 'Morreu uma criança', seq: 'P' },
    ];
    let stage = 'intro', round = 0, wins = 0, cur = null, phase = 'choose', play = [], pi = 0, pt = 0, input = '', rects = {}, swing = { G: 0, P: 0 };
    const pick = () => { cur = TOQUES[Math.floor(Math.random() * TOQUES.length)]; phase = 'choose'; input = ''; };
    const ring = (b) => { swing[b] = 1; A.sfx(b === 'G' ? 'sino' : 'sinoP'); };
    return {
      enter() { A.music(null); pick(); },
      update(dt) {
        swing.G = Math.max(0, swing.G - dt * 2); swing.P = Math.max(0, swing.P - dt * 2);
        if (phase === 'listen') { pt -= dt; if (pt <= 0) { if (pi < play.length) { ring(play[pi]); pi++; pt = 0.7; } else { phase = 'repeat'; } } }
      },
      draw() {
        A.bg('img/bg_torre.jpg', 3, 0.35, '#3a3048');
        const bell = (x, size, b) => { g.save(); g.translate(x, 150); g.rotate(Math.sin(performance.now() / 80) * 0.4 * swing[b]); g.fillStyle = '#c8a050'; g.beginPath(); g.moveTo(-size, size * 1.6); g.quadraticCurveTo(-size, 0, 0, 0); g.quadraticCurveTo(size, 0, size, size * 1.6); g.closePath(); g.fill(); g.fillStyle = '#7a5a2a'; g.fillRect(-4, size * 1.6 - 4, 8, 12); g.restore(); };
        if (A.img('img/bg_torre.jpg')) { // o fundo já tem os dois sinos pintados: só acende quando tocam
          for (const [b, x, y, r] of [['G', 240, 300, 70], ['P', 800, 250, 44]]) if (swing[b] > 0) { g.strokeStyle = `rgba(255,216,74,${swing[b]})`; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r + (1 - swing[b]) * 30, 0, 7); g.stroke(); }
          txt('GRANDE', 240, 390, 10, '#fff', 'center'); txt('pequeno', 800, 320, 10, '#fff', 'center');
        } else {
          bell(W / 2 - 160, 60, 'G'); bell(W / 2 + 160, 36, 'P');
          txt('GRANDE', W / 2 - 160, 270, 10, '#fff', 'center'); txt('pequeno', W / 2 + 160, 260, 10, '#fff', 'center');
        }
        head(A, 'A Língua dos Sinos · São João del-Rei', `Toques certos: ${wins}/5 · toques simplificados para o jogo`);
        if (stage === 'play' && cur) {
          A.box(60, 300, W - 120, 150, 0.95);
          if (phase === 'choose') { txt(`Na cidade: ${cur.cena}. Qual toque?`, W / 2, 316, 11, '#ffd84a', 'center'); rects.opts = TOQUES.map((tq, i) => btn(A, [90 + (i % 3) * 265, 344 + Math.floor(i / 3) * 52, 250, 44], tq.nome, '#e8dcb0', '#1a1030', 9)); }
          else { txt(phase === 'listen' ? 'Escute o Sineiro...' : `Repita: ${input.split('').join(' ')}`, W / 2, 330, 11, '#ffd84a', 'center'); rects.G = btn(A, [W / 2 - 300, 370, 260, 60], 'SINO GRANDE', '#c8a050'); rects.P = btn(A, [W / 2 + 40, 370, 260, 60], 'SINO PEQUENO', '#e8dcb0'); }
        }
        if (stage === 'intro') intro(A, 'A Língua dos Sinos', ['Em São João del-Rei os sinos falam, e a cidade entende.', 'Veja o que acontece na cidade, escolha o toque certo e repita as badaladas do Sineiro (G = grande, P = pequeno).', 'Cinco toques certos.']);
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage !== 'play') return;
        if (phase === 'choose') {
          const i = (rects.opts || []).findIndex((r) => inR(px, py, r)); if (i < 0) return;
          if (TOQUES[i].id !== cur.id) { A.sfx('bad'); A.say([['sineiro', `Não. ${cur.cena}: isso pede o ${cur.nome.toLowerCase()}.`]]); }
          play = cur.seq.split(''); pi = 0; pt = 0.6; phase = 'listen'; input = '';
          return;
        }
        if (phase === 'repeat') {
          const b = inR(px, py, rects.G) ? 'G' : inR(px, py, rects.P) ? 'P' : null; if (!b) return;
          ring(b); input += b;
          if (!cur.seq.startsWith(input)) { A.sfx('bad'); A.say([['sineiro', 'Errou a badalada. A cidade inteira ouviu. De novo.']]); play = cur.seq.split(''); pi = 0; pt = 0.8; phase = 'listen'; input = ''; return; }
          if (input === cur.seq) {
            wins++; A.sfx('ok');
            if (wins >= 5) { stage = 'done'; A.say([['sineiro', 'Agora você fala a língua dos sinos. E eu vou te ajudar: quando houver um relatório perto, eu toco.'], ['mula', 'Radar de igreja. O melhor prêmio do jogo, confia.']], () => A.win({ card: 'C77' })); return; }
            pick();
          }
        }
      },
      key(k) { if (stage === 'intro') this.tap(0, 0); else if (phase === 'repeat' && (k === 'g' || k === 'p')) this.tap(...(k === 'g' ? rects.G : rects.P).slice(0, 2).map((v) => v + 5)); },
    };
  }

  return { regua, escambo, carta, moenda, ponte, fogueiras, turmalina, garimpo, balanca, profetas, sinos };
})();
