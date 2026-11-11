import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import { gcd, lcm, texBoth, texFrac, texMixed } from '../core/mathutil';
import type { Difficulty, Generator, QuestionBody } from '../core/question';
import type { Rng } from '../core/rng';
import { exprTex, fractionSolution, termsMeta, type Op } from './fractionSteps';

const PLACEHOLDER = 'مثال: 3/4 أو ‎-5/6‎ أو 1 1/2';
const ASK = 'أوجد الناتج في أبسط صورة:';

/** A proper fraction n/d in simplest form with 1 ≤ n < d. */
function properFrac(rng: Rng, d: number): Fraction {
  let n = rng.int(1, d - 1);
  for (let i = 0; i < 20 && gcd(n, d) !== 1; i++) n = rng.int(1, d - 1);
  if (gcd(n, d) !== 1) n = 1;
  return new Fraction(n, d);
}

function arithmeticBody(terms: Fraction[], ops: Op[], asMixed: boolean, hints: string[]): QuestionBody {
  const { steps, result, lcd } = fractionSolution(terms, ops, asMixed);
  return {
    prompt: `${ASK} $$${exprTex(terms, ops, asMixed)}$$`,
    answer: { kind: 'fraction', value: result, requireSimplest: true },
    answerTex: texBoth(result),
    hints,
    solution: steps,
    placeholder: PLACEHOLDER,
    meta: { terms: termsMeta(terms), ops, lcd },
  };
}

/* ---------- 1. Same denominators ---------- */
export const sameDen: Generator = {
  id: '2-5/same-den',
  lesson: '2-5',
  label: 'كسور ذات مقامات موحدة',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    for (let tries = 0; ; tries++) {
      const c = rng.int(d === 1 ? 3 : 2, 12);
      const op: Op = d === 1 ? '+' : rng.pick(['+', '-'] as const);
      let a = rng.int(1, c - 1);
      let b = rng.int(1, c - 1);
      if (d === 2 && rng.chance(0.5)) a = -a;
      if (d === 3) {
        a = rng.int(1, c + 3) * rng.sign();
        b = rng.int(1, c - 1) * rng.sign();
      }
      const r = op === '+' ? a + b : a - b;
      if (r === 0) continue;
      // Difficulty 3 must need simplifying; others mostly not trivial.
      if (d === 3 && gcd(r, c) === 1 && tries < 40) continue;
      const terms = [new Fraction(a, c), new Fraction(b, c)];
      // Keep the given fractions as written (not auto-reduced) when they reduce: re-pick instead.
      if (Number(terms[0].d) !== c || Number(terms[1].d) !== c) continue;
      return arithmeticBody(terms, [op], false, [
        'المقامان متساويان: اجمع (أو اطرح) البسطين فقط، واترك المقام كما هو.',
        `استعمل قواعد جمع الأعداد الصحيحة للبسطين: $${a} ${op} ${b < 0 ? `(${b})` : b} = ${r}$، ثم بسّط إن أمكن.`,
      ]);
    }
  },
};

/* ---------- 2. Different denominators ---------- */
function pickDenoms(rng: Rng, d: Difficulty): [number, number] {
  for (;;) {
    if (d === 1) {
      const b = rng.int(2, 6);
      const k = rng.int(2, Math.floor(12 / b));
      if (k < 2) continue;
      return rng.chance(0.5) ? [b, b * k] : [b * k, b];
    }
    const b = rng.int(2, 12);
    const c = rng.int(2, 12);
    if (b === c || b % c === 0 || c % b === 0) continue;
    if (lcm(b, c) > (d === 2 ? 40 : 60)) continue;
    return [b, c];
  }
}

