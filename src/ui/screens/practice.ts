import { sfx } from '../../core/audio';
import { lessonLabel } from '../../core/question';
import { h } from '../../core/dom';
import { confetti } from '../../core/fx';
import { addTime, refreshStars, unlock } from '../../core/game';
import type { Difficulty } from '../../core/question';
import { lesson, update } from '../../core/store';
import { getLesson } from '../../data/lessons';
import { questionFromMix } from '../../generators';
import { go } from '../../router';
import { starsEl, statBox } from '../widgets/common';
import { runSession } from '../widgets/session';

export const PRACTICE_PLAN: Difficulty[] = [1, 1, 2, 2, 2, 3, 3, 3];

export function practiceScreen(root: HTMLElement, [id]: string[]): (() => void) | void {
  const l = getLesson(id);
  if (!l?.available) return go('/map');
  const started = Date.now();
  let lastGen = '';

  const stop = runSession(root, {
    title: `تدريب: ${l.title}`,
    sub: `محطة ${lessonLabel(l.id)} · 8 أسئلة متدرجة`,
    back: `/station/${l.id}`,
    count: PRACTICE_PLAN.length,
    mode: 'practice',
    next: (i) => {
      // Avoid the same question type twice in a row when possible.
      let q = questionFromMix(l.mix, PRACTICE_PLAN[i]);
      for (let t = 0; t < 3 && q.gen === lastGen; t++) q = questionFromMix(l.mix, PRACTICE_PLAN[i]);
      lastGen = q.gen;
      return q;
    },
    summary: (s, host) => {
      update((st) => {
        const lp = lesson(st, l.id);
        lp.practiceBest = Math.max(lp.practiceBest, s.accuracy);
      });
      const [before, after] = refreshStars(l.id);
      if (s.results.every((x) => x.r.correct && x.r.firstTry)) unlock('perfect-practice');
      if (after > before || s.accuracy >= 0.75) {
        sfx.win();
        confetti();
      }
      const pct = Math.round(s.accuracy * 100);
      host.append(
        h(
          'div',
          { class: 'panel anim-pop p-8 flex flex-col items-center gap-5 text-center' },
          h('h2', { class: 'text-3xl font-black title-glow' }, pct >= 90 ? 'أداء أسطوري! 🏆' : pct >= 75 ? 'عمل ممتاز! 🚀' : pct >= 50 ? 'جيد، واصل التدريب 💪' : 'لا بأس، راجع الشرح وحاول مجدداً 📘'),
          starsEl(after, 'text-5xl'),
          after > before ? h('div', { class: 'text-gold font-bold' }, `+${after - before} نجمة جديدة!`) : null,
          h('div', { class: 'grid grid-cols-3 gap-3 w-full max-w-lg' }, statBox('الدقة', `${pct}%`), statBox('XP', `+${s.xp}`, 'text-gold'), statBox('أطول سلسلة', String(s.bestCombo), 'text-violet')),
          after < 3 && s.accuracy >= 0.9 ? h('p', { class: 'text-slate-300' }, 'للنجمة الثالثة: 8 إجابات صحيحة أو أكثر في التحدي السريع!') : null,
          s.results.some((x) => !x.r.correct || !x.r.firstTry) ? h('p', { class: 'text-slate-400 text-sm' }, '📓 أُضيفت الأسئلة التي أخطأت فيها إلى دفتر الأخطاء.') : null,
          h(
            'div',
            { class: 'flex flex-wrap gap-3 justify-center' },
            h('button', { class: 'btn btn-primary', 'data-primary': true, onclick: () => go(`/station/${l.id}/blitz`) }, '⏱️ التحدي السريع ', h('span', { class: 'kbd' }, 'Enter')),
            h('button', { class: 'btn', onclick: () => go(`/station/${l.id}/practice`) }, '↻ تدريب جديد'),
            h('button', { class: 'btn', onclick: () => go(`/station/${l.id}`) }, 'المحطة'),
          ),
        ),
      );
    },
  });
  return () => {
    stop();
    addTime(l.id, Date.now() - started);
  };
}
