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

  return { errors, warnings, conferir };
}
