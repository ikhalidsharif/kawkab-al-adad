import Fraction from 'fraction.js';
import type { Difficulty, Generator, QuestionBody } from '../core/question';
import type { Rng } from '../core/rng';
import { isSquare, round1, tenthAnswer, texNum } from './util';

const C = '\\text{جـ}';
export const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
];

/** A Pythagorean triple (possibly scaled), all sides ≤ max. */
export function randomTriple(rng: Rng, max = 60): [number, number, number] {
  for (;;) {
    const [a, b, c] = rng.pick(TRIPLES);
    const k = rng.int(1, Math.max(1, Math.floor(max / c)));
    if (c * k <= max) return rng.chance(0.5) ? [a * k, b * k, c * k] : [b * k, a * k, c * k];
  }
}

/** Legs (a, b) for a difficulty: triples for d1, arbitrary integers (non-triple) for d2, decimals for d3. */
function legs(rng: Rng, d: Difficulty): [Fraction, Fraction] {
  if (d === 1) {
    const [a, b] = randomTriple(rng, 50);
    return [new Fraction(a), new Fraction(b)];
  }
  if (d === 2) {
    for (;;) {
      const a = rng.int(2, 15);
      const b = rng.int(2, 15);
      if (!isSquare(a * a + b * b)) return [new Fraction(a), new Fraction(b)];
    }
  }
  return [new Fraction(rng.int(10, 99), 10), new Fraction(rng.int(2, 20))];
}

function result(value: Fraction): { answer: QuestionBody['answer']; tex: string; exact: boolean } {
  const v = value.valueOf();
  const r = Math.sqrt(v);
  // exact when the square is a perfect square of a terminating decimal
  const exact = Math.abs(round1(r) - r) < 1e-9;
  return exact
    ? { answer: { kind: 'fraction', value: new Fraction(round1(r)), requireSimplest: false }, tex: texNum(new Fraction(round1(r))), exact }
    : { answer: tenthAnswer(r), tex: `\\approx ${round1(r).toFixed(1)}`, exact };
}

/* ---------- 1. Find the hypotenuse ---------- */
export const hyp: Generator = {
  id: '3-5/hyp',
  lesson: '3-5',
  label: 'إيجاد طول الوتر',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const [a, b] = legs(rng, d);
    const sq = a.mul(a).add(b.mul(b));
    const r = result(sq);
    return {
      prompt: `مثلث قائم الزاوية طولا ساقيه $${texNum(a)}$ و $${texNum(b)}$. أوجد طول الوتر $${C}$${r.exact ? '' : ' مقرّباً لأقرب جزء من عشرة'}.`,
      answer: r.answer,
      answerTex: `${C} ${r.exact ? '= ' : ''}${r.tex}`,
      hints: [`نظرية فيثاغورس: $${C}^{2} = \\text{أ}^{2} + \\text{ب}^{2}$`, `$${C}^{2} = ${texNum(a)}^{2} + ${texNum(b)}^{2}$`],
      solution: [
        `$${C}^{2} = \\text{أ}^{2} + \\text{ب}^{2}$`,
        `$${C}^{2} = ${texNum(a)}^{2} + ${texNum(b)}^{2} = ${texNum(a.mul(a))} + ${texNum(b.mul(b))} = ${texNum(sq)}$`,
        `$${C} = \\sqrt{${texNum(sq)}} ${r.exact ? '= ' : ''}${r.tex}$`,
      ],
      placeholder: r.exact ? 'العدد' : 'لأقرب جزء من عشرة، مثال: 7.2',
      meta: { a: a.valueOf(), b: b.valueOf(), find: 'c' },
    };
  },
};

