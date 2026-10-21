// Pequenos pedaços de interface usados por mais de um modo.
import { earn, miss, META } from './economy.js';
import { sfx } from './audio.js';
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export const tag = (t, status) => `<span class="tag s-${status}">${esc(t['status.' + status])}</span>`;

// Busca sem acento e sem maiúscula: "sao joao" acha "São João".
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Cards já abertos ("avistados"). O Treino (Bloco 4) vai marcar os "colecionados".
export function markSeen(state, id) {
  const seen = state.get('seen', []);
  if (!seen.includes(id)) state.set('seen', [...seen, id]);
}

// Card com ponte EUA acertado → medalha de ouro. Devolve true se é novidade.
export function collect(state, id) {
  const got = state.get('collected', []);
  if (got.includes(id)) return false;
  state.set('collected', [...got, id]);
  return true;
}

// Conquistas: guarda e mostra um aviso rápido no rodapé.
export function unlock(state, content, id) {
  const got = state.get('achievements', []);
  if (got.includes(id)) return;
  state.set('achievements', [...got, id]);
  const a = content.achievements.find((x) => x.id === id);
  if (a) toast(`${a.icon} Conquista: ${a.title}`);
}

export function toast(text, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 3200);
}

// ---- Economia na tela ----
// Ganhar ouro: aplica o Quinto, mostra o carimbo e devolve o resultado.
export function pay(state, amount) {
  const r = earn(state.get('eco', {}), amount);
  state.set('eco', r.eco);
  if (r.hid) toast(`🗿 O Santo do Pau Oco escondeu o ouro: +${r.net} 🪙, Quinto 0`, 'gold');
  else toast(`+${r.net} 🪙 · 👑 Quinto −${r.quinto}`, 'stamp');
  if (r.newYear) setTimeout(() => toast(`👑 Meta da Coroa batida. Começa o ano ${r.eco.year}.`), 900);
  sfx.stamp();
  return r;
}

// Erro no Treino: conta erros seguidos; no 5º vem a Derrama.
export function missed(state, content) {
  const m = miss(state.get('eco', {}), state.get('missStreak', 0));
  state.set('missStreak', m.streak);
  if (!m.derrama) return;
  state.set('eco', m.eco);
  const what = m.derrama.item ? content.items.find((i) => i.id === m.derrama.item)?.name : `${m.derrama.gold} 🪙`;
  toast(`🔔🔔🔔 Derrama! O Cobrador levou: ${what}`, 'derrama');
  sfx.derrama();
}
export const hit = (state) => state.set('missStreak', 0);

export function hud(state, t) {
  const e = { gold: 0, paid: 0, year: 1, yearPaid: 0, items: [], ...state.get('eco', {}) };
  return `<div class="hud"><span>🪙 ${e.gold}</span><span title="${esc(t['eco.paid'])}">👑 ${e.paid}</span>
    <span class="meta-bar" title="${esc(t['eco.meta'])}"><i style="width:${(e.yearPaid / META) * 100}%"></i></span>
    <small>${esc(t['eco.year'])} ${e.year} · ${e.yearPaid}/${META}</small>${e.items.length ? `<span>🎒 ${e.items.length}</span>` : ''}</div>`;
}

// Botão de alternar Mundo Documento × Mundo Lenda (Chrono Cross).
export const worldToggle = (t, world) =>
  `<button class="world ${world}" data-act="world">${world === 'lenda' ? t['world.lenda'] : t['world.doc']} ⇄</button>`;
