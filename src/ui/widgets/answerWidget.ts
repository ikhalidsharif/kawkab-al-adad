import type { CheckResult } from '../../core/answer';
import { h, clear, isTyping } from '../../core/dom';
import type { AnswerInput, Question } from '../../core/question';
import { rich } from '../../core/tex';
import { DIAGRAMS, renderDiagram } from '../diagrams';

export interface AnswerWidget {
  el: HTMLElement;
  getValue(): AnswerInput;
  setValue(v: AnswerInput): void;
  /** Keyboard shortcuts (1–9, Backspace, arrows). Returns true when the key was used. */
  handleKey(e: KeyboardEvent): boolean;
  /** Colour the answer after checking (wrong parts in red, picked choice etc.). */
  showResult(res: CheckResult): void;
  /** Show the correct answer. */
  reveal(): void;
  lock(): void;
  focus(): void;
}

export interface WidgetOptions {
  /** Choice / diagram picks call this (practice submits immediately; exam just stores). */
  onPick?(v: AnswerInput): void;
  /** Any change of value (exam autosave, palette). */
  onChange?(v: AnswerInput): void;
}

const kbd = (k: string) => h('span', { class: 'kbd shrink-0' }, k);

/** A student's answer in words (exam review, notebook). */
export function describeAnswer(q: Question, v: AnswerInput): string {
  const a = q.answer;
  if (v === null) return '—';
  switch (a.kind) {
    case 'choice':
      return typeof v === 'number' ? (q.choices?.[v] ?? '—') : '—';
    case 'label':
      return typeof v === 'number' ? renderDiagramName(a.diagram, a.regions[v]) : '—';
    case 'order':
      return Array.isArray(v) ? v.map((i) => a.items[i]).join(' ← ') : '—';
    case 'sort':
      return Array.isArray(v) ? v.map((b, i) => `${a.items[i]} ← ${b >= 0 ? a.buckets[b] : '؟'}`).join('، ') : '—';
    default:
      return String(v);
  }
}

function renderDiagramName(diagram: string, region: string | undefined): string {
  return (region && DIAGRAMS[diagram]?.regions[region]?.name) || '—';
}

export function answerWidget(q: Question, opts: WidgetOptions = {}): AnswerWidget {
  const a = q.answer;
  switch (a.kind) {
    case 'choice':
      return choiceWidget(q.choices ?? [], a.index, opts);
    case 'label':
      return labelWidget(a.diagram, a.regions, a.index, opts);
    case 'order':
      return orderWidget(a.items, a.correct, opts);
    case 'sort':
      return sortWidget(a.items, a.buckets, a.assign, opts);
    default:
      return textWidget(q, opts);
  }
}

/* ---------------- multiple choice ---------------- */
function choiceWidget(choices: string[], correct: number, opts: WidgetOptions): AnswerWidget {
  let value: number | null = null;
  let locked = false;
  const cols = choices.length === 2 ? 'sm:grid-cols-2' : choices.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  const btns = choices.map((c, i) => h('button', { class: 'choice', onclick: () => pick(i) }, kbd(String(i + 1)), rich(c, 'text-lg leading-relaxed')));
  const el = h('div', { class: `grid grid-cols-1 ${cols} gap-3` }, btns);
  const paint = () => btns.forEach((b, i) => b.classList.toggle('!border-neon', i === value));
  function pick(i: number) {
    if (locked || btns[i].disabled) return;
    value = i;
    paint();
    opts.onChange?.(i);
    opts.onPick?.(i);
  }
  return {
    el,
    getValue: () => value,
    setValue: (v) => {
      value = typeof v === 'number' ? v : null;
      paint();
    },
    handleKey(e) {
      if (isTyping(e) || !/^[1-9]$/.test(e.key)) return false;
      const i = Number(e.key) - 1;
      if (i >= choices.length) return false;
      pick(i);
      return true;
    },
    showResult(res) {
      if (value === null) return;
      if (res.status === 'correct') btns[value].classList.add('correct');
      else {
        btns[value].classList.add('wrong');
        btns[value].disabled = true;
      }
    },
    reveal: () => btns[correct].classList.add('correct'),
    lock() {
      locked = true;
      btns.forEach((b) => (b.disabled = true));
    },
    focus() {},
  };
}

