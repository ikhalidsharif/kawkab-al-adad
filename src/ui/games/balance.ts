import Fraction from 'fraction.js';
import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { paren, texFrac } from '../../core/mathutil';
import { makeRng, newSeed, type Rng } from '../../core/rng';
import { mathEl, rich } from '../../core/tex';
import { X, properFrac } from '../../generators/util';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { fmtXp, gameOver, replay } from './gameKit';

/** Equation a·س + b = c on a balance. */
interface Eq {
  a: Fraction;
  b: Fraction;
  c: Fraction;
}
interface Op {
  kind: 'add' | 'mul';
  k: Fraction;
  label: string;
}

const ROUNDS = 6;
const MAX_MOVES = 4;

function eqLeftTex(e: Eq): string {
  const a = e.a.equals(1) ? '' : e.a.equals(-1) ? '-' : texFrac(e.a);
  const left = `${a}${X}`;
  if (e.b.equals(0)) return left;
  return Number(e.b.s) < 0 ? `${left} - ${texFrac(e.b.neg())}` : `${left} + ${texFrac(e.b)}`;
}

export function makeRound(rng: Rng, i: number): Eq {
  if (i < 2) {
    const x = properFrac(rng, rng.pick([2, 3, 4, 5, 6, 8])).add(rng.int(0, 3));
    let b = properFrac(rng, rng.pick([2, 3, 4, 6]));
    if (i === 1 || rng.chance(0.5)) b = b.neg();
    return { a: new Fraction(1), b, c: x.add(b) };
  }
  if (i < 4) {
    const [p, q] = rng.pick([[2, 3], [3, 4], [4, 5], [3, 5], [5, 2], [4, 3]] as const);
    const a = new Fraction(p, q);
    const x = new Fraction(q * rng.int(2, 9));
    return { a, b: new Fraction(0), c: a.mul(x) };
  }
  // bonus: two steps
  const a = new Fraction(rng.pick([2, 3, 4, 5]), rng.pick([1, 1, 3]));
  const x = new Fraction(rng.int(-6, 9) || 2);
  const b = new Fraction(rng.int(1, 9)).mul(rng.sign());
  return { a, b, c: a.mul(x).add(b) };
}

/** "add k to both sides", phrased as subtraction when k is negative. */
function addOp(k: Fraction): Op {
  return { kind: 'add', k, label: Number(k.s) < 0 ? `اطرح $${texFrac(k.neg())}$ من الطرفين` : `أضف $${texFrac(k)}$ إلى الطرفين` };
}

/** The one move that makes progress, following the book: undo + first, then multiply by the reciprocal. */
function bestOp(e: Eq): Op {
  if (!e.b.equals(0)) return addOp(e.b.neg());
  const r = new Fraction(1).div(e.a);
  return Number(e.a.d) === 1
    ? { kind: 'mul', k: r, label: `اقسم الطرفين على $${texFrac(e.a)}$` }
    : { kind: 'mul', k: r, label: `اضرب الطرفين في $${paren(texFrac(r))}$` };
}

export function options(rng: Rng, e: Eq): { ops: Op[]; best: number } {
  const best = bestOp(e);
  const pool: Op[] = [];
  if (!e.b.equals(0)) {
    pool.push(addOp(e.b)); // wrong direction (a classic mistake)
    if (!e.c.equals(0)) pool.push(addOp(e.c.neg()));
  }
  if (!e.a.equals(1)) {
    pool.push({ kind: 'mul', k: e.a, label: `اضرب الطرفين في $${paren(texFrac(e.a))}$` });
    if (!e.b.equals(0)) pool.push(bestOp({ ...e, b: new Fraction(0) }));
  }
  pool.push({ kind: 'mul', k: new Fraction(2), label: 'اضرب الطرفين في $2$' });
  pool.push(addOp(new Fraction(1)));
  pool.push(addOp(new Fraction(-1)));
  const labels = new Set([best.label]);
  const ops = [best];
  for (const o of rng.shuffle(pool)) {
    if (ops.length >= 4) break;
    if (!labels.has(o.label)) {
      labels.add(o.label);
      ops.push(o);
    }
  }
  const shuffled = rng.shuffle(ops);
  return { ops: shuffled, best: shuffled.indexOf(best) };
}

export function apply(e: Eq, op: Op): Eq {
  return op.kind === 'add' ? { a: e.a, b: e.b.add(op.k), c: e.c.add(op.k) } : { a: e.a.mul(op.k), b: e.b.mul(op.k), c: e.c.mul(op.k) };
}

export const solved = (e: Eq) => e.a.equals(1) && e.b.equals(0);
export const optimalMoves = (e: Eq) => (e.b.equals(0) ? 0 : 1) + (e.a.equals(1) ? 0 : 1);

