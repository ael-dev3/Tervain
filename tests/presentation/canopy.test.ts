import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { alphaCoverage, buildCanopy, canopyAtlas, canopyCrown, downsampleCoverage, trimExposedWood, NEAR_CANOPY } from '../../src/presentation/canopy';

/** A source crown like the Meshy exports: a few large curved sheets through a spheroid 12 m wide, 8 m tall, at y 12. */
function sourceCrown(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
    const sheet = new THREE.PlaneGeometry(9, 6, 6, 6);
    sheet.rotateY(k * Math.PI / 6).rotateX((k % 2 ? 0.3 : -0.3)).translate(0, 12, 0);
    parts.push(sheet);
  }
  const top = new THREE.PlaneGeometry(10, 10, 6, 6).rotateX(-Math.PI / 2).translate(0, 15.5, 0);
  parts.push(top);
  const geometry = parts.reduce((acc, g) => {
    const merged = new THREE.BufferGeometry();
    const p = [...(acc.getAttribute('position')?.array ?? []), ...g.getAttribute('position').array];
    const n = [...(acc.getAttribute('normal')?.array ?? []), ...g.getAttribute('normal').array];
    const u = [...(acc.getAttribute('uv')?.array ?? []), ...g.getAttribute('uv').array];
    const offset = (acc.getAttribute('position')?.count ?? 0);
    const i = [...(acc.index?.array ?? []), ...Array.from(g.index!.array, x => x + offset)];
    merged.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
    merged.setIndex(i);
    return merged;
  }, new THREE.BufferGeometry());
  return geometry;
}

/** A trunk with one branch poking 4 m out of the crown's top. */
function wood(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.4, 0.6, 12, 8).translate(0, 6, 0);
  const spike = new THREE.CylinderGeometry(0.05, 0.1, 4, 4).translate(0, 19.5, 0);
  const p = [...trunk.getAttribute('position').array, ...spike.getAttribute('position').array];
  const offset = trunk.getAttribute('position').count;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setIndex([...trunk.index!.array, ...Array.from(spike.index!.array, x => x + offset)]);
  return g;
}

const opts = { ...NEAR_CANOPY, cards: 3000, seed: 7 };

