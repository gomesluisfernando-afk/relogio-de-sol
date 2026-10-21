// Mapa do Tempo: Buck explora uma era em turnos (dias). Toque numa casa para ver o caminho,
// toque de novo para ir. Pistas (cards) abrem o portal; duelos são quizzes; o Cobrador caça pó.
// A lógica fica em map-logic.js; aqui só tela, sons e a ponte com a economia do jogo.
import { state } from '../state.js';
import { esc, markSeen, pay, toast, shuffle } from '../ui.js';
import { sfx, music, stopMusic } from '../audio.js';
import { give } from '../economy.js';
import * as L from '../map-logic.js';

const TERR = { '=': 'estrada', b: 'ponte', v: 'campo', '.': 'campo', f: 'mata', h: 'morro', '^': 'serra', '~': 'rio' };
const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  Home: [-1, -1], PageUp: [1, -1], End: [-1, 1], PageDown: [1, 1] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const maps = {};

export function map(root, ctx, [id = 'ouro']) {
  let off = null;
  (async () => {
    try { maps[id] ||= await fetch(`data/maps/${id}.json`).then((r) => r.json()); } catch { root.textContent = 'Mapa indisponível.'; return; }
    if (off !== 'gone') off = play(root, ctx, maps[id]);
  })();
  return () => { if (typeof off === 'function') off(); off = 'gone'; stopMusic(); };
}

