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
// O cache offline (sw.js) precisa listar todo JSON de dados e todo arquivo precisa existir.
const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const cached = [...sw.matchAll(/'([^']+\.[a-z]+)'/g)].map((m) => m[1]);
const index = await get('index.json');
const dataFiles = ['index.json', ...index.phases.flatMap((p) => [p.eras, p.cards, ...p.tours]), ...Object.values(index.shared), ...c.chapters.filter((ch) => ch.file).map((ch) => ch.file)];
for (const f of dataFiles) if (!cached.includes('data/' + f)) errors.push(`sw.js não guarda data/${f} para offline`);
const { readdir } = await import('node:fs/promises');
for (const f of await readdir(new URL('../src', import.meta.url), { recursive: true }))
  if (f.endsWith('.js') && !cached.includes('src/' + f.replaceAll('\\', '/'))) errors.push(`sw.js não guarda src/${f} para offline`);
for (const f of cached) await readFile(new URL('../' + f, import.meta.url)).catch(() => errors.push(`sw.js lista ${f}, que não existe`));
for (const e of errors) console.log('ERRO:', e);
process.exit(errors.length ? 1 : 0);
