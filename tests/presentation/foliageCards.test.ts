import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildTreeVariant, SPECIES } from '../../src/presentation/treeGen';

/** Cyclic ordering preserves a triangle's winding while ignoring its starting vertex. */
function windingKey(points: string[]): string {
  return points.map((_, start) => [...points.slice(start), ...points.slice(0, start)].join(';')).sort()[0]!;
}

describe('instanced leaf cards', () => {
  it.each(SPECIES)('%s has no coincident reverse faces in any variant or LOD', (species) => {
    for (let variant = 1; variant <= 3; variant++) {
      const tree = buildTreeVariant(species, variant);
      try {
        for (const [level, lod] of tree.lods.entries()) {
          const leaf = lod.leaf;
          const label = `${species}:${variant} LOD${level}`;
          if (species === 'dead') {
            expect(leaf, label).toBeNull();
            continue;
          }
          expect(leaf, label).not.toBeNull();
          const position = leaf!.getAttribute('position');
          const index = leaf!.index!;
          const normal = leaf!.getAttribute('normal');
          const uv = leaf!.getAttribute('uv');
          expect(position.count % 4, label).toBe(0);
          // DoubleSide supplies the back face: only two triangles and four attribute vertices per card.
          expect(index.count, label).toBe(position.count * 1.5);
          for (const attribute of Object.values(leaf!.attributes)) {
            expect(attribute.count, label).toBe(position.count);
            expect(Array.from(attribute.array).every(Number.isFinite), label).toBe(true);
          }
          for (let base = 0; base < position.count; base += 4) {
            const cardLabel = `${label} card ${base / 4}`;
            expect(Array.from(uv.array.slice(base * 2, (base + 4) * 2)), cardLabel).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
            const crownNormal = new THREE.Vector3().fromBufferAttribute(normal, base);
            expect(crownNormal.lengthSq(), cardLabel).toBeGreaterThan(0.1);
            for (let corner = 1; corner < 4; corner++) {
              expect(new THREE.Vector3().fromBufferAttribute(normal, base + corner).equals(crownNormal), cardLabel).toBe(true);
            }
          }
          const seen = new Set<string>();
          for (let triangle = 0; triangle < index.count; triangle += 3) {
            const points = [0, 1, 2].map((corner) => {
              const vertex = index.getX(triangle + corner);
              return `${position.getX(vertex)},${position.getY(vertex)},${position.getZ(vertex)}`;
            });
            const forward = windingKey(points);
            const reverse = windingKey([points[0]!, points[2]!, points[1]!]);
            expect(forward, `${label} nondegenerate triangle ${triangle / 3}`).not.toBe(reverse);
            expect(seen.has(reverse), `${label} coincident reverse triangle ${triangle / 3}`).toBe(false);
            seen.add(forward);
          }
        }
      } finally {
        for (const lod of tree.lods) {
          lod.wood?.dispose();
          lod.leaf?.dispose();
        }
      }
    }
  });
});
