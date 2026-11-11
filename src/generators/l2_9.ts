import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import type { Difficulty, Generator } from '../core/question';
import type { Rng } from '../core/rng';
import { plainNum, texNum, texSci } from './util';

export interface Sci {
  m: Fraction;
  e: number;
}

export const sciValue = (s: Sci) => s.m.mul(new Fraction(10).pow(s.e));

/** Random mantissa 1 ≤ m < 10 with the given number of significant digits. */
export function mantissa(rng: Rng, sig: number): Fraction {
  for (;;) {
    const int = rng.int(10 ** (sig - 1), 10 ** sig - 1);
    if (sig > 1 && int % 10 === 0) continue; // keep exactly `sig` significant digits
    return new Fraction(int, 10 ** (sig - 1));
  }
}

export function randomSci(rng: Rng, d: Difficulty, sign?: 1 | -1): Sci {
  const sig = d === 1 ? rng.pick([1, 2]) : d === 2 ? rng.pick([2, 2, 3]) : rng.pick([2, 3, 3]);
  const s = sign ?? (d === 1 ? 1 : rng.sign());
  const e = s > 0 ? rng.int(3, d === 3 ? 11 : 9) : -rng.int(2, d === 3 ? 9 : 6);
  return { m: mantissa(rng, sig), e };
}

/** Real-world quantities for context (approximate values). */
export const OBJECTS: { name: string; m: number; e: number; unit: string }[] = [
  { name: 'قطر ذرة الهيدروجين', m: 1.06, e: -10, unit: 'م' },
  { name: 'طول فيروس الإنفلونزا', m: 1.2, e: -7, unit: 'م' },
  { name: 'قطر خلية الدم الحمراء', m: 7.5, e: -6, unit: 'م' },
  { name: 'سُمك شعرة الإنسان', m: 8, e: -5, unit: 'م' },
  { name: 'قطر حبة الرمل', m: 5, e: -4, unit: 'م' },
  { name: 'طول النملة', m: 4, e: -3, unit: 'م' },
  { name: 'ارتفاع قمة إفرست', m: 8.85, e: 3, unit: 'م' },
  { name: 'طول جسر الملك فهد', m: 2.5, e: 4, unit: 'م' },
  { name: 'قطر القمر', m: 3.47, e: 6, unit: 'م' },
  { name: 'قطر الأرض', m: 1.27, e: 7, unit: 'م' },
  { name: 'قطر الشمس', m: 1.39, e: 9, unit: 'م' },
  { name: 'المسافة بين الأرض والشمس', m: 1.5, e: 11, unit: 'م' },
];

/** Approximate ocean areas in km² (book context p.73). */
export const OCEANS: { name: string; m: number; e: number }[] = [
  { name: 'المحيط الهادئ', m: 1.65, e: 8 },
  { name: 'المحيط الأطلسي', m: 1.06, e: 8 },
  { name: 'المحيط الهندي', m: 7.34, e: 7 },
  { name: 'المحيط الجنوبي', m: 2.03, e: 7 },
  { name: 'المحيط المتجمد الشمالي', m: 1.41, e: 7 },
];

function moveSteps(s: Sci): string[] {
  const k = Math.abs(s.e);
  const dir = s.e > 0 ? 'اليسار' : 'اليمين';
  return [
    `نحرّك الفاصلة العشرية حتى نحصل على عدد $\\text{أ}$ حيث $1 \\le \\text{أ} < 10$: $\\text{أ} = ${texNum(s.m)}$`,
    `حرّكنا الفاصلة $${k}$ منازل إلى ${dir}، ${s.e > 0 ? 'والعدد كبير ← الأس موجب' : 'والعدد صغير (أقل من 1) ← الأس سالب'}: $n = ${s.e}$`,
    `$${texNum(sciValue(s))} = ${texSci(s.m, s.e)}$`,
  ];
}

