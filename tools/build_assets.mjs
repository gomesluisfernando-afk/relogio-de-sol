// Gera assets.data.js: a lista das imagens de arte que existem de verdade (kit de UI, ícones, sprites, props, mapas).
// O jogo só pede ao servidor o que está nesta lista: nada de erro 404 nem de dado gasto à toa no celular.
// Rodar depois de colocar imagens novas em assets/{ui,icons,sprites,props,maps}/:  node tools/build_assets.mjs
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
export const DIRS = ['ui', 'icons', 'sprites', 'props', 'maps'];
export function listArt() {
  const out = [];
  for (const d of DIRS) {
    const dir = new URL(`assets/${d}/`, root);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) if (/\.(webp|png|jpg)$/.test(f)) out.push(`assets/${d}/${f}`);
  }
  return out;
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const list = listArt();
  writeFileSync(new URL('assets.data.js', root), `// GERADO por tools/build_assets.mjs — não editar à mão.\nwindow.ASSETS = ${JSON.stringify(list, null, 0)};\n`);
  console.log(`assets.data.js: ${list.length} imagens de arte`);
}
