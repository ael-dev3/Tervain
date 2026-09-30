import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MENU_CAMERA, MENU_FIRE, MENU_TREE, browZ, menuHeight, menuSplat, trackDistance } from '../../src/presentation/menu/menuLayout';
import { buildMenuGroundGeometry, gridAxis, puddleSpots, restHeight } from '../../src/presentation/menu/menuLand';
import { MENU_SEA_LEVEL } from '../../src/presentation/menu/menuSky';
import { buildAncientTree } from '../../src/presentation/menu/menuTree';
import { slabGeometry } from '../../src/presentation/menu/menuStones';
import { buildCloakedFigure } from '../../src/presentation/menu/menuFigure';
import { weatherEmblemPixels } from '../../src/presentation/menu/menuBanner';
import { HERMIT_DOOR, campLayout, standingStones } from '../../src/presentation/menu/menuCamp';

const finite = (a: ArrayLike<number>) => Array.from(a).every(Number.isFinite);

/** Distance from a point to a segment in the ground plane. */
function segDist(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (ax + dx * u), z - (az + dz * u));
}

describe('menu headland', () => {
  it('is standable where people and things are, and falls away to the sea beyond the brow', () => {
    // Gentle ground under the camera, the camp and the tree.
    for (const [x, z] of [[MENU_CAMERA.x, MENU_CAMERA.z], [MENU_FIRE.x, MENU_FIRE.z], [MENU_TREE.x + 3, MENU_TREE.z + 3]] as const) {
      const s = Math.abs(menuHeight(x + 0.5, z) - menuHeight(x - 0.5, z)) + Math.abs(menuHeight(x, z + 0.5) - menuHeight(x, z - 0.5));
      expect(s).toBeLessThan(0.6);
    }
    // The camera stands above the ground it looks over.
    expect(MENU_CAMERA.y - menuHeight(MENU_CAMERA.x, MENU_CAMERA.z)).toBeGreaterThan(1.2);
    for (let x = -20; x <= 20; x += 5) expect(menuHeight(x, browZ(x) - 20)).toBeLessThan(MENU_SEA_LEVEL + 1);
  });

  it('has normalised, non-negative layer weights and bounded wetness everywhere', () => {
    for (let x = -60; x <= 60; x += 7.3) {
      for (let z = -70; z <= 16; z += 6.1) {
        const { w, wet } = menuSplat(x, z);
        expect(w).toHaveLength(8);
        expect(w.every((v) => v >= 0 && Number.isFinite(v))).toBe(true);
        expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
        expect(wet).toBeGreaterThanOrEqual(0);
        expect(wet).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps puddles in the ruts and the camp hollow, never floating', () => {
    for (const p of puddleSpots()) {
      const inTrack = trackDistance(p.x, p.z).d < 1.5;
      const inCamp = Math.hypot(p.x - MENU_FIRE.x, p.z - MENU_FIRE.z) < 4;
      expect(inTrack || inCamp).toBe(true);
      expect(restHeight(p.x, p.z, 0.3)).toBeLessThanOrEqual(menuHeight(p.x, p.z));
    }
  });

  it('meshes finely near the camp and leaves open sea unmeshed', () => {
    const axis = gridAxis(-20, 20, -5, 5, 0.3, 0.1);
    expect(axis[0]).toBe(-20);
    expect(axis[axis.length - 1]).toBe(20);
    for (let i = 1; i < axis.length; i++) expect(axis[i]!).toBeGreaterThan(axis[i - 1]!);
    const g = buildMenuGroundGeometry('low');
    const pos = g.getAttribute('position');
    expect(finite(pos.array as Float32Array)).toBe(true);
    const idx = g.index!;
    // No triangle lies entirely under the sea.
    for (let i = 0; i < idx.count; i += 3) {
      const ys = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)].map((k) => pos.getY(k));
      expect(Math.max(...ys)).toBeGreaterThan(MENU_SEA_LEVEL - 0.5);
    }
    // Every face is wound to face the sky (cliff faces lean outward but never face down).
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    let up = 0;
    for (let i = 0; i < idx.count; i += 3) {
      p0.fromBufferAttribute(pos, idx.getX(i));
      p1.fromBufferAttribute(pos, idx.getX(i + 1));
      p2.fromBufferAttribute(pos, idx.getX(i + 2));
      if (p1.sub(p0).cross(p2.sub(p0)).y > 0) up++;
    }
    expect(up / (idx.count / 3)).toBeGreaterThan(0.995);
  });
});

