import type Fraction from 'fraction.js';
import type { Rng } from './rng';

export type LessonId =
  | '2-5' | '2-6' | '2-7' | '2-8' | '2-9'
  | '3-0' | '3-1' | '3-2' | '3-3' | '3-4' | '3-5' | '3-ext' | '3-6';

export type Difficulty = 1 | 2 | 3;

/** Rich text: Arabic text with inline TeX between $...$ (rendered LTR with KaTeX). */
export type Rich = string;

export type AnswerSpec =
  /** Exact rational answer. decimalOnly: the student must write it as a decimal / whole number (no "a/b"). */
  | { kind: 'fraction'; value: Fraction; requireSimplest?: boolean; decimalOnly?: boolean }
  | { kind: 'number'; value: number; tol?: number }
  /** Two solutions ±value (value > 0, exact). */
  | { kind: 'plusminus'; value: Fraction }
  | { kind: 'sci'; mantissa: Fraction; exp: number }
  | { kind: 'choice'; index: number }
  | { kind: 'bool'; value: boolean };

export interface QuestionBody {
  prompt: Rich;
  answer: AnswerSpec;
  /** Present for multiple-choice questions (answer.kind === 'choice'). */
  choices?: Rich[];
  hints: Rich[];
  solution: Rich[];
  /** Placeholder shown in the answer box. */
  placeholder?: string;
  /** Short display of the correct answer (TeX), shown after a miss. */
  answerTex: string;
  /** Raw operands so unit tests can verify the answer independently. */
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
