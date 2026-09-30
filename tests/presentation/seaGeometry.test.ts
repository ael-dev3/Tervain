import * as THREE from 'three';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildSeaGeometry, type SeaQuality } from '../../src/presentation/seaGeometry';
import { coastX, shoreDistance } from '../../src/world/coast';
import { SEA_LEVEL, WORLD } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';

const x1 = -180, z0 = WORLD.minZ - 12, z1 = WORLD.maxZ + 12;
const owned: THREE.BufferGeometry[] = [];
const fixture = (terrain: Pick<Terrain, 'heightAt'>, quality?: SeaQuality) => {
  const geometry = buildSeaGeometry(terrain, quality);
  owned.push(geometry);
  return geometry;
};
const near = (x: number, z: number) => x >= WORLD.minX && x <= x1 && z >= z0 && z <= z1;
const edgeKey = (a: number, b: number) => a < b ? `${a}:${b}` : `${b}:${a}`;
const plane = { heightAt: (x: number, z: number) => (x + 300) * 0.02 + z * 0.001 };

afterEach(() => { for (const geometry of owned) geometry.dispose(); owned.length = 0; });

describe('coastal sea geometry', () => {
  it.each([['high', 2], ['medium', 3], ['low', 4]] as const)('keeps %s near-grid endpoints exact, spacing within %sm and construction below the sea budget', (quality, cell) => {
    const geometry = fixture(plane, quality);
    const position = geometry.getAttribute('position'), depth = geometry.getAttribute('aDepth'), shore = geometry.getAttribute('aShore');
    expect(geometry.index!.count / 3).toBeLessThan(50000);
    expect(depth.count).toBe(position.count); expect(shore.count).toBe(position.count);
    expect(Array.from(position.array).every(Number.isFinite)).toBe(true);
    expect(Array.from(depth.array).every(Number.isFinite)).toBe(true);
    expect(Array.from(shore.array).every(Number.isFinite)).toBe(true);
    const xs = new Set<number>(), zs = new Set<number>();
    for (let i = 0; i < position.count; i++) {
      expect(position.getY(i)).toBe(SEA_LEVEL);
      expect(position.getX(i)).toBeLessThanOrEqual(x1);
      if (near(position.getX(i), position.getZ(i))) { xs.add(position.getX(i)); zs.add(position.getZ(i)); }
    }
    const x = [...xs].sort((a, b) => a - b), z = [...zs].sort((a, b) => a - b);
    expect([x[0], x.at(-1), z[0], z.at(-1)]).toEqual([WORLD.minX, x1, z0, z1]);
    for (const values of [x, z]) for (let i = 1; i < values.length; i++) {
      expect(values[i]! - values[i - 1]!).toBeGreaterThan(0);
      expect(values[i]! - values[i - 1]!).toBeLessThanOrEqual(cell + 0.0001);
    }
    expect(geometry.boundingBox!.min.x).toBeLessThan(WORLD.minX - 4000);
    expect(geometry.boundingBox!.max.x).toBe(x1);
    expect(geometry.boundingBox!.min.z).toBeLessThan(WORLD.minZ - 4000);
    expect(geometry.boundingBox!.max.z).toBeGreaterThan(WORLD.maxZ + 4000);
    expect(Number.isFinite(geometry.boundingSphere!.radius)).toBe(true);
  });

  it('welds every skirt edge into a single nonoverlapping surface with upward front faces and no eastern water frame', () => {
    const geometry = fixture(plane);
    const position = geometry.getAttribute('position'), index = geometry.index!, normal = geometry.getAttribute('normal');
    const edges = new Map<string, number>(), coordinates = new Set<string>();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let area = 0;
    for (let i = 0; i < position.count; i++) {
      coordinates.add(`${position.getX(i)}:${position.getZ(i)}`);
      expect(a.fromBufferAttribute(normal, i).toArray()).toEqual([0, 1, 0]);
    }
    expect(coordinates.size).toBe(position.count);
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      a.fromBufferAttribute(position, ids[0]!); b.fromBufferAttribute(position, ids[1]!); c.fromBufferAttribute(position, ids[2]!);
      const cross = b.sub(a).cross(c.sub(a));
      expect(cross.y).toBeGreaterThan(0);
      expect(cross.toArray().every(Number.isFinite)).toBe(true);
      area += cross.y / 2;
      for (let side = 0; side < 3; side++) {
        const key = edgeKey(ids[side]!, ids[(side + 1) % 3]!);
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    // Positive triangles tile the complete outer rectangle exactly, without corner overlaps.
    const bounds = geometry.boundingBox!;
    expect(area).toBeCloseTo((bounds.max.x - bounds.min.x) * (bounds.max.z - bounds.min.z), 2);
    expect([...edges.values()].every((count) => count === 1 || count === 2)).toBe(true);
    const boundary = new Map<number, number[]>();
    for (const [key, count] of edges) if (count === 1) {
      const [a, b] = key.split(':').map(Number);
      boundary.set(a!, [...(boundary.get(a!) ?? []), b!]); boundary.set(b!, [...(boundary.get(b!) ?? []), a!]);
    }
    expect([...boundary.values()].every((neighbours) => neighbours.length === 2)).toBe(true);
    const visited = new Set<number>(), pending = [boundary.keys().next().value!];
    while (pending.length) {
      const id = pending.pop()!;
      if (visited.has(id)) continue;
      visited.add(id); pending.push(...boundary.get(id)!);
    }
    expect(visited.size).toBe(boundary.size);
    for (const side of ['north', 'south', 'west'] as const) {
      const ids = Array.from({ length: position.count }, (_value, id) => id).filter((id) => {
        const x = position.getX(id), z = position.getZ(id);
        return near(x, z) && (side === 'west' ? x === WORLD.minX : z === (side === 'north' ? z0 : z1));
      }).sort((a, b) => side === 'west' ? position.getZ(a) - position.getZ(b) : position.getX(a) - position.getX(b));
      expect(ids.length).toBeGreaterThan(20);
      for (let i = 1; i < ids.length; i++) expect(edges.get(edgeKey(ids[i - 1]!, ids[i]!))).toBe(2);
    }
    const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide }), mesh = new THREE.Mesh(geometry, material);
    expect(new THREE.Raycaster(new THREE.Vector3(-360, 3, 0), new THREE.Vector3(0, -1, 0)).intersectObject(mesh).length).toBeGreaterThan(0);
    expect(new THREE.Raycaster(new THREE.Vector3(-360, -3, 0), new THREE.Vector3(0, 1, 0)).intersectObject(mesh)).toHaveLength(0);
    material.dispose();
  });

  it('retains true signed depth and shoreline distance, including dry vertices and the western join', () => {
    const terrain = { heightAt: (x: number, z: number) => SEA_LEVEL + shoreDistance(x, z) * 0.08 };
    const geometry = fixture(terrain);
    const position = geometry.getAttribute('position'), depth = geometry.getAttribute('aDepth'), shore = geometry.getAttribute('aShore');
    let dry = 0, wet = 0, maxDepthError = 0, maxShoreError = 0;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i), actual = SEA_LEVEL - terrain.heightAt(x, z);
      if (near(x, z)) {
        maxDepthError = Math.max(maxDepthError, Math.abs(depth.getX(i) - actual));
        maxShoreError = Math.max(maxShoreError, Math.abs(shore.getX(i) + shoreDistance(x, z)));
        if (actual < 0) { expect(depth.getX(i)).toBeLessThan(0); dry++; }
        if (actual > 0) { expect(depth.getX(i)).toBeGreaterThan(0); wet++; }
      } else if (shoreDistance(x, z) < 0) {
        expect(depth.getX(i)).toBe(16);
        expect(shore.getX(i)).toBeGreaterThan(0);
      } else {
        expect(depth.getX(i)).toBeLessThanOrEqual(0);
        expect(shore.getX(i)).toBeLessThanOrEqual(0);
      }
    }
    expect(dry).toBeGreaterThan(1000); expect(wet).toBeGreaterThan(1000);
    expect(maxDepthError).toBeLessThan(0.000002); expect(maxShoreError).toBeLessThan(0.00002);
  });

  it('samples both sides of every organic coast section and never forces a dry coastal endpoint to deep water', () => {
    const terrain = { heightAt: (x: number, z: number) => SEA_LEVEL + (x - coastX(z)) * 0.2 };
    const geometry = fixture(terrain, 'high');
    const position = geometry.getAttribute('position'), depth = geometry.getAttribute('aDepth');
    const rows = new Map<number, { wet: number; dry: number }>();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      if (!near(x, z)) continue;
      const row = rows.get(z) ?? { wet: Infinity, dry: Infinity };
      const distance = Math.abs(x - coastX(z));
      if (depth.getX(i) > 0) row.wet = Math.min(row.wet, distance);
      if (depth.getX(i) < 0) row.dry = Math.min(row.dry, distance);
      rows.set(z, row);
    }
    for (const row of rows.values()) { expect(row.wet).toBeLessThanOrEqual(2.0001); expect(row.dry).toBeLessThanOrEqual(2.0001); }
    const east = Array.from({ length: position.count }, (_value, i) => i).filter((i) => position.getX(i) === x1);
    expect(east.length).toBeGreaterThan(100);
    for (const i of east) expect(depth.getX(i)).toBeLessThan(0);
  });

  it('rejects nonfinite ground samples instead of sending NaNs into a water shader', () => {
    expect(() => buildSeaGeometry({ heightAt: () => Number.NaN })).toThrow(RangeError);
  });
});

