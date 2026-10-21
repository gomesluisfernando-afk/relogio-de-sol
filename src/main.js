// Boot e roteamento por hash: #/ (Mirante), #/tour/T5/2, #/card/C43, #/train/mix/5…
import { loadContent } from './content.js';
import { state } from './state.js';
import { tour } from './modes/tour.js';
import { timeline, card } from './modes/timeline.js';
import { codex } from './modes/codex.js';
import { train } from './modes/train.js';
import { story } from './modes/story.js';
import { quest } from './modes/quest.js';
import { esc, hud } from './ui.js';

const app = document.getElementById('app');
let ctx;
let leave; // limpeza do modo atual (listeners, wake lock, timers)

const ROUTES = { tour, timeline, card, codex, train, story, quest };

// Modos ainda não construídos aparecem desativados no Mirante.
const MODES = [
  { id: 'tour', icon: '🕶️', ready: true },
  { id: 'timeline', icon: '🧭', ready: true },
  { id: 'train', icon: '🧠', ready: true },
  { id: 'codex', icon: '📚', ready: true },
  { id: 'story', icon: '🤠', ready: true },
  { id: 'quest', icon: '🔎', ready: true },
  { id: 'colony', icon: '🏗️' },
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
    <p class="foot"><a href="debug.html">debug</a></p>`;
}

function route() {
  const [, mode, ...params] = location.hash.replace(/^#\/?/, '#/').split('/');
  leave?.();
  leave = ROUTES[mode] ? ROUTES[mode](app, ctx, params) : hub();
}

async function boot() {
  try {
    const [content, t] = await Promise.all([loadContent(), fetch('i18n/pt.json').then((r) => r.json())]);
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