/* ---------- 1. Standard → scientific ---------- */
export const toSci: Generator = {
  id: '2-9/to-sci',
  lesson: '2-9',
  label: 'التحويل إلى الصيغة العلمية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    let s: Sci;
    let prompt: string;
    if (d === 3 && rng.chance(0.5)) {
      const o = rng.pick(OBJECTS);
      s = { m: new Fraction(o.m), e: o.e };
      prompt = `${o.name} تقريباً $${texNum(sciValue(s))}$ ${o.unit}. اكتب هذا العدد بالصيغة العلمية.`;
    } else {
      s = randomSci(rng, d, d === 1 ? 1 : d === 2 ? -1 : undefined);
      prompt = `اكتب العدد بالصيغة العلمية: $$${texNum(sciValue(s))}$$`;
    }
    return {
      prompt,
      answer: { kind: 'sci', mantissa: s.m, exp: s.e },
      answerTex: texSci(s.m, s.e),
      hints: ['الصيغة العلمية: $\\text{أ} \\times 10^{n}$ حيث $1 \\le |\\text{أ}| < 10$', `حرّك الفاصلة حتى يبقى رقم واحد غير صفري يسارها، وعُدّ المنازل.`],
      solution: moveSteps(s),
      placeholder: 'مثال: 4.5×10^7 (اكتب x أو * بدل ×)',
      meta: { m: s.m.valueOf(), e: s.e, standard: sciValue(s).toString() },
    };
  },
};

/* ---------- 2. Scientific → standard ---------- */
export const toStd: Generator = {
  id: '2-9/to-std',
  lesson: '2-9',
  label: 'التحويل إلى الصيغة القياسية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const s = randomSci(rng, d, d === 1 ? 1 : d === 2 ? -1 : undefined);
    const v = sciValue(s);
    const k = Math.abs(s.e);
    return {
      prompt: `اكتب العدد بالصيغة القياسية: $$${texSci(s.m, s.e)}$$`,
      answer: { kind: 'fraction', value: v, requireSimplest: false, decimalOnly: true },
      answerTex: texNum(v),
      hints: [s.e > 0 ? `الأس موجب: حرّك الفاصلة $${k}$ منازل إلى اليمين (العدد يكبر).` : `الأس سالب: حرّك الفاصلة $${k}$ منازل إلى اليسار (العدد يصغر).`],
      solution: [
        s.e > 0 ? `الأس $${s.e}$ موجب ← نضرب في $10^{${k}}$، أي نحرّك الفاصلة $${k}$ منازل إلى اليمين ونضيف أصفاراً عند الحاجة.` : `الأس $${s.e}$ سالب ← نقسم على $10^{${k}}$، أي نحرّك الفاصلة $${k}$ منازل إلى اليسار ونضيف أصفاراً عند الحاجة.`,
        `$${texSci(s.m, s.e)} = ${texNum(v)}$`,
      ],
      placeholder: s.e > 0 ? 'مثال: 4500000' : 'مثال: 0.00032',
      meta: { m: s.m.valueOf(), e: s.e },
    };
  },
};

