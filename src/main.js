// Boot e roteamento por hash: #/ (Mirante), #/tour/T5/2, #/card/C43, #/train/mix/5…
import { loadContent, applyOverlay } from './content.js';
import { state } from './state.js';
import { tour } from './modes/tour.js';
import { timeline, card } from './modes/timeline.js';
import { codex } from './modes/codex.js';
import { train } from './modes/train.js';
import { story } from './modes/story.js';
import { quest } from './modes/quest.js';
import { colony } from './modes/colony.js';
import { map } from './modes/map.js';
import { esc, hud, unlock } from './ui.js';

const app = document.getElementById('app');
let ctx;
let leave; // limpeza do modo atual (listeners, wake lock, timers)

const ROUTES = { tour, timeline, card, codex, train, story, quest, colony, map };

// Modos ainda não construídos aparecem desativados no Mirante.
const MODES = [
  { id: 'map', icon: '🗺️', ready: true },
  { id: 'tour', icon: '🕶️', ready: true },
  { id: 'timeline', icon: '🧭', ready: true },
  { id: 'train', icon: '🧠', ready: true },
  { id: 'codex', icon: '📚', ready: true },
  { id: 'story', icon: '🤠', ready: true },
  { id: 'quest', icon: '🔎', ready: true },
  { id: 'colony', icon: '🏗️', ready: true },
];

function hub() {
  const { t, content } = ctx;
  const last = state.get('tour');
  const stop = last && content.tours[0].stops.find((s) => s.id === last.stop);
  document.body.className = 'hub';
  app.innerHTML = `
    <img class="hubimg" src="assets/img/scenes/mirante.webp" alt="">
    <h1>${esc(t['hub.title'])}</h1>
    ${hud(state, t)}
    ${stop ? `<a class="btn primary" href="#/tour/${stop.id}/${last.item}">▶ ${esc(t['hub.continue'])}<small>${stop.id} · ${esc(stop.name)}</small></a>` : ''}
    <a class="btn primary" href="#/train/mix/5">⚡ ${esc(t['hub.five'])}<small>${esc(t['hub.fiveHint'])}</small></a>
    <nav class="modes">${MODES.map((m) => m.ready
      ? `<a class="btn" href="#/${m.id}">${m.icon} ${esc(t['mode.' + m.id])}</a>`
      : `<span class="btn off">${m.icon} ${esc(t['mode.' + m.id])}<small>${esc(t['hub.soon'])}</small></span>`).join('')}
    </nav>
    <p class="foot"><button class="linkbtn" data-act="lang">${esc(t['lang.toggle'])}</button> ·
      <button class="linkbtn" data-act="export">💾 ${esc(t['backup.export'])}</button>
      <label class="linkbtn">📂 ${esc(t['backup.import'])}<input type="file" accept="application/json,.json" hidden></label>
      · <a href="debug.html">debug</a></p>`;
  // Easter egg: 7 toques no título → o relógio de sol da Matriz mostra a hora real (15° por hora).
  let taps = 0;
  app.querySelector('h1').addEventListener('click', () => {
    if (++taps < 7) return;
    taps = 0;
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    const day = h >= 6 && h <= 18;
    const hhmm = d.toTimeString().slice(0, 5);
    const marks = [-90, -60, -30, 0, 30, 60, 90].map((a) => `<line y1="34" y2="42" transform="rotate(${180 + a})"/>`).join('');
    app.querySelector('.sundial')?.remove();
    app.querySelector('h1').insertAdjacentHTML('afterend', `<div class="sundial">
      <svg viewBox="-50 -50 100 60"><path d="M-46 0A46 46 0 0 1 46 0Z"/>${marks}${day ? `<line class="shadow" y2="40" transform="rotate(${180 + (h - 12) * 15})"/>` : ''}</svg>
      <p>☀️ ${esc(t[day ? 'sun.time' : 'sun.night'])} <b>${hhmm}</b></p></div>`);
    unlock(state, content, 'sombra');
  });
  app.querySelector('[data-act="lang"]').addEventListener('click', () => { state.set('lang', state.get('lang', 'pt') === 'en' ? 'pt' : 'en'); location.reload(); });
  app.querySelector('[data-act="export"]').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([state.dump()], { type: 'application/json' }));
    a.download = `relogio-de-sol-progresso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });
  app.querySelector('input[type=file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { state.restore(await file.text()); alert(t['backup.done']); location.reload(); }
    catch (err) { alert(t['backup.fail'] + ' ' + err.message); }
  });
}

function route() {
  const [, mode, ...params] = location.hash.replace(/^#\/?/, '#/').split('/');
  leave?.();
  leave = ROUTES[mode] ? ROUTES[mode](app, ctx, params) : hub();
}

async function boot() {
  try {
    const lang = state.get('lang', 'pt');
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    const [content, t] = await Promise.all([loadContent(), fetch(`i18n/${lang}.json`).then((r) => r.json())]);
    if (lang === 'en') applyOverlay(content, await fetch('data/en.json').then((r) => r.json()));
    ctx = { content, t, esc };
    addEventListener('hashchange', route);
    // Link para a própria página (ex.: "mais 3 min" no fim da sessão) não dispara hashchange.
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (a && a.getAttribute('href') === location.hash) route();
    });
    route();
  } catch (err) {
    app.textContent = 'Erro ao carregar: ' + err.message;
  }
}

boot();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
