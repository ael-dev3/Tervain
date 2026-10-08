import { describe, expect, it } from 'vitest';
import { Batch, Ctx, GRIME } from '../../src/presentation/buildKit';

/** One vertex's colour from a batch whose noise is too small to matter, so only grime changes it. */
function colourAt(ground: ((x: number, z: number) => number) | null, y: number, normal: [number, number, number]): [number, number, number] {
  const ctx = new Ctx();
  ctx.ground = ground;
  const batch = new Batch(ctx, 'stone');
  batch.vert(0.3, y, -0.2, ...normal, 0, 0, [1, 1, 1], 1, 1e-9);
  return [batch.co.a[0]!, batch.co.a[1]!, batch.co.a[2]!];
}

describe('grime at the foot of walls (A67)', () => {
  const flat = () => 0.5;

  it('darkens an upright face at the ground, greener and browner, with mud in the lowest band', () => {
    const [r, g, b] = colourAt(flat, 0.5, [1, 0, 0]);
    expect(r).toBeCloseTo(1 - GRIME.damp[0] - GRIME.mud[0], 5);
    expect(g).toBeCloseTo(1 - GRIME.damp[1] - GRIME.mud[1], 5);
    expect(b).toBeCloseTo(1 - GRIME.damp[2] - GRIME.mud[2], 5);
    expect(b).toBeLessThan(r);
  });

  it('fades with height and is gone above the highest tide line', () => {
    const low = colourAt(flat, 0.5 + GRIME.splash, [0, 0, 1])[0];
    const middle = colourAt(flat, 0.5 + GRIME.tide[0] * 0.7, [0, 0, 1])[0];
    expect(low).toBeLessThan(middle);
    expect(middle).toBeLessThan(1);
    expect(colourAt(flat, 0.5 + GRIME.tide[1] + 0.01, [0, 0, 1])[0]).toBeCloseTo(1, 6);
  });

  it('leaves floors and paving, and anything that does not know its ground, as they are', () => {
    expect(colourAt(flat, 0.5, [0, 1, 0])[0]).toBeCloseTo(1, 6);
    expect(colourAt(null, 0.5, [1, 0, 0])[0]).toBeCloseTo(1, 6);
  });
});
