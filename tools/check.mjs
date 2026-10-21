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
const cached = [...sw.matchAll(/'([^']+\.[a-z0-9]+)'/g)].map((m) => m[1]);
const index = await get('index.json');
const dataFiles = ['index.json', ...index.phases.flatMap((p) => [p.eras, p.cards, ...p.tours]), ...Object.values(index.shared), ...c.chapters.filter((ch) => ch.file).map((ch) => ch.file)];
for (const f of dataFiles) if (!cached.includes('data/' + f)) errors.push(`sw.js não guarda data/${f} para offline`);
// Toda imagem citada nos dados precisa existir e estar no cache offline.
// (imagens de card e ícones de era o sw.js lê dos JSON; aqui basta existirem)
const images = [...c.characters.map((x) => x.image), ...c.chapters.flatMap((ch) => (ch.scenes || []).flatMap((s) => [s.bg?.image, s.bg?.before, s.map]))].filter(Boolean);
const dynamic = new Set([...c.cards.map((k) => k.image), ...c.eras.map((e) => e.iconImg)]);
for (const img of new Set(images)) {
  if (!dynamic.has(img) && !cached.includes('assets/img/' + img)) errors.push(`sw.js não guarda assets/img/${img} para offline`);
}
for (const img of [...c.cards.map((k) => k.image), ...c.eras.map((e) => e.iconImg)].filter(Boolean))
  await readFile(new URL('../assets/img/' + img, import.meta.url)).catch(() => errors.push(`imagem ${img} não existe`));
for (const k of c.cards) if (!k.image) warnings.push(`${k.id}: sem imagem`);
// Vídeos citados nas cenas: precisam existir e estar no cache offline.
for (const v of new Set(c.chapters.flatMap((ch) => (ch.scenes || []).flatMap((s) => [s.bg?.video, s.video])).filter(Boolean))) {
  await readFile(new URL('../assets/' + v, import.meta.url)).catch(() => errors.push(`vídeo ${v} não existe`));
  if (!cached.includes('assets/' + v)) errors.push(`sw.js não guarda assets/${v} para offline`);
}
const { readdir } = await import('node:fs/promises');
for (const f of await readdir(new URL('../src', import.meta.url), { recursive: true }))
  if (f.endsWith('.js') && !cached.includes('src/' + f.replaceAll('\\', '/'))) errors.push(`sw.js não guarda src/${f} para offline`);
for (const f of cached) await readFile(new URL('../' + f, import.meta.url)).catch(() => errors.push(`sw.js lista ${f}, que não existe`));
// Tradução para inglês: ids válidos, mesmas chaves de interface.
const { validateOverlay } = await import('../src/content.js');
errors.push(...validateOverlay(c, await get('en.json')));
const ptUi = JSON.parse(await readFile(new URL('../i18n/pt.json', import.meta.url), 'utf8'));
const enUi = JSON.parse(await readFile(new URL('../i18n/en.json', import.meta.url), 'utf8'));
for (const k of Object.keys(ptUi)) if (!(k in enUi)) errors.push(`i18n/en.json sem a chave "${k}"`);
if (!cached.includes('data/en.json') || !cached.includes('i18n/en.json')) errors.push('sw.js não guarda a tradução para offline');

// Erro de sintaxe em qualquer arquivo do jogo trava tudo em "Carregando…".
const { execFileSync } = await import('node:child_process');
for (const f of await readdir(new URL('../src', import.meta.url), { recursive: true })) {
  if (!f.endsWith('.js')) continue;
  try { execFileSync(process.execPath, ['--check', new URL('../src/' + f.replaceAll('\\', '/'), import.meta.url).pathname.replace(/^\/(\w:)/, '$1')], { stdio: 'pipe' }); }
  catch (err) { errors.push(`sintaxe em src/${f}: ${String(err.stderr).split('\n').find((l) => l.includes('Error')) || 'erro'}`); }
}
for (const e of errors) console.log('ERRO:', e);
process.exit(errors.length ? 1 : 0);
