// Investigação (Carmen Sandiego): o Sineiro toca o sino, você ouve testemunhas
// (cada pista é um fato de um card) e emite a Devassa: quem + quando.
// Casos sem culpado viram "Descoberta" (regra de humor: nunca tratar vítima como suspeito).
import { state } from '../state.js';
import { esc, hud, pay, collect, markSeen, unlock, toast } from '../ui.js';
import { give } from '../economy.js';
import { sfx } from '../audio.js';

export function quest(root, ctx, [id]) {
  document.body.className = 'page';
  const q = ctx.content.quests.find((x) => x.id === id);
  return q ? run(root, ctx, q) : list(root, ctx);
}

function list(root, { content, t }) {
  const solved = state.get('quests', {});
  const icon = Object.fromEntries(content.eras.map((e) => [e.id, e.iconImg]));
  root.innerHTML = `
    <div class="quests">
      <nav class="tabs"><a class="back" href="#/">←</a><b>${esc(t['mode.quest'])}</b></nav>
      <div class="pad">${hud(state, t)}
        <p class="hint">${esc(t['quest.intro'])}</p>
        ${content.quests.map((q) => `
          <a class="rowcard qrow ${solved[q.id] ? 'seen' : ''}" href="#/quest/${q.id}">
            <img class="tthumb" src="assets/img/${icon[q.era]}" alt="">
            <span class="ttl"><small class="yr">${q.kind === 'devassa' ? '🔎 ' + esc(t['quest.devassa']) : '🧭 ' + esc(t['quest.descoberta'])}</small>${esc(q.title)}</span>
            <span class="mk">${solved[q.id] ? '✔' : ''}</span>
          </a>`).join('')}
      </div>
    </div>`;
}

