import { sfx } from '../../core/audio';
import { h } from '../../core/dom';
import { confetti } from '../../core/fx';
import type { LessonId } from '../../core/question';
import { getSave, lesson, update } from '../../core/store';
import { go } from '../../router';
import { statBox } from '../widgets/common';

/** Save the best score and render the end-of-game panel (Enter = play again via [data-primary]). */
export function gameOver(
  host: HTMLElement,
  opts: { lesson: LessonId; score: number; scoreLabel: string; xp: number; replay: string; back: string; extra?: Node | null; gameKey?: string },
): void {
  const lp0 = getSave().lessons[opts.lesson];
  const prev = (opts.gameKey ? lp0?.gameBests?.[opts.gameKey] : lp0?.gameBest) ?? 0;
  update((s) => {
    const lp = lesson(s, opts.lesson);
    if (opts.gameKey) {
      lp.gameBests ??= {};
      lp.gameBests[opts.gameKey] = Math.max(lp.gameBests[opts.gameKey] ?? 0, opts.score);
    } else lp.gameBest = Math.max(lp.gameBest, opts.score);
  });
  const record = opts.score > prev;
  if (record) {
    sfx.win();
    confetti();
  }
  host.innerHTML = '';
  host.append(
    h(
      'div',
      { class: 'panel anim-pop p-8 flex flex-col items-center gap-5 text-center' },
      h('h2', { class: 'text-3xl font-black title-glow' }, record ? 'رقم قياسي جديد! 🏆' : 'انتهت اللعبة!'),
      h('div', { class: 'grid grid-cols-2 gap-3 w-full max-w-sm' }, statBox(opts.scoreLabel, String(opts.score), 'text-good'), statBox('XP', fmtXp(opts.xp).replace(' XP', ''), 'text-gold')),
      h('div', { class: 'text-slate-400 text-sm' }, `أفضل نتيجة: ${Math.max(prev, opts.score)}`),
      opts.extra ?? null,
      h(
        'div',
        { class: 'flex gap-3' },
        h('button', { class: 'btn btn-primary', 'data-primary': true, onclick: () => go(opts.replay) }, '↻ مرة أخرى ', h('span', { class: 'kbd' }, 'Enter')),
        h('button', { class: 'btn', onclick: () => go(opts.back) }, 'المحطة'),
      ),
    ),
  );
}

export const fmtXp = (xp: number) => `${xp >= 0 ? '+' : '−'}${Math.abs(xp)} XP`;

/** Re-trigger a CSS animation class on an element. */
export function replay(el: Element, cls: string): void {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}
