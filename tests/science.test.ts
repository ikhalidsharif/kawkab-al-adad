import { describe, expect, it } from 'vitest';
import { arabicKey, checkAnswer } from '../src/core/answer';
import { buildExam, EXAM_SIZE, examLessons, gradeExam } from '../src/core/exam';
import { makeRng } from '../src/core/rng';
import { STATIONS } from '../src/data/science';
import { ATTACKS, DEFENCES } from '../src/data/science/s2_2a';
import { ALL_GENERATORS, makeQuestion } from '../src/generators';
import type { BankItem } from '../src/science/bank';
import { DIAGRAMS } from '../src/ui/diagrams';
import { attackOptions } from '../src/ui/games/fortress';
import { bank2_2a } from '../src/data/science/s2_2a';
import { bank2_2b, DATA_2_2B, KOCH_BUCKETS, KOCH_CARDS } from '../src/data/science/s2_2b';
import { bank2_2c, QUICK_SORT_CARDS, SORT_BUCKETS } from '../src/data/science/s2_2c';
import { cardBuckets, type SortCard } from '../src/ui/games/rapidSort';
import { bank3_0 } from '../src/data/science/s3_0';
import { bank3_1a, FOOD_JOURNEY } from '../src/data/science/s3_1a';
import { bank3_1b, KITCHEN_CARDS, LABEL, WATER_LOSS } from '../src/data/science/s3_1b';
import { AIR_JOURNEY, BALL_AREA, bank3_2a, BREATH_CARDS } from '../src/data/science/s3_2a';
import { bank3_2b, FILTER_CARDS, URINE_JOURNEY, WATER_GAIN, WATER_OUT } from '../src/data/science/s3_2b';
import { journeyQuestions, type JourneyConfig } from '../src/ui/games/journey';
import { correctInput } from './helpers';

const BANKS: [string, BankItem[]][] = [
  ['2-2a', bank2_2a], ['2-2b', bank2_2b], ['2-2c', bank2_2c],
  ['3-0', bank3_0], ['3-1a', bank3_1a], ['3-1b', bank3_1b], ['3-2a', bank3_2a], ['3-2b', bank3_2b],
];
const uniq = <T>(a: T[]) => new Set(a).size === a.length;

describe('question banks', () => {
  for (const [station, bank] of BANKS) {
    it(`${station}: every item is well-formed and tied to a page in 53–97`, () => {
      expect(uniq(bank.map((i) => i.id))).toBe(true);
      expect(new Set(bank.map((i) => i.d))).toEqual(new Set([1, 2, 3]));
      for (const it of bank) {
        const ctx = it.id;
        expect(it.id.startsWith(`${station}.`), ctx).toBe(true);
        expect(it.page, ctx).toBeGreaterThanOrEqual(53);
        expect(it.page, ctx).toBeLessThanOrEqual(97);
        expect(it.why.trim().length, ctx).toBeGreaterThan(5);
        switch (it.type) {
          case 'mc':
            expect(it.wrong.length, ctx).toBeGreaterThanOrEqual(3);
            expect(uniq(it.wrong), ctx).toBe(true);
            expect(it.wrong.includes(it.a), ctx).toBe(false);
            break;
          case 'term':
            expect(it.a.length, ctx).toBeGreaterThan(0);
            for (const t of it.a) expect(arabicKey(t).length, ctx).toBeGreaterThan(1);
            break;
          case 'order':
            expect(it.steps.length, ctx).toBeGreaterThanOrEqual(3);
            expect(uniq(it.steps), ctx).toBe(true);
            break;
          case 'sort':
            expect(it.buckets.length, ctx).toBeGreaterThanOrEqual(2);
            expect(uniq(it.items.map((x) => x[0])), ctx).toBe(true);
            for (const [, b] of it.items) expect(b >= 0 && b < it.buckets.length, ctx).toBe(true);
            for (let b = 0; b < it.buckets.length; b++) expect(it.items.some((x) => x[1] === b), ctx).toBe(true);
            expect(it.show ?? 6, ctx).toBeLessThanOrEqual(it.items.length + 6);
            break;
          case 'match':
            expect(uniq(it.pairs.map((p) => p[0])), ctx).toBe(true);
            expect(uniq(it.pairs.map((p) => p[1])), ctx).toBe(true);
            expect(it.show ?? 4, ctx).toBeLessThanOrEqual(it.pairs.length);
            break;
          case 'label': {
            const def = DIAGRAMS[it.diagram];
            expect(def, ctx).toBeDefined();
            expect(def.regions[it.target], ctx).toBeDefined();
            if (it.regions) expect(it.regions.includes(it.target), ctx).toBe(true);
            break;
          }
        }
      }
    });
  }
});

