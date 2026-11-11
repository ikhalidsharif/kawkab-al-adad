import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import type { Difficulty, Generator } from '../core/question';
import type { Rng } from '../core/rng';
import { texNum } from './util';

export type SeqKind = 'arith' | 'geom' | 'quad';
export interface SeqSpec {
  kind: SeqKind;
  /** arith: a + (n-1)d ; geom: a·r^(n-1) ; quad: p·n² + q·n + c */
  a: number;
  d: number;
  r: [number, number];
  p: number;
  q: number;
  c: number;
}

/** n-th term (1-based). Exact as a Fraction. */
export function term(s: SeqSpec, n: number): Fraction {
  switch (s.kind) {
    case 'arith':
      return new Fraction(s.a).add(new Fraction(s.d).mul(n - 1));
    case 'geom':
      return new Fraction(s.a).mul(new Fraction(s.r[0], s.r[1]).pow(n - 1));
    case 'quad':
      return new Fraction(s.p * n * n + s.q * n + s.c);
  }
}

const base = (): SeqSpec => ({ kind: 'arith', a: 0, d: 0, r: [1, 1], p: 0, q: 0, c: 0 });

export function randomSeq(rng: Rng, kind: SeqKind, d: Difficulty): SeqSpec {
  const s = base();
  s.kind = kind;
  if (kind === 'arith') {
    if (d === 1) {
      s.a = rng.int(1, 20);
      s.d = rng.int(2, 9);
    } else if (d === 2) {
      s.a = rng.int(-10, 40);
      s.d = rng.pick([-7, -5, -4, -3, 3, 4, 6, 7, 8, 11, 12, 15]);
    } else {
      s.a = rng.int(-20, 20);
      s.d = rng.pick([0.5, 1.5, 2.5, -0.5, -1.5, 0.25, 0.75]);
    }
  } else if (kind === 'geom') {
    if (d === 1) {
      s.a = rng.int(1, 5);
      s.r = [rng.pick([2, 3]), 1];
    } else if (d === 2) {
      s.a = rng.int(1, 4);
      s.r = [rng.pick([2, 3, 4, -2]), 1];
    } else {
      const pick = rng.int(0, 2);
      if (pick === 0) {
        s.r = [1, 2];
        s.a = rng.pick([64, 128, 256, 320, 160, 96]);
      } else if (pick === 1) {
        s.r = [-3, 1];
        s.a = rng.pick([1, 2, -1]);
      } else {
        s.r = [5, 1];
        s.a = rng.pick([1, 2]);
      }
    }
  } else {
    if (d === 1) {
      s.p = 1;
      s.c = rng.int(-2, 5);
    } else if (d === 2) {
      s.p = rng.pick([2, 3]);
      s.c = rng.int(-3, 3);
    } else {
      s.p = 1;
      s.q = rng.pick([1, -1, 2]);
      s.c = rng.int(-2, 2);
    }
  }
  return s;
}

export function seqTex(s: SeqSpec, count: number): string {
  return Array.from({ length: count }, (_, i) => texNum(term(s, i + 1))).join(',\\ ') + ',\\ \\ldots';
}

function ruleText(s: SeqSpec): string {
  if (s.kind === 'arith') return s.d >= 0 ? `نضيف $${texNum(new Fraction(s.d))}$ في كل مرة` : `نطرح $${texNum(new Fraction(-s.d))}$ في كل مرة`;
  if (s.kind === 'geom') {
    const r = new Fraction(s.r[0], s.r[1]);
    return Number(r.d) === 2 && Number(r.n) === 1 ? 'نقسم على $2$ في كل مرة' : `نضرب في $${texNum(r)}$ في كل مرة`;
  }
  return 'الفروق بين الحدود المتتالية تزداد بمقدار ثابت (نمط تربيعي)';
}

function diffsTex(s: SeqSpec, count: number): string {
  const ts = Array.from({ length: count }, (_, i) => term(s, i + 1));
  return ts.slice(1).map((t, i) => texNum(t.sub(ts[i]))).join(',\\ ');
}

