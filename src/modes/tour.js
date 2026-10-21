// Modo Tour: a cola discreta. Uma parada por vez, uma tela por item.
// Itens de cada parada = cards + extras + a frase de transição.
import { state } from '../state.js';

const LONG_PRESS_MS = 450;
const SWIPE_PX = 50;

export function tour(root, { content, t, esc }, params) {
  const stops = content.tours[0].stops;
  const eraColor = Object.fromEntries(content.eras.map((e) => [e.id, e.color]));
  const saved = state.get('tour');
  let s = stops.findIndex((x) => x.id === (params[0] || saved?.stop));
  if (s < 0) s = 0;
  let i = params[0] ? +params[1] || 0 : saved?.item || 0;
  let stopStart = Date.now();
  let wake;

  const items = (stop) => [
    ...stop.cards.map((id) => ({ type: 'card', ...content.byId[id] })),
    ...(stop.extras || []).map((x) => ({ type: 'extra', ...x })),
    { type: 'transition' },
  ];

  document.body.className = 'tour-mode';
  root.innerHTML = `
    <div class="tour">
      <header>
        <button class="stopname" data-act="stops"></button>
        <span class="timer"></span>
        <button class="dot" data-act="black" aria-label="tela preta">●</button>
      </header>
      <div class="bar"><i></i></div>
      <main class="item"></main>
      <div class="overlay black" hidden></div>
      <div class="overlay panic" hidden></div>
      <div class="overlay sheet" hidden></div>
    </div>`;
  const $ = (sel) => root.querySelector(sel);
  const main = $('main');

  function tag(status) {
    return `<span class="tag s-${status}">${esc(t['status.' + status])}</span>`;
  }

  function jokeBlock(joke) {
    return joke ? `<div class="joke"><span class="hint">${esc(t['tour.holdJoke'])}</span><span class="txt">${esc(joke)}</span></div>` : '';
  }

  function render(it, stop) {
    if (it.type === 'card') return `
      <div class="meta">${esc(it.yearLabel)} ${tag(it.status)} <span class="id">${it.id}</span></div>
      <p class="hook">“${esc(it.hook)}”</p>
      <ul>${it.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      ${it.notes ? `<p class="note">${esc(it.notes[0])}</p>` : ''}
      ${it.tone === 'serio' ? '' : jokeBlock(it.joke)}`;
    if (it.type === 'extra') return `
      <div class="meta">${esc(it.title)} ${tag(it.status)}</div>
      <ul>${it.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      ${it.tone === 'serio' ? '' : jokeBlock(it.joke)}`;
    const next = stops[s + 1];
    return `
      <div class="meta">${next ? `${esc(t['tour.next'])}: ${next.id} · ${esc(next.name)}` : esc(t['tour.end'])}</div>
      <p class="hook">“${esc(stop.transition)}”</p>
      ${next ? `<p class="note">${esc(t['tour.swipeUp'])}</p>` : ''}`;
  }

  function draw() {
    const stop = stops[s];
    const list = items(stop);
    i = Math.min(Math.max(i, 0), list.length - 1);
    const it = list[i];
    state.set('tour', { stop: stop.id, item: i });
    history.replaceState(null, '', `#/tour/${stop.id}/${i}`);
    $('.stopname').textContent = `${stop.id} · ${stop.name} ▾`;
    $('.bar i').style.width = `${((i + 1) / list.length) * 100}%`;
    main.className = 'item' + (it.tone === 'serio' ? ' serio' : '');
    main.style.setProperty('--era', it.era ? eraColor[it.era] : '#555');
    main.innerHTML = render(it, stop) + `<div class="count">${i + 1}/${list.length}</div>`;
    tick();
  }

  function tick() {
    const min = Math.floor((Date.now() - stopStart) / 60000);
    $('.timer').textContent = `${min}/${stops[s].approxMinutes} min`;
  }

  function goStop(k, item = 0) {
    if (k < 0 || k >= stops.length) return;
    if (k !== s) stopStart = Date.now();
    s = k; i = item;
    draw();
  }
  const next = () => (i < items(stops[s]).length - 1 ? (i++, draw()) : goStop(s + 1));
  const prev = () => (i > 0 ? (i--, draw()) : s > 0 && goStop(s - 1, items(stops[s - 1]).length - 1));
  const showJoke = () => {
    const j = main.querySelector('.joke');
    if (j && !j.classList.contains('on')) { j.classList.add('on'); navigator.vibrate?.(15); }
  };

  function panic() {
    const it = items(stops[s])[i];
    const big = it.type === 'card' ? it.yearLabel : it.type === 'extra' ? it.title : stops[s + 1]?.id || '—';
    const small = it.type === 'card' ? it.keyword : it.type === 'transition' ? stops[s + 1]?.name || '' : '';
    const p = $('.panic');
    p.innerHTML = `<div class="big">${esc(big)}</div><div class="kw">${esc(small)}</div>`;
    p.hidden = false;
  }

  function sheet(withHelp) {
    const el = $('.sheet');
    el.innerHTML = `
      ${withHelp ? `<h2>${esc(t['tour.help'])}</h2><p class="help">${esc(t['tour.helpText'])}</p>` : ''}
      <h2>${esc(t['tour.stops'])}</h2>
      <ol>${stops.map((x, k) => `<li><button data-stop="${k}" class="${k === s ? 'cur' : ''}">${x.id} · ${esc(x.name)}</button></li>`).join('')}</ol>
      <p class="row"><button data-act="help">${esc(t['tour.help'])}</button><a href="#/">${esc(t['tour.home'])}</a><button data-act="close">${esc(t['tour.close'])}</button></p>`;
    el.hidden = false;
  }

  // Gestos. Toques nos overlays e botões são tratados à parte, no click.
  const ac = new AbortController();
  const on = (el, ev, fn) => el.addEventListener(ev, fn, { signal: ac.signal });
  let down = null;
  let longTimer;

  on(root, 'pointerdown', (e) => {
    if (e.target.closest('button, a, .overlay')) return;
    down = { x: e.clientX, y: e.clientY, long: false };
    longTimer = setTimeout(() => { down.long = true; showJoke(); }, LONG_PRESS_MS);
  });
  on(root, 'pointermove', (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 15) clearTimeout(longTimer);
  });
  on(root, 'pointercancel', () => { clearTimeout(longTimer); down = null; });
  on(root, 'pointerup', (e) => {
    clearTimeout(longTimer);
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    const d = down;
    down = null;
    if (Math.abs(dy) > SWIPE_PX && Math.abs(dy) > Math.abs(dx)) return dy < 0 ? goStop(s + 1) : panic();
    if (Math.abs(dx) > SWIPE_PX) return dx < 0 ? next() : prev();
    if (!d.long && Math.hypot(dx, dy) < 15) (e.clientX > innerWidth / 2 ? next : prev)();
  });
  on(root, 'contextmenu', (e) => e.preventDefault());

  on(root, 'click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const stopBtn = e.target.closest('[data-stop]');
    if (act === 'black') return ($('.black').hidden = false);
    if (act === 'stops') return sheet(false);
    if (act === 'help') return sheet(true);
    if (act === 'close') return ($('.sheet').hidden = true);
    if (stopBtn) { $('.sheet').hidden = true; return goStop(+stopBtn.dataset.stop); }
    if (e.target.closest('.black, .panic')) e.target.closest('.overlay').hidden = true;
  });

  on(window, 'keydown', (e) => {
    const k = { ArrowRight: next, ArrowLeft: prev, ArrowUp: () => goStop(s + 1), ArrowDown: panic, ' ': showJoke, b: () => ($('.black').hidden = false) }[e.key];
    if (k) { e.preventDefault(); k(); }
    if (e.key === 'Escape') root.querySelectorAll('.overlay').forEach((o) => (o.hidden = true));
  });

  // Tela sempre acesa durante o tour (onde o navegador permitir).
  const lock = async () => { try { wake = await navigator.wakeLock?.request('screen'); } catch { /* sem suporte */ } };
  on(document, 'visibilitychange', () => document.visibilityState === 'visible' && lock());
  lock();
  const timer = setInterval(tick, 30000);

  draw();
  if (!state.get('tourHelpSeen')) { state.set('tourHelpSeen', true); sheet(true); }

  return () => { ac.abort(); clearInterval(timer); wake?.release?.(); };
}
