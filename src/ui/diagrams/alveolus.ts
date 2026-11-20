import { svg } from '../../core/dom';
import type { DiagramDef } from './index';
import { arrowPath } from './parts';

/** Gas exchange between an alveolus and a capillary (p. 88, figure 12). Original drawing. */
export const alveolus: DiagramDef = {
  title: 'تبادل الغازات بين الحويصلة الهوائية والشعيرات الدموية',
  viewBox: '0 0 460 250',
  art: () => [
    svg('path', { d: 'M40 125 L120 125', class: 'dg-air' }),
    svg('circle', { cx: 190, cy: 125, r: 78, class: 'dg-lung' }),
    svg('path', { d: 'M300 20 Q262 125 300 230', class: 'dg-artery', style: 'stroke-width:26;opacity:.55' }),
    ...[60, 110, 170].map((y) => svg('circle', { cx: 290 - (y === 110 ? 8 : 0), cy: y + 10, r: 7, class: 'dg-cell' })),
    arrowPath(232, 82, 300, 82),
    svg('text', { x: 262, y: 70, 'text-anchor': 'middle', class: 'dg-gas' }, 'O₂'),
    arrowPath(300, 170, 232, 170),
    svg('text', { x: 266, y: 196, 'text-anchor': 'middle', class: 'dg-gas' }, 'CO₂'),
  ],
  regions: {
    alveolus: { name: 'الحويصلة الهوائية', anchor: [150, 125], shape: () => svg('circle', { cx: 190, cy: 125, r: 78 }) },
    capillary: { name: 'شعيرة دموية', anchor: [390, 125], shape: () => svg('path', { d: 'M288 20 Q250 125 288 230 L312 230 Q274 125 312 20 Z' }) },
    o2: { name: 'الأكسجين ينتقل إلى الدم', anchor: [262, 30], shape: () => svg('rect', { x: 226, y: 56, width: 80, height: 36, rx: 8 }) },
    co2: { name: 'ثاني أكسيد الكربون يخرج', anchor: [262, 228], shape: () => svg('rect', { x: 226, y: 156, width: 80, height: 48, rx: 8 }) },
  },
};
