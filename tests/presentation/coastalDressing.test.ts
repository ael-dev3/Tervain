import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { buildScatter } from '../../src/presentation/scatter';
import { createShoreDetailPopulation } from '../../src/presentation/scatterPopulation';
import type { BuildContext, Quality } from '../../src/presentation/context';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';

let terrain: Terrain;
let exclusions: Exclusions;
beforeAll(() => { terrain = new Terrain(); exclusions = new Exclusions(terrain); });

function build(quality: Quality) {
  return buildScatter({ terrain, excl: exclusions, quality, colliders: new Colliders() } as BuildContext);
}

describe('original coastal dressing render contract', () => {
  it('attaches original painted cutout leaves to static woody scrub with normalized charts and matching shadow cutouts', () => {
    const view = build('high');
    try {
      const details = createShoreDetailPopulation(terrain, exclusions);
      expect(view.counts.driftwood).toBe(details.filter(detail => detail.kind === 'driftwood').length);
      expect(view.counts.shoreScrub).toBe(details.filter(detail => detail.kind === 'scrub').length);
      const leafMeshes: THREE.Mesh[] = [];
      view.group.traverse(object => { if (object instanceof THREE.Mesh && object.name.endsWith(':cloth')) leafMeshes.push(object); });
      expect(leafMeshes.length).toBeGreaterThan(0);
      let leafTriangles = 0;
      for (const mesh of leafMeshes) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        expect(material.map).toBeInstanceOf(THREE.DataTexture);
        expect(material.map!.colorSpace).toBe(THREE.NoColorSpace);
        expect(material.alphaTest).toBe(0.35);
        expect(material.side).toBe(THREE.DoubleSide);
        expect(mesh.castShadow).toBe(true);
        expect(mesh.matrixAutoUpdate).toBe(false);
        const uv = mesh.geometry.getAttribute('uv');
        // Ordinary map UVs and alphaTest are consumed by Three's native depth and distance passes.
        // The region's usual metre-scale cloth chart must not distort these independent leaf charts.
        expect(new Set(Array.from(uv.array))).toEqual(new Set([0, 0.5, 1]));
        const pos = mesh.geometry.getAttribute('position'), normal = mesh.geometry.getAttribute('normal'), index = mesh.geometry.getIndex()!;
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
        for (let triangle = 0; triangle < index.count; triangle += 3) {
          const i = index.getX(triangle), j = index.getX(triangle + 1), k = index.getX(triangle + 2);
          a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, j); c.fromBufferAttribute(pos, k);
          n.fromBufferAttribute(normal, i);
          expect(b.sub(a).cross(c.sub(a)).dot(n)).toBeGreaterThan(0);
        }
        leafTriangles += mesh.geometry.getIndex()!.count / 3;
      }
      expect(leafTriangles).toBe(view.counts.shoreScrub * 72);
    } finally { view.dispose?.(); }
  });

  it('gives rebuilt coastal scrub its own disposable leaf texture without invalidating another world', () => {
    const first = build('low'), second = build('high');
    const material = (view: ReturnType<typeof build>) => {
      let found: THREE.MeshStandardMaterial | undefined;
      view.group.traverse(object => { if (object instanceof THREE.Mesh && object.name.endsWith(':cloth')) found = object.material as THREE.MeshStandardMaterial; });
      return found!;
    };
    const a = material(first), b = material(second);
    expect(a.map).not.toBe(b.map);
    expect(a.map!.source).not.toBe(b.map!.source);
    const dispose = vi.spyOn(a.map!, 'dispose'), retainedDispose = vi.spyOn(b.map!, 'dispose');
    try {
      first.dispose?.();
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(retainedDispose).not.toHaveBeenCalled();
      expect((b.map as THREE.DataTexture).image.data!.length).toBe(128 * 128 * 4);
    } finally { second.dispose?.(); }
    expect(retainedDispose).toHaveBeenCalledTimes(1);
  });
});
