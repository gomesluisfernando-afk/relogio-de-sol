// Repetição espaçada (sistema Leitner, 5 caixas). A unidade é o card (ou a expressão).
// Acertou: sobe uma caixa. Errou: volta para a caixa 1.
// Cada caixa reaparece a cada N sessões: caixa 1 = toda sessão … caixa 5 = a cada 16.
export const INTERVALS = [1, 2, 4, 8, 16];

export const isDue = (entry, session) => !entry || session - entry.last >= INTERVALS[entry.box - 1];

export const grade = (entry, ok, session) => ({ box: ok ? Math.min((entry?.box || 1) + 1, 5) : 1, last: session });

// Escolhe uma chave: primeiro as vencidas, dentro delas a caixa mais baixa, empate no sorteio.
export function pick(keys, boxes, session, rand = Math.random) {
  if (!keys.length) return null;
  const due = keys.filter((k) => isDue(boxes[k], session));
  const pool = due.length ? due : keys;
  const low = Math.min(...pool.map((k) => boxes[k]?.box || 0));
  const best = pool.filter((k) => (boxes[k]?.box || 0) === low);
  return best[Math.floor(rand() * best.length)];
}
