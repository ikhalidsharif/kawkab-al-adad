import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import { texFrac } from '../core/mathutil';
import type { Difficulty, Generator } from '../core/question';
import type { Rng } from '../core/rng';
import { decimalParts, decimalTex } from './boss2';
import { isSquare, texNum } from './util';

export type SetName = 'طبيعي' | 'كلي' | 'صحيح' | 'نسبي' | 'غير نسبي' | 'حقيقي';
export const SET_ORDER: SetName[] = ['طبيعي', 'كلي', 'صحيح', 'نسبي', 'غير نسبي', 'حقيقي'];

export interface RealItem {
  tex: string;
  value: number;
  /** All sets the number belongs to (always ends with "حقيقي"). */
  sets: SetName[];
  /** Why — shown in solutions. */
  why: string;
}

const NAT: SetName[] = ['طبيعي', 'كلي', 'صحيح', 'نسبي', 'حقيقي'];
const WHOLE: SetName[] = ['كلي', 'صحيح', 'نسبي', 'حقيقي'];
const INT: SetName[] = ['صحيح', 'نسبي', 'حقيقي'];
const RAT: SetName[] = ['نسبي', 'حقيقي'];
const IRR: SetName[] = ['غير نسبي', 'حقيقي'];

/** The innermost set in the Venn diagram (used by the sorting game). */
export function innermost(item: RealItem): SetName {
  return item.sets[0];
}

/** Random real number of a given category, with the book's classic traps (√49, 6/3, 0.3̅ …). */
export function randomReal(rng: Rng, d: Difficulty): RealItem {
  const kinds = d === 1 ? ['nat', 'neg', 'frac', 'sqrtIrr', 'zero'] : d === 2 ? ['nat', 'neg', 'frac', 'dec', 'rep', 'sqrtIrr', 'pi'] : ['sqrtSq', 'negSqrtSq', 'fracInt', 'rep', 'sqrtIrr', 'negSqrtIrr', 'nonRep', 'sqrtFrac'];
  const kind = rng.pick(kinds);
  switch (kind) {
    case 'nat': {
      const n = rng.int(1, 30);
      return { tex: String(n), value: n, sets: NAT, why: `$${n}$ عدد طبيعي (عدّ)، وكل عدد طبيعي هو كلي وصحيح ونسبي وحقيقي.` };
    }
    case 'zero':
      return { tex: '0', value: 0, sets: WHOLE, why: '$0$ عدد كلي وليس طبيعياً.' };
    case 'neg': {
      const n = -rng.int(1, 30);
      return { tex: String(n), value: n, sets: INT, why: `$${n}$ عدد صحيح سالب، يمكن كتابته $\\frac{${n}}{1}$ فهو نسبي.` };
    }
    case 'frac': {
      const q = rng.pick([3, 4, 5, 7, 8, 9]);
      let p = rng.int(1, 2 * q);
      while (p % q === 0) p++;
      const f = new Fraction(p, q).mul(rng.sign());
      return { tex: texFrac(f), value: f.valueOf(), sets: RAT, why: `$${texFrac(f)}$ كسر على الصورة $\\frac{\\text{أ}}{\\text{ب}}$ فهو نسبي، وليس صحيحاً.` };
    }
    case 'dec': {
      const f = new Fraction(rng.int(-99, 99) || 7, 10).add(new Fraction(rng.int(1, 9), 100));
      return { tex: texNum(f), value: f.valueOf(), sets: RAT, why: `$${texNum(f)}$ كسر عشري منتهٍ، يمكن كتابته كسراً اعتيادياً فهو نسبي.` };
    }
    case 'rep': {
      const den = rng.pick([3, 9, 11, 6]);
      let num = rng.int(1, den - 1);
      while (decimalParts(num, den).rep === '') num = rng.int(1, den - 1); // must really repeat (3/6 = 0.5 doesn't)
      return { tex: decimalTex(num, den), value: num / den, sets: RAT, why: `$${decimalTex(num, den)}$ كسر عشري دوري، والكسر العشري الدوري نسبي (يساوي $${texFrac(new Fraction(num, den))}$).` };
    }
    case 'sqrtSq': {
      const k = rng.int(2, 12);
      return { tex: `\\sqrt{${k * k}}`, value: k, sets: NAT, why: `$\\sqrt{${k * k}} = ${k}$ عدد طبيعي.` };
    }
    case 'negSqrtSq': {
      const k = rng.int(2, 12);
      return { tex: `-\\sqrt{${k * k}}`, value: -k, sets: INT, why: `$-\\sqrt{${k * k}} = -${k}$ عدد صحيح.` };
    }
    case 'fracInt': {
      const k = rng.int(2, 6);
      const q = rng.int(2, 5);
      return { tex: `\\frac{${k * q}}{${q}}`, value: k, sets: NAT, why: `$\\frac{${k * q}}{${q}} = ${k}$ عدد طبيعي.` };
    }
    case 'sqrtFrac': {
      const p = rng.int(1, 7);
      const q = rng.pick([2, 3, 4, 5, 9, 10]);
      const f = new Fraction(p * p, q * q);
      return { tex: `\\sqrt{${texFrac(f)}}`, value: p / q, sets: p % q === 0 ? NAT : RAT, why: `$\\sqrt{${texFrac(f)}} = ${texFrac(new Fraction(p, q))}$ ${p % q === 0 ? 'عدد طبيعي' : 'عدد نسبي'}.` };
    }
    case 'sqrtIrr':
    case 'negSqrtIrr': {
      let n = rng.int(2, 99);
      while (isSquare(n)) n++;
      const neg = kind === 'negSqrtIrr';
      return { tex: `${neg ? '-' : ''}\\sqrt{${n}}`, value: (neg ? -1 : 1) * Math.sqrt(n), sets: IRR, why: `$${n}$ ليس مربعاً كاملاً، فجذره كسر عشري غير منتهٍ وغير دوري: عدد غير نسبي.` };
    }
    case 'pi':
      return { tex: '\\pi', value: Math.PI, sets: IRR, why: '$\\pi = 3.14159\\ldots$ غير منتهٍ وغير دوري، فهو غير نسبي.' };
    default: {
      const a = rng.pick(['0.1010010001', '2.1211211121', '5.0100100010']);
      return { tex: `${a}\\ldots`, value: Number(a), sets: IRR, why: 'كسر عشري غير منتهٍ وغير دوري (النمط ليس تكراراً لمجموعة الأرقام نفسها) ← غير نسبي.' };
    }
  }
}

