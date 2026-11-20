import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp, unlock } from '../../core/game';
import type { LessonId } from '../../core/question';
import { makeRng, newSeed, type Rng } from '../../core/rng';
import { go } from '../../router';
import { titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { fmtXp, gameOver, replay } from './gameKit';

/** One card to classify. `buckets` overrides the game's default buttons for this card. */
export interface SortCard {
  text: string;
  bucket: number;
  why: string;
  page: number;
  icon?: string;
  /** Small label above the card, e.g. "ما المسبب؟". */
  tag?: string;
  buckets?: string[];
}

export interface RapidSortConfig {
  lesson: LessonId;
  /** Route segment under /station/<lesson>/. */
  route: string;
  title: string;
  sub: string;
  intro: string;
  seconds: number;
  buckets: string[];
  cards: SortCard[];
  scoreLabel: string;
  achievement?: { id: string; at: number };
}

export function cardBuckets(cfg: Pick<RapidSortConfig, 'buckets'>, c: SortCard): string[] {
  return c.buckets ?? cfg.buckets;
}

/** Deal cards without repeats until the deck runs out, then reshuffle. */
export function dealer(rng: Rng, cards: SortCard[]): () => SortCard {
  let deck: SortCard[] = [];
  return () => {
    if (!deck.length) deck = rng.shuffle(cards);
    return deck.pop()!;
  };
}

/** A timed "classify fast" game: each card goes into one of 2–4 buckets (number keys). */
export function rapidSortGame(cfg: RapidSortConfig): (root: HTMLElement) => () => void {
  return (root) => {
    const back = `/station/${cfg.lesson}`;
    const self = `${back}/${cfg.route}`;
    const rng = makeRng(newSeed());
    const next = dealer(rng, cfg.cards);
    const started = Date.now();
    let score = 0;
    let combo = 0;
    let xp = 0;
    let left = cfg.seconds * 1000;
    let phase: 'ready' | 'run' | 'wait' | 'done' = 'ready';
    let card: SortCard | null = null;
    let tick = 0;
    let last = 0;

    const scoreEl = h('span', { class: 'chip text-good border-good/50 font-black text-lg' }, '✓ 0');
    const comboEl = h('span', { class: 'chip text-violet border-violet/50 font-bold' }, '×1');
    const xpChip = h('span', { class: 'chip text-gold border-gold/50 font-black mr-auto', dir: 'ltr' }, '+0 XP');
    const timeEl = h('span', { class: 'chip font-black text-lg', dir: 'ltr' }, `${cfg.seconds}s`);
    const bar = h('div', { class: 'h-full bg-neon transition-[width] duration-200', style: 'width:100%' });
    const tagEl = h('div', { class: 'text-sm text-slate-400 text-center' });
    const iconEl = h('div', { class: 'text-5xl text-center min-h-14' });
    const textEl = h('div', { class: 'text-xl md:text-2xl font-bold text-center leading-loose min-h-16 my-2' });
    const opts = h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4' });
    const status = h('div', { class: 'text-center min-h-8 font-bold mt-3' });
    const stage = h('div', { class: 'panel p-5' }, tagEl, iconEl, textEl, opts, status);
    const host = h('div', null, stage);
    root.append(
      titleBar(cfg.title, cfg.sub, back),
      h('div', { class: 'flex items-center gap-3 mb-2' }, timeEl, scoreEl, comboEl, xpChip),
      h('div', { class: 'h-2 rounded-full bg-space-800 overflow-hidden mb-4' }, bar),
      host,
    );

    function show() {
      phase = 'run';
      card = next();
      const bs = cardBuckets(cfg, card);
      tagEl.textContent = card.tag ?? '';
      iconEl.textContent = card.icon ?? '';
      textEl.textContent = card.text;
      status.textContent = '';
      opts.replaceChildren(...bs.map((b, i) => h('button', { class: 'choice justify-center text-lg', onclick: () => choose(i) }, h('span', { class: 'kbd' }, String(i + 1)), b)));
      replay(stage, 'anim-pop');
    }

    function choose(i: number) {
      if (phase !== 'run' || !card) return;
      const btns = opts.querySelectorAll('button');
      if (i >= btns.length) return;
      btns[card.bucket].classList.add('correct');
      if (i === card.bucket) {
        score++;
        combo++;
        const g = 4 + Math.min(8, Math.floor(combo / 4) * 2);
        xp += g;
        awardXp(g);
        sfx.hit();
        floatXp(btns[i] as HTMLElement, g);
        burstAt(btns[i] as HTMLElement, 14);
        scoreEl.textContent = `✓ ${score}`;
        if (cfg.achievement && score >= cfg.achievement.at) unlock(cfg.achievement.id);
        phase = 'wait';
        setTimeout(() => phase === 'wait' && show(), 350);
      } else {
        btns[i].classList.add('wrong');
        combo = 0;
        sfx.wrong();
        replay(stage, 'anim-shake');
        status.className = 'text-center min-h-8 font-bold mt-3 text-bad';
        status.textContent = `✗ الصحيح: ${cardBuckets(cfg, card)[card.bucket]} — ${card.why} (ص ${card.page})`;
        phase = 'wait';
        setTimeout(() => phase === 'wait' && show(), 2600);
      }
      comboEl.textContent = `×${1 + Math.floor(combo / 4)}`;
      xpChip.textContent = fmtXp(xp);
    }

    function loop(t: number) {
      if (phase === 'done') return;
      if (last) left -= t - last;
      last = t;
      const s = Math.max(0, Math.ceil(left / 1000));
      timeEl.textContent = `${s}s`;
      timeEl.classList.toggle('text-bad', s <= 10);
      bar.style.width = `${Math.max(0, (left / (cfg.seconds * 1000)) * 100)}%`;
      if (left <= 0) return finish();
      tick = requestAnimationFrame(loop);
    }

    function start() {
      show();
      tick = requestAnimationFrame(loop);
    }

    function finish() {
      phase = 'done';
      cancelAnimationFrame(tick);
      gameOver(host, { lesson: cfg.lesson, score, scoreLabel: cfg.scoreLabel, xp, replay: self, back });
    }

    textEl.textContent = cfg.intro;
    opts.replaceChildren(h('div', { class: 'col-span-full flex justify-center' }, h('button', { class: 'btn btn-primary text-xl px-10', onclick: start }, 'ابدأ ', h('span', { class: 'kbd' }, 'Enter'))));
    const off = onKey((e) => {
      if (e.key === 'Escape') return go(back);
      if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'ready') start();
        else if (phase === 'done') go(self);
        return;
      }
      if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
    });
    return () => {
      off();
      cancelAnimationFrame(tick);
      phase = 'done';
      addTime(cfg.lesson, Date.now() - started);
    };
  };
}
