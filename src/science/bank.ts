import type { Difficulty, Generator, LessonId, QuestionBody, Rich } from '../core/question';
import type { Rng } from '../core/rng';
import { DIAGRAMS } from '../ui/diagrams';

interface Base {
  /** Unique id, e.g. "2-2a.first-line.skin". */
  id: string;
  /** Book page (53–97). */
  page: number;
  d: Difficulty;
  /** Explanation shown in the solution (our own wording, not copied from the book). */
  why: Rich;
  hint?: Rich;
}

export type BankItem = Base &
  (
    | { type: 'mc'; q: Rich; a: Rich; wrong: Rich[] }
    | { type: 'tf'; q: Rich; a: boolean }
    | { type: 'term'; q: Rich; a: string[] }
    | { type: 'order'; q: Rich; steps: Rich[] }
    | { type: 'sort'; q: Rich; buckets: Rich[]; items: [Rich, number][]; show?: number }
    | { type: 'match'; q: Rich; pairs: [Rich, Rich][]; show?: number }
    | { type: 'label'; q: Rich; diagram: string; target: string; regions?: string[] }
  );

export type ItemType = BankItem['type'];

export const TYPE_LABEL: Record<ItemType, string> = {
  mc: 'اختيار من متعدد',
  tf: 'صح أم خطأ',
  term: 'المصطلح العلمي',
  order: 'رتّب الخطوات',
  sort: 'صنّف',
  match: 'طابق',
  label: 'حدّد على المخطط',
};

const GENERIC_HINT: Record<ItemType, Rich> = {
  mc: 'استبعد الخيارات التي تعرف أنها خاطئة أولاً.',
  tf: 'ابحث عن الكلمة التي قد تجعل العبارة خاطئة (دائماً، فقط، لا…).',
  term: 'فكّر في المفردات الجديدة في هذا الدرس.',
  order: 'ابدأ بالخطوة التي لا يمكن أن يسبقها شيء.',
  sort: 'ابدأ بالعناصر التي أنت متأكد منها.',
  match: 'ابدأ بالأزواج الأسهل، ثم تبقى خيارات أقل.',
  label: 'تخيّل مسار مسبب المرض أو المادة في الجسم.',
};

/** Pick `n` distinct elements. */
function sample<T>(rng: Rng, arr: readonly T[], n: number): T[] {
  return rng.shuffle(arr).slice(0, Math.min(n, arr.length));
}

/** Shuffle until the order differs from the original (when possible). */
function shuffledIndices(rng: Rng, n: number): number[] {
  const base = Array.from({ length: n }, (_, i) => i);
  for (let t = 0; t < 10; t++) {
    const s = rng.shuffle(base);
    if (n < 2 || s.some((v, i) => v !== i)) return s;
  }
  return base.reverse();
}

/** Build one question from a bank item. Pure: depends only on `rng`. */
export function buildQuestion(item: BankItem, rng: Rng): QuestionBody {
  const base = { hints: [item.hint ?? GENERIC_HINT[item.type]], page: item.page, meta: { itemId: item.id } };
  switch (item.type) {
    case 'mc': {
      const opts = rng.shuffle([item.a, ...sample(rng, item.wrong, 3)]);
      return { ...base, prompt: item.q, choices: opts, answer: { kind: 'choice', index: opts.indexOf(item.a) }, answerText: item.a, solution: [item.why] };
    }
    case 'tf':
      return {
        ...base,
        prompt: `صح أم خطأ؟ ${item.q}`,
        choices: ['✓ صحيحة', '✗ خاطئة'],
        answer: { kind: 'choice', index: item.a ? 0 : 1 },
        answerText: item.a ? 'العبارة صحيحة' : 'العبارة خاطئة',
        solution: [item.why],
      };
    case 'term':
      return { ...base, prompt: item.q, answer: { kind: 'text', accepted: item.a }, answerText: item.a[0], solution: [item.why], placeholder: 'اكتب المصطلح العلمي' };
    case 'order': {
      const perm = shuffledIndices(rng, item.steps.length);
      const items = perm.map((i) => item.steps[i]);
      const correct = item.steps.map((_, k) => perm.indexOf(k));
      return {
        ...base,
        prompt: item.q,
        answer: { kind: 'order', items, correct },
        answerText: item.steps.join(' ← '),
        solution: [item.why, ...item.steps.map((s, i) => `${i + 1}. ${s}`)],
      };
    }
    case 'sort': {
      const chosen = sample(rng, item.items, item.show ?? 6);
      return {
        ...base,
        prompt: item.q,
        answer: { kind: 'sort', items: chosen.map((c) => c[0]), buckets: item.buckets, assign: chosen.map((c) => c[1]) },
        answerText: chosen.map(([t, b]) => `${t} ← ${item.buckets[b]}`).join('، '),
        solution: [item.why, ...chosen.map(([t, b]) => `${t}: ${item.buckets[b]}`)],
      };
    }
    case 'match': {
      const pairs = sample(rng, item.pairs, item.show ?? 4);
      const order = rng.shuffle(pairs.map((_, i) => i));
      const buckets = order.map((i) => pairs[i][1]);
      return {
        ...base,
        prompt: item.q,
        answer: { kind: 'sort', items: pairs.map((p) => p[0]), buckets, assign: pairs.map((_, i) => order.indexOf(i)), oneEach: true },
        answerText: pairs.map(([l, r]) => `${l} ← ${r}`).join('، '),
        solution: [item.why, ...pairs.map(([l, r]) => `${l}: ${r}`)],
      };
    }
    case 'label': {
      const def = DIAGRAMS[item.diagram];
      const pool = item.regions ?? Object.keys(def.regions);
      const regions = rng.shuffle(pool);
      return {
        ...base,
        prompt: item.q,
        diagram: item.diagram,
        answer: { kind: 'label', diagram: item.diagram, regions, index: regions.indexOf(item.target) },
        answerText: def.regions[item.target].name,
        solution: [item.why],
      };
    }
  }
}

/** One generator per item type present in a station's bank. */
export function bankGenerators(lesson: LessonId, items: BankItem[]): Generator[] {
  const types = [...new Set(items.map((i) => i.type))];
  return types.map((type) => {
    const ofType = items.filter((i) => i.type === type);
    const ds = [...new Set(ofType.map((i) => i.d))].sort() as Difficulty[];
    return {
      id: `${lesson}/${type}`,
      lesson,
      label: TYPE_LABEL[type],
      difficulties: ds,
      generate(rng, d) {
        const pool = ofType.filter((i) => i.d === d);
        return buildQuestion(rng.pick(pool.length ? pool : ofType), rng);
      },
    };
  });
}
