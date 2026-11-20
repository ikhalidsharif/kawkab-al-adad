import { svg } from '../../core/dom';
import type { DiagramDef } from './index';

/** Routes by which an infectious disease passes from an infected person or the environment (p. 56). Original drawing. */
const NODES: [string, number, number, string, string][] = [
  ['contact', 80, 60, '🤝', 'الاتصال المباشر'],
  ['air', 440, 60, '🤧', 'الهواء'],
  ['water', 80, 160, '🚰', 'الماء'],
  ['food', 440, 160, '🍽️', 'الطعام'],
  ['tools', 80, 260, '💉', 'الأدوات الملوثة'],
  ['vector', 440, 260, '🦟', 'الناقل الحيوي'],
];

export const diseaseSpread: DiagramDef = {
  title: 'طرق انتقال الأمراض المعدية',
  viewBox: '0 0 520 330',
  art: () => [
    ...NODES.map(([, x, y]) => svg('path', { d: `M260 160 L${x} ${y}`, class: 'dg-dash' })),
    svg('circle', { cx: 260, cy: 160, r: 52, class: 'dg-body' }),
    svg('text', { x: 260, y: 180, 'text-anchor': 'middle', class: 'dg-emoji-lg' }, '🤒'),
    ...NODES.flatMap(([, x, y, icon]) => [svg('circle', { cx: x, cy: y, r: 32, class: 'dg-node' }), svg('text', { x, y: y + 11, 'text-anchor': 'middle', class: 'dg-emoji' }, icon)]),
  ],
  regions: Object.fromEntries(
    NODES.map(([id, x, y, , name]) => [id, { name, anchor: [x, y + 50] as [number, number], shape: () => svg('circle', { cx: x, cy: y, r: 36 }) }]),
  ),
};
