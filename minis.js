// Minigames do Relógio de Sol v2. Cada um é uma cena: MINIS[id](api) → { enter, update, draw, tap, down, drag, up, key }.
// Regra comum: 60–120 s, toque ou setas, a mecânica ensina (não o texto), recomeço sem punição, prêmio concreto.
// api: g, W, H, txt, box, wrap, say, sfx, music, bg, dude, mula, PAL, CARD, G, win(prêmio), quit().
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
    const X0 = 140, X1 = 820, REAL = 560;
    let x = 480, stage = 'intro', t = 0, reveal = 0, q = null;
    const sa = [[230, 250], [300, 200], [380, 230], [470, 300], [560, 330], [600, 380], [580, 440], [530, 500], [470, 560], [400, 590], [330, 560], [270, 470], [230, 380]];
    function world() {
      g.fillStyle = '#e8d8a8'; g.fillRect(X0, 90, X1 - X0, 360); g.strokeStyle = '#7a5a2a'; g.lineWidth = 4; g.strokeRect(X0, 90, X1 - X0, 360);
      g.fillStyle = '#c8a868';
      g.beginPath(); g.moveTo(700, 110); g.lineTo(790, 120); g.lineTo(800, 200); g.lineTo(760, 240); g.lineTo(700, 210); g.closePath(); g.fill(); // Europa
      g.beginPath(); g.moveTo(690, 250); g.lineTo(790, 250); g.lineTo(800, 330); g.lineTo(760, 430); g.lineTo(720, 420); g.lineTo(690, 320); g.closePath(); g.fill(); // África
      g.fillStyle = '#7a5a2a'; g.fillRect(640, 328, 6, 6); txt('Cabo Verde', 650, 312, 7, '#5a3a1a');
      g.globalAlpha = reveal; g.fillStyle = '#9ab060'; g.beginPath(); sa.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.fill(); g.globalAlpha = 1;
      if (reveal < 1) { g.fillStyle = `rgba(200,190,160,${0.9 - reveal * 0.9})`; g.fillRect(X0 + 4, 94, 520, 352); txt('???', 380, 260, 20, `rgba(90,70,40,${1 - reveal})`, 'center'); }
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
        // cortesãos: Castela (esquerda) gosta da linha à direita; Portugal (direita) gosta à esquerda
        const k = (x - X0) / (X1 - X0);
        A.dude(70, 430, A.PAL.cortesao, 0, 2, 4, false); A.dude(890, 430, { ...A.PAL.cortesao, shirt: '#2a6a2a' }, 0, -1, 4, false);
        txt('Castela', 70, 450, 8, '#fff', 'center'); txt('Portugal', 890, 450, 8, '#fff', 'center');
        txt(k > 0.5 ? ':)' : ':(', 70, 300, 16, k > 0.5 ? '#9be36a' : '#ff5a5a', 'center'); txt(k < 0.5 ? ':)' : ':(', 890, 300, 16, k < 0.5 ? '#9be36a' : '#ff5a5a', 'center');
        head(A, 'A Régua dos Reis · 1494', stage === 'signed' ? 'Ninguém sabia o que havia do outro lado da linha.' : 'Arraste a linha. Depois, assine.');
        if (stage === 'play') q = btn(A, [W / 2 - 80, H - 66, 160, 44], 'ASSINAR');
        if (stage === 'intro') intro(A, 'A Régua dos Reis', ['1494. Espanha e Portugal dividem o mundo com uma linha.', 'Arraste a linha vermelha para onde quiser e assine. Não há resposta errada: ninguém sabia o que tinha do outro lado.']);
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; A.sfx('tap'); return; }
        if (stage === 'play' && inR(px, py, q)) {
          stage = 'signed'; A.sfx('sino');
          const diff = Math.abs(x - REAL), side = x > REAL ? 'mais para leste' : 'mais para oeste';
          setTimeout(() => A.say([['narr', 'A névoa se abre: atrás da linha havia um continente inteiro.'], ['mula', diff < 30 ? 'Quase em cima da linha de verdade: 370 léguas a oeste de Cabo Verde. Você tem régua no sangue.' : `A linha real ficou ${side} que a sua. E o Brasil ficou cortado por ela. Ninguém perguntou para quem morava aqui.`]], () => A.win({ card: 'C02', item: 'regua', gold: 20 })), 1600);
        }
      },
      down(px, py) { if (stage === 'play' && py > 90 && py < 450) x = Math.max(X0 + 10, Math.min(X1 - 10, px)); },
      drag(px) { if (stage === 'play') { x = Math.max(X0 + 10, Math.min(X1 - 10, px)); } },
      key(k) { if (stage === 'play') { if (k === 'ArrowLeft') x = Math.max(X0 + 10, x - 10); if (k === 'ArrowRight') x = Math.min(X1 - 10, x + 10); if (k === 'Enter') this.tap(W / 2, H - 44); } else if (stage === 'intro') this.tap(0, 0); },
    };
  }

  // ===================== 2. Escambo (feitoria, 1502) =====================
  function escambo(A) {
    const { g, W, H, txt } = A;
    const OFFERS = [['Machado', 100], ['Faca', 85], ['Miçangas', 25], ['Espelho', 10]];
    let stage = 'intro', bx = 140, tx = 140, carry = 0, logs = 0, util = [], waves = [], tw = 1.5, rects = [], msg = '', t = 0;
    const avg = () => (util.length ? Math.round(util.reduce((a, b) => a + b, 0) / util.length) : 0);
    return {
      enter() { A.music('paubrasil'); },
      update(dt) {
        t += dt;
        if (stage !== 'walk') return;
        const sp = 140 * dt, kx = (A.keys.ArrowRight || A.keys.d ? 1 : 0) - (A.keys.ArrowLeft || A.keys.a ? 1 : 0);
        if (kx) tx = bx + kx * 40;
        if (Math.abs(tx - bx) > 2) bx += Math.sign(tx - bx) * Math.min(sp, Math.abs(tx - bx));
        if (bx < 200 && carry < 3) { carry = 3; A.sfx('hop'); msg = 'Três toras nas costas. Atravesse a praia.'; }
        if (bx > 780 && carry > 0) { stage = 'offer'; A.sfx('coin'); }
        if ((tw -= dt) <= 0) { tw = 1.2 + Math.random() * 1.4; const wx = 260 + Math.random() * 460; waves.push({ x: wx, y: H, warn: 0.9 }); }
        waves = waves.filter((w) => { if (w.warn > 0) { w.warn -= dt; return true; } w.y -= 360 * dt; if (Math.abs(w.y - 360) < 14 && Math.abs(w.x - bx) < 46 && carry > 0 && !w.hit) { w.hit = 1; carry--; A.sfx('hit'); A.shake(0.2); msg = 'A onda levou uma tora!'; } return w.y > 180; });
      },
      draw() {
        g.fillStyle = '#5a8a3a'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#2f6a2a'; g.fillRect(0, 70, 200, H); for (let i = 0; i < 12; i++) { g.fillStyle = '#7a3a2a'; g.fillRect(30 + (i % 3) * 55, 120 + Math.floor(i / 3) * 90, 10, 40); g.fillStyle = '#2a5a24'; g.beginPath(); g.arc(35 + (i % 3) * 55, 120 + Math.floor(i / 3) * 90, 22, 0, 7); g.fill(); }
        g.fillStyle = '#e8d8a0'; g.fillRect(200, 70, 580, H); g.fillStyle = '#2a6fb0'; g.fillRect(200, 430, 580, H);
        g.fillStyle = '#8a5a3a'; g.fillRect(780, 70, W - 780, H); txt('FEITORIA', 870, 120, 12, '#fff', 'center');
        for (const w of waves) { if (w.warn > 0) { g.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t * 20)})`; g.fillRect(w.x - 40, 420, 80, 8); } else { g.fillStyle = 'rgba(160,210,255,.85)'; g.fillRect(w.x - 46, w.y - 10, 92, 24); g.fillStyle = '#fff'; g.fillRect(w.x - 46, w.y - 12, 92, 4); } }
        A.dude(bx, 380, A.PAL.buck, t * 14, tx > bx ? 2 : -1, 3, Math.abs(tx - bx) > 2);
        for (let i = 0; i < carry; i++) { g.fillStyle = '#9a3a22'; g.fillRect(bx - 20, 300 - i * 9, 40, 8); }
        head(A, 'Escambo · 1502', `Toras entregues: ${logs}/12 · Utilidade média: ${avg()}%`);
        if (msg) A.txt(msg, W / 2, 80, 10, '#fff', 'center');
        // medidor de utilidade
        g.fillStyle = '#0a1040'; g.fillRect(W / 2 - 150, 460, 300, 14); g.fillStyle = avg() >= 70 ? '#9be36a' : '#ffb04a'; g.fillRect(W / 2 - 150, 460, 3 * avg(), 14); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(W / 2 - 150, 460, 300, 14); g.fillStyle = '#fff'; g.fillRect(W / 2 - 150 + 210, 456, 2, 22);
        if (stage === 'offer') {
          A.box(220, 150, 520, 260, 0.96); A.txt(`O português oferece, por ${carry} toras:`, W / 2, 175, 11, '#ffd84a', 'center');
          rects = OFFERS.map(([l], i) => btn(A, [250 + (i % 2) * 240, 210 + Math.floor(i / 2) * 80, 220, 60], l, '#e8dcb0', '#1a1030', 12));
        }
        if (stage === 'intro') intro(A, 'Escambo', ['Busque toras de pau-brasil na mata (esquerda) e leve até a feitoria (direita).', 'As ondas levam toras. Escolha bem o que aceitar em troca: o medidor só sobe com o que serve para quem derruba árvore com pedra.', 'Meta: 12 toras com utilidade de 70% ou mais.']);
        quitBtn(A);
      },
      tap(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'walk'; return; }
        if (stage === 'walk') { tx = Math.max(60, Math.min(W - 60, px)); return; }
        if (stage === 'offer') {
          const i = rects.findIndex((r) => inR(px, py, r)); if (i < 0) return;
          logs += carry; for (let k = 0; k < carry; k++) util.push(OFFERS[i][1]); carry = 0; A.sfx(OFFERS[i][1] > 50 ? 'ok' : 'tap');
          msg = OFFERS[i][1] > 50 ? `${OFFERS[i][0]}: isso muda a vida de quem corta árvore.` : `${OFFERS[i][0]}: bonito, mas não corta nada.`;
          if (logs >= 12 && avg() >= 70) { stage = 'done'; A.say([['caramuru', 'Agora você entendeu. O valor de uma coisa depende de quem precisa dela.'], ['mula', 'Machado de ferro para quem só tinha pedra: isso valia uma floresta. Literalmente.']], () => A.win({ card: 'C06', item: 'machado', gold: 25 })); return; }
          if (logs >= 12) msg = 'Muitas toras, pouca utilidade. Continue trocando melhor.';
          stage = 'walk'; tx = 140;
        }
      },
      key(k) { if (stage === 'intro') this.tap(0, 0); else if (stage === 'offer' && '1234'.includes(k)) this.tap(...rects[+k - 1].slice(0, 2).map((v) => v + 5)); },
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
            if (ok) { stage = 'done'; A.say([['caminha', 'Senhor, posto que o capitão-mor e os outros capitães escrevam... eu também escrevo. E nesta ordem.'], ['mula', 'A primeira notícia do Brasil foi uma carta. E já tinha propaganda imobiliária no final.']], () => A.win({ card: 'C05', gold: 15 })); }
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
      enter() { A.music('tambor'); },
      update(dt) {
        if (stage !== 'play') return;
        t += dt; rot += dt * 3;
        if (t > next + WIN) { if (!hit) { jams++; streak++; flash = 0.4; A.sfx('hit'); A.shake(0.15); } hit = false; next += BEAT; }
        if (streak >= 3) { streak = 0; t = 0; next = BEAT; A.sfx('bad'); jams = 0; }
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
        if (stage === 'intro') intro(A, 'A Moenda', ['Toque no ritmo para empurrar a cana entre os cilindros.', 'Três entaladas seguidas e o ciclo recomeça.', 'Aguente 90 segundos.']);
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
      update(dt) { if (stage === 'play') { t -= dt; if (t <= 0) { stage = 'lost'; A.sfx('bad'); } } },
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
        if (n === 12) { stage = 'done'; A.say([['nassau', 'Uma ponte! Invasores também constroem, forasteiro. Recife ganhou ponte, observatório e pintores.'], ['mula', 'Ninguém conta essa parte na escola. Agora o relatório conta.']], () => A.win({ card: 'C22', gold: 25 })); return; }
        deal();
      },
      key() { if (stage === 'intro') this.tap(0, 0); },
    };
  }

  // ===================== 6. Fogueiras de Palmares (1694) — tom sério =====================
  function fogueiras(A) {
    const { g, W, H, txt } = A;
    const HILLS = [[180, 170], [780, 170], [780, 400], [180, 400]];
    let stage = 'intro', lit = 0, prog = 0, hold = -1, holdT = 0;
    return {
      enter() { A.music('palmares'); },
      update(dt) {
        if (stage !== 'play') return;
        prog += dt * (0.022 + lit * 0.006);
        if (hold === lit && hold < 4) { holdT += dt; if (holdT >= 2) { lit++; hold = -1; holdT = 0; A.sfx('ok'); } }
        if (lit >= 4) { stage = 'won'; A.sfx('sino'); }
        else if (prog >= 1) { stage = 'lost'; A.sfx('bad'); }
      },
      draw() {
        g.fillStyle = '#2a4a2a'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#3a6a3a'; HILLS.forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 90, y + 60); g.lineTo(x, y - 50); g.lineTo(x + 90, y + 60); g.fill(); });
        g.strokeStyle = '#7a5532'; g.lineWidth = 8; g.strokeRect(W / 2 - 90, 230, 180, 120); txt('mocambo', W / 2, 284, 9, '#fff', 'center');
        HILLS.forEach(([x, y], i) => { const on = i < lit, me = i === lit; g.fillStyle = '#5a3a1a'; g.fillRect(x - 12, y - 30, 24, 10); if (on) { for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#ffd84a' : '#ff7a2a'; g.fillRect(x - 10 + (k * 7) % 20, y - 44 - (k * 5) % 16, 8, 14); } } if (me && stage === 'play') { g.strokeStyle = '#ffd84a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 30, 30, 0, 7); g.stroke(); if (hold === i) { g.fillStyle = '#ffd84a'; g.fillRect(x - 30, y + 10, 60 * (holdT / 2), 8); } } txt(String(i + 1), x, y + 22, 10, '#fff', 'center'); });
        // trilha do bandeirante, de baixo até a paliçada
        g.strokeStyle = '#a8875a'; g.lineWidth = 6; g.beginPath(); g.moveTo(W / 2, H - 20); g.lineTo(W / 2, 350); g.stroke();
        g.fillStyle = '#d33'; g.beginPath(); g.arc(W / 2, H - 20 - prog * (H - 370), 9, 0, 7); g.fill();
        head(A, 'Fogueiras de Palmares · 1694', 'Segure o dedo na fogueira marcada por 2 s. Avise o mocambo antes que ele chegue.');
        if (stage === 'intro') intro(A, 'Fogueiras de Palmares', ['Um bandeirante sobe a trilha.', 'Acenda as 4 fogueiras, em ordem, segurando o toque por 2 segundos. Quando a rede de vigias acende, o mocambo inteiro fica sabendo.', 'Não é luta: é avisar a tempo.']);
        if (stage === 'lost') { g.fillStyle = 'rgba(0,0,0,.8)'; g.fillRect(0, 0, W, H); txt('toque para recomeçar', W / 2, H / 2, 10, '#888', 'center'); }
        if (stage === 'won') { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H); txt('As quatro fogueiras estão acesas.', W / 2, 220, 14, '#ffd84a', 'center'); txt('toque para continuar', W / 2, 300, 10, '#ddd', 'center'); }
        quitBtn(A);
      },
      down(px, py) {
        if (inR(px, py, [W - 110, H - 46, 96, 34])) return A.quit();
        if (stage === 'intro') { stage = 'play'; return; }
        if (stage === 'lost') { stage = 'play'; lit = 0; prog = 0; return; }
        if (stage === 'won') { stage = 'done'; A.say([['vigia', 'O mocambo foi avisado. Organização é o que mantém Palmares de pé há tanto tempo.']], () => A.win({ card: 'C27', serio: true })); return; }
        if (stage !== 'play') return;
        const [x, y] = HILLS[lit] || []; if (x != null && Math.hypot(px - x, py - (y - 30)) < 50) { hold = lit; holdT = 0; }
      },
      up() { hold = -1; holdT = 0; },
      key(k) { if (stage === 'intro') return this.down(0, 0); if (k === ' ') { hold = lit; } },
      keyup(k) { if (k === ' ') { hold = -1; holdT = 0; } },
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
        if (right >= 8) { stage = 'done'; A.say([['fernao', `...${right} de 10. Então eram... turmalinas? Sete anos no mato por pedra verde comum?`], ['mula', 'Fernão Dias morreu achando que tinha esmeraldas. A corrida do ouro nasceu de uma busca errada.']], () => A.win({ card: 'C29', item: 'turmalina', gold: 15 })); }
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
      enter() { A.music('ouro'); },
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
        if (stage === 'end') { if (got >= 15) { stage = 'done'; A.say([['mula', `${got} de pó na mochila. Agora corre para a Casa de Fundição antes que o Cobrador de verdade te veja.`]], () => A.win({ dust: got })); } else { stage = 'play'; t = 60; got = 0; nug = []; } return; }
        if (stage === 'play') { P.tx = px; P.ty = py; }
      },
      key() { if (stage === 'intro' || stage === 'end') this.tap(0, 0); },
    };
  }

  // ===================== 9. A Balança do Quinto (Casa de Fundição, 1725) =====================
  function balanca(A) {
    const { g, W, H, txt } = A;
    let stage = 'intro', dust = 0, put = [], streak = 0, rects = {}, msg = '';
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
        if (stage === 'intro') intro(A, 'A Balança do Quinto', ['Só barra com o selo do rei podia circular. Pó de ouro era crime.', 'Ponha pesos no outro prato até dar exatamente 20% do pó: o Quinto da Coroa.', 'Três fundições certas seguidas.']);
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
          if (s === target) { streak++; A.sfx('coin'); msg = `Barra com o selo real! ${dust} de pó, ${target} para a Coroa.`; if (streak >= 3) { stage = 'done'; const n = A.G.dust; A.G.dust = 0; A.G.gold += n; A.save(); A.say([['fundidor', 'Três barras certinhas. A Coroa não tem do que reclamar.'], ['cobrador', 'Hmpf. Por hoje.'], ['mula', n ? `E todo o seu pó (${n}) virou ouro selado.` : 'Viu? 20% de qualquer coisa: a Coroa sempre sabia fazer essa conta.']], () => A.win({ card: 'C43', gold: 30 })); return; } }
          else if (s < target) { streak = 0; A.sfx('bad'); msg = ''; A.say([['cobrador', `Sonegação! O Quinto de ${dust} é ${target}. Você separou ${s}.`]]); }
          else { streak = 0; A.sfx('bad'); msg = ''; A.say([['cobrador', `A Coroa agradece os ${s - target} a mais. Era ${target}.`]]); }
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
      update(dt) { if (stage !== 'play') return; t -= dt; if ((wind -= dt) <= 0) { wind = 8; shuffle(); A.sfx('hop'); msg = 'O vento trocou os pedestais de lugar!'; } if (t <= 0) { stage = 'lost'; A.sfx('bad'); } },
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
        if (pos[k] === order[cur]) { placed.add(order[cur]); cur++; A.sfx('ok'); msg = ''; if (cur >= 12) { stage = 'done'; A.say([['aprendiz', 'Os doze estão no lugar. O mestre fez isso quando o ouro já tinha ido embora.'], ['mula', 'O ouro acabou. O barroco ficou. Anota isso: é a pista do relatório final.']], () => A.win({ card: 'C67', gold: 30 })); } }
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
        bell(W / 2 - 160, 60, 'G'); bell(W / 2 + 160, 36, 'P');
        txt('GRANDE', W / 2 - 160, 270, 10, '#fff', 'center'); txt('pequeno', W / 2 + 160, 260, 10, '#fff', 'center');
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
            if (wins >= 5) { stage = 'done'; A.say([['sineiro', 'Agora você fala a língua dos sinos. E eu vou te ajudar: quando houver um relatório perto, eu toco.'], ['mula', 'Radar de igreja. O melhor prêmio do jogo, confia.']], () => A.win({ card: 'C77', gold: 40 })); return; }
            pick();
          }
        }
      },
      key(k) { if (stage === 'intro') this.tap(0, 0); else if (phase === 'repeat' && (k === 'g' || k === 'p')) this.tap(...(k === 'g' ? rects.G : rects.P).slice(0, 2).map((v) => v + 5)); },
    };
  }

  return { regua, escambo, carta, moenda, ponte, fogueiras, turmalina, garimpo, balanca, profetas, sinos };
})();
