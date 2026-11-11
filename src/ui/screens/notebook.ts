import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { confetti } from '../../core/fx';
import { unlock } from '../../core/game';
import { dueMistakes, reviewMistake } from '../../core/mistakes';
import { getSave, update, type MistakeEntry } from '../../core/store';
import { getLesson } from '../../data/lessons';
import { getGenerator, makeQuestion } from '../../generators';
import { go } from '../../router';
import { statBox, titleBar } from '../widgets/common';
import { runSession } from '../widgets/session';

const MAX_REVIEW = 10;

export function notebookScreen(root: HTMLElement): () => void {
  const s = getSave();
  const due = dueMistakes(s);
  const all = s.mistakes;
  const fmt = (t: number) => (t <= Date.now() ? 'الآن' : new Date(t).toLocaleDateString('ar-BH-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'numeric' }));

  root.append(
    titleBar('دفتر الأخطاء 📓', 'كل سؤال أخطأت فيه يعود إليك: الآن، ثم بعد يوم، ثم بعد 3 أيام. أجب عنه صحيحاً 3 مرات ليُحذف.', '/map'),
    h(
      'div',
      { class: 'grid grid-cols-3 gap-3 mb-5' },
      statBox('مستحق للمراجعة', String(due.length), 'text-bad'),
      statBox('في الدفتر', String(all.length)),
      statBox('نُظّفت', String(s.stats.notebookCleared), 'text-good'),
    ),
  );

  if (due.length) {
    root.append(
      h('div', { class: 'flex justify-center mb-6' }, h('button', { class: 'btn btn-primary text-xl px-10', onclick: () => startReview() }, `راجع الآن (${Math.min(due.length, MAX_REVIEW)}) `, h('span', { class: 'kbd' }, 'Enter'))),
    );
  } else {
    root.append(h('p', { class: 'panel p-6 text-center text-slate-300 mb-6' }, all.length ? '✓ لا شيء مستحق الآن. عُد لاحقاً للمراجعة المتباعدة.' : 'الدفتر فارغ — استمر في التدريب!'));
  }

  if (all.length) {
    root.append(
      h(
        'div',
        { class: 'panel p-4 overflow-x-auto' },
        h(
          'table',
          { class: 'w-full text-sm' },
          h('thead', null, h('tr', { class: 'text-slate-400 text-right' }, h('th', { class: 'p-2' }, 'الدرس'), h('th', { class: 'p-2' }, 'نوع السؤال'), h('th', { class: 'p-2' }, 'المرحلة'), h('th', { class: 'p-2' }, 'المراجعة القادمة'))),
          h(
            'tbody',
            null,
            [...all]
              .sort((a, b) => a.due - b.due)
              .map((m) =>
                h(
                  'tr',
                  { class: 'border-t border-space-700' },
                  h('td', { class: 'p-2' }, `${m.lesson} ${getLesson(m.lesson)?.title ?? ''}`),
                  h('td', { class: 'p-2' }, safeLabel(m.gen)),
                  h('td', { class: 'p-2' }, '●'.repeat(m.box + 1) + '○'.repeat(2 - m.box)),
                  h('td', { class: `p-2 ${m.due <= Date.now() ? 'text-bad font-bold' : 'text-slate-400'}` }, fmt(m.due)),
                ),
              ),
          ),
        ),
      ),
    );
  }

  let stopSession: (() => void) | null = null;
  let off = onKey((e) => {
    if (e.key === 'Escape') go('/map');
    else if (e.key === 'Enter' && due.length) {
      e.preventDefault();
      startReview();
    }
  });

  function startReview() {
    off();
    off = () => {};
    root.innerHTML = '';
    const items: MistakeEntry[] = due.slice(0, MAX_REVIEW).filter((m) => safeLabel(m.gen) !== '');
    let cleared = 0;
    stopSession = runSession(root, {
      title: 'مراجعة دفتر الأخطاء',
      sub: 'الأسئلة نفسها التي أخطأت فيها',
      back: '/notebook',
      count: items.length,
      mode: 'review',
      next: (i) => makeQuestion(items[i].gen, items[i].seed, items[i].difficulty),
      afterAnswer: (_q, r) => {
        const m = items.find((x) => x.gen === _q.gen && x.seed === _q.seed)!;
        update((s) => {
          if (reviewMistake(s, m, r.correct && r.firstTry)) {
            cleared++;
            s.stats.notebookCleared++;
          }
        });
        if (getSave().stats.notebookCleared >= 5) unlock('notebook-5');
      },
      summary: (sum, host) => {
        sfx.win();
        if (sum.accuracy >= 0.8) confetti();
        host.append(
          h(
            'div',
            { class: 'panel anim-pop p-8 flex flex-col items-center gap-4 text-center' },
            h('h2', { class: 'text-3xl font-black title-glow' }, 'انتهت المراجعة'),
            h('div', { class: 'grid grid-cols-3 gap-3 w-full max-w-lg' }, statBox('الدقة', `${Math.round(sum.accuracy * 100)}%`), statBox('XP', `+${sum.xp}`, 'text-gold'), statBox('حُذفت من الدفتر', String(cleared), 'text-good')),
            h('p', { class: 'text-slate-400 text-sm' }, 'الأسئلة التي أجبت عنها صحيحاً ستعود بعد مدة أطول، والخاطئة تبقى للمراجعة.'),
            h('button', { class: 'btn btn-primary', 'data-primary': true, onclick: () => go('/map') }, 'إلى الخريطة ', h('span', { class: 'kbd' }, 'Enter')),
          ),
        );
      },
    });
  }

  return () => {
    off();
    stopSession?.();
  };
}

function safeLabel(gen: string): string {
  try {
    return getGenerator(gen).label;
  } catch {
    return '';
  }
}
