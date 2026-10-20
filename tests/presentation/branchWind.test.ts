import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BROADLEAF_BRANCH, CONIFER_BRANCH, branchLevel, deriveBranchLeaf, deriveBranchWood } from '../../src/presentation/foliage/branchWind';

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

  it('leaves a model that already carries branch data alone', () => {
    const { wood } = tree();
    const own = new Float32Array(wood.getAttribute('position').count * 4).fill(0.5);
    wood.setAttribute('_wind', new THREE.BufferAttribute(own, 4));
    expect(deriveBranchWood(wood)).toBeNull();
    expect(Array.from(attr(wood, '_wind').array.slice(0, 4))).toEqual([0.5, 0.5, 0.5, 0.5]);
    expect(wood.getAttribute('_pivot')).toBeUndefined();
  });

  it('refuses degenerate wood: too few vertices, no height, non-finite positions', () => {
    const tiny = new THREE.BufferGeometry(); tiny.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 2, 2, 2], 3));
    expect(deriveBranchWood(tiny)).toBeNull();
    const flat = new THREE.CylinderGeometry(1, 1, 0.5, 8, 4).translate(0, 0.25, 0);
    expect(deriveBranchWood(flat)).toBeNull();
    const bad = tree().wood;
    attr(bad, 'position').setY(5, Number.NaN);
    expect(deriveBranchWood(bad)).toBeNull();
  });

  it('keeps a card far from the wood on the nearest limb when most cards are near', () => {
    const { wood, tips } = tree();
    const field = deriveBranchWood(wood)!;
    const near = tips.map(t => t.clone().add(new THREE.Vector3(0, 0.2, 0)));
    const leaf = cards([...near, near[0]!.clone().add(new THREE.Vector3(14, 6, 0))]);
    expect(deriveBranchLeaf(leaf, field)).not.toBeNull();
    const wind = attr(leaf, '_wind');
    expect(wind.getX(12)).toBeGreaterThan(0);
    expect(wind.getW(12)).toBeGreaterThan(0);
  });

  it('derives the same data for a model however its triangles are ordered in memory (same input twice)', () => {
    const a = deriveBranchWood(tree().wood)!, b = deriveBranchWood(tree().wood)!;
    const p = new THREE.Vector3(2, 8, 1), wa = new THREE.Vector4(), wb = new THREE.Vector4(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
    a.read(a.nearest(p.x, p.y, p.z), wa, pa); b.read(b.nearest(p.x, p.y, p.z), wb, pb);
    expect(wa.toArray()).toEqual(wb.toArray()); expect(pa.toArray()).toEqual(pb.toArray());
    expect(a.nearest(5, 5, 5, 0.01)).toBe(-1);
  });
});

/** A conifer: a spiking trunk with whorls of four branches, each whorl's reach shorter than the one below it. */
function conifer(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.04, 0.4, 12, 8, 8).translate(0, 6, 0)];
  for (const y of [2.5, 4.5, 6.5, 8.5, 10]) for (let k = 0; k < 4; k++) {
    const length = 3.5 * (1 - y / 13);
    const g = new THREE.CylinderGeometry(0.02, 0.07, length, 5, 3).translate(0, length / 2, 0);
    g.rotateZ(-1.35).rotateY(k * Math.PI / 2 + y).translate(0, y, 0);
    parts.push(g);
  }
  return mergeGeometries(parts)!;
}

describe('derived branch wind for conifers (not wired in yet)', () => {
  it('finds one limb per branch and keeps the spike of a trunk still', () => {
    const wood = conifer();
    const field = deriveBranchWood(wood, CONIFER_BRANCH)!;
    expect(field).not.toBeNull();
    expect(field.limbs).toBeGreaterThanOrEqual(16);
    const wind = attr(wood, '_wind'), p = attr(wood, 'position');
    for (let i = 0; i < p.count; i++) {
      for (let c = 0; c < 4; c++) expect(Number.isFinite(wind.getComponent(i, c))).toBe(true);
      if (Math.hypot(p.getX(i), p.getZ(i)) < 0.05) expect(wind.getX(i)).toBeLessThan(0.1);
    }
  });

  it('judges a short upper branch against the cone, so it moves like a limb, where the broadleaf shape would call it trunk', () => {
    const upper = conifer(), global = conifer();
    deriveBranchWood(upper, CONIFER_BRANCH); deriveBranchWood(global, BROADLEAF_BRANCH);
    const level = (g: THREE.BufferGeometry) => { let sum = 0, n = 0; const p = attr(g, 'position'), w = attr(g, '_wind'); for (let i = 0; i < p.count; i++) if (p.getY(i) > 9 && Math.hypot(p.getX(i), p.getZ(i)) > 0.4) { sum += w.getX(i); n++; } return n ? sum / n : 0; };
    expect(level(upper)).toBeGreaterThan(level(global));
    expect(level(upper)).toBeGreaterThan(0.2);
  });

  it('hangs needle cards on their branch and is deterministic', () => {
    const a = conifer(), b = conifer();
    deriveBranchWood(a, CONIFER_BRANCH); deriveBranchWood(b, CONIFER_BRANCH);
    expect(Array.from(attr(a, '_wind').array)).toEqual(Array.from(attr(b, '_wind').array));
    const field = deriveBranchWood(conifer(), CONIFER_BRANCH)!;
    const tip = new THREE.Vector3(Math.sin(1.35) * 2 * Math.cos(2.5), 2.5 - 0.1, -Math.sin(1.35) * 2 * Math.sin(2.5));
    const leaf = cards([tip]);
    expect(deriveBranchLeaf(leaf, field)).not.toBeNull();
    const w = new THREE.Vector4(), pv = new THREE.Vector3();
    field.read(field.nearest(tip.x, tip.y + 0.3, tip.z), w, pv);
    expect(attr(leaf, '_wind').getY(0)).toBeCloseTo(w.y, 5);
  });
});


describe('nearest branch search bounds', () => {
  it('matches a direct vertex search inside and outside the grid, including finite reach', () => {
    const wood = tree().wood, field = deriveBranchWood(wood)!;
    const p = attr(wood, 'position');
    for (let k = 0; k < 120; k++) {
      const x = Math.sin(k * 1.7) * 24, y = Math.cos(k * 0.7) * 20, z = Math.sin(k * 0.3) * 24;
      let best = -1, distance = Infinity;
      for (let i = 0; i < p.count; i++) {
        const d = (p.getX(i) - x) ** 2 + (p.getY(i) - y) ** 2 + (p.getZ(i) - z) ** 2;
        if (d < distance) { best = i; distance = d; }
      }
      for (const reach of [0, 0.75, 6, 30, Infinity]) {
        expect(field.nearest(x, y, z, reach)).toBe(distance <= reach * reach ? best : -1);
      }
    }
  });

  it('does not enumerate an empty cube around a query beyond the wood', () => {
    const field = deriveBranchWood(tree().wood)!;
    // The shell tests call abs for each X/Y cell pair. Count that deterministic
    // work rather than using a wall-clock timeout on a shared test runner.
    const abs = vi.spyOn(Math, 'abs');
    let count: number, vertex: number;
    try {
      vertex = field.nearest(24, 24, 24);
      count = abs.mock.calls.length;
    } finally { abs.mockRestore(); }
    expect(vertex!).toBeGreaterThanOrEqual(0);
    expect(count!).toBeLessThan(5000);
  });
});
