import { svg } from '../../core/dom';
import type { DiagramDef, Region } from './index';
import { leader } from './parts';

/** The urinary system (p. 92, figure 16). Original simplified drawing. */
const KIDNEY = (cx: number, flip: number) =>
  `M${cx} 70 Q${cx - 34 * flip} 72 ${cx - 36 * flip} 120 Q${cx - 34 * flip} 168 ${cx} 170 Q${cx + 22 * flip} 168 ${cx + 18 * flip} 140 Q${cx + 10 * flip} 120 ${cx + 18 * flip} 100 Q${cx + 22 * flip} 72 ${cx} 70 Z`;

const R = (name: string, anchor: [number, number], to: [number, number], shape: () => SVGElement): Region & { to: [number, number] } => ({ name, anchor, to, shape });

const regions = {
  kidney: R('الكلية', [60, 120], [108, 120], () => svg('path', { d: KIDNEY(140, 1) })),
  artery: R('الشريان الكلوي', [340, 96], [236, 112], () => svg('rect', { x: 206, y: 104, width: 40, height: 14, rx: 5 })),
  vein: R('الوريد الكلوي', [340, 150], [236, 132], () => svg('rect', { x: 206, y: 124, width: 40, height: 14, rx: 5 })),
  ureter: R('الحالب', [60, 220], [150, 220], () => svg('path', { d: 'M148 168 Q146 220 186 262 L196 254 Q160 218 162 168 Z' })),
  bladder: R('المثانة', [340, 280], [234, 282], () => svg('ellipse', { cx: 200, cy: 280, rx: 34, ry: 26 })),
  urethra: R('القناة البولية', [60, 330], [192, 326], () => svg('rect', { x: 192, y: 304, width: 16, height: 44, rx: 6 })),
};

export const urinary: DiagramDef = {
  title: 'الجهاز البولي',
  viewBox: '0 0 400 360',
  art: () => [
    svg('path', { d: 'M192 30 L192 250', class: 'dg-artery' }),
    svg('path', { d: 'M208 30 L208 250', class: 'dg-vein' }),
    svg('path', { d: 'M192 110 L156 112 M192 110 L248 112', class: 'dg-artery' }),
    svg('path', { d: 'M208 132 L156 132 M208 132 L246 132', class: 'dg-vein' }),
    svg('path', { d: KIDNEY(140, 1), class: 'dg-kidney' }),
    svg('path', { d: KIDNEY(260, -1), class: 'dg-kidney' }),
    svg('path', { d: 'M155 168 Q152 220 192 260', class: 'dg-urine' }),
    svg('path', { d: 'M245 168 Q248 220 208 260', class: 'dg-urine' }),
    svg('ellipse', { cx: 200, cy: 280, rx: 32, ry: 24, class: 'dg-bladder' }),
    svg('path', { d: 'M200 304 L200 346', class: 'dg-urine' }),
    ...Object.values(regions).map((r) => leader(r.anchor, r.to)),
  ],
  regions,
};
