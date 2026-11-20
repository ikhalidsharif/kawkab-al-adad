import Fraction from 'fraction.js';
import type { AnswerInput, AnswerSpec } from './question';
import { gcd } from './mathutil';

export type CheckStatus = 'correct' | 'unsimplified' | 'wrong' | 'invalid';
export interface CheckResult {
  status: CheckStatus;
  message?: string;
  /** For order/sort answers: the positions (order) or items (sort) that are wrong. */
  wrongParts?: number[];
}

/** Normalise numeric input: Arabic-Indic digits, Arabic decimal comma, unicode minus, spacing. */
export function normalize(input: string): string {
  return input
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[٫]/g, '.')
    .replace(/[−–—]/g, '-')
    .replace(/[÷⁄∕]/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalise an Arabic term for lenient comparison: no diacritics/tatweel, unified alef/hamza forms,
 * ة→ه, ى→ي, no punctuation or spaces. With `stripArticle`, a leading "ال" is removed from each word.
 */
export function arabicKey(s: string, stripArticle = true): string {
  return s
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .split(/\s+/)
    .map((w) => (stripArticle ? w.replace(/^(و?)(ال)(?=..)/, '$1') : w))
    .join('')
    .replace(/[^ء-يa-zA-Z0-9]/g, '')
    .toLowerCase();
}

/**
 * Do two terms match? Compares with and without the article, because "ال" is sometimes part of the word
 * itself (التهاب ← الالتهاب).
 */
export function termsMatch(a: string, b: string): boolean {
  const ka = [arabicKey(a, true), arabicKey(a, false)];
  const kb = [arabicKey(b, true), arabicKey(b, false)];
  return ka.some((x) => x.length > 0 && kb.includes(x));
}

export interface ParsedNumber {
  value: Fraction;
  /** False when the student wrote a fraction that could still be reduced (e.g. 6/8). */
  simplest: boolean;
}

/** Parse an integer, decimal, fraction "a/b" or mixed number "w a/b" (with optional sign). */
export function parseNumber(raw: string): ParsedNumber | null {
  let s = normalize(raw).replace(/^\+/, '').replace(/^\((.*)\)$/, '$1');
  // Digit grouping such as "45 000 000" or "45,000,000".
  if (/^-?\d{1,3}([ ,]\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/[ ,]/g, '');
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(-)?\s*(\d+)$/))) return { value: new Fraction(Number(m[2])).mul(m[1] ? -1 : 1), simplest: true };
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
    return { value: neg ? v.neg() : v, simplest: (gcd(n, d) === 1 && d !== 1) || (n === 0 && d === 1) };
  }
  if ((m = s.match(/^(-)?\s*(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) {
    const w = Number(m[2]);
    const n = Number(m[3]);
    const d = Number(m[4]);
    if (d === 0) return null;
    const v = new Fraction(w).add(new Fraction(n, d));
    return { value: m[1] ? v.neg() : v, simplest: n < d && n > 0 && gcd(n, d) === 1 };
  }
  return null;
}

const SIMPLIFY_MSG = 'إجابة صحيحة لكن بسّطها لتحصل على النقاط كاملة';

export function checkAnswer(spec: AnswerSpec, input: AnswerInput): CheckResult {
  switch (spec.kind) {
    case 'choice':
    case 'label':
      return { status: input === spec.index ? 'correct' : 'wrong' };
    case 'fraction': {
      if (spec.decimalOnly && /\//.test(normalize(String(input ?? ''))))
        return { status: 'invalid', message: 'اكتب الإجابة كسراً عشرياً (مثل 0.75) لا كسراً اعتيادياً' };
      const p = parseNumber(String(input ?? ''));
      if (!p) return { status: 'invalid', message: 'اكتب عدداً' };
      if (!p.value.equals(spec.value)) return { status: 'wrong' };
      if (spec.requireSimplest !== false && !p.simplest) return { status: 'unsimplified', message: SIMPLIFY_MSG };
      return { status: 'correct' };
    }
    case 'number': {
      const p = parseNumber(String(input ?? ''));
      if (!p) return { status: 'invalid', message: 'اكتب عدداً' };
      return { status: Math.abs(p.value.valueOf() - spec.value) <= (spec.tol ?? 1e-9) ? 'correct' : 'wrong' };
    }
    case 'order': {
      if (!Array.isArray(input) || input.length !== spec.correct.length)
        return { status: 'invalid', message: 'رتّب كل العناصر أولاً' };
      const wrongParts = input.map((v, i) => (v === spec.correct[i] ? -1 : i)).filter((i) => i >= 0);
      return wrongParts.length ? { status: 'wrong', wrongParts, message: `${wrongParts.length} في غير مكانها` } : { status: 'correct' };
    }
    case 'sort': {
      if (!Array.isArray(input) || input.length !== spec.items.length || input.some((b) => b < 0))
        return { status: 'invalid', message: 'صنّف كل العناصر أولاً' };
      const wrongParts = input.map((b, i) => (b === spec.assign[i] ? -1 : i)).filter((i) => i >= 0);
      return wrongParts.length ? { status: 'wrong', wrongParts, message: `${wrongParts.length} في المكان الخطأ` } : { status: 'correct' };
    }
    case 'text': {
      const typed = String(input ?? '');
      if (!arabicKey(typed, false)) return { status: 'invalid', message: 'اكتب المصطلح أولاً' };
      return { status: spec.accepted.some((a) => termsMatch(a, typed)) ? 'correct' : 'wrong' };
    }
  }
}
