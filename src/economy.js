// Economia do jogo: ouro, o Quinto (20% some na hora), a meta anual da Coroa e a Derrama.
// Funções puras recebem e devolvem o estado (testáveis no Node); as de tela ficam no fim.
export const QUINTO = 0.2;
export const META = 100;          // "100 arrobas" por ano de jogo (em moedas do jogo)
export const DERRAMA_AFTER = 5;   // erros seguidos no Treino até o Cobrador aparecer

// Ganhar ouro: o Quinto sai na hora, a não ser que haja um Santo do Pau Oco no inventário.
export function earn(eco, amount) {
  const e = { gold: 0, paid: 0, year: 1, yearPaid: 0, items: [], ...eco };
  let quinto = Math.round(amount * QUINTO);
  let hid = false;
  if (quinto && e.items.includes('santo')) { e.items = e.items.filter((i) => i !== 'santo'); quinto = 0; hid = true; }
  e.gold += amount - quinto;
  e.paid += quinto;
  e.yearPaid += quinto;
  let newYear = false;
  if (e.yearPaid >= META) { e.year += 1; e.yearPaid -= META; newYear = true; }
  return { eco: e, net: amount - quinto, quinto, hid, newYear };
}

// Erro no Treino: conta a sequência; no quinto erro seguido vem a Derrama.
// Leva um item (o mais recente) ou, sem itens, 30% do ouro. Nada de punição por pausa.
export function miss(eco, streak) {
  const s = streak + 1;
  if (s < DERRAMA_AFTER) return { eco, streak: s, derrama: null };
  const e = { gold: 0, items: [], ...eco };
  let took;
  if (e.items.length) { took = { item: e.items.at(-1) }; e.items = e.items.slice(0, -1); }
  else { const g = Math.floor(e.gold * 0.3); e.gold -= g; took = { gold: g }; }
  return { eco: e, streak: 0, derrama: took };
}

export const give = (eco, item) => ({ items: [], ...eco, items: [...new Set([...(eco.items || []), item])] });