describe('every generator', () => {
  for (const g of ALL_GENERATORS) {
    it(`${g.id}: deterministic, well-formed, accepts its own correct answer`, () => {
      for (const d of g.difficulties) {
        for (let s = 1; s <= 150; s++) {
          const q = makeQuestion(g.id, s * 7919 + d, d);
          expect(makeQuestion(g.id, q.seed, d).prompt).toBe(q.prompt);
          const text = [q.prompt, q.answerText, ...q.solution, ...q.hints, ...(q.choices ?? [])].join('|');
          expect(text, q.prompt).not.toMatch(/undefined|NaN|\[object|null/);
          expect((q.prompt.match(/\*\*/g) ?? []).length % 2, q.prompt).toBe(0);
          expect(q.page).toBeGreaterThanOrEqual(53);
          expect(q.page).toBeLessThanOrEqual(97);
          expect(checkAnswer(q.answer, correctInput(q)).status, `${g.id} ${q.prompt}`).toBe('correct');
          const a = q.answer;
          if (a.kind === 'choice') {
            expect(uniq(q.choices!), q.prompt).toBe(true);
            expect(checkAnswer(a, (a.index + 1) % q.choices!.length).status).toBe('wrong');
          }
          if (a.kind === 'order') expect(a.correct.some((v, i) => v !== i), 'order must start shuffled').toBe(true);
          if (a.kind === 'label') {
            expect(uniq(a.regions)).toBe(true);
            expect(a.index).toBeGreaterThanOrEqual(0);
          }
          if (a.kind === 'sort' && a.oneEach) expect(uniq(a.assign)).toBe(true);
        }
      }
    });
  }

  it('each built station offers all three difficulties', () => {
    for (const st of STATIONS.filter((s) => s.available)) {
      const ds = new Set(st.generators.flatMap((g) => g.difficulties));
      expect(ds, st.id).toEqual(new Set([1, 2, 3]));
    }
  });
});

describe('2-2أ: bacteria multiplication (p. 55)', () => {
  it('the count is 2^(time/period), checked independently', () => {
    for (const d of [1, 2, 3] as const) {
      for (let s = 1; s <= 300; s++) {
        const q = makeQuestion('2-2a/bacteria', s, d);
        const m = q.meta as { every: number; minutes?: number; cells: number; divisions?: number };
        const v = Number(correctInput(q));
        if (m.minutes !== undefined) {
          expect(Number.isInteger(m.minutes / m.every)).toBe(true);
          expect(v).toBe(Math.pow(2, m.minutes / m.every));
        } else {
          expect(Math.pow(2, v / m.every)).toBe(m.cells);
        }
      }
    }
    // the book's example: every 10 minutes, after 1 hour → 64 cells
    expect(Number(correctInput(makeQuestion('2-2a/bacteria', 1, 1)))).toBe(64);
  });
});

describe('2-2أ mini-game: حصن الجسم', () => {
  it('every attack has a known defence and options contain it exactly once', () => {
    for (const a of ATTACKS) {
      expect(DEFENCES[a.defence]).toBeDefined();
      expect(a.page >= 53 && a.page <= 55).toBe(true);
      for (let s = 1; s <= 50; s++) {
        const opts = attackOptions(makeRng(s), a);
        expect(opts).toHaveLength(4);
        expect(uniq(opts)).toBe(true);
        expect(opts.filter((o) => o === a.defence)).toHaveLength(1);
      }
    }
  });
});

describe('mock exam', () => {
  it('25 questions from built stations, no bank item twice, perfect answers score 25', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const qs = buildExam(makeRng(seed));
      expect(qs).toHaveLength(EXAM_SIZE);
      expect(qs.every((q) => examLessons().includes(q.lesson))).toBe(true);
      const ids = qs.map((q) => String(q.meta?.itemId ?? `${q.gen}#${q.prompt}`));
      expect(uniq(ids)).toBe(true);
      const r = gradeExam(qs, qs.map(correctInput));
      expect(r.score).toBe(EXAM_SIZE);
      expect(gradeExam(qs, qs.map(() => null)).score).toBe(0);
    }
  });
});

