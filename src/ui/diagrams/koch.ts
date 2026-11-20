import { svg } from '../../core/dom';
import type { DiagramDef } from './index';

const germ = (x: number, y: number) => svg('rect', { x: x - 7, y: y - 3.5, width: 14, height: 7, rx: 3.5, class: 'dg-germ' });
const arrow = (x1: number, x2: number, y: number) => svg('path', { d: `M${x1} ${y} L${x2} ${y} M${x2 - 8} ${y - 6} L${x2} ${y} L${x2 - 8} ${y + 6}`, class: 'dg-arrow' });
const dish = (cx: number, cy: number) => [
  svg('ellipse', { cx, cy, rx: 52, ry: 22, class: 'dg-dish' }),
  svg('ellipse', { cx, cy: cy - 4, rx: 44, ry: 15, class: 'dg-agar' }),
];

/** Koch's postulates (p. 62) as four panels, drawn left to right in step order. Original drawing. */
export const koch: DiagramDef = {
  title: 'قوانين كوخ لتحديد مسبب المرض',
  viewBox: '0 0 640 240',
  art: () => [
    // أ: the suspected pathogen is present in every sick organism
    svg('text', { x: 80, y: 110, 'text-anchor': 'middle', class: 'dg-emoji-lg' }, '🐁'),
    svg('text', { x: 108, y: 70, 'text-anchor': 'middle', class: 'dg-emoji' }, '🤒'),
    germ(46, 130), germ(78, 140), germ(112, 128),
    arrow(132, 172, 110),
    // ب: isolated and grown alone on agar
    ...dish(240, 120),
    germ(222, 114), germ(244, 112), germ(260, 120), germ(236, 124),
    svg('text', { x: 240, y: 80, 'text-anchor': 'middle', class: 'dg-small' }, 'آجر'),
    arrow(296, 336, 110),
    // ج: injected into a healthy host, which becomes sick
    svg('text', { x: 380, y: 96, 'text-anchor': 'middle', class: 'dg-emoji' }, '💉'),
    svg('text', { x: 420, y: 130, 'text-anchor': 'middle', class: 'dg-emoji-lg' }, '🐁'),
    arrow(460, 500, 110),
    // د: re-isolated and compared with the original
    svg('text', { x: 560, y: 100, 'text-anchor': 'middle', class: 'dg-emoji-lg' }, '🔬'),
    germ(540, 140), svg('text', { x: 560, y: 145, 'text-anchor': 'middle', class: 'dg-small' }, '='), germ(580, 140),
  ],
  regions: {
    present: { name: 'أ) وجود المسبب', anchor: [80, 200], shape: () => svg('rect', { x: 20, y: 40, width: 120, height: 130, rx: 14 }) },
    isolate: { name: 'ب) العزل والتنمية', anchor: [240, 200], shape: () => svg('rect', { x: 180, y: 50, width: 120, height: 120, rx: 14 }) },
    inject: { name: 'ج) حقن العائل', anchor: [400, 200], shape: () => svg('rect', { x: 345, y: 50, width: 110, height: 120, rx: 14 }) },
    compare: { name: 'د) المقارنة', anchor: [560, 200], shape: () => svg('rect', { x: 505, y: 50, width: 110, height: 120, rx: 14 }) },
  },
};
