import { svg } from '../../core/dom';
import type { DiagramDef, Region } from './index';
import { leader, torso } from './parts';

/** The respiratory system (p. 87, figure 11). Original simplified drawing. */
const LUNG_L = 'M186 168 Q150 160 132 200 Q118 250 124 300 Q156 312 188 300 Z';
const LUNG_R = 'M214 168 Q250 160 268 200 Q282 250 276 300 Q244 312 212 300 Z';

const R = (name: string, anchor: [number, number], to: [number, number], shape: () => SVGElement): Region & { to: [number, number] } => ({ name, anchor, to, shape });

const regions = {
  nose: R('الأنف', [70, 46], [192, 50], () => svg('path', { d: 'M200 36 L192 58 L208 58 Z' })),
  pharynx: R('البلعوم', [330, 80], [208, 86], () => svg('rect', { x: 192, y: 70, width: 16, height: 30, rx: 5 })),
  larynx: R('الحنجرة', [70, 110], [190, 110], () => svg('rect', { x: 188, y: 100, width: 24, height: 20, rx: 5 })),
  trachea: R('القصبة الهوائية', [330, 145], [208, 145], () => svg('rect', { x: 192, y: 120, width: 16, height: 62, rx: 5 })),
  bronchus: R('الشعبتان الهوائيتان', [70, 190], [176, 196], () => svg('path', { d: 'M200 180 L164 214 L176 222 L200 198 L224 222 L236 214 Z' })),
  alveoli: R('الحويصلات الهوائية', [330, 268], [256, 270], () => svg('circle', { cx: 248, cy: 268, r: 18 })),
  diaphragm: R('الحجاب الحاجز', [70, 330], [130, 322], () => svg('path', { d: 'M112 326 Q200 276 288 326 L288 336 Q200 288 112 336 Z' })),
};

const alv = (cx: number, cy: number) => [0, 1, 2, 3, 4, 5].map((k) => svg('circle', { cx: cx + 9 * Math.cos(k * 1.05), cy: cy + 9 * Math.sin(k * 1.05), r: 6, class: 'dg-lung' }));

export const respiratory: DiagramDef = {
  title: 'الجهاز التنفسي ومسار الهواء',
  viewBox: '0 0 400 370',
  art: () => [
    ...torso().slice(0, 2),
    svg('path', { d: 'M136 100 Q200 88 264 100 L280 340 Q200 352 120 340 Z', class: 'dg-body' }),
    svg('path', { d: LUNG_L, class: 'dg-lung' }),
    svg('path', { d: LUNG_R, class: 'dg-lung' }),
    svg('path', { d: 'M200 40 L193 56 L207 56 Z', class: 'dg-line' }),
    svg('path', { d: 'M200 60 L200 182', class: 'dg-air' }),
    ...[128, 140, 152, 164, 176].map((y) => svg('path', { d: `M193 ${y} Q200 ${y + 4} 207 ${y}`, class: 'dg-ring' })),
    svg('rect', { x: 190, y: 102, width: 20, height: 16, rx: 4, class: 'dg-organ' }),
    svg('path', { d: 'M200 182 L168 218 M200 182 L232 218', class: 'dg-air' }),
    svg('path', { d: 'M168 218 L150 250 M168 218 L172 262 M150 250 L140 276 M150 250 L158 280', class: 'dg-air-thin' }),
    svg('path', { d: 'M232 218 L250 250 M232 218 L228 262 M250 250 L248 268 M250 250 L262 278', class: 'dg-air-thin' }),
    ...alv(248, 268),
    svg('path', { d: 'M112 330 Q200 282 288 330', class: 'dg-muscle' }),
    ...Object.values(regions).map((r) => leader(r.anchor, r.to)),
  ],
  regions,
};
