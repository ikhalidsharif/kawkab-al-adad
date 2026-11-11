import { h } from '../../core/dom';

let host: HTMLElement | null = null;

export function toast(text: string, icon = '✨', ms = 3200): void {
  if (typeof document === 'undefined') return;
  host ??= document.body.appendChild(h('div', { class: 'fixed top-20 left-4 z-[80] flex flex-col gap-2 items-start' }));
  const el = h(
    'div',
    { class: 'panel anim-pop flex items-center gap-3 px-4 py-3 text-base font-bold border-gold/60' },
    h('span', { class: 'text-2xl' }, icon),
    text,
  );
  host.append(el);
  setTimeout(() => {
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, ms);
}

/** Floating "+15 XP" near an element. */
export function floatXp(anchor: Element, amount: number): void {
  const r = anchor.getBoundingClientRect();
  const el = h('div', { class: 'xp-float text-2xl' }, `${amount > 0 ? '+' : ''}${amount} XP`);
  el.style.left = `${r.left + r.width / 2 - 30}px`;
  el.style.top = `${r.top - 10}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1000);
}

/** Modal confirm dialog, resolves true/false. Keyboard: Enter = confirm, Esc = cancel. */
export function confirmDialog(title: string, body: string, okText = 'تأكيد', danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    const close = (v: boolean) => {
      removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
      resolve(v);
    };
    // Capture phase: keep keys away from the screen underneath (native Enter on the focused button still works).
    const onKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') close(false);
    };
    const ok = h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onclick: () => close(true) }, okText);
    const overlay = h(
      'div',
      { class: 'fixed inset-0 z-[90] grid place-items-center bg-black/60' },
      h(
        'div',
        { class: 'panel anim-pop max-w-md w-[90%] p-6 flex flex-col gap-4' },
        h('h2', { class: 'text-xl font-black' }, title),
        h('p', { class: 'text-slate-300' }, body),
        h('div', { class: 'flex gap-3 justify-end' }, h('button', { class: 'btn', onclick: () => close(false) }, 'إلغاء'), ok),
      ),
    );
    addEventListener('keydown', onKeyDown, true);
    document.body.append(overlay);
    ok.focus();
  });
}
