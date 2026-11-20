import type { Difficulty, Generator, LessonId, Question } from '../core/question';
import { makeRng, newSeed, type Rng } from '../core/rng';
import { STATIONS } from '../data/science';

/** Every question generator (bank-based and computed), from all stations. */
export const ALL_GENERATORS: Generator[] = STATIONS.flatMap((s) => s.generators);
const byId = new Map(ALL_GENERATORS.map((g) => [g.id, g]));

export function getGenerator(id: string): Generator {
  const g = byId.get(id);
  if (!g) throw new Error(`Unknown generator ${id}`);
  return g;
}

export function generatorsFor(lesson: LessonId): Generator[] {
  return ALL_GENERATORS.filter((g) => g.lesson === lesson);
}

/** Build a question deterministically from (generator, seed, difficulty). */
export function makeQuestion(genId: string, seed: number, difficulty: Difficulty): Question {
  const g = getGenerator(genId);
  const d = g.difficulties.includes(difficulty) ? difficulty : g.difficulties.reduce((best, x) => (Math.abs(x - difficulty) < Math.abs(best - difficulty) ? x : best));
  const body = g.generate(makeRng(seed), d);
  return { ...body, gen: g.id, seed, lesson: g.lesson, difficulty: d };
}

export interface MixEntry {
  gen: string;
  weight: number;
}

/** Pick a generator from a weighted mix that supports difficulty d, and make a fresh question. */
export function questionFromMix(mix: MixEntry[], d: Difficulty, rng: Rng = makeRng(newSeed())): Question {
  const ok = mix.filter((m) => getGenerator(m.gen).difficulties.includes(d));
  const pool = ok.length ? ok : mix;
  let r = rng.next() * pool.reduce((s, m) => s + m.weight, 0);
  let chosen = pool[0];
  for (const m of pool) {
    r -= m.weight;
    if (r <= 0) {
      chosen = m;
      break;
    }
  }
  return makeQuestion(chosen.gen, newSeed(), d);
}
