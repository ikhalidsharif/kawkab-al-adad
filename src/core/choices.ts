import type { Rng } from './rng';

/** Build up to 4 unique choices containing the correct one, shuffled. */
export function makeChoices(rng: Rng, correct: string, distractors: string[], fill?: () => string) {
  const set = new Set<string>([correct]);
  for (const d of distractors) {
    if (set.size >= 4) break;
    set.add(d);
  }
  let guard = 0;
  while (set.size < 4 && fill && guard++ < 50) set.add(fill());
  const choices = rng.shuffle([...set]);
  return { choices, index: choices.indexOf(correct) };
}