export const diffDen: Generator = {
  id: '2-5/diff-den',
  lesson: '2-5',
  label: 'كسور ذات مقامات مختلفة',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    for (;;) {
      const [b, c] = pickDenoms(rng, d);
      let x = properFrac(rng, b);
      let y = properFrac(rng, c);
      const op: Op = d === 1 ? '+' : rng.pick(['+', '-'] as const);
      if (d === 3) {
        if (rng.chance(0.6)) x = x.neg();
        if (rng.chance(0.5)) y = y.neg();
      }
      const terms = [x, y];
      const res = op === '+' ? x.add(y) : x.sub(y);
      if (res.equals(0)) continue;
      const L = lcm(b, c);
      return arithmeticBody(terms, [op], false, [
        `وحّد المقامات أولاً: ما المضاعف المشترك الأصغر (م.م.أ) للعددين $${b}$ و $${c}$؟`,
        `م.م.أ $= ${L}$. اكتب كل كسر بالمقام $${L}$ ثم ${op === '+' ? 'اجمع' : 'اطرح'} البسطين.`,
      ]);
    }
  },
};

/* ---------- 3. Mixed numbers ---------- */
const MIXED_DENS = [2, 3, 4, 5, 6, 8, 10, 12];
function mixedNum(rng: Rng, den: number, wMax: number): Fraction {
  return new Fraction(rng.int(1, wMax)).add(properFrac(rng, den));
}

export const mixed: Generator = {
  id: '2-5/mixed',
  lesson: '2-5',
  label: 'جمع الأعداد الكسرية وطرحها',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    for (;;) {
      const d1 = rng.pick(MIXED_DENS);
      const d2 = d === 1 ? d1 : rng.pick(MIXED_DENS);
      if (d >= 2 && (d1 === d2 || lcm(d1, d2) > 40)) continue;
      let x = mixedNum(rng, d1, d === 3 ? 6 : 5);
      let y = mixedNum(rng, d2, d === 3 ? 6 : 4);
      let op: Op = d === 1 ? rng.pick(['+', '-'] as const) : rng.pick(['+', '-', '-'] as const);
      if (d === 3) {
        if (rng.chance(0.6)) x = x.neg();
        else if (rng.chance(0.5)) y = y.neg();
        op = rng.pick(['+', '-'] as const);
      } else if (op === '-' && x.compare(y) <= 0) {
        [x, y] = [y, x];
      }
      const terms = [x, y];
      const res = op === '+' ? x.add(y) : x.sub(y);
      if (res.equals(0)) continue;
      return arithmeticBody(terms, [op], true, [
        'حوّل كل عدد كسري إلى كسر غير حقيقي، أو اجمع (اطرح) الأجزاء الصحيحة ثم الكسرية مع الاستلاف عند الحاجة.',
        d1 === d2 ? `المقامان متساويان ($${d1}$).` : `م.م.أ للمقامين $${d1}$ و $${d2}$ هو $${lcm(d1, d2)}$.`,
      ]);
    }
  },
};

/* ---------- 4. LCD multiple choice (also feeds the "denominator factory" game) ---------- */
export function lcdPair(rng: Rng, d: Difficulty): [number, number] {
  return pickDenoms(rng, d === 1 ? 1 : rng.chance(0.3) ? 1 : 2);
}

export function lcdOptions(rng: Rng, b: number, c: number): { choices: string[]; index: number; L: number } {
  const L = lcm(b, c);
  const distract = [b * c, Math.max(b, c), L * 2, b + c, L / 2].filter((v) => Number.isInteger(v) && v > 1 && v !== L).map(String);
  const { choices, index } = makeChoices(rng, String(L), rng.shuffle(distract), () => String(L + rng.int(1, 12)));
  return { choices, index, L };
}