function play(root, { content, t }, m) {
  const lang = state.get('lang', 'pt');
  const tx = (o) => (typeof o === 'string' ? o : o?.[lang] ?? o?.pt ?? '');
  const g = L.grid(m);
  const chars = Object.fromEntries(content.characters.map((c) => [c.id, c]));
  let st = state.get('maps', {})[m.id] || L.newGame(m);
  let sel = null;   // { x, y, steps }
  let busy = false; // andando ou com janela aberta
  const save = () => state.set('maps', { ...state.get('maps', {}), [m.id]: st });
  document.body.className = 'mapmode';

  root.innerHTML = `
    <div class="advmap">
      <nav class="tabs"><a class="back" href="#/">←</a><b class="mtitle"></b><button class="mute" data-act="help">?</button></nav>
      <div class="mbar"></div>
      <div class="mview"><div class="mgrid" style="--w:${g.W}"></div></div>
      <div class="mpanel"></div>
      <div class="msheet" hidden></div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  music(m.era);

  // ---------- desenho ----------
  const nameOf = (o) => (o.card ? content.byId[o.card].title : tx(o.name) || t['map.o.' + o.type]);
  const agentAt = (x, y) => m.agents.find((a) => st.agents[a.id].x === x && st.agents[a.id].y === y);
  function token(o) {
    if (o.type === 'card' || o.type === 'item') {
      const k = content.byId[o.card];
      return `<i class="tok card ${st.done[o.id] ? 'done' : ''} ${k.tone === 'serio' ? 'serio' : ''}" style="background-image:url('assets/img/${k.image}')"></i>`;
    }
    if (o.type === 'ouro' && st.done[o.id]) return '';
    const own = o.type === 'mina' ? `own-${st.owner[o.id] || 'none'}` : '';
    const lit = o.type === 'portal' && L.portalOpen(m, st) ? 'lit' : '';
    return `<i class="tok obj tok-${o.type} ${own} ${lit}" style="background-image:url('assets/img/map/${o.type}.webp')" title="${esc(nameOf(o))}"></i>`;
  }
  function face(c, def) {
    if (!c && def?.image) return `<i class="tok who" style="background-image:url('assets/img/${def.image}');background-size:cover"></i>`;
    if (c?.image) return `<i class="tok who" style="background-image:url('assets/img/${c.image}');${c.face || 'background-size:300% auto;background-position:12% 10%'}"></i>`;
    return `<i class="tok who emo">${def?.icon || '?'}</i>`;
  }
  function draw() {
    const year = L.year(m, st);
    $('.mtitle').textContent = `${tx(m.title)} · ${year}`;
    const got = L.anchors(m, st);
    const eco = state.get('eco', {});
    $('.mbar').innerHTML = `
      <span title="${esc(t['map.day'])}">☀️ ${esc(t['map.day'])} ${st.day}</span>
      <span class="mp" title="${esc(t['map.mp'])}">🦶 <b><i style="width:${(st.mp / m.mp) * 100}%"></i></b></span>
      <span title="${esc(t['map.dust'])}">✨ ${st.dust}</span>
      <span title="${esc(t['map.gold'])}">🪙 ${eco.gold || 0}</span>
      <span title="${esc(t['map.clues'])}" class="${got >= m.goal ? 'ok' : ''}">🧭 ${got}/${m.goal}</span>`;
    const onPath = new Map((sel?.steps || []).map(([x, y], i) => [y * g.W + x, i < sel.n ? 'go' : 'far']));
    let html = '';
    for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
      const seen = L.isSeen(st, g, x, y);
      const o = seen && g.objAt(x, y);
      const ag = seen && agentAt(x, y);
      const p = onPath.get(y * g.W + x);
      const here = st.x === x && st.y === y;
      const road = (dx, dy) => '=bv'.includes(g.at(x + dx, y + dy));
      const rot = g.at(x, y) === '=' && (road(-1, 0) || road(1, 0)) && !(road(0, -1) || road(0, 1)) ? 'rot' : '';
      html += `<div class="t t-${TERR[g.at(x, y)]} ${rot} ${seen ? '' : 'fog'} ${p ? 'p-' + p : ''} ${sel && sel.x === x && sel.y === y ? 'tgt' : ''}" data-x="${x}" data-y="${y}">${o ? token(o) : ''}${ag && !here ? face(chars[ag.char], ag) : ''}${here ? face(chars.buck) : ''}</div>`;
    }
    $('.mgrid').innerHTML = html;
    panel();
  }
  function panel(msg) {
    const tgt = sel && (g.objAt(sel.x, sel.y));
    const what = sel ? (tgt && L.isSeen(st, g, sel.x, sel.y) ? nameOf(tgt) : t['map.t.' + TERR[g.at(sel.x, sel.y)]]) : '';
    const info = msg || (sel
      ? `${esc(what)} · ${sel.steps.length} ${esc(t['map.steps'])}${sel.n < sel.steps.length ? ` · ${esc(t['map.tomorrow'])}` : ''}`
      : esc(t['map.hint']));
    $('.mpanel').innerHTML = `<p class="minfo">${info}</p>
      <div class="mbtns">${sel && sel.n ? `<button class="btn primary" data-act="go">▶ ${esc(t['map.go'])}</button>` : ''}
      <button class="btn ${sel && sel.n ? '' : 'primary'}" data-act="end">☀️ ${esc(t['map.endDay'])}</button></div>`;
  }
  function center(smooth = true) {
    root.querySelector(`.t[data-x="${st.x}"][data-y="${st.y}"]`)?.scrollIntoView({ block: 'center', inline: 'center', behavior: smooth ? 'smooth' : 'auto' });
  }

  // ---------- janela (sheet) ----------
  function sheet(html, buttons, cls = '') {
    busy = true;
    const el = $('.msheet');
    el.className = 'msheet ' + cls;
    el.hidden = false;
    el.innerHTML = `<div class="mcard">${html}<div class="mbtns">${buttons.map((b, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-i="${i}">${esc(b)}</button>`).join('')}</div></div>`;
    el.querySelector('video')?.play?.().catch(() => {});
    return new Promise((res) => el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { el.hidden = true; el.innerHTML = ''; busy = false; res(+b.dataset.i); })));
  }
  function cardHtml(k, extra = '') {
    return `<img class="mimg" src="assets/img/${k.image}" alt=""><p class="date">${esc(k.yearLabel)}</p><h3>${esc(k.title)}</h3>
      <p class="hookq">“${esc(k.hook)}”</p>${k.bullets?.[0] ? `<p class="reply">• ${esc(k.bullets[0])}</p>` : ''}${extra}`;
  }

  // Duelo de saber: um quiz da plataforma. Cada pista achada nesta era elimina uma alternativa errada.
  async function duelo(def, introKey) {
    const q = content.quizzes.find((x) => x.id === shuffle(def.quizIds)[0]);
    const opts = q.type === 'multiple'
      ? shuffle(q.options.map((text, k) => ({ text, ok: k === q.answer })))
      : [{ text: t['train.fact'], ok: q.answer === 'fato' }, { text: t['train.legend'], ok: q.answer === 'lenda' }];
    const h = q.type === 'multiple' ? L.hints(m, st) : 0;
    const cut = new Set(opts.map((o, i) => (o.ok ? -1 : i)).filter((i) => i >= 0).slice(0, h));
    const who = def.char ? chars[def.char] : null;
    busy = true;
    const el = $('.msheet');
    el.className = 'msheet duel';
    el.hidden = false;
    el.innerHTML = `<div class="mcard"><div class="duelhead">${face(who, def)}<b>⚔️ ${esc(t['map.duel'])}</b>${face(chars.buck)}</div>
      <p class="reply">${esc(t[introKey])}</p>${h ? `<p class="hint">💡 ${esc(t['map.hints'].replace('{n}', h))}</p>` : ''}
      <p class="prompt">${esc(q.prompt)}</p>
      <div class="opts">${opts.map((o, i) => `<button class="btn opt ${cut.has(i) ? 'cut' : ''}" data-i="${i}" ${cut.has(i) ? 'disabled' : ''}>${esc(o.text)}</button>`).join('')}</div></div>`;
    const k = await new Promise((res) => el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => res(+b.dataset.i))));
    const ok = opts[k].ok;
    if (ok) sfx.hit(); else sfx.derrama();
    el.hidden = true; busy = false;
    await sheet(`<p class="fbline ${ok ? 'ok' : 'no'}">${ok ? '✔' : '✘'} ${esc(q.explain)}</p>`, [t['train.continue'] + ' →']);
    return ok;
  }

  // ---------- o que acontece em cada casa ----------
  async function visit(o) {
    const k = o.card && content.byId[o.card];
    if (k) markSeen(state, o.card);
    if (o.type === 'card') {
      if (st.done[o.id]) return;
      const before = L.portalOpen(m, st);
      st = L.take(m, st, o);
      sfx.hit();
      const got = `<p class="hint">🧭 ${L.anchors(m, st)}/${m.goal}${o.dust ? ` · ✨ +${o.dust}` : ''}</p>`;
      const i = await sheet(cardHtml(k, got), [t['train.continue'] + ' →', '📖 ' + t['map.openCard']], k.tone === 'serio' ? 'serio' : '');
      if (!before && L.portalOpen(m, st)) { sfx.achievement(); toast(`🌀 ${t['map.portalOn']}`, 'gold'); }
      if (i === 1) { save(); location.hash = `#/card/${o.card}`; }
      return;
    }
    if (o.type === 'item') {
      if (st.done[o.id]) return;
      st = L.take(m, st, o);
      state.set('eco', give(state.get('eco', {}), o.item));
      const it = content.items.find((i) => i.id === o.item);
      sfx.achievement();
      await sheet(cardHtml(k, `<p class="gold">🎒 ${esc(it.icon)} ${esc(it.name)}</p><p class="hint">${esc(it.desc)}</p>`), [t['train.continue'] + ' →']);
      return;
    }
    if (o.type === 'ouro') { if (!st.done[o.id]) { st = L.take(m, st, o); sfx.coin(); toast(`✨ +${o.dust} ${t['map.dust']}`, 'gold'); } return; }
    if (o.type === 'mina') {
      const owner = st.owner[o.id];
      if (owner === 'buck') return;
      if (owner) {
        const def = m.agents.find((a) => a.id === owner);
        const ok = await duelo(def, 'map.duelMine');
        st = L.duel(st, 'rival', ok, o.id);
        toast(ok ? `⛏️ ${t['map.mineWon']}` : `😮‍💨 ${t['map.tired']}`, ok ? 'gold' : '');
        return;
      }
      st = L.take(m, st, o);
      sfx.hit();
      toast(`⛏️ ${t['map.mineMine'].replace('{n}', o.income)}`, 'gold');
      return;
    }
    if (o.type === 'vila') { await sheet(cardHtml(k), [t['train.continue'] + ' →']); return; }
    if (o.type === 'fundicao') {
      if (!st.dust) { await sheet(cardHtml(k, `<p class="hint">${esc(t['map.noDust'])}</p>`), [t['train.continue'] + ' →']); return; }
      const i = await sheet(cardHtml(k, `<p class="gold">✨ ${st.dust} → 🪙</p><p class="hint">${esc(t['map.smeltHint'])}</p>`), [`🏭 ${t['map.smelt']}`, t['map.later']]);
      if (i === 0) { const r = L.smelt(st); st = r.st; pay(state, r.amount); }
      return;
    }
    if (o.type === 'registro') {
      if (!st.dust) { toast(`🚧 ${t['map.nothing']}`); return; }
      const ok = await duelo({ quizIds: o.quizIds, char: 'cobrador' }, 'map.duelRegistro');
      const r = L.registro(st, ok);
      st = r.st;
      if (!ok) { sfx.stamp(); toast(`🚧 👑 −${r.paid} ✨`, 'stamp'); }
      return;
    }
    if (o.type === 'buraco') {
      const to = m.objects.find((p) => p.id === o.to);
      st = L.reveal({ ...st, x: to.x, y: to.y }, m, to.x, to.y);
      sfx.achievement();
      toast(`🕳️ ${t['map.hole']}`, 'gold');
      draw(); center();
      return;
    }
    if (o.type === 'portal') {
      if (!L.portalOpen(m, st)) { toast(`🌀 ${t['map.portalOff'].replace('{n}', L.anchors(m, st)).replace('{g}', m.goal)}`); return; }
      const i = await sheet(`<video class="mimg" src="assets/${o.video}" autoplay muted playsinline></video><h3>🌀 ${esc(tx(o.name))}</h3><p class="reply">${esc(t['map.portalNext'])}</p>`,
        [`🤠 ${t['map.toStory']}`, t['train.continue']]);
      if (i === 0) location.hash = '#/story/cap5';
    }
  }

  // ---------- andar e terminar o dia ----------
  async function go() {
    if (!sel || busy) return;
    busy = true;
    const steps = sel.steps;
    sel = null;
    for (const s of steps) {
      const r = L.step(m, st, s);
      if (!r.moved) break;
      st = r.st;
      draw(); center();
      await sleep(120);
      if (r.obj) { busy = false; await visit(r.obj); busy = true; draw(); break; }
    }
    busy = false;
    save();
    draw();
  }
  async function endDay() {
    if (busy) return;
    busy = true;
    const eco = state.get('eco', {});
    const was = L.year(m, st);
    const r = L.endDay(m, st, { santo: (eco.items || []).includes('santo') });
    st = r.st;
    sel = null;
    draw();
    sfx.mission();
    for (const e of r.events) {
      if (e.type === 'income') toast(`⛏️ +${e.amount} ✨`, 'gold');
      if (e.type === 'claim') toast(`🏹 ${t[e.from === 'buck' ? 'map.lostMine' : 'map.rivalMine']}`);
      if (e.type === 'santo') { state.set('eco', { ...eco, items: eco.items.filter((i) => i !== 'santo') }); toast(`🗿 ${t['map.santo']}`, 'gold'); }
      if (e.type === 'duelo') {
        busy = false;
        const def = m.agents.find((a) => a.id === e.who);
        const ok = await duelo(def, 'map.duelCobrador');
        st = L.duel(st, 'cobrador', ok);
        toast(ok ? `👑 ${t['map.kept']}` : `👑 ${t['map.confisco'].replace('{n}', e.amount)}`, ok ? 'gold' : 'derrama');
        busy = true;
      }
    }
    if (L.year(m, st) > was) toast(`📅 ${L.year(m, st)}`);
    busy = false;
    save();
    draw();
  }

  // ---------- entrada ----------
  $('.mgrid').addEventListener('click', (e) => {
    const tile = e.target.closest('.t');
    if (!tile || busy) return;
    const x = +tile.dataset.x;
    const y = +tile.dataset.y;
    if (sel && sel.x === x && sel.y === y) return go();
    if (x === st.x && y === st.y) { sel = null; return draw(); }
    const steps = L.path(m, [st.x, st.y], [x, y]);
    if (!steps) { sel = null; draw(); return panel(esc(t['map.blocked'])); }
    sel = { x, y, steps, n: L.reach(m, steps, st.mp) };
    draw();
  });
  $('.mpanel').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'go') go();
    if (act === 'end') endDay();
  });
  const help = () => sheet(`<h3>${esc(tx(m.title))}</h3><p class="reply">${esc(tx(m.intro))}</p><p class="hint">${esc(t['map.help'])}</p>`, [t['map.start']]);
  $('[data-act="help"]').addEventListener('click', help);
  // PC: setas/WASD andam uma casa; Enter termina o dia.
  const onKey = (e) => {
    if (busy || e.target.closest?.('input, textarea')) return;
    if (e.key === 'Enter') { e.preventDefault(); return endDay(); }
    const d = KEYS[e.key];
    if (!d) return;
    e.preventDefault();
    const to = [st.x + d[0], st.y + d[1]];
    if (g.cost(...to) === Infinity) return;
    sel = { x: to[0], y: to[1], steps: [to], n: L.reach(m, [to], st.mp) };
    go();
  };
  document.addEventListener('keydown', onKey);

  draw();
  requestAnimationFrame(() => center(false)); // depois do layout, senão o scroll não acha a casa
  if (st.day === 1 && !Object.keys(st.done).length && st.x === m.start.x && st.y === m.start.y) help();
  return () => document.removeEventListener('keydown', onKey);
}
