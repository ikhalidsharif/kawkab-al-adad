import { checkAnswer } from '../../core/answer';
import { sfx } from '../../core/audio';
import { h, clear, isTyping } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { awardXp } from '../../core/game';
import type { AnswerInput, Question } from '../../core/question';
import { lesson, update } from '../../core/store';
import { rich } from '../../core/tex';
import { HINT_COST } from '../../core/xp';
import { getGenerator } from '../../generators';
import { renderDiagram } from '../diagrams';
import { answerWidget } from './answerWidget';
import { floatXp } from './toast';

export interface QResult {
  correct: boolean;
  firstTry: boolean;
  /** Kept for scoring compatibility (numeric answers that were right but not simplified). */
  simplified: boolean;
  revealed: boolean;
  hints: number;
  attempts: number;
  timeMs: number;
}

export interface RunnerOptions {
  mode: 'practice' | 'blitz' | 'review' | 'boss';
  /** Called once when the question is resolved; returns XP earned (for the floating label). */
  onResolved(r: QResult): number;
  /** Player moves on to the next question. */
  onNext(): void;
}

export interface Runner {
  handleKey(e: KeyboardEvent): void;
  destroy(): void;
}

const DIFF = {
  1: ['سهل', 'text-good border-good/50'],
  2: ['متوسط', 'text-gold border-gold/50'],
  3: ['صعب', 'text-bad border-bad/50'],
} as const;

/** Answer kinds where picking an option submits immediately (no "check" button). */
const PICK_SUBMITS = new Set(['choice', 'label']);