/* ---------------- typed answer (term or number) ---------------- */
function textWidget(q: Question, opts: WidgetOptions): AnswerWidget {
  const numeric = q.answer.kind !== 'text';
  const input = h('input', {
    class: 'answer-input',
    dir: numeric ? 'ltr' : 'rtl',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: q.placeholder ?? (numeric ? 'العدد' : 'اكتب المصطلح العلمي'),
    'aria-label': 'إجابتك',
  });
  input.addEventListener('input', () => opts.onChange?.(input.value.trim() === '' ? null : input.value));
  return {
    el: h('div', { class: 'max-w-md w-full mx-auto' }, input),
    getValue: () => (input.value.trim() === '' ? null : input.value),
    setValue: (v) => (input.value = typeof v === 'string' ? v : ''),
    handleKey: () => false,
    showResult(res) {
      input.classList.toggle('!border-good', res.status === 'correct');
      input.classList.toggle('!border-bad', res.status === 'wrong');
      if (res.status === 'wrong') input.select();
    },
    reveal() {},
    lock: () => (input.disabled = true),
    focus: () => input.focus(),
  };
}

/* ---------------- diagram: click the right part ---------------- */
function labelWidget(diagram: string, regions: string[], correct: number, opts: WidgetOptions): AnswerWidget {
  let value: number | null = null;
  let locked = false;
  const d = renderDiagram(diagram, { numbered: regions });
  const paint = () =>
    regions.forEach((_, i) => {
      d.badges[i]?.classList.toggle('picked', i === value);
    });
  regions.forEach((_, i) => d.onRegionClick(i, () => pick(i)));
  function pick(i: number) {
    if (locked) return;
    value = i;
    paint();
    opts.onChange?.(i);
    opts.onPick?.(i);
  }
  const el = h('div', { class: 'flex flex-col items-center gap-2' }, d.el, h('p', { class: 'text-slate-400 text-sm' }, 'اضغط الجزء الصحيح في المخطط، أو اضغط رقمه'));
  return {
    el,
    getValue: () => value,
    setValue: (v) => {
      value = typeof v === 'number' ? v : null;
      paint();
    },
    handleKey(e) {
      if (isTyping(e) || !/^[1-9]$/.test(e.key)) return false;
      const i = Number(e.key) - 1;
      if (i >= regions.length) return false;
      pick(i);
      return true;
    },
    showResult(res) {
      if (value !== null) d.badges[value]?.classList.add(res.status === 'correct' ? 'good' : 'bad');
    },
    reveal() {
      d.badges[correct]?.classList.add('good');
      d.showName(correct);
    },
    lock: () => (locked = true),
    focus() {},
  };
}

/* ---------------- put in order: tap items in sequence ---------------- */
function orderWidget(items: string[], correct: number[], opts: WidgetOptions): AnswerWidget {
  let seq: number[] = [];
  let locked = false;
  const slots = h('ol', { class: 'flex flex-col gap-2 min-h-12' });
  const pool = h('div', { class: 'flex flex-wrap gap-2 justify-center' });
  const help = h('p', { class: 'text-slate-400 text-sm text-center' }, 'اضغط العناصر بالترتيب الصحيح (أو أرقامها). اضغط عنصراً مختاراً لإزالته، أو Backspace.');
  const el = h('div', { class: 'flex flex-col gap-4' }, help, pool, h('div', { class: 'rounded-xl border-2 border-dashed border-space-600 p-3' }, slots));
  const render = (wrong: number[] = [], showAll = false) => {
    clear(pool);
    clear(slots);
    items.forEach((it, i) => {
      if (seq.includes(i)) return;
      pool.append(h('button', { class: 'choice !py-2 !text-base', onclick: () => add(i) }, kbd(String(i + 1)), rich(it)));
    });
    const list = showAll ? correct : seq;
    list.forEach((i, pos) =>
      slots.append(
        h(
          'li',
          {
            class: `flex items-center gap-3 rounded-lg border-2 px-3 py-2 cursor-pointer ${wrong.includes(pos) ? 'border-bad bg-bad/10' : showAll ? 'border-good bg-good/10' : 'border-neon/50 bg-neon/5'}`,
            onclick: () => remove(pos),
          },
          h('span', { class: 'chip font-black' }, String(pos + 1)),
          rich(items[i]),
        ),
      ),
    );
    if (!list.length) slots.append(h('li', { class: 'text-slate-500 text-center text-sm py-2' }, 'الترتيب يظهر هنا'));
  };
  function add(i: number) {
    if (locked || seq.includes(i)) return;
    seq.push(i);
    render();
    opts.onChange?.(seq.length ? [...seq] : null);
  }
  function remove(pos: number) {
    if (locked) return;
    seq.splice(pos, 1);
    render();
    opts.onChange?.(seq.length ? [...seq] : null);
  }
  render();
  return {
    el,
    getValue: () => (seq.length ? [...seq] : null),
    setValue(v) {
      seq = Array.isArray(v) ? [...v] : [];
      render();
    },
    handleKey(e) {
      if (isTyping(e)) return false;
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= items.length) {
        add(Number(e.key) - 1);
        return true;
      }
      if (e.key === 'Backspace' && seq.length) {
        remove(seq.length - 1);
        return true;
      }
      return false;
    },
    showResult(res) {
      render(res.wrongParts ?? []);
    },
    reveal() {
      seq = [...correct];
      render([], true);
    },
    lock() {
      locked = true;
    },
    focus() {},
  };
}

