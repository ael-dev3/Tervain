import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { TreeVariant } from '../../src/presentation/treeGen';
import type { FloraTree } from '../../src/presentation/floraPopulation';
import type { BuildContext, Quality } from '../../src/presentation/context';
import { buildFlora } from '../../src/presentation/flora';
import { PlantedCrownIndex } from '../../src/presentation/plantedCrowns';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { Exclusions } from '../../src/presentation/vegetation';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { defaultSettings } from '../../src/platform/settings';

const fixture = vi.hoisted(() => ({ variant: null as unknown as TreeVariant, floorShade: [] as number[] }));
vi.mock('../../src/presentation/treeGen', async original => ({ ...await original<typeof import('../../src/presentation/treeGen')>(), buildTreeVariant: () => fixture.variant }));
vi.mock('../../src/presentation/floraPopulation', async original => ({ ...await original<typeof import('../../src/presentation/floraPopulation')>(),
  createFloraPopulation: () => [{ sp: 'oak', v: 0, x: 0, y: 0, z: 0, s: 1, yaw: 0, tint: 1, radius: .5, collisionId: 'tree:test', decorationRank: 0 } satisfies FloraTree] }));
vi.mock('../../src/presentation/solitaryPine', async original => ({ ...await original<typeof import('../../src/presentation/solitaryPine')>(),
  createPineForest: () => ({ dispose() {} }) }));
vi.mock('../../src/presentation/treeMaterials', async () => {
  const T = await import('three');
  return { woodMaterial: () => new T.MeshStandardMaterial(), leafMaterial: () => new T.MeshStandardMaterial(), disposeTreeMaterials() {} };
});
vi.mock('../../src/presentation/forestFloor', async () => {
  const T = await import('three');
  return { buildForestFloor(_terrain: unknown, _excl: unknown, _quality: unknown, _trees: unknown, crowns: PlantedCrownIndex) {
    fixture.floorShade.push(crowns.coverAt(8, 0));
    return { group: new T.Group(), update() {}, dispose() {} };
  } };
});
vi.mock('../../src/presentation/fallingLeaves', async () => {
  const T = await import('three');
  return { buildFallingLeaves: () => ({ group: new T.Group(), update() {}, dispose() {}, stats: () => ({}) }) };
});
afterEach(() => { fixture.floorShade.length = 0; });

for (const quality of ['low', 'high'] as Quality[]) for (const defer of [false, true])
  it(`projects final repaired foliage before ${quality} ${defer ? 'deferred' : 'immediate'} understory sampling`, () => {
    // The real island repair pulls this unsupported horizontal leaf sheet toward the trunk.
    fixture.variant = { species: 'oak', bark: 'oak', leafTexture: 'oak', crownTexture: 'oak', height: 10, crownRadius: 9, trunkRadius: .5,
      lods: ([0, 1, 2] as const).map(() => ({ wood: new THREE.BoxGeometry(.5, 10, .5).translate(0, 5, 0),
        leaf: new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2).translate(8, 6, 0), tris: 14 })) as unknown as TreeVariant['lods'] };
    const terrain = new Terrain(), ctx: BuildContext = { terrain, colliders: new Colliders(), excl: new Exclusions(terrain), library: AssetLibrary.empty(),
      quality, settings: { ...defaultSettings(), quality }, sway: { uTime: { value: 0 }, uWind: { value: 0 } } };
    const forest = buildFlora(ctx, [] as unknown as Parameters<typeof buildFlora>[1], defer);
    const target = forest.canopyAuditTargets!(0)[0]!, geometry = target.leaves!, copy = geometry.clone(), reference = new PlantedCrownIndex();
    try {
      expect(geometry.userData.leafIslands.moved).toBeGreaterThan(0);
      reference.add('oak', { x: 0, z: 0, s: 1, yaw: 0 }, copy);
      expect(reference.coverAt(8, 0)).toBe(0);
      let supported = 0;
      for (let x = -2; x <= 10; x += .25) {
        const expected = reference.coverAt(x, 0);
        expect(ctx.plantedCrowns!.coverAt(x, 0)).toBe(expected);
        if (expected > .1) supported++;
      }
      expect(supported).toBeGreaterThan(2);
      if (defer) { expect(fixture.floorShade).toEqual([]); forest.initializeFloor(); }
      expect(fixture.floorShade).toEqual([0]);
    } finally { copy.dispose(); forest.dispose!(); }
  });
