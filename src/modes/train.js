// Treino de Memória: sessões curtas (3 ou 5 min) com 6 tipos de exercício.
// A repetição espaçada (Leitner) decide qual card volta. Acertou um card com
// ponte EUA → a medalha vira ouro no Códex. Errou → entra em "os que errei".
import { state } from '../state.js';
import { esc, tag, unlock, pay, missed, hit, hud } from '../ui.js';
import { grade, pick } from '../leitner.js';
import { sfx, speak } from '../audio.js';

const TYPES = ['pic', 'multiple', 'fol', 'first', 'flash', 'hook', 'order'];
const MIX_WEIGHT = { pic: 3, multiple: 3, fol: 2, first: 2, flash: 2, hook: 2, order: 1 };

const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

export function train(root, ctx, [kind, arg]) {
  document.body.className = 'page';
  if (!kind) return menu(root, ctx);
  if (kind === 'card') return session(root, ctx, { types: ['pic', 'flash', 'hook', 'multiple', 'fol'], pool: [arg], max: 3, minutes: 30, back: `#/card/${arg}` });
  if (kind === 'wrong') return session(root, ctx, { types: TYPES, pool: state.get('wrong', []), minutes: +arg || 3 });
  if (kind === 'mix') return session(root, ctx, { types: TYPES, minutes: +arg || 5 });
  if (TYPES.includes(kind)) return session(root, ctx, { types: [kind], minutes: +arg || 3 });
  location.hash = '#/train';
}

function menu(root, { content, t }) {
  const boxes = state.get('leitner', {});
  const counts = [0, 0, 0, 0, 0, 0]; // 0 = nunca treinado
  for (const k of content.cards) counts[boxes[k.id]?.box || 0]++;
  const wrong = state.get('wrong', []).length;
  const streak = state.get('streak');
  const muted = state.get('muted', false);
  root.innerHTML = `
    <div class="train">
      <nav class="tabs"><a class="back" href="#/">←</a><b>${esc(t['mode.train'])}</b>
        <button class="mute" data-act="mute">${muted ? '🔇' : '🔔'}</button></nav>
      <div class="pad">
        ${hud(state, t)}
        ${streak ? `<p class="streak">🔥 ${streak.days} ${esc(t[streak.days === 1 ? 'train.day' : 'train.days'])}</p>` : ''}
        <a class="btn primary" href="#/train/mix/3">⚡ ${esc(t['train.mix3'])}</a>
        <a class="btn primary" href="#/train/mix/5">⚡ ${esc(t['train.mix5'])}</a>
        ${wrong ? `<a class="btn" href="#/train/wrong/3">✘ ${esc(t['train.wrong'])} (${wrong})</a>` : ''}
        <h3>${esc(t['train.pick'])}</h3>
        ${TYPES.map((x) => `<a class="btn" href="#/train/${x}/3">${esc(t['train.t.' + x])}<small>${esc(t['train.d.' + x])}</small></a>`).join('')}
        <h3>${esc(t['train.boxes'])}</h3>
        <div class="boxes">${counts.map((n, b) => `<div><i style="height:${Math.max(4, (n / content.cards.length) * 75)}%"></i><span>${n}</span><small>${b ? 'cx ' + b : 'novo'}</small></div>`).join('')}</div>
        <p class="hint">${esc(t['train.boxesHint'])}</p>
      </div>
    </div>`;
  root.querySelector('[data-act="mute"]').addEventListener('click', (e) => {
    state.set('muted', !state.get('muted', false));
    e.currentTarget.textContent = state.get('muted') ? '🔇' : '🔔';
  });
}

