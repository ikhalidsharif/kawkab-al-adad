import { fmtTime, h, onKey } from '../../core/dom';
import { getSave, resetAll } from '../../core/store';
import { levelInfo } from '../../core/xp';
import { LESSONS } from '../../data/lessons';
import { go } from '../../router';
import { starsEl, statBox, titleBar } from '../widgets/common';
import { confirmDialog } from '../widgets/toast';

export function parentScreen(root: HTMLElement): () => void {
  const s = getSave();
  const totalTime = LESSONS.reduce((a, l) => a + (s.lessons[l.id]?.timeMs ?? 0), 0);
  const lastExam = s.exams[s.exams.length - 1];
  const acc = s.stats.totalAnswered ? Math.round((s.stats.totalCorrect / s.stats.totalAnswered) * 100) : 0;

  const bar = (pct: number) =>
    h(
      'div',
      { class: 'flex items-center gap-2' },
      h('div', { class: 'w-28 h-2 rounded-full bg-space-800 overflow-hidden' }, h('div', { class: `h-full ${pct >= 80 ? 'bg-good' : pct >= 50 ? 'bg-gold' : 'bg-bad'}`, style: `width:${pct}%` })),
      h('span', { dir: 'ltr' }, `${pct}%`),
    );

  root.append(
    titleBar('صفحة ولي الأمر', `${s.profile?.name ?? ''} · المستوى ${levelInfo(s.xp).level} · ${s.xp} XP`, '/map'),
    h(
      'div',
      { class: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-5' },
      statBox('إجمالي وقت التعلّم', fmtTime(totalTime)),
      statBox('أسئلة مُجابة', String(s.stats.totalAnswered)),
      statBox('دقة المحاولة الأولى', `${acc}%`, acc >= 75 ? 'text-good' : 'text-gold'),
      statBox('آخر امتحان تجريبي', lastExam ? `${lastExam.score}/${lastExam.total}` : '—', 'text-violet'),
    ),
    h(
      'div',
      { class: 'panel p-4 overflow-x-auto' },
      h(
        'table',
        { class: 'w-full text-sm' },
        h(
          'thead',
          null,
          h('tr', { class: 'text-slate-400 text-right' }, ['الدرس', 'النجوم', 'نسبة الإتقان', 'أسئلة', 'الوقت', 'تلميحات'].map((t) => h('th', { class: 'p-2' }, t))),
        ),
        h(
          'tbody',
          null,
          LESSONS.map((l) => {
            const lp = s.lessons[l.id];
            const mastery = lp && lp.attempts ? Math.round((lp.correct / lp.attempts) * 100) : 0;
            return h(
              'tr',
              { class: `border-t border-space-700 ${l.available ? '' : 'opacity-40'}` },
              h('td', { class: 'p-2' }, h('b', { dir: 'ltr', class: 'ml-2 text-neon' }, l.id), l.title),
              h('td', { class: 'p-2' }, starsEl(lp?.stars ?? 0, 'text-base')),
              h('td', { class: 'p-2' }, lp?.attempts ? bar(mastery) : '—'),
              h('td', { class: 'p-2' }, String(lp?.attempts ?? 0)),
              h('td', { class: 'p-2', dir: 'ltr' }, fmtTime(lp?.timeMs ?? 0)),
              h('td', { class: 'p-2' }, String(lp?.hintsUsed ?? 0)),
            );
          }),
        ),
      ),
    ),
    h('p', { class: 'text-slate-500 text-xs mt-3' }, 'نسبة الإتقان = الإجابات الصحيحة من المحاولة الأولى ÷ عدد الأسئلة في الدرس. الوقت يُحسب أثناء وجود الطالب داخل المحطة.'),
    h(
      'div',
      { class: 'panel p-4 mt-5 overflow-x-auto' },
      h('h2', { class: 'font-black text-lg mb-2' }, '🎓 سجل الامتحانات التجريبية'),
      s.exams.length
        ? h(
            'table',
            { class: 'w-full text-sm' },
            h('thead', null, h('tr', { class: 'text-slate-400 text-right' }, ['التاريخ', 'الدرجة', 'النسبة', 'المدة', 'أضعف الدروس'].map((t) => h('th', { class: 'p-2' }, t)))),
            h(
              'tbody',
              null,
              [...s.exams].reverse().slice(0, 10).map((e) => {
                const weak = Object.entries(e.byLesson)
                  .filter(([, v]) => v && v.correct / v.total < 0.5)
                  .map(([k]) => k)
                  .join('، ');
                const pct = Math.round((e.score / e.total) * 100);
                return h(
                  'tr',
                  { class: 'border-t border-space-700' },
                  h('td', { class: 'p-2' }, new Date(e.date).toLocaleDateString('ar-BH-u-nu-latn', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })),
                  h('td', { class: 'p-2', dir: 'ltr' }, `${e.score} / ${e.total}`),
                  h('td', { class: 'p-2' }, bar(pct)),
                  h('td', { class: 'p-2', dir: 'ltr' }, fmtTime(e.durationMs)),
                  h('td', { class: 'p-2 text-bad' }, weak || '—'),
                );
              }),
            ),
          )
        : h('p', { class: 'text-slate-500' }, 'لم يُجرِ الطالب امتحاناً تجريبياً بعد.'),
    ),
    h(
      'div',
      { class: 'flex justify-end mt-6' },
      h(
        'button',
        {
          class: 'btn btn-danger',
          onclick: async () => {
            if (await confirmDialog('إعادة الضبط', 'سيُحذف كل التقدّم: النجوم، XP، الإنجازات، دفتر الأخطاء ونتائج الامتحانات. لا يمكن التراجع.', 'احذف كل شيء', true)) {
              resetAll();
              go('/start');
            }
          },
        },
        '⟲ إعادة ضبط التقدّم',
      ),
    ),
  );
  return onKey((e) => e.key === 'Escape' && go('/map'));
}
