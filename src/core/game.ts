import { ACHIEVEMENTS } from '../data/achievements';
import { LESSONS } from '../data/lessons';
import { sfx } from './audio';
import { confetti } from './fx';
import { addMistake } from './mistakes';
import type { LessonId, Question } from './question';
import { getSave, lesson, update, type LessonProgress } from './store';
import { levelInfo } from './xp';
import { toast } from '../ui/widgets/toast';

/** Add XP, celebrate level-ups, and return the new total. */
export function awardXp(amount: number): void {
  if (amount === 0) return;
  const before = levelInfo(getSave().xp).level;
  update((s) => {
    s.xp = Math.max(0, s.xp + amount);
  });
  const after = levelInfo(getSave().xp).level;
  if (after > before) {
    sfx.levelUp();
    confetti();
    toast(`ارتقيت إلى المستوى ${after}!`, '🆙');
    if (after >= 5) unlock('level-5');
    if (after >= 10) unlock('level-10');
  }
}

export function unlock(id: string): void {
  if (getSave().achievements[id]) return;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return;
  update((s) => {
    s.achievements[id] = Date.now();
  });
  sfx.badge();
  toast(`شارة جديدة: ${def.title}`, def.icon);
}

/** Record one answered question in lesson stats, global stats and the mistakes notebook. */
export function recordAnswer(q: Question, correctFirstTry: boolean, everWrong: boolean, combo: number): void {
  update((s) => {
    const lp = lesson(s, q.lesson);
    lp.attempts++;
    if (correctFirstTry) lp.correct++;
    s.stats.totalAnswered++;
    if (correctFirstTry) s.stats.totalCorrect++;
    s.stats.bestCombo = Math.max(s.stats.bestCombo, combo);
    if (everWrong) addMistake(s, q);
  });
  if (correctFirstTry) unlock('first-correct');
  if (combo >= 10) unlock('combo-10');
  if (combo >= 25) unlock('combo-25');
}

export function computeStars(lp: LessonProgress): number {
  if (lp.practiceBest <= 0) return 0;
  if (lp.practiceBest >= 0.9 && lp.blitzBest >= 8) return 3;
  if (lp.practiceBest >= 0.75) return 2;
  return 1;
}

/** Recompute and persist stars. Returns [oldStars, newStars]. */
export function refreshStars(id: LessonId): [number, number] {
  let before = 0;
  let after = 0;
  update((s) => {
    const lp = lesson(s, id);
    before = lp.stars;
    lp.stars = Math.max(lp.stars, computeStars(lp));
    after = lp.stars;
  });
  if (after === 3) {
    unlock('three-stars');
    if (id === '2-2a') unlock('immune-guard');
    const ch = LESSONS.find((l) => l.id === id)?.chapter;
    const s = getSave();
    if (ch && LESSONS.filter((l) => l.chapter === ch && l.available).every((l) => (s.lessons[l.id]?.stars ?? 0) === 3)) unlock(`stars-ch${ch}`);
  }
  return [before, after];
}

export function addTime(id: LessonId, ms: number): void {
  if (ms < 1000) return;
  update((s) => {
    lesson(s, id).timeMs += Math.min(ms, 30 * 60 * 1000);
  });
}
