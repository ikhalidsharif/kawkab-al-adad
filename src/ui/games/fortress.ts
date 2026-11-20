import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp, unlock } from '../../core/game';
import { makeRng, newSeed, type Rng } from '../../core/rng';
import { ATTACKS, DEFENCES, type Attack, type DefenceId } from '../../data/science/s2_2a';
import { go } from '../../router';
import { titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { fmtXp, gameOver, replay } from './gameKit';

const LIVES = 3;

/** Four options: the right defence plus three different ones. */
export function attackOptions(rng: Rng, a: Attack): DefenceId[] {
  const others = rng.shuffle((Object.keys(DEFENCES) as DefenceId[]).filter((d) => d !== a.defence)).slice(0, 3);
  return rng.shuffle([a.defence, ...others]);
}

/** "حصن الجسم": pathogens attack through different routes; activate the right line of defence in time. */
export function fortressGame(root: HTMLElement): () => void {
  const back = '/station/2-2a';
  const rng = makeRng(newSeed());
  const started = Date.now();
  let lives = LIVES;
  let blocked = 0;
  let combo = 0;
  let xp = 0;
  let phase: 'ready' | 'run' | 'wait' | 'done' = 'ready';
  let current: Attack | null = null;
  let options: DefenceId[] = [];
  let missTimer = 0;
  let deck: Attack[] = [];

  const livesEl = h('span', { class: 'text-2xl tracking-widest' });
  const scoreEl = h('span', { class: 'chip text-good border-good/50 font-black text-lg' }, '🛡️ 0');
  const xpChip = h('span', { class: 'chip text-gold border-gold/50 font-black mr-auto', dir: 'ltr' }, '+0 XP');
  const track = h('div', { class: 'relative h-28 rounded-2xl border border-space-600 overflow-hidden bg-gradient-to-l from-space-900 via-space-950 to-bad/20' });
  const core = h('div', { class: 'absolute left-2 top-1/2 -translate-y-1/2 text-5xl', title: 'الجسم' }, '🫀');
  const scenario = h('div', { class: 'text-xl md:text-2xl font-bold text-center leading-loose min-h-16 my-4' });
  const status = h('div', { class: 'text-center min-h-8 font-bold' });
  const opts = h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3' });
  const stage = h('div', { class: 'panel p-5' }, track, scenario, opts, status);
  const host = h('div', null, stage);
  root.append(
    titleBar('حصن الجسم 🛡️', 'مسببات المرض تهاجم من منافذ مختلفة. اختر وسيلة الدفاع الصحيحة قبل أن يصل المهاجم إلى القلب! (الأرقام 1–4)', back),
    h('div', { class: 'flex items-center gap-3 mb-4' }, livesEl, scoreEl, xpChip),
    host,
  );
  const renderLives = () => (livesEl.textContent = '💚'.repeat(lives) + '🖤'.repeat(LIVES - lives));
  renderLives();
  track.append(core);

  const duration = () => Math.max(5000, 11000 - blocked * 350);

  function nextAttack(): Attack {
    if (!deck.length) deck = rng.shuffle(ATTACKS);
    return deck.pop()!;
  }

  function spawn() {
    phase = 'run';
    current = nextAttack();
    options = attackOptions(rng, current);
    track.querySelectorAll('.invader').forEach((n) => n.remove());
    const inv = h('div', { class: 'invader absolute top-1/2 -translate-y-1/2 text-5xl drop-shadow-[0_0_10px_#fb7185]', style: `right:-4rem; transition: right ${duration()}ms linear;` }, current.icon);
    track.append(inv);
    requestAnimationFrame(() => requestAnimationFrame(() => (inv.style.right = 'calc(100% - 5rem)')));
    scenario.textContent = current.text;
    status.textContent = '';
    opts.replaceChildren(
      ...options.map((d, i) => h('button', { class: 'choice justify-center text-lg', onclick: () => choose(i) }, h('span', { class: 'kbd' }, String(i + 1)), DEFENCES[d])),
    );
    clearTimeout(missTimer);
    missTimer = window.setTimeout(() => fail(true), duration());
  }

  function freeze(): HTMLElement | null {
    const inv = track.querySelector<HTMLElement>('.invader');
    if (inv) {
      inv.style.right = getComputedStyle(inv).right;
      inv.style.transition = 'none';
    }
    return inv;
  }

  function choose(i: number) {
    if (phase !== 'run' || !current) return;
    clearTimeout(missTimer);
    const inv = freeze();
    const btns = opts.querySelectorAll('button');
    btns[options.indexOf(current.defence)].classList.add('correct');
    if (options[i] === current.defence) {
      blocked++;
      combo++;
      const g = 6 + Math.min(10, Math.floor(combo / 3) * 2);
      xp += g;
      xpChip.textContent = fmtXp(xp);
      awardXp(g);
      sfx.hit();
      if (inv) {
        floatXp(inv, g);
        burstAt(inv, 26);
        inv.textContent = '💥';
      }
      scoreEl.textContent = `🛡️ ${blocked}`;
      status.className = 'text-center min-h-8 font-bold text-good';
      status.textContent = `✓ تم صدّ الهجوم! ${current.why}`;
      if (blocked >= 20) unlock('fortress-20');
      phase = 'wait';
      setTimeout(spawn, 1300);
    } else {
      btns[i].classList.add('wrong');
      fail(false);
    }
  }

  function fail(timeout: boolean) {
    if (phase !== 'run' || !current) return;
    freeze();
    combo = 0;
    lives--;
    renderLives();
    sfx.wrong();
    replay(stage, 'anim-shake');
    opts.querySelectorAll('button')[options.indexOf(current.defence)]?.classList.add('correct');
    status.className = 'text-center min-h-8 font-bold text-bad';
    status.textContent = `${timeout ? '⌛ وصل المهاجم!' : '✗ ليست الوسيلة المناسبة.'} الصحيح: ${DEFENCES[current.defence]} — ${current.why} (ص ${current.page})`;
    phase = 'wait';
    setTimeout(lives > 0 ? spawn : finish, 3200);
  }

  function finish() {
    phase = 'done';
    track.querySelectorAll('.invader').forEach((n) => n.remove());
    gameOver(host, { lesson: '2-2a', score: blocked, scoreLabel: 'هجمات تم صدّها', xp, replay: '/station/2-2a/fortress', back });
  }

  scenario.textContent = 'كل هجوم يدخل من منفذ مختلف: الجلد، الأنف، الطعام، الجروح، الدم… الهجمات تتسارع كلما صددت أكثر.';
  opts.replaceChildren(h('div', { class: 'col-span-full flex justify-center' }, h('button', { class: 'btn btn-primary text-xl px-10', onclick: spawn }, 'دافع عن الجسم ', h('span', { class: 'kbd' }, 'Enter'))));
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'ready') spawn();
      else if (phase === 'done') go('/station/2-2a/fortress');
      return;
    }
    if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
  });
  return () => {
    off();
    clearTimeout(missTimer);
    addTime('2-2a', Date.now() - started);
  };
}
