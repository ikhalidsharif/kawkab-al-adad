import { describe, expect, it } from 'vitest';
import type { Difficulty, Question } from '../../src/core/question';
import { makeQuestion } from '../../src/generators';
import { nearestRoot } from '../../src/generators/l3_2';
import { forward, type Step } from '../../src/generators/l3_3';
import { checkAnswer } from '../../src/core/answer';
import { innermost, randomReal } from '../../src/generators/l3_4';
import { makeRng } from '../../src/core/rng';

const SEEDS = 400;
function each(genId: string, ds: readonly Difficulty[], fn: (q: Question) => void) {
  for (const d of ds) for (let s = 1; s <= SEEDS; s++) fn(makeQuestion(genId, s * 7919 + d, d));
}
/** Numeric value of the expected answer (fraction / number / ±). */
const num = (q: Question): number => {
  const a = q.answer;
  if (a.kind === 'fraction' || a.kind === 'plusminus') return a.value.valueOf();
  if (a.kind === 'number') return a.value;
  throw new Error(`no numeric answer for ${a.kind}`);
};
const toTenth = (x: number) => Math.round(x * 10) / 10;

describe('3-0 warm-up', () => {
  it('squares', () => {
    each('3-0/squares', [1, 2], (q) => {
      const { n } = q.meta as { n: number };
      expect(num(q)).toBe(q.difficulty === 1 ? n * n : n);
    });
  });
  it('order is ascending', () => {
    each('3-0/order', [1, 2, 3], (q) => {
      const { values, sorted } = q.meta as { values: number[]; sorted: number[] };
      expect(sorted).toEqual([...values].sort((a, b) => a - b));
    });
  });
});

describe('3-1 square roots', () => {
  it('√ answers square back to the radicand', () => {
    each('3-1/sqrt', [1, 2, 3], (q) => {
      const { root, radicand } = q.meta as { root: number; radicand: number };
      expect(root * root).toBeCloseTo(radicand, 9);
      expect(Math.abs(num(q))).toBeCloseTo(root, 9);
    });
  });
  it('س² = n has the ± answer and a single value is rejected', () => {
    each('3-1/equation', [1, 2, 3], (q) => {
      const { root, radicand } = q.meta as { root: number; radicand: number };
      expect(q.answer.kind).toBe('plusminus');
      expect(num(q) ** 2).toBeCloseTo(radicand, 9);
      expect(num(q)).toBeCloseTo(root, 9);
      if (q.answer.kind === 'plusminus') expect(checkAnswer(q.answer, q.answer.value.toFraction()).status).toBe('wrong');
    });
  });
});

describe('3-2 estimating roots', () => {
  it('nearestRoot is right (brute force)', () => {
    for (let n = 1; n < 2000; n++) {
      const brute = Math.round(Math.sqrt(n));
      expect(nearestRoot(n)).toBe(brute);
    }
  });
  it('nearest / word answers', () => {
    for (const id of ['3-2/nearest', '3-2/word']) {
      each(id, [1, 2, 3], (q) => {
        const { n, sign } = q.meta as { n: number; sign: number };
        expect(Number.isInteger(Math.sqrt(n))).toBe(false);
        expect(num(q)).toBe(sign * Math.round(Math.sqrt(n)));
      });
    }
  });
  it('between: k < √n < k+1', () => {
    each('3-2/between', [1, 2, 3], (q) => {
      const { n, k } = q.meta as { n: number; k: number };
      expect(k * k).toBeLessThan(n);
      expect((k + 1) ** 2).toBeGreaterThan(n);
    });
  });
  it('compare symbol', () => {
    each('3-2/compare', [1, 2, 3], (q) => {
      const { n, other, sym } = q.meta as { n: number; other: number; sym: string };
      const diff = n - other * other;
      expect(sym).toBe(Math.abs(diff) < 1e-9 ? '=' : diff > 0 ? '>' : '<');
    });
  });
});

describe('3-3 work backward', () => {
  for (const id of ['3-3/chain', '3-3/fuel']) {
    it(`${id}: running the story forward from the answer gives the stated end`, () => {
      each(id, [1, 2, 3], (q) => {
        const { start, steps } = q.meta as { start: number; steps: Step[] };
        expect(num(q)).toBe(start);
        const vals = forward(start, steps);
        vals.forEach((v) => {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThan(0);
        });
        // the end value appears in the prompt
        expect(q.prompt).toContain(`$${vals[vals.length - 1]}$`);
      });
    });
  }
});

