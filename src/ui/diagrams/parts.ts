import { svg } from '../../core/dom';

/** A dashed leader line from a label anchor to the organ it names. */
export const leader = (a: [number, number], b: [number, number]) => svg('path', { d: `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`, class: 'dg-leader' });

export const arrowPath = (x1: number, y1: number, x2: number, y2: number, cls = 'dg-arrow') => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = (d: number) => `${x2 - 9 * Math.cos(a + d)} ${y2 - 9 * Math.sin(a + d)}`;
  return svg('path', { d: `M${x1} ${y1} L${x2} ${y2} M${h(0.5)} L${x2} ${y2} L${h(-0.5)}`, class: cls });
};

/** Body outline (head + trunk) centred on x = 200. */
export const torso = () => [
  svg('circle', { cx: 200, cy: 48, r: 36, class: 'dg-body' }),
  svg('rect', { x: 188, y: 82, width: 24, height: 16, class: 'dg-body' }),
  svg('path', { d: 'M136 100 Q200 88 264 100 L272 400 Q200 418 128 400 Z', class: 'dg-body' }),
];
