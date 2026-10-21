// Todo o som é sintetizado no navegador (WebAudio), sem arquivos.
// Sinos do Sineiro: 1 grave = missão · 2 rápidos = acerto · 3 descendentes = Derrama · repique = conquista.
// Trilha por era na História; cards sérios trocam a música por um drone grave.
import { state } from './state.js';

let ac;
const ctx = () => (ac ||= new AudioContext());
const muted = () => state.get('muted', false);

function bell(freq, at, gain = 0.25, len = 0.9, wave = 'sine') {
  const o = ctx().createOscillator();
  const g = ac.createGain();
  o.type = wave;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(ac.destination);
  o.start(at);
  o.stop(at + len + 0.1);
}

function ring(notes, gap) {
  if (muted()) return;
  try {
    const t0 = ctx().currentTime + 0.02;
    notes.forEach((f, i) => bell(f, t0 + i * gap));
  } catch { /* sem áudio */ }
}

export const sfx = {
  hit: () => ring([1320, 1320], 0.12),
  achievement: () => ring([1568, 1319, 1175, 1047, 1568, 1319], 0.09),
  mission: () => ring([392], 0.3),
  derrama: () => ring([784, 659, 523], 0.28),
  stamp: () => ring([180, 140], 0.05),
};

// ---- Trilha por era (semitons a partir de uma nota base) ----
const THEMES = {
  mundo: { wave: 'triangle', base: 220, bpm: 92, notes: [0, 4, 7, 12, 7, 4] },
  paubrasil: { wave: 'triangle', base: 294, bpm: 104, notes: [0, 3, 5, 7, 10, 7, 5, 3] },   // madeira + flauta
  acucar: { wave: 'sine', base: 147, bpm: 58, notes: [0, 3, 7, 3] },                         // lento e grave
  invasoes: { wave: 'square', base: 196, bpm: 112, notes: [0, 0, 7, 7, 5, 5, 4, 0] },        // corneta e tambor
  ouro: { wave: 'sawtooth', base: 196, bpm: 124, notes: [0, 4, 7, 9, 12, 9, 7, 4], pluck: true }, // banjo × viola
  apogeu: { wave: 'triangle', base: 262, bpm: 84, notes: [0, 4, 7, 11, 12, 11, 7, 4] },
  inconfidencia: { wave: 'square', base: 175, bpm: 72, notes: [0, 3, 7, 8, 7, 3], pluck: true }, // cravo, conspiração
};
let loop = null;
let drone = null;

export function stopMusic() {
  clearInterval(loop);
  loop = null;
  drone?.forEach((o) => { try { o.stop(); } catch { /* já parou */ } });
  drone = null;
}

export function music(era) {
  stopMusic();
  const th = THEMES[era];
  if (!th || muted()) return;
  try {
    let n = 0;
    const step = 60 / th.bpm / 2;
    const tick = () => {
      const f = th.base * 2 ** (th.notes[n++ % th.notes.length] / 12);
      bell(f, ctx().currentTime + 0.01, 0.045, th.pluck ? 0.35 : step * 1.8, th.wave);
    };
    tick();
    loop = setInterval(tick, step * 1000);
  } catch { /* sem áudio */ }
}

export function seriousDrone() {
  stopMusic();
  if (muted()) return;
  try {
    const g = ctx().createGain();
    g.gain.value = 0.03;
    g.connect(ac.destination);
    drone = [55, 82.4].map((f) => { const o = ac.createOscillator(); o.frequency.value = f; o.connect(g); o.start(); return o; });
  } catch { /* sem áudio */ }
}

// Gancho em inglês em voz alta (voz do próprio celular).
export function speak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    speechSynthesis.speak(u);
  } catch { /* sem voz */ }
}
