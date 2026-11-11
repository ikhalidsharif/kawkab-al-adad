import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import type { Generator } from '../core/question';
import type { Rng } from '../core/rng';
import { isSquare, texNum } from './util';

/** A non-perfect-square integer in [lo, hi]. */
export function nonSquare(rng: Rng, lo: number, hi: number): number {
  for (;;) {
    const n = rng.int(lo, hi);
    if (!isSquare(n)) return n;
  }
}

/** Nearest integer to √n for integer n ≥ 0 (exact: compares with (k + 0.5)² = k² + k + 0.25). */
export function nearestRoot(n: number): number {
  const k = Math.floor(Math.sqrt(n));
  return n <= k * k + k ? k : k + 1;
}

const range = (d: number): [number, number] => (d === 1 ? [2, 99] : d === 2 ? [101, 399] : [401, 999]);

function betweenSteps(n: number): string[] {
  const k = Math.floor(Math.sqrt(n));
  const near = nearestRoot(n);
  return [
    `أقرب مربعين كاملين: $${k}^{2} = ${k * k}$ و $${k + 1}^{2} = ${(k + 1) ** 2}$`,
    `$${k * k} < ${n} < ${(k + 1) ** 2}$ ⇐ $${k} < \\sqrt{${n}} < ${k + 1}$`,
    `$${n}$ أقرب إلى $${near * near}$ (الفرق $${Math.abs(n - near * near)}$) منه إلى $${(near === k ? k + 1 : k) ** 2}$ (الفرق $${Math.abs(n - (near === k ? k + 1 : k) ** 2)}$)، فأقرب عدد صحيح هو $${near}$`,
  ];
}

/* ---------- 1. Between which two consecutive integers? ---------- */
export const between: Generator = {
  id: '3-2/between',
  lesson: '3-2',
  label: 'تقدير الجذر بين عددين صحيحين',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const n = nonSquare(rng, ...range(d));
    const k = Math.floor(Math.sqrt(n));
    const opt = (a: number) => `$${a} < \\sqrt{${n}} < ${a + 1}$`;
    const half = Math.floor(n / 2);
    const { choices, index } = makeChoices(rng, opt(k), [opt(k - 1), opt(k + 1), opt(Math.max(1, k - 2)), `$${half} < \\sqrt{${n}} < ${half + 1}$`].filter((c) => c !== opt(k)));
    return {
      prompt: `بين أيّ عددين صحيحين متتاليين يقع $\\sqrt{${n}}$؟`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: `${k} < \\sqrt{${n}} < ${k + 1}`,
      hints: [`ما المربعان الكاملان اللذان يقع بينهما $${n}$؟`],
      solution: betweenSteps(n).slice(0, 2),
      meta: { n, k },
    };
  },
};

/* ---------- 2. Nearest integer ---------- */
export const nearest: Generator = {
  id: '3-2/nearest',
  lesson: '3-2',
  label: 'تقدير الجذر لأقرب عدد صحيح',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const n = nonSquare(rng, ...range(d));
    const neg = d === 3 && rng.chance(0.4);
    const v = nearestRoot(n) * (neg ? -1 : 1);
    return {
      prompt: `قدّر $${neg ? '-' : ''}\\sqrt{${n}}$ لأقرب عدد صحيح.`,
      answer: { kind: 'fraction', value: new Fraction(v) },
      answerTex: String(v),
      hints: [`حدّد المربعين الكاملين اللذين يقع بينهما $${n}$، ثم أيهما أقرب.`],
      solution: [...betweenSteps(n), ...(neg ? [`مع الإشارة السالبة: $-\\sqrt{${n}} \\approx ${v}$`] : [])],
      placeholder: 'عدد صحيح',
      meta: { n, sign: neg ? -1 : 1 },
    };
  },
};

/* ---------- 3. Compare √n with a number ---------- */
export const compare: Generator = {
  id: '3-2/compare',
  lesson: '3-2',
  label: 'مقارنة الجذور بالأعداد',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    let n: number;
    let other: Fraction;
    if (d === 1) {
      const k = rng.int(3, 12);
      other = new Fraction(k);
      n = rng.pick([k * k - rng.int(1, k), k * k + rng.int(1, k), k * k]);
    } else {
      const k = rng.int(3, 15);
      other = new Fraction(10 * k + rng.pick([2, 5, 8]), 10);
      const sq = other.mul(other).valueOf();
      n = Math.round(sq) + rng.pick([-1, 0, 1]);
      if (d === 3) n = rng.chance(0.5) ? Math.floor(sq) : Math.ceil(sq);
    }
    const cmp = new Fraction(n).compare(other.mul(other));
    const sym = cmp > 0 ? '>' : cmp < 0 ? '<' : '=';
    const ot = texNum(other);
    return {
      prompt: `اختر الرمز المناسب: $$\\sqrt{${n}} \\;\\bigcirc\\; ${ot}$$`,
      answer: { kind: 'choice', index: ['>', '<', '='].indexOf(sym) },
      choices: ['$>$', '$<$', '$=$'],
      answerTex: `\\sqrt{${n}} ${sym} ${ot}`,
      hints: [`قارن مربّعي العددين: $${n}$ و $${ot}^{2}$`],
      solution: [`$${ot}^{2} = ${texNum(other.mul(other))}$`, `$${n} ${sym} ${texNum(other.mul(other))}$ ⇐ $\\sqrt{${n}} ${sym} ${ot}$`],
      meta: { n, other: other.valueOf(), sym },
    };
  },
};

/* ---------- 4. Word: side of a square room ---------- */
export const word: Generator = {
  id: '3-2/word',
  lesson: '3-2',
  label: 'مسائل: تقدير طول ضلع مربع',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const n = nonSquare(rng, d === 1 ? 10 : 50, d === 1 ? 99 : d === 2 ? 300 : 900);
    const thing = rng.pick([
      ['غرفة مربعة الشكل', 'م²', 'م'],
      ['قطعة أرض مربعة', 'م²', 'م'],
      ['لوحة مربعة', 'سم²', 'سم'],
    ]);
    const near = nearestRoot(n);
    return {
      prompt: `${thing[0]} مساحتها $${n}$ ${thing[1]}. قدّر طول ضلعها لأقرب عدد صحيح (${thing[2]}).`,
      answer: { kind: 'fraction', value: new Fraction(near) },
      answerTex: String(near),
      hints: [`طول الضلع $= \\sqrt{${n}}$`],
      solution: [`طول الضلع $= \\sqrt{${n}}$`, ...betweenSteps(n)],
      placeholder: 'عدد صحيح',
      meta: { n, sign: 1 },
    };
  },
};

export const generators3_2 = [between, nearest, compare, word];
