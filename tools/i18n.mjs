// Línguas: junta todo texto que aparece na tela (como o xgettext do .po) e mantém i18n/<língua>.json em dia.
//   node tools/i18n.mjs          → acrescenta textos novos (tradução vazia), tira os que sumiram, gera lang.data.js
//   node tools/i18n.mjs --falta en  → lista o que falta traduzir em inglês (en, es ou pt)
// A chave é o texto original. Valor vazio = ainda sem tradução (o jogo mostra o original).
// Em pt.json só se preenchem os textos que nasceram em outra língua (as falas em inglês do Buck, por exemplo).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
export const LANGS = ['en', 'es', 'pt'];
const JS = ['game.js', 'minis.js', 'world.js', 'cutscenes.js', 'maps/eras.js', 'maps/hoje.js'];

// ---- é texto de tela? (ids, cores, caminhos, nomes de fonte e de som ficam de fora) ----
const SHAPES = /^(circle|square|triangle|diamond|rect):/;
export function isText(s) {
  s = s.trim();
  if (SHAPES.test(s)) return isText(s.replace(SHAPES, '')); // 'forma:legenda' da fala
  if (!/\p{L}/u.test(s)) return false; // sem letra: número, emoji, símbolo
  if (/^#[0-9a-f]{3,8}$/i.test(s) || /^rgba?\(/.test(s) || /^hsla?\(/.test(s)) return false;
  if (/^[a-z0-9_\-.\/:]+$/.test(s)) return false; // id, chave, arquivo, nome de som
  if (/^[\w\-.\/]+\.(png|webp|jpg|mp3|mp4|js|json|woff2?)$/i.test(s)) return false;
  if (/^(\d+ )?\d*px |^\d+px$|sans-serif|^800 /.test(s)) return false; // fonte
  if (/^[a-z]+[A-Z]\w*$/.test(s)) return false; // camelCase
  if (/^(Arrow\w+|Enter|Escape|Backspace|Tab|Shift)$/.test(s)) return false; // nomes de tecla
  if (s === 'use strict' || /^\(?[a-z-]+[(:]/.test(s) || /^[A-G]#$/.test(s) || s === 'ABCDEFGH' || s === 'NFD' || s.startsWith('ArrowUp,') || s === 'Arrow' || /^[a-z]+\.[a-z]+: /.test(s) || /^[#o.\s]+$/.test(s) || /^[PG]+$/.test(s) || /^\{\d\}T\d/.test(s)) return false; // CSS, notas musicais, letras de opção
  if (/^[A-Z]{1,4}\d+$/.test(s) || /^[A-Z]{2,}-[\w-]+$/.test(s)) return false; // id de card, pergunta, missão (C08, Q12, SQ-quitanda)
  return true;
}

// ---- leitor de JS mínimo: strings '…' "…" e modelos `…${x}…` (vira "…{0}…"), pulando comentários e regex ----
export function jsStrings(src) {
  const out = [];
  let i = 0, prev = '';
  const n = src.length;
  const readQuoted = (q) => { let s = ''; i++; while (i < n && src[i] !== q) { if (src[i] === '\\') { s += unesc(src[i + 1]); i += 2; } else s += src[i++]; } i++; return s; };
  const unesc = (c) => ({ n: '\n', t: '\t', "'": "'", '"': '"', '`': '`', '\\': '\\' }[c] ?? c);
  function readTpl() { // devolve [texto com {n}, partes]
    let s = '', k = 0; i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { s += unesc(src[i + 1]); i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2; let depth = 1;
        while (i < n && depth) {
          const c = src[i];
          if (c === "'" || c === '"') { const inner = readQuoted(c); if (isText(inner)) out.push(inner); continue; }
          if (c === '`') { const [t] = readTpl(); if (isText(t.replace(/\{\d\}/g, ''))) out.push(t); continue; }
          if (c === '{') depth++; else if (c === '}') depth--;
          i++;
        }
        s += `{${k++}}`; continue;
      }
      s += src[i++];
    }
    i++; return [s, k];
  }
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === '/' && (/[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || prev === '' || /\breturn$/.test(src.slice(Math.max(0, i - 8), i).trimEnd()))) { // regex
      i++; let cls = false;
      while (i < n) { const d = src[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; else if (d === '\n') break; i++; }
      i++; while (/[a-z]/.test(src[i])) i++; prev = 'a'; continue;
    }
    if (src.startsWith('conferir', i) && /^conferir\s*[:=]\s*\[/.test(src.slice(i, i + 20))) { // fatos a conferir: não vão para a tela
      i = src.indexOf('[', i) + 1; let depth = 1;
      while (i < n && depth) { const d = src[i]; if (d === "'" || d === '"') { readQuoted(d); continue; } if (d === '`') { readTpl(); continue; } if (d === '[') depth++; else if (d === ']') depth--; i++; }
      prev = 'a'; continue;
    }
    if (c === "'" || c === '"') { const s = readQuoted(c); if (isText(s)) out.push(s); prev = 'a'; continue; }
    if (c === '`') { const [s] = readTpl(); if (isText(s.replace(/\{\d\}/g, ''))) out.push(s); prev = 'a'; continue; }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}

// ---- conteúdo (data/*.json via content.data.js): toda string de texto, menos os campos de id ----
const SKIP = new Set(['id', 'era', 'img', 'image', 'file', 'sprite', 'icon', 'type', 'status', 'tone', 'who', 'cardId', 'cards', 'bg', 'color', 'prop', 'mood', 'pal', 'at', 'mini', 'requires', 'unlock', 'next', 'audio', 'video', 'clip', 'voice', 'portrait', 'map']);
// grupos e campos que a v2 não mostra (a História em capítulos, conquistas e Capitania eram da v1)
const FORA_GRUPO = new Set(['chapters', 'achievements', 'colony']);
const FORA_CAMPO = new Set(['bullets', 'usa', 'usaTitle', 'keyword', 'notes', 'characters', 'conferir', 'visual', 'function', 'kind', 'face']);
function contentStrings() {
  const g = {}; new Function('window', read('content.data.js'))(g);
  const out = [];
  (function walk(v, key) {
    if (typeof v === 'string') { if (!SKIP.has(key) && !FORA_CAMPO.has(key) && isText(v)) out.push(v); return; }
    if (Array.isArray(v)) return v.forEach((x) => walk(x, key));
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  })(Object.fromEntries(Object.entries(g.CONTENT_RAW).filter(([k]) => !FORA_GRUPO.has(k))), '');
  return out;
}

export function collect() {
  const seen = new Map(); // texto → arquivo onde apareceu primeiro
  const add = (s, f) => {
    const m = SHAPES.exec(s); if (m) s = s.slice(m[0].length); // 'forma:legenda' → só a legenda
    for (const p of s.includes('\n') ? [s, ...s.split('\n')] : [s]) if (isText(p) && !seen.has(p)) seen.set(p, f);
  };
  for (const s of contentStrings()) add(s, 'data');
  for (const f of JS) for (const s of jsStrings(read(f))) add(s, f);
  add('Relógio de Sol', 'index.html');
  return seen;
}

const file = (l) => new URL(`i18n/${l}.json`, ROOT);
export const loadLang = (l) => (existsSync(file(l)) ? JSON.parse(readFileSync(file(l), 'utf8')) : {});

export function sync({ quiet } = {}) {
  const keys = collect();
  if (!existsSync(new URL('i18n/', ROOT))) mkdirSync(new URL('i18n/', ROOT));
  const data = {}, report = [];
  for (const l of LANGS) {
    const old = loadLang(l), next = {};
    for (const k of keys.keys()) next[k] = old[k] ?? '';
    for (const [k, v] of Object.entries(old)) if (!(k in next) && k.startsWith('@ ')) next[k] = v; // "@ texto": entrada à mão (texto que só existe em tempo de jogo)
    const gone = Object.keys(old).filter((k) => !(k in next));
    writeFileSync(file(l), JSON.stringify(next, null, 1) + '\n');
    const used = Object.fromEntries(Object.entries(next).filter(([, v]) => v).map(([k, v]) => [k.replace(/^@ /, ''), v]));
    data[l] = used;
    report.push({ l, total: Object.keys(next).length, feitos: Object.keys(used).length, gone });
  }
  writeFileSync(new URL('lang.data.js', ROOT), `// GERADO por tools/i18n.mjs — não editar à mão; edite i18n/<língua>.json.\nwindow.LANG_DATA = ${JSON.stringify(data)};\n`);
  if (!quiet) for (const r of report) console.log(`${r.l}: ${r.feitos} de ${r.total} traduzidos${r.gone.length ? ` · ${r.gone.length} textos antigos removidos` : ''}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('i18n.mjs')) {
  const a = process.argv.indexOf('--falta');
  if (a > 0) {
    const l = process.argv[a + 1] || 'en', d = loadLang(l);
    const miss = Object.entries(d).filter(([, v]) => !v).map(([k]) => k);
    console.log(miss.join('\n')); console.error(`${miss.length} sem tradução em ${l}`);
  } else sync();
}
