import { checkAnswer, previewTex } from '../../core/answer';
import { sfx } from '../../core/audio';
import { h, clear, isTyping } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { awardXp } from '../../core/game';
import type { Question } from '../../core/question';
import { lesson, update } from '../../core/store';
import { mathEl, rich } from '../../core/tex';
import { HINT_COST } from '../../core/xp';
import { getGenerator } from '../../generators';
import { floatXp } from './toast';

export interface QResult {
  correct: boolean;
  firstTry: boolean;
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

export function mountQuestion(host: HTMLElement, q: Question, opts: RunnerOptions): Runner {
  clear(host);
  /** Fast modes: no hints/solutions, a miss shows the answer and moves on automatically. */
  const blitz = opts.mode === 'blitz' || opts.mode === 'boss';
  const missDelay = opts.mode === 'boss' ? 2200 : 1400;
  const started = performance.now();
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
      { class: 'flex items-center gap-2 text-sm' },
      h('span', { class: `chip ${dCls}` }, dLabel),
      h('span', { class: 'text-slate-400' }, getGenerator(q.gen).label),
    ),
    h('div', { class: 'text-xl md:text-2xl leading-loose font-bold' }, rich(q.prompt)),
  );

  /* ----- answer zone ----- */
  const feedback = h('div', { class: 'min-h-[2rem] text-lg font-bold', 'aria-live': 'polite' });
  let input: HTMLInputElement | null = null;
  let preview: HTMLElement | null = null;
  const choiceBtns: HTMLButtonElement[] = [];

  if (q.choices) {
    const cols = q.choices.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
    const grid = h('div', { class: `grid grid-cols-1 ${cols} gap-3` });
    q.choices.forEach((c, i) => {
      const b = h('button', { class: 'choice', onclick: () => submit(i) }, h('span', { class: 'kbd' }, String(i + 1)), rich(c, 'text-xl'));
      choiceBtns.push(b);
      grid.append(b);
    });
    card.append(grid);
  } else {
    input = h('input', {
      class: 'answer-input',
      dir: 'ltr',
      inputmode: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: q.placeholder ?? 'إجابتك',
      'aria-label': 'إجابتك',
    });
    preview = h('div', { class: 'min-h-[3rem] grid place-items-center text-2xl text-neon/90' });
    input.addEventListener('input', () => {
      clear(preview!);
      const t = previewTex(input!.value);
      if (t) preview!.append(mathEl(t));
    });
    card.append(h('div', { class: 'flex flex-col gap-2 max-w-md w-full mx-auto' }, input, preview));
  }
  card.append(feedback);

  /* ----- actions ----- */
  const checkBtn = h('button', { class: 'btn btn-primary', onclick: () => submit() }, 'تحقّق ', h('span', { class: 'kbd' }, 'Enter'));
  const hintBtn = h('button', { class: 'btn btn-gold', onclick: () => showHint() }, `تلميح (−${HINT_COST} XP) `, h('span', { class: 'kbd' }, 'H'));
  const solveBtn = h('button', { class: 'btn hidden', onclick: () => reveal() }, 'اعرض الحل ', h('span', { class: 'kbd' }, 'S'));
  const nextBtn = h('button', { class: 'btn btn-primary hidden anim-pulse', onclick: () => next() }, 'التالي ', h('span', { class: 'kbd' }, 'Enter'));
  const actions = h('div', { class: 'flex flex-wrap gap-3 justify-center' }, checkBtn, !blitz && hintBtn, !blitz && solveBtn, nextBtn);
  if (q.choices) checkBtn.classList.add('hidden');
  card.append(actions);

  const hintsBox = h('div', { class: 'flex flex-col gap-2' });
  const solutionBox = h('div', { class: 'flex flex-col gap-2' });
  card.append(hintsBox, solutionBox);
  host.append(card);
  input?.focus();

  function setFeedback(text: string, cls: string) {
    feedback.className = `min-h-[2rem] text-lg font-bold ${cls}`;
    feedback.textContent = text;
  }

  function showHint() {
    if (resolved || blitz || hintsShown >= q.hints.length) return;
    hintsShown++;
    sfx.hint();
    awardXp(-HINT_COST);
    floatXp(hintBtn, -HINT_COST);
    update((s) => {
      lesson(s, q.lesson).hintsUsed++;
    });
    hintsBox.append(
      h('div', { class: 'anim-in rounded-xl border border-gold/40 bg-gold/5 p-3 leading-loose' }, h('span', { class: 'ml-2' }, '💡'), rich(q.hints[hintsShown - 1])),
    );
    if (hintsShown >= q.hints.length) hintBtn.disabled = true;
    input?.focus();
  }

  function finish(r: Omit<QResult, 'timeMs' | 'hints' | 'attempts'>) {
    resolved = true;
    const result: QResult = { ...r, hints: hintsShown, attempts, timeMs: performance.now() - started };
    const xp = opts.onResolved(result);
    if (xp > 0) floatXp(card, xp);
    checkBtn.classList.add('hidden');
    hintBtn.classList.add('hidden');
    solveBtn.classList.add('hidden');
    if (input) input.disabled = true;
    choiceBtns.forEach((b) => (b.disabled = true));
    if (blitz) {
      pendingTimer = window.setTimeout(next, r.correct ? 450 : missDelay);
    } else {
      nextBtn.classList.remove('hidden');
      if (r.correct && !solutionOpen) {
        solutionBox.append(
          h('button', { class: 'text-sm text-slate-400 underline self-start', onclick: (e: Event) => { (e.target as HTMLElement).remove(); revealAll(); } }, 'شاهد طريقة الحل'),
        );
      }
      nextBtn.focus();
    }
  }

  function submit(choice?: number) {
    if (resolved) return;
    let value: string | number;
    if (q.choices) {
      if (choice === undefined) return;
      value = choice;
    } else {
      value = input!.value;
      if (!value.trim()) {
        setFeedback('اكتب إجابتك أولاً', 'text-slate-400');
        return;
      }
    }
    const res = checkAnswer(q.answer, value);
    if (res.status === 'invalid') {
      setFeedback(res.message ?? 'صيغة غير مفهومة', 'text-gold');
      return;
    }
    attempts++;
    if (res.status === 'correct' || res.status === 'unsimplified') {
      const simplified = res.status === 'correct';
      sfx.correct(attempts);
      burstAt(card, simplified ? 28 : 12);
      if (choice !== undefined) choiceBtns[choice].classList.add('correct');
      input?.classList.add('!border-good');
      setFeedback(simplified ? pickPraise() : `✓ ${res.message}`, simplified ? 'text-good' : 'text-gold');
      finish({ correct: true, firstTry: attempts === 1, simplified, revealed: false });
      return;
    }
    // wrong
    sfx.wrong();
    card.classList.remove('anim-shake');
    void card.offsetWidth;
    card.classList.add('anim-shake');
    if (choice !== undefined) {
      choiceBtns[choice].classList.add('wrong');
      choiceBtns[choice].disabled = true;
    }
    if (blitz) {
      setFeedback('', '');
      feedback.append(h('span', { class: 'text-bad' }, '✗ الإجابة: '), mathEl(q.answerTex));
      if (q.answer.kind === 'choice') choiceBtns[q.answer.index].classList.add('correct');
      finish({ correct: false, firstTry: false, simplified: false, revealed: true });
      return;
    }
    setFeedback(res.message ?? (attempts === 1 ? '✗ ليست صحيحة، حاول مرة أخرى' : '✗ ما زالت غير صحيحة'), 'text-bad');
    if (attempts >= 2) solveBtn.classList.remove('hidden');
    input?.select();
  }

  function reveal() {
    if (resolved || attempts < 2) return;
    solutionOpen = true;
    setFeedback('', '');
    feedback.append(h('span', { class: 'text-slate-300' }, 'الإجابة الصحيحة: '), mathEl(q.answerTex));
    if (q.answer.kind === 'choice') choiceBtns[q.answer.index].classList.add('correct');
    finish({ correct: false, firstTry: false, simplified: false, revealed: true });
    solutionBox.prepend(h('div', { class: 'text-neon font-bold' }, 'الحل خطوة بخطوة (Enter للخطوة التالية):'));
    revealStep();
  }

  function revealStep() {
    if (solutionStep >= q.solution.length) return false;
    solutionBox.append(
      h('div', { class: 'anim-in rounded-xl border border-neon/30 bg-neon/5 p-3 leading-loose' }, h('span', { class: 'chip ml-2' }, String(solutionStep + 1)), rich(q.solution[solutionStep])),
    );
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
        if (!resolved) submit();
        else if (solutionOpen && solutionStep < q.solution.length) revealStep();
        else if (!blitz) next();
        return;
      }
      if (q.choices && !resolved && /^[1-4]$/.test(e.key) && !isTyping(e)) {
        const i = Number(e.key) - 1;
        if (i < q.choices.length && !choiceBtns[i].disabled) submit(i);
        return;
      }
      if (e.code === 'KeyH' && !blitz) {
        e.preventDefault();
        showHint();
      } else if (e.code === 'KeyS' && !blitz) {
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
