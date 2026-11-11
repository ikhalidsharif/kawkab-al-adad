import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import { paren, texBoth, texFrac } from '../core/mathutil';
import type { Difficulty, Generator } from '../core/question';
import type { Rng } from '../core/rng';
import { fractionSolution } from './fractionSteps';
import { X, properFrac, texNum, texValue } from './util';

const PH = 'قيمة س، مثال: 3/4 أو 2.5 أو ‎-6‎';
const pair = (f: Fraction): [number, number] => [Number(f.s) * Number(f.n), Number(f.d)];
const DENS = [2, 3, 4, 5, 6, 8, 10, 12];

function randFrac(rng: Rng, d: Difficulty, allowNeg: boolean): Fraction {
  const den = rng.pick(DENS);
  let f = properFrac(rng, den);
  if (d >= 2 && rng.chance(0.35)) f = f.add(rng.int(1, 4));
  if (allowNeg && rng.chance(0.5)) f = f.neg();
  return f;
}

function randDec(rng: Rng, d: Difficulty, allowNeg: boolean): Fraction {
  const places = d === 1 ? 1 : rng.pick([1, 2]);
  const scale = 10 ** places;
  let v = new Fraction(rng.int(1, d === 1 ? 99 : 999), scale);
  if (allowNeg && rng.chance(0.5)) v = v.neg();
  return v;
}

/* ---------- 1. X ± a = b ---------- */
export const addSub: Generator = {
  id: '2-6/add-sub',
  lesson: '2-6',
  label: 'معادلات بالجمع والطرح',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    for (;;) {
      const dec = rng.chance(0.4);
      const neg = d === 3;
      const x = dec ? randDec(rng, d, neg) : randFrac(rng, d, neg);
      const a = dec ? randDec(rng, d, neg) : randFrac(rng, d, neg);
      if (!dec && d === 1 && rng.chance(0.5) && Number(a.d) !== Number(x.d)) continue;
      const op = d === 1 ? '+' : rng.pick(['+', '-'] as const);
      const b = op === '+' ? x.add(a) : x.sub(a);
      if (b.equals(0) || x.equals(0)) continue;
      const t = (f: Fraction) => texValue(f, dec);
      const leftFirst = d === 3 && op === '+' && rng.chance(0.4);
      const eq = leftFirst ? `${t(a)} + ${X} = ${t(b)}` : `${X} ${op} ${paren(t(a))} = ${t(b)}`;
      const inv = op === '+' ? '-' : '+';
      const prop = op === '+' ? 'خاصية الطرح للمساواة' : 'خاصية الجمع للمساواة';
      const verb = op === '+' ? `نطرح $${t(a)}$ من الطرفين` : `نجمع $${t(a)}$ إلى الطرفين`;
      const steps: string[] = [`${verb} (${prop}) لعزل $${X}$:`, `$${X} = ${t(b)} ${inv} ${paren(t(a))}$`];
      if (!dec) {
        const fs = fractionSolution([b, a], [inv], false).steps;
        steps.push(...fs.slice(0, -1));
      }
      steps.push(`إذن $${X} = ${dec ? t(x) : texBoth(x)}$`);
      steps.push(`تحقّق: $${leftFirst ? `${t(a)} + ${paren(t(x))}` : `${t(x)} ${op} ${paren(t(a))}`} = ${t(b)}$ ✓`);
      return {
        prompt: `حل المعادلة، وتحقّق من صحة الحل: $$${eq}$$`,
        answer: { kind: 'fraction', value: x, requireSimplest: true },
        answerTex: `${X} = ${dec ? texNum(x) : texBoth(x)}`,
        hints: [`ما العملية التي تلغي ${op === '+' ? 'الجمع' : 'الطرح'}؟ طبّقها على الطرفين.`, `$${X} = ${t(b)} ${inv} ${paren(t(a))}$`],
        solution: steps,
        placeholder: PH,
        meta: { form: op === '+' ? 'add' : 'sub', x: pair(x), a: pair(a), b: pair(b) },
      };
    }
  },
};

/* ---------- 2. kX = c (multiply by the reciprocal) ---------- */
const COEFS: [number, number][] = [
  [2, 3], [3, 4], [4, 5], [3, 5], [2, 5], [5, 6], [3, 8], [5, 8], [7, 8], [4, 3], [5, 4], [7, 4], [5, 2], [7, 3], [9, 4], [7, 10],
];