describe('cluster canopy (A134)', () => {
  it('is deterministic for a source and seed, and differs with the seed', () => {
    const leaf = sourceCrown(), w = wood();
    const a = buildCanopy(leaf, w, opts), b = buildCanopy(leaf, w, opts), c = buildCanopy(leaf, w, { ...opts, seed: 8 });
    expect(Array.from(a.getAttribute('position').array)).toEqual(Array.from(b.getAttribute('position').array));
    expect(Array.from(a.getAttribute('position').array)).not.toEqual(Array.from(c.getAttribute('position').array));
  });

  it('places exactly the requested cards as quads with the source attributes', () => {
    const g = buildCanopy(sourceCrown(), wood(), opts);
    expect(g.index!.count / 3).toBe(opts.cards * 2);
    expect(g.getAttribute('position').count).toBe(opts.cards * 4);
    expect(Object.keys(g.attributes).sort()).toEqual(['normal', 'position', 'uv']);
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) { expect(uv.getX(i)).toBeGreaterThanOrEqual(0); expect(uv.getX(i)).toBeLessThanOrEqual(1); }
    const n = g.getAttribute('normal');
    for (let i = 0; i < n.count; i += 97) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 4);
    const info = g.userData.canopy as { clumps: number; cards: number };
    expect(info.cards).toBe(opts.cards);
    expect(info.clumps).toBeGreaterThan(opts.cards / 10);
  });

  it('keeps cards small and stays within the source crown (plus a clump)', () => {
    const leaf = sourceCrown();
    const g = buildCanopy(leaf, null, opts);
    const p = g.getAttribute('position'), a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let q = 0; q < p.count; q += 4) {
      a.fromBufferAttribute(p, q); b.fromBufferAttribute(p, q + 2);
      const diagonal = a.distanceTo(b);
      expect(diagonal).toBeGreaterThan(NEAR_CANOPY.size[0] * Math.SQRT2 - 1e-3);
      expect(diagonal).toBeLessThan(NEAR_CANOPY.size[1] * Math.SQRT2 + 1e-3);
    }
    leaf.computeBoundingBox();
    const box = leaf.boundingBox!.clone().expandByScalar(NEAR_CANOPY.clump * 1.2 + NEAR_CANOPY.size[1]);
    g.computeBoundingBox();
    expect(box.containsBox(g.boundingBox!)).toBe(true);
  });

  it('covers the crown from below and from the side', () => {
    const leaf = sourceCrown(), g = buildCanopy(leaf, null, opts), crown = canopyCrown(leaf);
    // Each card counted as the disc its leaf cluster fills (the atlas cluster spans about 0.8 of the card).
    const coverage = (axes: [number, number]) => {
      const p = g.getAttribute('position'), res = 0.25, hits = new Set<string>();
      const c = [crown.centre.x, crown.centre.y, crown.centre.z], r = [crown.radii.x, crown.radii.y, crown.radii.z];
      for (let q = 0; q < p.count; q += 4) {
        const centre = [0, 0, 0], arr = p.array as Float32Array;
        for (let k = 0; k < 4; k++) for (let e = 0; e < 3; e++) centre[e]! += arr[(q + k) * 3 + e]! / 4;
        const rad = Math.hypot(arr[q * 3]! - centre[0]!, arr[q * 3 + 1]! - centre[1]!, arr[q * 3 + 2]! - centre[2]!) * 0.55;
        const [i, j] = axes;
        for (let x = Math.floor((centre[i]! - rad) / res); x <= (centre[i]! + rad) / res; x++)
          for (let y = Math.floor((centre[j]! - rad) / res); y <= (centre[j]! + rad) / res; y++)
            if (Math.hypot(x * res - centre[i]!, y * res - centre[j]!) < rad) hits.add(`${x},${y}`);
      }
      let inside = 0, covered = 0;
      const [i, j] = axes;
      for (let x = Math.floor((c[i]! - r[i]!) / res); x <= (c[i]! + r[i]!) / res; x++)
        for (let y = Math.floor((c[j]! - r[j]!) / res); y <= (c[j]! + r[j]!) / res; y++) {
          if (Math.hypot((x * res - c[i]!) / r[i]!, (y * res - c[j]!) / r[j]!) > 0.8) continue;
          inside++; if (hits.has(`${x},${y}`)) covered++;
        }
      return covered / inside;
    };
    expect(coverage([0, 2])).toBeGreaterThan(0.9); // from below
    expect(coverage([0, 1])).toBeGreaterThan(0.85); // from the side
  });

  it('covers branch tips and trims wood left clear of the canopy', () => {
    const leaf = sourceCrown(), w = wood();
    const g = buildCanopy(leaf, w, opts);
    expect((g.userData.canopy as { tips: number }).tips).toBeGreaterThan(0);
    const { geometry, removed } = trimExposedWood(w, g, NEAR_CANOPY.clump * 1.6);
    expect(removed).toBeGreaterThan(0);
    // The trunk under the crown is kept whole.
    expect(geometry.index!.count / 3).toBeGreaterThanOrEqual(new THREE.CylinderGeometry(0.4, 0.6, 12, 8).index!.count / 3);
  });
});

describe('cluster atlas (A134)', () => {
  const cutoff = 0.35 / 1.3;
  it('is deterministic, dense in each cluster and soft toward its rim', () => {
    const a = canopyAtlas(128, 2, 3), b = canopyAtlas(128, 2, 3);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
    const cov = alphaCoverage(a, cutoff);
    expect(cov).toBeGreaterThan(0.35);
    expect(cov).toBeLessThan(0.85);
    const at = (x: number, y: number) => a.data[(y * 128 + x) * 4 + 3]!;
    expect(at(32, 32)).toBeGreaterThan(200); // a cluster's heart
    expect(at(0, 0)).toBe(0); // between clusters
  });
  it('keeps coverage through its mips', () => {
    let level = canopyAtlas(256, 2, 3);
    const target = alphaCoverage(level, cutoff);
    while (level.width > 8) {
      level = downsampleCoverage(level, target, cutoff);
      expect(Math.abs(alphaCoverage(level, cutoff) - target)).toBeLessThan(0.06);
    }
  });
});
