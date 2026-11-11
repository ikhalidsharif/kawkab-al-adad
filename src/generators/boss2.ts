import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import { gcd, texFrac, texMixed } from '../core/mathutil';
import type { Generator } from '../core/question';
import { texNum } from './util';

/** Long division: digits before the repeating block and the repeating block itself. */
export function decimalParts(n: number, d: number): { int: number; nonRep: string; rep: string } {
  const int = Math.floor(n / d);
  let r = n % d;
  const seen = new Map<number, number>();
  let digits = '';
  while (r !== 0 && !seen.has(r)) {
    seen.set(r, digits.length);
    r *= 10;
    digits += String(Math.floor(r / d));
    r %= d;
  }
  if (r === 0) return { int, nonRep: digits, rep: '' };
  const at = seen.get(r)!;
  return { int, nonRep: digits.slice(0, at), rep: digits.slice(at) };
}

export function decimalTex(n: number, d: number, neg = false): string {
  const { int, nonRep, rep } = decimalParts(n, d);
  const s = neg ? '-' : '';
  if (!nonRep && !rep) return `${s}${int}`;
  return `${s}${int}.${nonRep}${rep ? `\\overline{${rep}}` : ''}`;
}

const TERMINATING = [2, 4, 5, 8, 10, 20, 25, 40];
const REPEATING = [3, 6, 9, 11, 12, 15, 7];

/** Chapter 2 test item (p.77): write a fraction as a decimal. */
export const toDecimal: Generator = {
  id: 'boss2/to-decimal',
  lesson: '2-5',
  label: 'كتابة الكسر الاعتيادي كسراً عشرياً',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    if (d <= 2) {
      const den = d === 1 ? rng.pick([2, 4, 5, 10, 20, 25]) : rng.pick(TERMINATING);
      let num = rng.int(1, den - 1);
      while (gcd(num, den) !== 1) num = rng.int(1, den - 1);
      let f = new Fraction(num, den);
      if (d === 2 && rng.chance(0.4)) f = f.add(rng.int(1, 5));
      if (d === 2 && rng.chance(0.4)) f = f.neg();
      const shown = Number(f.n) > Number(f.d) && rng.chance(0.5) ? texMixed(f) : texFrac(f);
      const k = Number(f.d);
      const scale = [10, 100, 1000].find((p) => p % k === 0)!;
      return {
        prompt: `اكتب العدد كسراً عشرياً: $$${shown}$$`,
        answer: { kind: 'fraction', value: f, requireSimplest: false, decimalOnly: true },
        answerTex: texNum(f),
        hints: [`اقسم البسط على المقام، أو اجعل المقام $${scale}$.`],
        solution: [
          `$${texFrac(f.abs())} = \\frac{${Number(f.n) * (scale / k)}}{${scale}}$`,
          `$${shown} = ${texNum(f)}$`,
        ],
        placeholder: 'مثال: 0.375',
        meta: { n: Number(f.s) * Number(f.n), d: Number(f.d) },
      };
    }
    const den = rng.pick(REPEATING);
    let num = rng.int(1, den - 1);
    while (gcd(num, den) !== 1 || decimalParts(num, den).rep === '') num = rng.int(1, den - 1);
    const correct = `$${decimalTex(num, den)}$`;
    const { int, nonRep, rep } = decimalParts(num, den);
    const plain = `${int}.${nonRep}${rep}`;
    // Common mistakes: no bar (terminating), bar over the wrong digits, "digits of the fraction".
    const distract = [
      `$${plain}$`,
      nonRep ? `$${int}.\\overline{${nonRep}${rep}}$` : `$${int}.${rep}\\overline{${(Number(rep[rep.length - 1]) + 1) % 10}}$`,
      `$${int}.${num}${den}$`,
      `$${int}.\\overline{${num}${den}}$`,
    ];
    const { choices, index } = makeChoices(rng, correct, distract);
    return {
      prompt: `أيّ مما يأتي يساوي $${texFrac(new Fraction(num, den))}$ كسراً عشرياً؟`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: decimalTex(num, den),
      hints: ['اقسم البسط على المقام بالقسمة الطويلة، ولاحظ الأرقام التي تتكرر.'],
      solution: [`$${num} \\div ${den} = ${plain}${rep}\\ldots$`, `الرقم/الأرقام $${rep}$ تتكرر، فنضع فوقها خطاً: $${decimalTex(num, den)}$ (كسر عشري دوري)`],
      meta: { n: num, d: den },
    };
  },
};

export const generatorsBoss2 = [toDecimal];
