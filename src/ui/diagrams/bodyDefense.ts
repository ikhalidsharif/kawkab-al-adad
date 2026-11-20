import { svg } from '../../core/dom';
import type { DiagramDef } from './index';

/** Simplified front view of a body with the places where pathogens enter and the defences there (pp. 53–54). */
export const bodyDefense: DiagramDef = {
  title: 'منافذ دخول مسببات المرض وخطوط الدفاع في الجسم',
  viewBox: '0 0 320 420',
  art: () => [
    // silhouette
    svg('circle', { cx: 160, cy: 62, r: 40, class: 'dg-body' }),
    svg('rect', { x: 148, y: 98, width: 24, height: 18, class: 'dg-body' }),
    svg('path', { d: 'M108 116 Q160 104 212 116 L222 250 Q160 266 98 250 Z', class: 'dg-body' }),
    svg('path', { d: 'M108 120 L70 230 L84 236 L118 150 Z', class: 'dg-body' }),
    svg('path', { d: 'M212 120 L250 230 L236 236 L202 150 Z', class: 'dg-body' }),
    svg('path', { d: 'M114 250 L120 395 L148 395 L156 262 Z', class: 'dg-body' }),
    svg('path', { d: 'M206 250 L200 395 L172 395 L164 262 Z', class: 'dg-body' }),
    // face
    svg('ellipse', { cx: 146, cy: 56, rx: 6, ry: 4, class: 'dg-line' }),
    svg('ellipse', { cx: 174, cy: 56, rx: 6, ry: 4, class: 'dg-line' }),
    svg('path', { d: 'M160 62 L156 76 L164 76', class: 'dg-line' }),
    svg('path', { d: 'M148 86 Q160 94 172 86', class: 'dg-line' }),
    // windpipe + stomach outline + blood vessel
    svg('path', { d: 'M160 100 L160 150', class: 'dg-organ-line' }),
    svg('path', { d: 'M150 168 Q186 160 186 192 Q186 222 152 214 Q138 206 150 188 Z', class: 'dg-organ' }),
    svg('path', { d: 'M126 130 Q118 190 132 246', class: 'dg-vessel' }),
    // a small cut on the leg
    svg('path', { d: 'M126 330 L142 322', class: 'dg-cut' }),
  ],
  regions: {
    eyes: { shape: () => svg('rect', { x: 134, y: 46, width: 52, height: 20, rx: 8 }), anchor: [214, 40], name: 'أغشية العينين' },
    nose: { shape: () => svg('ellipse', { cx: 160, cy: 70, rx: 10, ry: 10 }), anchor: [108, 72], name: 'الأنف (مخاط وأهداب)' },
    mouth: { shape: () => svg('ellipse', { cx: 160, cy: 88, rx: 15, ry: 7 }), anchor: [214, 96], name: 'الفم (اللعاب)' },
    skin: { shape: () => svg('path', { d: 'M212 122 L248 228 L238 232 L206 150 Z' }), anchor: [266, 176], name: 'الجلد' },
    stomach: { shape: () => svg('path', { d: 'M150 168 Q186 160 186 192 Q186 222 152 214 Q138 206 150 188 Z' }), anchor: [228, 196], name: 'المعدة (حمض)' },
    blood: { shape: () => svg('path', { d: 'M120 130 Q112 190 126 246 L136 246 Q124 190 132 130 Z' }), anchor: [70, 168], name: 'الدم (خلايا بيضاء)' },
    wound: { shape: () => svg('circle', { cx: 134, cy: 326, r: 14 }), anchor: [86, 332], name: 'جرح في الجلد' },
  },
};
