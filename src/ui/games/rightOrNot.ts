import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { makeRng, newSeed, type Rng } from '../../core/rng';
import { mathEl, rich } from '../../core/tex';
import { randomTriple } from '../../generators/l3_5';
import { go } from '../../router';
import { titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver, replay } from './gameKit';

const DURATION = 30_000;

export function sideSet(rng: Rng): { sides: number[]; right: boolean } {
  const [a, b, c] = randomTriple(rng, 45);
  if (rng.chance(0.5)) return { sides: rng.shuffle([a, b, c]), right: true };
  // near-misses: change one side by ±1 or ±2, but keep a real triangle (3, 4, 5 → 1, 4, 5 is not one)
  for (;;) {
    const s = [a, b, c];
    s[rng.int(0, 2)] += rng.pick([-2, -1, 1, 2]);
    const [p, q, r] = [...s].sort((x, y) => x - y);
    if (p + q > r) return { sides: rng.shuffle(s), right: p * p + q * q === r * r };
  }
}

/** "قائم أم لا؟": 30 seconds of quick judgements. 1 = قائم, 2 = ليس قائماً. */
export function rightOrNot(root: HTMLElement): () => void {
  const back = '/station/3-5';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let cur = sideSet(rng);
  let correct = 0;
  let answered = 0;
  let streak = 0;
  let xp = 0;
  let endAt = 0;
  let timer = 0;
  let phase: 'ready' | 'run' | 'done' = 'ready';

  const clock = h('span', { class: 'text-3xl font-black text-neon tabular-nums', dir: 'ltr' }, '30');
  const scoreEl = h('span', { class: 'chip text-good border-good/50 font-black text-lg mr-auto' }, '✓ 0');
  const card = h('div', { class: 'text-4xl text-center my-8 min-h-14' });
  const status = h('div', { class: 'text-center min-h-8 font-bold' });
  const btns = h(
    'div',
    { class: 'grid grid-cols-2 gap-4 max-w-lg mx-auto' },
    h('button', { class: 'choice justify-center text-xl !border-good/50', onclick: () => answer(true) }, h('span', { class: 'kbd' }, '1'), '✓ قائم'),
    h('button', { class: 'choice justify-center text-xl !border-bad/50', onclick: () => answer(false) }, h('span', { class: 'kbd' }, '2'), '✗ ليس قائماً'),
  );
  const panel = h('div', { class: 'panel p-6' }, card, btns, status);
  const host = h('div', null, panel);
  root.append(titleBar('قائم أم لا؟ ⚡', 'هل الأطوال الثلاثة تكوّن مثلثاً قائم الزاوية؟ تحقّق: (الأطول)² = مجموع مربعي الآخرَين؟', back), h('div', { class: 'flex items-center gap-3 mb-4' }, clock, scoreEl), host);

  function show() {
    cur = sideSet(rng);
    card.replaceChildren(mathEl(cur.sides.join(',\\quad ')));
  }
  function start() {
    phase = 'run';
    endAt = performance.now() + DURATION;
    timer = window.setInterval(() => {
      const left = endAt - performance.now();
      clock.textContent = String(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) finish();
    }, 200);
    show();
  }
  function answer(right: boolean) {
    if (phase === 'ready') return start();
    if (phase !== 'run') return;
    answered++;
    const [p, q, r] = [...cur.sides].sort((x, y) => x - y);
    if (right === cur.right) {
      correct++;
      streak++;
      const g = 3 + Math.min(5, streak);
      xp += g;
      awardXp(g);
      floatXp(card, g);
      sfx.correct(streak);
      if (streak % 5 === 0) burstAt(card, 25);
      status.className = 'text-center min-h-8 font-bold text-good';
      status.textContent = `✓ ${streak >= 3 ? `🔥 ${streak}` : ''}`;
    } else {
      streak = 0;
      sfx.wrong();
      replay(panel, 'anim-shake');
      status.className = 'text-center min-h-8 font-bold text-bad';
      status.replaceChildren(rich(`✗ $${p}^{2} + ${q}^{2} = ${p * p + q * q}$ و $${r}^{2} = ${r * r}$`));
    }
    scoreEl.textContent = `✓ ${correct}`;
    show();
  }
  function finish() {
    phase = 'done';
    clearInterval(timer);
    gameOver(host, { lesson: '3-5', score: correct, scoreLabel: 'أحكام صحيحة', xp, replay: '/station/3-5/right', back, gameKey: 'right', extra: h('p', { class: 'text-slate-300' }, `${correct} صحيحة من ${answered}`) });
  }

  card.replaceChildren(h('button', { class: 'btn btn-primary text-xl px-10', onclick: start }, 'ابدأ ', h('span', { class: 'kbd' }, 'Enter')));
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'ready') start();
      else if (phase === 'done') go('/station/3-5/right');
      return;
    }
    if (e.key === '1') answer(true);
    if (e.key === '2') answer(false);
  });
  return () => {
    off();
    clearInterval(timer);
    addTime('3-5', Date.now() - started);
  };
}
