// Capitania (RTS-lite, Age of Empires de bolso): cada turno é uma década.
// Construa, passe a década, veja os eventos históricos. O Age Up exige acertar um quiz da era.
import { state } from '../state.js';
import { esc, markSeen, toast } from '../ui.js';
import { newGame, canBuild, build, endTurn, nextAge } from '../colony-logic.js';
import { sfx } from '../audio.js';

const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

export function colony(root, { content, t }) {
  const cfg = content.colony;
  let st = state.get('colony') || newGame(cfg);
  const B = (id) => cfg.buildings.find((b) => b.id === id);
  const img = (card) => content.byId[card]?.image;
  const save = () => state.set('colony', st);
  document.body.className = 'page';

  const res = () => `
    <div class="hud cres">${Object.entries(cfg.resources).map(([r, x]) => `<span title="${esc(x.name)}">${x.icon} ${st.res[r]}</span>`).join('')}
      <span title="${esc(t['colony.pop'])}">👥 ${st.pop}</span></div>
    <p class="cyear"><b>${st.year}</b> · ${esc(cfg.ages.find((a) => a.id === st.age).label)}
      · 👑 ${esc(t['colony.quinto'])}: ${st.quinto}${st.flags.meta ? ` · ${esc(t['colony.debt'])}: ${st.debt}` : ''}</p>`;

  function draw() {
    if (st.over) return finale();
    const counts = st.buildings.reduce((m, b) => ({ ...m, [b]: (m[b] || 0) + 1 }), {});
    const age = nextAge(st, cfg);
    root.innerHTML = `
      <div class="colony">
        <nav class="tabs"><a class="back" href="#/">←</a><b>${esc(t['mode.colony'])}</b>
          <button class="mute" data-act="reset" title="${esc(t['colony.reset'])}">↺</button></nav>
        <div class="pad">
          ${res()}
          <div class="village">${Object.entries(counts).map(([id, n]) => {
            const b = B(id);
            return `<div class="bld">${b.card && img(b.card) ? `<img src="assets/img/${img(b.card)}" alt="">` : '<div class="noimg">🏚️</div>'}
              <span>${esc(b.name)}${n > 1 ? ` ×${n}` : ''}</span></div>`;
          }).join('')}</div>
          ${age ? `<button class="btn primary" data-act="age">⬆ Age Up: ${esc(age.label)}</button>` : ''}
          <h3>${esc(t['colony.build'])}</h3>
          ${cfg.buildings.filter((b) => canBuild(st, cfg, b) !== 'age').map((b) => {
            const why = canBuild(st, cfg, b);
            const cost = Object.entries(b.cost).map(([r, v]) => `${cfg.resources[r].icon}${v}`).join(' ') || t['colony.free'];
            const prod = Object.entries(b.prod).map(([r, v]) => `+${v}${r === 'pop' ? '👥' : cfg.resources[r].icon}`).join(' ');
            return `<button class="btn opt bbtn" data-b="${b.id}" ${why ? 'disabled' : ''}>
              <span><b>${esc(b.name)}</b> <small>${cost} → ${prod || '—'}</small>
              ${b.desc ? `<small class="bdesc">${esc(b.desc)}</small>` : ''}
              ${why === 'year' ? `<small class="bdesc">${esc(t['colony.after'])} ${b.after}</small>` : ''}${why === 'max' ? `<small class="bdesc">${esc(t['colony.max'])}</small>` : ''}</span></button>`;
          }).join('')}
          <button class="btn primary next" data-act="turn">▶ ${esc(t['colony.turn'])} (${st.year} → ${st.year + cfg.turnYears})</button>
        </div>
      </div>`;
    root.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => { st = build(st, cfg, b.dataset.b); sfx.hit(); save(); draw(); }));
    root.querySelector('[data-act="turn"]').addEventListener('click', turn);
    root.querySelector('[data-act="age"]')?.addEventListener('click', () => ageUp(age));
    root.querySelector('[data-act="reset"]').addEventListener('click', () => { if (confirm(t['colony.resetAsk'])) { st = newGame(cfg); save(); draw(); } });
  }

  function turn() {
    const r = endTurn(st, cfg);
    st = r.st;
    // Irmandades: quando a Matriz existe, a vila se divide em igrejas por grupo (só observação, C48).
    const extra = [];
    if (st.buildings.includes('matriz') && !st.seen.includes('irmandades')) {
      st.seen.push('irmandades');
      extra.push({ card: 'C48', title: t['colony.irmTitle'], text: t['colony.irmText'] });
    }
    save();
    if (r.report.quinto) sfx.stamp();
    report(r.report, [...r.report.events, ...extra]);
  }

  function report(rep, events) {
    for (const e of events) markSeen(state, e.card);
    const p = rep.prod;
    root.innerHTML = `
      <div class="colony">
        <nav class="tabs"><b>${esc(t['colony.decade'])} · ${st.year}</b></nav>
        <div class="pad">
          <p class="prodline">${Object.entries(cfg.resources).map(([r, x]) => p[r] ? `${x.icon} +${p[r]}` : '').join(' ')} ${p.pop ? `👥 +${p.pop}` : ''}</p>
          ${rep.quinto ? `<p class="qline">👑 ${esc(t['colony.quintoTook'])} ${rep.quinto} 🪙 (${Math.round(rep.rate * 100)}%)</p>` : ''}
          ${rep.hunger ? `<p class="qline">🌽 ${esc(t['colony.hunger'])}</p>` : ''}
          ${events.map((e) => `
            <div class="cevent ${e.tone === 'serio' ? 'serio' : ''}">
              ${img(e.card) ? `<img src="assets/img/${img(e.card)}" alt="">` : ''}
              <div><small>${e.year || ''}</small><b>${esc(e.title)}</b><p>${esc(e.text)}</p>
              <a class="pill" href="#/card/${e.card}">${esc(content.byId[e.card].title)}</a></div></div>`).join('')}
          <button class="btn primary next" data-act="ok">${esc(t['train.continue'])} →</button>
        </div>
      </div>`;
    root.querySelector('[data-act="ok"]').addEventListener('click', draw);
    scrollTo(0, 0);
  }

  function ageUp(age) {
    const pool = content.quizzes.filter((q) => q.cardId && content.byId[q.cardId].era === age.id);
    const q = shuffle(pool)[0];
    const opts = q.type === 'multiple'
      ? shuffle(q.options.map((text, k) => ({ text, ok: k === q.answer })))
      : [{ text: t['train.fact'], ok: q.answer === 'fato' }, { text: t['train.legend'], ok: q.answer === 'lenda' }];
    root.querySelector('.pad').innerHTML = `${res()}<h3>⬆ Age Up · ${esc(age.label)}</h3><p class="q">${esc(q.prompt)}</p>
      ${opts.map((o, k) => `<button class="btn opt" data-k="${k}">${esc(o.text)}</button>`).join('')}`;
    root.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
      const ok = opts[+b.dataset.k].ok;
      if (ok) { st = { ...st, age: age.id }; save(); sfx.achievement(); toast(`⬆ ${age.label}`, 'gold'); }
      root.querySelector('.pad').innerHTML = `${res()}<p class="fbline ${ok ? 'ok' : 'no'}">${ok ? '✔' : '✘'} ${esc(q.explain)}</p>
        ${ok ? '' : `<p class="hint">${esc(t['colony.retry'])}</p>`}<button class="btn primary" data-act="back">${esc(t['train.continue'])} →</button>`;
      root.querySelector('[data-act="back"]').addEventListener('click', draw);
    }));
  }

  function finale() {
    const wealth = st.res.ouro + st.res.acucar + st.res.pau;
    root.innerHTML = `
      <div class="colony">
        <nav class="tabs"><a class="back" href="#/">←</a><b>${esc(t['colony.endTitle'])}</b></nav>
        <div class="pad solved">
          <img src="assets/img/${img('C65')}" alt="" class="sober">
          <h2>1792</h2>
          <p class="ans">${esc(t['colony.endWealth'])}: ${wealth} · 👥 ${st.pop} · 🏛 ${st.buildings.length}</p>
          <p class="qline">👑 ${esc(t['colony.endCrown'])}: ${st.quinto} 🪙${st.debt ? ` · ${esc(t['colony.debt'])}: ${st.debt}` : ''}</p>
          <p class="hookq">“You can't hang a tax, cowboy. They hanged the dentist instead.”</p>
          <p class="hint">${esc(t['colony.endNote'])}</p>
          <a class="pill" href="#/card/C65">${esc(content.byId.C65.title)}</a>
          <button class="btn primary" data-act="again">↺ ${esc(t['colony.reset'])}</button>
        </div>
      </div>`;
    root.querySelector('[data-act="again"]').addEventListener('click', () => { st = newGame(cfg); save(); draw(); });
  }

  draw();
}
