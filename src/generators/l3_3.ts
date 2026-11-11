import Fraction from 'fraction.js';
import type { Difficulty, Generator } from '../core/question';
import type { Rng } from '../core/rng';

export interface Step {
  op: '+' | '-' | '×' | '÷';
  k: number;
}

export function forward(x: number, steps: Step[]): number[] {
  const out = [x];
  for (const s of steps) {
    const v = out[out.length - 1];
    out.push(s.op === '+' ? v + s.k : s.op === '-' ? v - s.k : s.op === '×' ? v * s.k : v / s.k);
  }
  return out;
}

const INVERSE: Record<Step['op'], Step['op']> = { '+': '-', '-': '+', '×': '÷', '÷': '×' };
const VERB: Record<Step['op'], string> = { '+': 'أضاف', '-': 'طرح', '×': 'ضرب الناتج في', '÷': 'قسم الناتج على' };
const UNDO: Record<Step['op'], string> = { '+': 'نطرح', '-': 'نضيف', '×': 'نقسم على', '÷': 'نضرب في' };

/** Random chain of operations keeping every intermediate value a positive integer. */
export function randomChain(rng: Rng, d: Difficulty): { start: number; steps: Step[] } {
  const len = d + 1;
  for (;;) {
    const start = rng.int(2, d === 3 ? 40 : 20);
    const steps: Step[] = [];
    let v = start;
    let ok = true;
    for (let i = 0; i < len; i++) {
      const op = rng.pick(['+', '-', '×', '÷'] as const);
      let k: number;
      if (op === '+') k = rng.int(2, 15);
      else if (op === '-') k = rng.int(1, Math.max(1, v - 1));
      else if (op === '×') k = rng.int(2, 5);
      else {
        const divs = [2, 3, 4, 5].filter((x) => v % x === 0);
        if (!divs.length) {
          ok = false;
          break;
        }
        k = rng.pick(divs);
      }
      steps.push({ op, k });
      v = forward(v, [{ op, k }])[1];
      if (v <= 0 || v > 500) ok = false;
    }
    if (ok && new Set(steps.map((s) => s.op)).size > 1) return { start, steps };
  }
}

function undoSteps(steps: Step[], end: number): string[] {
  const lines: string[] = [];
  let v = end;
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    const prev = forward(v, [{ op: INVERSE[s.op], k: s.k }])[1];
    lines.push(`${UNDO[s.op]} $${s.k}$: $${v} ${INVERSE[s.op] === '×' ? '\\times' : INVERSE[s.op] === '÷' ? '\\div' : INVERSE[s.op]} ${s.k} = ${prev}$`);
    v = prev;
  }
  return lines;
}

/* ---------- 1. "I thought of a number…" ---------- */
const NAMES = ['خالد', 'مريم', 'جاسم', 'هند', 'سلمان', 'دانة'];

export const numberChain: Generator = {
  id: '3-3/chain',
  lesson: '3-3',
  label: 'الحل العكسي: فكّرت في عدد',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const { start, steps } = randomChain(rng, d);
    const vals = forward(start, steps);
    const end = vals[vals.length - 1];
    const name = rng.pick(NAMES);
    const story = steps.map((s, i) => `${i === 0 ? '' : 'ثم '}${VERB[s.op]} $${s.k}$`).join('، ');
    return {
      prompt: `فكّر ${name} في عدد، ${story}، فكان الناتج $${end}$. ما العدد الذي فكّر فيه؟`,
      answer: { kind: 'fraction', value: new Fraction(start) },
      answerTex: String(start),
      hints: ['ابدأ من النهاية وارجع إلى الوراء.', 'كل عملية نلغيها بعكسها: الجمع ↔ الطرح، الضرب ↔ القسمة، وبالترتيب المعاكس.'],
      solution: [`نبدأ من النهاية $${end}$ ونعكس العمليات بالترتيب المعاكس:`, ...undoSteps(steps, end), `العدد هو $${start}$. تحقّق: $${vals.join(' \\to ')}$ ✓`],
      placeholder: 'العدد',
      meta: { start, steps },
    };
  },
};

/* ---------- 2. Fuel trip / pocket money (book context p.86) ---------- */
export const fuel: Generator = {
  id: '3-3/fuel',
  lesson: '3-3',
  label: 'الحل العكسي: رحلة السيارة',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    if (d === 3 && rng.chance(0.5)) {
      // money: spends half, then k, left with r
      const r = rng.int(2, 15);
      const k = rng.int(2, 9);
      const start = (r + k) * 2;
      return {
        prompt: `أنفقت دانة نصف مصروفها الأسبوعي على كتاب، ثم أنفقت $${k}$ دنانير على هدية، فبقي معها $${r}$ دنانير. كم كان مصروفها؟`,
        answer: { kind: 'fraction', value: new Fraction(start) },
        answerTex: String(start),
        hints: ['ابدأ مما بقي معها، وأعِد الدنانير التي أنفقتها على الهدية أولاً.'],
        solution: [`قبل الهدية: $${r} + ${k} = ${r + k}$`, `هذا نصف المصروف، إذن المصروف: $${r + k} \\times 2 = ${start}$ ديناراً`, `تحقّق: نصف $${start}$ هو $${start / 2}$، و $${start / 2} - ${k} = ${r}$ ✓`],
        placeholder: 'العدد بالدينار',
        meta: { start, steps: [{ op: '÷', k: 2 }, { op: '-', k }] as Step[] },
      };
    }
    // events: alternate "used a" (−) and "added b" (+), ending with what is left
    const count = d === 1 ? 2 : 3;
    const steps: Step[] = [];
    const start = rng.int(30, 60);
    let v = start;
    for (let i = 0; i < count; i++) {
      const use = i % 2 === 0;
      const k = use ? rng.int(5, Math.max(6, v - 5)) : rng.int(10, 30);
      steps.push({ op: use ? '-' : '+', k });
      v = use ? v - k : v + k;
    }
    const end = v;
    const parts = steps.map((s, i) => (s.op === '-' ? `${i === 0 ? 'استهلكت السيارة' : 'ثم استهلكت'} $${s.k}$ لتراً` : `فتوقّف عند محطة وأضاف $${s.k}$ لتراً`));
    return {
      prompt: `في رحلة بالسيارة، ${parts.join('، ')}، فبقي في الخزان $${end}$ لتراً. كم لتراً كان في الخزان في البداية؟`,
      answer: { kind: 'fraction', value: new Fraction(start) },
      answerTex: String(start),
      hints: ['ابدأ من آخر كمية وارجع: ما استُهلك نضيفه، وما أُضيف نطرحه.'],
      solution: [`نبدأ من النهاية: $${end}$ لتراً`, ...undoSteps(steps, end).map((l) => l.replace('نطرح', 'نطرح ما أُضيف').replace('نضيف', 'نعيد ما استُهلك')), `كان في الخزان $${start}$ لتراً.`],
      placeholder: 'العدد باللتر',
      meta: { start, steps },
    };
  },
};

export const generators3_3 = [numberChain, fuel];
