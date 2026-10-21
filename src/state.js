// Progresso do jogador em localStorage. Tudo em try/catch: em aba anônima ou
// com armazenamento bloqueado o jogo funciona, só não lembra.
const KEY = 'relogio-de-sol';

let data = {};
try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { data = {}; }

const persist = () => {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* sem armazenamento: segue sem salvar */ }
};

export const state = {
  get: (k, fallback) => (k in data ? data[k] : fallback),
  set(k, v) { data[k] = v; persist(); },
  // Backup: exportar e importar todo o progresso como arquivo JSON.
  dump: () => JSON.stringify({ app: KEY, savedAt: new Date().toISOString(), data }, null, 1),
  restore(text) {
    const parsed = JSON.parse(text);
    if (parsed.app !== KEY || typeof parsed.data !== 'object') throw new Error('arquivo não é um backup do Relógio de Sol');
    data = parsed.data;
    persist();
  },
};
