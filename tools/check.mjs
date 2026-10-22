// Verificador do Relógio de Sol v2: node tools/check.mjs
// Confere conteúdo, mapas, minigames, imagens, cache offline e os critérios do motor (sem turnos).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const rd = (f) => readFileSync(new URL(f, root), 'utf8');
const has = (f) => existsSync(new URL(f, root));
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

// 1. sintaxe de todo o JS do jogo
for (const f of ['game.js', 'minis.js', 'world.js', 'sw.js', 'content.data.js', ...readdirSync(new URL('maps/', root)).map((m) => 'maps/' + m)]) {
  try { execFileSync(process.execPath, ['--check', new URL(f, root).pathname.replace(/^\/([A-Z]:)/, '$1')], { stdio: 'pipe' }); } catch (e) { err(`${f}: erro de sintaxe\n${e.stderr}`); }
}

// 2. content.data.js em dia com data/*.json
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(rd('content.data.js'), ctx);
const RAW = ctx.window.CONTENT_RAW;
const fresh = JSON.parse(rd('data/cards_fase1.json'));
if (RAW.cards.length !== fresh.length || JSON.stringify(RAW.cards) !== JSON.stringify(fresh)) err('content.data.js desatualizado: rode node tools/build_content.mjs');
const CARD = Object.fromEntries(RAW.cards.map((c) => [c.id, c]));

// 3. mapas
for (const f of readdirSync(new URL('maps/', root))) vm.runInContext(rd('maps/' + f), ctx);
const MAPS = ctx.window.MAPS;
const miniKeys = [...rd('minis.js').matchAll(/return \{ ([a-z, ]+) \};\r?\n\}\)\(\);/g)][0]?.[1].split(',').map((s) => s.trim()) || [];
const QUESTS = new Set(RAW.quests.map((q) => q.id));
const ERAS = new Set(RAW.eras.map((e) => e.id));
for (const [id, M] of Object.entries(MAPS)) {
  if (!ERAS.has(M.era)) err(`${id}: era ${M.era} não existe`);
  if (!M.pois[M.start]) err(`${id}: start sem POI`);
  if (id !== 'hoje' && !M.pois.portal) err(`${id}: sem portal`);
  for (const n of M.npcs || []) {
    if (n.at && !M.pois[n.at]) err(`${id}: NPC ${n.id} em POI inexistente ${n.at}`);
    if (n.quest && !QUESTS.has(n.quest)) err(`${id}: quest ${n.quest} não existe`);
    if (n.mini && !(M.minis || []).some((x) => x.id === n.mini)) err(`${id}: NPC ${n.id} aponta para mini ${n.mini} fora do mapa`);
  }
  for (const mi of M.minis || []) { if (mi.at && !M.pois[mi.at]) err(`${id}: mini ${mi.id} em POI inexistente`); if (!miniKeys.includes(mi.id)) err(`${id}: mini ${mi.id} não existe em minis.js`); if (!mi.at && !(M.npcs || []).some((n) => n.mini === mi.id)) err(`${id}: mini ${mi.id} sem lugar nem NPC`); }
  if (M.needMini && !(M.minis || []).some((x) => x.id === M.needMini)) err(`${id}: needMini ${M.needMini} sem mini`);
  for (const p of M.cobrador?.patrol || []) if (!M.pois[p]) err(`${id}: rota do Cobrador em POI inexistente ${p}`);
  for (const c of Object.keys(M.cards || {})) if (!CARD[c]) err(`${id}: card fixo ${c} não existe`);
  for (const [k, d] of Object.entries(M.doors || {})) { if (!M.pois[k]) err(`${id}: porta ${k} sem POI`); if (!MAPS[d.map]) err(`${id}: porta para mapa inexistente ${d.map}`); }
  if (M.exit && !MAPS[M.exit.map]) err(`${id}: saída para mapa inexistente`);
}
for (const e of ERAS) if (e !== 'prologo' && !MAPS[e]) err(`era ${e} sem mapa`);
for (const e of ERAS) if (e !== 'prologo' && !MAPS.hoje.holes[e]) err(`era ${e} sem buraco no Hoje`);

// 4. imagens: cards, eras, retratos, fundos citados no código
for (const c of RAW.cards) if (!has('assets/img/' + c.image)) err(`${c.id}: imagem ${c.image} não existe`);
for (const e of RAW.eras) if (!has('assets/img/' + e.iconImg)) err(`era ${e.id}: ícone não existe`);
for (const c of RAW.chars) if (!has(`img/p_${c.id}.png`)) err(`retrato img/p_${c.id}.png não existe`);
for (const m of rd('game.js').matchAll(/'(assets\/img\/scenes\/[^']+)'/g)) if (!has(m[1])) err(`game.js cita ${m[1]} que não existe`);
for (const m of rd('minis.js').matchAll(/'(assets\/img\/[^']+)'/g)) if (!has(m[1])) err(`minis.js cita ${m[1]} que não existe`);
for (const m of rd('minis.js').matchAll(/'(img\/bg_[^']+)'/g)) if (!has(m[1])) warn(`fundo ${m[1]} ainda não existe (usa o plano B)`);

