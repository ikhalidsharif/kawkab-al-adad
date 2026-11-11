import { sfx } from '../../core/audio';
import { h } from '../../core/dom';
import { confetti } from '../../core/fx';
import type { Difficulty, LessonId } from '../../core/question';
import { getLesson } from '../../data/lessons';
import { getGenerator, questionFromMix } from '../../generators';
import { go } from '../../router';
import { statBox } from '../widgets/common';
import { runSession } from '../widgets/session';

const PLAN: Difficulty[] = [1, 2, 2, 2, 2, 3, 2, 3, 3, 3];

/** "تدرّب على نقاط ضعفك": a practice session that rotates through the given lessons. */
export function weakScreen(root: HTMLElement, [list]: string[]): (() => void) | void {
  const ids = list.split(',').filter((id) => getLesson(id)?.available) as LessonId[];
  if (!ids.length) return go('/map');
  const mixes = ids.map((id) => getLesson(id)!.mix.filter((m) => getGenerator(m.gen).lesson === id));
  return runSession(root, {
    title: 'تدرّب على نقاط ضعفك 🎯',
    sub: ids.map((id) => `${id} ${getLesson(id)!.title}`).join(' · '),
    back: '/map',
    count: PLAN.length,
    mode: 'practice',
    next: (i) => questionFromMix(mixes[i % mixes.length], PLAN[i]),
    summary: (s, host) => {
      if (s.accuracy >= 0.75) {
        sfx.win();
        confetti();
      }
      host.append(
        h(
          'div',
          { class: 'panel anim-pop p-8 flex flex-col items-center gap-5 text-center' },
          h('h2', { class: 'text-3xl font-black title-glow' }, s.accuracy >= 0.75 ? 'تحسّن رائع! 🚀' : 'استمر — التكرار يصنع الإتقان 💪'),
          h('div', { class: 'grid grid-cols-3 gap-3 w-full max-w-lg' }, statBox('الدقة', `${Math.round(s.accuracy * 100)}%`), statBox('XP', `+${s.xp}`, 'text-gold'), statBox('أطول سلسلة', String(s.bestCombo), 'text-violet')),
          h(
            'div',
            { class: 'flex flex-wrap gap-3 justify-center' },
            h('button', { class: 'btn btn-primary', 'data-primary': true, onclick: () => go(`/weak/${ids.join(',')}`) }, '↻ جولة أخرى ', h('span', { class: 'kbd' }, 'Enter')),
            h('button', { class: 'btn btn-gold', onclick: () => go('/exam') }, '🎓 امتحان تجريبي جديد'),
            ...ids.map((id) => h('button', { class: 'btn', onclick: () => go(`/station/${id}/learn`) }, `📘 راجع شرح ${id}`)),
          ),
        ),
      );
    },
  });
}
