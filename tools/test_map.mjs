// Testes do Mapa do Tempo: lógica (movimento, névoa, IA, duelos) e o mapa de dados.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { grid, newGame, path, reach, step, take, endDay, registro, smelt, duel, hints, portalOpen, isSeen } from '../src/map-logic.js';

const load = (f) => JSON.parse(readFileSync(new URL('../' + f, import.meta.url)));
const map = load('data/maps/ouro.json');
const cards = load('data/cards_fase1.json');
const quizzes = load('data/quizzes.json').map((q) => q.id);
const items = load('data/items.json').map((i) => i.id);
const byId = Object.fromEntries((cards.cards || cards).map((c) => [c.id, c]));
const g = grid(map);

// --- o mapa de dados ---
assert(map.rows.every((r) => r.length === g.W), 'linhas com larguras diferentes');
for (const o of [...map.objects, map.start, ...map.agents]) {
  assert(g.cost(o.x, o.y) < Infinity, `${o.id || 'start'} em terreno intransponível (${o.x},${o.y})`);
  assert(path(map, [map.start.x, map.start.y], [o.x, o.y]) || (o.x === map.start.x && o.y === map.start.y), `${o.id || 'start'} inalcançável`);
  if (o.card) assert(byId[o.card], `${o.id}: card ${o.card} não existe`);
  if (o.item) assert(items.includes(o.item), `${o.id}: item ${o.item} não existe`);
  for (const q of o.quizIds || []) assert(quizzes.includes(q), `${o.id}: quiz ${q} não existe`);
  if (o.to) assert(map.objects.some((p) => p.id === o.to), `${o.id}: buraco sem par`);
}
assert(map.objects.filter((o) => o.type === 'card').length >= map.goal, 'menos pistas que a meta');

// --- caminho e custo ---
const st0 = newGame(map);
assert(isSeen(st0, g, map.start.x, map.start.y) && !isSeen(st0, g, 19, 0), 'névoa inicial');
const p = path(map, [5, 16], [12, 12]);
assert(p && p.at(-1).join() === '12,12', 'caminho até o tropeiro');
assert(!path(map, [5, 16], [5, 18]), 'serra é intransponível');
// atravessar o rio só pela ponte (9,10) ou pelo vau (16,10)
const cross = path(map, [5, 16], [5, 9]);
assert(cross.some(([x, y]) => y === 10 && (x === 9 || x === 16)), 'rio só pela ponte ou vau');
assert.equal(reach(map, [[6, 15], [6, 14]], 24), 2);
assert.equal(reach(map, [[6, 15], [6, 14]], 2), 1, 'estrada custa 2');

// --- andar, pegar, fundir ---
let r = step(map, st0, [7, 15]);
assert(r.moved && r.obj?.id === 'c32' && r.st.mp === 24 - 3);
let st = take(map, r.st, r.obj);
assert(st.done.c32 && st.dust === 5);
assert.equal(take(map, st, r.obj).dust, 5, 'pista não paga duas vezes');
assert(!step(map, st, [9, 15]).moved, 'não pula casas');
const sm = smelt(st);
assert(sm.amount === 5 && sm.st.dust === 0);

// --- registro e duelos ---
assert.equal(registro({ dust: 50 }, false).paid, 10);
assert.equal(registro({ dust: 50 }, true).st.dust, 50);
assert.equal(duel({ dust: 40 }, 'cobrador', false).dust, 0);
assert.equal(duel({ dust: 40 }, 'cobrador', true).dust, 40);
assert.equal(duel({ owner: {}, mp: 9 }, 'rival', true, 'm1').owner.m1, 'buck');
assert.equal(duel({ owner: {}, mp: 9 }, 'rival', false, 'm1').mp, 0);
assert.equal(hints(map, { done: {} }), 0);
assert.equal(hints(map, { done: { c32: 1, c31: 1, c36: 1 } }), 2, 'no máximo 2 argumentos');

// --- fim do dia: renda, rival, cobrador ---
let s = { ...st0, owner: { m1: 'buck' } };
let e = endDay(map, s);
assert(e.st.dust === 6 && e.st.mp === map.mp && e.st.day === 2, 'mina rende e o dia vira');
// o rival anda rumo a uma mina e acaba tomando alguma
s = st0;
let claimed = false;
for (let d = 0; d < 15 && !claimed; d++) { e = endDay(map, s); s = e.st; claimed = e.events.some((x) => x.type === 'claim'); }
assert(claimed, 'rival toma uma mina em até 15 dias');
// cobrador: com pó e perto, vem cobrar (duelo); com santo, nada
s = { ...st0, x: 16, y: 5, dust: 30 };
e = endDay(map, s);
assert(e.events.some((x) => x.type === 'duelo'), 'cobrador abre duelo');
assert.equal(e.st.agents.cobrador.rest, 1);
assert(endDay(map, s, { santo: true }).events.some((x) => x.type === 'santo'), 'santo protege');
// sem pó, o cobrador não persegue
s = { ...st0, x: 16, y: 5, dust: 0 };
assert(!endDay(map, s).events.some((x) => x.type === 'duelo'));
// portal
assert(!portalOpen(map, st0));
assert(portalOpen(map, { done: Object.fromEntries(map.objects.filter((o) => o.type === 'card').slice(0, map.goal).map((o) => [o.id, 1])) }));

console.log('mapa ok');
