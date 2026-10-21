// Capitania (RTS-lite): turnos de uma década. Funções puras, testadas em tools/test_colony.mjs.
export function newGame(cfg) {
  return { ...structuredClone(cfg.start), quinto: 0, debt: 0, flags: {}, seen: [], over: false };
}

const ageIndex = (cfg, id) => cfg.ages.findIndex((a) => a.id === id);
const count = (st, id) => st.buildings.filter((b) => b === id).length;

export function canBuild(st, cfg, b) {
  if (ageIndex(cfg, b.age) > ageIndex(cfg, st.age)) return 'age';
  if (b.after && st.year < b.after) return 'year';
  if (count(st, b.id) >= (b.max ?? 99)) return 'max';
  for (const [r, v] of Object.entries(b.cost)) if ((st.res[r] || 0) < v) return 'cost';
  return null;
}

export function build(st, cfg, id) {
  const b = cfg.buildings.find((x) => x.id === id);
  if (canBuild(st, cfg, b)) return st;
  const s = structuredClone(st);
  for (const [r, v] of Object.entries(b.cost)) s.res[r] -= v;
  s.buildings.push(id);
  return s;
}

// Próxima era liberada pelo calendário (o Age Up depende de acertar o quiz).
export function nextAge(st, cfg) {
  const n = cfg.ages[ageIndex(cfg, st.age) + 1];
  return n && st.year >= n.from ? n : null;
}

export function endTurn(st, cfg) {
  const s = structuredClone(st);
  const prod = { pau: 0, acucar: 0, ouro: 0, comida: 0, pop: 0 };
  for (const id of s.buildings) {
    const b = cfg.buildings.find((x) => x.id === id);
    for (const [r, v] of Object.entries(b.prod)) {
      let amount = v;
      if (r === 'acucar' && s.flags.acucarHalf) amount = Math.floor(v / 2);
      if (r === 'ouro' && id === 'lavra' && s.flags.ouroHalf) amount = Math.floor(v / 2);
      prod[r] += amount;
    }
  }
  // O Quinto sai na hora; depois de 1720, sem Casa de Fundição, a multa sobe para 30%.
  const rate = s.year >= 1720 && !s.buildings.includes('fundicao') ? 0.3 : 0.2;
  const quinto = Math.round(prod.ouro * rate);
  s.quinto += quinto;
  if (s.flags.meta) s.debt += Math.max(0, s.flags.meta - quinto);
  for (const r of ['pau', 'acucar', 'ouro', 'comida']) s.res[r] += prod[r] - (r === 'ouro' ? quinto : 0);
  // Teto de população: a vila e o chafariz sustentam mais gente.
  const cap = 6 + 10 * count(s, 'vila') + 5 * count(s, 'chafariz');
  if (s.pop < cap) s.pop = Math.min(cap, s.pop + prod.pop);
  // Comida: cada 2 pessoas comem 1 por década. Faltou, alguém morre de fome (C31).
  s.res.comida -= Math.ceil(s.pop / 2);
  let hunger = false;
  if (s.res.comida < 0) { s.res.comida = 0; s.pop = Math.max(1, s.pop - 1); hunger = true; }
  if (s.flags.capitacao) s.res.ouro = Math.max(0, s.res.ouro - s.pop);

  const from = s.year;
  s.year += cfg.turnYears;
  const events = cfg.events.filter((e) => e.year > from && e.year <= s.year);
  for (const e of events) {
    const fx = e.effect || {};
    if (fx.acucarPct) s.res.acucar = Math.max(0, Math.round(s.res.acucar * (1 + fx.acucarPct / 100)));
    if (fx.pop) s.pop = Math.max(1, s.pop + fx.pop);
    if (fx.acucarHalf) s.flags.acucarHalf = true;
    if (fx.ouroHalf) s.flags.ouroHalf = true;
    if (fx.capitacao) s.flags.capitacao = true;
    if (fx.meta) s.flags.meta = fx.meta;
    if (fx.capitacaoEnd) s.flags.capitacao = false;
    if (fx.remove) s.buildings = s.buildings.filter((b) => b !== fx.remove);
  }
  if (s.year >= cfg.end) s.over = true;
  return { st: s, report: { prod, quinto, rate, hunger, events } };
}
