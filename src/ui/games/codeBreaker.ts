import { parseNumber } from '../../core/answer';
import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp } from '../../core/game';
import type { Difficulty } from '../../core/question';
import { makeRng, newSeed } from '../../core/rng';
import { rich } from '../../core/tex';
import { randomSeq, term, type SeqKind, type SeqSpec } from '../../generators/l2_7';
import { texNum } from '../../generators/util';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { fmtXp, gameOver, replay } from './gameKit';

const VAULTS = 6;
const TRIES = 3;
const LEN = 7;

/** "اكسر الشيفرة": fill in the missing terms of a pattern to open each vault. */
export function codeBreaker(root: HTMLElement): () => void {
  const back = '/station/2-7';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let vault = 0;
  let opened = 0;
  let xp = 0;
  let tries = 0;
  let hinted = false;
  let spec: SeqSpec;
  let hidden: number[] = [];
  let inputs: HTMLInputElement[] = [];
  let vaultStart = 0;
  let done = false;
  let locked = false;

  const dots = progressDots(VAULTS);
  const xpChip = h('span', { class: 'chip text-gold border-gold/50 font-black mr-auto', dir: 'ltr' }, '+0 XP');
  const door = h('div', { class: 'text-7xl text-center transition-transform duration-500' }, '🔒');
  const row = h('div', { class: 'flex flex-wrap justify-center gap-2 my-6', dir: 'ltr' });
  const status = h('div', { class: 'text-center min-h-8 font-bold' });
  const hintBox = h('div', { class: 'text-center text-gold min-h-6' });
  const checkBtn = h('button', { class: 'btn btn-primary', onclick: () => check() }, 'افتح ', h('span', { class: 'kbd' }, 'Enter'));
  const hintBtn = h('button', { class: 'btn btn-gold', onclick: () => hint() }, 'اكشف القاعدة (−5 XP) ', h('span', { class: 'kbd' }, 'H'));
  const stage = h('div', { class: 'panel p-6' }, door, row, status, hintBox, h('div', { class: 'flex justify-center gap-3 mt-3' }, checkBtn, hintBtn));
  const host = h('div', null, stage);

  root.append(
    titleBar('اكسر الشيفرة 🔐', 'كل خزنة محمية بنمط. اكتشف القاعدة واكتب الأعداد المفقودة. لديك 3 محاولات لكل خزنة، والسرعة تعطيك نقاطاً إضافية.', back),
    h('div', { class: 'flex items-center gap-3 mb-4' }, dots.el, xpChip),
    host,
  );

  function setup() {
    const d: Difficulty = vault < 2 ? 1 : vault < 4 ? 2 : 3;
    const kind: SeqKind = rng.pick(vault < 2 ? (['arith', 'geom'] as const) : (['arith', 'geom', 'quad'] as const));
    spec = randomSeq(rng, kind, d);
    // geometric sequences get huge quickly: keep only a few terms visible
    const len = kind === 'geom' ? 6 : LEN;
    hidden = vault === 0 ? [len - 1] : vault < 3 ? [len - 2, len - 1] : [rng.int(2, len - 3), len - 1];
    tries = 0;
    hinted = false;
    locked = false;
    vaultStart = performance.now();
    door.textContent = '🔒';
    door.style.transform = '';
    hintBox.textContent = '';
    hintBtn.disabled = false;
    status.className = 'text-center min-h-8 font-bold text-slate-300';
    status.textContent = `الخزنة ${vault + 1} من ${VAULTS} — المحاولات: ${TRIES}`;
    dots.set(vault, 'current');
    inputs = [];
    row.replaceChildren(
      ...Array.from({ length: len }, (_, i) => {
        if (hidden.includes(i)) {
          const inp = h('input', { class: 'answer-input !w-24 !text-xl !py-2', dir: 'ltr', autocomplete: 'off', 'aria-label': `الحد ${i + 1}` });
          inputs.push(inp);
          return inp;
        }
        return h('div', { class: 'w-24 rounded-xl border-2 border-space-600 bg-space-800 py-2 text-xl font-bold text-center grid place-items-center' }, rich(`$${texNum(term(spec, i + 1))}$`));
      }),
    );
    inputs[0].focus();
  }

  function hint() {
    if (hinted || locked) return;
    hinted = true;
    hintBtn.disabled = true;
    awardXp(-5);
    xp -= 5;
    xpChip.textContent = fmtXp(xp);
    sfx.hint();
    const t1 = term(spec, 1);
    const t2 = term(spec, 2);
    hintBox.replaceChildren(
      rich(
        spec.kind === 'arith'
          ? `💡 الفرق بين كل حدّين متتاليين ثابت: $${texNum(t2.sub(t1))}$`
          : spec.kind === 'geom'
            ? `💡 كل حد = الحد السابق × $${texNum(t2.div(t1))}$`
            : '💡 الفروق بين الحدود تزداد بمقدار ثابت',
      ),
    );
  }

  function check() {
    if (locked || done) return;
    let allRight = true;
    hidden.forEach((pos, i) => {
      const p = parseNumber(inputs[i].value);
      const right = !!p && p.value.equals(term(spec, pos + 1));
      inputs[i].classList.toggle('!border-good', right);
      inputs[i].classList.toggle('!border-bad', !right);
      if (!right) allRight = false;
    });
    if (allRight) return open();
    tries++;
    sfx.wrong();
    replay(stage, 'anim-shake');
    if (tries >= TRIES) {
      locked = true;
      dots.set(vault, 'bad');
      status.className = 'text-center min-h-8 font-bold text-bad';
      status.replaceChildren(rich(`🚨 أُغلقت الخزنة! الأعداد الصحيحة: ${hidden.map((p) => `$${texNum(term(spec, p + 1))}$`).join(' ، ')}`));
      setTimeout(next, 2200);
    } else {
      status.className = 'text-center min-h-8 font-bold text-bad';
      status.textContent = `✗ الشيفرة خاطئة — المحاولات المتبقية: ${TRIES - tries}`;
      inputs.find((x) => x.classList.contains('!border-bad'))?.select();
    }
  }

  function open() {
    locked = true;
    opened++;
    const secs = (performance.now() - vaultStart) / 1000;
    const speed = secs < 20 ? 10 : secs < 40 ? 5 : 0;
    const gained = 10 + speed - tries * 3;
    xp += gained;
    xpChip.textContent = fmtXp(xp);
    awardXp(gained);
    floatXp(door, gained);
    sfx.correct(opened);
    door.textContent = '🔓';
    door.style.transform = 'scale(1.2) rotate(-8deg)';
    burstAt(door, 34);
    dots.set(vault, tries === 0 ? 'good' : 'half');
    status.className = 'text-center min-h-8 font-bold text-good';
    status.textContent = `✓ فُتحت الخزنة!${speed ? ` مكافأة سرعة +${speed}` : ''}`;
    setTimeout(next, 1300);
  }

  function next() {
    vault++;
    if (vault >= VAULTS) {
      done = true;
      gameOver(host, { lesson: '2-7', score: opened, scoreLabel: 'خزائن مفتوحة', xp, replay: '/station/2-7/code', back });
      return;
    }
    setup();
  }

  setup();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (done) return go('/station/2-7/code');
      // Enter moves to the next empty box first, then checks
      const empty = inputs.find((x) => !x.value.trim());
      if (empty && document.activeElement !== inputs[inputs.length - 1]) return empty.focus();
      return check();
    }
    if (e.code === 'KeyH') {
      e.preventDefault();
      hint();
    }
  });
  return () => {
    off();
    addTime('2-7', Date.now() - started);
  };
}
