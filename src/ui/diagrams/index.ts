import { h, svg } from '../../core/dom';
import { bodyDefense } from './bodyDefense';
import { immuneResponse } from './immuneResponse';
import { diseaseSpread } from './diseaseSpread';
import { koch } from './koch';
import { insulin } from './insulin';

/** A diagram region: its Arabic name, where its number badge sits, and (lazily) its clickable shape. */
export interface Region {
  name: string;
  anchor: [number, number];
  /** Built only when rendering (needs the DOM). */
  shape(): SVGElement;
}

export interface DiagramDef {
  viewBox: string;
  /** Base artwork (non-interactive). */
  art(): SVGElement[];
  regions: Record<string, Region>;
  /** Accessible title. */
  title: string;
}

export const DIAGRAMS: Record<string, DiagramDef> = {
  'body-defense': bodyDefense,
  'immune-response': immuneResponse,
  'disease-spread': diseaseSpread,
  koch,
  insulin,
};

export interface RenderedDiagram {
  el: HTMLElement;
  /** Number badges, indexed like `numbered` (empty when names are shown instead). */
  badges: SVGGElement[];
  onRegionClick(i: number, fn: () => void): void;
  /** Reveal the name of region i (after an answer). */
  showName(i: number): void;
}

/**
 * Render a diagram. With `numbered` (region ids, in answer order) the regions get number badges and no names
 * (a labelling question); otherwise every region shows its name (learning view).
 */
export function renderDiagram(id: string, opts: { numbered?: string[] } = {}): RenderedDiagram {
  const def = DIAGRAMS[id];
  if (!def) throw new Error(`Unknown diagram ${id}`);
  const root = svg('svg', { viewBox: def.viewBox, class: 'diagram w-full max-w-md mx-auto select-none', role: 'img', 'aria-label': def.title, direction: 'ltr' });
  root.append(...def.art());
  const ids = opts.numbered ?? Object.keys(def.regions);
  const regions = ids.map((rid) => {
    const r = def.regions[rid];
    if (!r) throw new Error(`Diagram ${id} has no region ${rid}`);
    return { ...r, el: r.shape() };
  });
  const badges: SVGGElement[] = [];
  const names: SVGGElement[] = [];
  regions.forEach((r, i) => {
    r.el.classList.add('dg-region');
    root.append(r.el);
    const [x, y] = r.anchor;
    const w = Math.max(48, r.name.length * 6.4 + 16);
    const name = svg('g', { class: 'dg-name' }, svg('rect', { x: x - w / 2, y: y - 11, width: w, height: 22, rx: 6 }), svg('text', { x, y: y + 5, 'text-anchor': 'middle', direction: 'rtl' }, r.name));
    names.push(name);
    if (opts.numbered) {
      const badge = svg('g', { class: 'dg-badge' }, svg('circle', { cx: x, cy: y, r: 13 }), svg('text', { x, y: y + 5, 'text-anchor': 'middle' }, String(i + 1)));
      badges.push(badge);
      root.append(badge);
      name.style.display = 'none';
      root.append(name);
    } else root.append(name);
  });
  return {
    el: h('div', { class: 'w-full' }, root),
    badges,
    onRegionClick(i, fn) {
      for (const el of [regions[i].el, badges[i]]) {
        if (!el) continue;
        el.style.cursor = 'pointer';
        el.addEventListener('click', fn);
      }
    },
    showName(i) {
      if (names[i]) {
        names[i].style.display = '';
        badges[i]?.setAttribute('transform', 'translate(0,-26)');
      }
    },
  };
}