export function mountQuestion(host: HTMLElement, q: Question, opts: RunnerOptions): Runner {
  clear(host);
  /** Fast modes: no hints/solutions, a miss shows the answer and moves on automatically. */
  const fast = opts.mode === 'blitz' || opts.mode === 'boss';
  const missDelay = opts.mode === 'boss' ? 2600 : 1800;
  const started = performance.now();
  const instant = PICK_SUBMITS.has(q.answer.kind);
  let attempts = 0;
  let hintsShown = 0;
  let resolved = false;
  let solutionStep = 0;
  let solutionOpen = false;
  let pendingTimer = 0;

  const card = h('div', { class: 'panel anim-in p-6 md:p-8 flex flex-col gap-5' });
  const [dLabel, dCls] = DIFF[q.difficulty];
  card.append(
    h(
      'div',
      { class: 'flex flex-wrap items-center gap-2 text-sm' },
      h('span', { class: `chip ${dCls}` }, dLabel),
      h('span', { class: 'text-slate-400' }, getGenerator(q.gen).label),
      h('span', { class: 'chip text-slate-400 mr-auto', title: 'الصفحة في كتاب العلوم' }, `📖 ص ${q.page}`),
    ),
    h('div', { class: 'text-xl md:text-2xl leading-loose font-bold' }, rich(q.prompt)),
  );
  if (q.diagram && q.answer.kind !== 'label') card.append(renderDiagram(q.diagram).el);

  const widget = answerWidget(q, { onPick: (v) => instant && submit(v) });
  const feedback = h('div', { class: 'min-h-[2rem] text-lg font-bold', 'aria-live': 'polite' });
  card.append(widget.el, feedback);

  const checkBtn = h('button', { class: `btn btn-primary ${instant ? 'hidden' : ''}`, onclick: () => submit() }, 'تحقّق ', h('span', { class: 'kbd' }, 'Enter'));
  const hintBtn = h('button', { class: 'btn btn-gold', onclick: () => showHint() }, `تلميح (−${HINT_COST} XP) `, h('span', { class: 'kbd' }, 'H'));
  const solveBtn = h('button', { class: 'btn hidden', onclick: () => reveal() }, 'اعرض الحل ', h('span', { class: 'kbd' }, 'S'));
  const nextBtn = h('button', { class: 'btn btn-primary hidden anim-pulse', onclick: () => next() }, 'التالي ', h('span', { class: 'kbd' }, 'Enter'));
  card.append(h('div', { class: 'flex flex-wrap gap-3 justify-center' }, checkBtn, !fast && hintBtn, !fast && solveBtn, nextBtn));
  const hintsBox = h('div', { class: 'flex flex-col gap-2' });
  const solutionBox = h('div', { class: 'flex flex-col gap-2' });
  card.append(hintsBox, solutionBox);
  host.append(card);
  widget.focus();

  function setFeedback(text: string, cls: string) {
    feedback.className = `min-h-[2rem] text-lg font-bold ${cls}`;
    feedback.textContent = text;
  }

  function showAnswer(label: string, cls: string) {
    setFeedback('', '');
    feedback.append(h('span', { class: cls }, label), rich(q.answerText, 'font-normal'));
  }

  function showHint() {
    if (resolved || fast || hintsShown >= q.hints.length) return;
    hintsShown++;
    sfx.hint();
    awardXp(-HINT_COST);
    floatXp(hintBtn, -HINT_COST);
    update((s) => {
      lesson(s, q.lesson).hintsUsed++;
    });
    hintsBox.append(h('div', { class: 'anim-in rounded-xl border border-gold/40 bg-gold/5 p-3 leading-loose' }, h('span', { class: 'ml-2' }, '💡'), rich(q.hints[hintsShown - 1])));
    if (hintsShown >= q.hints.length) hintBtn.disabled = true;
    widget.focus();
  }

  function finish(r: Omit<QResult, 'timeMs' | 'hints' | 'attempts'>) {
    resolved = true;
    widget.lock();
    const result: QResult = { ...r, hints: hintsShown, attempts, timeMs: performance.now() - started };
    const xp = opts.onResolved(result);
    if (xp > 0) floatXp(card, xp);
    [checkBtn, hintBtn, solveBtn].forEach((b) => b.classList.add('hidden'));
    if (fast) {
      pendingTimer = window.setTimeout(next, r.correct ? 500 : missDelay);
    } else {
      nextBtn.classList.remove('hidden');
      if (!solutionOpen) {
        solutionBox.append(
          h('button', { class: 'text-sm text-slate-400 underline self-start', onclick: (e: Event) => { (e.target as HTMLElement).remove(); revealAll(); } }, r.correct ? 'لماذا؟ (الشرح)' : 'اعرض الشرح'),
        );
      }
      nextBtn.focus();
    }
  }

  function submit(picked?: AnswerInput) {
    if (resolved) return;
    const value = picked !== undefined ? picked : widget.getValue();
    if (value === null || value === '') {
      setFeedback(q.answer.kind === 'text' ? 'اكتب إجابتك أولاً' : 'أجب أولاً', 'text-slate-400');
      return;
    }
    const res = checkAnswer(q.answer, value);
    if (res.status === 'invalid') {
      setFeedback(res.message ?? 'أكمل إجابتك', 'text-gold');
      return;
    }
    attempts++;
    widget.showResult(res);
    if (res.status === 'correct' || res.status === 'unsimplified') {
      const simplified = res.status === 'correct';
      sfx.correct(attempts);
      burstAt(card, simplified ? 28 : 12);
      setFeedback(simplified ? pickPraise() : `✓ ${res.message}`, simplified ? 'text-good' : 'text-gold');
      finish({ correct: true, firstTry: attempts === 1, simplified, revealed: false });
      return;
    }
    sfx.wrong();
    card.classList.remove('anim-shake');
    void card.offsetWidth;
    card.classList.add('anim-shake');
    if (fast) {
      widget.reveal();
      showAnswer('✗ الإجابة: ', 'text-bad');
      finish({ correct: false, firstTry: false, simplified: false, revealed: true });
      return;
    }
    setFeedback(`✗ ${res.message ?? (attempts === 1 ? 'ليست صحيحة، حاول مرة أخرى' : 'ما زالت غير صحيحة')}`, 'text-bad');
    if (attempts >= 2) solveBtn.classList.remove('hidden');
  }

  function reveal() {
    if (resolved || attempts < 2) return;
    solutionOpen = true;
    widget.reveal();
    showAnswer('الإجابة الصحيحة: ', 'text-slate-300');
    finish({ correct: false, firstTry: false, simplified: false, revealed: true });
    solutionBox.prepend(h('div', { class: 'text-neon font-bold' }, 'الشرح (Enter للنقطة التالية):'));
    revealStep();
  }

  function revealStep() {
    if (solutionStep >= q.solution.length) return false;
    solutionBox.append(h('div', { class: 'anim-in rounded-xl border border-neon/30 bg-neon/5 p-3 leading-loose' }, rich(q.solution[solutionStep])));
    solutionStep++;
    return true;
  }

  function revealAll() {
    solutionOpen = true;
    while (revealStep());
  }

  function next() {
    if (!resolved) return;
    window.clearTimeout(pendingTimer);
    opts.onNext();
  }

  return {
    handleKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!resolved) {
          if (!instant) submit();
        } else if (solutionOpen && solutionStep < q.solution.length) revealStep();
        else if (!fast) next();
        return;
      }
      if (!resolved && widget.handleKey(e)) return;
      // Letter shortcuts only when not typing: on an Arabic keyboard H is "ا" and S is "س".
      if (isTyping(e)) return;
      if (e.code === 'KeyH' && !fast) {
        e.preventDefault();
        showHint();
      } else if (e.code === 'KeyS' && !fast) {
        e.preventDefault();
        reveal();
      }
    },
    destroy() {
      window.clearTimeout(pendingTimer);
    },
  };
}

const PRAISE = ['✓ ممتاز!', '✓ إصابة مباشرة!', '✓ رائع!', '✓ أحسنت!', '✓ دقيق جداً!', '✓ صحيح!'];
function pickPraise() {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}
