import { describe, expect, it } from 'vitest';
import { grassGroundY } from '../../src/presentation/grass/grassGround';

function grid(height: (x: number, z: number) => number) {
  return { heightAt(x: number, z: number) {
    const ix = Math.floor(x / 2) * 2, iz = Math.floor(z / 2) * 2;
    const fx = (x - ix) / 2, fz = (z - iz) / 2;
    const a = height(ix, iz), b = height(ix + 2, iz), c = height(ix, iz + 2), d = height(ix + 2, iz + 2);
    return fx + fz <= 1 ? a + fx * (b - a) + fz * (c - a) : d + (1 - fx) * (c - d) + (1 - fz) * (b - d);
  } };
}
function seat(terrain: {heightAt(x: number, z: number): number}, x: number, z: number, radius: number) {
  const y = terrain.heightAt(x, z) - .02;
  const gx = (terrain.heightAt(x + .35, z) - terrain.heightAt(x - .35, z)) / .7;
  const gz = (terrain.heightAt(x, z + .35) - terrain.heightAt(x, z - .35)) / .7;
  return { before: y, after: grassGroundY(terrain, x, z, y, gx, gz, radius), gx, gz };
}
describe('grass facet contact', () => {
  it('seats a clump spanning a ridge without changing its fitted slope', () => {
    const terrain = grid(x => -Math.abs(x));
    const s = seat(terrain, .1, .2, .65);
    expect(s.before + s.gx * (-.65) - terrain.heightAt(-.55, .2)).toBeGreaterThan(.5);
    expect(s.after).toBeLessThan(s.before);
    for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) {
      const dx = i * .065, dz = j * .065;
      expect(s.after + s.gx * dx + s.gz * dz - terrain.heightAt(.1 + dx, .2 + dz)).toBeLessThanOrEqual(-.001 + 1e-10);
    }
  });
  it('checks an interior terrain vertex, not only the support perimeter', () => {
    const terrain = grid((x, z) => x === 0 && z === 0 ? -1 : 0);
    const s = seat(terrain, .1, .1, .65);
    expect(s.before - s.gx * .1 - s.gz * .1 - terrain.heightAt(0, 0)).toBeGreaterThan(.03);
    expect(s.after - s.gx * .1 - s.gz * .1 - terrain.heightAt(0, 0)).toBeCloseTo(-.02, 10);
  });
  it('covers diagonal facet crossings on uneven sampled ground', () => {
    const terrain = grid((x, z) => Math.sin(x * 2.3 + z * .7));
    for (const [x, z] of [[.9, .9], [1.9, -.1], [-.1, -1.8]]) {
      const s = seat(terrain, x!, z!, .66);
      for (let i = -10; i <= 10; i++) for (let j = -10; j <= 10; j++) {
        const dx = i * .066, dz = j * .066;
        expect(s.after + s.gx * dx + s.gz * dz - terrain.heightAt(x! + dx, z! + dz)).toBeLessThanOrEqual(-.001 + 1e-10);
      }
    }
  });
  it('leaves an already safe five-millimetre clearance unchanged', () => {
    const terrain = grid(x => -Math.abs(x));
    const s = seat(terrain, .1, .2, .65);
    const safeY = s.after + .015;
    expect(grassGroundY(terrain, .1, .2, safeY, s.gx, s.gz, .65)).toBe(safeY);
  });
  it('retains an affine placement with no extra samples inside one facet', () => {
    let calls = 0;
    const terrain = { heightAt(x: number, z: number) { calls++; return .1 * x + .2 * z; } };
    const y = terrain.heightAt(.5, .5) - .02; calls = 0;
    expect(grassGroundY(terrain, .5, .5, y, .1, .2, .4)).toBe(y);
    expect(calls).toBe(0);
  });
});
