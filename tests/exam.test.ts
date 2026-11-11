import { describe, expect, it } from 'vitest';
import { buildExam, EXAM_SIZE, examLessons, gradeExam } from '../src/core/exam';
import { makeRng } from '../src/core/rng';
import { typedAnswer } from './helpers';

describe('mock exam', () => {
  it('has 25 questions covering every tested lesson at least twice', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const qs = buildExam(makeRng(seed));
      expect(qs).toHaveLength(EXAM_SIZE);
      for (const id of examLessons()) expect(qs.filter((q) => q.lesson === id).length, id).toBeGreaterThanOrEqual(2);
      expect(qs.some((q) => q.lesson === '3-0')).toBe(false);
      expect(qs.some((q) => q.gen === 'boss2/to-decimal')).toBe(true);
    }
  });

  it('grades: all correct = 25, blanks = 0, unsimplified = ½, strong/weak lessons', () => {
    const qs = buildExam(makeRng(7));
    const perfect = gradeExam(qs, qs.map(typedAnswer));
    expect(perfect.score).toBe(EXAM_SIZE);
    expect(perfect.weak).toHaveLength(0);
    expect(perfect.strong.length).toBe(examLessons().length);

    const blank = gradeExam(qs, qs.map(() => null));
    expect(blank.score).toBe(0);
    expect(blank.items.every((i) => i.status === 'blank')).toBe(true);
    expect(blank.weak.length).toBe(examLessons().length);

    // one lesson wrong, the rest right
    const target = qs[0].lesson;
    const mixed = gradeExam(
      qs,
      qs.map((q) => (q.lesson === target ? (q.answer.kind === 'choice' ? (q.answer.index + 1) % (q.choices?.length ?? 2) : '999999') : typedAnswer(q))),
    );
    expect(mixed.weak).toEqual([target]);
    expect(mixed.byLesson[target]!.correct).toBe(0);
  });

  it('unsimplified fractions earn half a point', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const qs = buildExam(makeRng(seed));
      const q = qs.find((x) => x.answer.kind === 'fraction' && x.answer.requireSimplest && !x.answer.decimalOnly && Number(x.answer.value.d) > 1);
      if (!q || q.answer.kind !== 'fraction') continue;
      const v = q.answer.value;
      const r = gradeExam([q], [`${Number(v.s) * Number(v.n) * 2}/${Number(v.d) * 2}`]);
      expect(r.items[0].status).toBe('unsimplified');
      expect(r.score).toBe(0.5);
      return;
    }
    throw new Error('no fraction question found');
  });
});
