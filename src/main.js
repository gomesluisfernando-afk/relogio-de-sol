// Boot e roteamento por hash: #/ (Mirante), #/tour, #/tour/T5/2.
import { loadContent } from './content.js';
import { state } from './state.js';
import { tour } from './modes/tour.js';

const app = document.getElementById('app');
let ctx;
let leave; // limpeza do modo atual (listeners, wake lock, timers)

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// Modos ainda não construídos aparecem desativados no Mirante.
const MODES = [
  { id: 'tour', icon: '🕶️', ready: true },
  { id: 'timeline', icon: '🧭' },
  { id: 'train', icon: '🧠' },
  { id: 'story', icon: '🤠' },
  { id: 'quest', icon: '🔎' },
  { id: 'colony', icon: '🏗️' },
  { id: 'codex', icon: '📚' },
];

function hub() {
  const { t, content } = ctx;
  const last = state.get('tour');
  const stop = last && content.tours[0].stops.find((s) => s.id === last.stop);
  document.body.className = 'hub';
  app.innerHTML = `
    <h1>${esc(t['hub.title'])}</h1>
    ${stop ? `<a class="btn primary" href="#/tour/${stop.id}/${last.item}">▶ ${esc(t['hub.continue'])}<small>${stop.id} · ${esc(stop.name)}</small></a>` : ''}
    <nav class="modes">${MODES.map((m) => m.ready
      ? `<a class="btn" href="#/${m.id}">${m.icon} ${esc(t['mode.' + m.id])}</a>`
      : `<span class="btn off">${m.icon} ${esc(t['mode.' + m.id])}<small>${esc(t['hub.soon'])}</small></span>`).join('')}
    </nav>
    <p class="foot"><a href="debug.html">debug</a></p>`;
}

function route() {
  const [, mode, ...params] = location.hash.replace(/^#\/?/, '#/').split('/');
  leave?.();
  leave = mode === 'tour' ? tour(app, ctx, params) : hub();
}

async function boot() {
  try {
    const [content, t] = await Promise.all([loadContent(), fetch('i18n/pt.json').then((r) => r.json())]);
    ctx = { content, t, esc };
    addEventListener('hashchange', route);
    route();
  } catch (err) {
    app.textContent = 'Erro ao carregar: ' + err.message;
  }
}

boot();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