describe('2-2ب: death-rate and AIDS data (pp. 57, 61)', () => {
  const { YEARS, DEATHS, CHILD_DEATHS } = DATA_2_2B;
  it('the book tables are copied correctly', () => {
    expect(YEARS).toEqual([1950, 1980, 1990, 2000]);
    expect(DEATHS.find(([n]) => n === 'السكري')![1]).toEqual([17, 18, 22, 29]);
    expect(CHILD_DEATHS).toEqual([536, 420, 209, 115, 76]);
  });
  it('every answer matches an independent calculation', () => {
    const pct = (name: string, k: number) => DEATHS.find(([n]) => n === name)![1][k] / 10;
    for (const d of [1, 2, 3] as const) {
      for (let s = 1; s <= 300; s++) {
        const q = makeQuestion('2-2b/data', s, d);
        const m = q.meta as Record<string, never>;
        const v = Number(correctInput(q));
        let expected: number;
        switch (m.kind as string) {
          case 'read': expected = pct(m.name, m.k); break;
          case 'diff': expected = pct(m.name, m.b) - pct(m.name, m.a); break;
          case 'sum': expected = DEATHS.reduce((t, [n]) => t + pct(n, m.k), 0); break;
          case 'child-drop': expected = CHILD_DEATHS[m.i] - CHILD_DEATHS[m.j]; break;
          case 'child-sum': expected = CHILD_DEATHS.slice(m.from, (m.to as number) + 1).reduce((a, b) => a + b, 0); break;
          default: throw new Error(`unknown kind ${m.kind}`);
        }
        expect(Math.abs(v - expected), q.prompt).toBeLessThan(1e-6);
      }
    }
    // spot-check: drop from 1995 to 1999 is 460 deaths
    expect(536 - 76).toBe(460);
  });
});

describe('chapter 2 quick-classify games', () => {
  const decks: [string, string[], typeof KOCH_CARDS][] = [['مختبر كوخ', KOCH_BUCKETS, KOCH_CARDS], ['فرز سريع', SORT_BUCKETS, QUICK_SORT_CARDS]];
  for (const [name, buckets, cards] of decks) {
    it(`${name}: cards are unique, cite a page, and point at a real button`, () => {
      expect(uniq(cards.map((c) => c.text))).toBe(true);
      for (const c of cards) {
        const bs = cardBuckets({ buckets }, c);
        expect(bs.length >= 2 && bs.length <= 4, c.text).toBe(true);
        expect(c.bucket >= 0 && c.bucket < bs.length, c.text).toBe(true);
        expect(c.page >= 53 && c.page <= 63, c.text).toBe(true);
      }
      for (let b = 0; b < buckets.length; b++) expect(cards.some((c) => !c.buckets && c.bucket === b), `${name} bucket ${b}`).toBe(true);
    });
  }
});

