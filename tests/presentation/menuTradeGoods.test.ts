import * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFoldedSilkGeometry, makeSilkBoltGeometry } from '../../src/presentation/menuTradeGoods';

const owned: THREE.BufferGeometry[] = [];
const own = (geometry: THREE.BufferGeometry) => { owned.push(geometry); return geometry; };
afterEach(() => { for (const geometry of owned) geometry.dispose(); owned.length = 0; });

/** UV seams and hard normals may duplicate vertices; weld only for topology checks. */
function verifyClosedVolume(geometry: THREE.BufferGeometry, budget: number) {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv'), index = geometry.index!;
  expect(index.count / 3).toBeLessThan(budget);
  expect(normal.count).toBe(position.count); expect(uv.count).toBe(position.count);
  expect([...position.array, ...normal.array, ...uv.array].every(Number.isFinite)).toBe(true);
  const welded = new Map<string, number>(), ids: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const key = [position.getX(i), position.getY(i), position.getZ(i)].map((coordinate) => coordinate.toFixed(6)).join(':');
    if (!welded.has(key)) welded.set(key, welded.size);
    ids.push(welded.get(key)!);
    expect(new THREE.Vector3().fromBufferAttribute(normal, i).length()).toBeCloseTo(1, 5);
  }
  const edges = new Map<string, { count: number; direction: number }>(), connected = new Map<number, Set<number>>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let volume = 0;
  for (let i = 0; i < index.count; i += 3) {
    const face = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    a.fromBufferAttribute(position, face[0]!); b.fromBufferAttribute(position, face[1]!); c.fromBufferAttribute(position, face[2]!);
    const cross = b.clone().sub(a).cross(c.clone().sub(a));
    expect(cross.lengthSq(), `nondegenerate triangle ${i / 3}`).toBeGreaterThan(1e-14);
    volume += a.dot(b.clone().cross(c)) / 6;
    for (let side = 0; side < 3; side++) {
      const from = ids[face[side]!]!, to = ids[face[(side + 1) % 3]!]!;
      const key = from < to ? `${from}:${to}` : `${to}:${from}`;
      const edge = edges.get(key) ?? { count: 0, direction: 0 };
      edge.count++; edge.direction += from < to ? 1 : -1; edges.set(key, edge);
      if (!connected.has(from)) connected.set(from, new Set());
      connected.get(from)!.add(to);
    }
  }
  expect(volume, 'outward winding encloses positive volume').toBeGreaterThan(0);
  for (const [key, edge] of edges) expect(edge, `closed, opposite edge ${key}`).toEqual({ count: 2, direction: 0 });
  const visited = new Set<number>(), pending = [0];
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id); pending.push(...connected.get(id)!);
  }
  expect(visited.size, 'one connected cloth volume').toBe(welded.size);
  expect(Number.isFinite(geometry.boundingSphere!.radius)).toBe(true);
}

function expectFrontHits(geometry: THREE.BufferGeometry, originsAndDirections: [THREE.Vector3, THREE.Vector3][]) {
  const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide }), mesh = new THREE.Mesh(geometry, material);
  for (const [origin, direction] of originsAndDirections) {
    expect(new THREE.Raycaster(origin, direction).intersectObject(mesh).length, 'front face visible from outside').toBeGreaterThan(0);
  }
  material.dispose();
}

describe('native menu silk merchandise', () => {
  it.each([[2.4, 0.28], [1.1, 0.17]])('makes a closed supported %sm silk bolt of %sm radius within the mobile budget', (width, radius) => {
    const geometry = own(makeSilkBoltGeometry(width, radius));
    verifyClosedVolume(geometry, 500);
    const bounds = geometry.boundingBox!;
    expect(bounds.min.x).toBeCloseTo(-width / 2, 6); expect(bounds.max.x).toBeCloseTo(width / 2, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6); expect(bounds.max.y).toBeCloseTo(radius * 2, 6);
    expect(bounds.min.z).toBeCloseTo(-radius, 6); expect(bounds.max.z).toBeCloseTo(radius, 6);
    expectFrontHits(geometry, [
      [new THREE.Vector3(width, radius, 0), new THREE.Vector3(-1, 0, 0)],
      [new THREE.Vector3(-width, radius, 0), new THREE.Vector3(1, 0, 0)],
      [new THREE.Vector3(0, radius * 4, 0), new THREE.Vector3(0, -1, 0)],
      [new THREE.Vector3(0, -radius, 0), new THREE.Vector3(0, 1, 0)],
    ]);
  });

  it('models several recessed winding rings on each bolt end rather than featureless flat caps', () => {
    const geometry = own(makeSilkBoltGeometry(2, 0.3)), position = geometry.getAttribute('position');
    for (const sign of [-1, 1]) {
      const endX = new Set<number>();
      for (let i = 0; i < position.count; i++) if (position.getX(i) * sign >= 0.93) endX.add(Number(position.getX(i).toFixed(5)));
      expect(endX.size).toBeGreaterThanOrEqual(5);
    }
    expect(geometry.index!.count / 3).toBe(384);
  });

  it.each([[1.5, 0.8, 0.15], [0.7, 1.2, 0.11]])('makes a closed folded cloth of %s × %s × %s with a supported base and outward cap faces', (width, depth, height) => {
    const geometry = own(makeFoldedSilkGeometry(width, depth, height));
    verifyClosedVolume(geometry, 200);
    const bounds = geometry.boundingBox!;
    expect(bounds.min.x).toBeCloseTo(-width / 2, 6); expect(bounds.max.x).toBeCloseTo(width / 2, 6);
    expect(bounds.min.z).toBeCloseTo(-depth / 2, 6); expect(bounds.max.z).toBeCloseTo(depth / 2, 6);
    expect(bounds.min.y).toBe(0); expect(bounds.max.y).toBeCloseTo(height, 6);
    expectFrontHits(geometry, [
      [new THREE.Vector3(0.08, height * 3, 0.05), new THREE.Vector3(0, -1, 0)],
      [new THREE.Vector3(0.08, -height, 0.05), new THREE.Vector3(0, 1, 0)],
      [new THREE.Vector3(width, height * 0.6, 0), new THREE.Vector3(-1, 0, 0)],
      [new THREE.Vector3(0, height * 0.6, depth), new THREE.Vector3(0, 0, -1)],
    ]);
    expect(geometry.index!.count / 3).toBe(144);
  });

  it('gives the textile sides folded shoulders and a planar underside instead of a plain cuboid', () => {
    const geometry = own(makeFoldedSilkGeometry(1, 0.8, 0.12)), position = geometry.getAttribute('position');
    const positiveX = new Set<number>(), floor = new Set<number>();
    for (let i = 0; i < position.count; i++) {
      if (position.getX(i) > 0.46) positiveX.add(Number(position.getX(i).toFixed(4)));
      if (position.getY(i) === 0) floor.add(i);
    }
    expect(positiveX.size).toBeGreaterThan(3);
    expect(floor.size).toBeGreaterThan(12);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid dimension %s before making a GPU resource', (dimension) => {
    expect(() => makeSilkBoltGeometry(dimension, 0.2)).toThrow(RangeError);
    expect(() => makeSilkBoltGeometry(1, dimension)).toThrow(RangeError);
    expect(() => makeFoldedSilkGeometry(dimension, 1, 0.2)).toThrow(RangeError);
    expect(() => makeFoldedSilkGeometry(1, dimension, 0.2)).toThrow(RangeError);
    expect(() => makeFoldedSilkGeometry(1, 1, dimension)).toThrow(RangeError);
  });
});
