// Linha do Tempo (lista por era, busca, filtros) e a tela de um card.
import { state } from '../state.js';
import { esc, tag, norm, markSeen, worldToggle } from '../ui.js';

export function timeline(root, { content, t }) {
  const f = { q: '', onlyDoc: false, usa: false, jokes: false, wrong: false, stop: '', ...state.get('tlFilters', {}) };
  const wrong = state.get('wrong', []);
  const stops = content.tours[0].stops;
  // Texto pesquisável de cada card, calculado uma vez.
  const hay = Object.fromEntries(content.cards.map((k) =>
    [k.id, norm([k.id, k.yearLabel, k.year, k.title, k.hook, k.keyword, ...k.facts, ...k.bullets, k.usa, k.joke].join(' '))]));

  document.body.className = 'page';
  root.innerHTML = `
    <div class="tl">
      <div class="top">
        <div class="row"><a class="back" href="#/">←</a>
          <input type="search" placeholder="${esc(t['tl.search'])}" value="${esc(f.q)}" enterkeyhint="search"></div>
        <div class="chips">
          ${['onlyDoc', 'usa', 'jokes', ...(wrong.length ? ['wrong'] : [])].map((k) => `<button class="chip ${f[k] ? 'on' : ''}" data-f="${k}">${esc(t['tl.' + k])}</button>`).join('')}
          <select data-f="stop"><option value="">${esc(t['tl.allStops'])}</option>
            ${stops.map((s) => `<option value="${s.id}" ${f.stop === s.id ? 'selected' : ''}>${s.id} · ${esc(s.name)}</option>`).join('')}</select>
        </div>
        <div class="eras">${content.eras.map((e) => `<button style="background:${e.color}" data-era="${e.id}">${esc(e.ageLabel)}</button>`).join('')}</div>
      </div>
      <div class="list"></div>
    </div>`;
  const list = root.querySelector('.list');

  function draw() {
    state.set('tlFilters', f);
    const terms = norm(f.q).split(/\s+/).filter(Boolean);
    const ok = (k) => (!f.onlyDoc || k.status === 'doc') && (!f.usa || k.usa) && (!f.jokes || k.joke)
      && (!f.wrong || !wrong.length || wrong.includes(k.id))
      && (!f.stop || k.tourStops.includes(f.stop)) && terms.every((w) => hay[k.id].includes(w));
    const seen = state.get('seen', []);
    const html = content.eras.map((e) => {
      const cards = content.cards.filter((k) => k.era === e.id && ok(k));
      if (!cards.length) return '';
      return `<h2 id="era-${e.id}" style="background:${e.color}">${esc(e.ageLabel)} · ${esc(e.name)}</h2>` + cards.map((k) => `
        <a class="rowcard ${k.tone === 'serio' ? 'serio' : ''} ${seen.includes(k.id) ? 'seen' : ''}" id="row-${k.id}" href="#/card/${k.id}" style="--era:${e.color}">
          <span class="yr">${esc(k.yearLabel)}</span>
          <span class="ttl">${esc(k.title)}</span>
          <span class="mk">${k.status === 'doc' ? '' : tag(t, k.status)}${k.usa ? ' 🇺🇸' : ''}${k.joke ? ' 😂' : ''}</span>
        </a>`).join('');
    }).join('');
    list.innerHTML = html || `<p class="empty">${esc(t['tl.none'])}</p>`;
  }

  root.querySelector('input').addEventListener('input', (e) => { f.q = e.target.value; draw(); });
  root.querySelector('select').addEventListener('change', (e) => { f.stop = e.target.value; draw(); });
  root.querySelector('.top').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    const era = e.target.closest('[data-era]');
    if (chip) { f[chip.dataset.f] = !f[chip.dataset.f]; chip.classList.toggle('on'); draw(); }
    if (era) document.getElementById('era-' + era.dataset.era)?.scrollIntoView({ block: 'start' });
  });

  draw();
  // Voltando de um card, a lista reabre nele.
  const last = state.get('lastCard');
  if (last) document.getElementById('row-' + last)?.scrollIntoView({ block: 'center' });
}

