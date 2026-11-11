import { h, onKey } from '../../core/dom';
import { fmtTime } from '../../core/dom';
import { getSave } from '../../core/store';
import { getLesson } from '../../data/lessons';
import { go } from '../../router';
import { starsEl, titleBar } from '../widgets/common';

export function stationScreen(root: HTMLElement, [id]: string[]): (() => void) | void {
  const l = getLesson(id);
  if (!l || !l.available) return go('/map');
  const lp = getSave().lessons[l.id];

  const cards: { key: string; href: string; icon: string; title: string; desc: string; stat: string; done: boolean }[] = [
    { key: '1', href: 'learn', icon: '📘', title: 'تعلّم', desc: 'شرح قصير ومثال محلول خطوة بخطوة (دقيقتان).', stat: lp?.learnDone ? '✓ تمّ' : 'ابدأ من هنا', done: !!lp?.learnDone },
    { key: '2', href: 'practice', icon: '🎯', title: 'تدريب', desc: '8 أسئلة متدرجة مع تلميحات وحل خطوة بخطوة.', stat: `أفضل دقة: ${Math.round((lp?.practiceBest ?? 0) * 100)}%`, done: (lp?.practiceBest ?? 0) > 0 },
    { key: '3', href: 'blitz', icon: '⏱️', title: 'تحدٍّ سريع', desc: '60 ثانية: أكبر عدد من الإجابات الصحيحة.', stat: `أفضل نتيجة: ${lp?.blitzBest ?? 0}`, done: (lp?.blitzBest ?? 0) > 0 },
  ];
  if (l.game) cards.push({ key: '4', href: l.game.route, icon: '🕹️', title: l.game.title, desc: l.game.desc, stat: `أفضل نتيجة: ${lp?.gameBest ?? 0}`, done: (lp?.gameBest ?? 0) > 0 });
  (l.extraGames ?? []).forEach((g, i) => {
    const best = lp?.gameBests?.[g.route] ?? 0;
    cards.push({ key: String(5 + i), href: g.route, icon: '🎮', title: g.title, desc: g.desc, stat: `أفضل نتيجة: ${best}`, done: best > 0 });
  });

  root.append(
    titleBar(`محطة ${l.id}: ${l.title}`, `الفصل ${l.chapter} · صفحة ${l.page} في الكتاب`, '/map', starsEl(lp?.stars ?? 0, 'text-3xl')),
    h(
      'div',
      { class: 'grid sm:grid-cols-2 gap-4' },
      cards.map((c) =>
        h(
          'a',
          { href: `#/station/${l.id}/${c.href}`, class: 'panel p-5 flex gap-4 items-start hover:border-neon/70 hover:-translate-y-0.5 transition' },
          h('div', { class: 'text-4xl' }, c.icon),
          h(
            'div',
            { class: 'grow flex flex-col gap-1' },
            h('div', { class: 'flex items-center gap-2' }, h('b', { class: 'text-xl' }, c.title), h('span', { class: 'kbd mr-auto' }, c.key)),
            h('p', { class: 'text-slate-400 text-sm' }, c.desc),
            h('span', { class: `text-sm font-bold ${c.done ? 'text-good' : 'text-neon'}` }, c.stat),
          ),
        ),
      ),
    ),
    h(
      'div',
      { class: 'panel p-4 mt-5 text-sm text-slate-300 flex flex-wrap gap-x-6 gap-y-2' },
      h('span', null, '★ أنهِ التدريب'),
      h('span', null, '★★ دقة 75% في التدريب'),
      h('span', null, '★★★ دقة 90% في التدريب + 8 إجابات في التحدي السريع'),
      h('span', { class: 'mr-auto text-slate-500' }, `الوقت في المحطة: ${fmtTime(lp?.timeMs ?? 0)}`),
    ),
  );

  return onKey((e) => {
    if (e.key === 'Escape') go('/map');
    const c = cards.find((x) => x.key === e.key);
    if (c) go(`/station/${l.id}/${c.href}`);
  });
}
