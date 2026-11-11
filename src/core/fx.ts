/** Lightweight canvas particle bursts drawn on a full-screen overlay. */
interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }

const COLORS = ['#22d3ee', '#a78bfa', '#4ade80', '#fbbf24', '#f472b6'];
let canvas: HTMLCanvasElement | null = null;
let g: CanvasRenderingContext2D | null = null;
const parts: P[] = [];
let running = false;

export function initFx(c: HTMLCanvasElement): void {
  canvas = c;
  g = c.getContext('2d');
  const resize = () => {
    c.width = innerWidth * devicePixelRatio;
    c.height = innerHeight * devicePixelRatio;
  };
  resize();
  addEventListener('resize', resize);
}

function loop(): void {
  if (!g || !canvas) return;
  g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life++;
    p.vy += 0.12;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    const a = 1 - p.life / p.max;
    if (a <= 0) {
      parts.splice(i, 1);
      continue;
    }
    g.globalAlpha = a;
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(loop);
  else running = false;
}

export function burst(x: number, y: number, n = 24, colors = COLORS): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 4;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 0, max: 40 + Math.random() * 30, color: colors[i % colors.length], size: 2 + Math.random() * 2.5 });
  }
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
}

export function burstAt(el: Element, n = 24): void {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, n);
}

export function confetti(): void {
  for (let i = 0; i < 6; i++) setTimeout(() => burst(Math.random() * innerWidth, innerHeight * (0.2 + Math.random() * 0.3), 30), i * 120);
}
