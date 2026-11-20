import { sfx } from '../../core/audio';
import { fmtTime, h, onKey, clear, isTyping } from '../../core/dom';
import { buildExam, EXAM_MS, EXAM_SIZE, gradeExam, itemLabel, type ExamReport } from '../../core/exam';
import { confetti } from '../../core/fx';
import { awardXp, recordAnswer, unlock } from '../../core/game';
import { lessonLabel, type AnswerInput, type LessonId, type Question } from '../../core/question';
import { getSave, update } from '../../core/store';
import { rich } from '../../core/tex';
import { renderDiagram } from '../diagrams';
import { answerWidget, describeAnswer, type AnswerWidget } from '../widgets/answerWidget';
import { getLesson } from '../../data/lessons';
import { go } from '../../router';
import { statBox, titleBar } from '../widgets/common';
import { confirmDialog, toast } from '../widgets/toast';

export function examScreen(root: HTMLElement): () => void {
  let phase: 'intro' | 'exam' | 'report' = 'intro';
  let questions: Question[] = [];
  let answers: AnswerInput[] = [];
  const flags = new Set<number>();
  let cur = 0;
  let curWidget: AnswerWidget | null = null;
  let startAt = 0;
  let endAt = 0;
  let timer = 0;
  let submitting = false;

  /* ---------------- intro ---------------- */
  function intro() {
    clear(root);
    const last = getSave().exams[getSave().exams.length - 1];
    root.append(
      titleBar('الامتحان التجريبي 🎓', 'محاكاة لامتحان العلوم – الجزء الأول (ص 53–97)', '/map'),
      h(
        'div',
        { class: 'panel p-8 flex flex-col items-center gap-5 text-center anim-pop' },
        h('div', { class: 'text-6xl' }, '📝'),
        h('div', { class: 'grid grid-cols-3 gap-3 w-full max-w-lg' }, statBox('سؤالاً', String(EXAM_SIZE)), statBox('دقيقة', String(EXAM_MS / 60000), 'text-gold'), statBox('درساً', '12', 'text-violet')),
        h(
          'ul',
          { class: 'text-slate-300 text-right list-disc pr-6 leading-loose max-w-xl' },
          h('li', null, 'أسئلة مختلطة من كل الدروس، مرتّبة كورقة امتحان.'),
          h('li', null, 'لا تصحيح فوري ولا تلميحات: تظهر النتيجة والحلول في النهاية.'),
          h('li', null, 'يمكنك التنقّل بين الأسئلة، وتعليم سؤال للمراجعة 🚩، وتغيير إجابتك قبل التسليم.'),
          h('li', null, 'الإجابة الصحيحة غير المبسّطة تأخذ نصف درجة — بسّط دائماً!'),
          h('li', null, 'اختصارات: Enter التالي · Shift+Enter السابق · 1–4 للاختيار · F تعليم'),
        ),
        last ? h('div', { class: 'text-slate-400' }, `آخر نتيجة: ${last.score} / ${last.total} (${Math.round((last.score / last.total) * 100)}%)`) : null,
        h('button', { class: 'btn btn-gold text-xl px-10', onclick: start }, 'ابدأ الامتحان ', h('span', { class: 'kbd' }, 'Enter')),
      ),
    );
  }

  /* ---------------- exam ---------------- */
  const clock = h('span', { class: 'chip text-neon text-lg font-black tabular-nums', dir: 'ltr' });
  const answeredChip = h('span', { class: 'chip' });
  const palette = h('div', { class: 'grid grid-cols-[repeat(auto-fill,minmax(2.4rem,1fr))] gap-1.5', dir: 'rtl' });
  const card = h('div');

  function start() {
    questions = buildExam();
    answers = questions.map(() => null);
    flags.clear();
    cur = 0;
    phase = 'exam';
    startAt = Date.now();
    endAt = startAt + EXAM_MS;
    clear(root);
    root.append(
      h(
        'div',
        { class: 'flex flex-wrap items-center gap-3 mb-4' },
        h('h1', { class: 'text-2xl font-black title-glow' }, 'الامتحان التجريبي'),
        clock,
        answeredChip,
        h('button', { class: 'btn btn-gold mr-auto', onclick: () => submit(false) }, '📤 سلّم الامتحان'),
      ),
      h('div', { class: 'panel p-3 mb-4' }, palette),
      card,
    );
    tick();
    timer = window.setInterval(tick, 500);
    show(0);
  }

  function tick() {
    const left = endAt - Date.now();
    clock.textContent = `⏱ ${fmtTime(left)}`;
    clock.classList.toggle('!text-bad', left < 5 * 60_000);
    if (left <= 0 && phase === 'exam') {
      toast('انتهى الوقت! تم تسليم الامتحان تلقائياً.', '⏰');
      void submit(true);
    }
  }

  function renderPalette() {
    const answered = answers.filter((a) => a !== null && a !== '').length;
    answeredChip.textContent = `أُجيب: ${answered} / ${EXAM_SIZE}`;
    palette.replaceChildren(
      ...questions.map((_, i) => {
        const done = answers[i] !== null && answers[i] !== '';
        return h(
          'button',
          {
            class: `relative h-9 rounded-lg text-sm font-bold border transition ${i === cur ? 'ring-2 ring-neon' : ''} ${done ? 'bg-neon/25 border-neon/60 text-white' : 'bg-space-800 border-space-600 text-slate-400'} ${flags.has(i) ? '!border-gold' : ''}`,
            onclick: () => show(i),
            'aria-label': `السؤال ${i + 1}`,
          },
          String(i + 1),
          flags.has(i) ? h('span', { class: 'absolute -top-2 -left-1 text-xs' }, '🚩') : null,
        );
      }),
    );
  }

  function show(i: number) {
    cur = Math.max(0, Math.min(EXAM_SIZE - 1, i));
    const q = questions[cur];
    const body = h('div', { class: 'panel anim-in p-6 md:p-8 flex flex-col gap-5' });
    body.append(
      h(
        'div',
        { class: 'flex items-center gap-2 text-sm' },
        h('span', { class: 'chip text-violet' }, `السؤال ${cur + 1} من ${EXAM_SIZE}`),
        h('span', { class: 'text-slate-400' }, `المحطة ${lessonLabel(q.lesson)}`),
        flags.has(cur) ? h('span', { class: 'chip text-gold border-gold/50' }, '🚩 للمراجعة') : null,
      ),
      h('div', { class: 'text-xl md:text-2xl leading-loose font-bold' }, rich(q.prompt)),
    );
    if (q.diagram && q.answer.kind !== 'label') body.append(renderDiagram(q.diagram).el);
    const index = cur;
    curWidget = answerWidget(q, {
      onChange: (v) => {
        answers[index] = v;
        if (q.answer.kind === 'choice' || q.answer.kind === 'label') sfx.click();
        renderPalette();
      },
    });
    curWidget.setValue(answers[cur]);
    body.append(curWidget.el);
    setTimeout(() => curWidget?.focus());
    body.append(
      h(
        'div',
        { class: 'flex flex-wrap gap-3 justify-center' },
        h('button', { class: 'btn', onclick: () => show(cur - 1), disabled: cur === 0 }, '→ السابق'),
        h('button', { class: `btn ${flags.has(cur) ? 'btn-gold' : ''}`, onclick: () => toggleFlag() }, flags.has(cur) ? '🚩 أزل التعليم ' : '🚩 علّم للمراجعة ', h('span', { class: 'kbd' }, 'F')),
        answers[cur] !== null ? h('button', { class: 'btn', onclick: () => clearAnswer() }, 'امسح الإجابة') : null,
        cur < EXAM_SIZE - 1
          ? h('button', { class: 'btn btn-primary', onclick: () => show(cur + 1) }, 'التالي ← ', h('span', { class: 'kbd' }, 'Enter'))
          : h('button', { class: 'btn btn-gold', onclick: () => submit(false) }, '📤 سلّم الامتحان'),
      ),
    );
    card.replaceChildren(body);
    renderPalette();
  }

  function toggleFlag() {
    if (flags.has(cur)) flags.delete(cur);
    else flags.add(cur);
    show(cur);
  }
  function clearAnswer() {
    answers[cur] = null;
    show(cur);
  }

  async function submit(auto: boolean) {
    if (phase !== 'exam' || submitting) return;
    if (!auto) {
      const blank = answers.filter((a) => a === null || a === '').length;
      const msg = [blank ? `لم تُجب عن ${blank} ${blank === 1 ? 'سؤال' : 'أسئلة'}.` : 'أجبت عن كل الأسئلة.', flags.size ? `لديك ${flags.size} مُعلَّم للمراجعة.` : '', 'هل تريد تسليم الامتحان؟'].filter(Boolean).join(' ');
      submitting = true;
      const ok = await confirmDialog('تسليم الامتحان', msg, 'سلّم');
      submitting = false;
      if (!ok || phase !== 'exam') return;
    }
    clearInterval(timer);
    phase = 'report';
    report(gradeExam(questions, answers), Math.min(EXAM_MS, Date.now() - startAt));
  }

  /* ---------------- report ---------------- */
  function report(r: ExamReport, durationMs: number) {
    const pct = Math.round((r.score / r.total) * 100);
    update((s) => {
      s.exams.push({ date: Date.now(), score: r.score, total: r.total, durationMs, byLesson: r.byLesson });
      if (s.exams.length > 30) s.exams.splice(0, s.exams.length - 30);
    });
    r.items.forEach((it) => recordAnswer(it.q, it.status === 'correct', it.status !== 'correct', 0));
    awardXp(Math.round(r.score * 10));
    unlock('exam-done');
    if (pct >= 90) unlock('exam-90');
    if (pct >= 75) {
      sfx.win();
      confetti();
    }
    const lessons = Object.entries(r.byLesson) as [LessonId, { correct: number; total: number }][];
    const weakOrMedium = lessons.filter(([, v]) => v.correct < v.total).map(([k]) => k);
    const practiceIds = r.weak.length ? r.weak : weakOrMedium;
    clear(root);
    root.append(
      titleBar('تقرير الامتحان التجريبي', `المدة: ${fmtTime(durationMs)}`, '/map'),
      h(
        'div',
        { class: 'panel anim-pop p-8 flex flex-col items-center gap-4 text-center mb-5' },
        h('div', { class: `text-6xl font-black ${pct >= 75 ? 'text-good' : pct >= 50 ? 'text-gold' : 'text-bad'}`, dir: 'ltr' }, `${r.score} / ${r.total}`),
        h('div', { class: 'text-2xl font-bold' }, `${pct}% — ${pct >= 90 ? 'ممتاز! أنت جاهز للامتحان 🏆' : pct >= 75 ? 'جيد جداً، راجع بعض النقاط 🚀' : pct >= 50 ? 'مقبول، تحتاج مزيداً من التدريب 💪' : 'ابدأ بنقاط ضعفك ثم أعد المحاولة 📘'}`),
        h('div', { class: 'text-gold font-bold' }, `+${Math.round(r.score * 10)} XP`),
        practiceIds.length
          ? h('button', { class: 'btn btn-primary text-lg', 'data-primary': true, onclick: () => go(`/weak/${practiceIds.join(',')}`) }, '🎯 تدرّب على نقاط ضعفك ', h('span', { class: 'kbd' }, 'Enter'))
          : h('div', { class: 'text-good font-bold' }, '✓ لا توجد نقاط ضعف في هذا الامتحان!'),
      ),
      h(
        'div',
        { class: 'grid md:grid-cols-2 gap-4 mb-5' },
        h('div', { class: 'panel p-4' }, h('h3', { class: 'font-black text-good mb-2' }, '💪 دروس قوية'), lessonList(r.strong, r), r.strong.length ? null : h('p', { class: 'text-slate-500 text-sm' }, '—')),
        h('div', { class: 'panel p-4' }, h('h3', { class: 'font-black text-bad mb-2' }, '⚠️ دروس ضعيفة'), lessonList(r.weak, r), r.weak.length ? null : h('p', { class: 'text-slate-500 text-sm' }, '—')),
      ),
      h(
        'div',
        { class: 'panel p-4 mb-5' },
        h('h3', { class: 'font-black mb-3' }, 'النتيجة حسب الدرس'),
        ...lessons.map(([id, v]) => {
          const p = Math.round((v.correct / v.total) * 100);
          return h(
            'a',
            { href: `#/station/${id}/practice`, class: 'flex items-center gap-3 py-1.5 border-b border-space-700 hover:text-neon' },
            h('b', { class: 'w-12 text-neon', dir: 'ltr' }, lessonLabel(id)),
            h('span', { class: 'grow text-sm' }, getLesson(id)?.title ?? ''),
            h('div', { class: 'w-32 h-2 rounded-full bg-space-800 overflow-hidden' }, h('div', { class: `h-full ${p >= 100 ? 'bg-good' : p >= 50 ? 'bg-gold' : 'bg-bad'}`, style: `width:${p}%` })),
            h('span', { class: 'w-14 text-sm', dir: 'ltr' }, `${v.correct}/${v.total}`),
          );
        }),
      ),
      h('h3', { class: 'font-black text-xl mb-3' }, 'مراجعة الإجابات'),
      h('div', { class: 'flex flex-col gap-3' }, ...r.items.map((it, i) => reviewItem(it, i))),
    );
  }

  function lessonList(ids: LessonId[], r: ExamReport) {
    return h('div', { class: 'flex flex-col gap-1' }, ...ids.map((id) => h('div', { class: 'text-sm' }, h('b', { class: 'text-neon ml-2', dir: 'ltr' }, lessonLabel(id)), `${getLesson(id)?.title ?? ''} (${r.byLesson[id]!.correct}/${r.byLesson[id]!.total})`)));
  }

  function reviewItem(it: ExamReport['items'][number], i: number): HTMLElement {
    const icon = it.status === 'correct' ? '✅' : it.status === 'unsimplified' ? '🟡' : it.status === 'blank' ? '⬜' : '❌';
    const yours = it.input === null ? h('span', { class: 'text-slate-500' }, 'لم تُجب') : rich(describeAnswer(it.q, it.input));
    const sol = h('div', { class: 'hidden flex-col gap-2 mt-3' }, ...it.q.solution.map((s, k) => h('div', { class: 'rounded-lg border border-neon/30 bg-neon/5 p-2 leading-loose' }, h('span', { class: 'chip ml-2' }, String(k + 1)), rich(s))));
    return h(
      'div',
      { class: `panel p-4 ${it.status === 'correct' ? '' : it.status === 'unsimplified' ? 'border-gold/50' : 'border-bad/40'}` },
      h('div', { class: 'flex items-center gap-2 text-sm mb-2' }, h('span', { class: 'text-xl' }, icon), h('b', null, `السؤال ${i + 1}`), h('span', { class: 'text-slate-400' }, `${lessonLabel(it.q.lesson)} · ${itemLabel(it.q)} · ص ${it.q.page}`)),
      h('div', { class: 'leading-loose mb-2' }, rich(it.q.prompt)),
      h('div', { class: 'flex flex-wrap gap-x-6 gap-y-1 text-sm' }, h('span', null, 'إجابتك: ', yours), it.status !== 'correct' ? h('span', { class: 'text-good' }, 'الصحيحة: ', rich(it.q.answerText)) : null),
      it.status === 'unsimplified' ? h('div', { class: 'text-gold text-sm mt-1' }, 'القيمة صحيحة لكنها ليست في أبسط صورة (نصف درجة).') : null,
      h(
        'button',
        {
          class: 'text-sm text-slate-400 underline mt-2',
          onclick: (e: Event) => {
            sol.classList.toggle('hidden');
            sol.classList.toggle('flex');
            (e.target as HTMLElement).textContent = sol.classList.contains('hidden') ? 'اعرض الحل' : 'أخفِ الحل';
          },
        },
        'اعرض الحل',
      ),
      sol,
    );
  }

  intro();
  const off = onKey(async (e) => {
    if (phase === 'intro') {
      if (e.key === 'Enter') {
        e.preventDefault();
        start();
      } else if (e.key === 'Escape') go('/map');
      return;
    }
    if (phase === 'report') {
      if (e.key === 'Escape') go('/map');
      else if (e.key === 'Enter') {
        e.preventDefault();
        root.querySelector<HTMLElement>('[data-primary]')?.click();
      }
      return;
    }
    // exam
    if (e.key === 'Escape') {
      if (await confirmDialog('الخروج من الامتحان', 'إذا خرجت الآن سيُلغى هذا الامتحان ولن تُحفظ إجاباتك.', 'اخرج', true)) {
        phase = 'report'; // stop the timer handler from submitting
        go('/map');
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) show(cur - 1);
      else if (cur < EXAM_SIZE - 1) show(cur + 1);
      else void submit(false);
      return;
    }
    if (curWidget?.handleKey(e)) return;
    // Not while typing: on an Arabic keyboard F is "ب".
    if (e.code === 'KeyF' && !isTyping(e)) {
      e.preventDefault();
      toggleFlag();
    }
  });
  return () => {
    off();
    clearInterval(timer);
  };
}