describe('ancient tree', () => {
  it('is deterministic, finite, and stays within its space', () => {
    const a = buildAncientTree(1207, { leafCards: 600 });
    const b = buildAncientTree(1207, { leafCards: 600 });
    expect(a.wood.getAttribute('position').count).toBe(b.wood.getAttribute('position').count);
    expect(Array.from(a.leaves.getAttribute('position').array as Float32Array)).toEqual(Array.from(b.leaves.getAttribute('position').array as Float32Array));
    expect(a.stats.leafCards).toBe(600);
    for (const g of [a.wood, a.leaves]) {
      expect(finite(g.getAttribute('position').array as Float32Array)).toBe(true);
      expect(finite(g.getAttribute('normal').array as Float32Array)).toBe(true);
      g.computeBoundingBox();
      const box = g.boundingBox!;
      expect(box.max.y).toBeLessThan(26);
      expect(box.min.y).toBeGreaterThan(-2);
      expect(Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z)).toBeLessThan(20);
    }
    expect(a.lowBoughs.length).toBeGreaterThan(8);
    expect(a.perches.length).toBeGreaterThan(3);
  });

  it('cuts a flat face for the door that nothing crosses, with bark coming forward to the posts on both sides', () => {
    const ground = (x: number, z: number) => 0.35 + 0.04 * z - 0.02 * x;
    const t = buildAncientTree(1207, { leafCards: 200, door: { az: 1.68, halfWidth: HERMIT_DOOR.faceHalfWidth, height: HERMIT_DOOR.faceTop }, ground });
    const face = t.door!;
    expect(face).toBeDefined();
    const [nx, , nz] = face.normal;
    // The door stands on the ground at the face's foot.
    expect(Math.abs(face.origin[1] - ground(face.origin[0], face.origin[2]))).toBeLessThan(0.1);
    const pos = t.wood.getAttribute('position');
    let inFront = 0;
    const edge = new Map<number, number>();
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i) - face.origin[0];
      const dz = pos.getZ(i) - face.origin[2];
      const x = dx * nz - dz * nx;
      const z = dx * nx + dz * nz;
      const y = pos.getY(i) - face.origin[1];
      // Nothing of the tree (bark, bough or root) stands in front of the doorway.
      if (Math.abs(x) < HERMIT_DOOR.faceHalfWidth - 0.02 && y > 0 && y < HERMIT_DOOR.faceTop - 0.02 && z > 0.002 && z < 3) inFront++;
      // Beside the posts the bark comes forward at least as far as the posts' backs, so no post stands proud in air.
      if (Math.abs(x) > HERMIT_DOOR.width / 2 + 0.05 && Math.abs(x) < HERMIT_DOOR.faceHalfWidth + 0.12 && y > 0.2 && y < 1.8 && z > -1) {
        const band = Math.floor(y / 0.4) * 2 + (x > 0 ? 1 : 0);
        edge.set(band, Math.max(edge.get(band) ?? -Infinity, z));
      }
    }
    expect(inFront).toBe(0);
    expect(edge.size).toBeGreaterThanOrEqual(8);
    for (const z of edge.values()) expect(z).toBeGreaterThan(-0.12);
  });

  it('lays its roots over the ground half buried, diving at the tips', () => {
    const ground = (x: number, z: number) => 0.3 * Math.sin(x * 0.4) + 0.05 * z;
    const t = buildAncientTree(1207, { leafCards: 100, ground });
    expect(t.roots.length).toBeGreaterThanOrEqual(5);
    for (const r of t.roots) {
      r.pts.forEach((p, i) => {
        const f = i / (r.pts.length - 1);
        const rad = r.r0 + (r.r1 - r.r0) * f;
        const g = ground(p[0], p[2]);
        expect(p[1]).toBeLessThan(g);
        if (f <= 0.5) expect(p[1] + rad).toBeGreaterThan(g);
        if (f === 1) expect(p[1] + rad).toBeLessThan(g);
      });
    }
  });

  it('holds its low boughs and their twigs overhead: away from the trunk, wood is a root at the ground or a bough above a head', () => {
    const ground = (x: number, z: number) => 0.3 + 0.08 * z - 0.03 * x;
    const t = buildAncientTree(1207, { leafCards: 100, ground });
    for (const b of t.lowBoughs) expect(b.p[1] - ground(b.p[0], b.p[2])).toBeGreaterThan(1.9 - 1e-6);
    for (let i = 1; i < t.lowBoughs.length; i++) expect(t.lowBoughs[i]!.r).toBeGreaterThan(0.04);
    const pos = t.wood.getAttribute('position');
    let between = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (Math.hypot(x - 0.3, z + 0.2) < 3.4) continue;
      const h = pos.getY(i) - ground(x, z);
      if (h > 0.6 && h < 1.3) between++;
    }
    expect(between).toBe(0);
  });
});

