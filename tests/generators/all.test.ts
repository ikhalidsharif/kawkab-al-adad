import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../src/core/answer';
import { ALL_GENERATORS, makeQuestion } from '../../src/generators';
import { typedAnswer } from '../helpers';

const SEEDS = 300;

describe('every generator: shared properties', () => {
  for (const g of ALL_GENERATORS) {
    it(`${g.id}`, () => {
      for (const d of g.difficulties) {
        for (let s = 1; s <= SEEDS; s++) {
          const q = makeQuestion(g.id, s * 104729 + d, d);
          // deterministic
          expect(makeQuestion(g.id, q.seed, d).prompt).toBe(q.prompt);
          // well-formed text
          const text = [q.prompt, q.answerTex, ...q.solution, ...q.hints, ...(q.choices ?? [])].join('|');
          expect(text, q.prompt).not.toMatch(/NaN|undefined|Infinity|null|\[object/);
          expect(text, q.prompt).not.toMatch(/[\u0000-\u0008\u000b-\u001f]/);
          // balanced $ delimiters in every rich string
          for (const r of [q.prompt, ...q.solution, ...q.hints, ...(q.choices ?? [])]) {
            expect((r.match(/\$/g) ?? []).length % 2, r).toBe(0);
          }
          expect(q.solution.length).toBeGreaterThan(0);
          expect(q.hints.length).toBeGreaterThan(0);
          if (q.answer.kind === 'choice') {
            expect(q.choices && q.choices.length >= 2).toBe(true);
            expect(new Set(q.choices).size, q.prompt).toBe(q.choices!.length);
            expect(q.answer.index).toBeGreaterThanOrEqual(0);
            expect(q.answer.index).toBeLessThan(q.choices!.length);
          }
          // the checker accepts the generator's own answer
          expect(checkAnswer(q.answer, typedAnswer(q)).status, `${g.id} ${q.prompt} → ${typedAnswer(q)}`).toBe('correct');
        }
      }
    });
  }
});
