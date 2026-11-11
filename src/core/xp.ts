import type { Difficulty } from './question';

export const BASE_XP: Record<Difficulty, number> = { 1: 10, 2: 15, 3: 20 };
export const HINT_COST = 5;

/** Combo multiplier: x1, then +0.5 every 3 in a row, capped at x3. */
export function comboMultiplier(combo: number): number {
  return Math.min(3, 1 + Math.floor(combo / 3) * 0.5);
}

/** XP needed to go from level n to n+1. */
export function xpForLevel(n: number): number {
  return 100 + (n - 1) * 50;
}

export function levelInfo(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = xp;
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, need: xpForLevel(level) };
}

export const RANKS = ['مستكشف مبتدئ', 'ملّاح', 'طيّار', 'قائد مركبة', 'رائد فضاء', 'قائد أسطول', 'سيّد المجرّة'];
export function rankName(level: number): string {
  return RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 3))];
}

export interface AnswerScoreInput {
  difficulty: Difficulty;
  firstTry: boolean;
  simplified: boolean;
  combo: number;
}

export function scoreAnswer(i: AnswerScoreInput): number {
  let xp = BASE_XP[i.difficulty];
  if (!i.firstTry) xp = Math.round(xp / 2);
  if (!i.simplified) xp = Math.round(xp / 2);
  return Math.round(xp * comboMultiplier(i.combo));
}