describe('standing stones', () => {
  it('are closed, upright slabs with a broken top', () => {
    const g = slabGeometry({ w: 1, h: 3.2, d: 0.6, seed: 300 });
    const pos = g.getAttribute('position');
    expect(finite(pos.array as Float32Array)).toBe(true);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    expect(box.max.y).toBeLessThan(3.4);
    expect(box.max.y).toBeGreaterThan(2.4);
    expect(box.min.y).toBeLessThan(0);
    expect(box.max.x - box.min.x).toBeLessThan(1.5);
    // Shared corners displace identically, so every position appears on at least two faces or is interior to one.
    const key = (i: number) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    const count = new Map<string, number>();
    for (let i = 0; i < pos.count; i++) count.set(key(i), (count.get(key(i)) ?? 0) + 1);
    const shared = [...count.values()].filter((c) => c >= 2).length;
    expect(shared).toBeGreaterThan(40);
  });

  it('stand apart and planted, the fallen one lies on the turf, and the dolmen cap rests on its uprights', () => {
    const { slabs, cap, uprights } = standingStones();
    const v = new THREE.Vector3();
    const inWorld = slabs.map((s) => slabGeometry(s.spec).applyMatrix4(s.matrix));
    // No stone's surface reaches into another's bounds, taken in the other's own frame.
    for (let b = 0; b < slabs.length; b++) {
      const own = slabGeometry(slabs[b]!.spec);
      own.computeBoundingBox();
      const box = own.boundingBox!.expandByScalar(-0.03);
      const inv = slabs[b]!.matrix.clone().invert();
      for (let a = 0; a < slabs.length; a++) {
        if (a === b) continue;
        const pos = inWorld[a]!.getAttribute('position');
        let inside = 0;
        for (let i = 0; i < pos.count; i++) if (box.containsPoint(v.fromBufferAttribute(pos, i).applyMatrix4(inv))) inside++;
        expect(inside, `stone ${a} in stone ${b}`).toBe(0);
      }
    }
    // Upright stones are sunk below the turf at every corner, however the ground slopes.
    for (const s of slabs.filter((q) => !q.lying)) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        v.set((sx * s.spec.w) / 2, 0, (sz * s.spec.d) / 2).applyMatrix4(s.matrix);
        expect(v.y).toBeLessThan(menuHeight(v.x, v.z));
      }
    }
    // The fallen one: its underside below the turf along its whole length, its back well above it.
    const lying = slabs.filter((q) => q.lying);
    expect(lying).toHaveLength(1);
    const f = lying[0]!;
    for (let t = 0.05; t < 1; t += 0.1) {
      v.set(0, f.spec.h * t, (-f.spec.d / 2) * (1 - 0.12 * t)).applyMatrix4(f.matrix);
      expect(v.y).toBeLessThan(menuHeight(v.x, v.z) + 0.02);
      v.set(0, f.spec.h * t, (f.spec.d / 2) * (1 - 0.12 * t)).applyMatrix4(f.matrix);
      expect(v.y).toBeGreaterThan(menuHeight(v.x, v.z) + 0.15);
    }
    // Each upright's highest point sits just inside the cap's flat underside, under the cap.
    const capInv = cap.matrix.clone().invert();
    for (const u of uprights) {
      const pos = slabGeometry(u.spec).applyMatrix4(u.matrix).getAttribute('position');
      let highest = 0;
      for (let i = 1; i < pos.count; i++) if (pos.getY(i) > pos.getY(highest)) highest = i;
      const at = new THREE.Vector3().fromBufferAttribute(pos, highest).applyMatrix4(capInv);
      expect(at.y).toBeGreaterThan(0);
      expect(at.y).toBeLessThan(0.1);
      expect(Math.abs(at.x)).toBeLessThan(1.6);
      expect(Math.abs(at.z)).toBeLessThan(0.85);
    }
  });
});