function session(root, { content, t }, opt) {
  const sessionNo = state.get('trainSessions', 0) + 1;
  state.set('trainSessions', sessionNo);
  const boxes = state.get('leitner', {});
  const color = Object.fromEntries(content.eras.map((e) => [e.id, e.color]));
  const datable = content.cards.filter((k) => k.yearLabel !== '?');
  const inPool = (key) => !opt.pool || opt.pool.includes(key);
  const qKey = (q) => q.cardId || q.exprId;
  const s = { start: Date.now(), ok: 0, bad: 0, n: 0, gold: [], lastType: null };
  const ms = opt.minutes * 60000;

  root.innerHTML = `
    <div class="train run">
      <nav class="tabs"><a class="back" href="${opt.back || '#/train'}">✕</a>
        <div class="tbar"><i></i></div><span class="score">✔ 0 · ✘ 0</span></nav>
      <div class="ex pad"></div>
    </div>`;
  const ex = root.querySelector('.ex');
  const timer = setInterval(() => {
    const p = Math.min(1, (Date.now() - s.start) / ms);
    root.querySelector('.tbar i').style.width = `${p * 100}%`;
  }, 500);

  // ---- registro de acertos ----
  function record(results) {
    const wrong = new Set(state.get('wrong', []));
    const collected = new Set(state.get('collected', []));
    let quiet = false;
    for (const { key, ok } of results) {
      boxes[key] = grade(boxes[key], ok, sessionNo);
      const card = content.byId[key];
      if (card?.tone === 'serio') quiet = true;
      if (!ok) { wrong.add(key); continue; }
      wrong.delete(key);
      if (key === 'C61') unlock(state, content, 'dez-dias');
      if (key === 'C59') unlock(state, content, 'jefferson');
      if (card?.usa && !collected.has(key)) { collected.add(key); if (card.tone !== 'serio') s.gold.push(card); }
    }
    state.set('leitner', boxes);
    state.set('wrong', [...wrong]);
    state.set('collected', [...collected]);
    const allOk = results.every((r) => r.ok);
    allOk ? s.ok++ : s.bad++;
    // Ouro só para acerto em card não-sério (card sério dá memória, não dá ouro).
    if (allOk) { hit(state); if (!quiet) pay(state, 10); } else missed(state, content);
    s.n++;
    root.querySelector('.score').textContent = `✔ ${s.ok} · ✘ ${s.bad}`;
    if (allOk && !quiet) sfx.hit();
    return allOk;
  }

  function feedback(ok, html, newGold) {
    ex.innerHTML = `
      <div class="fb ${ok ? 'ok' : 'no'}">${ok ? '✔' : '✘'}</div>
      ${html}
      ${newGold.map((k) => `<p class="gold">🇺🇸 ${esc(t['train.collected'])}: <b>${esc(k.usaTitle)}</b></p>`).join('')}
      <button class="btn primary next">${esc(t['train.continue'])} →</button>`;
    if (newGold.length) setTimeout(sfx.achievement, 350);
    ex.querySelector('.next').addEventListener('click', next);
  }

  function finishWith(results, html) {
    const before = s.gold.length;
    const ok = record(results);
    feedback(ok, html, s.gold.slice(before));
  }

  const head = (k) => `<div class="meta" style="--era:${color[k.era]}">${esc(content.eras.find((e) => e.id === k.era).ageLabel)} ${k.status !== 'doc' ? tag(t, k.status) : ''}</div>`;
  const thumb = (k) => (k.image ? `<img class="othumb" src="assets/img/${k.image}" alt="">` : '');
  const answerLine = (k) => `<p class="ans"><b>${esc(k.yearLabel)}</b> · ${esc(k.title)}</p>`;

  // ---- exercícios: cada um devolve false se não tem material ----
  const make = {
    // Só a imagem: qual é o card? (memória visual, pensado para afantasia)
    pic() {
      const withImg = datable.filter((k) => k.image);
      const key = pick(withImg.map((k) => k.id).filter(inPool), boxes, sessionNo);
      if (!key) return false;
      const k = content.byId[key];
      const others = shuffle(withImg.filter((x) => x.id !== key && x.image !== k.image)).slice(0, 3);
      const opts = shuffle([k, ...others]);
      ex.innerHTML = `<p class="q">${esc(t['train.t.pic'])}</p><img class="exImg" src="assets/img/${k.image}" alt="">
        ${opts.map((o, i) => `<button class="btn opt" data-i="${i}">${esc(o.title)}</button>`).join('')}`;
      ex.querySelectorAll('.opt').forEach((el) => el.addEventListener('click', () => {
        const ok = opts[+el.dataset.i] === k;
        finishWith([{ key, ok }], `<img class="exImg small" src="assets/img/${k.image}" alt="">${answerLine(k)}<p class="hookq">“${esc(k.hook)}”</p>`);
      }));
      return true;
    },

    flash() {
      const key = pick(datable.map((k) => k.id).filter(inPool), boxes, sessionNo);
      if (!key) return false;
      const k = content.byId[key];
      ex.innerHTML = `${head(k)}${k.image ? `<img class="exImg" src="assets/img/${k.image}" alt="">` : ''}<h2 class="big">${esc(k.title)}</h2>
        <p class="hint">${esc(t['train.flashAsk'])}</p><button class="btn primary show">${esc(t['train.show'])}</button>`;
      ex.querySelector('.show').addEventListener('click', () => {
        ex.innerHTML = `${head(k)}<h2 class="big">${esc(k.yearLabel)}</h2><p class="hookq">“${esc(k.hook)}”</p>
          <ul>${k.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
          <div class="two"><button class="btn no">✘ ${esc(t['train.didnt'])}</button><button class="btn yes">✔ ${esc(t['train.knew'])}</button></div>`;
        ex.querySelector('.no').addEventListener('click', () => { record([{ key, ok: false }]); next(); });
        ex.querySelector('.yes').addEventListener('click', () => { record([{ key, ok: true }]); next(); });
      });
      return true;
    },

    hook() {
      const key = pick(content.cards.filter((k) => k.hook.split(' ').length >= 8).map((k) => k.id).filter(inPool), boxes, sessionNo);
      if (!key) return false;
      const k = content.byId[key];
      const words = k.hook.split(' ');
      const cut = Math.ceil(words.length * 0.4);
      ex.innerHTML = `${head(k)}<p class="q">${esc(t['train.t.hook'])}</p><p class="hint">${esc(k.title)}</p>
        <p class="hookq">“${esc(words.slice(0, cut).join(' '))} …”</p>
        <p class="hint">${esc(t['train.sayIt'])}</p><button class="btn primary show">${esc(t['train.show'])}</button>`;
      ex.querySelector('.show').addEventListener('click', () => {
        speak(k.hook);
        ex.innerHTML = `${head(k)}<p class="hookq">“${esc(k.hook)}”</p>
          <div class="two"><button class="btn no">✘ ${esc(t['train.didnt'])}</button><button class="btn yes">✔ ${esc(t['train.knew'])}</button></div>`;
        ex.querySelector('.no').addEventListener('click', () => { record([{ key, ok: false }]); next(); });
        ex.querySelector('.yes').addEventListener('click', () => { record([{ key, ok: true }]); next(); });
      });
      return true;
    },

    first() {
      const key = pick(datable.map((k) => k.id).filter(inPool), boxes, sessionNo);
      if (!key) return false;
      const a = content.byId[key];
      const b = rnd(datable.filter((k) => k.year !== a.year));
      const pair = shuffle([a, b]);
      ex.innerHTML = `<p class="q">${esc(t['train.t.first'])}</p>
        ${pair.map((k, i) => `<button class="btn opt img" data-i="${i}" style="border-left:4px solid ${color[k.era]}">${thumb(k)}<span>${esc(k.title)}</span></button>`).join('')}`;
      ex.querySelectorAll('.opt').forEach((el) => el.addEventListener('click', () => {
        const chosen = pair[+el.dataset.i];
        const ok = chosen.year === Math.min(a.year, b.year);
        const sorted = [a, b].sort((x, y) => x.year - y.year);
        finishWith([{ key: a.id, ok }, { key: b.id, ok }], sorted.map(answerLine).join(''));
      }));
      return true;
    },

    order() {
      const key = pick(datable.map((k) => k.id).filter(inPool), boxes, sessionNo);
      if (!key) return false;
      const years = new Set();
      const set = [content.byId[key]];
      years.add(set[0].year);
      for (const k of shuffle(datable)) {
        if (set.length === 5) break;
        if (!years.has(k.year)) { years.add(k.year); set.push(k); }
      }
      const shown = shuffle(set);
      const chosen = [];
      const draw = () => {
        ex.innerHTML = `<p class="q">${esc(t['train.t.order'])}</p><p class="hint">${esc(t['train.orderHint'])}</p>
          ${shown.map((k, i) => {
            const pos = chosen.indexOf(i);
            return `<button class="btn opt img ${pos >= 0 ? 'picked' : ''}" data-i="${i}" style="border-left:4px solid ${color[k.era]}">${thumb(k)}<span>${pos >= 0 ? `<b>${pos + 1}.</b> ` : ''}${esc(k.title)}</span></button>`;
          }).join('')}
          ${chosen.length ? `<button class="btn reset">↺ ${esc(t['train.reset'])}</button>` : ''}`;
        ex.querySelector('.reset')?.addEventListener('click', () => { chosen.length = 0; draw(); });
        ex.querySelectorAll('.opt').forEach((el) => el.addEventListener('click', () => {
          const i = +el.dataset.i;
          if (chosen.includes(i)) return;
          chosen.push(i);
          if (chosen.length < shown.length) return draw();
          const right = [...set].sort((x, y) => x.year - y.year);
          const results = chosen.map((idx, pos) => ({ key: shown[idx].id, ok: right[pos] === shown[idx] }));
          finishWith(results, right.map((k, pos) => `<p class="ans ${results[pos].ok ? '' : 'miss'}"><b>${pos + 1}. ${esc(k.yearLabel)}</b> · ${esc(k.title)}</p>`).join(''));
        }));
      };
      draw();
      return true;
    },

    multiple() {
      const qs = content.quizzes.filter((q) => q.type === 'multiple' && inPool(qKey(q)));
      const key = pick([...new Set(qs.map(qKey))], boxes, sessionNo);
      if (!key) return false;
      const q = rnd(qs.filter((x) => qKey(x) === key));
      const opts = shuffle(q.options.map((text, i) => ({ text, right: i === q.answer })));
      ex.innerHTML = `<p class="q">${esc(q.prompt)}</p>
        ${opts.map((o, i) => `<button class="btn opt" data-i="${i}">${esc(o.text)}</button>`).join('')}`;
      ex.querySelectorAll('.opt').forEach((el) => el.addEventListener('click', () => {
        const ok = opts[+el.dataset.i].right;
        finishWith([{ key, ok }], `<p class="ans"><b>${esc(q.options[q.answer])}</b></p><p class="explain">${esc(q.explain)}</p>`);
      }));
      return true;
    },

    fol() {
      const qs = content.quizzes.filter((q) => q.type === 'factOrLegend' && inPool(qKey(q)));
      const key = pick([...new Set(qs.map(qKey))], boxes, sessionNo);
      if (!key) return false;
      const q = rnd(qs.filter((x) => qKey(x) === key));
      ex.innerHTML = `<p class="q">${esc(t['train.t.fol'])}</p><div class="stmt">${esc(q.prompt)}</div>
        <p class="hint">${esc(t['train.folHint'])}</p>
        <div class="two"><button class="btn leg" data-a="lenda">← ${esc(t['train.legend'])}</button><button class="btn fact" data-a="fato">${esc(t['train.fact'])} →</button></div>`;
      const answer = (a) => finishWith([{ key, ok: a === q.answer }],
        `<p class="ans"><b>${esc(q.answer === 'fato' ? t['train.fact'] : t['train.legend'])}</b></p><p class="explain">${esc(q.explain)}</p>`);
      ex.querySelectorAll('[data-a]').forEach((el) => el.addEventListener('click', () => answer(el.dataset.a)));
      // Deslizar o cartão: esquerda = lenda, direita = fato.
      const card = ex.querySelector('.stmt');
      let x0 = null;
      card.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
      card.addEventListener('pointerup', (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 60) answer(dx < 0 ? 'lenda' : 'fato');
      });
      return true;
    },
  };

  function next() {
    if (Date.now() - s.start >= ms || (opt.max && s.n >= opt.max)) return finish();
    // Sorteia o tipo (com peso no modo misto), evitando repetir o anterior quando dá.
    let bag = opt.types.flatMap((x) => Array(opt.types.length > 1 ? MIX_WEIGHT[x] : 1).fill(x));
    if (opt.types.length > 1) bag = bag.filter((x) => x !== s.lastType);
    for (const type of shuffle(bag)) {
      if (make[type]()) { s.lastType = type; scrollTo(0, 0); return; }
    }
    finish();
  }

  function finish() {
    clearInterval(timer);
    const day = (d) => d.toLocaleDateString('sv'); // AAAA-MM-DD no fuso do celular
    const today = day(new Date());
    const yesterday = day(new Date(Date.now() - 864e5));
    const st = state.get('streak', { last: null, days: 0 });
    if (st.last !== today) state.set('streak', { last: today, days: st.last === yesterday ? st.days + 1 : 1 });
    const wrong = state.get('wrong', []).length;
    ex.innerHTML = `
      <h2 class="big">${esc(t['train.done'])}</h2>
      <p class="sum">✔ ${s.ok} · ✘ ${s.bad}</p>
      <p class="streak">🔥 ${state.get('streak').days} ${esc(t[state.get('streak').days === 1 ? 'train.day' : 'train.days'])} <small>${esc(t['train.noGuilt'])}</small></p>
      ${s.gold.length ? `<p class="gold">🇺🇸 ${esc(t['train.collected'])}: ${s.gold.map((k) => `<b>${esc(k.usaTitle)}</b>`).join(', ')}</p>` : ''}
      ${opt.back ? `<a class="btn primary" href="${opt.back}">← ${esc(t['train.backCard'])}</a>` : `<a class="btn primary" href="#/train/mix/3">⚡ ${esc(t['train.more'])}</a>`}
      ${wrong ? `<a class="btn" href="#/train/wrong/3">✘ ${esc(t['train.wrong'])} (${wrong})</a>` : ''}
      <a class="btn" href="#/codex/usa">🇺🇸 ${esc(t['codex.usa'])}</a>
      <a class="btn" href="#/">${esc(t['hub.title'])}</a>`;
  }

  next();
  return () => clearInterval(timer);
}
