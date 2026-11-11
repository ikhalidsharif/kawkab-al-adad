import { sfx } from '../../core/audio';
import { h, onKey, svg } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { makeRng, newSeed } from '../../core/rng';
import { mathEl, rich } from '../../core/tex';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver, replay } from './gameKit';

const MAX = 12;
const TARGETS = 5;

/** Corners of the three squares built outward on the sides of the right triangle O(0,0), P(a,0), Q(0,b). */
export function squares(a: number, b: number) {
  return {
    legA: [[0, 0], [a, 0], [a, -a], [0, -a]],
    legB: [[0, 0], [0, b], [-b, b], [-b, 0]],
    hyp: [[a, 0], [0, b], [b, b + a], [a + b, a]],
  };
}

/** "مختبر فيثاغورس": move the legs, watch the square areas; then hit target hypotenuse-square areas. */
export function pythagorasLab(root: HTMLElement): () => void {
  const back = '/station/3-5';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let a = 3;
  let b = 4;
  let target = 0;
  let round = 0;
  let points = 0;
  let xp = 0;
  let busy = false;
  let done = false;
  let tries = 0;

  // Targets: perfect (triples) and non-perfect hypotenuse squares; all reachable with legs ≤ 12.
  const pool = rng.shuffle([25, 100, 169, 225, 50, 41, 130, 61, 145, 85, 113]).filter((t) => reachable(t));
  const targets = pool.slice(0, TARGETS);

  const dots = progressDots(TARGETS);
  const pointsChip = h('span', { class: 'chip text-good border-good/50 font-black text-lg mr-auto' }, '0 نقطة');
  // y grows upward like the book's axes: flip the SVG vertically
  const box = svg('svg', { viewBox: `${-MAX - 1} ${-MAX - 1} ${3 * MAX + 3} ${3 * MAX + 3}`, class: 'w-full max-w-md mx-auto transition-all', style: 'transform: scaleY(-1)' });
  const readA = h('div', { class: 'text-lg' });
  const readB = h('div', { class: 'text-lg' });
  const readC = h('div', { class: 'text-lg' });
  const eq = h('div', { class: 'text-2xl text-center my-2' });
  const goal = h('div', { class: 'text-xl font-bold text-center' });
  const status = h('div', { class: 'text-center min-h-8 font-bold' });
  const ctrl = (label: string, onMinus: () => void, onPlus: () => void, keys: string) =>
    h('div', { class: 'flex items-center gap-2', dir: 'ltr' }, h('button', { class: 'btn px-3', onclick: onMinus }, '−'), h('span', { class: 'w-24 text-center' }, label), h('button', { class: 'btn px-3', onclick: onPlus }, '+'), h('span', { class: 'kbd' }, keys));
  const panel = h(
    'div',
    { class: 'panel p-5 grid md:grid-cols-2 gap-4 items-center' },
    h('div', null, box),
    h(
      'div',
      { class: 'flex flex-col gap-3' },
      goal,
      h('div', { class: 'flex flex-col gap-1 text-slate-300' }, readA, readB, readC),
      eq,
      ctrl('الساق أ', () => setLegs(a - 1, b), () => setLegs(a + 1, b), '← →'),
      ctrl('الساق ب', () => setLegs(a, b - 1), () => setLegs(a, b + 1), '↓ ↑'),
      h('button', { class: 'btn btn-primary self-center', onclick: () => submit() }, 'تحقّق ', h('span', { class: 'kbd' }, 'Enter')),
      status,
    ),
  );
  const host = h('div', null, panel);
  root.append(
    titleBar('مختبر فيثاغورس 📐', 'غيّر طولي الساقين وشاهد: مساحة المربع على الوتر تساوي دائماً مجموع مساحتي المربعين على الساقين. ثم حقّق الهدف المطلوب.', back),
    h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, pointsChip),
    host,
  );

  const poly = (pts: number[][], fill: string, stroke: string) =>
    svg('polygon', { points: pts.map((p) => p.join(',')).join(' '), fill, stroke, 'stroke-width': 0.15, 'stroke-linejoin': 'round' });

  function draw() {
    const s = squares(a, b);
    // zoom to the current figure: x ∈ [−b, a+b], y ∈ [−a, a+b] (square, with 1 unit of margin)
    const minX = -b - 1;
    const minY = -a - 1;
    const size = Math.max(a + 2 * b, 2 * a + b) + 2;
    box.setAttribute('viewBox', `${minX} ${minY} ${size} ${size}`);
    box.replaceChildren(
      // unit grid over the whole drawing area (−MAX−1 … 2·MAX+1 on both axes)
      ...Array.from({ length: 3 * MAX + 3 }, (_, i) => svg('line', { x1: i - MAX - 1, y1: -MAX - 1, x2: i - MAX - 1, y2: 2 * MAX + 2, stroke: '#1b2750', 'stroke-width': 0.05 })),
      ...Array.from({ length: 3 * MAX + 3 }, (_, i) => svg('line', { x1: -MAX - 1, y1: i - MAX - 1, x2: 2 * MAX + 2, y2: i - MAX - 1, stroke: '#1b2750', 'stroke-width': 0.05 })),
      poly(s.legA, 'rgba(34,211,238,0.25)', '#22d3ee'),
      poly(s.legB, 'rgba(167,139,250,0.25)', '#a78bfa'),
      poly(s.hyp, 'rgba(251,191,36,0.22)', '#fbbf24'),
      poly([[0, 0], [a, 0], [0, b]], 'rgba(255,255,255,0.15)', '#ffffff'),
      svg('rect', { x: 0, y: 0, width: 0.8, height: 0.8, fill: 'none', stroke: '#fff', 'stroke-width': 0.08 }),
    );
    const c2 = a * a + b * b;
    const c = Math.sqrt(c2);
    readA.replaceChildren(rich(`🟦 مساحة مربع الساق أ: $${a}^{2} = ${a * a}$`));
    readB.replaceChildren(rich(`🟪 مساحة مربع الساق ب: $${b}^{2} = ${b * b}$`));
    readC.replaceChildren(rich(`🟨 مساحة مربع الوتر: $\\text{جـ}^{2} = ${c2}$ ⇐ $\\text{جـ} ${Number.isInteger(c) ? '=' : '\\approx'} ${Number.isInteger(c) ? c : c.toFixed(2)}$`));
    eq.replaceChildren(mathEl(`${a * a} + ${b * b} = ${c2}`));
  }

  function setLegs(na: number, nb: number) {
    if (busy || done) return;
    a = Math.max(1, Math.min(MAX, na));
    b = Math.max(1, Math.min(MAX, nb));
    sfx.click();
    draw();
  }

  function setup() {
    dots.set(round, 'current');
    target = targets[round];
    tries = 0;
    busy = false;
    goal.replaceChildren(rich(`🎯 الهدف ${round + 1}: اجعل مساحة مربع الوتر $= ${target}$`));
    status.textContent = '';
    draw();
  }

  function submit() {
    if (busy || done) return;
    const c2 = a * a + b * b;
    if (c2 === target) {
      busy = true;
      const g = tries === 0 ? 15 : 8;
      points += g;
      xp += g;
      awardXp(g);
      floatXp(box, g);
      sfx.correct(round);
      burstAt(box, 30);
      pointsChip.textContent = `${points} نقطة`;
      dots.set(round, tries === 0 ? 'good' : 'half');
      status.className = 'text-center min-h-8 font-bold text-good';
      status.replaceChildren(rich(`✓ $${a}^{2} + ${b}^{2} = ${target}$`));
      setTimeout(() => {
        round++;
        if (round >= TARGETS) {
          done = true;
          gameOver(host, { lesson: '3-5', score: points, scoreLabel: 'نقاط', xp, replay: '/station/3-5/lab', back });
        } else setup();
      }, 1500);
    } else {
      tries++;
      sfx.wrong();
      replay(panel, 'anim-shake');
      status.className = 'text-center min-h-8 font-bold text-bad';
      status.replaceChildren(rich(`$${c2} ${c2 > target ? '>' : '<'} ${target}$ — ${c2 > target ? 'صغّر' : 'كبّر'} أحد الساقين.${tries >= 2 ? ` (تلميح: ابحث عن عددين مجموع مربعيهما $${target}$)` : ''}`));
    }
  }

  setup();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    const k = e.key;
    if (k.startsWith('Arrow')) e.preventDefault();
    if (k === 'ArrowLeft') setLegs(a - 1, b);
    else if (k === 'ArrowRight') setLegs(a + 1, b);
    else if (k === 'ArrowDown') setLegs(a, b - 1);
    else if (k === 'ArrowUp') setLegs(a, b + 1);
    else if (k === 'Enter') {
      e.preventDefault();
      if (done) go('/station/3-5/lab');
      else submit();
    }
  });
  return () => {
    off();
    addTime('3-5', Date.now() - started);
  };
}

/** Can t be written as a² + b² with 1 ≤ a, b ≤ 12? */
export function reachable(t: number): boolean {
  for (let x = 1; x <= MAX; x++) for (let y = 1; y <= MAX; y++) if (x * x + y * y === t) return true;
  return false;
}
