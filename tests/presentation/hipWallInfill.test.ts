import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Ctx } from '../../src/presentation/buildKit';
import { Region } from '../../src/presentation/regions';
import { buildShrineHallShell, roofFor, roofWallInfill } from '../../src/presentation/structures';
import { bySpec } from '../../src/world/layout';
import { mulberry32 } from '../../src/world/noise';

const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
const groupOf = (region: Region) => {
  const group = region.toGroup({ get: () => material });
  group.updateMatrixWorld(true);
  return group;
};
const release = (group: THREE.Group) => group.traverse((object) => {
  if (object instanceof THREE.Mesh) object.geometry.dispose();
});

function expectWallJoint(group: THREE.Group, w: number, d: number, wallTop: number): void {
  // Rays begin in the attic immediately over the old wall top. A hit must come
  // from the inner wall face before the original footprint ends, rather than a roof
  // overhang farther outside the house masking an open wall/roof seam.
  for (const y of [wallTop + 0.04, wallTop + 0.1, wallTop + 0.15]) {
    for (const sign of [-1, 1]) {
      for (const z of [-d / 2 + 0.4, 0, d / 2 - 0.4]) {
        const hits = new THREE.Raycaster(new THREE.Vector3(0, y, z), new THREE.Vector3(sign, 0, 0), 0, w / 2).intersectObject(group);
        expect(hits.length, `side wall joint ${sign}, ${y}, ${z}`).toBeGreaterThan(0);
        expect(hits.some((hit) => Math.abs(Math.abs(hit.point.x) - (w / 2 - 0.12)) < 1e-5), 'continuous side infill behind any corner quoins').toBe(true);
      }
      for (const x of [-w / 2 + 0.4, 0, w / 2 - 0.4]) {
        const hits = new THREE.Raycaster(new THREE.Vector3(x, y, 0), new THREE.Vector3(0, 0, sign), 0, d / 2).intersectObject(group);
        expect(hits.length, `front/rear wall joint ${sign}, ${y}, ${x}`).toBeGreaterThan(0);
        expect(hits.some((hit) => Math.abs(Math.abs(hit.point.z) - (d / 2 - 0.12)) < 1e-5), 'continuous front/rear infill behind any corner quoins').toBe(true);
      }
    }
  }
}

describe('hip roof wall joints', () => {
  it.each([[8, 4], [4, 8], [4, 4]])('seals all four wall joints beneath a %s by %s hip roof', (w, d) => {
    const region = new Region('hip-house', new Ctx());
    const roof = roofFor(region, 'hip', 'slate', w, d, 3.5, 17, { pitch: 0.55 });
    roofWallInfill(region, 'hip', w, d, 3.5, roof, 'stone');
    const group = groupOf(region);
    expectWallJoint(group, w, d, 3.5);
    release(group);
  });

  it('fits the top of each wall band to the sloping roof and joins all four miters as a closed ring', () => {
    const w = 8, d = 4;
    const roofRegion = new Region('roof', new Ctx());
    const roof = roofFor(roofRegion, 'hip', 'slate', w, d, 3.5, 17, { pitch: 0.55 });
    const region = new Region('infill', new Ctx());
    roofWallInfill(region, 'hip', w, d, 3.5, roof, 'stone');
    const group = groupOf(region);
    for (const [x, z] of [[w / 2, 0], [-w / 2, 0], [0, d / 2], [0, -d / 2], [w / 2 - 0.07, d / 2 - 0.07], [-w / 2 - 0.07, -d / 2 - 0.07]]) {
      const hits = new THREE.Raycaster(new THREE.Vector3(x!, 10, z!), new THREE.Vector3(0, -1, 0)).intersectObject(group);
      const slopeHeight = 3.44 + Math.min(w / 2 + 0.6 - Math.abs(x!), d / 2 + 0.6 - Math.abs(z!)) * Math.tan(roof.pitch);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0]!.point.y).toBeCloseTo(slopeHeight - 0.03, 5);
    }
    const batch = region.stone;
    const edgeCounts = new Map<string, { count: number; orientation: number }>();
    const key = (id: number) => [0, 1, 2].map((axis) => Math.round(batch.p.a[id * 3 + axis]! * 1e5)).join(',');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
    let volume = 0;
    for (let i = 0; i < batch.ix.n; i += 3) {
      const ids = [batch.ix.a[i]!, batch.ix.a[i + 1]!, batch.ix.a[i + 2]!];
      a.fromArray(batch.p.a, ids[0]! * 3);
      b.fromArray(batch.p.a, ids[1]! * 3);
      c.fromArray(batch.p.a, ids[2]! * 3);
      volume += a.dot(b.clone().cross(c)) / 6;
      const face = b.sub(a).cross(c.sub(a));
      expect(face.lengthSq()).toBeGreaterThan(1e-12);
      normal.fromArray(batch.nr.a, ids[0]! * 3);
      expect(face.normalize().dot(normal)).toBeGreaterThan(0.99);
      for (let e = 0; e < 3; e++) {
        const start = key(ids[e]!), end = key(ids[(e + 1) % 3]!);
        const forward = start < end;
        const edgeKey = forward ? `${start}|${end}` : `${end}|${start}`;
        const edge = edgeCounts.get(edgeKey) ?? { count: 0, orientation: 0 };
        edge.count++;
        edge.orientation += forward ? 1 : -1;
        edgeCounts.set(edgeKey, edge);
      }
    }
    expect(volume).toBeGreaterThan(0);
    for (const edge of edgeCounts.values()) expect(edge).toEqual({ count: 2, orientation: 0 });
    release(group);
    release(groupOf(roofRegion));
  });

  it('closes the actual shrine hall shell on all sides while retaining its sloped attic underside', () => {
    const shrine = bySpec('shrine_hall');
    const region = new Region('shrine', new Ctx());
    buildShrineHallShell(region, mulberry32(4401), shrine.w, shrine.d, shrine.h, 0.4);
    const group = groupOf(region);
    expectWallJoint(group, shrine.w, shrine.d, 0.5 + shrine.h);
    // The attic ceiling is the roof decking, well above the infill; no flat cap hides the shape.
    const ceiling = new THREE.Raycaster(new THREE.Vector3(0.7, shrine.h + 0.7, 0.4), new THREE.Vector3(0, 1, 0)).intersectObject(group)[0];
    expect(ceiling).toBeDefined();
    expect(ceiling!.point.y).toBeGreaterThan(shrine.h + 2);
    expect(ceiling!.face!.normal.y).toBeLessThan(-0.5);
    release(group);
  });
});
