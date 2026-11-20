import type { Difficulty, LessonId } from './question';

export interface Profile {
  name: string;
  ship: string;
  createdAt: number;
}

export interface LessonProgress {
  stars: number;
  learnDone: boolean;
  practiceBest: number; // best accuracy 0..1
  blitzBest: number; // best correct count in 60s
  gameBest: number;
  /** Best scores of a station's extra mini-games (their units differ from the main game's). */
  gameBests?: Record<string, number>;
  attempts: number;
  correct: number;
  timeMs: number;
  hintsUsed: number;
}

export interface MistakeEntry {
  gen: string;
  seed: number;
  difficulty: Difficulty;
  lesson: LessonId;
  box: number; // Leitner box 0..2
  due: number; // timestamp
  added: number;
}

export interface ExamResult {
  date: number;
  score: number;
  total: number;
  durationMs: number;
  byLesson: Partial<Record<LessonId, { correct: number; total: number }>>;
}

export interface SaveData {
  v: 1;
  profile: Profile | null;
  xp: number;
  muted: boolean;
  lessons: Partial<Record<LessonId, LessonProgress>>;
  bosses: Record<string, { beaten: boolean; bestHpLeft: number; noHints: boolean }>;
  mistakes: MistakeEntry[];
  achievements: Record<string, number>;
  stats: { bestCombo: number; totalCorrect: number; totalAnswered: number; notebookCleared: number };
  exams: ExamResult[];
}

const KEY = 'rihla-aljism-science:v1';

export function emptySave(): SaveData {
  return {
    v: 1,
    profile: null,
    xp: 0,
    muted: false,
    lessons: {},
    bosses: {},
    mistakes: [],
    achievements: {},
    stats: { bestCombo: 0, totalCorrect: 0, totalAnswered: 0, notebookCleared: 0 },
    exams: [],
  };
}

export function emptyLesson(): LessonProgress {
  return { stars: 0, learnDone: false, practiceBest: 0, blitzBest: 0, gameBest: 0, attempts: 0, correct: 0, timeMs: 0, hintsUsed: 0 };
}

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const data = JSON.parse(raw);
    const base = emptySave();
    return { ...base, ...data, stats: { ...base.stats, ...(data.stats ?? {}) } };
  } catch {
    return emptySave();
  }
}

let state: SaveData = typeof localStorage === 'undefined' ? emptySave() : load();
const listeners = new Set<(s: SaveData) => void>();

export function getSave(): SaveData {
  return state;
}

export function update(fn: (s: SaveData) => void): void {
  fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep playing in memory */
  }
  listeners.forEach((l) => l(state));
}

export function subscribe(fn: (s: SaveData) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function lesson(s: SaveData, id: LessonId): LessonProgress {
  return (s.lessons[id] ??= emptyLesson());
}

export function resetAll(): void {
  state = emptySave();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(state));
}
