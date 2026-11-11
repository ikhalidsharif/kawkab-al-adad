import { sfx } from '../../core/audio';
import { h, onKey, svg } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { makeRng, newSeed } from '../../core/rng';
import { mathEl, rich } from '../../core/tex';
import { sumOfSquares } from '../../generators/l3_ext';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver, replay } from './gameKit';

const ROUNDS = 6;
const LEG_MAX = 6;
const W = 9; // number line 0..9

/** "الفرجار": choose integer legs so the compass arc lands on the requested √n. */
export function compassGame(root: HTMLElement): () => void {
  const back = '/station/3-ext';
  const rng = makeRng(newSeed());
  const started = Date.now();
  const firsts = rng.shuffle([2, 5, 10]);
  const seen = new Set<number>();
  let round = 0;
  let n = 0;
  let a = 1;
  let b = 1;
  let tries = 0;
  let points = 0;
  let xp = 0;
  let busy = false;
  let done = false;

  const dots = progressDots(ROUNDS);
  const pointsChip = h('span', { class: 'chip text-good border-good/50 font-black text-lg mr-auto' }, '0 نقطة');
  // direction:ltr — otherwise the RTL page flips SVG text ("√2" shows as "2√")
  const box = svg('svg', { viewBox: '-0.6 -6.8 10.2 8', class: 'w-full max-w-2xl mx-auto', direction: 'ltr', style: 'direction:ltr' });
  const goal = h('div', { class: 'text-2xl font-bold text-center mb-2' });
  const read = h('div', { class: 'text-xl text-center my-2' });
  const status = h('div', { class: 'text-center min-h-8 font-bold' });
  const ctrl = (label: string, minus: () => void, plus: () => void, keys: string) =>
    h('div', { class: 'flex items-center gap-2', dir: 'ltr' }, h('button', { class: 'btn px-3', onclick: minus }, '−'), h('span', { class: 'w-28 text-center' }, label), h('button', { class: 'btn px-3', onclick: plus }, '+'), h('span', { class: 'kbd' }, keys));
  const panel = h(
    'div',
    { class: 'panel p-5' },
    goal,
    box,
    read,
    h('div', { class: 'flex flex-wrap justify-center gap-4 mt-2' }, ctrl('الساق الأفقية', () => set(a - 1, b), () => set(a + 1, b), '← →'), ctrl('الساق الرأسية', () => set(a, b - 1), () => set(a, b + 1), '↓ ↑')),
    h('div', { class: 'flex justify-center mt-3' }, h('button', { class: 'btn btn-primary', onclick: () => submit() }, 'ارسم القوس ', h('span', { class: 'kbd' }, 'Enter'))),
    status,
  );
  const host = h('div', null, panel);
  root.append(titleBar('الفرجار 🧭', 'ارسم مثلثاً قائماً ساقاه عددان صحيحان على خط الأعداد ابتداءً من 0، فينقل الفرجار طول الوتر إلى خط الأعداد.', back), h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, pointsChip), host);

  // SVG y grows downward: draw "up" as negative y.
  function draw(showArc = false) {
    const c = Math.hypot(a, b);
    const nodes: SVGElement[] = [svg('line', { x1: -0.4, y1: 0, x2: W + 0.4, y2: 0, stroke: '#64748b', 'stroke-width': 0.05 })];
    for (let i = 0; i <= W; i++) {
      nodes.push(svg('line', { x1: i, y1: -0.12, x2: i, y2: 0.12, stroke: '#94a3b8', 'stroke-width': 0.04 }));
      nodes.push(svg('text', { x: i, y: 0.55, 'text-anchor': 'middle', fill: '#cbd5e1', 'font-size': 0.38 }, String(i)));
    }
    const target = Math.sqrt(n);
    nodes.push(svg('circle', { cx: target, cy: 0, r: 0.12, fill: '#fbbf24' }), svg('text', { x: target, y: -0.25, 'text-anchor': 'middle', fill: '#fbbf24', 'font-size': 0.32 }, `√${n}`));
    nodes.push(
      svg('polygon', { points: `0,0 ${a},0 ${a},${-b}`, fill: 'rgba(34,211,238,0.15)', stroke: '#22d3ee', 'stroke-width': 0.05 }),
      svg('polyline', { points: `${a - 0.25},0 ${a - 0.25},-0.25 ${a},-0.25`, fill: 'none', stroke: '#fff', 'stroke-width': 0.03 }),
      svg('line', { x1: 0, y1: 0, x2: a, y2: -b, stroke: '#a78bfa', 'stroke-width': 0.08 }),
    );
    if (showArc) {
      // arc centred at 0 from the triangle's top vertex down to the number line
      const large = 0;
      nodes.push(
        svg('path', { d: `M ${a} ${-b} A ${c} ${c} 0 ${large} 1 ${c} 0`, fill: 'none', stroke: '#4ade80', 'stroke-width': 0.05, 'stroke-dasharray': '0.15 0.1' }),
        svg('circle', { cx: c, cy: 0, r: 0.13, fill: '#4ade80' }),
      );
    }
    box.replaceChildren(...nodes);
    read.replaceChildren(mathEl(`\\text{الوتر} = \\sqrt{${a}^{2} + ${b}^{2}} = \\sqrt{${a * a + b * b}}`));
  }

  function set(na: number, nb: number) {
    if (busy || done) return;
    a = Math.max(1, Math.min(LEG_MAX, na));
    b = Math.max(1, Math.min(LEG_MAX, nb));
    sfx.click();
    draw();
  }

  function setup() {
    dots.set(round, 'current');
    n = round < 3 ? firsts[round] : sumOfSquares(rng, LEG_MAX).n;
    while (seen.has(n)) n = sumOfSquares(rng, LEG_MAX).n;
    seen.add(n);
    a = 1;
    b = 1;
    tries = 0;
    busy = false;
    goal.replaceChildren(rich(`أنشئ $\\sqrt{${n}}$ على خط الأعداد`));
    status.textContent = '';
    draw();
  }

  function submit() {
    if (busy || done) return;
    draw(true);
    if (a * a + b * b === n) {
      busy = true;
      const g = tries === 0 ? 15 : 8;
      points += g;
      xp += g;
      awardXp(g);
      floatXp(box, g);
      sfx.correct(round);
      burstAt(box, 26);
      pointsChip.textContent = `${points} نقطة`;
      dots.set(round, tries === 0 ? 'good' : 'half');
      status.className = 'text-center min-h-8 font-bold text-good';
      status.replaceChildren(rich(`✓ $${a}^{2} + ${b}^{2} = ${n}$ — القوس يقطع خط الأعداد عند $\\sqrt{${n}} \\approx ${Math.sqrt(n).toFixed(2)}$`));
      setTimeout(() => {
        round++;
        if (round >= ROUNDS) {
          done = true;
          gameOver(host, { lesson: '3-ext', score: points, scoreLabel: 'نقاط', xp, replay: '/station/3-ext/compass', back });
        } else setup();
      }, 1800);
    } else {
      tries++;
      sfx.wrong();
      replay(panel, 'anim-shake');
      status.className = 'text-center min-h-8 font-bold text-bad';
      status.replaceChildren(rich(`القوس وصل إلى $\\sqrt{${a * a + b * b}}$ لا $\\sqrt{${n}}$. نحتاج ساقين مجموع مربعيهما $${n}$.`));
    }
  }

  setup();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    const k = e.key;
    if (k.startsWith('Arrow')) e.preventDefault();
    if (k === 'ArrowLeft') set(a - 1, b);
    else if (k === 'ArrowRight') set(a + 1, b);
    else if (k === 'ArrowDown') set(a, b - 1);
    else if (k === 'ArrowUp') set(a, b + 1);
    else if (k === 'Enter') {
      e.preventDefault();
      if (done) go('/station/3-ext/compass');
      else submit();
    }
  });
  return () => {
    off();
    addTime('3-ext', Date.now() - started);
  };
}
