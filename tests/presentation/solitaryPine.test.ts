import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createPineForest, isPineSpecies, PINE_FILES, solitaryPineUrl, type PineTemplates } from '../../src/presentation/solitaryPine';
import { pineBinary, pineTemplates } from './pineFixture';
import { createFloraPopulation, selectFloraPopulation } from '../../src/presentation/floraPopulation';
import { Terrain } from '../../src/world/terrain';
import { Exclusions, TREE_SWAY_ENABLED } from '../../src/presentation/vegetation';

let templates: PineTemplates;
beforeAll(async () => { templates = await pineTemplates(); });

describe('delivered Solitary Pine forest', () => {
  it('uses locally hosted, complete GLB files with embedded standard textures and a subdirectory-safe URL', () => {
    expect(solitaryPineUrl(PINE_FILES[0], './', 'https://ael-dev3.github.io/Tervain/index.html').href).toBe('https://ael-dev3.github.io/Tervain/models/flora/solitary-pine-under-10k.glb');
    for (const file of PINE_FILES) {
      const { bytes, json } = pineBinary(file);
      expect(bytes.readUInt32LE(8)).toBe(bytes.length);
      expect(json.extensionsRequired ?? []).toEqual([]);
      expect(json.images.every((image: { bufferView?: number; mimeType: string }) => image.bufferView !== undefined && ['image/png', 'image/jpeg'].includes(image.mimeType))).toBe(true);
      const foliage = json.materials.find((material: { alphaMode: string }) => material.alphaMode === 'MASK');
      expect(foliage.alphaCutoff).toBe(0.42);
      expect(foliage.doubleSided).toBe(true);
    }
  });

  it('preserves every source position, UV and authored normal through one uniform scale and grounding', () => {
    const forest = createPineForest(templates);
    const sourceBounds = new THREE.Box3().setFromObject(templates[0].scene);
    const sourceHeight = sourceBounds.max.y - sourceBounds.min.y;
    for (const species of ['pine', 'fir', 'shorepine'] as const) {
      for (let seed = 1; seed <= 3; seed++) {
        const tree = forest.variant(species, seed);
        expect(forest.variant(species, seed)).toBe(tree);
        expect(tree.lods[0].tris).toBeLessThan(10000);
        expect(tree.lods[0].tris).toBeGreaterThan(9000);
        expect(tree.lods[1].tris).toBeLessThan(4000);
        expect(tree.lods[2].tris).toBe(48);
        const nearHeight = Math.max(tree.lods[0].wood!.boundingBox!.max.y, tree.lods[0].leaf!.boundingBox!.max.y);
        const scale = nearHeight / sourceHeight;
        for (const [level, template] of templates.entries()) {
          template.scene.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            const actual = (mesh.material as THREE.MeshStandardMaterial).alphaTest > 0 ? tree.lods[level]!.leaf! : tree.lods[level]!.wood!;
            const source = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
            const p = actual.getAttribute('position'), reference = source.getAttribute('position');
            let maxPositionError = 0, minNormalDot = 1;
            const normal = actual.getAttribute('normal'), sourceNormal = source.getAttribute('normal');
            for (let i = 0; i < p.count; i++) {
              maxPositionError = Math.max(maxPositionError,
                Math.abs(p.getX(i) - reference.getX(i) * scale),
                Math.abs(p.getY(i) - (reference.getY(i) - sourceBounds.min.y) * scale),
                Math.abs(p.getZ(i) - reference.getZ(i) * scale));
              if (normal && sourceNormal) {
                minNormalDot = Math.min(minNormalDot, new THREE.Vector3().fromBufferAttribute(normal, i).normalize().dot(new THREE.Vector3().fromBufferAttribute(sourceNormal, i).normalize()));
              }
            }
            expect(maxPositionError).toBeLessThan(0.00001);
            expect(minNormalDot).toBeGreaterThan(0.99999);
            expect(Array.from(actual.getAttribute('uv').array)).toEqual(Array.from(source.getAttribute('uv').array));
            expect(actual.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.0001);
            source.dispose();
          });
        }
      }
    }
    expect(TREE_SWAY_ENABLED).toBe(false);
    forest.dispose();
  });

  it('matches collision footprints to the unwarped source wood on every instance scale', () => {
    const forest = createPineForest(templates);
    for (const species of ['pine', 'fir', 'shorepine'] as const) {
      for (let seed = 1; seed <= 3; seed++) for (const scale of [0.8, 1.13, 1.39, 2.2]) {
        const radius = forest.collisionRadius(species, seed, scale);
        expect(radius).toBeGreaterThan(0);
        for (const lod of forest.variant(species, seed).lods.slice(0, 2)) {
          const p = lod.wood!.getAttribute('position');
          for (let i = 0; i < p.count; i++) if (p.getY(i) * scale <= 2.66) {
            expect(Math.hypot(p.getX(i), p.getZ(i)) * scale).toBeLessThanOrEqual(radius);
          }
        }
      }
    }
    forest.dispose();
  });

  it('matches all dark conifers including the distant ring, on every preset without thinning collision obstacles', () => {
    const forest = createPineForest(templates);
    const terrain = new Terrain(), population = createFloraPopulation(terrain, new Exclusions(terrain), (tree, footprint) => isPineSpecies(tree.sp)
      ? forest.collisionRadius(tree.sp, tree.v + 1, tree.s) : footprint);
    expect(population.filter((tree) => isPineSpecies(tree.sp))).toHaveLength(281);
    for (const [quality, count] of [['low', 259], ['medium', 271], ['high', 281]] as const) {
      const plan = selectFloraPopulation(population, quality);
      expect(plan.trees.filter((tree) => isPineSpecies(tree.sp))).toHaveLength(count);
      expect(plan.obstacles.filter((tree) => isPineSpecies(tree.sp))).toHaveLength(233);
    }
    expect(['oak', 'birch', 'orchard', 'dead', 'shrub'].some((species) => isPineSpecies(species as 'oak'))).toBe(false);
    forest.dispose();
  });

  it('owns each world’s GPU resources, shares needle materials, and retains separate remeshed bark through disposal/rebuilds', () => {
    const sourceMeshes: THREE.Mesh[] = [];
    templates[0].scene.traverse((object) => { if ((object as THREE.Mesh).isMesh) sourceMeshes.push(object as THREE.Mesh); });
    const masterTexture = new THREE.Texture();
    const woodMaterial = sourceMeshes.map((mesh) => mesh.material as THREE.MeshStandardMaterial).find((material) => material.alphaTest === 0)!;
    woodMaterial.map = masterTexture;
    const masterDispose = vi.fn(); masterTexture.addEventListener('dispose', masterDispose);
    const first = createPineForest(templates), second = createPineForest(templates);
    const a = first.variant('pine', 1), b = second.variant('pine', 1);
    const materialA = first.materials[0]!.wood as THREE.MeshStandardMaterial;
    const materialB = second.materials[0]!.wood as THREE.MeshStandardMaterial;
    expect(first.materials[0]!.leaf).toBe(first.materials[1]!.leaf);
    expect(first.materials[0]!.wood).not.toBe(first.materials[1]!.wood);
    expect(materialA.map).not.toBe(masterTexture);
    expect(materialA.map).not.toBe(materialB.map);
    expect(a.lods[0].wood).not.toBe(b.lods[0].wood);
    const released = vi.fn(); materialA.map!.addEventListener('dispose', released);
    const geometryReleased = vi.fn(); a.lods[0].wood!.addEventListener('dispose', geometryReleased);
    first.dispose(); first.dispose();
    expect(released).toHaveBeenCalledTimes(1); expect(geometryReleased).toHaveBeenCalledTimes(1);
    expect(masterDispose).not.toHaveBeenCalled();
    expect(() => first.variant('pine', 1)).toThrow('disposed');
    expect(second.variant('fir', 2).lods[0].tris).toBeLessThan(10000);
    second.dispose();
    woodMaterial.map = null;
  });
});
