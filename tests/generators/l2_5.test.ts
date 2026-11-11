import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../src/core/answer';
import { gcd } from '../../src/core/mathutil';
import type { Difficulty, Question } from '../../src/core/question';
import { makeQuestion } from '../../src/generators';
import { generators2_5 } from '../../src/generators/l2_5';

const SEEDS = 500;

function each(genId: string, ds: readonly Difficulty[], fn: (q: Question) => void) {
  for (const d of ds) for (let s = 1; s <= SEEDS; s++) fn(makeQuestion(genId, s * 7919, d));
}

/** Independent integer evaluation of Σ ±n/d → [num, den] (no fraction library). */
function evalTerms(terms: [number, number][], ops: string[]): [number, number] {
  let [n, d] = terms[0];
  for (let i = 1; i < terms.length; i++) {
    const [n2, d2] = terms[i];
    n = ops[i - 1] === '+' ? n * d2 + n2 * d : n * d2 - n2 * d;
    d = d * d2;
  }
  return [n, d];
}

describe('2-5 generators: shared properties', () => {
  for (const g of generators2_5) {
    it(`${g.id}: deterministic, well-formed, self-consistent`, () => {
      each(g.id, g.difficulties, (q) => {
        const again = makeQuestion(g.id, q.seed, q.difficulty);
        expect(again.prompt).toBe(q.prompt);
        const text = q.prompt + q.solution.join('') + q.hints.join('') + (q.choices ?? []).join('');
        expect(text).not.toMatch(/NaN|undefined|Infinity|null/);
        // Guard against "\f", "\t" etc. eaten by JS string escapes.
        expect(text).not.toMatch(/[\u0000-\u0008\u000b-\u001f]/);
        expect(q.answerTex).not.toMatch(/[\u0000-\u001f]/);
        expect(q.solution.length).toBeGreaterThan(0);
        expect(q.hints.length).toBeGreaterThan(0);
        if (q.answer.kind === 'choice') {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.answer.index).toBeGreaterThanOrEqual(0);
        }
      });
    });
  }
});

describe('2-5 arithmetic answers are correct', () => {
  for (const id of ['2-5/same-den', '2-5/diff-den', '2-5/mixed', '2-5/word']) {
    it(id, () => {
      each(id, [1, 2, 3], (q) => {
        const { terms, ops } = q.meta as { terms: [number, number][]; ops: string[] };
        const [n, d] = evalTerms(terms, ops);
        expect(q.answer.kind).toBe('fraction');
        if (q.answer.kind !== 'fraction') return;
        const v = q.answer.value;
        // n/d === s·N/D  ⇔  n·D === s·N·d
        expect(n * Number(v.d)).toBe(Number(v.s) * Number(v.n) * d);
        expect(n).not.toBe(0);
        // Denominators in the question stay within 2..12.
        for (const [, den] of terms) {
          expect(den).toBeGreaterThanOrEqual(2);
          expect(den).toBeLessThanOrEqual(12);
        }
        // Answer is stored in simplest form and the checker accepts its own answer.
        expect(gcd(Number(v.n), Number(v.d))).toBe(1);
        const typed = `${Number(v.s) < 0 ? '-' : ''}${v.n}${Number(v.d) === 1 ? '' : '/' + v.d}`;
        expect(checkAnswer(q.answer, typed).status).toBe('correct');
      });
    });
  }

  it('same-den: both terms share a denominator; diff-den: they differ', () => {
    each('2-5/same-den', [1, 2, 3], (q) => {
      const { terms } = q.meta as { terms: [number, number][] };
      expect(terms[0][1]).toBe(terms[1][1]);
    });
    each('2-5/diff-den', [1, 2, 3], (q) => {
      const { terms } = q.meta as { terms: [number, number][] };
      expect(terms[0][1]).not.toBe(terms[1][1]);
    });
  });

  it('word problems never produce negative amounts', () => {
    each('2-5/word', [1, 2, 3], (q) => {
      if (q.answer.kind === 'fraction') expect(Number(q.answer.value.s)).toBe(1);
    });
  });

  it('difficulty-3 same-den answers require simplifying', () => {
    let needed = 0;
    each('2-5/same-den', [3], (q) => {
      const { terms, ops } = q.meta as { terms: [number, number][]; ops: string[] };
      const r = ops[0] === '+' ? terms[0][0] + terms[1][0] : terms[0][0] - terms[1][0];
      if (gcd(r, terms[0][1]) > 1) needed++;
    });
    expect(needed / SEEDS).toBeGreaterThan(0.9);
  });
});

describe('2-5 LCD multiple choice', () => {
  it('correct choice is the least common multiple', () => {
    each('2-5/lcd', [1, 2], (q) => {
      const { b, c, L } = q.meta as { b: number; c: number; L: number };
      expect(L % b).toBe(0);
      expect(L % c).toBe(0);
      for (let m = 1; m < L; m++) expect(m % b === 0 && m % c === 0).toBe(false);
      if (q.answer.kind === 'choice') expect(q.choices![q.answer.index]).toBe(`$${L}$`);
    });
  });
});
