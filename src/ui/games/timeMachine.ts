import { parseNumber } from '../../core/answer';
import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import type { Difficulty } from '../../core/question';
import { makeRng, newSeed } from '../../core/rng';
import { rich } from '../../core/tex';
import { forward, randomChain, type Step } from '../../generators/l3_3';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver, replay } from './gameKit';

const LEVELS: Difficulty[] = [1, 1, 2, 2, 3];
const OP_TEX: Record<Step['op'], string> = { '+': '+', '-': '-', '×': '\\times', '÷': '\\div' };

/** "آلة الزمن": the forward chain is shown; travel back box by box to the starting number. */
export function timeMachine(root: HTMLElement): () => void {
  const back = '/station/3-3';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let level = 0;
  let points = 0;
  let xp = 0;
  let vals: number[] = [];
  let steps: Step[] = [];
  let cursor = 0; // index of the box being solved (moves right → left)
  let tries = 0;
  let levelPerfect = true;
  let busy = false;
  let done = false;
  let input: HTMLInputElement | null = null;

  const dots = progressDots(LEVELS.length);
  const pointsChip = h('span', { class: 'chip text-good border-good/50 font-black text-lg mr-auto' }, '0 نقطة');
  const chainEl = h('div', { class: 'flex flex-wrap items-center justify-center gap-2 my-8', dir: 'ltr' });
  const status = h('div', { class: 'text-center min-h-8 font-bold' });
  const panel = h('div', { class: 'panel p-6' }, h('div', { class: 'text-center text-lg font-bold' }, '⏳ ارجع بالزمن: أوجد العدد في كل صندوق، من اليمين إلى اليسار'), chainEl, status);
  const host = h('div', null, panel);
  root.append(titleBar('آلة الزمن ⏳', 'نعرف النتيجة النهائية والعمليات. ابدأ من النهاية واعكس كل عملية حتى تصل إلى العدد الأصلي.', back), h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, pointsChip), host);

  function render() {
    chainEl.replaceChildren();
    input = null;
    vals.forEach((v, i) => {
      if (i > 0) {
        const s = steps[i - 1];
        chainEl.append(h('div', { class: 'flex flex-col items-center text-violet' }, rich(`$${OP_TEX[s.op]}\\,${s.k}$`), h('span', { class: 'text-2xl' }, '→')));
      }
      const known = i > cursor || i === vals.length - 1;
      if (i === cursor && !known) {
        input = h('input', { class: 'answer-input !w-24 !text-2xl !py-2 anim-pulse', dir: 'ltr', autocomplete: 'off', 'aria-label': 'العدد في هذا الصندوق' });
        chainEl.append(input);
      } else {
        chainEl.append(
          h(
            'div',
            { class: `w-24 rounded-xl border-2 py-2 text-2xl font-black text-center ${known ? (i === vals.length - 1 ? 'border-gold text-gold' : 'border-good text-good') : 'border-space-600 text-slate-600'}` },
            known ? String(v) : '?',
          ),
        );
      }
    });
    // (assigned inside the forEach callback, so TS can't see it)
    (input as HTMLInputElement | null)?.focus();
  }

  function setup() {
    dots.set(level, 'current');
    const c = randomChain(rng, LEVELS[level]);
    steps = c.steps;
    vals = forward(c.start, steps);
    cursor = vals.length - 2;
    tries = 0;
    levelPerfect = true;
    busy = false;
    status.className = 'text-center min-h-8 font-bold text-slate-400';
    status.textContent = `المستوى ${level + 1} من ${LEVELS.length}`;
    render();
  }

  function submit() {
    if (busy || done || !input) return;
    const p = parseNumber(input.value);
    if (!p) return;
    const want = vals[cursor];
    const s = steps[cursor];
    if (p.value.equals(want)) {
      sfx.correct(cursor);
      const gained = tries === 0 ? 10 : 4;
      points += gained;
      xp += gained;
      awardXp(gained);
      floatXp(input, gained);
      pointsChip.textContent = `${points} نقطة`;
      status.className = 'text-center min-h-8 font-bold text-good';
      status.replaceChildren(rich(`✓ عكسنا $${OP_TEX[s.op]}\\,${s.k}$: $${vals[cursor + 1]} ${OP_TEX[INV[s.op]]} ${s.k} = ${want}$`));
      tries = 0;
      cursor--;
      if (cursor < 0) return finishLevel();
      render();
    } else {
      tries++;
      levelPerfect = false;
      sfx.wrong();
      replay(input, 'anim-shake');
      status.className = 'text-center min-h-8 font-bold text-bad';
      status.replaceChildren(rich(tries >= 2 ? `الإجابة $${want}$: عكس $${OP_TEX[s.op]}\\,${s.k}$ هو $${OP_TEX[INV[s.op]]}\\,${s.k}$` : `✗ ما العملية التي تلغي $${OP_TEX[s.op]}\\,${s.k}$؟`));
      if (tries >= 2) {
        tries = 0;
        cursor--;
        if (cursor < 0) return finishLevel();
        setTimeout(render, 1200);
      } else input.select();
    }
  }

  function finishLevel() {
    busy = true;
    cursor = -1;
    render();
    burstAt(chainEl, 30);
    dots.set(level, levelPerfect ? 'good' : 'half');
    status.className = 'text-center min-h-8 font-bold text-good';
    status.textContent = `✓ وصلت إلى البداية: ${vals[0]}`;
    setTimeout(() => {
      level++;
      if (level >= LEVELS.length) {
        done = true;
        gameOver(host, { lesson: '3-3', score: points, scoreLabel: 'نقاط', xp, replay: '/station/3-3/time', back });
      } else setup();
    }, 1600);
  }

  setup();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (done) go('/station/3-3/time');
      else submit();
    }
  });
  return () => {
    off();
    addTime('3-3', Date.now() - started);
  };
}

const INV: Record<Step['op'], Step['op']> = { '+': '-', '-': '+', '×': '÷', '÷': '×' };
