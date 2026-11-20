import { sfx } from '../../core/audio';
import { lessonLabel } from '../../core/question';
import { h, onKey } from '../../core/dom';
import { burstAt, confetti } from '../../core/fx';
import { awardXp, recordAnswer, unlock } from '../../core/game';
import type { Difficulty, LessonId, Question } from '../../core/question';
import { makeRng, newSeed } from '../../core/rng';
import { getSave, update } from '../../core/store';
import { rich } from '../../core/tex';
import { getBoss, getLesson, LESSONS, type BossDef } from '../../data/lessons';
import { BOSS_SVG } from '../../data/ships';
import { getGenerator, questionFromMix } from '../../generators';
import { go } from '../../router';
import { replay } from '../games/gameKit';
import { statBox, titleBar } from '../widgets/common';
import { mountQuestion, type Runner } from '../widgets/questionRunner';
import { comingSoonScreen } from './comingSoon';

const BOSS_HP = 150;
const HEARTS = 3;
const Q_TIME = 60_000;

export function bossScreen(root: HTMLElement, [chStr]: string[]): (() => void) | void {
  const boss = getBoss(Number(chStr));
  if (!boss?.available) return comingSoonScreen(root, [`boss/${chStr}`]);
  return fight(root, boss);
}

function fight(root: HTMLElement, boss: BossDef): () => void {
  const key = `ch${boss.chapter}`;
  const rng = makeRng(newSeed());
  let hp = BOSS_HP;
  let hearts = HEARTS;
  let combo = 0;
  let asked = 0;
  let runner: Runner | null = null;
  let qTimer = 0;
  let qEnd = 0;
  let phase: 'ready' | 'fight' | 'over' = 'ready';
  const misses: Partial<Record<LessonId, number>> = {};

  // Rotate through lessons so every lesson of the chapter shows up.
  const byLesson = new Map<LessonId, typeof boss.mix>();
  for (const m of boss.mix) {
    const l = getGenerator(m.gen).lesson;
    byLesson.set(l, [...(byLesson.get(l) ?? []), m]);
  }
  let queue: LessonId[] = [];
  const nextMix = () => {
    if (!queue.length) queue = rng.shuffle([...byLesson.keys()]);
    return byLesson.get(queue.shift()!)!;
  };

  const bossIcon = h('div', { class: 'w-36 h-36 text-bad drop-shadow-[0_0_25px_#fb7185] transition-transform', html: `<svg viewBox="0 0 64 64" class="w-full h-full">${BOSS_SVG}</svg>` });
  const hpFill = h('div', { class: 'h-full bg-gradient-to-l from-bad to-gold transition-all duration-500', style: 'width:100%' });
  const hpText = h('span', { class: 'text-sm font-black', dir: 'ltr' }, `${BOSS_HP} / ${BOSS_HP}`);
  const heartsEl = h('div', { class: 'text-3xl tracking-widest' });
  const timeFill = h('div', { class: 'h-full bg-neon transition-[width] duration-200', style: 'width:100%' });
  const flash = h('div', { class: 'fixed inset-0 bg-bad/30 pointer-events-none opacity-0 transition-opacity duration-300 z-30' });
  const host = h('div');

  const arena = h(
    'div',
    { class: 'panel p-5 mb-4 flex flex-col md:flex-row items-center gap-6' },
    bossIcon,
    h(
      'div',
      { class: 'grow w-full flex flex-col gap-2' },
      h('div', { class: 'flex items-center gap-3' }, h('b', { class: 'text-2xl text-bad' }, boss.name), h('span', { class: 'mr-auto' }, hpText)),
      h('div', { class: 'h-5 rounded-full bg-space-800 border border-bad/50 overflow-hidden' }, hpFill),
      h('div', { class: 'flex items-center gap-3 mt-2' }, h('span', { class: 'text-slate-400 text-sm' }, 'قلوبك:'), heartsEl, h('div', { class: 'grow h-2 rounded-full bg-space-800 overflow-hidden mr-4' }, timeFill)),
    ),
  );

  root.append(flash, titleBar(`زعيم الفصل ${boss.chapter}`, 'أسئلة مختلطة من كل دروس الفصل — بأسلوب اختبار الفصل', '/map'), arena, host);

  const renderHearts = () => (heartsEl.textContent = '❤️'.repeat(hearts) + '🖤'.repeat(HEARTS - hearts));
  renderHearts();

  function ready() {
    const lessons = LESSONS.filter((l) => l.chapter === boss.chapter);
    const best = getSave().bosses[key];
    host.replaceChildren(
      h(
        'div',
        { class: 'panel p-8 flex flex-col items-center gap-4 text-center anim-pop' },
        h('h2', { class: 'text-3xl font-black text-bad' }, `${boss.name} يعترض طريقك!`),
        h('p', { class: 'text-slate-300 max-w-xl' }, `كل إجابة صحيحة تُنقص شريط حياته، والسلسلة المتتالية تضاعف الضربة. لديك ${HEARTS} قلوب، وكل خطأ أو انتهاء وقت (60 ثانية) يكلّفك قلباً. لا تلميحات في المعركة!`),
        h('div', { class: 'flex flex-wrap justify-center gap-2' }, lessons.map((l) => h('span', { class: 'chip text-sm' }, `${lessonLabel(l.id)} ${l.title}`))),
        best?.beaten ? h('div', { class: 'text-good font-bold' }, `✓ هزمته من قبل (أفضل نتيجة: ${best.bestHpLeft} قلوب متبقية)`) : null,
        h('button', { class: 'btn btn-danger text-xl px-10', onclick: start }, '⚔️ ابدأ المعركة ', h('span', { class: 'kbd' }, 'Enter')),
      ),
    );
  }

  function start() {
    phase = 'fight';
    nextQ();
  }

  function difficulty(): Difficulty {
    return asked < 3 ? 2 : rng.pick([2, 3, 3] as const);
  }

  function nextQ() {
    if (phase !== 'fight') return;
    runner?.destroy();
    const q = questionFromMix(nextMix(), difficulty());
    asked++;
    runner = mountQuestion(host, q, {
      mode: 'boss',
      onResolved: (r) => {
        stopTimer();
        recordAnswer(q, r.correct, !r.correct, r.correct ? combo + 1 : 0);
        if (r.correct) return hit(q);
        miss(q);
        return 0;
      },
      onNext: () => {
        if (hp <= 0) return win();
        if (hearts <= 0) return lose();
        nextQ();
      },
    });
    startTimer(q);
  }

  function startTimer(q: Question) {
    stopTimer();
    qEnd = performance.now() + Q_TIME;
    qTimer = window.setInterval(() => {
      const left = qEnd - performance.now();
      timeFill.style.width = `${Math.max(0, left / Q_TIME) * 100}%`;
      timeFill.classList.toggle('!bg-bad', left < 10_000);
      if (left <= 0) {
        stopTimer();
        runner?.destroy();
        runner = null;
        miss(q);
        host.replaceChildren(
          h('div', { class: 'panel p-8 text-center flex flex-col items-center gap-3 anim-pop' }, h('div', { class: 'text-2xl font-black text-bad' }, '⌛ انتهى الوقت!'), h('div', null, 'الإجابة: ', rich(q.answerText))),
        );
        recordAnswer(q, false, true, 0);
        setTimeout(() => (hearts <= 0 ? lose() : nextQ()), 2200);
      }
    }, 200);
  }
  function stopTimer() {
    clearInterval(qTimer);
  }

  function hit(q: Question): number {
    combo++;
    const dmg = (q.difficulty === 3 ? 17 : q.difficulty === 2 ? 12 : 8) + Math.min(combo - 1, 3) * 2;
    hp = Math.max(0, hp - dmg);
    hpFill.style.width = `${(hp / BOSS_HP) * 100}%`;
    hpText.textContent = `${hp} / ${BOSS_HP}`;
    sfx.hit();
    replay(bossIcon, 'anim-shake');
    burstAt(bossIcon, 30);
    const dmgEl = h('div', { class: 'xp-float text-3xl !text-bad' }, `−${dmg}`);
    const r = bossIcon.getBoundingClientRect();
    dmgEl.style.left = `${r.left + r.width / 2 - 20}px`;
    dmgEl.style.top = `${r.top}px`;
    document.body.append(dmgEl);
    setTimeout(() => dmgEl.remove(), 1000);
    const xp = q.difficulty === 3 ? 15 : 10;
    awardXp(xp);
    return xp;
  }

  function miss(q: Question) {
    combo = 0;
    hearts--;
    misses[q.lesson] = (misses[q.lesson] ?? 0) + 1;
    renderHearts();
    flash.style.opacity = '1';
    setTimeout(() => (flash.style.opacity = '0'), 300);
    bossIcon.style.transform = 'scale(1.15)';
    setTimeout(() => (bossIcon.style.transform = ''), 300);
  }

  function win() {
    phase = 'over';
    stopTimer();
    sfx.win();
    confetti();
    setTimeout(confetti, 600);
    awardXp(100);
    const s = getSave();
    const chapterLessons = LESSONS.filter((l) => l.chapter === boss.chapter && l.available);
    const noHints = chapterLessons.every((l) => (s.lessons[l.id]?.hintsUsed ?? 0) === 0);
    update((st) => {
      const prev = st.bosses[key];
      st.bosses[key] = { beaten: true, bestHpLeft: Math.max(prev?.bestHpLeft ?? 0, hearts), noHints: noHints || !!prev?.noHints };
    });
    unlock(`boss-${boss.chapter}`);
    if (noHints && chapterLessons.every((l) => (s.lessons[l.id]?.practiceBest ?? 0) > 0)) unlock(`no-hints-ch${boss.chapter}`);
    bossIcon.style.transform = 'scale(0.2) rotate(40deg)';
    bossIcon.style.opacity = '0.2';
    end(true);
  }

  function lose() {
    phase = 'over';
    stopTimer();
    sfx.wrong();
    end(false);
  }

  function end(won: boolean) {
    runner?.destroy();
    runner = null;
    const weak = (Object.entries(misses) as [LessonId, number][]).sort((a, b) => b[1] - a[1]);
    host.replaceChildren(
      h(
        'div',
        { class: 'panel anim-pop p-8 flex flex-col items-center gap-5 text-center' },
        h('h2', { class: `text-4xl font-black ${won ? 'text-good' : 'text-bad'} title-glow` }, won ? `انتصار! هزمت ${boss.name} 🏆` : 'هُزمت هذه المرة… 💥'),
        h('div', { class: 'grid grid-cols-3 gap-3 w-full max-w-lg' }, statBox('حياة الزعيم', String(hp), 'text-bad'), statBox('قلوب متبقية', String(hearts), 'text-good'), statBox('أسئلة', String(asked))),
        won ? h('div', { class: 'text-gold font-bold' }, '+100 XP مكافأة النصر') : null,
        weak.length
          ? h(
              'div',
              { class: 'flex flex-col gap-2 items-center' },
              h('div', { class: 'text-slate-300' }, 'دروس تحتاج تدريباً:'),
              h('div', { class: 'flex flex-wrap gap-2 justify-center' }, weak.map(([id, n]) => h('a', { href: `#/station/${id}/practice`, class: 'btn text-sm' }, `${lessonLabel(id)} ${getLesson(id)?.title ?? ''} (${n})`))),
            )
          : null,
        h(
          'div',
          { class: 'flex gap-3' },
          h('button', { class: 'btn btn-primary', 'data-primary': true, onclick: () => go(`/boss/${boss.chapter}`) }, won ? '↻ معركة جديدة ' : '↻ حاول مجدداً ', h('span', { class: 'kbd' }, 'Enter')),
          h('button', { class: 'btn', onclick: () => go('/map') }, 'الخريطة'),
        ),
      ),
    );
  }

  ready();
  const off = onKey((e) => {
    if (e.key === 'Escape') return go('/map');
    if (e.key === 'Enter' && phase !== 'fight') {
      e.preventDefault();
      if (phase === 'ready') return start();
      return host.querySelector<HTMLElement>('[data-primary]')?.click();
    }
    runner?.handleKey(e);
  });
  return () => {
    off();
    stopTimer();
    runner?.destroy();
    flash.remove();
  };
}
