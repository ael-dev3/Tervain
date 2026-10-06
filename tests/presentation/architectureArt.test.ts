import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Ctx } from '../../src/presentation/buildKit';
import { makeTexPair } from '../../src/presentation/buildingTextures';
import { Region } from '../../src/presentation/regions';
import { roofPlane, ROOFS } from '../../src/presentation/roofs';
import { barrel, crate, door, villageBell, windowAt } from '../../src/presentation/structures';

describe('original weathered architecture', () => {
  it('runs shingle fibres up the slope while plate overlaps retain their eave direction', () => {
    for (const style of ['shingle', 'slate'] as const) {
      const r = new Region('roof-grain', new Ctx());
      const b = r.get(ROOFS[style].key);
      roofPlane(b, ROOFS[style], [0, 3, 0], [1, 0, 0], [0, 0.6, -0.8], 2, () => 0, () => 2, 15);
      // The first exposed face's two lower corners differ along the eave, never up the slope.
      const u0 = b.uv.a[0]!, v0 = b.uv.a[1]!, u1 = b.uv.a[2]!, v1 = b.uv.a[3]!;
      if (style === 'shingle') { expect(u0).toBe(u1); expect(v1).toBeGreaterThan(v0); }
      else { expect(v0).toBe(v1); expect(u1).toBeGreaterThan(u0); }
    }
  });

  it('keeps the bronze bell hollow, closed, outward-facing and inside its existing tower envelope', () => {
    const r = new Region('bell', new Ctx());
    villageBell(r, () => 0.5);
    const g = r.bronze.toGeometry()!;
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), ix = g.getIndex()!;
    const key = (id: number) => [p.getX(id), p.getY(id), p.getZ(id)].map((v) => Math.round(v * 1e5)).join(',');
    const edges = new Map<string, { count: number; direction: number }>();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    let volume = 0;
    for (let i = 0; i < ix.count; i += 3) {
      const ids = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)];
      a.fromBufferAttribute(p, ids[0]!); b.fromBufferAttribute(p, ids[1]!); c.fromBufferAttribute(p, ids[2]!);
      volume += a.dot(b.clone().cross(c)) / 6;
      const face = b.clone().sub(a).cross(c.clone().sub(a));
      expect(face.lengthSq()).toBeGreaterThan(1e-12);
      face.normalize();
      for (const id of ids) expect(face.dot(new THREE.Vector3().fromBufferAttribute(n, id))).toBeGreaterThan(0.05);
      for (let e = 0; e < 3; e++) {
        const from = key(ids[e]!), to = key(ids[(e + 1) % 3]!);
        const k = from < to ? `${from}|${to}` : `${to}|${from}`;
        const edge = edges.get(k) ?? { count: 0, direction: 0 };
        edge.count++; edge.direction += from < to ? 1 : -1; edges.set(k, edge);
      }
    }
    for (const edge of edges.values()) { expect(edge.count).toBe(2); expect(edge.direction).toBe(0); }
    expect(volume).toBeGreaterThan(0);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(-0.96, 5);
    expect(g.boundingBox!.max.y).toBeLessThan(0.04);
    expect(Math.max(Math.abs(g.boundingBox!.min.x), g.boundingBox!.max.x)).toBeLessThanOrEqual(0.62001);
    const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
    const mesh = new THREE.Mesh(g, material); mesh.updateMatrixWorld(true);
    const mouth = new THREE.Raycaster(new THREE.Vector3(0, -1.2, 0), new THREE.Vector3(0, 1, 0)).intersectObject(mesh)[0];
    expect(mouth).toBeDefined();
    expect(mouth!.point.y).toBeGreaterThan(-0.1); // The central mouth is open all the way to the inner crown.
    const lip = new THREE.Raycaster(new THREE.Vector3(0.59, -1.2, 0), new THREE.Vector3(0, 1, 0)).intersectObject(mesh)[0];
    expect(lip).toBeDefined(); expect(lip!.point.y).toBeLessThan(-0.88);
    expect(r.tris).toBeLessThan(1000);
    material.dispose(); g.dispose();
  });

  it('runs barrel wood fibres up real staves while keeping the closed cargo silhouette', () => {
    const r = new Region('barrel', new Ctx());
    barrel(r, () => 0.5, 0, 0, 0);
    const b = r.planks;
    const atHeight = [] as { u: number; v: number }[];
    for (let i = 0; i < b.nv; i++) if (Math.abs(b.p.a[i * 3 + 1]! - 0.32) < 1e-5) atHeight.push({ u: b.uv.a[i * 2]!, v: b.uv.a[i * 2 + 1]! });
    expect(atHeight.length).toBeGreaterThan(8);
    expect(Math.max(...atHeight.map((p) => p.u)) - Math.min(...atHeight.map((p) => p.u))).toBeLessThan(1e-6);
    expect(Math.max(...atHeight.map((p) => p.v)) - Math.min(...atHeight.map((p) => p.v))).toBeGreaterThan(1.5);
    expect(b.tris).toBe(100);
  });

  it('adds door, shutter and crate carpentry without perturbing authored decoration streams', () => {
    const count = (author: (r: Region, random: () => number) => void) => {
      let calls = 0;
      const r = new Region('fixture', new Ctx());
      author(r, () => { calls++; return 0.5; });
      for (const b of r.batches.values()) {
        for (const buffer of [b.p, b.nr, b.uv, b.co]) for (let i = 0; i < buffer.n; i++) expect(Number.isFinite(buffer.a[i])).toBe(true);
      }
      return calls;
    };
    expect(count((r, rnd) => door(r, rnd, { y: 0.4, z: 0 }))).toBe(23);
    expect(count((r, rnd) => windowAt(r, rnd, { x: 0, y: 1, z: 0 }))).toBe(18);
    expect(count((r, rnd) => crate(r, rnd, 0, 0, 0, 0.7, 0.5, 0.55, 0.4))).toBe(3);
  });

  it('uses tileable original material data with separate colour and relief, and restrained rock microrelief', () => {
    for (const key of ['stone', 'plaster', 'timber', 'planks', 'rock', 'bronze'] as const) {
      const pair = makeTexPair(key, 192);
      expect(pair.map.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(pair.normal.colorSpace).toBe(THREE.NoColorSpace);
      expect(pair.map.wrapS).toBe(THREE.RepeatWrapping);
      expect(pair.map.wrapT).toBe(THREE.RepeatWrapping);
      expect(pair.map.generateMipmaps).toBe(true);
      expect(pair.normal.image.width).toBe(192);
      if (key === 'rock') {
        const data = pair.normal.image.data as Uint8Array;
        let steep = 0;
        for (let i = 2; i < data.length; i += 4) if (data[i]! < 238) steep++;
        expect(steep / (192 * 192)).toBeLessThan(0.05); // Chipped geometry supplies silhouette; normals cannot turn it into glazed pillows.
      }
    }
  });
});
