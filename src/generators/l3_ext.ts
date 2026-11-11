import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import type { Generator } from '../core/question';
import type { Rng } from '../core/rng';
import { isSquare } from './util';

/** n = a² + b² with 1 ≤ a ≤ b ≤ 6 and n not a perfect square (so √n is irrational). */
export function sumOfSquares(rng: Rng, maxLeg = 6): { n: number; a: number; b: number } {
  for (;;) {
    const a = rng.int(1, maxLeg);
    const b = rng.int(a, maxLeg);
    const n = a * a + b * b;
    if (!isSquare(n)) return { n, a, b };
  }
}

/* ---------- 1. Which legs construct √n? ---------- */
export const legs: Generator = {
  id: '3-ext/legs',
  lesson: '3-ext',
  label: 'اختيار الساقين لإنشاء جذر',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const { n, a, b } = d === 1 ? rng.pick([{ n: 2, a: 1, b: 1 }, { n: 5, a: 1, b: 2 }, { n: 10, a: 1, b: 3 }]) : sumOfSquares(rng, d === 2 ? 4 : 6);
    // (x, y) and (y, x) are the same pair: always write the smaller first so distractors never repeat it
    const pair = (x: number, y: number) => `ساقان: $${Math.min(x, y)}$ و $${Math.max(x, y)}$`;
    const wrong: string[] = [];
    // classic mistakes: legs adding to n, legs whose squares don't add to n
    for (let x = 1; x <= 7 && wrong.length < 6; x++) {
      const y = n - x;
      if (y >= x && y <= 12 && x * x + y * y !== n) wrong.push(pair(x, y));
    }
    wrong.push(pair(a, b + 1), pair(a + 1, b), pair(Math.max(1, a - 1), b + 1));
    const correct = pair(a, b);
    const { choices, index } = makeChoices(rng, correct, rng.shuffle(wrong.filter((w) => w !== correct)));
    return {
      prompt: `لتمثيل $\\sqrt{${n}}$ على خط الأعداد نرسم مثلثاً قائماً ساقاه عددان صحيحان، ثم ننقل طول الوتر بالفرجار. أيّ ساقين نختار؟`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: `${a}^{2} + ${b}^{2} = ${n}`,
      hints: [`نحتاج: $\\text{أ}^{2} + \\text{ب}^{2} = ${n}$`],
      solution: [`$${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${n}$`, `إذن الوتر $= \\sqrt{${n}}$، ونرسم قوساً مركزه $0$ ونصف قطره الوتر ليقطع خط الأعداد عند $\\sqrt{${n}}$.`],
      meta: { n, a, b },
    };
  },
};

/* ---------- 2. Hypotenuse as √n ---------- */
export const value: Generator = {
  id: '3-ext/value',
  lesson: '3-ext',
  label: 'طول الوتر على صورة √ن',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const { n, a, b } = sumOfSquares(rng, d === 1 ? 3 : 6);
    const k = Math.floor(Math.sqrt(n));
    if (d === 3) {
      const opt = (x: number) => `بين $${x}$ و $${x + 1}$`;
      const { choices, index } = makeChoices(rng, opt(k), [opt(k - 1), opt(k + 1), opt(k + 2)].filter((o) => !o.includes('$-')));
      return {
        prompt: `رسمنا مثلثاً قائماً ساقاه $${a}$ و $${b}$ على خط الأعداد ابتداءً من الصفر، ثم رسمنا قوساً بالفرجار نصف قطره الوتر. بين أيّ عددين صحيحين تقع النقطة التي يقطع فيها القوس خط الأعداد؟`,
        answer: { kind: 'choice', index },
        choices,
        answerTex: `${k} < \\sqrt{${n}} < ${k + 1}`,
        hints: ['احسب طول الوتر $\\sqrt{\\text{أ}^{2} + \\text{ب}^{2}}$، ثم قدّره.'],
        solution: [`الوتر $= \\sqrt{${a}^{2} + ${b}^{2}} = \\sqrt{${n}}$`, `$${k * k} < ${n} < ${(k + 1) ** 2}$ ⇐ $${k} < \\sqrt{${n}} < ${k + 1}$`],
        meta: { n, a, b },
      };
    }
    return {
      prompt: `مثلث قائم الزاوية طولا ساقيه $${a}$ و $${b}$ وحدة. إذا كُتب طول الوتر على الصورة $\\sqrt{\\text{ن}}$، فما قيمة $\\text{ن}$؟`,
      answer: { kind: 'fraction', value: new Fraction(n) },
      answerTex: `\\text{ن} = ${n}`,
      hints: ['$\\text{جـ}^{2} = \\text{أ}^{2} + \\text{ب}^{2}$'],
      solution: [`$\\text{جـ}^{2} = ${a}^{2} + ${b}^{2} = ${n}$`, `$\\text{جـ} = \\sqrt{${n}}$ ⇐ $\\text{ن} = ${n}$`],
      placeholder: 'ن',
      meta: { n, a, b },
    };
  },
};

export const generators3_ext = [legs, value];
