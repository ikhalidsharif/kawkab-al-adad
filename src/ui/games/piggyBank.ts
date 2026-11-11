import Fraction from 'fraction.js';
import { parseNumber } from '../../core/answer';
import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { texFrac } from '../../core/mathutil';
import { makeRng, newSeed, type Rng } from '../../core/rng';
import { mathEl, rich } from '../../core/tex';
import { evalExact } from '../../core/expr';
import { go } from '../../router';
import { titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver, replay } from './gameKit';

const MONTHS_ASKED = [5, 7, 9, 12];

/** Pairs of (power TeX, exact value) with all values distinct; includes classic traps like (-2)^4 vs -2^4. */
export function matchPairs(rng: Rng, n: number): { tex: string; value: Fraction }[] {
  const out: { tex: string; value: Fraction }[] = [];
  const add = (tex: string, js: string) => {
    const value = evalExact(js);
    if (!out.some((p) => p.value.equals(value))) out.push({ tex, value });
  };
  const a = rng.int(2, 3);
  const e = a === 2 ? 4 : 2;
  add(`(-${a})^{${e}}`, `(-${a})**${e}`);
  add(`-${a}^{${e}}`, `-(${a}**${e})`);
  const makers: (() => void)[] = [
    () => {
      const b = rng.pick([7, 12, 99]);
      add(`${b}^{0}`, `${b}**0`);
    },
    () => {
      const b = rng.int(2, 4);
      const k = rng.int(1, 2);
      add(`${b}^{-${k}}`, `${b}**(-${k})`);
    },
    () => {
      const k = rng.int(1, 3);
      add(`10^{-${k}}`, `10**(-${k})`);
    },
    () => {
      const b = rng.int(2, 3);
      add(`(-${b})^{3}`, `(-${b})**3`);
    },
    () => {
      const b = rng.int(2, 5);
      const k = b === 2 ? rng.int(5, 7) : 3;
      add(`${b}^{${k}}`, `${b}**${k}`);
    },
    () => {
      const k = rng.pick([5, 7, 9]);
      add(`(-1)^{${k}}`, `(-1)**${k}`);
    },
  ];
  for (let guard = 0; out.length < n && guard < 100; guard++) rng.pick(makers)();
  return rng.shuffle(out).slice(0, n);
}

