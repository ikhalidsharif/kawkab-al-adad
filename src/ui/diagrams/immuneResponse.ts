import { svg } from '../../core/dom';
import type { DiagramDef } from './index';

const cell = (cx: number, cy: number, r: number, cls = 'dg-cell') => [svg('circle', { cx, cy, r, class: cls }), svg('circle', { cx, cy, r: r * 0.45, class: 'dg-nucleus' })];
/** A Y-shaped antibody at (x, y) rotated by `a` degrees. */
const antibody = (x: number, y: number, a = 0) =>
  svg('path', { d: 'M0 10 L0 0 M0 0 L-6 -8 M0 0 L6 -8', transform: `translate(${x},${y}) rotate(${a})`, class: 'dg-antibody' });
const germ = (x: number, y: number) => svg('rect', { x: x - 7, y: y - 4, width: 14, height: 8, rx: 4, class: 'dg-germ' });
const arrow = (x1: number, x2: number, y: number) => svg('path', { d: `M${x1} ${y} L${x2} ${y} M${x2 - 8} ${y - 6} L${x2} ${y} L${x2 - 8} ${y + 6}`, class: 'dg-arrow' });

/** The four stages of the immune response (p. 54, figure 10), drawn left to right. */
export const immuneResponse: DiagramDef = {
  title: 'مراحل استجابة جهاز المناعة لمسببات المرض',
  viewBox: '0 0 640 220',
  art: () => [
    // 1: white blood cell meets antigens on germs
    ...cell(70, 110, 34, 'dg-wbc'),
    germ(26, 64), germ(118, 66), germ(30, 160), germ(116, 158), germ(70, 52),
    arrow(120, 168, 110),
    // 2: defence cells produce antibodies
    ...cell(225, 110, 28),
    antibody(225, 70), antibody(262, 100, 70), antibody(188, 100, -70), antibody(225, 150, 180),
    arrow(274, 322, 110),
    // 3: antibodies destroy pathogens
    germ(370, 90), germ(400, 130), germ(352, 140),
    antibody(370, 76), antibody(412, 120, 60), antibody(340, 152, -120), antibody(392, 146, 160),
    arrow(440, 488, 110),
    // 4: memory: some antibodies remain
    ...cell(560, 110, 28),
    antibody(560, 70), antibody(597, 100, 70), antibody(523, 100, -70),
  ],
  regions: {
    identify: { shape: () => svg('rect', { x: 10, y: 40, width: 120, height: 140, rx: 14 }), anchor: [70, 200], name: 'تحديد المسبب' },
    mobilize: { shape: () => svg('rect', { x: 175, y: 40, width: 100, height: 140, rx: 14 }), anchor: [225, 200], name: 'التعبئة' },
    destroy: { shape: () => svg('rect', { x: 326, y: 40, width: 110, height: 140, rx: 14 }), anchor: [381, 200], name: 'القضاء على المسبب' },
    memory: { shape: () => svg('rect', { x: 505, y: 40, width: 110, height: 140, rx: 14 }), anchor: [560, 200], name: 'المناعة' },
  },
};