const setsText = (s: SetName[]) => s.join('، ');

/* ---------- 1. Name all sets ---------- */
export const classify: Generator = {
  id: '3-4/classify',
  lesson: '3-4',
  label: 'تصنيف الأعداد الحقيقية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const item = randomReal(rng, d);
    const correct = setsText(item.sets);
    const pool = [NAT, WHOLE, INT, RAT, IRR, ['طبيعي', 'صحيح', 'حقيقي'], ['نسبي', 'غير نسبي', 'حقيقي'], ['صحيح', 'حقيقي'], ['كلي', 'نسبي', 'حقيقي']] as SetName[][];
    const { choices, index } = makeChoices(rng, correct, rng.shuffle(pool.map(setsText).filter((s) => s !== correct)));
    return {
      prompt: `سمِّ جميع المجموعات التي ينتمي إليها العدد: $$${item.tex}$$`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: `\\text{${correct}}`,
      hints: ['ابدأ بالسؤال: هل يمكن كتابته على صورة $\\frac{\\text{أ}}{\\text{ب}}$؟ ثم بسّطه: هل هو عدد صحيح؟ كلي؟ طبيعي؟'],
      solution: [item.why, `المجموعات: ${correct}`],
      meta: { sets: item.sets, value: item.value },
    };
  },
};

/* ---------- 2. Rational or irrational? ---------- */
export const rational: Generator = {
  id: '3-4/rational',
  lesson: '3-4',
  label: 'نسبي أم غير نسبي؟',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const item = randomReal(rng, d);
    const isRat = !item.sets.includes('غير نسبي');
    return {
      prompt: `هل العدد $${item.tex}$ نسبي أم غير نسبي؟`,
      answer: { kind: 'choice', index: isRat ? 0 : 1 },
      choices: ['نسبي', 'غير نسبي'],
      answerTex: `\\text{${isRat ? 'نسبي' : 'غير نسبي'}}`,
      hints: ['العدد النسبي يمكن كتابته على صورة $\\frac{\\text{أ}}{\\text{ب}}$، وكسره العشري منتهٍ أو دوري.'],
      solution: [item.why],
      meta: { sets: item.sets },
    };
  },
};

