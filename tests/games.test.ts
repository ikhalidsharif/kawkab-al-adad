import { describe, expect, it } from 'vitest';
import { makeRng } from '../src/core/rng';
import { apply, makeRound, optimalMoves, options, solved } from '../src/ui/games/balance';
import { matchPairs } from '../src/ui/games/piggyBank';
import { rescueRound } from '../src/ui/games/rescueLadder';
import { sideSet } from '../src/ui/games/rightOrNot';
import { reachable, squares } from '../src/ui/games/pythagorasLab';
import { placementScore } from '../src/ui/games/numberLine';

describe('balance game', () => {
  it('always offers a progressing move, unique labels, and perfect play solves every round', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = makeRng(seed);
      for (let round = 0; round < 6; round++) {
        let eq = makeRound(rng, round);
        expect(eq.a.equals(0)).toBe(false);
        let steps = 0;
        const opt = optimalMoves(eq);
        while (!solved(eq)) {
          const { ops } = options(rng, eq);
          expect(new Set(ops.map((o) => o.label)).size).toBe(ops.length);
          expect(ops.length).toBeGreaterThanOrEqual(3);
          for (const o of ops) expect(o.kind === 'add' && o.k.equals(0)).toBe(false);
          const good = ops.find((o) => optimalMoves(apply(eq, o)) < optimalMoves(eq));
          expect(good, `${eq.a}x + ${eq.b} = ${eq.c}`).toBeDefined();
          eq = apply(eq, good!);
          steps++;
          expect(steps).toBeLessThanOrEqual(2);
        }
        expect(steps).toBe(opt);
      }
    }
  });
});

describe('chapter 3 games', () => {
  it('rescue ladder: the correct base is offered once, options are distinct and positive', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const rng = makeRng(seed);
      for (let i = 0; i < 6; i++) {
        const r = rescueRound(rng, i);
        expect(r.h).toBeLessThan(r.L);
        expect(r.q).toBeCloseTo(Math.round(Math.sqrt(r.L ** 2 - r.h ** 2) * 10) / 10, 9);
        if (i < 3) expect(r.q ** 2 + r.h ** 2).toBe(r.L ** 2);
        expect(r.options.filter((o) => Math.abs(o - r.q) < 0.05)).toHaveLength(1);
        expect(new Set(r.options).size).toBe(r.options.length);
        expect(r.options.length).toBeGreaterThanOrEqual(3);
        r.options.forEach((o) => expect(o).toBeGreaterThan(0));
      }
    }
  });
  it('right-or-not: the right flag matches the converse of Pythagoras, and sides form a triangle', () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const { sides, right } = sideSet(makeRng(seed));
      const [p, q, r] = [...sides].sort((x, y) => x - y);
      expect(right).toBe(p * p + q * q === r * r);
      expect(p + q).toBeGreaterThan(r);
    }
  });
  it('lab: the square on the hypotenuse has side c and area a² + b²', () => {
    for (let a = 1; a <= 12; a++)
      for (let b = 1; b <= 12; b++) {
        const pts = squares(a, b).hyp;
        const side = (i: number) => Math.hypot(pts[(i + 1) % 4][0] - pts[i][0], pts[(i + 1) % 4][1] - pts[i][1]);
        for (let i = 0; i < 4; i++) expect(side(i)).toBeCloseTo(Math.hypot(a, b), 9);
        // shoelace area
        let area = 0;
        for (let i = 0; i < 4; i++) area += pts[i][0] * pts[(i + 1) % 4][1] - pts[(i + 1) % 4][0] * pts[i][1];
        expect(Math.abs(area) / 2).toBeCloseTo(a * a + b * b, 9);
        // built outward: away from the right-angle vertex at the origin
        expect(pts[2][0] + pts[2][1]).toBeGreaterThan(a);
      }
    expect(reachable(25)).toBe(true);
    expect(reachable(3)).toBe(false);
  });
  it('number line scoring decreases with distance', () => {
    expect(placementScore(0.05)).toBe(10);
    expect(placementScore(0.2)).toBe(7);
    expect(placementScore(0.4)).toBe(4);
    expect(placementScore(0.9)).toBe(1);
    expect(placementScore(2)).toBe(0);
  });
});

describe('piggy-bank matching', () => {
  it('six pairs with distinct values, including the (-a)^n vs -a^n trap', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const pairs = matchPairs(makeRng(seed), 6);
      expect(pairs).toHaveLength(6);
      const vals = pairs.map((p) => p.value.toString());
      expect(new Set(vals).size).toBe(6);
      expect(new Set(pairs.map((p) => p.tex)).size).toBe(6);
    }
  });
});
