import { h } from '../../core/dom';
import { go } from '../../router';

export function starsEl(n: number, cls = 'text-xl'): HTMLElement {
  return h(
    'span',
    { class: `inline-flex gap-0.5 ${cls}`, 'aria-label': `${n} من 3 نجوم` },
    [0, 1, 2].map((i) => h('span', { class: i < n ? 'text-gold drop-shadow-[0_0_6px_#fbbf24]' : 'text-space-600' }, '★')),
  );
}

/** Screen title row with a back button (Esc). */
export function titleBar(title: string, sub: string | null, back: string, extra?: Node): HTMLElement {
  return h(
    'div',
    { class: 'flex items-center gap-3 mb-5' },
    h('button', { class: 'btn px-3', onclick: () => go(back), title: 'رجوع (Esc)' }, '→ ', h('span', { class: 'kbd' }, 'Esc')),
    h('div', { class: 'grow' }, h('h1', { class: 'text-2xl font-black title-glow' }, title), sub ? h('div', { class: 'text-slate-400 text-sm' }, sub) : null),
    extra ?? null,
  );
}

export type DotState = 'todo' | 'good' | 'half' | 'bad' | 'current';
export function progressDots(total: number): { el: HTMLElement; set(i: number, state: DotState): void } {
  const dots = Array.from({ length: total }, () => h('span', { class: 'w-3 h-3 rounded-full bg-space-700 border border-space-600 transition' }));
  const cls = { todo: 'bg-space-700 border-space-600', good: 'bg-good border-good', half: 'bg-gold border-gold', bad: 'bg-bad border-bad', current: 'bg-neon/40 border-neon anim-pulse' };
  return {
    el: h('div', { class: 'flex gap-1.5 items-center', dir: 'rtl' }, dots),
    set(i, state) {
      dots[i].className = `w-3 h-3 rounded-full border transition ${cls[state]}`;
    },
  };
}

export function comboEl(): { el: HTMLElement; set(c: number): void } {
  const el = h('div', { class: 'chip border-violet/50 text-violet font-black transition' });
  const set = (c: number) => {
    el.textContent = c >= 2 ? `🔥 ${c} متتالية` : '🔥 0';
    el.classList.toggle('opacity-40', c < 2);
    if (c >= 2) {
      el.classList.remove('anim-pop');
      void el.offsetWidth;
      el.classList.add('anim-pop');
    }
  };
  set(0);
  return { el, set };
}

export function statBox(label: string, value: string, cls = 'text-neon'): HTMLElement {
  return h('div', { class: 'panel p-4 text-center' }, h('div', { class: `text-3xl font-black ${cls}`, dir: 'ltr' }, value), h('div', { class: 'text-slate-400 text-sm' }, label));
}