/* ---------- 3. Order real numbers ---------- */
export const order: Generator = {
  id: '3-4/order',
  lesson: '3-4',
  label: 'ترتيب الأعداد الحقيقية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const items: { tex: string; value: number }[] = [];
    const maker = (): { tex: string; value: number } => {
      const t = rng.int(0, 3);
      if (t === 0) {
        let n = rng.int(2, 60);
        while (isSquare(n)) n++;
        return { tex: `\\sqrt{${n}}`, value: Math.sqrt(n) };
      }
      if (t === 1) {
        const f = new Fraction(rng.int(1, 30), rng.pick([2, 3, 4, 5, 8]));
        return { tex: texFrac(f), value: f.valueOf() };
      }
      if (t === 2) {
        const f = new Fraction(rng.int(10, 79), 10);
        return { tex: texNum(f), value: f.valueOf() };
      }
      if (rng.chance(0.5)) return { tex: '\\pi', value: Math.PI };
      const w = rng.int(1, 6);
      return { tex: `${w}.\\overline{6}`, value: w + 2 / 3 };
    };
    while (items.length < 4) {
      let it = maker();
      if (d === 3 && rng.chance(0.4)) it = { tex: `-${it.tex}`, value: -it.value };
      if (items.every((x) => Math.abs(x.value - it.value) > 0.05)) items.push(it);
    }
    const sorted = [...items].sort((a, b) => a.value - b.value);
    const fmt = (arr: typeof items) => `$${arr.map((x) => x.tex).join(' ,\\ ')}$`;
    const correct = fmt(sorted);
    const { choices, index } = makeChoices(rng, correct, [fmt([...sorted].reverse()), fmt([sorted[1], sorted[0], sorted[2], sorted[3]]), fmt([sorted[0], sorted[2], sorted[1], sorted[3]]), fmt([sorted[0], sorted[1], sorted[3], sorted[2]])].filter((c) => c !== correct));
    const approx = sorted.map((x) => `$${x.tex} \\approx ${x.value.toFixed(2)}$`).join('، ');
    return {
      prompt: `رتّب الأعداد من الأصغر إلى الأكبر: ${items.map((x) => `$${x.tex}$`).join(' ، ')}`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: sorted.map((x) => x.tex).join(' < '),
      hints: ['اكتب كل عدد كسراً عشرياً تقريبياً، ثم قارن.'],
      solution: [`نكتب كل عدد بصورة عشرية تقريبية: ${approx}`, `الترتيب: $${sorted.map((x) => x.tex).join(' < ')}$`],
      meta: { values: items.map((x) => x.value), sorted: sorted.map((x) => x.value) },
    };
  },
};

/* ---------- 4. Compare two real numbers ---------- */
export const compare: Generator = {
  id: '3-4/compare',
  lesson: '3-4',
  label: 'مقارنة الأعداد الحقيقية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const pairs: [string, number, string, number][] = [];
    let n = rng.int(5, 90);
    while (isSquare(n)) n++;
    const r = Math.sqrt(n);
    const dec = Math.round(r * 10) / 10 + rng.pick([-0.1, 0.1]);
    pairs.push([`\\sqrt{${n}}`, r, dec.toFixed(1), dec]);
    pairs.push(['\\pi', Math.PI, '3.14', 3.14]);
    pairs.push(['0.\\overline{3}', 1 / 3, '\\frac{1}{3}', 1 / 3]);
    const k = rng.int(2, 9);
    pairs.push([`\\sqrt{${k * k}}`, k, String(k), k]);
    pairs.push([`\\sqrt{0.${k * k < 10 ? '0' + k * k : k * k}}`, k / 10, `0.${k}`, k / 10]);
    const [a, av, b, bv] = d === 1 ? pairs[0] : rng.pick(pairs);
    const sym = Math.abs(av - bv) < 1e-12 ? '=' : av > bv ? '>' : '<';
    return {
      prompt: `اختر الرمز المناسب: $$${a} \\;\\bigcirc\\; ${b}$$`,
      answer: { kind: 'choice', index: ['>', '<', '='].indexOf(sym) },
      choices: ['$>$', '$<$', '$=$'],
      answerTex: `${a} ${sym} ${b}`,
      hints: ['اكتب العددين على صورة كسر عشري (أو قارن مربّعيهما إذا كانا موجبين).'],
      solution: [`$${a} ${sym === '=' ? '=' : '\\approx'} ${Number(av.toFixed(4))}$${sym === '=' ? '' : ` و $${b} = ${bv}$`}`, `إذن $${a} ${sym} ${b}$`],
      meta: { av, bv, sym },
    };
  },
};

export const generators3_4 = [classify, rational, order, compare];
export { SET_ORDER as SETS };
