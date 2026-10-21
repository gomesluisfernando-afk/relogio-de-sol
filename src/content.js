// Carrega todo o conteúdo listado em data/index.json e valida.
// validate() é pura: roda no navegador (debug.html) e no Node (tools/check.mjs).

export const STATUS = ['doc', 'debatido', 'lenda', 'conferir'];
const TONES = ['normal', 'serio'];
const REQUIRED = ['id', 'era', 'year', 'yearLabel', 'title', 'hook', 'facts', 'status', 'tone', 'bullets', 'keyword'];

export async function loadContent(base = 'data/') {
  const get = (f) => fetch(base + f).then((r) => {
    if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
    return r.json();
  });
  const index = await get('index.json');
  return assemble(index, get);
}

// Junta as fases num único objeto. `get(path)` devolve o JSON do arquivo.
export async function assemble(index, get) {
  const c = { eras: [], cards: [], tours: [], characters: [], expressions: [] };
  for (const p of index.phases) {
    c.eras.push(...await get(p.eras));
    c.cards.push(...await get(p.cards));
    for (const t of p.tours) c.tours.push(await get(t));
  }
  c.characters = await get(index.shared.characters);
  c.expressions = await get(index.shared.expressions);
  c.quizzes = await get(index.shared.quizzes);
  c.achievements = await get(index.shared.achievements);
  c.items = await get(index.shared.items);
  c.quests = await get(index.shared.quests);
  c.colony = await get(index.shared.colony);
  c.chapters = (await get(index.shared.story)).chapters;
  for (const ch of c.chapters) if (ch.file) ch.scenes = (await get(ch.file)).scenes;
  c.cards.sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
  c.byId = Object.fromEntries(c.cards.map((x) => [x.id, x]));
  // Paradas de cada card vêm da rota (fonte única), não do card.
  for (const card of c.cards) card.tourStops = [];
  for (const t of c.tours) for (const s of t.stops) for (const id of s.cards) c.byId[id]?.tourStops.push(s.id);
  return c;
}

