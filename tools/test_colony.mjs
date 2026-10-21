// node tools/test_colony.mjs  → falha se a Capitania quebrar.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newGame, canBuild, build, endTurn, nextAge } from '../src/colony-logic.js';

const cfg = JSON.parse(await readFile(new URL('../data/colony.json', import.meta.url), 'utf8'));
const B = (id) => cfg.buildings.find((b) => b.id === id);

let st = newGame(cfg);
assert.equal(canBuild(st, cfg, B('engenho')), 'age', 'engenho precisa da Age II');
assert.equal(canBuild(st, cfg, B('roca')), null, 'roça pode na Age I');
st = build(st, cfg, 'roca');
assert.equal(st.res.pau, 2, 'roça custa 2 de pau-brasil');

let r = endTurn(st, cfg);
assert.equal(r.st.year, 1510);
assert.equal(r.st.res.pau, 2 + 3, 'feitoria produz 3');
assert.equal(nextAge(r.st, cfg), null, 'Age II só em 1530');

// Ouro: Quinto de 20%; depois de 1720 sem Casa de Fundição, 30%.
st = { ...newGame(cfg), year: 1700, age: 'ouro', buildings: ['lavra', 'lavra'], res: { pau: 0, acucar: 0, ouro: 0, comida: 50 } };
r = endTurn(st, cfg);
assert.equal(r.report.quinto, 2, '20% de 10');
assert.equal(r.st.res.ouro, 8);
st = { ...r.st, year: 1730 };
r = endTurn(st, cfg);
assert.equal(r.report.rate, 0.3, 'multa sem fundição');

// Fome: sem comida, a população cai.
st = { ...newGame(cfg), pop: 6, res: { pau: 0, acucar: 0, ouro: 0, comida: 0 } };
r = endTurn(st, cfg);
assert.equal(r.report.hunger, true);
assert.equal(r.st.pop, 5);

// Evento de 1785: o alvará fecha as tecelagens.
st = { ...newGame(cfg), year: 1780, age: 'apogeu', buildings: ['tecelagem', 'roca'], res: { pau: 0, acucar: 0, ouro: 0, comida: 20 } };
r = endTurn(st, cfg);
assert.ok(!r.st.buildings.includes('tecelagem'), 'alvará removeu a tecelagem');

// Meta das 100 arrobas: falta vira dívida.
st = { ...newGame(cfg), year: 1755, flags: { meta: 10 }, buildings: [], res: { pau: 0, acucar: 0, ouro: 0, comida: 20 } };
r = endTurn(st, cfg);
assert.equal(r.st.debt, 10);

// Teto de população: sem chafariz, uma vila sustenta até 16.
st = { ...newGame(cfg), pop: 15, buildings: ['vila'], res: { pau: 0, acucar: 0, ouro: 0, comida: 50 } };
assert.equal(endTurn(st, cfg).st.pop, 16);

// 1750: a capitação acaba quando entra a meta.
st = { ...newGame(cfg), year: 1745, flags: { capitacao: true }, res: { pau: 0, acucar: 0, ouro: 0, comida: 20 } };
assert.equal(endTurn(st, cfg).st.flags.capitacao, false);

// Fim em 1792.
st = { ...newGame(cfg), year: 1790, res: { pau: 0, acucar: 0, ouro: 0, comida: 20 } };
assert.equal(endTurn(st, cfg).st.over, true);
console.log('capitania ok');