/* ---------- 2. Find a leg ---------- */
export const leg: Generator = {
  id: '3-5/leg',
  lesson: '3-5',
  label: 'إيجاد طول ساق',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    let a: Fraction;
    let c: Fraction;
    if (d === 1) {
      const [x, , z] = randomTriple(rng, 50);
      a = new Fraction(x);
      c = new Fraction(z);
    } else if (d === 2) {
      a = new Fraction(rng.int(2, 14));
      c = new Fraction(rng.int(a.valueOf() + 1, 20));
      while (isSquare(c.mul(c).sub(a.mul(a)).valueOf())) c = c.add(1);
    } else {
      a = new Fraction(rng.int(10, 60), 10);
      c = a.add(new Fraction(rng.int(5, 80), 10));
    }
    const sq = c.mul(c).sub(a.mul(a));
    const r = result(sq);
    return {
      prompt: `مثلث قائم الزاوية طول وتره $${texNum(c)}$ وطول إحدى ساقيه $${texNum(a)}$. أوجد طول الساق الأخرى $\\text{ب}$${r.exact ? '' : ' مقرّباً لأقرب جزء من عشرة'}.`,
      answer: r.answer,
      answerTex: `\\text{ب} ${r.exact ? '= ' : ''}${r.tex}`,
      hints: [`$${C}^{2} = \\text{أ}^{2} + \\text{ب}^{2}$، والمجهول هنا ساق.`, `$\\text{ب}^{2} = ${texNum(c)}^{2} - ${texNum(a)}^{2}$`],
      solution: [
        `$${texNum(c)}^{2} = ${texNum(a)}^{2} + \\text{ب}^{2}$`,
        `$${texNum(c.mul(c))} = ${texNum(a.mul(a))} + \\text{ب}^{2}$ ⇐ نطرح $${texNum(a.mul(a))}$ من الطرفين: $\\text{ب}^{2} = ${texNum(sq)}$`,
        `$\\text{ب} = \\sqrt{${texNum(sq)}} ${r.exact ? '= ' : ''}${r.tex}$`,
      ],
      placeholder: r.exact ? 'العدد' : 'لأقرب جزء من عشرة، مثال: 7.2',
      meta: { a: a.valueOf(), c: c.valueOf(), find: 'b' },
    };
  },
};

/* ---------- 3. Converse: is it a right triangle? ---------- */
export const converse: Generator = {
  id: '3-5/converse',
  lesson: '3-5',
  label: 'عكس نظرية فيثاغورس',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    let sides: number[];
    const right = rng.chance(0.5);
    if (right) {
      sides = [...randomTriple(rng, 60)];
      if (d === 3 && rng.chance(0.5)) sides = sides.map((s) => s / 2);
    } else {
      const [a, b, c] = randomTriple(rng, 50);
      const tweak = rng.int(0, 2);
      sides = [a + (tweak === 0 ? 1 : 0), b + (tweak === 1 ? 1 : 0), c + (tweak === 2 ? rng.pick([1, -1]) : 0)];
    }
    const shown = d === 1 ? [...sides].sort((x, y) => x - y) : rng.shuffle(sides);
    const [p, q, r] = [...sides].sort((x, y) => x - y);
    const lhs = p * p + q * q;
    const isRight = Math.abs(lhs - r * r) < 1e-9;
    const t = (x: number) => texNum(new Fraction(x));
    return {
      prompt: `هل المثلث الذي أطوال أضلاعه $${shown.map(t).join(' ,\\ ')}$ قائم الزاوية؟`,
      answer: { kind: 'choice', index: isRight ? 0 : 1 },
      choices: ['✓ نعم، قائم', '✗ لا، ليس قائماً'],
      answerTex: `\\text{${isRight ? 'قائم' : 'ليس قائماً'}}`,
      hints: ['الضلع الأطول هو الوتر المحتمل. تحقّق: هل مربّعه = مجموع مربعي الضلعين الآخرين؟'],
      solution: [
        `الضلع الأطول $${t(r)}$: $${t(r)}^{2} = ${t(r * r)}$`,
        `$${t(p)}^{2} + ${t(q)}^{2} = ${t(p * p)} + ${t(q * q)} = ${t(lhs)}$`,
        isRight ? `$${t(lhs)} = ${t(r * r)}$ ⇐ المثلث قائم الزاوية (عكس نظرية فيثاغورس).` : `$${t(lhs)} \\neq ${t(r * r)}$ ⇐ المثلث ليس قائم الزاوية.`,
      ],
      meta: { sides, isRight },
    };
  },
};

