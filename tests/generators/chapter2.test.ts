import { describe, expect, it } from 'vitest';
import type { Difficulty, Question } from '../../src/core/question';
import { evalExact } from '../../src/core/expr';
import { makeQuestion } from '../../src/generators';
import { decimalParts } from '../../src/generators/boss2';
import type { SeqSpec } from '../../src/generators/l2_7';

const SEEDS = 400;
function each(genId: string, ds: readonly Difficulty[], fn: (q: Question) => void) {
  for (const d of ds) for (let s = 1; s <= SEEDS; s++) fn(makeQuestion(genId, s * 7919 + d, d));
}

/* ---- tiny independent rational arithmetic on [num, den] pairs ---- */
type R = [number, number];
const g = (a: number, b: number): number => (b ? g(b, a % b) : Math.abs(a));
const norm = ([n, d]: R): R => {
  const k = g(n, d) * Math.sign(d);
  return [n / k, d / k];
};
const add = (a: R, b: R): R => norm([a[0] * b[1] + b[0] * a[1], a[1] * b[1]]);
const sub = (a: R, b: R): R => add(a, [-b[0], b[1]]);
const mul = (a: R, b: R): R => norm([a[0] * b[0], a[1] * b[1]]);
const eq = (a: R, b: R) => a[0] * b[1] === b[0] * a[1];
const ans = (q: Question): R => {
  if (q.answer.kind !== 'fraction') throw new Error('not fraction');
  return [Number(q.answer.value.s) * Number(q.answer.value.n), Number(q.answer.value.d)];
};

describe('2-6 equations: the answer satisfies the equation', () => {
  for (const id of ['2-6/add-sub', '2-6/mul', '2-6/word']) {
    it(id, () => {
      each(id, [1, 2, 3], (q) => {
        const m = q.meta as { form: string; x: R; a?: R; b?: R; k?: R; c?: R };
        expect(eq(ans(q), m.x)).toBe(true);
        if (m.form === 'add') expect(eq(add(m.x, m.a!), m.b!)).toBe(true);
        else if (m.form === 'sub') expect(eq(sub(m.x, m.a!), m.b!)).toBe(true);
        else expect(eq(mul(m.k!, m.x), m.c!)).toBe(true);
        expect(m.x[0]).not.toBe(0);
      });
    });
  }
  it('F1 word problems have whole-number answers in a realistic range', () => {
    each('2-6/word', [1], (q) => {
      const [n, d] = ans(q);
      expect(d).toBe(1);
      expect(n).toBeGreaterThanOrEqual(180);
      expect(n).toBeLessThanOrEqual(340);
    });
  });
  it('write-eq: correct choice is (p/q)x = v', () => {
    each('2-6/write-eq', [1, 2], (q) => {
      const { p, q: qq, v } = q.meta as { p: number; q: number; v: number };
      if (q.answer.kind === 'choice') expect(q.choices![q.answer.index]).toContain(`\\frac{${p}}{${qq}}\\text{س} = ${v}`);
    });
  });
});

describe('2-7 patterns', () => {
  const nth = (s: SeqSpec, n: number): number =>
    s.kind === 'arith' ? s.a + (n - 1) * s.d : s.kind === 'geom' ? s.a * (s.r[0] / s.r[1]) ** (n - 1) : s.p * n * n + s.q * n + s.c;
  for (const id of ['2-7/arith', '2-7/geom', '2-7/quad']) {
    it(`${id}: the asked term follows the rule`, () => {
      each(id, [1, 2, 3], (q) => {
        const { spec, askN } = q.meta as { spec: SeqSpec; askN: number };
        const [n, d] = ans(q);
        expect(n / d).toBeCloseTo(nth(spec, askN), 9);
        expect(Math.abs(n / d)).toBeLessThan(1e6);
      });
    });
  }
  it('word: the week found is the FIRST week exceeding the target', () => {
    each('2-7/word', [2, 3], (q) => {
      const { spec, target, week } = q.meta as { spec: SeqSpec; target: number; week: number };
      expect(nth(spec, week)).toBeGreaterThan(target);
      expect(nth(spec, week - 1)).toBeLessThanOrEqual(target);
      expect(ans(q)).toEqual([week, 1]);
    });
  });
});

