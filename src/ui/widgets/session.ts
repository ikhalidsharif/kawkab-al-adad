import { h, onKey } from '../../core/dom';
import { awardXp, recordAnswer } from '../../core/game';
import type { Question } from '../../core/question';
import { scoreAnswer } from '../../core/xp';
import { go } from '../../router';
import { comboEl, progressDots, titleBar } from './common';
import { mountQuestion, type QResult, type Runner } from './questionRunner';

export interface SessionSummary {
  results: { q: Question; r: QResult }[];
  xp: number;
  /** 1 per first-try correct, 0.5 per later correct, 0 when revealed. Divided by count. */
  accuracy: number;
  bestCombo: number;
  hints: number;
}

export interface SessionConfig {
  title: string;
  sub?: string;
  back: string;
  count: number;
  mode: 'practice' | 'review';
  next(i: number): Question;
  afterAnswer?(q: Question, r: QResult): void;
  summary(s: SessionSummary, root: HTMLElement): void;
}

export function runSession(root: HTMLElement, cfg: SessionConfig): () => void {
  const results: SessionSummary['results'] = [];
  let xp = 0;
  let combo = 0;
  let bestCombo = 0;
  let i = 0;
  let runner: Runner | null = null;

  const dots = progressDots(cfg.count);
  const comboW = comboEl();
  const xpChip = h('span', { class: 'chip text-gold border-gold/50 font-black', dir: 'ltr' }, '+0 XP');
  const host = h('div');
  root.append(
    titleBar(cfg.title, cfg.sub ?? null, cfg.back),
    h('div', { class: 'flex flex-wrap items-center gap-3 mb-4' }, dots.el, h('span', { class: 'grow' }), comboW.el, xpChip),
    host,
    h('p', { class: 'text-center text-slate-500 text-xs mt-4' }, 'اختصارات: Enter تحقّق/التالي · 1–4 للاختيار · H تلميح · S اعرض الحل (بعد محاولتين) · M كتم'),
  );

  const show = () => {
    runner?.destroy();
    if (i >= cfg.count) return end();
    dots.set(i, 'current');
    const q = cfg.next(i);
    runner = mountQuestion(host, q, {
      mode: cfg.mode,
      onResolved: (r) => {
        if (r.correct && r.firstTry) combo++;
        else combo = 0;
        bestCombo = Math.max(bestCombo, combo);
        comboW.set(combo);
        const gained = r.correct ? scoreAnswer({ difficulty: q.difficulty, firstTry: r.firstTry, simplified: r.simplified, combo }) : 0;
        xp += gained;
        xpChip.textContent = `+${xp} XP`;
        awardXp(gained);
        recordAnswer(q, r.correct && r.firstTry, !r.correct || !r.firstTry, combo);
        dots.set(i, r.correct ? (r.firstTry ? 'good' : 'half') : 'bad');
        results.push({ q, r });
        cfg.afterAnswer?.(q, r);
        return gained;
      },
      onNext: () => {
        i++;
        show();
      },
    });
  };

  const end = () => {
    runner = null;
    host.innerHTML = '';
    const score = results.reduce((s, { r }) => s + (r.correct ? (r.firstTry ? 1 : 0.5) : 0), 0);
    cfg.summary(
      { results, xp, accuracy: results.length ? score / cfg.count : 0, bestCombo, hints: results.reduce((s, x) => s + x.r.hints, 0) },
      host,
    );
  };

  const off = onKey((e) => {
    if (e.key === 'Escape') {
      go(cfg.back);
      return;
    }
    if (runner) runner.handleKey(e);
    else if (e.key === 'Enter') {
      e.preventDefault();
      host.querySelector<HTMLElement>('[data-primary]')?.click();
    }
  });
  show();
  return () => {
    off();
    runner?.destroy();
  };
}
