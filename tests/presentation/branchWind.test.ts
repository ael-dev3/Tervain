import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { branchLevel, deriveBranchLeaf, deriveBranchWood } from '../../src/presentation/foliage/branchWind';

/** A trunk 0.4 m across and 8 m tall, with three limbs leaving it at 5 m, 6 m and 7 m on different sides. */
function tree(limbs = true): { wood: THREE.BufferGeometry; tips: THREE.Vector3[] } {
  const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.3, 0.45, 8, 8, 6).translate(0, 4, 0)];
  const tips: THREE.Vector3[] = [];
  if (limbs) for (let k = 0; k < 3; k++) {
    const angle = k * 2.1, y = 5 + k, length = 5;
    const g = new THREE.CylinderGeometry(0.08, 0.16, length, 6, 6).translate(0, length / 2, 0);
    g.rotateZ(-1.15).rotateY(angle).translate(0, y, 0);
    parts.push(g);
    tips.push(new THREE.Vector3(Math.sin(1.15) * length, y + Math.cos(1.15) * length, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).setY(y + Math.cos(1.15) * length));
  }
  return { wood: mergeGeometries(parts)!, tips };
}

/** A leaf card (two triangles, 0.6 m) centred at `c`. */
function cards(centres: THREE.Vector3[]): THREE.BufferGeometry {
  const positions: number[] = [], index: number[] = [];
  centres.forEach((c, i) => {
    positions.push(c.x - 0.3, c.y, c.z, c.x + 0.3, c.y, c.z, c.x + 0.3, c.y + 0.6, c.z, c.x - 0.3, c.y + 0.6, c.z);
    index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
}

const attr = (g: THREE.BufferGeometry, name: string) => g.getAttribute(name) as THREE.BufferAttribute;

describe('derived branch wind', () => {
  it('gives every wood vertex finite branch data, with the trunk still and the limbs moving', () => {
    const { wood } = tree();
    const field = deriveBranchWood(wood)!;
    expect(field).not.toBeNull();
    expect(field.limbs).toBeGreaterThanOrEqual(3);
    const wind = attr(wood, '_wind'), pivot = attr(wood, '_pivot'), p = attr(wood, 'position');
    expect(wind.count).toBe(p.count); expect(pivot.count).toBe(p.count);
    for (const v of [...wind.array, ...pivot.array]) expect(Number.isFinite(v)).toBe(true);
    let trunkMax = 0, limbMax = 0;
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getZ(i)), level = wind.getX(i);
      expect(level).toBeGreaterThanOrEqual(0); expect(level).toBeLessThanOrEqual(1);
      expect(wind.getW(i)).toBe(0);
      if (r < 0.5 && p.getY(i) < 4.5) trunkMax = Math.max(trunkMax, level); else if (r > 3) limbMax = Math.max(limbMax, level);
    }
    expect(trunkMax).toBeLessThan(0.05);
    expect(limbMax).toBeGreaterThan(0.4);
  });

  it('grows the level monotonically with radius and with height', () => {
    let last = -1;
    for (let r = 0; r <= 8; r += 0.25) { const l = branchLevel(r, 0.6, 0.5, 8); expect(l).toBeGreaterThanOrEqual(last); last = l; }
    last = -1;
    for (let h = 0; h <= 1; h += 0.05) { const l = branchLevel(4, h, 0.5, 8); expect(l).toBeGreaterThanOrEqual(last); last = l; }
    expect(branchLevel(0.3, 0.9, 0.5, 8)).toBe(0);
  });

  it('is deterministic: the same tree gets the same attributes', () => {
    const a = tree().wood, b = tree().wood;
    deriveBranchWood(a); deriveBranchWood(b);
    expect(Array.from(attr(a, '_wind').array)).toEqual(Array.from(attr(b, '_wind').array));
    expect(Array.from(attr(a, '_pivot').array)).toEqual(Array.from(attr(b, '_pivot').array));
  });

  it('gives each limb its own phase and a pivot at its foot', () => {
    const { wood, tips } = tree();
    const field = deriveBranchWood(wood)!;
    const w = new THREE.Vector4(), pv = new THREE.Vector3(), phases = new Set<number>();
    for (const tip of tips) {
      field.read(field.nearest(tip.x, tip.y, tip.z), w, pv);
      phases.add(w.y);
      expect(pv.y).toBeLessThan(tip.y); expect(pv.y).toBeGreaterThan(3.5);
    }
    expect(phases.size).toBe(3);
  });

  it('hangs a leaf card on its anchor limb: same level, phases and pivot, with its own flutter', () => {
    const { wood, tips } = tree();
    const field = deriveBranchWood(wood)!;
    const centres = tips.map(t => t.clone().add(new THREE.Vector3(0, 0.2, 0)));
    const leaf = cards(centres);
    expect(deriveBranchLeaf(leaf, field)).not.toBeNull();
    const wind = attr(leaf, '_wind'), pivot = attr(leaf, '_pivot'), seeds = new Set<number>();
    const w = new THREE.Vector4(), pv = new THREE.Vector3();
    centres.forEach((c, k) => {
      const anchor = field.nearest(c.x, c.y + 0.3, c.z);
      field.read(anchor, w, pv);
      for (let v = k * 4; v < k * 4 + 4; v++) {
        expect(wind.getX(v)).toBeCloseTo(w.x, 2); expect(wind.getY(v)).toBeCloseTo(w.y, 6); expect(wind.getZ(v)).toBeCloseTo(w.z, 6);
        expect(pivot.getX(v)).toBeCloseTo(pv.x, 3); expect(pivot.getY(v)).toBeCloseTo(pv.y, 3); expect(pivot.getZ(v)).toBeCloseTo(pv.z, 3);
        // w carries a seed (whole part, from 1) and an amplitude in (0, 1].
        const flutter = wind.getW(v), amplitude = flutter - Math.ceil(flutter) + 1;
        expect(Math.ceil(flutter)).toBeGreaterThanOrEqual(1); expect(amplitude).toBeGreaterThan(0); expect(amplitude).toBeLessThanOrEqual(1);
      }
      seeds.add(Math.ceil(wind.getW(k * 4)));
    });
    for (const v of [...wind.array, ...pivot.array]) expect(Number.isFinite(v)).toBe(true);
  });

  it('leaves a tree with no limbs, or no leaves near wood, on the whole-crown sway', () => {
    const trunk = tree(false).wood;
    expect(deriveBranchWood(trunk)).toBeNull();
    expect(trunk.getAttribute('_wind')).toBeUndefined();
    const { wood } = tree();
    const field = deriveBranchWood(wood)!;
    const far = cards([new THREE.Vector3(40, 30, 40), new THREE.Vector3(-40, 30, 40)]);
    expect(deriveBranchLeaf(far, field)).toBeNull();
    expect(far.getAttribute('_wind')).toBeUndefined();
  });
});
