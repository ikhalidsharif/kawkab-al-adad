import { svg } from '../../core/dom';
import type { DiagramDef } from './index';
import { arrowPath } from './parts';

/** A nephron: cup-shaped structure, tubule, surrounding capillaries and the collecting duct (p. 93, figure 17). Original drawing. */
const TUBULE = 'M128 110 Q170 60 210 100 Q250 140 290 100 Q320 70 340 110 Q350 150 330 180 Q300 220 372 220';

export const nephron: DiagramDef = {
  title: 'الوحدة الأنبوبية الكلوية (النفرون)',
  viewBox: '0 0 460 300',
  art: () => [
    arrowPath(20, 80, 64, 100, 'dg-artery'),
    svg('path', { d: 'M64 134 L20 150', class: 'dg-vein' }),
    svg('path', { d: TUBULE, class: 'dg-urine', style: 'stroke-width:10;opacity:.6' }),
    svg('path', { d: 'M150 130 Q190 90 214 128 Q252 170 294 128 Q330 98 356 140', class: 'dg-artery', style: 'stroke-width:3;stroke-dasharray:6 4' }),
    svg('path', { d: 'M150 130 L72 136', class: 'dg-vein', style: 'stroke-width:3' }),
    svg('path', { d: 'M108 70 Q50 70 50 115 Q50 160 108 160 L108 146 Q66 146 66 115 Q66 84 108 84 Z', class: 'dg-organ' }),
    svg('circle', { cx: 90, cy: 115, r: 18, class: 'dg-blood' }),
    svg('path', { d: 'M78 106 Q92 96 100 112 Q88 126 80 116', class: 'dg-artery', style: 'stroke-width:3' }),
    svg('path', { d: 'M380 30 L380 250', class: 'dg-urine', style: 'stroke-width:14' }),
    arrowPath(380, 214, 380, 252),
  ],
  regions: {
    cup: { name: 'التركيب الكأسي (الترشيح الأول)', anchor: [110, 200], shape: () => svg('circle', { cx: 86, cy: 115, r: 48 }) },
    tubule: { name: 'القناة (الأنبوب)', anchor: [250, 262], shape: () => svg('path', { d: TUBULE, style: 'fill:none;stroke-width:18' }) },
    capillaries: { name: 'الشعيرات المحيطة (إعادة الامتصاص)', anchor: [335, 52], shape: () => svg('path', { d: 'M150 130 Q190 90 214 128 Q252 170 294 128 Q330 98 356 140', style: 'fill:none;stroke-width:14' }) },
    duct: { name: 'الأنبوب الجامع', anchor: [400, 284], shape: () => svg('rect', { x: 368, y: 26, width: 24, height: 226, rx: 8 }) },
    artery: { name: 'دم قادم من الشريان الكلوي', anchor: [120, 24], shape: () => svg('rect', { x: 14, y: 70, width: 56, height: 36, rx: 8 }) },
  },
};