export function card(root, { content, t }, [id]) {
  const k = content.byId[id];
  if (!k) { location.hash = '#/timeline'; return; }
  const era = content.eras.find((e) => e.id === k.era);
  const idx = content.cards.indexOf(k);
  const prev = content.cards[idx - 1];
  const next = content.cards[idx + 1];
  const stops = content.tours[0].stops;
  const chars = (k.characters || []).map((c) => content.characters.find((x) => x.id === c)).filter(Boolean);
  const exprs = content.expressions.filter((x) => x.card === k.id);
  // Só tem dois mundos o card que mistura causo e documento.
  const twoWorlds = k.status === 'lenda' || k.status === 'debatido' || !!k.notes;
  let world = 'doc';

  markSeen(state, k.id);
  state.set('lastCard', k.id);
  document.body.className = 'page';

  const sec = (label, body, w = '') => body ? `<section ${w && twoWorlds ? `data-w="${w}"` : ''}><h3>${esc(label)}</h3>${body}</section>` : '';
  const ul = (arr) => arr?.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';

  root.innerHTML = `
    <article class="cardpage ${k.tone === 'serio' ? 'serio' : ''} w-doc" style="--era:${era.color}">
      <nav class="cardnav">
        <a href="#/timeline">← ${esc(t['mode.timeline'])}</a>
        <span>${prev ? `<a href="#/card/${prev.id}" aria-label="anterior">‹</a>` : ''}${next ? `<a href="#/card/${next.id}" aria-label="próximo">›</a>` : ''}</span>
      </nav>
      <div class="meta">${esc(k.yearLabel)} · ${esc(era.ageLabel)} ${tag(t, k.status)} <span class="id">${k.id}</span></div>
      <h1>${esc(k.title)}</h1>
      <a class="pill test" href="#/train/card/${k.id}">${esc(t['card.test'])}</a>
      ${twoWorlds ? worldToggle(t, world) : ''}
      ${twoWorlds ? `<p class="worldlabel" data-w="lenda">${esc(t['card.told'])}</p><p class="worldlabel" data-w="doc">${esc(t['card.known'])}</p>` : ''}
      <p class="hook" ${twoWorlds ? 'data-w="lenda"' : ''}>“${esc(k.hook)}”</p>
      ${sec(t['card.facts'], ul(k.facts), 'doc')}
      ${sec(t['card.notes'], ul(k.notes), 'doc')}
      ${sec(t['card.joke'], k.joke ? `<p>${esc(k.joke)}</p>` : '', 'lenda')}
      ${sec(t['card.usa'], k.usa ? `<p><b>${esc(k.usaTitle)}</b> · ${esc(k.usa)}</p>` : '')}
      ${sec(t['card.stops'], k.tourStops.map((sid) => {
        const s = stops.find((x) => x.id === sid);
        return `<a class="pill" href="#/tour/${sid}/${s.cards.indexOf(k.id)}">${sid} · ${esc(s.name)}</a>`;
      }).join(''))}
      ${sec(t['card.chars'], chars.map((c) => `<a class="pill" href="#/codex/chars/${c.id}">${esc(c.name)}</a>`).join(''))}
      ${sec(t['card.dict'], exprs.map((x) => `<a class="pill" href="#/codex/dict/${x.id}">${esc(x.phrase)}</a>`).join(''))}
    </article>`;

  const page = root.querySelector('.cardpage');
  page.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act="world"]');
    if (!btn) return;
    world = world === 'doc' ? 'lenda' : 'doc';
    page.classList.replace(world === 'doc' ? 'w-lenda' : 'w-doc', 'w-' + world);
    btn.outerHTML = worldToggle(t, world);
  });
  scrollTo(0, 0);
}
