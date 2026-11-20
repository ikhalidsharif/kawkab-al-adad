import type { AnswerInput, Question } from '../src/core/question';

/** How a student would give the generator's own correct answer. */
export function correctInput(q: Question): AnswerInput {
  const a = q.answer;
  switch (a.kind) {
    case 'choice':
    case 'label':
      return a.index;
    case 'order':
      return [...a.correct];
    case 'sort':
      return [...a.assign];
    case 'text':
      return a.accepted[0];
    case 'number':
      return String(a.value);
    case 'fraction':
      return a.value.toString();
  }
}
