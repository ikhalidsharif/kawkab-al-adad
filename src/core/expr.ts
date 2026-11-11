import Fraction from 'fraction.js';

/**
 * Exact evaluator for small arithmetic expressions in JS syntax: numbers, + - * / ** and parentheses.
 * Used so generator answers are exact rationals (unit tests cross-check with native JS math).
 */
export function evalExact(src: string): Fraction {
  const toks = src.match(/\d+(?:\.\d+)?|\*\*|[-+*/()]/g) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const eat = (t?: string) => {
    const v = toks[i++];
    if (t && v !== t) throw new Error(`Expected ${t} in ${src}`);
    return v;
  };

  function expr(): Fraction {
    let v = term();
    while (peek() === '+' || peek() === '-') v = eat() === '+' ? v.add(term()) : v.sub(term());
    return v;
  }
  function term(): Fraction {
    let v = unary();
    while (peek() === '*' || peek() === '/') v = eat() === '*' ? v.mul(unary()) : v.div(unary());
    return v;
  }
  function unary(): Fraction {
    if (peek() === '-') {
      eat();
      return unary().neg();
    }
    return power();
  }
  function power(): Fraction {
    const b = primary();
    if (peek() === '**') {
      eat();
      const e = unary();
      return b.pow(e.valueOf());
    }
    return b;
  }
  function primary(): Fraction {
    const t = eat();
    if (t === '(') {
      const v = expr();
      eat(')');
      return v;
    }
    if (t === undefined || !/^\d/.test(t)) throw new Error(`Unexpected ${t} in ${src}`);
    return new Fraction(t);
  }

  const v = expr();
  if (i !== toks.length) throw new Error(`Trailing tokens in ${src}`);
  return v;
}
