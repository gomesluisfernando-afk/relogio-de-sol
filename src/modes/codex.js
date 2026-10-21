// Códex: Personagens, Dicionário Mineiro e Conexões EUA.
import { state } from '../state.js';
import { esc, tag, worldToggle } from '../ui.js';

const TABS = ['chars', 'dict', 'usa', 'ach'];

export function codex(root, ctx, [tab, id]) {
  const { t } = ctx;
  if (!TABS.includes(tab)) tab = state.get('codexTab', 'usa');
  state.set('codexTab', tab);
  document.body.className = 'page';
  const body = id ? (tab === 'chars' ? charPage : exprPage)(ctx, id) : { chars: charList, dict: exprList, usa: usaGrid, ach: achList }[tab](ctx);
  root.innerHTML = `
    <div class="codex">
      <nav class="tabs"><a class="back" href="${id ? '#/codex/' + tab : '#/'}">←</a>
        ${TABS.map((x) => `<a class="${x === tab ? 'on' : ''}" href="#/codex/${x}">${esc(t['codex.tab.' + x])}</a>`).join('')}</nav>
      ${body}
    </div>`;
  // Alternar Documento × Lenda no dicionário.
  const page = root.querySelector('.cardpage');
  page?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act="world"]');
    if (!btn) return;
    const w = page.classList.contains('w-doc') ? 'lenda' : 'doc';
    page.classList.replace(w === 'doc' ? 'w-lenda' : 'w-doc', 'w-' + w);
    btn.outerHTML = worldToggle(t, w);
  });
  scrollTo(0, 0);
}

const img = (c, cls = '') => c.image
  ? `<img class="${cls}" src="assets/img/${c.image}" alt="${esc(c.name)}" loading="lazy">`
  : `<div class="${cls} noimg">${esc(c.name.replace(/^(O|A|Dona) /, '')[0])}</div>`;

function charList({ content }) {
  return `<div class="grid">${content.characters.map((c) => `
    <a class="charcard" href="#/codex/chars/${c.id}">${img(c, 'thumb')}
      <b>${esc(c.name)}</b><small>${esc(c.role)}</small></a>`).join('')}</div>`;
}

function charPage({ content, t }, id) {
  const c = content.characters.find((x) => x.id === id);
  if (!c) return '';
  const eraName = (e) => e === 'all' ? 'todas' : content.eras.find((x) => x.id === e)?.name || e;
  const cards = content.cards.filter((k) => k.characters?.includes(c.id));
  const field = (label, v) => v ? `<section><h3>${esc(label)}</h3><p>${esc(v)}</p></section>` : '';
  return `<article class="cardpage">
    ${img(c, 'sheet')}
    <div class="meta">${esc(c.kind === 'historico' ? 'Personagem histórico' : 'Personagem do jogo')}</div>
    <h1>${esc(c.name)}</h1><p class="role">${esc(c.role)}</p>
    ${c.catchphrase ? `<p class="hook">“${esc(c.catchphrase)}”</p>` : ''}
    ${field(t['codex.function'], c.function)}
    ${field(t['codex.visual'], c.visual)}
    ${field(t['codex.eras'], c.eras.map(eraName).join(', '))}
    ${cards.length ? `<section><h3>Cards</h3>${cards.map((k) => `<a class="pill" href="#/card/${k.id}">${esc(k.yearLabel)} · ${esc(k.title)}</a>`).join('')}</section>` : ''}
  </article>`;
}

function exprList({ content, t }) {
  return `<div class="exprs">${content.expressions.map((x) => `
    <a class="rowcard" href="#/codex/dict/${x.id}"><span class="ttl"><b>${esc(x.phrase)}</b><br><small>${esc(x.meaning)}</small></span><span class="mk">${tag(t, x.status)}</span></a>`).join('')}</div>`;
}

function exprPage({ content, t }, id) {
  const x = content.expressions.find((e) => e.id === id);
  if (!x) return '';
  const stop = content.tours[0].stops.find((s) => s.id === x.tourStop);
  return `<article class="cardpage w-doc">
    <div class="meta">${esc(t['codex.dict'])} ${tag(t, x.status)}</div>
    <h1>${esc(x.phrase)}</h1>
    <section><h3>${esc(t['codex.meaning'])}</h3><p>${esc(x.meaning)}</p></section>
    ${worldToggle(t, 'doc')}
    <section data-w="lenda"><h3>${esc(t['codex.legend'])}</h3><p class="hook">“${esc(x.legend)}”</p></section>
    <section data-w="doc"><h3>${esc(t['codex.reality'])}</h3><p>${esc(x.reality)}</p></section>
    ${stop ? `<section><h3>${esc(t['card.stops'])}</h3><a class="pill" href="#/tour/${stop.id}/0">${stop.id} · ${esc(stop.name)}</a></section>` : ''}
    ${x.card ? `<section><h3>Card</h3><a class="pill" href="#/card/${x.card}">${esc(content.byId[x.card].title)}</a></section>` : ''}
  </article>`;
}

function usaGrid({ content, t }) {
  const seen = state.get('seen', []);
  const collected = state.get('collected', []);
  const color = Object.fromEntries(content.eras.map((e) => [e.id, e.color]));
  const usa = content.cards.filter((k) => k.usa);
  const medal = (k) => {
    const st = collected.includes(k.id) ? 'gold' : seen.includes(k.id) ? 'silver' : 'locked';
    return `<a class="medal ${st} ${k.tone === 'serio' ? 'mem' : ''}" href="#/card/${k.id}" style="--era:${color[k.era]};${st !== 'locked' && k.image ? `background-image:url('assets/img/${k.image}')` : ''}">
      <span class="yr">${esc(k.yearLabel)}</span>
      <span class="name">${st === 'locked' ? '???' : esc(k.usaTitle)}</span>
      ${st === 'locked' ? `<small>${esc(t['codex.locked'])}</small>` : ''}</a>`;
  };
  const main = usa.filter((k) => k.tone !== 'serio');
  const mem = usa.filter((k) => k.tone === 'serio');
  const n = main.filter((k) => seen.includes(k.id) || collected.includes(k.id)).length;
  return `
    <p class="count">🇺🇸 ${n}/${main.length} ${esc(t['codex.seen'])} · <small>${esc(t['codex.collectHint'])}</small></p>
    <div class="medals">${main.map(medal).join('')}</div>
    <h2 class="memh">${esc(t['codex.memory'])}</h2><p class="count"><small>${esc(t['codex.memoryNote'])}</small></p>
    <div class="medals">${mem.map(medal).join('')}</div>`;
}

function achList({ content }) {
  const got = state.get('achievements', []);
  return `<div class="exprs">${content.achievements.map((a) => `
    <div class="rowcard ach ${got.includes(a.id) ? 'got' : ''}"><span class="yr">${got.includes(a.id) ? a.icon : '🔒'}</span>
      <span class="ttl"><b>${esc(a.title)}</b><br><small>${esc(a.desc)}</small></span></div>`).join('')}</div>`;
}
