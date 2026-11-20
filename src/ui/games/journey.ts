import { sfx } from '../../core/audio';
import { h, onKey } from '../../core/dom';
import { burstAt } from '../../core/fx';
import { addTime, awardXp, unlock } from '../../core/game';
import type { LessonId } from '../../core/question';
import { makeRng, newSeed, type Rng } from '../../core/rng';
import { go } from '../../router';
import { renderDiagram } from '../diagrams';
import { titleBar } from '../widgets/common';
import { floatXp } from '../widgets/toast';
import { fmtXp, gameOver, replay } from './gameKit';

/** One stop on a path through the body. `region` is a region id of the game's diagram. */
export interface JourneyStop {
  region: string;
  name: string;
  /** What happens here (the correct answer to "ماذا يحدث هنا؟"). */
  does: string;
  page: number;
}

export interface JourneyConfig {
  lesson: LessonId;
  route: string;
  title: string;
  sub: string;
  intro: string;
  diagram: string;
  /** The traveller, e.g. "اللقمة". */
  traveller: string;
  stops: JourneyStop[];
  /** Plausible wrong "next stop" names (e.g. accessory organs the food never passes through), with the reason. */
  decoys: { name: string; why: string }[];
  /** Plausible wrong "what happens here" answers. */
  wrongDoes: string[];
  lives?: number;
  achievement?: { id: string; at: number };
  /** Set for a station's secondary game (best score saved under this key). */
  gameKey?: string;
}

export interface JourneyQuestion {
  prompt: string;
  options: string[];
  correct: number;
  why: string;
  stop: number;
  kind: 'next' | 'does';
}

/** Build the question sequence for one trip: "what happens here?" at every stop and "where next?" between stops. */
export function journeyQuestions(cfg: JourneyConfig, rng: Rng): JourneyQuestion[] {
  const qs: JourneyQuestion[] = [];
  const doesPool = [...cfg.stops.map((s) => s.does), ...cfg.wrongDoes];
  cfg.stops.forEach((s, i) => {
    if (i > 0) {
      const prev = cfg.stops[i - 1];
      const wrong = rng.shuffle([...cfg.stops.filter((_, k) => k !== i && k !== i - 1).map((x) => x.name), ...cfg.decoys.map((d) => d.name)]).slice(0, 3);
      const options = rng.shuffle([s.name, ...wrong]);
      qs.push({ prompt: `خرجت ${cfg.traveller} من **${prev.name}**. إلى أين تنتقل الآن؟`, options, correct: options.indexOf(s.name), why: `بعد ${prev.name} يأتي ${s.name}.`, stop: i, kind: 'next' });
    }
    const wrong = rng.shuffle(doesPool.filter((d) => d !== s.does)).slice(0, 3);
    const options = rng.shuffle([s.does, ...wrong]);
    qs.push({ prompt: `${cfg.traveller} الآن في **${s.name}**. ماذا يحدث هنا؟`, options, correct: options.indexOf(s.does), why: `${s.name}: ${s.does} (ص ${s.page})`, stop: i, kind: 'does' });
  });
  return qs;
}

