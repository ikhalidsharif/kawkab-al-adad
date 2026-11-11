import { parseNumber } from '../../core/answer';
import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { makeRng, newSeed } from '../../core/rng';
import { mathEl, rich } from '../../core/tex';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver, replay } from './gameKit';

const BUILD_ROUNDS = 5;
const SPEED_MS = 45_000;

/** "مربع البلاط": build a square from N tiles to find √N, then a speed round of perfect squares. */
export function tileSquare(root: HTMLElement): () => void {
  const back = '/station/3-1';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let points = 0;
  let xp = 0;
  let round = 0;
  let phase: 'build' | 'speed' | 'done' = 'build';
  let side = 1;
  let target = 0;
  let tries = 0;
  let busy = false;
  let speedTimer = 0;
  let speedEnd = 0;
  let speedQ: { tex: string; ans: number } | null = null;
  const used = new Set<number>();

  const dots = progressDots(BUILD_ROUNDS + 1);
  const pointsChip = h('span', { class: 'chip text-good border-good/50 font-black text-lg mr-auto' }, '0 نقطة');
  const host = h('div');
  root.append(
    titleBar('مربع البلاط 🟦', 'المرحلة 1: لديك عدد من البلاطات — اختر طول الضلع بالأسهم ← → لتبني بها مربعاً كاملاً. المرحلة 2: جولة سرعة للمربعات الكاملة.', back),
    h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, pointsChip),
    host,
  );
  const addPoints = (p: number, anchor: Element) => {
    points += p;
    pointsChip.textContent = `${points} نقطة`;
    const g = Math.round(p / 2);
    xp += g;
    awardXp(g);
    floatXp(anchor, g);
  };

  /* ---------- build ---------- */
  const grid = h('div', { class: 'mx-auto grid gap-[2px] transition-all', dir: 'ltr' });
  const info = h('div', { class: 'text-center text-xl font-bold my-3' });
  const status = h('div', { class: 'text-center min-h-8 font-bold' });
  const sideEl = h('span', { class: 'text-3xl font-black text-neon w-16 text-center', dir: 'ltr' });
  const buildPanel = h(
    'div',
    { class: 'panel p-6' },
    info,
    h('div', { class: 'grid place-items-center min-h-[280px]' }, grid),
    h(
      'div',
      { class: 'flex items-center justify-center gap-4 mt-4', dir: 'ltr' },
      h('button', { class: 'btn text-2xl px-4', onclick: () => setSide(side - 1) }, '−'),
      h('span', { class: 'text-slate-400' }, 'الضلع'),
      sideEl,
      h('button', { class: 'btn text-2xl px-4', onclick: () => setSide(side + 1) }, '+'),
      h('button', { class: 'btn btn-primary', onclick: () => submitBuild() }, 'ابنِ ', h('span', { class: 'kbd' }, 'Enter')),
    ),
    status,
  );

  function drawGrid() {
    const used = side * side;
    const cell = Math.max(8, Math.min(28, Math.floor(260 / side)));
    grid.style.gridTemplateColumns = `repeat(${side}, ${cell}px)`;
    grid.replaceChildren(
      ...Array.from({ length: used }, () =>
        h('div', { class: `rounded-[3px] ${used > target ? 'bg-bad/70' : used === target ? 'bg-good/80' : 'bg-neon/60'}`, style: `width:${cell}px;height:${cell}px` }),
      ),
    );
    sideEl.textContent = String(side);
    status.className = 'text-center min-h-8 font-bold text-slate-300';
    status.replaceChildren(
      rich(
        used > target
          ? `$${side} \\times ${side} = ${used}$ — لا تكفي البلاطات!`
          : `$${side} \\times ${side} = ${used}$ بلاطة — ${used === target ? 'استعملت كل البلاطات!' : `يتبقّى $${target - used}$`}`,
      ),
    );
  }
  function setSide(s: number) {
    if (busy || phase !== 'build') return;
    side = Math.max(1, Math.min(20, s));
    sfx.click();
    drawGrid();
  }
  function buildRound() {
    phase = 'build';
    dots.set(round, 'current');
    let k = rng.int(3 + round * 2, 7 + round * 3);
    while (used.has(k)) k = rng.int(3 + round * 2, 7 + round * 3);
    used.add(k);
    target = k * k;
    side = 1;
    tries = 0;
    busy = false;
    info.replaceChildren(rich(`لديك $${target}$ بلاطة. ابنِ مربعاً كاملاً بها كلها — ما $\\sqrt{${target}}$؟`));
    host.replaceChildren(buildPanel);
    drawGrid();
  }
  function submitBuild() {
    if (busy || phase !== 'build') return;
    if (side * side === target) {
      busy = true;
      sfx.correct(round);
      burstAt(grid, 30);
      addPoints(tries === 0 ? 20 : 10, grid);
      dots.set(round, tries === 0 ? 'good' : 'half');
      status.className = 'text-center min-h-8 font-bold text-good';
      status.replaceChildren(rich(`✓ $\\sqrt{${target}} = ${side}$ لأن $${side}^{2} = ${target}$`));
      setTimeout(nextRound, 1500);
    } else {
      tries++;
      sfx.wrong();
      replay(buildPanel, 'anim-shake');
    }
  }
  function nextRound() {
    round++;
    if (round < BUILD_ROUNDS) buildRound();
    else speedRound();
  }

  /* ---------- speed round ---------- */
  const sInput = h('input', { class: 'answer-input max-w-xs mx-auto block', dir: 'ltr', autocomplete: 'off' });
  const sQ = h('div', { class: 'text-5xl text-center my-6' });
  const sClock = h('div', { class: 'text-3xl font-black text-neon text-center tabular-nums', dir: 'ltr' });
  const sStatus = h('div', { class: 'text-center min-h-8 font-bold mt-2' });
  let speedCorrect = 0;

  function newSpeedQ() {
    const n = rng.int(2, 20);
    speedQ = rng.chance(0.5) ? { tex: `${n}^{2}`, ans: n * n } : { tex: `\\sqrt{${n * n}}`, ans: n };
    sQ.replaceChildren(mathEl(`${speedQ.tex} = \\;?`));
    sInput.value = '';
    sInput.focus();
  }
  function speedRound() {
    phase = 'speed';
    dots.set(round, 'current');
    host.replaceChildren(h('div', { class: 'panel p-6' }, h('div', { class: 'text-center font-bold text-lg' }, 'جولة السرعة! أجب عن أكبر عدد ممكن'), sClock, sQ, sInput, sStatus));
    speedEnd = performance.now() + SPEED_MS;
    speedTimer = window.setInterval(() => {
      const left = speedEnd - performance.now();
      sClock.textContent = String(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) endSpeed();
    }, 200);
    newSpeedQ();
  }
  function submitSpeed() {
    if (phase !== 'speed' || !speedQ) return;
    const p = parseNumber(sInput.value);
    if (!p) return;
    if (p.value.equals(speedQ.ans)) {
      speedCorrect++;
      sfx.correct(speedCorrect);
      addPoints(5, sQ);
      sStatus.className = 'text-center min-h-8 font-bold mt-2 text-good';
      sStatus.textContent = `✓ ${speedCorrect}`;
    } else {
      sfx.wrong();
      sStatus.className = 'text-center min-h-8 font-bold mt-2 text-bad';
      sStatus.replaceChildren(rich(`✗ $${speedQ.tex} = ${speedQ.ans}$`));
    }
    newSpeedQ();
  }
  function endSpeed() {
    clearInterval(speedTimer);
    phase = 'done';
    dots.set(round, speedCorrect >= 10 ? 'good' : 'half');
    gameOver(host, { lesson: '3-1', score: points, scoreLabel: 'نقاط', xp, replay: '/station/3-1/tiles', back, extra: h('p', { class: 'text-slate-300' }, `جولة السرعة: ${speedCorrect} إجابات صحيحة`) });
  }

  buildRound();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (phase === 'build') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSide(side - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSide(side + 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitBuild();
      }
    } else if (phase === 'speed' && e.key === 'Enter') {
      e.preventDefault();
      submitSpeed();
    } else if (phase === 'done' && e.key === 'Enter') {
      e.preventDefault();
      go('/station/3-1/tiles');
    }
  });
  return () => {
    off();
    clearInterval(speedTimer);
    addTime('3-1', Date.now() - started);
  };
}
