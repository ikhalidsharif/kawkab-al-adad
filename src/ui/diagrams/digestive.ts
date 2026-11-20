import { svg } from '../../core/dom';
import type { DiagramDef, Region } from './index';
import { leader, torso } from './parts';

/** The digestive system: alimentary canal and accessory organs (p. 77, figure 2). Original simplified drawing. */
const STOMACH = 'M214 170 Q252 158 260 190 Q264 226 230 234 Q206 236 204 220 Q214 206 214 188 Z';
const LIVER = 'M142 160 Q186 148 208 164 Q206 194 176 204 Q150 208 138 196 Z';
const PANCREAS = 'M194 244 Q230 236 252 244 Q250 254 222 254 Q198 256 194 244 Z';
const LARGE = 'M200 372 Q170 378 152 370 L150 270 Q150 260 162 260 L240 260 Q250 260 250 272 L250 356 Q246 372 214 374';
const SMALL = 'M170 284 Q200 270 232 284 Q200 298 170 298 Q200 312 232 312 Q200 326 170 326 Q200 340 232 340 Q210 352 186 352';

const R = (name: string, anchor: [number, number], to: [number, number], shape: () => SVGElement): Region & { to: [number, number] } => ({ name, anchor, to, shape });

const regions = {
  mouth: R('الفم', [70, 62], [188, 66], () => svg('ellipse', { cx: 200, cy: 66, rx: 14, ry: 8 })),
  salivary: R('الغدد اللعابية', [330, 62], [232, 74], () => svg('g', {}, svg('ellipse', { cx: 172, cy: 74, rx: 9, ry: 7 }), svg('ellipse', { cx: 228, cy: 74, rx: 9, ry: 7 }))),
  esophagus: R('المريء', [330, 120], [206, 120], () => svg('rect', { x: 192, y: 88, width: 16, height: 70, rx: 6 })),
  liver: R('الكبد', [70, 170], [146, 178], () => svg('path', { d: LIVER })),
  stomach: R('المعدة', [330, 190], [258, 196], () => svg('path', { d: STOMACH })),
  gallbladder: R('الحويصلة الصفراء', [70, 222], [166, 214], () => svg('ellipse', { cx: 174, cy: 214, rx: 10, ry: 12 })),
  pancreas: R('البنكرياس', [330, 244], [252, 246], () => svg('path', { d: PANCREAS })),
  small: R('الأمعاء الدقيقة', [70, 310], [170, 312], () => svg('rect', { x: 164, y: 276, width: 74, height: 80, rx: 12 })),
  large: R('الأمعاء الغليظة', [330, 300], [252, 300], () => svg('path', { d: LARGE, style: 'fill:none;stroke-width:20' })),
  rectum: R('المستقيم وفتحة الشرج', [70, 396], [198, 396], () => svg('rect', { x: 192, y: 372, width: 16, height: 32, rx: 6 })),
};

export const digestive: DiagramDef = {
  title: 'الجهاز الهضمي: القناة الهضمية والأعضاء الملحقة بها',
  viewBox: '0 0 400 430',
  art: () => [
    ...torso(),
    svg('path', { d: LIVER, class: 'dg-liver' }),
    svg('ellipse', { cx: 174, cy: 214, rx: 8, ry: 10, class: 'dg-organ' }),
    svg('ellipse', { cx: 172, cy: 74, rx: 7, ry: 5, class: 'dg-organ' }),
    svg('ellipse', { cx: 228, cy: 74, rx: 7, ry: 5, class: 'dg-organ' }),
    svg('path', { d: 'M188 66 Q200 72 212 66', class: 'dg-line' }),
    svg('path', { d: 'M200 80 L200 150 Q202 168 214 176', class: 'dg-tube' }),
    svg('path', { d: STOMACH, class: 'dg-organ' }),
    svg('path', { d: PANCREAS, class: 'dg-organ' }),
    svg('path', { d: 'M206 232 Q196 256 178 280', class: 'dg-small-int' }),
    svg('path', { d: LARGE, class: 'dg-colon' }),
    svg('path', { d: SMALL, class: 'dg-small-int' }),
    svg('path', { d: 'M186 352 Q160 362 156 352', class: 'dg-small-int' }),
    svg('path', { d: 'M214 374 Q202 380 200 404', class: 'dg-colon' }),
    ...Object.values(regions).map((r) => leader(r.anchor, r.to)),
  ],
  regions,
};