export function balanceGame(root: HTMLElement): () => void {
  const back = '/station/2-6';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let round = 0;
  let eq = makeRound(rng, 0);
  let moves = 0;
  let opt = optimalMoves(eq);
  let current: { ops: Op[]; best: number } = { ops: [], best: 0 };
  let perfect = 0;
  let xp = 0;
  let busy = false;
  let done = false;

  const dots = progressDots(ROUNDS);
  const xpChip = h('span', { class: 'chip text-gold border-gold/50 font-black mr-auto', dir: 'ltr' }, '+0 XP');
  const leftPan = h('div', { class: 'text-2xl min-h-12 grid place-items-center' });
  const rightPan = h('div', { class: 'text-2xl min-h-12 grid place-items-center' });
  const beam = h(
    'div',
    { class: 'relative transition-transform duration-500', style: 'transform-origin: 50% 0' },
    h('div', { class: 'h-2 rounded-full bg-gradient-to-l from-violet to-neon mx-6' }),
    h(
      'div',
      { class: 'grid grid-cols-2 gap-10 mt-2', dir: 'ltr' },
      h('div', { class: 'rounded-b-[3rem] border-2 border-t-0 border-neon/60 bg-neon/5 p-4 pt-6' }, leftPan),
      h('div', { class: 'rounded-b-[3rem] border-2 border-t-0 border-violet/60 bg-violet/5 p-4 pt-6' }, rightPan),
    ),
  );
  const stand = h('div', { class: 'mx-auto w-3 h-16 bg-space-600 rounded-t' });
  const base = h('div', { class: 'mx-auto w-40 h-3 bg-space-600 rounded-full' });
  const eqLine = h('div', { class: 'text-center text-3xl my-3' });
  const status = h('div', { class: 'text-center min-h-8 font-bold' });
  const opsBox = h('div', { class: 'grid sm:grid-cols-2 gap-3 mt-4' });
  const stage = h('div', { class: 'panel p-6' }, h('div', { class: 'max-w-2xl mx-auto' }, h('div', { class: 'relative' }, beam), stand, base), eqLine, status, opsBox);
  const host = h('div', null, stage);

  root.append(
    titleBar('الميزان ⚖️', 'المعادلة ميزان متوازن: كل عملية تطبّقها على كفّة يجب أن تطبّقها على الأخرى. اعزل س بأقل عدد من الخطوات.', back),
    h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, xpChip),
    host,
  );

  function render() {
    leftPan.replaceChildren(mathEl(eqLeftTex(eq)));
    rightPan.replaceChildren(mathEl(texFrac(eq.c)));
    eqLine.replaceChildren(mathEl(`${eqLeftTex(eq)} = ${texFrac(eq.c)}`, true));
    dots.set(round, 'current');
    status.className = 'text-center min-h-8 font-bold text-slate-300';
    status.textContent = `${round >= 4 ? '⭐ تحدٍّ إضافي: خطوتان! ' : ''}الخطوات: ${moves} / ${MAX_MOVES} — الحل المثالي في ${opt} ${opt === 1 ? 'خطوة' : 'خطوتين'}`;
    current = options(rng, eq);
    opsBox.replaceChildren(
      ...current.ops.map((o, i) => h('button', { class: 'choice', onclick: () => choose(i) }, h('span', { class: 'kbd' }, String(i + 1)), rich(o.label, 'text-lg'))),
    );
  }

  function choose(i: number) {
    if (busy || done) return;
    const op = current.ops[i];
    if (!op) return;
    const next = apply(eq, op);
    // A move is good if it brings س closer to being isolated (either valid order counts).
    const good = optimalMoves(next) < optimalMoves(eq);
    moves++;
    eq = next;
    // wobble the beam: good moves settle quickly, bad ones swing more
    beam.style.transform = `rotate(${good ? 3 : -8}deg)`;
    setTimeout(() => (beam.style.transform = 'rotate(0deg)'), 350);
    if (good) sfx.click();
    else {
      sfx.wrong();
      replay(stage, 'anim-shake');
    }
    if (solved(eq)) return win();
    if (moves >= MAX_MOVES) return lose();
    render();
    if (!good) {
      status.className = 'text-center min-h-8 font-bold text-bad';
      status.textContent = 'الميزان ما زال متوازناً، لكن هذه الخطوة لم تقرّبك من عزل س.';
    }
  }

  function win() {
    busy = true;
    const isPerfect = moves === opt;
    if (isPerfect) perfect++;
    const gained = isPerfect ? 15 : 6;
    xp += gained;
    xpChip.textContent = fmtXp(xp);
    awardXp(gained);
    floatXp(stage, gained);
    sfx.correct(perfect);
    burstAt(eqLine, 30);
    dots.set(round, isPerfect ? 'good' : 'half');
    leftPan.replaceChildren(mathEl(X));
    rightPan.replaceChildren(mathEl(texFrac(eq.c)));
    eqLine.replaceChildren(mathEl(`${X} = ${texFrac(eq.c)}`, true));
    status.className = 'text-center min-h-8 font-bold text-good';
    status.textContent = isPerfect ? '✓ عزلت س بأقل عدد من الخطوات!' : `✓ عزلت س في ${moves} خطوات (المثالي ${opt}).`;
    opsBox.replaceChildren();
    setTimeout(nextRound, 1300);
  }

  function lose() {
    busy = true;
    dots.set(round, 'bad');
    status.className = 'text-center min-h-8 font-bold text-bad';
    status.textContent = 'نفدت الخطوات! تذكّر: نلغي الجمع/الطرح أولاً، ثم نضرب في مقلوب المعامل.';
    opsBox.replaceChildren();
    setTimeout(nextRound, 2200);
  }

  function nextRound() {
    busy = false;
    round++;
    if (round >= ROUNDS) return finish();
    eq = makeRound(rng, round);
    moves = 0;
    opt = optimalMoves(eq);
    render();
  }

  function finish() {
    done = true;
    gameOver(host, { lesson: '2-6', score: perfect, scoreLabel: 'حلول مثالية', xp, replay: '/station/2-6/balance', back });
  }

  render();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (done && e.key === 'Enter') {
      e.preventDefault();
      return go('/station/2-6/balance');
    }
    if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
  });
  return () => {
    off();
    addTime('2-6', Date.now() - started);
  };
}