function run(root, { content, t }, q) {
  const chars = Object.fromEntries(content.characters.map((c) => [c.id, c]));
  const devassa = q.kind === 'devassa';
  const revealed = new Set();
  let who = null;
  let when = null;

  const face = (c) => c?.image
    ? `<div class="qface" style="background-image:url('assets/img/${c.image}');${c.face || ''}"></div>`
    : `<div class="qface noface">?</div>`;
  const shell = (body) => {
    root.innerHTML = `
      <div class="quest">
        <nav class="tabs"><a class="back" href="#/quest">←</a><b>${esc(q.title)}</b></nav>
        <div class="pad">${body}</div>
      </div>`;
    scrollTo(0, 0);
  };

  function briefing() {
    sfx.mission();
    shell(`
      <div class="line">${face(chars.sineiro)}<div><b>${esc(chars.sineiro.name)}</b>
        <p>🔔 ${esc(t['quest.bell'])}</p><p class="brief">${esc(q.brief)}</p></div></div>
      <p class="kind">${devassa ? '🔎 ' + esc(t['quest.devassaHint']) : '🧭 ' + esc(t['quest.descobertaHint'])}</p>
      <button class="btn primary" data-go="witnesses">${esc(t['quest.investigate'])} →</button>`);
    root.querySelector('[data-go]').addEventListener('click', witnesses);
  }

  function witnesses() {
    const draw = () => {
      shell(`
        <h3>${esc(t['quest.witnesses'])}</h3>
        ${q.witnesses.map((w, i) => {
          const c = chars[w.from];
          const name = c ? c.name : w.from;
          const open = revealed.has(i);
          const card = w.card && content.byId[w.card];
          return `<button class="witness ${open ? 'open' : ''}" data-i="${i}">
            ${face(c)}<span><b>${esc(name)}</b>
            ${open ? `<span class="clue">“${esc(w.text)}”</span>` : `<small>${esc(t['quest.ask'])}</small>`}</span>
            ${open && card?.image ? `<img class="cluethumb" src="assets/img/${card.image}" alt="">` : ''}</button>`;
        }).join('')}
        ${revealed.size >= 2 ? `<button class="btn primary" data-go="warrant">${esc(devassa ? t['quest.issue'] : t['quest.record'])} →</button>` : `<p class="hint">${esc(t['quest.need2'])}</p>`}`);
      root.querySelectorAll('.witness').forEach((b) => b.addEventListener('click', () => { revealed.add(+b.dataset.i); draw(); }));
      root.querySelector('[data-go]')?.addEventListener('click', () => warrant());
    };
    draw();
  }

  function warrant(msg = '') {
    shell(`
      <h3>${esc(devassa ? t['quest.devassa'] : t['quest.descoberta'])}</h3>
      ${msg ? `<p class="qmsg">${esc(msg)}</p>` : ''}
      <p class="q">${esc(devassa ? t['quest.who'] : t['quest.whoFound'])}</p>
      <div class="suspects">${q.suspects.map((s) => `
        <button class="suspect ${who === s.id ? 'on' : ''}" data-s="${s.id}">
          <img src="assets/img/${s.image}" alt=""><span>${esc(s.name)}</span></button>`).join('')}</div>
      <p class="q">${esc(t['quest.when'])}</p>
      <div class="chips wrap">${q.dates.map((d) => `<button class="chip ${when === d ? 'on' : ''}" data-d="${esc(d)}">${esc(d)}</button>`).join('')}</div>
      <button class="btn primary" data-go="submit" ${who && when ? '' : 'disabled'}>${esc(devassa ? t['quest.sign'] : t['quest.confirm'])}</button>
      <button class="btn" data-go="back">← ${esc(t['quest.witnesses'])}</button>`);
    root.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { who = b.dataset.s; warrant(msg); }));
    root.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { when = b.dataset.d; warrant(msg); }));
    root.querySelector('[data-go="back"]').addEventListener('click', witnesses);
    root.querySelector('[data-go="submit"]').addEventListener('click', () => {
      if (who !== q.answer) {
        const s = q.suspects.find((x) => x.id === who);
        who = null;
        return warrant(`${s.why} ${devassa ? t['quest.void'] : ''}`.trim());
      }
      if (when !== q.date) { when = null; return warrant(devassa ? t['quest.escaped'] : t['quest.wrongDate']); }
      solved();
    });
  }

  function solved() {
    const done = state.get('quests', {});
    const first = !done[q.id];
    state.set('quests', { ...done, [q.id]: 'solved' });
    const answer = q.suspects.find((s) => s.id === q.answer);
    const item = q.reward.item && content.items.find((i) => i.id === q.reward.item);
    const hadItem = item && (state.get('eco', {}).items || []).includes(item.id);
    if (first) pay(state, q.reward.gold);
    if (item && !hadItem) { state.set('eco', give(state.get('eco', {}), item.id)); setTimeout(() => toast(`🎒 ${t['quest.item']}: ${item.name}`, 'gold'), 700); }
    for (const id of q.cards || []) { markSeen(state, id); if (content.byId[id].usa) collect(state, id); }
    if (devassa) unlock(state, content, 'primeira-devassa');
    if (q.ach) unlock(state, content, q.ach);
    sfx.achievement();
    const next = content.quests[content.quests.indexOf(q) + 1];
    shell(`
      <div class="solved">
        <img src="assets/img/${answer.image}" alt="">
        <h2>✔ ${esc(devassa ? t['quest.closed'] : t['quest.found'])}</h2>
        <p class="ans"><b>${esc(answer.name)}</b> · ${esc(q.date)}</p>
        ${q.twist ? `<p class="hookq">“${esc(q.twist)}”</p>` : ''}
        ${first ? '' : `<p class="hint">${esc(t['quest.replay'])}</p>`}
        ${(q.cards || []).map((id) => `<a class="pill" href="#/card/${id}">${esc(content.byId[id].title)}</a>`).join('')}
      </div>
      ${next ? `<a class="btn primary" href="#/quest/${next.id}">${esc(t['quest.next'])}: ${esc(next.title)} →</a>` : ''}
      <a class="btn" href="#/quest">${esc(t['quest.all'])}</a>`);
  }

  briefing();
}
