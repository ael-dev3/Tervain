import { describe, expect, it } from 'vitest';
import { createGrassClump } from '../../src/presentation/grass/bladeGeometry';
import { GRASS_QUALITY } from '../../src/presentation/grass/grassField';
import { GRASS_BLADE_GLSL } from '../../src/presentation/grass/grassMaterial';
import { MEADOW_LEVELS } from '../../src/presentation/menu/menuMeadow';
import { smoothstep } from '../../src/world/noise';

/** Evaluate the shader's two smoothstep transitions using its actual bounds, rather than fixture constants. */
function shaderHeadProfile(name: 'gHead' | 'gBloom'): (t: number) => number {
  const declaration = GRASS_BLADE_GLSL.match(new RegExp(`float ${name} = ([^;]+);`))?.[1] ?? '';
  const transitions = [...declaration.matchAll(/smoothstep\(([\d.]+),\s*([\d.]+),\s*gT\)/g)];
  if (transitions.length !== 2) throw new Error(`Unrecognised shader head profile: ${name}`);
  const rise = transitions[0]!, fall = transitions[1]!;
  return (t) => smoothstep(Number(rise[1]), Number(rise[2]), t) * (1 - smoothstep(Number(fall[1]), Number(fall[2]), t));
}

const seedHead = shaderHeadProfile('gHead');
const bloom = shaderHeadProfile('gBloom');
const levels = [
  ...Object.entries(GRASS_QUALITY).flatMap(([quality, spec]) => [
    { name: `realm ${quality} near`, spec: spec.near.clump },
    { name: `realm ${quality} far`, spec: spec.far.clump },
  ]),
  ...Object.entries(MEADOW_LEVELS).flatMap(([quality, bands]) => bands.map((level, i) => ({
    name: `title ${quality} level ${i}`, spec: level.clump,
  }))),
];

describe('grass flowers and seed heads', () => {
  it.each(levels)('$name samples the full heads without increasing its geometry budget', ({ spec }) => {
    const geometry = createGrassClump(spec);
    try {
      const position = geometry.getAttribute('position');
      expect(position.count).toBe(spec.blades * (spec.segments * 2 + 1));
      expect(geometry.index!.count).toBe(spec.blades * (spec.segments * 2 - 1) * 3);
      for (let blade = 0; blade < spec.blades; blade++) {
        const first = blade * (spec.segments * 2 + 1);
        const rows = Array.from({ length: spec.segments }, (_, row) => position.getY(first + row * 2));
        expect(Math.max(...rows.map(seedHead))).toBeCloseTo(1, 6);
        expect(Math.max(...rows.map(bloom))).toBeCloseTo(1, 6);
        // The head row has width on both sides; the final vertex still closes the blade to a single tip.
        const head = first + (spec.segments - 1) * 2;
        expect(position.getZ(head)).toBe(-1);
        expect(position.getZ(head + 1)).toBe(1);
        expect(position.getY(head + 1)).toBe(position.getY(head));
        const tip = first + spec.segments * 2;
        expect([position.getY(tip), position.getZ(tip)]).toEqual([1, 0]);
        expect(seedHead(position.getY(tip))).toBe(0);
        expect(bloom(position.getY(tip))).toBe(0);
        // Keep the bending leaf supported along its length, with rows increasingly close toward the tip.
        const gaps = rows.map((t, i) => (rows[i + 1] ?? 1) - t);
        for (let i = 0; i < gaps.length; i++) {
          expect(gaps[i]).toBeGreaterThan(0);
          if (i > 0) expect(gaps[i]).toBeLessThan(gaps[i - 1]!);
        }
      }
    } finally {
      geometry.dispose();
    }
  });
});
