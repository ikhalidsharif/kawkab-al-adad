import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { getSave, update } from '../../core/store';
import { SHIPS, shipSvg } from '../../data/ships';
import { go } from '../../router';

export function startScreen(root: HTMLElement): () => void {
  const existing = getSave().profile;
  let ship = existing?.ship ?? SHIPS[0].id;

  const name = h('input', {
    class: 'answer-input text-right',
    dir: 'rtl',
    maxlength: '20',
    placeholder: 'اكتب اسمك يا قائد',
    value: existing?.name ?? '',
    'aria-label': 'الاسم',
  });
  const err = h('div', { class: 'text-bad text-sm min-h-5' });

  const shipBtns = SHIPS.map((s, i) => {
    const b = h(
      'button',
      {
        class: 'panel p-3 flex flex-col items-center gap-1 transition hover:border-neon/70',
        onclick: () => pick(s.id),
        'aria-label': s.name,
      },
      h('span', { class: 'text-neon', html: shipSvg(s.id, 'w-14 h-14') }),
      h('span', { class: 'text-sm' }, s.name),
      h('span', { class: 'kbd' }, String(i + 1)),
    );
    b.dataset.id = s.id;
    return b;
  });
  const pick = (id: string) => {
    ship = id;
    sfx.click();
    shipBtns.forEach((b) => {
      const on = b.dataset.id === id;
      b.classList.toggle('!border-neon', on);
      b.classList.toggle('!bg-neon/10', on);
      b.classList.toggle('scale-105', on);
    });
  };
  pick(ship);

  const launch = h('button', { class: 'btn btn-primary text-xl px-10 py-3', onclick: () => submit() }, 'انطلق! 🚀');

  function submit() {
    const n = name.value.trim();
    if (n.length < 2) {
      err.textContent = 'اكتب اسماً من حرفين على الأقل';
      name.focus();
      return;
    }
    update((s) => {
      s.profile = { name: n, ship, createdAt: s.profile?.createdAt ?? Date.now() };
    });
    sfx.win();
    burstAt(launch, 40);
    setTimeout(() => go('/map'), 350);
  }

  root.append(
    h(
      'div',
      { class: 'max-w-3xl mx-auto flex flex-col items-center gap-6 text-center pt-6' },
      h('div', { class: 'text-sm tracking-widest text-violet font-bold' }, 'الصف الثامن · الرياضيات · الجزء الأول ص 57–104'),
      h('h1', { class: 'text-4xl md:text-6xl font-black title-glow text-neon' }, 'مهمة الرياضيات'),
      h('h2', { class: 'text-2xl md:text-3xl font-black -mt-3' }, 'كوكب الأعداد'),
      h('p', { class: 'text-slate-300 max-w-xl' }, 'منطقتان، محطات، زعيمان، وامتحان تجريبي في النهاية. اجمع النجوم ونقاط الخبرة وجهّز نفسك للامتحان.'),
      h('div', { class: 'panel p-6 w-full flex flex-col gap-4' }, h('label', { class: 'font-bold text-right' }, 'اسم القائد'), name, err, h('div', { class: 'font-bold text-right' }, 'اختر مركبتك'), h('div', { class: 'grid grid-cols-3 md:grid-cols-6 gap-3' }, shipBtns)),
      launch,
    ),
  );
  name.focus();

  return onKey((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (/^[1-6]$/.test(e.key) && e.target !== name) {
      pick(SHIPS[Number(e.key) - 1].id);
    }
  });
}