export const mulDiv: Generator = {
  id: '2-6/mul',
  lesson: '2-6',
  label: 'معادلات بالضرب والقسمة',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    for (;;) {
      const style = d === 1 ? rng.pick(['frac', 'frac', 'div'] as const) : rng.pick(['frac', 'frac', 'div', 'dec'] as const);
      let k: Fraction;
      let x: Fraction;
      let kTex: string;
      if (style === 'dec') {
        k = new Fraction(rng.pick([2, 4, 5, 6, 8, 12, 15, 25]), 10);
        x = d === 3 ? new Fraction(rng.int(-40, 40), 2) : new Fraction(rng.int(2, 30));
        kTex = texNum(k);
      } else if (style === 'div') {
        const q = rng.int(2, 9);
        k = new Fraction(1, q);
        x = d === 1 ? new Fraction(q * rng.int(1, 9)) : randFrac(rng, 2, d === 3).mul(q).add(rng.int(0, 3));
        kTex = '';
      } else {
        const [p, q] = rng.pick(COEFS);
        k = new Fraction(p, q);
        x = d === 1 ? new Fraction(q * rng.int(2, 12)) : new Fraction(rng.int(1, 30), rng.pick([1, 2, 3, 5, 7]));
        kTex = texFrac(k);
      }
      if (d === 3 && style !== 'dec') {
        if (rng.chance(0.5)) k = k.neg();
        if (rng.chance(0.5)) x = x.neg();
        if (style === 'frac') kTex = texFrac(k);
      }
      if (x.equals(0)) continue;
      const c = k.mul(x);
      const cDec = style === 'dec';
      const ct = texValue(c, cDec && Number(c.d) !== 1 ? true : false);
      let eq: string;
      const steps: string[] = [];
      if (style === 'div') {
        const q = Number(k.d);
        const sgn = Number(k.s) < 0 ? '-' : '';
        eq = `${sgn}\\frac{${X}}{${q}} = ${ct}`;
        steps.push(`نضرب الطرفين في $${sgn}${q}$ (خاصية الضرب للمساواة): $${X} = ${ct} \\times ${paren(`${sgn}${q}`)}$`);
      } else if (style === 'dec') {
        eq = `${kTex}${X} = ${ct}`;
        steps.push(`نقسم الطرفين على $${kTex}$ (خاصية القسمة للمساواة): $${X} = ${ct} \\div ${kTex}$`);
      } else {
        const r = new Fraction(1).div(k);
        eq = `${kTex}${X} = ${ct}`;
        steps.push(
          `نضرب الطرفين في مقلوب المعامل وهو $${texFrac(r)}$: $${paren(texFrac(r))} \\cdot ${paren(kTex)}${X} = ${ct} \\cdot ${paren(texFrac(r))}$`,
          `$${X} = ${ct} \\cdot ${paren(texFrac(r))}$`,
        );
      }
      steps.push(`$${X} = ${texBoth(x)}$`);
      return {
        prompt: `حل المعادلة: $$${eq}$$`,
        answer: { kind: 'fraction', value: x, requireSimplest: true },
        answerTex: `${X} = ${texBoth(x)}`,
        hints: [
          style === 'dec' ? 'اقسم الطرفين على المعامل العشري.' : style === 'div' ? `س مقسومة على عدد؛ اضرب الطرفين في هذا العدد.` : 'اضرب الطرفين في مقلوب المعامل الكسري.',
          steps[steps.length - 2],
        ],
        solution: steps,
        placeholder: PH,
        meta: { form: 'mul', x: pair(x), k: pair(k), c: pair(c) },
      };
    }
  },
};

/* ---------- 3. Word problems (Bahrain F1 Grand Prix context, p.63) ---------- */
const RATIOS: [number, number][] = [[2, 3], [3, 4], [4, 5], [3, 5], [5, 6], [5, 8], [7, 10]];

interface Story {
  text: (k: string, v: string) => string;
  unit: string;
  range: [number, number];
}
const STORIES: Story[] = [
  { text: (k, v) => `في سباق جائزة البحرين الكبرى للفورمولا 1، كان معدل سرعة أحد المتسابقين $${v}$ كم/س، وهذا يساوي $${k}$ أقصى سرعة له. ما أقصى سرعة له؟`, unit: 'كم/س', range: [200, 340] },
  { text: (k, v) => `استهلكت سيارة $${v}$ لتراً من الوقود، وهذا يساوي $${k}$ سعة خزانها. ما سعة الخزان باللتر؟`, unit: 'لتراً', range: [40, 90] },
  { text: (k, v) => `أنفق يوسف $${v}$ ديناراً، وهذا يساوي $${k}$ مدّخراته. كم ديناراً كانت مدّخراته؟`, unit: 'ديناراً', range: [20, 120] },
  { text: (k, v) => `قطع عدّاء $${v}$ متراً، وهي تمثّل $${k}$ طول المضمار. ما طول المضمار بالأمتار؟`, unit: 'متراً', range: [100, 400] },
];

