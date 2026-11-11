import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { makeRng, newSeed } from '../../core/rng';
import { mathEl, rich } from '../../core/tex';
import { nonSquare } from '../../generators/l3_2';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver } from './gameKit';

const ROUNDS = 8;

/** Points for a placement error (in units on the number line). */
export function placementScore(err: number): number {
  return err <= 0.1 ? 10 : err <= 0.25 ? 7 : err <= 0.5 ? 4 : err <= 1 ? 1 : 0;
}

/** "خط الأعداد": drag √n to where it belongs. Arrow keys move by 0.1, Enter confirms. */
export function numberLine(root: HTMLElement): () => void {
  const back = '/station/3-2';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let round = 0;
  let points = 0;
  let xp = 0;
  let n = 0;
  let lo = 0;
  let hi = 10;
  let pos = 0;
  let busy = false;
  let done = false;
  let dragging = false;

  const dots = progressDots(ROUNDS);
  const pointsChip = h('span', { class: 'chip text-good border-good/50 font-black text-lg mr-auto' }, '0 نقطة');
  const prompt = h('div', { class: 'text-2xl font-bold text-center mb-8' });
  const track = h('div', { class: 'relative h-24 mx-6 select-none touch-none cursor-pointer', dir: 'ltr' });
  const marker = h(
    'div',
    { class: 'absolute top-0 -translate-x-1/2 flex flex-col items-center cursor-grab', style: 'left:0%' },
    h('div', { class: 'chip border-neon text-neon bg-space-900 text-lg px-2 marker-label' }),
    h('div', { class: 'w-0.5 h-8 bg-neon' }),
    h('div', { class: 'w-3 h-3 rounded-full bg-neon -mt-1.5 shadow-[0_0_12px_var(--color-neon)]' }),
  );
  const truth = h('div', { class: 'absolute top-[52px] -translate-x-1/2 hidden flex-col items-center', style: 'left:0%' }, h('div', { class: 'w-3 h-3 rounded-full bg-gold' }), h('div', { class: 'text-xs text-gold whitespace-nowrap truth-label' }));
  const readout = h('div', { class: 'text-center text-slate-300 mt-2', dir: 'ltr' });
  const status = h('div', { class: 'text-center min-h-8 font-bold mt-3' });
  const panel = h(
    'div',
    { class: 'panel p-6' },
    prompt,
    track,
    readout,
    status,
    h('div', { class: 'flex justify-center mt-3' }, h('button', { class: 'btn btn-primary', onclick: () => submit() }, 'ثبّت ', h('span', { class: 'kbd' }, 'Enter'))),
    h('p', { class: 'text-center text-slate-500 text-xs mt-3' }, 'اسحب المؤشر بالماوس، أو استعمل الأسهم ← → (0.1) و Shift+السهم (1).'),
  );
  const host = h('div', null, panel);
  root.append(titleBar('خط الأعداد 📏', 'ضع الجذر التربيعي في مكانه على خط الأعداد. دقة أكبر = نقاط أكثر.', back), h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, pointsChip), host);

  const pct = (x: number) => ((x - lo) / (hi - lo)) * 100;
  function drawAxis() {
    track.replaceChildren(h('div', { class: 'absolute left-0 right-0 top-[58px] h-1 bg-space-600 rounded-full' }));
    for (let i = lo; i <= hi; i++) {
      track.append(
        h('div', { class: 'absolute top-[52px] h-4 w-0.5 bg-slate-400 -translate-x-1/2', style: `left:${pct(i)}%` }),
        h('div', { class: 'absolute top-[72px] text-sm text-slate-300 -translate-x-1/2', style: `left:${pct(i)}%` }, String(i)),
      );
      if (i < hi) for (let t = 1; t < 10; t++) track.append(h('div', { class: 'absolute top-[56px] h-2 w-px bg-space-600', style: `left:${pct(i + t / 10)}%` }));
    }
    track.append(truth, marker);
  }
  function setPos(x: number) {
    if (busy || done) return;
    pos = Math.round(Math.min(hi, Math.max(lo, x)) * 10) / 10;
    marker.style.left = `${pct(pos)}%`;
    readout.textContent = `${pos.toFixed(1)}`;
  }
  function setup() {
    dots.set(round, 'current');
    const max = round < 3 ? 99 : round < 6 ? 225 : 400;
    n = nonSquare(rng, 2, max);
    const r = Math.sqrt(n);
    lo = Math.max(0, Math.floor(r) - rng.int(2, 4));
    hi = lo + 8;
    busy = false;
    drawAxis();
    marker.querySelector('.marker-label')!.replaceChildren(mathEl(`\\sqrt{${n}}`));
    truth.classList.add('hidden');
    truth.classList.remove('flex');
    prompt.replaceChildren(rich(`ضع $\\sqrt{${n}}$ على خط الأعداد`));
    status.textContent = '';
    setPos((lo + hi) / 2);
  }
  function submit() {
    if (busy || done) return;
    busy = true;
    const r = Math.sqrt(n);
    const err = Math.abs(pos - r);
    const p = placementScore(err);
    truth.style.left = `${pct(r)}%`;
    truth.classList.remove('hidden');
    truth.classList.add('flex');
    truth.querySelector('.truth-label')!.replaceChildren(mathEl(`\\sqrt{${n}} \\approx ${r.toFixed(2)}`));
    const k = Math.floor(r);
    if (p > 0) {
      points += p;
      const g = p;
      xp += g;
      awardXp(g);
      floatXp(marker, g);
      sfx.correct(p);
      if (p >= 7) burstAt(marker, 20);
    } else sfx.wrong();
    pointsChip.textContent = `${points} نقطة`;
    dots.set(round, p >= 7 ? 'good' : p > 0 ? 'half' : 'bad');
    status.className = `text-center min-h-8 font-bold mt-3 ${p >= 7 ? 'text-good' : p > 0 ? 'text-gold' : 'text-bad'}`;
    status.replaceChildren(rich(`${p >= 7 ? '🎯 دقيق جداً!' : p > 0 ? 'قريب!' : 'بعيد!'} (+${p}) — $${k * k} < ${n} < ${(k + 1) ** 2}$ ⇐ $${k} < \\sqrt{${n}} < ${k + 1}$`));
    setTimeout(() => {
      round++;
      if (round >= ROUNDS) {
        done = true;
        gameOver(host, { lesson: '3-2', score: points, scoreLabel: 'نقاط', xp, replay: '/station/3-2/line', back });
      } else setup();
    }, 2200);
  }

  const fromEvent = (e: PointerEvent) => {
    const r = track.getBoundingClientRect();
    setPos(lo + ((e.clientX - r.left) / r.width) * (hi - lo));
  };
  track.addEventListener('pointerdown', (e) => {
    dragging = true;
    track.setPointerCapture(e.pointerId);
    fromEvent(e);
  });
  track.addEventListener('pointermove', (e) => dragging && fromEvent(e));
  track.addEventListener('pointerup', () => (dragging = false));

  setup();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setPos(pos + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 1 : 0.1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (done) go('/station/3-2/line');
      else submit();
    }
  });
  return () => {
    off();
    addTime('3-2', Date.now() - started);
  };
}