/* ---------- 4. Real-life problems: ladder (ل، ق، ع), screen diagonal, field diagonal ---------- */
export const word: Generator = {
  id: '3-5/word',
  lesson: '3-5',
  label: 'مسائل حياتية على فيثاغورس',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const kind = rng.int(0, 2);
    if (kind === 0) {
      // ladder: length L, base q, height h
      let L: number, q: number;
      if (d === 1) {
        const [a, , c] = randomTriple(rng, 30);
        L = c;
        q = a;
      } else {
        L = rng.int(5, 15);
        q = rng.int(1, L - 1) + (d === 3 ? 0.5 : 0);
        if (q >= L) q = L - 1.5;
      }
      const hSq = L * L - q * q;
      const r = result(new Fraction(hSq));
      return {
        prompt: `سلّم طوله $\\text{ل} = ${L}$ م يستند إلى جدار رأسي، وتبعد قاعدته عن الجدار $\\text{ق} = ${texNum(new Fraction(q))}$ م. ما الارتفاع $\\text{ع}$ الذي يصل إليه السلّم على الجدار${r.exact ? '' : ' لأقرب جزء من عشرة'}؟`,
        answer: r.answer,
        answerTex: `\\text{ع} ${r.exact ? '= ' : ''}${r.tex}`,
        hints: ['السلّم هو الوتر، والجدار والأرض ساقا المثلث القائم.', `$\\text{ع}^{2} = \\text{ل}^{2} - \\text{ق}^{2}$`],
        solution: [`السلّم وتر: $\\text{ل}^{2} = \\text{ق}^{2} + \\text{ع}^{2}$`, `$\\text{ع}^{2} = ${L}^{2} - ${texNum(new Fraction(q))}^{2} = ${texNum(new Fraction(hSq))}$`, `$\\text{ع} = \\sqrt{${texNum(new Fraction(hSq))}} ${r.exact ? '= ' : ''}${r.tex}$ م`],
        placeholder: 'بالأمتار',
        meta: { a: q, c: L, find: 'b' },
      };
    }
    const [a, b] =
      d === 1
        ? randomTriple(rng, 60).slice(0, 2)
        : kind === 1
          ? rng.pick([[16, 9], [32, 18], [40, 22], [48, 27], [20, 12]] as [number, number][])
          : [rng.int(40, 110), rng.int(20, 70)];
    const sq = a * a + b * b;
    const r = result(new Fraction(sq));
    const text =
      kind === 1
        ? `شاشة تلفاز مستطيلة عرضها $${a}$ بوصة وارتفاعها $${b}$ بوصة. ما طول قطرها${r.exact ? '' : ' لأقرب جزء من عشرة'}؟`
        : `ملعب كرة مستطيل طوله $${a}$ م وعرضه $${b}$ م. ما طول المسافة القطرية بين زاويتين متقابلتين${r.exact ? '' : ' لأقرب جزء من عشرة'}؟`;
    return {
      prompt: text,
      answer: r.answer,
      answerTex: `${r.exact ? '' : ''}${r.tex}`,
      hints: ['القطر يقسم المستطيل إلى مثلثين قائمين، والقطر هو الوتر.'],
      solution: [`$${C}^{2} = ${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${sq}$`, `$${C} = \\sqrt{${sq}} ${r.exact ? '= ' : ''}${r.tex}$`],
      placeholder: r.exact ? 'العدد' : 'لأقرب جزء من عشرة',
      meta: { a, b, find: 'c' },
    };
  },
};

export const generators3_5 = [hyp, leg, converse, word];
