import Fraction from 'fraction.js';
import { gcd, lcm, paren, texFrac, texMixed, texRaw } from '../core/mathutil';
import type { Rich } from '../core/question';

export type Op = '+' | '-';

const signed = (f: Fraction) => Number(f.s) * Number(f.n);
const isMixedLike = (f: Fraction) => Number(f.d) !== 1 && Number(f.n) > Number(f.d);

/** TeX of an expression like  a/b + (-c/d) - e/f  (mixed numbers shown as mixed when asMixed). */
export function exprTex(terms: Fraction[], ops: Op[], asMixed = false): string {
  const t = (f: Fraction) => (asMixed ? texMixed(f) : texFrac(f));
  let s = t(terms[0]);
  for (let i = 1; i < terms.length; i++) s += ` ${ops[i - 1]} ${paren(t(terms[i]))}`;
  return s;
}

export function evaluate(terms: Fraction[], ops: Op[]): Fraction {
  let r = terms[0];
  for (let i = 1; i < terms.length; i++) r = ops[i - 1] === '+' ? r.add(terms[i]) : r.sub(terms[i]);
  return r;
}

/**
 * Step-by-step solution for adding/subtracting rational numbers, following the book:
 * (mixed → improper) → LCD (م.م.أ) → combine numerators → simplify → mixed form.
 */
export function fractionSolution(terms: Fraction[], ops: Op[], asMixed = false): { steps: Rich[]; result: Fraction; lcd: number } {
  const steps: Rich[] = [];
  const result = evaluate(terms, ops);

  if (asMixed && terms.some(isMixedLike)) {
    const conv = terms.filter(isMixedLike).map((f) => `$${texMixed(f)} = ${texFrac(f)}$`);
    steps.push(`نحوّل الأعداد الكسرية إلى كسور غير حقيقية: ${conv.join(' ، ')}`);
  }

  const dens = terms.map((f) => Number(f.d));
  const L = dens.reduce((a, b) => lcm(a, b));
  const allSame = dens.every((d) => d === dens[0]);
  if (!allSame) {
    const uniq = [...new Set(dens)];
    const rewrites = terms
      .filter((f) => Number(f.d) !== L)
      .map((f) => `$${texFrac(f)} = ${texRaw(signed(f) * (L / Number(f.d)), L)}$`);
    steps.push(`م.م.أ للمقامات ${uniq.map((d) => `$${d}$`).join(' و ')} هو $${L}$، فنكتب: ${rewrites.join(' ، ')}`);
  }

  const nums = terms.map((f) => signed(f) * (L / Number(f.d)));
  const hasSub = ops.includes('-');
  let numExpr = `${nums[0]}`;
  for (let i = 1; i < nums.length; i++) numExpr += ` ${ops[i - 1]} ${nums[i] < 0 ? `(${nums[i]})` : nums[i]}`;
  let R = nums[0];
  for (let i = 1; i < nums.length; i++) R = ops[i - 1] === '+' ? R + nums[i] : R - nums[i];
  const verb = !hasSub ? 'نجمع البسطين' : ops.every((o) => o === '-') ? 'نطرح البسطين' : 'نجمع ونطرح البسوط';
  steps.push(
    `المقامات متساوية الآن، ${verb} ونُبقي المقام $${L}$: $\\frac{${numExpr}}{${L}} = ${texRaw(R, L)}$` +
      (hasSub ? ' (طرح عدد يساوي جمع معكوسه الجمعي)' : ''),
  );

  const g = gcd(R, L);
  if (R !== 0 && g > 1) {
    steps.push(`نبسّط بقسمة البسط والمقام على $${g}$: $${texRaw(R, L)} = ${texFrac(result)}$`);
  }
  if (isMixedLike(result)) {
    steps.push(`الناتج في أبسط صورة: $${texFrac(result)} = ${texMixed(result)}$`);
  } else {
    steps.push(`الناتج في أبسط صورة: $${texFrac(result)}$`);
  }
  return { steps, result, lcd: L };
}

/** "pairs" of [signedNumerator, denominator] for tests. */
export function termsMeta(terms: Fraction[]): [number, number][] {
  return terms.map((f) => [signed(f), Number(f.d)]);
}
