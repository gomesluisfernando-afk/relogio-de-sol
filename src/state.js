// Progresso do jogador em localStorage. Tudo em try/catch: em aba anônima ou
// com armazenamento bloqueado o jogo funciona, só não lembra.
const KEY = 'relogio-de-sol';

let data = {};
try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { data = {}; }

export const state = {
  get: (k, fallback) => (k in data ? data[k] : fallback),
  set(k, v) {
    data[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* sem armazenamento: segue sem salvar */ }
  },
};