export const lcd: Generator = {
  id: '2-5/lcd',
  lesson: '2-5',
  label: 'المضاعف المشترك الأصغر للمقامات',
  difficulties: [1, 2],
  generate(rng, d) {
    const [b, c] = lcdPair(rng, d);
    const x = properFrac(rng, b);
    const y = properFrac(rng, c);
    const { choices, index, L } = lcdOptions(rng, b, c);
    const big = Math.max(b, c);
    const small = Math.min(b, c);
    const mb = Array.from({ length: L / big }, (_, i) => big * (i + 1)).join(',\\ ');
    return {
      prompt: `ما المقام الموحد الأصغر (م.م.أ) لجمع الكسرين $${texFrac(x)}$ و $${texFrac(y)}$؟`,
      answer: { kind: 'choice', index },
      choices: choices.map((s) => `$${s}$`),
      answerTex: String(L),
      hints: [`اكتب مضاعفات العدد الأكبر حتى تجد أول عدد يقبل القسمة على العدد الآخر.`],
      solution: [
        `نكتب مضاعفات العدد الأكبر $${big}$: $${mb}$`,
        `أول مضاعف يقبل القسمة على $${small}$ هو $${L}$، إذن م.م.أ $= ${L}$.`,
      ],
      meta: { b, c, L },
    };
  },
};

/* ---------- 5. Word problems: the family tomato farm (book context p.57) ---------- */
const WORD_DENS = [2, 3, 4, 5, 6, 8];
const NAMES = ['سلمى', 'أحمد', 'مريم', 'يوسف', 'فاطمة', 'علي'];

export const word: Generator = {
  id: '2-5/word',
  lesson: '2-5',
  label: 'مسائل لفظية (مزرعة الطماطم)',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    for (;;) {
      const name = rng.pick(NAMES);
      const d1 = rng.pick(WORD_DENS);
      const d2 = d === 1 ? d1 : rng.pick(WORD_DENS);
      const A = mixedNum(rng, d1, 9);
      const B = mixedNum(rng, d2, 6);
      const kg = (f: Fraction) => `$${texMixed(f)}$ كجم`;
      let terms: Fraction[];
      let ops: Op[];
      let story: string;
      const kind = d === 1 ? 0 : d === 2 ? rng.int(0, 2) : 3;
      if (kind === 0) {
        terms = [A, B];
        ops = ['+'];
        story = `جنت عائلة ${name} ${kg(A)} من الطماطم من مزرعتها صباحاً، و ${kg(B)} مساءً. كم كيلوجراماً جنت العائلة في ذلك اليوم؟`;
      } else if (kind === 1 || kind === 2) {
        if (A.compare(B) <= 0) continue;
        terms = [A, B];
        ops = ['-'];
        story =
          kind === 1
            ? `جنت عائلة ${name} ${kg(A)} من الطماطم، واستعملت منها ${kg(B)} لصنع الصلصة. كم كيلوجراماً بقي لديها؟`
            : `جنى والد ${name} ${kg(A)} من الطماطم، وجنى ${name} ${kg(B)}. بكم كيلوجراماً يزيد ما جناه الوالد على ما جناه ${name}؟`;
      } else {
        const d3 = rng.pick(WORD_DENS);
        const C = mixedNum(rng, d3, 8);
        if (A.add(B).compare(C) <= 0 || lcm(lcm(d1, d2), d3) > 48) continue;
        terms = [A, B, C];
        ops = ['+', '-'];
        story = `جنت عائلة ${name} ${kg(A)} من الطماطم في اليوم الأول و ${kg(B)} في اليوم الثاني، ثم باعت ${kg(C)} في السوق. كم كيلوجراماً بقي لديها؟`;
      }
      const { steps, result } = fractionSolution(terms, ops, true);
      return {
        prompt: story + ' (اكتب الناتج في أبسط صورة)',
        answer: { kind: 'fraction', value: result, requireSimplest: true },
        answerTex: texBoth(result),
        hints: [
          `اكتب العبارة العددية: $${exprTex(terms, ops, true)}$`,
          'حوّل الأعداد الكسرية إلى كسور غير حقيقية ووحّد المقامات.',
        ],
        solution: [`العبارة: $${exprTex(terms, ops, true)}$`, ...steps],
        placeholder: 'مثال: 5 3/4',
        meta: { terms: termsMeta(terms), ops },
      };
    }
  },
};

export const generators2_5 = [sameDen, diffDen, mixed, lcd, word];
