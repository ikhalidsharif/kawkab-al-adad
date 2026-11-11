import { sfx } from '../../core/audio';
import { h, onKey, svg } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import { makeRng, newSeed, type Rng } from '../../core/rng';
import { rich } from '../../core/tex';
import { randomTriple } from '../../generators/l3_5';
import { round1 } from '../../generators/util';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { gameOver } from './gameKit';

const ROUNDS = 6;

export interface RescueRound {
  L: number; // ladder length
  h: number; // window height
  q: number; // correct base distance
  options: number[];
}

/** Rounds 1–3 use triples (exact), later ones round to the nearest tenth. Distractors are classic mistakes. */
export function rescueRound(rng: Rng, i: number): RescueRound {
  let L: number, hh: number, q: number;
  if (i < 3) {
    const [x, y, z] = randomTriple(rng, 30);
    [L, hh, q] = [z, Math.max(x, y), Math.min(x, y)];
  } else {
    L = rng.int(8, 15);
    hh = rng.int(Math.ceil(L * 0.6), L - 1);
    q = round1(Math.sqrt(L * L - hh * hh));
  }
  const wrong = [round1(L - hh), round1(Math.sqrt(L * L + hh * hh)), round1(q + 1.5), round1(Math.max(0.5, q - 1.2)), round1(L / 2)];
  const set = new Set<number>([q]);
  for (const w of rng.shuffle(wrong)) if (set.size < 4 && w > 0 && Math.abs(w - q) > 0.05) set.add(w);
  return { L, h: hh, q, options: rng.shuffle([...set]) };
}

/** "مهمة الإنقاذ": choose how far from the wall to put a ladder so it reaches the window exactly. */
export function rescueLadder(root: HTMLElement): () => void {
  const back = '/station/3-5';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let i = 0;
  let saved = 0;
  let xp = 0;
  let cur: RescueRound;
  let busy = false;
  let done = false;

  const dots = progressDots(ROUNDS);
  const savedChip = h('span', { class: 'chip text-good border-good/50 font-black text-lg mr-auto' }, '🧑‍🚒 0');
  const scene = svg('svg', { viewBox: '0 0 220 170', class: 'w-full max-w-xl mx-auto' });
  const prompt = h('div', { class: 'text-xl font-bold text-center my-3' });
  const opts = h('div', { class: 'grid grid-cols-2 md:grid-cols-4 gap-3' });
  const status = h('div', { class: 'text-center min-h-8 font-bold mt-3' });
  const host = h('div', null, h('div', { class: 'panel p-5' }, scene, prompt, opts, status));
  root.append(titleBar('مهمة الإنقاذ 🚒', 'السلّم هو الوتر، والجدار والأرض ساقان. اختر بُعد قاعدة السلّم عن الجدار ليصل طرفه إلى النافذة تماماً.', back), h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, savedChip), host);

  const SCALE = 140 / 30;
  function drawScene(base?: number, ok?: boolean) {
    const wallX = 170;
    const ground = 160;
    const winY = ground - cur.h * SCALE;
    const nodes: SVGElement[] = [
      svg('rect', { x: wallX, y: 10, width: 40, height: ground - 10, fill: '#1b2750', stroke: '#2a3a6e' }),
      svg('rect', { x: wallX + 6, y: winY - 8, width: 22, height: 16, fill: '#fbbf24', opacity: 0.9, rx: 2 }),
      svg('text', { x: wallX + 17, y: winY - 12, 'text-anchor': 'middle', 'font-size': 12 }, '🙋'),
      svg('line', { x1: 0, y1: ground, x2: 220, y2: ground, stroke: '#64748b', 'stroke-width': 2 }),
      svg('text', { x: wallX - 4, y: (ground + winY) / 2, 'text-anchor': 'end', fill: '#a78bfa', 'font-size': 9 }, `ع = ${cur.h} م`),
    ];
    if (base !== undefined) {
      const reach = Math.sqrt(Math.max(0, cur.L * cur.L - base * base));
      const bx = wallX - base * SCALE;
      const ty = ground - reach * SCALE;
      nodes.push(
        svg('line', { x1: bx, y1: ground, x2: wallX, y2: ty, stroke: ok ? '#4ade80' : '#fb7185', 'stroke-width': 3, 'stroke-linecap': 'round' }),
        svg('text', { x: (bx + wallX) / 2, y: ground + 9, 'text-anchor': 'middle', fill: '#22d3ee', 'font-size': 9 }, `ق = ${base} م`),
      );
    }
    scene.replaceChildren(...nodes);
  }

  function setup() {
    dots.set(i, 'current');
    cur = rescueRound(rng, i);
    busy = false;
    prompt.replaceChildren(rich(`طول السلّم $\\text{ل} = ${cur.L}$ م، والنافذة على ارتفاع $\\text{ع} = ${cur.h}$ م. كم يجب أن يبعد أسفل السلّم عن الجدار${i >= 3 ? ' (لأقرب جزء من عشرة)' : ''}؟`));
    opts.replaceChildren(...cur.options.map((o, k) => h('button', { class: 'choice justify-center text-xl font-bold', onclick: () => choose(k) }, h('span', { class: 'kbd' }, String(k + 1)), h('span', { dir: 'ltr' }, `${o} م`))));
    status.textContent = '';
    drawScene();
  }

  function choose(k: number) {
    if (busy || done) return;
    busy = true;
    const pick = cur.options[k];
    const ok = Math.abs(pick - cur.q) < 0.05;
    drawScene(pick, ok);
    const btns = opts.querySelectorAll('button');
    btns[cur.options.indexOf(cur.q)].classList.add('correct');
    if (ok) {
      saved++;
      xp += 12;
      awardXp(12);
      floatXp(scene, 12);
      sfx.correct(saved);
      burstAt(scene, 30);
      savedChip.textContent = `🧑‍🚒 ${saved}`;
      dots.set(i, 'good');
      status.className = 'text-center min-h-8 font-bold mt-3 text-good';
    } else {
      btns[k].classList.add('wrong');
      sfx.wrong();
      dots.set(i, 'bad');
      status.className = 'text-center min-h-8 font-bold mt-3 text-bad';
    }
    status.replaceChildren(rich(`${ok ? '✓ وصل السلّم إلى النافذة!' : '✗ السلّم لم يصل بدقة.'} $\\text{ق}^{2} = ${cur.L}^{2} - ${cur.h}^{2} = ${cur.L * cur.L - cur.h * cur.h}$ ⇐ $\\text{ق} ${i < 3 ? '=' : '\\approx'} ${cur.q}$`));
    setTimeout(() => {
      i++;
      if (i >= ROUNDS) {
        done = true;
        gameOver(host, { lesson: '3-5', score: saved, scoreLabel: 'عمليات إنقاذ', xp, replay: '/station/3-5/rescue', back, gameKey: 'rescue' });
      } else setup();
    }, 2600);
  }

  setup();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (done && e.key === 'Enter') return go('/station/3-5/rescue');
    if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
  });
  return () => {
    off();
    addTime('3-5', Date.now() - started);
  };
}
