import type { Difficulty, Generator, LessonId, Question } from '../core/question';
import { makeRng, newSeed, type Rng } from '../core/rng';
import { generatorsBoss2 } from './boss2';
import { generators2_5 } from './l2_5';
import { generators2_6 } from './l2_6';
import { generators2_7 } from './l2_7';
import { generators2_8 } from './l2_8';
import { generators2_9 } from './l2_9';
import { generators3_0 } from './l3_0';
import { generators3_1 } from './l3_1';
import { generators3_2 } from './l3_2';
import { generators3_3 } from './l3_3';
import { generators3_4 } from './l3_4';
import { generators3_5 } from './l3_5';
import { generators3_ext } from './l3_ext';
import { generators3_6 } from './l3_6';

export const ALL_GENERATORS: Generator[] = [
  ...generators2_5,
  ...generators2_6,
  ...generators2_7,
  ...generators2_8,
  ...generators2_9,
  ...generatorsBoss2,
  ...generators3_0,
  ...generators3_1,
  ...generators3_2,
  ...generators3_3,
  ...generators3_4,
  ...generators3_5,
  ...generators3_ext,
  ...generators3_6,
];
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
  const d = g.difficulties.includes(difficulty) ? difficulty : g.difficulties[g.difficulties.length - 1];
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