// 5. cache offline cobre o essencial
const sw = rd('sw.js');
for (const f of ['index.html', 'game.js', 'minis.js', 'world.js', 'content.data.js', 'maps/hoje.js', 'maps/eras.js']) if (!sw.includes(`'${f}'`)) err(`sw.js não guarda ${f}`);

// 6. critérios do motor: tempo real, conteúdo histórico nos dados
const code = rd('game.js') + rd('minis.js');
for (const bad of ['day', 'turn', 'mp', 'night']) if (new RegExp(`\\b(let|const|var)\\s+${bad}\\b|\\.${bad}\\b`).test(code)) err(`variável proibida no motor: ${bad}`);

for (const c of RAW.cards) for (const n of c.conferir || []) warn(`conferir: ${c.id} - ${n}`);

// 7. mundo aberto (world.js): NPCs, missões paralelas, itens, folclore, coleções
vm.runInContext(rd('world.js'), ctx);
const WD = ctx.window.WORLD;
const ITEMS = new Set([...Object.keys(WD.items), ...RAW.items.map((i) => i.id)]);
const npcIds = (m) => [...(MAPS[m]?.npcs || []).map((n) => n.id), ...(WD.npcs[m] || []).map((n) => n.id)];
for (const [m, list] of Object.entries(WD.npcs)) {
  if (!MAPS[m]) err(`world: mapa ${m} não existe`);
  for (const n of list) {
    if (n.at && !MAPS[m]?.pois[n.at]) err(`world: NPC ${n.id} em POI inexistente ${n.at}`);
    if (!n.at && !n.xy) err(`world: NPC ${n.id} sem lugar`);
    if (!WD.pal[n.id]) err(`world: NPC ${n.id} sem paleta`);
    if (!WD.names[n.id]) err(`world: NPC ${n.id} sem nome`);
    for (const it of n.vendor || []) if (!ITEMS.has(it)) err(`world: ${n.id} vende item inexistente ${it}`);
    for (const q of n.side || []) if (!WD.side[q]) err(`world: ${n.id} aponta para missão inexistente ${q}`);
    for (const c of n.conferir || []) warn(`conferir: world ${c}`);
  }
}
for (const [k, a] of Object.entries(WD.attach)) {
  const [m, nid] = k.split(':');
  if (!npcIds(m).includes(nid)) err(`world: anexo ${k} sem NPC no mapa`);
  for (const it of a.vendor || []) if (!ITEMS.has(it)) err(`world: ${k} vende item inexistente ${it}`);
  for (const q of a.side || []) if (!WD.side[q]) err(`world: ${k} aponta para missão inexistente ${q}`);
}
for (const [q, d] of Object.entries(WD.side)) {
  if (!MAPS[d.map]) err(`world: missão ${q} em mapa inexistente`);
  if (!npcIds(d.map).includes(d.giver)) err(`world: missão ${q}: ${d.giver} não está no mapa ${d.map}`);
  if (!Object.entries(WD.npcs).some(([m, l]) => l.some((n) => (n.side || []).includes(q))) && !Object.values(WD.attach).some((a) => (a.side || []).includes(q))) err(`world: missão ${q} sem NPC que a ofereça`);
  for (const it of Object.keys(d.reward?.items || {})) if (!ITEMS.has(it)) err(`world: missão ${q} dá item inexistente ${it}`);
  if (d.after && !WD.side[d.after]) err(`world: missão ${q} depende de ${d.after}, que não existe`);
  if (d.afterQuest && !QUESTS.has(d.afterQuest)) err(`world: missão ${q} depende da quest ${d.afterQuest}, que não existe`);
  for (const c of d.conferir || []) warn(`conferir: world ${c}`);
}
for (const f of WD.folk) { for (const m of f.maps) { if (!MAPS[m]) err(`world: folclore ${f.id} em mapa inexistente ${m}`); if (!Array.isArray(f.xy) && !f.xy[m]) err(`world: folclore ${f.id} sem posição em ${m}`); } if (!WD.names[f.id]) err(`world: folclore ${f.id} sem nome`); }
for (const st of WD.sets) for (const it of st.list || []) if (!ITEMS.has(it)) err(`world: coleção ${st.id} pede item inexistente ${it}`);
for (const [id, it] of Object.entries(WD.items)) if (!WD.rarity[it.rarity]) err(`world: item ${id} com raridade desconhecida`);
for (const c of WD.conferir || []) warn(`conferir: world ${c}`);
console.log(`${RAW.cards.length} cards · ${Object.keys(MAPS).length} mapas · ${miniKeys.length} minigames · ${RAW.quests.length} quests`);
for (const w of warns) console.log('aviso:', w);
if (errors.length) { for (const e of errors) console.log('ERRO:', e); process.exit(1); }
console.log('tudo ok');