describe('3-4 real numbers', () => {
  it('classification is consistent with the value', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 3000; i++) {
      const it = randomReal(rng, ((i % 3) + 1) as Difficulty);
      const v = it.value;
      const isInt = Math.abs(v - Math.round(v)) < 1e-12;
      if (it.sets.includes('طبيعي')) expect(isInt && v > 0).toBe(true);
      if (it.sets.includes('كلي')) expect(isInt && v >= 0).toBe(true);
      if (it.sets.includes('صحيح')) expect(isInt).toBe(true);
      if (isInt) expect(it.sets).toContain('صحيح');
      expect(it.sets.includes('نسبي') !== it.sets.includes('غير نسبي')).toBe(true);
      expect(it.sets[it.sets.length - 1]).toBe('حقيقي');
      expect(innermost(it)).toBe(it.sets[0]);
    }
  });
  it('order ascending; compare symbol', () => {
    each('3-4/order', [1, 2, 3], (q) => {
      const { values, sorted } = q.meta as { values: number[]; sorted: number[] };
      expect(sorted).toEqual([...values].sort((a, b) => a - b));
    });
    each('3-4/compare', [1, 2, 3], (q) => {
      const { av, bv, sym } = q.meta as { av: number; bv: number; sym: string };
      expect(sym).toBe(Math.abs(av - bv) < 1e-12 ? '=' : av > bv ? '>' : '<');
    });
  });
});

describe('3-5 Pythagoras', () => {
  it('hypotenuse / leg / word answers', () => {
    for (const id of ['3-5/hyp', '3-5/leg', '3-5/word']) {
      each(id, [1, 2, 3], (q) => {
        const m = q.meta as { a: number; b?: number; c?: number; find: 'b' | 'c' };
        const exact = m.find === 'c' ? Math.hypot(m.a, m.b!) : Math.sqrt(m.c! ** 2 - m.a ** 2);
        expect(Number.isFinite(exact) && exact > 0).toBe(true);
        expect(num(q)).toBeCloseTo(toTenth(exact), 9);
        // d1 always uses whole-number triples
        if (q.difficulty === 1) expect(Number.isInteger(exact)).toBe(true);
      });
    }
  });
  it('converse: answer matches c² = a² + b²', () => {
    each('3-5/converse', [1, 2, 3], (q) => {
      const { sides } = q.meta as { sides: number[] };
      const [p, r, s] = [...sides].sort((x, y) => x - y);
      const right = Math.abs(p * p + r * r - s * s) < 1e-9;
      if (q.answer.kind === 'choice') expect(q.answer.index).toBe(right ? 0 : 1);
      expect(p + r).toBeGreaterThan(s); // it is a real triangle
    });
  });
});

describe('extension + 3-6 distance', () => {
  it('legs choices: exactly one pair has a² + b² = n', () => {
    each('3-ext/legs', [1, 2, 3], (q) => {
      const { n } = q.meta as { n: number };
      const ok = q.choices!.filter((c) => {
        const [x, y] = [...c.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
        return x * x + y * y === n;
      });
      expect(ok).toHaveLength(1);
    });
  });
  it('legs a² + b² = n, n not a perfect square', () => {
    for (const id of ['3-ext/legs', '3-ext/value']) {
      each(id, [1, 2, 3], (q) => {
        const { n, a, b } = q.meta as { n: number; a: number; b: number };
        expect(a * a + b * b).toBe(n);
        expect(Number.isInteger(Math.sqrt(n))).toBe(false);
      });
    }
  });
  it('distance between two points', () => {
    each('3-6/distance', [1, 2, 3], (q) => {
      const { p, q: r } = q.meta as { p: { x: number; y: number }; q: { x: number; y: number } };
      const dist = Math.hypot(r.x - p.x, r.y - p.y);
      expect(num(q)).toBeCloseTo(toTenth(dist), 9);
      for (const c of [p.x, p.y, r.x, r.y]) expect(Math.abs(c)).toBeLessThanOrEqual(9);
      if (q.difficulty === 1) expect(Number.isInteger(dist)).toBe(true);
    });
  });
  it('rounded answers accept 1-decimal input and reject the wrong tenth', () => {
    each('3-6/distance', [2], (q) => {
      if (q.answer.kind !== 'number') return;
      expect(checkAnswer(q.answer, q.answer.value.toFixed(1)).status).toBe('correct');
      expect(checkAnswer(q.answer, (q.answer.value + 0.1).toFixed(1)).status).toBe('wrong');
    });
  });
});
