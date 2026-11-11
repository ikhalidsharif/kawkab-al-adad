import { h, onKey } from '../../core/dom';
import { go } from '../../router';
import { titleBar } from '../widgets/common';

export function comingSoonScreen(root: HTMLElement, [what]: string[]): () => void {
  const title = what === 'exam' ? 'الامتحان التجريبي' : `زعيم الفصل ${what.split('/')[1]}`;
  root.append(
    titleBar(title, null, '/map'),
    h('div', { class: 'panel p-10 text-center flex flex-col items-center gap-3' }, h('div', { class: 'text-6xl' }, '🛠️'), h('p', { class: 'text-lg text-slate-300' }, 'هذه المنطقة قيد الإنشاء — تُفتح عند اكتمال محطات الفصل.')),
  );
  return onKey((e) => e.key === 'Escape' && go('/map'));
}
