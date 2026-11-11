import { getSave, update } from './store';

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (getSave().muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  click: () => tone(660, 0, 0.05, 'triangle', 0.05),
  correct: (combo = 0) => {
    const base = 523 * Math.pow(2, Math.min(combo, 12) / 12);
    tone(base, 0, 0.12, 'triangle');
    tone(base * 1.5, 0.08, 0.18, 'triangle');
  },
  wrong: () => {
    tone(180, 0, 0.22, 'sawtooth', 0.06);
    tone(140, 0.1, 0.25, 'sawtooth', 0.05);
  },
  hint: () => tone(880, 0, 0.1, 'sine', 0.06),
  tick: () => tone(1200, 0, 0.03, 'square', 0.03),
  hit: () => {
    tone(90, 0, 0.18, 'square', 0.1);
    tone(300, 0, 0.08, 'sawtooth', 0.06);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3, 'triangle', 0.1)),
  levelUp: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.25, 'sine', 0.09)),
  badge: () => [784, 988, 1175].forEach((f, i) => tone(f, i * 0.09, 0.3, 'sine', 0.08)),
};

export function toggleMute(): boolean {
  update((s) => {
    s.muted = !s.muted;
  });
  return getSave().muted;
}
