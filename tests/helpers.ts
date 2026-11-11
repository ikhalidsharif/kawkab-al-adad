import type { Question } from '../src/core/question';

/** How a student would type the generator's own answer. */
export function typedAnswer(q: Question): string | number {
  const a = q.answer;
  switch (a.kind) {
    case 'choice':
      return a.index;
    case 'bool':
      return String(a.value);
    case 'sci':
      return `${a.mantissa.toString()}×10^${a.exp}`;
    case 'plusminus':
      return `±${a.value.toFraction()}`;
    case 'number':
      return String(a.value);
    case 'fraction': {
      const v = a.value;
      if (a.decimalOnly) return v.toString();
      return `${Number(v.s) < 0 ? '-' : ''}${v.n}${Number(v.d) === 1 ? '' : '/' + v.d}`;
    }
  }
}
