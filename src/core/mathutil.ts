import Fraction from 'fraction.js';

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export const F = (n: number, d = 1) => new Fraction(n, d);

/** TeX for a fraction value, e.g. -\frac{3}{4}, 5. */
export function texFrac(f: Fraction): string {
  const s = Number(f.s) < 0 ? '-' : '';
  const n = Number(f.n);
  const d = Number(f.d);
  if (d === 1) return `${s}${n}`;
  return `${s}\\frac{${n}}{${d}}`;
}

/** TeX as a mixed number when |f| > 1, e.g. -2\frac{1}{4}. */
export function texMixed(f: Fraction): string {
  const s = Number(f.s) < 0 ? '-' : '';
  const n = Number(f.n);
  const d = Number(f.d);
  if (d === 1) return `${s}${n}`;
  const w = Math.floor(n / d);
  const r = n % d;
  if (w === 0) return `${s}\\frac{${r}}{${d}}`;
  return `${s}${w}\\frac{${r}}{${d}}`;
}

/** Raw (possibly unsimplified) fraction TeX from integers. */
export function texRaw(n: number, d: number): string {
  if (d === 1) return `${n}`;
  return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`;
}

/** Wrap negative terms in parentheses for use after an operator. */
export function paren(tex: string): string {
  return tex.startsWith('-') ? `\\left(${tex}\\right)` : tex;
}

/** Same as texFrac, but shows both mixed and improper when they differ: "\frac{9}{4} = 2\frac{1}{4}". */
export function texBoth(f: Fraction): string {
  const a = texFrac(f);
  const b = texMixed(f);
  return a === b ? a : `${a} = ${b}`;
}

export function toFrac(x: number | Fraction): Fraction {
  return x instanceof Fraction ? x : new Fraction(x);
}
