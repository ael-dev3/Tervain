import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { DEPTH_RANK, type MatKey } from '../../src/presentation/regions';
import { buildScenery } from '../../src/presentation/settlement';
import { buildStaticColliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';

// Raster materials only: the real generators, geometry and placements run. Each material carries its key as its name.
vi.mock('../../src/presentation/regions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/presentation/regions')>();
  class MaterialSet {
    readonly windowMat = new THREE.MeshBasicMaterial({ name: 'pane' });
    readonly lanternMat = new THREE.MeshBasicMaterial({ name: 'glow' });
    readonly daylightMat = new THREE.MeshBasicMaterial({ name: 'daylight' });
    private readonly materials = new Map<string, THREE.Material>([['pane', this.windowMat], ['glow', this.lanternMat], ['daylight', this.daylightMat]]);
    get(key: string) {
      if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({ name: key }));
      return this.materials.get(key)!;
    }
    dispose() {}
  }
  return { ...actual, MaterialSet };
});

interface Face { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; n: THREE.Vector3; d: number; key: string; mesh: number }

/** Area shared by two triangles in one plane (2D Sutherland–Hodgman clip). */
function sharedArea(t: number[][], s: number[][]) {
  const wind = (p: number[][]) => ((p[1]![0]! - p[0]![0]!) * (p[2]![1]! - p[0]![1]!) - (p[1]![1]! - p[0]![1]!) * (p[2]![0]! - p[0]![0]!) < 0 ? [p[0]!, p[2]!, p[1]!] : p);
  let poly = wind(t);
  const clipper = wind(s);
  for (let i = 0; i < 3 && poly.length; i++) {
    const a = clipper[i]!, b = clipper[(i + 1) % 3]!, out: number[][] = [];
    const side = (p: number[]) => (b[0]! - a[0]!) * (p[1]! - a[1]!) - (b[1]! - a[1]!) * (p[0]! - a[0]!);
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k]!, q = poly[(k + 1) % poly.length]!, sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) { const f = sp / (sp - sq); out.push([p[0]! + (q[0]! - p[0]!) * f, p[1]! + (q[1]! - p[1]!) * f]); }
    }
    poly = out;
  }
  if (poly.length < 3) return 0;
  return Math.abs(poly.reduce((sum, p, i) => { const q = poly[(i + 1) % poly.length]!; return sum + p[0]! * q[1]! - q[0]! * p[1]!; }, 0)) / 2;
}

describe('building faces that share a plane (A69)', () => {
  it('never leave two faces of equal depth rank fighting for the same depth', () => {
    vi.stubGlobal('document', { createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy<Record<string, unknown>>({ canvas, measureText: (t: string) => ({ width: t.length * 7 }),
        createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
      { get: (target, key) => target[String(key)] ?? (() => {}) });
      return canvas;
    } });
    const terrain = new Terrain();
    const scenery = buildScenery(terrain, buildStaticColliders(terrain), 'low');
    scenery.group.updateMatrixWorld(true);
    const keys = new Set<string>(['plaster', 'timber', 'planks', 'stone', 'cobble', 'tile', 'thatch', 'slate', 'cloth', 'bark', 'rock', 'bronze', 'vc', 'metal', 'leaf', 'glow', 'pane', 'daylight']);
    const faces: Face[] = [];
    let meshes = 0;
    scenery.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const key = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.name ?? '';
      // Only the building materials share the ranked set; one-off props keep their own materials.
      if (!keys.has(key)) return;
      const id = meshes++, g = mesh.geometry, pos = g.getAttribute('position'), index = g.getIndex();
      const at = (k: number) => new THREE.Vector3().fromBufferAttribute(pos, index ? index.getX(k) : k).applyMatrix4(mesh.matrixWorld);
      for (let k = 0; k < (index ? index.count : pos.count); k += 3) {
        const a = at(k), b = at(k + 1), c = at(k + 2), n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
        const length = n.length();
        if (length < 1e-6) continue;
        n.divideScalar(length);
        faces.push({ a, b, c, n, d: n.dot(a), key, mesh: id });
      }
    });
    expect(faces.length).toBeGreaterThan(100_000);
    const rank = (key: string) => DEPTH_RANK[key as MatKey] ?? 0;
    const buckets = new Map<string, Face[]>();
    const bucketOf = (f: Face, step = 0) => `${Math.round(f.n.x * 200)},${Math.round(f.n.y * 200)},${Math.round(f.n.z * 200)},${Math.round(f.d / 0.002) + step}`;
    for (const f of faces) (buckets.get(bucketOf(f)) ?? buckets.set(bucketOf(f), []).get(bucketOf(f))!).push(f);
    const fights: string[] = [];
    for (const [bucket, list] of buckets) {
      const parts = bucket.split(','), next = buckets.get([...parts.slice(0, 3), String(Number(parts[3]) + 1)].join(',')) ?? [];
      const near = list.concat(next);
      for (let i = 0; i < list.length; i++) {
        const t = list[i]!, u = new THREE.Vector3().subVectors(t.b, t.a).normalize(), w = new THREE.Vector3().crossVectors(t.n, u);
        const flat = (p: THREE.Vector3) => [p.dot(u), p.dot(w)];
        const tf = [flat(t.a), flat(t.b), flat(t.c)];
        for (let j = i + 1; j < near.length; j++) {
          const s = near[j]!;
          if ((s.mesh === t.mesh && s.key === t.key) || rank(s.key) !== rank(t.key) || Math.abs(s.d - t.d) > 0.002) continue;
          const area = sharedArea(tf, [flat(s.a), flat(s.b), flat(s.c)]);
          // Two square centimetres: anything smaller is lost in a single pixel at play distance.
          if (area > 2e-4) fights.push(`${t.key}/${s.key} ${area.toFixed(4)} m² at ${[t.a.x, t.a.y, t.a.z].map((v) => v.toFixed(2)).join(', ')}`);
        }
      }
    }
    expect(fights.slice(0, 12)).toEqual([]);
  }, 120_000);
});