/** A guided trip along a body path on an original diagram. Number keys 1–4 answer. */
export function journeyGame(cfg: JourneyConfig): (root: HTMLElement) => () => void {
  return (root) => {
    const back = `/station/${cfg.lesson}`;
    const self = `${back}/${cfg.route}`;
    const LIVES = cfg.lives ?? 3;
    const rng = makeRng(newSeed());
    const started = Date.now();
    let lives = LIVES;
    let score = 0;
    let combo = 0;
    let xp = 0;
    let trips = 0;
    let qs: JourneyQuestion[] = [];
    let qi = 0;
    let phase: 'ready' | 'ask' | 'wait' | 'done' = 'ready';

    const ids = cfg.stops.map((s) => s.region);
    const dg = renderDiagram(cfg.diagram, { numbered: ids });
    dg.badges.forEach((b) => (b.style.display = 'none'));
    const livesEl = h('span', { class: 'text-2xl tracking-widest' });
    const scoreEl = h('span', { class: 'chip text-good border-good/50 font-black text-lg' }, '✓ 0');
    const tripEl = h('span', { class: 'chip text-violet border-violet/50 font-bold' }, 'الرحلة 1');
    const xpChip = h('span', { class: 'chip text-gold border-gold/50 font-black mr-auto', dir: 'ltr' }, '+0 XP');
    const prompt = h('div', { class: 'text-xl md:text-2xl font-bold leading-loose min-h-16 mb-3' });
    const opts = h('div', { class: 'grid grid-cols-1 gap-3' });
    const status = h('div', { class: 'min-h-8 font-bold mt-3' });
    const stage = h('div', { class: 'panel p-5' }, prompt, opts, status);
    const host = h('div', { class: 'grid md:grid-cols-[1fr_1.2fr] gap-4 items-start' }, h('div', { class: 'panel p-3' }, dg.el), stage);
    root.append(titleBar(cfg.title, cfg.sub, back), h('div', { class: 'flex items-center gap-3 mb-4' }, livesEl, scoreEl, tripEl, xpChip), host);
    const renderLives = () => (livesEl.textContent = '💚'.repeat(lives) + '🖤'.repeat(LIVES - lives));
    renderLives();

    const rich = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '«$1»');

    function newTrip() {
      trips++;
      tripEl.textContent = `الرحلة ${trips}`;
      qs = journeyQuestions(cfg, rng);
      qi = 0;
      ids.forEach((_, i) => {
        dg.mark(i, 'dg-done', false);
        dg.mark(i, 'dg-hl', false);
      });
      ask();
    }

    function ask() {
      phase = 'ask';
      const q = qs[qi];
      ids.forEach((_, i) => dg.mark(i, 'dg-hl', q.kind === 'does' && i === q.stop));
      prompt.textContent = rich(q.prompt);
      status.textContent = '';
      opts.replaceChildren(...q.options.map((o, i) => h('button', { class: 'choice text-lg', onclick: () => choose(i) }, h('span', { class: 'kbd' }, String(i + 1)), o)));
      replay(stage, 'anim-in');
    }

    function choose(i: number) {
      if (phase !== 'ask') return;
      const q = qs[qi];
      if (i >= q.options.length) return;
      const btns = opts.querySelectorAll('button');
      btns[q.correct].classList.add('correct');
      phase = 'wait';
      if (i === q.correct) {
        score++;
        combo++;
        const g = 5 + Math.min(10, Math.floor(combo / 3) * 2);
        xp += g;
        awardXp(g);
        sfx.hit();
        floatXp(btns[i] as HTMLElement, g);
        burstAt(btns[i] as HTMLElement, 14);
        scoreEl.textContent = `✓ ${score}`;
        status.className = 'min-h-8 font-bold mt-3 text-good';
        status.textContent = `✓ ${q.why}`;
        if (cfg.achievement && score >= cfg.achievement.at) unlock(cfg.achievement.id);
      } else {
        btns[i].classList.add('wrong');
        combo = 0;
        lives--;
        renderLives();
        sfx.wrong();
        replay(stage, 'anim-shake');
        const decoy = q.kind === 'next' ? cfg.decoys.find((d) => d.name === q.options[i]) : undefined;
        status.className = 'min-h-8 font-bold mt-3 text-bad';
        status.textContent = `✗ ${decoy ? decoy.why + ' ' : ''}${q.why}`;
      }
      if (q.kind === 'does') {
        dg.mark(q.stop, 'dg-done', true);
        dg.showName(q.stop);
      }
      xpChip.textContent = fmtXp(xp);
      setTimeout(advance, i === q.correct ? 1500 : 3200);
    }

    function advance() {
      if (phase === 'done') return;
      if (lives <= 0) return finish();
      qi++;
      if (qi < qs.length) return ask();
      sfx.win();
      const bonus = 10;
      xp += bonus;
      awardXp(bonus);
      xpChip.textContent = fmtXp(xp);
      newTrip();
    }

    function finish() {
      phase = 'done';
      gameOver(host, { lesson: cfg.lesson, score, scoreLabel: 'إجابات صحيحة', xp, replay: self, back, gameKey: cfg.gameKey });
    }

    prompt.textContent = cfg.intro;
    opts.replaceChildren(h('div', { class: 'flex justify-center' }, h('button', { class: 'btn btn-primary text-xl px-10', onclick: newTrip }, 'ابدأ الرحلة ', h('span', { class: 'kbd' }, 'Enter'))));
    const off = onKey((e) => {
      if (e.key === 'Escape') return go(back);
      if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'ready') newTrip();
        else if (phase === 'done') go(self);
        return;
      }
      if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
    });
    return () => {
      off();
      phase = 'done';
      addTime(cfg.lesson, Date.now() - started);
    };
  };
}
