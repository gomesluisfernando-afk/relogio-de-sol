// Mapa do Tempo (estilo Heroes, enxuto): grade de terrenos, pontos de movimento por dia,
// névoa, minas, ouro em pó e dois rivais com IA simples. Funções puras: recebem e devolvem
// o estado, então dá para testar no Node (tools/test_map.mjs).

// Custo em pontos de movimento por terreno. Infinity = intransponível.
export const COST = { '=': 2, b: 2, v: 2, '.': 3, f: 4, h: 5, '^': Infinity, '~': Infinity };
export const SIGHT = 2;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function grid(map) {
  const H = map.rows.length;
  const W = map.rows[0].length;
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? map.rows[y][x] : '^');
  const objAt = (x, y) => map.objects.find((o) => o.x === x && o.y === y);
  return { W, H, at, objAt, cost: (x, y) => COST[at(x, y)] ?? Infinity };
}

export function newGame(map) {
  const g = grid(map);
  const st = {
    day: 1, mp: map.mp, x: map.start.x, y: map.start.y, dust: 0,
    seen: '0'.repeat(g.W * g.H), done: {}, owner: {},
    agents: Object.fromEntries(map.agents.map((a) => [a.id, { x: a.x, y: a.y, rest: 0 }])),
  };
  return reveal(st, map, st.x, st.y);
}

export const year = (map, st) => map.year + Math.floor((st.day - 1) / map.daysPerYear);
export const isSeen = (st, g, x, y) => st.seen[y * g.W + x] === '1';
export const anchors = (map, st) => map.objects.filter((o) => o.type === 'card' && st.done[o.id]).length;
export const portalOpen = (map, st) => anchors(map, st) >= map.goal;

export function reveal(st, map, cx, cy, r = SIGHT) {
  const g = grid(map);
  const s = st.seen.split('');
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x >= 0 && y >= 0 && x < g.W && y < g.H) s[y * g.W + x] = '1';
  return { ...st, seen: s.join('') };
}

// A* em 8 direções. Objetos no meio do caminho não bloqueiam a passagem do cálculo
// (o herói para neles ao andar); só o terreno bloqueia. Devolve [[x,y]...] sem a origem.
export function path(map, from, to) {
  const g = grid(map);
  if (g.cost(to[0], to[1]) === Infinity) return null;
  const key = (x, y) => y * g.W + x;
  const h = (x, y) => Math.max(Math.abs(x - to[0]), Math.abs(y - to[1])) * 2;
  const open = new Map([[key(...from), { x: from[0], y: from[1], g: 0, f: h(...from), prev: null }]]);
  const closed = new Map();
  while (open.size) {
    // ponytail: busca linear do menor f; grade de 400 casas não precisa de heap
    let cur = null;
    for (const n of open.values()) if (!cur || n.f < cur.f) cur = n;
    open.delete(key(cur.x, cur.y));
    closed.set(key(cur.x, cur.y), cur);
    if (cur.x === to[0] && cur.y === to[1]) {
      const out = [];
      for (let n = cur; n.prev; n = n.prev) out.unshift([n.x, n.y]);
      return out;
    }
    for (const [dx, dy] of DIRS) {
      const x = cur.x + dx;
      const y = cur.y + dy;
      const c = g.cost(x, y);
      if (c === Infinity || closed.has(key(x, y))) continue;
      const gg = cur.g + c;
      const old = open.get(key(x, y));
      if (!old || gg < old.g) open.set(key(x, y), { x, y, g: gg, f: gg + h(x, y), prev: cur });
    }
  }
  return null;
}

// Quantos passos do caminho cabem nos pontos de movimento de hoje.
export function reach(map, steps, mp) {
  const g = grid(map);
  let n = 0;
  for (const [x, y] of steps) { if (mp < g.cost(x, y)) break; mp -= g.cost(x, y); n++; }
  return n;
}

// Anda um passo. Devolve o novo estado e o objeto da casa (se houver) para a tela tratar.
export function step(map, st, [x, y]) {
  const g = grid(map);
  const c = g.cost(x, y);
  if (st.mp < c || Math.max(Math.abs(x - st.x), Math.abs(y - st.y)) !== 1) return { st, obj: null, moved: false };
  let s = reveal({ ...st, x, y, mp: st.mp - c }, map, x, y);
  const obj = g.objAt(x, y);
  return { st: s, obj, moved: true };
}

