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
  if (!a) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = `${a.icon} Conquista: ${a.title}`;
  document.body.append(el);
  setTimeout(() => el.remove(), 3200);
}

// Botão de alternar Mundo Documento × Mundo Lenda (Chrono Cross).
export const worldToggle = (t, world) =>
  `<button class="world ${world}" data-act="world">${world === 'lenda' ? t['world.lenda'] : t['world.doc']} ⇄</button>`;
