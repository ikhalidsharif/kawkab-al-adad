import Fraction from 'fraction.js';
import type { AnswerSpec } from './question';
import { gcd } from './mathutil';

export type CheckStatus = 'correct' | 'unsimplified' | 'wrong' | 'invalid';
export interface CheckResult {
  status: CheckStatus;
  message?: string;
}

/** Normalise student input: Arabic-Indic digits, Arabic decimal comma, unicode minus, spacing. */
export function normalize(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[\u066b]/g, '.')
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[÷\u2044\u2215]/g, '/')
    .replace(/[×xX*]/g, '×')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ParsedNumber {
  value: Fraction;
  /** False when the student wrote a fraction that could still be reduced (e.g. 6/8, 1 2/4, 6/3). */
  simplest: boolean;
}

/** Parse an integer, decimal, fraction "a/b" or mixed number "w a/b" (with optional sign). */
export function parseNumber(raw: string): ParsedNumber | null {
  let s = normalize(raw).replace(/^\+/, '').replace(/^\((.*)\)$/, '$1');
  // Digit grouping such as "45 000 000" or "45,000,000".
  if (/^-?\d{1,3}([ ,]\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/[ ,]/g, '');
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^(-)?\s*(\d+)$/))) {
    return { value: new Fraction(Number(m[2])).mul(m[1] ? -1 : 1), simplest: true };
  }
  if ((m = s.match(/^(-)?\s*(\d*\.\d+|\d+\.)$/))) {
    const v = new Fraction(m[2]);
    return { value: m[1] ? v.neg() : v, simplest: true };
  }
  if ((m = s.match(/^(-)?\s*(\d+)\s*\/\s*(-)?\s*(\d+)$/))) {
    const n = Number(m[2]);
    const d = Number(m[4]);
    if (d === 0) return null;
    const neg = (m[1] ? 1 : 0) + (m[3] ? 1 : 0) === 1;
    const v = new Fraction(n, d);
    return { value: neg ? v.neg() : v, simplest: gcd(n, d) === 1 && d !== 1 || n === 0 && d === 1 };
  }
  if ((m = s.match(/^(-)?\s*(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) {
    const w = Number(m[2]);
    const n = Number(m[3]);
    const d = Number(m[4]);
    if (d === 0) return null;
    const v = new Fraction(w).add(new Fraction(n, d));
    // A mixed number is "simplest" when its fractional part is proper and reduced.
    const simplest = n < d && n > 0 && gcd(n, d) === 1;
    return { value: m[1] ? v.neg() : v, simplest };
  }
  return null;
}

/** Parse "±7", "+-5/6", "7,-7", "7 و -7" into the positive magnitude (exact), or null. */
export function parsePlusMinus(raw: string): Fraction | null {
  const s = normalize(raw).replace(/\+-|-\+|\+\/-/g, '±');
  const m = s.match(/^±\s*(.+)$/);
  if (m) {
    const p = parseNumber(m[1]);
    return p && Number(p.value.s) > 0 ? p.value : null;
  }
  const parts = s.split(/\s*(?:,|،|و|or|أو)\s*/).filter(Boolean);
  if (parts.length === 2) {
    const a = parseNumber(parts[0]);
    const b = parseNumber(parts[1]);
    if (a && b && !a.value.equals(0) && a.value.add(b.value).equals(0)) return a.value.abs();
  }
  return null;
}

/** Parse scientific notation: "2.5×10^-3", "2.5*10^(-3)", "2.5e-3". */
export function parseSci(raw: string): { mantissa: Fraction; exp: number } | null {
  const s = normalize(raw).replace(/\s/g, '');
  let m = s.match(/^(-?\d*\.?\d+)×10\^\(?([+-]?\d+)\)?$/);
  if (!m) m = s.match(/^(-?\d*\.?\d+)[eE]([+-]?\d+)$/);
  if (!m) return null;
  return { mantissa: new Fraction(m[1]), exp: Number(m[2]) };
}

const SIMPLIFY_MSG = 'إجابة صحيحة لكن بسّطها لتحصل على النقاط كاملة';

export function checkAnswer(spec: AnswerSpec, input: string | number | boolean): CheckResult {
  switch (spec.kind) {
    case 'choice':
      return { status: input === spec.index ? 'correct' : 'wrong' };
    case 'bool':
      return { status: input === spec.value ? 'correct' : 'wrong' };
    case 'fraction': {
      if (spec.decimalOnly && /\//.test(normalize(String(input))))
        return { status: 'invalid', message: 'اكتب الإجابة كسراً عشرياً (مثل 0.75) لا كسراً اعتيادياً' };
      const p = parseNumber(String(input));
      if (!p) return { status: 'invalid', message: 'اكتب عدداً أو كسراً مثل 3/4 أو 1 1/2' };
      if (!p.value.equals(spec.value)) return { status: 'wrong' };
      if (spec.requireSimplest !== false && !p.simplest) return { status: 'unsimplified', message: SIMPLIFY_MSG };
      return { status: 'correct' };
    }
    case 'number': {
      const p = parseNumber(String(input));
      if (!p) return { status: 'invalid', message: 'اكتب عدداً' };
      const tol = spec.tol ?? 1e-9;
      return { status: Math.abs(p.value.valueOf() - spec.value) <= tol ? 'correct' : 'wrong' };
    }
    case 'plusminus': {
      const v = parsePlusMinus(String(input));
      if (v === null) {
        const single = parseNumber(String(input));
        if (single && single.value.abs().equals(spec.value))
          return { status: 'wrong', message: 'ناقصة! للمعادلة حلّان: موجب وسالب (استعمل ±)' };
        return { status: 'invalid', message: 'اكتب الحلّين، مثل ±7 (اكتب +- بدل ±)' };
      }
      return { status: v.equals(spec.value) ? 'correct' : 'wrong' };
    }
    case 'sci': {
      const p = parseSci(String(input));
      if (!p) return { status: 'invalid', message: 'اكتبها بالصيغة: 2.5×10^-3' };
      const target = spec.mantissa.mul(new Fraction(10).pow(spec.exp));
      const got = p.mantissa.mul(new Fraction(10).pow(p.exp));
      if (!got.equals(target)) return { status: 'wrong' };
      const a = Math.abs(p.mantissa.valueOf());
      if (a < 1 || a >= 10)
        return { status: 'unsimplified', message: 'القيمة صحيحة لكن يجب أن يكون 1 ≤ |أ| < 10 في الصيغة العلمية' };
      return { status: 'correct' };
    }
  }
}

/** Live TeX preview of what the student is typing. */
export function previewTex(raw: string): string {
  const s = normalize(raw).replace(/^\+-|^\+\/-/, '±');
  if (!s) return '';
  if (s.startsWith('±')) return `\\pm ${previewTex(s.slice(1))}`;
  let m = s.match(/^(-)?\s*(\d+)\s+(\d+)\s*\/\s*(\d*)$/);
  if (m) return `${m[1] ?? ''}${m[2]}\\frac{${m[3]}}{${m[4] || '\\square'}}`;
  m = s.match(/^(-)?\s*(\d+)\s*\/\s*(-?\d*)$/);
  if (m) return `${m[1] ?? ''}\\frac{${m[2]}}{${m[3] || '\\square'}}`;
  m = s.match(/^(-?\d*\.?\d+)\s*×\s*10\^?\(?([+-]?\d*)\)?$/);
  if (m) return `${m[1]}\\times 10^{${m[2] || '\\square'}}`;
  return s.replace(/±/g, '\\pm ').replace(/×/g, '\\times ');
}
