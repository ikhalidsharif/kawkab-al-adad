import { sfx } from '../../core/audio';
import { fmtTime, h, onKey } from '../../core/dom';
import { addTime, awardXp } from '../../core/game';
import { getSave, lesson, update } from '../../core/store';
import { rich } from '../../core/tex';
import { getLesson } from '../../data/lessons';
import { go } from '../../router';
import { progressDots, titleBar } from '../widgets/common';

const LEARN_MS = 2 * 60 * 1000;

export function learnScreen(root: HTMLElement, [id]: string[]): (() => void) | void {
  const l = getLesson(id);
  if (!l?.learn) return go(`/station/${id}`);
  const content = l.learn;
  const started = Date.now();
  let slide = 0;
  let step = 0;

  const timer = h('span', { class: 'chip text-neon', dir: 'ltr' }, '2:00');
  const tick = window.setInterval(() => {
    const left = LEARN_MS - (Date.now() - started);
    timer.textContent = left > 0 ? fmtTime(left) : 'الوقت المقترح انتهى';
  }, 500);

  const dots = progressDots(content.slides.length);
  const body = h('div');
  const nextBtn = h('button', { class: 'btn btn-primary anim-pulse', onclick: () => advance() }, 'التالي ', h('span', { class: 'kbd' }, 'Enter'));
  const prevBtn = h('button', { class: 'btn', onclick: () => back() }, 'السابق');

  root.append(
    titleBar(`تعلّم: ${l.title}`, `ص ${l.page} · ${content.goal}`, `/station/${l.id}`, timer),
    content.vocab ? h('div', { class: 'flex flex-wrap gap-2 mb-4' }, h('span', { class: 'text-slate-400 text-sm' }, 'المفردات:'), content.vocab.map((v) => h('span', { class: 'chip text-violet' }, v))) : '',
    h('div', { class: 'flex justify-center mb-4' }, dots.el),
    body,
    h('div', { class: 'flex gap-3 justify-center mt-5' }, prevBtn, nextBtn),
  );

  function render() {
    body.innerHTML = '';
    const s = content.slides[slide];
    content.slides.forEach((_, i) => dots.set(i, i < slide ? 'good' : i === slide ? 'current' : 'todo'));
    const card = h(
      'div',
      { class: 'panel anim-in p-6 md:p-8 flex flex-col gap-4' },
      h('h2', { class: 'text-2xl font-black text-neon' }, s.title),
      h('div', { class: 'text-lg leading-loose' }, rich(s.body)),
    );
    (s.steps ?? []).slice(0, step).forEach((st, i) =>
      card.append(h('div', { class: `anim-in rounded-xl border p-3 text-lg leading-loose ${i === 0 ? 'border-violet/50 bg-violet/5 font-bold' : 'border-neon/30 bg-neon/5'}` }, i > 0 ? h('span', { class: 'chip ml-2' }, String(i)) : null, rich(st))),
    );
    const allShown = step >= (s.steps?.length ?? 0);
    if (allShown && s.tip) card.append(h('div', { class: 'anim-in rounded-xl border border-gold/40 bg-gold/5 p-3' }, '💡 ', rich(s.tip)));
    body.append(card);
    prevBtn.disabled = slide === 0 && step === 0;
    const last = slide === content.slides.length - 1 && allShown;
    nextBtn.firstChild!.textContent = last ? 'ابدأ التدريب ' : allShown ? 'الفكرة التالية ' : 'الخطوة التالية ';
  }

  function advance() {
    sfx.click();
    const s = content.slides[slide];
    if (step < (s.steps?.length ?? 0)) step++;
    else if (slide < content.slides.length - 1) {
      slide++;
      step = 0;
    } else return complete();
    render();
  }

  function back() {
    if (step > 0) step--;
    else if (slide > 0) {
      slide--;
      step = content.slides[slide].steps?.length ?? 0;
    }
    render();
  }

  function complete() {
    const first = !getSave().lessons[l!.id]?.learnDone;
    update((s) => {
      lesson(s, l!.id).learnDone = true;
    });
    if (first) awardXp(20);
    go(`/station/${l!.id}/practice`);
  }

  render();
  const off = onKey((e) => {
    if (e.key === 'Enter' || e.key === 'ArrowLeft') {
      e.preventDefault();
      advance();
    } else if (e.key === 'ArrowRight') back();
    else if (e.key === 'Escape') go(`/station/${l.id}`);
  });
  return () => {
    off();
    clearInterval(tick);
    addTime(l.id, Date.now() - started);
  };
}
