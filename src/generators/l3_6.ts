import Fraction from 'fraction.js';
import type { Generator } from '../core/question';
import type { Rng } from '../core/rng';
import { isSquare, round1, tenthAnswer } from './util';
import { randomTriple } from './l3_5';

export interface Pt {
  x: number;
  y: number;
}

const ptTex = (name: string, p: Pt) => `\\text{${name}}(${p.x}, ${p.y})`;

/** Two grid points within [-lim, lim] whose distance is an integer (triples) or not. */
export function randomPoints(rng: Rng, exact: boolean, lim = 8): [Pt, Pt] {
  for (;;) {
    let dx: number;
    let dy: number;
    if (exact) {
      const [a, b] = randomTriple(rng, 15);
      [dx, dy] = [a * rng.sign(), b * rng.sign()];
    } else {
      dx = rng.int(1, 9) * rng.sign();
      dy = rng.int(1, 9) * rng.sign();
      if (isSquare(dx * dx + dy * dy)) continue;
    }
    const p = { x: rng.int(-lim, lim), y: rng.int(-lim, lim) };
    const q = { x: p.x + dx, y: p.y + dy };
    if (Math.abs(q.x) <= lim && Math.abs(q.y) <= lim) return [p, q];
  }
}

function distanceSteps(p: Pt, q: Pt): string[] {
  const dx = Math.abs(q.x - p.x);
  const dy = Math.abs(q.y - p.y);
  const sq = dx * dx + dy * dy;
  const r = Math.sqrt(sq);
  const exact = Number.isInteger(r);
  return [
    `نكوّن مثلثاً قائماً: الساق الأفقية $= |${q.x} - ${p.x < 0 ? `(${p.x})` : p.x}| = ${dx}$ ، والساق الرأسية $= |${q.y} - ${p.y < 0 ? `(${p.y})` : p.y}| = ${dy}$`,
    `$\\text{جـ}^{2} = ${dx}^{2} + ${dy}^{2} = ${dx * dx} + ${dy * dy} = ${sq}$`,
    `$\\text{جـ} = \\sqrt{${sq}} ${exact ? `= ${r}` : `\\approx ${round1(r).toFixed(1)}`}$`,
  ];
}

/* ---------- 1. Distance between two points ---------- */
export const distance: Generator = {
  id: '3-6/distance',
  lesson: '3-6',
  label: 'المسافة بين نقطتين',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const [p, q] = randomPoints(rng, d === 1, d === 3 ? 9 : 7);
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    const exact = Number.isInteger(r);
    const map = d === 3 && rng.chance(0.6);
    const places = rng.pick([['المنزل', 'المدرسة'], ['المكتبة', 'النادي'], ['الميناء', 'المنارة'], ['الحديقة', 'السوق']]);
    const prompt = map
      ? `على خريطة مرسومة على مستوى إحداثي، يقع ${places[0]} عند $(${p.x}, ${p.y})$ و${places[1]} عند $(${q.x}, ${q.y})$، وكل وحدة تمثل $1$ كم. ما المسافة بينهما بخط مستقيم${exact ? '' : ' لأقرب جزء من عشرة'}؟`
      : `أوجد المسافة بين النقطتين $${ptTex('أ', p)}$ و $${ptTex('ب', q)}$${exact ? '' : ' مقرّبة لأقرب جزء من عشرة'}.`;
    return {
      prompt,
      answer: exact ? { kind: 'fraction', value: new Fraction(r) } : tenthAnswer(r),
      answerTex: exact ? String(r) : `\\approx ${round1(r).toFixed(1)}`,
      hints: ['ارسم مثلثاً قائماً وتره القطعة بين النقطتين: الساقان هما الفرق الأفقي والفرق الرأسي.', `الساقان: $${Math.abs(dx)}$ و $${Math.abs(dy)}$`],
      solution: distanceSteps(p, q),
      placeholder: exact ? 'العدد' : 'لأقرب جزء من عشرة، مثال: 5.8',
      meta: { p, q },
    };
  },
};

/* ---------- 2. Leg lengths of the right triangle ---------- */
export const legsGen: Generator = {
  id: '3-6/legs',
  lesson: '3-6',
  label: 'أطوال ساقي المثلث في المستوى',
  difficulties: [1, 2],
  generate(rng, d) {
    const [p, q] = randomPoints(rng, d === 1, 8);
    const horizontal = rng.chance(0.5);
    const v = horizontal ? Math.abs(q.x - p.x) : Math.abs(q.y - p.y);
    return {
      prompt: `نكوّن مثلثاً قائماً وتره القطعة بين $${ptTex('أ', p)}$ و $${ptTex('ب', q)}$ وساقاه أفقية ورأسية. ما طول الساق ${horizontal ? 'الأفقية' : 'الرأسية'}؟`,
      answer: { kind: 'fraction', value: new Fraction(v) },
      answerTex: String(v),
      hints: [horizontal ? 'الساق الأفقية = الفرق بين الإحداثيين السينيين (بالقيمة المطلقة).' : 'الساق الرأسية = الفرق بين الإحداثيين الصاديين (بالقيمة المطلقة).'],
      solution: [horizontal ? `$|${q.x} - (${p.x})| = ${v}$` : `$|${q.y} - (${p.y})| = ${v}$`],
      placeholder: 'العدد',
      meta: { p, q, horizontal },
    };
  },
};

export const generators3_6 = [distance, legsGen];
