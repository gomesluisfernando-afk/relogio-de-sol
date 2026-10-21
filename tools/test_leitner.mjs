// node tools/test_leitner.mjs  → falha se a repetição espaçada quebrar.
import assert from 'node:assert/strict';
import { isDue, grade, pick } from '../src/leitner.js';

assert.equal(isDue(undefined, 1), true, 'card novo está vencido');
let e = grade(undefined, true, 1);
assert.deepEqual(e, { box: 2, last: 1 }, 'acerto no card novo vai para a caixa 2');
assert.equal(isDue(e, 2), false, 'caixa 2 não volta na sessão seguinte');
assert.equal(isDue(e, 3), true, 'caixa 2 volta duas sessões depois');
e = grade({ box: 5, last: 1 }, true, 2);
assert.equal(e.box, 5, 'caixa 5 é o teto');
assert.equal(grade({ box: 4, last: 1 }, false, 2).box, 1, 'erro volta para a caixa 1');

const boxes = { A: { box: 3, last: 1 }, B: { box: 1, last: 1 }, C: { box: 1, last: 5 } };
assert.equal(pick(['A', 'B', 'C'], boxes, 5), 'B', 'prefere vencido e caixa mais baixa');
assert.equal(pick([], boxes, 5), null);
assert.ok(['A', 'B', 'C'].includes(pick(['A', 'B', 'C'], boxes, 1)), 'sem vencidos, ainda escolhe alguém');
console.log('leitner ok');
