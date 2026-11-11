import type { Question } from './question';
import type { MistakeEntry, SaveData } from './store';

const DAY = 24 * 60 * 60 * 1000;
/** Review delay per Leitner box: box 0 is due now, box 1 after a day, box 2 after 3 days. Passing box 2 clears it. */
export const BOX_DELAY = [0, DAY, 3 * DAY];

const same = (a: { gen: string; seed: number; difficulty: number }, b: { gen: string; seed: number; difficulty: number }) =>
  a.gen === b.gen && a.seed === b.seed && a.difficulty === b.difficulty;

export function addMistake(s: SaveData, q: Question, now = Date.now()): void {
  const existing = s.mistakes.find((m) => same(m, q));
  if (existing) {
    existing.box = 0;
    existing.due = now;
    return;
  }
  s.mistakes.push({ gen: q.gen, seed: q.seed, difficulty: q.difficulty, lesson: q.lesson, box: 0, due: now, added: now });
  if (s.mistakes.length > 200) s.mistakes.splice(0, s.mistakes.length - 200);
}

/** Record a review result. Returns true if the mistake was cleared from the notebook. */
export function reviewMistake(s: SaveData, m: MistakeEntry, correct: boolean, now = Date.now()): boolean {
  const entry = s.mistakes.find((x) => same(x, m));
  if (!entry) return false;
  if (!correct) {
    entry.box = 0;
    entry.due = now;
    return false;
  }
  entry.box++;
  if (entry.box >= BOX_DELAY.length) {
    s.mistakes.splice(s.mistakes.indexOf(entry), 1);
    return true;
  }
  entry.due = now + BOX_DELAY[entry.box];
  return false;
}

export function dueMistakes(s: SaveData, now = Date.now()): MistakeEntry[] {
  return s.mistakes.filter((m) => m.due <= now);
}