// Pegar o que há na casa. Cartas e ouro somem do mapa; minas trocam de dono.
export function take(map, st, obj) {
  if (obj.type === 'mina') return { ...st, owner: { ...st.owner, [obj.id]: 'buck' } };
  if (st.done[obj.id] || !['card', 'ouro', 'item'].includes(obj.type)) return st;
  return { ...st, done: { ...st.done, [obj.id]: 1 }, dust: st.dust + (obj.dust || 0) };
}

// Registro (posto fiscal na ponte): acertou, passa livre; errou, paga 20% do pó.
export function registro(st, ok) {
  if (ok) return { st, paid: 0 };
  const paid = Math.ceil(st.dust * 0.2);
  return { st: { ...st, dust: st.dust - paid }, paid };
}

// Duelo de saber contra o Cobrador: perdeu, o pó é confiscado. Contra o rival numa mina:
// ganhou, a mina é sua; perdeu, acabou o fôlego do dia.
export function duel(st, kind, ok, mine) {
  if (kind === 'cobrador') return ok ? st : { ...st, dust: 0 };
  return ok ? { ...st, owner: { ...st.owner, [mine]: 'buck' } } : { ...st, mp: 0 };
}

// Argumentos do duelo: cada carta já achada nesta era elimina uma alternativa errada (até 2).
export const hints = (map, st) => Math.min(2, anchors(map, st));

// Casa de Fundição: o pó vira ouro de verdade (o Quinto sai na economia do jogo).
export const smelt = (st) => ({ st: { ...st, dust: 0 }, amount: st.dust });

// Anda um agente até `budget` pontos rumo ao alvo.
function walk(map, a, target, budget) {
  const p = path(map, [a.x, a.y], target) || [];
  const g = grid(map);
  let { x, y } = a;
  for (const [nx, ny] of p) { const c = g.cost(nx, ny); if (budget < c) break; budget -= c; x = nx; y = ny; }
  return { ...a, x, y };
}
const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// Fim do dia: minas rendem, rivais agem, pontos de movimento voltam.
// opts.santo = o jogador tem um Santo do Pau Oco (protege o pó uma vez).
export function endDay(map, st, opts = {}) {
  const events = [];
  let s = { ...st, agents: { ...st.agents }, owner: { ...st.owner } };
  const mines = map.objects.filter((o) => o.type === 'mina');
  const income = mines.filter((m) => s.owner[m.id] === 'buck').reduce((t, m) => t + m.income, 0);
  if (income) { s.dust += income; events.push({ type: 'income', amount: income }); }

  for (const def of map.agents) {
    let a = { ...s.agents[def.id] };
    if (a.rest > 0) { a.rest--; s.agents[def.id] = a; continue; }
    if (def.ai === 'cobrador') {
      // Fareja pó não fundido por perto; sem pó, volta para a Casa de Fundição.
      const hunting = s.dust >= def.minDust && dist(a, s) <= def.smell;
      a = walk(map, a, hunting ? [s.x, s.y] : [def.x, def.y], def.mp);
      if (dist(a, s) <= 1 && s.dust > 0) {
        // Santo do Pau Oco esconde o pó; sem ele, a tela abre um duelo de saber (quiz).
        events.push(opts.santo ? { type: 'santo', who: def.id, saved: s.dust } : { type: 'duelo', who: def.id, amount: s.dust });
        a = { x: def.x, y: def.y, rest: 1 }; // volta para a Fundição e descansa um dia
      }
    } else if (def.ai === 'rival') {
      // Vai para a mina mais próxima que ainda não é dele e fica com ela.
      const free = mines.filter((m) => s.owner[m.id] !== def.id).sort((m, n) => dist(a, m) - dist(a, n));
      if (free.length) {
        a = walk(map, a, [free[0].x, free[0].y], def.mp);
        const on = free.find((m) => m.x === a.x && m.y === a.y);
        if (on) { const was = s.owner[on.id]; s.owner[on.id] = def.id; events.push({ type: 'claim', who: def.id, mine: on.id, from: was || null }); }
      }
    }
    s.agents[def.id] = a;
  }
  s.day += 1;
  s.mp = map.mp;
  return { st: s, events };
}
