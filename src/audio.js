// Sinos do Sineiro, sintetizados (sem arquivos). 2 toques rápidos = acerto; repique = conquista.
import { state } from './state.js';

let ac;
function bell(freq, at) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.25, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
  o.connect(g).connect(ac.destination);
  o.start(at);
  o.stop(at + 1);
}

function ring(notes, gap) {
  if (state.get('muted', false)) return;
  try {
    ac ||= new AudioContext();
    const t0 = ac.currentTime + 0.02;
    notes.forEach((f, i) => bell(f, t0 + i * gap));
  } catch { /* sem áudio */ }
}

export const sfx = {
  hit: () => ring([1320, 1320], 0.12),
  achievement: () => ring([1568, 1319, 1175, 1047, 1568, 1319], 0.09),
};
