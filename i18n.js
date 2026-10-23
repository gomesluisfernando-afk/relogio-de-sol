// Línguas do jogo. O texto original (quase sempre em português) é a própria chave, como no gettext (.po):
// i18n/<língua>.json traz { "texto original": "tradução" } e o jogo traduz na hora de desenhar (draw/wrap em game.js).
// Sem tradução, aparece o original. Textos montados com variáveis viram modelos: "Missão extra: {0}".
// Editou um texto? `node tools/i18n.mjs` atualiza os arquivos e o lang.data.js (o que o jogo carrega).
window.I18N = (() => {
  const LANGS = [
    { id: 'pt', name: 'Português', html: 'pt-BR' },
    { id: 'en', name: 'English', html: 'en' },
    { id: 'es', name: 'Español', html: 'es' },
  ];
  const DATA = window.LANG_DATA || {};
  const KEY = 'relogio-lang';
  let lang = 'pt';
  try { const s = localStorage.getItem(KEY); if (LANGS.some((l) => l.id === s)) lang = s; } catch (e) {}
  const chosen = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };

  // por língua: dicionário exato, modelos com {n} (compilados uma vez) e um cache do que já foi traduzido
  const PACK = {};
  function pack(id) {
    if (PACK[id]) return PACK[id];
    const dict = new Map(), up = new Map(), tpl = [];
    for (const [k, v] of Object.entries(DATA[id] || {})) {
      if (!v) continue;
      dict.set(k, v); up.set(k.toUpperCase(), v.toUpperCase());
      if (/\{\d\}/.test(k)) {
        const re = new RegExp('^' + k.split(/(\{\d\})/).map((p) => (/^\{\d\}$/.test(p) ? '([\\s\\S]+?)' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('') + '$');
        const order = [...k.matchAll(/\{(\d)\}/g)].map((m) => +m[1]);
        tpl.push({ re, v, order, lit: k.replace(/\{\d\}/g, '').length });
      }
    }
    tpl.sort((a, b) => b.lit - a.lit); // o modelo mais específico primeiro
    return (PACK[id] = { dict, up, tpl, cache: new Map() });
  }

  // L(s): devolve s na língua atual (ou s mesmo, se não houver tradução)
  function L(s) {
    if (typeof s !== 'string' || !s) return s;
    const P = pack(lang);
    if (!P.dict.size) return s;
    const hit = P.cache.get(s);
    if (hit !== undefined) return hit;
    let out = P.dict.get(s);
    if (out === undefined && s === s.toUpperCase()) out = P.up.get(s);
    if (out === undefined) {
      const t = s.trim();
      if (t !== s && t) { const r = L(t); if (r !== t) out = s.replace(t, r); } // espaços nas pontas
    }
    if (out === undefined) for (const m of P.tpl) {
      const r = m.re.exec(s);
      if (!r) continue;
      out = m.v.replace(/\{(\d)\}/g, (_, n) => { const i = m.order.indexOf(+n); return i < 0 ? '' : L(r[i + 1]); });
      break;
    }
    if (out === undefined) { out = s; if (window.I18N_MISS) window.I18N_MISS.add(s); } // ?test=1 junta o que faltou
    if (P.cache.size > 6000) P.cache.clear();
    P.cache.set(s, out);
    return out;
  }
  // T('Você ganhou {0} de ouro', n): modelo explícito, quando o texto é montado no código
  const T = (s, ...a) => {
    const out = L(s).replace(/\{(\d)\}/g, (_, n) => (a[n] === undefined ? '' : L(String(a[n]))));
    pack(lang).cache.set(out, out); // já traduzido: o draw não procura de novo
    return out;
  };

  function set(id) {
    if (!LANGS.some((l) => l.id === id)) return;
    lang = id;
    try { localStorage.setItem(KEY, id); } catch (e) {}
    document.documentElement.lang = LANGS.find((l) => l.id === id).html;
    document.title = L('Relógio de Sol');
  }
  document.documentElement.lang = LANGS.find((l) => l.id === lang).html;

  const keep = (s) => { if (typeof s === 'string') pack(lang).cache.set(s, s); return s; }; // texto já na língua certa
  return { LANGS, L, T, set, chosen, keep, get lang() { return lang; } };
})();