export function validate(c) {
  const errors = [];
  const warnings = [];
  const conferir = [];
  const eraIds = new Set(c.eras.map((e) => e.id));
  const charIds = new Set(c.characters.map((x) => x.id));
  const seen = new Set();

  for (const k of c.cards) {
    const at = k.id || '(sem id)';
    for (const f of REQUIRED) if (k[f] === undefined) errors.push(`${at}: falta o campo "${f}"`);
    if (seen.has(k.id)) errors.push(`${at}: id repetido`);
    seen.add(k.id);
    if (!eraIds.has(k.era)) errors.push(`${at}: era "${k.era}" não existe`);
    if (!STATUS.includes(k.status)) errors.push(`${at}: status inválido "${k.status}"`);
    if (!TONES.includes(k.tone)) errors.push(`${at}: tone inválido "${k.tone}"`);
    if (k.tone === 'serio' && k.joke) errors.push(`${at}: card sério não pode ter piada`);
    if (k.usa && !k.usaTitle) warnings.push(`${at}: tem "usa" mas falta "usaTitle"`);
    if (!Array.isArray(k.bullets) || k.bullets.length !== 3) warnings.push(`${at}: Tour pede 3 tópicos`);
    else for (const b of k.bullets) {
      const n = b.split(/\s+/).length;
      if (n < 3 || n > 8) warnings.push(`${at}: tópico com ${n} palavras: "${b}"`);
    }
    if (!k.facts?.length) warnings.push(`${at}: sem fatos`);
    for (const ch of k.characters || []) if (!charIds.has(ch)) errors.push(`${at}: personagem "${ch}" não existe`);
    for (const q of k.conferir || []) conferir.push({ id: k.id, text: q });
    if (k.status === 'conferir') conferir.push({ id: k.id, text: 'card inteiro marcado como conferir' });
  }

  for (const t of c.tours) for (const s of t.stops) {
    for (const id of s.cards) if (!c.byId[id]) errors.push(`${s.id}: card "${id}" não existe`);
    if (!s.transition) warnings.push(`${s.id}: sem frase de transição`);
    for (const x of s.extras || []) {
      if (!STATUS.includes(x.status)) errors.push(`${x.id}: status inválido`);
      if (x.tone === 'serio' && x.joke) errors.push(`${x.id}: extra sério não pode ter piada`);
      for (const q of x.conferir || []) conferir.push({ id: x.id, text: q });
    }
  }

  for (const e of c.expressions) {
    if (!STATUS.includes(e.status)) errors.push(`${e.id}: status inválido`);
    if (e.card && !c.byId[e.card]) errors.push(`${e.id}: card "${e.card}" não existe`);
  }

  const exprIds = new Set(c.expressions.map((e) => e.id));
  const quizIds = new Set();
  for (const q of c.quizzes) {
    if (quizIds.has(q.id)) errors.push(`${q.id}: id de quiz repetido`);
    quizIds.add(q.id);
    if (q.cardId ? !c.byId[q.cardId] : !exprIds.has(q.exprId)) errors.push(`${q.id}: card/expressão não existe`);
    if (q.type === 'multiple' && !(q.options?.[q.answer] !== undefined && q.options.length >= 2)) errors.push(`${q.id}: resposta fora das opções`);
    if (q.type === 'factOrLegend' && !['fato', 'lenda'].includes(q.answer)) errors.push(`${q.id}: resposta deve ser "fato" ou "lenda"`);
    if (!['multiple', 'factOrLegend'].includes(q.type)) errors.push(`${q.id}: tipo "${q.type}" não suportado`);
  }

  const achIds = new Set(c.achievements.map((a) => a.id));
  const who = new Set(['narr', ...charIds]);
  const SCENES = ['dialog', 'choice', 'sail', 'name', 'barter', 'build', 'pan', 'trail', 'map', 'quiz', 'gate'];
  for (const ch of c.chapters) (ch.scenes || []).forEach((sc, n) => {
    const at = `${ch.id}#${n}`;
    if (!SCENES.includes(sc.type)) errors.push(`${at}: tipo de cena "${sc.type}" não existe`);
    for (const id of sc.cards || []) if (!c.byId[id]) errors.push(`${at}: card "${id}" não existe`);
    for (const id of sc.quizIds || []) if (!quizIds.has(id)) errors.push(`${at}: quiz "${id}" não existe`);
    for (const id of [sc.ach, sc.egg?.ach].filter(Boolean)) if (!achIds.has(id)) errors.push(`${at}: conquista "${id}" não existe`);
    const lines = [sc.lines, sc.egg?.lines, sc.win, sc.lose, sc.after, sc.end, ...(sc.spots || []).map((p) => p.lines), ...(sc.options || []).map((o) => o.reply)].flat().filter((l) => l && typeof l === 'object');
    for (const l of [...lines, ...(sc.who ? [{ who: sc.who }] : [])]) if (!who.has(l.who)) errors.push(`${at}: quem fala "${l.who}" não existe`);
    if (sc.type === 'quiz' && sc.quizIds.length < sc.ask) errors.push(`${at}: poucas perguntas para "ask"`);
    if (sc.type === 'map' && sc.spots.length < sc.need) errors.push(`${at}: "need" maior que o número de pontos`);
    if (sc.type === 'gate' && sc.next && !c.chapters.some((x) => x.id === sc.next)) errors.push(`${at}: capítulo "${sc.next}" não existe`);
  });

  if (c.colony) {
    const ages = new Set(c.colony.ages.map((a) => a.id));
    for (const b of c.colony.buildings) {
      if (!ages.has(b.age)) errors.push(`capitania ${b.id}: era "${b.age}" não existe`);
      if (b.card && !c.byId[b.card]) errors.push(`capitania ${b.id}: card "${b.card}" não existe`);
    }
    for (const e of c.colony.events) if (!c.byId[e.card]) errors.push(`capitania ${e.year}: card "${e.card}" não existe`);
  }

  const itemIds = new Set(c.items.map((x) => x.id));
  for (const x of c.items) if (x.card && !c.byId[x.card]) errors.push(`item ${x.id}: card "${x.card}" não existe`);
  for (const q of c.quests) {
    const at = q.id;
    if (!['devassa', 'descoberta'].includes(q.kind)) errors.push(`${at}: kind deve ser devassa ou descoberta`);
    if (!q.suspects.some((s) => s.id === q.answer)) errors.push(`${at}: resposta não está entre os suspeitos`);
    if (!q.dates.includes(q.date)) errors.push(`${at}: data certa não está nas opções`);
    for (const s of q.suspects) if (s.id !== q.answer && !s.why) warnings.push(`${at}: suspeito ${s.id} sem "why"`);
    for (const w of q.witnesses) if (w.card && !c.byId[w.card]) errors.push(`${at}: card "${w.card}" não existe`);
    for (const id of q.cards || []) if (!c.byId[id]) errors.push(`${at}: card "${id}" não existe`);
    if (q.reward.item && !itemIds.has(q.reward.item)) errors.push(`${at}: item "${q.reward.item}" não existe`);
    for (const t of q.conferir || []) conferir.push({ id: at, text: t });
  }

  return { errors, warnings, conferir };
}
