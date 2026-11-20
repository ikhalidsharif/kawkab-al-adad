import { svg } from '../../core/dom';
import type { DiagramDef } from './index';

const tri = (x: number, y: number) => svg('path', { d: `M${x} ${y - 7} L${x + 7} ${y + 6} L${x - 7} ${y + 6} Z`, class: 'dg-insulin' });
const glu = (x: number, y: number) => svg('circle', { cx: x, cy: y, r: 6, class: 'dg-germ' });
const arrow = (x1: number, x2: number, y: number) => svg('path', { d: `M${x1} ${y} L${x2} ${y} M${x2 - 8} ${y - 6} L${x2} ${y} L${x2 - 8} ${y + 6}`, class: 'dg-arrow' });

/** Insulin from the pancreas moves glucose from the blood into body cells (p. 59). Original drawing. */
export const insulin: DiagramDef = {
  title: 'دور الأنسولين في نقل الجلوكوز من الدم إلى الخلايا',
  viewBox: '0 0 520 250',
  art: () => [
    // pancreas
    svg('path', { d: 'M30 140 Q40 96 90 104 Q140 112 160 96 Q178 92 176 116 Q170 140 120 146 Q80 152 60 168 Q30 176 30 140 Z', class: 'dg-organ' }),
    arrow(168, 200, 118),
    // blood vessel with insulin (triangles) and glucose (dots)
    svg('rect', { x: 200, y: 90, width: 170, height: 80, rx: 40, class: 'dg-blood' }),
    tri(230, 112), tri(270, 108), tri(310, 114), tri(345, 110),
    glu(232, 150), glu(262, 146), glu(292, 152), glu(322, 146), glu(350, 150),
    arrow(374, 408, 130),
    // body cell receiving glucose
    svg('circle', { cx: 455, cy: 130, r: 46, class: 'dg-cell' }),
    svg('circle', { cx: 455, cy: 130, r: 16, class: 'dg-nucleus' }),
    glu(432, 112), glu(480, 150),
  ],
  regions: {
    pancreas: { name: 'البنكرياس', anchor: [100, 200], shape: () => svg('path', { d: 'M30 140 Q40 96 90 104 Q140 112 160 96 Q178 92 176 116 Q170 140 120 146 Q80 152 60 168 Q30 176 30 140 Z' }) },
    insulin: { name: 'الأنسولين', anchor: [285, 66], shape: () => svg('rect', { x: 210, y: 96, width: 150, height: 28, rx: 10 }) },
    glucose: { name: 'الجلوكوز في الدم', anchor: [285, 196], shape: () => svg('rect', { x: 210, y: 134, width: 150, height: 30, rx: 10 }) },
    cell: { name: 'خلية الجسم', anchor: [455, 210], shape: () => svg('circle', { cx: 455, cy: 130, r: 50 }) },
  },
};
