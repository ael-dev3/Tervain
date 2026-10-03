import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildFlora } from '../../src/presentation/flora';
import { createFloraPopulation, registerFloraColliders } from '../../src/presentation/floraPopulation';
import { pineTemplates } from './pineFixture';
import { createPineForest, isPineSpecies, type PineTemplates } from '../../src/presentation/solitaryPine';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { Exclusions } from '../../src/presentation/vegetation';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { defaultSettings } from '../../src/platform/settings';
import type { FrameContext } from '../../src/presentation/context';
import { worldView } from '../../src/game/worldView';
import { createInitialState } from '../../src/game/state';

// Floor pixels have their own tests/browser gate; isolate actual tree instancing without a DOM canvas.
vi.mock('../../src/presentation/forestFloor', () => ({ buildForestFloor: () => ({ group: new THREE.Group(), update() {}, dispose() {} }) }));
vi.mock('../../src/presentation/treeMaterials', () => ({
  woodMaterial: () => new THREE.MeshStandardMaterial(), leafMaterial: () => new THREE.MeshStandardMaterial(), disposeTreeMaterials() {},
}));
vi.mock('../../src/presentation/treeTextures', () => ({ disposeTreeTextures() {} }));
vi.mock('../../src/presentation/treeGen', async (original) => {
  const actual = await original<typeof import('../../src/presentation/treeGen')>();
  return { ...actual, buildTreeVariant: (species: Parameters<typeof actual.buildTreeVariant>[0], seed: number) => {
    if (['pine', 'fir', 'shorepine'].includes(species)) throw new Error('Old conifer geometry must never be requested.');
    return actual.buildTreeVariant(species, seed);
  } };
});

let templates: PineTemplates;
beforeAll(async () => { templates = await pineTemplates(); });

describe('world forest render substitution', () => {
  for (const quality of ['low', 'medium', 'high'] as const) it(`replaces every conifer and retains canonical obstacles on ${quality}`, () => {
    const terrain = new Terrain(), excl = new Exclusions(terrain), colliders = new Colliders();
    const source = createPineForest(templates), canonical = new Colliders();
    registerFloraColliders(createFloraPopulation(terrain, excl), canonical, (tree) => isPineSpecies(tree.sp)
      ? source.collisionRadius(tree.sp, tree.v + 1, tree.s) : tree.radius);
    source.dispose();
    const forest = buildFlora({ terrain, excl, colliders, quality, settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
    expect(colliders.all).toEqual(canonical.all);
    expect(forest.stats!().solitaryPines).toBe({ low: 436, medium: 458, high: 490 }[quality]);
    const imported = forest.group.children.filter((object) => object.name.startsWith('solitary-pine:')) as THREE.InstancedMesh[];
    expect(imported).toHaveLength(40); // Eight populated species/seed batches × two close parts + one distant card mesh.
    expect(imported.filter((mesh) => mesh.name === 'solitary-pine:2:foliage').every((mesh) => mesh.geometry.index!.count / 3 === 48)).toBe(true);
    const camera = new THREE.PerspectiveCamera(60, 1.7, 0.1, 900);
    camera.position.set(-170, 12, 70); camera.lookAt(-100, 15, 0); camera.updateMatrixWorld();
    const frame: FrameContext = { camera, quality, time: 1, focus: camera.position.clone(), nightness: 0, sunDir: new THREE.Vector3(1, 1, 1), reducedMotion: false, hour: 11, view: worldView(createInitialState()) };
    forest.update(0.2, frame);
    const drawn = forest.group.children.filter((object) => (object as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh[];
    const triangles = drawn.reduce((total, mesh) => total + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3 * mesh.count, 0);
    expect(forest.stats!().treeTris).toBe(Math.round(triangles));
    expect(forest.stats!().treesDrawn).toBeGreaterThan(0);
    forest.dispose!(); forest.dispose!();
  });
});
