// Modo História: capítulos = eras. Cada capítulo é uma lista de cenas em data/story/*.json.
// Tipos de cena: dialog, choice, sail (navegação), name (batizar lugares), barter (escambo),
// build (construir), quiz (Age Up) e gate (Time Gate).
import { state } from '../state.js';
import { esc, markSeen, collect, unlock } from '../ui.js';
import { sfx } from '../audio.js';

const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

export function story(root, ctx, [chapterId, flag]) {
  document.body.className = 'page';
  const ch = ctx.content.chapters.find((c) => c.id === chapterId && c.scenes);
  if (!ch) return menu(root, ctx);
  const progress = state.get('story', {});
  if (flag === 'new') { progress[ch.id] = 0; state.set('story', progress); history.replaceState(null, '', `#/story/${ch.id}`); }
  return play(root, ctx, ch, progress[ch.id] || 0);
}

function menu(root, { content, t }) {
  const progress = state.get('story', {});
  const done = state.get('storyDone', []);
  root.innerHTML = `
    <div class="storymenu">
      <nav class="tabs"><a class="back" href="#/">←</a><b>${esc(t['mode.story'])}</b></nav>
      <div class="pad">${content.chapters.map((c) => {
        if (!c.scenes) return `<span class="btn off">${esc(c.title)}<small>${esc(t['hub.soon'])}</small></span>`;
        const at = progress[c.id] || 0;
        const status = done.includes(c.id) ? '✔ ' + t['story.done'] : at ? `${t['story.scene']} ${at + 1}/${c.scenes.length}` : t['story.new'];
        return `<a class="btn primary" href="#/story/${c.id}">${esc(c.title)}<small>${esc(status)}</small></a>
          ${at || done.includes(c.id) ? `<a class="btn" href="#/story/${c.id}/new">↺ ${esc(t['story.restart'])}</a>` : ''}`;
      }).join('')}</div>
    </div>`;
}

