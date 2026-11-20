import { LESSONS } from '../data/lessons';
import { getGenerator, questionFromMix } from '../generators';
import { checkAnswer, type CheckStatus } from './answer';
import type { AnswerInput, Difficulty, LessonId, Question } from './question';
import { makeRng, newSeed, type Rng } from './rng';

export const EXAM_SIZE = 25;
export const EXAM_MS = 45 * 60 * 1000;

/** Lessons tested in the exam (the warm-up 3-0 is revision of earlier grades, so it is left out). */
export function examLessons(): LessonId[] {
  return LESSONS.filter((l) => l.available && l.id !== '3-0').map((l) => l.id);
}

/** Difficulty mix of an exam paper: a few easy, mostly medium and hard. */
const EXAM_DIFFICULTY: Difficulty[] = [1, 2, 2, 3, 2, 3, 1, 2, 3, 2];

/**
 * 25 mixed questions spread evenly over the built stations, varied question types,
 * never the same bank item twice, ordered by station like a real exam paper.
 */
export function buildExam(rng: Rng = makeRng(newSeed())): Question[] {
  const lessons = examLessons();
  const perLesson = new Map<LessonId, Question[]>(lessons.map((id) => [id, []]));
  const usedItems = new Set<string>();
  const usedGens = new Map<LessonId, Set<string>>(lessons.map((id) => [id, new Set()]));
  for (let slot = 0; slot < EXAM_SIZE; slot++) {
    const id = lessons[slot % lessons.length];
    const mix = LESSONS.find((x) => x.id === id)!.mix;
    const d = EXAM_DIFFICULTY[slot % EXAM_DIFFICULTY.length];
    let q = questionFromMix(mix, d, rng);
    for (let t = 0; t < 30; t++) {
      const item = String(q.meta?.itemId ?? `${q.gen}#${q.prompt}`);
      const freshType = !usedGens.get(id)!.has(q.gen) || usedGens.get(id)!.size >= mix.length;
      if (!usedItems.has(item) && (freshType || t > 10)) break;
      q = questionFromMix(mix, (t > 20 ? rng.pick([1, 2, 3]) : d) as Difficulty, rng);
    }
    usedItems.add(String(q.meta?.itemId ?? `${q.gen}#${q.prompt}`));
    usedGens.get(id)!.add(q.gen);
    perLesson.get(id)!.push(q);
  }
  return lessons.flatMap((id) => perLesson.get(id)!);
}

export interface GradedItem {
  q: Question;
  input: AnswerInput;
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
export function gradeExam(questions: Question[], answers: AnswerInput[]): ExamReport {
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

/** Question-type label for report rows. */
export function itemLabel(q: Question): string {
  return getGenerator(q.gen).label;
}
