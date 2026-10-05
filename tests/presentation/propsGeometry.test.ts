import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Ctx } from '../../src/presentation/buildKit';
import { authorLighthouse, radialPlank } from '../../src/presentation/lighthouse';
import { cart, wagon, well, workTable } from '../../src/presentation/props';
import { Region } from '../../src/presentation/regions';
import { barrel } from '../../src/presentation/structures';
import { spokedWheel } from '../../src/presentation/wagonGeometry';
import { LIGHTHOUSE, LIGHTHOUSE_CONSTRUCTION as L, WAGON_CONSTRUCTION as W } from '../../src/world/layout';
import { LIGHTHOUSE_STAIR_ANGLE, lighthouseTreadTop } from '../../src/world/lighthouse';
import { mulberry32 } from '../../src/world/noise';
import type { Terrain } from '../../src/world/terrain';

const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
const flat = { heightAt: () => 0 } as unknown as Terrain;
const group = (r: Region) => { const g = r.toGroup({ get: () => material }); g.updateMatrixWorld(true); return g; };
const hits = (g: THREE.Object3D, p: THREE.Vector3, d = new THREE.Vector3(0, -1, 0)) => new THREE.Raycaster(p, d).intersectObject(g);
const dispose = (g: THREE.Group) => g.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });

function validGeometry(r: Region) {
  for (const batch of r.batches.values()) {
    let nonFinite = 0, worstIndex = -1;
    for (const floats of [batch.p, batch.nr, batch.uv, batch.co]) {
      for (let i = 0; i < floats.n; i++) if (!Number.isFinite(floats.a[i]!)) nonFinite++;
    }
    for (let i = 0; i < batch.ix.n; i++) worstIndex = Math.max(worstIndex, batch.ix.a[i]!);
    // Every written float and index is still visited; aggregate diagnostics avoid CPU contention from assertion allocation.
    expect(nonFinite, `${r.name}:${batch.key} non-finite geometry values`).toBe(0);
    expect(worstIndex, `${r.name}:${batch.key} largest referenced vertex`).toBeLessThan(batch.nv);
  }
}

