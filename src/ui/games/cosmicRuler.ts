import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { makeRng, newSeed } from '../../core/rng';
import { mathEl, rich } from '../../core/tex';
import { OBJECTS, randomSci, sciValue } from '../../generators/l2_9';
import { texSci } from '../../generators/util';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver, replay } from './gameKit';

const ORDER_ROUNDS = 2;
const PER_ROUND = 5;
const MOVER_ROUNDS = 5;
const EXP_MIN = -11;
const EXP_MAX = 12;

/** "مسطرة الكون": order real objects by size on a power-of-ten ruler, then move the decimal point. */
export function cosmicRuler(root: HTMLElement): () => void {
  const back = '/station/2-9';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let points = 0;
  let xp = 0;
  let phase: 'order' | 'mover' | 'done' = 'order';
  let round = 0;

  const pointsChip = h('span', { class: 'chip text-good border-good/50 font-black text-lg' }, '0 نقطة');
  const dots = progressDots(ORDER_ROUNDS + MOVER_ROUNDS);
  const host = h('div');
  root.append(
    titleBar('مسطرة الكون 🔭', 'المرحلة 1: اضغط الأجسام من الأصغر إلى الأكبر لتضعها على المسطرة. المرحلة 2: حرّك الفاصلة العشرية بالأسهم ← → ثم اكتب الأس.', back),
    h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, pointsChip),
    host,
  );
  const addPoints = (p: number, anchor: Element) => {
    points += p;
    pointsChip.textContent = `${points} نقطة`;
    if (p > 0) {
      const g = Math.round(p / 2);
      xp += g;
      awardXp(g);
      floatXp(anchor, g);
    }
  };

  /* ---------- Phase 1: order on the ruler ---------- */
  function orderRound() {
    dots.set(round, 'current');
    const items = rng.shuffle(OBJECTS).slice(0, PER_ROUND);
    const sorted = [...items].sort((a, b) => a.m * 10 ** a.e - b.m * 10 ** b.e);
    let nextIdx = 0;
    let errors = 0;
    const ruler = h('div', { class: 'relative h-24 mt-4 mb-2', dir: 'ltr' });
    const axis = h('div', { class: 'absolute left-0 right-0 top-12 h-1 bg-gradient-to-r from-violet via-neon to-gold rounded-full' });
    ruler.append(axis);
    for (let e = EXP_MIN; e <= EXP_MAX; e += 2) {
      const x = ((e - EXP_MIN) / (EXP_MAX - EXP_MIN)) * 100;
      ruler.append(h('div', { class: 'absolute top-14 text-[10px] text-slate-500 -translate-x-1/2', style: `left:${x}%` }, mathEl(`10^{${e}}`)));
      ruler.append(h('div', { class: 'absolute top-10 h-5 w-px bg-space-600', style: `left:${x}%` }));
    }
    const status = h('div', { class: 'text-center min-h-8 font-bold' });
    const cards = h('div', { class: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4' });
    items.forEach((o) => {
      const b = h(
        'button',
        { class: 'choice flex-col !items-start', onclick: () => pick(o, b) },
        h('b', null, o.name),
        h('span', { class: 'text-neon text-lg' }, mathEl(`${texSci(o.m, o.e)}\\ \\text{${o.unit}}`)),
      );
      cards.append(b);
    });
    const panel = h('div', { class: 'panel p-6' }, h('div', { class: 'font-bold text-lg' }, `الجولة ${round + 1}: من الأصغر إلى الأكبر`), ruler, status, cards);
    host.replaceChildren(panel);

    function pick(o: (typeof OBJECTS)[number], b: HTMLButtonElement) {
      if (b.disabled) return;
      if (o !== sorted[nextIdx]) {
        errors++;
        sfx.wrong();
        replay(b, 'anim-shake');
        addPoints(-3, b);
        status.className = 'text-center min-h-8 font-bold text-bad';
        status.textContent = 'ليس الأصغر بين المتبقي! قارن الأسس أولاً.';
        return;
      }
      b.disabled = true;
      b.classList.add('correct', 'opacity-50');
      nextIdx++;
      sfx.correct(nextIdx);
      addPoints(10, b);
      const x = ((Math.log10(o.m) + o.e - EXP_MIN) / (EXP_MAX - EXP_MIN)) * 100;
      const marker = h(
        'div',
        { class: 'absolute -translate-x-1/2 flex flex-col items-center anim-pop', style: `left:${x}%; top:${nextIdx % 2 ? 0 : 0.25}rem` },
        h('span', { class: 'text-[10px] whitespace-nowrap bg-space-800 rounded px-1 border border-neon/40', dir: 'rtl' }, o.name),
        h('span', { class: 'w-3 h-3 rounded-full bg-gold mt-1 shadow-[0_0_10px_#fbbf24]' }),
      );
      ruler.append(marker);
      burstAt(marker, 12);
      status.className = 'text-center min-h-8 font-bold text-good';
      status.textContent = `✓ ${o.name}`;
      if (nextIdx === sorted.length) {
        dots.set(round, errors ? 'half' : 'good');
        setTimeout(nextRound, 1400);
      }
    }
  }

  /* ---------- Phase 2: decimal-point mover ---------- */
  let digits = '';
  let point = 0;
  let target = 0;
  let exponent = 0;
  let firstNZ = 0;
  let tries = 0;
  let numberEl: HTMLElement;
  let expInput: HTMLInputElement;
  let moveInfo: HTMLElement;
  let mStatus: HTMLElement;
  let busy = false;

  function moverRound() {
    phase = 'mover';
    dots.set(round, 'current');
    const s = randomSci(rng, rng.pick([1, 2, 3]), (round - ORDER_ROUNDS) % 2 === 0 ? 1 : -1);
    const std = sciValue(s).toString();
    const dot = std.indexOf('.');
    digits = std.replace('.', '');
    const orig = dot === -1 ? digits.length : dot;
    firstNZ = digits.search(/[1-9]/);
    target = firstNZ + 1;
    exponent = orig - target;
    point = orig;
    tries = 0;
    busy = false;
    numberEl = h('div', { class: 'text-4xl md:text-5xl font-black tracking-wider text-center my-6 font-mono', dir: 'ltr' });
    moveInfo = h('div', { class: 'text-center text-slate-300 min-h-6' });
    expInput = h('input', { class: 'answer-input !w-28 !text-2xl !py-1', dir: 'ltr', autocomplete: 'off', placeholder: 'n' });
    mStatus = h('div', { class: 'text-center min-h-8 font-bold mt-3' });
    const btn = (label: string, delta: number) => h('button', { class: 'btn text-2xl px-4', onclick: () => move(delta) }, label);
    host.replaceChildren(
      h(
        'div',
        { class: 'panel p-6' },
        h('div', { class: 'font-bold text-lg' }, `الجولة ${round - ORDER_ROUNDS + 1} من ${MOVER_ROUNDS}: حرّك الفاصلة ثم اكتب الأس`),
        h('div', { class: 'text-center text-slate-400' }, rich('الهدف: $1 \\le \\text{أ} < 10$ — استعمل الأسهم ← → أو الأزرار')),
        numberEl,
        h('div', { class: 'flex justify-center gap-3', dir: 'ltr' }, btn('◀', -1), btn('▶', 1)),
        moveInfo,
        h('div', { class: 'flex items-center justify-center gap-3 mt-4 text-3xl', dir: 'ltr' }, h('span', { class: 'mantissa' }), mathEl('\\times 10^{'), expInput, mathEl('}')),
        mStatus,
        h('div', { class: 'flex justify-center mt-2' }, h('button', { class: 'btn btn-primary', onclick: () => submitMover() }, 'تحقّق ', h('span', { class: 'kbd' }, 'Enter'))),
      ),
    );
    drawNumber();
    expInput.focus();
  }

  function drawNumber() {
    const parts: HTMLElement[] = [];
    for (let i = 0; i <= digits.length; i++) {
      if (i === point && i < digits.length) parts.push(h('span', { class: 'text-gold mx-0.5 animate-pulse' }, '.'));
      // leading zeros are dimmed: they are not significant digits
      if (i < digits.length) parts.push(h('span', { class: i < firstNZ ? 'text-slate-500' : 'text-white' }, digits[i]));
    }
    numberEl.replaceChildren(...parts);
    const moved = numberEl.dataset.orig ? Number(numberEl.dataset.orig) - point : 0;
    if (!numberEl.dataset.orig) numberEl.dataset.orig = String(point);
    moveInfo.textContent = moved === 0 ? 'لم تحرّك الفاصلة بعد' : `حرّكت الفاصلة ${Math.abs(moved)} ${Math.abs(moved) === 1 ? 'منزلة' : 'منازل'} إلى ${moved > 0 ? 'اليسار' : 'اليمين'}`;
    // mantissa preview
    const m = (digits.slice(0, point) || '0') + (point < digits.length ? '.' + digits.slice(point) : '');
    const clean = m.replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    const mant = host.querySelector('.mantissa');
    if (mant) mant.replaceChildren(mathEl(clean));
  }

  function move(delta: number) {
    if (phase !== 'mover' || busy) return;
    point = Math.min(digits.length, Math.max(1, point + delta));
    sfx.click();
    drawNumber();
  }

  function submitMover() {
    if (busy) return;
    const n = Number(expInput.value.replace(/[−–]/g, '-').trim());
    if (expInput.value.trim() === '' || !Number.isInteger(n)) {
      mStatus.className = 'text-center min-h-8 font-bold mt-3 text-gold';
      mStatus.textContent = 'اكتب الأس (عدداً صحيحاً، مثل 7 أو ‎-4‎)';
      return;
    }
    const pointOk = point === target;
    const expOk = n === exponent;
    if (pointOk && expOk) {
      busy = true;
      sfx.correct(round);
      burstAt(numberEl, 26);
      addPoints(tries === 0 ? 20 : 10, numberEl);
      dots.set(round, tries === 0 ? 'good' : 'half');
      mStatus.className = 'text-center min-h-8 font-bold mt-3 text-good';
      mStatus.textContent = '✓ ممتاز!';
      setTimeout(nextRound, 1200);
      return;
    }
    tries++;
    sfx.wrong();
    replay(numberEl, 'anim-shake');
    mStatus.className = 'text-center min-h-8 font-bold mt-3 text-bad';
    mStatus.textContent = !pointOk
      ? '✗ مكان الفاصلة غير صحيح: يجب أن يبقى رقم واحد غير صفري يسار الفاصلة.'
      : `✗ الأس غير صحيح: ${exponent > 0 ? 'العدد كبير ← الأس موجب' : 'العدد صغير ← الأس سالب'}، وعدد المنازل هو مقدار الأس.`;
    if (tries >= 2) {
      busy = true;
      dots.set(round, 'bad');
      point = target;
      drawNumber();
      mStatus.replaceChildren(rich(`الإجابة: $${digitsToMantissa()} \\times 10^{${exponent}}$`));
      setTimeout(nextRound, 2400);
    }
  }

  function digitsToMantissa(): string {
    return (digits.slice(0, target) + '.' + digits.slice(target)).replace(/^0+(?=\d)/, '').replace(/\.?0+$/, '');
  }

  function nextRound() {
    round++;
    if (round < ORDER_ROUNDS) return orderRound();
    if (round < ORDER_ROUNDS + MOVER_ROUNDS) return moverRound();
    phase = 'done';
    gameOver(host, { lesson: '2-9', score: Math.max(0, points), scoreLabel: 'نقاط', xp, replay: '/station/2-9/ruler', back });
  }

  orderRound();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (phase === 'mover') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        move(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitMover();
      }
    } else if (phase === 'done' && e.key === 'Enter') {
      e.preventDefault();
      go('/station/2-9/ruler');
    }
  });
  return () => {
    off();
    addTime('2-9', Date.now() - started);
  };
}