describe('2-8 powers: exact answers match native JS math', () => {
  for (const id of ['2-8/evaluate', '2-8/order-ops', '2-8/substitute', '2-8/piggy']) {
    it(id, () => {
      each(id, [1, 2, 3], (q) => {
        const { js, check } = q.meta as { js: string; check?: string };
        const native = Function(`return ${js}`)() as number;
        const [n, d] = ans(q);
        expect(n / d).toBeCloseTo(native, 9);
        if (check) expect(Function(`return ${check}`)()).toBe(true);
      });
    });
  }
  it('true-false truth matches native evaluation', () => {
    each('2-8/true-false', [1], (q) => {
      const { lhs, rhs, truth } = q.meta as { lhs: string; rhs: string; truth: boolean };
      const same = Math.abs((Function(`return ${lhs}`)() as number) - (Function(`return ${rhs}`)() as number)) < 1e-9;
      expect(same).toBe(truth);
      if (q.answer.kind === 'choice') expect(q.answer.index).toBe(truth ? 0 : 1);
    });
  });
  it('evalExact handles precedence and signs', () => {
    expect(evalExact('(-3)**2').valueOf()).toBe(9);
    expect(evalExact('-(3**2)').valueOf()).toBe(-9);
    expect(evalExact('2**(-3)').toFraction()).toBe('1/8');
    expect(evalExact('3 + 2**3 * 4').valueOf()).toBe(35);
    expect(evalExact('(1/2)**(-2)').valueOf()).toBe(4);
  });
});

describe('2-9 scientific notation', () => {
  it('to-sci: mantissa in [1,10) and value matches the standard form', () => {
    each('2-9/to-sci', [1, 2, 3], (q) => {
      const { m, e, standard } = q.meta as { m: number; e: number; standard: string };
      expect(Math.abs(m)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(m)).toBeLessThan(10);
      expect(Number(standard)).toBeCloseTo(m * 10 ** e, Math.max(0, -e + 6));
      expect(standard).not.toMatch(/e|\(/); // plain decimal, no exponent / repeating notation
    });
  });
  it('to-std: value = m × 10^e', () => {
    each('2-9/to-std', [1, 2, 3], (q) => {
      const { m, e } = q.meta as { m: number; e: number };
      const [n, d] = ans(q);
      expect(n / d / (m * 10 ** e)).toBeCloseTo(1, 9);
    });
  });
  it('compare: symbol is right', () => {
    each('2-9/compare', [1, 2, 3], (q) => {
      const { a, b, sym } = q.meta as { a: number; b: number; sym: string };
      const rel = Math.abs(a - b) / Math.max(a, b);
      expect(sym).toBe(rel < 1e-12 ? '=' : a > b ? '>' : '<');
    });
  });
  it('order: correct order is descending', () => {
    each('2-9/order', [1, 2, 3], (q) => {
      const { values, correctOrder } = q.meta as { values: number[]; correctOrder: number[] };
      expect(correctOrder).toEqual([...values].sort((x, y) => y - x));
    });
  });
});

describe('boss 2: fraction → decimal', () => {
  it('long division is right', () => {
    expect(decimalParts(1, 3)).toEqual({ int: 0, nonRep: '', rep: '3' });
    expect(decimalParts(5, 6)).toEqual({ int: 0, nonRep: '8', rep: '3' });
    expect(decimalParts(2, 11)).toEqual({ int: 0, nonRep: '', rep: '18' });
    expect(decimalParts(3, 8)).toEqual({ int: 0, nonRep: '375', rep: '' });
  });
  it('terminating answers equal n/d', () => {
    each('boss2/to-decimal', [1, 2], (q) => {
      const { n, d } = q.meta as { n: number; d: number };
      expect(eq(ans(q), [n, d])).toBe(true);
    });
  });
  it('repeating: choices other than the answer are not equal to it in value', () => {
    each('boss2/to-decimal', [3], (q) => {
      const { n, d } = q.meta as { n: number; d: number };
      if (q.answer.kind !== 'choice') return;
      const idx = q.answer.index;
      q.choices!.forEach((c, i) => {
        if (i === idx) return;
        // value of a choice like "$0.1\overline{6}$" via repeating decimal formula
        const m = c.match(/\$(-?)(\d+)\.(\d*)(?:\\overline\{(\d+)\})?(\d*)\$/);
        if (!m) return;
        const [, , int, pre, rep = ''] = m;
        const val = rep ? Number(int) + (Number(pre + rep) - Number(pre || '0')) / (10 ** pre.length * (10 ** rep.length - 1)) : Number(`${int}.${pre}`);
        expect(Math.abs(val - n / d)).toBeGreaterThan(1e-9);
      });
    });
  });
});