export function piggyBank(root: HTMLElement): () => void {
  const back = '/station/2-8';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let points = 0;
  let xp = 0;
  let phase: 'predict' | 'match' | 'done' = 'predict';
  let ask = 0;
  let busy = false;

  const pointsChip = h('span', { class: 'chip text-good border-good/50 font-black text-lg' }, '0 نقطة');
  const host = h('div');
  root.append(
    titleBar('الحصالة المضاعفة 🐷', 'المرحلة 1: عدنان يدّخر ديناراً في الشهر الأول ويضاعف المبلغ كل شهر — توقّع ما سيدّخره. المرحلة 2: طابق كل قوة مع قيمتها بسرعة.', back),
    h('div', { class: 'flex items-center gap-3 mb-4' }, pointsChip),
    host,
  );
  const addPoints = (p: number, anchor: Element) => {
    points += p;
    pointsChip.textContent = `${points} نقطة`;
    if (p > 0) {
      const g = Math.round(p / 2);
      xp += g;
      awardXp(g);
      floatXp(anchor, g);
    }
  };

  /* ---------- Phase 1: predictions ---------- */
  const bars = h('div', { class: 'flex items-end justify-center gap-2 h-56 px-2', dir: 'ltr' });
  const question = h('div', { class: 'text-xl font-bold text-center my-4' });
  const input = h('input', { class: 'answer-input max-w-xs mx-auto block', dir: 'ltr', autocomplete: 'off', placeholder: 'المبلغ بالدينار' });
  const status = h('div', { class: 'text-center min-h-8 font-bold mt-3' });
  const predictPanel = h('div', { class: 'panel p-6' }, bars, question, input, status);

  function drawBars(upTo: number, highlight: number) {
    // Heights grow by one step per month (a log scale), labels show the real amounts.
    const max = upTo;
    bars.replaceChildren(
      ...Array.from({ length: upTo }, (_, i) => {
        const v = 2 ** i;
        const known = i < 4 || i + 1 <= highlight;
        return h(
          'div',
          { class: 'flex flex-col items-center gap-1 grow max-w-12' },
          h('span', { class: `text-xs font-bold ${known ? 'text-gold' : 'text-slate-500'}` }, known ? String(v) : '?'),
          h('div', {
            class: `w-full rounded-t-md transition-all duration-700 ${known ? 'bg-gradient-to-t from-gold/60 to-gold' : 'bg-space-700 border border-dashed border-space-600'}`,
            style: `height:${((i + 1) / max) * 170}px`,
          }),
          h('span', { class: 'text-[11px] text-slate-400' }, `ش${i + 1}`),
        );
      }),
    );
  }

  function showAsk() {
    const n = MONTHS_ASKED[ask];
    drawBars(n, 4);
    question.replaceChildren(rich(`كم ديناراً سيدّخر عدنان في الشهر ${n}؟ `), mathEl('2^{?}'));
    input.value = '';
    input.disabled = false;
    status.textContent = `توقّع ${ask + 1} من ${MONTHS_ASKED.length}`;
    status.className = 'text-center min-h-8 font-bold mt-3 text-slate-400';
    input.focus();
  }

  function submitPredict() {
    if (busy) return;
    const n = MONTHS_ASKED[ask];
    const p = parseNumber(input.value);
    if (!p) return;
    busy = true;
    input.disabled = true;
    const right = p.value.equals(2 ** (n - 1));
    drawBars(n, n);
    if (right) {
      sfx.correct(ask);
      burstAt(bars, 30);
      addPoints(20, bars);
      status.className = 'text-center min-h-8 font-bold mt-3 text-good';
      status.replaceChildren(rich(`✓ صحيح! $2^{${n - 1}} = ${2 ** (n - 1)}$ ديناراً`));
    } else {
      sfx.wrong();
      replay(predictPanel, 'anim-shake');
      status.className = 'text-center min-h-8 font-bold mt-3 text-bad';
      status.replaceChildren(rich(`✗ المبلغ في الشهر ${n} هو $2^{${n - 1}} = ${2 ** (n - 1)}$ ديناراً`));
    }
    setTimeout(() => {
      busy = false;
      ask++;
      if (ask < MONTHS_ASKED.length) showAsk();
      else startMatch();
    }, 1800);
  }

  /* ---------- Phase 2: matching ---------- */
  let selected: HTMLButtonElement | null = null;
  let matched = 0;
  let mistakes = 0;
  let matchStart = 0;
  let timer = 0;
  const PAIRS = 6;

  function startMatch() {
    phase = 'match';
    const pairs = matchPairs(rng, PAIRS);
    const timerEl = h('span', { class: 'chip text-neon', dir: 'ltr' }, '0s');
    const left = h('div', { class: 'grid gap-2' });
    const right = h('div', { class: 'grid gap-2' });
    pairs.forEach((p, i) => {
      left.append(card(mathEl(p.tex), i, 'L'));
    });
    rng.shuffle(pairs.map((p, i) => ({ p, i }))).forEach(({ p, i }) => right.append(card(mathEl(texFrac(p.value)), i, 'R')));
    const panel = h(
      'div',
      { class: 'panel p-6' },
      h('div', { class: 'flex items-center gap-3 mb-4' }, h('b', { class: 'text-xl' }, 'طابق كل قوة مع قيمتها'), timerEl, h('span', { class: 'text-slate-400 text-sm mr-auto' }, 'اضغط قوة ثم قيمتها')),
      h('div', { class: 'grid grid-cols-2 gap-6' }, left, right),
    );
    host.replaceChildren(panel);
    matchStart = performance.now();
    timer = window.setInterval(() => (timerEl.textContent = `${Math.floor((performance.now() - matchStart) / 1000)}s`), 250);
  }

  function card(content: HTMLElement, id: number, side: 'L' | 'R'): HTMLButtonElement {
    const b = h('button', { class: 'choice justify-center text-2xl min-h-16', onclick: () => pick(b) }, content);
    b.dataset.id = String(id);
    b.dataset.side = side;
    return b;
  }

  function pick(b: HTMLButtonElement) {
    if (b.disabled) return;
    if (!selected || selected.dataset.side === b.dataset.side) {
      selected?.classList.remove('!border-neon', '!bg-neon/10');
      selected = b;
      b.classList.add('!border-neon', '!bg-neon/10');
      sfx.click();
      return;
    }
    const a = selected;
    selected = null;
    a.classList.remove('!border-neon', '!bg-neon/10');
    if (a.dataset.id === b.dataset.id) {
      [a, b].forEach((x) => {
        x.disabled = true;
        x.classList.add('correct', 'opacity-60');
      });
      matched++;
      sfx.correct(matched);
      burstAt(b, 16);
      addPoints(10, b);
      if (matched === PAIRS) finishMatch();
    } else {
      mistakes++;
      sfx.wrong();
      [a, b].forEach((x) => {
        x.classList.add('wrong');
        replay(x, 'anim-shake');
        setTimeout(() => x.classList.remove('wrong'), 500);
      });
      addPoints(-3, b);
    }
  }

  function finishMatch() {
    clearInterval(timer);
    const secs = (performance.now() - matchStart) / 1000;
    const bonus = Math.max(0, Math.round(40 - secs));
    if (bonus) addPoints(bonus, pointsChip);
    phase = 'done';
    setTimeout(
      () =>
        gameOver(host, {
          lesson: '2-8',
          score: Math.max(0, points),
          scoreLabel: 'نقاط',
          xp,
          replay: '/station/2-8/piggy',
          back,
          extra: h('p', { class: 'text-slate-300' }, `المطابقة في ${Math.round(secs)} ثانية، أخطاء: ${mistakes}${bonus ? ` — مكافأة سرعة +${bonus}` : ''}`),
        }),
      700,
    );
  }

  host.append(predictPanel);
  showAsk();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'predict') submitPredict();
      else if (phase === 'done') host.querySelector<HTMLElement>('[data-primary]')?.click();
    }
  });
  return () => {
    off();
    clearInterval(timer);
    addTime('2-8', Date.now() - started);
  };
}
