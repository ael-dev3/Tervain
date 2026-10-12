import { it, expect } from 'vitest';
import { RockSurfaces, rockTriangleSupport } from '../../src/world/rockContacts';
import type { PhysicalRockGeometry } from '../../src/world/physicsGeometry';
import { PLAYER_BODY_RADIUS } from '../../src/world/playerPlacement';
function triangles(count: number): PhysicalRockGeometry {
  const positions = new Float32Array(count * 9);
  for (let i = 0; i < count; i++) positions.set([i * 2, .2, 0, i * 2, .2, 1, i * 2 + 1, .2, 0], i * 9);
  return { id: 'rock', positions, indices: Uint32Array.from({ length: count * 3 }, (_, i) => i), bounds: { minX: 0, maxX: count * 2 - 1, minY: .2, maxY: .2, minZ: 0, maxZ: 1 } };
}
it('does not read and solve every distant triangle in a nearby rock on every support query', () => {
  const original = triangles(200); let reads = 0;
  const positions = new Proxy(original.positions, { get(target, key) { if (typeof key === 'string' && /^\d+$/.test(key)) reads++; return Reflect.get(target, key, target); } });
  const surface = new RockSurfaces(); surface.register([{ ...original, positions }]); reads = 0;
  expect(surface.supportAt(.25, .25, .2)).toBeCloseTo(.2);
  expect(reads).toBeLessThan(180); // Original query reads 1,800 coordinate values.
});
it('retains exhaustive sphere-foot results at faces, edges, vertices and cell boundaries', () => {
  const rock = triangles(10), surface = new RockSurfaces(); surface.register([rock]);
  const vertex = (i: number) => ({ x: rock.positions[i * 3]!, y: rock.positions[i * 3 + 1]!, z: rock.positions[i * 3 + 2]! });
  for (const x of [-.41, -.2, 0, .25, .85, 1.2, 7.8, 8, 8.2, 18.2, 19.41]) for (const z of [-.41, -.1, .1, .5, 1, 1.2]) {
    const expected: number[] = [];
    for (let i = 0; i < rock.indices.length; i += 3) {
      const h = rockTriangleSupport(x, z, vertex(rock.indices[i]!), vertex(rock.indices[i + 1]!), vertex(rock.indices[i + 2]!), PLAYER_BODY_RADIUS);
      if (h !== null && h <= 1) expected.push(h);
    }
    const actual = surface.supportAt(x, z, .2);
    if (expected.length) expect(actual).toBeCloseTo(Math.max(...expected), 12);
    else expect(actual).toBeNull();
  }
});
it('rebuilds bounds for replacement immutable geometry and drops unregistered rocks', () => {
  const first = triangles(2), surface = new RockSurfaces(); surface.register([first]);
  expect(surface.supportAt(.25, .25, .2)).toBeCloseTo(.2);
  const replaced: PhysicalRockGeometry = { ...first,
    positions: Float32Array.from(first.positions, (value, i) => value + (i % 3 === 0 ? 10 : i % 3 === 1 ? .5 : 0)),
    bounds: { ...first.bounds, minX: 10, maxX: 13, minY: .7, maxY: .7 } };
  surface.register([replaced]);
  expect(surface.supportAt(.25, .25, .2)).toBeNull();
  expect(surface.supportAt(10.25, .25, .7)).toBeCloseTo(.7);
  surface.register([]);
  expect(surface.supportAt(10.25, .25, .7)).toBeNull();
});