describe('chapter 3 data questions match an independent calculation', () => {
  const each = (gen: string, check: (v: number, m: Record<string, never>, prompt: string) => void) => {
    for (const d of [1, 2, 3] as const)
      for (let s = 1; s <= 300; s++) {
        const q = makeQuestion(gen, s, d);
        check(Number(correctInput(q)), q.meta as Record<string, never>, q.prompt);
      }
  };
  it('3-0 breathing rate (p. 73)', () => {
    each('3-0/rate', (v, m) => {
      const t = m.t as unknown as number[];
      const exp = m.kind === 'x4' ? (m.n as number) * 4 : m.kind === 'avg' ? (t.reduce((a, b) => a + b, 0) * 4) / 3 : ((m.after as number) - (m.rest as number)) * 4;
      expect(v).toBe(exp);
      expect(Number.isInteger(v)).toBe(true);
    });
  });
  it('3-1ب nutrition label and water loss (pp. 81–84)', () => {
    const per100 = (n: string) => LABEL.find(([x]) => x === n)![1];
    const loss = WATER_LOSS.reduce((a, [, x]) => a + x, 0);
    expect(loss).toBe(2500);
    each('3-1b/foodlabel', (v, m) => {
      const exp =
        m.kind === 'fat2' ? (m.fat as number) * 2
        : m.kind === 'read' ? per100(m.name)
        : m.kind === 'portion' ? (per100(m.name) * (m.grams as number)) / 100
        : m.kind === 'water-total' ? loss
        : m.kind === 'water-pct' ? (WATER_LOSS.find(([x]) => x === m.name)![1] / loss) * 100
        : loss - 500 + (m.sweat as number);
      expect(Math.abs(v - exp)).toBeLessThan(1e-9);
    });
  });
  it('3-2أ air volume, surface area, smoking risk (pp. 89–90)', () => {
    each('3-2a/data', (v, m) => {
      const exp = m.kind === 'air' ? (m.rate as number) * 500 : m.kind === 'balls' ? (m.n as number) * BALL_AREA : (m.x as number) * (m.base as number);
      expect(Math.abs(v - exp)).toBeLessThan(0.006);
    });
  });
  it('3-2ب water balance and kidney blood flow (pp. 92–95)', () => {
    const gain = WATER_GAIN.reduce((a, [, x]) => a + x, 0);
    const out = WATER_OUT.reduce((a, [, x]) => a + x, 0);
    expect(gain).toBe(2500);
    expect(out).toBe(2500);
    each('3-2b/data', (v, m) => {
      const list = m.gain ? WATER_GAIN : WATER_OUT;
      const exp =
        m.kind === 'blood' ? ((m.hours as number) * 60) / 5
        : m.kind === 'gain-total' ? gain
        : m.kind === 'pct' ? (list.find(([x]) => x === m.name)![1] / 2500) * 100
        : 1500 + (m.sweat as number) - 500;
      expect(Math.abs(v - exp)).toBeLessThan(1e-9);
    });
  });
});

describe('chapter 3 journeys', () => {
  const trips: [string, Omit<JourneyConfig, 'lesson' | 'route' | 'title' | 'sub' | 'intro'>][] = [['رحلة اللقمة', FOOD_JOURNEY], ['مسار الهواء', AIR_JOURNEY], ['مسار البول', URINE_JOURNEY]];
  for (const [name, j] of trips) {
    it(`${name}: stops exist on the diagram and every question has one correct, unique option`, () => {
      const def = DIAGRAMS[j.diagram];
      for (const s of j.stops) expect(def.regions[s.region], s.region).toBeDefined();
      expect(uniq(j.stops.map((s) => s.does))).toBe(true);
      for (const dc of j.decoys) expect(j.stops.some((s) => s.name === dc.name)).toBe(false);
      for (let seed = 1; seed <= 60; seed++) {
        const qs = journeyQuestions({ ...j, lesson: '3-1a', route: 'x', title: '', sub: '', intro: '' }, makeRng(seed));
        expect(qs).toHaveLength(j.stops.length * 2 - 1);
        for (const q of qs) {
          expect(q.options).toHaveLength(4);
          expect(uniq(q.options)).toBe(true);
          const right = q.kind === 'next' ? j.stops[q.stop].name : j.stops[q.stop].does;
          expect(q.options[q.correct]).toBe(right);
        }
      }
    });
  }
});

describe('chapter 3 classify games', () => {
  const decks: [string, string[], SortCard[]][] = [
    ['مطبخ التوازن', ['البروتينات', 'الكربوهيدرات', 'الدهون', 'الماء'], KITCHEN_CARDS],
    ['محاكي التنفس', ['شهيق', 'زفير'], BREATH_CARDS],
    ['محطة التنقية', ['يبقى', 'يعود', 'يُطرح'], FILTER_CARDS],
  ];
  for (const [name, buckets, cards] of decks) {
    it(`${name}: unique cards with unique buttons and a real answer`, () => {
      expect(uniq(cards.map((c) => c.text))).toBe(true);
      for (const c of cards) {
        const bs = cardBuckets({ buckets }, c);
        expect(bs.length >= 2 && bs.length <= 4, c.text).toBe(true);
        expect(uniq(bs), c.text).toBe(true);
        expect(c.bucket >= 0 && c.bucket < bs.length, c.text).toBe(true);
        expect(c.page >= 72 && c.page <= 97, c.text).toBe(true);
      }
    });
  }
  it('مطبخ التوازن: the right answer is spread across the four buttons', () => {
    const slots = new Set(KITCHEN_CARDS.map((c) => c.bucket));
    expect(slots.size).toBe(4);
  });
});
