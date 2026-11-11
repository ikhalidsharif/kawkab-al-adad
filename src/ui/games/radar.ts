import { checkAnswer } from '../../core/answer';
import { sfx } from '../../core/audio';
import { h, onKey, svg } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { makeRng, newSeed } from '../../core/rng';
import { rich } from '../../core/tex';
import { randomPoints, type Pt } from '../../generators/l3_6';
import { round1, tenthAnswer } from '../../generators/util';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver, replay } from './gameKit';

const ROUNDS = 5;
const LIM = 8;
const ICONS = [['✈️', 'الطائرة'], ['🛰️', 'القمر الصناعي'], ['🚁', 'المروحية'], ['🛸', 'الجسم الغريب'], ['🎈', 'المنطاد']];

/** "الرادار": click the two blips, see the right triangle, then compute the distance. */
export function radar(root: HTMLElement): () => void {
  const back = '/station/3-6';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let round = 0;
  let pts: [Pt, Pt];
  let names: string[][] = [];
  let clicked: number[] = [];
  let tries = 0;
  let points = 0;
  let xp = 0;
  let phase: 'click' | 'answer' | 'wait' | 'done' = 'click';

  const dots = progressDots(ROUNDS);
  const pointsChip = h('span', { class: 'chip text-good border-good/50 font-black text-lg mr-auto' }, '0 نقطة');
  const box = svg('svg', { viewBox: `${-LIM - 1} ${-LIM - 1} ${2 * LIM + 2} ${2 * LIM + 2}`, class: 'w-full max-w-md mx-auto rounded-full', direction: 'ltr', style: 'direction:ltr; background: radial-gradient(circle, #0a2a2a 0%, #050816 75%)' });
  const prompt = h('div', { class: 'text-lg font-bold' });
  const legsInfo = h('div', { class: 'text-slate-300 min-h-16' });
  const input = h('input', { class: 'answer-input', dir: 'ltr', autocomplete: 'off', placeholder: 'المسافة (لأقرب جزء من عشرة)', disabled: true });
  const status = h('div', { class: 'min-h-8 font-bold' });
  const panel = h(
    'div',
    { class: 'panel p-5 grid md:grid-cols-2 gap-5 items-center' },
    box,
    h('div', { class: 'flex flex-col gap-3' }, prompt, legsInfo, input, h('button', { class: 'btn btn-primary self-start', onclick: () => submit() }, 'تحقّق ', h('span', { class: 'kbd' }, 'Enter')), status),
  );
  const host = h('div', null, panel);
  root.append(titleBar('الرادار 📡', 'اضغط الهدفين على الشاشة (أو 1 و 2) ليظهر المثلث القائم، ثم احسب المسافة بينهما بنظرية فيثاغورس.', back), h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, pointsChip), host);

  // SVG y grows downward: plot (x, y) at (x, -y)
  function draw() {
    const nodes: SVGElement[] = [];
    for (let i = -LIM; i <= LIM; i++) {
      nodes.push(
        svg('line', { x1: i, y1: -LIM, x2: i, y2: LIM, stroke: i === 0 ? '#22d3ee66' : '#1b2750', 'stroke-width': i === 0 ? 0.08 : 0.04 }),
        svg('line', { x1: -LIM, y1: i, x2: LIM, y2: i, stroke: i === 0 ? '#22d3ee66' : '#1b2750', 'stroke-width': i === 0 ? 0.08 : 0.04 }),
      );
    }
    for (const r of [3, 6]) nodes.push(svg('circle', { cx: 0, cy: 0, r, fill: 'none', stroke: '#22d3ee33', 'stroke-width': 0.05 }));
    if (clicked.length === 2) {
      const [p, q] = pts;
      nodes.push(
        svg('polygon', { points: `${p.x},${-p.y} ${q.x},${-p.y} ${q.x},${-q.y}`, fill: 'rgba(251,191,36,0.12)', stroke: '#fbbf24', 'stroke-width': 0.08 }),
        svg('line', { x1: p.x, y1: -p.y, x2: q.x, y2: -q.y, stroke: '#4ade80', 'stroke-width': 0.12 }),
        svg('text', { x: (p.x + q.x) / 2, y: -p.y + (q.y > p.y ? 0.7 : -0.3), 'text-anchor': 'middle', fill: '#fbbf24', 'font-size': 0.6 }, String(Math.abs(q.x - p.x))),
        svg('text', { x: q.x + (q.x > p.x ? 0.4 : -0.4), y: -(p.y + q.y) / 2, 'text-anchor': q.x > p.x ? 'start' : 'end', fill: '#fbbf24', 'font-size': 0.6 }, String(Math.abs(q.y - p.y))),
      );
    }
    pts.forEach((p, i) => {
      const on = clicked.includes(i);
      const g = svg('g', { style: 'cursor:pointer' });
      g.append(
        svg('circle', { cx: p.x, cy: -p.y, r: 0.65, fill: on ? '#4ade8044' : '#22d3ee22', stroke: on ? '#4ade80' : '#22d3ee', 'stroke-width': 0.08 }),
        svg('text', { x: p.x, y: -p.y + 0.3, 'text-anchor': 'middle', 'font-size': 0.8 }, names[i][0]),
        svg('text', { x: p.x, y: -p.y - 0.9, 'text-anchor': 'middle', fill: '#cbd5e1', 'font-size': 0.5 }, `(${p.x}, ${p.y})`),
      );
      g.addEventListener('click', () => pick(i));
      nodes.push(g);
    });
    box.replaceChildren(...nodes);
  }

  function setup() {
    dots.set(round, 'current');
    pts = randomPoints(rng, round < 2, LIM - 1);
    names = rng.shuffle(ICONS).slice(0, 2);
    clicked = [];
    tries = 0;
    phase = 'click';
    input.value = '';
    input.disabled = true;
    legsInfo.textContent = '';
    status.textContent = '';
    prompt.replaceChildren(rich(`اضغط ${names[0][1]} ${names[0][0]} ثم ${names[1][1]} ${names[1][0]}`));
    draw();
  }

  function pick(i: number) {
    if (phase !== 'click' || clicked.includes(i)) return;
    if (clicked.length === 0 && i !== 0) {
      replay(panel, 'anim-shake');
      return;
    }
    clicked.push(i);
    sfx.click();
    if (clicked.length === 2) {
      phase = 'answer';
      const [p, q] = pts;
      const dx = Math.abs(q.x - p.x);
      const dy = Math.abs(q.y - p.y);
      legsInfo.replaceChildren(
        rich(`الساق الأفقية $= |${q.x} - ${p.x < 0 ? `(${p.x})` : p.x}| = ${dx}$`),
        h('br'),
        rich(`الساق الرأسية $= |${q.y} - ${p.y < 0 ? `(${p.y})` : p.y}| = ${dy}$`),
      );
      prompt.replaceChildren(rich(`ما المسافة بين ${names[0][1]} و${names[1][1]}؟`));
      input.disabled = false;
      input.focus();
    }
    draw();
  }

  function submit() {
    if (phase !== 'answer') return;
    const [p, q] = pts;
    const dist = Math.hypot(q.x - p.x, q.y - p.y);
    const spec = Number.isInteger(dist) ? { kind: 'number' as const, value: dist } : tenthAnswer(dist);
    const res = checkAnswer(spec, input.value);
    if (res.status === 'invalid') return;
    const sq = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    const why = `$\\text{جـ}^{2} = ${Math.abs(q.x - p.x)}^{2} + ${Math.abs(q.y - p.y)}^{2} = ${sq}$ ⇐ $\\text{جـ} ${Number.isInteger(dist) ? `= ${dist}` : `= \\sqrt{${sq}} \\approx ${round1(dist).toFixed(1)}`}$`;
    if (res.status === 'correct') {
      phase = 'wait';
      const g = tries === 0 ? 15 : 7;
      points += g;
      xp += g;
      awardXp(g);
      floatXp(box, g);
      sfx.correct(round);
      burstAt(box, 26);
      pointsChip.textContent = `${points} نقطة`;
      dots.set(round, tries === 0 ? 'good' : 'half');
      status.className = 'min-h-8 font-bold text-good';
      status.replaceChildren(rich(`✓ ${why}`));
      setTimeout(next, 1800);
    } else {
      tries++;
      sfx.wrong();
      replay(input, 'anim-shake');
      status.className = 'min-h-8 font-bold text-bad';
      if (tries >= 2) {
        phase = 'wait';
        dots.set(round, 'bad');
        status.replaceChildren(rich(why));
        setTimeout(next, 2600);
      } else status.textContent = '✗ حاول مرة أخرى: جـ² = الساق² + الساق²';
    }
  }

  function next() {
    round++;
    if (round >= ROUNDS) {
      phase = 'done';
      gameOver(host, { lesson: '3-6', score: points, scoreLabel: 'نقاط', xp, replay: '/station/3-6/radar', back });
    } else setup();
  }

  setup();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (phase === 'click' && (e.key === '1' || e.key === '2')) return pick(Number(e.key) - 1);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'done') go('/station/3-6/radar');
      else submit();
    }
  });
  return () => {
    off();
    addTime('3-6', Date.now() - started);
  };
}
