import type Fraction from 'fraction.js';
import type { Rng } from './rng';

/** Stations (see CLAUDE.md). Shown to the student as e.g. "2-2أ". */
export type LessonId = '2-2a' | '2-2b' | '2-2c' | '3-0' | '3-1a' | '3-1b' | '3-2a' | '3-2b';

export type Difficulty = 1 | 2 | 3;

/** Rich text: Arabic prose with optional inline TeX between $...$ (rendered LTR with KaTeX). */
export type Rich = string;

export type AnswerSpec =
  /** Exact number (data / calculation questions). */
  | { kind: 'fraction'; value: Fraction; requireSimplest?: boolean; decimalOnly?: boolean }
  | { kind: 'number'; value: number; tol?: number }
  | { kind: 'choice'; index: number }
  /** Put `items` in order: `correct` lists item indices in the right sequence. Input: number[] (indices in chosen order). */
  | { kind: 'order'; items: Rich[]; correct: number[] }
  /**
   * Assign each item to a bucket. `assign[i]` is the bucket of item i. Input: number[] (bucket per item, -1 = none).
   * With `oneEach` every bucket is used exactly once (matching pairs).
   */
  | { kind: 'sort'; items: Rich[]; buckets: Rich[]; assign: number[]; oneEach?: boolean }
  /** Click a region of a diagram. Input: region index. */
  | { kind: 'label'; diagram: string; regions: string[]; index: number }
  /** Short typed scientific term; compared after Arabic normalisation. */
  | { kind: 'text'; accepted: string[] };

export type AnswerInput = string | number | number[] | null;

export interface QuestionBody {
  prompt: Rich;
  answer: AnswerSpec;
  /** Present for multiple-choice questions (answer.kind === 'choice'). */
  choices?: Rich[];
  /** Diagram shown with the question (always for 'label'). */
  diagram?: string;
  hints: Rich[];
  solution: Rich[];
  placeholder?: string;
  /** The correct answer, displayed after a miss. */
  answerText: Rich;
  /** Book page the question is based on (53–97). */
  page: number;
  /** Raw data so unit tests can verify answers independently. */
  meta?: Record<string, unknown>;
}

export interface Question extends QuestionBody {
  gen: string;
  seed: number;
  lesson: LessonId;
  difficulty: Difficulty;
}

export interface Generator {
  id: string;
  lesson: LessonId;
  /** Short Arabic label for reports. */
  label: string;
  difficulties: readonly Difficulty[];
  generate(rng: Rng, d: Difficulty): QuestionBody;
}

/** "2-2a" → "2-2أ" for display. */
export function lessonLabel(id: LessonId): string {
  return id.replace(/a$/, 'أ').replace(/b$/, 'ب').replace(/c$/, 'جـ');
}
