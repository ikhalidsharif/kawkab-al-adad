import Fraction from 'fraction.js';
import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt, confetti } from '../../core/fx';
import { addTime, awardXp, unlock } from '../../core/game';
import { gcd, texFrac } from '../../core/mathutil';
import { makeRng, newSeed } from '../../core/rng';
import { getSave, lesson, update } from '../../core/store';
import { mathEl } from '../../core/tex';
import { lcdOptions, lcdPair } from '../../generators/l2_5';
import { go } from '../../router';
import { statBox, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';

const LIVES = 3;

/** "مصنع المقامات": pick the LCD of the two fractions on the box before it leaves the conveyor. */
export function factoryGame(root: HTMLElement): () => void {
  const back = '/station/2-5';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let score = 0;
  let lives = LIVES;
  let combo = 0;
  let xp = 0;
  let phase: 'ready' | 'run' | 'wait' | 'done' = 'ready';
  let answer = -1;
  let missTimer = 0;
  let waitTimer = 0;
  let L = 0;

  const scoreEl = h('span', { class: 'chip text-good border-good/50 font-black text-lg' }, '📦 0');
  const livesEl = h('span', { class: 'text-2xl tracking-widest' });
  const speedEl = h('span', { class: 'chip text-slate-300' });
  const belt = h('div', {
    class: 'relative h-52 rounded-2xl border border-space-600 overflow-hidden',
    style:
      'background: repeating-linear-gradient(90deg, #111a36 0 38px, #1b2750 38px 40px), #0a1024; background-size: 40px 100%; animation: belt 1s linear infinite;',
  });
  const exitZone = h('div', { class: 'absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-bad/30 to-transparent pointer-events-none' });
  belt.append(exitZone, h('div', { class: 'absolute bottom-3 left-3 text-bad text-xs font-bold' }, 'خط النهاية'));
  const options = h('div', { class: 'grid grid-cols-2 md:grid-cols-4 gap-3 mt-5' });
  const msg = h('div', { class: 'min-h-8 text-center text-lg font-bold mt-3' });
  const stage = h('div', { class: 'panel p-5' }, belt, msg, options);

  const style = h('style', null, '@keyframes belt { from { background-position: 0 0 } to { background-position: -40px 0 } }');
  root.append(
    style,
    titleBar('مصنع المقامات 🏭', 'كل صندوق يحمل كسرين: اختر المضاعف المشترك الأصغر (م.م.أ) لمقاميهما قبل أن يصل إلى خط النهاية. الأرقام 1–4 للاختيار.', back),
    h('div', { class: 'flex items-center gap-3 mb-4' }, scoreEl, livesEl, speedEl, h('span', { class: 'mr-auto text-slate-400 text-sm' }, `أفضل نتيجة: ${getSave().lessons['2-5']?.gameBest ?? 0}`)),
    stage,
  );

  const renderLives = () => (livesEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(LIVES - lives));
  const duration = () => Math.max(3500, 9000 - score * 300);
  renderLives();

  function properFrac(d: number) {
    let n = rng.int(1, d - 1);
    while (gcd(n, d) !== 1) n = rng.int(1, d - 1);
    return new Fraction(n, d);
  }

  function spawn() {
    phase = 'run';
    belt.querySelectorAll('.box').forEach((b) => b.remove());
    const [b, c] = lcdPair(rng, score < 5 ? 1 : 2);
    const opts = lcdOptions(rng, b, c);
    answer = opts.index;
    L = opts.L;
    speedEl.textContent = `⚡ ${(9000 / duration()).toFixed(1)}×`;
    const box = h(
      'div',
      {
        class: 'box absolute top-1/2 -translate-y-1/2 w-44 h-32 rounded-xl border-4 border-gold/80 bg-[#3a2a12] grid place-items-center shadow-xl',
        style: `right:-12rem; transition: right ${duration()}ms linear;`,
      },
      h('div', { class: 'flex items-center gap-3 text-2xl text-amber-100' }, mathEl(texFrac(properFrac(b))), h('span', { class: 'text-amber-300/70 text-base' }, 'و'), mathEl(texFrac(properFrac(c)))),
    );
    belt.append(box);
    requestAnimationFrame(() => requestAnimationFrame(() => (box.style.right = 'calc(100% - 4rem)')));
    options.innerHTML = '';
    opts.choices.forEach((ch, i) =>
      options.append(h('button', { class: 'choice justify-center text-2xl font-black', onclick: () => choose(i) }, h('span', { class: 'kbd' }, String(i + 1)), h('span', { dir: 'ltr' }, ch))),
    );
    msg.textContent = '';
    missTimer = window.setTimeout(() => fail(true), duration());
  }

  function choose(i: number) {
    if (phase !== 'run') return;
    clearTimeout(missTimer);
    const box = belt.querySelector<HTMLElement>('.box')!;
    // freeze the box where it is
    box.style.right = getComputedStyle(box).right;
    box.style.transition = 'none';
    const btns = options.querySelectorAll('button');
    btns[answer].classList.add('correct');
    if (i === answer) {
      score++;
      combo++;
      scoreEl.textContent = `📦 ${score}`;
      const gained = 5 + Math.min(10, Math.floor(combo / 3) * 2);
      xp += gained;
      awardXp(gained);
      floatXp(box, gained);
      sfx.correct(combo);
      burstAt(box, 26);
      box.classList.replace('border-gold/80', 'border-good');
      box.append(h('div', { class: 'absolute -top-3 -left-3 rotate-[-12deg] chip bg-good text-space-950 border-good font-black anim-pop' }, `م.م.أ = ${L}`));
      msg.className = 'min-h-8 text-center text-lg font-bold mt-3 text-good';
      msg.textContent = '✓ تم شحن الصندوق!';
      if (score >= 20) unlock('factory-20');
      phase = 'wait';
      waitTimer = window.setTimeout(spawn, 600);
    } else {
      btns[i].classList.add('wrong');
      fail(false);
    }
  }

  function fail(timeout: boolean) {
    if (phase !== 'run') return;
    combo = 0;
    lives--;
    renderLives();
    sfx.wrong();
    const box = belt.querySelector<HTMLElement>('.box');
    if (box) {
      box.classList.replace('border-gold/80', 'border-bad');
      box.classList.add('anim-shake');
    }
    options.querySelectorAll('button')[answer]?.classList.add('correct');
    msg.className = 'min-h-8 text-center text-lg font-bold mt-3 text-bad';
    msg.textContent = `${timeout ? '⌛ فات الصندوق!' : '✗ خطأ!'} م.م.أ الصحيح هو ${L}`;
    phase = 'wait';
    waitTimer = window.setTimeout(lives > 0 ? spawn : finish, 1400);
  }

  function ready() {
    options.innerHTML = '';
    options.append(
      h('div', { class: 'col-span-full flex flex-col items-center gap-3 py-4' }, h('p', { class: 'text-slate-300' }, `لديك ${LIVES} محاولات. كلما شحنت صناديق أكثر زادت سرعة الحزام!`), h('button', { class: 'btn btn-primary text-xl px-10', onclick: spawn }, 'شغّل المصنع ', h('span', { class: 'kbd' }, 'Enter'))),
    );
  }

  function finish() {
    phase = 'done';
    belt.querySelectorAll('.box').forEach((b) => b.remove());
    const prev = getSave().lessons['2-5']?.gameBest ?? 0;
    update((s) => {
      const lp = lesson(s, '2-5');
      lp.gameBest = Math.max(lp.gameBest, score);
    });
    if (score > prev) {
      sfx.win();
      confetti();
    }
    options.innerHTML = '';
    msg.textContent = '';
    options.append(
      h(
        'div',
        { class: 'col-span-full flex flex-col items-center gap-4 py-2 anim-pop' },
        h('h2', { class: 'text-3xl font-black title-glow' }, score > prev ? 'رقم قياسي جديد! 🏆' : 'أُغلق المصنع!'),
        h('div', { class: 'grid grid-cols-2 gap-3 w-full max-w-sm' }, statBox('صناديق', String(score), 'text-good'), statBox('XP', `+${xp}`, 'text-gold')),
        h('div', { class: 'flex gap-3' }, h('button', { class: 'btn btn-primary', onclick: () => go('/station/2-5/factory') }, '↻ مرة أخرى ', h('span', { class: 'kbd' }, 'Enter')), h('button', { class: 'btn', onclick: () => go(back) }, 'المحطة')),
      ),
    );
  }

  ready();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'ready') spawn();
      else if (phase === 'done') go('/station/2-5/factory');
      return;
    }
    if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
  });
  return () => {
    off();
    clearTimeout(missTimer);
    clearTimeout(waitTimer);
    addTime('2-5', Date.now() - started);
  };
}
