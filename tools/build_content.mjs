// Gera content.data.js a partir de data/*.json (os JSONs continuam sendo a fonte de verdade).
// Assim o jogo abre até por file://, sem fetch. Rodar depois de editar qualquer JSON:
//   node tools/build_content.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const j = (f) => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const story = j('story.json');
const raw = {
  cards: j('cards_fase1.json'),
  eras: j('eras.json'),
  chars: j('characters.json'),
  quests: j('quests.json'),
  quizzes: j('quizzes.json'),
  items: j('items.json'),
  expressions: j('expressions.json'),
  achievements: j('achievements.json'),
  tour: j('tours/tiradentes.json'),
  chapters: story.chapters.map((c) => ({ ...c, scenes: j(c.file).scenes })),
};
writeFileSync(new URL('../content.data.js', import.meta.url),
  `// GERADO por tools/build_content.mjs — não editar à mão; edite data/*.json.\nwindow.CONTENT_RAW = ${JSON.stringify(raw)};\n`);
console.log('content.data.js:', Object.entries(raw).map(([k, v]) => `${k} ${Array.isArray(v) ? v.length : Object.keys(v).length}`).join(' · '));