/* ---------------- sort into buckets / match pairs ---------------- */
function sortWidget(items: string[], buckets: string[], assign: number[], opts: WidgetOptions): AnswerWidget {
  let value: number[] = items.map(() => -1);
  let row = 0;
  let locked = false;
  let wrong: number[] = [];
  let revealed = false;
  const list = h('div', { class: 'flex flex-col gap-2' });
  const help = h('p', { class: 'text-slate-400 text-sm text-center' }, `لكل عنصر اختر مجموعته (أو اضغط رقم المجموعة 1–${buckets.length}؛ ينتقل التحديد تلقائياً، والأسهم ↑↓ للتنقّل).`);
  const legend = h('div', { class: 'flex flex-wrap gap-2 justify-center' }, buckets.map((b, i) => h('span', { class: 'chip text-sm' }, kbd(String(i + 1)), rich(b))));
  const el = h('div', { class: 'flex flex-col gap-3' }, help, legend, list);
  const render = () => {
    clear(list);
    items.forEach((it, i) => {
      const shown = revealed ? assign[i] : value[i];
      list.append(
        h(
          'div',
          {
            class: `rounded-xl border-2 p-2 flex flex-wrap items-center gap-2 ${i === row && !locked ? 'border-neon' : wrong.includes(i) ? 'border-bad bg-bad/10' : revealed ? 'border-good/60' : 'border-space-600'}`,
            onclick: () => {
              row = i;
              render();
            },
          },
          h('div', { class: 'grow min-w-40 font-bold leading-relaxed' }, rich(it)),
          h(
            'div',
            { class: 'flex flex-wrap gap-1' },
            buckets.map((b, bi) =>
              h(
                'button',
                {
                  class: `px-3 py-1 rounded-lg border text-sm transition ${shown === bi ? 'bg-neon/25 border-neon text-white font-bold' : 'border-space-600 text-slate-400 hover:border-neon/60'}`,
                  onclick: (e: Event) => {
                    e.stopPropagation();
                    set(i, bi);
                  },
                },
                rich(b),
              ),
            ),
          ),
        ),
      );
    });
  };
  function set(i: number, bi: number) {
    if (locked) return;
    value[i] = bi;
    wrong = wrong.filter((w) => w !== i);
    const next = value.findIndex((v, k) => v < 0 && k > i);
    row = next >= 0 ? next : Math.min(items.length - 1, i + 1);
    render();
    opts.onChange?.(value.some((v) => v >= 0) ? [...value] : null);
  }
  render();
  return {
    el,
    getValue: () => (value.some((v) => v >= 0) ? [...value] : null),
    setValue(v) {
      value = Array.isArray(v) && v.length === items.length ? [...v] : items.map(() => -1);
      render();
    },
    handleKey(e) {
      if (isTyping(e) || locked) return false;
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= buckets.length) {
        set(row, Number(e.key) - 1);
        return true;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        row = Math.max(0, Math.min(items.length - 1, row + (e.key === 'ArrowDown' ? 1 : -1)));
        render();
        e.preventDefault();
        return true;
      }
      return false;
    },
    showResult(res) {
      wrong = res.wrongParts ?? [];
      render();
    },
    reveal() {
      revealed = true;
      wrong = [];
      render();
    },
    lock() {
      locked = true;
      render();
    },
    focus() {},
  };
}