function play(root, ctx, ch, start) {
  const { content, t } = ctx;
  const chars = Object.fromEntries(content.characters.map((c) => [c.id, c]));
  let i = start;

  root.innerHTML = `
    <div class="story">
      <nav class="tabs"><a class="back" href="#/story">✕</a><div class="dots"></div></nav>
      <div class="stage"><div class="banner"></div><div class="prop"></div></div>
      <div class="panel"></div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const panel = $('.panel');

  // ---- peças comuns ----
  function portrait(who) {
    const c = chars[who];
    if (!c) return '';
    const img = c.image ? `style="background-image:url('assets/img/${c.image}');${c.face || ''}"` : '';
    return `<div class="face ${c.image ? '' : 'noface'}" data-who="${who}" ${img}>${c.image ? '' : esc(c.name[0])}</div>`;
  }
  const nameOf = (who) => (who === 'narr' ? '' : chars[who]?.name || who);

  // Mostra falas uma a uma; toque avança. Depois chama done().
  function say(lines, done) {
    let n = 0;
    const show = () => {
      if (n >= lines.length) return done();
      const l = lines[n];
      root.querySelector('.story').classList.toggle('serio', l.tone === 'serio' || sceneTone === 'serio');
      panel.innerHTML = `<div class="line ${l.who === 'narr' ? 'narr' : ''}">
          ${portrait(l.who)}<div><b>${esc(nameOf(l.who))}</b><p>${esc(l.text)}</p></div></div>
        <p class="tap">${esc(t['story.tap'])} ▸</p>`;
    };
    panel.onclick = (e) => {
      if (e.target.closest('[data-who="mula"]')) return pokeMula(e);
      n++;
      show();
    };
    show();
  }

  function pokeMula(e) {
    e.stopPropagation();
    const picks = state.get('mulaPicks', 0) + 1;
    state.set('mulaPicks', picks);
    const face = e.target.closest('.face');
    face.classList.remove('poke'); void face.offsetWidth; face.classList.add('poke');
    if (picks === 10) {
      const p = panel.querySelector('.line p');
      if (p) p.textContent = t['story.strike'];
      unlock(state, content, 'pica-mula');
    }
  }

  function buttons(opts, onPick) {
    panel.onclick = null;
    panel.insertAdjacentHTML('beforeend', `<div class="opts">${opts.map((o, k) => `<button class="btn opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>`);
    panel.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); onPick(+b.dataset.k, b); }));
  }

  let sceneTone = 'normal';
  function next() { i++; scene(); }

  // ---- cenas ----
  const SCENES = {
    dialog: (sc) => say(sc.lines, next),

    choice(sc) {
      const ask = () => {
        panel.innerHTML = `<div class="line">${portrait(sc.who)}<div><b>${esc(nameOf(sc.who))}</b><p>${esc(sc.text)}</p></div></div>`;
        buttons(sc.options.map((o) => o.label), (k) => {
          const o = sc.options[k];
          if (o.ok) sfx.hit();
          say(o.reply, o.retry ? ask : next);
        });
      };
      ask();
    },

    sail(sc) {
      const P = { lisboa: [236, 42], caboverde: [182, 168], mar: [140, 232], portoseguro: [94, 250] };
      $('.prop').innerHTML = `
        <svg viewBox="0 0 300 330" class="map">
          <path d="M0 150 C40 150 70 170 90 200 C100 230 85 270 70 300 L50 330 L0 330 Z" class="land"/>
          <path d="M300 0 L232 0 L228 52 L262 62 L300 58 Z" class="land"/><path d="M300 78 L252 84 L226 112 L206 150 L198 192 L208 250 L236 330 L300 330 Z" class="land"/>
          <text x="20" y="200" class="lbl">Brasil</text><text x="240" y="230" class="lbl">África</text><text x="250" y="30" class="lbl">Lisboa</text>
          <path d="M236 42 L212 100 L182 168 Q150 230 94 250" class="route"/>
          <text class="egg" x="96" y="192" visibility="hidden">${esc(sc.egg.label)}</text>
          <text class="ship" x="0" y="0">⛵</text>
        </svg>`;
      const ship = $('.ship');
      const moveTo = (key) => { const [x, y] = P[key]; ship.setAttribute('transform', `translate(${x - 10} ${y + 6})`); };
      moveTo('lisboa');
      let leg = 0;
      const ask = (msg) => {
        if (leg >= sc.legs.length) return arrive();
        const L = sc.legs[leg];
        panel.innerHTML = `${msg ? `<p class="reply">${esc(msg)}</p>` : `<p class="reply">${esc(sc.intro)}</p>`}<p class="prompt">${esc(L.prompt)}</p>`;
        buttons(L.options.map((o) => o.label), (k) => {
          const o = L.options[k];
          if (!o.ok) return ask(o.reply);
          sfx.hit();
          leg++;
          moveTo(leg === 1 ? 'caboverde' : 'mar');
          ask(o.reply);
        });
      };
      let eggDone = false;
      const arrive = () => {
        moveTo('portoseguro');
        const egg = $('.egg');
        if (!eggDone) {
          egg.setAttribute('visibility', 'visible');
          egg.addEventListener('click', () => {
            eggDone = true;
            egg.setAttribute('visibility', 'hidden');
            markSeen(state, sc.egg.card);
            unlock(state, content, sc.egg.ach);
            say(sc.egg.lines, arrive);
          }, { once: true });
        }
        panel.innerHTML = `<p class="prompt">${esc(sc.arrive)}</p><p class="hint">${esc(t['story.eggHint'])}</p>`;
        buttons([t['story.land'] + ' →'], next);
      };
      ask();
    },

    name(sc) {
      let r = 0;
      const round = (msg) => {
        if (r >= sc.rounds.length) return next();
        const R = sc.rounds[r];
        panel.innerHTML = `${msg ? `<p class="reply">${esc(msg)}</p>` : ''}<p class="date">📅 ${esc(R.date)}</p><p class="prompt">${esc(R.place)}</p>`;
        buttons(R.options, (k, b) => {
          if (k !== R.answer) { b.classList.add('shake'); b.disabled = true; return; }
          sfx.hit();
          r++;
          if (R.after) { panel.innerHTML = `<p class="reply big">“${esc(R.after)}”</p>`; buttons([t['train.continue'] + ' →'], () => round()); } else round(t['story.named']);
        });
      };
      round();
    },

    barter(sc) {
      let logs = 0;
      let trust = sc.trust;
      const draw = (msg) => {
        panel.innerHTML = `
          ${msg ? `<p class="reply">${esc(msg)}</p>` : `<p class="reply">${esc(sc.intro)}</p>`}
          <div class="meters"><span>🪵 ${logs}/${sc.goal}</span><span>${'❤'.repeat(Math.max(trust, 0))}${'♡'.repeat(Math.max(5 - trust, 0))}</span></div>`;
        if (trust <= 0) return end(sc.lose, true);
        if (logs >= sc.goal) return end(sc.win, false);
        buttons(sc.offers.map((o) => o.label), (k) => {
          const o = sc.offers[k];
          logs += o.logs;
          trust = Math.min(5, trust + o.trust);
          draw(o.line);
        });
      };
      const end = (lines, lost) => say([...lines, ...sc.after], () => {
        panel.innerHTML = '';
        buttons(lost ? [t['story.retry'], t['story.go'] + ' →'] : [t['story.go'] + ' →'], (k) => (lost && k === 0 ? SCENES.barter(sc) : next()));
      });
      draw();
    },

    build(sc) {
      panel.innerHTML = `<p class="reply">${esc(sc.intro)}</p>`;
      $('.prop').textContent = '🌳';
      buttons([sc.button], () => {
        const prop = $('.prop');
        prop.textContent = sc.bg.prop;
        prop.classList.add('pop');
        sfx.hit();
        say(sc.lines, next);
      });
    },

    quiz(sc) {
      const qs = shuffle(sc.quizIds).slice(0, sc.ask).map((id) => content.quizzes.find((q) => q.id === id));
      let n = 0;
      let right = 0;
      const ask = () => {
        if (n >= qs.length) return result();
        const q = qs[n];
        const opts = q.type === 'multiple'
          ? shuffle(q.options.map((text, k) => ({ text, ok: k === q.answer })))
          : [{ text: t['train.fact'], ok: q.answer === 'fato' }, { text: t['train.legend'], ok: q.answer === 'lenda' }];
        panel.innerHTML = `<p class="date">🔔 ${n + 1}/${qs.length}${q.type === 'factOrLegend' ? ' · ' + esc(t['train.t.fol']) : ''}</p><p class="prompt">${esc(q.prompt)}</p>`;
        buttons(opts.map((o) => o.text), (k) => {
          const ok = opts[k].ok;
          if (ok) { right++; sfx.hit(); if (q.cardId && content.byId[q.cardId]?.usa) collect(state, q.cardId); }
          panel.innerHTML = `<p class="fbline ${ok ? 'ok' : 'no'}">${ok ? '✔' : '✘'} ${esc(q.explain)}</p>`;
          n++;
          buttons([t['train.continue'] + ' →'], ask);
        });
      };
      const result = () => {
        if (right >= sc.pass) return next();
        panel.innerHTML = `<p class="prompt">${esc(t['story.quiet'])} (${right}/${qs.length})</p>`;
        buttons([t['story.retry']], () => SCENES.quiz(sc));
      };
      panel.innerHTML = `<p class="reply">${esc(sc.intro)}</p>`;
      buttons([t['story.ready'] + ' →'], ask);
    },

    gate(sc) {
      root.querySelector('.story').classList.add('gating');
      $('.prop').innerHTML = '<div class="gate"></div>';
      sfx.achievement();
      unlock(state, content, sc.ach);
      const done = state.get('storyDone', []);
      if (!done.includes(ch.id)) state.set('storyDone', [...done, ch.id]);
      panel.onclick = null;
      panel.innerHTML = `<h2 class="ageup">${esc(sc.title)}</h2><p class="reply">${esc(sc.text)}</p>
        <a class="btn primary" href="#/train/mix/3">⚡ ${esc(t['train.mix3'])}</a>
        <a class="btn" href="#/story/${ch.id}/new">↺ ${esc(t['story.restart'])}</a>
        <a class="btn" href="#/">${esc(t['hub.title'])}</a>`;
    },
  };

  function scene() {
    const sc = ch.scenes[i];
    if (!sc) return;
    const progress = state.get('story', {});
    progress[ch.id] = sc.type === 'gate' ? 0 : i; // terminou: a próxima visita recomeça
    state.set('story', progress);
    sceneTone = sc.tone || 'normal';
    for (const id of sc.cards || []) markSeen(state, id);
    const box = root.querySelector('.story');
    box.classList.remove('serio', 'gating');
    if (sc.bg) box.style.setProperty('--bg', sc.bg.color);
    const prop = $('.prop');
    prop.className = 'prop';
    prop.textContent = sc.bg?.prop || '';
    const banner = $('.banner');
    banner.textContent = sc.title || '';
    banner.classList.toggle('on', !!sc.title);
    $('.dots').innerHTML = ch.scenes.map((_, k) => `<i class="${k < i ? 'past' : k === i ? 'now' : ''}"></i>`).join('');
    SCENES[sc.type](sc);
  }

  scene();
}
