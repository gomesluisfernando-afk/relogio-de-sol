// Modo História: capítulos = eras. Cada capítulo é uma lista de cenas em data/story/*.json.
// Tipos de cena: dialog, choice, sail (navegação), name (batizar lugares), barter (escambo),
// build (construir), pan (bateia), trail (tropa na Estrada Real), map (rua × beco),
// quiz (Age Up) e gate (Time Gate). Qualquer cena pode ter um easter egg (sc.egg).
import { state } from '../state.js';
import { esc, markSeen, collect, unlock, pay, hud, toast } from '../ui.js';
import { sfx, music, seriousDrone, stopMusic } from '../audio.js';

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
      <div class="pad">${hud(state, t)}${content.chapters.map((c, n) => {
        if (!c.scenes) return `<span class="btn off">${esc(c.title)}<small>${esc(t['hub.soon'])}</small></span>`;
        // Age Up: o capítulo só abre depois do quiz do anterior.
        const prev = content.chapters[n - 1];
        if (prev && !done.includes(prev.id)) return `<span class="btn off">🔒 ${esc(c.title)}<small>${esc(t['story.locked'])}</small></span>`;
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
      <nav class="tabs"><a class="back" href="#/story">✕</a><div class="dots"></div><button class="mute" data-act="mute">${state.get('muted', false) ? '🔇' : '🔔'}</button></nav>
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
      sfx.uai();
      unlock(state, content, 'pica-mula');
    }
  }

  function buttons(opts, onPick) {
    panel.onclick = null;
    panel.insertAdjacentHTML('beforeend', `<div class="opts">${opts.map((o, k) => `<button class="btn opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>`);
    panel.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); onPick(+b.dataset.k, b); }));
  }

  let sceneTone = 'normal';
  // Trilha: tema da era do capítulo; cena séria troca por drone grave.
  let playing = null;
  function soundFor(sc) {
    const want = sc.type === 'gate' ? null : sc.tone === 'serio' ? 'drone' : ch.eras[0];
    if (want === playing) return;
    playing = want;
    if (!want) stopMusic(); else if (want === 'drone') seriousDrone(); else music(want);
  }
  $('[data-act="mute"]').addEventListener('click', (e) => {
    state.set('muted', !state.get('muted', false));
    e.currentTarget.textContent = state.get('muted') ? '🔇' : '🔔';
    playing = null;
    if (state.get('muted')) stopMusic(); else soundFor(ch.scenes[i]);
  });
  function next() { i++; scene(); }

  // ---- cenas ----
  const SCENES = {
    dialog: (sc) => say(sc.lines, next),

    // Bateia: toque para girar e lavar o cascalho até aparecer o ouro.
    pan(sc) {
      let n = 0;
      $('.prop').innerHTML = `<div class="pan" style="background-image:url('assets/img/${sc.pan}')"></div>`;
      const draw = () => {
        panel.innerHTML = `<p class="reply">${esc(sc.intro)}</p>
          <div class="meters"><span>🥘 ${'●'.repeat(n)}${'○'.repeat(sc.taps - n)}</span></div>
          <p class="hint">${esc(t['story.panHint'])}</p>`;
      };
      draw();
      panel.onclick = null;
      $('.stage').onclick = () => {
        if (n >= sc.taps) return;
        n++;
        const pan = $('.pan');
        pan.classList.remove('swirl'); void pan.offsetWidth; pan.classList.add('swirl');
        draw();
        if (n < sc.taps) return;
        $('.stage').onclick = null;
        pan.classList.add('gold');
        sfx.hit();
        pay(state, sc.reward);
        say(sc.lines, next);
      };
    },

    // Tropa na Estrada Real (estilo Oregon Trail): cada trecho gasta comida;
    // registros cobram o Quinto sobre o ouro carregado; sem comida, morre uma mula.
    trail(sc) {
      const r = { ...sc.start };
      let leg = 0;
      const meters = () => `<div class="meters"><span>🐴 ${r.mules}</span><span>🍖 ${r.food}</span><span>🪙 ${r.gold}</span></div>`;
      const ask = (msg) => {
        if (leg >= sc.legs.length) return say([...sc.end, { who: 'narr', text: `${t['story.arrived']}: 🐴 ${r.mules} · 🍖 ${r.food} · 🪙 ${r.gold}` }], next);
        const L = sc.legs[leg];
        panel.innerHTML = `${meters()}${msg ? `<p class="reply">${esc(msg)}</p>` : ''}<p class="date">📍 ${esc(L.place)}</p><p class="prompt">${esc(L.text)}</p>`;
        buttons(L.options.map((o) => o.label), (k) => {
          const o = L.options[k];
          sfx.hooves();
          r.food += (o.food || 0) - 1;
          r.mules += o.mules || 0;
          r.gold += o.gold || 0;
          let extra = '';
          if (o.quinto) { const q = Math.round(r.gold * 0.2); r.gold -= q; extra = ` 👑 −${q}`; sfx.stamp(); }
          if (r.food < 0) { r.food = 0; r.mules = Math.max(1, r.mules - 1); extra += ` ${t['story.hunger']}`; }
          leg++;
          ask(`${o.reply}${extra}`);
        });
      };
      ask(sc.intro);
    },

    // Mapa com duas camadas: rua (eixo do poder) e beco (eixo da servidão).
    map(sc) {
      const seen = new Set();
      let layer = 'rua';
      $('.stage').style.backgroundImage = '';
      const drawMap = () => {
        $('.prop').innerHTML = `<div class="mapwrap ${layer}"><img src="assets/img/${sc.map}" alt="">
          ${sc.spots.map((p, k) => p.layer === layer ? `<button class="spot ${seen.has(k) ? 'done' : ''}" data-k="${k}" style="left:${p.x}%;top:${p.y}%">${seen.has(k) ? '✔' : p.icon || '●'}</button>` : '').join('')}</div>`;
        $('.prop').querySelectorAll('.spot').forEach((b) => b.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = sc.spots[+b.dataset.k];
          seen.add(+b.dataset.k);
          $('.mapwrap').classList.add('busy'); // sem trocar de ponto no meio da fala
          say([{ who: 'narr', text: `📍 ${p.label}` }, ...p.lines], drawAll);
        }));
      };
      const drawAll = () => {
        drawMap();
        const left = sc.need - seen.size;
        panel.onclick = null;
        panel.innerHTML = `<p class="reply">${esc(sc.intro)}</p>
          <div class="layers">${Object.entries(sc.layers).map(([id, label]) => `<button class="chip ${layer === id ? 'on' : ''}" data-l="${id}">${esc(label)}</button>`).join('')}</div>
          <p class="hint">${left > 0 ? `${esc(t['story.mapLeft'])}: ${left}` : esc(t['story.mapDone'])}</p>`;
        panel.querySelectorAll('[data-l]').forEach((b) => b.addEventListener('click', () => { layer = b.dataset.l; drawAll(); }));
        if (left <= 0) buttons([t['story.go'] + ' →'], next);
      };
      drawAll();
    },

    choice(sc) {
      const ask = () => {
        panel.innerHTML = `<div class="line">${portrait(sc.who)}<div><b>${esc(nameOf(sc.who))}</b><p>${esc(sc.text)}</p></div></div>`;
        buttons(sc.options.map((o) => (o.locked ? '🔒 ' : '') + o.label), (k) => {
          const o = sc.options[k];
          if (o.locked) return say(o.reply, ask);
          if (o.ok) sfx.hit();
          say(o.reply, o.retry ? ask : next);
        });
        sc.options.forEach((o, k) => o.locked && panel.querySelector(`[data-k="${k}"]`)?.classList.add('locked'));
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
      if (sc.bg.before) { setImage(sc.bg.before); $('.prop').textContent = ''; } else $('.prop').textContent = '🌳';
      buttons([sc.button], () => {
        const prop = $('.prop');
        if (sc.bg.image) setImage(sc.bg.image); else prop.textContent = sc.bg.prop;
        $('.stage').classList.remove('pop'); void prop.offsetWidth; $('.stage').classList.add('pop');
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
        if (right >= sc.pass) { pay(state, 30); return next(); }
        panel.innerHTML = `<p class="prompt">${esc(t['story.quiet'])} (${right}/${qs.length})</p>`;
        buttons([t['story.retry']], () => SCENES.quiz(sc));
      };
      panel.innerHTML = `<p class="reply">${esc(sc.intro)}</p>`;
      buttons([t['story.ready'] + ' →'], ask);
    },

    gate(sc) {
      root.querySelector('.story').classList.add('gating');
      setImage(null);
      // Portal em vídeo (loop); se o vídeo falhar, fica o círculo animado em CSS.
      $('.prop').innerHTML = sc.video
        ? `<video class="gatevid" src="assets/${sc.video}" autoplay muted loop playsinline></video>`
        : '<div class="gate"></div>';
      const gv = $('.prop .gatevid');
      gv?.play?.().catch(() => {});
      gv?.addEventListener('error', () => { $('.prop').innerHTML = '<div class="gate"></div>'; });
      sfx.achievement();
      if (sc.ach) unlock(state, content, sc.ach);
      const done = state.get('storyDone', []);
      if (!done.includes(ch.id)) { state.set('storyDone', [...done, ch.id]); setTimeout(() => pay(state, 100), 1200); }
      panel.onclick = null;
      const nextCh = sc.next && content.chapters.find((c) => c.id === sc.next && c.scenes);
      panel.innerHTML = `<h2 class="ageup">${esc(sc.title)}</h2><p class="reply">${esc(sc.text)}</p>
        ${nextCh ? `<a class="btn primary" href="#/story/${nextCh.id}">▶ ${esc(nextCh.title)}</a>` : ''}
        <a class="btn ${nextCh ? '' : 'primary'}" href="#/train/mix/3">⚡ ${esc(t['train.mix3'])}</a>
        <a class="btn" href="#/story/${ch.id}/new">↺ ${esc(t['story.restart'])}</a>
        <a class="btn" href="#/">${esc(t['hub.title'])}</a>`;
    },
  };

  // Imagem do cenário ocupa o palco; sem imagem, fica a cor + o emoji (prop).
  function setImage(src) {
    $('.stage').style.backgroundImage = src ? `url('assets/img/${src}')` : '';
  }
  // Clipe de vídeo da cena (toca uma vez, mudo, por cima da imagem; a imagem fica como capa).
  function setVideo(src) {
    $('.stage .bgvid')?.remove();
    if (!src) return;
    $('.stage').insertAdjacentHTML('afterbegin', `<video class="bgvid" src="assets/${src}" autoplay muted playsinline preload="auto"></video>`);
    $('.stage .bgvid').play?.().catch(() => {}); // iOS às vezes ignora o autoplay sem play()
  }

  function scene() {
    const sc = ch.scenes[i];
    if (!sc) return;
    const progress = state.get('story', {});
    progress[ch.id] = sc.type === 'gate' ? 0 : i; // terminou: a próxima visita recomeça
    state.set('story', progress);
    sceneTone = sc.tone || 'normal';
    soundFor(sc);
    for (const id of sc.cards || []) markSeen(state, id);
    const box = root.querySelector('.story');
    box.classList.remove('serio', 'gating');
    if (sc.bg) box.style.setProperty('--bg', sc.bg.color);
    setImage(sc.bg?.image);
    setVideo(sc.bg?.video);
    const prop = $('.prop');
    prop.className = 'prop';
    prop.textContent = sc.bg?.image ? '' : sc.bg?.prop || '';
    const banner = $('.banner');
    banner.textContent = sc.title || '';
    banner.classList.toggle('on', !!sc.title);
    $('.dots').innerHTML = ch.scenes.map((_, k) => `<i class="${k < i ? 'past' : k === i ? 'now' : ''}"></i>`).join('');
    $('.stage').onclick = null;
    $('.stage').querySelector('.eggbtn')?.remove();
    if (sc.egg && sc.type !== 'sail' && !state.get('achievements', []).includes(sc.egg.ach)) {
      $('.stage').insertAdjacentHTML('beforeend', `<button class="eggbtn">${esc(sc.egg.label)}</button>`);
      $('.stage .eggbtn').addEventListener('click', (e) => {
        e.stopPropagation();
        e.currentTarget.remove();
        if (sc.egg.card) markSeen(state, sc.egg.card);
        unlock(state, content, sc.egg.ach);
        say(sc.egg.lines, () => SCENES[sc.type](sc));
      });
    }
    // Easter egg: o cachorro do postal antigo, escondido numa cena de cada capítulo.
    $('.stage').querySelector('.dog')?.remove();
    if (ch.dog === i && !state.get('dogs', []).includes(ch.id)) {
      $('.stage').insertAdjacentHTML('beforeend', '<button class="dog" aria-label="🐕">🐕</button>');
      $('.stage .dog').addEventListener('click', (e) => {
        e.stopPropagation();
        e.currentTarget.remove();
        const dogs = [...state.get('dogs', []), ch.id];
        const total = content.chapters.filter((c) => c.dog != null).length;
        state.set('dogs', dogs);
        sfx.hit();
        toast(`🐕 ${t['story.dog']} ${dogs.length}/${total}`);
        if (dogs.length >= total) unlock(state, content, 'cachorro');
      });
    }
    SCENES[sc.type](sc);
  }

  scene();
  return () => stopMusic();
}
