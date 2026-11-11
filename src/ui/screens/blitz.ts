import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { confetti } from '../../core/fx';
import { addTime, awardXp, recordAnswer, refreshStars, unlock } from '../../core/game';
import type { Difficulty } from '../../core/question';
import { getSave, lesson, update } from '../../core/store';
import { scoreAnswer } from '../../core/xp';
import { getLesson } from '../../data/lessons';
import { questionFromMix } from '../../generators';
import { go } from '../../router';
import { comboEl, starsEl, statBox, titleBar } from '../widgets/common';
import { mountQuestion, type Runner } from '../widgets/questionRunner';

const DURATION = 60_000;

export function blitzScreen(root: HTMLElement, [id]: string[]): (() => void) | void {
  const l = getLesson(id);
  if (!l?.available) return go('/map');
  const back = `/station/${l.id}`;
  let runner: Runner | null = null;
  let correct = 0;
  let answered = 0;
  let combo = 0;
  let bestCombo = 0;
  let xp = 0;
  let endAt = 0;
  let raf = 0;
  let lastSec = 99;
  let phase: 'ready' | 'run' | 'done' = 'ready';

  const bar = h('div', { class: 'h-full bg-gradient-to-l from-bad via-gold to-neon', style: 'width:100%' });
  const clock = h('span', { class: 'text-3xl font-black text-neon tabular-nums', dir: 'ltr' }, '60');
  const score = h('span', { class: 'chip text-good border-good/50 font-black text-lg' }, '✓ 0');
  const comboW = comboEl();
  const host = h('div');

  root.append(
    titleBar(`تحدٍّ سريع: ${l.title}`, 'أجب عن أكبر عدد ممكن في 60 ثانية. الصعوبة تزداد مع تقدّمك!', back),
    h('div', { class: 'flex items-center gap-4 mb-3' }, clock, h('div', { class: 'grow h-3 rounded-full bg-space-800 overflow-hidden border border-space-600' }, bar), comboW.el, score),
    host,
  );

  const ready = () => {
    host.append(
      h(
        'div',
        { class: 'panel p-10 flex flex-col items-center gap-5 text-center anim-pop' },
        h('div', { class: 'text-6xl' }, '⏱️'),
        h('p', { class: 'text-lg text-slate-300 max-w-md' }, 'لا تلميحات هنا. الإجابة الخاطئة تُظهر الحل وتنتقل مباشرة. السلسلة المتتالية تضاعف نقاط XP!'),
        h('div', { class: 'text-slate-400' }, `أفضل نتيجة لك: ${getSave().lessons[l.id]?.blitzBest ?? 0}`),
        h('button', { class: 'btn btn-primary text-xl px-10', onclick: start }, 'ابدأ ', h('span', { class: 'kbd' }, 'Enter')),
      ),
    );
  };

  function start() {
    phase = 'run';
    endAt = performance.now() + DURATION;
    // setInterval (not rAF) so the clock still runs out if the tab is in the background.
    raf = window.setInterval(loop, 100);
    loop();
    nextQ();
  }

  function difficulty(): Difficulty {
    return correct < 3 ? 1 : correct < 8 ? 2 : 3;
  }

  function nextQ() {
    if (phase !== 'run') return;
    runner?.destroy();
    const q = questionFromMix(l!.mix, difficulty());
    runner = mountQuestion(host, q, {
      mode: 'blitz',
      onResolved: (r) => {
        answered++;
        if (r.correct) {
          correct++;
          combo++;
        } else combo = 0;
        bestCombo = Math.max(bestCombo, combo);
        comboW.set(combo);
        score.textContent = `✓ ${correct}`;
        const gained = r.correct ? scoreAnswer({ difficulty: q.difficulty, firstTry: true, simplified: r.simplified, combo }) : 0;
        xp += gained;
        awardXp(gained);
        recordAnswer(q, r.correct, !r.correct, combo);
        return gained;
      },
      onNext: nextQ,
    });
  }

  function loop() {
    const left = endAt - performance.now();
    if (left <= 0) return finish();
    const sec = Math.ceil(left / 1000);
    clock.textContent = String(sec);
    bar.style.width = `${(left / DURATION) * 100}%`;
    if (sec <= 10 && sec !== lastSec) {
      sfx.tick();
      clock.classList.add('text-bad');
    }
    lastSec = sec;
  }

  function finish() {
    if (phase === 'done') return;
    phase = 'done';
    clearInterval(raf);
    runner?.destroy();
    runner = null;
    clock.textContent = '0';
    bar.style.width = '0%';
    const prevBest = getSave().lessons[l!.id]?.blitzBest ?? 0;
    update((s) => {
      const lp = lesson(s, l!.id);
      lp.blitzBest = Math.max(lp.blitzBest, correct);
    });
    const [before, after] = refreshStars(l!.id);
    if (correct >= 15) unlock('blitz-15');
    const record = correct > prevBest;
    if (record || after > before) {
      sfx.win();
      confetti();
    }
    host.innerHTML = '';
    host.append(
      h(
        'div',
        { class: 'panel anim-pop p-8 flex flex-col items-center gap-5 text-center' },
        h('h2', { class: 'text-3xl font-black title-glow' }, record ? 'رقم قياسي جديد! 🏆' : 'انتهى الوقت!'),
        starsEl(after, 'text-5xl'),
        h('div', { class: 'grid grid-cols-3 gap-3 w-full max-w-lg' }, statBox('صحيحة', `${correct}/${answered}`, 'text-good'), statBox('XP', `+${xp}`, 'text-gold'), statBox('أطول سلسلة', String(bestCombo), 'text-violet')),
        (getSave().lessons[l!.id]?.practiceBest ?? 0) === 0 ? h('p', { class: 'text-slate-300' }, 'أنهِ التدريب لتحصل على نجوم هذه المحطة.') : null,
        h(
          'div',
          { class: 'flex gap-3' },
          h('button', { class: 'btn btn-primary', 'data-primary': true, onclick: () => go(`/station/${l!.id}/blitz`) }, '↻ مرة أخرى ', h('span', { class: 'kbd' }, 'Enter')),
          h('button', { class: 'btn', onclick: () => go(back) }, 'المحطة'),
        ),
      ),
    );
  }

  ready();
  const started = Date.now();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go(back);
    if (phase === 'ready' && e.key === 'Enter') {
      e.preventDefault();
      host.innerHTML = '';
      return start();
    }
    if (phase === 'done' && e.key === 'Enter') {
      e.preventDefault();
      return go(`/station/${l.id}/blitz`);
    }
    runner?.handleKey(e);
  });
  return () => {
    off();
    clearInterval(raf);
    runner?.destroy();
    addTime(l.id, Date.now() - started);
  };
}