/* ---------- 3. Compare (<, >, =) ---------- */
export const compare: Generator = {
  id: '2-9/compare',
  lesson: '2-9',
  label: 'مقارنة الأعداد بالصيغة العلمية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const a = randomSci(rng, d, d === 3 ? -1 : 1);
    let b: Sci;
    let bTex: string;
    if (d === 1) {
      b = { m: mantissa(rng, 2), e: a.e + rng.pick([-2, -1, 1, 2]) };
      bTex = texSci(b.m, b.e);
    } else if (rng.chance(0.5)) {
      b = { m: mantissa(rng, 2), e: a.e };
      if (b.m.equals(a.m)) b.m = b.m.add(new Fraction(1, 10));
      bTex = texSci(b.m, b.e);
    } else {
      // one side in standard form; sometimes equal
      b = rng.chance(0.35) ? { ...a } : { m: mantissa(rng, 2), e: a.e + rng.pick([-1, 0, 1]) };
      bTex = texNum(sciValue(b));
    }
    const va = sciValue(a);
    const vb = sciValue(b);
    const cmp = va.compare(vb);
    const sym = cmp > 0 ? '>' : cmp < 0 ? '<' : '=';
    const choices = ['$>$', '$<$', '$=$'];
    return {
      prompt: `اختر الرمز المناسب: $$${texSci(a.m, a.e)} \\;\\bigcirc\\; ${bTex}$$`,
      answer: { kind: 'choice', index: ['>', '<', '='].indexOf(sym) },
      choices,
      answerTex: `${texSci(a.m, a.e)} ${sym} ${bTex}`,
      hints: ['اكتب العددين بالصيغة العلمية، ثم قارن الأسس أولاً؛ إذا تساوت فقارن الأعداد أ.'],
      solution: [
        a.e !== b.e ? `نقارن الأسس: $${a.e} ${a.e > b.e ? '>' : '<'} ${b.e}$ ← العدد ذو الأس الأكبر هو الأكبر.` : `الأسّان متساويان ($${a.e}$)، فنقارن: $${texNum(a.m)}$ و $${texNum(b.m)}$`,
        `$${texSci(a.m, a.e)} ${sym} ${bTex}$`,
      ],
      meta: { a: va.valueOf(), b: vb.valueOf(), sym },
    };
  },
};

/* ---------- 4. Order (oceans, or random) — multiple choice ---------- */
export const order: Generator = {
  id: '2-9/order',
  lesson: '2-9',
  label: 'ترتيب الأعداد بالصيغة العلمية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    let items: { label: string; s: Sci }[];
    let intro: string;
    if (d <= 2 && rng.chance(0.6)) {
      items = rng.shuffle(OCEANS).slice(0, 4).map((o) => ({ label: o.name, s: { m: new Fraction(o.m), e: o.e } }));
      intro = `مساحات بعض محيطات العالم تقريباً (كم²): ${items.map((i) => `${i.label}: $${texSci(i.s.m, i.s.e)}$`).join('، ')}. رتّبها من الأكبر إلى الأصغر.`;
    } else {
      const sign = d === 3 ? undefined : 1;
      items = [];
      while (items.length < 4) {
        const s = randomSci(rng, d, sign);
        if (d === 1) s.e = rng.int(4, 6);
        if (!items.some((x) => sciValue(x.s).equals(sciValue(s)))) items.push({ label: `$${texSci(s.m, s.e)}$`, s });
      }
      intro = `رتّب الأعداد من الأكبر إلى الأصغر: ${items.map((i) => i.label).join(' ، ')}`;
    }
    const sorted = [...items].sort((x, y) => sciValue(y.s).compare(sciValue(x.s)));
    const fmt = (arr: typeof items) => arr.map((i) => i.label).join(' ← ');
    const correct = fmt(sorted);
    const wrong = [
      fmt([...sorted].reverse()),
      fmt([sorted[1], sorted[0], sorted[2], sorted[3]]),
      fmt([sorted[0], sorted[2], sorted[1], sorted[3]]),
      fmt([...items].sort((x, y) => y.s.m.compare(x.s.m))), // ordered by mantissa only (common mistake)
      fmt([sorted[0], sorted[1], sorted[3], sorted[2]]),
    ].filter((w) => w !== correct);
    const { choices, index } = makeChoices(rng, correct, wrong);
    return {
      prompt: intro,
      answer: { kind: 'choice', index },
      choices,
      answerTex: '\\text{' + sorted.map((i) => plainNum(sciValue(i.s))).join(' > ') + '}',
      hints: ['قارن الأسس أولاً: الأس الأكبر يعني العدد الأكبر. إذا تساوت الأسس فقارن الأعداد أ.'],
      solution: [`نرتّب حسب الأس ثم حسب أ: ${sorted.map((i) => `$${texSci(i.s.m, i.s.e)}$`).join(' > ')}`, `الترتيب: ${correct}`],
      meta: { values: items.map((i) => sciValue(i.s).valueOf()), correctOrder: sorted.map((i) => sciValue(i.s).valueOf()) },
    };
  },
};

export const generators2_9 = [toSci, toStd, compare, order];