export const word: Generator = {
  id: '2-6/word',
  lesson: '2-6',
  label: 'مسائل لفظية (معادلات)',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    if (d === 3 && rng.chance(0.5)) {
      // additive decimal story
      const start = new Fraction(rng.int(150, 320), 10);
      const rise = new Fraction(rng.int(12, 79), 10);
      const end = start.add(rise);
      return {
        prompt: `ارتفعت درجة الحرارة في المنامة بمقدار $${texNum(rise)}$ درجة مئوية بعد الظهر فأصبحت $${texNum(end)}$ درجة. اكتب معادلة وحلّها لتجد درجة الحرارة قبل الارتفاع.`,
        answer: { kind: 'fraction', value: start, requireSimplest: true },
        answerTex: `${texNum(start)}`,
        hints: [`المعادلة: $${X} + ${texNum(rise)} = ${texNum(end)}$`, 'اطرح من الطرفين.'],
        solution: [`نفرض أن درجة الحرارة قبل الارتفاع $${X}$: $${X} + ${texNum(rise)} = ${texNum(end)}$`, `$${X} = ${texNum(end)} - ${texNum(rise)} = ${texNum(start)}$ درجة.`],
        placeholder: 'مثال: 24.5',
        meta: { form: 'add', x: pair(start), a: pair(rise), b: pair(end) },
      };
    }
    const story = d === 1 ? STORIES[0] : rng.pick(STORIES);
    const [p, q] = rng.pick(RATIOS);
    const [lo, hi] = story.range;
    const m = rng.int(Math.ceil(lo / q), Math.floor(hi / q));
    const x = new Fraction(q * m);
    const v = new Fraction(p * m);
    const k = new Fraction(p, q);
    const kt = texFrac(k);
    const eq = `${kt}${X} = ${v}`;
    return {
      prompt: story.text(kt, String(v)) + ' (اكتب معادلة ثم حلّها)',
      answer: { kind: 'fraction', value: x, requireSimplest: true },
      answerTex: `${x}`,
      hints: [`نفرض أن المطلوب $${X}$. المعادلة: $${eq}$`, `اضرب الطرفين في مقلوب $${kt}$ وهو $\\frac{${q}}{${p}}$.`],
      solution: [
        `نفرض أن المطلوب $${X}$، فتكون المعادلة: $${eq}$`,
        `نضرب الطرفين في $\\frac{${q}}{${p}}$: $${X} = ${v} \\times \\frac{${q}}{${p}}$`,
        `$${X} = ${x}$ ${story.unit}`,
        `تحقّق: $${kt} \\times ${x} = ${v}$ ✓`,
      ],
      placeholder: 'العدد فقط، مثال: 216',
      meta: { form: 'mul', x: pair(x), k: pair(k), c: pair(v) },
    };
  },
};

/* ---------- 4. Which equation models the story? (multiple choice) ---------- */
export const writeEq: Generator = {
  id: '2-6/write-eq',
  lesson: '2-6',
  label: 'كتابة معادلة لمسألة',
  difficulties: [1, 2],
  generate(rng, d) {
    const story = d === 1 ? STORIES[0] : rng.pick(STORIES);
    const [p, q] = rng.pick(RATIOS);
    const m = rng.int(Math.ceil(story.range[0] / q), Math.floor(story.range[1] / q));
    const v = p * m;
    const kt = `\\frac{${p}}{${q}}`;
    const correct = `$${kt}${X} = ${v}$`;
    const { choices, index } = makeChoices(rng, correct, [
      `$${X} = ${kt} \\times ${v}$`,
      `$\\frac{${q}}{${p}}${X} = ${v}$`,
      `$${X} + ${kt} = ${v}$`,
    ]);
    return {
      prompt: `${story.text(kt, String(v))} — أيّ معادلة تمثّل المسألة إذا كان $${X}$ هو المطلوب؟`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: `${kt}${X} = ${v}`,
      hints: ['عبارة "يساوي كسراً من العدد" تعني: الكسر × العدد.'],
      solution: [`الكسر $${kt}$ من المطلوب $${X}$ يساوي $${v}$، أي: $${kt}${X} = ${v}$`],
      meta: { p, q, v },
    };
  },
};

export const generators2_6 = [addSub, mulDiv, word, writeEq];
