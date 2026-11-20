import { h } from '../../core/dom';
import { lessonLabel } from '../../core/question';
import { dueMistakes } from '../../core/mistakes';
import { getSave } from '../../core/store';
import { getBoss, LESSONS, REGIONS, type LessonDef } from '../../data/lessons';
import { BOSS_SVG } from '../../data/ships';
import { starsEl } from '../widgets/common';

function node(l: LessonDef): HTMLElement {
  const lp = getSave().lessons[l.id];
  const stars = lp?.stars ?? 0;
  const ok = l.available;
  return h(
    ok ? 'a' : 'div',
    {
      href: ok ? `#/station/${l.id}` : undefined,
      class: `group flex flex-col items-center gap-1 w-32 text-center ${ok ? '' : 'opacity-45 cursor-not-allowed'}`,
      title: ok ? l.title : 'قريباً',
    },
    h(
      'div',
      {
        class: `w-20 h-20 rounded-full grid place-items-center text-xl font-black border-2 transition
          ${ok ? 'border-neon bg-space-800 text-neon group-hover:scale-110 group-hover:shadow-[0_0_30px_-4px_var(--color-neon)]' : 'border-space-600 bg-space-900 text-slate-500'}
          ${ok && stars === 0 ? 'anim-pulse' : ''} ${stars === 3 ? '!border-gold !text-gold' : ''}`,
        dir: 'ltr',
      },
      lessonLabel(l.id),
    ),
    h('div', { class: 'text-sm font-bold leading-snug' }, l.title),
    ok ? starsEl(stars, 'text-base') : h('div', { class: 'text-xs text-slate-500' }, '🔒 قريباً'),
  );
}

export function mapScreen(root: HTMLElement): void {
  const s = getSave();
  const due = dueMistakes(s).length;
  root.append(
    h(
      'div',
      { class: 'flex flex-wrap items-end justify-between gap-3 mb-6' },
      h('div', null, h('h1', { class: 'text-3xl font-black title-glow' }, `مرحباً يا ${s.profile?.name ?? 'قائد'}`), h('p', { class: 'text-slate-400' }, 'اختر محطة لتبدأ. كل محطة: تعلّم ← تدريب ← تحدٍّ سريع.')),
      h(
        'div',
        { class: 'flex gap-2' },
        due ? h('a', { href: '#/notebook', class: 'btn btn-danger' }, `📓 ${due} للمراجعة`) : null,
        h('a', { href: '#/exam', class: 'btn btn-gold' }, '🎓 الامتحان التجريبي'),
      ),
    ),
  );

  for (const r of REGIONS) {
    const lessons = LESSONS.filter((l) => l.chapter === r.chapter);
    const total = lessons.reduce((a, l) => a + (s.lessons[l.id]?.stars ?? 0), 0);
    const bossBeaten = s.bosses[`ch${r.chapter}`]?.beaten;
    root.append(
      h(
        'section',
        { class: 'panel p-6 mb-6 relative overflow-hidden' },
        h(
          'div',
          { class: 'flex flex-wrap items-center gap-3 mb-6' },
          h('h2', { class: `text-2xl font-black ${r.chapter === 2 ? 'text-neon' : 'text-violet'}` }, `المنطقة ${r.chapter - 1}: ${r.name}`),
          h('span', { class: 'text-slate-400 text-sm' }, r.sub),
          h('span', { class: 'chip mr-auto text-gold' }, `★ ${total} / ${lessons.length * 3}`),
        ),
        h(
          'div',
          { class: 'relative flex flex-wrap justify-center items-start gap-x-4 gap-y-8' },
          // path line behind the nodes
          h('div', { class: 'absolute top-10 right-12 left-12 border-t-2 border-dashed border-space-600 -z-0 hidden md:block' }),
          lessons.map((l, i) => h('div', { class: `relative z-10 ${i % 2 ? 'md:mt-10' : ''}` }, node(l))),
          h(
            'a',
            { href: `#/boss/${r.chapter}`, class: 'relative z-10 group flex flex-col items-center gap-1 w-32 text-center' },
            h(
              'div',
              { class: `w-24 h-24 rounded-2xl grid place-items-center border-2 border-bad bg-bad/10 text-bad group-hover:scale-110 transition ${bossBeaten ? 'opacity-60' : ''}` },
              h('span', { html: `<svg viewBox="0 0 64 64" class="w-14 h-14">${BOSS_SVG}</svg>` }),
            ),
            h('div', { class: 'text-sm font-black text-bad' }, `الزعيم: ${r.boss}`),
            h(
              'div',
              { class: `text-xs ${bossBeaten ? 'text-good' : getBoss(r.chapter)?.available ? 'text-bad font-bold' : 'text-slate-500'}` },
              bossBeaten ? '✓ هُزم' : getBoss(r.chapter)?.available ? '⚔️ جاهز للمعركة' : '🔒 قريباً',
            ),
          ),
        ),
      ),
    );
  }
}
