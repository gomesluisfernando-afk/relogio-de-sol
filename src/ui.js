// Pequenos pedaços de interface usados por mais de um modo.
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export const tag = (t, status) => `<span class="tag s-${status}">${esc(t['status.' + status])}</span>`;

// Busca sem acento e sem maiúscula: "sao joao" acha "São João".
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Cards já abertos ("avistados"). O Treino (Bloco 4) vai marcar os "colecionados".
export function markSeen(state, id) {
  const seen = state.get('seen', []);
  if (!seen.includes(id)) state.set('seen', [...seen, id]);
}

// Botão de alternar Mundo Documento × Mundo Lenda (Chrono Cross).
export const worldToggle = (t, world) =>
  `<button class="world ${world}" data-act="world">${world === 'lenda' ? t['world.lenda'] : t['world.doc']} ⇄</button>`;