describe('sea clipping follows the rendered coastal terrain', () => {
  let terrain: Terrain;
  beforeAll(() => { terrain = new Terrain(); });

  it('keeps real Lantern Point shoals, beach and clifftop samples signed instead of adding a fake western depth band', () => {
    const geometry = fixture(terrain, 'medium');
    const position = geometry.getAttribute('position'), depth = geometry.getAttribute('aDepth');
    let maxError = 0, dry = 0, wet = 0;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      if (!near(x, z)) continue;
      const expected = SEA_LEVEL - terrain.heightAt(x, z);
      maxError = Math.max(maxError, Math.abs(depth.getX(i) - expected));
      if (expected < -0.1) { expect(depth.getX(i)).toBeLessThan(0); dry++; }
      if (expected > 0.1) { expect(depth.getX(i)).toBeGreaterThan(0); wet++; }
    }
    expect(maxError).toBeLessThan(0.000002);
    expect(dry).toBeGreaterThan(1000); expect(wet).toBeGreaterThan(1000);
  });

  it('matches signed depth throughout every high-quality terrain triangle, so dry inland fragments remain dry', () => {
    const geometry = fixture(terrain, 'high');
    const position = geometry.getAttribute('position'), depth = geometry.getAttribute('aDepth'), index = geometry.index!;
    let maxError = 0, dryTriangles = 0, checked = 0;
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      if (ids.some((id) => position.getX(id) < WORLD.minX || position.getZ(id) < WORLD.minZ || position.getZ(id) > WORLD.maxZ)) continue;
      const x = ids.reduce((sum, id) => sum + position.getX(id), 0) / 3;
      const z = ids.reduce((sum, id) => sum + position.getZ(id), 0) / 3;
      const sample = ids.reduce((sum, id) => sum + depth.getX(id), 0) / 3;
      const actual = SEA_LEVEL - terrain.heightAt(x, z);
      maxError = Math.max(maxError, Math.abs(actual - sample));
      if (actual < -0.01) { expect(sample).toBeLessThan(0); dryTriangles++; }
      checked++;
    }
    expect(checked).toBeGreaterThan(20000); expect(dryTriangles).toBeGreaterThan(1000);
    expect(maxError).toBeLessThan(0.000002);
  });
});