describe('connected coast props', () => {
  it.each([[1, 0.6, 0.75], [1.9, 1, 0.9]])('a %s metre work table has a backed top, grounded trestles and open leg space', (w, d, height) => {
    const r = new Region('table', new Ctx());
    workTable(r, w, d, height, 0, 0, 0);
    const g = group(r), bounds = new THREE.Box3().setFromObject(g);
    expect(bounds.min.x).toBeCloseTo(-w / 2, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.min.z).toBeCloseTo(-d / 2 + 0.004, 6);
    expect(bounds.max.x).toBeCloseTo(w / 2, 6);
    expect(bounds.max.y).toBeCloseTo(height, 6);
    expect(bounds.max.z).toBeCloseTo(d / 2 - 0.004, 6);
    for (const z of [-d * 0.31, 0, d * 0.31]) {
      const top = hits(g, new THREE.Vector3(w * 0.15, height + 1, z))[0];
      expect(top).toBeDefined(); expect(top!.point.y).toBeCloseTo(height, 6);
    }
    // The broad low furniture blocker is unchanged, but its visible assembly no longer looks like a solid cargo cube.
    expect(hits(g, new THREE.Vector3(0, height * 0.56, d + 1), new THREE.Vector3(0, 0, -1))).toHaveLength(0);
    for (const side of [-1, 1]) {
      const foot = hits(g, new THREE.Vector3(side * w * 0.36, -1, d * 0.3), new THREE.Vector3(0, 1, 0))[0];
      expect(foot).toBeDefined(); expect(foot!.point.y).toBeCloseTo(0, 6);
    }
    validGeometry(r); expect(r.tris).toBeLessThan(260); dispose(g);
  });
  it.each([1, 7, 18])('the well hood rests on its actual crossbeam and grounded posts (seed %i)', (seed) => {
    const random = mulberry32(seed);
    const yaw = random() * 0.5;
    const r = new Region('well', new Ctx());
    well(r, mulberry32(seed), 0, 0, 0);
    const g = group(r);
    const roof = g.getObjectByName('well:thatch') as THREE.Mesh;
    const timber = g.getObjectByName('well:timber') as THREE.Mesh;
    const stone = g.getObjectByName('well:stone') as THREE.Mesh;
    const roofBounds = new THREE.Box3().setFromObject(roof);
    const beamTop = hits(timber, new THREE.Vector3(0, 3, 0))[0];
    expect(beamTop).toBeDefined();
    expect(roofBounds.min.y).toBeGreaterThan(2.4);
    expect(roofBounds.min.y).toBeLessThan(beamTop!.point.y);
    expect(roofBounds.max.y).toBeGreaterThan(3.3);
    for (const sign of [-1, 1]) {
      const x = sign * 1.05 * Math.cos(yaw), z = -sign * 1.05 * Math.sin(yaw);
      const post = hits(timber, new THREE.Vector3(x, -0.5, z), new THREE.Vector3(0, 1, 0))[0];
      const ring = hits(stone, new THREE.Vector3(x, 1, z))[0];
      const hood = hits(roof, new THREE.Vector3(x, 2, z), new THREE.Vector3(0, 1, 0))[0];
      expect(post).toBeDefined(); expect(ring).toBeDefined(); expect(hood).toBeDefined();
      expect(post!.point.y).toBeLessThan(ring!.point.y);
      expect(hood!.point.y).toBeLessThanOrEqual(2.5);
    }
    validGeometry(r);
    dispose(g);
  });

  it('a radial tread has top, underside and four outward-facing edges with no open boundary', () => {
    const r = new Region('tread', new Ctx());
    radialPlank(r.planks, 3.5, 4.85, 0.1, 0.18, 2.3, 0.14, 0xa28b6e);
    const b = r.planks;
    expect(b.tris).toBe(12);
    const g = group(r);
    const p = new THREE.Vector3(Math.cos(0.14) * 4.2, 3, Math.sin(0.14) * 4.2);
    expect(hits(g, p)[0]!.point.y).toBeCloseTo(2.3, 5);
    p.y = 1;
    expect(hits(g, p, new THREE.Vector3(0, 1, 0))[0]!.point.y).toBeCloseTo(2.16, 5);
    const keys = new Map<string, { count: number; direction: number }>();
    const vertexKey = (i: number) => [b.p.a[i * 3]!, b.p.a[i * 3 + 1]!, b.p.a[i * 3 + 2]!].map((n) => Math.round(n * 1e5)).join(',');
    for (let i = 0; i < b.ix.n; i += 3) {
      for (let e = 0; e < 3; e++) {
        const a = vertexKey(b.ix.a[i + e]!), c = vertexKey(b.ix.a[i + (e + 1) % 3]!);
        const key = a < c ? `${a}|${c}` : `${c}|${a}`;
        const edge = keys.get(key) ?? { count: 0, direction: 0 };
        edge.count++; edge.direction += a < c ? 1 : -1; keys.set(key, edge);
      }
    }
    for (const edge of keys.values()) { expect(edge.count).toBe(2); expect(edge.direction).toBe(0); }
    dispose(g);
  });

  it('wheels have genuine open spoke gaps, a connected hub and a rim perpendicular to the z axle', () => {
    const r = new Region('wheel', new Ctx());
    spokedWheel(r, mulberry32(2), 0, 0, 0, 1);
    const g = group(r);
    const ray = (x: number, y: number) => hits(g, new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1));
    const a = Math.PI / 10;
    expect(ray(Math.cos(a) * 0.58, Math.sin(a) * 0.58)).toHaveLength(0);
    expect(ray(0.55, 0).length).toBeGreaterThan(0);
    expect(ray(0, 0).length).toBeGreaterThan(0);
    expect(ray(Math.cos(a) * 0.92, Math.sin(a) * 0.92).length).toBeGreaterThan(0);
    validGeometry(r);
    dispose(g);
  });

  it('wagon axles run through all four hubs, the plank bed rests above the chassis, and shafts join the front bolster', () => {
    const r = new Region('wagon', new Ctx());
    wagon(r, mulberry32(7), 0, 0, 0, 0);
    const g = group(r);
    expect(hits(g, new THREE.Vector3(0, 3, 0))[0]!.point.y).toBeCloseTo(W.bedTop, 5);
    for (const ax of W.axleXs) {
      const from = new THREE.Vector3(ax, W.wheelRadius, 1.7);
      const hub = hits(g, from, new THREE.Vector3(0, 0, -1))[0];
      expect(hub).toBeDefined();
      expect(hub!.point.z).toBeGreaterThan(W.wheelTrack);
      // Near the inside face of the hub, a continuous axle reaches the opposite wheel.
      const inside = hits(g, new THREE.Vector3(ax, W.wheelRadius + 0.04, 1.0), new THREE.Vector3(0, 0, -1));
      expect(inside.length).toBeGreaterThan(0);
    }
    const forward = hits(g, new THREE.Vector3(3.4, 1.5, 0.49));
    expect(forward[0]!.point.y).toBeGreaterThan(0.3);
    validGeometry(r);
    expect(r.tris).toBeLessThan(6500);
    dispose(g);
  });

  it('the handcart uses a smaller connected assembly and cargo barrels have closed heads and feet', () => {
    const r = new Region('cart', new Ctx());
    cart(r, mulberry32(8), 0, 0, 0, 0);
    validGeometry(r);
    expect(r.tris).toBeLessThan(3300);
    const b = new Region('barrel', new Ctx());
    barrel(b, mulberry32(3), 0, 0, 0);
    const g = group(b);
    expect(hits(g, new THREE.Vector3(0.08, 2, 0.05))[0]!.point.y).toBeCloseTo(1, 5);
    expect(hits(g, new THREE.Vector3(0.08, -1, 0.05), new THREE.Vector3(0, 1, 0))[0]!.point.y).toBeCloseTo(0, 5);
    dispose(g);
  });

  it('the lighthouse has supported treads, complete keeper roofs and lamps matching their native light positions', () => {
    const r = new Region('lighthouse', new Ctx());
    const out = { lanterns: [] as THREE.Vector3[] };
    const result = authorLighthouse(r, flat, out);
    const g = group(r);
    for (const i of [0, 12, 29, 47, 62, 79, 91]) {
      const a = L.stairStart + (i + 0.5) * LIGHTHOUSE_STAIR_ANGLE;
      const top = lighthouseTreadTop(i);
      const p = new THREE.Vector3(LIGHTHOUSE.x + Math.cos(a) * 4.13, top + 0.1, LIGHTHOUSE.z + Math.sin(a) * 4.13);
      expect(hits(g, p)[0]!.point.y, `tread ${i}`).toBeCloseTo(top, 5);
    }
    // The actual last flight has head clearance through the gallery and its joists, not just a support-height rule.
    for (let i = 79; i < L.stairSteps; i++) {
      const a = L.stairStart + (i + 0.5) * LIGHTHOUSE_STAIR_ANGLE;
      const p = new THREE.Vector3(LIGHTHOUSE.x + Math.cos(a) * 4.13, lighthouseTreadTop(i) + 0.02, LIGHTHOUSE.z + Math.sin(a) * 4.13);
      const ceiling = hits(g, p, new THREE.Vector3(0, 1, 0))[0];
      expect(ceiling === undefined || ceiling.distance > 1.95, `headroom tread ${i}`).toBe(true);
    }
    const house = L.house;
    const roof = hits(g, new THREE.Vector3(LIGHTHOUSE.x + house.x - 3, 12, LIGHTHOUSE.z + 1));
    expect(roof[0]!.point.y).toBeGreaterThan(house.wallTop);
    const foundation = hits(g, new THREE.Vector3(LIGHTHOUSE.x + house.x, 0.15, LIGHTHOUSE.z + 6), new THREE.Vector3(0, 0, -1));
    expect(foundation[0]).toBeDefined();
    expect(result.lampWorld.y).toBeCloseTo(L.stairTop + 1.3);
    expect(result.lampY).toBeCloseTo(result.lampWorld.y);
    expect(out.lanterns).toHaveLength(2);
    expect(out.lanterns[0]!.toArray()).toEqual([LIGHTHOUSE.x + 1.7, 2.65, LIGHTHOUSE.z - 1]);
    expect(out.lanterns[1]!.toArray()).toEqual([LIGHTHOUSE.x + L.house.x - 1.65, 2.4, LIGHTHOUSE.z + L.house.d / 2 + 0.6]);
    validGeometry(r);
    expect(r.tris).toBeLessThan(20000);
    dispose(g);
  });
});
