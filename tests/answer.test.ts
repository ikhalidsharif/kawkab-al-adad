import Fraction from 'fraction.js';
import { describe, expect, it } from 'vitest';
import { arabicKey, checkAnswer, parseNumber, termsMatch } from '../src/core/answer';

describe('parseNumber', () => {
  it('parses integers, decimals, grouped digits and Arabic-Indic digits', () => {
    expect(parseNumber('64')!.value.equals(64)).toBe(true);
    expect(parseNumber('-0.75')!.value.equals(new Fraction(-3, 4))).toBe(true);
    expect(parseNumber('1 073 741 824')!.value.equals(1073741824)).toBe(true);
    expect(parseNumber('١٢٠')!.value.equals(120)).toBe(true);
    expect(parseNumber('abc')).toBeNull();
  });
});

describe('arabicKey (lenient term matching)', () => {
  it('ignores hamza forms, ال, ة/ه, ى/ي, diacritics and spaces', () => {
    expect(termsMatch('الأجسام المضادة', 'اجسام مضاده')).toBe(true);
    expect(termsMatch('مُوَلِّدات الضِّد', 'مولدات الضد')).toBe(true);
    expect(termsMatch('المناعة الاصطناعية', 'مناعه اصطناعيه')).toBe(true);
    expect(termsMatch('الأهداب', 'الأجسام')).toBe(false);
    expect(arabicKey('الأهداب')).not.toBe(arabicKey('الأجسام'));
  });
  it('handles words whose own letters start with "ال" (التهاب)', () => {
    expect(termsMatch('الالتهاب', 'التهاب')).toBe(true);
    expect(termsMatch('الالتهاب', 'الالتهاب')).toBe(true);
    expect(termsMatch('التهاب', 'تهاب')).toBe(true); // lenient on purpose: the article is dropped
  });
  it('checks text answers against all accepted forms', () => {
    const spec = { kind: 'text' as const, accepted: ['الأجسام المضادة', 'جسم مضاد'] };
    expect(checkAnswer(spec, 'اجسام مضادة').status).toBe('correct');
    expect(checkAnswer(spec, 'الجسم المضاد').status).toBe('correct');
    expect(checkAnswer(spec, 'مولد الضد').status).toBe('wrong');
    expect(checkAnswer(spec, '  ').status).toBe('invalid');
  });
});

describe('order / sort / label answers', () => {
  it('order: reports misplaced positions, rejects incomplete', () => {
    const spec = { kind: 'order' as const, items: ['ب', 'ج', 'أ'], correct: [2, 0, 1] };
    expect(checkAnswer(spec, [2, 0, 1]).status).toBe('correct');
    const r = checkAnswer(spec, [0, 2, 1]);
    expect(r.status).toBe('wrong');
    expect(r.wrongParts).toEqual([0, 1]);
    expect(checkAnswer(spec, [2, 0]).status).toBe('invalid');
  });
  it('sort: reports wrongly placed items, rejects unassigned', () => {
    const spec = { kind: 'sort' as const, items: ['x', 'y', 'z'], buckets: ['A', 'B'], assign: [0, 1, 1] };
    expect(checkAnswer(spec, [0, 1, 1]).status).toBe('correct');
    expect(checkAnswer(spec, [1, 1, 1]).wrongParts).toEqual([0]);
    expect(checkAnswer(spec, [0, -1, 1]).status).toBe('invalid');
  });
  it('label and choice compare indices', () => {
    expect(checkAnswer({ kind: 'label', diagram: 'd', regions: ['a', 'b'], index: 1 }, 1).status).toBe('correct');
    expect(checkAnswer({ kind: 'choice', index: 0 }, 2).status).toBe('wrong');
  });
});
