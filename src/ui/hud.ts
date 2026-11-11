import { toggleMute } from '../core/audio';
import { h, clear } from '../core/dom';
import { dueMistakes } from '../core/mistakes';
import { getSave, subscribe } from '../core/store';
import { levelInfo, rankName } from '../core/xp';
import { shipSvg } from '../data/ships';

/** Top bar: player, level/XP, navigation, mute. Re-renders on save changes. */
export function mountHud(el: HTMLElement): void {
  const render = () => {
    clear(el);
    const s = getSave();
    if (!s.profile) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    const { level, into, need } = levelInfo(s.xp);
    const due = dueMistakes(s).length;
    const link = (href: string, label: string, badge?: number) =>
      h(
        'a',
        { href: `#${href}`, class: 'relative px-3 py-1.5 rounded-lg text-sm font-bold text-slate-300 hover:text-neon hover:bg-space-800 transition' },
        label,
        badge ? h('span', { class: 'absolute -top-1 -left-1 grid place-items-center min-w-5 h-5 px-1 rounded-full bg-bad text-[11px] text-white' }, String(badge)) : null,
      );
    el.append(
      h(
        'div',
        { class: 'max-w-6xl mx-auto flex items-center gap-4 px-4 py-2' },
        h(
          'a',
          { href: '#/map', class: 'flex items-center gap-2 text-neon shrink-0' },
          h('span', { html: shipSvg(s.profile.ship, 'w-9 h-9') }),
          h('span', { class: 'hidden sm:flex flex-col leading-tight' }, h('b', { class: 'text-white' }, s.profile.name), h('small', { class: 'text-slate-400' }, rankName(level))),
        ),
        h(
          'div',
          { class: 'flex items-center gap-2 grow max-w-xs', title: `${into} / ${need} XP` },
          h('span', { class: 'chip border-violet/60 text-violet font-black shrink-0' }, `مستوى ${level}`),
          h(
            'div',
            { class: 'grow h-2.5 rounded-full bg-space-800 overflow-hidden border border-space-600' },
            h('div', { class: 'h-full bg-gradient-to-l from-gold to-neon transition-all duration-500', style: `width:${(into / need) * 100}%` }),
          ),
          h('span', { class: 'text-xs text-gold font-bold shrink-0', dir: 'ltr' }, `${s.xp} XP`),
        ),
        h(
          'nav',
          { class: 'flex items-center gap-1 mr-auto' },
          link('/map', 'الخريطة'),
          link('/notebook', 'دفتر الأخطاء', due),
          link('/achievements', 'الإنجازات'),
          link('/parent', 'ولي الأمر'),
          h(
            'button',
            {
              class: 'px-2 py-1.5 rounded-lg hover:bg-space-800 text-lg',
              title: 'كتم الصوت (M)',
              'aria-label': 'كتم الصوت',
              onclick: () => toggleMute(),
            },
            s.muted ? '🔇' : '🔊',
          ),
        ),
      ),
    );
  };
  subscribe(render);
  render();
  addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.code === 'KeyM' && t.tagName !== 'INPUT') toggleMute();
  });
}
