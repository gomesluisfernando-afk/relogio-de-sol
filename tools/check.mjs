// node tools/check.mjs  → valida todo o /data e sai com código 1 se houver erro.
import { readFile } from 'node:fs/promises';
import { assemble, validate } from '../src/content.js';

const get = async (f) => JSON.parse(await readFile(new URL('../data/' + f, import.meta.url), 'utf8'));
const c = await assemble(await get('index.json'), get);
const { errors, warnings, conferir } = validate(c);

const usa = c.cards.filter((k) => k.usa).length;
console.log(`${c.cards.length} cards · ${c.eras.length} eras · ${c.tours[0].stops.length} paradas · ${c.expressions.length} expressões · ${c.characters.length} personagens · ${usa} conexões EUA`);
console.log('fora do tour:', c.cards.filter((k) => !k.tourStops.length).map((k) => k.id).join(' '));
for (const w of warnings) console.log('aviso:', w);
for (const q of conferir) console.log('conferir:', q.id, '-', q.text);
for (const e of errors) console.log('ERRO:', e);
process.exit(errors.length ? 1 : 0);
