import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import type { Difficulty } from '../../core/question';
import { makeRng, newSeed } from '../../core/rng';
import { mathEl, rich } from '../../core/tex';
import { innermost, randomReal, type RealItem, type SetName } from '../../generators/l3_4';
import { go } from '../../router';
import { titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver, replay } from './gameKit';

const BINS: SetName[] = ['طبيعي', 'كلي', 'صحيح', 'نسبي', 'غير نسبي'];
const LIVES = 3;
const TOTAL = 20;

/** "الفرز": each falling number goes to its innermost region of the Venn diagram. */
export function vennSorter(root: HTMLElement): () => void {
  const back = '/station/3-4';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let lives = LIVES;
  let sorted = 0;
  let count = 0;
  let combo = 0;
  let xp = 0;
  let item: RealItem | null = null;
  let fallTimer = 0;
  let busy = false;
  let phase: 'ready' | 'run' | 'done' = 'ready';

  const livesEl = h('span', { class: 'text-2xl tracking-widest' });
  const scoreEl = h('span', { class: 'chip text-good border-good/50 font-black text-lg mr-auto' }, '✓ 0');
  const lane = h('div', { class: 'relative h-64 rounded-2xl border border-space-600 bg-space-950/60 overflow-hidden' });
  const status = h('div', { class: 'text-center min-h-8 font-bold my-2' });
  const bins = h('div', { class: 'grid grid-cols-5 gap-2' });
  const venn = h(
    'div',
    { class: 'text-[11px] text-slate-400 text-center mb-2' },
    'المناطق متداخلة: طبيعي ⊂ كلي ⊂ صحيح ⊂ نسبي — وغير النسبي منفصل. اختر المنطقة الأعمق التي ينتمي إليها العدد.',
  );
  BINS.forEach((b, i) =>
    bins.append(h('button', { class: `choice flex-col !gap-1 justify-center !py-3 ${b === 'غير نسبي' ? '!border-violet/60' : ''}`, onclick: () => choose(b) }, h('span', { class: 'kbd' }, String(i + 1)), h('b', null, b))),
  );
  const host = h('div', null, h('div', { class: 'panel p-5' }, lane, status, venn, bins));
  root.append(titleBar('الفرز 🗂️', 'وجّه كل عدد إلى مجموعته قبل أن يصل إلى القاع. الأرقام 1–5 للاختيار.', back), h('div', { class: 'flex items-center gap-3 mb-4' }, livesEl, scoreEl), host);
  const renderLives = () => (livesEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(LIVES - lives));
  renderLives();

  function ready() {
    lane.replaceChildren(
      h('div', { class: 'absolute inset-0 grid place-items-center' }, h('button', { class: 'btn btn-primary text-xl px-10', onclick: drop }, 'ابدأ ', h('span', { class: 'kbd' }, 'Enter'))),
    );
  }

  function drop() {
    phase = 'run';
    busy = false;
    const d: Difficulty = count < 6 ? 1 : count < 13 ? 2 : 3;
    item = randomReal(rng, d);
    count++;
    const fall = Math.max(4500, 9000 - count * 220);
    const el = h('div', { class: 'falling absolute left-1/2 -translate-x-1/2 panel px-5 py-3 text-3xl border-neon/70', style: `top:-70px; transition: top ${fall}ms linear` }, mathEl(item.tex));
    lane.replaceChildren(el, h('div', { class: 'absolute bottom-0 inset-x-0 h-1 bg-bad/60' }));
    requestAnimationFrame(() => requestAnimationFrame(() => (el.style.top = 'calc(100% - 64px)')));
    status.textContent = `${count} / ${TOTAL}`;
    status.className = 'text-center min-h-8 font-bold my-2 text-slate-400';
    clearTimeout(fallTimer);
    fallTimer = window.setTimeout(() => miss(true), fall);
  }

  function choose(b: SetName) {
    if (phase !== 'run' || busy || !item) return;
    clearTimeout(fallTimer);
    busy = true;
    const el = lane.querySelector<HTMLElement>('.falling');
    if (el) {
      el.style.top = getComputedStyle(el).top;
      el.style.transition = 'none';
    }
    if (b === innermost(item)) {
      sorted++;
      combo++;
      const g = 5 + Math.min(10, combo);
      xp += g;
      awardXp(g);
      if (el) {
        floatXp(el, g);
        burstAt(el, 18);
        el.classList.replace('border-neon/70', 'border-good');
      }
      sfx.correct(combo);
      scoreEl.textContent = `✓ ${sorted}`;
      status.className = 'text-center min-h-8 font-bold my-2 text-good';
      status.replaceChildren(rich(`✓ ${item.sets.join(' ⊂ ').replace(' ⊂ حقيقي', '')}`));
      setTimeout(next, 700);
    } else miss(false, b);
  }

  function miss(timeout: boolean, picked?: SetName) {
    if (!item) return;
    busy = true;
    combo = 0;
    lives--;
    renderLives();
    sfx.wrong();
    const el = lane.querySelector<HTMLElement>('.falling');
    if (el) {
      el.classList.replace('border-neon/70', 'border-bad');
      replay(el, 'anim-shake');
    }
    status.className = 'text-center min-h-8 font-bold my-2 text-bad';
    status.replaceChildren(rich(`${timeout ? '⌛ سقط العدد! ' : picked ? `✗ ليس "${picked}". ` : ''}الصحيح: ${innermost(item)} — ${item.why}`));
    setTimeout(next, 2600);
  }

  function next() {
    if (lives <= 0 || count >= TOTAL) return finish();
    drop();
  }

  function finish() {
    phase = 'done';
    clearTimeout(fallTimer);
    gameOver(host, { lesson: '3-4', score: sorted, scoreLabel: 'أعداد مفروزة', xp, replay: '/station/3-4/sort', back });
  }

  ready();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'ready') return drop();
      if (phase === 'done') return go('/station/3-4/sort');
    }
    if (/^[1-5]$/.test(e.key)) choose(BINS[Number(e.key) - 1]);
  });
  return () => {
    off();
    clearTimeout(fallTimer);
    addTime('3-4', Date.now() - started);
  };
}