describe('the camp', () => {
  it('keeps the gear, the woodpile, the waystone and the puddles apart; only the warden overlaps his log', () => {
    const L = campLayout();
    /** A footprint: signed distance from its outline, and points on and inside the outline. */
    type Shape = { name: string; at: (x: number, z: number) => number; samples: [number, number][] };
    const ring = (x: number, z: number, r: number) => Array.from({ length: 48 }, (_, k): [number, number] => [x + Math.cos((k / 48) * Math.PI * 2) * r, z + Math.sin((k / 48) * Math.PI * 2) * r]);
    const circle = (name: string, c: { x: number; z: number; r: number }): Shape => ({
      name,
      at: (x, z) => Math.hypot(x - c.x, z - c.z) - c.r,
      samples: [[c.x, c.z], ...ring(c.x, c.z, c.r)],
    });
    const capsule = (name: string, c: { ax: number; az: number; bx: number; bz: number; r: number }): Shape => ({
      name,
      at: (x, z) => segDist(x, z, c.ax, c.az, c.bx, c.bz) - c.r,
      samples: Array.from({ length: 9 }, (_, i) => ring(c.ax + ((c.bx - c.ax) * i) / 8, c.az + ((c.bz - c.az) * i) / 8, c.r)).flat(),
    });
    const shapes: Shape[] = [
      circle('fire', L.fire),
      ...L.tripod.map((t, i) => circle(`tripod ${i}`, t)),
      circle('warden', L.warden),
      capsule('log', L.log),
      circle('sack', L.sack),
      capsule('bedroll', L.bed),
      circle('sword', L.sword),
      circle('woodpile', L.woodpile),
      circle('waystone', L.waystone),
    ];
    // Clearance of one footprint from another: the nearest of the second's points to the first's outline.
    const gap = (a: Shape, b: Shape) => Math.min(...b.samples.map(([x, z]) => a.at(x, z)));
    for (let i = 0; i < shapes.length; i++) {
      for (let j = 0; j < shapes.length; j++) {
        if (i === j) continue;
        const names = [shapes[i]!.name, shapes[j]!.name].sort().join(' / ');
        if (names === 'log / warden') continue;
        expect(gap(shapes[i]!, shapes[j]!), names).toBeGreaterThan(0.02);
      }
    }
    // Puddles, rims wobbling out to a third beyond their radii, lie clear of all of it.
    for (const p of puddleSpots()) {
      const pts: [number, number][] = [];
      for (const s of [0, 0.5, 1]) {
        for (let k = 0; k < 36; k++) {
          const a = (k / 36) * Math.PI * 2;
          const lx = Math.cos(a) * p.rx * 1.34 * s;
          const lz = Math.sin(a) * p.rz * 1.34 * s;
          pts.push([p.x + lx * Math.cos(p.yaw) - lz * Math.sin(p.yaw), p.z + lx * Math.sin(p.yaw) + lz * Math.cos(p.yaw)]);
        }
      }
      const inPuddle = ([x, z]: [number, number]) => {
        const dx = x - p.x;
        const dz = z - p.z;
        const lx = dx * Math.cos(p.yaw) + dz * Math.sin(p.yaw);
        const lz = -dx * Math.sin(p.yaw) + dz * Math.cos(p.yaw);
        return (lx / (p.rx * 1.34)) ** 2 + (lz / (p.rz * 1.34)) ** 2 < 1;
      };
      for (const s of shapes) {
        const where = `puddle at ${p.x.toFixed(1)},${p.z.toFixed(1)} / ${s.name}`;
        expect(Math.min(...pts.map(([x, z]) => s.at(x, z))), where).toBeGreaterThan(0);
        expect(s.samples.some(inPuddle), where).toBe(false);
      }
    }
  });
});

describe('the warden', () => {
  it('is a finite seated figure about as tall as a sitting man, and holds still with zero amplitude', () => {
    const f = buildCloakedFigure(3);
    const mesh = f.group.children[0] as THREE.Mesh;
    const pos = mesh.geometry.getAttribute('position');
    expect(finite(pos.array as Float32Array)).toBe(true);
    mesh.geometry.computeBoundingBox();
    const h = mesh.geometry.boundingBox!.max.y;
    expect(h).toBeGreaterThan(1.3);
    expect(h).toBeLessThan(1.7);
    f.update(4, 0);
    expect(mesh.scale.toArray()).toEqual([1, 1, 1]);
    f.dispose();
  });
});

describe('the standard emblem', () => {
  it('is dulled and worn, never repainted where it is transparent', () => {
    const w = 8;
    const h = 8;
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      d.set(i % 2 ? [220, 170, 40, 255] : [120, 40, 200, 0], i * 4);
    }
    const before = d.slice();
    weatherEmblemPixels(d, w, h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      if (before[o + 3] === 0) {
        expect(d[o + 3]).toBe(0);
        continue;
      }
      const sat = (r: number, g: number, b: number) => Math.max(r, g, b) - Math.min(r, g, b);
      expect(sat(d[o]!, d[o + 1]!, d[o + 2]!)).toBeLessThan(sat(before[o]!, before[o + 1]!, before[o + 2]!));
      expect(d[o + 3]!).toBeLessThanOrEqual(before[o + 3]!);
    }
  });
});
