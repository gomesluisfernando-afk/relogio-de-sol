// node tools/test_economy.mjs  → falha se o Quinto, a meta ou a Derrama quebrarem.
import assert from 'node:assert/strict';
import { earn, miss, give } from '../src/economy.js';

let r = earn({}, 10);
assert.equal(r.net, 8, '20% de 10 = 2 de Quinto');
assert.equal(r.eco.paid, 2);

r = earn(give({}, 'santo'), 50);
assert.equal(r.quinto, 0, 'o santo esconde o Quinto');
assert.equal(r.hid, true);
assert.deepEqual(r.eco.items, [], 'o santo é gasto');

r = earn({ yearPaid: 95, year: 1 }, 50);
assert.equal(r.newYear, true, 'bater a meta vira o ano');
assert.equal(r.eco.year, 2);
assert.equal(r.eco.yearPaid, 5);

let m = miss({ gold: 100 }, 3);
assert.equal(m.derrama, null);
assert.equal(m.streak, 4);
m = miss({ gold: 100 }, 4);
assert.deepEqual(m.derrama, { gold: 30 }, 'sem itens, a Derrama leva 30% do ouro');
assert.equal(m.eco.gold, 70);
assert.equal(m.streak, 0);
m = miss({ gold: 100, items: ['turmalina', 'carta-tj'] }, 4);
assert.deepEqual(m.derrama, { item: 'carta-tj' }, 'com itens, leva o mais recente');
assert.deepEqual(m.eco.items, ['turmalina']);
console.log('economia ok');
