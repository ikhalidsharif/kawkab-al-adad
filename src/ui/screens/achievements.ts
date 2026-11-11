import { h, onKey } from '../../core/dom';
import { getSave } from '../../core/store';
import { ACHIEVEMENTS } from '../../data/achievements';
import { go } from '../../router';
import { titleBar } from '../widgets/common';

export function achievementsScreen(root: HTMLElement): () => void {
  const got = getSave().achievements;
  const n = ACHIEVEMENTS.filter((a) => got[a.id]).length;
  root.append(
    titleBar('لوحة الإنجازات', `${n} من ${ACHIEVEMENTS.length} شارة`, '/map'),
    h(
      'div',
      { class: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
      ACHIEVEMENTS.map((a) => {
        const at = got[a.id];
        return h(
          'div',
          { class: `panel p-4 flex flex-col items-center gap-2 text-center ${at ? 'border-gold/60' : 'opacity-50 grayscale'}` },
          h('div', { class: 'text-5xl' }, at ? a.icon : '🔒'),
          h('b', null, a.title),
          h('p', { class: 'text-xs text-slate-400' }, a.desc),
          at ? h('span', { class: 'text-[11px] text-gold' }, new Date(at).toLocaleDateString('ar-BH-u-nu-latn')) : null,
        );
      }),
    ),
  );
  return onKey((e) => e.key === 'Escape' && go('/map'));
}
