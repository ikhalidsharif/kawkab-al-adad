import Fraction from 'fraction.js';
import { gcd } from '../core/mathutil';
import type { Rng } from '../core/rng';

/** The variable "س" as used in the book, for TeX. */
export const X = '\\text{س}';
export const Y = '\\text{ص}';

/** A proper fraction n/d in simplest form with 1 ≤ n < d. */
export function properFrac(rng: Rng, d: number): Fraction {
  let n = rng.int(1, d - 1);
  for (let i = 0; i < 20 && gcd(n, d) !== 1; i++) n = rng.int(1, d - 1);
  if (gcd(n, d) !== 1) n = 1;
  return new Fraction(n, d);
}

/** Exact decimal string of a terminating fraction (e.g. 0.00045, 320000, -2.5). */
export function decStr(f: Fraction): string {
  return f.toString();
}

/** TeX for a decimal/integer with thin-space thousands grouping in the integer part. */
export function texNum(f: Fraction | number): string {
  const s = typeof f === 'number' ? String(f) : decStr(f);
  const [int, dec] = s.split('.');
  const neg = int.startsWith('-');
  const digits = neg ? int.slice(1) : int;
  const grouped = digits.length >= 5 ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : digits;
  return `${neg ? '-' : ''}${grouped}${dec !== undefined ? '.' + dec : ''}`;
}

/** Plain-text number with spaces as thousands separators (for Arabic prose). */
export function plainNum(f: Fraction | number): string {
  return texNum(f).replace(/\\,/g, ' ');
}

export function texSci(m: Fraction | number, e: number): string {
  return `${texNum(m)} \\times 10^{${e}}`;
}

/** Fractions may be shown as decimals in some equations; keep TeX for either. */
export function texValue(f: Fraction, asDecimal: boolean): string {
  if (!asDecimal) {
    const s = Number(f.s) < 0 ? '-' : '';
    return Number(f.d) === 1 ? `${s}${f.n}` : `${s}\\frac{${f.n}}{${f.d}}`;
  }
  return texNum(f);
}

/** Round to the nearest tenth (half away from zero). */
export function round1(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x) * 10 + 1e-9) / 10;
}

/** Answer spec for "round to the nearest tenth": accepts anything that rounds to the right tenth. */
export function tenthAnswer(x: number) {
  return { kind: 'number' as const, value: round1(x), tol: 0.05 };
}

export const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));

/** TeX for √n, simplified to an integer when n is a perfect square. */
export function texSqrt(n: number): string {
  return isSquare(n) ? String(Math.sqrt(n)) : `\\sqrt{${n}}`;
}

/** Integers 2..n distinct from those in `avoid`. */
export function pickDistinct(rng: Rng, lo: number, hi: number, avoid: number[]): number {
  for (;;) {
    const v = rng.int(lo, hi);
    if (!avoid.includes(v)) return v;
  }
}