/* ---------- 1. Next term / n-th term ---------- */
function seqGenerator(kind: SeqKind, id: string, label: string): Generator {
  return {
    id,
    lesson: '2-7',
    label,
    difficulties: [1, 2, 3],
    generate(rng, d) {
      const s = randomSeq(rng, kind, d);
      const shown = kind === 'quad' ? 5 : 4;
      const askN = d === 2 && kind === 'arith' ? rng.int(8, 12) : d === 3 && kind !== 'geom' ? shown + 2 : shown + 1;
      const ans = term(s, askN);
      const which = askN === shown + 1 ? 'الحد التالي' : `الحد رقم $${askN}$`;
      const steps: string[] = [];
      if (kind === 'quad') {
        steps.push(`الفروق بين الحدود: $${diffsTex(s, shown)}$`, `والفروق نفسها تزداد بمقدار ثابت $${2 * s.p}$، فنكمل الفروق.`);
      } else {
        steps.push(`القاعدة: ${ruleText(s)}.`);
      }
      const cont = Array.from({ length: askN - shown }, (_, i) => texNum(term(s, shown + i + 1)));
      steps.push(`نكمل النمط: $${cont.join(',\\ ')}$`, `${which} هو $${texNum(ans)}$`);
      if (kind === 'arith' && askN > shown + 2) steps.splice(1, 0, `أو مباشرة: الحد رقم $n$ = الحد الأول + $(n-1) \\times$ الفرق = $${s.a} + ${askN - 1} \\times ${paren(texNum(new Fraction(s.d)))}$`);
      return {
        prompt: `اكتشف النمط وأوجد ${which}: $$${seqTex(s, shown)}$$`,
        answer: { kind: 'fraction', value: ans, requireSimplest: false },
        answerTex: texNum(ans),
        hints: [kind === 'quad' ? 'احسب الفروق بين الحدود المتتالية، ثم الفروق بين الفروق.' : 'قارن كل حد بالذي قبله: هل نضيف عدداً ثابتاً أم نضرب في عدد ثابت؟', `القاعدة: ${ruleText(s)}.`],
        solution: steps,
        placeholder: 'العدد، مثال: 42 أو ‎-3.5‎',
        meta: { spec: s, askN },
      };
    },
  };
}

const paren = (t: string) => (t.startsWith('-') ? `(${t})` : t);

export const arith = seqGenerator('arith', '2-7/arith', 'متتاليات حسابية');
export const geom = seqGenerator('geom', '2-7/geom', 'متتاليات هندسية');
export const quad = seqGenerator('quad', '2-7/quad', 'أنماط تربيعية');

/* ---------- 2. Which rule? (multiple choice) ---------- */
export const rule: Generator = {
  id: '2-7/rule',
  lesson: '2-7',
  label: 'وصف قاعدة النمط',
  difficulties: [1, 2],
  generate(rng, d) {
    const kind = rng.pick(['arith', 'geom'] as const);
    const s = randomSeq(rng, kind, d);
    // Ensure the first two terms do not make "add" and "multiply" indistinguishable (e.g. 2, 4).
    const t1 = term(s, 1);
    const t2 = term(s, 2);
    const diff = t2.sub(t1);
    const ratio = t1.equals(0) ? null : t2.div(t1);
    const correct = ruleText(s);
    // Distractors only use "nice" numbers (integers or short decimals), never repeating decimals.
    const nice = (f: Fraction | null) => !!f && !texNum(f).includes('(') && texNum(f).length <= 6;
    const distract = [
      kind === 'arith' && nice(ratio) ? `نضرب في $${texNum(ratio!)}$ في كل مرة` : '',
      kind === 'geom' ? `نضيف $${texNum(diff)}$ في كل مرة` : '',
      kind === 'arith' ? `نضيف $${texNum(diff.add(1))}$ في كل مرة` : `نضرب في $${texNum(new Fraction(s.r[0], s.r[1]).add(1))}$ في كل مرة`,
      kind === 'arith' ? `نضرب في $2$ ثم نضيف $${texNum(diff.abs())}$` : `نضيف $${texNum(diff.mul(2))}$ في كل مرة`,
      `نضيف $${texNum(diff.abs().add(2))}$ في كل مرة`,
      `نطرح $${texNum(diff.abs().add(1))}$ في كل مرة`,
    ].filter((x) => x && x !== correct);
    const { choices, index } = makeChoices(rng, correct, distract);
    return {
      prompt: `ما القاعدة التي تصف النمط؟ $$${seqTex(s, 5)}$$`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: correct.replace(/\$/g, ''),
      hints: ['تحقّق من القاعدة على أكثر من حدّين، لا على أول حدّين فقط.'],
      solution: [`${correct}: $${seqTex(s, 5)}$`],
      meta: { spec: s },
    };
  },
};

