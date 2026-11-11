import { LESSONS } from '../data/lessons';
import { getGenerator, makeQuestion, questionFromMix } from '../generators';
import { checkAnswer, type CheckStatus } from './answer';
import type { Difficulty, LessonId, Question } from './question';
import { makeRng, newSeed, type Rng } from './rng';

export const EXAM_SIZE = 25;
export const EXAM_MS = 45 * 60 * 1000;

/** Lessons tested in the exam (the warm-up 3-0 is revision of earlier grades, so it is left out). */
export function examLessons(): LessonId[] {
  return LESSONS.filter((l) => l.available && l.id !== '3-0').map((l) => l.id);
}

/**
 * 25 mixed questions: two per lesson (different question types when possible, mostly medium/hard),
 * plus fraction → decimal from the chapter 2 test, ordered by lesson like a real exam paper.
 */
export function buildExam(rng: Rng = makeRng(newSeed())): Question[] {
  const out: Question[] = [];
  for (const id of examLessons()) {
    const l = LESSONS.find((x) => x.id === id)!;
    // only this lesson's own question types (some practice mixes borrow from a neighbouring lesson)
    const mix = l.mix.filter((m) => getGenerator(m.gen).lesson === id);
    const ds: Difficulty[][] = [[1, 3], [2, 2], [2, 3], [2, 3]];
    const pair = rng.pick(ds);
    const gens = new Set<string>();
    for (const d of pair) {
      // prefer a question type not used yet for this lesson
      let q = questionFromMix(mix, d, rng);
      for (let t = 0; t < 6 && gens.has(q.gen); t++) q = questionFromMix(mix, d, rng);
      gens.add(q.gen);
      out.push(q);
    }
  }
  while (out.length < EXAM_SIZE) out.splice(rng.int(0, 10), 0, makeQuestion('boss2/to-decimal', newSeed(), rng.pick([2, 3] as const)));
  return out.slice(0, EXAM_SIZE);
}

export interface GradedItem {
  q: Question;
  input: string | number | null;
  status: CheckStatus | 'blank';
  points: number;
}

export interface ExamReport {
  items: GradedItem[];
  score: number;
  total: number;
  byLesson: Partial<Record<LessonId, { correct: number; total: number }>>;
  strong: LessonId[];
  weak: LessonId[];
}

/** Exam grading: correct = 1, right value but not in simplest form = ½, otherwise 0. */
export function gradeExam(questions: Question[], answers: (string | number | null)[]): ExamReport {
  const items: GradedItem[] = questions.map((q, i) => {
    const input = answers[i];
    if (input === null || input === undefined || input === '') return { q, input: null, status: 'blank', points: 0 };
    let status = checkAnswer(q.answer, input).status;
    if (status === 'invalid') status = 'wrong';
    return { q, input, status, points: status === 'correct' ? 1 : status === 'unsimplified' ? 0.5 : 0 };
  });
  const byLesson: ExamReport['byLesson'] = {};
  for (const it of items) {
    const b = (byLesson[it.q.lesson] ??= { correct: 0, total: 0 });
    b.correct += it.points;
    b.total++;
  }
  const entries = Object.entries(byLesson) as [LessonId, { correct: number; total: number }][];
  return {
    items,
    score: items.reduce((s, it) => s + it.points, 0),
    total: questions.length,
    byLesson,
    strong: entries.filter(([, v]) => v.correct / v.total >= 1).map(([k]) => k),
    weak: entries.filter(([, v]) => v.correct / v.total < 0.5).map(([k]) => k),
  };
}

/** Label for report rows (lesson of the "fraction → decimal" item is 2-5 but it is a chapter-test skill). */
export function itemLabel(q: Question): string {
  return getGenerator(q.gen).label;
}
