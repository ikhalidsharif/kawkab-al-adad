import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import { texFrac } from '../core/mathutil';
import type { Generator } from '../core/question';
import { evalExact } from '../core/expr';
import { isSquare, texNum } from './util';

const A = '\\text{أ}';
const B = '\\text{ب}';

/* ---------- 1. Perfect squares 1² … 20² ---------- */
export const squares: Generator = {
  id: '3-0/squares',
  lesson: '3-0',
  label: 'المربعات الكاملة',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const n = rng.int(d === 1 ? 2 : 4, 20);
    if (d === 1) {
      return {
        prompt: `احسب: $$${n}^{2}$$`,
        answer: { kind: 'fraction', value: new Fraction(n * n) },
        answerTex: String(n * n),
        hints: [`$${n}^{2} = ${n} \\times ${n}$`],
        solution: [`$${n}^{2} = ${n} \\times ${n} = ${n * n}$`],
        placeholder: 'العدد',
        meta: { n, value: n * n },
      };
    }
    if (d === 2) {
      return {
        prompt: `ما العدد الموجب الذي مربّعه $${n * n}$؟`,
        answer: { kind: 'fraction', value: new Fraction(n) },
        answerTex: String(n),
        hints: ['جرّب أعداداً: أي عدد إذا ضربته في نفسه أعطى هذا الناتج؟'],
        solution: [`$${n} \\times ${n} = ${n * n}$، إذن العدد هو $${n}$`],
        placeholder: 'العدد',
        meta: { n, value: n },
      };
    }
    const sq = n * n;
    const near = [sq - 1, sq + 1, sq + n, sq - n + 1, sq + 2].filter((x) => x > 1 && !isSquare(x)).map(String);
    const { choices, index } = makeChoices(rng, String(sq), rng.shuffle(near));
    return {
      prompt: 'أيّ الأعداد الآتية مربع كامل؟',
      answer: { kind: 'choice', index },
      choices: choices.map((c) => `$${c}$`),
      answerTex: `${sq} = ${n}^{2}`,
      hints: ['المربع الكامل هو مربع عدد صحيح. راجع المربعات من $1^{2}$ إلى $20^{2}$.'],
      solution: [`$${sq} = ${n}^{2}$ فهو مربع كامل، والبقية تقع بين مربعين متتاليين.`],
      meta: { n, value: sq },
    };
  },
};

/* ---------- 2. Order numbers (least to greatest) ---------- */
export const order: Generator = {
  id: '3-0/order',
  lesson: '3-0',
  label: 'ترتيب الأعداد',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const vals: { tex: string; v: Fraction }[] = [];
    while (vals.length < 4) {
      let v: Fraction;
      let tex: string;
      if (d === 1) {
        v = new Fraction(rng.int(-20, 20));
        tex = texNum(v);
      } else if (d === 2 || rng.chance(0.5)) {
        v = new Fraction(rng.int(-50, 50), 10);
        tex = texNum(v);
      } else {
        const den = rng.pick([2, 3, 4, 5, 8]);
        v = new Fraction(rng.int(-2 * den, 2 * den), den);
        tex = texFrac(v);
      }
      if (!vals.some((x) => x.v.equals(v))) vals.push({ tex, v });
    }
    const sorted = [...vals].sort((a, b) => a.v.compare(b.v));
    const fmt = (arr: typeof vals) => `$${arr.map((x) => x.tex).join(' ,\\ ')}$`;
    const correct = fmt(sorted);
    const wrong = [fmt([...sorted].reverse()), fmt([sorted[1], sorted[0], sorted[2], sorted[3]]), fmt([sorted[0], sorted[2], sorted[1], sorted[3]]), fmt([...vals].sort((a, b) => a.v.abs().compare(b.v.abs())))].filter((w) => w !== correct);
    const { choices, index } = makeChoices(rng, correct, wrong, () => fmt(rng.shuffle(vals)));
    return {
      prompt: `رتّب الأعداد من الأصغر إلى الأكبر: ${vals.map((x) => `$${x.tex}$`).join(' ، ')}`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: sorted.map((x) => x.tex).join(' < '),
      hints: ['العدد السالب أصغر من الموجب، وكلما كبرت القيمة المطلقة لعدد سالب صغُر العدد.'],
      solution: [`$${sorted.map((x) => x.tex).join(' < ')}$`],
      meta: { values: vals.map((x) => x.v.valueOf()), sorted: sorted.map((x) => x.v.valueOf()) },
    };
  },
};

/* ---------- 3. Substitute into an expression ---------- */
export const substitute: Generator = {
  id: '3-0/substitute',
  lesson: '3-0',
  label: 'التعويض في عبارة',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const a = d === 3 ? rng.int(-9, -2) : rng.int(2, 9);
    const b = d === 1 ? rng.int(2, 9) : rng.int(-9, 12) || 3;
    const t = d === 1 ? rng.pick([0, 1]) : d === 2 ? rng.pick([1, 2]) : rng.pick([2, 3]);
    const forms: [string, string][] = [
      [`${A}^{2} + ${B}^{2}`, `(${a})**2 + (${b})**2`],
      [`${A}^{2} + ${B}`, `(${a})**2 + (${b})`],
      [`${B}^{2} - ${A}^{2}`, `(${b})**2 - (${a})**2`],
      [`2${A} + ${B}^{2}`, `2*(${a}) + (${b})**2`],
    ];
    const [tex, js] = forms[t];
    const v = evalExact(js);
    const sub = tex.replace(/\\text\{أ\}/g, `(${a})`).replace(/\\text\{ب\}/g, `(${b})`);
    return {
      prompt: `أوجد قيمة $${tex}$ إذا كان $${A} = ${a}$ ، $${B} = ${b}$`,
      answer: { kind: 'fraction', value: v },
      answerTex: String(v),
      hints: ['ضع كل قيمة بين قوسين مكان المتغير، ثم احسب الأسس أولاً.'],
      solution: [`$${sub}$`, `$= ${v}$`],
      placeholder: 'العدد',
      meta: { js },
    };
  },
};

export const generators3_0 = [squares, order, substitute];