/* ---------- 3. Word problems: fitness competition (p.67) ---------- */
const NAMES = ['حمد', 'سارة', 'عيسى', 'نورة', 'راشد', 'ليلى'];

export const word: Generator = {
  id: '2-7/word',
  lesson: '2-7',
  label: 'مسائل: البحث عن نمط',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const name = rng.pick(NAMES);
    const start = rng.int(14, 30);
    const inc = rng.int(2, 6);
    const s: SeqSpec = { ...base(), kind: 'arith', a: start, d: inc };
    const weeks = [1, 2, 3, 4].map((n) => `الأسبوع ${n}: $${term(s, n)}$`).join('، ');
    const intro = `يتدرّب ${name} لمسابقة لياقة، فيزيد عدد تمارين البطن في الدقيقة كل أسبوع بنمط ثابت (${weeks}).`;
    if (d === 1) {
      const n = rng.int(6, 9);
      const ans = term(s, n);
      return {
        prompt: `${intro} كم تمريناً في الدقيقة سيؤدي في الأسبوع ${n}؟`,
        answer: { kind: 'fraction', value: ans },
        answerTex: String(ans),
        hints: [`النمط: نضيف $${inc}$ كل أسبوع.`],
        solution: [`افهم: يزيد العدد $${inc}$ كل أسبوع.`, `خطط وحل: نكمل الجدول: ${Array.from({ length: n - 4 }, (_, i) => `الأسبوع ${i + 5}: $${term(s, i + 5)}$`).join('، ')}`, `تحقّق: $${start} + ${n - 1} \\times ${inc} = ${ans}$ ✓`],
        placeholder: 'العدد',
        meta: { spec: s, askN: n },
      };
    }
    // d2/d3: when does it first exceed a target (book: "more than 56 per minute")?
    let target = d === 2 ? 56 : rng.int(60, 90);
    if (target <= term(s, 5).valueOf()) target = term(s, 5).valueOf() + rng.int(5, 20);
    let n = 1;
    while (term(s, n).valueOf() <= target) n++;
    const table = Array.from({ length: n }, (_, i) => `$${term(s, i + 1)}$`).join('، ');
    return {
      prompt: `${intro} في أيّ أسبوع سيتجاوز عدد التمارين $${target}$ مرة في الدقيقة لأول مرة؟`,
      answer: { kind: 'fraction', value: new Fraction(n) },
      answerTex: `\\text{الأسبوع } ${n}`,
      hints: [`النمط: نضيف $${inc}$ كل أسبوع. أكمل الجدول حتى تتجاوز $${target}$.`, '"يتجاوز" يعني أكبر من، لا يساوي.'],
      solution: [
        `افهم: نريد أول أسبوع يكون فيه العدد أكبر من $${target}$.`,
        `خطط: نبحث عن نمط — نضيف $${inc}$ كل أسبوع.`,
        `حل: ${table}`,
        `في الأسبوع $${n}$ يصبح العدد $${term(s, n)}$ وهو أول عدد أكبر من $${target}$.`,
        `تحقّق: في الأسبوع $${n - 1}$ كان العدد $${term(s, n - 1)} \\le ${target}$ ✓`,
      ],
      placeholder: 'رقم الأسبوع',
      meta: { spec: s, target, week: n },
    };
  },
};

export const generators2_7 = [arith, geom, quad, rule, word];
