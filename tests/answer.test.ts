import Fraction from 'fraction.js';
import { describe, expect, it } from 'vitest';
import { checkAnswer, parseNumber, parsePlusMinus, parseSci } from '../src/core/answer';

const frac = (n: number, d: number) => ({ kind: 'fraction' as const, value: new Fraction(n, d), requireSimplest: true });

describe('parseNumber', () => {
  it('parses integers, decimals, fractions and mixed numbers', () => {
    expect(parseNumber('5')!.value.equals(5)).toBe(true);
    expect(parseNumber('-0.75')!.value.equals(new Fraction(-3, 4))).toBe(true);
    expect(parseNumber('3/4')!.value.equals(new Fraction(3, 4))).toBe(true);
    expect(parseNumber('-3/4')!.value.equals(new Fraction(-3, 4))).toBe(true);
    expect(parseNumber('3/-4')!.value.equals(new Fraction(-3, 4))).toBe(true);
    expect(parseNumber('1 1/2')!.value.equals(new Fraction(3, 2))).toBe(true);
    expect(parseNumber('-2 3/5')!.value.equals(new Fraction(-13, 5))).toBe(true);
    expect(parseNumber('٣/٤')!.value.equals(new Fraction(3, 4))).toBe(true);
    expect(parseNumber('−1/2')!.value.equals(new Fraction(-1, 2))).toBe(true);
  });
  it('rejects garbage and zero denominators', () => {
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('3/0')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });
  it('detects unsimplified forms', () => {
    expect(parseNumber('6/8')!.simplest).toBe(false);
    expect(parseNumber('1 2/4')!.simplest).toBe(false);
    expect(parseNumber('6/3')!.simplest).toBe(false);
    expect(parseNumber('5/3')!.simplest).toBe(true);
    expect(parseNumber('1 2/3')!.simplest).toBe(true);
  });
});

describe('checkAnswer fraction', () => {
  it('accepts improper and mixed forms equally', () => {
    expect(checkAnswer(frac(7, 4), '7/4').status).toBe('correct');
    expect(checkAnswer(frac(7, 4), '1 3/4').status).toBe('correct');
    expect(checkAnswer(frac(7, 4), '1.75').status).toBe('correct');
    expect(checkAnswer(frac(-7, 4), '-1 3/4').status).toBe('correct');
  });
  it('flags equivalent but unsimplified', () => {
    const r = checkAnswer(frac(3, 4), '6/8');
    expect(r.status).toBe('unsimplified');
    expect(r.message).toContain('بسّط');
  });
  it('marks wrong and invalid', () => {
    expect(checkAnswer(frac(3, 4), '4/3').status).toBe('wrong');
    expect(checkAnswer(frac(3, 4), '-3/4').status).toBe('wrong');
    expect(checkAnswer(frac(3, 4), 'hello').status).toBe('invalid');
  });
});

describe('plus-minus and scientific', () => {
  it('parses ± forms', () => {
    const seven = new Fraction(7);
    expect(parsePlusMinus('±7')!.equals(seven)).toBe(true);
    expect(parsePlusMinus('+-7')!.equals(seven)).toBe(true);
    expect(parsePlusMinus('7, -7')!.equals(seven)).toBe(true);
    expect(parsePlusMinus('-7 و 7')!.equals(seven)).toBe(true);
    expect(parsePlusMinus('±5/6')!.equals(new Fraction(5, 6))).toBe(true);
    expect(parsePlusMinus('+-0.7')!.equals(new Fraction(7, 10))).toBe(true);
    expect(parsePlusMinus('7')).toBeNull();
    expect(parsePlusMinus('7, 7')).toBeNull();
    expect(checkAnswer({ kind: 'plusminus', value: seven }, '7').status).toBe('wrong');
    expect(checkAnswer({ kind: 'plusminus', value: seven }, '±7').status).toBe('correct');
    expect(checkAnswer({ kind: 'plusminus', value: new Fraction(5, 6) }, '+-5/6').status).toBe('correct');
  });
  it('parses scientific notation and checks the mantissa range', () => {
    expect(parseSci('2.5×10^-3')!.exp).toBe(-3);
    expect(parseSci('2.5*10^(-3)')!.exp).toBe(-3);
    expect(parseSci('2.5e-3')!.mantissa.equals(new Fraction(5, 2))).toBe(true);
    const spec = { kind: 'sci' as const, mantissa: new Fraction(5, 2), exp: -3 };
    expect(checkAnswer(spec, '2.5x10^-3').status).toBe('correct');
    expect(checkAnswer(spec, '25×10^-4').status).toBe('unsimplified');
    expect(checkAnswer(spec, '2.5×10^3').status).toBe('wrong');
  });
});
